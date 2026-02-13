import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para obtener la configuración de la compañía del usuario actual
 * Incluye webhooks específicos, CUIT, y otras configuraciones
 */
export const useCompanyConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCompanyConfig = async () => {
            try {
                setLoading(true);

                // Obtener el usuario actual
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError) throw userError;
                if (!user) {
                    throw new Error('No hay usuario autenticado');
                }

                // Obtener el perfil del usuario para obtener company_id
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;
                if (!profile?.company_id) {
                    throw new Error('Usuario sin compañía asignada');
                }

                // Obtener la configuración de la compañía
                const { data: company, error: companyError } = await supabase
                    .from('companies')
                    .select('id, name, configuration')
                    .eq('id', profile.company_id)
                    .single();

                if (companyError) throw companyError;

                setConfig({
                    companyId: company.id,
                    companyName: company.name,
                    cuit: company.configuration?.cuit || null,
                    webhooks: {
                        // PRODUCCIÓN: Usar webhook de producción (no test)
                        invoiceGeneration: 'https://n8n.neuracall.net/webhook/NeuraUSUARIOPRUEBA',
                        arcaLookup: company.configuration?.webhooks?.arca_lookup || '',
                        emailInvoice: company.configuration?.webhooks?.email_invoice || '',
                        paymentOrder: company.configuration?.webhooks?.payment_order || ''
                    },
                    modules: company.configuration?.modules || {},
                    ui: company.configuration?.ui || {}
                });

                setError(null);
            } catch (err) {
                console.error('Error al obtener configuración de la compañía:', err);
                setError(err.message);
                setConfig(null);
            } finally {
                setLoading(false);
            }
        };

        fetchCompanyConfig();
    }, []);

    return { config, loading, error };
};

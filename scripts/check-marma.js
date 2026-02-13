#!/usr/bin/env node

/**
 * Script para verificar la empresa Marma en Neuracall Stock
 * Usa fetch nativo de Node.js (v18+)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env manualmente
function loadEnv() {
    try {
        const envPath = join(__dirname, '..', '.env');
        const envContent = readFileSync(envPath, 'utf8');
        const env = {};

        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                }
            }
        });

        return env;
    } catch (error) {
        console.error('❌ Error al leer .env:', error.message);
        process.exit(1);
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan credenciales de Supabase');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('SERVICE_ROLE_KEY:', env.SERVICE_ROLE_KEY ? '✅' : '❌');
    process.exit(1);
}

async function query(table, params = {}) {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);

    if (params.select) url.searchParams.append('select', params.select);
    if (params.ilike) {
        Object.entries(params.ilike).forEach(([key, value]) => {
            url.searchParams.append(key, `ilike.${value}`);
        });
    }
    if (params.eq) {
        Object.entries(params.eq).forEach(([key, value]) => {
            url.searchParams.append(key, `eq.${value}`);
        });
    }
    if (params.order) url.searchParams.append('order', params.order);
    if (params.count) {
        url.searchParams.append('count', 'exact');
    }

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': params.count ? 'count=exact' : 'return=representation'
    };

    const response = await fetch(url.toString(), { headers, method: params.count ? 'HEAD' : 'GET' });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }

    if (params.count) {
        const count = response.headers.get('content-range');
        return { count: count ? parseInt(count.split('/')[1]) : 0 };
    }

    return await response.json();
}

async function checkMarma() {
    console.log('\n🔍 Verificando empresa Marma en Neuracall Stock...\n');
    console.log(`📡 Conectando a: ${supabaseUrl}\n`);

    try {
        // Buscar empresa Marma
        const companies = await query('companies', {
            select: '*',
            ilike: { name: '%marma%' }
        });

        if (!companies || companies.length === 0) {
            console.log('⚠️  No se encontró ninguna empresa con el nombre "Marma"');
            console.log('\n📋 Listando todas las empresas disponibles:\n');

            const allCompanies = await query('companies', {
                select: 'id,name,created_at,payment_status',
                order: 'created_at.desc'
            });

            if (allCompanies && allCompanies.length > 0) {
                allCompanies.forEach((company, index) => {
                    console.log(`${index + 1}. ${company.name}`);
                    console.log(`   ID: ${company.id}`);
                    console.log(`   Estado: ${company.payment_status}`);
                    console.log(`   Creada: ${new Date(company.created_at).toLocaleDateString()}`);
                    console.log('');
                });
            } else {
                console.log('⚠️  No hay empresas en la base de datos');
            }
            return;
        }

        // Mostrar información de Marma
        console.log('✅ Empresa Marma encontrada:\n');
        for (const company of companies) {
            console.log('━'.repeat(60));
            console.log(`📊 Nombre: ${company.name}`);
            console.log(`🆔 ID: ${company.id}`);
            console.log(`💰 Costo de servicio: $${company.service_cost || 0}`);
            console.log(`📅 Estado de pago: ${company.payment_status}`);
            console.log(`📆 Último pago: ${company.last_payment_date || 'N/A'}`);
            console.log(`📅 Creada: ${new Date(company.created_at).toLocaleDateString()}`);
            console.log(`⚙️  Configuración:`, JSON.stringify(company.configuration, null, 2));
            console.log('━'.repeat(60));
            console.log('');

            // Obtener estadísticas de la empresa
            await getCompanyStats(company.id);
        }

    } catch (error) {
        console.error('❌ Error inesperado:', error.message);
        console.error(error.stack);
    }
}

async function getCompanyStats(companyId) {
    console.log('📊 Estadísticas de la empresa:\n');

    try {
        // Contar productos
        const products = await query('products', {
            eq: { company_id: companyId },
            count: true
        });
        console.log(`   📦 Productos: ${products.count || 0}`);

        // Contar clientes
        const clients = await query('clients', {
            eq: { company_id: companyId },
            count: true
        });
        console.log(`   👥 Clientes: ${clients.count || 0}`);

        // Contar despachos
        const dispatches = await query('dispatches', {
            eq: { company_id: companyId },
            count: true
        });
        console.log(`   📦 Despachos: ${dispatches.count || 0}`);

        // Contar facturas
        const invoices = await query('invoices', {
            eq: { company_id: companyId },
            count: true
        });
        console.log(`   🧾 Facturas: ${invoices.count || 0}`);

        console.log('');

    } catch (error) {
        console.error('   ⚠️  Error al obtener estadísticas:', error.message);
    }
}

// Ejecutar
checkMarma();

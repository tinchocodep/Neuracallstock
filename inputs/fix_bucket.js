
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan credenciales en .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function makeBucketPublic() {
    console.log('Verificando bucket "invoices"...')

    // 1. Verificar si existe, si no, crearlo
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
        console.error('Error listando buckets:', listError)
        return
    }

    const invoiceBucket = buckets.find(b => b.name === 'invoices')

    if (!invoiceBucket) {
        console.log('El bucket "invoices" no existe. Creándolo...')
        const { data, error } = await supabase.storage.createBucket('invoices', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['application/pdf']
        })
        if (error) {
            console.error('Error creando bucket:', error)
        } else {
            console.log('Bucket "invoices" creado exitosamente y marcado como PÚBLICO.')
        }
    } else {
        console.log('El bucket "invoices" ya existe.')

        // 2. Intentar actualizarlo a público
        if (invoiceBucket.public) {
            console.log('El bucket YA es público. El problema podría ser otro (CORS o Políticas RLS).')
        } else {
            console.log('El bucket es PRIVADO. Actualizándolo a PÚBLICO...')
            const { data, error } = await supabase.storage.updateBucket('invoices', {
                public: true
            })
            if (error) console.error('Error actualizando bucket:', error)
            else console.log('Bucket actualizado a PÚBLICO correctamente.')
        }
    }
}

makeBucketPublic()

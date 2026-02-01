
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

// We need the SERVICE ROLE KEY to bypass RLS for seeding, as 'anon' cannot insert by default.
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
    console.error('ERROR: SERVICE_ROLE_KEY is missing. Please provide it to seed the database.');
    process.exit(1);
}

const supabase = createClient(env.VITE_SUPABASE_URL, SERVICE_ROLE_KEY);

async function seedData() {
    console.log('Inserting dummy company...');
    // Corrected columns based on schema.sql: id, name, service_cost, payment_status, last_payment_date, configuration
    // Removed: rut, address, phone (not in schema)

    // First, check if company exists to avoid duplicates or FK errors
    const { data: existingCompany } = await supabase.from('companies').select('id').limit(1).maybeSingle();

    let companyId;

    if (existingCompany) {
        console.log('Company already exists, using existing ID:', existingCompany.id);
        companyId = existingCompany.id;
    } else {
        const { data: newCompany, error: compError } = await supabase.from('companies').insert([
            { name: 'Neuracall S.A.', service_cost: 0, payment_status: 'active' }
        ]).select().single();

        if (compError) {
            console.error('Error inserting company:', compError);
            return;
        }
        companyId = newCompany.id;
        console.log('New Company created!', companyId);
    }

    console.log('Inserting dummy products linked to company:', companyId);

    // Corrected columns based on schema.sql: sku, name, price, stock, min_stock, created_at, updated_at, neto, referencia, dispatch_number, origin, company_id
    const products = [
        {
            name: "Silla de plastico",
            sku: "A-17612-1",
            referencia: "DIMP 211",
            category: "Varios",
            dispatch_number: "123260H",
            origin: "CHINA",
            price: 3289.53,
            stock: 15,
            min_stock: 5,
            neto: 49342.95,
            company_id: companyId
        },
        {
            name: "Herramienta de tubo",
            sku: "HH-15",
            referencia: "DIMP 215",
            category: "Ferreteria",
            dispatch_number: "148682W",
            origin: "CHINA",
            price: 603.10,
            stock: 0,
            min_stock: 2,
            neto: 0,
            company_id: companyId
        },
        {
            name: "Lámpara LED Industrial",
            sku: "LED-IND-200",
            referencia: "LUM-2024",
            category: "Iluminación",
            dispatch_number: "DESP-003",
            origin: "CHINA",
            price: 15400,
            stock: 50,
            min_stock: 10,
            neto: 770000,
            company_id: companyId
        },
        {
            name: "Cable UTP Cat6 305m",
            sku: "CBL-UTP-6",
            referencia: "NET-LINK",
            category: "Redes",
            dispatch_number: "DESP-004",
            origin: "TAIWAN",
            price: 45990,
            stock: 10,
            min_stock: 5,
            neto: 459900,
            company_id: companyId
        }
    ];

    const { error: prodError } = await supabase.from('products').insert(products);
    if (prodError) console.error('Error inserting products:', prodError);
    else console.log('Products inserted successfully!');
}

seedData();

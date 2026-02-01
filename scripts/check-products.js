
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

const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const supabase = createClient(env.VITE_SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkProductOwnership() {
    console.log("Checking products...");
    const { data: products, error } = await supabase.from('products').select('id, name, company_id');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    if (products.length === 0) {
        console.log("No products found in the database at all.");
    } else {
        console.log(`Found ${products.length} products.`);
        products.forEach(p => {
            console.log(`- Product: ${p.name} | Company ID: ${p.company_id}`);
        });
    }

    console.log("\nTarget Company ID (User is linked to): c8a5b2f7-2e49-4d16-a614-1d4acf45e94b");
}

checkProductOwnership();

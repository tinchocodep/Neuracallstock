
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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
    console.log("Checking tables in information_schema...");
    // We can't query information_schema easily with supabase-js unless we use rpc or just try to select from expected tables.
    // Let's just try to select count from potential tables.

    const potentialTables = ['invoices', 'invoice_items', 'invoice_details', 'invoice_concepts', 'products', 'clients'];

    for (const table of potentialTables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Table '${table}' error: ${error.message} (might not exist)`);
        } else {
            console.log(`✅ Table '${table}' exists. Rows: ${count}`);
        }
    }
}

checkTables();

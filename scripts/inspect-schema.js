
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspectSchema() {
    console.log("Inspecting 'invoices'...");
    const { data: invoices, error: invError } = await supabase.from('invoices').select('*').limit(1);
    if (invError) console.error("Error fetching invoices:", invError);
    else console.log("Invoices sample:", invoices[0]);

    console.log("\nInspecting 'invoice_items'...");
    const { data: invItems, error: itemsError } = await supabase.from('invoice_items').select('*').limit(1);

    if (itemsError) {
        console.error("Error fetching invoice_items. Trying 'invoice_details'...");
        const { data: details, error: detailsError } = await supabase.from('invoice_details').select('*').limit(1);
        if (detailsError) console.error("Error fetching invoice_details:", detailsError);
        else console.log("invoice_details sample:", details[0]);
    } else {
        console.log("invoice_items sample:", invItems[0]);
    }
}

inspectSchema();

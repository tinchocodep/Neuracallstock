
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

async function transferInvoices() {
    const targetCompanyId = 'c8a5b2f7-2e49-4d16-a614-1d4acf45e94b'; // Neuracall
    const wrongCompanyId = 'afffddf6-0c49-40e1-bc01-5f44af0b9015'; // Bygger

    console.log(`Transferring invoices and invoice items...`);

    // Invoices
    const { count: invoicesUpdated, error: invError } = await supabase
        .from('invoices')
        .update({ company_id: targetCompanyId })
        .eq('company_id', wrongCompanyId)
        .select('', { count: 'exact' });

    if (invError) console.error('Error updating invoices:', invError);
    else console.log(`Invoices transferred: ${invoicesUpdated || 'Unknown count (check manually if 0)'}`);

    // Invoice Items
    const { count: itemsUpdated, error: itemError } = await supabase
        .from('invoice_items')
        .update({ company_id: targetCompanyId })
        .eq('company_id', wrongCompanyId)
        .select('', { count: 'exact' });

    if (itemError) console.error('Error updating invoice items:', itemError);
    else console.log(`Invoice items transferred: ${itemsUpdated || 'Unknown count (check manually if 0)'}`);
}

transferInvoices();

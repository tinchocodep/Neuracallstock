
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

async function verifySums() {
    const COMPANY_ID = 'c8a5b2f7-2e49-4d16-a614-1d4acf45e94b';

    console.log("Verifying Sums for Company:", COMPANY_ID);

    const { data, error } = await supabase
        .from('products')
        .select('stock, neto, price')
        .eq('company_id', COMPANY_ID);

    if (error) {
        console.error(error);
        return;
    }

    let sumStock = 0;
    let sumNeto = 0;

    // Explicit high precision addition (though JS numbers are floats, adequate for this range usually)
    data.forEach(p => {
        sumStock += (Number(p.stock) || 0);
        sumNeto += (Number(p.neto) || 0);
    });

    console.log(`Total Products Count: ${data.length}`);
    console.log(`SUM(stock): ${sumStock}`); // Expected around 1.4M? Or 11M?
    console.log(`SUM(neto): ${sumNeto}`);   // User mentioned 11M, maybe it's this?

    // Formatting for readability
    console.log(`Formatted SUM(stock): ${new Intl.NumberFormat('es-AR').format(sumStock)}`);
    console.log(`Formatted SUM(neto): ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(sumNeto)}`);
}

verifySums();


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

async function verifyAllRows() {
    const COMPANY_ID = 'c8a5b2f7-2e49-4d16-a614-1d4acf45e94b';
    console.log("Fetching ALL rows via pagination...");

    let allProducts = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('stock, neto')
            .eq('company_id', COMPANY_ID)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error(error);
            break;
        }

        if (data.length === 0) break;

        allProducts = allProducts.concat(data);
        console.log(`Fetched page ${page}: ${data.length} rows. Total so far: ${allProducts.length}`);

        if (data.length < pageSize) break;
        page++;
    }

    let sumStock = 0;
    let sumNeto = 0;

    allProducts.forEach(p => {
        sumStock += (Number(p.stock) || 0);
        sumNeto += (Number(p.neto) || 0);
    });

    console.log("\n=== FINAL RESULTS ===");
    console.log(`Total Products: ${allProducts.length}`);
    console.log(`SUM(stock): ${sumStock}`);
    console.log(`SUM(neto): ${sumNeto}`);

    // Formatted
    const fmt = new Intl.NumberFormat('es-AR');
    console.log(`Stock Formatted: ${fmt.format(sumStock)}`);
    console.log(`Neto Formatted: ${fmt.format(sumNeto)}`);
}

verifyAllRows();

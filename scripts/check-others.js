
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

async function checkOtherTables() {
    const wrongCompanyId = 'afffddf6-0c49-40e1-bc01-5f44af0b9015';

    // Check Clients
    const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', wrongCompanyId);

    // Check Dispatches
    const { count: dispatchCount } = await supabase
        .from('dispatches')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', wrongCompanyId);

    console.log(`Clients to transfer: ${clientCount || 0}`);
    console.log(`Dispatches to transfer: ${dispatchCount || 0}`);
}

checkOtherTables();

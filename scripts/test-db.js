
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Simple .env parser since we can't assume dotenv is installed
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

console.log('Testing connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('Querying products table count...');
        const { count, error, status, statusText } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('CONNECTION ERROR:', error);
            console.error('Status:', status, statusText);
        } else {
            console.log('CONNECTION SUCCESSFUL!');
            console.log('Row count in products table:', count);
        }

        // Test companies table too since Dashboard failed there
        console.log('Querying companies table count...');
        const { count: compCount, error: compError } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true });

        if (compError) {
            console.error('Companies Error:', compError);
        } else {
            console.log('Row count in companies table:', compCount);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();

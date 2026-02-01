
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

async function listUsers() {
    console.log("Fetching current auth users...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log("Current Users in Auth:");
    users.forEach(u => {
        console.log(`- Email: ${u.email} | ID: ${u.id}`);
    });

    console.log("\nChecking user_profiles for these users...");
    const { data: profiles, error: profileError } = await supabase.from('user_profiles').select('*');
    if (profileError) console.error(profileError);
    else console.log("Current Profiles:", profiles);
}

listUsers();

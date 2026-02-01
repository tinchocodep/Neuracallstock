
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

async function linkUser() {
    // ID from previous step output
    const userId = '828c8003-ab1b-4c44-8253-7745d4f15a10';

    // 1. Target the correct company directly
    const companyId = 'c8a5b2f7-2e49-4d16-a614-1d4acf45e94b'; // ID for 'Neuracall'

    console.log(`Linking User ${userId} to Company ${companyId}`);

    // 2. Insert into user_profiles
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            company_id: companyId,
            role: 'admin'
        });

    if (profileError) {
        console.error('Error linking profile:', profileError);
    } else {
        console.log('User successfully linked to company via user_profiles!');
    }
}

linkUser();

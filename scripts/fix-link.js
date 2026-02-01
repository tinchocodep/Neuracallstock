
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

async function fixUserLink() {
    const REAL_USER_ID = 'b8f694b6-fbcf-4f87-b3a1-394126b2ef02'; // The one from Auth
    const OLD_PROFILE_ID = '828c8003-ab1b-4c44-8253-7745d4f15a10'; // The detached profile

    console.log(`Fixing link...`);

    // 1. Get the company ID from the old profile
    const { data: oldProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', OLD_PROFILE_ID)
        .single();

    if (!oldProfile) {
        console.error("Could not find old profile info.");
        return;
    }

    const companyId = oldProfile.company_id;
    console.log(`Found company ID: ${companyId}`);

    // 2. Delete the old detached profile
    await supabase.from('user_profiles').delete().eq('id', OLD_PROFILE_ID);
    console.log(`Deleted detached profile: ${OLD_PROFILE_ID}`);

    // 3. Create the correct profile for the real user
    const { error } = await supabase.from('user_profiles').insert({
        id: REAL_USER_ID,
        company_id: companyId,
        role: 'admin'
    });

    if (error) console.error("Error creating new profile:", error);
    else console.log(`SUCCESS! Linked User ${REAL_USER_ID} to Company ${companyId}`);
}

fixUserLink();

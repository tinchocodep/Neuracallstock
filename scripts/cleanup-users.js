
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

const KEEP_USER_ID = '828c8003-ab1b-4c44-8253-7745d4f15a10';

async function cleanupUsers() {
    console.log(`Cleaning up users, keeping ONLY: ${KEEP_USER_ID}`);

    // 1. Clean public.user_profiles
    const { data: profiles, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id');

    if (fetchError) {
        console.error('Error fetching profiles:', fetchError);
    } else {
        const idsToDelete = profiles
            .map(p => p.id)
            .filter(id => id !== KEEP_USER_ID);

        if (idsToDelete.length > 0) {
            console.log(`Deleting ${idsToDelete.length} profiles...`);
            const { error: delError } = await supabase
                .from('user_profiles')
                .delete()
                .in('id', idsToDelete);

            if (delError) console.error('Error deleting profiles:', delError);
            else console.log('Profiles deleted.');
        } else {
            console.log('No extra profiles to delete.');
        }
    }

    // 2. Clean auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing auth users:', listError);
    } else {
        const usersToDelete = users
            .map(u => u.id)
            .filter(id => id !== KEEP_USER_ID);

        if (usersToDelete.length > 0) {
            console.log(`Deleting ${usersToDelete.length} auth users...`);
            for (const id of usersToDelete) {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
                if (deleteError) console.error(`Failed to delete user ${id}:`, deleteError.message);
                else console.log(`Deleted user ${id}`);
            }
        } else {
            console.log('No extra auth users to delete.');
        }
    }
}

cleanupUsers();

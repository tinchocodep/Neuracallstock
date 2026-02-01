
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

async function createAdminUser() {
    const email = 'admin@neuracall.com';
    const password = 'password123';

    console.log(`Creating user ${email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // Auto confirm
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('User created successfully!');
        console.log('User ID:', data.user.id);
        console.log('Email:', data.user.email);
        console.log('Password:', password);
    }
}

createAdminUser();

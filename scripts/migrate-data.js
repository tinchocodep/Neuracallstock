
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) env[key.trim()] = value.trim();
        });
        return env;
    } catch (e) { return process.env; }
}
const env = loadEnv();

// Credentials
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL || env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY || env.SOURCE_SERVICE_ROLE_KEY;
const DEST_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const DEST_KEY = process.env.SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;

if (!SOURCE_URL || !SOURCE_KEY) {
    console.error('❌ Missing SOURCE credentials in .env');
    process.exit(1);
}

const source = createClient(SOURCE_URL, SOURCE_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

async function migrateData() {
    console.log("🚀 Starting Data Migration...");
    console.log(`FROM: ${SOURCE_URL}`);
    console.log(`TO:   ${DEST_URL}`);

    // Adjusted Order based on user feedback that 'invoices' has everything.
    // If 'invoices' is the main table, it likely depends on Clients.
    // We also need to check for 'invoice_data_productos' which is visible in the screenshot.
    const tables = [
        'companies',
        'clients',
        'dispatches',
        'products',
        'invoices',
        'invoice_data_productos', // Added based on screenshot
        'invoice_items'           // Included just in case it's still needed
    ];

    for (const table of tables) {
        console.log(`\n📄 Processing table: ${table}`);

        // 1. Fetch from Source
        const { data: rows, error: fetchError } = await source.from(table).select('*');

        if (fetchError) {
            console.log(`   ❌ Failed to fetch from source: ${fetchError.message} (Skipping - table might not exist in source)`);
            continue;
        }

        if (!rows || rows.length === 0) {
            console.log(`   ⚠️ Source table is empty. Skipping.`);
            continue;
        }

        console.log(`   Fetched ${rows.length} rows.`);

        // 2. Insert into Dest
        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            const { error: insertError } = await dest.from(table).upsert(batch, { ignoreDuplicates: true });

            if (insertError) {
                // Ignore "relation does not exist" errors if table missing in dest
                console.error(`   ❌ Insert Batch Error: ${insertError.message}`);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }

        console.log(`   ✅ Migrated: ${successCount} rows. Failed: ${errorCount}.`);
    }

    console.log("\n✨ Migration Complete.");
}

migrateData().catch(console.error);

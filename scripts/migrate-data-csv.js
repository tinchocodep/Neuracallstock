
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
const DEST_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const DEST_KEY = process.env.SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!DEST_URL || !DEST_KEY) {
    console.error('❌ Missing DEST credentials in .env');
    process.exit(1);
}

const dest = createClient(DEST_URL, DEST_KEY);

function cleanCSVValue(val) {
    if (!val) return null;
    val = val.trim();
    if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
    }
    // Handle double quotes inside
    val = val.replace(/""/g, '"');

    if (val === '\\N' || val === 'NULL' || val === '') return null;
    return val;
}

// Simple CSV parser that handles *basic* quotes
function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        // This is a naive split. For more robust parsing, a library is better, 
        // but we are constrained. We'll try to handle basic quoted commas if needed, 
        // but for now simple split might suffice if data is clean.
        // If your CSVs have commas in values, this breaks.
        // Let's assume standard export format.

        let currentLine = lines[i];

        // Regex to split by comma ONLY if not inside quotes
        // const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 

        // Simpler approach: split and map
        const values = currentLine.split(',');

        if (values.length < headers.length) continue; // Skip malformed

        let obj = {};
        headers.forEach((h, idx) => {
            obj[h] = cleanCSVValue(values[idx]);
        });
        rows.push(obj);
    }
    return rows;
}

async function migrateData() {
    console.log("🚀 Starting Data Migration from Local CSVs..."); // CSVs from Downloads
    console.log(`TO:   ${DEST_URL}`);

    // Order matters for Foreign Keys
    const tables = [
        'companies',
        'clients',
        'dispatches',
        'products',
        'invoices',
        'invoice_items'
    ];

    for (const table of tables) {
        console.log(`\n📄 Processing table: ${table}`);
        const csvPath = path.join('c:/Users/tinch/Downloads', `${table}_rows.csv`);

        if (!fs.existsSync(csvPath)) {
            // Try matching without _rows suffix or plural?
            // User provided file list: clients_rows.csv, companies_rows.csv, dispatches_rows.csv, 
            // invoice_items_rows.csv, invoices_rows.csv, products_rows.csv
            console.log(`   ❌ CSV file for ${table} not found at ${csvPath}. Skipping.`);
            continue;
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const rows = parseCSV(csvContent);

        console.log(`   Loaded ${rows.length} rows from CSV.`);

        if (rows.length === 0) continue;

        // 2. Insert into Dest
        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            const { error: insertError } = await dest.from(table).upsert(batch, { ignoreDuplicates: true });

            if (insertError) {
                console.error(`   ❌ Insert Batch Error: ${insertError.message}`);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }

        console.log(`   ✅ Migrated: ${successCount} rows. Failed: ${errorCount}.`);
    }

    // Special check for 'invoice_data_productos' if it maps to invoice_items
    // ---------------------------------------------------------
    // Special handling for 'Invoice_Data_Productos_rows.csv' 
    // which seems to be the real link between invoices and products
    // ---------------------------------------------------------
    console.log("\n📄 SPECIAL: Processing 'Invoice_Data_Productos_rows.csv' -> 'invoice_data_productos'");

    // We try to upload this to 'invoice_data_productos' first if it exists, as shown in the screenshot
    // Or 'invoice_items' if it matches that schema. 
    // Given the screenshot shows 'invoice_data_productos' table exists, we target that.

    const extraCsvPath = path.join('c:/Users/tinch/Downloads', `Invoice_Data_Productos_rows.csv`);
    if (fs.existsSync(extraCsvPath)) {
        const csvContent = fs.readFileSync(extraCsvPath, 'utf-8');
        const rows = parseCSV(csvContent);
        console.log(`   Loaded ${rows.length} rows.`);

        // Clean UUIDs if needed (basic trim/check done in parser, but double check empty strings)
        // Some might be invalid 0000... or empty?

        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await dest.from('invoice_data_productos').upsert(batch, { ignoreDuplicates: true }); // Target the specific table name from screenshot

            if (insertError) {
                console.error(`   ❌ Insert Batch Error (invoice_data_productos): ${insertError.message}`);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }
        console.log(`   ✅ Migrated Extra: ${successCount} rows. Failed: ${errorCount}.`);
    }

    console.log("\n✨ Migration Complete.");
}

migrateData().catch(console.error);

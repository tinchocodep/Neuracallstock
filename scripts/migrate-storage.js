
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handling __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env if needed (simple parsing)
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
    } catch (e) {
        return process.env;
    }
}

const env = loadEnv();

// CONFIGURATION
// You must set these in your .env file or hardcode them here for one-time run
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL || env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY || env.SOURCE_SERVICE_ROLE_KEY;

const DEST_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const DEST_KEY = process.env.SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

// Validate Keys
if (!SOURCE_URL || !SOURCE_KEY) {
    console.error('❌ Missing Source configuration. Please set SOURCE_SUPABASE_URL and SOURCE_SERVICE_ROLE_KEY in your .env file.');
    console.log('Usage:');
    console.log('1. Add SOURCE_SUPABASE_URL=... and SOURCE_SERVICE_ROLE_KEY=... to your .env');
    console.log('2. Ensure VITE_SUPABASE_URL (Dest) is set.');
    process.exit(1);
}

const sourceSupabase = createClient(SOURCE_URL, SOURCE_KEY);
const destSupabase = createClient(DEST_URL, DEST_KEY);

async function migrateStorage() {
    console.log('🚀 Starting Storage Migration...');
    console.log(`From: ${SOURCE_URL}`);
    console.log(`To:   ${DEST_URL}`);

    // 1. List Buckets
    const { data: buckets, error: bucketsError } = await sourceSupabase.storage.listBuckets();

    if (bucketsError) {
        console.error('Error listing buckets from source:', bucketsError);
        return;
    }

    console.log(`Found ${buckets.length} buckets to migrate.`);

    for (const bucket of buckets) {
        console.log(`\n📦 Processing Bucket: [${bucket.name}]`);

        // Ensure bucket exists in Dest
        const { data: destBucket, error: destBucketError } = await destSupabase.storage.getBucket(bucket.name);

        if (destBucketError && destBucketError.message.includes('not found')) {
            console.log(`   - Creating bucket ${bucket.name} in destination...`);
            const { error: createError } = await destSupabase.storage.createBucket(bucket.name, {
                public: bucket.public,
                fileSizeLimit: bucket.file_size_limit,
                allowedMimeTypes: bucket.allowed_mime_types
            });
            if (createError) {
                console.error(`   ❌ Failed to create bucket ${bucket.name}:`, createError.message);
                continue;
            }
        } else if (destBucketError) {
            console.error(`   ❌ Error checking bucket ${bucket.name}:`, destBucketError.message);
            // Verify permissions?
        }

        // List Files in Bucket (Recursive)
        // Note: list() is not recursive by default, we need a helper if there are folders.
        // For simple migration, we assume a relatively flat structure or we write a recursive lister.

        const files = await listAllFiles(sourceSupabase, bucket.name);
        console.log(`   - Found ${files.length} files.`);

        let successCount = 0;
        let failCount = 0;

        for (const file of files) {
            process.stdout.write(`   Ref: ${file.name} ... `);

            // Download
            const { data: blob, error: downloadError } = await sourceSupabase.storage
                .from(bucket.name)
                .download(file.name);

            if (downloadError) {
                console.log(`❌ Download Error: ${downloadError.message}`);
                failCount++;
                continue;
            }

            // Upload to Dest
            // Check if exists first to skip? Option: upsert: true
            const { error: uploadError } = await destSupabase.storage
                .from(bucket.name)
                .upload(file.name, blob, {
                    upsert: true,
                    contentType: file.metadata?.mimetype
                });

            if (uploadError) {
                console.log(`❌ Upload Error: ${uploadError.message}`);
                failCount++;
            } else {
                console.log(`✅ OK`);
                successCount++;
            }
        }

        console.log(`   Summary for ${bucket.name}: ${successCount} imported, ${failCount} failed.`);
    }

    console.log('\n✨ Migration Complete.');
}

// Helper to list all files recursively
async function listAllFiles(client, bucketName, path = '') {
    const { data, error } = await client.storage
        .from(bucketName)
        .list(path, { limit: 100, offset: 0 });

    if (error) {
        console.error(`Error listing files in ${bucketName}/${path}:`, error);
        return [];
    }

    let allFiles = [];

    for (const item of data) {
        if (item.id === null) {
            // It's a folder (Supabase convention: folder items often have null id or specific metadata)
            // But 'list' returns folders as items with no ID usually.
            // Let's recurse.
            const textName = item.name;
            const folderPath = path ? `${path}/${textName}` : textName;
            const subFiles = await listAllFiles(client, bucketName, folderPath);
            allFiles = [...allFiles, ...subFiles];
        } else {
            // It's a file
            const fullPath = path ? `${path}/${item.name}` : item.name;
            allFiles.push({ ...item, name: fullPath });
        }
    }

    return allFiles;
}

migrateStorage().catch(console.error);

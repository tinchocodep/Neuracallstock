-- 1. Enable RLS skipped (usually already enabled and requires owner privileges)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Allow Public Read access (Select) for 'invoices' bucket
CREATE POLICY "Public Access Invoices"
ON storage.objects FOR SELECT
USING ( bucket_id = 'invoices' );

-- 3. Allow Authenticated Users to Upload (Insert) to 'invoices'
CREATE POLICY "Authenticated Insert Invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'invoices' );

-- 4. Allow Anon Users (if needed for testing) to Upload to 'invoices'
CREATE POLICY "Anon Insert Invoices"
ON storage.objects FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'invoices' );

-- 5. Allow Updates (re-upload same file)
CREATE POLICY "Allow Update Invoices"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'invoices' );

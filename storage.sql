-- ==============================================================================
-- STORAGE CREATION SCRIPT
-- Run this in the SQL Editor of your NEW Supabase Project.
-- ==============================================================================

-- 1. Create 'invoices' bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'invoices', 
  'invoices', 
  true, 
  false, 
  null, 
  null
) ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow public access to read invoices (since it's public)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'invoices' );

-- 3. Policy: Allow authenticated users to upload invoices
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'invoices' AND auth.role() = 'authenticated'
);

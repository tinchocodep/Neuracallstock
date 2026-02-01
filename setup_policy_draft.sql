-- Enable RLS specifically for storage.objects (if not already enabled)
-- alter table storage.objects enable row level security;

-- Policy to allow public output (already public, but ensuring SELECT)
-- create policy "Public Access"
-- on storage.objects for select
-- using ( bucket_id = 'invoices' );

-- Policy to allow uploads (Critical for frontend upload)
-- We use a broad policy for now to ensure it works, then you can restrict it.
BEGIN;
  -- Allow SELECT for everyone
  INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT (id) DO NOTHING;
  
  -- We cannot easily execute CREATE POLICY via simple query interface without admin rights sometimes, 
  -- but let's try to simulate what the dashboard does.
  -- Actually, since I can't run SQL directly on your DB without the MCP, 
  -- I will create a JS script to upload a dummy file to TEST if it works, 
  -- and getting the error message will confirm if it's RLS.
COMMIT;

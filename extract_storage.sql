-- ==============================================================================
-- STORAGE EXTRACTION SCRIPT
-- Run this in the SQL Editor of your ORIGINAL (Working) Supabase Project.
-- It will output the list of storage buckets.
-- ==============================================================================

SELECT json_agg(b)
FROM (
  SELECT id, name, public, avif_autodetection, file_size_limit, allowed_mime_types
  FROM storage.buckets
) b;

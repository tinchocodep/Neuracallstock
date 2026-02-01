-- ==============================================================================
-- SCHEMA EXTRACTION SCRIPT
-- Run this in the SQL Editor of your ORIGINAL (Working) Supabase Project.
-- It will output a JSON code. Copy that code and send it to me.
-- ==============================================================================

SELECT json_agg(t)
FROM (
  SELECT
    table_name,
    (
      SELECT json_agg(c)
      FROM (
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = tables.table_name
        ORDER BY ordinal_position
      ) c
    ) as columns
  FROM information_schema.tables
  WHERE table_schema = 'public'
) t;

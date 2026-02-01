-- ============================================================
-- RESET DISPATCHES AND PRODUCTS (WITH CASCADING DELETES)
-- ============================================================
-- WARNING: This will DELETE ALL related data including invoices!
-- Use with caution in production environments.
-- ============================================================

-- Step 1: Delete invoice items first (they reference products)
DELETE FROM invoice_items;

-- Step 2: Delete invoices
DELETE FROM invoices;

-- Step 3: Delete products (now safe, no foreign key constraints)
DELETE FROM products;

-- Step 4: Delete dispatches
DELETE FROM dispatches;

-- Verification: Check that all tables are empty
SELECT 'invoice_items' as table_name, COUNT(*) as remaining_rows FROM invoice_items
UNION ALL
SELECT 'invoices' as table_name, COUNT(*) as remaining_rows FROM invoices
UNION ALL
SELECT 'products' as table_name, COUNT(*) as remaining_rows FROM products
UNION ALL
SELECT 'dispatches' as table_name, COUNT(*) as remaining_rows FROM dispatches
ORDER BY table_name;

-- Expected result: all should show 0 rows

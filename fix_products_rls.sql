-- Fix RLS policies for products table to allow authenticated users to access all products
-- This is needed for the Cost Center module to work properly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- Allow authenticated users to SELECT all products
CREATE POLICY "Users can view products"
ON products FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT products
CREATE POLICY "Users can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to UPDATE products
CREATE POLICY "Users can update products"
ON products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE products
CREATE POLICY "Users can delete products"
ON products FOR DELETE
TO authenticated
USING (true);

-- Verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

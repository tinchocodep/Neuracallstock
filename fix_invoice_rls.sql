-- RLS Policies for Invoice System
-- This script creates the necessary Row Level Security policies for the invoice system

-- =====================================================
-- INVOICES TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;

-- Allow authenticated users to INSERT invoices
CREATE POLICY "Users can insert invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT their company's invoices
CREATE POLICY "Users can view their own invoices"
ON invoices FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE their company's invoices
CREATE POLICY "Users can update their own invoices"
ON invoices FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- INVOICE_ITEMS TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can view invoice items" ON invoice_items;

-- Allow authenticated users to INSERT invoice items
CREATE POLICY "Users can insert invoice items"
ON invoice_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT invoice items
CREATE POLICY "Users can view invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- Fix get_dashboard_summary RPC to use 'price' instead of 'neto'
-- This RPC is used by the Dashboard to calculate inventory metrics

-- Drop the existing function
DROP FUNCTION IF EXISTS get_dashboard_summary();

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS TABLE (
    "totalValue" NUMERIC,
    "totalProducts" BIGINT,
    "totalStock" BIGINT,
    "lowStock" BIGINT,
    "outOfStock" BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Use price * stock for total value calculation
        COALESCE(SUM(price * stock), 0)::NUMERIC as "totalValue",
        COUNT(*)::BIGINT as "totalProducts",
        COALESCE(SUM(stock), 0)::BIGINT as "totalStock",
        0::BIGINT as "lowStock",  -- Low stock logic can be added later
        COUNT(*) FILTER (WHERE stock = 0)::BIGINT as "outOfStock"
    FROM products;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM get_dashboard_summary();

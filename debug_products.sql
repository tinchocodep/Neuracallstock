-- Check all products in the database to see what dispatch_numbers exist
SELECT 
    dispatch_number,
    COUNT(*) as product_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM products 
WHERE dispatch_number IS NOT NULL
GROUP BY dispatch_number
ORDER BY last_created DESC
LIMIT 20;

-- Check if there are any products at all
SELECT COUNT(*) as total_products FROM products;

-- Check the most recent products
SELECT 
    id,
    name,
    dispatch_number,
    company_id,
    created_at
FROM products
ORDER BY created_at DESC
LIMIT 10;

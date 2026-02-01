-- Check current product values after cost distribution
SELECT 
    name,
    sku,
    price,
    stock,
    neto,
    (price * stock) as calculated_total,
    dispatch_number,
    company_id
FROM products
WHERE dispatch_number = 'TUMAMA123'
ORDER BY name
LIMIT 5;

-- Check total inventory value
SELECT 
    COUNT(*) as total_products,
    SUM(stock) as total_stock,
    SUM(price * stock) as total_value_by_price,
    SUM(neto) as total_value_by_neto
FROM products
WHERE company_id = 'afffddf6-0c49-40e1-bc01-5f44af0b9015';

-- Check if get_dashboard_summary RPC exists
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_dashboard_summary'
AND routine_schema = 'public';

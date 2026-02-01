-- Check what data the products actually have
SELECT 
    id,
    name,
    sku,
    price,
    stock,
    unit_price_usd,
    dispatch_number,
    created_at
FROM products
WHERE dispatch_number = '313123'
ORDER BY created_at
LIMIT 5;

-- Check if there's a unit_price_usd field that N8N might be using instead
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name LIKE '%price%'
ORDER BY ordinal_position;

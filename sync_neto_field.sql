-- Update 'neto' field to match 'price' for all products that have been costed
-- This is a one-time fix for products that were already processed before the neto update

UPDATE products
SET neto = price
WHERE price > 0
AND dispatch_number = 'TUMAMA123';

-- Verify the update
SELECT 
    name,
    sku,
    price,
    neto,
    stock,
    (price * stock) as total_value
FROM products
WHERE dispatch_number = 'TUMAMA123'
ORDER BY name
LIMIT 5;

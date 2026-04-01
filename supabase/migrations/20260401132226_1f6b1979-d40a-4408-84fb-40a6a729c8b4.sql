
DELETE FROM rupturas a
USING rupturas b
WHERE a.numero_pedido LIKE '%-0'
  AND b.numero_pedido = REPLACE(a.numero_pedido, '-0', '')
  AND a.sku = b.sku;

UPDATE rupturas SET numero_pedido = REPLACE(numero_pedido, '-0', '') WHERE numero_pedido LIKE '%-0';

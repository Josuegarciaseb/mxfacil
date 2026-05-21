-- Agrega subtotal, iva y comision a la tabla pedido
ALTER TABLE pedido
  ADD COLUMN subtotal  DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total,
  ADD COLUMN iva       DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER subtotal,
  ADD COLUMN comision  DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER iva;

-- Retroactivamente calcular para pedidos existentes
UPDATE pedido
SET
  subtotal = ROUND(total / 1.16, 2),
  iva      = ROUND(total - (total / 1.16), 2),
  comision = ROUND((total / 1.16) * 0.02, 2);

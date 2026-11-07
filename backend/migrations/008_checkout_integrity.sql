-- Apply once to existing databases, after db/migration_002_add_iva_comision.sql.
-- Never run init.sql against a database containing live data.
ALTER TABLE pedido
  ADD COLUMN stock_reservado TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN direccion_entrega JSON DEFAULT NULL,
  ADD COLUMN clave_checkout VARCHAR(64) DEFAULT NULL,
  ADD COLUMN solicitud_hash CHAR(64) DEFAULT NULL,
  ADD UNIQUE KEY uq_pedido_checkout (usuario_id, clave_checkout);

-- Previous offline/confirmed orders already deducted stock. Awaiting payments did not.
UPDATE pedido SET stock_reservado = 1
WHERE estado IN ('pendiente', 'en_proceso', 'enviado', 'entregado');

UPDATE pedido p JOIN direccion d ON d.id = p.direccion_id
SET p.direccion_entrega = JSON_OBJECT('linea1',d.linea1,'ciudad',d.ciudad,'estado',d.estado,'cp',d.cp,'pais',d.pais);

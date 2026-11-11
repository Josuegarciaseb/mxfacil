-- La entrega del vendedor y la confirmación del comprador son acciones distintas.
ALTER TABLE pedido ADD COLUMN recibido_cliente_en DATETIME(3) DEFAULT NULL;

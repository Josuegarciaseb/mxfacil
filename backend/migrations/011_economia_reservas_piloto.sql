-- MySQL 8.0.16+. Aplicar con el cliente mysql sobre la base seleccionada
-- después de 010 y con las escrituras de la aplicación detenidas.
-- Cada ALTER es atómico en InnoDB. Las comprobaciones permiten reanudar
-- la migración si se interrumpe entre tablas.
DROP PROCEDURE IF EXISTS migrar_011_economia;
DELIMITER $$
CREATE PROCEDURE migrar_011_economia()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'pedido' AND column_name = 'reserva_vence_en') THEN
    ALTER TABLE pedido ADD reserva_vence_en DATETIME DEFAULT NULL,
      ADD checkout_segundos INT UNSIGNED DEFAULT NULL,
      ADD costo_variable DECIMAL(12,2) DEFAULT NULL,
      ADD CONSTRAINT chk_pedido_costo_variable CHECK (costo_variable >= 0),
      ADD KEY idx_reserva_vence (reserva_vence_en, id), ADD KEY idx_pedido_fecha (fecha, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'pedido_item' AND column_name = 'precio_base_unitario') THEN
    ALTER TABLE pedido_item MODIFY precio_unitario DECIMAL(12,2) NOT NULL,
      ADD precio_base_unitario DECIMAL(12,2) DEFAULT NULL, ADD proveedor_id INT DEFAULT NULL,
      ADD iva_linea DECIMAL(12,2) DEFAULT NULL,
      ADD FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'pago' AND column_name = 'referencia_reembolso') THEN
    ALTER TABLE pago MODIFY estado ENUM('pendiente','aprobado','rechazado','reembolsado') DEFAULT 'pendiente',
      ADD referencia_reembolso VARCHAR(100) DEFAULT NULL,
      ADD captura_solicitada TINYINT(1) DEFAULT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'pago' AND column_name = 'captura_solicitada' AND is_nullable = 'YES') THEN
    UPDATE pago SET captura_solicitada = IF(metodo = 'paypal' AND estado = 'pendiente'
      AND referencia IS NOT NULL, 1, 0) WHERE captura_solicitada IS NULL;
    ALTER TABLE pago MODIFY captura_solicitada TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
  -- Conservar la atribución que hacía la aplicación antes de esta versión.
  UPDATE pedido_item i JOIN producto p ON p.id = i.producto_id
    SET i.proveedor_id = p.proveedor_id WHERE i.proveedor_id IS NULL;
  -- Otorgar un plazo de gracia en el corte. No mover plazos ya asignados.
  UPDATE pedido p JOIN pago g ON g.pedido_id = p.id
    SET p.reserva_vence_en = TIMESTAMPADD(MINUTE, IF(g.metodo = 'transferencia', 1440, 30), NOW())
    WHERE p.reserva_vence_en IS NULL AND p.estado IN ('esperando_pago','pendiente','en_proceso')
      AND g.estado = 'pendiente' AND g.metodo IN ('tarjeta','paypal','mercadopago','transferencia')
      AND NOT EXISTS (SELECT 1 FROM envio e WHERE e.pedido_id = p.id AND e.estado IN ('en_transito','entregado'));
END$$
DELIMITER ;
CALL migrar_011_economia();
DROP PROCEDURE migrar_011_economia;

-- Ejecutar con el cliente mysql sobre la base seleccionada después de 013.
-- Los folios existentes se registraron exclusivamente con Castores.
DROP PROCEDURE IF EXISTS migrar_014_paqueterias;
DELIMITER $$
CREATE PROCEDURE migrar_014_paqueterias()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
    AND table_name='cotizacion_castores' AND column_name='transportista') THEN
    ALTER TABLE cotizacion_castores
      ADD transportista ENUM('Castores','FedEx','DHL') DEFAULT 'Castores',
      ADD perecedero BOOLEAN NOT NULL DEFAULT FALSE,
      MODIFY canal_guia ENUM('castores','envia','sandbox','directo') DEFAULT NULL,
      DROP INDEX guia, ADD UNIQUE KEY uq_transportista_guia (transportista,guia);
  END IF;
END$$
DELIMITER ;
CALL migrar_014_paqueterias();
DROP PROCEDURE migrar_014_paqueterias;

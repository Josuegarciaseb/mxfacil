-- La mercancía se paga a la tienda y el flete se liquida al transportista.
-- Las cotizaciones 012 ya pagadas conservan su importe y su seguimiento.
CREATE TABLE IF NOT EXISTS flete_domicilio (
  cotizacion_id INT PRIMARY KEY,
  estimado DECIMAL(12,2) DEFAULT NULL,
  fuente_estimado ENUM('historial','referencia') DEFAULT NULL,
  autorizado_hasta DECIMAL(12,2) DEFAULT NULL,
  importe_destino DECIMAL(12,2) DEFAULT NULL,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizacion_castores(id)
) ENGINE=InnoDB;

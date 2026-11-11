-- Reseñas por artículo de una compra pagada y entregada.
CREATE TABLE IF NOT EXISTS resena (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_item_id INT NOT NULL UNIQUE,
  producto_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  calidad TINYINT UNSIGNED NOT NULL,
  servicio TINYINT UNSIGNED NOT NULL,
  comentario VARCHAR(1000) NOT NULL DEFAULT '',
  creado_en DATETIME(3) NOT NULL,
  CONSTRAINT chk_resena_calidad CHECK (calidad BETWEEN 1 AND 5),
  CONSTRAINT chk_resena_servicio CHECK (servicio BETWEEN 1 AND 5),
  INDEX idx_resena_producto (producto_id, id),
  INDEX idx_resena_proveedor (proveedor_id),
  FOREIGN KEY (pedido_item_id) REFERENCES pedido_item(id) ON DELETE RESTRICT,
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE RESTRICT,
  FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

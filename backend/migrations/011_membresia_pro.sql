-- Aplicar una vez sobre la base existente. No modifica pedidos ni usuarios.
CREATE TABLE IF NOT EXISTS membresia (
  proveedor_id INT PRIMARY KEY,
  vence_en DATETIME(3) NOT NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS membresia_compra (
  id CHAR(36) PRIMARY KEY,
  proveedor_id INT NOT NULL,
  monto_centavos INT NOT NULL,
  referencia VARCHAR(100) UNIQUE,
  estado ENUM('pendiente','aprobado') NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  aprobado_en DATETIME(3),
  vence_en DATETIME(3),
  INDEX idx_membresia_proveedor (proveedor_id, estado),
  FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS membresia_evento (
  producto_id INT NOT NULL,
  sesion CHAR(36) NOT NULL,
  dia DATE NOT NULL,
  tipo ENUM('impresion','carrito') NOT NULL,
  PRIMARY KEY (producto_id, sesion, dia, tipo),
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE
) ENGINE=InnoDB;

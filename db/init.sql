-- =========================================
-- BD simplificada en 3NF: mxfacil (versión esencial)
-- =========================================

DROP DATABASE IF EXISTS mxfacil;
CREATE DATABASE mxfacil
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mxfacil;

-- 1️⃣ USUARIOS Y DIRECCIONES
CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(30),
  rol ENUM('cliente','admin','vendedor' ) NOT NULL DEFAULT 'cliente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE direccion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  linea1 VARCHAR(160) NOT NULL,
  ciudad VARCHAR(80) NOT NULL,
  estado VARCHAR(80) NOT NULL,
  cp VARCHAR(12) NOT NULL,
  pais VARCHAR(60) NOT NULL DEFAULT 'México',
  es_principal TINYINT(1) DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 2️⃣ PROVEEDORES Y CATÁLOGO DE PRODUCTOS
CREATE TABLE proveedor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('local','dropshipping') DEFAULT 'local',
  contacto_email VARCHAR(150),
  telefono VARCHAR(30)
) ENGINE=InnoDB;

CREATE TABLE categoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE producto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  categoria_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  FOREIGN KEY (proveedor_id) REFERENCES proveedor(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categoria(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL UNIQUE,
  stock INT NOT NULL DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES producto(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3️⃣ PEDIDOS + DETALLE
CREATE TABLE pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  direccion_id INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente','en_proceso','enviado','entregado','cancelado') DEFAULT 'pendiente',
  total DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (direccion_id) REFERENCES direccion(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pedido_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES producto(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4️⃣ PAGOS Y ENVÍOS
CREATE TABLE pago (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL UNIQUE,
  metodo ENUM('tarjeta','transferencia','contra_entrega','plataforma') NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  estado ENUM('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  referencia VARCHAR(100),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE envio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL UNIQUE,
  transportista VARCHAR(80),
  guia VARCHAR(100),
  estado ENUM('preparando','en_transito','entregado','incidencia') DEFAULT 'preparando',
  fecha_envio DATETIME,
  fecha_entrega DATETIME,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


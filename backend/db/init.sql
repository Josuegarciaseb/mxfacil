-- =========================================
-- Schema completo mxfacil (incluye todas las migraciones)
-- =========================================

DROP DATABASE IF EXISTS mxfacil;
CREATE DATABASE mxfacil
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mxfacil;

-- 1️⃣ USUARIOS Y DIRECCIONES
CREATE TABLE usuario (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(120)  NOT NULL,
  email          VARCHAR(180)  NOT NULL UNIQUE,
  email_hash     CHAR(64)      DEFAULT NULL,
  password_hash  VARCHAR(255)  DEFAULT NULL,
  telefono       VARCHAR(30),
  rol            ENUM('cliente','admin','vendedor') NOT NULL DEFAULT 'cliente',
  mfa_secret     TEXT          DEFAULT NULL,
  mfa_enabled    TINYINT(1)    NOT NULL DEFAULT 0,
  google_id      VARCHAR(255)  DEFAULT NULL UNIQUE,
  creado_en      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_usuario_google_id ON usuario(google_id);

CREATE TABLE direccion (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  linea1      VARCHAR(160) NOT NULL,
  ciudad      VARCHAR(80)  NOT NULL,
  estado      VARCHAR(80)  NOT NULL,
  cp          VARCHAR(12)  NOT NULL,
  pais        VARCHAR(60)  NOT NULL DEFAULT 'México',
  es_principal TINYINT(1)  DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 2️⃣ PROVEEDORES Y CATÁLOGO DE PRODUCTOS
CREATE TABLE proveedor (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT UNIQUE,
  nombre          VARCHAR(150) NOT NULL,
  tipo            ENUM('local','dropshipping') DEFAULT 'local',
  contacto_email  VARCHAR(150),
  telefono        VARCHAR(30),
  rfc             VARCHAR(13)  DEFAULT NULL,
  verificado      ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  verificado_en   DATETIME     DEFAULT NULL,
  verificado_por  INT          DEFAULT NULL,
  motivo_rechazo  TEXT         DEFAULT NULL,
  FOREIGN KEY (usuario_id)     REFERENCES usuario(id) ON DELETE SET NULL  ON UPDATE CASCADE,
  FOREIGN KEY (verificado_por) REFERENCES usuario(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE categoria (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo   ENUM('perecedero','no_perecedero') NOT NULL DEFAULT 'perecedero'
) ENGINE=InnoDB;

INSERT INTO categoria (nombre, tipo) VALUES
  ('Frutas y verduras',       'perecedero'),
  ('Lácteos y huevos',        'perecedero'),
  ('Carnes y embutidos',      'perecedero'),
  ('Mariscos y pescados',     'perecedero'),
  ('Pan y tortillas',         'perecedero'),
  ('Granos y legumbres',      'no_perecedero'),
  ('Aceites y grasas',        'no_perecedero'),
  ('Enlatados y conservas',   'no_perecedero'),
  ('Bebidas',                 'no_perecedero'),
  ('Condimentos y especias',  'no_perecedero'),
  ('Harinas, azúcar y sal',   'no_perecedero'),
  ('Dulces y botanas',        'no_perecedero');

CREATE TABLE producto (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  categoria_id INT NOT NULL,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT,
  precio       DECIMAL(10,2) NOT NULL,
  presentacion VARCHAR(100)  DEFAULT NULL,
  activo       TINYINT(1)    DEFAULT 1,
  image_url    VARCHAR(500)  DEFAULT NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedor(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categoria(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL UNIQUE,
  stock       INT NOT NULL DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES producto(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3️⃣ PEDIDOS + DETALLE
CREATE TABLE pedido (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  direccion_id INT NOT NULL,
  fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado       ENUM('esperando_pago','pendiente','en_proceso','enviado','entregado','cancelado') DEFAULT 'pendiente',
  total        DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (usuario_id)   REFERENCES usuario(id)   ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (direccion_id) REFERENCES direccion(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pedido_item (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id)   REFERENCES pedido(id)   ON DELETE CASCADE   ON UPDATE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE RESTRICT  ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4️⃣ PAGOS Y ENVÍOS
CREATE TABLE pago (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id  INT NOT NULL UNIQUE,
  metodo     ENUM('tarjeta','paypal','mercadopago','transferencia','contra_entrega','plataforma') NOT NULL,
  monto      DECIMAL(12,2) NOT NULL,
  estado     ENUM('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  referencia VARCHAR(100),
  fecha      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE envio (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL UNIQUE,
  transportista   VARCHAR(80),
  guia            VARCHAR(100),
  estado          ENUM('preparando','en_transito','entregado','incidencia') DEFAULT 'preparando',
  fecha_envio     DATETIME,
  fecha_entrega   DATETIME,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

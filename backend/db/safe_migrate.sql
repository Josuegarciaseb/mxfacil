USE mxfacil;

-- Helper: agrega columna solo si no existe (MySQL 8.0 compatible)
DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_idx;
DELIMITER //
CREATE PROCEDURE _add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END//
CREATE PROCEDURE _add_idx(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @s = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (', cols, ')');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END//
DELIMITER ;

-- ── usuario ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  email_hash    CHAR(64)     DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  telefono      VARCHAR(30),
  rol           ENUM('cliente','admin','vendedor') NOT NULL DEFAULT 'cliente',
  mfa_secret    TEXT         DEFAULT NULL,
  mfa_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
  google_id     VARCHAR(255) DEFAULT NULL UNIQUE,
  creado_en     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CALL _add_col('usuario', 'email_hash',    'CHAR(64) DEFAULT NULL');
CALL _add_col('usuario', 'mfa_secret',    'TEXT DEFAULT NULL');
CALL _add_col('usuario', 'mfa_enabled',   'TINYINT(1) NOT NULL DEFAULT 0');
CALL _add_col('usuario', 'google_id',     'VARCHAR(255) DEFAULT NULL UNIQUE');

ALTER TABLE usuario MODIFY COLUMN password_hash VARCHAR(255) DEFAULT NULL;

CALL _add_idx('usuario', 'idx_usuario_google_id', 'google_id');

-- ── direccion ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direccion (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  linea1       VARCHAR(160) NOT NULL,
  ciudad       VARCHAR(80)  NOT NULL,
  estado       VARCHAR(80)  NOT NULL,
  cp           VARCHAR(12)  NOT NULL,
  pais         VARCHAR(60)  NOT NULL DEFAULT 'México',
  es_principal TINYINT(1)   DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ── proveedor ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedor (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT UNIQUE,
  nombre         VARCHAR(150) NOT NULL,
  tipo           ENUM('local','dropshipping') DEFAULT 'local',
  contacto_email VARCHAR(150),
  telefono       VARCHAR(30),
  rfc            VARCHAR(13)  DEFAULT NULL,
  verificado     ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  verificado_en  DATETIME     DEFAULT NULL,
  verificado_por INT          DEFAULT NULL,
  motivo_rechazo TEXT         DEFAULT NULL,
  FOREIGN KEY (usuario_id)     REFERENCES usuario(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (verificado_por) REFERENCES usuario(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CALL _add_col('proveedor', 'rfc',            'VARCHAR(13) DEFAULT NULL');
CALL _add_col('proveedor', 'verificado',     "ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente'");
CALL _add_col('proveedor', 'verificado_en',  'DATETIME DEFAULT NULL');
CALL _add_col('proveedor', 'verificado_por', 'INT DEFAULT NULL');
CALL _add_col('proveedor', 'motivo_rechazo', 'TEXT DEFAULT NULL');

-- ── categoria ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categoria (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ── producto ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS producto (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  categoria_id INT NOT NULL,
  nombre       VARCHAR(150)  NOT NULL,
  descripcion  TEXT,
  precio       DECIMAL(10,2) NOT NULL,
  presentacion VARCHAR(100)  DEFAULT NULL,
  activo       TINYINT(1)    DEFAULT 1,
  image_url    VARCHAR(500)  DEFAULT NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categoria(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CALL _add_col('producto', 'presentacion', 'VARCHAR(100) DEFAULT NULL');
CALL _add_col('producto', 'image_url',    'VARCHAR(500) DEFAULT NULL');

-- ── inventario ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL UNIQUE,
  stock       INT NOT NULL DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ── pedido ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  direccion_id INT NOT NULL,
  fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado       ENUM('pendiente','en_proceso','enviado','entregado','cancelado') DEFAULT 'pendiente',
  total        DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (usuario_id)   REFERENCES usuario(id)   ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (direccion_id) REFERENCES direccion(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ── pedido_item ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_item (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id)   REFERENCES pedido(id)   ON DELETE CASCADE  ON UPDATE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ── pago ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pago (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id  INT NOT NULL UNIQUE,
  metodo     ENUM('tarjeta','paypal','mercadopago','transferencia','contra_entrega','plataforma') NOT NULL,
  monto      DECIMAL(12,2) NOT NULL,
  estado     ENUM('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  referencia VARCHAR(100),
  fecha      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE pago MODIFY COLUMN metodo
  ENUM('tarjeta','paypal','mercadopago','transferencia','contra_entrega','plataforma') NOT NULL;

-- ── envio ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS envio (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id     INT NOT NULL UNIQUE,
  transportista VARCHAR(80),
  guia          VARCHAR(100),
  estado        ENUM('preparando','en_transito','entregado','incidencia') DEFAULT 'preparando',
  fecha_envio   DATETIME,
  fecha_entrega DATETIME,
  FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_idx;

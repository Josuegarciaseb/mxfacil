CREATE TABLE IF NOT EXISTS oauth_intercambio (
  codigo_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
  usuario_id INT NOT NULL,
  reto CHAR(64) CHARACTER SET ascii NOT NULL,
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  vence DATETIME NOT NULL,
  INDEX idx_oauth_vence (vence),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Previous releases stripped markup from passwords before hashing them.
ALTER TABLE usuario ADD COLUMN clave_literal TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE usuario ALTER COLUMN clave_literal SET DEFAULT 1;

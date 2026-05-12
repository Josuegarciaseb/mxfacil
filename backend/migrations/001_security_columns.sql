ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS mfa_secret   TEXT         DEFAULT NULL COMMENT 'Secreto TOTP cifrado AES-256-GCM para MFA',
  ADD COLUMN IF NOT EXISTS mfa_enabled  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = MFA activo',
  ADD COLUMN IF NOT EXISTS google_id    VARCHAR(255) DEFAULT NULL UNIQUE COMMENT 'ID de usuario de Google (OAuth2)',
  ADD COLUMN IF NOT EXISTS email_hash   CHAR(64)     DEFAULT NULL COMMENT 'SHA-256 del email para verificación de integridad';

CREATE INDEX IF NOT EXISTS idx_usuario_google_id ON usuario(google_id);

ALTER TABLE usuario
  MODIFY COLUMN password_hash VARCHAR(255) DEFAULT NULL;

-- backend/migrations/001_proveedor_verificacion.sql
-- Idempotente: usa IF NOT EXISTS para cada columna

ALTER TABLE proveedor
  ADD COLUMN IF NOT EXISTS rfc              VARCHAR(13)                                   NULL,
  ADD COLUMN IF NOT EXISTS verificado       ENUM('pendiente','aprobado','rechazado')       NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS verificado_en    DATETIME                                       NULL,
  ADD COLUMN IF NOT EXISTS verificado_por   INT                                            NULL,
  ADD COLUMN IF NOT EXISTS motivo_rechazo   TEXT                                           NULL,
  ADD CONSTRAINT IF NOT EXISTS fk_prov_verificado_por
    FOREIGN KEY (verificado_por) REFERENCES usuario(id) ON DELETE SET NULL;
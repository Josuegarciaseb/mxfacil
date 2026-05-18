-- Migración 001: agregar columna image_url a producto
ALTER TABLE producto
  ADD COLUMN image_url VARCHAR(500) NULL AFTER activo;

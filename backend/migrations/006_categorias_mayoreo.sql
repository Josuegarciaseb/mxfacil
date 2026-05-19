-- =========================================
-- Migración 006: Categorías para mayoreo
-- Agrega campo `tipo` (perecedero / no_perecedero) y
-- reemplaza categorías genéricas por clasificación correcta
-- =========================================

USE mxfacil;

-- 1. Agregar columna tipo si no existe (compatible MySQL 5.7 / 8.x)
SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'categoria'
    AND COLUMN_NAME  = 'tipo'
);
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE categoria ADD COLUMN tipo ENUM('perecedero','no_perecedero') NOT NULL DEFAULT 'perecedero' AFTER nombre",
  'SELECT ''columna tipo ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 2. Actualizar categorías existentes que ya tenían nombre genérico
UPDATE categoria SET tipo = 'perecedero'
WHERE LOWER(nombre) IN ('frutas','verduras','frutas y verduras');

-- 3. Insertar categorías de mayoreo (ignora duplicados)
INSERT IGNORE INTO categoria (nombre, tipo) VALUES
  -- Perecederos
  ('Frutas y verduras',       'perecedero'),
  ('Lácteos y huevos',        'perecedero'),
  ('Carnes y embutidos',      'perecedero'),
  ('Mariscos y pescados',     'perecedero'),
  ('Pan y tortillas',         'perecedero'),
  -- No perecederos
  ('Granos y legumbres',      'no_perecedero'),
  ('Aceites y grasas',        'no_perecedero'),
  ('Enlatados y conservas',   'no_perecedero'),
  ('Bebidas',                 'no_perecedero'),
  ('Condimentos y especias',  'no_perecedero'),
  ('Harinas, azúcar y sal',   'no_perecedero'),
  ('Dulces y botanas',        'no_perecedero');

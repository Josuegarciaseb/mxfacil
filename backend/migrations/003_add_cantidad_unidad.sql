ALTER TABLE producto
  ADD COLUMN cantidad_unidad DECIMAL(10,3) NOT NULL DEFAULT 1.000
  AFTER unidad_medida;

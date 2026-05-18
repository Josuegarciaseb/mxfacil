ALTER TABLE producto
  DROP COLUMN unidad_medida,
  DROP COLUMN cantidad_unidad,
  ADD COLUMN presentacion VARCHAR(100) NULL AFTER precio;

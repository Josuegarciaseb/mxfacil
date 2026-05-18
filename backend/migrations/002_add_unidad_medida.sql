ALTER TABLE producto
  ADD COLUMN unidad_medida ENUM('unidad','kg','gramos','litros','mililitros','metro','caja') NOT NULL DEFAULT 'unidad'
  AFTER precio;

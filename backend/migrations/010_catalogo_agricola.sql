-- Ejecutar sobre la base seleccionada. La columna nueva deja inicialmente
-- las categorías anteriores fuera de venta, con sus productos e historial intactos.
SET @agregar_visibilidad = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categoria' AND COLUMN_NAME = 'en_catalogo'),
  'DO 0',
  'ALTER TABLE categoria ADD COLUMN en_catalogo TINYINT(1) NOT NULL DEFAULT 0'
);
PREPARE cambio FROM @agregar_visibilidad;
EXECUTE cambio;
DEALLOCATE PREPARE cambio;

START TRANSACTION;
-- La migración 006 también pudo haberse ejecutado sobre un esquema ya inicializado.
UPDATE categoria SET en_catalogo = 0
WHERE en_catalogo = 1 AND nombre IN (
  'Lácteos y huevos', 'Carnes y embutidos', 'Mariscos y pescados', 'Pan y tortillas',
  'Aceites y grasas', 'Enlatados y conservas', 'Bebidas', 'Condimentos y especias',
  'Harinas, azúcar y sal', 'Dulces y botanas', 'Frutas', 'Verduras', 'Hortalizas', 'Granos', 'Legumbres'
);

INSERT INTO categoria (nombre, tipo, en_catalogo) VALUES
  ('Frutas y verduras',  'perecedero', 1),
  ('Granos y legumbres', 'no_perecedero', 1),
  ('Semillas',           'no_perecedero', 1) AS inicial
ON DUPLICATE KEY UPDATE tipo = inicial.tipo, en_catalogo = 1;

-- Algunas instalaciones separaban las frutas de las verduras y los granos de las legumbres.
UPDATE producto p
JOIN categoria anterior ON anterior.id = p.categoria_id
JOIN categoria destino ON destino.nombre = 'Frutas y verduras'
SET p.categoria_id = destino.id
WHERE anterior.en_catalogo = 0 AND anterior.nombre IN ('Frutas','Verduras','Hortalizas');

UPDATE producto p
JOIN categoria anterior ON anterior.id = p.categoria_id
JOIN categoria destino ON destino.nombre = 'Granos y legumbres'
SET p.categoria_id = destino.id
WHERE anterior.en_catalogo = 0 AND anterior.nombre IN ('Granos','Legumbres');
COMMIT;

-- Las categorías nuevas que cree el administrador se publican como de costumbre.
ALTER TABLE categoria ALTER COLUMN en_catalogo SET DEFAULT 1;

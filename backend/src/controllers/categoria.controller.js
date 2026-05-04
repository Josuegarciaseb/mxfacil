// src/controllers/categoria.controller.js
const pool = require('../config/db');

// GET /api/categorias
exports.listCategorias = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM categoria ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('Error listCategorias:', err);
    return res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

// POST /api/categorias (admin)
exports.createCategoria = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'nombre es obligatorio' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categoria (nombre) VALUES (?)',
      [nombre]
    );

    const [rows] = await pool.query(
      'SELECT id, nombre FROM categoria WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error createCategoria:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }

    return res.status(500).json({ message: 'Error al crear categoría' });
  }
};

// PUT /api/categorias/:id (admin)
// Body: { "nombre": "Nuevo nombre" }
exports.updateCategoria = async (req, res) => {
  const id = req.params.id;
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'nombre es obligatorio' });
  }

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM categoria WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    await pool.query(
      'UPDATE categoria SET nombre = ? WHERE id = ?',
      [nombre, id]
    );

    const [rows] = await pool.query(
      'SELECT id, nombre FROM categoria WHERE id = ?',
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updateCategoria:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }

    return res.status(500).json({ message: 'Error al actualizar categoría' });
  }
};

// DELETE /api/categorias/:id (admin)
exports.deleteCategoria = async (req, res) => {
  const id = req.params.id;

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM categoria WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar que no tenga productos asociados
    const [productos] = await pool.query(
      'SELECT COUNT(*) AS total FROM producto WHERE categoria_id = ?',
      [id]
    );
    if (productos[0].total > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la categoría porque tiene productos asociados'
      });
    }

    await pool.query(
      'DELETE FROM categoria WHERE id = ?',
      [id]
    );

    return res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('Error deleteCategoria:', err);
    return res.status(500).json({ message: 'Error al eliminar categoría' });
  }
};

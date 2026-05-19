// src/controllers/categoria.controller.js
const pool = require('../config/db');

// GET /api/categorias?tipo=perecedero|no_perecedero
exports.listCategorias = async (req, res) => {
  try {
    const { tipo } = req.query;
    let query = 'SELECT id, nombre, tipo FROM categoria';
    const params = [];

    if (tipo === 'perecedero' || tipo === 'no_perecedero') {
      query += ' WHERE tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY tipo ASC, nombre ASC';

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error('Error listCategorias:', err);
    return res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

// POST /api/categorias (admin)
// Body: { "nombre": "...", "tipo": "perecedero"|"no_perecedero" }
exports.createCategoria = async (req, res) => {
  const { nombre, tipo } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'nombre es obligatorio' });
  }

  if (tipo && tipo !== 'perecedero' && tipo !== 'no_perecedero') {
    return res.status(400).json({ message: 'tipo debe ser "perecedero" o "no_perecedero"' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categoria (nombre, tipo) VALUES (?, ?)',
      [nombre, tipo || 'perecedero']
    );

    const [rows] = await pool.query(
      'SELECT id, nombre, tipo FROM categoria WHERE id = ?',
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
// Body: { "nombre": "...", "tipo": "perecedero"|"no_perecedero" }
exports.updateCategoria = async (req, res) => {
  const id = req.params.id;
  const { nombre, tipo } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'nombre es obligatorio' });
  }

  if (tipo && tipo !== 'perecedero' && tipo !== 'no_perecedero') {
    return res.status(400).json({ message: 'tipo debe ser "perecedero" o "no_perecedero"' });
  }

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM categoria WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    const fields = ['nombre = ?'];
    const params = [nombre];

    if (tipo) {
      fields.push('tipo = ?');
      params.push(tipo);
    }

    params.push(id);
    await pool.query(
      `UPDATE categoria SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    const [rows] = await pool.query(
      'SELECT id, nombre, tipo FROM categoria WHERE id = ?',
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

    const [productos] = await pool.query(
      'SELECT COUNT(*) AS total FROM producto WHERE categoria_id = ?',
      [id]
    );
    if (productos[0].total > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la categoría porque tiene productos asociados'
      });
    }

    await pool.query('DELETE FROM categoria WHERE id = ?', [id]);

    return res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('Error deleteCategoria:', err);
    return res.status(500).json({ message: 'Error al eliminar categoría' });
  }
};

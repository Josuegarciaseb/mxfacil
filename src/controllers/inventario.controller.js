// src/controllers/inventario.controller.js
const pool = require('../config/db');

// GET /api/inventario/:productoId
exports.getInventarioProducto = async (req, res) => {
  const productoId = req.params.productoId;

  try {
    // Verificar que el producto exista
    const [prod] = await pool.query(
      'SELECT id, nombre FROM producto WHERE id = ?',
      [productoId]
    );
    if (!prod.length) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const [rows] = await pool.query(
      'SELECT id, producto_id, stock FROM inventario WHERE producto_id = ?',
      [productoId]
    );

    if (!rows.length) {
      // Si no hay registro en inventario, asumimos stock 0
      return res.json({
        id: null,
        producto_id: parseInt(productoId, 10),
        stock: 0
      });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error getInventarioProducto:', err);
    return res.status(500).json({ message: 'Error al obtener inventario' });
  }
};

// PATCH /api/inventario/:productoId (admin)
// Body: { "stock": 120 }
exports.updateStockProducto = async (req, res) => {
  const productoId = req.params.productoId;
  const { stock } = req.body;

  if (stock == null || isNaN(stock)) {
    return res.status(400).json({ message: 'stock es obligatorio y debe ser numérico' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar que el producto exista
    const [prod] = await conn.query(
      'SELECT id, nombre FROM producto WHERE id = ?',
      [productoId]
    );
    if (!prod.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const [rowsInv] = await conn.query(
      'SELECT id FROM inventario WHERE producto_id = ?',
      [productoId]
    );

    if (rowsInv.length) {
      await conn.query(
        'UPDATE inventario SET stock = ? WHERE producto_id = ?',
        [stock, productoId]
      );
    } else {
      await conn.query(
        'INSERT INTO inventario (producto_id, stock) VALUES (?, ?)',
        [productoId, stock]
      );
    }

    const [final] = await conn.query(
      'SELECT id, producto_id, stock FROM inventario WHERE producto_id = ?',
      [productoId]
    );

    await conn.commit();
    return res.json(final[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error updateStockProducto:', err);
    return res.status(500).json({ message: 'Error al actualizar stock' });
  } finally {
    conn.release();
  }
};

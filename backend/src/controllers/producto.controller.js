// src/controllers/producto.controller.js
const pool = require('../config/db');
const path = require('path');
const fs   = require('fs');
const { isPositiveNumber, isPositiveInteger } = require('../utils/validators');


// Helper para obtener un producto con categoria, proveedor y stock
async function getProductoCompletoById(id, conn = null) {
  const executor = conn || pool;

  const [rows] = await executor.query(
    `
    SELECT
      p.id,
      p.proveedor_id,
      pr.nombre AS proveedor_nombre,
      p.categoria_id,
      c.nombre AS categoria_nombre,
      p.nombre,
      p.descripcion,
      p.precio,
      p.presentacion,
      p.activo,
      p.image_url,
      IFNULL(i.stock, 0) AS stock
    FROM producto p
    JOIN proveedor pr ON pr.id = p.proveedor_id
    JOIN categoria c ON c.id = p.categoria_id
    LEFT JOIN inventario i ON i.producto_id = p.id
    WHERE p.id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

// GET /api/productos
// Filtros opcionales: ?categoria_id= &proveedor_id= &q= &activo=1/0
exports.listProductos = async (req, res) => {
  const { categoria_id, proveedor_id, q, activo } = req.query;

  try {
    const params = [];
    let where = 'WHERE 1=1';

    if (categoria_id) {
      where += ' AND p.categoria_id = ?';
      params.push(categoria_id);
    }
    if (proveedor_id) {
      where += ' AND p.proveedor_id = ?';
      params.push(proveedor_id);
    }
    if (activo === '1' || activo === '0') {
      where += ' AND p.activo = ?';
      params.push(activo);
    } else {
      // Por defecto solo productos activos
      where += ' AND p.activo = 1';
    }
    if (q) {
      where += ' AND (p.nombre LIKE CONCAT("%", ?, "%") OR p.descripcion LIKE CONCAT("%", ?, "%"))';
      params.push(q, q);
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.proveedor_id,
        pr.nombre AS proveedor_nombre,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        p.nombre,
        p.descripcion,
        p.precio,
        p.presentacion,
        p.activo,
        p.image_url,
        IFNULL(i.stock, 0) AS stock
      FROM producto p
      JOIN proveedor pr ON pr.id = p.proveedor_id
      JOIN categoria c ON c.id = p.categoria_id
      LEFT JOIN inventario i ON i.producto_id = p.id
      ${where}
      ORDER BY p.id DESC
      `,
      params
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error listProductos:', err);
    return res.status(500).json({ message: 'Error al obtener productos' });
  }
};

// GET /api/productos/:id
exports.getProducto = async (req, res) => {
  const id = req.params.id;

  try {
    const producto = await getProductoCompletoById(id);
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    return res.json(producto);
  } catch (err) {
    console.error('Error getProducto:', err);
    return res.status(500).json({ message: 'Error al obtener producto' });
  }
};

// POST /api/productos (admin o vendedor)
exports.createProducto = async (req, res) => {
  let {
    proveedor_id,
    categoria_id,
    nombre,
    descripcion,
    precio,
    presentacion,
    activo,
    stock_inicial,
    image_url,
  } = req.body;

  // Si es vendedor, obtener su proveedor_id automáticamente
  if (req.user.rol === 'vendedor') {
    const [provRows] = await pool.query(
      'SELECT id FROM proveedor WHERE usuario_id = ?',
      [req.user.id]
    );
    if (!provRows.length) {
      return res.status(403).json({ message: 'El vendedor no tiene un proveedor asociado' });
    }
    proveedor_id = provRows[0].id;
  }

  if (!proveedor_id || !categoria_id || !nombre || precio == null) {
    return res.status(400).json({
      message: 'proveedor_id, categoria_id, nombre y precio son obligatorios'
    });
  }

  if (!isPositiveInteger(proveedor_id)) {
    return res.status(400).json({ message: 'proveedor_id debe ser un número entero mayor o igual a 0' });
  }

  if (!isPositiveInteger(categoria_id)) {
    return res.status(400).json({ message: 'categoria_id debe ser un número entero mayor o igual a 0' });
  }

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ message: 'El nombre del producto no puede estar vacío' });
  }

  if (!isPositiveNumber(precio)) {
    return res.status(400).json({ message: 'El precio debe ser un número mayor o igual a 0' });
  }

  if (stock_inicial != null && !isPositiveInteger(stock_inicial)) {
    return res.status(400).json({ message: 'stock_inicial debe ser un número entero mayor o igual a 0' });
  }

  if (presentacion != null && (typeof presentacion !== 'string' || presentacion.trim().length > 100)) {
    return res.status(400).json({ message: 'La presentación no puede superar 100 caracteres' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [prov] = await conn.query('SELECT id FROM proveedor WHERE id = ?', [proveedor_id]);
    if (!prov.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Proveedor no existe' });
    }

    const [cat] = await conn.query('SELECT id FROM categoria WHERE id = ?', [categoria_id]);
    if (!cat.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Categoría no existe' });
    }

    if (image_url != null && image_url !== '') {
      try { new URL(image_url); } catch {
        await conn.rollback();
        return res.status(400).json({ message: 'image_url debe ser una URL válida' });
      }
    }

    const [result] = await conn.query(
      `
      INSERT INTO producto
        (proveedor_id, categoria_id, nombre, descripcion, precio, presentacion, activo, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        proveedor_id,
        categoria_id,
        nombre.trim(),
        descripcion || null,
        precio,
        presentacion ? presentacion.trim() : null,
        (activo === 0 || activo === '0') ? 0 : 1,
        image_url || null,
      ]
    );
    const productoId = result.insertId;

    const stock = stock_inicial != null ? stock_inicial : 0;
    await conn.query(
      'INSERT INTO inventario (producto_id, stock) VALUES (?, ?)',
      [productoId, stock]
    );

    const productoCompleto = await getProductoCompletoById(productoId, conn);

    await conn.commit();
    return res.status(201).json(productoCompleto);
  } catch (err) {
    await conn.rollback();
    console.error('Error createProducto:', err);
    return res.status(500).json({ message: 'Error al crear producto' });
  } finally {
    conn.release();
  }
};


// PUT /api/productos/:id (admin o vendedor)
exports.updateProducto = async (req, res) => {
  const id = req.params.id;
  const {
    proveedor_id,
    categoria_id,
    nombre,
    descripcion,
    precio,
    presentacion,
    activo,
    image_url,
  } = req.body;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ message: 'El id del producto debe ser un número entero válido' });
  }

  if (proveedor_id != null && !isPositiveInteger(proveedor_id)) {
    return res.status(400).json({ message: 'proveedor_id debe ser un número entero mayor o igual a 0' });
  }

  if (categoria_id != null && !isPositiveInteger(categoria_id)) {
    return res.status(400).json({ message: 'categoria_id debe ser un número entero mayor o igual a 0' });
  }

  if (nombre != null && (typeof nombre !== 'string' || !nombre.trim())) {
    return res.status(400).json({ message: 'El nombre del producto no puede estar vacío' });
  }

  if (precio != null && !isPositiveNumber(precio)) {
    return res.status(400).json({ message: 'El precio debe ser un número mayor o igual a 0' });
  }

  if (activo != null && ![0, 1, '0', '1', true, false].includes(activo)) {
    return res.status(400).json({ message: 'activo solo puede ser 0 o 1' });
  }

  if (presentacion != null && (typeof presentacion !== 'string' || presentacion.trim().length > 100)) {
    return res.status(400).json({ message: 'La presentación no puede superar 100 caracteres' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existentes] = await conn.query('SELECT * FROM producto WHERE id = ?', [id]);
    if (!existentes.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const actual = existentes[0];

    if (req.user.rol === 'vendedor') {
      const [provRows] = await conn.query('SELECT id FROM proveedor WHERE usuario_id = ?', [req.user.id]);
      if (!provRows.length || actual.proveedor_id !== provRows[0].id) {
        await conn.rollback();
        return res.status(403).json({ message: 'No puedes editar un producto que no es tuyo' });
      }
    }

    if (proveedor_id != null) {
      const [prov] = await conn.query('SELECT id FROM proveedor WHERE id = ?', [proveedor_id]);
      if (!prov.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'Proveedor no existe' });
      }
    }

    if (categoria_id != null) {
      const [cat] = await conn.query('SELECT id FROM categoria WHERE id = ?', [categoria_id]);
      if (!cat.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'Categoría no existe' });
      }
    }

    let activoFinal = actual.activo;
    if (activo === 0 || activo === '0' || activo === false) activoFinal = 0;
    else if (activo === 1 || activo === '1' || activo === true) activoFinal = 1;

    if (image_url != null && image_url !== '') {
      try { new URL(image_url); } catch {
        await conn.rollback();
        return res.status(400).json({ message: 'image_url debe ser una URL válida' });
      }
    }

    const imageUrlFinal = image_url !== undefined ? (image_url || null) : actual.image_url;
    if (
      image_url !== undefined &&
      actual.image_url &&
      actual.image_url !== image_url &&
      actual.image_url.startsWith('/uploads/')
    ) {
      const oldFile = path.join(__dirname, '../../', actual.image_url);
      fs.unlink(oldFile, () => {});
    }

    await conn.query(
      `
      UPDATE producto
      SET proveedor_id = ?,
          categoria_id = ?,
          nombre = ?,
          descripcion = ?,
          precio = ?,
          presentacion = ?,
          activo = ?,
          image_url = ?
      WHERE id = ?
      `,
      [
        proveedor_id != null ? proveedor_id : actual.proveedor_id,
        categoria_id != null ? categoria_id : actual.categoria_id,
        nombre != null ? nombre.trim() : actual.nombre,
        descripcion != null ? descripcion : actual.descripcion,
        precio != null ? precio : actual.precio,
        presentacion !== undefined ? (presentacion ? presentacion.trim() : null) : actual.presentacion,
        activoFinal,
        imageUrlFinal,
        id
      ]
    );

    const productoCompleto = await getProductoCompletoById(id, conn);

    await conn.commit();
    return res.json(productoCompleto);
  } catch (err) {
    await conn.rollback();
    console.error('Error updateProducto:', err);
    return res.status(500).json({ message: 'Error al actualizar producto' });
  } finally {
    conn.release();
  }
};


// POST /api/productos/imagen (admin o vendedor)
exports.uploadImagen = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo' });
  }
  const url = `/uploads/productos/${req.file.filename}`;
  return res.status(201).json({ url });
};


// DELETE /api/productos/:id (admin o vendedor)
exports.deleteProducto = async (req, res) => {
  const id = req.params.id;

  try {
    const [existentes] = await pool.query(
      'SELECT id, proveedor_id FROM producto WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (req.user.rol === 'vendedor') {
      const [provRows] = await pool.query('SELECT id FROM proveedor WHERE usuario_id = ?', [req.user.id]);
      if (!provRows.length || existentes[0].proveedor_id !== provRows[0].id) {
        return res.status(403).json({ message: 'No puedes desactivar un producto que no es tuyo' });
      }
    }

    await pool.query('UPDATE producto SET activo = 0 WHERE id = ?', [id]);

    return res.json({ message: 'Producto desactivado correctamente' });
  } catch (err) {
    console.error('Error deleteProducto:', err);
    return res.status(500).json({ message: 'Error al desactivar producto' });
  }
};

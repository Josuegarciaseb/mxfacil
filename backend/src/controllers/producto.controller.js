// src/controllers/producto.controller.js
const pool = require('../config/db');
const path = require('path');
const fs   = require('fs');
const { isPositiveNumber, isPositiveInteger } = require('../utils/validators');

function validImageUrl(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || value.length > 500) return false;
  if (/^\/uploads\/productos\/[a-f0-9]{32}\.(jpe?g|png|webp|gif)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

// Helper para obtener un producto con categoria, proveedor y stock
async function getProductoCompletoById(id, conn = null) {
  const executor = conn || pool;

  const [rows] = await executor.query(
    `
    SELECT
      p.id,
      p.proveedor_id,
      pr.nombre AS proveedor_nombre,
      (SELECT COUNT(*) FROM resena r WHERE r.producto_id=p.id) AS resenas_total,
      (SELECT AVG(r.calidad) FROM resena r WHERE r.producto_id=p.id) AS calidad_promedio,
      (SELECT AVG(r.servicio) FROM resena r WHERE r.proveedor_id=pr.id) AS servicio_promedio,
      EXISTS(SELECT 1 FROM membresia m WHERE m.proveedor_id=pr.id
        AND m.vence_en>UTC_TIMESTAMP(3) AND pr.verificado='aprobado') AS proveedor_pro,
      p.categoria_id,
      c.nombre AS categoria_nombre,
      c.en_catalogo AS categoria_en_catalogo,
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
  if ([categoria_id, proveedor_id].some(id => id != null && id !== '' && !isPositiveInteger(id)) ||
      (q != null && (typeof q !== 'string' || q.length > 200))) {
    return res.status(400).json({message:'Filtro de productos inválido'});
  }

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
    if (req.user?.rol === 'vendedor') {
      where += ' AND pr.usuario_id = ?';
      params.push(req.user.id);
    }
    if (!req.user) {
      where += ' AND p.activo = 1 AND c.en_catalogo = 1';
    } else if (activo === '1' || activo === '0') {
      where += ' AND p.activo = ?';
      params.push(activo);
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
      (SELECT COUNT(*) FROM resena r WHERE r.producto_id=p.id) AS resenas_total,
      (SELECT AVG(r.calidad) FROM resena r WHERE r.producto_id=p.id) AS calidad_promedio,
      (SELECT AVG(r.servicio) FROM resena r WHERE r.proveedor_id=pr.id) AS servicio_promedio,
      EXISTS(SELECT 1 FROM membresia m WHERE m.proveedor_id=pr.id
        AND m.vence_en>UTC_TIMESTAMP(3) AND pr.verificado='aprobado') AS proveedor_pro,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        c.en_catalogo AS categoria_en_catalogo,
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
    if (!producto || !producto.activo || !producto.categoria_en_catalogo) {
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

  if (!validImageUrl(image_url)) return res.status(400).json({message:'Imagen de producto inválida'});
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

    const [cat] = await conn.query('SELECT id FROM categoria WHERE id = ? AND en_catalogo = 1', [categoria_id]);
    if (!cat.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Selecciona una categoría disponible en el catálogo' });
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
      if (!provRows.length || actual.proveedor_id !== provRows[0].id || (proveedor_id != null && Number(proveedor_id) !== actual.proveedor_id)) {
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

    if (categoria_id != null || [1, '1', true].includes(activo)) {
      const [cat] = await conn.query('SELECT id FROM categoria WHERE id = ? AND en_catalogo = 1', [categoria_id ?? actual.categoria_id]);
      if (!cat.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'Selecciona una categoría disponible en el catálogo' });
      }
    }

    let activoFinal = actual.activo;
    if (activo === 0 || activo === '0' || activo === false) activoFinal = 0;
    else if (activo === 1 || activo === '1' || activo === true) activoFinal = 1;

    if (!validImageUrl(image_url)) {
      await conn.rollback();
      return res.status(400).json({message:'Imagen de producto inválida'});
    }
    const imageUrlFinal = image_url !== undefined ? (image_url || null) : actual.image_url;

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
exports.uploadImagen = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo' });
  }
  const bytes = req.file.buffer;
  const formats = {
    jpg: bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex')),
    png: bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),
    gif: ['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6)),
    webp: bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP',
  };
  const ext = path.extname(req.file.originalname).slice(1).toLowerCase().replace(/^jpeg$/,'jpg');
  if (!formats[ext]) return res.status(400).json({message:'El contenido no corresponde al formato de imagen'});
  const filename = require('node:crypto').randomBytes(16).toString('hex') + '.' + ext;
  const dir = path.join(__dirname,'../../uploads/productos');
  await fs.promises.mkdir(dir,{recursive:true});
  await fs.promises.writeFile(path.join(dir,filename),bytes,{flag:'wx'});
  const url = '/uploads/productos/' + filename;
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

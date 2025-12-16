// src/controllers/proveedor.controller.js
const pool = require('../config/db');
const { isValidEmail, isValidName, isValidPhone } = require('../utils/validators');

// GET /api/proveedores
// Opcional: ?tipo=local|dropshipping
exports.listProveedores = async (req, res) => {
  const { tipo } = req.query;

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (tipo === 'local' || tipo === 'dropshipping') {
      where += ' AND tipo = ?';
      params.push(tipo);
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        nombre,
        tipo,
        contacto_email,
        telefono
      FROM proveedor
      ${where}
      ORDER BY nombre ASC
      `,
      params
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error listProveedores:', err);
    return res.status(500).json({ message: 'Error al obtener proveedores' });
  }
};

// POST /api/proveedores (admin)
exports.createProveedor = async (req, res) => {
  const { nombre, tipo, contacto_email, telefono } = req.body;

  if (!nombre) {
  return res.status(400).json({ message: 'nombre es obligatorio' });
}

  if (!telefono) {
    return res.status(400).json({ message: 'telefono es obligatorio' });
  }

  if (!isValidPhone(telefono)) {
    return res.status(400).json({
      message: 'El teléfono debe contener exactamente 10 dígitos numéricos'
    });
  }


//  if (!isValidName(nombre)) {
//    return res.status(400).json({
//      message: 'El nombre solo puede contener letras y espacios, sin números ni símbolos'
//    });
//  }

  if (contacto_email && !isValidEmail(contacto_email)) {
    return res.status(400).json({
      message: 'El correo de contacto no es válido (ejemplo: correo@ejemplo.com)'
    });
  }

  if (telefono && !isValidPhone(telefono)) {
    return res.status(400).json({
      message: 'El teléfono debe contener exactamente 10 dígitos numéricos'
    });
  }

  const tipoValido = tipo === 'local' || tipo === 'dropshipping' ? tipo : 'local';

  try {
    const [result] = await pool.query(
      `
      INSERT INTO proveedor (nombre, tipo, contacto_email, telefono)
      VALUES (?, ?, ?, ?)
      `,
      [nombre, tipoValido, contacto_email || null, telefono || null]
    );

    const [rows] = await pool.query(
      'SELECT id, nombre, tipo, contacto_email, telefono FROM proveedor WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error createProveedor:', err);
    return res.status(500).json({ message: 'Error al crear proveedor' });
  }
};

// PUT /api/proveedores/:id (admin)
exports.updateProveedor = async (req, res) => {
  const id = req.params.id;
  const { nombre, tipo, contacto_email, telefono } = req.body;

  try {
    const [existentes] = await pool.query(
      'SELECT * FROM proveedor WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    const actual = existentes[0];

    // Validaciones
    //if (nombre != null && nombre !== '' && !isValidName(nombre)) {
      //return res.status(400).json({
        //message: 'El nombre solo puede contener letras y espacios, sin números ni símbolos'
      //});
    //}

    if (contacto_email != null && contacto_email !== '' && !isValidEmail(contacto_email)) {
      return res.status(400).json({
        message: 'El correo de contacto no es válido (ejemplo: correo@ejemplo.com)'
      });
    }

    if (telefono != null && telefono !== '' && !isValidPhone(telefono)) {
      return res.status(400).json({
        message: 'El teléfono debe contener exactamente 10 dígitos numéricos'
      });
    }

    let tipoFinal = actual.tipo;
    if (tipo === 'local' || tipo === 'dropshipping') {
      tipoFinal = tipo;
    }

    await pool.query(
      `
      UPDATE proveedor
      SET nombre = ?,
          tipo = ?,
          contacto_email = ?,
          telefono = ?
      WHERE id = ?
      `,
      [
        nombre != null && nombre !== '' ? nombre : actual.nombre,
        tipoFinal,
        contacto_email != null ? contacto_email : actual.contacto_email,
        telefono != null ? telefono : actual.telefono,
        id
      ]
    );

    const [rows] = await pool.query(
      'SELECT id, nombre, tipo, contacto_email, telefono FROM proveedor WHERE id = ?',
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updateProveedor:', err);
    return res.status(500).json({ message: 'Error al actualizar proveedor' });
  }
};

// DELETE /api/proveedores/:id (admin)
exports.deleteProveedor = async (req, res) => {
  const id = req.params.id;

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM proveedor WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    const [productos] = await pool.query(
      'SELECT COUNT(*) AS total FROM producto WHERE proveedor_id = ?',
      [id]
    );
    if (productos[0].total > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el proveedor porque tiene productos asociados'
      });
    }

    await pool.query(
      'DELETE FROM proveedor WHERE id = ?',
      [id]
    );

    return res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (err) {
    console.error('Error deleteProveedor:', err);
    return res.status(500).json({ message: 'Error al eliminar proveedor' });
  }
};

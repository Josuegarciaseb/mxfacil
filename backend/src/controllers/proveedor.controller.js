// src/controllers/proveedor.controller.js
const pool = require('../config/db');
const { isValidEmail, isValidName, isValidPhone, isValidRFC } = require('../utils/validators');

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
        telefono,
        rfc,
        verificado,
        verificado_en,
        motivo_rechazo
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
  const { nombre, tipo, contacto_email, telefono, rfc } = req.body;

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

  if (contacto_email && !isValidEmail(contacto_email)) {
    return res.status(400).json({
      message: 'El correo de contacto no es válido (ejemplo: correo@ejemplo.com)'
    });
  }

  if (rfc && !isValidRFC(rfc)) {
    return res.status(400).json({
      message: 'El RFC no tiene un formato válido (ej: ABC010101AAA o XAXX010101000)'
    });
  }

  const tipoValido = tipo === 'local' || tipo === 'dropshipping' ? tipo : 'local';
  const rfcFinal   = rfc ? rfc.trim().toUpperCase() : null;

  try {
    const [result] = await pool.query(
      `
      INSERT INTO proveedor (nombre, tipo, contacto_email, telefono, rfc)
      VALUES (?, ?, ?, ?, ?)
      `,
      [nombre, tipoValido, contacto_email || null, telefono || null, rfcFinal]
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, tipo, contacto_email, telefono, rfc, verificado, verificado_en, motivo_rechazo
       FROM proveedor WHERE id = ?`,
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
  const { nombre, tipo, contacto_email, telefono, rfc } = req.body;

  try {
    const [existentes] = await pool.query(
      'SELECT * FROM proveedor WHERE id = ?',
      [id]
    );
    if (!existentes.length) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    const actual = existentes[0];

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

    if (rfc != null && rfc !== '' && !isValidRFC(rfc)) {
      return res.status(400).json({
        message: 'El RFC no tiene un formato válido (ej: ABC010101AAA o XAXX010101000)'
      });
    }

    let tipoFinal = actual.tipo;
    if (tipo === 'local' || tipo === 'dropshipping') tipoFinal = tipo;

    const rfcNuevo = rfc != null && rfc !== '' ? rfc.trim().toUpperCase() : actual.rfc;

    // Si el RFC cambia, volver a pendiente para re-verificación
    const rfcCambio     = rfcNuevo !== actual.rfc;
    const verificadoFin = rfcCambio ? 'pendiente' : actual.verificado;
    const verificadoEn  = rfcCambio ? null        : actual.verificado_en;
    const motivoFin     = rfcCambio ? null        : actual.motivo_rechazo;

    await pool.query(
      `
      UPDATE proveedor
      SET nombre          = ?,
          tipo            = ?,
          contacto_email  = ?,
          telefono        = ?,
          rfc             = ?,
          verificado      = ?,
          verificado_en   = ?,
          motivo_rechazo  = ?
      WHERE id = ?
      `,
      [
        nombre != null && nombre !== '' ? nombre : actual.nombre,
        tipoFinal,
        contacto_email != null ? contacto_email : actual.contacto_email,
        telefono       != null ? telefono       : actual.telefono,
        rfcNuevo,
        verificadoFin,
        verificadoEn,
        motivoFin,
        id,
      ]
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, tipo, contacto_email, telefono, rfc, verificado, verificado_en, motivo_rechazo
       FROM proveedor WHERE id = ?`,
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updateProveedor:', err);
    return res.status(500).json({ message: 'Error al actualizar proveedor' });
  }
};

// PATCH /api/proveedores/:id/verificacion (admin)
// Body: { accion: "aprobar" | "rechazar", motivo?: string }
exports.verificarProveedor = async (req, res) => {
  const id = req.params.id;
  const { accion, motivo } = req.body;

  if (accion !== 'aprobar' && accion !== 'rechazar') {
    return res.status(400).json({
      message: 'accion debe ser "aprobar" o "rechazar"'
    });
  }

  if (accion === 'rechazar' && (!motivo || !motivo.trim())) {
    return res.status(400).json({
      message: 'motivo es obligatorio al rechazar'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, rfc, verificado FROM proveedor WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    if (!rows[0].rfc) {
      return res.status(400).json({
        message: 'El proveedor no tiene RFC registrado; no se puede verificar'
      });
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
    const motivoFinal = accion === 'rechazar' ? motivo.trim() : null;

    await pool.query(
      `
      UPDATE proveedor
      SET verificado     = ?,
          verificado_en  = NOW(),
          verificado_por = ?,
          motivo_rechazo = ?
      WHERE id = ?
      `,
      [nuevoEstado, req.user.id, motivoFinal, id]
    );

    const [updated] = await pool.query(
      `SELECT id, nombre, rfc, verificado, verificado_en, motivo_rechazo
       FROM proveedor WHERE id = ?`,
      [id]
    );

    return res.json(updated[0]);
  } catch (err) {
    console.error('Error verificarProveedor:', err);
    return res.status(500).json({ message: 'Error al verificar proveedor' });
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

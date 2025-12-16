// src/controllers/usuario.controller.js
const pool = require('../config/db');
const {
  isValidEmail,
  isValidName,
  isValidPhone
} = require('../utils/validators');

// GET /api/usuario/me
exports.getMe = async (req, res) => {
  // req.user viene del middleware de auth
  return res.json(req.user);
};

// PUT /api/usuario/me  (usuario actual)
exports.updateMe = async (req, res) => {
  const userId = req.user.id;
  const { nombre, email, telefono } = req.body;

  try {
    // Obtener datos actuales
    const [actualRows] = await pool.query(
      'SELECT id, nombre, email, telefono, rol, creado_en FROM usuario WHERE id = ?',
      [userId]
    );
    if (!actualRows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const actual = actualRows[0];

    // ===== VALIDACIONES =====

    // Nombre: si viene, validar solo letras y espacios
    if (nombre != null && nombre !== '') {
      if (!isValidName(nombre)) {
        return res.status(400).json({
          message: 'El nombre solo puede contener letras y espacios, sin números ni símbolos'
        });
      }
    }

    // Teléfono: si viene, validar 10 dígitos
    if (telefono != null && telefono !== '') {
      if (!isValidPhone(telefono)) {
        return res.status(400).json({
          message: 'El teléfono debe contener exactamente 10 dígitos numéricos'
        });
      }
    }

    // Email: si viene, validar formato y que no esté repetido
    if (email != null && email !== '') {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: 'El email no tiene un formato válido (ejemplo: correo@ejemplo.com)'
        });
      }

      const [emailRows] = await pool.query(
        'SELECT id FROM usuario WHERE email = ? AND id <> ?',
        [email.toLowerCase().trim(), userId]
      );
      if (emailRows.length) {
        return res.status(409).json({
          message: 'Ya existe un usuario registrado con ese email'
        });
      }
    }

    // ===== VALORES FINALES =====
    const nombreFinal =
      nombre != null && nombre !== '' ? nombre.trim() : actual.nombre;
    const emailFinal =
      email != null && email !== ''
        ? email.toLowerCase().trim()
        : actual.email;
    const telefonoFinal =
      telefono != null && telefono !== '' ? telefono : actual.telefono;

    // Actualizar en BD
    await pool.query(
      'UPDATE usuario SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
      [nombreFinal, emailFinal, telefonoFinal, userId]
    );

    const [rows] = await pool.query(
      'SELECT id, nombre, email, telefono, rol, creado_en FROM usuario WHERE id = ?',
      [userId]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updateMe:', err);
    return res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};

// PUT /api/usuario/:id  (solo admin)
exports.updateUsuarioAdmin = async (req, res) => {
  const usuarioId = req.params.id;
  const { nombre, email, telefono, rol } = req.body;

  try {
    // 1) Buscar usuario a modificar
    const [actualRows] = await pool.query(
      'SELECT id, nombre, email, telefono, rol, creado_en FROM usuario WHERE id = ?',
      [usuarioId]
    );
    if (!actualRows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const actual = actualRows[0];

    // ===== VALIDACIONES =====

    // Nombre
    if (nombre != null && nombre !== '') {
      if (!isValidName(nombre)) {
        return res.status(400).json({
          message: 'El nombre solo puede contener letras y espacios, sin números ni símbolos'
        });
      }
    }

    // Teléfono
    if (telefono != null && telefono !== '') {
      if (!isValidPhone(telefono)) {
        return res.status(400).json({
          message: 'El teléfono debe contener exactamente 10 dígitos numéricos'
        });
      }
    }

    // Email
    if (email != null && email !== '') {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: 'El email no tiene un formato válido (ejemplo: correo@ejemplo.com)'
        });
      }

      const [emailRows] = await pool.query(
        'SELECT id FROM usuario WHERE email = ? AND id <> ?',
        [email.toLowerCase().trim(), usuarioId]
      );
      if (emailRows.length) {
        return res.status(409).json({
          message: 'Ya existe un usuario registrado con ese email'
        });
      }
    }

    // Rol (opcional): solo permitir 'cliente' o 'admin'
    let rolFinal = actual.rol;
    if (rol === 'cliente' || rol === 'admin') {
      rolFinal = rol;
    }

    // ===== VALORES FINALES =====
    const nombreFinal =
      nombre != null && nombre !== '' ? nombre.trim() : actual.nombre;
    const emailFinal =
      email != null && email !== ''
        ? email.toLowerCase().trim()
        : actual.email;
    const telefonoFinal =
      telefono != null && telefono !== '' ? telefono : actual.telefono;

    // 3) Actualizar
    await pool.query(
      'UPDATE usuario SET nombre = ?, email = ?, telefono = ?, rol = ? WHERE id = ?',
      [nombreFinal, emailFinal, telefonoFinal, rolFinal, usuarioId]
    );

    const [rows] = await pool.query(
      'SELECT id, nombre, email, telefono, rol, creado_en FROM usuario WHERE id = ?',
      [usuarioId]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updateUsuarioAdmin:', err);
    return res.status(500).json({ message: 'Error al actualizar usuario (admin)' });
  }
};

// GET /api/usuario (admin)
exports.listUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        nombre,
        email,
        telefono,
        rol,
        creado_en
      FROM usuario
      ORDER BY creado_en DESC
      `
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error listUsuarios:', err);
    return res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// DELETE /api/usuario/:id (solo admin)
exports.deleteUsuario = async (req, res) => {
  const usuarioId = req.params.id;

  try {
    const [rows] = await pool.query(
      'SELECT id, email FROM usuario WHERE id = ?',
      [usuarioId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.user.id == usuarioId) {
      return res.status(400).json({
        message: 'No puedes eliminar tu propio usuario (admin)'
      });
    }

    await pool.query(
      'DELETE FROM usuario WHERE id = ?',
      [usuarioId]
    );

    return res.json({
      message: 'Usuario eliminado correctamente',
      id: usuarioId
    });

  } catch (err) {
    console.error('Error deleteUsuario:', err);
    return res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// src/controllers/auth.controller.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { isValidEmail, isValidName, isValidPhone, isValidPassword } = require('../utils/validators');



function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const { nombre, email, password, telefono } = req.body;

  // 1) Campos obligatorios
  if (!nombre || !email || !password) {
    return res.status(400).json({ message: 'nombre, email y password son obligatorios' });
  }

  // 2) Validar nombre (solo letras y espacios)
  if (!isValidName(nombre)) {
    return res.status(400).json({
      message: 'El nombre solo puede contener letras y espacios, sin números ni símbolos'
    });
  }

  // 3) Validar email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: 'El email no tiene un formato válido (ejemplo: correo@ejemplo.com)'
    });
  }

  // 4) Validar teléfono (si viene)
  if (telefono && !isValidPhone(telefono)) {
    return res.status(400).json({
      message: 'El teléfono debe contener exactamente 10 dígitos numéricos'
    });
  }

  // Validar contraseña
  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: 'La contraseña debe tener mínimo 8 caracteres, una letra mayúscula y un carácter especial'
    });
  }


  try {
    // ¿email ya existe?
    const [existentes] = await pool.query(
      'SELECT id FROM usuario WHERE email = ?',
      [email]
    );
    if (existentes.length) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO usuario (nombre, email, password_hash, telefono) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email.toLowerCase().trim(), password_hash, telefono || null]
    );

    const nuevoUsuario = {
      id: result.insertId,
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono || null,
      rol: 'cliente'
    };

    const token = generarToken(nuevoUsuario);

    return res.status(201).json({
      user: nuevoUsuario,
      token
    });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ message: 'Error al registrar usuario' });
  }
};


// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email y password son obligatorios' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, password_hash, telefono, rol FROM usuario WHERE email = ?',
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);

    // no mandamos password_hash al cliente
    delete usuario.password_hash;

    return res.json({
      user: usuario,
      token
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

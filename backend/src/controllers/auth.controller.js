// ─── Dependencias ────────────────────────────────────────────────────────────
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const { authenticator } = require('otplib');   // TOTP para MFA
const qrcode      = require('qrcode');          // Generar QR para MFA
const pool        = require('../config/db');
const { encrypt, decrypt, hashData, signData, verifySignature } = require('../utils/crypto.utils');
const {
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidPassword,
  isValidRFC,
} = require('../utils/validators');

// ─── Helper: generar JWT ──────────────────────────────────────────────────────
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );
}

// ─── Helper: opciones seguras de cookie ──────────────────────────────────────
function cookieOpts(maxAgeDays = 7) {
  return {
    httpOnly: true,                                      // No accesible desde JS
    secure: process.env.NODE_ENV === 'production',       // Solo HTTPS en producción
    sameSite: 'strict',                                  // Previene CSRF
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { nombre, email, password, telefono, rol, rfc } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ message: 'nombre, email y password son obligatorios' });

  if (!isValidName(nombre))
    return res.status(400).json({ message: 'El nombre solo puede contener letras y espacios' });

  if (!isValidEmail(email))
    return res.status(400).json({ message: 'El email no tiene formato válido' });

  if (telefono && !isValidPhone(telefono))
    return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos' });

  if (!isValidPassword(password))
    return res.status(400).json({
      message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un carácter especial',
    });

  // Solo se permite registrarse como cliente o vendedor (nunca admin)
  const rolFinal = rol === 'vendedor' ? 'vendedor' : 'cliente';

  if (rfc && !isValidRFC(rfc))
    return res.status(400).json({ message: 'El RFC no tiene un formato válido' });

  try {
    const [existentes] = await pool.query('SELECT id FROM usuario WHERE email = ?', [email]);
    if (existentes.length)
      return res.status(409).json({ message: 'El email ya está registrado' });

    const salt          = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    const email_hash    = hashData(email.toLowerCase().trim());

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO usuario (nombre, email, password_hash, email_hash, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre.trim(), email.toLowerCase().trim(), password_hash, email_hash, telefono || null, rolFinal]
      );

      const userId = result.insertId;
      let proveedor_id = null;

      if (rolFinal === 'vendedor') {
        const rfcFinal = rfc ? rfc.trim().toUpperCase() : null;
        const [provResult] = await conn.query(
          'INSERT INTO proveedor (usuario_id, nombre, telefono, rfc) VALUES (?, ?, ?, ?)',
          [userId, nombre.trim(), telefono || null, rfcFinal]
        );
        proveedor_id = provResult.insertId;
      }

      await conn.commit();

      const nuevoUsuario = {
        id:          userId,
        nombre:      nombre.trim(),
        email:       email.toLowerCase().trim(),
        telefono:    telefono || null,
        rol:         rolFinal,
        proveedor_id,
      };

      const token = generarToken(nuevoUsuario);
      res.cookie('auth_token', token, cookieOpts(7));

      return res.status(201).json({ user: nuevoUsuario, token });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password, totp_code } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'email y password son obligatorios' });

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, password_hash, telefono, rol, mfa_secret, mfa_enabled FROM usuario WHERE email = ?',
      [email]
    );
    if (!rows.length)
      return res.status(401).json({ message: 'Credenciales inválidas' });

    const usuario = rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida)
      return res.status(401).json({ message: 'Credenciales inválidas' });

    // ── MFA: si está habilitado, verificar código TOTP ──
    if (usuario.mfa_enabled) {
      if (!totp_code)
        return res.status(401).json({ message: 'Se requiere código MFA', mfa_required: true });

      const secret = decrypt(usuario.mfa_secret);  // Desencriptar el secreto almacenado
      const valid  = authenticator.verify({ token: totp_code, secret });
      if (!valid)
        return res.status(401).json({ message: 'Código MFA inválido o expirado' });
    }

    const token = generarToken(usuario);

    // Para vendedores, incluir su proveedor_id en el payload
    let proveedor_id = null;
    if (usuario.rol === 'vendedor') {
      const [provRows] = await pool.query(
        'SELECT id FROM proveedor WHERE usuario_id = ?',
        [usuario.id]
      );
      if (provRows.length) proveedor_id = provRows[0].id;
    }

    // Firmar los datos de respuesta (integridad + autenticidad)
    const payload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, proveedor_id };
    const signature = signData(payload);

    // JWT en cookie HttpOnly segura
    res.cookie('auth_token', token, cookieOpts(7));

    delete usuario.password_hash;
    delete usuario.mfa_secret;

    return res.json({ user: payload, token, signature });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  return res.json({ message: 'Sesión cerrada correctamente' });
};

// ─── POST /api/auth/mfa/setup — Configurar TOTP (MFA) ───────────────────────
exports.setupMfa = async (req, res) => {
  const userId = req.user.id;

  try {
    // Generar secreto TOTP
    const secret = authenticator.generateSecret();

    // Encriptar el secreto antes de guardarlo (cifrado simétrico AES-256)
    const encryptedSecret = encrypt(secret);

    // Guardar secreto encriptado en BD (aún no activado)
    await pool.query('UPDATE usuario SET mfa_secret = ?, mfa_enabled = 0 WHERE id = ?', [encryptedSecret, userId]);

    const [rows] = await pool.query('SELECT email FROM usuario WHERE id = ?', [userId]);
    const email  = rows[0].email;

    // Generar URI para la app autenticadora
    const otpAuthUrl = authenticator.keyuri(email, 'ComercioFácilMX', secret);

    // Generar QR en base64
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    return res.json({
      message: 'Escanea el QR con tu app autenticadora (Google Authenticator, Authy, etc.)',
      secret,         // Mostrar solo en setup — el usuario puede guardarlo como respaldo
      qrCode: qrCodeDataUrl,
    });
  } catch (err) {
    console.error('Error en setupMfa:', err);
    return res.status(500).json({ message: 'Error al configurar MFA' });
  }
};

// ─── POST /api/auth/mfa/verify — Verificar y activar MFA ────────────────────
exports.verifyMfa = async (req, res) => {
  const userId    = req.user.id;
  const { totp_code } = req.body;

  if (!totp_code)
    return res.status(400).json({ message: 'totp_code es obligatorio' });

  try {
    const [rows] = await pool.query('SELECT mfa_secret FROM usuario WHERE id = ?', [userId]);
    if (!rows.length || !rows[0].mfa_secret)
      return res.status(400).json({ message: 'Primero configura el MFA con /mfa/setup' });

    const secret = decrypt(rows[0].mfa_secret);
    const valid  = authenticator.verify({ token: totp_code, secret });

    if (!valid)
      return res.status(400).json({ message: 'Código TOTP inválido. Verifica tu app autenticadora.' });

    // Activar MFA
    await pool.query('UPDATE usuario SET mfa_enabled = 1 WHERE id = ?', [userId]);

    return res.json({ message: 'MFA activado correctamente. A partir de ahora necesitarás el código en cada inicio de sesión.' });
  } catch (err) {
    console.error('Error en verifyMfa:', err);
    return res.status(500).json({ message: 'Error al verificar MFA' });
  }
};

// ─── POST /api/auth/mfa/disable — Desactivar MFA ─────────────────────────────
exports.disableMfa = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password)
    return res.status(400).json({ message: 'password es obligatorio para desactivar MFA' });

  try {
    const [rows] = await pool.query('SELECT password_hash FROM usuario WHERE id = ?', [userId]);
    const valid  = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Contraseña incorrecta' });

    await pool.query('UPDATE usuario SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?', [userId]);
    return res.json({ message: 'MFA desactivado' });
  } catch (err) {
    console.error('Error en disableMfa:', err);
    return res.status(500).json({ message: 'Error al desactivar MFA' });
  }
};

// ─── GET /api/auth/verify-signature — Verificar firma digital de datos ───────
exports.verifyDataSignature = (req, res) => {
  const { data, signature } = req.body;
  if (!data || !signature)
    return res.status(400).json({ message: 'data y signature son obligatorios' });

  const isValid = verifySignature(data, signature);
  return res.json({ valid: isValid, message: isValid ? 'Firma válida' : 'Firma inválida o datos modificados' });
};

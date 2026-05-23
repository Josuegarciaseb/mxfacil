const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const jwt      = require('jsonwebtoken');

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );
}

// ─── Iniciar flujo OAuth2 con Google ─────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// ─── Callback después de autenticación en Google ──────────────────────────────
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  (req, res) => {
    const token = generarToken(req.user);

    // Redirigir al frontend con token en cookie HttpOnly segura
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // ✅ El token NUNCA viaja en la URL — solo en la cookie HttpOnly ya establecida.
    // El frontend lo recupera con GET /api/auth/session (intercambio de un solo uso).
    return res.redirect(`${frontendUrl}/oauth-success`);
  }
);

// ─── Fallo de autenticación ───────────────────────────────────────────────────
router.get('/google/failure', (req, res) => {
  return res.status(401).json({ message: 'Autenticación con Google fallida' });
});

module.exports = router;

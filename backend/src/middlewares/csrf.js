const { generateCsrfToken, validateCsrfToken } = require('../utils/csrf.utils');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Rutas que no requieren CSRF (webhooks de proveedores de pago externos)
function isExempt(path) {
  return path.includes('webhook') || path === '/api/csrf-token';
}

// Middleware — valida X-CSRF-Token en métodos mutantes
function csrfProtect(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (isExempt(req.path))           return next();

  const token = req.headers['x-csrf-token'];
  if (!validateCsrfToken(token)) {
    return res.status(403).json({ message: 'Token CSRF inválido o expirado' });
  }
  next();
}

// Handler para GET /api/csrf-token
function csrfTokenHandler(req, res) {
  const token = generateCsrfToken();

  // Double-Submit Cookie: el token también se envía como cookie legible por JS
  res.cookie('csrf_token', token, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   3600 * 1000,
  });

  res.json({ csrfToken: token });
}

module.exports = { csrfProtect, csrfTokenHandler };

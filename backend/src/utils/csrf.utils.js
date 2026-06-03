const crypto = require('crypto');

// Clave HMAC: debe estar en .env como CSRF_SECRET (64 chars hex)
let _secret = null;
function getSecret() {
  if (!_secret) {
    if (!process.env.CSRF_SECRET) {
      console.warn('[CSRF] CSRF_SECRET no definido en .env — usando clave efímera (no apto para múltiples instancias)');
      _secret = crypto.randomBytes(32).toString('hex');
    } else {
      _secret = process.env.CSRF_SECRET;
    }
  }
  return _secret;
}

const TTL_SEC = 3600; // 1 hora

// Genera token con estructura: timestamp:random:hmac
function generateCsrfToken() {
  const ts      = Math.floor(Date.now() / 1000);
  const random  = crypto.randomBytes(24).toString('hex');
  const payload = `${ts}:${random}`;
  const sig     = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

// Valida estructura, firma HMAC y expiración
function validateCsrfToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [tsStr, random, sig] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;

  // Verificar expiración
  if (Math.floor(Date.now() / 1000) - ts > TTL_SEC) return false;

  // Verificar firma HMAC con comparación en tiempo constante
  const payload     = `${tsStr}:${random}`;
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (_) {
    return false;
  }
}

module.exports = { generateCsrfToken, validateCsrfToken };

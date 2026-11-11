const crypto = require('node:crypto');

// Un comprobante de tiempo ligado al usuario. No concede acceso a recursos.
function firma(instante, usuarioId) {
  return crypto.createHmac('sha256', process.env.HMAC_SECRET || process.env.JWT_SECRET)
    .update('piloto/inicio-compra/' + usuarioId + '/' + instante).digest();
}

function iniciarCheckout(usuarioId) {
  const instante = String(Date.now());
  return instante + '.' + firma(instante, usuarioId).toString('hex');
}

function segundosCheckout(token, usuarioId) {
  if (typeof token !== 'string') return null;
  const partes = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!partes || !crypto.timingSafeEqual(firma(partes[1], usuarioId), Buffer.from(partes[2], 'hex'))) return null;
  const segundos = Math.floor((Date.now() - Number(partes[1])) / 1000);
  return segundos >= 0 && segundos <= 4294967295 ? segundos : null;
}

module.exports = { iniciarCheckout, segundosCheckout };

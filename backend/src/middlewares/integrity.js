const { hashData, verifySignature } = require('../utils/crypto.utils');

function addResponseIntegrity(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    try {
      const hash = hashData(data);
      res.setHeader('X-Content-Hash', hash);
    } catch (e) {
      // No bloquear si falla el hash
    }
    return originalJson(data);
  };

  next();
}

function requireSignature(req, res, next) {
  const signature = req.headers['x-data-signature'];
  if (!signature) {
    return res.status(400).json({ message: 'Se requiere firma de datos (X-Data-Signature)' });
  }

  const isValid = verifySignature(req.body, signature);
  if (!isValid) {
    return res.status(403).json({ message: 'Firma de datos inválida. Los datos pueden haber sido alterados.' });
  }

  next();
}

module.exports = { addResponseIntegrity, requireSignature };

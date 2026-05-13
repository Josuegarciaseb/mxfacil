const crypto = require('crypto');
const ALGORITHM    = 'aes-256-gcm';
const ENCODING     = 'hex';
const IV_LENGTH    = 12;
const TAG_LENGTH   = 16; 

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY debe ser un string hexadecimal de 64 caracteres en .env');
  }
  return Buffer.from(key, ENCODING);
}

function getHmacKey() {
  const key = process.env.HMAC_SECRET;
  if (!key || key.length < 32) {
    throw new Error('HMAC_SECRET debe tener al menos 32 caracteres en .env');
  }
  return key;
}

function encrypt(value) {
  const key       = getKey();
  const iv        = crypto.randomBytes(IV_LENGTH);
  const cipher    = crypto.createCipheriv(ALGORITHM, key, iv);

  const text      = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  return [
    iv.toString(ENCODING),
    authTag.toString(ENCODING),
    encrypted.toString(ENCODING),
  ].join(':');
}

function decrypt(encryptedValue) {
  const key  = getKey();
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) throw new Error('Formato de cifrado inválido');

  const [ivHex, tagHex, cipherHex] = parts;
  const iv         = Buffer.from(ivHex,    ENCODING);
  const authTag    = Buffer.from(tagHex,   ENCODING);
  const cipherText = Buffer.from(cipherHex, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');

  try { return JSON.parse(decrypted); } catch { return decrypted; }
}

function hashData(value) {
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return crypto.createHash('sha256').update(text).digest(ENCODING);
}

function verifyHash(value, expectedHash) {
  const computed = hashData(value);
  return crypto.timingSafeEqual(
    Buffer.from(computed, ENCODING),
    Buffer.from(expectedHash, ENCODING)
  );
}

function signData(value) {
  const key  = getHmacKey();
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return crypto.createHmac('sha256', key).update(text).digest(ENCODING);
}


function verifySignature(value, signature) {
  try {
    const expected = signData(value);
    const sigBuf   = Buffer.from(signature, ENCODING);
    const expBuf   = Buffer.from(expected,  ENCODING);

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

module.exports = { encrypt, decrypt, hashData, verifyHash, signData, verifySignature };

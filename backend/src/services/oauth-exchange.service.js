const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const pool = require('../config/db');
const { decrypt } = require('../utils/crypto.utils');
const { transaction } = require('./order-state.service');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');

async function issueExchange(userId, challenge) {
  const code = crypto.randomBytes(32).toString('hex');
  await pool.query('DELETE FROM oauth_intercambio WHERE vence <= UTC_TIMESTAMP()');
  await pool.query('INSERT INTO oauth_intercambio (codigo_hash,usuario_id,reto,vence) VALUES (?,?,?,UTC_TIMESTAMP() + INTERVAL 5 MINUTE)',[hash(code),userId,challenge]);
  return code;
}

async function redeemExchange({code, verifier, totp_code}) {
  const invalid = {status:401,body:{message:'El acceso con Google expiró. Vuelve a iniciar sesión.'}};
  if (![code,verifier].every(value=>typeof value === 'string' && /^[a-f0-9]{64}$/.test(value))) return invalid;
  return transaction(async conn => {
    const [rows] = await conn.query(`SELECT x.reto,x.intentos,u.id,u.nombre,u.email,u.rol,u.mfa_enabled,u.mfa_secret,
      pr.id AS proveedor_id FROM oauth_intercambio x JOIN usuario u ON u.id=x.usuario_id
      LEFT JOIN proveedor pr ON pr.usuario_id=u.id WHERE x.codigo_hash=? AND x.vence > UTC_TIMESTAMP() FOR UPDATE`,[hash(code)]);
    const account = rows[0];
    if (!account || !crypto.timingSafeEqual(Buffer.from(account.reto),Buffer.from(hash(verifier)))) return invalid;
    if (account.mfa_enabled && !totp_code) return {status:401,body:{message:'Se requiere código MFA',mfa_required:true}};
    if (account.mfa_enabled && !authenticator.verify({token:String(totp_code),secret:decrypt(account.mfa_secret)})) {
      if (account.intentos >= 4) await conn.query('DELETE FROM oauth_intercambio WHERE codigo_hash=?',[hash(code)]);
      else await conn.query('UPDATE oauth_intercambio SET intentos=intentos+1 WHERE codigo_hash=?',[hash(code)]);
      return {status:401,body:{message:'Código MFA inválido o expirado'}};
    }
    await conn.query('DELETE FROM oauth_intercambio WHERE codigo_hash=?',[hash(code)]);
    const {id,nombre,email,rol,proveedor_id} = account;
    const token = jwt.sign({id,rol},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:process.env.JWT_EXPIRES_IN || '7d'});
    return {status:200,body:{user:{id,nombre,email,rol,proveedor_id},token}};
  });
}
module.exports = {issueExchange,redeemExchange};

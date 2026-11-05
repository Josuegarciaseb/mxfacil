const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {algorithms:['HS256']});
    // decoded: { id, rol, iat, exp }

    // opcional: verificar que el usuario siga existiendo
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol FROM usuario WHERE id = ?',
      [decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({code:'SESSION_EXPIRED', message:'Usuario no encontrado'});
    }

    req.user = rows[0]; // {id, nombre, email, rol}
    next();
  } catch (err) {
    if (!['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(err.name)) return next(err);
    return res.status(401).json({code:'SESSION_EXPIRED', message:'Token inválido o expirado'});
  }
};

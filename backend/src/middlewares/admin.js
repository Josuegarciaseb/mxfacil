// src/middlewares/admin.js
module.exports = function isAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Requiere rol admin' });
  }
  next();
};

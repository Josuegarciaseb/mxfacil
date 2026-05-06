module.exports = function isAdminOrVendedor(req, res, next) {
  if (!req.user || !['admin', 'vendedor'].includes(req.user.rol)) {
    return res.status(403).json({ message: 'Requiere rol admin o vendedor' });
  }
  next();
};

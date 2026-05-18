const express = require('express');
const router = express.Router();
const prodCtrl = require('../controllers/producto.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');
const isAdminOrVendedor = require('../middlewares/isAdminOrVendedor');
const upload = require('../middlewares/upload');

// Rutas públicas (catálogo)
router.get('/', prodCtrl.listProductos);
router.get('/:id', prodCtrl.getProducto);

// Subida de imagen de producto (antes de las rutas con :id para evitar colisiones)
router.post(
  '/imagen',
  auth,
  isAdminOrVendedor,
  (req, res, next) => upload.single('imagen')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  prodCtrl.uploadImagen
);

// Rutas admin o vendedor
router.post('/', auth, isAdminOrVendedor, prodCtrl.createProducto);
router.put('/:id', auth, isAdminOrVendedor, prodCtrl.updateProducto);
router.delete('/:id', auth, isAdminOrVendedor, prodCtrl.deleteProducto);

module.exports = router;

const express = require('express');
const router = express.Router();
const prodCtrl = require('../controllers/producto.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');
const isAdminOrVendedor = require('../middlewares/isAdminOrVendedor');

// Rutas públicas (catálogo)
router.get('/', prodCtrl.listProductos);
router.get('/:id', prodCtrl.getProducto);

// Rutas admin o vendedor
router.post('/', auth, isAdminOrVendedor, prodCtrl.createProducto);
router.put('/:id', auth, isAdminOrVendedor, prodCtrl.updateProducto);
router.delete('/:id', auth, isAdminOrVendedor, prodCtrl.deleteProducto);

module.exports = router;

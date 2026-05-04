const express = require('express');
const router = express.Router();
const prodCtrl = require('../controllers/producto.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Rutas públicas (catálogo)
router.get('/', prodCtrl.listProductos);
router.get('/:id', prodCtrl.getProducto);

// Rutas admin
router.post('/', auth, isAdmin, prodCtrl.createProducto);
router.put('/:id', auth, isAdmin, prodCtrl.updateProducto);
router.delete('/:id', auth, isAdmin, prodCtrl.deleteProducto);

module.exports = router;

const express = require('express');
const router = express.Router();
const invCtrl = require('../controllers/inventario.controller');
const asyncRoute = require('../utils/async-route');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Ver stock de un producto (podría ser público o solo admin, tú decides)
router.get('/:productoId', invCtrl.getInventarioProducto);

// Actualizar stock: solo admin
router.patch('/:productoId', auth, isAdmin, asyncRoute(invCtrl.updateStockProducto));

module.exports = router;

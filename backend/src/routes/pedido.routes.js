const express = require('express');
const router = express.Router();
const pedCtrl = require('../controllers/pedido.controller');
const auth = require('../middlewares/auth');
const reviews = require('../controllers/resena.controller');
const wrap = require('../utils/async-route');
const isAdmin = require('../middlewares/admin');
const isAdminOrVendedor = require('../middlewares/isAdminOrVendedor');

// Admin o vendedor
router.get('/admin', auth, isAdminOrVendedor, pedCtrl.listPedidosAdmin);
router.patch('/:id/estado', auth, isAdminOrVendedor, pedCtrl.updateEstadoPedido);

// Cliente/admin
router.get('/', auth, pedCtrl.listPedidosCliente);
router.get('/:id', auth, pedCtrl.getPedidoDetalle);
router.post('/', auth, pedCtrl.createPedido);
router.post('/:id/cancelar', auth, pedCtrl.cancelPedidoCliente);
router.post('/:id/entregado', auth, wrap(reviews.deliver));
router.get('/:id/resenas', auth, wrap(reviews.mine));
router.post('/:id/resenas', auth, wrap(reviews.create));

module.exports = router;

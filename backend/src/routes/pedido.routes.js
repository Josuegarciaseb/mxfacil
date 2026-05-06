const express = require('express');
const router = express.Router();
const pedCtrl = require('../controllers/pedido.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');
const isAdminOrVendedor = require('../middlewares/isAdminOrVendedor');

// Admin o vendedor
router.get('/admin', auth, isAdminOrVendedor, pedCtrl.listPedidosAdmin);
router.patch('/:id/estado', auth, isAdminOrVendedor, pedCtrl.updateEstadoPedido);

// Cliente/admin
router.get('/', auth, pedCtrl.listPedidosCliente);
router.get('/:id', auth, pedCtrl.getPedidoDetalle);
router.post('/', auth, pedCtrl.createPedido);

module.exports = router;

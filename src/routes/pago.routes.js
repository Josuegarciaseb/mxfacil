const express = require('express');
const router = express.Router();
const pagoCtrl = require('../controllers/pago.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Cliente/admin: ver pago de un pedido
router.get('/pedido/:pedidoId', auth, pagoCtrl.getPagoByPedido);

// Admin: actualizar estado de pago
router.patch('/:id/estado', auth, isAdmin, pagoCtrl.updateEstadoPago);

module.exports = router;

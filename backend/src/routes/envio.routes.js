const express = require('express');
const router = express.Router();
const envioCtrl = require('../controllers/envio.controller');
const asyncRoute = require('../utils/async-route');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Cliente/admin: ver envío de un pedido
router.get('/pedido/:pedidoId', auth, envioCtrl.getEnvioByPedido);

// Admin: actualizar envío
router.patch('/:id', auth, isAdmin, asyncRoute(envioCtrl.updateEnvio));

module.exports = router;

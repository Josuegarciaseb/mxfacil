const express = require('express');
const router = express.Router();
const envioCtrl = require('../controllers/envio.controller');
const asyncRoute = require('../utils/async-route');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');
const gestor = require('../middlewares/isAdminOrVendedor');
const castores = require('../controllers/castores.controller');

router.post('/domicilio/estimado', auth, asyncRoute(castores.estimarDomicilio));
router.put('/domicilio/pedidos/:id/flete', auth, gestor, asyncRoute(castores.precioDomicilio));
router.post('/domicilio/pedidos/:id/aceptar', auth, asyncRoute(castores.aceptarFlete));
router.post('/domicilio/pedidos/:id/cancelar', auth, asyncRoute(castores.cancelarDomicilio));
router.post('/domicilio/pedidos/:id/despacho', auth, gestor, asyncRoute(castores.despachar));
router.post('/domicilio/pedidos/:id/recepcion', auth, asyncRoute(castores.recibir));
router.post('/domicilio/pedidos/:id/incidencia', auth, asyncRoute(castores.incidencia));
router.get('/domicilio/pedidos/:id/rastreo', auth, asyncRoute(castores.rastreo));

router.post('/castores/cotizaciones', auth, asyncRoute(castores.solicitar));
router.get('/castores/cotizaciones', auth, gestor, asyncRoute(castores.gestion));
router.get('/castores/cotizaciones/:id', auth, asyncRoute(castores.consultar));
router.put('/castores/cotizaciones/:id', auth, gestor, asyncRoute(castores.ofertar));
router.post('/castores/pedidos/:id/despacho', auth, gestor, asyncRoute(castores.despachar));
router.post('/castores/pedidos/:id/recepcion', auth, asyncRoute(castores.recibir));
router.post('/castores/pedidos/:id/incidencia', auth, asyncRoute(castores.incidencia));
router.get('/castores/pedidos/:id/rastreo', auth, asyncRoute(castores.rastreo));

// Cliente/admin: ver envío de un pedido
router.get('/pedido/:pedidoId', auth, envioCtrl.getEnvioByPedido);

// Admin: actualizar envío
router.patch('/:id', auth, isAdmin, asyncRoute(envioCtrl.updateEnvio));

module.exports = router;

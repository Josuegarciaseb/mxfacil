const express = require('express');
const router = express.Router();
const pagoCtrl = require('../controllers/pago.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Stripe webhook necesita raw body — se registra en app.js antes del json parser

// Stripe
router.post('/stripe/intent',   auth, pagoCtrl.createStripeIntent);
router.post('/stripe/confirm',  auth, pagoCtrl.confirmStripePayment);

// PayPal
router.post('/paypal/create', auth, pagoCtrl.createPaypalOrder);
router.post('/paypal/capture', auth, pagoCtrl.capturePaypalOrder);

// MercadoPago
router.post('/mercadopago/preference', auth, pagoCtrl.createMercadoPagoPreference);
router.post('/mercadopago/webhook', pagoCtrl.handleMercadoPagoWebhook);

// General
router.get('/pedido/:pedidoId', auth, pagoCtrl.getPagoByPedido);
router.patch('/:id/estado', auth, isAdmin, pagoCtrl.updateEstadoPago);

module.exports = router;

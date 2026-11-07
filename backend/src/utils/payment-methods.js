function paymentMethods() {
  return [
    ...(process.env.STRIPE_SECRET_KEY ? ['tarjeta'] : []),
    ...(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? ['paypal'] : []),
    ...(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_WEBHOOK_SECRET ? ['mercadopago'] : []),
    'transferencia', 'contra_entrega',
  ];
}
module.exports = paymentMethods;

const Stripe = require('stripe');

let stripe;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw Object.assign(new Error('Stripe no está configurado'), {status:503});
  return stripe ||= Stripe(process.env.STRIPE_SECRET_KEY, {timeout:10000,maxNetworkRetries:1});
}

exports.createPaymentIntent = async (amount, pedidoId, checkoutKey) => {
  return await getStripe().paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'mxn',
    metadata: { pedido_id: String(pedidoId) },
    automatic_payment_methods: { enabled: true },
  }, {idempotencyKey:`pedido_${pedidoId}_${checkoutKey || 'legacy'}`});
};

exports.retrievePaymentIntent = async (paymentIntentId) => {
  return await getStripe().paymentIntents.retrieve(paymentIntentId);
};

exports.cancelPaymentIntent = id => getStripe().paymentIntents.cancel(id, {},
  { idempotencyKey: 'cancel_' + id });

exports.constructWebhookEvent = (rawBody, signature) => {
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

exports.createMembershipIntent = async purchase => {
  if (!/^sk_test_/.test(process.env.STRIPE_SECRET_KEY || '')) throw Object.assign(new Error('Solo se permiten pagos de prueba para Pro'), {status:503});
  return getStripe().paymentIntents.create({
    amount: purchase.monto_centavos, currency: 'mxn', payment_method_types: ['card'],
    metadata: { membresia_compra_id: purchase.id, proveedor_id: String(purchase.proveedor_id) },
    description: 'MX Facil Pro - 30 dias - pago unico de prueba',
  }, { idempotencyKey: `membresia_${purchase.id}` });
};

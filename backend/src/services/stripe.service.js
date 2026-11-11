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

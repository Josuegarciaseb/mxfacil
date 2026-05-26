const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (amount, pedidoId) => {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'mxn',
    metadata: { pedido_id: String(pedidoId) },
    automatic_payment_methods: { enabled: true },
  });
};

exports.retrievePaymentIntent = async (paymentIntentId) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

exports.constructWebhookEvent = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

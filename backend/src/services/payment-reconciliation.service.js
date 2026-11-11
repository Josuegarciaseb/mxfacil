const { cents } = require('../utils/money');
const stripe = require('./stripe.service');
const paypal = require('./paypal.service');
const mp = require('./mercadopago.service');

function invalid(message) {
  throw Object.assign(new Error(message), { status: 409 });
}

function validateAmount(amount, currency, expected) {
  if (typeof currency !== 'string' || currency.toUpperCase() !== 'MXN' || amount == null || cents(amount) !== cents(expected)) {
    invalid('El importe o moneda del pago no coincide con el pedido');
  }
}

function validateStripeIdentity(intent, order, payment) {
  if (intent.id !== payment.referencia || String(intent.metadata?.pedido_id) !== String(order.id)) {
    invalid('La referencia Stripe no corresponde al pedido');
  }
}

function validateStripe(intent, order, payment) {
  validateStripeIdentity(intent, order, payment);
  validateAmount(intent.amount_received / 100, intent.currency, payment.monto);
  if (intent.status !== 'succeeded') invalid('El pago aún no está confirmado');
}

function validatePaypal(remote, order, payment) {
  const unit = remote.purchase_units?.[0];
  const captures = unit?.payments?.captures;
  if (payment.referencia !== 'paypal_' + remote.id || remote.status !== 'COMPLETED' ||
      remote.purchase_units?.length !== 1 || unit.reference_id !== 'pedido_' + order.id ||
      !captures?.length || captures.some(c => c.status !== 'COMPLETED' || c.amount?.currency_code !== 'MXN')) {
    invalid('La captura PayPal aún no está confirmada para este pedido');
  }
  validateAmount(captures.reduce((sum, c) => sum + cents(c.amount.value), 0) / 100, 'MXN', payment.monto);
}

async function closeStripe(order, payment) {
  let intent = await stripe.retrievePaymentIntent(payment.referencia);
  validateStripeIdentity(intent, order, payment);
  if (['requires_payment_method','requires_confirmation','requires_action','requires_capture'].includes(intent.status)) {
    intent = await stripe.cancelPaymentIntent(intent.id);
    validateStripeIdentity(intent, order, payment);
  }
  if (intent.status === 'succeeded') {
    validateStripe(intent, order, payment);
    return 'paid';
  }
  return intent.status === 'canceled' ? 'closed' : 'pending';
}

async function closePaypal(order, payment) {
  const remote = await paypal.getOrder(payment.referencia.slice(7));
  const unit = remote.purchase_units?.[0];
  if (payment.referencia !== 'paypal_' + remote.id || remote.purchase_units?.length !== 1 || unit.reference_id !== 'pedido_' + order.id) {
    invalid('La orden PayPal no corresponde al pedido');
  }
  const captures = unit.payments?.captures || [];
  if (remote.status === 'COMPLETED') {
    if (captures.length && captures.every(c => ['DECLINED','DENIED','FAILED'].includes(c.status))) return 'closed';
    if (captures.some(c => c.status !== 'COMPLETED')) return 'pending';
    validatePaypal(remote, order, payment);
    return 'paid';
  }
  if (remote.status === 'VOIDED' && !captures.length) return 'closed';
  // Esta tienda es la única que puede capturar esta orden. La marca durable
  // protege respuestas perdidas o capturas aún en curso al vencer el plazo.
  if (!payment.captura_solicitada && !captures.length &&
      ['CREATED','APPROVED','PAYER_ACTION_REQUIRED','SAVED'].includes(remote.status)) return 'closed';
  return 'pending';
}

async function closeMercadoPago(order, payment) {
  const id = payment.referencia.slice(3);
  const pref = await mp.expirePreference(id, order.id);
  const end = Date.parse(pref.expiration_date_to);
  if (pref.id !== id || String(pref.external_reference) !== String(order.id) || pref.expires !== true ||
      !Number.isFinite(end) || end > Date.now()) return 'pending';
  const merchantOrders = await mp.findMerchantOrders(id);
  let pending = false;
  for (const merchant of merchantOrders) {
    if (String(merchant.external_reference) !== String(order.id) || merchant.preference_id !== id || !Array.isArray(merchant.payments)) {
      invalid('No fue posible conciliar las órdenes de la preferencia');
    }
    for (const attempt of merchant.payments) {
      if (attempt.status === 'approved') {
        validateAmount(attempt.transaction_amount, attempt.currency_id, payment.monto);
        if (Number(attempt.amount_refunded || 0) > 0) invalid('El pago ya tiene una devolución y requiere revisión');
        return 'paid';
      }
      if (!['cancelled','rejected'].includes(attempt.status)) pending = true;
    }
  }
  // Dar tiempo a la publicación de intentos iniciados justo antes del cierre.
  return pending || Date.now() - end < 300000 ? 'pending' : 'closed';
}

async function closePayment(order, payment) {
  if (!payment.referencia) return 'closed';
  switch (payment.metodo) {
    case 'tarjeta': return closeStripe(order, payment);
    case 'paypal': return closePaypal(order, payment);
    case 'mercadopago': return closeMercadoPago(order, payment);
    default: return 'closed';
  }
}

module.exports = { closePayment, validateAmount, validateStripe, validateStripeIdentity, validatePaypal };

const pool = require('../config/db');
const stripeService = require('../services/stripe.service');
const paypalService = require('../services/paypal.service');
const mpService = require('../services/mercadopago.service');
const { cents } = require('../utils/money');
const { transaction, lockOrder, approvePayment, cancelOrder, fail } = require('../services/order-state.service');

async function ownedPayment(conn, req, method) {
  const id = req.body.pedido_id;
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) fail(400, 'pedido_id inválido');
  const locked = await lockOrder(conn, id);
  if (locked.order.usuario_id !== req.user.id) fail(403, 'Acceso denegado');
  if (locked.payment.metodo !== method) fail(409, 'La pasarela no corresponde al método del pedido');
  if (locked.order.estado === 'cancelado') fail(409, 'El pedido está cancelado');
  return locked;
}

function validateAmount(amount, currency, expected) {
  if (typeof currency !== 'string' || currency.toUpperCase() !== 'MXN' || amount == null || cents(amount) !== cents(expected)) fail(409, 'El importe o moneda del pago no coincide con el pedido');
}

function validateStripe(intent, order, payment) {
  if (intent.id !== payment.referencia || String(intent.metadata?.pedido_id) !== String(order.id)) fail(409, 'La referencia de pago no corresponde al pedido');
  validateAmount(intent.amount_received / 100, intent.currency, payment.monto);
  if (intent.status !== 'succeeded') fail(409, 'El pago aún no está confirmado');
}

exports.getPagoByPedido = async (req,res) => {
  const [rows] = await pool.query('SELECT pg.*, p.usuario_id FROM pago pg JOIN pedido p ON p.id=pg.pedido_id WHERE pg.pedido_id=?', [req.params.pedidoId]);
  if (!rows.length) fail(404, 'Pago no encontrado');
  if (req.user.rol !== 'admin' && rows[0].usuario_id !== req.user.id) fail(403, 'No tienes acceso a este pago');
  const {usuario_id,...payment} = rows[0];
  res.json(payment);
};

exports.updateEstadoPago = async (req,res) => {
  const {estado,referencia} = req.body;
  if (!['pendiente','aprobado','rechazado'].includes(estado)) fail(400,'Estado de pago inválido');
  const [rows] = await pool.query('SELECT pedido_id FROM pago WHERE id=?',[req.params.id]);
  if (!rows.length) fail(404,'Pago no encontrado');
  const result = await transaction(async conn => {
    const {order,payment} = await lockOrder(conn,rows[0].pedido_id);
    if (estado === payment.estado) return payment;
    if (['tarjeta','paypal','mercadopago'].includes(payment.metodo)) fail(409,'Los pagos en línea se confirman con la pasarela');
    if (payment.estado === 'aprobado') fail(409,'Un pago aprobado requiere un proceso de devolución');
    if (estado === 'aprobado') await approvePayment(conn,order,payment);
    else if (estado === 'rechazado') await cancelOrder(conn,order,payment);
    else fail(409,'No se puede restablecer un pago cancelado');
    if (referencia != null) await conn.query('UPDATE pago SET referencia=? WHERE id=?',[String(referencia).slice(0,100),payment.id]);
    return (await conn.query('SELECT * FROM pago WHERE id=?',[payment.id]))[0][0];
  });
  res.json(result);
};

exports.createStripeIntent = async (req,res) => {
  const result = await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'tarjeta');
    if (payment.estado === 'aprobado') fail(409,'El pago ya fue procesado');
    const intent = payment.referencia
      ? await stripeService.retrievePaymentIntent(payment.referencia)
      : await stripeService.createPaymentIntent(payment.monto,order.id,order.clave_checkout);
    if (!payment.referencia) await conn.query('UPDATE pago SET referencia=? WHERE id=?',[intent.id,payment.id]);
    return {client_secret:intent.client_secret,payment_intent_id:intent.id,status:intent.status};
  });
  res.json(result);
};

exports.confirmStripePayment = async (req,res) => {
  await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'tarjeta');
    if (payment.estado === 'aprobado') return;
    if (!payment.referencia) fail(409,'Intento de pago no encontrado');
    const intent = await stripeService.retrievePaymentIntent(payment.referencia);
    validateStripe(intent,order,payment);
    await approvePayment(conn,order,payment);
  });
  res.json({success:true});
};

exports.handleStripeWebhook = async (req,res) => {
  let event;
  try { event = stripeService.constructWebhookEvent(req.body,req.headers['stripe-signature']); }
  catch { fail(400,'Firma de webhook inválida'); }
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    if (intent.metadata?.membresia_compra_id) {
      await require('../services/membresia.service').approve(intent);
      return res.json({received:true});
    }
    const [rows] = await pool.query('SELECT pedido_id FROM pago WHERE referencia=? AND metodo=?',[intent.id,'tarjeta']);
    // The intent creation may not have committed yet: ask Stripe to retry.
    if (!rows.length && intent.metadata?.pedido_id) fail(503,'Pago aún no registrado; reintentar notificación');
    if (rows.length) await transaction(async conn => {
      const {order,payment} = await lockOrder(conn,rows[0].pedido_id);
      validateStripe(intent,order,payment);
      await approvePayment(conn,order,payment);
    });
  }
  // A failed attempt is retryable. It must not cancel a later successful payment.
  res.json({received:true});
};

exports.createPaypalOrder = async (req,res) => {
  const result = await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'paypal');
    if (payment.estado === 'aprobado') fail(409,'El pago ya fue procesado');
    if (payment.referencia) return {paypal_order_id:payment.referencia.slice(7)};
    const remote = await paypalService.createOrder(payment.monto,order.id,order.clave_checkout);
    if (!remote.id) fail(502,'No se pudo crear la orden PayPal');
    await conn.query('UPDATE pago SET referencia=? WHERE id=?',[`paypal_${remote.id}`,payment.id]);
    return {paypal_order_id:remote.id};
  });
  res.json(result);
};

exports.capturePaypalOrder = async (req,res) => {
  await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'paypal');
    const remoteId = req.body.paypal_order_id;
    if (typeof remoteId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(remoteId) || payment.referencia !== `paypal_${remoteId}`) fail(409,'La referencia PayPal no corresponde al pedido');
    if (payment.estado === 'aprobado') return;
    const capture = await paypalService.captureOrder(remoteId);
    const unit = capture.purchase_units?.[0];
    const payments = unit?.payments?.captures;
    if (capture.id !== remoteId || capture.status !== 'COMPLETED' || capture.purchase_units?.length !== 1 || unit.reference_id !== `pedido_${order.id}` || !payments?.length || payments.some(p=>p.status!=='COMPLETED')) fail(409,'El pago PayPal no fue completado para este pedido');
    for (const p of payments) if (p.amount?.currency_code !== 'MXN') fail(409,'Moneda PayPal inválida');
    validateAmount(payments.reduce((s,p)=>s+cents(p.amount.value),0)/100,'MXN',payment.monto);
    await approvePayment(conn,order,payment);
  });
  res.json({success:true});
};

exports.createMercadoPagoPreference = async (req,res) => {
  const result = await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'mercadopago');
    if (payment.estado === 'aprobado') fail(409,'El pago ya fue procesado');
    const preference = payment.referencia
      ? await mpService.getPreference(payment.referencia.slice(3))
      : await mpService.createPreference({
          items:[{title:`Pedido #${order.id} (IVA incluido)`,quantity:1,unit_price:Number(payment.monto),currency_id:'MXN'}],
          pedidoId:order.id, frontendUrl:process.env.FRONTEND_URL || 'http://localhost:5173',
        });
    if (!payment.referencia) await conn.query('UPDATE pago SET referencia=? WHERE id=?',[`mp_${preference.id}`,payment.id]);
    const sandbox = process.env.MERCADOPAGO_ENV ? process.env.MERCADOPAGO_ENV === 'sandbox' : process.env.NODE_ENV !== 'production';
    return {preference_id:preference.id,checkout_url:sandbox ? preference.sandbox_init_point : preference.init_point,init_point:preference.init_point,sandbox_init_point:preference.sandbox_init_point};
  });
  res.json(result);
};

exports.handleMercadoPagoWebhook = async (req,res) => {
  if (!mpService.verifyWebhook(req)) fail(401,'Firma de webhook inválida');
  if (req.body.type !== 'payment' || !req.body.data?.id) return res.json({received:true});
  const remote = await mpService.getPayment(req.body.data.id);
  if (String(remote.id) !== String(req.body.data.id)) fail(409,'Referencia de pago inválida');
  if (remote.status === 'approved') {
    await transaction(async conn => {
      const {order,payment} = await lockOrder(conn,remote.external_reference);
      if (payment.metodo !== 'mercadopago' || !payment.referencia?.startsWith('mp_')) fail(409,'La pasarela no corresponde al pedido');
      validateAmount(remote.transaction_amount,remote.currency_id,payment.monto);
      if (!remote.order?.id) fail(409,'El pago no incluye la orden de Mercado Pago');
      const merchantOrder = await mpService.getMerchantOrder(remote.order.id);
      if (payment.referencia !== 'mp_' + merchantOrder.preference_id || String(merchantOrder.external_reference) !== String(order.id)) {
        fail(409,'La preferencia de Mercado Pago no corresponde al pedido');
      }
      await approvePayment(conn,order,payment);
    });
  }
  res.json({received:true});
};

for (const [name,handler] of Object.entries(exports)) exports[name] = (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);

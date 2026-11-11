const pool = require('../config/db');
const stripeService = require('../services/stripe.service');
const paypalService = require('../services/paypal.service');
const mpService = require('../services/mercadopago.service');
const { transaction, lockOrder, approvePayment, cancelOrder, refundPayment, fail } = require('../services/order-state.service');
const { validateAmount, validateStripe, validateStripeIdentity, validatePaypal } = require('../services/payment-reconciliation.service');

async function ownedPayment(conn, req, method) {
  const id = req.body.pedido_id;
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) fail(400, 'pedido_id inválido');
  const locked = await lockOrder(conn, id);
  if (locked.order.usuario_id !== req.user.id) fail(403, 'Acceso denegado');
  if (locked.payment.metodo !== method) fail(409, 'La pasarela no corresponde al método del pedido');
  if (locked.order.estado === 'cancelado') fail(409, 'El pedido está cancelado');
  if (locked.payment.estado === 'reembolsado') fail(409, 'El pago fue reembolsado');
  return locked;
}

function requireActiveReservation(order) {
  if (order.vencida) fail(409, 'El plazo del pedido venció. Consulta su estado antes de volver a comprar.');
}

// Llamar con el folio bloqueado después de validar identidad, moneda e importe
// de la notificación. Un cobro tardío queda disponible para devolución.
async function recordGatewayApproval(conn, order, payment) {
  if (order.estado !== 'cancelado') return approvePayment(conn, order, payment);
  await conn.query(
    "UPDATE pago SET estado = 'aprobado' WHERE id = ? AND estado IN ('pendiente','rechazado')", [payment.id]);
}

exports.getPagoByPedido = async (req,res) => {
  const [rows] = await pool.query('SELECT pg.id, pg.pedido_id, pg.metodo, pg.monto, pg.estado, pg.referencia, pg.fecha, p.usuario_id FROM pago pg JOIN pedido p ON p.id=pg.pedido_id WHERE pg.pedido_id=?', [req.params.pedidoId]);
  if (!rows.length) fail(404, 'Pago no encontrado');
  if (req.user.rol !== 'admin' && rows[0].usuario_id !== req.user.id) fail(403, 'No tienes acceso a este pago');
  const {usuario_id,...payment} = rows[0];
  res.json(payment);
};

exports.updateEstadoPago = async (req,res) => {
  const {estado,referencia} = req.body;
  if (!['pendiente','aprobado','rechazado','reembolsado'].includes(estado)) fail(400,'Estado de pago inválido');
  if (referencia != null && typeof referencia !== 'string') fail(400,'El comprobante debe ser texto');
  const [rows] = await pool.query('SELECT pedido_id FROM pago WHERE id=?',[req.params.id]);
  if (!rows.length) fail(404,'Pago no encontrado');
  const result = await transaction(async conn => {
    const {order,payment} = await lockOrder(conn,rows[0].pedido_id);
    if (estado === 'aprobado' && order.estado === 'cancelado') fail(409,'El pedido está cancelado');
    if (estado === 'reembolsado') {
      await refundPayment(conn,order,payment,req.body.referencia_reembolso);
    } else if (estado === payment.estado) {
      if (estado === 'aprobado' && referencia && referencia.trim() !== payment.referencia) fail(409,'El cobro ya tiene otro comprobante');
      return payment;
    } else {
      if (!['contra_entrega','transferencia','plataforma'].includes(payment.metodo)) fail(409,'Los pagos en línea se confirman con la pasarela');
      if (payment.estado !== 'pendiente') fail(409,'El pago ya se cerró');
      if (estado === 'aprobado') {
        if (typeof referencia !== 'string' || !referencia.trim() || referencia.trim().length > 100) fail(400,'Indica el comprobante de cobro (hasta 100 caracteres)');
        if (payment.metodo === 'contra_entrega' && order.estado !== 'entregado') fail(409,'Confirma la entrega antes de registrar el cobro');
        requireActiveReservation(order);
        await approvePayment(conn,order,payment);
        await conn.query('UPDATE pago SET referencia=? WHERE id=?',[referencia.trim(),payment.id]);
      } else if (estado === 'rechazado') await cancelOrder(conn,order,payment);
      else fail(409,'No se puede restablecer un pago cerrado');
    }
    return (await conn.query('SELECT * FROM pago WHERE id=?',[payment.id]))[0][0];
  });
  res.json(result);
};

exports.createStripeIntent = async (req,res) => {
  const result = await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'tarjeta');
    requireActiveReservation(order);
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
  if (['payment_intent.succeeded','payment_intent.canceled','payment_intent.payment_failed'].includes(event.type)) {
    const intent = event.data.object;
    const [rows] = await pool.query('SELECT pedido_id FROM pago WHERE referencia=? AND metodo=?',[intent.id,'tarjeta']);
    // The intent creation may not have committed yet: ask Stripe to retry.
    if (!rows.length && intent.metadata?.pedido_id) fail(503,'Pago aún no registrado; reintentar notificación');
    if (rows.length) await transaction(async conn => {
      const {order,payment} = await lockOrder(conn,rows[0].pedido_id);
      validateStripeIdentity(intent,order,payment);
      if (event.type === 'payment_intent.succeeded') {
        validateStripe(intent,order,payment);
        await recordGatewayApproval(conn,order,payment);
      } else if (payment.estado === 'pendiente') {
        // Un intento fallido puede reintentarse antes del vencimiento. Un
        // evento anterior al cobro nunca deshace una aprobación posterior.
        if (event.type === 'payment_intent.canceled' || order.vencida) await cancelOrder(conn,order,payment);
      }
    });
  }
  // A failed attempt is retryable. It must not cancel a later successful payment.
  res.json({received:true});
};

exports.createPaypalOrder = async (req,res) => {
  const result = await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'paypal');
    requireActiveReservation(order);
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
  const remoteId = req.body.paypal_order_id;
  // Persistir el intento por separado: una caída tras la captura externa
  // debe dejar evidencia aunque la transacción que registra el cobro revierta.
  await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'paypal');
    if (typeof remoteId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(remoteId) || payment.referencia !== `paypal_${remoteId}`) fail(409,'La referencia PayPal no corresponde al pedido');
    if (payment.estado === 'aprobado') return;
    requireActiveReservation(order);
    await conn.query('UPDATE pago SET captura_solicitada=1 WHERE id=?',[payment.id]);
  });
  await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'paypal');
    if (payment.estado === 'aprobado') return;
    // La autorización de esta captura se obtuvo antes del vencimiento. El
    // bloqueo serializa con el conciliador y con otra captura del mismo folio.
    const capture = await paypalService.captureOrder(remoteId);
    validatePaypal(capture,order,payment);
    await approvePayment(conn,order,payment);
  });
  res.json({success:true});
};

exports.createMercadoPagoPreference = async (req,res) => {
  const result = await transaction(async conn => {
    const {order,payment} = await ownedPayment(conn,req,'mercadopago');
    requireActiveReservation(order);
    if (payment.estado === 'aprobado') fail(409,'El pago ya fue procesado');
    const preference = payment.referencia
      ? await mpService.getPreference(payment.referencia.slice(3))
      : await mpService.createPreference({
          items:[{title:`Pedido #${order.id} (IVA incluido)`,quantity:1,unit_price:Number(payment.monto),currency_id:'MXN'}],
          pedidoId:order.id, venceEpoch:order.vence_epoch, frontendUrl:process.env.FRONTEND_URL || 'http://localhost:5173',
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
      await recordGatewayApproval(conn,order,payment);
    });
  }
  res.json({received:true});
};

for (const [name,handler] of Object.entries(exports)) exports[name] = (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);

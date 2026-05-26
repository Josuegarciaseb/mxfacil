const pool = require('../config/db');
const stripeService = require('../services/stripe.service');
const paypalService = require('../services/paypal.service');
const mpService = require('../services/mercadopago.service');

// Descuenta stock, crea envío y marca el pedido como en_proceso.
// Sólo aplica cuando el pedido estaba en 'esperando_pago'.
async function confirmarPedidoPagado(conn, pedidoId) {
  const [pedidos] = await conn.query('SELECT estado FROM pedido WHERE id = ?', [pedidoId]);
  if (!pedidos.length || pedidos[0].estado !== 'esperando_pago') return;

  const [items] = await conn.query(
    'SELECT producto_id, cantidad FROM pedido_item WHERE pedido_id = ?',
    [pedidoId]
  );
  for (const item of items) {
    await conn.query(
      'UPDATE inventario SET stock = stock - ? WHERE producto_id = ?',
      [item.cantidad, item.producto_id]
    );
  }

  await conn.query(
    'INSERT INTO envio (pedido_id, estado) VALUES (?, "preparando")',
    [pedidoId]
  );

  await conn.query('UPDATE pedido SET estado = "en_proceso" WHERE id = ?', [pedidoId]);
}

// GET /api/pagos/pedido/:pedidoId
exports.getPagoByPedido = async (req, res) => {
  const pedidoId = req.params.pedidoId;
  const user = req.user;

  try {
    const [pedidos] = await pool.query(
      'SELECT id, usuario_id FROM pedido WHERE id = ?',
      [pedidoId]
    );
    if (!pedidos.length) return res.status(404).json({ message: 'Pedido no encontrado' });

    if (user.rol !== 'admin' && pedidos[0].usuario_id !== user.id) {
      return res.status(403).json({ message: 'No tienes acceso a este pago' });
    }

    const [rows] = await pool.query(
      'SELECT id, pedido_id, metodo, monto, estado, referencia, fecha FROM pago WHERE pedido_id = ?',
      [pedidoId]
    );

    if (!rows.length) return res.status(404).json({ message: 'Pago no encontrado para este pedido' });

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error getPagoByPedido:', err);
    return res.status(500).json({ message: 'Error al obtener pago' });
  }
};

// PATCH /api/pagos/:id/estado (admin)
exports.updateEstadoPago = async (req, res) => {
  const pagoId = req.params.id;
  const { estado, referencia } = req.body;

  const estadosValidos = ['pendiente', 'aprobado', 'rechazado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ message: 'Estado de pago inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pagos] = await conn.query('SELECT id, pedido_id, estado FROM pago WHERE id = ?', [pagoId]);
    if (!pagos.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    await conn.query('UPDATE pago SET estado = ?, referencia = ? WHERE id = ?', [estado, referencia || null, pagoId]);

    if (estado === 'aprobado') {
      // Si estaba esperando pago online, descuenta stock y crea envío
      await confirmarPedidoPagado(conn, pagos[0].pedido_id);
      // Si ya estaba en otro estado (ej. pendiente por transferencia), solo lo pasa a en_proceso
      await conn.query(
        'UPDATE pedido SET estado = "en_proceso" WHERE id = ? AND estado != "en_proceso"',
        [pagos[0].pedido_id]
      );
    } else if (estado === 'rechazado') {
      await conn.query('UPDATE pedido SET estado = "cancelado" WHERE id = ?', [pagos[0].pedido_id]);
    }

    await conn.commit();

    const [updated] = await conn.query(
      'SELECT id, pedido_id, metodo, monto, estado, referencia, fecha FROM pago WHERE id = ?',
      [pagoId]
    );
    return res.json(updated[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error updateEstadoPago:', err);
    return res.status(500).json({ message: 'Error al actualizar estado del pago' });
  } finally {
    conn.release();
  }
};

// ─── STRIPE ────────────────────────────────────────────────────────────────────

// POST /api/pagos/stripe/intent
exports.createStripeIntent = async (req, res) => {
  const { pedido_id } = req.body;
  const userId = req.user.id;

  if (!pedido_id) return res.status(400).json({ message: 'pedido_id requerido' });

  try {
    const [pagos] = await pool.query(
      `SELECT pg.id, pg.monto, pg.estado, p.usuario_id
       FROM pago pg JOIN pedido p ON p.id = pg.pedido_id
       WHERE pg.pedido_id = ?`,
      [pedido_id]
    );

    if (!pagos.length) return res.status(404).json({ message: 'Pago no encontrado' });
    if (pagos[0].usuario_id !== userId) return res.status(403).json({ message: 'Acceso denegado' });
    if (pagos[0].estado !== 'pendiente') return res.status(400).json({ message: 'El pago ya fue procesado' });

    const intent = await stripeService.createPaymentIntent(pagos[0].monto, pedido_id);

    await pool.query('UPDATE pago SET referencia = ? WHERE pedido_id = ?', [intent.id, pedido_id]);

    return res.json({ client_secret: intent.client_secret, payment_intent_id: intent.id });
  } catch (err) {
    console.error('Error createStripeIntent:', err);
    return res.status(500).json({ message: 'Error al crear intento de pago' });
  }
};

exports.confirmStripePayment = async (req, res) => {
  const { pedido_id } = req.body;
  const userId = req.user.id;

  if (!pedido_id) return res.status(400).json({ message: 'pedido_id requerido' });

  try {
    const [pagos] = await pool.query(
      `SELECT pg.id, pg.referencia, pg.estado, p.usuario_id
       FROM pago pg JOIN pedido p ON p.id = pg.pedido_id
       WHERE pg.pedido_id = ?`,
      [pedido_id]
    );

    if (!pagos.length) return res.status(404).json({ message: 'Pago no encontrado' });
    if (pagos[0].usuario_id !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    /* Si ya está aprobado (p.ej. el webhook llegó primero) no hacer nada */
    if (pagos[0].estado === 'aprobado') return res.json({ success: true });

    if (!pagos[0].referencia) {
      return res.status(400).json({ message: 'Intent de pago no encontrado' });
    }

    /* Verificar estado con Stripe */
    const intent = await stripeService.retrievePaymentIntent(pagos[0].referencia);

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ message: `Pago Stripe en estado: ${intent.status}` });
    }

    /* Actualizar DB igual que lo haría el webhook */
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE pago SET estado = "aprobado" WHERE pedido_id = ?', [pedido_id]);
      await confirmarPedidoPagado(conn, pedido_id);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error confirmStripePayment:', err);
    return res.status(500).json({ message: 'Error al confirmar pago Stripe' });
  }
};

// POST /api/pagos/stripe/webhook (raw body)
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, sig);
  } catch (err) {
    return res.status(400).json({ message: `Webhook inválido: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intentId = event.data.object.id;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE pago SET estado = "aprobado" WHERE referencia = ?', [intentId]);
      const [rows] = await conn.query('SELECT pedido_id FROM pago WHERE referencia = ?', [intentId]);
      if (rows.length) {
        await confirmarPedidoPagado(conn, rows[0].pedido_id);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error('Stripe webhook DB error:', err);
    } finally {
      conn.release();
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intentId = event.data.object.id;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE pago SET estado = "rechazado" WHERE referencia = ?', [intentId]);
      const [rows] = await conn.query('SELECT pedido_id FROM pago WHERE referencia = ?', [intentId]);
      if (rows.length) {
        await conn.query('UPDATE pedido SET estado = "cancelado" WHERE id = ?', [rows[0].pedido_id]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error('Stripe webhook DB error:', err);
    } finally {
      conn.release();
    }
  }

  return res.json({ received: true });
};

// ─── PAYPAL ────────────────────────────────────────────────────────────────────

// POST /api/pagos/paypal/create
exports.createPaypalOrder = async (req, res) => {
  const { pedido_id } = req.body;
  const userId = req.user.id;

  if (!pedido_id) return res.status(400).json({ message: 'pedido_id requerido' });

  try {
    const [pagos] = await pool.query(
      `SELECT pg.id, pg.monto, pg.estado, p.usuario_id
       FROM pago pg JOIN pedido p ON p.id = pg.pedido_id
       WHERE pg.pedido_id = ?`,
      [pedido_id]
    );

    if (!pagos.length) return res.status(404).json({ message: 'Pago no encontrado' });
    if (pagos[0].usuario_id !== userId) return res.status(403).json({ message: 'Acceso denegado' });
    if (pagos[0].estado !== 'pendiente') return res.status(400).json({ message: 'El pago ya fue procesado' });

    const order = await paypalService.createOrder(pagos[0].monto, pedido_id);

    if (!order.id) {
      console.error('PayPal createOrder error:', order);
      return res.status(500).json({ message: 'Error al crear orden PayPal' });
    }

    await pool.query('UPDATE pago SET referencia = ? WHERE pedido_id = ?', [`paypal_${order.id}`, pedido_id]);

    return res.json({ paypal_order_id: order.id });
  } catch (err) {
    console.error('Error createPaypalOrder:', err);
    return res.status(500).json({ message: 'Error al crear orden PayPal' });
  }
};

// POST /api/pagos/paypal/capture
exports.capturePaypalOrder = async (req, res) => {
  const { pedido_id, paypal_order_id } = req.body;
  const userId = req.user.id;

  if (!pedido_id || !paypal_order_id) {
    return res.status(400).json({ message: 'pedido_id y paypal_order_id requeridos' });
  }

  try {
    const [pagos] = await pool.query(
      `SELECT pg.id, pg.estado, p.usuario_id
       FROM pago pg JOIN pedido p ON p.id = pg.pedido_id
       WHERE pg.pedido_id = ?`,
      [pedido_id]
    );

    if (!pagos.length) return res.status(404).json({ message: 'Pago no encontrado' });
    if (pagos[0].usuario_id !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    const capture = await paypalService.captureOrder(paypal_order_id);

    if (capture.status !== 'COMPLETED') {
      console.error('PayPal capture not completed:', capture);
      return res.status(400).json({ message: 'El pago PayPal no fue completado' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE pago SET estado = "aprobado", referencia = ? WHERE pedido_id = ?',
        [`paypal_${paypal_order_id}`, pedido_id]
      );
      await confirmarPedidoPagado(conn, pedido_id);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error capturePaypalOrder:', err);
    return res.status(500).json({ message: 'Error al capturar pago PayPal' });
  }
};

// ─── MERCADO PAGO ───────────────────────────────────────────────────────────────

// POST /api/pagos/mercadopago/preference
exports.createMercadoPagoPreference = async (req, res) => {
  const { pedido_id } = req.body;
  const userId = req.user.id;

  if (!pedido_id) return res.status(400).json({ message: 'pedido_id requerido' });

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.total, p.usuario_id,
              pg.id AS pago_id, pg.estado AS pago_estado
       FROM pedido p
       JOIN pago pg ON pg.pedido_id = p.id
       WHERE p.id = ?`,
      [pedido_id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (rows[0].usuario_id !== userId) return res.status(403).json({ message: 'Acceso denegado' });
    if (rows[0].pago_estado !== 'pendiente') return res.status(400).json({ message: 'El pago ya fue procesado' });

    const [items] = await pool.query(
      `SELECT pi.cantidad, pi.precio_unitario, pr.nombre
       FROM pedido_item pi JOIN producto pr ON pr.id = pi.producto_id
       WHERE pi.pedido_id = ?`,
      [pedido_id]
    );

    const mpItems = items.map((i) => ({
      title: i.nombre,
      quantity: i.cantidad,
      unit_price: parseFloat(i.precio_unitario),
      currency_id: 'MXN',
    }));

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const preference = await mpService.createPreference({ items: mpItems, pedidoId: pedido_id, frontendUrl });

    await pool.query(
      'UPDATE pago SET referencia = ? WHERE pedido_id = ?',
      [`mp_${preference.id}`, pedido_id]
    );

    return res.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (err) {
    console.error('Error createMercadoPagoPreference:', err);
    return res.status(500).json({ message: 'Error al crear preferencia MercadoPago' });
  }
};

// POST /api/pagos/mercadopago/webhook
exports.handleMercadoPagoWebhook = async (req, res) => {
  const { type, data } = req.body;

  if (type !== 'payment' || !data?.id) {
    return res.json({ received: true });
  }

  try {
    const payment = await mpService.getPayment(data.id);
    const pedidoId = payment.external_reference;
    const status = payment.status;

    if (!pedidoId) return res.json({ received: true });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (status === 'approved') {
        await conn.query('UPDATE pago SET estado = "aprobado" WHERE pedido_id = ?', [pedidoId]);
        await confirmarPedidoPagado(conn, pedidoId);
      } else if (status === 'rejected' || status === 'cancelled') {
        await conn.query('UPDATE pago SET estado = "rechazado" WHERE pedido_id = ?', [pedidoId]);
        await conn.query('UPDATE pedido SET estado = "cancelado" WHERE id = ?', [pedidoId]);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error('MP webhook DB error:', err);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error handleMercadoPagoWebhook:', err);
  }

  return res.json({ received: true });
};

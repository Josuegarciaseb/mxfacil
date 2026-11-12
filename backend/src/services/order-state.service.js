const pool = require('../config/db');
const { closePayment } = require('./payment-reconciliation.service');

function fail(status, message) { throw Object.assign(new Error(message), { status }); }

function reservationMinutes(method) {
  if (method === 'contra_entrega' || method === 'plataforma') return null;
  const transfer = method === 'transferencia';
  const name = transfer ? 'RESERVA_TRANSFERENCIA_MINUTOS' : 'RESERVA_DIGITAL_MINUTOS';
  const minutes = Number(process.env[name] ?? (transfer ? 1440 : 30));
  if (!Number.isSafeInteger(minutes) || minutes <= 0 || minutes > 525600) {
    throw new Error(name + ' debe ser un entero entre 1 y 525600');
  }
  return minutes;
}

async function transaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

// Every payment/cancellation path locks the order first, then the payment.
async function lockOrder(conn, id) {
  const [orders] = await conn.query(
    'SELECT p.*, reserva_vence_en <= NOW() AS vencida, UNIX_TIMESTAMP(reserva_vence_en) AS vence_epoch FROM pedido p WHERE id = ? FOR UPDATE', [id]
  );
  if (!orders.length) fail(404, 'Pedido no encontrado');
  const [payments] = await conn.query('SELECT * FROM pago WHERE pedido_id = ? FOR UPDATE', [id]);
  if (!payments.length) fail(404, 'Pago no encontrado');
  return { order: orders[0], payment: payments[0] };
}

async function reserveStock(conn, items) {
  for (const item of [...items].sort((a, b) => a.producto_id - b.producto_id)) {
    const [result] = await conn.query(
      'UPDATE inventario SET stock = stock - ? WHERE producto_id = ? AND stock >= ?',
      [item.cantidad, item.producto_id, item.cantidad]
    );
    if (result.affectedRows !== 1) fail(409, `Stock insuficiente para producto ${item.producto_id}`);
  }
}

async function approvePayment(conn, order, payment) {
  if (['aprobado','reembolsado'].includes(payment.estado)) return;
  if (order.estado === 'cancelado') fail(409, 'El pedido está cancelado; requiere conciliación del pago');
  if (!order.stock_reservado) {
    const [items] = await conn.query('SELECT producto_id, cantidad FROM pedido_item WHERE pedido_id = ?', [order.id]);
    await reserveStock(conn, items); // compatibility with unpaid orders from before migration
  }
  await conn.query("UPDATE pago SET estado = 'aprobado' WHERE id = ?", [payment.id]);
  await conn.query("UPDATE pedido SET stock_reservado = 1, reserva_vence_en = NULL, estado = CASE WHEN estado IN ('esperando_pago','pendiente') THEN 'en_proceso' ELSE estado END WHERE id = ?", [order.id]);
  await conn.query("INSERT INTO envio (pedido_id, estado) VALUES (?, 'preparando') ON DUPLICATE KEY UPDATE pedido_id = VALUES(pedido_id)", [order.id]);
}

async function releaseOrder(conn, order) {
  if (order.stock_reservado) {
    const [items] = await conn.query('SELECT producto_id, cantidad FROM pedido_item WHERE pedido_id = ? ORDER BY producto_id', [order.id]);
    for (const item of items) await conn.query('UPDATE inventario SET stock = stock + ? WHERE producto_id = ?', [item.cantidad, item.producto_id]);
  }
  await conn.query("UPDATE pedido SET estado = 'cancelado', stock_reservado = 0, reserva_vence_en = NULL WHERE id = ?", [order.id]);
  await conn.query('DELETE FROM envio WHERE pedido_id = ?', [order.id]);
}

async function cancelOrder(conn, order, payment) {
  if (order.estado === 'cancelado') return;
  if (['aprobado','reembolsado'].includes(payment.estado) || ['enviado', 'entregado'].includes(order.estado)) {
    fail(409, 'El pedido ya fue pagado o enviado y requiere gestionar una devolución');
  }
  const settlement = await closePayment(order, payment);
  if (settlement === 'paid') return approvePayment(conn, order, payment);
  if (settlement !== 'closed') fail(409, 'Pago pendiente de conciliación. La reserva sigue activa.');
  await releaseOrder(conn, order);
  await conn.query("UPDATE pago SET estado = 'rechazado' WHERE id = ?", [payment.id]);
}

async function refundPayment(conn, order, payment, reference) {
  if (typeof reference !== 'string' || !reference.trim() || reference.trim().length > 100) {
    fail(400, 'Indica el comprobante del reembolso total (hasta 100 caracteres)');
  }
  if (payment.estado === 'reembolsado' && payment.referencia_reembolso === reference.trim()) return;
  if (payment.estado !== 'aprobado') fail(409, 'Solo se puede registrar un reembolso sobre un cobro aprobado');
  if (!['enviado','entregado','cancelado'].includes(order.estado)) await releaseOrder(conn, order);
  await conn.query("UPDATE pago SET estado = 'reembolsado', referencia_reembolso = ? WHERE id = ?", [reference.trim(), payment.id]);
}

module.exports = { transaction, lockOrder, reserveStock, releaseOrder, approvePayment, cancelOrder, refundPayment, reservationMinutes, fail };

const pool = require('../config/db');
const { lockOrder, transaction, cancelOrder } = require('./order-state.service');

async function expireOrder(id) {
  return transaction(async conn => {
    const { order, payment } = await lockOrder(conn, id);
    if (order.vencida && payment.estado === 'pendiente' &&
        ['pendiente','esperando_pago','en_proceso'].includes(order.estado)) {
      const [shipped] = await conn.query(
        "SELECT id FROM envio WHERE pedido_id = ? AND estado IN ('en_transito','entregado') FOR UPDATE", [id]);
      if (!shipped.length) await cancelOrder(conn, order, payment);
    }
  });
}

// Recorrer por ID evita que una pasarela sin conexión o un pago en trámite
// impida que otros pedidos liberen sus unidades.
async function expireDueOrders() {
  let lastId = 0;
  while (true) {
    const [rows] = await pool.query(
      `SELECT p.id FROM pedido p JOIN pago g ON g.pedido_id = p.id
       WHERE p.id > ? AND p.reserva_vence_en <= NOW() AND g.estado = 'pendiente'
       AND p.estado IN ('esperando_pago','pendiente','en_proceso')
       AND NOT EXISTS (SELECT 1 FROM envio e WHERE e.pedido_id=p.id AND e.estado IN ('en_transito','entregado'))
       ORDER BY p.id LIMIT 100`, [lastId]);
    for (const { id } of rows) {
      try { await expireOrder(id); }
      catch (error) { console.warn('Conciliación de reserva pendiente', id, error.code || error.status || error.name); }
    }
    if (rows.length < 100) return;
    lastId = rows[rows.length - 1].id;
  }
}

function startReservationWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await expireDueOrders(); }
    catch (error) { console.error('Error en el barrido de reservas', error.code || error.name); }
    finally { running = false; }
  };
  tick();
  const timer = setInterval(tick, 60000);
  timer.unref();
  return timer;
}

module.exports = { expireOrder, expireDueOrders, startReservationWorker };

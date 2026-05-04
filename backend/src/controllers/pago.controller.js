// src/controllers/pago.controller.js
const pool = require('../config/db');

// GET /api/pagos/pedido/:pedidoId
// Cliente puede ver su propio pago, admin puede ver cualquiera
exports.getPagoByPedido = async (req, res) => {
  const pedidoId = req.params.pedidoId;
  const user = req.user;

  try {
    // Verificar que el pedido exista y de quién es
    const [pedidos] = await pool.query(
      'SELECT id, usuario_id FROM pedido WHERE id = ?',
      [pedidoId]
    );
    if (!pedidos.length) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (user.rol !== 'admin' && pedidos[0].usuario_id !== user.id) {
      return res.status(403).json({ message: 'No tienes acceso a este pago' });
    }

    const [rows] = await pool.query(
      `
      SELECT id, pedido_id, metodo, monto, estado, referencia, fecha
      FROM pago
      WHERE pedido_id = ?
      `,
      [pedidoId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Pago no encontrado para este pedido' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error getPagoByPedido:', err);
    return res.status(500).json({ message: 'Error al obtener pago' });
  }
};

// PATCH /api/pagos/:id/estado (admin)
// Body: { "estado": "aprobado", "referencia": "XYZ-123" }
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

    const [pagos] = await conn.query(
      'SELECT id, pedido_id, estado FROM pago WHERE id = ?',
      [pagoId]
    );
    if (!pagos.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const pago = pagos[0];

    // Actualizar pago
    await conn.query(
      `
      UPDATE pago
      SET estado = ?, referencia = ?
      WHERE id = ?
      `,
      [estado, referencia || null, pagoId]
    );

    // Actualizar estado del pedido según pago
    if (estado === 'aprobado') {
      await conn.query(
        'UPDATE pedido SET estado = "en_proceso" WHERE id = ?',
        [pago.pedido_id]
      );
    } else if (estado === 'rechazado') {
      // Aquí podrías también marcar el pedido como cancelado, etc.
      await conn.query(
        'UPDATE pedido SET estado = "cancelado" WHERE id = ?',
        [pago.pedido_id]
      );
      // (Opcional avanzado: devolver stock a inventario usando pedido_item)
    }

    await conn.commit();

    const [pagoActualizado] = await conn.query(
      `
      SELECT id, pedido_id, metodo, monto, estado, referencia, fecha
      FROM pago
      WHERE id = ?
      `,
      [pagoId]
    );

    return res.json(pagoActualizado[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error updateEstadoPago:', err);
    return res.status(500).json({ message: 'Error al actualizar estado del pago' });
  } finally {
    conn.release();
  }
};

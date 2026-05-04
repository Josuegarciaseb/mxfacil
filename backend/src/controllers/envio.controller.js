// src/controllers/envio.controller.js
const pool = require('../config/db');

// GET /api/envios/pedido/:pedidoId
// Cliente puede ver su envío, admin cualquiera
exports.getEnvioByPedido = async (req, res) => {
  const pedidoId = req.params.pedidoId;
  const user = req.user;

  try {
    const [pedidos] = await pool.query(
      'SELECT id, usuario_id FROM pedido WHERE id = ?',
      [pedidoId]
    );
    if (!pedidos.length) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (user.rol !== 'admin' && pedidos[0].usuario_id !== user.id) {
      return res.status(403).json({ message: 'No tienes acceso a este envío' });
    }

    const [rows] = await pool.query(
      `
      SELECT id, pedido_id, transportista, guia, estado, fecha_envio, fecha_entrega
      FROM envio
      WHERE pedido_id = ?
      `,
      [pedidoId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Envío no encontrado para este pedido' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error getEnvioByPedido:', err);
    return res.status(500).json({ message: 'Error al obtener envío' });
  }
};

// PATCH /api/envios/:id (admin)
// Body:
// {
//   "transportista": "Estafeta",
//   "guia": "ABC123",
//   "estado": "en_transito",
//   "fecha_envio": "2025-12-02 10:00:00",
//   "fecha_entrega": null
// }
exports.updateEnvio = async (req, res) => {
  const envioId = req.params.id;
  const {
    transportista,
    guia,
    estado,
    fecha_envio,
    fecha_entrega
  } = req.body;

  const estadosValidos = ['preparando', 'en_transito', 'entregado', 'incidencia'];
  if (estado && !estadosValidos.includes(estado)) {
    return res.status(400).json({ message: 'Estado de envío inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [envios] = await conn.query(
      'SELECT * FROM envio WHERE id = ?',
      [envioId]
    );
    if (!envios.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Envío no encontrado' });
    }

    const actual = envios[0];

    await conn.query(
      `
      UPDATE envio
      SET transportista = ?,
          guia = ?,
          estado = ?,
          fecha_envio = ?,
          fecha_entrega = ?
      WHERE id = ?
      `,
      [
        transportista != null ? transportista : actual.transportista,
        guia != null ? guia : actual.guia,
        estado || actual.estado,
        fecha_envio != null ? fecha_envio : actual.fecha_envio,
        fecha_entrega != null ? fecha_entrega : actual.fecha_entrega,
        envioId
      ]
    );

    // Actualizar estado del pedido según estado del envío
    if (estado === 'en_transito') {
      await conn.query(
        'UPDATE pedido SET estado = "enviado" WHERE id = ?',
        [actual.pedido_id]
      );
    } else if (estado === 'entregado') {
      await conn.query(
        'UPDATE pedido SET estado = "entregado" WHERE id = ?',
        [actual.pedido_id]
      );
    }

    const [envioActualizado] = await conn.query(
      `
      SELECT id, pedido_id, transportista, guia, estado, fecha_envio, fecha_entrega
      FROM envio
      WHERE id = ?
      `,
      [envioId]
    );

    await conn.commit();
    return res.json(envioActualizado[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error updateEnvio:', err);
    return res.status(500).json({ message: 'Error al actualizar envío' });
  } finally {
    conn.release();
  }
};

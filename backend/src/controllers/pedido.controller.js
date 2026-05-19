// src/controllers/pedido.controller.js
const pool = require('../config/db');
const {
  isPositiveInteger,
  isPositiveNumber
} = require('../utils/validators');

// Cliente: GET /api/pedidos
exports.listPedidosCliente = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.usuario_id,
        p.direccion_id,
        p.fecha,
        p.estado,
        p.total
      FROM pedido p
      WHERE p.usuario_id = ?
      ORDER BY p.fecha DESC
      `,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error listPedidosCliente:', err);
    return res.status(500).json({ message: 'Error al obtener pedidos' });
  }
};

// Helper para detalle de pedido
async function getPedidoDetalleCompleto(pedidoId, conn = null) {
  const executor = conn || pool;

  // Pedido
  const [pedidos] = await executor.query(
    `
    SELECT
      p.id,
      p.usuario_id,
      u.nombre AS usuario_nombre,
      p.direccion_id,
      d.linea1 AS direccion_linea1,
      d.ciudad AS direccion_ciudad,
      d.estado AS direccion_estado,
      d.cp AS direccion_cp,
      p.fecha,
      p.estado,
      p.total
    FROM pedido p
    JOIN usuario u ON u.id = p.usuario_id
    JOIN direccion d ON d.id = p.direccion_id
    WHERE p.id = ?
    `,
    [pedidoId]
  );
  if (!pedidos.length) return null;
  const pedido = pedidos[0];

  // Items
  const [items] = await executor.query(
    `
    SELECT
      pi.id,
      pi.producto_id,
      pr.nombre AS producto_nombre,
      prov.nombre AS proveedor_nombre,
      pi.cantidad,
      pi.precio_unitario
    FROM pedido_item pi
    JOIN producto pr ON pr.id = pi.producto_id
    JOIN proveedor prov ON prov.id = pr.proveedor_id
    WHERE pi.pedido_id = ?
    `,
    [pedidoId]
  );

  // Pago
  const [pagos] = await executor.query(
    `SELECT id, pedido_id, metodo, monto, estado, referencia, fecha
     FROM pago
     WHERE pedido_id = ?`,
    [pedidoId]
  );
  const pago = pagos[0] || null;

  // Envío
  const [envios] = await executor.query(
    `SELECT id, pedido_id, transportista, guia, estado, fecha_envio, fecha_entrega
     FROM envio
     WHERE pedido_id = ?`,
    [pedidoId]
  );
  const envio = envios[0] || null;

  return { pedido, items, pago, envio };
}

// GET /api/pedidos/:id
exports.getPedidoDetalle = async (req, res) => {
  const pedidoId = req.params.id;
  const user = req.user;

  if (!isPositiveInteger(pedidoId)) {
    return res.status(400).json({ message: 'El ID del pedido debe ser un número entero válido' });
  }

  try {
    const detalle = await getPedidoDetalleCompleto(pedidoId);
    if (!detalle) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (user.rol === 'admin') {
      return res.json(detalle);
    }

    if (user.rol === 'vendedor') {
      const [provRows] = await pool.query('SELECT id FROM proveedor WHERE usuario_id = ?', [user.id]);
      if (!provRows.length) return res.status(403).json({ message: 'Sin proveedor asociado' });
      const proveedorId = provRows[0].id;
      const [itemRows] = await pool.query(
        'SELECT pi.id FROM pedido_item pi JOIN producto pr ON pr.id = pi.producto_id WHERE pi.pedido_id = ? AND pr.proveedor_id = ?',
        [pedidoId, proveedorId]
      );
      if (!itemRows.length) return res.status(403).json({ message: 'No tienes acceso a este pedido' });
      return res.json(detalle);
    }

    // cliente: solo sus propios pedidos
    if (detalle.pedido.usuario_id !== user.id) {
      return res.status(403).json({ message: 'No tienes acceso a este pedido' });
    }
    return res.json(detalle);
  } catch (err) {
    console.error('Error getPedidoDetalle:', err);
    return res.status(500).json({ message: 'Error al obtener detalle del pedido' });
  }
};

// Métodos que requieren confirmación de pago antes de procesar el pedido
const METODOS_PAGO_ONLINE = new Set(['tarjeta', 'paypal', 'mercadopago']);

// POST /api/pedidos (cliente)
exports.createPedido = async (req, res) => {
  const userId = req.user.id;
  const { direccion_id, items, metodo_pago } = req.body;

  // Validaciones básicas
  if (!direccion_id || !Array.isArray(items) || !items.length || !metodo_pago) {
    return res.status(400).json({
      message: 'direccion_id, items y metodo_pago son obligatorios'
    });
  }

  if (!isPositiveInteger(direccion_id)) {
    return res.status(400).json({
      message: 'direccion_id debe ser un entero'
    });
  }

  const metodosValidos = ['tarjeta', 'paypal', 'mercadopago', 'transferencia', 'contra_entrega', 'plataforma'];
  if (!metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({
      message: `Metodo de pago inválido. Opciones: ${metodosValidos.join(', ')}`
    });
  }

  const esPagoOnline = METODOS_PAGO_ONLINE.has(metodo_pago);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar que la dirección pertenezca al usuario
    const [dirRows] = await conn.query(
      'SELECT id FROM direccion WHERE id = ? AND usuario_id = ?',
      [direccion_id, userId]
    );
    if (!dirRows.length) {
      await conn.rollback();
      return res.status(400).json({
        message: 'La dirección no existe o no pertenece al usuario'
      });
    }

    let total = 0;
    const detalles = [];

    // Validar items
    for (const item of items) {
      if (
        !item.producto_id ||
        !isPositiveInteger(item.producto_id) ||
        !isPositiveInteger(item.cantidad) ||
        item.cantidad <= 0
      ) {
        await conn.rollback();
        return res.status(400).json({
          message: 'Cada item debe contener producto_id y cantidad (>0) en formato numérico'
        });
      }

      // Validar que exista y esté activo
      const [prodRows] = await conn.query(
        'SELECT id, precio, activo FROM producto WHERE id = ?',
        [item.producto_id]
      );
      if (!prodRows.length || prodRows[0].activo !== 1) {
        await conn.rollback();
        return res.status(400).json({
          message: `Producto ${item.producto_id} no existe o está inactivo`
        });
      }

      const precio = prodRows[0].precio;

      // Stock con FOR UPDATE
      const [invRows] = await conn.query(
        'SELECT stock FROM inventario WHERE producto_id = ? FOR UPDATE',
        [item.producto_id]
      );

      const stockActual = invRows.length ? invRows[0].stock : 0;

      if (stockActual < item.cantidad) {
        await conn.rollback();
        return res.status(400).json({
          message: `Stock insuficiente para producto ${item.producto_id}. Disponible: ${stockActual}`
        });
      }

      total += precio * item.cantidad;
      detalles.push({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: precio
      });
    }

    // Pedidos online quedan en 'esperando_pago' hasta que se confirme el pago.
    // Transferencia y contra entrega se confirman de inmediato con 'pendiente'.
    const estadoInicial = esPagoOnline ? 'esperando_pago' : 'pendiente';

    const [resultPedido] = await conn.query(
      `INSERT INTO pedido (usuario_id, direccion_id, total, estado) VALUES (?, ?, ?, ?)`,
      [userId, direccion_id, total, estadoInicial]
    );
    const pedidoId = resultPedido.insertId;

    // Items — solo descuenta inventario si el pago no es online
    for (const det of detalles) {
      await conn.query(
        `INSERT INTO pedido_item (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`,
        [pedidoId, det.producto_id, det.cantidad, det.precio_unitario]
      );

      if (!esPagoOnline) {
        await conn.query(
          'UPDATE inventario SET stock = stock - ? WHERE producto_id = ?',
          [det.cantidad, det.producto_id]
        );
      }
    }

    // Pago
    await conn.query(
      `INSERT INTO pago (pedido_id, metodo, monto, estado) VALUES (?, ?, ?, 'pendiente')`,
      [pedidoId, metodo_pago, total]
    );

    // Envío — solo se crea si el pago no es online (para online se crea al confirmar el pago)
    if (!esPagoOnline) {
      await conn.query(
        `INSERT INTO envio (pedido_id, estado) VALUES (?, 'preparando')`,
        [pedidoId]
      );
    }

    await conn.commit();

    const detalle = await getPedidoDetalleCompleto(pedidoId, conn);
    return res.status(201).json(detalle);
  } catch (err) {
    await conn.rollback();
    console.error('Error createPedido:', err);
    return res.status(500).json({ message: 'Error al crear pedido' });
  } finally {
    conn.release();
  }
};

// PATCH /api/pedidos/:id/estado (admin)
exports.updateEstadoPedido = async (req, res) => {
  const pedidoId = req.params.id;
  const { estado } = req.body;

  if (!isPositiveInteger(pedidoId)) {
    return res.status(400).json({ message: 'ID de pedido inválido' });
  }

  const estadosValidos = ['esperando_pago', 'pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({
      message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}`
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM pedido WHERE id = ?',
      [pedidoId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    await pool.query(
      'UPDATE pedido SET estado = ? WHERE id = ?',
      [estado, pedidoId]
    );

    const detalle = await getPedidoDetalleCompleto(pedidoId);
    return res.json(detalle);
  } catch (err) {
    console.error('Error updateEstadoPedido:', err);
    return res.status(500).json({ message: 'Error al actualizar estado del pedido' });
  }
};

exports.listPedidosAdmin = async (req, res) => {
  const { estado } = req.query;
  const user = req.user;

  try {
    const params = [];
    const estadosValidos = ['esperando_pago', 'pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelado'];

    if (estado) {
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}` });
      }
    }

    // Vendedor: solo pedidos que contienen sus productos
    if (user.rol === 'vendedor') {
      const [provRows] = await pool.query('SELECT id FROM proveedor WHERE usuario_id = ?', [user.id]);
      if (!provRows.length) return res.json([]);
      const proveedorId = provRows[0].id;

      let where = 'WHERE pr.proveedor_id = ?';
      params.push(proveedorId);
      if (estado) { where += ' AND p.estado = ?'; params.push(estado); }

      const [rows] = await pool.query(
        `SELECT DISTINCT p.id, p.usuario_id, u.nombre AS usuario_nombre, p.direccion_id, p.fecha, p.estado, p.total
         FROM pedido p
         JOIN usuario u ON u.id = p.usuario_id
         JOIN pedido_item pi ON pi.pedido_id = p.id
         JOIN producto pr ON pr.id = pi.producto_id
         ${where}
         ORDER BY p.fecha DESC`,
        params
      );
      return res.json(rows);
    }

    // Admin: todos los pedidos
    let where = 'WHERE 1=1';
    if (estado) { where += ' AND p.estado = ?'; params.push(estado); }

    const [rows] = await pool.query(
      `SELECT p.id, p.usuario_id, u.nombre AS usuario_nombre, p.direccion_id, p.fecha, p.estado, p.total
       FROM pedido p
       JOIN usuario u ON u.id = p.usuario_id
       ${where}
       ORDER BY p.fecha DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('Error listPedidosAdmin:', err);
    return res.status(500).json({ message: 'Error al obtener pedidos' });
  }
};

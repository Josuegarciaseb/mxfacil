// src/controllers/pedido.controller.js
const pool = require('../config/db');
const crypto = require('node:crypto');
const { cents, publicPriceCents } = require('../utils/money');
const { transaction, lockOrder, reserveStock, cancelOrder, fail } = require('../services/order-state.service');
const {
  isPositiveInteger
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
        p.subtotal,
        p.iva,
        p.comision,
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
      COALESCE(p.direccion_entrega->>'$.linea1',d.linea1) AS direccion_linea1,
      COALESCE(p.direccion_entrega->>'$.ciudad',d.ciudad) AS direccion_ciudad,
      COALESCE(p.direccion_entrega->>'$.estado',d.estado) AS direccion_estado,
      COALESCE(p.direccion_entrega->>'$.cp',d.cp) AS direccion_cp,
      p.fecha,
      p.estado,
      p.subtotal,
      p.iva,
      p.comision,
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
      pr.proveedor_id,
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
      detalle.items = detalle.items.filter(i=>i.proveedor_id===proveedorId);
      if (!detalle.items.length) return res.status(403).json({ message: 'No tienes acceso a este pedido' });
      const sub = detalle.items.reduce((sum,i)=>sum+cents(i.precio_unitario)*i.cantidad,0);
      const iva = Math.round(sub*16/100);
      Object.assign(detalle.pedido,{subtotal:sub/100,iva:iva/100,total:(sub+iva)/100});
      delete detalle.pedido.comision;
      detalle.pago = null;
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
  const { direccion_id, items, metodo_pago, clave_checkout } = req.body;
  if (!isPositiveInteger(direccion_id) || Number(direccion_id) === 0 || !Array.isArray(items) || !items.length || items.length > 100) fail(400, 'Indica una dirección y entre 1 y 100 productos válidos');
  if (!require('../utils/payment-methods')().includes(metodo_pago)) fail(400, 'Método de pago no disponible');
  if (clave_checkout != null && (typeof clave_checkout !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(clave_checkout))) fail(400, 'Clave de compra inválida');
  const quantities = new Map();
  for (const item of items) {
    if (!item || !isPositiveInteger(item.producto_id) || Number(item.producto_id) === 0 || !isPositiveInteger(item.cantidad) || Number(item.cantidad) === 0) fail(400, 'Cada producto debe tener ID y cantidad enteros positivos');
    const id = Number(item.producto_id);
    const quantity = (quantities.get(id) || 0) + Number(item.cantidad);
    if (!isPositiveInteger(quantity)) fail(400, 'Cantidad inválida');
    quantities.set(id, quantity);
  }
  const normalized = [...quantities].sort((a,b) => a[0]-b[0]).map(([producto_id,cantidad])=>({producto_id,cantidad}));
  const hash = crypto.createHash('sha256').update(JSON.stringify({ direccion_id:Number(direccion_id), metodo_pago, items:normalized })).digest('hex');
  const result = await transaction(async conn => {
    await conn.query('SELECT id FROM usuario WHERE id=? FOR UPDATE', [req.user.id]);
    if (clave_checkout) {
      const [existing] = await conn.query('SELECT id,solicitud_hash FROM pedido WHERE usuario_id=? AND clave_checkout=?', [req.user.id,clave_checkout]);
      if (existing.length) {
        if (existing[0].solicitud_hash !== hash) fail(409, 'La clave de compra ya se usó con otros datos');
        return { detail: await getPedidoDetalleCompleto(existing[0].id, conn), repeated: true };
      }
    }
    const [addresses] = await conn.query('SELECT linea1,ciudad,estado,cp,pais FROM direccion WHERE id=? AND usuario_id=?', [direccion_id,req.user.id]);
    if (!addresses.length) fail(400, 'La dirección no existe o no pertenece al usuario');
    const [products] = await conn.query(
      `SELECT p.id, p.precio, p.activo FROM producto p
       JOIN categoria c ON c.id = p.categoria_id
       WHERE p.id IN (?) AND c.en_catalogo = 1 ORDER BY p.id FOR UPDATE OF p`,
      [normalized.map(i=>i.producto_id)]
    );
    let subtotal = 0, commission = 0;
    const details = normalized.map(item => {
      const product = products.find(p=>p.id===item.producto_id);
      if (!product || product.activo !== 1) fail(409, `El producto ${item.producto_id} ya no está disponible en el catálogo`);
      const unit = publicPriceCents(product.precio);
      subtotal += unit * item.cantidad;
      commission += (unit - cents(product.precio)) * item.cantidad;
      return {...item, precio_unitario:unit/100};
    });
    const tax = Math.round(subtotal * 16 / 100);
    const total = subtotal + tax;
    if (req.body.total_esperado != null && (!Number.isFinite(Number(req.body.total_esperado)) || Number(req.body.total_esperado) < 0 || cents(req.body.total_esperado) !== total)) fail(409,'El precio cambió. Revisa el carrito actualizado antes de confirmar');
    if (!Number.isSafeInteger(total) || total <= 0 || total > 999999999999) fail(400, 'Total fuera de rango');
    await reserveStock(conn, details);
    const [created] = await conn.query(`INSERT INTO pedido
      (usuario_id,direccion_id,direccion_entrega,subtotal,iva,comision,total,estado,stock_reservado,clave_checkout,solicitud_hash)
      VALUES (?,?,?,?,?,?,?,?,1,?,?)`,
      [req.user.id,direccion_id,JSON.stringify(addresses[0]),subtotal/100,tax/100,commission/100,total/100,METODOS_PAGO_ONLINE.has(metodo_pago)?'esperando_pago':'pendiente',clave_checkout||null,hash]);
    for (const item of details) await conn.query('INSERT INTO pedido_item (pedido_id,producto_id,cantidad,precio_unitario) VALUES (?,?,?,?)', [created.insertId,item.producto_id,item.cantidad,item.precio_unitario]);
    await conn.query("INSERT INTO pago (pedido_id,metodo,monto,estado) VALUES (?,?,?,'pendiente')", [created.insertId,metodo_pago,total/100]);
    if (!METODOS_PAGO_ONLINE.has(metodo_pago)) await conn.query("INSERT INTO envio (pedido_id,estado) VALUES (?,'preparando')", [created.insertId]);
    return { detail:await getPedidoDetalleCompleto(created.insertId,conn), repeated:false };
  });
  res.status(result.repeated?200:201).json(result.detail);
};

exports.updateEstadoPedido = async (req, res) => {
  const id = req.params.id, estado = req.body.estado;
  await transaction(async conn => {
    const {order,payment} = await lockOrder(conn,id);
    if (req.user.rol === 'vendedor') {
      const [providers] = await conn.query('SELECT id FROM proveedor WHERE usuario_id=?',[req.user.id]);
      const [items] = await conn.query('SELECT pr.proveedor_id FROM pedido_item pi JOIN producto pr ON pr.id=pi.producto_id WHERE pi.pedido_id=?', [id]);
      if (!providers.length || !items.length || items.some(i=>i.proveedor_id!==providers[0].id)) fail(403, 'Solo puedes actualizar pedidos compuestos exclusivamente por tus productos');
    }
    if (estado === order.estado) return;
    if (estado === 'cancelado') return cancelOrder(conn,order,payment);
    const transitions = { pendiente:['en_proceso'], en_proceso:['enviado'], enviado:['entregado'] };
    if (!transitions[order.estado]?.includes(estado)) fail(409, 'Cambio de estado no permitido');
    if (METODOS_PAGO_ONLINE.has(payment.metodo) && payment.estado !== 'aprobado') fail(409, 'El pago aún no está aprobado');
    await conn.query('UPDATE pedido SET estado=? WHERE id=?', [estado,id]);
    if (['enviado','entregado'].includes(estado)) await conn.query('UPDATE envio SET estado=? WHERE pedido_id=?', [estado==='enviado'?'en_transito':'entregado',id]);
  });
  res.json(await getPedidoDetalleCompleto(id));
};

exports.cancelPedidoCliente = async (req,res) => {
  await transaction(async conn => {
    const {order,payment} = await lockOrder(conn,req.params.id);
    if (order.usuario_id !== req.user.id) fail(403, 'No tienes acceso a este pedido');
    await cancelOrder(conn,order,payment);
  });
  res.json(await getPedidoDetalleCompleto(req.params.id));
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
        `SELECT p.id, p.usuario_id, u.nombre AS usuario_nombre, p.direccion_id, p.fecha, p.estado,
           SUM(pit.cantidad*pit.precio_unitario) AS subtotal, ROUND(SUM(pit.cantidad*pit.precio_unitario)*0.16,2) AS iva,
           SUM(pit.cantidad*pit.precio_unitario)+ROUND(SUM(pit.cantidad*pit.precio_unitario)*0.16,2) AS total
         FROM pedido p
         JOIN usuario u ON u.id = p.usuario_id
         JOIN pedido_item pit ON pit.pedido_id = p.id
         JOIN producto pr ON pr.id = pit.producto_id
         ${where}
         GROUP BY p.id,u.nombre
         ORDER BY p.fecha DESC`,
        params
      );
      return res.json(rows);
    }

    // Admin: todos los pedidos
    let where = 'WHERE 1=1';
    if (estado) { where += ' AND p.estado = ?'; params.push(estado); }

    const [rows] = await pool.query(
      `SELECT p.id, p.usuario_id, u.nombre AS usuario_nombre, p.direccion_id, p.fecha, p.estado, p.subtotal, p.iva, p.comision, p.total
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

// Express 4: forward asynchronous failures to the common error handler.
for (const [name,handler] of Object.entries(exports)) exports[name] = (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);

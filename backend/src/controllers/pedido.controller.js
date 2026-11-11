// src/controllers/pedido.controller.js
const pool = require('../config/db');
const crypto = require('node:crypto');
const { normalizarItems, validarCompra } = require('../services/castores.service');
const enviaCastores = require('../services/envia-castores.service');
const { cents, publicPriceCents } = require('../utils/money');
const { transaction, lockOrder, reserveStock, cancelOrder, fail, reservationMinutes } = require('../services/order-state.service');
const { segundosCheckout } = require('../services/piloto.service');
const { vendorOrders } = require('../services/vendor-orders.service');
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
async function getPedidoDetalleCompleto(pedidoId, conn = null, gestion = false) {
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
      UNIX_TIMESTAMP(p.reserva_vence_en) AS reserva_vence_epoch,
      c.id AS cotizacion_castores_id, c.flete, c.servicio AS servicio_castores, c.fuente AS fuente_castores,
      c.recibido_por, c.acuse, c.confirmacion, c.incidencia, c.canal_guia, c.embalaje, c.cp_origen AS cp_origen_flete,
      ${gestion ? 'c.referencia AS referencia_flete,c.otros_costos_estimados,c.costo_flete_real,' : ''}
      p.estado,
      p.subtotal,
      p.iva,
      p.comision,
      p.total
    FROM pedido p
    JOIN usuario u ON u.id = p.usuario_id
    JOIN direccion d ON d.id = p.direccion_id
    LEFT JOIN cotizacion_castores c ON c.pedido_id=p.id
    WHERE p.id = ?
    `,
    [pedidoId]
  );
  if (!pedidos.length) return null;
  const pedido = pedidos[0];
  if (pedido.cotizacion_castores_id) {
    const modo = enviaCastores.entorno();
    pedido.api_envia = modo;
    pedido.rastreo_api = Boolean(modo && pedido.canal_guia === (modo === 'sandbox' ? 'sandbox' : 'envia'));
  }

  // Items
  const [items] = await executor.query(
    `
    SELECT
      pi.id,
      pi.producto_id,
      pi.proveedor_id,
      pr.nombre AS producto_nombre,
      prov.nombre AS proveedor_nombre,
      pi.cantidad,
      pi.precio_unitario,
      pi.iva_linea
    FROM pedido_item pi
    JOIN producto pr ON pr.id = pi.producto_id
    LEFT JOIN proveedor prov ON prov.id = pi.proveedor_id
    WHERE pi.pedido_id = ?
    ORDER BY pi.producto_id, pi.id
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
async function getPedidoDetalle(req, res) {
  const pedidoId = req.params.id;
  const user = req.user;

  if (!isPositiveInteger(pedidoId)) {
    return res.status(400).json({ message: 'El ID del pedido debe ser un número entero válido' });
  }

  try {
    const detalle = await getPedidoDetalleCompleto(pedidoId,null,['vendedor','admin'].includes(user.rol));
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
      const [summary] = await vendorOrders(user.id, { pedidoId });
      if (!summary) return res.status(403).json({ message: 'No tienes acceso a este pedido' });
      Object.assign(detalle.pedido, summary);
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
}
exports.getPedidoDetalle = getPedidoDetalle;

// Métodos que requieren confirmación de pago antes de procesar el pedido
const METODOS_PAGO_ONLINE = new Set(['tarjeta', 'paypal', 'mercadopago']);

// POST /api/pedidos (cliente)
exports.createPedido = async (req, res) => {
  const { direccion_id, items, metodo_pago, clave_checkout } = req.body;
  if (!isPositiveInteger(direccion_id) || Number(direccion_id) === 0 || !Array.isArray(items) || !items.length || items.length > 100) fail(400, 'Indica una dirección y entre 1 y 100 productos válidos');
  if (!require('../utils/payment-methods')().includes(metodo_pago)) fail(400, 'Método de pago no disponible');
  if (typeof clave_checkout !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(clave_checkout)) {
    fail(400, 'Envía una clave_checkout de 16 a 64 caracteres y reutilízala al reintentar la misma compra');
  }
  const normalized = normalizarItems(items);
  const solicitud = { direccion_id:Number(direccion_id), metodo_pago, items:normalized };
  const conCastores = req.body.entrega === 'castores';
  if (req.body.entrega != null && !['castores','acordada'].includes(req.body.entrega)) fail(400,'Modalidad de entrega inválida');
  if (conCastores) {
    const { cotizacion_id, revision } = req.body;
    if (!Number.isSafeInteger(cotizacion_id) || cotizacion_id < 1 || !Number.isSafeInteger(revision) ||
        revision < 1 || req.body.total_esperado == null) fail(400,'Confirma una cotización vigente y su total');
    Object.assign(solicitud, { cotizacion_id, revision });
  } else if (req.body.cotizacion_id != null) fail(400,'La cotización requiere entrega con Castores');
  const hash = crypto.createHash('sha256').update(JSON.stringify(solicitud)).digest('hex');
  const result = await transaction(async conn => {
    await conn.query('SELECT id FROM usuario WHERE id=? FOR UPDATE', [req.user.id]);
    const [existing] = await conn.query('SELECT id,solicitud_hash FROM pedido WHERE usuario_id=? AND clave_checkout=?', [req.user.id,clave_checkout]);
    if (existing.length) {
      if (existing[0].solicitud_hash !== hash) fail(409, 'La clave de compra ya se usó con otros datos');
      return { detail: await getPedidoDetalleCompleto(existing[0].id, conn), repeated: true };
    }
    const [addresses] = await conn.query('SELECT linea1,ciudad,estado,cp,pais FROM direccion WHERE id=? AND usuario_id=?', [direccion_id,req.user.id]);
    if (!addresses.length) fail(400, 'La dirección no existe o no pertenece al usuario');
    const [products] = await conn.query(
      `SELECT p.id, p.proveedor_id, p.precio, p.activo, p.nombre, p.presentacion,c.tipo FROM producto p
       JOIN categoria c ON c.id = p.categoria_id
       WHERE p.id IN (?) AND c.en_catalogo = 1 ORDER BY p.id FOR UPDATE OF p`,
      [normalized.map(i=>i.producto_id)]
    );
    let subtotal = 0, commission = 0, tax = 0;
    const details = normalized.map(item => {
      const product = products.find(p=>p.id===item.producto_id);
      if (!product || product.activo !== 1) fail(409, `El producto ${item.producto_id} ya no está disponible en el catálogo`);
      const unit = publicPriceCents(product.precio);
      subtotal += unit * item.cantidad;
      if (!Number.isSafeInteger(subtotal) || subtotal > 999999999999) fail(400, 'Total fuera de rango');
      commission += (unit - cents(product.precio)) * item.cantidad;
      const nextTax = Math.round(subtotal * 16 / 100);
      const lineTax = nextTax - tax;
      tax = nextTax;
      return {...item, precio_unitario:unit/100, proveedor_id:product.proveedor_id,
        precio_base_unitario:product.precio, iva_linea:lineTax/100};
    });
    const flete = conCastores ? await validarCompra(conn, { id:solicitud.cotizacion_id, revision:solicitud.revision,
      comprador:req.user.id, direccionId:direccion_id, direccion:addresses[0], items:normalized, productos:products, metodo:metodo_pago }) : 0;
    const total = subtotal + tax + flete;
    if (req.body.total_esperado != null && (!Number.isFinite(Number(req.body.total_esperado)) || Number(req.body.total_esperado) < 0 || cents(req.body.total_esperado) !== total)) fail(409,'El precio cambió. Revisa el carrito actualizado antes de confirmar');
    if (!Number.isSafeInteger(total) || total <= 0 || total > 999999999999) fail(400, 'Total fuera de rango');
    await reserveStock(conn, details);
    const [created] = await conn.query(`INSERT INTO pedido
      (usuario_id,direccion_id,direccion_entrega,subtotal,iva,comision,total,estado,stock_reservado,clave_checkout,solicitud_hash,reserva_vence_en,checkout_segundos)
      VALUES (?,?,?,?,?,?,?,?,1,?,?,TIMESTAMPADD(MINUTE,?,NOW()),?)`,
      [req.user.id,direccion_id,JSON.stringify(addresses[0]),subtotal/100,tax/100,commission/100,total/100,
        METODOS_PAGO_ONLINE.has(metodo_pago)?'esperando_pago':'pendiente',clave_checkout,hash,
        reservationMinutes(metodo_pago),segundosCheckout(req.body.inicio_checkout,req.user.id)]);
    if (conCastores) {
      await conn.execute('UPDATE cotizacion_castores SET pedido_id=?, solicitud=NULL WHERE id=?',[created.insertId,solicitud.cotizacion_id]);
    }
    for (const item of details) {
      await conn.query(`INSERT INTO pedido_item
        (pedido_id,producto_id,cantidad,precio_unitario,proveedor_id,precio_base_unitario,iva_linea)
        VALUES (?,?,?,?,?,?,?)`, [created.insertId,item.producto_id,item.cantidad,item.precio_unitario,
        item.proveedor_id,item.precio_base_unitario,item.iva_linea]);
    }
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
      const [items] = await conn.query('SELECT proveedor_id FROM pedido_item WHERE pedido_id=?', [id]);
      if (!providers.length || !items.length || items.some(i=>i.proveedor_id!==providers[0].id)) fail(403, 'Solo puedes actualizar pedidos compuestos exclusivamente por tus productos');
    }
    if (estado === order.estado) return;
    if (estado === 'cancelado') return cancelOrder(conn,order,payment);
    const transitions = { pendiente:['en_proceso'], en_proceso:['enviado'], enviado:['entregado'] };
    if (!transitions[order.estado]?.includes(estado)) fail(409, 'Cambio de estado no permitido');
    if (['enviado','entregado'].includes(estado)) {
      const [[castores]] = await conn.execute('SELECT id FROM cotizacion_castores WHERE pedido_id=?',[id]);
      if (castores) fail(409,'Registra el despacho con guía o la recepción con acuse en el envío Castores');
    }
    const pendingCash = payment.metodo === 'contra_entrega' && payment.estado === 'pendiente';
    const deliveryAfterRefund = payment.estado === 'reembolsado' && order.estado === 'enviado' && estado === 'entregado';
    if (payment.estado !== 'aprobado' && !pendingCash && !deliveryAfterRefund) fail(409, 'El pago no permite avanzar este pedido');
    await conn.query('UPDATE pedido SET estado=? WHERE id=?', [estado,id]);
    if (['enviado','entregado'].includes(estado)) await conn.query('UPDATE envio SET estado=? WHERE pedido_id=?', [estado==='enviado'?'en_transito':'entregado',id]);
  });
  return getPedidoDetalle(req,res);
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
      return res.json(await vendorOrders(user.id, { estado }));
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

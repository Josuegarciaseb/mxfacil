const { randomUUID } = require('node:crypto');
const pool = require('../config/db');
const { transaction, fail } = require('../services/order-state.service');
const service = require('../services/membresia.service');
const stripe = require('../services/stripe.service');

async function provider(req, conn = pool, lock = false) {
  if (req.user.rol !== 'vendedor') fail(403, 'Solo para vendedores');
  const [[row]] = await conn.query(`SELECT id,verificado FROM proveedor WHERE usuario_id=?${lock ? ' FOR UPDATE' : ''}`, [req.user.id]);
  if (!row) fail(404, 'Proveedor no encontrado');
  return row;
}
exports.get = async (req, res) => {
  const prov = await provider(req);
  const [[membership]] = await pool.query(`SELECT DATE_FORMAT(vence_en,'%Y-%m-%dT%H:%i:%s.000Z') AS vence_en,
    vence_en>UTC_TIMESTAMP(3) AS vigente FROM membresia WHERE proveedor_id=?`, [prov.id]);
  const [purchases] = await pool.query(`SELECT id,monto_centavos,estado,
    DATE_FORMAT(creado_en,'%Y-%m-%dT%H:%i:%s.000Z') AS creado_en
    FROM membresia_compra WHERE proveedor_id=? ORDER BY creado_en DESC LIMIT 20`, [prov.id]);
  const active = Boolean(membership?.vigente) && prov.verificado === 'aprobado';
  let metrics = null;
  if (active) {
    const [[events]] = await pool.query(`SELECT COALESCE(SUM(e.tipo='impresion'),0) impresiones,
      COALESCE(SUM(e.tipo='carrito'),0) carritos FROM membresia_evento e JOIN producto p ON p.id=e.producto_id
      WHERE p.proveedor_id=? AND e.dia>=DATE_SUB(UTC_DATE(),INTERVAL 29 DAY)`, [prov.id]);
    const [[orders]] = await pool.query(`SELECT COUNT(DISTINCT pe.id) pedidos FROM pedido pe
      JOIN pedido_item pi ON pi.pedido_id=pe.id JOIN producto p ON p.id=pi.producto_id
      JOIN pago pg ON pg.pedido_id=pe.id WHERE p.proveedor_id=? AND pg.estado='aprobado'
      AND pe.estado<>'cancelado' AND pe.fecha>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY)`, [prov.id]);
    metrics = { ...events, ...orders };
  }
  res.json({ activo: active, vigente: Boolean(membership?.vigente), vence_en: membership?.vence_en || null,
    verificado: prov.verificado === 'aprobado', precio_centavos: service.price(), dias: 30,
    modo: 'prueba', pago_disponible: service.testPaymentsEnabled(), compras: purchases, metricas: metrics });
};
exports.intent = async (req, res) => {
  if (!service.testPaymentsEnabled()) fail(503, 'Configura la clave de prueba de Stripe para comprar Pro');
  const result = await transaction(async conn => {
    const prov = await provider(req, conn, true);
    if (prov.verificado !== 'aprobado') fail(403, 'Tu negocio debe estar aprobado para contratar Pro');
    const [[active]] = await conn.query('SELECT proveedor_id FROM membresia WHERE proveedor_id=? AND vence_en>UTC_TIMESTAMP(3)', [prov.id]);
    if (active) fail(409, 'Tu membresía sigue vigente. Podrás renovarla cuando venza');
    let [[purchase]] = await conn.query("SELECT * FROM membresia_compra WHERE proveedor_id=? AND estado='pendiente' ORDER BY creado_en DESC LIMIT 1 FOR UPDATE", [prov.id]);
    if (!purchase) {
      purchase = { id: randomUUID(), proveedor_id: prov.id, monto_centavos: service.price() };
      await conn.query('INSERT INTO membresia_compra (id,proveedor_id,monto_centavos,creado_en) VALUES (?,?,?,UTC_TIMESTAMP(3))', [purchase.id, prov.id, purchase.monto_centavos]);
    }
    const intent = purchase.referencia ? await stripe.retrievePaymentIntent(purchase.referencia)
      : await stripe.createMembershipIntent(purchase);
    if (!purchase.referencia) await conn.query('UPDATE membresia_compra SET referencia=? WHERE id=?', [intent.id, purchase.id]);
    return { client_secret: intent.client_secret, status: intent.status, compra_id: purchase.id, monto_centavos: purchase.monto_centavos };
  });
  res.json(result);
};
exports.confirm = async (req, res) => {
  if (!service.testPaymentsEnabled()) fail(503, 'Stripe de prueba no está configurado');
  const prov = await provider(req);
  const [pending] = await pool.query("SELECT * FROM membresia_compra WHERE proveedor_id=? AND estado='pendiente'", [prov.id]);
  for (const purchase of pending) await service.reconcile(purchase);
  await exports.get(req, res);
};
exports.event = async (req, res) => {
  const { producto_id, sesion, tipo } = req.body;
  if (!Number.isSafeInteger(producto_id) || producto_id <= 0 ||
    typeof sesion !== 'string' || !/^[a-f0-9-]{36}$/i.test(sesion) || !['impresion','carrito'].includes(tipo)) fail(400, 'Evento inválido');
  await pool.query(`INSERT IGNORE INTO membresia_evento (producto_id,sesion,dia,tipo)
    SELECT p.id,?,UTC_DATE(),? FROM producto p JOIN proveedor pr ON pr.id=p.proveedor_id
    JOIN membresia m ON m.proveedor_id=pr.id JOIN categoria c ON c.id=p.categoria_id
    JOIN inventario i ON i.producto_id=p.id
    WHERE p.id=? AND p.activo=1 AND c.en_catalogo=1 AND i.stock>0
    AND pr.verificado='aprobado' AND m.vence_en>UTC_TIMESTAMP(3)`, [sesion, tipo, producto_id]);
  res.json({ recibido: true });
};

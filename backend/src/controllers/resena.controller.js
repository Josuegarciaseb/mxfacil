const pool = require('../config/db');
const {transaction, lockOrder, fail} = require('../services/order-state.service');

function validId(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) fail(400, 'Identificador inválido');
  return Number(value);
}
function owner(req, order) {
  if (!['cliente','vendedor'].includes(req.user.rol) || order.usuario_id !== req.user.id) fail(403, 'Solo el cliente que compró puede realizar esta acción');
}
exports.deliver = async (req, res) => {
  const id = validId(req.params.id);
  await transaction(async conn => {
    const {order, payment} = await lockOrder(conn, id);
    owner(req, order);
    if (payment.estado !== 'aprobado') fail(409, 'Primero debe confirmarse el pago del pedido');
    if (order.estado !== 'entregado') fail(409, 'El vendedor debe marcar el pedido como entregado antes de confirmar la recepción');
    await conn.query('UPDATE pedido SET recibido_cliente_en=COALESCE(recibido_cliente_en,UTC_TIMESTAMP(3)) WHERE id=?', [id]);
  });
  res.json({estado:'entregado'});
};
exports.mine = async (req, res) => {
  const id = validId(req.params.id);
  const [[order]] = await pool.query('SELECT usuario_id FROM pedido WHERE id=?', [id]);
  if (!order) fail(404, 'Pedido no encontrado');
  owner(req, order);
  const [rows] = await pool.query(`SELECT r.id,r.pedido_item_id,r.calidad,r.servicio,r.comentario
    FROM resena r JOIN pedido_item pi ON pi.id=r.pedido_item_id WHERE pi.pedido_id=?`, [id]);
  res.json(rows);
};
exports.create = async (req, res) => {
  const orderId = validId(req.params.id);
  const itemId = validId(req.body.pedido_item_id);
  const {calidad, servicio, comentario = ''} = req.body;
  if (![calidad, servicio].every(n => Number.isInteger(n) && n >= 1 && n <= 5)) fail(400, 'Selecciona calificaciones enteras de 1 a 5');
  if (typeof comentario !== 'string' || comentario.length > 1000) fail(400, 'El comentario admite hasta 1000 caracteres');
  const result = await transaction(async conn => {
    const {order, payment} = await lockOrder(conn, orderId);
    owner(req, order);
    if (order.estado !== 'entregado' || payment.estado !== 'aprobado' || !order.recibido_cliente_en) fail(409, 'Confirma la recepción de tu pedido pagado y entregado antes de reseñar');
    const [[item]] = await conn.query(`SELECT pi.id,pi.producto_id,p.proveedor_id,pr.usuario_id AS vendedor_id
      FROM pedido_item pi JOIN producto p ON p.id=pi.producto_id JOIN proveedor pr ON pr.id=p.proveedor_id
      WHERE pi.id=? AND pi.pedido_id=?`, [itemId, orderId]);
    if (!item) fail(404, 'El producto no pertenece a este pedido');
    if (item.vendedor_id === req.user.id) fail(403, 'No puedes reseñar tus propios productos');
    const [[existing]] = await conn.query('SELECT * FROM resena WHERE pedido_item_id=?', [itemId]);
    const text = comentario.trim();
    // Safe retry after a lost response; never overwrites a published review.
    if (existing) {
      if (existing.calidad === calidad && existing.servicio === servicio && existing.comentario === text) return {id:existing.id,created:false};
      fail(409, 'Ya publicaste una reseña para este producto en este pedido');
    }
    const [insert] = await conn.query(`INSERT INTO resena
      (pedido_item_id,producto_id,proveedor_id,calidad,servicio,comentario,creado_en)
      VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(3))`, [itemId,item.producto_id,item.proveedor_id,calidad,servicio,text]);
    return {id:insert.insertId,created:true};
  });
  res.status(result.created ? 201 : 200).json({id:result.id});
};
exports.publicList = async (req, res) => {
  const id = validId(req.params.id);
  const before = req.query.antes == null ? null : validId(req.query.antes);
  const [[product]] = await pool.query(`SELECT p.id FROM producto p JOIN categoria c ON c.id=p.categoria_id
    WHERE p.id=? AND p.activo=1 AND c.en_catalogo=1`, [id]);
  if (!product) fail(404, 'Producto no encontrado');
  const [[summary]] = await pool.query('SELECT COUNT(*) total,AVG(calidad) calidad,AVG(servicio) servicio FROM resena WHERE producto_id=?',[id]);
  const [rows] = await pool.query(`SELECT id,calidad,servicio,comentario,
    DATE_FORMAT(creado_en,'%Y-%m-%dT%H:%i:%s.000Z') creado_en FROM resena
    WHERE producto_id=? ${before ? 'AND id<?' : ''} ORDER BY id DESC LIMIT 11`, before ? [id,before] : [id]);
  res.json({resumen:summary,resenas:rows.slice(0,10),siguiente:rows.length>10 ? rows[9].id : null});
};

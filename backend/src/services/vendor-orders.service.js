const pool = require('../config/db');

// One row per order for this supplier. A whole historical order can be
// attributed to its only supplier even when its lines predate the snapshots.
async function vendorOrders(userId, { estado, pedidoId } = {}) {
  const conditions = ['s.usuario_id = ?'];
  const params = [userId];
  if (estado) { conditions.push('p.estado = ?'); params.push(estado); }
  if (pedidoId) { conditions.push('p.id = ?'); params.push(pedidoId); }
  const [rows] = await pool.query(`
    WITH propias AS (
      SELECT p.id, i.proveedor_id, SUM(i.cantidad*i.precio_unitario) AS importe_lineas,
        IF(COUNT(i.precio_base_unitario)=COUNT(*),SUM(i.cantidad*i.precio_base_unitario),NULL) AS base_lineas,
        IF(COUNT(i.iva_linea)=COUNT(*),SUM(i.iva_linea),NULL) AS impuesto_lineas
      FROM pedido_item i JOIN proveedor s ON s.id=i.proveedor_id
      JOIN pedido p ON p.id=i.pedido_id WHERE ${conditions.join(' AND ')}
      GROUP BY p.id,i.proveedor_id
    ), desglose AS (
      SELECT propias.*, NOT EXISTS (
        SELECT 1 FROM pedido_item otra WHERE otra.pedido_id=propias.id
          AND NOT (otra.proveedor_id <=> propias.proveedor_id)
      ) AS exclusivo FROM propias
    )
    SELECT p.id,p.usuario_id,u.nombre AS usuario_nombre,p.direccion_id,p.fecha,p.estado,
      g.estado AS pago_estado,
      IF(d.exclusivo,p.subtotal,d.importe_lineas) AS subtotal,
      IF(d.exclusivo,p.iva,d.impuesto_lineas) AS iva,
      IF(d.exclusivo,p.total,d.importe_lineas+d.impuesto_lineas) AS total,
      IF(d.exclusivo,p.subtotal-p.comision,d.base_lineas) AS importe_proveedor,
      IF(d.exclusivo,p.comision,d.importe_lineas-d.base_lineas) AS comision
    FROM desglose d JOIN pedido p ON p.id=d.id JOIN usuario u ON u.id=p.usuario_id
    LEFT JOIN pago g ON g.pedido_id=p.id
    ORDER BY p.fecha DESC,p.id DESC`, params);
  return rows;
}

module.exports = { vendorOrders };

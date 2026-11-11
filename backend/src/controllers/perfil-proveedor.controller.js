const pool = require('../config/db');
const { fail } = require('../services/order-state.service');

exports.publicProfile = async (req, res) => {
  const valid = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  if (!valid(req.params.id) || (req.query.antes != null && !valid(req.query.antes))) fail(400, 'Identificador inválido');
  const id = Number(req.params.id);
  const before = req.query.antes == null ? null : Number(req.query.antes);
  const [[proveedor]] = await pool.query(`SELECT pr.id,pr.nombre,
    EXISTS(SELECT 1 FROM membresia m WHERE m.proveedor_id=pr.id
      AND m.vence_en>UTC_TIMESTAMP(3) AND pr.verificado='aprobado') AS proveedor_pro
    FROM proveedor pr WHERE pr.id=?`, [id]);
  if (!proveedor) fail(404, 'Vendedor no encontrado');
  const [[resumen]] = await pool.query(`SELECT COUNT(*) total,AVG(calidad) calidad,AVG(servicio) servicio
    FROM resena WHERE proveedor_id=?`, [id]);
  const [rows] = await pool.query(`SELECT r.id,r.calidad,r.servicio,r.comentario,p.nombre AS producto_nombre,
    DATE_FORMAT(r.creado_en,'%Y-%m-%dT%H:%i:%s.000Z') creado_en
    FROM resena r JOIN producto p ON p.id=r.producto_id
    WHERE r.proveedor_id=? ${before ? 'AND r.id<?' : ''} ORDER BY r.id DESC LIMIT 11`, before ? [id,before] : [id]);
  res.json({proveedor,resumen,resenas:rows.slice(0,10),siguiente:rows.length>10 ? rows[9].id : null});
};

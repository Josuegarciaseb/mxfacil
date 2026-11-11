const pool = require('../config/db');
const { fail, transaction } = require('../services/order-state.service');
const { iniciarCheckout } = require('../services/piloto.service');

exports.inicioCompra = (req, res) => res.json({ inicio_checkout: iniciarCheckout(req.user.id) });

function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor + 'T00:00:00Z');
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function listaIds(valor, mensajeError) {
  if (valor == null || valor === '') return [];
  if (typeof valor !== 'string' || !/^[1-9]\d{0,9}(,[1-9]\d{0,9})*$/.test(valor)) fail(400, mensajeError);
  return [...new Set(valor.split(',').map(Number))];
}

exports.informe = async (req, res) => {
  const { desde, hasta } = req.query;
  if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) fail(400, 'Indica un intervalo de fechas válido');
  const params = [desde, hasta];
  let filtro = '';
  const tiendas = listaIds(req.query.tiendas, 'Cuentas de tienda inválidas');
  const proveedores = listaIds(req.query.proveedores, 'Proveedores inválidos');
  if (tiendas.length) {
    filtro = ' AND p.usuario_id IN (?)';
    params.push(tiendas);
  }
  if (proveedores.length) {
    // El costo corresponde al folio completo. Una partida ajena o sin
    // proveedor histórico deja ese folio fuera de la cohorte seleccionada.
    filtro += ` AND EXISTS (
      SELECT 1 FROM pedido_item i WHERE i.pedido_id = p.id
      GROUP BY i.pedido_id
      HAVING COUNT(*) = SUM(CASE WHEN i.proveedor_id IN (?) THEN 1 ELSE 0 END)
    )`;
    params.push(proveedores);
  }
  const [rows] = await pool.query(
    `WITH operaciones AS (
       SELECT p.id, p.usuario_id, u.nombre AS tienda, p.fecha, p.estado,
         g.estado AS pago_estado, p.checkout_segundos, p.costo_variable,
         CASE WHEN g.estado = 'aprobado' AND p.estado <> 'cancelado'
              THEN p.comision ELSE 0.00 END AS comision_obtenida
       FROM pedido p JOIN usuario u ON u.id = p.usuario_id
       LEFT JOIN pago g ON g.pedido_id = p.id
       WHERE p.fecha >= ? AND p.fecha < DATE_ADD(?, INTERVAL 1 DAY)${filtro}
     )
     SELECT operaciones.*, comision_obtenida - costo_variable AS margen,
       SUM(comision_obtenida) OVER () AS comision_periodo
     FROM operaciones ORDER BY fecha DESC, id DESC`, params);

  const compras = new Map();
  let entregados = 0, cancelados = 0, muestras = 0, segundos = 0;
  const pedidos = rows.map(({ comision_periodo, ...pedido }) => {
    if (pedido.estado === 'entregado') entregados++;
    if (pedido.estado === 'cancelado') cancelados++;
    if (pedido.pago_estado === 'aprobado' && pedido.estado !== 'cancelado') {
      compras.set(pedido.usuario_id, (compras.get(pedido.usuario_id) || 0) + 1);
    }
    if (pedido.checkout_segundos != null) {
      muestras++;
      segundos += pedido.checkout_segundos;
    }
    return pedido;
  });
  res.json({
    desde, hasta, pedidos,
    resumen: {
      entregados, cancelados, pendientes: pedidos.length - entregados - cancelados,
      tiendas_compradoras: compras.size,
      tiendas_recurrentes: [...compras.values()].filter(cantidad => cantidad >= 2).length,
      muestras_tiempo: muestras, segundos_promedio: muestras ? Math.round(segundos / muestras) : null,
      comision_obtenida: rows[0]?.comision_periodo || '0.00',
    },
  });
};

function costoValido(valor) {
  return valor === null || (['string', 'number'].includes(typeof valor) && /^\d{1,10}(\.\d{1,2})?$/.test(String(valor)));
}

exports.guardarCosto = async (req, res) => {
  const { costo_variable, anterior } = req.body;
  if (!/^[1-9]\d{0,9}$/.test(req.params.id) || !costoValido(costo_variable) || !costoValido(anterior)) {
    fail(400, 'Indica el costo anterior y el nuevo en MXN con hasta dos decimales o null');
  }
  await transaction(async conn => {
    const [rows] = await conn.execute(
      'SELECT costo_variable <=> CAST(? AS DECIMAL(12,2)) AS igual, costo_variable <=> CAST(? AS DECIMAL(12,2)) AS vigente FROM pedido WHERE id = ? FOR UPDATE',
      [costo_variable, anterior, req.params.id]);
    if (!rows.length) fail(404, 'Pedido no encontrado');
    if (rows[0].igual) return;
    if (!rows[0].vigente) fail(409, 'Otra persona modificó el costo. Actualiza el informe antes de editarlo.');
    await conn.execute('UPDATE pedido SET costo_variable = ? WHERE id = ?', [costo_variable, req.params.id]);
  });
  res.json({ guardado: true });
};

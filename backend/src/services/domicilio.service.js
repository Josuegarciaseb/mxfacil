const { contexto, normalizarItems } = require('./castores.service');
const { fail } = require('./order-state.service');

// Referencia comercial publicada para Castores hasta 6 kg. El transportista
// confirma el precio según ruta y embalaje. Ver la fuente en qa/LOGISTICA.md.
const REFERENCIA_LIGERA_MXN = 247;

function pesoGramos(carga) {
  let total = 0;
  for (const producto of carga) {
    const coincidencia = /^(?:[\p{L} ]+\s)?(\d+(?:[.,]\d{1,3})?)\s*(kg|g)$/iu.exec(producto.presentacion?.trim());
    if (!coincidencia) return null;
    const gramos = Number(coincidencia[1].replace(',', '.')) * (coincidencia[2].toLowerCase() === 'kg' ? 1000 : 1);
    if (gramos <= 0) return null;
    total += gramos * producto.cantidad;
  }
  return total;
}

async function estimar(conn, datos, cp) {
  if (datos.perecedero) return { estimado: null, fuente: null, perecedero: true };
  const bultos = datos.carga.map(({id, cantidad, presentacion}) => ({id, cantidad, presentacion}));
  // Una tarifa vigente de mostrador o Envia también sirve de referencia para
  // una carga pesada que aún no tiene entregas registradas.
  const [[ultimo]] = await conn.query(`SELECT CASE WHEN c.pedido_id IS NULL THEN c.flete
      ELSE COALESCE(d.importe_destino,c.costo_flete_real) END AS importe
    FROM cotizacion_castores c LEFT JOIN envio e ON e.pedido_id=c.pedido_id
    LEFT JOIN flete_domicilio d ON d.cotizacion_id=c.id
    WHERE c.proveedor_id=? AND c.cp_destino=? AND c.transportista='Castores' AND COALESCE(c.fuente,'') <> 'sandbox'
      AND JSON_LENGTH(c.productos)=? AND JSON_CONTAINS(c.productos,?)
      AND ((e.estado='entregado' AND e.fecha_entrega >= CURRENT_DATE - INTERVAL 90 DAY
            AND c.guia IS NOT NULL AND c.canal_guia <> 'sandbox' AND COALESCE(d.importe_destino,c.costo_flete_real)>0)
        OR (c.pedido_id IS NULL AND c.fuente IN ('cotizador','envia') AND c.vigencia>=CURRENT_DATE
            AND c.flete>0 AND c.motivo_rechazo IS NULL))
    ORDER BY (c.pedido_id IS NULL) DESC, e.fecha_entrega DESC,c.id DESC LIMIT 1`,
    [datos.proveedor,cp,bultos.length,JSON.stringify(bultos)]);
  if (ultimo) return { estimado: Number(ultimo.importe), fuente: 'historial' };
  const gramos = pesoGramos(datos.carga);
  if (gramos !== null && gramos <= 6000) return { estimado: REFERENCIA_LIGERA_MXN, fuente: 'referencia' };
  return { estimado: null, fuente: null };
}

async function vistaPrevia(conn, comprador, direccionId, items) {
  const carga = normalizarItems(items);
  if (!Number.isSafeInteger(Number(direccionId)) || Number(direccionId) < 1) fail(400,'Selecciona una dirección');
  const [[direccion]] = await conn.execute('SELECT linea1,ciudad,estado,cp,pais FROM direccion WHERE id=? AND usuario_id=?', [direccionId,comprador]);
  if (!direccion) fail(404,'Dirección no disponible');
  const [productos] = await conn.query(`SELECT p.id,p.proveedor_id,p.nombre,p.presentacion,p.precio,p.activo,c.tipo
    FROM producto p JOIN categoria c ON c.id=p.categoria_id WHERE c.en_catalogo=1 AND p.id IN (?) ORDER BY p.id`, [carga.map(i => i.producto_id)]);
  const datos = contexto(comprador,direccionId,direccion,carga,productos,'domicilio',{domicilio:true});
  return estimar(conn,datos,direccion.cp);
}

async function registrar(conn, { pedido, comprador, direccionId, direccion, items, productos, metodo, aceptado }) {
  if (metodo === 'contra_entrega') fail(409,'Paga la mercancía por adelantado para el envío a domicilio');
  const datos = contexto(comprador,direccionId,direccion,items,productos,metodo,{domicilio:true});
  const {estimado, fuente} = await estimar(conn,datos,direccion.cp);
  if (aceptado != null && aceptado !== estimado) fail(409,'Cambió el estimado de envío. Revisa el carrito.');
  const [fila] = await conn.execute(`INSERT INTO cotizacion_castores
    (pedido_id,comprador_id,metodo_pago,proveedor_id,direccion_id,productos,destino,cp_destino,valor_mercancia,comision_estimada,transportista,perecedero)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [pedido,comprador,metodo,datos.proveedor,direccionId,JSON.stringify(datos.carga),
    direccion.ciudad+', '+direccion.estado,direccion.cp,datos.base/100,datos.comision/100,datos.perecedero ? null : 'Castores',datos.perecedero]);
  await conn.execute('INSERT INTO flete_domicilio (cotizacion_id,estimado,fuente_estimado,autorizado_hasta) VALUES (?,?,?,?)',
    [fila.insertId,estimado,fuente,aceptado ?? null]);
}

module.exports = { vistaPrevia, registrar };

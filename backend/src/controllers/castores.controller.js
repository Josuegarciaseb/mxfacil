const pool = require('../config/db');
const { transaction, lockOrder, fail } = require('../services/order-state.service');
const { cents } = require('../utils/money');
const { contexto, firmaSolicitud, normalizarItems, importe, texto, leerCotizacion, esGestor, vistaPublica } = require('../services/castores.service');
const paymentMethods = require('../utils/payment-methods');
const envia = require('../services/envia-castores.service');

exports.solicitar = async (req, res) => {
  if (req.user.rol !== 'cliente') fail(403, 'La cotización debe solicitarla el comprador');
  const direccionId = Number(req.body.direccion_id);
  if (!Number.isSafeInteger(direccionId) || direccionId < 1) fail(400, 'Selecciona una dirección');
  const metodo = req.body.metodo_pago;
  if (metodo === 'contra_entrega' || !paymentMethods().includes(metodo)) fail(400,'Selecciona un método de pago previo disponible');
  const items = normalizarItems(req.body.items);
  const cotizacion = await transaction(async conn => {
    const [[direccion]] = await conn.execute('SELECT linea1,ciudad,estado,cp,pais FROM direccion WHERE id=? AND usuario_id=?',
      [direccionId, req.user.id]);
    if (!direccion) fail(404, 'Dirección no disponible');
    const [productos] = await conn.query(`SELECT p.id,p.proveedor_id,p.nombre,p.presentacion,p.precio,p.activo,c.tipo
      FROM producto p JOIN categoria c ON c.id=p.categoria_id WHERE c.en_catalogo=1 AND p.id IN (?) ORDER BY p.id`,
      [items.map(i => i.producto_id)]);
    const datos = contexto(req.user.id, direccionId, direccion, items, productos,metodo);
    const [result] = await conn.execute(`INSERT INTO cotizacion_castores
      (comprador_id,metodo_pago,proveedor_id,direccion_id,solicitud,productos,destino,cp_destino,valor_mercancia,comision_estimada)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [req.user.id,metodo,datos.proveedor,direccionId,datos.firma,JSON.stringify(datos.carga),
        direccion.ciudad + ', ' + direccion.estado,direccion.cp,datos.base/100,datos.comision/100]);
    // Una solicitud idéntica puede haberse confirmado después de la primera lectura.
    return vistaPublica(await leerCotizacion(conn, result.insertId, true));
  });
  res.json(cotizacion);
};

exports.consultar = async (req, res) => {
  const q = await leerCotizacion(pool, req.params.id);
  if (q.comprador_id !== req.user.id && !esGestor(q,req.user)) fail(403, 'Acceso denegado');
  res.json(vistaPublica(q));
};

exports.gestion = async (req, res) => {
  const admin = req.user.rol === 'admin';
  const [rows] = await pool.query(`SELECT c.id,c.proveedor_id,pr.nombre AS proveedor,c.productos,c.destino,c.cp_destino,
    c.metodo_pago,c.valor_mercancia,c.comision_estimada,c.flete,c.servicio,c.referencia,c.otros_costos_estimados,c.revision,c.motivo_rechazo,
    DATE_FORMAT(c.vigencia,'%Y-%m-%d') AS valida_hasta,(c.vigencia >= CURRENT_DATE) AS vigente
    FROM cotizacion_castores c JOIN proveedor pr ON pr.id=c.proveedor_id
    WHERE c.pedido_id IS NULL ${admin ? '' : 'AND pr.usuario_id=?'} ORDER BY c.id DESC`, admin ? [] : [req.user.id]);
  res.json(rows.map(q => ({ ...q, api:envia.origenDe(q.proveedor_id) ? envia.entorno() : null })));
};

function puedeOfertar(q, req) {
  if (!esGestor(q,req.user)) fail(403, 'Esta solicitud pertenece a otro proveedor');
  if (q.pedido_id || q.revision !== req.body.revision || (q.flete !== null && q.vigente)) {
    fail(409, 'La solicitud ya se atendió o cambió. Actualiza la lista.');
  }
}

exports.ofertar = async (req, res) => {
  const q = await leerCotizacion(pool, req.params.id);
  puedeOfertar(q, req);
  const body = req.body;
  let oferta;
  if (!body.motivo_rechazo) {
    if (body.cobertura_confirmada !== true) fail(400, 'Confirma la aceptación de la mercancía, la cobertura y el embalaje');
    const otros = importe(body.otros_costos_estimados,'otros costos previstos',true) / 100;
    if (cents(otros) >= cents(q.comision_estimada)) fail(409, 'La comisión no cubre los otros costos previstos. Revisa el tamaño del pedido.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.vigencia || '')) fail(400, 'Indica la vigencia de la cotización');
    const fecha = new Date(body.vigencia + 'T00:00:00Z');
    if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0,10) !== body.vigencia) fail(400, 'Vigencia inválida');
    if (body.fuente === 'envia') {
      const [[d]] = await pool.execute(`SELECT d.linea1,d.ciudad,d.cp,d.pais,d.estado,
        u.nombre AS name,u.telefono AS phone FROM direccion d JOIN usuario u ON u.id=d.usuario_id
        WHERE d.id=? AND u.id=?`, [q.direccion_id,q.comprador_id]);
      if (!d || q.solicitud !== firmaSolicitud(q.comprador_id,q.direccion_id,d,q.proveedor_id,q.productos,q.metodo_pago)) {
        fail(409, 'La dirección cambió. Solicita otra cotización.');
      }
      oferta = await envia.cotizar(q,{name:d.name,phone:d.phone,street:d.linea1,city:d.ciudad,postalCode:d.cp,country:'MX',state:body.estado_destino},body);
    } else {
      if (!/^\d{5}$/.test(body.cp_origen || '')) fail(400, 'Indica cinco dígitos para el CP de origen');
      oferta = { cp_origen:body.cp_origen, flete:importe(body.flete,'flete') / 100,
        referencia:texto(body.referencia,100,'referencia del cotizador'), servicio:texto(body.servicio,100,'servicio y plazo'),
        fuente:'cotizador' };
    }
    oferta.otros = otros;
  }
  const result = await transaction(async conn => {
    const locked = await leerCotizacion(conn,q.id,true);
    puedeOfertar(locked, req);
    if (oferta) {
      const [saved] = await conn.execute(`UPDATE cotizacion_castores SET flete=?,cp_origen=?,referencia=?,servicio=?,
        fuente=?,embalaje=?,vigencia=?,otros_costos_estimados=?,motivo_rechazo=NULL,revision=revision+1 WHERE id=? AND ? >= CURRENT_DATE`,
        [oferta.flete,oferta.cp_origen,oferta.referencia,oferta.servicio,oferta.fuente,oferta.embalaje ? JSON.stringify(oferta.embalaje) : null,body.vigencia,oferta.otros,q.id,body.vigencia]);
      if (!saved.affectedRows) fail(400, 'La vigencia ya terminó');
    } else {
      await conn.execute(`UPDATE cotizacion_castores SET motivo_rechazo=?,flete=NULL,vigencia=NULL,revision=revision+1 WHERE id=?`,
        [texto(body.motivo_rechazo,200,'motivo'),q.id]);
    }
    return vistaPublica(await leerCotizacion(conn,q.id));
  });
  res.json(result);
};

async function envioAutorizado(conn, id, user, soloGestor = false) {
  const [[q]] = await conn.execute(`SELECT c.*,pr.usuario_id AS vendedor_id FROM cotizacion_castores c
    JOIN proveedor pr ON pr.id=c.proveedor_id WHERE c.pedido_id=?`, [id]);
  if (!q) fail(404, 'Este pedido no tiene un envío con Castores');
  if (!esGestor(q,user) && (soloGestor || q.comprador_id !== user.id)) fail(403, 'Acceso denegado');
  return q;
}

exports.despachar = async (req,res) => {
  const guia = texto(req.body.guia,40,'guía o talón').toUpperCase();
  if (!/^(\d{11}|[A-Z]{3}-(?:\d{5}|\d{7}))$/.test(guia)) fail(400, 'Usa el talón de 11 dígitos o una guía como ABC-12345 o ABC-1234567');
  const costo = importe(req.body.costo_flete_real,'costo real del transporte',true) / 100;
  await transaction(async conn => {
    const {order,payment} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user,true);
    if (q.guia) {
      if (q.guia === guia) return; // El costo conciliado puede haberse corregido en el piloto.
      fail(409,'Este despacho ya tiene guía y costo registrados');
    }
    if (order.estado !== 'en_proceso' || payment.estado !== 'aprobado') fail(409,'Confirma el cobro antes de entregar el paquete a Castores');
    const canal = req.body.canal_guia || 'castores';
    if (!['castores','envia'].includes(canal) || (canal === 'envia' && !envia.entorno())) fail(400,'Canal de emisión de guía no disponible');
    const emision = canal === 'envia' && envia.entorno() === 'sandbox' ? 'sandbox' : canal;
    if (q.costo_flete_real != null && Number(q.costo_flete_real) !== costo) fail(409,'El costo real ya fue registrado. Revisa el importe en el informe del piloto.');
    try {
      await conn.execute('UPDATE cotizacion_castores SET guia=?,costo_flete_real=?,canal_guia=? WHERE id=?',[guia,costo,emision,q.id]);
    } catch (err) { if (err.code === 'ER_DUP_ENTRY') fail(409,'La guía ya se asignó a otro folio'); throw err; }
    const [shipment] = await conn.execute(`UPDATE envio SET transportista='Castores',guia=?,estado='en_transito',
      fecha_envio=NOW() WHERE pedido_id=?`,[guia,order.id]);
    if (!shipment.affectedRows) fail(409,'Falta el registro de envío del pedido');
    await conn.execute("UPDATE pedido SET estado='enviado' WHERE id=?",[order.id]);
  });
  res.json({ guia });
};

exports.recibir = async (req,res) => {
  const recibido = texto(req.body.recibido_por,100,'persona que recibió');
  const acuse = texto(req.body.acuse,150,'referencia del acuse');
  await transaction(async conn => {
    const {order} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user);
    if (q.comprador_id !== req.user.id && req.user.rol !== 'admin') fail(403,'La recepción la confirma el comprador o administración con el acuse');
    if (order.estado === 'entregado' && q.recibido_por === recibido && q.acuse === acuse) return;
    if (order.estado !== 'enviado' || !q.guia) fail(409,'Solo se registra recepción de un pedido despachado');
    await conn.execute('UPDATE cotizacion_castores SET recibido_por=?,acuse=?,confirmacion=?,confirmado_por=? WHERE id=?',
      [recibido,acuse,req.user.id === q.comprador_id ? 'comprador' : 'administracion',req.user.id,q.id]);
    await conn.execute("UPDATE envio SET estado='entregado',fecha_entrega=NOW() WHERE pedido_id=?",[order.id]);
    await conn.execute("UPDATE pedido SET estado='entregado' WHERE id=?",[order.id]);
  });
  res.json({estado:'entregado'});
};

exports.incidencia = async (req,res) => {
  const nota = texto(req.body.motivo,240,'descripción de la incidencia');
  await transaction(async conn => {
    const {order} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user);
    if (!['enviado','entregado'].includes(order.estado)) fail(409,'Solo se admiten incidencias de pedidos despachados');
    if (q.incidencia && q.incidencia !== nota) fail(409,'Ya existe una incidencia para este envío');
    await conn.execute('UPDATE cotizacion_castores SET incidencia=? WHERE id=?',[nota,q.id]);
    if (order.estado === 'enviado') await conn.execute("UPDATE envio SET estado='incidencia' WHERE pedido_id=?",[order.id]);
  });
  res.json({estado:'incidencia'});
};

exports.rastreo = async (req,res) => {
  const q = await envioAutorizado(pool,req.params.id,req.user);
  if (!q.guia) fail(409,'Todavía no se ha registrado una guía');
  if (!envia.entorno()) fail(503,'Consulta el portal oficial de Castores con la guía registrada');
  const canal = envia.entorno() === 'sandbox' ? 'sandbox' : 'envia';
  if (q.canal_guia !== canal) fail(409,'Esta guía se consulta en el portal de Castores');
  res.json(await envia.rastrear(q.guia));
};

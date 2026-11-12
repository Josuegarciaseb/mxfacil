const pool = require('../config/db');
const { transaction, lockOrder, releaseOrder, cancelOrder, fail } = require('../services/order-state.service');
const { cents } = require('../utils/money');
const { contexto, firmaSolicitud, normalizarItems, importe, texto, leerCotizacion, esGestor, vistaPublica } = require('../services/castores.service');
const paymentMethods = require('../utils/payment-methods');
const envia = require('../services/envia-castores.service');
const domicilio = require('../services/domicilio.service');

exports.estimarDomicilio = async (req,res) => {
  res.json(await domicilio.vistaPrevia(pool,req.user.id,req.body.direccion_id,req.body.items));
};

exports.solicitar = async (req, res) => {
  if (!['cliente','vendedor'].includes(req.user.rol)) fail(403, 'La cotización debe solicitarla el comprador');
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
  const [[q]] = await conn.execute(`SELECT c.*,pr.usuario_id AS vendedor_id,fd.cotizacion_id AS domicilio_id,
    fd.importe_destino,fd.autorizado_hasta FROM cotizacion_castores c
    JOIN proveedor pr ON pr.id=c.proveedor_id LEFT JOIN flete_domicilio fd ON fd.cotizacion_id=c.id WHERE c.pedido_id=?`, [id]);
  if (!q) fail(404, 'Este pedido no tiene un envío por paquetería');
  if (!esGestor(q,user) && (soloGestor || q.comprador_id !== user.id)) fail(403, 'Acceso denegado');
  return q;
}

function validarRevision(q, revision) {
  // Los clientes anteriores a 014 solo conocen el flujo de Castores.
  if (revision == null && q.transportista === 'Castores') return;
  if (q.revision !== revision) fail(409,'La propuesta de envío cambió. Actualiza el pedido.');
}

exports.precioDomicilio = async (req,res) => {
  const precio = importe(req.body.importe,'flete por pagar al recibir',true);
  const referencia = texto(req.body.referencia,100,'referencia de la paquetería');
  const transportista = req.body.transportista ?? 'Castores';
  if (!['Castores','FedEx','DHL'].includes(transportista)) fail(400,'Selecciona una paquetería disponible');
  const servicio = transportista === 'Castores' ? null : texto(req.body.servicio,100,'servicio y plazo confirmados');
  if (servicio && req.body.cobertura_confirmada !== true) fail(400,'Confirma con la paquetería la aceptación del producto y las condiciones de entrega');
  await transaction(async conn => {
    const {order} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user,true);
    if (!q.domicilio_id || q.guia || order.estado === 'cancelado') fail(409,'El pedido no admite cambios de flete');
    if (q.perecedero && transportista === 'Castores') fail(409,'Para perecederos selecciona un servicio confirmado de FedEx o DHL');
    if (q.importe_destino != null && cents(q.importe_destino) === precio && q.referencia === referencia &&
        q.transportista === transportista && q.servicio === servicio) return;
    validarRevision(q,req.body.revision);
    const anterior = req.body.anterior == null ? null : importe(req.body.anterior,'flete anterior',true);
    if ((q.importe_destino == null ? null : cents(q.importe_destino)) !== anterior) fail(409,'El flete cambió. Actualiza el pedido.');
    const cambiaServicio = q.transportista !== transportista || q.servicio !== servicio;
    await conn.execute('UPDATE flete_domicilio SET importe_destino=?, autorizado_hasta=IF(?,NULL,autorizado_hasta) WHERE cotizacion_id=?',
      [precio/100,cambiaServicio,q.id]);
    await conn.execute('UPDATE cotizacion_castores SET referencia=?,transportista=?,servicio=?,revision=revision+1 WHERE id=?',
      [referencia,transportista,servicio,q.id]);
  });
  res.json({guardado:true});
};

exports.aceptarFlete = async (req,res) => {
  const precio = importe(req.body.importe,'flete autorizado',true);
  await transaction(async conn => {
    const {order} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user);
    if (q.comprador_id !== req.user.id) fail(403,'Solo el comprador puede autorizar este flete');
    validarRevision(q,req.body.revision);
    if (!q.domicilio_id || q.guia || order.estado === 'cancelado' || q.importe_destino == null || cents(q.importe_destino) !== precio) {
      fail(409,'El flete cambió. Revisa el importe actual del pedido.');
    }
    await conn.execute('UPDATE flete_domicilio SET autorizado_hasta=? WHERE cotizacion_id=?',[precio/100,q.id]);
  });
  res.json({guardado:true});
};

exports.cancelarDomicilio = async (req,res) => {
  await transaction(async conn => {
    let {order,payment} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user);
    if (!q.domicilio_id || q.guia || ['enviado','entregado'].includes(order.estado)) fail(409,'El envío ya no admite cancelación');
    if (order.estado === 'cancelado') return;
    if (payment.estado === 'pendiente') {
      await cancelOrder(conn,order,payment);
      ({order,payment} = await lockOrder(conn,order.id));
    }
    // Si ya hubo cobro, el folio cancelado queda por devolver hasta que
    // administración registre el comprobante del reembolso efectivo.
    if (order.estado !== 'cancelado' && payment.estado === 'aprobado') await releaseOrder(conn,order);
  });
  res.json({guardado:true});
};

exports.despachar = async (req,res) => {
  const guia = texto(req.body.guia,40,'guía o talón').toUpperCase();
  await transaction(async conn => {
    const {order,payment} = await lockOrder(conn,req.params.id);
    const q = await envioAutorizado(conn,order.id,req.user,true);
    if (q.domicilio_id) validarRevision(q,req.body.revision);
    if (!q.transportista) fail(409,'Registra la paquetería y el flete antes de despachar');
    if (q.transportista === 'Castores') {
      if (!/^(\d{11}|[A-Z]{3}-(?:\d{5}|\d{7}))$/.test(guia)) fail(400,'Usa el talón de 11 dígitos o la guía de Castores');
    } else if (!/^[A-Z0-9][A-Z0-9-]{4,39}$/.test(guia)) fail(400,'Ingresa el identificador de rastreo emitido por la paquetería');
    if (q.guia) {
      if (q.guia === guia) return; // El costo conciliado puede haberse corregido en el piloto.
      fail(409,'Este despacho ya tiene guía y costo registrados');
    }
    if (order.estado !== 'en_proceso' || payment.estado !== 'aprobado') fail(409,'Confirma el cobro antes de entregar el paquete a la paquetería');
    if (q.domicilio_id && (q.importe_destino == null || q.autorizado_hasta == null ||
        cents(q.importe_destino) > cents(q.autorizado_hasta))) fail(409,'El flete final debe estar autorizado antes del despacho');
    const costo = q.domicilio_id ? null : importe(req.body.costo_flete_real,'costo real del transporte',true) / 100;
    const canales = q.transportista === 'Castores' ? ['castores','envia'] : ['directo'];
    const canal = req.body.canal_guia || canales[0];
    if (!canales.includes(canal) || (canal === 'envia' && !envia.entorno())) fail(400,'Canal de emisión de guía no disponible');
    const emision = canal === 'envia' && envia.entorno() === 'sandbox' ? 'sandbox' : canal;
    if (q.costo_flete_real != null && Number(q.costo_flete_real) !== costo) fail(409,'El costo real ya fue registrado. Revisa el importe en el informe del piloto.');
    try {
      await conn.execute('UPDATE cotizacion_castores SET guia=?,costo_flete_real=?,canal_guia=? WHERE id=?',[guia,costo,emision,q.id]);
    } catch (err) { if (err.code === 'ER_DUP_ENTRY') fail(409,'La guía ya se asignó a otro folio'); throw err; }
    const [shipment] = await conn.execute(`UPDATE envio SET transportista=?,guia=?,estado='en_transito',
      fecha_envio=NOW() WHERE pedido_id=?`,[q.transportista,guia,order.id]);
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
  if (q.transportista !== 'Castores') fail(409,'Consulta esta guía en el portal de ' + q.transportista);
  if (!envia.entorno()) fail(503,'Consulta el portal oficial de Castores con la guía registrada');
  const canal = envia.entorno() === 'sandbox' ? 'sandbox' : 'envia';
  if (q.canal_guia !== canal) fail(409,'Esta guía se consulta en el portal de Castores');
  res.json(await envia.rastrear(q.guia));
};

const crypto = require('node:crypto');
const { cents, publicPriceCents } = require('../utils/money');
const { isPositiveInteger } = require('../utils/validators');
const { fail } = require('./order-state.service');

function normalizarItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) fail(400, 'Indica entre 1 y 100 productos');
  const cantidades = new Map();
  for (const item of items) {
    if (!item || !isPositiveInteger(item.producto_id) || !isPositiveInteger(item.cantidad) ||
        Number(item.producto_id) < 1 || Number(item.cantidad) < 1) fail(400, 'Producto o cantidad inválidos');
    const id = Number(item.producto_id);
    const cantidad = (cantidades.get(id) || 0) + Number(item.cantidad);
    if (!isPositiveInteger(cantidad)) fail(400, 'Cantidad fuera de rango');
    cantidades.set(id, cantidad);
  }
  return [...cantidades].sort((a,b) => a[0] - b[0]).map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
}

function importe(valor, nombre, permiteCero = false) {
  if (!['string','number'].includes(typeof valor) || !/^\d{1,10}(?:\.\d{1,2})?$/.test(String(valor)) ||
      (!permiteCero && Number(valor) === 0)) fail(400, 'Revisa el importe de ' + nombre + ' en MXN');
  return cents(valor);
}

function texto(valor, max, campo) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) fail(400, 'Revisa el campo ' + campo);
  return valor.trim();
}

function firmaSolicitud(comprador, direccionId, direccion, proveedor, carga, metodo) {
  const lineas = carga.map(p => [p.id,p.nombre,p.presentacion,p.cantidad,p.precio_base]);
  return crypto.createHash('sha256').update(JSON.stringify([comprador, Number(direccionId),
    direccion.linea1, direccion.ciudad, direccion.estado, direccion.cp, direccion.pais.trim().toLowerCase(),
    proveedor, lineas, metodo])).digest('hex');
}

function contexto(comprador, direccionId, direccion, items, productos, metodo, { domicilio = false } = {}) {
  const pais = direccion.pais.trim().toLowerCase();
  if (!['mx','méxico','mexico'].includes(pais)) fail(409, 'El envío a domicilio está disponible en rutas nacionales de México');
  if (items.length !== productos.length || productos.some(p => !p.activo)) fail(409, 'Actualiza los productos del carrito');
  const proveedor = productos[0].proveedor_id;
  if (productos.some(p => p.proveedor_id !== proveedor)) fail(409, 'El envío a domicilio sale de un solo proveedor. Separa los productos por vendedor');
  const perecedero = productos.some(p => p.tipo !== 'no_perecedero');
  if (!domicilio && perecedero) fail(409, 'Esta modalidad admite productos secos que se transportan sin refrigeración');
  let base = 0, comision = 0;
  const carga = productos.map((p, n) => {
    if (p.id !== items[n].producto_id) fail(409, 'Los productos cambiaron');
    const cantidad = items[n].cantidad;
    const neto = cents(p.precio);
    base += neto * cantidad;
    comision += (publicPriceCents(p.precio) - neto) * cantidad;
    return { id:p.id, nombre:p.nombre, presentacion:p.presentacion, cantidad, precio_base:p.precio };
  });
  if (!Number.isSafeInteger(base) || base + comision > 999999999999) fail(400, 'Importe del pedido fuera de rango');
  const firma = firmaSolicitud(comprador,direccionId,direccion,proveedor,carga,metodo);
  return { firma, proveedor, carga, comision, base, perecedero };
}

const columnas = `c.*, DATE_FORMAT(c.vigencia,'%Y-%m-%d') AS valida_hasta,
  (c.vigencia >= CURRENT_DATE) AS vigente, pr.usuario_id AS vendedor_id`;
async function leerCotizacion(conn, id, bloquear = false) {
  const [rows] = await conn.query(`SELECT ${columnas} FROM cotizacion_castores c
    JOIN proveedor pr ON pr.id=c.proveedor_id WHERE c.id=? ${bloquear ? 'FOR UPDATE OF c' : ''}`, [id]);
  if (!rows.length) fail(404, 'Cotización no encontrada');
  return rows[0];
}
function esGestor(q, user) {
  return user.rol === 'admin' || (user.rol === 'vendedor' && q.vendedor_id === user.id);
}

function vistaPublica(q) {
  return { id:q.id, revision:q.revision, flete:q.flete, servicio:q.servicio, fuente:q.fuente,
    valida_hasta:q.valida_hasta, vigente:Boolean(q.vigente), motivo_rechazo:q.motivo_rechazo, pedido_id:q.pedido_id };
}

async function validarCompra(conn, args) {
  const { id, revision, comprador, direccionId, direccion, items, productos, metodo } = args;
  if (metodo === 'contra_entrega') fail(409, 'El envío con Castores requiere pago previo de mercancía y flete');
  const q = await leerCotizacion(conn, id, true);
  if (q.comprador_id !== comprador) fail(403, 'La cotización pertenece a otra cuenta');
  const actual = contexto(comprador, direccionId, direccion, items, productos,metodo);
  if (!q.vigente || !q.flete || q.motivo_rechazo || q.pedido_id || q.solicitud !== actual.firma ||
      q.revision !== revision || (q.fuente === 'sandbox' && process.env.NODE_ENV === 'production')) {
    fail(409, 'Actualiza la cotización de Castores antes de confirmar');
  }
  return cents(q.flete);
}

module.exports = { normalizarItems, importe, texto, contexto, firmaSolicitud, leerCotizacion, esGestor, vistaPublica, validarCompra };

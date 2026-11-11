// Adaptador de sólo consulta. Comprar la guía corresponde al operador que despacha.
const { fail } = require('./order-state.service');
const { importe } = require('./castores.service');

function entorno() {
  const modo = process.env.ENVIA_ENTORNO || 'sandbox';
  if (!['sandbox', 'produccion'].includes(modo) || !process.env.ENVIA_API_TOKEN) return null;
  if (modo === 'produccion' && process.env.NODE_ENV === 'test') return null;
  if (modo === 'sandbox' && process.env.NODE_ENV === 'production') return null;
  return modo;
}

function origenDe(proveedor) {
  try {
    const mapa = JSON.parse(process.env.ENVIA_ORIGENES_MX || '{}');
    const dir = mapa[String(proveedor)];
    if (!dir || !['name','phone','street','city','state','postalCode'].every(k => typeof dir[k] === 'string' && dir[k].trim()) ||
        !/^\d{5}$/.test(dir.postalCode) || !/^[A-Z]{2}$/.test(dir.state)) return null;
    return { name:dir.name, phone:dir.phone, street:dir.street, city:dir.city, state:dir.state, postalCode:dir.postalCode, country:'MX' };
  } catch { return null; }
}

async function consultar(path, tipo, payload) {
  const modo = entorno();
  if (!modo) fail(503, 'La conexión a Envia.com está desactivada. Puedes usar el portal de Castores.');
  const host = modo === 'produccion' ? 'https://api.envia.com' : 'https://api-test.envia.com';
  let response, body;
  try {
    response = await fetch(host + path, {
      method:'POST', signal:AbortSignal.timeout(9000), redirect:'error',
      headers:{ Authorization:'Bearer ' + process.env.ENVIA_API_TOKEN, 'Content-Type':'application/json' },
      body:JSON.stringify(payload),
    });
    body = await response.json();
  } catch { fail(502, 'Envia.com no respondió. Intenta nuevamente o consulta el portal de Castores.'); }
  if (!response.ok || body?.meta !== tipo || !Array.isArray(body.data)) {
    fail(502, 'Envia.com no pudo completar la consulta. Revisa la cuenta, la cobertura y los datos del envío.');
  }
  return body.data;
}

async function cotizar(q, destino, embalaje) {
  const origin = origenDe(q.proveedor_id);
  if (!origin) fail(409, 'Falta configurar la dirección de origen de este proveedor en Envia.com');
  if (!destino.phone || !destino.street) fail(409, 'El comprador necesita teléfono y dirección para cotizar por API. También puedes capturar una cotización de mostrador.');
  if (!/^[A-Z]{2}$/.test(destino.state || '')) fail(400, 'Indica el código de estado de dos letras del catálogo de Envia.com');
  const medidas = ['peso','largo','ancho','alto'].map(k => Number(embalaje[k]));
  if (medidas.some(n => !Number.isFinite(n) || n <= 0 || n > 10000)) fail(400, 'Revisa los kg y las dimensiones en cm del bulto embalado');
  const [weight,length,width,height] = medidas;
  const tipo = embalaje.tipo_bulto;
  if (!['box','pallet'].includes(tipo)) fail(400, 'Selecciona el embalaje real de la carga consolidada');
  const datos = await consultar('/ship/rate/', 'rate', { origin, destination:destino,
    packages:[{ type:tipo, content:q.productos.map(i => i.nombre).join(', ').slice(0,100), amount:1,
      declaredValue:Number(q.valor_mercancia), weight, weightUnit:'KG', lengthUnit:'CM', dimensions:{ length,width,height } }],
    shipment:{ type:2, carrier:'castores' }, settings:{ currency:'MXN' } });
  const opciones = datos.filter(r => r?.carrier === 'castores' && r.currency === 'MXN' && typeof r.service === 'string' &&
    /^\d{1,10}(?:\.\d{1,2})?$/.test(String(r.totalPrice)) && Number(r.totalPrice) > 0);
  if (!opciones.length) fail(422, 'Castores no devolvió un servicio cotizable en MXN para este bulto y esta ruta');
  const mejor = opciones.sort((a,b) => Number(a.totalPrice) - Number(b.totalPrice))[0];
  return { flete:importe(mejor.totalPrice, 'flete') / 100, cp_origen:origin.postalCode,
    referencia:('Envia.com / ' + mejor.service).slice(0,100),
    embalaje:{ tipo, peso:weight, largo:length, ancho:width, alto:height },
    servicio:[mejor.serviceDescription || mejor.service, mejor.deliveryEstimate].filter(v => typeof v === 'string' && v).join(' · ').slice(0,100),
    fuente:entorno() === 'sandbox' ? 'sandbox' : 'envia' };
}

async function rastrear(guia) {
  const rows = await consultar('/ship/generaltrack/', 'track', { trackingNumbers:[guia] });
  const envio = rows.find(r => String(r?.trackingNumber) === guia && String(r.carrier).toLowerCase() === 'castores');
  if (!envio || typeof envio.status !== 'string') fail(404, 'Aún no hay movimientos para esta guía en la cuenta de Envia.com. Consulta también a Castores.');
  const eventos = Array.isArray(envio.events) ? envio.events : [];
  return { estado:envio.status, sandbox:entorno() === 'sandbox', eventos:eventos.slice(0,40).map(e => ({
    fecha:typeof e.timestamp === 'string' ? e.timestamp : null, lugar:typeof e.location === 'string' ? e.location : '',
    descripcion:typeof e.description === 'string' ? e.description : '',
  })) };
}

module.exports = { entorno, origenDe, cotizar, rastrear };

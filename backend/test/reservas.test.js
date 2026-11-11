const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createHmac } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { seed, testEnvironment } = require('./helpers');
testEnvironment();
const app = require('../src/app');
const pool = require('../src/config/db');
const stripe = require('../src/services/stripe.service');
const paypal = require('../src/services/paypal.service');
const mp = require('../src/services/mercadopago.service');
const { expireOrder, expireDueOrders } = require('../src/services/reservas.service');
let server, url, csrf;

before(async () => {
  await seed();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = 'http://127.0.0.1:' + server.address().port + '/api';
  csrf = (await (await fetch(url + '/csrf-token')).json()).csrfToken;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});
async function request(path, method, body, user = 1) {
  const res = await fetch(url + path, { method, headers: {
    Authorization: 'Bearer ' + jwt.sign({ id: user }, process.env.JWT_SECRET),
    'Content-Type': 'application/json', 'X-CSRF-Token': csrf,
  }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}
async function checkout(metodo_pago) {
  await pool.query('UPDATE inventario SET stock=4 WHERE producto_id=4');
  const res = await request('/pedidos', 'POST', {
    direccion_id: 1, metodo_pago, clave_checkout: randomUUID(), items: [{ producto_id: 4, cantidad: 1 }],
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(await stock(), 3);
  return res.data;
}
async function stock() {
  return (await pool.query('SELECT stock FROM inventario WHERE producto_id=4'))[0][0].stock;
}
async function expire(id) {
  await pool.query('UPDATE pedido SET reserva_vence_en=NOW()-INTERVAL 1 MINUTE WHERE id=?', [id]);
}
async function status(id) {
  return (await pool.query('SELECT p.estado, g.estado AS pago, stock_reservado AS reservado FROM pedido p JOIN pago g ON g.pedido_id=p.id WHERE p.id=?',[id]))[0][0];
}
const cancelled = { estado: 'cancelado', pago: 'rechazado', reservado: 0 };

// Prepara una pasarela aislada que ha informado el cierre y más tarde
// entrega una notificación firmada de cobro completo sobre la misma referencia.
async function lateWebhook(t, method, pedido, pago) {
  const reference = 'late_' + pedido.id;
  const post = (endpoint, headers, body) => fetch(url + endpoint, {
    method: 'POST', headers: {'Content-Type':'application/json', ...headers}, body: JSON.stringify(body),
  });
  if (method === 'tarjeta') {
    await pool.execute('UPDATE pago SET referencia=? WHERE id=?', [reference, pago.id]);
    const identity = { id: reference, metadata: { pedido_id: String(pedido.id) } };
    t.mock.method(stripe, 'retrievePaymentIntent', async () => ({ ...identity, status: 'canceled' }));
    const object = { ...identity, status: 'succeeded', amount_received: 41412, currency: 'mxn' };
    const body = { type: 'payment_intent.succeeded', data: { object } };
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + JSON.stringify(body)).digest('hex');
    return () => post('/pagos/stripe/webhook', {'stripe-signature': 't=' + ts + ',v1=' + sig}, body);
  }
  await pool.execute('UPDATE pago SET referencia=? WHERE id=?', ['mp_' + reference, pago.id]);
  const external = String(pedido.id);
  t.mock.method(mp, 'expirePreference', async () => ({ id: reference, external_reference: external,
    expires: true, expiration_date_to: new Date(Date.now() - 600000).toISOString() }));
  t.mock.method(mp, 'findMerchantOrders', async () => []);
  const remoteId = String(10000 + pedido.id);
  t.mock.method(mp, 'getPayment', async () => ({id:remoteId, status:'approved', external_reference:external,
    transaction_amount:'414.12', currency_id:'MXN', order:{id:pedido.id}}));
  t.mock.method(mp, 'getMerchantOrder', async () => ({external_reference:external, preference_id:reference}));
  const ts = String(Date.now());
  const manifest = 'id:' + remoteId + ';request-id:qa-late;ts:' + ts + ';';
  const sig = createHmac('sha256',process.env.MERCADOPAGO_WEBHOOK_SECRET).update(manifest).digest('hex');
  return () => post('/pagos/mercadopago/webhook?data.id=' + remoteId,
    {'x-request-id':'qa-late', 'x-signature':'ts=' + ts + ',v1=' + sig}, {type:'payment',data:{id:remoteId}});
}

for (const method of ['tarjeta', 'mercadopago']) {
  test(method + ' registra un cobro tardío por devolver sin reactivar el folio ni la comisión', async t => {
    const { pedido, pago } = await checkout(method);
    const notify = await lateWebhook(t, method, pedido, pago);
    await expire(pedido.id);
    await expireOrder(pedido.id);
    assert.deepEqual(await status(pedido.id), cancelled);
    const paymentPath = '/pagos/' + pago.id + '/estado';
    assert.equal((await request(paymentPath, 'PATCH', {estado:'aprobado', referencia:'local'}, 3)).status, 409);
    for (const response of await Promise.all([notify(), notify()])) assert.equal(response.status, 200);
    assert.deepEqual(await status(pedido.id), { estado:'cancelado', pago:'aprobado', reservado:0 });
    const detail = await request('/pedidos/' + pedido.id, 'GET');
    assert.equal(detail.data.envio, null);
    assert.equal(detail.data.pago.estado, 'aprobado');
    assert.equal(await stock(), 4);
    const [[{ fecha }]] = await pool.execute("SELECT DATE_FORMAT(fecha,'%Y-%m-%d') AS fecha FROM pedido WHERE id=?", [pedido.id]);
    const report = await request('/piloto?desde=' + fecha + '&hasta=' + fecha, 'GET', undefined, 3);
    assert.equal(report.data.pedidos.find(row => row.id === pedido.id).comision_obtenida, '0.00');
    const refundBody = { estado:'reembolsado', referencia_reembolso:'DEV-' + pedido.id };
    for (let i = 0; i < 2; i++) assert.equal((await request(paymentPath, 'PATCH', refundBody, 3)).status, 200);
    assert.equal((await notify()).status, 200);
    assert.deepEqual(await status(pedido.id), { estado:'cancelado', pago:'reembolsado', reservado:0 });
    assert.equal(await stock(), 4);
  });
}

test('transferencia sin cobro vence, rechaza despacho y dos barridos restituyen una sola unidad', async () => {
  const { pedido, envio } = await checkout('transferencia');
  assert.equal((await request('/envios/' + envio.id, 'PATCH', { estado: 'entregado' }, 3)).status, 409);
  await expire(pedido.id);
  await Promise.all([expireDueOrders(), expireDueOrders()]);
  assert.deepEqual(await status(pedido.id), cancelled);
  assert.equal(await stock(), 4);
});

test('011 da plazo a la transferencia histórica en preparación y respeta el despacho registrado', async () => {
  const { readFileSync } = require('node:fs');
  const path = require('node:path');
  const { pedido: pendiente } = await checkout('transferencia');
  const { pedido: despachado, envio } = await checkout('transferencia');
  await pool.query("UPDATE pedido SET estado='en_proceso', reserva_vence_en=NULL WHERE id IN (?,?)", [pendiente.id, despachado.id]);
  await pool.query("UPDATE envio SET estado='en_transito' WHERE id=?", [envio.id]);
  const migration = readFileSync(path.join(__dirname, '../migrations/011_economia_reservas_piloto.sql'), 'utf8');
  const [drop, definition, finish] = migration.split(/^DELIMITER .+$/m);
  await pool.query(drop);
  await pool.query(definition.trim().replace(/\$\$$/, ''));
  for (const statement of finish.split(';').filter(part => part.trim())) await pool.query(statement);
  const [rows] = await pool.query('SELECT reserva_vence_en FROM pedido WHERE id IN (?,?) ORDER BY id', [pendiente.id, despachado.id]);
  assert.ok(rows[0].reserva_vence_en);
  assert.equal(rows[1].reserva_vence_en, null);
  await expire(pendiente.id);
  await expire(despachado.id); // una fecha heredada tampoco permite reponer mercancía en tránsito
  await expireDueOrders();
  assert.deepEqual(await status(pendiente.id), cancelled);
  await expireOrder(despachado.id);
  assert.deepEqual(await status(despachado.id), { estado: 'en_proceso', pago: 'pendiente', reservado: 1 });
  assert.equal(await stock(), 4);
});

test('contra entrega conserva la reserva, exige entrega y comprobante, el reembolso no repone mercancía entregada', async () => {
  const { pedido, pago, envio } = await checkout('contra_entrega');
  const [rows] = await pool.query('SELECT reserva_vence_en FROM pedido WHERE id=?', [pedido.id]);
  assert.equal(rows[0].reserva_vence_en, null);
  const path = '/pagos/' + pago.id + '/estado';
  const collect = { estado:'aprobado', referencia:'recibo-demostracion' };
  assert.equal((await request(path,'PATCH',collect,3)).status,409);
  assert.equal((await request('/envios/' + envio.id,'PATCH',{estado:'entregado'},3)).status,200);
  assert.equal((await request(path,'PATCH',{estado:'aprobado'},3)).status,400);
  for (let i=0;i<2;i++) assert.equal((await request(path,'PATCH',collect,3)).status,200);
  const refund = { estado:'reembolsado', referencia_reembolso:'devolucion-demostracion' };
  for (let i=0;i<2;i++) assert.equal((await request(path,'PATCH',refund,3)).status,200);
  assert.deepEqual(await status(pedido.id),{estado:'entregado',pago:'reembolsado',reservado:1});
  assert.equal(await stock(),3);
});

test('reembolso antes de envío libera una sola vez y no permite reabrir el cobro', async () => {
  const { pedido, pago } = await checkout('transferencia');
  const path = '/pagos/' + pago.id + '/estado';
  const collect = { estado:'aprobado', referencia:'deposito-de-prueba' };
  const refund = { estado:'reembolsado', referencia_reembolso:'reembolso-de-prueba' };
  assert.equal((await request(path,'PATCH',collect,3)).status,200);
  const pair = await Promise.all([request(path,'PATCH',refund,3), request(path,'PATCH',refund,3)]);
  assert.deepEqual(pair.map(r=>r.status), [200,200]);
  assert.deepEqual(await status(pedido.id),{estado:'cancelado',pago:'reembolsado',reservado:0});
  assert.equal((await request(path,'PATCH',collect,3)).status,409);
  assert.equal(await stock(),4);
});

for (const ruta of ['pedidos', 'envios']) {
  test('un reembolso en tránsito conserva el cobro revertido y permite confirmar la entrega desde ' + ruta, async () => {
    const { pedido, pago, envio } = await checkout('transferencia');
    const paymentPath = '/pagos/' + pago.id + '/estado';
    const orderPath = '/pedidos/' + pedido.id + '/estado';
    assert.equal((await request(paymentPath, 'PATCH', { estado: 'aprobado', referencia: 'COBRO-TEST' }, 3)).status, 200);
    assert.equal((await request(orderPath, 'PATCH', { estado: 'enviado' }, 4)).status, 200);
    const refund = { estado: 'reembolsado', referencia_reembolso: 'DEV-TEST' };
    assert.equal((await request(paymentPath, 'PATCH', refund, 3)).status, 200);
    const endpoint = ruta === 'envios' ? '/envios/' + envio.id : orderPath;
    const user = ruta === 'envios' ? 3 : 4;
    for (let i = 0; i < 2; i++) {
      assert.equal((await request(endpoint, 'PATCH', { estado: 'entregado' }, user)).status, 200);
    }
    assert.deepEqual(await status(pedido.id), { estado: 'entregado', pago: 'reembolsado', reservado: 1 });
    assert.equal(await stock(), 3);
  });
}

test('Stripe concilia un intento vencido y conserva el stock cuando falla la consulta', async t => {
  const { pedido, pago } = await checkout('tarjeta');
  await pool.query("UPDATE pago SET referencia='pi_prueba' WHERE id=?",[pago.id]);
  await expire(pedido.id);
  const intent = { id:'pi_prueba', metadata:{pedido_id:String(pedido.id)}, status:'requires_payment_method' };
  const lookup = t.mock.method(stripe,'retrievePaymentIntent', async () => { throw Error('pasarela desconectada'); });
  const cancel = t.mock.method(stripe,'cancelPaymentIntent',async () => ({...intent,status:'canceled'}));
  await assert.rejects(expireOrder(pedido.id),/desconectada/);
  assert.equal(await stock(),3);
  lookup.mock.mockImplementation(async () => intent);
  await Promise.all([expireOrder(pedido.id),expireOrder(pedido.id)]);
  assert.equal(cancel.mock.callCount(),1);
  assert.deepEqual(await status(pedido.id),cancelled);
  assert.equal(await stock(),4);
});

test('PayPal protege una captura con respuesta perdida y acepta su confirmación posterior sin repetir descuento', async t => {
  const { pedido, pago } = await checkout('paypal');
  await pool.query("UPDATE pago SET referencia='paypal_PP1' WHERE id=?",[pago.id]);
  t.mock.method(paypal,'captureOrder',async () => { throw Error('respuesta perdida'); });
  assert.equal((await request('/pagos/paypal/capture','POST',{pedido_id:pedido.id,paypal_order_id:'PP1'})).status,500);
  await expire(pedido.id);
  const unit = { reference_id:'pedido_'+pedido.id };
  const remote = { id:'PP1',status:'APPROVED',purchase_units:[unit] };
  t.mock.method(paypal,'getOrder',async () => remote);
  await assert.rejects(expireOrder(pedido.id), {status:409});
  assert.equal(await stock(),3);
  remote.status='COMPLETED';
  unit.payments={ captures:[{status:'COMPLETED',amount:{value:'414.12',currency_code:'MXN'}}] };
  await Promise.all([expireOrder(pedido.id),expireOrder(pedido.id)]);
  assert.deepEqual(await status(pedido.id), {estado:'en_proceso',pago:'aprobado',reservado:1});
  assert.equal(await stock(),3);
});

test('Mercado Pago espera todos los intentos de una preferencia cerrada y confirma el aprobado', async t => {
  const { pedido, pago } = await checkout('mercadopago');
  await pool.query("UPDATE pago SET referencia='mp_MP1' WHERE id=?",[pago.id]);
  await expire(pedido.id);
  t.mock.method(mp,'expirePreference',async () => ({ id:'MP1',external_reference:String(pedido.id),expires:true,
    expiration_date_to:new Date(Date.now()-600000).toISOString() }));
  const pending = {status:'in_process',transaction_amount:'414.12',currency_id:'MXN'};
  t.mock.method(mp,'findMerchantOrders',async () => [{preference_id:'MP1',external_reference:String(pedido.id),
    payments:[{status:'rejected'}, pending]}]);
  await assert.rejects(expireOrder(pedido.id),{status:409});
  assert.equal(await stock(),3);
  pending.status='approved';
  await expireOrder(pedido.id);
  assert.deepEqual(await status(pedido.id),{estado:'en_proceso',pago:'aprobado',reservado:1});
  assert.equal(await stock(),3);
});

test('Mercado Pago libera una sola vez tras el cierre, la gracia y el rechazo de todos los intentos', async t => {
  const { pedido, pago } = await checkout('mercadopago');
  await pool.query("UPDATE pago SET referencia='mp_MP2' WHERE id=?", [pago.id]);
  await expire(pedido.id);
  let antiguedadMs = 10000;
  t.mock.method(mp, 'expirePreference', async () => ({
    id: 'MP2', external_reference: String(pedido.id), expires: true,
    expiration_date_to: new Date(Date.now() - antiguedadMs).toISOString(),
  }));
  t.mock.method(mp, 'findMerchantOrders', async () => [{
    preference_id: 'MP2', external_reference: String(pedido.id), payments: [{ status: 'rejected' }],
  }]);
  await assert.rejects(expireOrder(pedido.id), { status: 409 });
  assert.equal(await stock(), 3);
  antiguedadMs = 600000;
  await Promise.all([expireOrder(pedido.id), expireOrder(pedido.id)]);
  assert.deepEqual(await status(pedido.id), cancelled);
  assert.equal(await stock(), 4);
});

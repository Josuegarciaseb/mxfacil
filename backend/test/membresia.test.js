const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { testEnvironment, seed } = require('./helpers');
testEnvironment();
const pool = require('../src/config/db');
const app = require('../src/app');
const stripe = require('../src/services/stripe.service');
const service = require('../src/services/membresia.service');
const jwt = require('jsonwebtoken');
let server, url, csrf, purchase, intent;
const intents = new Map();
let created = 0;
before(async () => {
  await seed();
  stripe.createMembershipIntent = async row => {
    created++;
    const value = { id: 'pi_' + row.id, client_secret: 'test-secret', status: 'requires_payment_method',
      currency: 'mxn', amount_received: 0, livemode: false,
      metadata: { membresia_compra_id: row.id, proveedor_id: String(row.proveedor_id) } };
    intents.set(value.id, value); return value;
  };
  stripe.retrievePaymentIntent = async id => intents.get(id);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api`;
  csrf = (await (await fetch(url + '/csrf-token')).json()).csrfToken;
});
async function request(path, id = 4, method = 'GET', body) {
  const response = await fetch(url + path, { method, headers: {
    'Content-Type': 'application/json', 'X-CSRF-Token': csrf,
    ...(id ? { Authorization: 'Bearer ' + jwt.sign({id}, process.env.JWT_SECRET) } : {}),
  }, ...(body ? {body: JSON.stringify(body)} : {}) });
  return { status: response.status, data: await response.json() };
}
test('Pro: autorización, pago verificado, idempotencia, métricas, vencimiento y renovación', async () => {
  assert.equal((await request('/membresia/me', null)).status, 401);
  assert.equal((await request('/membresia/me', 1)).status, 403);
  await pool.query("UPDATE proveedor SET verificado='pendiente' WHERE id=2");
  assert.equal((await request('/membresia/intent', 5, 'POST')).status, 403);
  assert.equal((await request('/membresia/me')).data.activo, false);
  const [a, b] = await Promise.all([request('/membresia/intent', 4, 'POST'), request('/membresia/intent', 4, 'POST')]);
  assert.equal(a.status, 200); assert.equal(a.data.compra_id, b.data.compra_id); assert.equal(created, 1);
  assert.equal((await request('/membresia/confirm', 4, 'POST')).data.activo, false);
  [[purchase]] = await pool.query('SELECT * FROM membresia_compra WHERE id=?', [a.data.compra_id]);
  intent = intents.get(purchase.referencia);
  intent.status = 'succeeded'; intent.amount_received = purchase.monto_centavos;
  for (const alteration of [{amount_received:1},{currency:'usd'},{livemode:true},{id:'pi_wrong'},
    {metadata:{...intent.metadata,proveedor_id:'2'}}]) {
    await assert.rejects(service.approve({...intent,...alteration}), error => error.status === 409);
  }
  assert.equal((await request('/membresia/confirm', 5, 'POST')).data.activo, false);
  const result = await request('/membresia/confirm', 4, 'POST');
  assert.equal(result.data.activo, true);
  assert.ok(Math.abs(new Date(result.data.vence_en) - Date.now() - 30*86400000) < 10000);
  await Promise.all([service.approve(intent), service.approve(intent)]);
  assert.equal((await request('/membresia/me')).data.vence_en, result.data.vence_en);
  assert.equal((await request('/membresia/intent', 4, 'POST')).status, 409);
  const catalog = (await request('/productos')).data;
  assert.equal(catalog.find(p => p.proveedor_id === 1).proveedor_pro, 1);
  const product = catalog.find(p => p.proveedor_id === 1 && p.stock > 0);
  const event = { producto_id: product.id, sesion: randomUUID(), tipo: 'impresion' };
  for (let i=0;i<2;i++) assert.equal((await request('/membresia/eventos', null, 'POST', event)).status, 200);
  assert.equal(Number((await request('/membresia/me')).data.metricas.impresiones), 1);
  await pool.query("UPDATE proveedor SET verificado='rechazado' WHERE id=1");
  assert.equal((await request('/membresia/me')).data.activo, false);
  assert.equal((await request('/productos')).data.find(p => p.id === product.id).proveedor_pro, 0);
  await pool.query("UPDATE proveedor SET verificado='aprobado' WHERE id=1");
  await pool.query('UPDATE membresia SET vence_en=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE proveedor_id=1');
  assert.equal((await request('/membresia/me')).data.activo, false);
  assert.equal((await request('/productos')).data.find(p => p.id === product.id).proveedor_pro, 0);
  const renewal = await request('/membresia/intent', 4, 'POST');
  assert.equal(renewal.status, 200); assert.notEqual(renewal.data.compra_id, purchase.id);
  const renewIntent = [...intents.values()].find(i=>i.metadata.membresia_compra_id===renewal.data.compra_id);
  renewIntent.status='succeeded'; renewIntent.amount_received=purchase.monto_centavos;
  assert.equal((await request('/membresia/confirm',4,'POST')).data.activo,true);
});
test('webhook rechaza firmas inválidas sin activar compras', async () => {
  const response = await fetch(url + '/pagos/stripe/webhook', {method:'POST',headers:{'Content-Type':'application/json','stripe-signature':'invalid'},body:'{}'});
  assert.equal(response.status,400);
});
test('webhook firmado de membresía reintenta sin extender la vigencia', async () => {
  const previous = (await request('/membresia/me')).data.vence_en;
  const payload = JSON.stringify({id:'evt_membership_test',type:'payment_intent.succeeded',data:{object:intent}});
  const Stripe = require('stripe');
  const signature = Stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
  const response = await fetch(url + '/pagos/stripe/webhook', {method:'POST',headers:{'Content-Type':'application/json','stripe-signature':signature},body:payload});
  assert.equal(response.status,200);
  assert.equal((await request('/membresia/me')).data.vence_en,previous);
});
after(async () => {
  if(server) await new Promise(resolve=>server.close(resolve));
  await pool.end();
  const conn=await require('mysql2/promise').createConnection({host:'127.0.0.1',port:3318,user:'root'});
  await conn.query(`DROP DATABASE \`${process.env.DB_NAME}\``); await conn.end();
});

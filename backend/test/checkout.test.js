const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const { testEnvironment, seed } = require('./helpers');
testEnvironment();
const pool = require('../src/config/db');
const app = require('../src/app');
const stripe = require('../src/services/stripe.service');
const paypal = require('../src/services/paypal.service');
const mp = require('../src/services/mercadopago.service');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { authenticator } = require('otplib');

let server, url, csrf;
const intents = new Map(), paypalOrders = new Map(), mpRecords = new Map();
let lastPreference, captures = 0;
before(async () => {
  await seed();
  // Stub every outgoing payment operation, including reads; never use a real gateway.
  stripe.createPaymentIntent = async (amount,id) => {
    const intent = {id:`pi_${id}`,metadata:{pedido_id:String(id)},currency:'mxn',amount_received:Math.round(amount*100),status:'succeeded',client_secret:'test-only'};
    intents.set(intent.id,intent); return intent;
  };
  stripe.retrievePaymentIntent = async id => intents.get(id);
  paypal.createOrder = async (amount,id) => {
    const order = {id:`PP${id}`,status:'COMPLETED',purchase_units:[{reference_id:`pedido_${id}`,payments:{captures:[{status:'COMPLETED',amount:{value:amount,currency_code:'MXN'}}]}}]};
    paypalOrders.set(order.id,order); return order;
  };
  paypal.captureOrder = async id => { captures++; return paypalOrders.get(id); };
  mp.createPreference = async data => { lastPreference = data; return {id:`pref_${data.pedidoId}`}; };
  mp.getPreference = async id => ({id});
  mp.getMerchantOrder = async id => ({preference_id:'pref_'+id, external_reference:String(id)});
  mp.getPayment = async id => mpRecords.get(String(id));
  server = app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
  url=`http://127.0.0.1:${server.address().port}/api`;
  csrf = (await (await fetch(url+'/csrf-token')).json()).csrfToken;
});
after(async () => { if (server) await new Promise(r=>server.close(r)); await pool.end(); });

async function request(path, body, {user=1,method=body?'POST':'GET',headers={}}={}) {
  const response=await fetch(url+path,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,
    ...(user?{Authorization:`Bearer ${jwt.sign({id:user},process.env.JWT_SECRET)}`} : {}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  return { status:response.status, data:await response.json() };
}
function checkout(method='contra_entrega', extra={}) {
  return request('/pedidos',{direccion_id:1,items:[{producto_id:1,cantidad:1}],metodo_pago:method,clave_checkout:randomUUID(),...extra});
}
const readStock=async()=> (await pool.query('SELECT stock FROM inventario WHERE producto_id=1'))[0][0].stock;
const stock=qty=>pool.query('UPDATE inventario SET stock=? WHERE producto_id=1',[qty]);

test('surtido agrícola: filtros, pedidos históricos y exclusión de categorías retiradas', async () => {
  const publicRequest = path => request(path, null, {user:null});
  const categories = (await publicRequest('/categorias')).data;
  assert.deepEqual(categories.map(c => c.nombre), ['Frutas y verduras','Granos y legumbres','Semillas']);
  assert.deepEqual((await publicRequest('/categorias?tipo=perecedero')).data.map(c => c.nombre), ['Frutas y verduras']);
  const seeds = categories.find(c => c.nombre === 'Semillas');
  const seedProducts = (await publicRequest('/productos?categoria_id=' + seeds.id)).data;
  assert.ok(seedProducts.some(p => p.nombre === 'Semilla de calabaza de prueba'));
  assert.ok(seedProducts.every(p => p.categoria_id === seeds.id));

  // Un producto que se vendió antes de retirar su categoría.
  const [old] = await pool.query("INSERT INTO categoria (nombre) VALUES ('Bebidas')");
  const body = {nombre:'Artículo histórico', precio:20, stock_inicial:3, categoria_id:old.insertId};
  const vendor = {user:4};
  const created = await request('/productos', body, vendor);
  assert.equal(created.status, 201);
  const id = created.data.id;
  const items = [{producto_id:id,cantidad:1}];
  const sale = await checkout('contra_entrega', {items});
  assert.equal(sale.status, 201);
  await pool.query('UPDATE categoria SET en_catalogo=0 WHERE id=?', [old.insertId]);

  assert.ok(!(await publicRequest('/categorias')).data.some(c => c.id === old.insertId));
  assert.deepEqual((await publicRequest('/productos?categoria_id=' + old.insertId)).data, []);
  assert.equal((await publicRequest('/productos/' + id)).status, 404);
  assert.equal((await publicRequest('/inventario/' + id)).status, 404);
  assert.equal((await checkout('contra_entrega', {items})).status, 409);
  const historic = await request('/pedidos/' + sale.data.pedido.id);
  assert.equal(historic.data.items[0].producto_id, id);
  assert.equal(historic.data.pedido.total, sale.data.pedido.total);
  const managed = (await request('/productos/gestion', null, vendor)).data.find(p => p.id === id);
  assert.deepEqual([managed.categoria_nombre, managed.categoria_en_catalogo, managed.stock], ['Bebidas', 0, 2]);
  assert.equal((await request('/productos', body, vendor)).status, 400);
  const edit = {user:4, method:'PUT'};
  assert.equal((await request('/productos/' + id, {activo:1}, edit)).status, 400);
  assert.equal((await request('/productos/' + id, {categoria_id:seeds.id}, edit)).status, 200);
  assert.equal((await publicRequest('/productos/' + id)).data.categoria_nombre, 'Semillas');
});

test('Google: estado firmado, origen permitido, código de un uso, correo verificado y segundo factor', async t => {
  const strategy = require('../src/config/passport')._strategy('google');
  let profile = {id:'google_audit', displayName:'Cliente Google', emails:[{value:'google@example.test',verified:true}]};
  t.mock.method(strategy._oauth2, 'getOAuthAccessToken', (code, options, done) => done(null, 'test-access', null, {}));
  t.mock.method(strategy, 'userProfile', (access, done) => done(null, profile));
  const verifier = crypto.randomBytes(32).toString('hex');
  const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
  async function start() {
    const response = await fetch(url + '/auth/google?challenge=' + challenge + '&origin=https://alien.invalid', {redirect:'manual'});
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.hostname,'accounts.google.com');
    const state = destination.searchParams.get('state');
    assert.match(state,/^[a-f0-9]{64}$/);
    return {state,cookie:response.headers.getSetCookie()[0].split(';')[0]};
  }
  async function callback({state,cookie}) {
    const response = await fetch(url + '/auth/google/callback?code=synthetic&state=' + state, {headers:{cookie},redirect:'manual'});
    const location = new URL(response.headers.get('location'));
    assert.equal(location.origin,process.env.FRONTEND_URL);
    return location;
  }
  async function authCode() {
    const result = await callback(await start());
    assert.equal(result.pathname,'/oauth-success');
    return new URLSearchParams(result.hash.slice(1)).get('code');
  }
  const initial = await start();
  assert.equal((await callback({...initial,state:'0'.repeat(64)})).searchParams.get('oauth_error'),'state');
  assert.equal((await callback({...initial,cookie:''})).searchParams.get('oauth_error'),'state');
  const code = await authCode();
  const exchange = (data) => request('/auth/google/exchange',data,{user:null});
  assert.equal((await exchange({code,verifier:'0'.repeat(64)})).status,401);
  const pair = await Promise.all([exchange({code,verifier}),exchange({code,verifier})]);
  assert.deepEqual(pair.map(r=>r.status).sort(),[200,401]);
  const session = pair.find(r=>r.status===200).data;
  assert.equal(session.user.email,profile.emails[0].value);
  assert.equal((await request('/direcciones',null,{user:null,headers:{Authorization:'Bearer '+session.token}})).status,200);
  const secret = authenticator.generateSecret();
  const { encrypt } = require('../src/utils/crypto.utils');
  await pool.query('UPDATE usuario SET mfa_enabled=1,mfa_secret=? WHERE id=?',[encrypt(secret),session.user.id]);
  assert.equal((await request('/auth/mfa/setup',{}, {user:session.user.id})).status,409);
  const mfaCode = await authCode();
  assert.equal((await exchange({code:mfaCode,verifier})).data.mfa_required,true);
  assert.equal((await exchange({code:mfaCode,verifier,totp_code:'0000000'})).status,401);
  assert.equal((await exchange({code:mfaCode,verifier,totp_code:authenticator.generate(secret)})).status,200);
  profile = {...profile,id:'other_google', emails:[{value:'cliente@example.test',verified:true}]};
  assert.equal((await callback(await start())).searchParams.get('oauth_error'),'account');
  profile.emails[0].verified=false;
  assert.equal((await callback(await start())).searchParams.get('oauth_error'),'account');
});

test('catálogo público, inicio de sesión real, CSRF y direcciones privadas', async()=>{
  assert.equal((await request('/productos?q=Manzanas&categoria_id=1')).data.length,1);
  assert.equal((await request('/direcciones',null,{user:null})).status,401);
  assert.equal((await request('/auth/login',{email:'cliente@example.test',password:'errónea'})).status,401);
  assert.equal((await request('/auth/login',{email:' CLIENTE@example.test ',password:'CompraPrueba!2026'})).status,200);
  assert.equal((await request('/pedidos',{}, {headers:{'X-CSRF-Token':''}})).status,403);
  assert.equal((await checkout('contra_entrega',{direccion_id:2})).status,400);
  assert.equal((await request('/direcciones',{linea1:'Calle prueba',ciudad:'Puebla',estado:'Puebla',cp:'12'})).status,400);
  assert.equal((await request('/direcciones',{linea1:'Calle prueba',ciudad:'Puebla',estado:'Puebla',cp:'01234'})).status,201);
});

test('checkout nuevo: precio de base de datos, IVA, pago y envío; el cliente no controla el importe', async()=>{
  await stock(5);
  const {status,data} = await checkout('contra_entrega',{total:0.01,items:[{producto_id:1,cantidad:2,precio_unitario:0.01}]});
  assert.equal(status,201,JSON.stringify(data));
  assert.deepEqual([data.pedido.subtotal,data.pedido.iva,data.pedido.comision,data.pedido.total],['204.00','32.64','4.00','236.64']);
  assert.equal(data.pago.monto,'236.64'); assert.equal(data.pago.estado,'pendiente'); assert.equal(data.envio.estado,'preparando');
  assert.equal(await readStock(),3);
  assert.equal((await request(`/pedidos/${data.pedido.id}`,null,{user:2})).status,403);
  assert.equal((await request(`/envios/pedido/${data.pedido.id}`,null,{user:2})).status,403);
  assert.equal((await request(`/pagos/pedido/${data.pedido.id}`,null,{user:2})).status,403);
});

test('las cantidades inválidas y las líneas duplicadas no venden más stock del disponible',async()=>{
  await stock(5);
  for(const cantidad of [0,-1,1.5,true,{},'']) assert.equal((await checkout('contra_entrega',{items:[{producto_id:1,cantidad}]})).status,400);
  assert.equal((await checkout('contra_entrega',{items:[{producto_id:1,cantidad:4},{producto_id:1,cantidad:4}]})).status,409);
  assert.equal(await readStock(),5);
  for(const cantidad of [-3,2.5,true]) assert.equal((await request('/inventario/1',{stock:cantidad},{method:'PATCH',user:3})).status,400);
  assert.equal((await request('/inventario/1',{stock:1},{method:'PATCH',user:1})).status,403);
});

test('dos envíos simultáneos de una compra crean un único pedido; cambiar la solicitud requiere otra clave',async()=>{
  await stock(1);
  const clave_checkout=randomUUID();
  const pair=await Promise.all([checkout('contra_entrega',{clave_checkout}),checkout('contra_entrega',{clave_checkout})]);
  assert.deepEqual(pair.map(r=>r.status).sort(),[200,201]);
  assert.equal(pair[0].data.pedido.id,pair[1].data.pedido.id); assert.equal(await readStock(),0);
  assert.equal((await checkout('transferencia',{clave_checkout})).status,409);
});

test('reserva concurrente, cancelación repetida y liberación única del stock',async()=>{
  await stock(1);
  const pair=await Promise.all([checkout('tarjeta'),checkout()]);
  assert.deepEqual(pair.map(r=>r.status).sort(),[201,409]);
  const id=pair.find(r=>r.status===201).data.pedido.id;
  assert.equal((await request(`/pedidos/${id}/cancelar`,{},{user:2})).status,403);
  for(let i=0;i<2;i++) assert.equal((await request(`/pedidos/${id}/cancelar`,{})).status,200);
  assert.equal(await readStock(),1);
});

test('un vendedor no cambia pedidos ajenos ni obtiene los artículos de otro proveedor',async()=>{
  await stock(4);
  const own=await checkout();
  assert.equal((await request(`/pedidos/${own.data.pedido.id}/estado`,{estado:'en_proceso'},{method:'PATCH',user:5})).status,403);
  const mixed=await checkout('contra_entrega',{items:[{producto_id:1,cantidad:1},{producto_id:2,cantidad:2}]});
  const detail=await request(`/pedidos/${mixed.data.pedido.id}`,null,{user:4});
  assert.equal(detail.data.items.length,1); assert.equal(detail.data.pago,null); assert.equal(Number(detail.data.pedido.total),118.32);
  assert.equal((await request(`/pedidos/${mixed.data.pedido.id}/estado`,{estado:'en_proceso'},{method:'PATCH',user:4})).status,403);
});

test('PayPal: referencia ajena, pasarela incorrecta e importe insuficiente nunca aprueban; reintento no recaptura',async()=>{
  await stock(3);
  const id=(await checkout('paypal')).data.pedido.id;
  const wrong=await request('/pagos/stripe/intent',{pedido_id:id}); assert.equal(wrong.status,409);
  const {data}=await request('/pagos/paypal/create',{pedido_id:id});
  const remote=data.paypal_order_id;const before=captures;
  assert.equal((await request('/pagos/paypal/capture',{pedido_id:id,paypal_order_id:'OTHER'})).status,409); assert.equal(captures,before);
  const amount=paypalOrders.get(remote).purchase_units[0].payments.captures[0].amount;
  amount.value='0.01'; assert.equal((await request('/pagos/paypal/capture',{pedido_id:id,paypal_order_id:remote})).status,409);
  assert.equal((await request(`/pagos/pedido/${id}`)).data.estado,'pendiente');
  amount.value='118.32';for(let i=0;i<2;i++) assert.equal((await request('/pagos/paypal/capture',{pedido_id:id,paypal_order_id:remote})).status,200);
  assert.equal(captures,before+2);assert.equal(await readStock(),2);
});

test('Stripe: firma, moneda y confirmación concurrente con webhook y navegador',async()=>{
  await stock(2);const id=(await checkout('tarjeta')).data.pedido.id;
  const {data}=await request('/pagos/stripe/intent',{pedido_id:id});const intent=intents.get(data.payment_intent_id);
  const event={id:'evt_test',type:'payment_intent.succeeded',data:{object:intent}};
  const raw=JSON.stringify(event);const t=Math.floor(Date.now()/1000);
  const sig=createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${raw}`).digest('hex');
  assert.equal((await request('/pagos/stripe/webhook',event)).status,400);
  intent.currency='usd';assert.equal((await request('/pagos/stripe/confirm',{pedido_id:id})).status,409);intent.currency='mxn';
  const responses=await Promise.all([request('/pagos/stripe/webhook',event,{headers:{'stripe-signature':`t=${t},v1=${sig}`}}),request('/pagos/stripe/confirm',{pedido_id:id})]);
  assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.equal(await readStock(),1);
  assert.equal((await request(`/pedidos/${id}`)).data.pedido.estado,'en_proceso');
});

test('Mercado Pago: la preferencia incluye IVA; firma, moneda, referencia e importe válidos son obligatorios',async()=>{
  await stock(2);const id=(await checkout('mercadopago')).data.pedido.id;
  assert.equal((await request('/pagos/mercadopago/preference',{pedido_id:id})).status,200);
  assert.equal(lastPreference.items.reduce((s,i)=>s+i.quantity*i.unit_price,0),118.32);
  const msg={type:'payment',data:{id:'12345'}};const path='/pagos/mercadopago/webhook?data.id=12345';
  assert.equal((await request(path,msg)).status,401);
  const ts=String(Date.now());const requestId='audit-request';const sig=createHmac('sha256',process.env.MERCADOPAGO_WEBHOOK_SECRET).update(`id:12345;request-id:${requestId};ts:${ts};`).digest('hex');
  const opts={headers:{'x-signature':`ts=${ts},v1=${sig}`,'x-request-id':requestId}};
  const remote={id:12345,external_reference:String(id),status:'approved',transaction_amount:102,currency_id:'MXN'};mpRecords.set('12345',remote);
  assert.equal((await request(path,msg,opts)).status,409);
  remote.transaction_amount=118.32;
  remote.order={id:id+1}; assert.equal((await request(path,msg,opts)).status,409);
  remote.order={id}; for(let i=0;i<2;i++)assert.equal((await request(path,msg,opts)).status,200);
  assert.equal((await request(`/pagos/pedido/${id}`)).data.estado,'aprobado');assert.equal(await readStock(),1);
});

test('catálogo privado, datos fiscales y fotos de productos respetan permisos y formatos', async t => {
  const vendor = {user:4};
  const publicSupplier = (await request('/proveedores',null,{user:null})).data[0];
  assert.deepEqual(Object.keys(publicSupplier).sort(),['id','nombre','tipo','verificado']);
  assert.equal((await request('/proveedores/admin',null,vendor)).status,403);
  assert.ok('rfc' in (await request('/proveedores/admin',null,{user:3})).data[0]);
  async function upload(bytes) {
    const form = new FormData();
    form.set('imagen',new Blob([bytes],{type:'image/png'}),'prueba.png');
    const response = await fetch(url+'/productos/imagen',{method:'POST',headers:{
      Authorization:'Bearer '+jwt.sign({id:4},process.env.JWT_SECRET),'X-CSRF-Token':csrf,
    },body:form});
    return {status:response.status, data:await response.json()};
  }
  assert.equal((await upload(Buffer.from('<html>'))).status,400);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2TWQAAAABJRU5ErkJggg==','base64');
  const image = await upload(png);
  assert.equal(image.status,201);
  assert.match(image.data.url,/^\/uploads\/productos\/[a-f0-9]{32}\.png$/);
  const file = require('node:path').join(__dirname,'..',image.data.url);
  t.after(()=>require('node:fs/promises').unlink(file));
  const downloaded = await fetch(new URL(image.data.url,url));
  assert.equal(downloaded.headers.get('Cross-Origin-Resource-Policy'),'cross-origin');
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),png);
  const body = {categoria_id:1,nombre:'Producto privado',precio:1,activo:0,stock_inicial:1,image_url:image.data.url};
  const product = await request('/productos',body,vendor);
  assert.equal(product.status,201,JSON.stringify(product.data));
  const id = product.data.id;
  assert.equal((await request('/productos/'+id)).status,404);
  assert.equal((await request('/inventario/'+id)).status,404);
  assert.ok(!(await request('/productos?activo=0')).data.some(p=>p.id===id));
  assert.ok((await request('/productos/gestion',null,vendor)).data.some(p=>p.id===id));
  assert.ok(!(await request('/productos/gestion',null,{user:5})).data.some(p=>p.id===id));
  assert.equal((await request('/productos/'+id,{proveedor_id:2},{user:4,method:'PUT'})).status,403);
  assert.equal((await request('/productos/'+id,{image_url:'javascript:alert(1)'},{user:4,method:'PUT'})).status,400);
  assert.equal((await request('/productos/'+id,{image_url:image.data.url,activo:1},{user:4,method:'PUT'})).status,200);
  assert.equal((await request('/productos/'+id)).data.image_url,image.data.url);
});

test('dirección histórica, actualización de stock e importes y errores recuperables', async t => {
  await stock(4);
  const address = {linea1:'Calle Temporal 12',ciudad:'Puebla',estado:'Puebla',cp:'01234',es_principal:'0'};
  const created = await request('/direcciones',address);
  assert.equal(created.data.es_principal,0);
  const id = created.data.id;
  assert.equal((await checkout('contra_entrega',{direccion_id:id,total_esperado:1})).status,409);
  assert.equal(await readStock(),4);
  const placed = await checkout('contra_entrega',{direccion_id:id,total_esperado:118.32});
  assert.equal(placed.status,201);
  assert.equal((await request('/direcciones/'+id,{linea1:'Calle Nueva 99'},{method:'PUT'})).status,200);
  const detail = (await request('/pedidos/'+placed.data.pedido.id)).data;
  assert.equal(detail.pedido.direccion_linea1,'Calle Temporal 12');
  assert.equal((await request('/direcciones/'+id,null,{method:'DELETE'})).status,409);
  const shipping = '/envios/'+detail.envio.id;
  assert.equal((await request(shipping,{estado:'entregado'},{method:'PATCH',user:3})).status,200);
  assert.equal((await request(shipping,{estado:'en_transito'},{method:'PATCH',user:3})).status,409);
  t.mock.method(pool,'getConnection',async()=>{throw Object.assign(new Error('desconectado'),{code:'ECONNREFUSED'});},{times:1});
  assert.equal((await request('/direcciones',address)).status,503);
  assert.equal((await request('/health')).status,200);
});

test('registro y acceso preservan la contraseña literal y migran cuentas antiguas', async () => {
  const email = 'registro@example.test', password = 'Larga!<marca>2026';
  const registered = await request('/auth/register',{nombre:'Registro Prueba',email,password,rol:'admin'},{user:null});
  assert.equal(registered.status,201);
  assert.equal(registered.data.user.rol,'cliente');
  assert.equal((await request('/auth/login',{email,password:'Larga!2026'})).status,401);
  assert.equal((await request('/auth/login',{email,password})).status,200);
  const hash = await require('bcryptjs').hash('Larga!2026',4);
  await pool.query('UPDATE usuario SET password_hash=?,clave_literal=0 WHERE email=?',[hash,email]);
  assert.equal((await request('/auth/login',{email,password})).status,200);
  assert.equal((await request('/auth/login',{email,password:'Larga!2026'})).status,401);
});

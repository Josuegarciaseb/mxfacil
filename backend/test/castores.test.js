const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { testEnvironment, seed } = require('./helpers');
testEnvironment();
delete process.env.ENVIA_API_TOKEN;
delete process.env.ENVIA_ORIGENES_MX;
const pool = require('../src/config/db');
const app = require('../src/app');
const envia = require('../src/services/envia-castores.service');
const localFetch = global.fetch;
const quotes = '/envios/castores/cotizaciones';
const items = [{producto_id:4,cantidad:1}];
let server, url, csrf, fecha, vigencia;

before(async () => {
  await seed();
  server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  url = 'http://127.0.0.1:' + server.address().port + '/api';
  csrf = (await (await localFetch(url + '/csrf-token')).json()).csrfToken;
  [[{fecha,vigencia}]] = await pool.query("SELECT DATE_FORMAT(CURDATE(),'%Y-%m-%d') fecha, DATE_FORMAT(CURDATE()+INTERVAL 2 DAY,'%Y-%m-%d') vigencia");
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await pool.end(); });

async function call(user, method, path, body, status = 200) {
  const res = await localFetch(url + path, { method, headers:{
    Authorization:'Bearer ' + jwt.sign({id:user},process.env.JWT_SECRET),
    'Content-Type':'application/json','X-CSRF-Token':csrf,
  },body:JSON.stringify(body) });
  const data = await res.json();
  assert.equal(res.status,status,method + ' ' + path + ' ' + JSON.stringify(data));
  return data;
}
const stock = async () => (await pool.query('SELECT stock FROM inventario WHERE producto_id=4'))[0][0].stock;

for (const transportista of ['FedEx','DHL']) {
  test('domicilio con perecederos, autorización, despacho y recepción por ' + transportista, async () => {
    const carga = {direccion_id:1,items:[{producto_id:1,cantidad:1}]};
    const visto = await call(1,'POST','/envios/domicilio/estimado',carga);
    assert.deepEqual(visto,{estimado:null,fuente:null,perecedero:true});
    const venta = await call(1,'POST','/pedidos',{...carga,metodo_pago:'transferencia',entrega:'domicilio',clave_checkout:randomUUID()},201);
    const id = venta.pedido.id, base = '/envios/domicilio/pedidos/' + id;
    const oferta = {transportista,importe:'60',anterior:null,revision:0,referencia:'QA',servicio:'Servicio de prueba, 24 h',cobertura_confirmada:true};
    await call(5,'PUT',base+'/flete',oferta,403);
    await call(4,'PUT',base+'/flete',{...oferta,transportista:'Castores'},409);
    await call(4,'PUT',base+'/flete',{...oferta,cobertura_confirmada:false},400);
    await call(4,'PUT',base+'/flete',oferta);
    assert.equal((await call(1,'GET','/pedidos/'+id)).pedido.paqueteria,transportista);
    await call(3,'PATCH','/pagos/'+venta.pago.id+'/estado',{estado:'aprobado',referencia:'DEP-QA'});
    const despacho = {guia:'123456789012',revision:2};
    await call(4,'POST',base+'/despacho',{...despacho,revision:1},409);
    await call(1,'POST',base+'/aceptar',{importe:60,revision:1});
    await call(4,'PUT',base+'/flete',{...oferta,anterior:'60',revision:1,servicio:'Servicio de prueba, 48 h'});
    await call(1,'POST',base+'/aceptar',{importe:'60',revision:1},409);
    await call(4,'POST',base+'/despacho',despacho,409);
    await call(1,'POST',base+'/aceptar',{importe:60,revision:2});
    await call(4,'POST',base+'/despacho',{...despacho,canal_guia:'envia'},400);
    await call(4,'POST',base+'/despacho',despacho);
    await call(4,'POST',base+'/despacho',despacho);
    for (const user of [1,4]) {
      const detalle = await call(user,'GET','/pedidos/'+id);
      assert.equal(detalle.envio.transportista,transportista);
      assert.equal(detalle.envio.guia,despacho.guia);
      assert.equal(detalle.pedido.rastreo_api,false);
    }
    await call(1,'POST',base+'/recepcion',{recibido_por:'QA',acuse:'REC-QA'});
    assert.equal((await call(4,'GET','/pedidos/'+id)).pedido.estado,'entregado');
  });
}
const solicitar = (carga = items,metodo_pago = 'transferencia') => call(1,'POST',quotes,{direccion_id:1,metodo_pago,items:carga});
const oferta = () => ({ revision:0, flete:'80.00', otros_costos_estimados:'2.50', vigencia,
  cp_origen:'72000', referencia:'COT-PRUEBA', servicio:'Domicilio, 2 días de prueba', cobertura_confirmada:true });
const compra = q => ({ direccion_id:1, items, metodo_pago:'transferencia', entrega:'castores',
  cotizacion_id:q.id,revision:q.revision,clave_checkout:randomUUID(),total_esperado:'494.12' });

test('la solicitud no reserva, se reutiliza y respeta comprador, proveedor, tipo de producto y margen', async () => {
  const [a,b] = await Promise.all([solicitar(),solicitar()]);
  assert.equal(a.id,b.id);
  assert.equal(a.flete,null);
  assert.equal(await stock(),4);
  await call(1,'POST',quotes,{direccion_id:2,metodo_pago:'transferencia',items},404);
  await call(1,'POST',quotes,{direccion_id:1,metodo_pago:'transferencia',items:[{producto_id:1,cantidad:1}]},409);
  await call(1,'POST',quotes,{direccion_id:1,metodo_pago:'transferencia',items:[...items,{producto_id:2,cantidad:1}]},409);
  await call(2,'GET',quotes+'/'+a.id,undefined,403);
  await call(5,'PUT',quotes+'/'+a.id,oferta(),403);
  assert.equal((await call(5,'GET',quotes)).length,0);
  assert.equal((await call(4,'GET',quotes))[0].comision_estimada,'7.00');
  await call(4,'PUT',quotes+'/'+a.id,{...oferta(),otros_costos_estimados:'7.00'},409);
  await call(4,'PUT',quotes+'/'+a.id,{...oferta(),otros_costos_estimados:''},400);
  await call(4,'PUT',quotes+'/'+a.id,{...oferta(),vigencia:'2020-01-01'},400);
  await call(4,'PUT',quotes+'/'+a.id,{...oferta(),cobertura_confirmada:false},400);
  const rejected = await call(4,'PUT',quotes+'/'+a.id,{revision:0,motivo_rechazo:'Sin recolección hoy'});
  assert.equal(rejected.motivo_rechazo,'Sin recolección hoy');
  await call(1,'POST','/pedidos',compra(rejected),409);
});

test('compra con tarifa vinculada, guía y acuse; el margen usa el costo efectivo, incluso tras reembolso', async () => {
  const solicitud = await solicitar();
  const ruta = quotes + '/' + solicitud.id;
  const q = await call(4,'PUT',ruta,{...oferta(),revision:solicitud.revision});
  assert.equal(q.flete,'80.00');
  assert.deepEqual(await call(1,'POST','/envios/domicilio/estimado',{direccion_id:1,items}),{estimado:80,fuente:'historial'});
  const body = compra(q);
  await call(1,'POST','/pedidos',{...body,revision:q.revision+1},409);
  await call(1,'POST','/pedidos',{...body,items:[{producto_id:4,cantidad:2}],total_esperado:'908.24'},409);
  await call(1,'POST','/pedidos',{...body,total_esperado:'414.12',flete:0},409);
  await call(1,'POST','/pedidos',{...body,metodo_pago:'contra_entrega'},409);
  await call(1,'POST','/pedidos',{...body,metodo_pago:'tarjeta'},409);
  await pool.query("UPDATE direccion SET linea1='Otra dirección' WHERE id=1");
  await call(1,'POST','/pedidos',body,409);
  await pool.query("UPDATE direccion SET linea1='Calle Prueba 123' WHERE id=1");
  await pool.query("UPDATE cotizacion_castores SET vigencia=CURDATE()-INTERVAL 1 DAY WHERE id=?",[q.id]);
  await call(1,'POST','/pedidos',body,409);
  await pool.execute('UPDATE cotizacion_castores SET vigencia=? WHERE id=?',[vigencia,q.id]);
  assert.equal(await stock(),4);
  const venta = await call(1,'POST','/pedidos',body,201);
  const id = venta.pedido.id;
  assert.equal(venta.pedido.otros_costos_estimados,undefined);
  assert.deepEqual([venta.pedido.subtotal,venta.pedido.iva,venta.pedido.comision,venta.pedido.flete,venta.pago.monto],
    ['357.00','57.12','7.00','80.00','494.12']);
  assert.equal((await call(1,'POST','/pedidos',body)).pedido.id,id);
  await call(1,'POST','/pedidos',{...body, clave_checkout:randomUUID()},409);
  assert.equal(await stock(),3);
  const vendor = (await call(4,'GET','/pedidos/admin')).find(o => o.id === id);
  assert.deepEqual([vendor.importe_proveedor,vendor.flete,vendor.total],['350.00','80.00','494.12']);
  const base = '/envios/castores/pedidos/' + id;
  const despacho = {guia:'ABC-12345',costo_flete_real:'82.00'};
  await call(4,'POST',base+'/despacho',despacho,409);
  await call(3,'PATCH','/pagos/'+venta.pago.id+'/estado',{estado:'aprobado',referencia:'TRANSFERENCIA-PRUEBA'});
  await call(5,'POST',base+'/despacho',despacho,403);
  await call(1,'POST',base+'/despacho',despacho,403);
  await call(4,'PATCH','/pedidos/'+id+'/estado',{estado:'enviado'},409);
  await call(3,'PATCH','/envios/'+venta.envio.id,{estado:'entregado'},409);
  await call(4,'POST',base+'/despacho',{...despacho,guia:'inventada'},400);
  await Promise.all([call(4,'POST',base+'/despacho',despacho),call(4,'POST',base+'/despacho',despacho)]);
  const entrega = await call(1,'GET','/pedidos/'+id);
  assert.equal(entrega.envio.guia,despacho.guia);
  assert.equal(entrega.pedido.estado,'enviado');
  assert.ok(entrega.envio.fecha_envio);
  await call(2,'GET',base+'/rastreo',undefined,403);
  await call(1,'GET',base+'/rastreo',undefined,503);
  await call(2,'POST',base+'/recepcion',{recibido_por:'Intruso',acuse:'NO'},403);
  await call(1,'POST',base+'/incidencia',{motivo:'Caja húmeda'});
  await call(1,'POST',base+'/recepcion',{recibido_por:'Tienda Prueba',acuse:''},400);
  const acuse = {recibido_por:'Tienda Prueba',acuse:'REM-PRUEBA'};
  await call(4,'POST',base+'/recepcion',acuse,403);
  await call(1,'POST',base+'/recepcion',acuse);
  await call(1,'POST',base+'/recepcion',acuse);
  const recibida = await call(4,'GET','/pedidos/'+id);
  assert.equal(recibida.pedido.referencia_flete,'COT-PRUEBA');
  assert.equal(recibida.pedido.estado,'entregado');
  assert.equal(recibida.pedido.acuse,acuse.acuse);
  assert.ok(recibida.envio.fecha_entrega);
  const medir = async () => (await call(3,'GET','/piloto?desde='+fecha+'&hasta='+fecha)).pedidos.find(p => p.id===id);
  assert.equal((await medir()).margen,null);
  await call(3,'PATCH','/piloto/pedidos/'+id+'/costo',{anterior:null,costo_variable:'2.50'});
  let actual = await medir();
  assert.deepEqual([actual.comision_obtenida,actual.flete_recuperado,actual.costo_flete_real,actual.margen],['7.00','80.00','82.00','2.50']);
  await call(3,'PATCH','/pagos/'+venta.pago.id+'/estado',{estado:'reembolsado',referencia_reembolso:'REEMBOLSO-PRUEBA'});
  actual = await medir();
  assert.deepEqual([actual.flete_recuperado,actual.margen],['0.00','-84.50']);
});

test('API opcional filtra Castores/MXN, publica la tarifa menor y devuelve eventos de la guía exacta', async t => {
  process.env.ENVIA_ENTORNO = 'sandbox';
  process.env.ENVIA_API_TOKEN = 'prueba-local';
  process.env.ENVIA_ORIGENES_MX = JSON.stringify({'1':{name:'Origen QA',phone:'2221111111',street:'Prueba 1',city:'Puebla',state:'PU',postalCode:'72000'}});
  t.after(() => { delete process.env.ENVIA_API_TOKEN; delete process.env.ENVIA_ORIGENES_MX; });
  await pool.query("UPDATE usuario SET telefono='2221111112' WHERE id=1");
  const llamadas = [];
  let respuesta = {meta:'error'};
  t.mock.method(global,'fetch',async (url,opts) => {
    assert.ok(url.startsWith('https://api-test.envia.com/ship/'));
    llamadas.push({url,payload:JSON.parse(opts.body)});
    return {ok:true,json:async () => respuesta};
  });
  const req = await solicitar([{producto_id:4,cantidad:2}]);
  const datos = {...oferta(),revision:req.revision,fuente:'envia',tipo_bulto:'pallet',peso:10.2,largo:60,ancho:40,alto:30,estado_destino:'PU'};
  const path = quotes+'/'+req.id;
  await call(4,'PUT',path,datos,502);
  respuesta = {meta:'rate',data:[{carrier:'otro',service:'x',currency:'MXN',totalPrice:1}]};
  await call(4,'PUT',path,datos,422);
  respuesta.data.push({carrier:'castores',service:'regular',currency:'USD',totalPrice:'3.00'},
    {carrier:'castores',service:'express',currency:'MXN',totalPrice:'115.00'},
    {carrier:'castores',service:'normal',currency:'MXN',totalPrice:'84.50',deliveryEstimate:'3 días'});
  const q = await call(4,'PUT',path,datos);
  assert.deepEqual([q.flete,q.fuente],['84.50','sandbox']);
  const pedidoApi = llamadas.at(-1).payload;
  assert.equal(pedidoApi.destination.postalCode,'72000');
  assert.equal(pedidoApi.shipment.carrier,'castores');
  assert.equal(pedidoApi.shipment.type,2);
  assert.equal(pedidoApi.packages[0].type,'pallet');
  assert.equal(pedidoApi.packages[0].weight,10.2);
  const venta = await call(1,'POST','/pedidos',{...compra(q),items:[{producto_id:4,cantidad:2}],total_esperado:'912.74'},201);
  const base = '/envios/castores/pedidos/' + venta.pedido.id;
  await call(3,'PATCH','/pagos/'+venta.pago.id+'/estado',{estado:'aprobado',referencia:'TEST-API'});
  await call(4,'POST',base+'/despacho',{guia:'ABC-99991',canal_guia:'envia',costo_flete_real:'84.50'});
  assert.equal((await call(1,'GET','/pedidos/'+venta.pedido.id)).pedido.rastreo_api,true);
  await call(5,'GET',base+'/rastreo',undefined,403);
  respuesta = {meta:'track',data:[{trackingNumber:'ABC-12345',carrier:'otro',status:'Delivered'}]};
  await assert.rejects(envia.rastrear('ABC-12345'),{status:404});
  respuesta.data.push({trackingNumber:'ABC-12345',carrier:'castores',status:'Shipped',events:[
    {timestamp:'2026-11-11T10:00:00Z',description:'Salida de terminal',location:'Puebla'}]});
  const tracking = await envia.rastrear('ABC-12345');
  assert.equal(tracking.eventos[0].lugar,'Puebla');
  assert.deepEqual(llamadas.at(-1).payload,{trackingNumbers:['ABC-12345']});
  respuesta.data[1].trackingNumber='ABC-99991';
  assert.equal((await call(1,'GET',base+'/rastreo')).eventos[0].descripcion,'Salida de terminal');
});

test('la pasarela recibe exactamente el importe de mercancía más el flete confirmado', async t => {
  const req = await solicitar(items,'tarjeta');
  const q = await call(4,'PUT',quotes+'/'+req.id,{...oferta(),revision:req.revision});
  const venta = await call(1,'POST','/pedidos',{...compra(q),metodo_pago:'tarjeta'},201);
  const stripe = require('../src/services/stripe.service');
  const intento = t.mock.method(stripe,'createPaymentIntent',async (amount,id) => {
    assert.equal(amount,'494.12'); assert.equal(id,venta.pedido.id);
    return {id:'pi_castores_prueba',client_secret:'prueba-local',status:'requires_payment_method'};
  });
  await call(1,'POST','/pagos/stripe/intent',{pedido_id:venta.pedido.id});
  assert.equal(intento.mock.callCount(),1);
  assert.equal(venta.envio,null);
});

test('domicilio crea el folio en un paso, conserva el cobro de mercancía y aprende del flete entregado', async () => {
  const carga = {direccion_id:1,items:[{producto_id:2,cantidad:1}]};
  const estimar = '/envios/domicilio/estimado';
  const ver = () => call(1,'POST',estimar,carga);
  assert.deepEqual(await ver(),{estimado:247,fuente:'referencia'});
  await call(2,'POST',estimar,carga,404);
  const compraDirecta = {...carga,metodo_pago:'transferencia',entrega:'domicilio',clave_checkout:randomUUID(),
    total_esperado:'0.35',flete_autorizado:247};
  await call(1,'POST','/pedidos',{...compraDirecta,flete_autorizado:1},409);
  await call(1,'POST','/pedidos',{...compraDirecta,metodo_pago:'contra_entrega'},409);
  const venta = await call(1,'POST','/pedidos',compraDirecta,201);
  const id = venta.pedido.id, base = '/envios/domicilio/pedidos/'+id;
  assert.deepEqual([venta.pedido.flete,venta.pedido.flete_estimado,venta.pago.monto],[null,'247.00','0.35']);
  assert.equal((await call(1,'POST','/pedidos',compraDirecta)).pedido.id,id);
  await call(1,'POST','/pedidos',{...compraDirecta,entrega:'acordada'},409);
  const [{stock:disponible}] = (await pool.query('SELECT stock FROM inventario WHERE producto_id=2'))[0];
  assert.equal(disponible,99);
  const ofertaFinal={importe:'242.00',referencia:'COT-QA',anterior:null};
  await call(4,'PUT',base+'/flete',ofertaFinal,403);
  await call(5,'PUT',base+'/flete',ofertaFinal);
  await call(3,'PATCH','/pagos/'+venta.pago.id+'/estado',{estado:'aprobado',referencia:'DEP-TEST'});
  const despacho = '/envios/castores/pedidos/'+id+'/despacho';
  await call(5,'POST',despacho,{guia:'QAT-34567'});
  await call(5,'POST',despacho,{guia:'QAT-34567'});
  await call(5,'PUT',base+'/flete',{...ofertaFinal,importe:'999.00',anterior:'242.00'},409);
  await call(1,'POST','/envios/castores/pedidos/'+id+'/recepcion',{recibido_por:'QA',acuse:'A-QA'});
  assert.deepEqual(await ver(),{estimado:242,fuente:'historial'});
  await call(3,'PATCH','/piloto/pedidos/'+id+'/costo',{anterior:null,costo_variable:0});
  const informe = (await call(3,'GET','/piloto?desde='+fecha+'&hasta='+fecha)).pedidos.find(p=>p.id===id);
  assert.deepEqual([informe.flete_recuperado,informe.margen],['0.00','0.01']);
});

test('un pedido sin estimado exige autorización del precio final o permite cancelar y devolver la mercancía una vez', async () => {
  const carga = {direccion_id:1,items:[{producto_id:2,cantidad:7}]};
  assert.deepEqual(await call(1,'POST','/envios/domicilio/estimado',carga),{estimado:null,fuente:null});
  const pedido = await call(1,'POST','/pedidos',{...carga,metodo_pago:'transferencia',entrega:'domicilio',clave_checkout:randomUUID()},201);
  const id=pedido.pedido.id, base='/envios/domicilio/pedidos/'+id;
  await call(3,'PATCH','/pagos/'+pedido.pago.id+'/estado',{estado:'aprobado',referencia:'DEP-2'});
  await call(5,'PUT',base+'/flete',{importe:'300.00',anterior:null,referencia:'COT-QA'});
  await call(5,'POST','/envios/castores/pedidos/'+id+'/despacho',{guia:'QAT-99999'},409);
  await call(1,'POST',base+'/aceptar',{importe:'247.00'},409);
  await call(2,'POST',base+'/aceptar',{importe:'300.00'},403);
  await call(1,'POST',base+'/aceptar',{importe:'300.00'});
  await call(5,'PUT',base+'/flete',{importe:'350.00',anterior:'300.00',referencia:'COT-QA2'});
  await call(5,'POST','/envios/castores/pedidos/'+id+'/despacho',{guia:'QAT-99999'},409);
  await Promise.all([call(1,'POST',base+'/cancelar',{}),call(1,'POST',base+'/cancelar',{})]);
  const detalle = await call(1,'GET','/pedidos/'+id);
  assert.deepEqual([detalle.pedido.estado,detalle.pago.estado],['cancelado','aprobado']);
  await call(3,'PATCH','/pagos/'+pedido.pago.id+'/estado',{estado:'reembolsado',referencia_reembolso:'DEV-QA'});
  assert.equal((await pool.query('SELECT stock FROM inventario WHERE producto_id=2'))[0][0].stock,99);
});

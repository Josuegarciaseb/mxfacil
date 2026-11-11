const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { testEnvironment, seed } = require('./helpers');

testEnvironment();
const pool = require('../src/config/db');
const app = require('../src/app');

let server, api, csrf;
before(async () => {
  await seed();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  api = 'http://127.0.0.1:' + server.address().port + '/api';
  csrf = (await (await fetch(api + '/csrf-token')).json()).csrfToken;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});

async function call(user, method, path, body, status = 200) {
  const response = await fetch(api + path, {
    method, headers: {
      Authorization: 'Bearer ' + jwt.sign({id:user}, process.env.JWT_SECRET),
      'X-CSRF-Token': csrf, 'Content-Type': 'application/json',
    }, body: JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}

test('el costal de 350 conserva folio, mercancía, comisión, IVA y estado de cobro para ambos roles', async () => {
  const body = {direccion_id:1, metodo_pago:'contra_entrega', items:[{producto_id:4,cantidad:1}],
    total_esperado:414.12, clave_checkout:randomUUID()};
  await call(1, 'POST', '/pedidos', { ...body, clave_checkout: null }, 400);
  const sale = await call(1, 'POST', '/pedidos', body, 201);
  const id = sale.pedido.id;
  assert.equal((await call(1, 'POST', '/pedidos', body)).pedido.id, id);
  const [inventory] = await pool.query('SELECT stock FROM inventario WHERE producto_id=4');
  assert.equal(inventory[0].stock, 3);
  assert.deepEqual([sale.pedido.subtotal, sale.pedido.iva, sale.pedido.comision, sale.pedido.total],
    ['357.00','57.12','7.00','414.12']);
  const returned = await call(4, 'PATCH', '/pedidos/' + id + '/estado', {estado:'en_proceso'});
  assert.equal(returned.pago, null);
  assert.equal((await call(1, 'GET', '/pedidos/' + id)).pedido.estado, 'en_proceso');
  const sellerOrders = await call(4, 'GET', '/pedidos/admin');
  const scoped = sellerOrders.filter(o => o.id === id);
  assert.equal(scoped.length, 1);
  assert.deepEqual([scoped[0].pago_estado, scoped[0].importe_proveedor, scoped[0].comision, scoped[0].total],
    ['pendiente','350.00','7.00','414.12']);
  assert.equal((await call(5, 'GET', '/pedidos/admin')).some(o => o.id === id), false);
  await call(5, 'GET', '/pedidos/' + id, undefined, 403);
  for (const estado of ['enviado','entregado']) await call(4, 'PATCH', '/pedidos/' + id + '/estado', {estado});
  const payment = '/pagos/' + sale.pago.id + '/estado';
  await call(3, 'PATCH', payment, {estado:'aprobado', referencia:'RECIBO-TEST'});
  await call(3, 'PATCH', payment, {estado:'aprobado', referencia:'RECIBO-TEST'});
  const paid = (await call(4, 'GET', '/pedidos/admin')).filter(o => o.id === id);
  assert.equal(paid.length, 1);
  assert.equal(paid[0].pago_estado, 'aprobado');
  await call(3, 'PATCH', payment, {estado:'reembolsado', referencia_reembolso:'DEV-TEST'});
  const refunded = (await call(4, 'GET', '/pedidos/admin')).find(o => o.id === id);
  assert.equal(refunded.pago_estado, 'reembolsado');
});

test('dos proveedores comparten el IVA redondeado y conservan su atribución tras modificar el catálogo', async () => {
  await pool.query('UPDATE producto SET precio=0.03 WHERE id IN (1,2)');
  const sale = await call(1, 'POST', '/pedidos', {
    direccion_id:1, metodo_pago:'contra_entrega', total_esperado:0.07, clave_checkout:randomUUID(),
    items:[{producto_id:2,cantidad:1},{producto_id:1,cantidad:1}],
  }, 201);
  const id = sale.pedido.id;
  assert.deepEqual(sale.items.map(i => i.iva_linea), ['0.00','0.01']);
  await pool.query('UPDATE producto SET precio=700,proveedor_id=2 WHERE id=1');
  for (const [user, product, total] of [[4,1,0.03],[5,2,0.04]]) {
    const scoped = await call(user, 'GET', '/pedidos/' + id);
    assert.deepEqual(scoped.items.map(i => i.producto_id), [product]);
    assert.equal(Number(scoped.pedido.total), total);
    assert.equal(Number(scoped.pedido.importe_proveedor), 0.03);
    assert.equal(Number(scoped.pedido.comision), 0);
    const list = (await call(user, 'GET', '/pedidos/admin')).find(o => o.id === id);
    assert.equal(list.total, scoped.pedido.total);
    await call(user, 'PATCH', '/pedidos/' + id + '/estado', {estado:'en_proceso'}, 403);
  }
  // A mixed order migrated without line-level base and tax cannot split
  // those fields exactly. Keep NULL even after the catalog prices change.
  await pool.query('UPDATE pedido_item SET precio_base_unitario=NULL,iva_linea=NULL WHERE pedido_id=?', [id]);
  const legacy = (await call(4, 'GET', '/pedidos/' + id)).pedido;
  assert.equal(legacy.importe_proveedor, null);
  assert.equal(legacy.comision, null);
  assert.equal(legacy.iva, null);
  assert.equal(legacy.total, null);
});

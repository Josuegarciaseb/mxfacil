const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { testEnvironment, seed } = require('./helpers');

testEnvironment();
const pool = require('../src/config/db');
const app = require('../src/app');
let server, url, csrf;

before(async () => {
  await seed();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api`;
  csrf = (await (await fetch(url + '/csrf-token')).json()).csrfToken;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});

async function request(path, body, user = 4, method = 'PUT') {
  const response = await fetch(url + path, {
    method,
    headers: {
      'Content-Type': 'application/json', 'X-CSRF-Token': csrf,
      Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}`,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

const stock = async () => (await pool.query('SELECT stock FROM inventario WHERE producto_id=1'))[0][0].stock;

test('el vendedor suma stock al editar; una edición sin reposición conserva las existencias', async () => {
  await pool.query('UPDATE inventario SET stock=5 WHERE producto_id=1');
  const edit = await request('/productos/1', { stock_agregar: 7, nombre: 'Manzanas repuestas' });
  assert.equal(edit.status, 200);
  assert.equal(edit.data.stock, 12);
  assert.equal(edit.data.nombre, 'Manzanas repuestas');
  const metadata = await request('/productos/1', { precio: 105 });
  assert.equal(metadata.status, 200);
  assert.equal(metadata.data.stock, 12);
});

test('solo el dueño o un administrador reponen un producto; el rechazo no modifica datos', async () => {
  const initial = await stock();
  for (const user of [1, 5]) {
    const denied = await request('/productos/1', { stock_agregar: 3, nombre: 'Cambio ajeno' }, user);
    assert.equal(denied.status, 403);
    assert.equal(await stock(), initial);
  }
  const admin = await request('/productos/1', { stock_agregar: 2 }, 3);
  assert.equal(admin.status, 200);
  assert.equal(admin.data.stock, initial + 2);
  assert.equal(admin.data.nombre, 'Manzanas repuestas');
  assert.equal((await request('/productos/999999', { stock_agregar: 1 })).status, 404);
});

test('rechaza reposiciones inválidas sin guardar otros cambios del producto', async () => {
  const initial = await stock();
  for (const stock_agregar of [0, -1, 1.5, true, false, null, {}, [], '', ' ', '3abc', 2147483648]) {
    const invalid = await request('/productos/1', { stock_agregar, nombre: 'Cambio inválido' });
    assert.equal(invalid.status, 400, JSON.stringify(stock_agregar));
    assert.equal(await stock(), initial);
  }
  const [rows] = await pool.query('SELECT nombre FROM producto WHERE id=1');
  assert.equal(rows[0].nombre, 'Manzanas repuestas');
});

test('repone productos agotados o sin registro de inventario', async () => {
  const exhausted = await request('/productos/3', { stock_agregar: 4 });
  assert.equal(exhausted.status, 200);
  assert.equal(exhausted.data.stock, 4);
  await pool.query('DELETE FROM inventario WHERE producto_id=3');
  const missing = await request('/productos/3', { stock_agregar: 6 });
  assert.equal(missing.status, 200);
  assert.equal(missing.data.stock, 6);
});

test('revierte toda la edición si el stock resultante supera el límite', async () => {
  await pool.query('UPDATE inventario SET stock=2147483646 WHERE producto_id=1');
  const overflow = await request('/productos/1', { stock_agregar: 2, nombre: 'Cambio excesivo' });
  assert.equal(overflow.status, 409);
  assert.equal(await stock(), 2147483646);
  const limit = await request('/productos/1', { stock_agregar: 1 });
  assert.equal(limit.status, 200);
  assert.equal(limit.data.stock, 2147483647);
  assert.equal(limit.data.nombre, 'Manzanas repuestas');
});

test('dos reposiciones y una compra simultáneas conservan todas las unidades', async () => {
  await pool.query('UPDATE inventario SET stock=5 WHERE producto_id=1');
  const results = await Promise.all([
    request('/productos/1', { stock_agregar: 7 }),
    request('/productos/1', { stock_agregar: 3 }),
    request('/pedidos', {
      direccion_id: 1, items: [{ producto_id: 1, cantidad: 2 }],
      metodo_pago: 'contra_entrega', clave_checkout: randomUUID(),
    }, 1, 'POST'),
  ]);
  assert.deepEqual(results.map(r => r.status), [200, 200, 201]);
  assert.equal(await stock(), 13);
});

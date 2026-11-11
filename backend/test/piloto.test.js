const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { testEnvironment, seed } = require('./helpers');
testEnvironment();
const pool = require('../src/config/db');
const app = require('../src/app');
const { iniciarCheckout, segundosCheckout } = require('../src/services/piloto.service');

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

async function request(path, user = 3, method = 'GET', body) {
  const response = await fetch(url + path, {
    method, headers: { Authorization: 'Bearer ' + jwt.sign({ id: user }, process.env.JWT_SECRET),
      'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

test('inicio de compra firmado por el servidor y ligado a la cuenta', t => {
  const now = Date.now();
  const clock = t.mock.method(Date, 'now', () => now);
  const token = iniciarCheckout(1);
  clock.mock.mockImplementation(() => now + 38000);
  assert.equal(segundosCheckout(token, 1), 38);
  assert.equal(segundosCheckout(token, 2), null);
  assert.equal(segundosCheckout(token + '0', 1), null);
  assert.equal(segundosCheckout(null, 1), null);
});

test('el carrito medido guarda el tiempo una sola vez en el pedido', async () => {
  const inicio = await request('/piloto/inicio-compra', 1, 'POST');
  assert.equal(inicio.status, 200);
  const body = { direccion_id: 1, metodo_pago: 'contra_entrega', items: [{ producto_id: 4, cantidad: 1 }],
    clave_checkout: 'piloto-medicion-0001', inicio_checkout: inicio.data.inicio_checkout };
  const compra = await request('/pedidos', 1, 'POST', body);
  assert.equal(compra.status, 201);
  const id = compra.data.pedido.id;
  const tiempo = async () => (await pool.execute('SELECT checkout_segundos FROM pedido WHERE id = ?', [id]))[0][0].checkout_segundos;
  const primero = await tiempo();
  assert.ok(Number.isInteger(primero) && primero >= 0);
  const repetida = await request('/pedidos', 1, 'POST', { ...body, inicio_checkout: null });
  assert.equal(repetida.data.pedido.id, id);
  assert.equal(await tiempo(), primero);
});

test('cohorte de alta, recompra cobrada, estados, costos y margen con permisos admin', async () => {
  async function orden(usuario, fecha, estado, pago, tiempo, costo) {
    const [row] = await pool.execute(
      'INSERT INTO pedido (usuario_id,direccion_id,fecha,estado,total,comision,checkout_segundos,costo_variable) VALUES (?,?,?,?,414.12,7.00,?,?)',
      [usuario, usuario, fecha, estado, tiempo, costo]);
    await pool.execute("INSERT INTO pago (pedido_id,metodo,monto,estado) VALUES (?,'contra_entrega',414.12,?)", [row.insertId, pago]);
    return row.insertId;
  }
  const pagado = await orden(1, '2020-03-01', 'entregado', 'aprobado', 10, null);
  await orden(1, '2020-03-14 23:59:59', 'entregado', 'aprobado', 30, 0);
  const cancelado = await orden(2, '2020-03-12', 'cancelado', 'rechazado', null, 1.1);
  await orden(2, '2020-03-05', 'en_proceso', 'pendiente', 0, null);
  const reembolso = await orden(2, '2020-03-09', 'entregado', 'reembolsado', null, 2);
  await orden(2, '2020-03-15', 'entregado', 'aprobado', 80, 0);
  const path = '/piloto?desde=2020-03-01&hasta=2020-03-14';
  const informe = await request(path);
  assert.equal(informe.status, 200);
  assert.deepEqual(informe.data.resumen, { entregados: 3, cancelados: 1, pendientes: 1, tiendas_compradoras: 1,
    tiendas_recurrentes: 1, muestras_tiempo: 3, segundos_promedio: 13, comision_obtenida: '14.00' });
  const margen = id => informe.data.pedidos.find(row => row.id === id).margen;
  assert.equal(margen(pagado), null);
  assert.equal(margen(cancelado), '-1.10');
  assert.equal(margen(reembolso), '-2.00');
  assert.equal((await request(path + '&tiendas=1')).data.pedidos.length, 2);
  assert.equal((await request(path + '&tiendas=x')).status, 400);
  assert.equal((await request('/piloto?desde=2020-02-31&hasta=2020-03-01')).status, 400);
  assert.equal((await request(path, 4)).status, 403);
  const editar = (valor, anterior, user = 3) => request('/piloto/pedidos/' + pagado + '/costo', user, 'PATCH', { costo_variable: valor, anterior });
  assert.equal((await editar(0, null, 1)).status, 403);
  assert.equal((await editar(0.001, null)).status, 400);
  assert.equal((await editar(0, null)).status, 200);
  assert.equal((await editar(0, null)).status, 200);
  assert.equal((await editar(3, null)).status, 409);
  assert.equal((await editar(1.05, 0)).status, 200);
  const modificado = (await request(path)).data.pedidos.find(row => row.id === pagado);
  assert.equal(modificado.margen, '5.95');
  assert.equal((await editar(null, 1.05)).status, 200);
  assert.equal((await request(path)).data.pedidos.find(row => row.id === pagado).margen, null);
});

test('el filtro de proveedores combina fechas y tiendas conservando folios completos y sus costos', async () => {
  async function pedido(tienda, productos, fecha = '2021-09-02') {
    const result = await request('/pedidos', tienda, 'POST', {
      direccion_id: tienda, metodo_pago: 'contra_entrega', clave_checkout: randomUUID(),
      items: productos.map(producto_id => ({ producto_id, cantidad: 1 })),
    });
    assert.equal(result.status, 201);
    const id = result.data.pedido.id;
    await pool.execute('UPDATE pedido SET fecha = ?, costo_variable = 3.50 WHERE id = ?', [fecha, id]);
    return id;
  }
  const solo = await pedido(1, [1]);
  const mixto = await pedido(1, [1, 2]);
  const otraTienda = await pedido(2, [2]);
  await pedido(1, [1], '2021-09-05');
  const sinProveedor = await pedido(1, [2]);
  await pool.execute('UPDATE pedido_item SET proveedor_id = NULL WHERE pedido_id = ?', [sinProveedor]);

  const ruta = '/piloto?desde=2021-09-01&hasta=2021-09-03';
  const informe = async filtros => {
    const response = await request(ruta + filtros);
    assert.equal(response.status, 200);
    return response.data;
  };
  const ids = reporte => reporte.pedidos.map(p => p.id).sort((a, b) => a - b);
  assert.deepEqual(ids(await informe('&proveedores=1')), [solo]);
  assert.deepEqual(ids(await informe('&proveedores=2')), [otraTienda]);
  const ambos = await informe('&proveedores=1,2,1&tiendas=1');
  assert.deepEqual(ids(ambos), [solo, mixto]);
  assert.equal(ambos.pedidos.find(p => p.id === mixto).margen, '-3.50');
  assert.deepEqual(ids(await informe('&tiendas=1')), [solo, mixto, sinProveedor]);
  assert.equal((await request(ruta + '&proveedores=1,x')).status, 400);
});

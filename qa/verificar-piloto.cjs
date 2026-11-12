// Prueba de navegador opcional. Requiere el build local y Playwright (ver qa/PILOTO.md).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const express = require('../backend/node_modules/express');
const { testEnvironment, seed } = require('../backend/test/helpers');

async function run() {
  const site = path.resolve(__dirname, '../.audit/piloto-web');
  assert.ok(fs.existsSync(path.join(site, 'index.html')), 'Compila el frontend local siguiendo qa/PILOTO.md');
  testEnvironment('mxfacil_audit_ui');
  for (const key of ['STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_ID', 'MERCADOPAGO_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID']) delete process.env[key];
  await seed();
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  process.env.FRONTEND_URL = process.env.ALLOWED_ORIGINS = process.env.BACKEND_URL = origin;
  const api = require('../backend/src/app');
  const pool = require('../backend/src/config/db');
  const app = express();
  app.use((req, res, next) => req.path.startsWith('/api/') ? api(req, res) : next());
  app.use(express.static(site));
  app.get('*', (req, res) => res.sendFile(path.join(site, 'index.html')));
  server.on('request', app);
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'msedge', headless: true });
    async function login(email, destination) {
      const context = await browser.newContext({ locale: 'es-MX', viewport: { width: 1440, height: 1000 } });
      await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      await page.goto(origin + '/auth');
      await page.getByPlaceholder('correo@ejemplo.com').fill(email + '@example.test');
      await page.locator('input[type=password]').fill('CompraPrueba!2026');
      await page.locator('input[type=password]').press('Enter');
      await page.waitForURL(origin + destination);
      return page;
    }
    const buyer = await login('cliente', '/catalogo');
    const seller = await login('vendedor', '/vendedor/dashboard');
    const admin = await login('admin', '/admin/dashboard');
    const stock = async () => {
      await seller.goto(origin + '/vendedor/productos');
      const product = seller.getByRole('row').filter({ hasText: 'Semilla de calabaza de prueba' });
      return product.locator('[data-label="Stock"] .badge').innerText();
    };
    const paqueteria = ['Castores','FedEx','DHL'].find(nombre => process.argv.includes('--'+nombre.toLowerCase()));
    if (paqueteria) {
      await require('./flujo-castores.cjs')({ buyer,seller,admin,origin,stock,pool,paqueteria });
      return;
    }
    assert.equal(await stock(), '4');
    await buyer.getByRole('checkbox', { name: 'Semillas', exact: true }).check();
    await buyer.getByRole('article', {name:/Semilla de calabaza/}).getByRole('button', {name:/Agregar/}).click();
    const started = buyer.waitForResponse(r => r.url().endsWith('/piloto/inicio-compra') && r.ok());
    await buyer.getByRole('button', { name: /^Carrito,/ }).click();
    await started;
    const cart = buyer.getByRole('dialog', {name:'Mi carrito'});
    await cart.getByLabel('Método de pago').selectOption('contra_entrega');
    assert.match(await cart.innerText(), /414\.12/);
    const posted = buyer.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/pedidos'));
    await cart.getByRole('button', {name:'Confirmar pedido'}).click();
    const response = await posted;
    assert.equal(response.status(), 201);
    const { pedido, pago } = await response.json();
    assert.deepEqual([pedido.subtotal, pedido.comision, pedido.iva, pedido.total, pago.estado],
      ['357.00', '7.00', '57.12', '414.12', 'pendiente']);
    await buyer.waitForURL(origin + '/mis-pedidos?pedido_id=' + pedido.id);
    assert.equal(await stock(), '3');
    async function checkBalance(group, expected) {
      await seller.goto(origin + '/vendedor/dashboard');
      const row = seller.getByRole('row').filter({has: seller.getByRole('rowheader', { name: group, exact:true })});
      await row.waitFor();
      assert.deepEqual(await row.getByRole('cell').allTextContents(), expected);
    }
    const amounts = ['1', '$350.00', '$7.00', '$57.12', '$414.12'];
    const empty = ['0', '$0.00', '$0.00', '$0.00', '$0.00'];
    await checkBalance('Por cobrar', amounts);
    await checkBalance('Cobrado', empty);
    await seller.goto(origin + '/vendedor/pedidos');
    const orderButton = 'Ver pedido #' + pedido.id;
    await seller.getByRole('button', {name:orderButton, exact:true}).click();
    async function advance(state, label) {
      const changed = seller.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/estado'));
      await seller.getByLabel('Cambiar estado').selectOption(state);
      assert.equal((await changed).status(), 200);
      await seller.getByRole('row').filter({hasText:'Cliente Prueba'}).getByRole('cell', {name:label, exact:true}).waitFor();
    }
    await advance('en_proceso', 'En proceso');
    await buyer.reload();
    await buyer.getByRole('heading', {name:'Estamos preparando tu compra'}).waitFor();
    await advance('enviado', 'Enviado');
    await advance('entregado', 'Entregado');
    await checkBalance('Por cobrar', amounts);
    await admin.goto(origin + '/admin/pedidos');
    await admin.getByRole('button', {name:orderButton, exact:true}).click();
    await admin.getByLabel('Comprobante del cobro recibido').fill('COBRO-PRUEBA');
    await admin.getByRole('button', {name:'Registrar cobro', exact:true}).click();
    await admin.getByLabel('Comprobante del reembolso total realizado').waitFor();
    await checkBalance('Cobrado', amounts);
    await admin.goto(origin + '/admin/dashboard');
    const report = admin.getByRole('region', {name:'Medición del piloto'});
    const cost = report.getByLabel('Costo variable del pedido ' + pedido.id);
    await cost.waitFor();
    assert.equal(await cost.inputValue(), '');
    const reportRow = report.getByRole('row').filter({has:admin.getByLabel('Costo variable del pedido ' + pedido.id)});
    await reportRow.getByRole('cell', { name:'Sin determinar', exact:true }).waitFor();
    await cost.fill('0');
    await reportRow.getByRole('button', {name:'Guardar', exact:true}).click();
    await reportRow.locator('td:last-child').filter({hasText:'$7.00'}).waitFor();
    await cost.fill('2.50');
    await reportRow.getByRole('button', {name:'Guardar', exact:true}).click();
    await reportRow.getByRole('cell', { name:/4\.50/ }).waitFor();
    await admin.goto(origin + '/admin/pedidos');
    await admin.getByRole('button', {name:orderButton, exact:true}).click();
    await admin.getByLabel('Comprobante del reembolso total realizado').fill('REEMBOLSO-PRUEBA');
    await admin.getByRole('button', {name:'Registrar reembolso total', exact:true}).click();
    await admin.getByText('Reembolsado', {exact:true}).waitFor();
    await checkBalance('Reembolsado', amounts);
    await checkBalance('Cobrado', empty);
    assert.equal(await stock(), '3');
    await admin.goto(origin + '/admin/dashboard');
    await reportRow.locator('td:last-child').filter({hasText:/-2\.50/}).waitFor();
    const [[data]] = await pool.query('SELECT checkout_segundos,costo_variable FROM pedido WHERE id=?',[pedido.id]);
    assert.ok(Number.isInteger(data.checkout_segundos));
    assert.equal(data.costo_variable,'2.50');
    console.log('OK · Costal 4 a 3 · Folio compartido · $414.12 por cobrar, cobrado y reembolsado · Comisión $7 · Costo $2.50 · Margen cobrado $4.50 · Tiempo de compra registrado.');
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
}
run().catch(e => { console.error(e.message); process.exitCode = 1; });

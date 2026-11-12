const assert = require('node:assert/strict');
const path = require('node:path');

// Tres sesiones reales de navegador, API en loopback y datos sintéticos.
module.exports = async function verificarEnvio({ buyer, seller, admin, origin, stock, pool, paqueteria }) {
  const fruta = paqueteria !== 'Castores';
  const guia = fruta ? '123456789012' : 'ABC-12345';
  assert.equal(await stock(), '4');
  await buyer.getByRole('checkbox',{name:fruta ? 'Frutas y verduras' : 'Semillas',exact:true}).check();
  await buyer.getByRole('article',{name:fruta ? /Manzanas de prueba/ : /Semilla de calabaza/}).getByRole('button',{name:/Agregar/}).click();
  await buyer.getByRole('button',{name:/^Carrito,/}).click();
  const cart = buyer.getByRole('dialog',{name:'Mi carrito'});
  await cart.getByLabel('Forma de entrega').selectOption({label:'Envío a domicilio'});
  await cart.getByLabel('Método de pago').selectOption('transferencia');
  await cart.getByText(fruta ? /verificará con FedEx o DHL/ : 'Envío estimado · $247.00 MXN').waitFor();
  assert.equal(await cart.getByRole('button',{name:/cotiz/i}).count(),0);
  const posted = buyer.waitForResponse(r => r.url().endsWith('/api/pedidos') && r.request().method() === 'POST');
  await cart.getByRole('button',{name:'Confirmar pedido'}).click();
  const created = await posted;
  assert.equal(created.status(),201);
  const { pedido } = await created.json();
  const id = pedido.id;
  assert.equal(pedido.total,fruta ? '118.32' : '414.12');
  assert.equal(pedido.flete_estimado,fruta ? null : '247.00');
  await buyer.waitForURL(origin+'/mis-pedidos?pedido_id='+id);
  if (!fruta) assert.equal(await stock(), '3');
  const verPedido = { name:'Ver pedido #' + id, exact:true };
  await admin.goto(origin+'/admin/pedidos');
  await admin.getByRole('button',verPedido).click();
  await admin.getByLabel('Comprobante del cobro recibido').fill('DEPÓSITO DE PRUEBA');
  await admin.getByRole('button',{name:'Registrar cobro',exact:true}).click();
  await admin.getByLabel('Comprobante del reembolso total realizado').waitFor();
  await seller.goto(origin+'/vendedor/pedidos');
  await seller.getByRole('button',verPedido).click();
  await seller.getByRole('button',{name:'Registrar flete final'}).click();
  await seller.getByLabel('Paquetería',{exact:true}).selectOption(paqueteria);
  if (fruta) {
    await seller.getByLabel('Servicio y plazo de entrega').fill('Servicio de prueba, 24 h');
    await seller.getByLabel(/Confirmé que el servicio acepta/).check();
  }
  await seller.getByLabel('Flete final al destinatario (MXN)').fill('250.00');
  await seller.getByLabel('Referencia de '+paqueteria).fill('COT-PRUEBA');
  await seller.getByRole('button',{name:'Guardar flete'}).click();
  await seller.getByText(/Pendiente de autorización del comprador/).waitFor();
  assert.ok(await seller.getByRole('button',{name:'Registrar despacho'}).isDisabled());
  await buyer.reload();
  await buyer.getByRole('button',{name:'Autorizar flete de $250.00 MXN'}).click();
  await buyer.getByText('Importe autorizado por el comprador.').waitFor();
  await seller.goto(origin+'/vendedor/pedidos');
  await seller.getByRole('button',verPedido).click();
  await seller.getByRole('button',{name:'Registrar despacho'}).click();
  await seller.getByLabel(fruta ? 'Guía de '+paqueteria : 'Guía o talón de Castores').fill(guia);
  await seller.getByRole('button',{name:'Guardar despacho'}).click();
  await seller.getByText(guia,{exact:true}).waitFor();

  await buyer.reload();
  const principal = buyer.getByRole('main');
  await principal.getByRole('link',{name:'Mis pedidos',exact:true}).click();
  await principal.getByRole('heading',{name:fruta ? 'Manzanas de prueba' : 'Semilla de calabaza de prueba'}).waitFor();
  await principal.getByRole('link',verPedido).click();
  await principal.getByRole('heading',{name:'Tu compra ya está en camino'}).waitFor();
  if (process.argv.includes('--captura-pedidos')) {
    await buyer.setViewportSize({width:1378,height:910});
    await buyer.screenshot({path:path.join(__dirname,'../.audit/pedido-escritorio.png'),animations:'disabled'});
    await buyer.setViewportSize({width:390,height:844});
    await buyer.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    const hastaPedido = await principal.evaluate(el => Math.ceil(el.getBoundingClientRect().bottom + scrollY));
    await buyer.screenshot({path:path.join(__dirname,'../.audit/pedido-movil.png'),animations:'disabled',fullPage:true,
      clip:{x:0,y:0,width:390,height:hastaPedido}});
    assert.ok(await principal.evaluate(el => el.scrollWidth <= innerWidth));
  }
  await buyer.getByRole('button',{name:'Detalle del envío'}).click();
  const seguimiento = buyer.getByRole('region',{name:'Seguimiento con '+paqueteria});
  await seguimiento.getByText(guia,{exact:true}).waitFor();
  const host = {FedEx:'www.fedex.com',DHL:'www.dhl.com',Castores:'www.castores.com.mx'}[paqueteria];
  assert.equal(new URL(await seguimiento.getByRole('link',{name:'rastreador oficial de '+paqueteria}).getAttribute('href')).hostname,host);
  await seguimiento.getByRole('button',{name:'Confirmar recepción'}).click();
  await seguimiento.getByLabel('Nombre de quien recibió').fill('Tienda de prueba');
  await seguimiento.getByLabel('Referencia del acuse de entrega').fill('REM-DEMO-01');
  await seguimiento.getByRole('button',{name:'Guardar recepción'}).click();
  await seguimiento.getByText(/REM-DEMO-01/).waitFor();
  await buyer.setViewportSize({width:390,height:844});
  await seguimiento.getByText(/REM-DEMO-01/).waitFor();
  assert.ok(await seguimiento.evaluate(el => el.getBoundingClientRect().right <= window.innerWidth+1));
  if (!fruta && process.argv.includes('--captura')) {
    await seguimiento.screenshot({path:path.join(__dirname,'seguimiento-castores.png'),animations:'disabled'});
  }

  await admin.goto(origin+'/admin/dashboard');
  const tabla = admin.getByRole('region',{name:'Medición del piloto'});
  const costo = tabla.getByLabel('Costo variable del pedido ' + id);
  const fila = tabla.getByRole('row').filter({has:admin.getByLabel('Costo variable del pedido ' + id)});
  await costo.fill('2.50');
  await costo.locator('..').getByRole('button',{name:'Guardar',exact:true}).click();
  await fila.locator('td:last-child').filter({hasText:fruta ? '0.50' : '$4.50'}).waitFor();
  const [[row]] = await pool.execute('SELECT flete,costo_flete_real,importe_destino,acuse FROM cotizacion_castores c JOIN flete_domicilio d ON d.cotizacion_id=c.id WHERE pedido_id=?',[id]);
  assert.deepEqual(row,{flete:null,costo_flete_real:null,importe_destino:'250.00',acuse:'REM-DEMO-01'});
  console.log('OK · '+paqueteria+' · pedido $'+pedido.total+' · flete autorizado $250 en destino · guía y acuse.');
};

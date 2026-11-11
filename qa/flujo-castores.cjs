const assert = require('node:assert/strict');
const path = require('node:path');

// Tres sesiones reales de navegador, API en loopback y datos sintéticos.
module.exports = async function verificarCastores({ buyer, seller, admin, origin, stock, pool }) {
  assert.equal(await stock(), '4');
  await buyer.getByRole('checkbox',{name:'Semillas',exact:true}).check();
  await buyer.getByRole('article',{name:/Semilla de calabaza/}).getByRole('button',{name:/Agregar/}).click();
  await buyer.getByRole('button',{name:/^Carrito,/}).click();
  const cart = buyer.getByRole('dialog',{name:'Mi carrito'});
  await cart.getByLabel('Forma de entrega').selectOption('castores');
  await cart.getByLabel('Método de pago').selectOption('transferencia');
  assert.ok(await cart.getByRole('button',{name:'Confirmar pedido'}).isDisabled());
  await cart.getByRole('button',{name:'Solicitar cotización'}).click();
  await cart.getByText(/En espera del proveedor/).waitFor();

  await seller.goto(origin + '/vendedor/pedidos');
  await seller.getByText('Cotizaciones de flete · Castores',{exact:true}).click();
  const solicitud = seller.getByRole('article').filter({hasText:'Semilla de calabaza'});
  await solicitud.getByLabel('CP de origen').fill('72000');
  await solicitud.getByLabel('Flete final de Castores (MXN)').fill('80.00');
  await solicitud.getByLabel('Referencia de la cotización').fill('COTIZACIÓN DE PRUEBA');
  await solicitud.getByLabel('Servicio y plazo estimado').fill('Entrega a domicilio · ejemplo de 2 días');
  await solicitud.getByLabel('Válida hasta').fill(new Date(Date.now()+172800000).toISOString().slice(0,10));
  const overhead = solicitud.getByLabel('Otros costos previstos de la plataforma (MXN)');
  await overhead.fill('8');
  await solicitud.getByRole('checkbox').check();
  assert.ok(await solicitud.getByRole('button',{name:'Publicar cotización'}).isDisabled());
  await overhead.fill('2.50');
  await solicitud.getByRole('button',{name:'Publicar cotización'}).click();
  await solicitud.getByText(/Flete publicado/).waitFor();
  await cart.getByRole('button',{name:'Actualizar cotización'}).click();
  await cart.getByText(/494.12/).waitFor();
  const posted = buyer.waitForResponse(r => r.url().endsWith('/api/pedidos') && r.request().method() === 'POST');
  await cart.getByRole('button',{name:'Confirmar pedido'}).click();
  const created = await posted;
  assert.equal(created.status(),201);
  const { pedido } = await created.json();
  const id = pedido.id;
  assert.equal(pedido.total,'494.12');
  await buyer.waitForURL(origin+'/mis-pedidos?pedido_id='+id);
  assert.equal(await stock(), '3');
  const verPedido = { name:'Ver pedido #' + id, exact:true };
  await admin.goto(origin+'/admin/pedidos');
  await admin.getByRole('button',verPedido).click();
  await admin.getByLabel('Comprobante del cobro recibido').fill('DEPÓSITO DE PRUEBA');
  await admin.getByRole('button',{name:'Registrar cobro',exact:true}).click();
  await admin.getByLabel('Comprobante del reembolso total realizado').waitFor();
  await seller.goto(origin+'/vendedor/pedidos');
  await seller.getByRole('button',verPedido).click();
  await seller.getByRole('button',{name:'Registrar despacho'}).click();
  await seller.getByLabel('Guía o talón de Castores').fill('ABC-12345');
  await seller.getByLabel('Costo real del flete (MXN)').fill('82.00');
  await seller.getByRole('button',{name:'Guardar despacho'}).click();
  await seller.getByText('ABC-12345',{exact:true}).waitFor();

  await buyer.reload();
  const seguimiento = buyer.getByRole('region',{name:'Seguimiento con Castores'});
  await seguimiento.getByText('ABC-12345',{exact:true}).waitFor();
  assert.equal(new URL(await seguimiento.getByRole('link',{name:'rastreador oficial de Castores'}).getAttribute('href')).hostname,'www.castores.com.mx');
  await seguimiento.getByRole('button',{name:'Confirmar recepción'}).click();
  await seguimiento.getByLabel('Nombre de quien recibió').fill('Tienda de prueba');
  await seguimiento.getByLabel('Referencia del acuse de entrega').fill('REM-DEMO-01');
  await seguimiento.getByRole('button',{name:'Guardar recepción'}).click();
  await seguimiento.getByText(/REM-DEMO-01/).waitFor();
  await buyer.setViewportSize({width:390,height:844});
  await seguimiento.getByText(/REM-DEMO-01/).waitFor();
  assert.ok(await seguimiento.evaluate(el => el.getBoundingClientRect().right <= window.innerWidth+1));
  if (process.argv.includes('--captura')) {
    await seguimiento.screenshot({path:path.join(__dirname,'seguimiento-castores.png'),animations:'disabled'});
  }

  await admin.goto(origin+'/admin/dashboard');
  const tabla = admin.getByRole('region',{name:'Medición del piloto'});
  const costo = tabla.getByLabel('Costo variable del pedido ' + id);
  const fila = tabla.getByRole('row').filter({has:admin.getByLabel('Costo variable del pedido ' + id)});
  await costo.fill('2.50');
  await costo.locator('..').getByRole('button',{name:'Guardar',exact:true}).click();
  await fila.locator('td:last-child').filter({hasText:'$2.50'}).waitFor();
  const [[row]] = await pool.execute('SELECT flete,costo_flete_real,acuse FROM cotizacion_castores WHERE pedido_id=?',[id]);
  assert.deepEqual(row,{flete:'80.00',costo_flete_real:'82.00',acuse:'REM-DEMO-01'});
  console.log('OK · Castores · flete mostrado y pagado $80.00 · total $494.12 · gasto de transporte $82.00 · margen $2.50 · guía y acuse visibles en celular.');
};

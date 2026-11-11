const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {testEnvironment,seed}=require('./helpers');
testEnvironment();
const pool=require('../src/config/db');
const app=require('../src/app');
const jwt=require('jsonwebtoken');
let server,url,csrf;
before(async()=>{
  await seed();
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  url=`http://127.0.0.1:${server.address().port}/api`;
  csrf=(await(await fetch(url+'/csrf-token')).json()).csrfToken;
});
async function request(path,body,user=1,method=body?'POST':'GET',extra={}) {
  const response=await fetch(url+path,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,
    ...(user?{Authorization:'Bearer '+jwt.sign({id:user},process.env.JWT_SECRET)}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json()};
}
async function checkout() {
  const result=await request('/pedidos',{direccion_id:1,items:[{producto_id:1,cantidad:1},{producto_id:2,cantidad:1}],metodo_pago:'transferencia',clave_checkout:randomUUID()});
  assert.equal(result.status,201);return result.data;
}
test('compra pagada → recepción del dueño → reseña verificada visible sin Pro',async()=>{
  const sale=await checkout();const id=sale.pedido.id;
  const detail=(await request('/pedidos/'+id)).data;
  const body={pedido_item_id:detail.items[0].id,calidad:5,servicio:4,comentario:'Buen producto y entrega puntual.'};
  assert.equal((await request(`/pedidos/${id}/entregado`,{},null)).status,401);
  assert.equal((await request(`/pedidos/${id}/entregado`,{},2)).status,403);
  assert.equal((await request(`/pedidos/${id}/entregado`,{},4)).status,403);
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,409);
  assert.equal((await request(`/pedidos/${id}/resenas`,body)).status,409);
  // Use the existing admin payment flow, not a direct database status change.
  assert.equal((await request(`/pagos/${detail.pago.id}/estado`,{estado:'aprobado',referencia:'TRANSFERENCIA-RESENA-PRUEBA'},3,'PATCH')).status,200);
  assert.equal((await request(`/pedidos/${id}/resenas`,body)).status,409);
  assert.equal((await request(`/pedidos/${id}/entregado`,{},1,'POST',{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,409);
  assert.equal((await request(`/pedidos/${id}/estado`,{estado:'enviado'},3,'PATCH')).status,200);
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,409);
  assert.equal((await request(`/pedidos/${id}/estado`,{estado:'entregado'},3,'PATCH')).status,200);
  assert.equal((await request(`/pedidos/${id}/resenas`,body)).status,409);
  const beforeConfirm=(await request('/pedidos/'+id)).data;
  assert.equal(beforeConfirm.pedido.recibido_cliente_en,null);
  const stockBefore=(await pool.query('SELECT stock FROM inventario WHERE producto_id=1'))[0][0].stock;
  const deliveries=await Promise.all([request(`/pedidos/${id}/entregado`,{}),request(`/pedidos/${id}/entregado`,{})]);
  assert.ok(deliveries.every(r=>r.status===200));
  const delivered=(await request('/pedidos/'+id)).data;
  assert.equal(delivered.pedido.estado,'entregado');assert.equal(delivered.envio.estado,'entregado');assert.ok(delivered.pedido.recibido_cliente_en);
  assert.equal(delivered.envio.fecha_entrega,beforeConfirm.envio.fecha_entrega);
  await request(`/pedidos/${id}/entregado`,{});
  assert.equal((await request('/pedidos/'+id)).data.pedido.recibido_cliente_en,delivered.pedido.recibido_cliente_en);
  assert.equal((await pool.query('SELECT stock FROM inventario WHERE producto_id=1'))[0][0].stock,stockBefore);
  for(const bad of [{calidad:0},{calidad:6},{calidad:4.5},{servicio:'5'},{comentario:'a'.repeat(1001)},{comentario:{}}]) {
    assert.equal((await request(`/pedidos/${id}/resenas`,{...body,...bad})).status,400);
  }
  assert.equal((await request(`/pedidos/${id}/resenas`,body,2)).status,403);
  assert.equal((await request(`/pedidos/${id}/resenas`,body,4)).status,403);
  assert.equal((await request(`/pedidos/${id}/resenas`,{...body,pedido_item_id:999999})).status,404);
  const responses=await Promise.all([request(`/pedidos/${id}/resenas`,body),request(`/pedidos/${id}/resenas`,body)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
  assert.equal((await request(`/pedidos/${id}/resenas`,{...body,calidad:1})).status,409);
  assert.equal((await request(`/pedidos/${id}/resenas`)).data.length,1);
  assert.equal((await request(`/pedidos/${id}/resenas`,null,2)).status,403);
  const productId=detail.items[0].producto_id;
  const publicReviews=await request(`/productos/${productId}/resenas`,null,null);
  assert.equal(publicReviews.status,200);assert.equal(publicReviews.data.resumen.total,1);
  assert.equal(Number(publicReviews.data.resumen.calidad),5);
  assert.equal(publicReviews.data.resenas[0].comentario,body.comentario);
  assert.deepEqual(Object.keys(publicReviews.data.resenas[0]).sort(),['calidad','comentario','creado_en','id','servicio']);
  const product=(await request('/productos',null,null)).data.find(p=>p.id===productId);
  assert.equal(product.proveedor_pro,0);assert.equal(product.resenas_total,1);assert.equal(Number(product.calidad_promedio),5);
  // Other purchased product/provider can independently be reviewed.
  assert.equal((await request(`/pedidos/${id}/resenas`,{pedido_item_id:detail.items[1].id,calidad:3,servicio:5})).status,201);
  assert.equal((await request(`/productos/${productId}/resenas?antes=bad`,null,null)).status,400);
  await pool.query('UPDATE producto SET activo=0 WHERE id=?',[productId]);
  assert.equal((await request(`/productos/${productId}/resenas`,null,null)).status,404);
  assert.equal((await request(`/pedidos/${id}/resenas`)).data.length,2);
  await pool.query('UPDATE producto SET activo=1 WHERE id=?',[productId]);
  const supplierId = (await pool.query('SELECT proveedor_id FROM producto WHERE id=?',[productId]))[0][0].proveedor_id;
  const profile = await request(`/proveedores/${supplierId}/perfil`,null,null);
  assert.equal(profile.status,200);
  assert.equal(profile.data.resumen.total,1);
  assert.equal(Number(profile.data.resumen.servicio),4);
  assert.equal(profile.data.proveedor.proveedor_pro,0);
  assert.deepEqual(Object.keys(profile.data.proveedor).sort(),['id','nombre','proveedor_pro']);
  assert.deepEqual(Object.keys(profile.data.resenas[0]).sort(),['calidad','comentario','creado_en','id','producto_nombre','servicio']);
  assert.equal((await request(`/proveedores/${supplierId}/perfil?antes=${profile.data.resenas[0].id}`,null,null)).data.resenas.length,0);
  assert.equal((await request('/proveedores/999999/perfil',null,null)).status,404);
  assert.equal((await request(`/proveedores/${supplierId}/perfil?antes=bad`,null,null)).status,400);
  await pool.query('INSERT INTO membresia (proveedor_id,vence_en) VALUES (?,TIMESTAMPADD(DAY,30,UTC_TIMESTAMP(3)))',[supplierId]);
  assert.equal((await request(`/proveedores/${supplierId}/perfil`,null,null)).data.proveedor.proveedor_pro,1);
  await pool.query('UPDATE membresia SET vence_en=TIMESTAMPADD(DAY,-1,UTC_TIMESTAMP(3)) WHERE proveedor_id=?',[supplierId]);
  assert.equal((await request(`/proveedores/${supplierId}/perfil`,null,null)).data.proveedor.proveedor_pro,0);
});
test('pedido cancelado y artículo de otro pedido no permiten reseñas',async()=>{
  const sale=await checkout();const id=sale.pedido.id;
  assert.equal((await request(`/pedidos/${id}/cancelar`,{})).status,200);
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,409);
  const item=(await request('/pedidos/'+id)).data.items[0];
  assert.equal((await request(`/pedidos/${id}/resenas`,{pedido_item_id:item.id,calidad:5,servicio:5})).status,409);
  const [[delivered]]=await pool.query("SELECT id FROM pedido WHERE estado='entregado' LIMIT 1");
  assert.equal((await request(`/pedidos/${delivered.id}/resenas`,{pedido_item_id:item.id,calidad:5,servicio:5})).status,404);
});
test('el vendedor marca enviado y entregado; solo después confirma el comprador',async()=>{
  const sale=await request('/pedidos',{direccion_id:1,items:[{producto_id:1,cantidad:1}],metodo_pago:'transferencia',clave_checkout:randomUUID()});
  assert.equal(sale.status,201);
  const id=sale.data.pedido.id;
  const detail=(await request('/pedidos/'+id)).data;
  await request(`/pagos/${detail.pago.id}/estado`,{estado:'aprobado',referencia:'TRANSFERENCIA-RESENA-PRUEBA'},3,'PATCH');
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,409);
  assert.equal((await request(`/pedidos/${id}/estado`,{estado:'enviado'},4,'PATCH')).status,200);
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,409);
  assert.equal((await request(`/pedidos/${id}/estado`,{estado:'entregado'},4,'PATCH')).status,200);
  assert.equal((await request(`/pedidos/${id}/entregado`,{},4)).status,403);
  assert.equal((await request(`/pedidos/${id}/entregado`,{})).status,200);
  assert.equal((await request(`/pedidos/${id}/resenas`,{pedido_item_id:detail.items[0].id,calidad:5,servicio:5})).status,201);
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  await pool.end();
  const conn=await require('mysql2/promise').createConnection({host:'127.0.0.1',port:3318,user:'root'});
  await conn.query(`DROP DATABASE \`${process.env.DB_NAME}\``);await conn.end();
});

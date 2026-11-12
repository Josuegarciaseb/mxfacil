import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../src/components/ui/Modal";
import { cartTotals } from "../src/utils/cart";
import { direcciones, fecha, pesos } from "./datos";
import { Glyph } from "./Grafica";
import { Encabezado, Estado, Foto, SinDatos } from "../src/components/vendedor/Ventas";

export function ElegirDireccion({ actual, elegir, cerrar }) {
  return <Modal open title="Dirección de entrega" onClose={cerrar}><p className="intro-dialogo">Elige una dirección de ejemplo para tus compras.</p>
    <div className="direcciones">{direcciones.map(d=><button key={d.id} aria-pressed={d.id===actual.id} onClick={()=>{elegir(d);cerrar();}}>
      <Glyph name="mapPin"/><span><strong>{d.nombre}</strong><small>{d.calle} · {d.ciudad}, CP {d.cp}</small></span>{d.id===actual.id&&<Glyph name="check" size={16}/>}</button>)}</div></Modal>;
}
function Articulos({ items, editar }) {
  const { lines } = cartTotals(items);
  return <div className="lineas-compra">{items.map(p=><div key={p.id}><Foto producto={p}/><div className="linea-nombre"><strong>{p.nombre}</strong><small>{p.presentacion}{!editar && " × " + p.qty}</small>
    {editar && <div className="pasos-qty"><button aria-label={"Restar una unidad de " + p.nombre} onClick={()=>editar(p,-1)}>−</button><span>{p.qty}</span>
      <button aria-label={"Sumar una unidad de " + p.nombre} disabled={p.qty>=p.stock} onClick={()=>editar(p,1)}>+</button></div>}</div><strong>{pesos(lines[p.id])}</strong></div>)}</div>;
}
function ImportesCompra({ datos }) {
  return <dl className="importes"><div><dt>Subtotal</dt><dd>{pesos(datos.subtotal)}</dd></div>
    <div><dt>IVA</dt><dd>{pesos(datos.iva)}</dd></div><div><dt>Total en MXN</dt><dd>{pesos(datos.total)}</dd></div></dl>;
}
export function Carrito({ items, setItems, direccion, elegir, confirmar, cerrar }) {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const editar = (item, cambio) => setItems(list=>list.map(p=>p.id===item.id ? {...p,qty:Math.min(p.stock,p.qty+cambio)} : p).filter(p=>p.qty>0));
  return <Modal open title={paso===1 ? "Mi carrito" : "Revisar compra de ejemplo"} onClose={cerrar}>
    {!items.length ? <SinDatos titulo="Tu carrito está vacío"><p>Agrega un producto del catálogo para probar una compra.</p>
      <button className="boton boton-bosque" onClick={()=>{cerrar();navigate("/catalogo");}}>Explorar el catálogo</button></SinDatos> : <>
      <Articulos items={items} editar={paso===1 ? editar : null}/>
      {paso===2 && <label className="campo-destino">Enviar a<select value={direccion.id} onChange={e=>elegir(direcciones.find(d=>d.id===Number(e.target.value)))}>
        {direcciones.map(d=><option key={d.id} value={d.id}>{d.nombre} · CP {d.cp}</option>)}</select><small>{direccion.calle} · {direccion.ciudad}</small></label>}
      <ImportesCompra datos={cartTotals(items)}/><p className="aviso-demo"><Glyph name="info" size={16}/>Compra simulada. No se hará ningún cargo ni envío.</p>
      <div className="acciones-dialogo">{paso===2 && <button className="boton boton-claro" onClick={()=>setPaso(1)}>Volver</button>}
        <button className="boton boton-bosque" onClick={()=>{if(paso===1){setPaso(2);return;}confirmar();}}>{paso===1 ? "Revisar compra" : "Confirmar pedido de ejemplo"}<Glyph name="arrowRight" size={16}/></button></div>
    </>}</Modal>;
}
export function MisCompras({ compras }) {
  const [detalle,setDetalle] = useState(null);
  return <div className="compras-contenido"><Encabezado kicker="MI CUENTA DE CLIENTE" title="Mis compras" text="Aquí aparecen los pedidos que tú hiciste en el catálogo."
    action={<Link to="/catalogo" className="boton boton-claro">Explorar el catálogo <Glyph name="arrowRight" size={15}/></Link>}/>
    <section className="superficie"><div className="actividad-cab"><div><p className="ceja con-linea">PEDIDOS PERSONALES</p><h2>Historial de compras</h2></div></div>
      <div className="historial">{compras.map(c=><article key={c.id}><Foto producto={c.items[0]}/><div className="historial-nombre"><strong>Compra #{c.id}</strong>
        <small>{c.items[0].nombre}{c.items.length>1 ? " y " + (c.items.length-1) + " más" : ""} · {fecha(c.fecha)}</small></div><Estado value={c.estado}/><strong>{pesos(c.total)}</strong>
        <button className="boton-icono" aria-label={"Ver compra #" + c.id} onClick={()=>setDetalle(c)}><Glyph name="chevronRight" size={16}/></button></article>)}</div>
    </section>{detalle && <Modal open title={"Compra #" + detalle.id} onClose={()=>setDetalle(null)}><Articulos items={detalle.items}/>
      <ImportesCompra datos={detalle}/><p className="aviso-demo"><Glyph name="mapPin" size={16}/>{detalle.direccion.nombre} · {detalle.direccion.ciudad}, CP {detalle.direccion.cp}</p></Modal>}
  </div>;
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { publicPrice, gross } from "../src/utils/cart";
import Modal from "../src/components/ui/Modal";
import { Panel as PanelReal, MisVentas as ListaReal, Cobros as CobrosReales, Encabezado, Estado, Foto } from "../src/components/vendedor/Ventas";
import { estadoCobro, fecha, pesos } from "../src/utils/ventas";
import { cuenta, diaMuestra, propios, ventas, perfilPropio } from "./datos";
import { Glyph } from "./Grafica";
const columnas = [["base","Mercancía a precio base"],["comision","Comisión de plataforma"],["iva","IVA"],["flete","Flete"],["total","Importe al cliente"]];
function Detalle({ venta, cerrar }) {
  return <Modal open title={"Venta #" + venta.id} onClose={cerrar}>
    <div className="detalle-venta"><div className="detalle-sub"><span>{fecha(venta.fecha)} de {venta.fecha.slice(0,4)} · {venta.cliente}</span><Estado value={venta.estado}/></div>
      <div className="detalle-producto"><Foto producto={venta.producto}/><div><strong>{venta.producto.nombre}</strong><small>{venta.qty} × {venta.producto.presentacion}</small></div></div>
      <p className="ceja">DESGLOSE DE LA VENTA · MXN</p>
      <dl className="importes">{columnas.map(([key,title])=><div key={key}><dt>{title}</dt><dd>{pesos(venta[key])}</dd></div>)}</dl>
      <p className="nota-cobro"><Glyph name="wallet" size={17}/>{estadoCobro(venta)}</p>
    </div>
  </Modal>;
}

const rutas = { ventas:"/ventas", productos:"/productos", cobros:"/cobros" };
function Actividad({ resumen }) {
  const [detalle, setDetalle] = useState(null);
  const props = {ventas, dia:diaMuestra, onDetalle:setDetalle};
  return <>{resumen ? <PanelReal {...props} productos={propios.length} perfil={perfilPropio} rutas={rutas}/> : <ListaReal {...props}/>}
    {detalle && <Detalle venta={detalle} cerrar={()=>setDetalle(null)}/>}</>;
}
export function Panel(){return <Actividad resumen/>;}
export function MisVentas(){return <Actividad/>;}
export function Cobros(){return <CobrosReales ventas={ventas}/>;}

export function Productos() {
  return <><Encabezado kicker="INVENTARIO" title="Mis productos" text={propios.length + " productos publicados en " + cuenta.tienda + "."}
    action={<Link className="boton boton-claro" to={perfilPropio}><Glyph name="eye" size={16}/>Ver mi perfil público</Link>}/>
    <section className="superficie"><div className="actividad-cab"><div><p className="ceja con-linea">CATÁLOGO PROPIO</p><h2>Productos publicados</h2></div></div>
      <div className="productos-propios">{propios.map(p=><article key={p.id}><Foto producto={p}/><div><h3>{p.nombre}</h3><small>{p.presentacion}</small></div>
        <div><strong>{p.stock}</strong><small>Disponibles</small></div><div><strong>{pesos(gross(publicPrice(p.precio)))}</strong><small>Precio con IVA</small></div></article>)}</div></section></>;
}
export function Cuenta() {
  return <><Encabezado kicker="MI CUENTA" title="Datos de mi cuenta" text="Con esta cuenta puedes vender y comprar en el catálogo."/>
    <section className="superficie ficha-cuenta"><i className="icon-tile salvia"><Glyph name="user" size={24}/></i><h2>{cuenta.nombre}</h2>
      <dl className="importes"><div><dt>Tienda</dt><dd>{cuenta.tienda}</dd></div><div><dt>Tipo de cuenta</dt><dd>Vendedora</dd></div><div><dt>Ubicación de ejemplo</dt><dd>Puebla, México</dd></div></dl>
      <Link className="texto-link" to={perfilPropio}>Ver mi perfil público <Glyph name="arrowRight" size={15}/></Link></section></>;
}

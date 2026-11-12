import { Link, NavLink, useNavigate } from "react-router-dom";
import { Glyph } from "./Grafica";
import { seccionesDe } from "../../utils/rutasVendedor";
import "./portal.css";

export function MenuVendedor({ cuenta, rutas, perfil, cantidad, cerrar, salir, muestra }) {
  return <>
    <div className="tienda-id"><i className="insignia"><Glyph name="leaf" size={22}/></i><div><strong>{cuenta.tienda}</strong><small>Tienda de mayoreo</small></div></div>
    <nav className="navegacion" aria-label="Navegación del vendedor">{seccionesDe(rutas,perfil).map(([label,links])=><div key={label}>
      <p className="etiqueta-nav">{label}</p>{links.filter(([to])=>Boolean(to)).map(([to,icon,text])=><NavLink key={to} end to={to} onClick={cerrar}>
        <Glyph name={icon} size={17}/><span>{text}</span>{to===rutas.productos && cantidad != null && <small>{cantidad}</small>}
        {to===perfil && <i className="icono-salida"><Glyph name="outside" size={13}/></i>}</NavLink>)}</div>)}</nav>
    {salir && <button className="salir-cuenta" onClick={()=>{cerrar?.();salir();}}><Glyph name="logout" size={17}/>Cerrar sesión</button>}
    {muestra && <p className="sello-demo"><i aria-hidden="true"/><span>Vista previa<small>Datos de ejemplo</small></span></p>}
  </>;
}

export function CabeceraVendedor({ comprador, cuenta, rutas, abrirMenu }) {
  return <header className="mastil"><div className="mastil-izq">
      {!comprador && <button className="abre-menu" aria-label="Abrir navegación del vendedor" aria-haspopup="dialog" onClick={abrirMenu}><Glyph name="menu" size={21}/></button>}
      <Link className="marca" to={comprador?"/catalogo":rutas.panel} aria-label={comprador?"Comercio Fácil, ir al catálogo":"Comercio Fácil, ir al panel"}><img src="/logo.svg" alt=""/><span>Comercio <b>Fácil</b></span></Link>
      <span className="division-marca"/><span className="mastil-zona">{comprador ? "Mercado de mayoreo" : "Central de vendedores"}</span></div>
      <div className="mastil-der"><Link className="cambia-modo" to={comprador ? rutas.panel : "/catalogo"} aria-label={comprador ? "Volver a mi panel" : "Comprar como cliente"}>
        <Glyph name={comprador?"dashboard":"shoppingBag"} size={16}/><span className="modo-amplio">{comprador ? "Volver a mi panel" : "Comprar como cliente"}</span><span className="modo-corto">{comprador ? "Mi panel" : "Ver catálogo"}</span><span className="salida"><Glyph name={comprador?"arrowRight":"outside"} size={14}/></span></Link>
        <Link to={rutas.cuenta} className="identidad" aria-label={"Datos de la cuenta de " + cuenta.nombre}><span className="avatar">{cuenta.iniciales}</span><span><strong>{cuenta.nombre}</strong><small>{comprador ? "Vista de cliente" : "Cuenta de vendedor"}</small></span></Link>
      </div></header>;
}
export function BarraCompras({ busqueda, buscar, carrito, abrirCarrito, direccion, abrirDirecciones, pedidos }) {
  const navigate = useNavigate();
  return <div className="barra-compras"><div className="barra-compras-inner">
    <nav aria-label="Opciones de compra"><NavLink to="/catalogo">Catálogo</NavLink><NavLink to={pedidos}>Mis compras</NavLink></nav>
    <form role="search" onSubmit={e=>{e.preventDefault();navigate("/catalogo");}}><button aria-label="Buscar en el catálogo"><Glyph name="search" size={17}/></button>
      <input type="search" aria-label="Buscar productos" placeholder="Buscar productos al mayoreo…" value={busqueda} onChange={e=>buscar(e.target.value)}/></form>
    <button className="direccion-btn" onClick={abrirDirecciones} aria-label={direccion ? "Elegir dirección, CP " + direccion.cp : "Elegir dirección de entrega"}><Glyph name="mapPin" size={16}/><span>{direccion ? "CP " + direccion.cp : "Elegir dirección"}</span></button>
    <button className="carrito-btn" onClick={abrirCarrito}><Glyph name="cart" size={17}/>Carrito <b>{carrito.reduce((n,i)=>n+i.qty,0)}</b></button>
  </div></div>;
}

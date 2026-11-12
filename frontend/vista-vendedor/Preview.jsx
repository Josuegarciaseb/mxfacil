import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ClientCatalogo from "../src/pages/client/Catalogo";
import ProveedorPublico from "../src/pages/client/ProveedorPublico";
import ToastContainer from "../src/components/ui/ToastContainer";
import Modal from "../src/components/ui/Modal";
import { toast } from "../src/utils/toast";
import { cartTotals } from "../src/utils/cart";
import { Carrito, ElegirDireccion, MisCompras } from "./Compras";
import { Cobros, Cuenta, MisVentas, Panel, Productos } from "./Ventas";
import { comprasIniciales, cuenta, diaMuestra, direcciones, perfilPropio, propios } from "./datos";
import { Glyph } from "./Grafica";
import { BarraCompras, CabeceraVendedor, MenuVendedor } from "../src/components/vendedor/Navegacion";
import { seccionesDe } from "../src/utils/rutasVendedor";
import MembresiaMuestra from "./MembresiaMuestra";
import "../src/styles/marketplace.css";
import "./vista.css";

const rutas = {panel:"/",ventas:"/ventas",productos:"/productos",cobros:"/cobros",membresia:"/membresia",cuenta:"/cuenta",compras:"/mis-compras"};
const secciones = seccionesDe(rutas,perfilPropio);
const propsMenu = { cuenta, rutas, perfil:perfilPropio, cantidad:propios.length, muestra:true };
const marcas = Object.fromEntries(secciones.flatMap(([,links])=>links.map(([path,,label])=>[path,label])));
const sello = (key, fallback) => {
  try { const value = JSON.parse(sessionStorage.getItem("mx-previa-vendedor-v1:" + key)); return value ?? fallback; }
  catch { return fallback; }
};
function useDemoState(key, fallback) {
  const [value, setValue] = useState(()=>sello(key,fallback));
  useEffect(()=>{try{sessionStorage.setItem("mx-previa-vendedor-v1:" + key, JSON.stringify(value));}catch{/* La vista también funciona sin almacenamiento. */}},[key,value]);
  return [value,setValue];
}
export default function Preview() {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const comprador = pathname === "/catalogo" || pathname === "/mis-compras" || pathname.startsWith("/proveedores/");
  const [menu,setMenu] = useState(false);
  const [dialogo,setDialogo] = useState("");
  const [busqueda,buscar] = useState("");
  const [carrito,setCarrito] = useDemoState("carrito",[]);
  const [compras,setCompras] = useDemoState("compras",comprasIniciales);
  const [direccion,setDireccion] = useDemoState("direccion",direcciones[0]);
  const titulo = marcas[pathname] || "Perfil público";
  useEffect(()=>{document.title=(pathname==="/"?"Panel de ventas":titulo)+" · Comercio Fácil · Vista previa";window.scrollTo(0,0);},[pathname,titulo]);

  function confirmar() {
    if (!carrito.length) return;
    const id = Math.max(...compras.map(c=>c.id),500) + 1;
    setCompras(prev=>[{ id, fecha:diaMuestra, items:carrito, estado:"pendiente", direccion, ...cartTotals(carrito) },...prev]);
    setCarrito([]);setDialogo("");navigate("/mis-compras");toast("Compra de ejemplo #" + id + " registrada.");
  }
  // Dos enlaces HTML de las vistas públicas viven normalmente en la raíz del
  // sitio. Aquí se quedan en el mismo archivo, incluso si se abre sin servidor.
  function enlacesPublicos(event) {
    const href = event.target.closest?.("a")?.getAttribute("href");
    if (/^\/proveedores\/\d+$/.test(href || "")) {event.preventDefault();navigate(href);}
    if (href==="#seller-products") {event.preventDefault();document.getElementById("seller-products")?.scrollIntoView();}
  }
  return <div className="previa" onClick={enlacesPublicos}>
    <a className="saltar" href="#contenido" onClick={e=>{e.preventDefault();document.getElementById("contenido")?.focus();}}>Saltar al contenido</a>
    <CabeceraVendedor comprador={comprador} rutas={rutas} cuenta={cuenta} abrirMenu={()=>setMenu(true)}/>
    {comprador ? <><BarraCompras pedidos={rutas.compras} busqueda={busqueda} buscar={buscar} carrito={carrito} abrirCarrito={()=>setDialogo("carrito")}
      direccion={direccion} abrirDirecciones={()=>setDialogo("direccion")}/>
      <main id="contenido" tabIndex="-1" className="vista-comprador marketplace">
        <Routes><Route path="/catalogo" element={<ClientCatalogo setCart={setCarrito} cart={carrito} externalSearch={busqueda} onSearchChange={buscar}/>}/>
          <Route path="/proveedores/:id" element={<ProveedorPublico setCart={setCarrito} cart={carrito}/>}/>
          <Route path="/mis-compras" element={<MisCompras compras={compras}/>}/></Routes>
      </main><p className="pie-comprador"><span className="punto-demo"/>Vista previa de Comercio Fácil · Datos de ejemplo</p></> :
      <div className="marco"><aside className="lateral"><MenuVendedor {...propsMenu}/></aside>
        <main id="contenido" tabIndex="-1" className="principal"><div className="principal-interior">
          <div className="miga"><span><Glyph name="shop" size={15}/>Mi negocio <Glyph name="chevronRight" size={11}/> <b>{titulo}</b></span>
            <time dateTime={diaMuestra}><Glyph name="calendar" size={14}/>12 nov 2026</time><span className="demo-movil"><i className="punto-demo"/>Datos de ejemplo</span></div>
          <Routes><Route path="/" element={<Panel/>}/><Route path="/ventas" element={<MisVentas/>}/><Route path="/productos" element={<Productos/>}/>
            <Route path="/cobros" element={<Cobros/>}/><Route path="/membresia" element={<MembresiaMuestra/>}/><Route path="/cuenta" element={<Cuenta/>}/>
            <Route path="*" element={<Navigate to="/" replace/>}/></Routes>
        </div></main></div>}
    {menu && <Modal open title="Navegación del vendedor" onClose={()=>setMenu(false)}><MenuVendedor {...propsMenu} cerrar={()=>setMenu(false)}/></Modal>}
    {dialogo==="carrito" && <Carrito items={carrito} setItems={setCarrito} direccion={direccion} elegir={setDireccion} confirmar={confirmar} cerrar={()=>setDialogo("")}/>}
    {dialogo==="direccion" && <ElegirDireccion actual={direccion} elegir={setDireccion} cerrar={()=>setDialogo("")}/>}
    <ToastContainer/>
  </div>;
}

createRoot(document.getElementById("root")).render(<HashRouter><Preview/></HashRouter>);

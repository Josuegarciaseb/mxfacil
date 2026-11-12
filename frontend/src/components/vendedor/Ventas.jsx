import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductPhoto from "../ui/ProductPhoto";
import { diaLocal, etapas, estadoCobro, fecha, grupos, gruposCobro, importe, normaliza } from "../../utils/ventas";
import { Glyph, Paisaje } from "./Grafica";

export function Estado({ value }) {
  const [label, tone] = etapas[value] || [value || 'Sin estado', 'gray'];
  return <span className={"estado " + tone}><i aria-hidden="true" />{label}</span>;
}
export function Foto({ producto }) {
  return <span className="foto-mini"><ProductPhoto name={producto.nombre} url={producto.image_url} eager /></span>;
}
export function SinDatos({ titulo, children }) {
  return <div className="sin-datos"><Glyph name="search" size={27}/><h3>{titulo}</h3>{children}</div>;
}
export function Encabezado({ kicker, title, text, action }) {
  return <div className="titulo-seccion"><div><p className="ceja">{kicker}</p><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}
function Portada({ perfil }) {
  return <section className="portada">
    <Paisaje />
    <div className="portada-copy"><p className="ceja"><i />CENTRO DE VENDEDORES</p>
      <h1>Panel de ventas</h1><p>Revisa los pedidos, envíos y cobros de tu negocio.</p>
      {perfil && <Link className="boton boton-bosque" to={perfil}><Glyph name="eye" size={16}/>Ver mi perfil público<Glyph name="arrowRight" size={15}/></Link>}
    </div>
  </section>;
}
function Indicadores({ ventas, rutas }) {
  const cards = [
    ["Pedidos recibidos", ventas.length, "receipt", "salvia", "Histórico de ventas", rutas.ventas],
    ["Por preparar", ventas.filter(grupos[1].match).length, "package", "miel", "Pendientes y en preparación", rutas.ventas+"?etapa=preparar"],
    ["En tránsito", ventas.filter(grupos[2].match).length, "truck", "cielo", "En camino al cliente", rutas.ventas+"?etapa=transito"],
    ["Por cobrar", importe(ventas.filter(v => estadoCobro(v) === "Por cobrar"), "total"), "wallet", "lila", "Importe pendiente · MXN", rutas.cobros],
  ];
  return <div className="indicadores" aria-label="Resumen de la tienda">{cards.map(([label, value, icon, tone, sub, to]) =>
    <Link className="indicador" to={to} key={label}><span className="indicador-arriba"><span>{label}</span><i className={"icon-tile " + tone}><Glyph name={icon} size={18}/></i></span>
      <strong>{value}</strong><small>{sub}</small></Link>)}</div>;
}
const columnas = [["base", "Mercancía a precio base"], ["comision", "Comisión de plataforma"], ["iva", "IVA del pedido"], ["flete", "Flete"], ["total", "Importe al cliente"]];

export function ListaVentas({ ventas, dia = diaLocal(), onDetalle, compacta = false }) {
  const [params, setParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState("");
  const [periodo, setPeriodo] = useState("todo");
  const activa = grupos.find(g=>g.key === params.get("etapa")) || grupos[0];
  const query = normaliza(busqueda).replace(/^#/, "");
  const base = ventas.filter(p => {
    const dias = (Date.parse(dia) - Date.parse(diaLocal(p.fecha))) / 86400000;
    return (periodo === "todo" || (dias >= 0 && dias < Number(periodo))) &&
      normaliza([p.id, p.cliente, p.producto.nombre].join(" ")).includes(query);
  });
  const coinciden = base.filter(activa.match);
  const limite = compacta ? 5 : 6;
  const paginas = Math.max(1, Math.ceil(coinciden.length / limite));
  const pagina = Math.max(1, Math.min(Math.trunc(Number(params.get("pagina"))) || 1, paginas));
  const filas = coinciden.slice((pagina - 1) * limite, pagina * limite);
  const irPagina = p => setParams(prev => { const next = new URLSearchParams(prev); if (p === 1) next.delete("pagina"); else next.set("pagina", p); return next; }, { replace:true });
  const filtrar = key => setParams(key === "todos" ? {} : { etapa:key }, { replace:true });
  return <section className="superficie actividad" aria-labelledby="tit-actividad">
    <div className="actividad-cab"><div><p className="ceja con-linea">SEGUIMIENTO</p><h2 id="tit-actividad">{compacta ? "Actividad de ventas" : "Pedidos recibidos"}</h2></div>
      <label className="selector-periodo"><Glyph name="calendar" size={15}/><select aria-label="Filtrar por fecha" value={periodo} onChange={e=>{setPeriodo(e.target.value);irPagina(1);}}>
        <option value="todo">Todas las fechas</option><option value="1">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select><Glyph name="chevronDown" size={13}/></label>
    </div>
    <div className="filtros-etapas" role="group" aria-label="Filtrar ventas por etapa">{grupos.map(g=><button key={g.key} aria-label={g.label + " " + base.filter(g.match).length} aria-pressed={g.key === activa.key}
      onClick={()=>filtrar(g.key)}>{g.label}<span>{base.filter(g.match).length}</span></button>)}</div>
    <div className="buscador-ventas"><label><Glyph name="search" size={16}/><input type="search" aria-label="Buscar ventas" value={busqueda}
      placeholder="Buscar por folio, cliente o producto" onChange={e=>{setBusqueda(e.target.value);irPagina(1);}}/></label><span aria-live="polite">{coinciden.length} {coinciden.length===1 ? "venta" : "ventas"}</span></div>
    {filas.length ? <div className="tabla-ventas-wrap"><table className="tabla-ventas"><thead><tr>{["Pedido / producto", "Cliente", "Fecha", "Importe", "Estado", ""].map(x=><th key={x} scope="col">{x || <span className="sr-only">Detalle</span>}</th>)}</tr></thead>
      <tbody>{filas.map(p=><tr key={p.id}>
        <td className="celda-producto"><div><Foto producto={p.producto}/><div><button className="folio" aria-label={"Ver pedido #" + p.id} onClick={()=>onDetalle(p)}>#{p.id}</button><small>{p.producto.nombre}{p.productosDistintos > 1 && " y " + (p.productosDistintos-1) + " más"}</small></div></div></td>
        <td className="celda-cliente">{p.cliente}</td><td className="celda-fecha">{fecha(p.fecha)}</td>
        <td className="celda-total">{importe([p], 'total')}</td><td className="celda-estado"><Estado value={p.estado}/></td>
        <td className="celda-abrir"><button className="boton-icono" aria-label={"Detalle de la venta #" + p.id} onClick={()=>onDetalle(p)}><Glyph name="chevronRight" size={16}/></button></td>
      </tr>)}</tbody></table></div> :
      <SinDatos titulo={ventas.length ? "No hay ventas con estos filtros" : "Sin pedidos"}>{ventas.length > 0 ? <button className="texto-link" onClick={()=>{setBusqueda("");setPeriodo("todo");filtrar("todos");}}>Limpiar filtros</button> : <p>Tus ventas aparecerán aquí cuando recibas un pedido.</p>}</SinDatos>}
    {!!filas.length && <div className="pie-tabla"><span>{(pagina-1)*limite+1}–{(pagina-1)*limite+filas.length} de {coinciden.length} ventas</span>
      <div><button className="boton-icono" aria-label="Página anterior de ventas" disabled={pagina===1} onClick={()=>irPagina(pagina-1)}><Glyph name="arrowLeft" size={15}/></button>
        <span>{pagina} / {paginas}</span><button className="boton-icono" aria-label="Página siguiente de ventas" disabled={pagina===paginas} onClick={()=>irPagina(pagina+1)}><Glyph name="arrowRight" size={15}/></button></div></div>}
    
  </section>;
}
export function Panel({ ventas, productos, perfil, dia, rutas, onDetalle }) {
  return <><Portada perfil={perfil}/><Indicadores ventas={ventas} rutas={rutas}/><ListaVentas ventas={ventas} dia={dia} onDetalle={onDetalle} compacta/>
    <div className="atajos"><Link to={rutas.productos}><i className="icon-tile salvia"><Glyph name="package"/></i><span><strong>Mis productos</strong><small>{productos == null ? "Gestionar inventario" : productos + " productos en tu inventario"}</small></span><Glyph name="chevronRight" size={17}/></Link>
      <Link to={rutas.cobros}><i className="icon-tile lila"><Glyph name="wallet"/></i><span><strong>Desglose de cobros</strong><small>Mercancía, comisión, IVA y flete</small></span><Glyph name="chevronRight" size={17}/></Link></div></>;
}
export function MisVentas({ ventas, dia, onDetalle, children }) {
  return <><Encabezado kicker="OPERACIÓN" title="Mis ventas" text="Consulta los pedidos que recibiste como vendedor."/>{children}<ListaVentas ventas={ventas} dia={dia} onDetalle={onDetalle}/></>;
}
export function Cobros({ ventas }) {
  const grupos = [...gruposCobro,...["Cobro por devolver","Por conciliar"].filter(g=>ventas.some(p=>estadoCobro(p)===g))];
  const fields = columnas.filter(([key])=>key!=="flete" || ventas.some(p=>Number(p.flete)>0));
  return <><Encabezado kicker="FINANZAS" title="Cobros de tus productos" text="Consulta tus importes por estado de cobro. Todos los montos están en pesos mexicanos."/>
    <div className="resumen-cobros">{["Por cobrar","Cobrado","Reembolsado"].map(label=><div className="superficie" key={label}><small>{label}</small>
      <strong>{importe(ventas.filter(p=>estadoCobro(p)===label),"total",label)}</strong></div>)}</div>
    <section className="superficie"><div className="actividad-cab"><div><p className="ceja con-linea">CONCILIACIÓN</p><h2>Desglose por estado de cobro</h2></div></div>
      <div className="tabla-scroll" tabIndex="0" role="region" aria-label="Desglose de importes en MXN"><table className="tabla-datos"><thead><tr><th>Estado de cobro</th><th>Folios</th>{fields.map(([k,l])=><th key={k}>{l}</th>)}</tr></thead>
        <tbody>{grupos.map(g=>{const rows=ventas.filter(p=>estadoCobro(p)===g);return <tr key={g}><th scope="row">{g}</th><td>{rows.length}</td>{fields.map(([key])=><td key={key}>{importe(rows,key,g)}</td>)}</tr>;})}</tbody></table></div>
      <p className="nota-seccion"><Glyph name="info" size={16}/>Un pedido contra entrega sigue por cobrar hasta que se registra la recepción del dinero.</p>
    </section></>;
}

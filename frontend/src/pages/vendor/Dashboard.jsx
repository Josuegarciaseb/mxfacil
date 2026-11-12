import { useCallback, useEffect, useState } from "react";
import { http } from "../../utils/api";
import { ventaDelPedido } from "../../utils/ventas";
import { rutasVendedor } from "../../utils/rutasVendedor";
import { Panel, MisVentas, Cobros } from "../../components/vendedor/Ventas";
import DetalleGestion from "../../components/vendedor/DetalleGestion";
import SolicitudesCastores from "../../components/shipping/SolicitudesCastores";
import Spinner from "../../components/ui/Spinner";

export default function VendedorDashboard({ token, perfil, cantidad, seccion = "resumen" }) {
  const [resultado, setResultado] = useState(null);
  const [seleccionado, seleccionar] = useState(null);
  const [revision, setRevision] = useState(0);
  const actualizar = useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    let active=true;
    http("/pedidos/admin",{},token).then(rows=>{if(active)setResultado({ventas:rows.map(ventaDelPedido)});})
      .catch(err=>{if(active)setResultado({error:err.message});});
    return ()=>{active=false;};
  },[token,revision,seccion]);
  if (!resultado) return <Spinner/>;
  if (resultado.error) return <p role="alert">No se pudieron cargar tus ventas. {resultado.error} <button className="btn-secondary" onClick={actualizar}>Reintentar</button></p>;
  const props = { ventas:resultado.ventas, onDetalle:p=>seleccionar(p.id) };
  return <>{seccion==="cobros" ? <Cobros ventas={resultado.ventas}/> : seccion==="ventas"
    ? <MisVentas {...props}><SolicitudesCastores token={token}/></MisVentas>
    : <Panel {...props} perfil={perfil} productos={cantidad} rutas={rutasVendedor}/>}
    {seleccionado && <DetalleGestion key={seleccionado} selected={seleccionado} token={token} onChange={actualizar} onClose={()=>seleccionar(null)}/>}
  </>;
}

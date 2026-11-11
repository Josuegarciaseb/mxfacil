import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { http } from '../../utils/api';
import ClientCatalogo from './Catalogo';
import './proveedor-publico.css';

function Stars({ value }) {
  const score = Number(value) || 0;
  return <span className="seller-stars" role="img" aria-label={`${score.toFixed(1)} de 5 estrellas`}>
    <span aria-hidden="true">☆☆☆☆☆</span><span aria-hidden="true" style={{width:`${score / 5 * 100}%`}}>★★★★★</span>
  </span>;
}

export default function ProveedorPublico(props) {
  const { id } = useParams();
  return <SellerProfile key={id} id={id} {...props} />;
}

function SellerProfile({ id, token, cart, setCart, onProductsFetched }) {
  const [data,setData] = useState(null);
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  const [busy,setBusy] = useState(false);
  useEffect(()=>{
    let active=true;
    http(`/proveedores/${id}/perfil`).then(value=>{if(active){setData(value);setError('');}})
      .catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[id,attempt]);
  async function more() {
    setBusy(true);setError('');
    try {
      const next = await http(`/proveedores/${id}/perfil?antes=${data.siguiente}`);
      setData(current=>({...next,resenas:[...current.resenas,...next.resenas]}));
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  return <div className="seller-profile">
    <Link className="seller-back" to="/catalogo">← Volver al catálogo</Link>
    {error && <p role="alert">{error} {!data && <button className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Reintentar</button>}</p>}
    {!data&&!error&&<p role="status">Cargando vendedor…</p>}
    {data&&<>
      <header className="seller-hero">
        <div className="seller-avatar" aria-hidden="true">{data.proveedor.nombre.slice(0,1).toUpperCase()}</div>
        <div><p className="seller-eyebrow">Conoce a tu vendedor</p><h1>{data.proveedor.nombre}</h1>
          {!!data.proveedor.proveedor_pro&&<span className="pro-badge">Vendedor Pro</span>}
          <p>Productos del campo para tu negocio</p>
        </div>
        <a className="btn-primary" href="#seller-products">Ver productos</a>
      </header>
      <section className="seller-reputation" aria-labelledby="seller-reviews">
        <h2 id="seller-reviews">Opiniones de sus clientes</h2>
        <p>Reseñas de compras verificadas, pagadas y recibidas.</p>
        {Number(data.resumen.total)>0?<>
          <div className="seller-scores">{[['servicio','Atención y servicio'],['calidad','Calidad de sus productos']].map(([key,label])=><div key={key}>
            <h3>{label}</h3><strong>{Number(data.resumen[key]).toFixed(1)} <small>/ 5</small></strong> <Stars value={data.resumen[key]} />
            <p>{data.resumen.total} reseñas</p>
          </div>)}</div>
          <div className="seller-opinions">{data.resenas.map(review=><article key={review.id}>
            <p className="seller-verified">Compra verificada · {new Date(review.creado_en).toLocaleDateString('es-MX')}</p>
            <h3>{review.producto_nombre}</h3>
            <p>Servicio <Stars value={review.servicio} /></p><p>Calidad <Stars value={review.calidad} /></p>
            {review.comentario&&<p className="seller-comment">{review.comentario}</p>}
          </article>)}</div>
          {data.siguiente&&<button className="btn-secondary" disabled={busy} onClick={more}>{busy?'Cargando…':'Ver más reseñas'}</button>}
        </>:<p className="seller-empty">Este vendedor aún no tiene reseñas. Sus clientes podrán calificarlo después de recibir su compra.</p>}
      </section>
      <section id="seller-products" aria-label="Productos del vendedor">
        <ClientCatalogo supplierId={id} token={token} cart={cart} setCart={setCart} onProductsFetched={onProductsFetched} />
      </section>
    </>}
  </div>;
}

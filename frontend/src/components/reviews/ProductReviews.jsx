import { useEffect, useState } from 'react';
import { http } from '../../utils/api';
import Modal from '../ui/Modal';
import './reviews.css';

const rating=value=>Number(value).toFixed(1);
export default function ProductReviews({product,onClose}) {
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    http(`/productos/${product.id}/resenas`).then(value=>{if(active){setData(value);setError('');}})
      .catch(err=>{if(active)setError(err.message);});
    return()=>{active=false;};
  },[product.id,attempt]);
  async function more() {
    setBusy(true);setError('');
    try {const value=await http(`/productos/${product.id}/resenas?antes=${data.siguiente}`);
      setData(current=>({...value,resenas:[...current.resenas,...value.resenas]}));
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <Modal open title={`Reseñas de ${product.nombre}`} onClose={onClose}>
    <div className="product-reviews">
      <p>Opiniones de clientes con pedidos pagados y entregados. Disponibles para todos los proveedores.</p>
      {error&&<p role="alert" className="review-error">{error}{!data&&<button className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Reintentar</button>}</p>}
      {!data&&!error&&<p role="status">Cargando reseñas…</p>}
      {data&&(Number(data.resumen.total)===0?<p>Aún no hay reseñas de este producto.</p>:<>
        <p className="review-summary"><strong>★ {rating(data.resumen.calidad)}/5</strong> en calidad · {data.resumen.total} reseñas</p>
        <p>Servicio en estas compras: {rating(data.resumen.servicio)}/5</p>
        {data.resenas.map(review=><article className="review-saved" key={review.id}>
          <p className="review-verified">Compra verificada · {new Date(review.creado_en).toLocaleDateString('es-MX')}</p>
          <p>Calidad: {review.calidad}/5 · Servicio: {review.servicio}/5</p>
          {review.comentario&&<p className="review-comment">{review.comentario}</p>}
        </article>)}
        {data.siguiente&&<button className="btn-secondary" disabled={busy} onClick={more}>{busy?'Cargando…':'Ver más reseñas'}</button>}
      </>)}
    </div>
  </Modal>;
}

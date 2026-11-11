import { useEffect, useId, useState } from 'react';
import { http } from '../../utils/api';
import './reviews.css';
import StarRating from './StarRating';

function ReviewForm({item, orderId, token, onSaved}) {
  const id = useId();
  const [quality, setQuality] = useState('');
  const [service, setService] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const body={pedido_item_id:item.id,calidad:Number(quality),servicio:Number(service),comentario:comment};
    try {
      const result=await http(`/pedidos/${orderId}/resenas`, {method:'POST',body:JSON.stringify(body)}, token);
      onSaved({...body,id:result.id});
    } catch(err) {setError(err.message);}
    finally {setBusy(false);}
  }
  return <form className="review-form" onSubmit={submit} aria-label={`Reseñar ${item.producto_nombre}`}>
    <h4>{item.producto_nombre}</h4><p className="review-caption">{item.proveedor_nombre}</p>
    <fieldset disabled={busy}>
      <StarRating label="Calidad del producto" value={quality} onChange={setQuality} />
      <StarRating label="Servicio del proveedor" value={service} onChange={setService} />
      <label htmlFor={`${id}-comment`}>Tu experiencia (opcional)</label>
      <textarea id={`${id}-comment`} rows={3} maxLength={1000} value={comment} onChange={event=>setComment(event.target.value)} placeholder="¿Cómo llegó el producto y cómo fue la atención?" />
      <small>{comment.length}/1000 caracteres. No incluyas datos personales.</small>
      <button className="btn-primary" type="submit" disabled={!quality||!service||busy}>{busy?'Publicando…':'Publicar reseña'}</button>
    </fieldset>
    {error&&<p role="alert" className="review-error">{error}</p>}
  </form>;
}

export default function OrderReviews({detalle, token, onDelivered}) {
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [reviews,setReviews]=useState(null);
  const [attempt,setAttempt]=useState(0);
  const delivered=detalle.pedido.estado==='entregado';
  const paid=detalle.pago?.estado==='aprobado';
  const received=Boolean(detalle.pedido.recibido_cliente_en);
  const eligible=paid&&delivered&&!received;
  useEffect(()=>{
    if(!delivered||!paid||!received)return;
    let active=true;
    http(`/pedidos/${detalle.pedido.id}/resenas`,{},token).then(value=>{if(active){setReviews(value);setError('');}})
      .catch(err=>{if(active)setError(err.message);});
    return()=>{active=false;};
  },[detalle.pedido.id,delivered,paid,received,token,attempt]);
  async function confirm() {
    setBusy(true);setError('');
    try {await http(`/pedidos/${detalle.pedido.id}/entregado`,{method:'POST'},token);setConfirming(false);onDelivered();}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  if(!eligible&&!(delivered&&paid&&received))return null;
  return <section className="order-reviews" aria-label="Entrega y reseñas">
    {eligible&&<>
      <h3>¿Ya recibiste tu pedido?</h3>
      <p>El pedido está marcado como entregado. Confirma cuando tengas todos los productos para poder calificarlos.</p>
      {confirming?<div className="review-confirm"><p>Se guardará tu confirmación de recepción. ¿Recibiste todos los artículos?</p>
        <button className="btn-primary" disabled={busy} onClick={confirm}>{busy?'Confirmando…':'Sí, recibí todo'}</button>
        <button className="btn-secondary" disabled={busy} onClick={()=>setConfirming(false)}>Todavía no</button>
      </div>:<button className="btn-primary" onClick={()=>setConfirming(true)}>Confirmar recibido</button>}
    </>}
    {error&&<p role="alert" className="review-error">{error}</p>}
    {delivered&&paid&&received&&<>
      <p className="review-verified">Recepción confirmada por ti.</p>
      <h3>Reseñas de tu compra</h3><p>Califica la calidad y el servicio. Puedes publicar una reseña por producto en este pedido.</p>
      {reviews===null?(error?<button className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Reintentar</button>:<p role="status">Cargando reseñas…</p>):
        detalle.items.map(item=>{
          const review=reviews.find(r=>r.pedido_item_id===item.id);
          return review?<article className="review-saved" key={item.id}>
            <h4>{item.producto_nombre}</h4><p className="review-verified">Compra verificada · Reseña publicada</p>
            <p>Calidad: {review.calidad}/5 · Servicio: {review.servicio}/5</p>
            {review.comentario&&<p className="review-comment">{review.comentario}</p>}
          </article>:<ReviewForm key={item.id} item={item} orderId={detalle.pedido.id} token={token} onSaved={value=>setReviews(current=>[...current,value])}/>;
        })}
    </>}
  </section>;
}

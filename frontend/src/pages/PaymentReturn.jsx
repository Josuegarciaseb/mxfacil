import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { http } from '../utils/api';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const id = params.get('pedido_id') || params.get('external_reference');
  const [status,setStatus] = useState('pendiente');
  useEffect(()=>{
    if (!id || !/^\d+$/.test(id) || !localStorage.getItem('token')) return;
    let active = true;
    http(`/pagos/pedido/${id}`).then(data=>{if(active)setStatus(data.estado);}).catch(()=>{});
    const notice = {type:'MP_PAYMENT_RETURN',pedidoId:id};
    try { const channel=new BroadcastChannel('mp_payment_channel');channel.postMessage(notice);channel.close(); } catch { /* optional */ }
    window.opener?.postMessage(notice,window.location.origin);
    return ()=>{active=false;};
  },[id]);
  const title = status === 'aprobado' ? 'Pago confirmado' : status === 'rechazado' ? 'Pago rechazado' : 'Pago pendiente de confirmación';
  return <section className="card" style={{margin:'32px auto',maxWidth:420,padding:28,textAlign:'center'}}>
    <h1>{title}</h1>
    <p style={{margin:'12px 0 20px'}}>Consulta el estado actualizado en Mis pedidos.</p>
    <Link className="btn-primary" to={id && /^\d+$/.test(id) ? `/mis-pedidos?pedido_id=${id}` : '/mis-pedidos'}>Ver mis pedidos</Link>
  </section>;
}

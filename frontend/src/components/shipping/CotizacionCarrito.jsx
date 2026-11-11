import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../utils/api';
import { money } from '../../utils/cart';

export default function CotizacionCarrito({ token, clave, direccionId, metodo, cart, cotizacion, setRespuesta, onClose }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const id = cotizacion?.id;
  const pendiente = Boolean(id && !cotizacion.pedido_id && !cotizacion.motivo_rechazo && !cotizacion.vigente);
  useEffect(() => {
    if (!pendiente) return;
    let activa = true;
    const timer = setInterval(async () => {
      try {
        const q = await http('/envios/castores/cotizaciones/' + id, {}, token);
        if (activa) { setRespuesta({ clave, q }); setError(''); }
      } catch (e) { if (activa) setError(e.message); }
    }, 12000);
    return () => { activa = false; clearInterval(timer); };
  }, [pendiente,id,clave,token,setRespuesta]);

  async function consultar() {
    setCargando(true);
    setError('');
    try {
      const q = id ? await http('/envios/castores/cotizaciones/' + id, {}, token) :
        await http('/envios/castores/cotizaciones', {method:'POST',body:JSON.stringify({
          direccion_id:direccionId,metodo_pago:metodo,items:cart.map(i => ({producto_id:i.id,cantidad:i.qty})),
        })}, token);
      setRespuesta({ clave,q });
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  return <section className="flete-box" aria-label="Cotización de Castores">
    <strong>Flete de Castores</strong>
    {!id && <p>El proveedor confirmará cobertura y precio antes de que pagues. Si cotiza por Envia.com, se enviarán tu dirección y teléfono para calcular la tarifa.</p>}
    {id && <p role="status">{cotizacion.motivo_rechazo ? 'Sin servicio para esta solicitud. ' + cotizacion.motivo_rechazo :
      cotizacion.pedido_id ? 'Esta cotización ya se utilizó.' :
      cotizacion.vigente ? <>{cotizacion.fuente === 'sandbox' && 'Prueba de Envia.com · '}<b>${money(cotizacion.flete)} MXN</b> · {cotizacion.servicio}. Válida hasta {cotizacion.valida_hasta}.</> :
      'Solicitud #' + id + (cotizacion.valida_hasta ? ' vencida. El proveedor puede actualizarla.' : ' enviada. En espera del proveedor.')}</p>}
    {cotizacion?.pedido_id ? <Link to={'/mis-pedidos?pedido_id=' + cotizacion.pedido_id} onClick={onClose}>Ver pedido</Link> :
      <button type="button" className="btn-secondary" disabled={cargando || !direccionId || !metodo} onClick={consultar}>
        {cargando ? 'Consultando…' : id ? 'Actualizar cotización' : 'Solicitar cotización'}
      </button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

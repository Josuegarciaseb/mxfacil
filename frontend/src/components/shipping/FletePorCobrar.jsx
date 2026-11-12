import { useState } from 'react';
import { http } from '../../utils/api';
import { money } from '../../utils/cart';
import { paqueterias } from './paqueterias';

export default function FletePorCobrar({ pedido, token, operador, aprobado, actualizar }) {
  const [editando,setEditando] = useState(false);
  const [ocupado,setOcupado] = useState(false);
  const [error,setError] = useState('');
  const [empresa,setEmpresa] = useState('');
  const editable = !['cancelado','enviado','entregado'].includes(pedido.estado);
  const final = pedido.importe_destino;
  async function guardar(accion, body) {
    setOcupado(true);
    setError('');
    try {
      await http('/envios/domicilio/pedidos/' + pedido.id + '/' + accion,{
        method:accion === 'flete' ? 'PUT' : 'POST', body:JSON.stringify(body)
      },token);
      setEditando(false);
      await actualizar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }
  return <div>
    {pedido.flete_estimado != null && <p>Estimado al comprar · ${money(pedido.flete_estimado)} MXN.</p>}
    {final != null && <p>Paquetería · <strong>{pedido.paqueteria ?? 'Castores'}</strong>{pedido.servicio_envio && ' · ' + pedido.servicio_envio}</p>}
    <p>Flete por pagar a la paquetería al recibir · <b>{final == null ? 'Por confirmar' : '$' + money(final) + ' MXN'}</b></p>
    {final != null && editable && <p>{aprobado ? 'Importe autorizado por el comprador.' : 'Pendiente de autorización del comprador antes del despacho.'}</p>}
    {editable && operador && !editando &&
      <button className="btn-secondary" type="button" onClick={()=>{
        setEmpresa(pedido.paqueteria ?? (pedido.perecedero ? '' : 'Castores')); setEditando(true);
      }}>{final == null ? 'Registrar flete final' : 'Modificar flete final'}</button>}
    {editable && operador && editando && <form className="flete-form" onSubmit={e=>{
      e.preventDefault();
      const datos = Object.fromEntries(new FormData(e.currentTarget));
      guardar('flete',{...datos,cobertura_confirmada:datos.cobertura_confirmada === 'on', anterior:final, revision:pedido.revision_flete});
    }}>
      <label>Paquetería<select aria-label="Paquetería" required name="transportista" value={empresa} onChange={e=>setEmpresa(e.target.value)}>
        <option value="" disabled>Selecciona una paquetería</option>
        {Object.keys(paqueterias).filter(p=>!pedido.perecedero || p !== 'Castores').map(p=><option key={p}>{p}</option>)}
      </select></label>
      {empresa && <div className="flete-form" key={empresa}>
        <p>Consulta el servicio de <a href={paqueterias[empresa].envios} target="_blank" rel="noreferrer">{empresa}</a> y confirma el importe que pagará el cliente al recibir. Indica $0 si tú cubres el envío.</p>
        {empresa === 'DHL' && !!pedido.perecedero && <p>Si el producto requiere frío, consulta la cobertura de <a href="https://dhlsupplychain.dhl.com/transporte-soluciones-mx" target="_blank" rel="noreferrer">transporte con temperatura controlada de DHL</a>.</p>}
        <label>Flete final al destinatario (MXN)<input type="number" min="0" step="0.01" name="importe" required defaultValue={empresa === pedido.paqueteria ? final ?? '' : ''}/></label>
        <label>Referencia de {empresa}<input name="referencia" maxLength={100} required defaultValue={empresa === pedido.paqueteria ? pedido.referencia_flete ?? '' : ''}/></label>
        {empresa !== 'Castores' && <>
          <label>Servicio y plazo de entrega<input name="servicio" maxLength={100} required defaultValue={empresa === pedido.paqueteria ? pedido.servicio_envio ?? '' : ''}/></label>
          <label className="flete-check"><input required type="checkbox" name="cobertura_confirmada" />{pedido.perecedero
            ? 'Confirmé que el servicio acepta estos perecederos, su empaque, temperatura y plazo para este domicilio.'
            : 'Confirmé la cobertura a domicilio y la aceptación de los productos.'}</label>
        </>}
      </div>}
      <div className="flete-actions"><button className="btn-primary" disabled={ocupado || !empresa}>Guardar flete</button>
        <button className="btn-secondary" type="button" onClick={()=>setEditando(false)}>Volver</button></div>
    </form>}
    {editable && !operador && final != null && !aprobado &&
      <button type="button" className="btn-primary" disabled={ocupado} onClick={()=>guardar('aceptar',{importe:final,revision:pedido.revision_flete})}>
        Autorizar flete de ${money(final)} MXN
      </button>}
    {editable && !editando && (operador || !aprobado) &&
      <button type="button" className="btn-secondary" disabled={ocupado} onClick={()=>{
        if (window.confirm('¿Cancelar el pedido por el envío? Si la mercancía ya se cobró, quedará pendiente de reembolso.')) guardar('cancelar',{});
      }}>Cancelar pedido por el envío</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

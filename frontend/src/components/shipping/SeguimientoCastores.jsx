import { useState } from 'react';
import { http } from '../../utils/api';
import StatusBadge from '../ui/StatusBadge';
import { money } from '../../utils/cart';
import './flete.css';

export default function SeguimientoCastores({ detalle, token, operador = false, administrador = false, actualizar }) {
  const [accion, setAccion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [movimientos, setMovimientos] = useState(null);
  const [copiada, setCopiada] = useState(false);
  const [costo, setCosto] = useState('');
  const { pedido,envio,pago } = detalle;
  const cobrado = (pago?.estado || pedido.pago_estado) === 'aprobado';
  const base = '/envios/castores/pedidos/' + pedido.id;
  const margen = operador && costo !== '' && pedido.otros_costos_estimados != null
    ? Number(pedido.comision) + Number(pedido.flete) - Number(costo) - Number(pedido.otros_costos_estimados) : null;
  function elegir(siguiente) { setAccion(siguiente); setError(''); }
  async function guardar(e) {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    setOcupado(true);
    setError('');
    try {
      await http(base + '/' + accion, {method:'POST',body:JSON.stringify(datos)},token);
      setAccion('');
      await actualizar();
    } catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  async function rastrear() {
    setOcupado(true);
    setError('');
    try { setMovimientos(await http(base + '/rastreo',{},token)); }
    catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  return <section className="flete-box" aria-label="Seguimiento con Castores">
    <div className="flete-heading"><strong>Envío con Castores</strong>{envio && <StatusBadge estado={envio.estado} />}</div>
    <p>{pedido.servicio_castores} · Flete <b>${money(pedido.flete)} MXN</b>{pedido.fuente_castores === 'sandbox' && ' · Tarifa de prueba'}</p>
    {operador && pedido.referencia_flete && <p>Referencia de tarifa {pedido.referencia_flete} · CP de origen {pedido.cp_origen_flete}.</p>}
    {operador && pedido.embalaje && <p>{pedido.embalaje.tipo === 'pallet' ? 'Tarima' : 'Caja'} de {pedido.embalaje.peso} kg · {pedido.embalaje.largo} × {pedido.embalaje.ancho} × {pedido.embalaje.alto} cm.</p>}
    {!envio?.guia && pedido.estado !== 'cancelado' && <p>{cobrado ? 'En preparación. La guía aparecerá al despachar.' : 'El despacho comienza al confirmar el pago.'}</p>}
    {envio?.guia && <>
      <p>Guía o talón <strong className="flete-guia">{envio.guia}</strong></p>
      <p>Salida {new Date(envio.fecha_envio).toLocaleString('es-MX')}. Introduce la guía en el <a href="https://www.castores.com.mx/" target="_blank" rel="noreferrer">rastreador oficial de Castores</a>.</p>
      {navigator.clipboard && <button type="button" className="btn-secondary" onClick={async () => {
        try { await navigator.clipboard.writeText(envio.guia); setCopiada(true); }
        catch { setError('Selecciona el número de guía para copiarlo.'); }
      }}>{copiada ? 'Guía copiada' : 'Copiar guía'}</button>}
      {pedido.rastreo_api && <button type="button" className="btn-secondary" disabled={ocupado} onClick={rastrear}>Consultar movimientos en Envia.com</button>}
      {movimientos && <div role="status">
        <strong>{movimientos.sandbox ? 'Envia.com · prueba' : 'Envia.com'} · {movimientos.estado}</strong>
        <ul>{movimientos.eventos.map((m,i) => <li key={i}>{[m.fecha,m.lugar,m.descripcion].filter(Boolean).join(' · ')}</li>)}</ul>
      </div>}
    </>}
    {pedido.acuse && <p>Recibió <strong>{pedido.recibido_por}</strong> el {new Date(envio.fecha_entrega).toLocaleString('es-MX')}. Acuse {pedido.acuse}. Confirmó {pedido.confirmacion === 'comprador' ? 'el comprador' : 'administración'}.</p>}
    {pedido.incidencia && <p role="status"><strong>Incidencia registrada.</strong> {pedido.incidencia}</p>}
    {!accion && <div className="flete-actions">
      {operador && cobrado && pedido.estado === 'en_proceso' && <button className="btn-primary" type="button" onClick={() => elegir('despacho')}>Registrar despacho</button>}
      {pedido.estado === 'enviado' && (!operador || administrador) && <button className="btn-primary" type="button" onClick={() => elegir('recepcion')}>Confirmar recepción</button>}
      {['enviado','entregado'].includes(pedido.estado) && !pedido.incidencia &&
        <button className="btn-secondary" type="button" onClick={() => elegir('incidencia')}>Reportar incidencia</button>}
    </div>}
    {accion && <form className="flete-form" onSubmit={guardar}>
      {accion === 'despacho' && <>
        <label>Guía o talón de Castores<input name="guia" required maxLength={40} placeholder="Talón de 11 dígitos o guía ABC-12345" /></label>
        {pedido.api_envia && <label>Quién emitió la guía<select name="canal_guia">
          <option value="castores">Castores directamente</option><option value="envia">Cuenta de Envia.com{pedido.api_envia === 'sandbox' ? ' de prueba' : ''}</option>
        </select></label>}
        <label>Costo real del flete (MXN)<input type="number" name="costo_flete_real" value={costo} onChange={e => setCosto(e.target.value)} required min="0" step="0.01" /></label>
        {margen != null && <p role={margen <= 0 ? 'alert' : 'status'}>Margen con este flete y los demás costos previstos: <strong>${money(margen)} MXN</strong>.</p>}
        <p><a href="https://www.castores.com.mx/servicios/paqueteria.html" target="_blank" rel="noreferrer">Consultar opciones de recolección y entrega a Castores</a>. Registra la remisión cuando el transportista reciba el paquete.</p>
      </>}
      {accion === 'recepcion' && <>
        <label>Nombre de quien recibió<input name="recibido_por" required maxLength={100} /></label>
        <label>Referencia del acuse de entrega<input name="acuse" required maxLength={150} /></label>
      </>}
      {accion === 'incidencia' && <label>¿Qué ocurrió con el envío?<textarea name="motivo" required maxLength={240} /></label>}
      <div className="flete-actions">
        <button className="btn-primary" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar ' + (accion === 'recepcion' ? 'recepción' : accion)}</button>
        <button className="btn-secondary" type="button" disabled={ocupado} onClick={() => elegir('')}>Volver</button>
      </div>
    </form>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

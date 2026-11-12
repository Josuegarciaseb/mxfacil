import { useState } from 'react';
import { http } from '../../utils/api';
import { money } from '../../utils/cart';
import { PAYMENT_METHOD_LABELS } from '../../constants';
import './flete.css';

const base = '/envios/castores/cotizaciones';
const cotizador = 'https://www.castores.com.mx/';

function Responder({ q, token, actualizar }) {
  const [fuente, setFuente] = useState('cotizador');
  const [rechazar, setRechazar] = useState(false);
  const [otros, setOtros] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const margen = otros !== '' ? Number(q.comision_estimada) - Number(otros) : null;

  async function guardar(event) {
    event.preventDefault();
    const campos = Object.fromEntries(new FormData(event.currentTarget));
    const body = rechazar ? {motivo_rechazo:campos.motivo} :
      {...campos,fuente,otros_costos_estimados:otros,cobertura_confirmada:campos.confirmada === 'on'};
    setGuardando(true);
    setError('');
    try {
      await http(base + '/' + q.id, {method:'PUT',body:JSON.stringify({...body,revision:q.revision})}, token);
      await actualizar();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }

  const publicada = q.flete != null && q.vigente;
  return <article className="flete-box">
    <strong>Solicitud #{q.id} · {q.destino}, CP {q.cp_destino}</strong>
    <p>{q.proveedor} · {q.productos.map(p => p.cantidad + ' × ' + p.nombre + (p.presentacion ? ' (' + p.presentacion + ')' : '')).join(', ')}</p>
    <p>Pago elegido: {PAYMENT_METHOD_LABELS[q.metodo_pago]}. Incluye en los costos previstos el cargo por procesar el pago de mercancía y flete.</p>
    {publicada ? <p role="status">Flete publicado <b>${money(q.flete)} MXN</b> · {q.servicio} · Vigente hasta {q.valida_hasta}.</p> : <>
      {q.motivo_rechazo && <p>Última respuesta: {q.motivo_rechazo}</p>}
      <form onSubmit={guardar} className="flete-form">
        {!rechazar ? <>
          <p>Cotiza la carga embalada hasta el destino. El cliente pagará el flete al precio que publiques. <a href={cotizador} target="_blank" rel="noreferrer">Abrir cotizador de Castores</a></p>
          {q.api && <label>Fuente de tarifa<select value={fuente} onChange={e => setFuente(e.target.value)}>
            <option value="cotizador">Cotización confirmada por Castores</option>
            <option value="envia">{q.api === 'sandbox' ? 'Envia.com · carga consolidada de prueba' : 'Envia.com · carga consolidada'}</option>
          </select></label>}
          <div className="flete-grid">
            {fuente === 'cotizador' ? <>
              <label>CP de origen<input name="cp_origen" required inputMode="numeric" pattern="[0-9]{5}" maxLength="5" /></label>
              <label>Flete final de Castores (MXN)<input name="flete" type="number" step="0.01" min="0.01" required /></label>
              <label>Referencia de la cotización<input name="referencia" required maxLength={100} /></label>
              <label>Servicio y plazo estimado<input name="servicio" required maxLength={100} placeholder="Por ejemplo, domicilio en 3 días hábiles" /></label>
            </> : <>
              <label>Unidad consolidada<select name="tipo_bulto"><option value="box">Una caja</option><option value="pallet">Una tarima</option></select></label>
              <label>Código de estado destino en Envia.com<input name="estado_destino" pattern="[A-Z]{2}" maxLength={2} required /></label>
              {[['peso','Peso del bulto (kg)'],['largo','Largo (cm)'],['ancho','Ancho (cm)'],['alto','Alto (cm)']].map(([name,label]) =>
                <label key={name}>{label}<input name={name} type="number" required min="0.01" step="0.01" /></label>)}
            </>}
            <label>Válida hasta<input type="date" name="vigencia" required /></label>
            <label>Otros costos previstos de la plataforma (MXN)<input type="number" step="0.01" min="0" required value={otros} onChange={e => setOtros(e.target.value)} /></label>
          </div>
          <p>Comisión de mercancía <b>${money(q.comision_estimada)} MXN</b>. {margen != null && <>Margen previsto <b>${money(margen)} MXN</b>.</>}</p>
          {margen != null && margen <= 0 && <p role="alert">Los costos consumirían la comisión. Revisa si conviene consolidar más mercancía.</p>}
          <label className="flete-check"><input type="checkbox" name="confirmada" required />Confirmé que la mercancía, el embalaje y la ruta son admisibles.</label>
        </> : <label>Motivo para el comprador<input name="motivo" maxLength={200} required placeholder="Por ejemplo, ruta sin cobertura" /></label>}
        <div className="flete-actions">
          <button className="btn-primary" disabled={guardando || (!rechazar && margen != null && margen <= 0)}>{guardando ? 'Guardando…' :
            rechazar ? 'Enviar motivo' : fuente === 'envia' ? 'Cotizar y publicar el menor flete' : 'Publicar cotización'}</button>
          <button type="button" className="btn-secondary" onClick={() => { setRechazar(!rechazar); setError(''); }}>
            {rechazar ? 'Volver a cotizar' : 'Indicar que no hay servicio'}</button>
        </div>
        {error && <p role="alert">{error}</p>}
      </form>
    </>}
  </article>;
}

export default function SolicitudesCastores({token}) {
  const [abierto,setAbierto] = useState(false);
  const [rows,setRows] = useState(null);
  const [error,setError] = useState('');
  async function cargar() {
    try { const data = await http(base,{},token); setRows(data); setError(''); }
    catch (e) { setError(e.message); }
  }
  return <details className="card flete-panel" open={abierto} onToggle={e => {
    setAbierto(e.currentTarget.open);
    if (e.currentTarget.open) cargar();
  }}>
    <summary>Solicitudes de cotización anteriores</summary>
    {abierto && <div className="flete-form">
      <button type="button" className="btn-secondary" onClick={cargar}>Actualizar solicitudes</button>
      {error && <p role="alert">{error}</p>}
      {rows === null && !error && <p role="status">Cargando solicitudes…</p>}
      {rows?.length === 0 && <p>Sin solicitudes anteriores. Abre el pedido para registrar el flete de un envío a domicilio.</p>}
      {rows?.map(q => <Responder key={q.id + '-' + q.revision} q={q} token={token} actualizar={cargar} />)}
    </div>}
  </details>;
}

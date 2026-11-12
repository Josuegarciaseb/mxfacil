import { useEffect, useState } from 'react';
import { http } from '../../utils/api';
import { money } from '../../utils/cart';

const fechaLocal = date => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const mxn = value => value == null ? 'Sin determinar' : '$' + money(value);

function periodoInicial() {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - 13);
  return { desde: fechaLocal(inicio), hasta: fechaLocal(hoy), tiendas: [], proveedores: [] };
}

function CostoPedido({ pedido, token, actualizar, flete = false }) {
  const anterior = flete ? pedido.costo_flete_real : pedido.costo_variable;
  const [valor, setValor] = useState(anterior ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const nuevo = valor === '' ? null : valor;
  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await http('/piloto/pedidos/' + pedido.id + (flete ? '/flete' : '/costo'), {
        method: 'PATCH',
        body: JSON.stringify({ costo_variable: nuevo, anterior }),
      }, token);
      actualizar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  return <form onSubmit={guardar} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    <input type="number" min="0" max="9999999999.99" step="0.01" aria-label={(flete ? 'Flete real del pedido ' : 'Costo variable del pedido ') + pedido.id}
      placeholder="Sin registrar" value={valor} onChange={e => setValor(e.target.value)} style={{ width: 115 }} />
    <button type="submit" className="btn-secondary btn-sm"
      disabled={guardando || (nuevo === anterior)}>{guardando ? 'Guardando…' : 'Guardar'}</button>
    {error && <span role="alert">{error}</span>}
  </form>;
}

export default function Piloto({ token, usuarios, proveedores = [] }) {
  const [filtros, setFiltros] = useState(periodoInicial);
  const [consulta, setConsulta] = useState(filtros);
  const [revision, setRevision] = useState(0);
  const [respuesta, setRespuesta] = useState(null);
  const params = new URLSearchParams({ desde: consulta.desde, hasta: consulta.hasta });
  if (consulta.tiendas.length) params.set('tiendas', consulta.tiendas.join(','));
  if (consulta.proveedores.length) params.set('proveedores', consulta.proveedores.join(','));
  const query = params.toString();
  const clave = query + '/' + revision;
  useEffect(() => {
    let activa = true;
    http('/piloto?' + query, {}, token)
      .then(datos => { if (activa) setRespuesta({ clave, datos }); })
      .catch(e => { if (activa) setRespuesta({ clave, error: e.message }); });
    return () => { activa = false; };
  }, [query, clave, token]);
  const actual = respuesta?.clave === clave ? respuesta : null;
  const resumen = actual?.datos?.resumen;
  const hayFletes = actual?.datos?.pedidos?.some(p => p.cotizacion_castores_id);
  const actualizar = () => setRevision(r => r + 1);
  function aplicar(event) {
    event.preventDefault();
    setConsulta(filtros);
    actualizar();
  }
  return <section className="card" aria-label="Medición del piloto" style={{ marginTop: 20, padding: 18 }}>
    <h3>Medición del piloto</h3>
    <p>Selecciona las fechas de creación de los pedidos. Los resultados reflejan su estado actual.</p>
    <form onSubmit={aplicar} style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
      <label>Desde <input type="date" required value={filtros.desde} max={filtros.hasta}
        onChange={e => setFiltros({ ...filtros, desde: e.target.value })} /></label>
      <label>Hasta <input type="date" required value={filtros.hasta} min={filtros.desde}
        onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} /></label>
      <details>
        <summary>Tiendas del piloto ({filtros.tiendas.length || 'todas'})</summary>
        <label>Cuentas compradoras <select multiple value={filtros.tiendas} aria-label="Cuentas compradoras"
          onChange={e => setFiltros({ ...filtros, tiendas: Array.from(e.target.selectedOptions, item => item.value) })}>
          {usuarios.filter(u => u.rol === 'cliente').map(u => <option value={u.id} key={u.id}>{u.nombre} (#{u.id})</option>)}
        </select></label>
        <button type="button" className="btn-ghost" onClick={() => setFiltros({ ...filtros, tiendas: [] })}>Todas las cuentas</button>
      </details>
      <details>
        <summary>Proveedores del piloto ({filtros.proveedores.length || 'todos'})</summary>
        <label>Proveedores participantes <select multiple value={filtros.proveedores}
          onChange={e => setFiltros({ ...filtros, proveedores: Array.from(e.target.selectedOptions, item => item.value) })}>
          {proveedores.map(proveedor => <option value={proveedor.id} key={proveedor.id}>{proveedor.nombre} (#{proveedor.id})</option>)}
        </select></label>
        <button type="button" className="btn-ghost" onClick={() => setFiltros({ ...filtros, proveedores: [] })}>Todos los proveedores</button>
        <p>Al seleccionar proveedores se incluyen los pedidos en los que todas las partidas pertenecen al grupo.</p>
      </details>
      <button className="btn-secondary" type="submit">Actualizar informe</button>
    </form>
    {!actual && <p role="status">Cargando informe…</p>}
    {actual?.error && <p role="alert">{actual.error}</p>}
    {resumen && <>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, margin: '18px 0' }}>
        {[
          ['Tiendas con compra cobrada', resumen.tiendas_compradoras],
          ['Tiendas con dos o más compras cobradas', resumen.tiendas_recurrentes],
          ['Pedidos entregados', resumen.entregados], ['Pedidos cancelados', resumen.cancelados],
          ['Pedidos pendientes de entrega', resumen.pendientes],
          ['Comisión cobrada en MXN', mxn(resumen.comision_obtenida)],
          ['Tiempo promedio de compra', resumen.muestras_tiempo ? resumen.segundos_promedio + ' s (' + resumen.muestras_tiempo + ' medidos)' : 'Sin mediciones'],
        ].map(([nombre, valor]) => <div key={nombre}><dt>{nombre}</dt><dd style={{ margin: 0, fontWeight: 700 }}>{valor}</dd></div>)}
      </dl>
      <p>El tiempo va desde la última apertura del carrito con artículos y sesión iniciada hasta la creación del pedido.
        El margen en MXN suma la comisión y el flete cobrados y descuenta el flete real y los demás costos variables.
        Registra 0 si conoces un costo nulo. Deja vacío un costo desconocido.</p>
      {!actual.datos.pedidos.length ? <p>Sin pedidos en el periodo seleccionado.</p> :
        <div className="table-scroll"><table>
          <thead><tr>{['Pedido', 'Cuenta de tienda', 'Pedido / pago', 'Tiempo', 'Comisión', ...(hayFletes ? ['Flete cobrado','Flete real','Otros costos'] : ['Costo variable']), 'Margen'].map(th => <th key={th}>{th}</th>)}</tr></thead>
          <tbody>{actual.datos.pedidos.map(pedido => <tr key={pedido.id}>
            <td>#{pedido.id}</td><td>{pedido.tienda} (#{pedido.usuario_id})</td><td>{pedido.estado} / {pedido.pago_estado || 'sin registro'}</td>
            <td>{pedido.checkout_segundos == null ? 'Sin medición' : pedido.checkout_segundos + ' s'}</td><td>{mxn(pedido.comision_obtenida)}</td>
            {hayFletes && <><td>{mxn(pedido.flete_recuperado)}</td><td>{pedido.domicilio_id ? 'Pago directo a paquetería' : pedido.cotizacion_castores_id
              ? <CostoPedido key={pedido.id + '/flete/' + pedido.costo_flete_real} flete pedido={pedido} actualizar={actualizar} token={token} />
              : 'No aplica'}</td></>}
            <td><CostoPedido key={pedido.id + '/' + pedido.costo_variable} pedido={pedido} actualizar={actualizar} token={token} /></td>
            <td>{mxn(pedido.margen)}</td>
          </tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}

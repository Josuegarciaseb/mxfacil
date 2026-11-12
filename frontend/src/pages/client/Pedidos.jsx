import { useEffect, useReducer, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { http } from '../../utils/api';
import { money } from '../../utils/cart';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import ProductPhoto from '../../components/ui/ProductPhoto';
import Spinner from '../../components/ui/Spinner';
import PedidoDetalle from './PedidoDetalle';
import { estadoPedido, fechaPedido } from './pedidoUtils';
import './pedidos.css';

function ListaPedidos({ pedidos }) {
  return <>
    <header className="orders-list-heading">
      <p className="orders-eyebrow">Mi cuenta</p>
      <h1>Mis pedidos</h1>
      <p>Consulta tus compras y sigue su entrega.</p>
    </header>
    {pedidos.length === 0 ? <EmptyState icon="shoppingBag" title="Aún no tienes pedidos"
      sub="Aquí encontrarás tus compras cuando hagas tu primer pedido."
      action={<Link className="btn-primary" to="/catalogo">Explorar el catálogo</Link>} /> :
      <ul className="orders-list">
        {pedidos.map(p => {
          const estado = estadoPedido(p);
          return <li key={p.id} className="orders-list-row">
            <span className="order-thumb" aria-hidden="true"><ProductPhoto name={p.producto_nombre} url={p.image_url} /></span>
            <div className="orders-list-copy">
              <p className="order-meta">Pedido #{p.id} <span>·</span> {fechaPedido(p.fecha)}</p>
              <h2>{p.producto_nombre || 'Compra al mayoreo'}{p.productos_distintos > 1 && <small> y {p.productos_distintos - 1} más</small>}</h2>
              <span className={'order-status ' + (estado.tono || '')}>{estado.etiqueta}</span>
            </div>
            <div className="orders-list-end">
              <strong>${money(p.total)} <small>MXN</small></strong>
              <Link to={'?pedido_id=' + p.id} aria-label={'Ver pedido #' + p.id}>Ver pedido <Icon name="chevronRight" size={14} /></Link>
            </div>
          </li>;
        })}
      </ul>}
  </>;
}

function VistaPedidos({ seleccionado, token, onResume, actualizado }) {
  const [resultado, setResultado] = useState(null);
  const [revision, actualizar] = useReducer(n => n + 1, 0);
  const ruta = seleccionado ? '/pedidos/mis-compras/' + seleccionado : '/pedidos';

  useEffect(() => {
    let vigente = true;
    http(ruta, {}, token).then(datos => {
      if (vigente) setResultado({ datos });
    }).catch(error => {
      if (vigente) setResultado({ error: error.message });
    });
    return () => { vigente = false; };
  }, [ruta, token, actualizado, revision]);

  useEffect(() => {
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return <div className="orders-page">
    {seleccionado && <Link className="order-back" to="/mis-pedidos"><Icon name="arrowLeft" size={16} /> Mis pedidos</Link>}
    {!resultado ? <div role="status" aria-label="Cargando pedidos"><Spinner /></div> :
      resultado.error ? <div className="order-load-error">
        <h1>{seleccionado ? 'No se pudo abrir el pedido' : 'No se pudieron cargar tus pedidos'}</h1>
        <p role="alert">{resultado.error}</p>
        <button className="btn-secondary" onClick={() => { setResultado(null); actualizar(); }}>Reintentar</button>
      </div> :
      seleccionado ? <PedidoDetalle detalle={resultado.datos} token={token} onResume={onResume} actualizar={actualizar} /> :
        <ListaPedidos pedidos={resultado.datos} />}
  </div>;
}

export default function ClientPedidos(props) {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const id = Number(params.get('pedido_id'));
  const seleccionado = Number.isSafeInteger(id) && id > 0 ? id : null;
  return <VistaPedidos key={seleccionado || 'lista'} seleccionado={seleccionado} actualizado={state?.updated} {...props} />;
}

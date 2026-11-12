import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import ProductPhoto from '../../components/ui/ProductPhoto';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderReviews from '../../components/reviews/OrderReviews';
import SeguimientoCastores from '../../components/shipping/SeguimientoCastores';
import { CONTACT_EMAIL } from '../../constants';
import { http } from '../../utils/api';
import { money } from '../../utils/cart';
import { toast } from '../../utils/toast';
import PedidoOperacion from './PedidoOperacion';
import { estadoPedido, fechaPedido, unidades } from './pedidoUtils';

const pasos = [
  ['Pedido recibido', 'shoppingBag'], ['Preparación', 'package'], ['En camino', 'truck'], ['Entrega', 'check'],
];

function Progreso({ actual }) {
  if (actual == null) return null;
  return <ol className="order-progress" aria-label="Progreso del pedido">
    {pasos.map(([nombre, icono], i) => <li key={nombre} className={i <= actual ? 'reached' : ''}
      aria-current={i === actual ? 'step' : undefined}>
      <span className="order-progress-dot" aria-hidden="true">{i === actual && <Icon name={icono} size={19} />}</span>
      <span>{nombre}</span>
    </li>)}
  </ol>;
}

function avisoPedido({ pedido, pago, envio }) {
  if (pago?.estado === 'reembolsado') return 'El pago de esta compra fue reembolsado.';
  if (pedido.estado === 'cancelado') return pago?.estado === 'aprobado'
    ? 'Recibimos el pago de este pedido cancelado. El importe completo está pendiente de devolución.'
    : 'Puedes consultar los productos y el importe de este pedido en el detalle de la compra.';
  if (pedido.incidencia || envio?.estado === 'incidencia') return 'Se registró una incidencia. Consulta el detalle del envío para revisarla.';
  if (pago?.estado === 'pendiente' && pedido.reserva_vence_epoch != null) {
    const plazo = new Date(Number(pedido.reserva_vence_epoch) * 1000).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    return 'Plazo para pagar: ' + plazo + '. Si iniciaste un pago en línea, verificaremos su estado antes de liberar las existencias.';
  }
  if (pedido.estado === 'entregado' && envio?.fecha_entrega) return 'Entrega registrada el ' + fechaPedido(envio.fecha_entrega) + '.';
  if (envio?.guia) return 'Encontrarás la guía de rastreo en el detalle del envío.';
  if (pedido.estado === 'esperando_pago') return 'Puedes continuar el pago para completar tu compra.';
  if (pedido.estado === 'entregado') return 'Revisa los productos recibidos en el detalle de tu compra.';
  if (pedido.cotizacion_castores_id) return 'La guía de rastreo estará disponible cuando se registre el despacho.';
  return 'La entrega de esta compra se coordina con el proveedor.';
}

function DetalleEnvio({ detalle, token, actualizar }) {
  const { pedido, envio } = detalle;
  const requiereAutorizacion = pedido.domicilio_id && pedido.importe_destino != null &&
    (pedido.autorizado_hasta == null || Number(pedido.importe_destino) > Number(pedido.autorizado_hasta)) &&
    ['pendiente', 'esperando_pago', 'en_proceso'].includes(pedido.estado);
  const [abierto, setAbierto] = useState(Boolean(requiereAutorizacion || pedido.incidencia || envio?.estado === 'incidencia'));
  const id = useId();
  if (pedido.estado === 'cancelado') return null;
  return <div className="order-shipping">
    <button type="button" className="order-disclosure" aria-expanded={abierto} aria-controls={id}
      onClick={() => setAbierto(!abierto)}>Detalle del envío <Icon name="chevronDown" size={15} /></button>
    <div id={id} hidden={!abierto}>
      {pedido.cotizacion_castores_id ? <SeguimientoCastores detalle={detalle} token={token} actualizar={actualizar} /> :
        <section className="order-shipping-info" aria-label="Datos del envío">
          <div><strong>{envio?.transportista || 'Entrega acordada con el proveedor'}</strong>
            {envio?.estado && <StatusBadge estado={envio.estado} />}</div>
          {envio?.guia && <p>Guía de rastreo: <strong>{envio.guia}</strong></p>}
          {envio?.fecha_envio && <p>Fecha de salida: {fechaPedido(envio.fecha_envio)}</p>}
          {envio?.fecha_entrega && <p>Fecha de entrega: {fechaPedido(envio.fecha_entrega)}</p>}
        </section>}
    </div>
  </div>;
}

function DetalleCompra({ pedido, items }) {
  const localidad = [pedido.direccion_ciudad, pedido.direccion_estado, pedido.direccion_cp && 'C.P. ' + pedido.direccion_cp].filter(Boolean).join(', ');
  return <section className="order-purchase" aria-labelledby="order-purchase-title">
    <h2 id="order-purchase-title">Detalle de la compra</h2>
    {(pedido.direccion_linea1 || localidad) && <div className="order-purchase-row">
      <span className="order-tile"><Icon name="mapPin" size={21} /></span>
      <div><small>Dirección de entrega</small><strong>{pedido.direccion_linea1}</strong>{localidad && <p>{localidad}</p>}</div>
    </div>}
    {items.map(item => <div key={item.id} className="order-purchase-row">
      <span className="order-thumb" aria-hidden="true"><ProductPhoto name={item.producto_nombre} url={item.image_url} /></span>
      <div>
        <strong>{item.producto_nombre}</strong>
        <p>{unidades(item.cantidad)} · ${money(item.precio_unitario)} c/u antes de IVA</p>
        {item.proveedor_nombre && <p>Vendido por {item.proveedor_id
          ? <Link to={'/proveedores/' + item.proveedor_id}>{item.proveedor_nombre}</Link> : item.proveedor_nombre}</p>}
      </div>
    </div>)}
  </section>;
}

export default function PedidoDetalle({ detalle, token, onResume, actualizar }) {
  const { pedido, items, pago, envio } = detalle;
  const estado = estadoPedido(pedido, envio?.estado);
  const [cancelando, setCancelando] = useState(false);
  const puedeCancelar = ['esperando_pago', 'pendiente'].includes(pedido.estado) && pago?.estado === 'pendiente';
  const empresa = envio?.transportista || ((!pedido.domicilio_id || pedido.importe_destino != null) && pedido.paqueteria);
  const modalidad = empresa ? 'Envío con ' + empresa : pedido.domicilio_id ? 'Envío a domicilio' :
    pedido.cotizacion_castores_id ? 'Envío con Castores' : 'Entrega acordada';

  async function cancelar() {
    if (!window.confirm('¿Cancelar el pedido #' + pedido.id + '?')) return;
    setCancelando(true);
    try { await http('/pedidos/' + pedido.id + '/cancelar', { method: 'POST' }, token); actualizar(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setCancelando(false); }
  }

  return <div className="order-columns">
    <div className="order-main">
      <section className="order-tracking" aria-labelledby="order-title">
        <div className="order-tracking-head">
          <div>
            <div className="order-tracking-meta"><span className={'order-status ' + (estado.tono || '')}>{estado.etiqueta}</span>
              {pedido.estado !== 'cancelado' && <span>{modalidad}</span>}
            </div>
            <h1 id="order-title">{estado.titulo}</h1>
          </div>
          {items[0] && <span className="order-thumb order-cover" aria-hidden="true">
            <ProductPhoto name={items[0].producto_nombre} url={items[0].image_url} eager />
            {items.length > 1 && <b>+{items.length - 1}</b>}
          </span>}
        </div>
        <Progreso actual={estado.paso} />
        <p className="order-notice" role="status"><Icon name="info" size={17} />{avisoPedido(detalle)}</p>
        {puedeCancelar && <div className="order-actions">
          {pedido.estado === 'esperando_pago' && <button className="btn-primary" type="button"
            onClick={() => onResume({ pedidoId: pedido.id, metodo: pago.metodo, monto: pago.monto })}>Continuar pago</button>}
          <button className="btn-secondary" type="button" disabled={cancelando} onClick={cancelar}>
            {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
          </button>
        </div>}
        <DetalleEnvio detalle={detalle} token={token} actualizar={actualizar} />
      </section>
      <a className="order-help" href={'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Ayuda con el pedido #' + pedido.id)}>
        <span className="order-help-icon"><Icon name="headset" size={18} /></span>
        ¿Necesitas ayuda con este pedido? <Icon name="chevronRight" size={17} />
      </a>
      <DetalleCompra pedido={pedido} items={items} />
    </div>
    <PedidoOperacion detalle={detalle} />
    <OrderReviews detalle={detalle} token={token} onDelivered={actualizar} />
  </div>;
}

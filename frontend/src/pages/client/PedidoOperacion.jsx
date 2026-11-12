import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/ui/StatusBadge';
import { PAYMENT_METHOD_LABELS } from '../../constants';
import { money } from '../../utils/cart';
import { toast } from '../../utils/toast';
import { fechaPedido, unidades } from './pedidoUtils';

export default function PedidoOperacion({ detalle: { pedido, items, pago } }) {
  const aDomicilio = Boolean(pedido.domicilio_id);
  async function copiarFolio() {
    try {
      await navigator.clipboard.writeText(String(pedido.id));
      toast('Número de pedido copiado', 'success');
    } catch { toast('Puedes seleccionar el número de pedido para copiarlo.', 'info'); }
  }

  return <aside className="order-operation" aria-labelledby="order-operation-title">
    <h2 id="order-operation-title">Detalle de la operación</h2>
    <p className="order-operation-meta">
      {pedido.fecha && <><time dateTime={pedido.fecha}>{fechaPedido(pedido.fecha)}</time><span aria-hidden="true">|</span></>}
      {navigator.clipboard?.writeText ?
        <button type="button" className="order-folio" aria-label={'Copiar número de pedido ' + pedido.id} onClick={copiarFolio}>
          #{pedido.id} <Icon name="copy" size={14} />
        </button> : <span>#{pedido.id}</span>}
    </p>
    <ul className="order-prices">
      {items.map(item => <li key={item.id}>
        <div>{item.producto_nombre}<small>{unidades(item.cantidad)}</small></div>
        <span>${money(Number(item.precio_unitario) * item.cantidad)}</span>
      </li>)}
    </ul>
    <dl className="order-breakdown">
      {pedido.subtotal != null && <div><dt>Subtotal</dt><dd>${money(pedido.subtotal)}</dd></div>}
      {pedido.iva != null && <div><dt>IVA (16%)</dt><dd>${money(pedido.iva)}</dd></div>}
      {!aDomicilio && !!pedido.cotizacion_castores_id && pedido.flete != null &&
        <div><dt>Flete incluido</dt><dd>${money(pedido.flete)}</dd></div>}
      <div className="order-total">
        <dt>{aDomicilio ? 'Total de mercancía con IVA' : pago?.estado === 'aprobado' && pedido.estado !== 'cancelado' ? 'Total pagado' : 'Total del pedido'}</dt>
        <dd><small>MXN</small> ${money(pedido.total)}</dd>
      </div>
      {aDomicilio && <div className="order-freight-due"><dt>Flete al recibir</dt>
        <dd>{pedido.importe_destino == null ? 'Por confirmar' : '$' + money(pedido.importe_destino)}</dd></div>}
    </dl>
    {pago && <section className="order-payment" aria-label="Información del pago">
      <div className="order-payment-top">
        <span className="order-tile"><Icon name="creditCard" size={22} /></span>
        <div><h3>Forma de pago</h3><p>{PAYMENT_METHOD_LABELS[pago.metodo] || pago.metodo}</p></div>
      </div>
      <div className="order-payment-status"><span>Estado del pago</span><StatusBadge estado={pago.estado} /></div>
    </section>}
  </aside>;
}

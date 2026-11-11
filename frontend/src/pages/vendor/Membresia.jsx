import { useCallback, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { http } from '../../utils/api';
import './Membresia.css';

const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = key.startsWith('pk_test_') ? loadStripe(key) : null;
const money = cents => (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const date = value => new Date(value).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

export function PaymentForm({ intent, token, onUpdate, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({ number: false, expiry: false, cvc: false });
  const complete = Object.values(fields).every(Boolean);
  function changed(field, event) {
    setFields(current => ({ ...current, [field]: event.complete }));
    setError(event.error?.message || '');
  }
  async function pay(event) {
    event.preventDefault();
    if (!stripe || !elements || busy || (!complete && intent.status !== 'succeeded')) return;
    setBusy(true); setError('');
    try {
      const result = intent.status === 'succeeded' ? { paymentIntent: { status: 'succeeded' } }
        : await stripe.confirmCardPayment(intent.client_secret, { payment_method: { card: elements.getElement(CardNumberElement) } });
      if (result.error) throw new Error(result.error.message);
      const state = await http('/membresia/confirm', { method: 'POST' }, token);
      onUpdate(state);
      if (!state.vigente) setError('El pago sigue pendiente. Usa “Verificar mi pago” antes de intentar de nuevo.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form className="pro-payment" onSubmit={pay}>
    <h2>Pago único</h2>
    <p>30 días por {money(intent.monto_centavos)} MXN. Sin renovación automática.</p>
    <div className="pro-card-fields">
      <div className="pro-card-field" role="group" aria-label="Número de tarjeta">
        <p>Número de tarjeta</p><div className="pro-card-input"><CardNumberElement options={{showIcon: true, disabled: busy, style: {base: {fontSize: '16px'}}}} onChange={event => changed('number', event)} /></div>
      </div>
      <div className="pro-card-row">
        <div className="pro-card-field" role="group" aria-label="Fecha de vencimiento">
          <p>Vencimiento (MM/AA)</p><div className="pro-card-input"><CardExpiryElement options={{disabled: busy, style: {base: {fontSize: '16px'}}}} onChange={event => changed('expiry', event)} /></div>
        </div>
        <div className="pro-card-field" role="group" aria-label="Código de seguridad">
          <p>Código de seguridad (CVC)</p><div className="pro-card-input"><CardCvcElement options={{disabled: busy, style: {base: {fontSize: '16px'}}}} onChange={event => changed('cvc', event)} /></div>
        </div>
      </div>
      {!complete && <p className="pro-note" role="status">Completa el número, el vencimiento y el código de seguridad para pagar.</p>}
    </div>
    {error && <p role="alert" className="pro-error">{error}</p>}
    <div className="pro-actions">
      <button className="btn-primary" disabled={!stripe || busy || (!complete && intent.status !== 'succeeded')}>{busy ? 'Verificando pago…' : `Pagar ${money(intent.monto_centavos)}`}</button>
      <button className="btn-secondary" type="button" disabled={busy} onClick={onClose}>Volver sin pagar</button>
    </div>
  </form>;
}

export default function Membresia({ token }) {
  const [data, setData] = useState(null);
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { setData(await http('/membresia/me', {}, token)); setError(''); }
    catch (err) { setError(err.message); }
  }, [token]);
  useEffect(() => {
    let active = true;
    http('/membresia/me', {}, token).then(value => { if (active) setData(value); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [token]);
  function update(value) { setData(value); if (value.vigente) setIntent(null); }
  async function action(kind) {
    setBusy(true); setError('');
    try {
      if (kind === 'verify') update(await http('/membresia/confirm', { method: 'POST' }, token));
      else {
        const result = await http('/membresia/intent', { method: 'POST' }, token);
        if (result.status === 'succeeded') update(await http('/membresia/confirm', { method: 'POST' }, token));
        else setIntent(result);
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="pro-page">
    <p className="pro-eyebrow">TU NEGOCIO EN MX FÁCIL</p>
    <h1>Mi membresía</h1>
    <p>Haz que más comercios descubran tus productos.</p>
    {error && <div role="alert" className="pro-error">{error} <button className="btn-secondary" onClick={refresh}>Actualizar</button></div>}
    {!data ? !error && <p role="status">Cargando membresía…</p> : <>
      <section className="pro-plan">
        <div><span className="pro-badge">Proveedor Pro</span><h2>{data.vigente ? 'Tus 30 días Pro' : 'Dale más visibilidad a tu negocio'}</h2>
          <p className="pro-price">{money(data.precio_centavos)} <small>MXN / 30 días</small></p>
          <p>Pago único. Sin cargos automáticos.</p>
          <ul><li>Insignia Pro junto a tu negocio en el catálogo.</li><li>Productos en espacios promocionados con rotación entre proveedores.</li><li>Estadísticas de exposición, carritos y pedidos.</li></ul>
        </div>
        <div className="pro-status">
          <strong>{data.activo ? 'Membresía activa' : data.vigente ? 'Beneficios suspendidos' : data.vence_en ? 'Membresía vencida' : 'Plan gratuito'}</strong>
          {data.vence_en && <p>{data.vigente ? 'Vigente hasta' : 'Venció el'} {date(data.vence_en)}</p>}
          {!data.verificado && <p>Tu negocio necesita la aprobación del administrador para acceder a los beneficios Pro.</p>}
          {!data.vigente && <button className="btn-primary" disabled={busy || !data.verificado || !data.pago_disponible || !stripePromise} onClick={() => action('buy')}>
            {busy ? 'Preparando…' : data.vence_en ? 'Renovar por 30 días' : 'Comprar Pro por 30 días'}</button>}
          <button className="btn-secondary" disabled={busy || !data.pago_disponible} onClick={() => action('verify')}>Verificar mi pago</button>
          <p className="pro-note">Para dejar de usar Pro, solo deja vencer tu membresía. Conservas tu cuenta y tus productos. Puedes renovarla cuando venza.</p>
        </div>
      </section>
      {(!data.pago_disponible || !stripePromise) && <p role="alert">El pago todavía no está disponible. Contacta al administrador.</p>}
      {intent && stripePromise && <Elements stripe={stripePromise}><PaymentForm intent={intent} token={token} onUpdate={update} onClose={() => setIntent(null)} /></Elements>}
      {data.metricas && <section className="pro-analytics"><h2>Tu actividad de los últimos 30 días</h2>
        <div className="pro-metrics">{[['impresiones', 'Exposiciones de productos'], ['carritos', 'Sesiones que agregaron productos'], ['pedidos', 'Pedidos pagados']].map(([id, label]) =>
          <div key={id}><strong>{data.metricas[id]}</strong><span>{label}</span></div>)}</div>
        <p className="pro-note">Exposiciones y carritos: una vez por producto, sesión y día mientras Pro está activo. Los pedidos incluyen tus ventas pagadas del periodo; no se atribuyen automáticamente a la promoción.</p>
      </section>}
      {data.compras.length > 0 && <section className="pro-history"><h2>Mis compras de membresía</h2><ul>{data.compras.map(purchase => <li key={purchase.id}>
        <span>{date(purchase.creado_en)}</span><strong>{money(purchase.monto_centavos)}</strong><span>{purchase.estado === 'aprobado' ? 'Pago confirmado' : 'Pendiente de pago o confirmación'}</span>
      </li>)}</ul></section>}
    </>}
  </main>;
}

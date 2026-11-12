import "./Membresia.css";
const pesosPro = cents => (cents / 100).toLocaleString("es-MX", { style:"currency", currency:"MXN" });
const fechaPro = value => new Date(value).toLocaleString("es-MX", {dateStyle:"long", timeStyle:"short"});

export default function PlanPro({ data, busy, pagoHabilitado, onComprar, onVerificar }) {
  return <section className="pro-plan">
        <div><span className="pro-badge">Proveedor Pro</span><h2>{data.vigente ? 'Tus 30 días Pro' : 'Dale más visibilidad a tu negocio'}</h2>
          <p className="pro-price">{pesosPro(data.precio_centavos)} <small>MXN / 30 días</small></p>
          <p>Pago único. Sin cargos automáticos.</p>
          <ul><li>Insignia Pro junto a tu negocio en el catálogo.</li><li>Productos en espacios promocionados con rotación entre proveedores.</li><li>Estadísticas de exposición, carritos y pedidos.</li></ul>
        </div>
        <div className="pro-status">
          <strong>{data.activo ? 'Membresía activa' : data.vigente ? 'Beneficios suspendidos' : data.vence_en ? 'Membresía vencida' : 'Plan gratuito'}</strong>
          {data.vence_en && <p>{data.vigente ? 'Vigente hasta' : 'Venció el'} {fechaPro(data.vence_en)}</p>}
          {!data.verificado && <p>Tu negocio necesita la aprobación del administrador para acceder a los beneficios Pro.</p>}
          {!data.vigente && <button className="btn-primary" disabled={busy || !data.verificado || !data.pago_disponible || !pagoHabilitado} onClick={onComprar}>
            {busy ? 'Preparando…' : data.vence_en ? 'Renovar por 30 días' : 'Comprar Pro por 30 días'}</button>}
          <button className="btn-secondary" disabled={busy || !data.pago_disponible} onClick={onVerificar}>Verificar mi pago</button>
          <p className="pro-note">Para dejar de usar Pro, solo deja vencer tu membresía. Conservas tu cuenta y tus productos. Puedes renovarla cuando venza.</p>
        </div>
      </section>;
}

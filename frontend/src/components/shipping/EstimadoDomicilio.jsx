import { money } from '../../utils/cart';

export default function EstimadoDomicilio({ datos, tieneDireccion }) {
  if (datos?.impedimento) return <p role="alert">{datos.impedimento}. Puedes elegir «Acordar con el vendedor».</p>;
  return <section className="flete-box" aria-label="Costo del envío a domicilio" aria-live="polite">
    <strong>{datos?.estimado != null ? 'Envío estimado · $' + money(datos.estimado) + ' MXN' : 'Costo del envío'}</strong>
    {!tieneDireccion ? <p>Selecciona una dirección para estimar el flete.</p> :
      !datos ? <p>Calculando el estimado…</p> : <>
        <p>{datos.perecedero
          ? 'El vendedor verificará con FedEx o DHL si pueden entregar estos perecederos en tu domicilio con el empaque, la temperatura y el plazo que necesitan. Si no hay servicio, podrás cancelar desde Mis pedidos.'
          : 'El vendedor puede enviar por Castores, FedEx o DHL según la cobertura de tu domicilio.'}</p>
        {datos.estimado != null ? <>
          <p>{datos.fuente === 'historial' ? 'Referencia de Castores para esta carga y tu código postal.' :
            <>Referencia de Castores para paquetes de hasta 6 kg. El precio final depende de la ruta y las medidas. <a href="https://www.safetystoreee.com/pagos-y-entregas/" target="_blank" rel="noreferrer">Ver referencia comercial</a>.</>}</p>
          <p>Hoy pagas la mercancía. Al hacer el pedido autorizas hasta ${money(datos.estimado)} MXN de envío, que pagarás a la paquetería al recibir. Si cuesta más, te pediremos aprobación en Mis pedidos.</p>
        </> : <p>Hoy pagas la mercancía. El vendedor confirmará el flete en Mis pedidos. Ahí podrás autorizarlo antes del despacho y pagarlo a la paquetería al recibir.</p>}
      </>}
  </section>;
}

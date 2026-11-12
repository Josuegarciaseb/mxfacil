import FooterPageLink from '../components/layout/FooterPageLink';
import './Legal.css';

export default function Terminos() {
  return (
    <article className="legal-page" aria-labelledby="terminos-titulo">
      <header className="legal-page__header">
        <FooterPageLink to="/catalogo">← Volver al catálogo</FooterPageLink>
        <h1 id="terminos-titulo">Términos y condiciones de uso</h1>
        <p className="legal-page__date">Última actualización · <time dateTime="2026-11-12">12 de noviembre de 2026</time></p>
        <p className="legal-page__intro">
          Estos términos regulan el uso de la demostración académica de Comercio Fácil México, una plataforma
          que conecta a proveedores de productos agrícolas al mayoreo con comercios en México.
          Los pedidos, cobros, reembolsos y envíos de la demostración son simulaciones.
        </p>
      </header>

      <section>
        <h2>Alcance de la demostración</h2>
        <p>
          La plataforma permite consultar el catálogo, administrar productos y existencias, generar pedidos y
          seguir su estado. Las publicaciones, los precios, las confirmaciones y los folios se utilizan para
          evaluar el funcionamiento del sistema. En este entorno, generar un pedido no crea una obligación
          de pago, suministro ni entrega.
        </p>
      </section>

      <section>
        <h2>Cuentas y uso permitido</h2>
        <p>
          Utiliza una cuenta de prueba y proporciona únicamente datos ficticios. Emplea una contraseña
          exclusiva para la demostración y conserva en privado tus credenciales y códigos de verificación.
          Usa únicamente el perfil asignado y reporta al equipo del proyecto cualquier acceso que no reconozcas.
        </p>
        <p>
          Las cuentas compradoras consultan el catálogo y gestionan sus pedidos. Las cuentas proveedoras
          administran sus publicaciones y atienden los pedidos que les corresponden. Se prohíbe acceder a
          cuentas ajenas, alterar registros de otras personas, suplantar identidades o publicar contenido
          ilícito, engañoso o que infrinja derechos de terceros.
        </p>
      </section>

      <section>
        <h2>Catálogo, precios y confirmación del pedido</h2>
        <p>
          Las publicaciones identifican al proveedor y muestran la descripción, presentación, precio y
          disponibilidad del producto. Antes de confirmar, revisa las cantidades, la dirección de prueba,
          la forma de entrega y el importe de mercancía que muestra el carrito. Los importes se expresan en
          pesos mexicanos y el sistema muestra el desglose de impuestos que aplica la simulación.
        </p>
        <p>
          Al confirmar se genera un folio y se reservan existencias de prueba. Puedes consultar el folio y
          los estados del pedido y del pago en <strong>Mis pedidos</strong>. Una reserva con pago pendiente
          puede vencer y liberar las unidades de acuerdo con la configuración del medio elegido.
        </p>
      </section>

      <section>
        <h2>Pagos de prueba</h2>
        <p>
          El carrito muestra las formas de pago habilitadas para el pedido. Según la configuración, pueden
          aparecer pagos por pasarela, transferencia o contra entrega. Usa exclusivamente credenciales,
          referencias e instrumentos de prueba. No envíes dinero ni uses tarjetas, cuentas bancarias o
          comprobantes reales. Verifica el estado del pago simulado en el folio antes de repetir un intento.
        </p>
      </section>

      <section>
        <h2>Entrega y seguimiento</h2>
        <p>
          Puedes simular una entrega acordada con el vendedor o, cuando esté disponible, un envío a
          domicilio. El envío a domicilio se ofrece para productos de un mismo proveedor y requiere
          confirmar el pago de prueba de la mercancía antes del despacho simulado. El sistema presenta
          por separado el importe de la mercancía y el flete, que en el flujo se liquida al transportista.
        </p>
        <p>
          El flete mostrado inicialmente puede ser un estimado. Revisa la propuesta de transporte y
          autorízala en el detalle del pedido cuando el sistema lo solicite. Una vez registrado el
          despacho, puedes consultar la guía de prueba y confirmar la recepción desde el folio.
        </p>
      </section>

      <section>
        <h2>Cancelaciones, devoluciones e incidencias</h2>
        <p>
          Si el pago sigue pendiente y el estado del pedido lo permite, selecciona <strong>Cancelar
          pedido</strong> en <strong>Mis pedidos</strong>. Si ya se registró un pago, un despacho o una
          entrega de prueba, reporta la incidencia al equipo del proyecto e indica el folio y lo ocurrido.
          La cancelación del pedido y el registro del reembolso son movimientos distintos dentro de la
          simulación. El estado de reembolso refleja el registro de un comprobante de prueba.
        </p>
        <p>
          Esta edición no fija plazos comerciales de devolución, garantías ni cargos de cancelación.
          Los derechos que resulten aplicables conforme a la legislación mexicana se respetan en todo caso.
        </p>
      </section>

      <section>
        <h2>Reseñas y membresía Pro</h2>
        <p>
          Cuando el pedido cumpla los requisitos que indica el sistema, puedes publicar una reseña sobre
          el producto y el servicio. Usa comentarios de prueba y evita incluir datos personales. En el
          perfil proveedor, la membresía Pro simula un periodo de 30 días mediante un pago único de
          prueba, sin renovación automática.
        </p>
      </section>

      <section>
        <h2>Atención y actualizaciones</h2>
        <p>
          Para reportar un problema, acude a la persona que coordinó tu participación en la demostración.
          Si corresponde, indica el folio de prueba y la pantalla donde ocurrió. Las actualizaciones de
          estos términos se publicarán en esta página con su fecha. Consulta el{' '}
          <FooterPageLink to="/privacidad">aviso de privacidad</FooterPageLink> para conocer qué
          información utiliza el entorno de prueba.
        </p>
      </section>
    </article>
  );
}

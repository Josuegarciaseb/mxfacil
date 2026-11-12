import FooterPageLink from '../components/layout/FooterPageLink';
import './Legal.css';

export default function Privacidad() {
  return (
    <article className="legal-page" aria-labelledby="privacidad-titulo">
      <header className="legal-page__header">
        <FooterPageLink to="/catalogo">← Volver al catálogo</FooterPageLink>
        <h1 id="privacidad-titulo">Aviso de privacidad</h1>
        <p className="legal-page__date">Última actualización · <time dateTime="2026-11-12">12 de noviembre de 2026</time></p>
        <p className="legal-page__intro">
          Este aviso describe la información que utiliza la demostración académica de Comercio Fácil México.
          Participa únicamente con cuentas, domicilios, datos fiscales y medios de pago de prueba.
        </p>
      </header>

      <section>
        <h2>Responsable y alcance</h2>
        <p>
          Comercio Fácil México es el nombre del proyecto académico. La identidad y el domicilio del
          responsable, así como el canal para ejercer derechos de privacidad, se publicarán en este
          aviso antes de habilitar el uso con datos personales reales.
        </p>
      </section>

      <section>
        <h2>Información que utiliza la plataforma</h2>
        <ul>
          <li><strong>Cuenta y acceso.</strong> Nombre, correo electrónico, teléfono cuando se proporciona,
            tipo de cuenta y datos de autenticación. Si utilizas el acceso con Google, cuando esté
            habilitado, la aplicación recibe el nombre, correo e identificador de la cuenta de prueba.</li>
          <li><strong>Perfil del proveedor.</strong> Nombre comercial, datos de contacto, RFC cuando se
            proporciona y publicaciones del catálogo.</li>
          <li><strong>Pedidos y entregas.</strong> Domicilio de prueba, productos, cantidades, importes,
            folios, método y estado del pago, referencias de prueba, datos de seguimiento y reseñas.</li>
          <li><strong>Uso del sistema.</strong> Datos de sesión y del carrito. La demostración registra
            actividad como consultas de productos, adiciones al carrito y pedidos para mostrar
            indicadores del funcionamiento de la plataforma.</li>
        </ul>
        <p>
          Las pruebas no requieren datos sensibles, documentos de identidad, números de tarjetas reales
          ni claves bancarias. Evita incluir esos datos en formularios, reseñas o comprobantes.
        </p>
      </section>

      <section>
        <h2>Finalidades</h2>
        <p>
          La información de prueba se utiliza para administrar cuentas y permisos, mostrar perfiles y
          productos, simular pedidos, pagos, entregas y devoluciones, mostrar reseñas, atender incidencias
          y evaluar el funcionamiento del prototipo. La demostración no contempla el uso de esos datos
          para enviar publicidad ni crear perfiles publicitarios.
        </p>
      </section>

      <section>
        <h2>Visibilidad y servicios externos</h2>
        <p>
          El catálogo puede mostrar el nombre comercial, las publicaciones del proveedor y los
          comentarios y calificaciones de sus productos. Quienes intervienen en la prueba del pedido
          pueden consultar la información operativa que les corresponda, como el folio, los productos
          y los datos de entrega necesarios para atenderlo.
        </p>
        <p>
          Según las integraciones habilitadas, Google puede intervenir en el inicio de sesión, Stripe,
          PayPal o Mercado Pago en la simulación de pagos, y los servicios de logística en la consulta
          de cotizaciones o guías. Cada servicio puede recibir información necesaria para su función,
          como el identificador de la cuenta de prueba, la referencia y el importe del pedido o los datos
          de origen y destino. Si pruebas una integración, utiliza su entorno y sus credenciales de prueba.
        </p>
      </section>

      <section>
        <h2>Cookies y almacenamiento del navegador</h2>
        <p>
          La plataforma utiliza cookies y almacenamiento local o de sesión para mantener el acceso,
          proteger formularios y conservar el carrito o el estado temporal de ciertos recorridos de
          prueba. Puedes eliminarlos desde la configuración del navegador. Al hacerlo, podrías perder
          la sesión y el carrito guardado en ese dispositivo.
        </p>
      </section>

      <section>
        <h2>Seguridad y conservación</h2>
        <p>
          El sistema limita las funciones según el rol, protege las contraseñas con un hash y ofrece
          verificación en dos pasos para las cuentas compatibles. Los registros de prueba pueden
          permanecer en el servidor para reproducir los recorridos y diagnosticar incidencias hasta
          que se limpie o restablezca el entorno.
        </p>
      </section>

      <section>
        <h2>Derechos ARCO, revocación y limitación del uso</h2>
        <p>
          Conforme a la legislación aplicable, la persona titular puede solicitar acceso, rectificación,
          cancelación u oposición al tratamiento de sus datos personales, así como revocar su
          consentimiento o solicitar que se limite el uso o divulgación de sus datos, según corresponda.
        </p>
        <p>
          Una solicitud ARCO debe incluir el nombre de la persona titular, un medio para recibir
          notificaciones, la acreditación de su identidad o representación y el derecho que solicita
          ejercer. Salvo para el acceso, debe describir los datos a los que se refiere. También puede
          aportar información que facilite su localización. Si solicita una corrección, debe indicar
          el cambio y acompañar el soporte correspondiente. Envía documentos de identidad únicamente
          a través de un canal verificado.
        </p>
        <p>
          Cuando resulte aplicable la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares, el plazo general para comunicar la determinación sobre una solicitud ARCO es
          de 20 días hábiles desde su recepción. Si procede, se hará efectiva dentro de los 15 días
          hábiles siguientes a la comunicación. La ley permite una sola ampliación justificada por
          un periodo igual.
        </p>
        <p>
          Si ingresaste datos reales por error durante la demostración, avisa a la persona que la
          coordinó e indica dónde quedaron registrados para que pueda canalizar el reporte.
        </p>
      </section>

      <section>
        <h2>Cambios al aviso</h2>
        <p>
          La versión actualizada se publicará en esta página, con la fecha de modificación en el
          encabezado. Consulta también los{' '}
          <FooterPageLink to="/terminos">términos y condiciones de uso</FooterPageLink>.
        </p>
      </section>
    </article>
  );
}

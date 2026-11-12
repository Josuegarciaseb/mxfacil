import { useId, useState } from "react";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";
import FooterPageLink from "./FooterPageLink";

const guides = {
  buying: {
    title: "Cómo comprar",
    content: (
      <ol>
        <li>Revisa la presentación y el precio con IVA en la tarjeta del producto.</li>
        <li>Elige cuántas cajas, costales o unidades necesitas y agrégalas al carrito.</li>
        <li>Abre el carrito e inicia sesión. Elige la dirección de entrega y el método de pago, y revisa el total antes de confirmar.</li>
      </ol>
    ),
  },
  payments: {
    title: "Formas de pago",
    content: (
      <>
        <p>El carrito muestra los métodos habilitados para tu pedido. Pueden incluir tarjeta, PayPal, Mercado Pago, transferencia bancaria o pago contra entrega.</p>
        <p>Con <strong>Envío a domicilio</strong> pagas la mercancía al comprar. En <strong>Mis pedidos</strong> puedes revisar la paquetería y el flete, autorizarlo cuando corresponda y consultar la guía después del despacho.</p>
        <p>Si un pago en línea queda pendiente, abre el pedido en <strong>Mis pedidos</strong> y selecciona <strong>Continuar pago</strong>.</p>
      </>
    ),
  },
  selling: {
    title: "Cómo vender",
    content: (
      <ol>
        <li>Al registrarte, selecciona <strong>Soy Vendedor</strong> y completa los datos de tu cuenta.</li>
        <li>En tu panel, abre <strong>Mis Productos</strong> y pulsa el botón <strong>+</strong> para agregar un producto.</li>
        <li>Indica el nombre, la categoría, la presentación, el precio y las existencias. Puedes añadir una foto para que los compradores identifiquen tu producto.</li>
        <li>Para enviar un pedido a domicilio, abre <strong>Pedidos → Registrar flete final</strong>, selecciona la paquetería y registra la tarifa. Cuando entregues el paquete a la paquetería, guarda la guía en el pedido.</li>
      </ol>
    ),
  },
  security: {
    title: "Seguridad de mi cuenta",
    content: (
      <p>En <strong>Mi perfil</strong>, abre <strong>Autenticación de dos factores</strong> y selecciona <strong>Activar MFA</strong>. Escanea el código QR con tu aplicación de autenticación e ingresa el código de seis dígitos para terminar.</p>
    ),
  },
};

export default function FooterDirectory({ isSmall, isGuest, onCartOpen, onChooseAddress, contactEmail }) {
  const panelId = useId();
  const [userExpanded, setUserExpanded] = useState(null);
  const expanded = userExpanded ?? !isSmall;
  const [guide, setGuide] = useState(null);

  function guideButton(topic) {
    return <button type="button" aria-haspopup="dialog" onClick={() => setGuide(topic)}>{topic.title}</button>;
  }

  return (
    <div className="footer-directory">
      <button type="button" className="footer-directory-toggle" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setUserExpanded(!expanded)}>
        Más información <Icon name="chevronDown" size={15} />
      </button>
      <nav id={panelId} hidden={!expanded} aria-label="Más información de Comercio Fácil">
        <div className="footer-directory-columns">
          <div>
            <h2>Comprar al mayoreo</h2>
            {guideButton(guides.buying)}
            <button type="button" aria-haspopup="dialog" onClick={onCartOpen}>Ver mi carrito</button>
            {isGuest && <FooterPageLink to="/auth?registro=cliente">Crear cuenta de comprador</FooterPageLink>}
          </div>
          <div>
            <h2>Pagos y envíos</h2>
            {guideButton(guides.payments)}
            <FooterPageLink to="/mis-pedidos">Consultar un envío</FooterPageLink>
            <button type="button" onClick={onChooseAddress} aria-haspopup={isGuest ? undefined : "dialog"}>Direcciones de entrega</button>
          </div>
          <div>
            <h2>Para proveedores</h2>
            {guideButton(guides.selling)}
            {isGuest && <FooterPageLink to="/auth?registro=vendedor">Registro de vendedor</FooterPageLink>}
            <a href={`mailto:${contactEmail}?subject=Consulta%20de%20proveedor`}>Contacto para proveedores</a>
          </div>
          <div>
            <h2>Ayuda y contacto</h2>
            <a href={`mailto:${contactEmail}?subject=Ayuda%20con%20un%20pedido`}>Ayuda con un pedido</a>
            {guideButton(guides.security)}
          </div>
        </div>
      </nav>
      {guide && (
        <Modal open title={guide.title} onClose={() => setGuide(null)}>
          <div className="footer-guide-copy">{guide.content}</div>
        </Modal>
      )}
    </div>
  );
}

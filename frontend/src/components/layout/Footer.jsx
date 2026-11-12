import Logo from "../ui/Logo";
import Icon from "../ui/Icon";
import FooterDirectory from "./FooterDirectory";
import FooterPageLink from "./FooterPageLink";
import { CONTACT_EMAIL } from "../../constants";
import "./Footer.css";

const BG          = "#173404";
const BORDER      = "rgba(255,255,255,.07)";
const TEXT_MUTED  = "#89a880";
const ACCENT      = "#a8c87e";

const LINKS_NAV = [
  { label: "Catálogo",        to: "/catalogo"        },
  { label: "Mis pedidos",     to: "/mis-pedidos"     },
  { label: "Mi perfil",       to: "/mi-perfil"       },
];

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
    textTransform: "uppercase", color: ACCENT,
    fontFamily: "'Sora',sans-serif", marginBottom: 14,
  }}>
    {children}
  </div>
);

const Footer = ({ isSmall, isGuest, onCartOpen, onChooseAddress }) => {
  const innerPad = isSmall ? "32px 20px 28px" : "48px 56px 36px";

  return (
    <footer id="pie-de-pagina" style={{
      marginTop: isSmall ? 48 : 72,
      background: BG,
    }}>
      <FooterDirectory isSmall={isSmall} isGuest={isGuest} onCartOpen={onCartOpen} onChooseAddress={onChooseAddress} contactEmail={CONTACT_EMAIL} />

      {/* ── Contenido principal ── */}
      <div style={{
        padding: innerPad,
        display: isSmall ? "flex" : "grid",
        flexDirection: isSmall ? "column" : undefined,
        gridTemplateColumns: isSmall ? undefined : "2fr 1fr 1fr",
        gap: isSmall ? 36 : 48,
        maxWidth: 1100,
        margin: "0 auto",
      }}>

        {/* Columna marca */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Logo size={34} showText subtitle="Mayoreo · México" />

          <p style={{
            color: TEXT_MUTED, fontSize: 13, lineHeight: 1.65,
            fontFamily: "'Sora',sans-serif", margin: 0, maxWidth: 320,
          }}>
            Frutas y verduras, granos, legumbres y semillas al mayoreo para comercios en México.
          </p>

        </div>

        {/* Columna navegar */}
        <div>
          <SectionTitle>Navegar</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {LINKS_NAV.map(({ label, to }) => (
              <FooterPageLink key={to} to={to} className="footer-nav-link">{label}</FooterPageLink>
            ))}
          </div>
        </div>

        {/* Columna información */}
        <div>
          <SectionTitle>Información</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "3px 0",
            }}>
              <Icon name="mail" size={13} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
              <a className="footer-contact" style={{ fontSize: 13 }} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "3px 0",
            }}>
              <Icon name="truck" size={13} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
              <span style={{
                color: TEXT_MUTED, fontSize: 13,
                fontFamily: "'Sora',sans-serif",
              }}>
                Envíos a toda la República
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "3px 0",
            }}>
              <Icon name="shield" size={13} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
              <span style={{
                color: TEXT_MUTED, fontSize: 13,
                fontFamily: "'Sora',sans-serif",
              }}>
                Compra segura y protegida
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra inferior ── */}
      <div style={{
        borderTop: `1px solid ${BORDER}`,
        padding: isSmall ? "16px 20px" : "18px 56px",
        display: "flex",
        flexDirection: isSmall ? "column" : "row",
        alignItems: isSmall ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 8,
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        <span style={{
          color: TEXT_MUTED, fontSize: 12,
          fontFamily: "'Sora',sans-serif",
        }}>
          © {new Date().getFullYear()} Comercio Fácil · MXFácil · Todos los derechos reservados
        </span>
        <div className="footer-utilities">
          <FooterPageLink to="/terminos" className="footer-nav-link">Términos y condiciones</FooterPageLink>
          <FooterPageLink to="/privacidad" className="footer-nav-link">Aviso de privacidad</FooterPageLink>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            color: TEXT_MUTED, fontSize: 12,
            fontFamily: "'Sora',sans-serif",
          }}>
            <Icon name="map" size={12} />
            Hecho en México
          </span>
          <a className="footer-back-to-top" href="#inicio-tienda">
            Volver arriba <Icon name="arrowRight" size={13} style={{ transform: "rotate(-90deg)" }} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

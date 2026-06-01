import Logo from "../ui/Logo";
import Icon from "../ui/Icon";

const BG          = "#173404";
const BORDER      = "rgba(255,255,255,.07)";
const TEXT_MUTED  = "#89a880";
const TEXT_BRIGHT = "#e0edd5";
const ACCENT      = "#639922";

const LINKS_NAV = [
  { label: "Catálogo",        id: "catalogo"        },
  { label: "Mis pedidos",     id: "mis-pedidos"     },
  { label: "Mis direcciones", id: "mis-direcciones" },
  { label: "Mi perfil",       id: "mi-perfil"       },
];

const PAYMENT_BADGES = ["Stripe", "MercadoPago", "PayPal"];

const FooterLink = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: "none", border: "none", padding: "3px 0",
      color: TEXT_MUTED, fontFamily: "'Sora',sans-serif",
      fontSize: 13, cursor: "pointer", textAlign: "left",
      transition: "color .15s", display: "block",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_BRIGHT)}
    onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
  >
    {label}
  </button>
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
    textTransform: "uppercase", color: ACCENT,
    fontFamily: "'Sora',sans-serif", marginBottom: 14,
  }}>
    {children}
  </div>
);

const Footer = ({ onNav, isSmall, paddingH, paddingB }) => {
  const innerPad = isSmall ? "32px 20px 28px" : "48px 56px 36px";

  return (
    <footer style={{
      marginLeft:   -paddingH,
      marginRight:  -paddingH,
      marginBottom: -paddingB,
      background:   BG,
      borderTop:    `1px solid ${BORDER}`,
    }}>

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
            Tu plataforma de comercio al mayoreo en México. Precios competitivos para
            negocios, emprendedores y revendedores de todo el país.
          </p>

          {/* Badges de pago */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {PAYMENT_BADGES.map((name) => (
              <span key={name} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px",
                background: "rgba(255,255,255,.06)",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                fontSize: 11, fontWeight: 600,
                color: TEXT_MUTED,
                fontFamily: "'Sora',sans-serif",
              }}>
                <Icon name="creditCard" size={12} />
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Columna navegar */}
        <div>
          <SectionTitle>Navegar</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {LINKS_NAV.map(({ label, id }) => (
              <FooterLink key={id} label={label} onClick={() => onNav(id)} />
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
              <span style={{
                color: TEXT_MUTED, fontSize: 13,
                fontFamily: "'Sora',sans-serif",
              }}>
                contacto@mxfacil.mx
              </span>
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
          color: "rgba(137,168,128,.45)", fontSize: 12,
          fontFamily: "'Sora',sans-serif",
        }}>
          © {new Date().getFullYear()} Comercio Fácil · MXFácil · Todos los derechos reservados
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          color: "rgba(137,168,128,.45)", fontSize: 12,
          fontFamily: "'Sora',sans-serif",
        }}>
          <Icon name="map" size={12} />
          Hecho en México
        </span>
      </div>
    </footer>
  );
};

export default Footer;

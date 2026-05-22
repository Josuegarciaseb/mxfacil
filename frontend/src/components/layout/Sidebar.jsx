import Icon from "../ui/Icon";
import Logo from "../ui/Logo";

const NAV_ADMIN = [
  { id: "dashboard",     icon: "dashboard",   label: "Dashboard" },
  { id: "productos",     icon: "package",     label: "Productos" },
  { id: "pedidos-admin", icon: "cart",        label: "Pedidos" },
  { id: "usuarios",      icon: "users",       label: "Usuarios" },
  { id: "categorias",    icon: "tag",         label: "Categorías" },
  { id: "proveedores",   icon: "truck",       label: "Proveedores" },
  { id: "inventario",    icon: "box",         label: "Inventario" },
];

const NAV_VENDEDOR = [
  { id: "vendedor-dashboard", icon: "dashboard",   label: "Mi Panel" },
  { id: "vendedor-productos", icon: "package",     label: "Mis Productos" },
  { id: "vendedor-pedidos",   icon: "shoppingBag", label: "Pedidos" },
  { id: "vendedor-perfil",    icon: "user",        label: "Mi Perfil" },
];

const NAV_CLIENTE = [
  { id: "catalogo",        icon: "store",       label: "Catálogo" },
  { id: "mis-pedidos",     icon: "shoppingBag", label: "Mis Pedidos" },
  { id: "mis-direcciones", icon: "mapPin",      label: "Mis Direcciones" },
  { id: "mi-perfil",       icon: "user",        label: "Mi Perfil" },
];

const BG           = "#173404";
const BG_HOVER     = "rgba(255,255,255,.06)";
const BG_ACTIVE    = "rgba(99,153,34,.18)";
const TEXT_MUTED   = "#89a880";
const TEXT_BRIGHT  = "#e0edd5";
const TEXT_ACTIVE  = "#C0DD97";
const BORDER_COLOR = "rgba(255,255,255,.07)";
const ACCENT       = "#639922";

const Sidebar = ({ user, active, onNav, onLogout, isOpen, onClose, isMobile, cartCount, onCartOpen }) => {
  const isAdmin    = user?.rol === "admin";
  const isVendedor = user?.rol === "vendedor";
  const isCliente  = user?.rol === "cliente";
  const navItems   = isAdmin ? NAV_ADMIN : isVendedor ? NAV_VENDEDOR : NAV_CLIENTE;

  const handleNav = (id) => { onNav(id); if (isMobile) onClose(); };

  return (
    <>
      {isMobile && (
        <div
          className={`sidebar-overlay${isOpen ? " visible" : ""}`}
          onClick={onClose}
        />
      )}

      <div
        className="sidebar-desktop"
        style={{
          width: isMobile ? 272 : "var(--sidebar-w, 256px)",
          minWidth: 256,
          background: BG,
          borderRight: `1px solid ${BORDER_COLOR}`,
          height: "100vh",
          position: "fixed",
          top: 0, left: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 200,
        }}
      >
        {/* ── Logo ── */}
        <div style={{
          padding: "20px 18px 16px",
          borderBottom: `1px solid ${BORDER_COLOR}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Logo size={40} subtitle="Mayoreo · México" />
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,.07)", border: "none",
                borderRadius: 8, padding: "6px 7px", cursor: "pointer",
                display: "flex", alignItems: "center", color: TEXT_MUTED,
                transition: "all .15s",
              }}
            >
              <Icon name="x" size={17} />
            </button>
          )}
        </div>

        {/* ── Usuario ── */}
        <div style={{
          padding: "13px 16px",
          borderBottom: `1px solid ${BORDER_COLOR}`,
          background: "rgba(255,255,255,.025)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, flexShrink: 0,
              background: isAdmin
                ? `linear-gradient(135deg,${ACCENT},#27500A)`
                : "linear-gradient(135deg,#1D4ED8,#1e3a5f)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#fff",
              border: "2px solid rgba(255,255,255,.1)",
              fontFamily: "'Sora',sans-serif",
            }}>
              {user?.nombre?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                fontFamily: "'Sora',sans-serif",
              }}>
                {user?.nombre}
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                background: isAdmin ? `rgba(99,153,34,.3)` : "rgba(255,255,255,.08)",
                color: isAdmin ? TEXT_ACTIVE : TEXT_MUTED,
                padding: "2px 8px", borderRadius: 99,
                fontFamily: "'Sora',sans-serif",
              }}>
                {isAdmin ? "Administrador" : isVendedor ? "Vendedor" : "Mayorista"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Navegación ── */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
            color: "rgba(137,168,128,.45)",
            padding: "0 8px", marginBottom: 8,
            fontFamily: "'Sora',sans-serif",
          }}>
            {isAdmin ? "Administración" : isVendedor ? "Panel Vendedor" : "Mi Cuenta"}
          </div>

          {navItems.map(({ id, icon, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px",
                  paddingLeft: isActive ? "9px" : "12px",
                  borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  borderRadius: "0 9px 9px 0",
                  cursor: "pointer",
                  transition: "all .15s",
                  fontFamily: "'Sora',sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  textAlign: "left",
                  marginBottom: 2,
                  background: isActive ? BG_ACTIVE : "transparent",
                  color: isActive ? TEXT_ACTIVE : TEXT_MUTED,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = BG_HOVER;
                    e.currentTarget.style.color = TEXT_BRIGHT;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = TEXT_MUTED;
                  }
                }}
              >
                <Icon
                  name={icon}
                  size={17}
                  style={{ color: isActive ? TEXT_ACTIVE : "rgba(137,168,128,.65)", flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && (
                  <Icon name="chevronRight" size={12} style={{ color: `rgba(192,221,151,.45)` }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Carrito (cliente, desktop) ── */}
        {isCliente && !isMobile && (
          <div style={{ padding: "0 10px 8px" }}>
            <button
              onClick={onCartOpen}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px",
                borderRadius: 10, border: "none",
                cursor: "pointer",
                background: cartCount > 0
                  ? "linear-gradient(135deg,var(--gold-light),var(--gold))"
                  : "rgba(255,255,255,.05)",
                color: cartCount > 0 ? "#fff" : TEXT_MUTED,
                fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14,
                transition: "all .2s",
                boxShadow: cartCount > 0 ? "var(--shadow-gold)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!cartCount) {
                  e.currentTarget.style.background = BG_HOVER;
                  e.currentTarget.style.color = TEXT_BRIGHT;
                }
              }}
              onMouseLeave={(e) => {
                if (!cartCount) {
                  e.currentTarget.style.background = "rgba(255,255,255,.05)";
                  e.currentTarget.style.color = TEXT_MUTED;
                }
              }}
            >
              <Icon name="cart" size={17} />
              <span style={{ flex: 1 }}>Mi Carrito</span>
              {cartCount > 0 && (
                <span style={{
                  background: "rgba(255,255,255,.28)",
                  borderRadius: 20, padding: "2px 10px",
                  fontSize: 13, fontWeight: 700,
                }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Cerrar sesión ── */}
        <div style={{ padding: "10px", borderTop: `1px solid ${BORDER_COLOR}` }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              borderRadius: 9, border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "rgba(137,168,128,.55)",
              fontFamily: "'Sora',sans-serif", fontWeight: 400, fontSize: 14,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,.12)";
              e.currentTarget.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(137,168,128,.55)";
            }}
          >
            <Icon name="logout" size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

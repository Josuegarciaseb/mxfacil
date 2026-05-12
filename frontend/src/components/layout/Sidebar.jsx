import Icon from "../ui/Icon";

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

const SIDEBAR_BG     = "#0D1B2A";
const SIDEBAR_HOVER  = "rgba(255,255,255,.06)";
const SIDEBAR_ACTIVE = "rgba(200,32,42,.18)";
const TEXT_MUTED     = "#8DA2B5";
const TEXT_BRIGHT    = "#E2EAF4";
const BORDER_COLOR   = "rgba(255,255,255,.07)";

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
          background: SIDEBAR_BG,
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
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: "linear-gradient(135deg, #E53935 0%, #A01820 100%)",
              borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(200,32,42,.38)",
            }}>
              <Icon name="store" size={20} style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: TEXT_BRIGHT, lineHeight: 1.2, letterSpacing: "-.01em" }}>
                Comercio Fácil
              </div>
              <div style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
                Mayoreo · México
              </div>
            </div>
          </div>
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
                ? "linear-gradient(135deg,#E53935,#A01820)"
                : "linear-gradient(135deg,#1D4ED8,#1e3a5f)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff",
              border: "2px solid rgba(255,255,255,.1)",
            }}>
              {user?.nombre?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: TEXT_BRIGHT,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {user?.nombre}
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                background: isAdmin ? "rgba(200,32,42,.3)" : "rgba(255,255,255,.08)",
                color: isAdmin ? "#FCA5A5" : TEXT_MUTED,
                padding: "2px 8px", borderRadius: 99,
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
            color: "rgba(141,162,181,.45)",
            padding: "0 8px", marginBottom: 8,
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
                  borderLeft: isActive ? "3px solid var(--red)" : "3px solid transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  borderRadius: "0 9px 9px 0",
                  cursor: "pointer",
                  transition: "all .15s",
                  fontFamily: "'Outfit',sans-serif",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 14,
                  textAlign: "left",
                  marginBottom: 2,
                  background: isActive ? SIDEBAR_ACTIVE : "transparent",
                  color: isActive ? "#FCA5A5" : TEXT_MUTED,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = SIDEBAR_HOVER;
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
                  style={{ color: isActive ? "#FCA5A5" : "rgba(141,162,181,.65)", flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && (
                  <Icon name="chevronRight" size={12} style={{ color: "rgba(252,165,165,.45)" }} />
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
                fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 14,
                transition: "all .2s",
                boxShadow: cartCount > 0 ? "var(--shadow-gold)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!cartCount) {
                  e.currentTarget.style.background = SIDEBAR_HOVER;
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
              color: "rgba(141,162,181,.55)",
              fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: 14,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,.12)";
              e.currentTarget.style.color = "#FCA5A5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(141,162,181,.55)";
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

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
  { id: "catalogo",         icon: "store",      label: "Catálogo" },
  { id: "mis-pedidos",      icon: "shoppingBag",label: "Mis Pedidos" },
  { id: "mis-direcciones",  icon: "mapPin",     label: "Mis Direcciones" },
  { id: "mi-perfil",        icon: "user",       label: "Mi Perfil" },
];

const Sidebar = ({ user, active, onNav, onLogout, isOpen, onClose, isMobile }) => {
  const isAdmin    = user?.rol === "admin";
  const isVendedor = user?.rol === "vendedor";
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
          width: isMobile ? 260 : "var(--sidebar-w, 248px)",
          minWidth: 248,
          background: "var(--white)",
          borderRight: "1px solid var(--gray-200)",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 200,
        }}
        ref={(el) => {
          if (el)
            el.style.transform =
              isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : "";
        }}
      >
        {/* ── Logo ── */}
        <div
          style={{
            padding: "18px 18px 14px",
            borderBottom: "1px solid var(--gray-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38, height: 38,
                background: "var(--red)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--shadow-red)",
                flexShrink: 0,
              }}
            >
              <Icon name="store" size={19} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--gray-900)", lineHeight: 1.2 }}>
                Comercio Fácil
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 500 }}>
                México
              </div>
            </div>
          </div>
          {isMobile && (
            <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}>
              <Icon name="x" size={18} style={{ color: "var(--gray-500)" }} />
            </button>
          )}
        </div>

        {/* ── User info ── */}
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--gray-100)",
            background: isAdmin ? "var(--red-pale)" : "var(--gray-50)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34, height: 34,
                background: isAdmin ? "var(--red)" : "var(--gray-600)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
                flexShrink: 0,
              }}
            >
              {user?.nombre?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13, fontWeight: 700,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  color: "var(--gray-800)",
                }}
              >
                {user?.nombre}
              </div>
              <span
                className={`badge ${isAdmin ? "badge-red" : "badge-gray"}`}
                style={{ fontSize: 10, padding: "1px 7px" }}
              >
                {isAdmin ? "Administrador" : isVendedor ? "Vendedor" : "Cliente"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: "10px", overflowY: "auto" }}>
          <div
            style={{
              fontSize: 10, fontWeight: 700, color: "var(--gray-400)",
              textTransform: "uppercase", letterSpacing: ".1em",
              padding: "4px 6px", marginBottom: 4,
            }}
          >
            {isAdmin ? "Administración" : "Mi cuenta"}
          </div>

          {navItems.map(({ id, icon, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 12px",
                  borderRadius: 9, border: "none",
                  cursor: "pointer",
                  transition: "all .15s",
                  fontFamily: "'Outfit',sans-serif",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  textAlign: "left",
                  marginBottom: 2,
                  background: isActive ? "var(--red)" : "transparent",
                  color: isActive ? "white" : "var(--gray-600)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--red-pale)";
                    e.currentTarget.style.color = "var(--red)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--gray-600)";
                  }
                }}
              >
                <Icon
                  name={icon}
                  size={17}
                  style={{ color: isActive ? "white" : "var(--gray-400)" }}
                />
                {label}
                {isActive && (
                  <Icon
                    name="chevronRight"
                    size={13}
                    style={{ marginLeft: "auto", color: "rgba(255,255,255,.7)" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Logout ── */}
        <div style={{ padding: "10px", borderTop: "1px solid var(--gray-100)" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 11,
              padding: "10px 12px",
              borderRadius: 9, border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "var(--gray-500)",
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 500, fontSize: 14,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--gray-500)";
            }}
          >
            <Icon name="logout" size={16} style={{ color: "var(--gray-400)" }} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

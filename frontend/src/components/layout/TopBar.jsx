import Icon from "../ui/Icon";

const PAGE_LABELS = {
  catalogo:             "Catálogo",
  "mis-pedidos":        "Mis Pedidos",
  "mis-direcciones":    "Mis Direcciones",
  "mi-perfil":          "Mi Perfil",
  dashboard:            "Dashboard",
  productos:            "Productos",
  "pedidos-admin":      "Pedidos",
  usuarios:             "Usuarios",
  categorias:           "Categorías",
  proveedores:          "Proveedores",
  inventario:           "Inventario",
  "vendedor-dashboard": "Mi Panel",
  "vendedor-productos": "Mis Productos",
  "vendedor-pedidos":   "Pedidos",
  "vendedor-perfil":    "Mi Perfil",
};

const TopBar = ({ user, onMenuOpen, cartCount, onCartOpen, page }) => (
  <div style={{
    position: "fixed", top: 0, left: 0, right: 0,
    height: "var(--topbar-h)",
    background: "#0D1B2A",
    borderBottom: "1px solid rgba(255,255,255,.07)",
    display: "flex", alignItems: "center",
    padding: "0 12px", gap: 10,
    zIndex: 150,
    boxShadow: "0 2px 12px rgba(0,0,0,.2)",
  }}>
    <button
      onClick={onMenuOpen}
      style={{
        background: "rgba(255,255,255,.07)", border: "none", borderRadius: 9,
        padding: "8px 9px", cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.12)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.07)")}
    >
      <Icon name="menu" size={20} style={{ color: "#E2EAF4" }} />
    </button>

    <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        background: "linear-gradient(135deg,#E53935,#A01820)",
        borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(200,32,42,.4)",
      }}>
        <Icon name="store" size={15} style={{ color: "#fff" }} />
      </div>
      <span style={{
        fontWeight: 700, fontSize: 15, color: "#E2EAF4",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {PAGE_LABELS[page] || "Comercio Fácil"}
      </span>
    </div>

    {user?.rol === "cliente" && (
      <button
        onClick={onCartOpen}
        style={{
          position: "relative", flexShrink: 0,
          background: cartCount > 0
            ? "linear-gradient(135deg,var(--gold-light),var(--gold))"
            : "rgba(255,255,255,.07)",
          border: "none", borderRadius: 10,
          padding: "8px 11px",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          color: cartCount > 0 ? "#fff" : "#8DA2B5",
          fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
          transition: "all .2s",
          boxShadow: cartCount > 0 ? "var(--shadow-gold)" : "none",
        }}
      >
        <Icon name="cart" size={18} />
        {cartCount > 0 && <span style={{ fontSize: 13 }}>{cartCount}</span>}
      </button>
    )}
  </div>
);

export default TopBar;

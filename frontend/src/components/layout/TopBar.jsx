import Icon from "../ui/Icon";

const PAGE_LABELS = {
  catalogo:           "Catálogo",
  "mis-pedidos":      "Mis Pedidos",
  "mis-direcciones":  "Mis Direcciones",
  "mi-perfil":        "Mi Perfil",
  dashboard:          "Dashboard",
  productos:          "Productos",
  "pedidos-admin":    "Pedidos",
  usuarios:           "Usuarios",
  categorias:         "Categorías",
  proveedores:        "Proveedores",
  inventario:         "Inventario",
  "vendedor-dashboard":"Mi Panel",
  "vendedor-productos":"Mis Productos",
  "vendedor-pedidos": "Pedidos",
  "vendedor-perfil":  "Mi Perfil",
};

const TopBar = ({ user, onMenuOpen, cartCount, onCartOpen, page }) => (
  <div
    style={{
      position: "fixed", top: 0, left: 0, right: 0,
      height: "var(--topbar-h)",
      background: "var(--white)",
      borderBottom: "1px solid var(--gray-200)",
      display: "flex", alignItems: "center",
      padding: "0 16px", gap: 12,
      zIndex: 150,
      boxShadow: "var(--shadow-sm)",
    }}
  >
    <button className="btn-ghost" onClick={onMenuOpen} style={{ padding: 8, flexShrink: 0 }}>
      <Icon name="menu" size={22} style={{ color: "var(--gray-700)" }} />
    </button>

    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div
        style={{
          width: 28, height: 28,
          background: "var(--red)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="store" size={15} style={{ color: "white" }} />
      </div>
      <span style={{ fontWeight: 800, fontSize: 15, color: "var(--gray-900)" }}>
        {PAGE_LABELS[page] || "Comercio Fácil"}
      </span>
    </div>

    {user?.rol === "cliente" && (
      <button
        onClick={onCartOpen}
        style={{
          position: "relative",
          background: cartCount > 0 ? "var(--red)" : "var(--gray-100)",
          border: "none", borderRadius: 10,
          padding: "8px 10px",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          color: cartCount > 0 ? "#fff" : "var(--gray-600)",
          fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13,
          transition: "all .2s",
        }}
      >
        <Icon name="cart" size={18} />
        {cartCount > 0 && <span style={{ fontSize: 13, fontWeight: 700 }}>{cartCount}</span>}
      </button>
    )}
  </div>
);

export default TopBar;

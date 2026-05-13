import { useState, useEffect } from "react";

import { injectStyles }      from "./styles/globalStyles";
import { useBreakpoint }     from "./hooks/useBreakpoint";

import Icon                  from "./components/ui/Icon";
import Sidebar               from "./components/layout/Sidebar";
import TopBar                from "./components/layout/TopBar";
import MarketplaceHeader     from "./components/layout/MarketplaceHeader";
import VendorHeader          from "./components/layout/VendorHeader";
import ToastContainer        from "./components/ui/ToastContainer";

import AdminDashboard        from "./pages/admin/Dashboard";
import AdminProductos        from "./pages/admin/Productos";
import AdminPedidos          from "./pages/admin/Pedidos";
import AdminUsuarios         from "./pages/admin/Usuarios";
import AdminCategorias       from "./pages/admin/Categorias";
import AdminProveedores      from "./pages/admin/Proveedores";
import AdminInventario       from "./pages/admin/Inventario";

import VendedorDashboard     from "./pages/vendor/Dashboard";
import VendedorProductos     from "./pages/vendor/Productos";

import ClientCatalogo        from "./pages/client/Catalogo";
import ClientPedidos         from "./pages/client/Pedidos";
import ClientDirecciones     from "./pages/client/Direcciones";
import ClientPerfil          from "./pages/client/Perfil";
import CartModal             from "./pages/client/CartModal";

import AuthPage              from "./pages/AuthPage";

const getStoredUser  = () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } };
const getDefaultPage = (u) => u?.rol === "admin" ? "dashboard" : u?.rol === "vendedor" ? "vendedor-dashboard" : "catalogo";

const MKT_H_DESKTOP = 112;
const MKT_H_SMALL   = 58;

export default function App() {
  const [user,        setUser]        = useState(getStoredUser);
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null);
  const [page,        setPage]        = useState(() => getDefaultPage(getStoredUser()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [cart,        setCart]        = useState([]);

  const [catalogSearch,     setCatalogSearch]     = useState("");
  const [catalogCat,        setCatalogCat]        = useState("");
  const [catalogCategorias, setCatalogCategorias] = useState([]);

  const { isDesktop, isSmall } = useBreakpoint();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);

  const handleLogin = (u, t) => { setUser(u); setToken(t); setPage(getDefaultPage(u)); };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); setToken(null);
  };

  const handleUserUpdate = (u) => {
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  if (!user || !token) {
    return (
      <>
        <ToastContainer />
        <AuthPage onLogin={handleLogin} />
      </>
    );
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const isCliente  = user.rol === "cliente";
  const isVendedor = user.rol === "vendedor";

  const renderPage = () => {
    switch (page) {
      case "dashboard":          return <AdminDashboard    token={token} />;
      case "productos":          return <AdminProductos    token={token} />;
      case "pedidos-admin":      return <AdminPedidos      token={token} />;
      case "usuarios":           return <AdminUsuarios     token={token} currentUser={user} />;
      case "categorias":         return <AdminCategorias   token={token} />;
      case "proveedores":        return <AdminProveedores  token={token} />;
      case "inventario":         return <AdminInventario   token={token} />;
      case "vendedor-dashboard": return <VendedorDashboard token={token} user={user} />;
      case "vendedor-productos": return <VendedorProductos token={token} user={user} />;
      case "vendedor-pedidos":   return <AdminPedidos      token={token} />;
      case "vendedor-perfil":    return <ClientPerfil      token={token} user={user} onUpdate={handleUserUpdate} />;
      case "catalogo":           return (
        <ClientCatalogo
          token={token}
          setCart={setCart}
          externalSearch={catalogSearch}
          externalCatFilter={catalogCat}
          onCatFilter={setCatalogCat}
          onCategoriasFetched={setCatalogCategorias}
        />
      );
      case "mis-pedidos":        return <ClientPedidos     token={token} />;
      case "mis-direcciones":    return <ClientDirecciones token={token} />;
      case "mi-perfil":          return <ClientPerfil      token={token} user={user} onUpdate={handleUserUpdate} />;
      default:                   return null;
    }
  };

  const VND_H_DESKTOP = 112;
  const VND_H_SMALL   = 58;

  const mainPadding = isCliente
    ? isSmall
      ? `${MKT_H_SMALL + 16}px 14px 80px`
      : `${MKT_H_DESKTOP + 20}px 32px 36px`
    : isVendedor
      ? isSmall
        ? `${VND_H_SMALL + 16}px 14px 80px`
        : `${VND_H_DESKTOP + 20}px 32px 36px`
      : isSmall
        ? "calc(var(--topbar-h) + 16px) 14px 80px"
        : "24px 28px";

  return (
    <>
      <ToastContainer />

      {/* Admin: sidebar oscuro + topbar mobile */}
      {!isCliente && !isVendedor && (
        <>
          <Sidebar
            user={user}
            active={page}
            onNav={setPage}
            onLogout={handleLogout}
            isOpen={isDesktop || sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isMobile={isSmall}
            cartCount={cartCount}
            onCartOpen={() => setCartOpen(true)}
          />
          {isSmall && (
            <TopBar
              user={user}
              onMenuOpen={() => setSidebarOpen(true)}
              cartCount={cartCount}
              onCartOpen={() => setCartOpen(true)}
              page={page}
            />
          )}
        </>
      )}

      {/* Vendedor: header estilo marketplace */}
      {isVendedor && (
        <VendorHeader
          user={user}
          page={page}
          onNav={setPage}
          onLogout={handleLogout}
          isSmall={isSmall}
          isDesktop={isDesktop}
        />
      )}

      {/* Cliente: header oscuro estilo marketplace */}
      {isCliente && (
        <MarketplaceHeader
          user={user}
          page={page}
          onNav={setPage}
          onLogout={handleLogout}
          cartCount={cartCount}
          onCartOpen={() => setCartOpen(true)}
          categorias={catalogCategorias}
          search={catalogSearch}
          onSearch={setCatalogSearch}
          catFilter={catalogCat}
          onCatFilter={(id) => { setCatalogCat(id); setPage("catalogo"); }}
          isSmall={isSmall}
          isDesktop={isDesktop}
        />
      )}

      <main style={{
        marginLeft: isCliente || isVendedor ? 0 : (isDesktop ? 256 : 0),
        padding: mainPadding,
        minHeight: "100vh",
        background: "var(--gray-50)",
      }}>
        {renderPage()}
      </main>

      {isSmall && isCliente && cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          style={{
            position: "fixed", bottom: 20, right: 16, zIndex: 180,
            background: "linear-gradient(135deg,var(--red-light),var(--red))",
            color: "#fff", border: "none",
            borderRadius: 16, padding: "13px 20px",
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15,
            boxShadow: "var(--shadow-red)", cursor: "pointer",
            animation: "fadeUp .3s ease",
          }}
        >
          <Icon name="cart" size={18} />
          {cartCount} {cartCount === 1 ? "producto" : "productos"} · ${cart.reduce((s, i) => s + i.precio * i.qty, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </button>
      )}

      {isCliente && (
        <CartModal
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          setCart={setCart}
          token={token}
        />
      )}
    </>
  );
}

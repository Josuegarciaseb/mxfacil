import { useState, useEffect } from "react";

import { injectStyles }    from "./styles/globalStyles";
import { useBreakpoint }   from "./hooks/useBreakpoint";

import Sidebar             from "./components/layout/Sidebar";
import TopBar              from "./components/layout/TopBar";
import ToastContainer      from "./components/ui/ToastContainer";

import AdminDashboard      from "./pages/admin/Dashboard";
import AdminProductos      from "./pages/admin/Productos";
import AdminPedidos        from "./pages/admin/Pedidos";
import AdminUsuarios       from "./pages/admin/Usuarios";
import AdminCategorias     from "./pages/admin/Categorias";
import AdminProveedores    from "./pages/admin/Proveedores";
import AdminInventario     from "./pages/admin/Inventario";

import VendedorDashboard   from "./pages/vendor/Dashboard";
import VendedorProductos   from "./pages/vendor/Productos";

import ClientCatalogo      from "./pages/client/Catalogo";
import ClientPedidos       from "./pages/client/Pedidos";
import ClientDirecciones   from "./pages/client/Direcciones";
import ClientPerfil        from "./pages/client/Perfil";
import CartModal           from "./pages/client/CartModal";

import AuthPage            from "./pages/AuthPage";

const getStoredUser  = () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } };
const getDefaultPage = (u) => u?.rol === "admin" ? "dashboard" : u?.rol === "vendedor" ? "vendedor-dashboard" : "catalogo";

export default function App() {
  const [user,        setUser]        = useState(getStoredUser);
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null);
  const [page,        setPage]        = useState(() => getDefaultPage(getStoredUser()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [cart,        setCart]        = useState([]);

  const { isDesktop, isSmall } = useBreakpoint();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);

  const handleLogin = (u, t) => {
    setUser(u); setToken(t);
    setPage(getDefaultPage(u));
  };

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
  const isCliente = user.rol === "cliente";

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
      case "catalogo":           return <ClientCatalogo    token={token} setCart={setCart} />;
      case "mis-pedidos":        return <ClientPedidos     token={token} />;
      case "mis-direcciones":    return <ClientDirecciones token={token} />;
      case "mi-perfil":          return <ClientPerfil      token={token} user={user} onUpdate={handleUserUpdate} />;
      default:                   return null;
    }
  };

  return (
    <>
      <ToastContainer />

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

      <main style={{
        marginLeft: isDesktop ? 248 : 0,
        padding: isSmall ? "calc(var(--topbar-h) + 16px) 14px 80px" : "24px 28px",
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
            background: "var(--red)", color: "#fff", border: "none",
            borderRadius: 16, padding: "13px 20px",
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15,
            boxShadow: "var(--shadow-red)", cursor: "pointer",
            animation: "fadeUp .3s ease",
          }}
        >
          <span>🛒</span>
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

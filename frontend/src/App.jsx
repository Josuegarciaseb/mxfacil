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
const getStoredCart  = () => { try { return JSON.parse(localStorage.getItem("guest_cart")) || []; } catch { return []; } };

const MKT_H_DESKTOP = 112;
const MKT_H_SMALL   = 58;

export default function App() {
  const [user,        setUser]        = useState(getStoredUser);
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null);
  const [page,        setPage]        = useState(() => {
    const u = getStoredUser();
    return u ? getDefaultPage(u) : "catalogo";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);

  // Invitados usan carrito guardado en localStorage; autenticados empiezan vacíos
  const [cart, setCart] = useState(() => !getStoredUser() ? getStoredCart() : []);

  const [catalogSearch,     setCatalogSearch]     = useState("");
  const [catalogCat,        setCatalogCat]        = useState("");
  const [catalogCategorias, setCatalogCategorias] = useState([]);

  const { isDesktop, isSmall } = useBreakpoint();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);

  // Persiste carrito de invitado en localStorage
  useEffect(() => {
    if (!user) localStorage.setItem("guest_cart", JSON.stringify(cart));
  }, [cart, user]);

  const handleLogin = (u, t) => {
    localStorage.removeItem("guest_cart");
    setUser(u);
    setToken(t);
    setPage(getDefaultPage(u));
    // El carrito del invitado se transfiere al estado (ya está en memoria)
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setCart([]);
    setPage("catalogo");
  };

  const handleUserUpdate = (u) => {
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const isGuest    = !user || !token;
  const isCliente  = user?.rol === "cliente";
  const isVendedor = user?.rol === "vendedor";

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Header de marketplace visible para clientes e invitados (excepto en la página de auth)
  const showMarketplaceHeader = (isGuest || isCliente) && page !== "auth";

  const renderPage = () => {
    // Página de auth — pantalla completa sin header
    if (page === "auth") {
      return <AuthPage onLogin={handleLogin} onBack={() => setPage("catalogo")} />;
    }

    // Invitados solo pueden ver el catálogo; cualquier otra ruta los mantiene aquí
    if (isGuest) {
      return (
        <ClientCatalogo
          token={null}
          setCart={setCart}
          externalSearch={catalogSearch}
          externalCatFilter={catalogCat}
          onCatFilter={setCatalogCat}
          onCategoriasFetched={setCatalogCategorias}
        />
      );
    }

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

  const mainPadding = page === "auth"
    ? 0
    : showMarketplaceHeader
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
      {!showMarketplaceHeader && !isVendedor && !isGuest && (
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

      {/* Cliente + Invitado: header oscuro estilo marketplace */}
      {showMarketplaceHeader && (
        <MarketplaceHeader
          user={user}
          page={page}
          onNav={setPage}
          onLogout={handleLogout}
          onLoginClick={() => setPage("auth")}
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
        marginLeft: showMarketplaceHeader || isVendedor || isGuest ? 0 : (isDesktop ? 256 : 0),
        padding: mainPadding,
        minHeight: "100vh",
        background: page === "auth" ? "transparent" : "var(--gray-50)",
      }}>
        {renderPage()}
      </main>

      {/* Botón flotante de carrito en mobile */}
      {isSmall && (isCliente || isGuest) && cartCount > 0 && page !== "auth" && (
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

      {(isCliente || isGuest) && (
        <CartModal
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          setCart={setCart}
          token={token}
          onNeedAuth={() => { setCartOpen(false); setPage("auth"); }}
        />
      )}
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { injectStyles }      from "./styles/globalStyles";
import { useBreakpoint }     from "./hooks/useBreakpoint";

import Icon                  from "./components/ui/Icon";
import Sidebar               from "./components/layout/Sidebar";
import TopBar                from "./components/layout/TopBar";
import MarketplaceHeader     from "./components/layout/MarketplaceHeader";
import VendorHeader          from "./components/layout/VendorHeader";
import ToastContainer        from "./components/ui/ToastContainer";
import ProtectedRoute        from "./components/auth/ProtectedRoute";

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

/* ── Mapeo id ↔ ruta ────────────────────────────────────── */
const PAGE_TO_PATH = {
  catalogo:             "/catalogo",
  auth:                 "/auth",
  "mis-pedidos":        "/mis-pedidos",
  "mis-direcciones":    "/mis-direcciones",
  "mi-perfil":          "/mi-perfil",
  dashboard:            "/admin/dashboard",
  productos:            "/admin/productos",
  "pedidos-admin":      "/admin/pedidos",
  usuarios:             "/admin/usuarios",
  categorias:           "/admin/categorias",
  proveedores:          "/admin/proveedores",
  inventario:           "/admin/inventario",
  "vendedor-dashboard": "/vendedor/dashboard",
  "vendedor-productos": "/vendedor/productos",
  "vendedor-pedidos":   "/vendedor/pedidos",
  "vendedor-perfil":    "/vendedor/perfil",
};
const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([k, v]) => [v, k])
);

/* ── Helpers ─────────────────────────────────────────────── */
const getStoredUser  = () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } };
const getDefaultPath = (u) =>
  u?.rol === "admin"    ? "/admin/dashboard"    :
  u?.rol === "vendedor" ? "/vendedor/dashboard" :
                          "/catalogo";
const getStoredCart  = () => { try { return JSON.parse(localStorage.getItem("guest_cart")) || []; } catch { return []; } };

const MKT_H_DESKTOP = 112;
const MKT_H_SMALL   = 58;
const VND_H_DESKTOP = 112;
const VND_H_SMALL   = 58;

export default function App() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [user,        setUser]        = useState(getStoredUser);
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);

  const [cart, setCart] = useState(() => !getStoredUser() ? getStoredCart() : []);

  const [catalogSearch,     setCatalogSearch]     = useState("");
  const [catalogCat,        setCatalogCat]        = useState("");
  const [catalogCategorias, setCatalogCategorias] = useState([]);

  const { isDesktop, isSmall } = useBreakpoint();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);

  // Intercambio OAuth: canjea cookie HttpOnly → token en localStorage
  useEffect(() => {
    if (location.pathname !== "/oauth-success") return;

    const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

    fetch(`${BASE}/api/auth/session`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.removeItem("guest_cart");
          setToken(data.token);
          setUser(data.user);
          navigate(getDefaultPath(data.user), { replace: true });
        } else {
          navigate("/catalogo", { replace: true });
        }
      })
      .catch(() => navigate("/catalogo", { replace: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persiste carrito de invitado en localStorage
  useEffect(() => {
    if (!user) localStorage.setItem("guest_cart", JSON.stringify(cart));
  }, [cart, user]);

  /* ── Auth handlers ──────────────────────────────────────── */
  const handleLogin = (u, t) => {
    localStorage.removeItem("guest_cart");
    setUser(u);
    setToken(t);
    navigate(getDefaultPath(u));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setCart([]);
    navigate("/catalogo");
  };

  const handleUserUpdate = (u) => {
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  /* ── Navegación para componentes de layout ──────────────── */
  const goTo = useCallback((id) => {
    navigate(PAGE_TO_PATH[id] ?? "/" + id);
  }, [navigate]);

  /* ── Estado derivado ────────────────────────────────────── */
  const page       = PATH_TO_PAGE[location.pathname] ?? "";
  const isGuest    = !user || !token;
  const isCliente  = user?.rol === "cliente";
  const isVendedor = user?.rol === "vendedor";
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);

  const showMarketplaceHeader = (isGuest || isCliente) && location.pathname !== "/auth";

  const mainPadding = location.pathname === "/auth"
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

  /* ── Rutas protegidas helpers ───────────────────────────── */
  const adminOnly    = (children) => (
    <ProtectedRoute user={user} token={token} roles={["admin"]}>
      {children}
    </ProtectedRoute>
  );
  const vendedorOnly = (children) => (
    <ProtectedRoute user={user} token={token} roles={["vendedor"]}>
      {children}
    </ProtectedRoute>
  );
  const clienteOnly  = (children) => (
    <ProtectedRoute user={user} token={token} roles={["cliente"]}>
      {children}
    </ProtectedRoute>
  );

  return (
    <>
      <ToastContainer />

      {/* ── Sidebar (admin) ── */}
      {!showMarketplaceHeader && !isVendedor && !isGuest && (
        <>
          <Sidebar
            user={user}
            active={page}
            onNav={goTo}
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

      {/* ── Header vendedor ── */}
      {isVendedor && (
        <VendorHeader
          user={user}
          page={page}
          onNav={goTo}
          onLogout={handleLogout}
          isSmall={isSmall}
          isDesktop={isDesktop}
        />
      )}

      {/* ── Header marketplace (clientes / invitados) ── */}
      {showMarketplaceHeader && (
        <MarketplaceHeader
          user={user}
          page={page}
          onNav={goTo}
          onLogout={handleLogout}
          onLoginClick={() => navigate("/auth")}
          cartCount={cartCount}
          onCartOpen={() => setCartOpen(true)}
          categorias={catalogCategorias}
          search={catalogSearch}
          onSearch={setCatalogSearch}
          catFilter={catalogCat}
          onCatFilter={(id) => { setCatalogCat(id); navigate("/catalogo"); }}
          isSmall={isSmall}
          isDesktop={isDesktop}
        />
      )}

      {/* ── Contenido principal ── */}
      <main style={{
        marginLeft: showMarketplaceHeader || isVendedor || isGuest ? 0 : (isDesktop ? 256 : 0),
        padding: mainPadding,
        minHeight: "100vh",
        background: location.pathname === "/auth" ? "transparent" : "var(--gray-50)",
      }}>
        <Routes>
          {/* Raíz → redirige al home según rol */}
          <Route path="/"
            element={<Navigate to={user ? getDefaultPath(user) : "/catalogo"} replace />}
          />

          {/* Catálogo — público */}
          <Route path="/catalogo" element={
            <ClientCatalogo
              token={token}
              setCart={setCart}
              externalSearch={catalogSearch}
              externalCatFilter={catalogCat}
              onCatFilter={setCatalogCat}
              onCategoriasFetched={setCatalogCategorias}
            />
          } />

          {/* Auth — redirige si ya tiene sesión */}
          <Route path="/auth" element={
            token && user
              ? <Navigate to={getDefaultPath(user)} replace />
              : <AuthPage onLogin={handleLogin} onBack={() => navigate("/catalogo")} />
          } />

          {/* OAuth callback */}
          <Route path="/oauth-success" element={null} />

          {/* ── Rutas cliente ── */}
          <Route path="/mis-pedidos"    element={clienteOnly(<ClientPedidos    token={token} />)} />
          <Route path="/mis-direcciones" element={clienteOnly(<ClientDirecciones token={token} />)} />
          <Route path="/mi-perfil"      element={clienteOnly(<ClientPerfil     token={token} user={user} onUpdate={handleUserUpdate} />)} />

          {/* ── Rutas admin ── */}
          <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={adminOnly(<AdminDashboard  token={token} />)} />
          <Route path="/admin/productos" element={adminOnly(<AdminProductos  token={token} />)} />
          <Route path="/admin/pedidos"   element={adminOnly(<AdminPedidos    token={token} />)} />
          <Route path="/admin/usuarios"  element={adminOnly(<AdminUsuarios   token={token} currentUser={user} />)} />
          <Route path="/admin/categorias"  element={adminOnly(<AdminCategorias  token={token} />)} />
          <Route path="/admin/proveedores" element={adminOnly(<AdminProveedores  token={token} />)} />
          <Route path="/admin/inventario"  element={adminOnly(<AdminInventario   token={token} />)} />

          {/* ── Rutas vendedor ── */}
          <Route path="/vendedor"            element={<Navigate to="/vendedor/dashboard" replace />} />
          <Route path="/vendedor/dashboard"  element={vendedorOnly(<VendedorDashboard token={token} user={user} />)} />
          <Route path="/vendedor/productos"  element={vendedorOnly(<VendedorProductos  token={token} user={user} />)} />
          <Route path="/vendedor/pedidos"    element={vendedorOnly(<AdminPedidos        token={token} />)} />
          <Route path="/vendedor/perfil"     element={vendedorOnly(<ClientPerfil        token={token} user={user} onUpdate={handleUserUpdate} />)} />

          {/* Cualquier ruta desconocida → catálogo */}
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </main>

      {/* ── FAB carrito mobile ── */}
      {isSmall && (isCliente || isGuest) && cartCount > 0 && location.pathname !== "/auth" && (
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
          {cartCount} {cartCount === 1 ? "producto" : "productos"} · ${cart.reduce((s, i) => s + i.precio * i.qty, 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </button>
      )}

      {/* ── Modal carrito ── */}
      {(isCliente || isGuest) && (
        <CartModal
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          setCart={setCart}
          token={token}
          onNeedAuth={() => { setCartOpen(false); navigate("/auth"); }}
        />
      )}
    </>
  );
}

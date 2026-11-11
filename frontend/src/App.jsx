import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { injectStyles }      from "./styles/globalStyles";
import { useBreakpoint }     from "./hooks/useBreakpoint";
import { http } from './utils/api';
import { exchangeGoogle } from './utils/google-auth';
import { cartKey, readCart, mergeCart, refreshCart } from './utils/cart';
import "./styles/marketplace.css";

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
import PaymentReturn         from "./pages/PaymentReturn";
import Footer                from "./components/layout/Footer";

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

const VND_H_DESKTOP = 112;
const VND_H_SMALL   = 58;

export default function App() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [user,        setUser]        = useState(getStoredUser);
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);

  const [cart, setCart] = useState(() => readCart(getStoredUser()));
  const [resumePayment, setResumePayment] = useState(null);
  const [returnToCart, setReturnToCart] = useState(false);
  const syncProducts = useCallback(products => setCart(c => refreshCart(c,products)), []);

  const [catalogSearch,     setCatalogSearch]     = useState("");
  const [catalogCategories, setCatalogCategories] = useState([]);

  const { isDesktop, isSmall } = useBreakpoint();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => {
    const expired = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setCart(readCart(null));
      setCartOpen(false);
      setResumePayment(null);
      navigate('/auth', {replace:true, state:{from:location}});
    };
    window.addEventListener('tienda:sesion-expirada',expired);
    return () => window.removeEventListener('tienda:sesion-expirada',expired);
  }, [location,navigate]);
  useEffect(() => {
    const titles = {'/catalogo':'Productos del campo al mayoreo','/auth':'Acceso','/mis-pedidos':'Mis pedidos','/mis-direcciones':'Mis direcciones','/mi-perfil':'Mi perfil','/pago-retorno':'Estado del pago'};
    document.title = `${titles[location.pathname] || 'Tienda'} · Comercio Fácil México`;
  }, [location.pathname]);

  // The browser verifier binds the one-time callback to this tab across origins.
  useEffect(() => {
    if (location.pathname !== "/oauth-success") return;

    let active = true;
    const code = new URLSearchParams(location.hash.slice(1)).get('code');
    exchangeGoogle(code)
      .then((data) => {
        if (!active) return;
        if (data.token && data.user) {
          const guest = readCart(null);
          setCart(mergeCart(readCart(data.user),guest));
          setCartOpen(data.user.rol === 'cliente' && guest.length > 0);
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
      .catch(error => {
        if (!active) return;
        navigate(error.message === 'Se requiere código MFA' ? '/auth?google_mfa=1' : '/auth?oauth_error=restart',{replace:true});
      });
    return ()=>{active=false;};
  }, [location.pathname,location.hash,navigate]);

  // Un carrito por cliente; cerrar sesión nunca lo comparte con el siguiente.
  useEffect(() => {
    localStorage.setItem(cartKey(user), JSON.stringify(cart));
  }, [cart, user]);

  /* ── Auth handlers ──────────────────────────────────────── */
  const handleLogin = (u, t) => {
    setCart(mergeCart(readCart(u),cart));
    setCartOpen(returnToCart && u.rol === 'cliente');
    setReturnToCart(false);
    localStorage.removeItem("guest_cart");
    setUser(u);
    setToken(t);
    const from = location.state?.from;
    const destination = from && PATH_TO_PAGE[from.pathname] && from.pathname !== '/auth'
      ? from.pathname + (from.search || '') : getDefaultPath(u);
    navigate(destination,{replace:true});
  };

  const handleLogout = async () => {
    try { await http('/auth/logout', {method:'POST'}, token); } catch { /* local sign-out remains possible offline */ }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setCart([]);
    setCartOpen(false);
    setResumePayment(null);
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
    <div id={showMarketplaceHeader ? "inicio-tienda" : undefined} className={showMarketplaceHeader ? "marketplace" : undefined}>
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
          search={catalogSearch}
          onSearch={setCatalogSearch}
          isSmall={isSmall}
        />
      )}

      {/* ── Contenido principal ── */}
      <main className={showMarketplaceHeader ? "market-main" : undefined} style={showMarketplaceHeader ? undefined : {
        marginLeft: isVendedor || isGuest ? 0 : (isDesktop ? 256 : 0),
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
              cart={cart}
              onProductsFetched={syncProducts}
              externalSearch={catalogSearch}
              onSearchChange={setCatalogSearch}
              selectedCategories={catalogCategories}
              onCategoriesChange={setCatalogCategories}
            />
          } />

          {/* Auth — redirige si ya tiene sesión */}
          <Route path="/auth" element={
            token && user
              ? <Navigate to={getDefaultPath(user)} replace />
              : <AuthPage key={location.search} onLogin={handleLogin} onBack={() => navigate("/catalogo")} />
          } />

          {/* OAuth callback */}
          <Route path="/oauth-success" element={null} />

          {/* Retorno de MercadoPago (popup y redirección directa) */}
          <Route path="/pago-retorno" element={<PaymentReturn />} />

          {/* ── Rutas cliente ── */}
          <Route path="/mis-pedidos" element={clienteOnly(<ClientPedidos token={token} onResume={step=>{setResumePayment(step);setCartOpen(true);}} />)} />
          <Route path="/mis-direcciones" element={clienteOnly(<ClientDirecciones token={token} />)} />
          <Route path="/mi-perfil"      element={clienteOnly(<ClientPerfil     token={token} user={user} onUpdate={handleUserUpdate} />)} />

          {/* ── Rutas admin ── */}
          <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={adminOnly(<AdminDashboard  token={token} />)} />
          <Route path="/admin/productos" element={adminOnly(<AdminProductos  token={token} />)} />
          <Route path="/admin/pedidos"   element={adminOnly(<AdminPedidos token={token} gestionarPagos />)} />
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

      {showMarketplaceHeader && <Footer isSmall={isSmall} isGuest={isGuest} onCartOpen={() => setCartOpen(true)} />}

      {/* ── Modal carrito ── */}
      {cartOpen && (isCliente || isGuest) && (
        <CartModal
          open={cartOpen}
          onClose={() => {setCartOpen(false);setResumePayment(null);}}
          initialPayment={resumePayment}
          userId={user?.id}
          onOrdered={id=>{setCartOpen(false);setResumePayment(null);navigate(`/mis-pedidos?pedido_id=${id}`,{state:{updated:Date.now()}});}}
          cart={cart}
          setCart={setCart}
          token={token}
          onNeedAuth={() => { setCartOpen(false); setReturnToCart(true); navigate("/auth"); }}
        />
      )}
    </div>
  );
}

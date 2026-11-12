import Terminos from './pages/Terminos';
import Privacidad from './pages/Privacidad';
import Spinner from './components/ui/Spinner';
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { injectStyles }      from "./styles/globalStyles";
import { useBreakpoint }     from "./hooks/useBreakpoint";
import { useDeliveryAddresses } from "./hooks/useDeliveryAddresses";
import { http } from './utils/api';
import { exchangeGoogle } from './utils/google-auth';
import { cartKey, readCart, mergeCart, refreshCart } from './utils/cart';
import "./styles/marketplace.css";

import Sidebar               from "./components/layout/Sidebar";
import TopBar                from "./components/layout/TopBar";
import MarketplaceHeader     from "./components/layout/MarketplaceHeader";
import { CabeceraVendedor, MenuVendedor, BarraCompras } from "./components/vendedor/Navegacion";
import { Glyph } from "./components/vendedor/Grafica";
import { rutasVendedor, seccionesDe } from "./utils/rutasVendedor";
import { diaLocal } from "./utils/ventas";
import { useVendorAccount } from "./hooks/useVendorAccount";
import Modal from "./components/ui/Modal";
import ToastContainer        from "./components/ui/ToastContainer";
import ProtectedRoute        from "./components/auth/ProtectedRoute";

import AdminDashboard        from "./pages/admin/Dashboard";
import AdminProductos        from "./pages/admin/Productos";
import AdminPedidos          from "./pages/admin/Pedidos";
import AdminUsuarios         from "./pages/admin/Usuarios";
import AdminCategorias       from "./pages/admin/Categorias";
import AdminProveedores      from "./pages/admin/Proveedores";
import ProveedorPublico from "./pages/client/ProveedorPublico";
import AdminInventario       from "./pages/admin/Inventario";

import VendedorDashboard     from "./pages/vendor/Dashboard";
import VendedorProductos     from "./pages/vendor/Productos";

import ClientCatalogo        from "./pages/client/Catalogo";
import ClientPedidos         from "./pages/client/Pedidos";
import AddressPicker         from "./components/shipping/AddressPicker";
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
  "vendedor-membresia": "/vendedor/membresia",
  "vendedor-cobros": "/vendedor/cobros",
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

const Membresia = lazy(() => import("./pages/vendor/Membresia"));
const puedeComprar = u => ["cliente","vendedor"].includes(u?.rol);

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
    const titles = {'/catalogo':'Productos del campo al mayoreo','/auth':'Acceso','/mis-pedidos':'Mis pedidos','/mis-direcciones':'Elige una dirección','/mi-perfil':'Mi perfil','/pago-retorno':'Estado del pago'};
    const vendedor = seccionesDe(rutasVendedor,null).flatMap(([,links])=>links).find(([to])=>to===location.pathname)?.[2];
    document.title = `${titles[location.pathname] || vendedor || 'Tienda'} · Comercio Fácil México`;
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
          setCartOpen(puedeComprar(data.user) && guest.length > 0);
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.removeItem("guest_cart");
          setToken(data.token);
          setUser(data.user);
          navigate(puedeComprar(data.user) && guest.length ? "/catalogo" : getDefaultPath(data.user), { replace: true });
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
    setCartOpen(returnToCart && puedeComprar(u));
    setReturnToCart(false);
    localStorage.removeItem("guest_cart");
    setUser(u);
    setToken(t);
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
  const esComprador = puedeComprar(user) && !isGuest;
  const isVendedor = user?.rol === "vendedor" && !isGuest;
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);

  const enPanel = isVendedor && /^\/vendedor(?:\/|$)/.test(location.pathname);
  const showMarketplaceHeader = (isGuest || esComprador) && !enPanel && location.pathname !== "/auth";
  const mercadoVendedor = isVendedor && showMarketplaceHeader;
  const [proveedor, setCount] = useVendorAccount(enPanel ? token : null, page);
  const idProveedor = proveedor?.id || user?.proveedor_id;
  const perfilPublico = idProveedor ? "/proveedores/" + idProveedor : null;
  const cuenta = { nombre:user?.nombre, tienda:proveedor?.nombre || "Mi tienda",
    iniciales:(user?.nombre || "").trim().split(/\s+/).slice(0,2).map(s=>s.charAt(0)).join("").toUpperCase() };
  const tituloPanel = seccionesDe(rutasVendedor,perfilPublico).flatMap(([,links])=>links).find(([to])=>to===location.pathname)?.[2] || "Resumen";
  const menu = { cuenta, perfil:perfilPublico, rutas:rutasVendedor, cantidad:proveedor?.productos_total, salir:handleLogout };
  const addressBook = useDeliveryAddresses(esComprador && !enPanel ? token : null);
  const choosingAddress = esComprador && page === "mis-direcciones";
  const backgroundLocation = choosingAddress ? location.state?.backgroundLocation : null;
  const openAddressPicker = () => navigate("/mis-direcciones", { state: { backgroundLocation: location } });
  const closeAddressPicker = () => backgroundLocation ? navigate(-1) : navigate("/catalogo", { replace: true });
  const from = location.state?.from;
  const afterLogin = from && PATH_TO_PAGE[from.pathname] && from.pathname !== "/auth"
    ? from.pathname + (from.search || "") : getDefaultPath(user);

  const mainPadding = location.pathname === "/auth" ? 0 : isSmall ? "calc(var(--topbar-h) + 16px) 14px 80px" : "24px 28px";

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
  const compradorOnly  = (children) => (
    <ProtectedRoute user={user} token={token} roles={["cliente","vendedor"]}>
      {children}
    </ProtectedRoute>
  );
  const catalogo = (
    <ClientCatalogo token={token} setCart={setCart} cart={cart} onProductsFetched={syncProducts}
      externalSearch={catalogSearch} onSearchChange={setCatalogSearch}
      selectedCategories={catalogCategories} onCategoriesChange={setCatalogCategories} />
  );

  const routes = (
    <Routes location={backgroundLocation || location}>
      {/* Raíz → redirige al home según rol */}
      <Route path="/"
        element={<Navigate to={user ? getDefaultPath(user) : "/catalogo"} replace />}
      />

      {/* Catálogo — público */}
      <Route path="/catalogo" element={catalogo} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/proveedores/:id" element={<ProveedorPublico token={token} cart={cart} setCart={setCart} onProductsFetched={syncProducts} />} />
      {/* Auth — redirige si ya tiene sesión */}
      <Route path="/auth" element={
        token && user
          ? <Navigate to={afterLogin} state={from?.state} replace />
          : <AuthPage key={location.search} onLogin={handleLogin} onBack={() => navigate("/catalogo")} />
      } />

      {/* OAuth callback */}
      <Route path="/oauth-success" element={null} />

      {/* Retorno de MercadoPago (popup y redirección directa) */}
      <Route path="/pago-retorno" element={<PaymentReturn />} />

      {/* ── Rutas cliente ── */}
      <Route path="/mis-pedidos" element={compradorOnly(<ClientPedidos token={token} onResume={step=>{setResumePayment(step);setCartOpen(true);}} />)} />
      <Route path="/mis-direcciones" element={compradorOnly(catalogo)} />
      <Route path="/mi-perfil"      element={compradorOnly(<ClientPerfil     token={token} user={user} onUpdate={handleUserUpdate} />)} />

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
      <Route path="/vendedor/dashboard"  element={vendedorOnly(<VendedorDashboard key={token} token={token} perfil={perfilPublico} cantidad={proveedor?.productos_total} />)} />
      <Route path="/vendedor/productos"  element={vendedorOnly(<VendedorProductos token={token} onCount={setCount} />)} />
      <Route path="/vendedor/pedidos"    element={vendedorOnly(<VendedorDashboard key={"ventas:"+token} token={token} seccion="ventas" />)} />
      <Route path="/vendedor/cobros" element={vendedorOnly(<VendedorDashboard key={"cobros:"+token} token={token} seccion="cobros" />)} />
      <Route path="/vendedor/membresia" element={vendedorOnly(<Suspense fallback={<Spinner/>}><Membresia token={token} /></Suspense>)} />
      <Route path="/vendedor/perfil"     element={vendedorOnly(<ClientPerfil        token={token} user={user} onUpdate={handleUserUpdate} />)} />

      {/* Cualquier ruta desconocida → catálogo */}
      <Route path="*" element={<Navigate to="/catalogo" replace />} />
    </Routes>
  );

  return (
    <div id={showMarketplaceHeader ? "inicio-tienda" : undefined} className={[showMarketplaceHeader ? "marketplace" : "", isVendedor ? "portal-vendedor" : ""].filter(Boolean).join(" ")}>
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

      {(enPanel || mercadoVendedor) && <CabeceraVendedor comprador={mercadoVendedor} cuenta={cuenta} rutas={rutasVendedor} abrirMenu={()=>setSidebarOpen(true)}/>}
      {mercadoVendedor && <BarraCompras pedidos="/mis-pedidos" busqueda={catalogSearch} buscar={setCatalogSearch}
        carrito={cart} abrirCarrito={()=>setCartOpen(true)} direccion={addressBook.primary} abrirDirecciones={openAddressPicker}/>}
      {showMarketplaceHeader && !mercadoVendedor && (
        <MarketplaceHeader
          user={user}
          page={page}
          onNav={goTo}
          onLogout={handleLogout}
          onLoginClick={() => navigate("/auth")}
          deliveryAddress={addressBook.primary}
          onChooseAddress={openAddressPicker}
          cartCount={cartCount}
          onCartOpen={() => setCartOpen(true)}
          search={catalogSearch}
          onSearch={setCatalogSearch}
          isSmall={isSmall}
        />
      )}

      {/* ── Contenido principal ── */}
      {enPanel ? <div className="marco"><aside className="lateral"><MenuVendedor {...menu}/></aside>
        <main className="principal" id="contenido"><div className="principal-interior">
          <div className="miga"><span><Glyph name="shop" size={15}/>Mi negocio <Glyph name="chevronRight" size={11}/><b>{tituloPanel}</b></span>
            <time dateTime={diaLocal()}><Glyph name="calendar" size={14}/>{new Date().toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})}</time></div>
          {routes}</div></main>
      </div> : <main className={showMarketplaceHeader ? "market-main" : undefined} style={showMarketplaceHeader ? undefined : {
        marginLeft: isVendedor || isGuest ? 0 : (isDesktop ? 256 : 0),
        padding: mainPadding,
        minHeight: "100vh",
        background: location.pathname === "/auth" ? "transparent" : "var(--gray-50)",
      }}>
        {routes}
      </main>}
      {enPanel && sidebarOpen && <Modal open title="Navegación del vendedor" onClose={()=>setSidebarOpen(false)}><div className="portal-vendedor menu-dialogo"><MenuVendedor {...menu} cerrar={()=>setSidebarOpen(false)}/></div></Modal>}

      {showMarketplaceHeader && <Footer isSmall={isSmall} isGuest={isGuest} onCartOpen={() => setCartOpen(true)} onChooseAddress={openAddressPicker} />}

      {choosingAddress && <AddressPicker token={token} book={addressBook} onClose={closeAddressPicker} />}

      {/* ── Modal carrito ── */}
      {cartOpen && (esComprador || isGuest) && (
        <CartModal
          open={cartOpen}
          onClose={() => {setCartOpen(false);setResumePayment(null);}}
          initialPayment={resumePayment}
          onAddressSaved={addressBook.refresh}
          userId={user?.id}
          onOrdered={id=>{setCartOpen(false);setResumePayment(null);navigate(`/mis-pedidos?pedido_id=${id}`,{state:{updated:Date.now()}});}}
          cart={cart}
          setCart={setCart}
          token={token}
          onNeedAuth={() => { setCartOpen(false); setReturnToCart(true); navigate("/auth", {state:{from:{pathname:"/catalogo"}}}); }}
        />
      )}
    </div>
  );
}

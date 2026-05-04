import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = "http://localhost:3000/api";

const http = async (path, opts = {}, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Error en la petición");
  return data;
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const icons = {
  store: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  package: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  truck: "M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  creditCard: "M1 4h22v16H1z M1 10h22",
  map: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z M12 13a3 3 0 100-6 3 3 0 000 6z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 11a4 4 0 100-8 4 4 0 000 8z",
  plus: "M12 5v14 M5 12h14",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12",
  eye: "M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z M12 15a3 3 0 100-6 3 3 0 000 6z",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  chevronDown: "M6 9l6 6 6-6",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  shoppingBag: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18",
  arrowLeft: "M19 12H5 M12 19l-7-7 7-7",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  info: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01",
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastFn = null;
const toast = (msg, type = "success") => toastFn?.(msg, type);

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  toastFn = (msg, type) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#ef4444" : t.type === "warn" ? "#f59e0b" : "#10b981",
          color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14,
          fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.25)",
          animation: "slideIn .3s ease", minWidth: 240, maxWidth: 360,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <Icon d={t.type === "error" ? icons.x : t.type === "warn" ? icons.alert : icons.check} size={16} />
          {t.msg}
        </div>
      ))}
    </div>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const injectStyles = () => {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0e0e12;
      --bg2: #16161d;
      --bg3: #1e1e28;
      --card: #1a1a24;
      --border: #2a2a3a;
      --accent: #7c5cfc;
      --accent2: #fc5c7d;
      --accent3: #5cf0c8;
      --text: #f0f0f8;
      --text2: #9090b0;
      --text3: #60607a;
      --success: #10b981;
      --warn: #f59e0b;
      --danger: #ef4444;
      --radius: 12px;
      --shadow: 0 4px 24px rgba(0,0,0,.4);
    }
    body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }
    h1,h2,h3,h4,h5 { font-family: 'Syne', sans-serif; }
    input, select, textarea {
      background: var(--bg3); border: 1.5px solid var(--border); color: var(--text);
      border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 14px;
      outline: none; transition: border-color .2s;
    }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); }
    button { cursor: pointer; font-family: inherit; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg2); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
    @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-up { animation: fadeUp .4s ease forwards; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
    .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; }
    .badge-green { background:#10b98122; color:#10b981; }
    .badge-yellow { background:#f59e0b22; color:#f59e0b; }
    .badge-red { background:#ef444422; color:#ef4444; }
    .badge-purple { background:#7c5cfc22; color:#7c5cfc; }
    .badge-blue { background:#3b82f622; color:#3b82f6; }
    table { width:100%; border-collapse:collapse; }
    thead th { text-align:left; padding:12px 16px; font-size:12px; color:var(--text3); font-weight:600; text-transform:uppercase; letter-spacing:.08em; border-bottom:1px solid var(--border); }
    tbody td { padding:14px 16px; border-bottom:1px solid var(--border); font-size:14px; color:var(--text2); vertical-align:middle; }
    tbody tr:hover td { background:var(--bg3); }
    tbody tr:last-child td { border-bottom:none; }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
    .modal { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:32px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, style: s = {}, type = "button" }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 8, fontWeight: 600, fontSize: size === "sm" ? 13 : 14,
    padding: size === "sm" ? "7px 14px" : "10px 20px",
    border: "none", transition: "all .2s", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .5 : 1, ...s
  };
  const vars = {
    primary: { background: "var(--accent)", color: "#fff" },
    secondary: { background: "var(--bg3)", color: "var(--text2)", border: "1px solid var(--border)" },
    danger: { background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" },
    success: { background: "#10b98120", color: "#10b981", border: "1px solid #10b98140" },
    ghost: { background: "transparent", color: "var(--text2)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...vars[variant] }}>
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{label}</label>}
    <input style={{ width: "100%" }} {...props} />
    {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{label}</label>}
    <select style={{ width: "100%" }} {...props}>{children}</select>
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
    <h3 style={{ fontFamily: "Syne", marginBottom: 8 }}>{title}</h3>
    <p style={{ color: "var(--text3)", fontSize: 14 }}>{sub}</p>
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-up" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "Syne", fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}>
            <Icon d={icons.x} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const statusBadge = (estado) => {
  const map = {
    pendiente: "badge-yellow", en_proceso: "badge-purple", enviado: "badge-blue",
    entregado: "badge-green", cancelado: "badge-red", aprobado: "badge-green",
    rechazado: "badge-red", preparando: "badge-yellow", en_transito: "badge-blue",
    incidencia: "badge-red",
  };
  return <span className={`badge ${map[estado] || "badge-yellow"}`}>{estado}</span>;
};

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", telefono: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await http("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast("¡Bienvenido de vuelta!");
        onLogin(data.user, data.token);
      } else {
        const body = { nombre: form.nombre, email: form.email, password: form.password };
        if (form.telefono) body.telefono = form.telefono;
        const data = await http("/auth/register", { method: "POST", body: JSON.stringify(body) });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast("¡Cuenta creada exitosamente!");
        onLogin(data.user, data.token);
      }
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "radial-gradient(ellipse at 20% 50%, #7c5cfc15 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #fc5c7d10 0%, transparent 60%), var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon d={icons.store} size={28} className="" style={{ color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 28, fontFamily: "Syne", fontWeight: 800, background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Comercio Fácil
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 14, marginTop: 6 }}>Plataforma de comercio México</p>
        </div>

        {/* Card */}
        <div className="card fade-up" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "var(--bg3)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "9px", border: "none", borderRadius: 8, fontFamily: "Syne", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all .2s",
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "#fff" : "var(--text2)"
              }}>
                {m === "login" ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <Input label="Nombre completo" placeholder="Tu nombre" value={form.nombre} onChange={set("nombre")} />
            )}
            <Input label="Correo electrónico" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={set("email")} />
            <Input label="Contraseña" type="password" placeholder={mode === "register" ? "Mín. 8 chars, 1 mayúscula, 1 especial" : "••••••••"} value={form.password} onChange={set("password")} />
            {mode === "register" && (
              <Input label="Teléfono (10 dígitos, opcional)" placeholder="5512345678" value={form.telefono} onChange={set("telefono")} />
            )}
            <Btn onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px", marginTop: 8, fontSize: 15 }}>
              {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </Btn>
          </div>
        </div>
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 13, marginTop: 20 }}>
          Comercio Fácil México © 2025
        </p>
      </div>
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const Sidebar = ({ user, active, onNav, onLogout }) => {
  const isAdmin = user?.rol === "admin";
  const navItems = isAdmin ? [
    { id: "dashboard", icon: icons.dashboard, label: "Dashboard" },
    { id: "productos", icon: icons.package, label: "Productos" },
    { id: "pedidos-admin", icon: icons.cart, label: "Pedidos" },
    { id: "usuarios", icon: icons.users, label: "Usuarios" },
    { id: "categorias", icon: icons.tag, label: "Categorías" },
    { id: "proveedores", icon: icons.truck, label: "Proveedores" },
    { id: "inventario", icon: icons.box, label: "Inventario" },
  ] : [
    { id: "catalogo", icon: icons.store, label: "Catálogo" },
    { id: "mis-pedidos", icon: icons.shoppingBag, label: "Mis Pedidos" },
    { id: "mis-direcciones", icon: icons.map, label: "Mis Direcciones" },
    { id: "mi-perfil", icon: icons.user, label: "Mi Perfil" },
  ];

  return (
    <div style={{ width: 240, background: "var(--bg2)", borderRight: "1px solid var(--border)", height: "100vh", position: "fixed", top: 0, left: 0, display: "flex", flexDirection: "column", zIndex: 100 }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={icons.store} size={18} />
          </div>
          <div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, lineHeight: 1 }}>Comercio</div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, lineHeight: 1, color: "var(--accent)" }}>Fácil MX</div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: "14px 20px" }}>
        <span className={`badge ${isAdmin ? "badge-purple" : "badge-blue"}`}>
          {isAdmin ? "⚡ Administrador" : "🛒 Cliente"}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {navItems.map(({ id, icon, label }) => (
          <button key={id} onClick={() => onNav(id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer",
            background: active === id ? "#7c5cfc20" : "transparent",
            color: active === id ? "var(--accent)" : "var(--text2)",
            fontFamily: "DM Sans", fontWeight: active === id ? 600 : 400, fontSize: 14,
            marginBottom: 2, transition: "all .15s",
            borderLeft: active === id ? "3px solid var(--accent)" : "3px solid transparent",
          }}>
            <Icon d={icon} size={18} />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, background: "var(--accent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>
            {user?.nombre?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.nombre}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          </div>
        </div>
        <Btn variant="secondary" onClick={onLogout} style={{ width: "100%", fontSize: 13 }} size="sm">
          <Icon d={icons.logout} size={15} /> Cerrar sesión
        </Btn>
      </div>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = ({ token }) => {
  const [stats, setStats] = useState({ productos: 0, pedidos: 0, usuarios: 0, proveedores: 0 });
  const [recentPedidos, setRecentPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prods, peds, users, provs] = await Promise.all([
          http("/productos?activo=1", {}, token),
          http("/pedidos/admin", {}, token),
          http("/usuario", {}, token),
          http("/proveedores", {}, token),
        ]);
        setStats({ productos: prods.length, pedidos: peds.length, usuarios: users.length, proveedores: provs.length });
        setRecentPedidos(peds.slice(0, 6));
      } catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    };
    load();
  }, [token]);

  const statCards = [
    { label: "Productos activos", value: stats.productos, icon: icons.package, color: "var(--accent)" },
    { label: "Pedidos totales", value: stats.pedidos, icon: icons.cart, color: "var(--accent2)" },
    { label: "Usuarios", value: stats.usuarios, icon: icons.users, color: "var(--accent3)" },
    { label: "Proveedores", value: stats.proveedores, icon: icons.truck, color: "#f59e0b" },
  ];

  if (loading) return <Spinner />;
  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: "Syne", fontSize: 24, marginBottom: 24 }}>Panel de Control</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", color }}>
              <Icon d={icon} size={22} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontFamily: "Syne", fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontFamily: "Syne", fontSize: 16, marginBottom: 16 }}>Pedidos recientes</h3>
        {recentPedidos.length === 0 ? <EmptyState icon="📦" title="Sin pedidos" sub="Aún no hay pedidos registrados" /> : (
          <table>
            <thead><tr>
              <th># Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th>
            </tr></thead>
            <tbody>{recentPedidos.map(p => (
              <tr key={p.id}>
                <td style={{ color: "var(--accent)", fontWeight: 600 }}>#{p.id}</td>
                <td style={{ color: "var(--text)" }}>{p.usuario_nombre}</td>
                <td style={{ color: "var(--accent3)", fontWeight: 600 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                <td>{statusBadge(p.estado)}</td>
                <td>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── ADMIN: PRODUCTOS ─────────────────────────────────────────────────────────
const AdminProductos = ({ token }) => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ proveedor_id: "", categoria_id: "", nombre: "", descripcion: "", precio: "", activo: 1, stock_inicial: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, pr] = await Promise.all([
        http("/productos?activo=", {}, token),
        http("/categorias", {}, token),
        http("/proveedores", {}, token),
      ]);
      setProductos(p); setCategorias(c); setProveedores(pr);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openCreate = () => {
    setForm({ proveedor_id: "", categoria_id: "", nombre: "", descripcion: "", precio: "", activo: 1, stock_inicial: "" });
    setModal("create");
  };
  const openEdit = (p) => {
    setForm({ proveedor_id: p.proveedor_id, categoria_id: p.categoria_id, nombre: p.nombre, descripcion: p.descripcion || "", precio: p.precio, activo: p.activo, stock_inicial: "" });
    setModal(p);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, precio: parseFloat(form.precio), proveedor_id: parseInt(form.proveedor_id), categoria_id: parseInt(form.categoria_id) };
      if (modal === "create") {
        if (form.stock_inicial !== "") body.stock_inicial = parseInt(form.stock_inicial);
        await http("/productos", { method: "POST", body: JSON.stringify(body) }, token);
        toast("Producto creado");
      } else {
        await http(`/productos/${modal.id}`, { method: "PUT", body: JSON.stringify(body) }, token);
        toast("Producto actualizado");
      }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm("¿Desactivar este producto?")) return;
    try { await http(`/productos/${id}`, { method: "DELETE" }, token); toast("Producto desactivado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const filtered = productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 24 }}>Productos</h2>
        <Btn onClick={openCreate}><Icon d={icons.plus} size={16} />Nuevo producto</Btn>
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Icon d={icons.search} size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
            <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", paddingLeft: 38 }} />
          </div>
        </div>
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon="📦" title="Sin productos" sub="Crea el primer producto" /> : (
          <table>
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Proveedor</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>{filtered.map(p => (
              <tr key={p.id}>
                <td style={{ color: "var(--text)", fontWeight: 500 }}>{p.nombre}</td>
                <td><span className="badge badge-blue">{p.categoria_nombre}</span></td>
                <td style={{ color: "var(--text3)" }}>{p.proveedor_nombre}</td>
                <td style={{ color: "var(--accent3)", fontWeight: 600 }}>${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                <td><span className={`badge ${p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-yellow" : "badge-red"}`}>{p.stock}</span></td>
                <td>{p.activo ? <span className="badge badge-green">Activo</span> : <span className="badge badge-red">Inactivo</span>}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant="secondary" onClick={() => openEdit(p)}><Icon d={icons.edit} size={14} /></Btn>
                    <Btn size="sm" variant="danger" onClick={() => deactivate(p.id)}><Icon d={icons.trash} size={14} /></Btn>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Producto" : "Editar Producto"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Nombre" value={form.nombre} onChange={set("nombre")} placeholder="Nombre del producto" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Categoría" value={form.categoria_id} onChange={set("categoria_id")}>
              <option value="">Selecciona...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Select label="Proveedor" value={form.proveedor_id} onChange={set("proveedor_id")}>
              <option value="">Selecciona...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Precio (MXN)" type="number" min="0" step="0.01" value={form.precio} onChange={set("precio")} placeholder="0.00" />
            {modal === "create" && <Input label="Stock inicial" type="number" min="0" value={form.stock_inicial} onChange={set("stock_inicial")} placeholder="0" />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Descripción</label>
            <textarea value={form.descripcion} onChange={set("descripcion")} placeholder="Descripción del producto..." rows={3} style={{ width: "100%", resize: "vertical" }} />
          </div>
          <Select label="Estado" value={form.activo} onChange={set("activo")}>
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </Select>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── ADMIN: PEDIDOS ───────────────────────────────────────────────────────────
const AdminPedidos = ({ token }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [selected, setSelected] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filtroEstado ? `/pedidos/admin?estado=${filtroEstado}` : "/pedidos/admin";
      setPedidos(await http(url, {}, token));
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  const openDetalle = async (id) => {
    setSelected(id); setLoadingDetalle(true);
    try { setDetalle(await http(`/pedidos/${id}`, {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoadingDetalle(false); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await http(`/pedidos/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }, token);
      toast("Estado actualizado"); load();
      if (selected === id) openDetalle(id);
    } catch (e) { toast(e.message, "error"); }
  };

  const estados = ["", "pendiente", "en_proceso", "enviado", "entregado", "cancelado"];

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 24 }}>Pedidos</h2>
          <Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: "auto" }}>
            {estados.map(e => <option key={e} value={e}>{e || "Todos los estados"}</option>)}
          </Select>
        </div>
        <div className="card">
          {loading ? <Spinner /> : pedidos.length === 0 ? <EmptyState icon="🛒" title="Sin pedidos" sub="No hay pedidos con este filtro" /> : (
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
              <tbody>{pedidos.map(p => (
                <tr key={p.id} style={{ cursor: "pointer", background: selected === p.id ? "var(--bg3)" : "" }}>
                  <td style={{ color: "var(--accent)", fontWeight: 600 }}>#{p.id}</td>
                  <td style={{ color: "var(--text)" }}>{p.usuario_nombre}</td>
                  <td style={{ color: "var(--accent3)", fontWeight: 600 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td>{statusBadge(p.estado)}</td>
                  <td>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>
                  <td><Btn size="sm" variant="ghost" onClick={() => openDetalle(p.id)}><Icon d={icons.eye} size={14} /></Btn></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="card fade-up" style={{ height: "fit-content", position: "sticky", top: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontSize: 16 }}>Pedido #{selected}</h3>
            <button onClick={() => { setSelected(null); setDetalle(null); }} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <Icon d={icons.x} size={18} />
            </button>
          </div>
          {loadingDetalle ? <Spinner /> : detalle ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Estado del pedido</div>
                <Select value={detalle.pedido.estado} onChange={e => cambiarEstado(selected, e.target.value)}>
                  {["pendiente", "en_proceso", "enviado", "entregado", "cancelado"].map(e => <option key={e} value={e}>{e}</option>)}
                </Select>
              </div>
              <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>Items</div>
                {detalle.items.map(i => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                    <span>{i.producto_nombre} ×{i.cantidad}</span>
                    <span style={{ color: "var(--accent3)" }}>${(i.precio_unitario * i.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: "var(--accent3)" }}>${parseFloat(detalle.pedido.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              {detalle.pago && (
                <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 12, fontSize: 13 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Pago</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text2)" }}>Método: {detalle.pago.metodo}</span>
                    {statusBadge(detalle.pago.estado)}
                  </div>
                </div>
              )}
              {detalle.envio && (
                <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 12, fontSize: 13 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Envío</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text2)" }}>{detalle.envio.transportista || "Sin asignar"}</span>
                    {statusBadge(detalle.envio.estado)}
                  </div>
                  {detalle.envio.guia && <div style={{ color: "var(--text3)", marginTop: 4 }}>Guía: {detalle.envio.guia}</div>}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

// ─── ADMIN: USUARIOS ──────────────────────────────────────────────────────────
const AdminUsuarios = ({ token, currentUser }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", rol: "cliente" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsuarios(await http("/usuario", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = (u) => {
    setForm({ nombre: u.nombre, email: u.email, telefono: u.telefono || "", rol: u.rol });
    setModal(u);
  };

  const save = async () => {
    setSaving(true);
    try {
      await http(`/usuario/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token);
      toast("Usuario actualizado"); setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deleteUser = async (id) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try { await http(`/usuario/${id}`, { method: "DELETE" }, token); toast("Usuario eliminado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: "Syne", fontSize: 24, marginBottom: 24 }}>Usuarios</h2>
      <div className="card">
        {loading ? <Spinner /> : usuarios.length === 0 ? <EmptyState icon="👤" title="Sin usuarios" sub="" /> : (
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Registro</th><th>Acciones</th></tr></thead>
            <tbody>{usuarios.map(u => (
              <tr key={u.id}>
                <td style={{ color: "var(--text)", fontWeight: 500 }}>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{u.telefono || "—"}</td>
                <td><span className={`badge ${u.rol === "admin" ? "badge-purple" : "badge-blue"}`}>{u.rol}</span></td>
                <td>{new Date(u.creado_en).toLocaleDateString("es-MX")}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant="secondary" onClick={() => openEdit(u)}><Icon d={icons.edit} size={14} /></Btn>
                    {currentUser.id !== u.id && <Btn size="sm" variant="danger" onClick={() => deleteUser(u.id)}><Icon d={icons.trash} size={14} /></Btn>}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title="Editar Usuario">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Nombre" value={form.nombre} onChange={set("nombre")} />
          <Input label="Email" type="email" value={form.email} onChange={set("email")} />
          <Input label="Teléfono" value={form.telefono} onChange={set("telefono")} />
          <Select label="Rol" value={form.rol} onChange={set("rol")}>
            <option value="cliente">cliente</option>
            <option value="admin">admin</option>
          </Select>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── ADMIN: CATEGORIAS ────────────────────────────────────────────────────────
const AdminCategorias = ({ token }) => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await http("/categorias", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal === "create") {
        await http("/categorias", { method: "POST", body: JSON.stringify({ nombre }) }, token);
        toast("Categoría creada");
      } else {
        await http(`/categorias/${modal.id}`, { method: "PUT", body: JSON.stringify({ nombre }) }, token);
        toast("Categoría actualizada");
      }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar categoría?")) return;
    try { await http(`/categorias/${id}`, { method: "DELETE" }, token); toast("Eliminada"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 24 }}>Categorías</h2>
        <Btn onClick={() => { setNombre(""); setModal("create"); }}><Icon d={icons.plus} size={16} />Nueva</Btn>
      </div>
      <div className="card">
        {loading ? <Spinner /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {cats.map(c => (
              <div key={c.id} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, background: "var(--accent)20", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                    <Icon d={icons.tag} size={16} />
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{c.nombre}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setNombre(c.nombre); setModal(c); }} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4 }}>
                    <Icon d={icons.edit} size={15} />
                  </button>
                  <button onClick={() => del(c.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4 }}>
                    <Icon d={icons.trash} size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nueva Categoría" : "Editar Categoría"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de la categoría" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── ADMIN: PROVEEDORES ───────────────────────────────────────────────────────
const AdminProveedores = ({ token }) => {
  const [provs, setProvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: "", tipo: "local", contacto_email: "", telefono: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProvs(await http("/proveedores", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === "create") {
        await http("/proveedores", { method: "POST", body: JSON.stringify(form) }, token);
        toast("Proveedor creado");
      } else {
        await http(`/proveedores/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token);
        toast("Proveedor actualizado");
      }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    try { await http(`/proveedores/${id}`, { method: "DELETE" }, token); toast("Eliminado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const open = (p = null) => {
    setForm(p ? { nombre: p.nombre, tipo: p.tipo, contacto_email: p.contacto_email || "", telefono: p.telefono || "" } : { nombre: "", tipo: "local", contacto_email: "", telefono: "" });
    setModal(p || "create");
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 24 }}>Proveedores</h2>
        <Btn onClick={() => open()}><Icon d={icons.plus} size={16} />Nuevo</Btn>
      </div>
      <div className="card">
        {loading ? <Spinner /> : provs.length === 0 ? <EmptyState icon="🏭" title="Sin proveedores" sub="" /> : (
          <table>
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Email contacto</th><th>Teléfono</th><th>Acciones</th></tr></thead>
            <tbody>{provs.map(p => (
              <tr key={p.id}>
                <td style={{ color: "var(--text)", fontWeight: 500 }}>{p.nombre}</td>
                <td><span className={`badge ${p.tipo === "local" ? "badge-green" : "badge-purple"}`}>{p.tipo}</span></td>
                <td>{p.contacto_email || "—"}</td>
                <td>{p.telefono || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant="secondary" onClick={() => open(p)}><Icon d={icons.edit} size={14} /></Btn>
                    <Btn size="sm" variant="danger" onClick={() => del(p.id)}><Icon d={icons.trash} size={14} /></Btn>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Proveedor" : "Editar Proveedor"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Nombre" value={form.nombre} onChange={set("nombre")} />
          <Select label="Tipo" value={form.tipo} onChange={set("tipo")}>
            <option value="local">Local</option>
            <option value="dropshipping">Dropshipping</option>
          </Select>
          <Input label="Email de contacto" type="email" value={form.contacto_email} onChange={set("contacto_email")} />
          <Input label="Teléfono (10 dígitos)" value={form.telefono} onChange={set("telefono")} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── ADMIN: INVENTARIO ────────────────────────────────────────────────────────
const AdminInventario = ({ token }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProductos(await http("/productos?activo=", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveStock = async (productoId) => {
    const stock = parseInt(editing[productoId]);
    if (isNaN(stock) || stock < 0) return toast("Stock inválido", "error");
    setSaving(productoId);
    try {
      await http(`/inventario/${productoId}`, { method: "PATCH", body: JSON.stringify({ stock }) }, token);
      toast("Stock actualizado"); load();
      setEditing(p => { const n = { ...p }; delete n[productoId]; return n; });
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(null); }
  };

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: "Syne", fontSize: 24, marginBottom: 24 }}>Inventario</h2>
      <div className="card">
        {loading ? <Spinner /> : (
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Proveedor</th><th>Stock actual</th><th>Ajustar stock</th></tr></thead>
            <tbody>{productos.map(p => (
              <tr key={p.id}>
                <td style={{ color: "var(--text)", fontWeight: 500 }}>{p.nombre}</td>
                <td><span className="badge badge-blue">{p.categoria_nombre}</span></td>
                <td style={{ color: "var(--text3)" }}>{p.proveedor_nombre}</td>
                <td><span className={`badge ${p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-yellow" : "badge-red"}`}>{p.stock} uds</span></td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" min="0" placeholder={p.stock}
                      value={editing[p.id] ?? ""}
                      onChange={e => setEditing(prev => ({ ...prev, [p.id]: e.target.value }))}
                      style={{ width: 90 }} />
                    {editing[p.id] !== undefined && (
                      <Btn size="sm" onClick={() => saveStock(p.id)} disabled={saving === p.id}>
                        <Icon d={icons.check} size={14} />
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── CLIENT: CATÁLOGO ─────────────────────────────────────────────────────────
const ClientCatalogo = ({ token }) => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [cart, setCart] = useState([]);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [direcciones, setDirecciones] = useState([]);
  const [orderForm, setOrderForm] = useState({ direccion_id: "", metodo_pago: "tarjeta" });
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, d] = await Promise.all([
          http("/productos", {}, token),
          http("/categorias", {}, token),
          http("/direcciones", {}, token),
        ]);
        setProductos(p); setCategorias(c); setDirecciones(d);
        if (d.length) setOrderForm(f => ({ ...f, direccion_id: d[0].id }));
      } catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    };
    load();
  }, [token]);

  const addToCart = (p) => {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      if (ex) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1 }];
    });
    toast(`${p.nombre} agregado al carrito`);
  };
  const removeFromCart = (id) => setCart(c => c.filter(i => i.id !== id));
  const cartTotal = cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    if (!orderForm.direccion_id) return toast("Selecciona una dirección", "warn");
    if (!cart.length) return toast("Carrito vacío", "warn");
    setPlacing(true);
    try {
      await http("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          direccion_id: parseInt(orderForm.direccion_id),
          metodo_pago: orderForm.metodo_pago,
          items: cart.map(i => ({ producto_id: i.id, cantidad: i.qty }))
        })
      }, token);
      toast("¡Pedido creado exitosamente! 🎉");
      setCart([]); setCheckoutModal(false);
    } catch (e) { toast(e.message, "error"); }
    finally { setPlacing(false); }
  };

  const filtered = productos.filter(p =>
    (!catFilter || p.categoria_id == catFilter) &&
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 24 }}>Catálogo de Productos</h2>
        <button onClick={() => setCheckoutModal(true)} style={{
          display: "flex", alignItems: "center", gap: 10, background: "var(--accent)", color: "#fff",
          border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontFamily: "Syne", fontWeight: 600
        }}>
          <Icon d={icons.cart} size={18} />
          Carrito {cartCount > 0 && <span style={{ background: "var(--accent2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{cartCount}</span>}
          {cartCount > 0 && <span style={{ borderLeft: "1px solid #ffffff40", paddingLeft: 10 }}>${cartTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Icon d={icons.search} size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
          <input placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", paddingLeft: 38 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {filtered.length === 0 ? <div style={{ gridColumn: "1/-1" }}><EmptyState icon="🔍" title="Sin resultados" sub="Prueba con otros filtros" /></div> :
            filtered.map(p => (
              <div key={p.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, transition: "transform .2s, box-shadow .2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(124,92,252,.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ height: 120, background: `linear-gradient(135deg, var(--accent)15, var(--accent2)10)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon d={icons.package} size={48} style={{ color: "var(--accent)", opacity: .4 }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <h4 style={{ fontFamily: "Syne", fontSize: 15, flex: 1, paddingRight: 8 }}>{p.nombre}</h4>
                    <span className={`badge ${p.stock > 0 ? "badge-green" : "badge-red"}`} style={{ fontSize: 11 }}>
                      {p.stock > 0 ? `${p.stock} disp.` : "Agotado"}
                    </span>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: 11, marginBottom: 8, display: "inline-flex" }}>{p.categoria_nombre}</span>
                  {p.descripcion && <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5, marginBottom: 8 }}>{p.descripcion.slice(0, 80)}{p.descripcion.length > 80 ? "..." : ""}</p>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "var(--accent3)" }}>
                    ${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                  <Btn size="sm" onClick={() => addToCart(p)} disabled={p.stock === 0}>
                    <Icon d={icons.plus} size={14} /> Agregar
                  </Btn>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Checkout Modal */}
      <Modal open={checkoutModal} onClose={() => setCheckoutModal(false)} title="🛒 Tu Carrito">
        {cart.length === 0 ? (
          <EmptyState icon="🛒" title="Carrito vacío" sub="Agrega productos del catálogo" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cart.map(i => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg3)", padding: "10px 14px", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{i.nombre}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>×{i.qty} · ${(i.precio * i.qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                </div>
                <button onClick={() => removeFromCart(i.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
                  <Icon d={icons.trash} size={16} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Syne", fontWeight: 700, fontSize: 18, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <span>Total</span>
              <span style={{ color: "var(--accent3)" }}>${cartTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <Select label="Dirección de entrega" value={orderForm.direccion_id} onChange={e => setOrderForm(f => ({ ...f, direccion_id: e.target.value }))}>
              {direcciones.length === 0 ? <option value="">Sin direcciones guardadas</option> :
                direcciones.map(d => <option key={d.id} value={d.id}>{d.linea1}, {d.ciudad}, {d.estado}</option>)}
            </Select>
            <Select label="Método de pago" value={orderForm.metodo_pago} onChange={e => setOrderForm(f => ({ ...f, metodo_pago: e.target.value }))}>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="contra_entrega">Contra entrega</option>
              <option value="plataforma">Plataforma</option>
            </Select>
            <Btn onClick={placeOrder} disabled={placing || !direcciones.length} style={{ width: "100%", padding: 14, fontSize: 15 }}>
              {placing ? "Procesando..." : "Confirmar Pedido"}
            </Btn>
            {!direcciones.length && <p style={{ fontSize: 12, color: "var(--warn)", textAlign: "center" }}>⚠️ Agrega una dirección en "Mis Direcciones" primero</p>}
          </div>
        )}
      </Modal>
    </div>
  );
};

// ─── CLIENT: MIS PEDIDOS ──────────────────────────────────────────────────────
const ClientPedidos = ({ token }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    const load = async () => {
      try { setPedidos(await http("/pedidos", {}, token)); }
      catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    };
    load();
  }, [token]);

  const openDetalle = async (id) => {
    setSelected(id);
    try { setDetalle(await http(`/pedidos/${id}`, {}, token)); }
    catch (e) { toast(e.message, "error"); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: "Syne", fontSize: 24, marginBottom: 24 }}>Mis Pedidos</h2>
      {pedidos.length === 0 ? <EmptyState icon="📦" title="Sin pedidos" sub="Realiza tu primer pedido desde el catálogo" /> : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 400px" : "1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pedidos.map(p => (
              <div key={p.id} className="card" style={{ cursor: "pointer", border: selected === p.id ? "1px solid var(--accent)" : "1px solid var(--border)", transition: "border-color .2s" }}
                onClick={() => openDetalle(p.id)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700 }}>Pedido #{p.id}</div>
                    <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{new Date(p.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "var(--accent3)" }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    <div style={{ marginTop: 6 }}>{statusBadge(p.estado)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selected && detalle && (
            <div className="card fade-up" style={{ height: "fit-content", position: "sticky", top: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "Syne", fontSize: 16 }}>Detalle del Pedido</h3>
                <button onClick={() => { setSelected(null); setDetalle(null); }} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
                  <Icon d={icons.x} size={18} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>Productos</div>
                  {detalle.items?.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                      <span style={{ color: "var(--text2)" }}>{i.producto_nombre} ×{i.cantidad}</span>
                      <span style={{ color: "var(--accent3)", fontWeight: 600 }}>${(i.precio_unitario * i.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
                    <span>Total</span>
                    <span style={{ color: "var(--accent3)" }}>${parseFloat(detalle.pedido?.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                {detalle.pago && (
                  <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 14, fontSize: 13 }}>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Pago</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text2)" }}>Método: {detalle.pago.metodo}</span>
                      {statusBadge(detalle.pago.estado)}
                    </div>
                  </div>
                )}
                {detalle.envio && (
                  <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 14, fontSize: 13 }}>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Envío</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text2)" }}>{detalle.envio.transportista || "Pendiente de asignación"}</span>
                      {statusBadge(detalle.envio.estado)}
                    </div>
                    {detalle.envio.guia && <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>Guía: {detalle.envio.guia}</div>}
                  </div>
                )}
                <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 14, fontSize: 13 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Dirección de entrega</div>
                  <div style={{ color: "var(--text2)" }}>
                    {detalle.pedido?.direccion_linea1}, {detalle.pedido?.direccion_ciudad}, {detalle.pedido?.direccion_estado} {detalle.pedido?.direccion_cp}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── CLIENT: MIS DIRECCIONES ──────────────────────────────────────────────────
const ClientDirecciones = ({ token }) => {
  const [dirs, setDirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ linea1: "", ciudad: "", estado: "", cp: "", pais: "México", es_principal: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDirs(await http("/direcciones", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, es_principal: form.es_principal ? 1 : 0 };
      if (modal === "create") {
        await http("/direcciones", { method: "POST", body: JSON.stringify(body) }, token);
        toast("Dirección creada");
      } else {
        await http(`/direcciones/${modal.id}`, { method: "PUT", body: JSON.stringify(body) }, token);
        toast("Dirección actualizada");
      }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar dirección?")) return;
    try { await http(`/direcciones/${id}`, { method: "DELETE" }, token); toast("Eliminada"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const openCreate = () => { setForm({ linea1: "", ciudad: "", estado: "", cp: "", pais: "México", es_principal: false }); setModal("create"); };
  const openEdit = (d) => { setForm({ linea1: d.linea1, ciudad: d.ciudad, estado: d.estado, cp: d.cp, pais: d.pais, es_principal: !!d.es_principal }); setModal(d); };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 24 }}>Mis Direcciones</h2>
        <Btn onClick={openCreate}><Icon d={icons.plus} size={16} />Nueva dirección</Btn>
      </div>
      {loading ? <Spinner /> : dirs.length === 0 ? <EmptyState icon="📍" title="Sin direcciones" sub="Agrega una dirección para poder realizar pedidos" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {dirs.map(d => (
            <div key={d.id} className="card" style={{ border: d.es_principal ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: d.es_principal ? "var(--accent)20" : "var(--bg3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: d.es_principal ? "var(--accent)" : "var(--text3)" }}>
                  <Icon d={icons.map} size={18} />
                </div>
                {d.es_principal && <span className="badge badge-purple" style={{ fontSize: 11 }}>Principal</span>}
              </div>
              <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>{d.linea1}</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>{d.ciudad}, {d.estado} {d.cp}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.pais}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Btn size="sm" variant="secondary" onClick={() => openEdit(d)} style={{ flex: 1 }}><Icon d={icons.edit} size={14} />Editar</Btn>
                <Btn size="sm" variant="danger" onClick={() => del(d.id)}><Icon d={icons.trash} size={14} /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nueva Dirección" : "Editar Dirección"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Línea 1 (calle y número)" value={form.linea1} onChange={set("linea1")} placeholder="Ej: Av. Juárez 123" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Ciudad" value={form.ciudad} onChange={set("ciudad")} placeholder="Ciudad" />
            <Input label="Estado" value={form.estado} onChange={set("estado")} placeholder="Estado" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Código Postal (5 dígitos)" value={form.cp} onChange={set("cp")} placeholder="12345" maxLength={5} />
            <Input label="País" value={form.pais} onChange={set("pais")} placeholder="México" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={form.es_principal} onChange={set("es_principal")} style={{ width: 16, height: 16 }} />
            <span style={{ color: "var(--text2)" }}>Marcar como dirección principal</span>
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── CLIENT: MI PERFIL ────────────────────────────────────────────────────────
const ClientPerfil = ({ token, user, onUpdate }) => {
  const [form, setForm] = useState({ nombre: user.nombre, email: user.email, telefono: user.telefono || "" });
  const [saving, setSaving] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await http("/usuario/me", { method: "PUT", body: JSON.stringify(form) }, token);
      localStorage.setItem("user", JSON.stringify(updated));
      onUpdate(updated);
      toast("Perfil actualizado");
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-up" style={{ maxWidth: 520 }}>
      <h2 style={{ fontFamily: "Syne", fontSize: 24, marginBottom: 24 }}>Mi Perfil</h2>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 60, height: 60, background: "linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>
            {user.nombre?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontFamily: "Syne", fontSize: 18 }}>{user.nombre}</h3>
            <span className={`badge ${user.rol === "admin" ? "badge-purple" : "badge-blue"}`} style={{ marginTop: 6 }}>{user.rol}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Nombre completo" value={form.nombre} onChange={set("nombre")} />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={set("email")} />
          <Input label="Teléfono (10 dígitos)" value={form.telefono} onChange={set("telefono")} placeholder="5512345678" />
          <Btn onClick={save} disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [page, setPage] = useState(() => {
    const u = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
    return u?.rol === "admin" ? "dashboard" : "catalogo";
  });

  useEffect(() => { injectStyles(); }, []);

  const handleLogin = (u, t) => {
    setUser(u); setToken(t);
    setPage(u.rol === "admin" ? "dashboard" : "catalogo");
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setUser(null); setToken(null);
  };

  const handleNav = (p) => setPage(p);

  if (!user || !token) return (
    <>
      <ToastContainer />
      <AuthScreen onLogin={handleLogin} />
    </>
  );

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <AdminDashboard token={token} />;
      case "productos": return <AdminProductos token={token} />;
      case "pedidos-admin": return <AdminPedidos token={token} />;
      case "usuarios": return <AdminUsuarios token={token} currentUser={user} />;
      case "categorias": return <AdminCategorias token={token} />;
      case "proveedores": return <AdminProveedores token={token} />;
      case "inventario": return <AdminInventario token={token} />;
      case "catalogo": return <ClientCatalogo token={token} />;
      case "mis-pedidos": return <ClientPedidos token={token} />;
      case "mis-direcciones": return <ClientDirecciones token={token} />;
      case "mi-perfil": return <ClientPerfil token={token} user={user} onUpdate={(u) => setUser(u)} />;
      default: return <EmptyState icon="🏠" title="Página no encontrada" sub="" />;
    }
  };

  return (
    <>
      <ToastContainer />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar user={user} active={page} onNav={handleNav} onLogout={handleLogout} />
        <main style={{ marginLeft: 240, flex: 1, padding: "28px 32px", minHeight: "100vh", background: "var(--bg)" }}>
          {renderPage()}
        </main>
      </div>
    </>
  );
}

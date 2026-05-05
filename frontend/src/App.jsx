import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:3000/api";

const http = async (path, opts = {}, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Error en la petición");
  return data;
};

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
const useBreakpoint = () => {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    return window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
  });
  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return { bp, isMobile: bp === "mobile", isTablet: bp === "tablet", isDesktop: bp === "desktop", isSmall: bp !== "desktop" };
};

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, style: s = {} }) => {
  const paths = {
    store: <><path d="M2 7l10-5 10 5v2H2V7z"/><path d="M4 9v10h16V9"/><path d="M9 9v10"/><path d="M15 9v10"/><path d="M9 14h6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    package: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    cart: <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    truck: <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    creditCard: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    map: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    eye: <><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
    dashboard: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></>,
    shoppingBag: <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    chevronRight: <><polyline points="9 18 15 12 9 6"/></>,
    chevronDown: <><polyline points="6 9 12 15 18 9"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    trendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
    mapPin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...s }}>
      {paths[name] || paths.info}
    </svg>
  );
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
    <div style={{ position: "fixed", bottom: 16, right: 16, left: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#dc2626" : t.type === "warn" ? "#d97706" : "#16a34a",
          color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 14,
          fontFamily: "'Outfit', sans-serif", fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,.2)",
          animation: "toastIn .3s cubic-bezier(.34,1.56,.64,1)",
          display: "flex", alignItems: "center", gap: 10,
          maxWidth: 420, marginLeft: "auto", pointerEvents: "all",
        }}>
          <Icon name={t.type === "error" ? "x" : t.type === "warn" ? "alert" : "check"} size={16} />
          {t.msg}
        </div>
      ))}
    </div>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const injectStyles = () => {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --red: #e31b23; --red-dark: #b91219; --red-light: #ff3d46;
      --red-pale: #fff1f2; --red-soft: #ffe4e6;
      --white: #ffffff; --off-white: #fafafa;
      --gray-50: #f9fafb; --gray-100: #f3f4f6; --gray-200: #e5e7eb;
      --gray-300: #d1d5db; --gray-400: #9ca3af; --gray-500: #6b7280;
      --gray-600: #4b5563; --gray-700: #374151; --gray-800: #1f2937; --gray-900: #111827;
      --green: #16a34a; --green-pale: #f0fdf4;
      --amber: #d97706; --amber-pale: #fffbeb;
      --blue: #2563eb; --blue-pale: #eff6ff;
      --radius-sm: 8px; --radius: 12px; --radius-lg: 14px; --radius-xl: 20px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
      --shadow: 0 4px 16px rgba(0,0,0,.08);
      --shadow-lg: 0 12px 40px rgba(0,0,0,.12);
      --shadow-red: 0 8px 24px rgba(227,27,35,.2);
      --sidebar-w: 248px;
      --topbar-h: 56px;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--gray-50); color: var(--gray-800); font-family: 'Outfit', sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    h1,h2,h3,h4,h5,h6 { font-family: 'Outfit', sans-serif; font-weight: 700; line-height: 1.3; }
    input, select, textarea {
      background: var(--white); border: 1.5px solid var(--gray-200);
      color: var(--gray-800); border-radius: var(--radius-sm);
      padding: 11px 14px; font-family: 'Outfit', sans-serif; font-size: 14px;
      outline: none; transition: all .2s; width: 100%;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--red); box-shadow: 0 0 0 3px rgba(227,27,35,.1);
    }
    input::placeholder, textarea::placeholder { color: var(--gray-400); }
    button { cursor: pointer; font-family: 'Outfit', sans-serif; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: var(--gray-100); }
    ::-webkit-scrollbar-thumb { background: var(--gray-300); border-radius: 99px; }

    @keyframes toastIn { from{opacity:0;transform:translateX(20px) scale(.95)} to{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes slideLeft { from{opacity:0;transform:translateX(-100%)} to{opacity:1;transform:translateX(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }

    .fade-up { animation: fadeUp .4s cubic-bezier(.22,1,.36,1) forwards; }
    .fade-in { animation: fadeIn .3s ease forwards; }

    .card { background:var(--white); border:1px solid var(--gray-200); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }

    .badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; white-space:nowrap; }
    .badge-red { background:var(--red-pale); color:var(--red); }
    .badge-red-solid { background:var(--red); color:#fff; }
    .badge-green { background:var(--green-pale); color:var(--green); }
    .badge-amber { background:var(--amber-pale); color:var(--amber); }
    .badge-blue { background:var(--blue-pale); color:var(--blue); }
    .badge-gray { background:var(--gray-100); color:var(--gray-600); }

    table { width:100%; border-collapse:collapse; }
    thead th { text-align:left; padding:12px 16px; font-size:11px; color:var(--gray-500); font-weight:700; text-transform:uppercase; letter-spacing:.08em; background:var(--gray-50); border-bottom:1px solid var(--gray-200); white-space:nowrap; }
    tbody td { padding:12px 16px; border-bottom:1px solid var(--gray-100); font-size:14px; color:var(--gray-600); vertical-align:middle; }
    tbody tr { transition:background .15s; }
    tbody tr:hover td { background:var(--gray-50); }
    tbody tr:last-child td { border-bottom:none; }

    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; animation:fadeIn .2s ease; }
    .modal { background:var(--white); border:1px solid var(--gray-200); border-radius:var(--radius-xl); padding:24px; width:100%; max-width:520px; max-height:92vh; overflow-y:auto; box-shadow:var(--shadow-lg); animation:fadeUp .3s cubic-bezier(.22,1,.36,1); }

    .product-card { background:var(--white); border:1.5px solid var(--gray-200); border-radius:var(--radius-lg); overflow:hidden; transition:all .25s cubic-bezier(.22,1,.36,1); }
    .product-card:hover { border-color:var(--red); box-shadow:var(--shadow-red); transform:translateY(-3px); }

    .btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--red); color:#fff; border:none; border-radius:var(--radius-sm); padding:11px 20px; font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; box-shadow:0 2px 8px rgba(227,27,35,.3); white-space:nowrap; }
    .btn-primary:hover { background:var(--red-dark); box-shadow:var(--shadow-red); transform:translateY(-1px); }
    .btn-primary:active { transform:translateY(0); }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }

    .btn-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--white); color:var(--gray-700); border:1.5px solid var(--gray-200); border-radius:var(--radius-sm); padding:10px 18px; font-family:'Outfit',sans-serif; font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; white-space:nowrap; }
    .btn-secondary:hover { border-color:var(--red); color:var(--red); background:var(--red-pale); }
    .btn-secondary:disabled { opacity:.5; cursor:not-allowed; }

    .btn-danger { display:inline-flex; align-items:center; justify-content:center; gap:6px; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:var(--radius-sm); padding:8px 14px; font-family:'Outfit',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
    .btn-danger:hover { background:#fecaca; }

    .btn-ghost { display:inline-flex; align-items:center; justify-content:center; gap:6px; background:transparent; color:var(--gray-500); border:none; border-radius:var(--radius-sm); padding:8px 12px; font-family:'Outfit',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
    .btn-ghost:hover { background:var(--gray-100); color:var(--gray-700); }

    .btn-sm { padding:7px 12px !important; font-size:13px !important; }

    .input-group { display:flex; flex-direction:column; gap:5px; }
    .input-label { font-size:13px; color:var(--gray-600); font-weight:600; }

    .search-wrap { position:relative; }
    .search-wrap svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--gray-400); pointer-events:none; }
    .search-wrap input { padding-left:38px; }

    /* Sidebar overlay for mobile */
    .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:199; }
    .sidebar-overlay.visible { display:block; animation:fadeIn .2s ease; }

    /* Mobile bottom nav */
    .bottom-nav { display:none; }

    /* Responsive table wrapper */
    .table-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }

    /* Mobile card list for tables */
    .mobile-card-list { display:none; }

    @media (max-width: 1023px) {
      :root { --sidebar-w: 0px; }
      .sidebar-desktop { transform: translateX(-100%); transition: transform .3s cubic-bezier(.22,1,.36,1); }
      .sidebar-desktop.open { transform: translateX(0); box-shadow: var(--shadow-lg); }
    }
    @media (max-width: 639px) {
      .modal { padding: 20px; border-radius: 16px; max-height: 96vh; }
      .modal-overlay { padding: 12px; align-items: flex-end; }
      .modal { border-radius: 20px 20px 16px 16px; }
      table thead { display:none; }
      table tbody tr { display:block; border:1px solid var(--gray-200); border-radius:12px; margin-bottom:10px; background:var(--white); padding:12px; }
      table tbody td { display:block; border:none; padding:4px 0; font-size:13px; }
      table tbody td::before { content: attr(data-label); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--gray-400); display:block; margin-bottom:2px; }
      tbody tr:hover td { background:transparent; }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "primary", size, disabled, style: s = {}, type = "button" }) => (
  <button type={type} className={`btn-${variant}${size === "sm" ? " btn-sm" : ""}`} onClick={onClick} disabled={disabled} style={s}>
    {children}
  </button>
);

const InputField = ({ label, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <input {...props} />
  </div>
);

const SelectField = ({ label, children, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <select {...props}>{children}</select>
  </div>
);

const Spinner = ({ size = 36 }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 48 }}>
    <div style={{ width: size, height: size, border: "3px solid var(--gray-200)", borderTop: "3px solid var(--red)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
  </div>
);

const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ textAlign: "center", padding: "48px 20px" }}>
    <div style={{ width: 64, height: 64, background: "var(--red-pale)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--red)" }}>
      <Icon name={icon} size={28} />
    </div>
    <h3 style={{ fontSize: 17, marginBottom: 6, color: "var(--gray-800)" }}>{title}</h3>
    <p style={{ color: "var(--gray-500)", fontSize: 14, marginBottom: action ? 20 : 0 }}>{sub}</p>
    {action}
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, color: "var(--gray-900)" }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: "50%" }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const statusBadge = (estado) => {
  const map = { pendiente: "badge-amber", en_proceso: "badge-blue", enviado: "badge-blue", entregado: "badge-green", cancelado: "badge-red", aprobado: "badge-green", rechazado: "badge-red", preparando: "badge-amber", en_transito: "badge-blue", incidencia: "badge-red" };
  const labels = { pendiente: "Pendiente", en_proceso: "En proceso", enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado", aprobado: "Aprobado", rechazado: "Rechazado", preparando: "Preparando", en_transito: "En tránsito", incidencia: "Incidencia" };
  return <span className={`badge ${map[estado] || "badge-gray"}`}>{labels[estado] || estado}</span>;
};

const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--gray-900)", marginBottom: 2 }}>{title}</h2>
      {subtitle && <p style={{ color: "var(--gray-500)", fontSize: 13 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
  </div>
);

// ─── TOPBAR (mobile/tablet) ───────────────────────────────────────────────────
const TopBar = ({ user, onMenuOpen, cartCount, onCartOpen, page }) => {
  const pageLabels = { catalogo: "Catálogo", "mis-pedidos": "Mis Pedidos", "mis-direcciones": "Mis Direcciones", "mi-perfil": "Mi Perfil", dashboard: "Dashboard", productos: "Productos", "pedidos-admin": "Pedidos", usuarios: "Usuarios", categorias: "Categorías", proveedores: "Proveedores", inventario: "Inventario" };
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "var(--topbar-h)", background: "var(--white)", borderBottom: "1px solid var(--gray-200)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 150, boxShadow: "var(--shadow-sm)" }}>
      <button className="btn-ghost" onClick={onMenuOpen} style={{ padding: 8, flexShrink: 0 }}>
        <Icon name="menu" size={22} style={{ color: "var(--gray-700)" }} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <div style={{ width: 28, height: 28, background: "var(--red)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="store" size={15} style={{ color: "white" }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, color: "var(--gray-900)" }}>{pageLabels[page] || "Comercio Fácil"}</span>
      </div>
      {user?.rol !== "admin" && (
        <button onClick={onCartOpen} style={{ position: "relative", background: cartCount > 0 ? "var(--red)" : "var(--gray-100)", border: "none", borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: cartCount > 0 ? "#fff" : "var(--gray-600)", fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, transition: "all .2s" }}>
          <Icon name="cart" size={18} />
          {cartCount > 0 && <span style={{ fontSize: 13, fontWeight: 700 }}>{cartCount}</span>}
        </button>
      )}
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const Sidebar = ({ user, active, onNav, onLogout, isOpen, onClose, isMobile }) => {
  const isAdmin = user?.rol === "admin";
  const navItems = isAdmin ? [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "productos", icon: "package", label: "Productos" },
    { id: "pedidos-admin", icon: "cart", label: "Pedidos" },
    { id: "usuarios", icon: "users", label: "Usuarios" },
    { id: "categorias", icon: "tag", label: "Categorías" },
    { id: "proveedores", icon: "truck", label: "Proveedores" },
    { id: "inventario", icon: "box", label: "Inventario" },
  ] : [
    { id: "catalogo", icon: "store", label: "Catálogo" },
    { id: "mis-pedidos", icon: "shoppingBag", label: "Mis Pedidos" },
    { id: "mis-direcciones", icon: "mapPin", label: "Mis Direcciones" },
    { id: "mi-perfil", icon: "user", label: "Mi Perfil" },
  ];

  const handleNav = (id) => { onNav(id); if (isMobile) onClose(); };

  return (
    <>
      {isMobile && <div className={`sidebar-overlay${isOpen ? " visible" : ""}`} onClick={onClose} />}
      <div className="sidebar-desktop" style={{
        width: "var(--sidebar-w, 248px)", minWidth: 248, background: "var(--white)",
        borderRight: "1px solid var(--gray-200)", height: "100vh",
        position: "fixed", top: 0, left: 0,
        display: "flex", flexDirection: "column", zIndex: 200,
        ...(isMobile ? { width: 260 } : {}),
        ...(isOpen && isMobile ? {} : {}),
      }}
        // force open class via inline for mobile:
        ref={el => { if (el) { if (isMobile) { el.style.transform = isOpen ? "translateX(0)" : "translateX(-100%)"; } else { el.style.transform = ""; } } }}
      >
        {/* Logo */}
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, background: "var(--red)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-red)", flexShrink: 0 }}>
              <Icon name="store" size={19} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--gray-900)", lineHeight: 1.2 }}>Comercio Fácil</div>
              <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 500 }}>México</div>
            </div>
          </div>
          {isMobile && (
            <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}>
              <Icon name="x" size={18} style={{ color: "var(--gray-500)" }} />
            </button>
          )}
        </div>

        {/* User info */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--gray-100)", background: isAdmin ? "var(--red-pale)" : "var(--gray-50)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: isAdmin ? "var(--red)" : "var(--gray-600)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {user?.nombre?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--gray-800)" }}>{user?.nombre}</div>
              <span className={`badge ${isAdmin ? "badge-red" : "badge-gray"}`} style={{ fontSize: 10, padding: "1px 7px" }}>
                {isAdmin ? "Administrador" : "Cliente"}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: ".1em", padding: "4px 6px", marginBottom: 4 }}>
            {isAdmin ? "Administración" : "Mi cuenta"}
          </div>
          {navItems.map(({ id, icon, label }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => handleNav(id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, border: "none", cursor: "pointer", transition: "all .15s", fontFamily: "'Outfit',sans-serif", fontWeight: isActive ? 600 : 500, fontSize: 14, textAlign: "left", marginBottom: 2, background: isActive ? "var(--red)" : "transparent", color: isActive ? "white" : "var(--gray-600)", borderLeft: isActive ? "none" : "none" }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--red-pale)"; e.currentTarget.style.color = "var(--red)"; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gray-600)"; } }}
              >
                <Icon name={icon} size={17} style={{ color: isActive ? "white" : "var(--gray-400)" }} />
                {label}
                {isActive && <Icon name="chevronRight" size={13} style={{ marginLeft: "auto", color: "rgba(255,255,255,.7)" }} />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "10px 10px", borderTop: "1px solid var(--gray-100)" }}>
          <button onClick={onLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: "var(--gray-500)", fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: 14, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gray-500)"; }}
          >
            <Icon name="logout" size={16} style={{ color: "var(--gray-400)" }} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", telefono: "" });
  const [loading, setLoading] = useState(false);
  const { isMobile } = useBreakpoint();
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await http("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
        localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user));
        toast("¡Bienvenido de vuelta!"); onLogin(data.user, data.token);
      } else {
        const body = { nombre: form.nombre, email: form.email, password: form.password };
        if (form.telefono) body.telefono = form.telefono;
        const data = await http("/auth/register", { method: "POST", body: JSON.stringify(body) });
        localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user));
        toast("¡Cuenta creada!"); onLogin(data.user, data.token);
      }
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: "var(--white)" }}>
      {/* Hero panel */}
      <div style={{ flex: isMobile ? "none" : 1, background: "linear-gradient(150deg, var(--red) 0%, #9b111a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "36px 24px" : "60px", position: "relative", overflow: "hidden", minHeight: isMobile ? "auto" : undefined }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "white", maxWidth: 360 }}>
          <div style={{ width: isMobile ? 56 : 68, height: isMobile ? 56 : 68, background: "rgba(255,255,255,.15)", backdropFilter: "blur(10px)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "1px solid rgba(255,255,255,.2)" }}>
            <Icon name="store" size={isMobile ? 28 : 34} />
          </div>
          <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, marginBottom: 10, letterSpacing: "-.02em", color: "white" }}>Comercio Fácil</h1>
          {!isMobile && (
            <>
              <p style={{ fontSize: 15, opacity: .85, lineHeight: 1.7, marginBottom: 32 }}>La plataforma que conecta proveedores y comerciantes de México</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[{ icon: "shield", text: "Transacciones seguras" }, { icon: "zap", text: "Pedidos en tiempo real" }, { icon: "users", text: "Red de proveedores" }].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,.15)" }}>
                    <div style={{ width: 28, height: 28, background: "rgba(255,255,255,.15)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={icon} size={14} />
                    </div>
                    <span style={{ fontSize: 13, opacity: .9 }}>{text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form panel */}
      <div style={{ width: isMobile ? "100%" : 460, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "24px 20px 40px" : "48px" }}>
        <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 800, color: "var(--gray-900)", marginBottom: 6 }}>
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
              {mode === "login" ? "Bienvenido de vuelta" : "Únete a nuestra comunidad"}
            </p>
          </div>
          <div style={{ display: "flex", background: "var(--gray-100)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 14, transition: "all .2s", background: mode === m ? "var(--white)" : "transparent", color: mode === m ? "var(--red)" : "var(--gray-500)", boxShadow: mode === m ? "var(--shadow-sm)" : "none" }}>
                {m === "login" ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <InputField label="Nombre completo" placeholder="María García" value={form.nombre} onChange={set("nombre")} />}
            <InputField label="Correo electrónico" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={set("email")} />
            <InputField label="Contraseña" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />
            {mode === "register" && <InputField label="Teléfono (opcional)" placeholder="5512345678" value={form.telefono} onChange={set("telefono")} />}
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: 13, fontSize: 15, marginTop: 4, borderRadius: 10, justifyContent: "center" }}>
              {loading ? <><div style={{ width: 17, height: 17, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Procesando...</> : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </div>
          <p style={{ textAlign: "center", color: "var(--gray-400)", fontSize: 12, marginTop: 24 }}>© 2025 Comercio Fácil México</p>
        </div>
      </div>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = ({ token }) => {
  const [stats, setStats] = useState({ productos: 0, pedidos: 0, usuarios: 0, proveedores: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        const [prods, peds, users, provs] = await Promise.all([http("/productos?activo=1", {}, token), http("/pedidos/admin", {}, token), http("/usuario", {}, token), http("/proveedores", {}, token)]);
        setStats({ productos: prods.length, pedidos: peds.length, usuarios: users.length, proveedores: provs.length });
        setRecent(peds.slice(0, 5));
      } catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const statCards = [
    { label: "Productos", value: stats.productos, icon: "package", bg: "var(--red-pale)", color: "var(--red)" },
    { label: "Pedidos", value: stats.pedidos, icon: "cart", bg: "#eff6ff", color: "#2563eb" },
    { label: "Usuarios", value: stats.usuarios, icon: "users", bg: "#f0fdf4", color: "#16a34a" },
    { label: "Proveedores", value: stats.proveedores, icon: "truck", bg: "#fffbeb", color: "#d97706" },
  ];

  if (loading) return <Spinner />;
  return (
    <div className="fade-up">
      <PageHeader title="Panel de Control" />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 10 : 16, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon, bg, color }) => (
          <div key={label} className="card" style={{ padding: isMobile ? 14 : 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 12 }}>
              <Icon name={icon} size={19} />
            </div>
            <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 900, color: "var(--gray-900)", letterSpacing: "-.02em" }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pedidos recientes</h3>
        </div>
        {recent.length === 0 ? <EmptyState icon="cart" title="Sin pedidos" sub="" /> : isMobile ? (
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--gray-50)", borderRadius: 10, border: "1px solid var(--gray-100)" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 13 }}>#{p.id} · {p.usuario_nombre}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-400)" }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                  {statusBadge(p.estado)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>{recent.map(p => (
                <tr key={p.id}>
                  <td data-label="Pedido" style={{ fontWeight: 700, color: "var(--red)" }}>#{p.id}</td>
                  <td data-label="Cliente" style={{ fontWeight: 500, color: "var(--gray-800)" }}>{p.usuario_nombre}</td>
                  <td data-label="Total" style={{ fontWeight: 700 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td data-label="Estado">{statusBadge(p.estado)}</td>
                  <td data-label="Fecha" style={{ color: "var(--gray-500)" }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
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
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, pr] = await Promise.all([http("/productos?activo=", {}, token), http("/categorias", {}, token), http("/proveedores", {}, token)]);
      setProductos(p); setCategorias(c); setProveedores(pr);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, precio: parseFloat(form.precio), proveedor_id: parseInt(form.proveedor_id), categoria_id: parseInt(form.categoria_id) };
      if (modal === "create") { if (form.stock_inicial !== "") body.stock_inicial = parseInt(form.stock_inicial); await http("/productos", { method: "POST", body: JSON.stringify(body) }, token); toast("Producto creado"); }
      else { await http(`/productos/${modal.id}`, { method: "PUT", body: JSON.stringify(body) }, token); toast("Producto actualizado"); }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm("¿Desactivar este producto?")) return;
    try { await http(`/productos/${id}`, { method: "DELETE" }, token); toast("Producto desactivado"); load(); } catch (e) { toast(e.message, "error"); }
  };

  const filtered = productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-up">
      <PageHeader title="Productos" subtitle={`${productos.length} productos`} actions={<Btn onClick={() => { setForm({ proveedor_id: "", categoria_id: "", nombre: "", descripcion: "", precio: "", activo: 1, stock_inicial: "" }); setModal("create"); }}><Icon name="plus" size={16} />{!isMobile && "Nuevo"}</Btn>} />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gray-100)" }}>
          <div className="search-wrap"><Icon name="search" size={16} /><input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon="package" title="Sin productos" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nombre</th>{!isMobile && <th>Categoría</th>}<th>Precio</th><th>Stock</th>{!isMobile && <th>Estado</th>}<th></th></tr></thead>
              <tbody>{filtered.map(p => (
                <tr key={p.id}>
                  <td data-label="Nombre">
                    <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{p.nombre}</div>
                    {isMobile && <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{p.categoria_nombre}</span>{p.activo ? <span className="badge badge-green" style={{ fontSize: 11 }}>Activo</span> : <span className="badge badge-red" style={{ fontSize: 11 }}>Inactivo</span>}</div>}
                  </td>
                  {!isMobile && <td data-label="Categoría"><span className="badge badge-blue">{p.categoria_nombre}</span></td>}
                  <td data-label="Precio" style={{ fontWeight: 700 }}>${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td data-label="Stock"><span className={`badge ${p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-amber" : "badge-red"}`}>{p.stock}</span></td>
                  {!isMobile && <td data-label="Estado">{p.activo ? <span className="badge badge-green">Activo</span> : <span className="badge badge-red">Inactivo</span>}</td>}
                  <td data-label="Acciones">
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn-ghost btn-sm" onClick={() => { setForm({ proveedor_id: p.proveedor_id, categoria_id: p.categoria_id, nombre: p.nombre, descripcion: p.descripcion || "", precio: p.precio, activo: p.activo }); setModal(p); }}><Icon name="edit" size={14} /></button>
                      <button className="btn-danger btn-sm" onClick={() => deactivate(p.id)}><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Producto" : "Editar Producto"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} placeholder="Nombre del producto" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SelectField label="Categoría" value={form.categoria_id} onChange={set("categoria_id")}>
              <option value="">Selecciona...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </SelectField>
            <SelectField label="Proveedor" value={form.proveedor_id} onChange={set("proveedor_id")}>
              <option value="">Selecciona...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </SelectField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: modal === "create" ? "1fr 1fr" : "1fr", gap: 12 }}>
            <InputField label="Precio (MXN)" type="number" min="0" step="0.01" value={form.precio} onChange={set("precio")} placeholder="0.00" />
            {modal === "create" && <InputField label="Stock inicial" type="number" min="0" value={form.stock_inicial} onChange={set("stock_inicial")} placeholder="0" />}
          </div>
          <div className="input-group"><label className="input-label">Descripción</label><textarea value={form.descripcion} onChange={set("descripcion")} rows={3} style={{ resize: "vertical" }} /></div>
          <SelectField label="Estado" value={form.activo} onChange={set("activo")}><option value={1}>Activo</option><option value={0}>Inactivo</option></SelectField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
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
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try { setPedidos(await http(filtroEstado ? `/pedidos/admin?estado=${filtroEstado}` : "/pedidos/admin", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  const openDetalle = async (id) => {
    setSelected(id); setLoadingDetalle(true);
    try { setDetalle(await http(`/pedidos/${id}`, {}, token)); } catch (e) { toast(e.message, "error"); }
    finally { setLoadingDetalle(false); }
  };

  const cambiarEstado = async (id, estado) => {
    try { await http(`/pedidos/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }, token); toast("Estado actualizado"); load(); if (selected === id) openDetalle(id); }
    catch (e) { toast(e.message, "error"); }
  };

  const DetalleModal = () => (
    <Modal open={!!selected} onClose={() => { setSelected(null); setDetalle(null); }} title={`Pedido #${selected}`}>
      {loadingDetalle ? <Spinner size={28} /> : detalle ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SelectField label="Cambiar estado" value={detalle.pedido.estado} onChange={e => cambiarEstado(selected, e.target.value)}>
            {["pendiente", "en_proceso", "enviado", "entregado", "cancelado"].map(e => <option key={e} value={e}>{e}</option>)}
          </SelectField>
          <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 14, border: "1px solid var(--gray-100)" }}>
            <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Productos</div>
            {detalle.items.map(i => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "var(--gray-700)" }}>{i.producto_nombre} <span style={{ color: "var(--gray-400)" }}>×{i.cantidad}</span></span>
                <span style={{ fontWeight: 700 }}>${(i.precio_unitario * i.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--gray-200)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
              <span>Total</span><span style={{ color: "var(--red)" }}>${parseFloat(detalle.pedido.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          {detalle.pago && (
            <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 12, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: "var(--gray-700)" }}><Icon name="creditCard" size={14} style={{ marginRight: 6, color: "var(--gray-400)", verticalAlign: "middle" }} />{detalle.pago.metodo}</span>
              {statusBadge(detalle.pago.estado)}
            </div>
          )}
          {detalle.envio && (
            <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 12, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: "var(--gray-700)" }}><Icon name="truck" size={14} style={{ marginRight: 6, color: "var(--gray-400)", verticalAlign: "middle" }} />{detalle.envio.transportista || "Sin asignar"}</span>
              {statusBadge(detalle.envio.estado)}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );

  return (
    <div className="fade-up">
      <PageHeader title="Pedidos" subtitle={`${pedidos.length} pedidos`} actions={
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ minWidth: isMobile ? 150 : 180, fontSize: 13 }}>
          {["", "pendiente", "en_proceso", "enviado", "entregado", "cancelado"].map(e => <option key={e} value={e}>{e || "Todos"}</option>)}
        </select>
      } />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : pedidos.length === 0 ? <EmptyState icon="cart" title="Sin pedidos" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th>{!isMobile && <th>Fecha</th>}<th></th></tr></thead>
              <tbody>{pedidos.map(p => (
                <tr key={p.id}>
                  <td data-label="Pedido" style={{ fontWeight: 700, color: "var(--red)" }}>#{p.id}</td>
                  <td data-label="Cliente" style={{ fontWeight: 500, color: "var(--gray-800)" }}>{p.usuario_nombre}</td>
                  <td data-label="Total" style={{ fontWeight: 700 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td data-label="Estado">{statusBadge(p.estado)}</td>
                  {!isMobile && <td data-label="Fecha" style={{ color: "var(--gray-500)" }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>}
                  <td><button className="btn-ghost btn-sm" onClick={() => openDetalle(p.id)}><Icon name="eye" size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <DetalleModal />
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
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => { setLoading(true); try { setUsuarios(await http("/usuario", {}, token)); } catch (e) { toast(e.message, "error"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try { await http(`/usuario/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token); toast("Usuario actualizado"); setModal(null); load(); }
    catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };

  const deleteUser = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    try { await http(`/usuario/${id}`, { method: "DELETE" }, token); toast("Eliminado"); load(); } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Usuarios" subtitle={`${usuarios.length} registrados`} />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Usuario</th>{!isMobile && <th>Email</th>}{!isMobile && <th>Teléfono</th>}<th>Rol</th><th></th></tr></thead>
              <tbody>{usuarios.map(u => (
                <tr key={u.id}>
                  <td data-label="Usuario">
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, background: u.rol === "admin" ? "var(--red)" : "var(--gray-200)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: u.rol === "admin" ? "#fff" : "var(--gray-600)", flexShrink: 0 }}>{u.nombre?.[0]?.toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--gray-900)", fontSize: 13 }}>{u.nombre}</div>
                        {isMobile && <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{u.email}</div>}
                      </div>
                    </div>
                  </td>
                  {!isMobile && <td data-label="Email" style={{ color: "var(--gray-500)", fontSize: 13 }}>{u.email}</td>}
                  {!isMobile && <td data-label="Teléfono" style={{ color: "var(--gray-500)" }}>{u.telefono || "—"}</td>}
                  <td data-label="Rol"><span className={`badge ${u.rol === "admin" ? "badge-red" : "badge-gray"}`}>{u.rol}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn-ghost btn-sm" onClick={() => { setForm({ nombre: u.nombre, email: u.email, telefono: u.telefono || "", rol: u.rol }); setModal(u); }}><Icon name="edit" size={13} /></button>
                      {currentUser.id !== u.id && <button className="btn-danger btn-sm" onClick={() => deleteUser(u.id)}><Icon name="trash" size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title="Editar Usuario">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} />
          <InputField label="Email" type="email" value={form.email} onChange={set("email")} />
          <InputField label="Teléfono" value={form.telefono} onChange={set("telefono")} />
          <SelectField label="Rol" value={form.rol} onChange={set("rol")}><option value="cliente">Cliente</option><option value="admin">Administrador</option></SelectField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
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
  const load = useCallback(async () => { setLoading(true); try { setCats(await http("/categorias", {}, token)); } catch (e) { toast(e.message, "error"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setSaving(true);
    try {
      if (modal === "create") { await http("/categorias", { method: "POST", body: JSON.stringify({ nombre }) }, token); toast("Creada"); }
      else { await http(`/categorias/${modal.id}`, { method: "PUT", body: JSON.stringify({ nombre }) }, token); toast("Actualizada"); }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  const del = async (id) => { if (!confirm("¿Eliminar?")) return; try { await http(`/categorias/${id}`, { method: "DELETE" }, token); toast("Eliminada"); load(); } catch (e) { toast(e.message, "error"); } };
  return (
    <div className="fade-up">
      <PageHeader title="Categorías" actions={<Btn onClick={() => { setNombre(""); setModal("create"); }}><Icon name="plus" size={16} />Nueva</Btn>} />
      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {cats.map(c => (
            <div key={c.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, background: "var(--red-pale)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)" }}><Icon name="tag" size={16} /></div>
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-800)" }}>{c.nombre}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => { setNombre(c.nombre); setModal(c); }}><Icon name="edit" size={14} style={{ color: "var(--gray-400)" }} /></button>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => del(c.id)}><Icon name="trash" size={14} style={{ color: "#dc2626" }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nueva Categoría" : "Editar Categoría"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Frutas y verduras" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
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
  const { isMobile } = useBreakpoint();
  const load = useCallback(async () => { setLoading(true); try { setProvs(await http("/proveedores", {}, token)); } catch (e) { toast(e.message, "error"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    setSaving(true);
    try {
      if (modal === "create") { await http("/proveedores", { method: "POST", body: JSON.stringify(form) }, token); toast("Creado"); }
      else { await http(`/proveedores/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token); toast("Actualizado"); }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  const del = async (id) => { if (!confirm("¿Eliminar?")) return; try { await http(`/proveedores/${id}`, { method: "DELETE" }, token); toast("Eliminado"); load(); } catch (e) { toast(e.message, "error"); } };
  const open = (p = null) => { setForm(p ? { nombre: p.nombre, tipo: p.tipo, contacto_email: p.contacto_email || "", telefono: p.telefono || "" } : { nombre: "", tipo: "local", contacto_email: "", telefono: "" }); setModal(p || "create"); };
  return (
    <div className="fade-up">
      <PageHeader title="Proveedores" actions={<Btn onClick={() => open()}><Icon name="plus" size={16} />{!isMobile && "Nuevo"}</Btn>} />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : provs.length === 0 ? <EmptyState icon="truck" title="Sin proveedores" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nombre</th><th>Tipo</th>{!isMobile && <th>Email</th>}{!isMobile && <th>Teléfono</th>}<th></th></tr></thead>
              <tbody>{provs.map(p => (
                <tr key={p.id}>
                  <td data-label="Nombre" style={{ fontWeight: 600, color: "var(--gray-900)" }}>{p.nombre}</td>
                  <td data-label="Tipo"><span className={`badge ${p.tipo === "local" ? "badge-green" : "badge-blue"}`}>{p.tipo}</span></td>
                  {!isMobile && <td data-label="Email" style={{ color: "var(--gray-500)" }}>{p.contacto_email || "—"}</td>}
                  {!isMobile && <td data-label="Teléfono" style={{ color: "var(--gray-500)" }}>{p.telefono || "—"}</td>}
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn-ghost btn-sm" onClick={() => open(p)}><Icon name="edit" size={13} /></button>
                      <button className="btn-danger btn-sm" onClick={() => del(p.id)}><Icon name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Proveedor" : "Editar Proveedor"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} />
          <SelectField label="Tipo" value={form.tipo} onChange={set("tipo")}><option value="local">Local</option><option value="dropshipping">Dropshipping</option></SelectField>
          <InputField label="Email de contacto" type="email" value={form.contacto_email} onChange={set("contacto_email")} />
          <InputField label="Teléfono (10 dígitos)" value={form.telefono} onChange={set("telefono")} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
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
  const { isMobile } = useBreakpoint();
  const load = useCallback(async () => { setLoading(true); try { setProductos(await http("/productos?activo=", {}, token)); } catch (e) { toast(e.message, "error"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const saveStock = async (productoId) => {
    const stock = parseInt(editing[productoId]);
    if (isNaN(stock) || stock < 0) return toast("Stock inválido", "error");
    setSaving(productoId);
    try { await http(`/inventario/${productoId}`, { method: "PATCH", body: JSON.stringify({ stock }) }, token); toast("Stock actualizado"); load(); setEditing(p => { const n = { ...p }; delete n[productoId]; return n; }); }
    catch (e) { toast(e.message, "error"); } finally { setSaving(null); }
  };
  return (
    <div className="fade-up">
      <PageHeader title="Inventario" subtitle="Controla el stock de productos" />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Producto</th>{!isMobile && <th>Categoría</th>}<th>Stock</th><th>Ajustar</th></tr></thead>
              <tbody>{productos.map(p => (
                <tr key={p.id}>
                  <td data-label="Producto" style={{ fontWeight: 600, color: "var(--gray-900)" }}>
                    {p.nombre}
                    {isMobile && <div><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.categoria_nombre}</span></div>}
                  </td>
                  {!isMobile && <td data-label="Categoría"><span className="badge badge-blue">{p.categoria_nombre}</span></td>}
                  <td data-label="Stock actual"><span className={`badge ${p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-amber" : "badge-red"}`}>{p.stock}</span></td>
                  <td data-label="Nuevo stock">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" min="0" placeholder={p.stock} value={editing[p.id] ?? ""} onChange={e => setEditing(prev => ({ ...prev, [p.id]: e.target.value }))} style={{ width: isMobile ? 80 : 100 }} />
                      {editing[p.id] !== undefined && <Btn size="sm" onClick={() => saveStock(p.id)} disabled={saving === p.id}><Icon name="check" size={14} /></Btn>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CLIENT: CATÁLOGO ─────────────────────────────────────────────────────────
const ClientCatalogo = ({ token, onCartOpen, cart, setCart }) => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([http("/productos", {}, token), http("/categorias", {}, token)]);
        setProductos(p); setCategorias(c);
      } catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const addToCart = (p) => {
    setCart(c => { const ex = c.find(i => i.id === p.id); if (ex) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i); return [...c, { ...p, qty: 1 }]; });
    toast(`${p.nombre} añadido`);
  };

  const filtered = productos.filter(p => (!catFilter || p.categoria_id == catFilter) && p.nombre.toLowerCase().includes(search.toLowerCase()));
  const cols = isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(230px, 1fr))";

  return (
    <div className="fade-up">
      <PageHeader title="Catálogo" subtitle={`${filtered.length} productos`} />

      {/* Filters */}
      <div style={{ background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: 12, padding: isMobile ? "12px" : "14px 16px", marginBottom: 16, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, boxShadow: "var(--shadow-sm)" }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ flex: 1, minWidth: isMobile ? 0 : 160, fontSize: 13 }}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <div style={{ display: "flex", gap: 3, background: "var(--gray-100)", borderRadius: 8, padding: 3 }}>
            {["grid", "list"].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: "6px 9px", border: "none", borderRadius: 6, cursor: "pointer", background: viewMode === v ? "var(--white)" : "transparent", color: viewMode === v ? "var(--red)" : "var(--gray-500)", boxShadow: viewMode === v ? "var(--shadow-sm)" : "none", transition: "all .15s" }}>
                <Icon name={v} size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
        {[{ id: "", nombre: "Todos" }, ...categorias].map(c => (
          <button key={c.id} onClick={() => setCatFilter(catFilter == c.id ? "" : String(c.id))}
            style={{ padding: "5px 12px", borderRadius: 99, border: `1.5px solid ${catFilter == c.id || (!catFilter && c.id === "") ? "var(--red)" : "var(--gray-200)"}`, background: catFilter == c.id || (!catFilter && c.id === "") ? "var(--red)" : "var(--white)", color: catFilter == c.id || (!catFilter && c.id === "") ? "#fff" : "var(--gray-600)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            {c.nombre}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon="search" title="Sin resultados" sub="Prueba otros filtros" /> : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? 10 : 16 }}>
          {filtered.map((p, i) => (
            <div key={p.id} className="product-card fade-up" style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
              <div style={{ height: isMobile ? 110 : 140, background: "linear-gradient(135deg, var(--red-pale) 0%, #fff5f5 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Icon name="package" size={isMobile ? 44 : 56} style={{ color: "var(--red)", opacity: .2 }} />
                {p.stock === 0 && <div style={{ position: "absolute", top: 8, right: 8 }}><span className="badge badge-red" style={{ fontSize: 10 }}>Agotado</span></div>}
                {p.stock > 0 && p.stock <= 5 && <div style={{ position: "absolute", top: 8, right: 8 }}><span className="badge badge-amber" style={{ fontSize: 10 }}>Últimas</span></div>}
              </div>
              <div style={{ padding: isMobile ? 10 : 14 }}>
                <span className="badge badge-blue" style={{ marginBottom: 6, fontSize: 10 }}>{p.categoria_nombre}</span>
                <h4 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "var(--gray-900)", marginBottom: 4, lineHeight: 1.3 }}>{p.nombre}</h4>
                {!isMobile && p.descripcion && <p style={{ fontSize: 11, color: "var(--gray-500)", lineHeight: 1.5, marginBottom: 8 }}>{p.descripcion.slice(0, 60)}{p.descripcion.length > 60 ? "..." : ""}</p>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: "var(--red)" }}>${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  <button className="btn-primary btn-sm" onClick={() => addToCart(p)} disabled={p.stock === 0} style={{ borderRadius: 7, padding: isMobile ? "6px 10px" : undefined }}>
                    <Icon name="plus" size={13} />{!isMobile && "Agregar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-100)" : "none", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--gray-50)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 44, height: 44, background: "var(--red-pale)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--red)" }}>
                <Icon name="package" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gray-900)" }}>{p.nombre}</div>
                <span className="badge badge-blue" style={{ fontSize: 10, marginTop: 2 }}>{p.categoria_nombre}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: "var(--red)" }}>${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                <button className="btn-primary btn-sm" onClick={() => addToCart(p)} disabled={p.stock === 0} style={{ borderRadius: 7 }}>
                  <Icon name="plus" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── CART MODAL ───────────────────────────────────────────────────────────────
const CartModal = ({ open, onClose, cart, setCart, token }) => {
  const [direcciones, setDirecciones] = useState([]);
  const [orderForm, setOrderForm] = useState({ direccion_id: "", metodo_pago: "tarjeta" });
  const [placing, setPlacing] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!open) return;
    http("/direcciones", {}, token).then(d => { setDirecciones(d); if (d.length) setOrderForm(f => ({ ...f, direccion_id: d[0].id })); }).catch(() => {});
  }, [open, token]);

  const updateQty = (id, qty) => { if (qty <= 0) setCart(c => c.filter(i => i.id !== id)); else setCart(c => c.map(i => i.id === id ? { ...i, qty } : i)); };
  const cartTotal = cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    if (!orderForm.direccion_id) return toast("Selecciona una dirección", "warn");
    setPlacing(true);
    try {
      await http("/pedidos", { method: "POST", body: JSON.stringify({ direccion_id: parseInt(orderForm.direccion_id), metodo_pago: orderForm.metodo_pago, items: cart.map(i => ({ producto_id: i.id, cantidad: i.qty })) }) }, token);
      toast("¡Pedido confirmado!"); setCart([]); onClose();
    } catch (e) { toast(e.message, "error"); }
    finally { setPlacing(false); }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: isMobile ? "100%" : 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ fontSize: 17, color: "var(--gray-900)" }}>Mi carrito</h3>
            {cartCount > 0 && <span className="badge badge-red-solid">{cartCount}</span>}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: "50%" }}><Icon name="x" size={18} /></button>
        </div>

        {cart.length === 0 ? (
          <EmptyState icon="cart" title="Carrito vacío" sub="Agrega productos para continuar"
            action={<Btn onClick={onClose} variant="secondary"><Icon name="arrowLeft" size={16} />Ver catálogo</Btn>}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {cart.map(i => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gray-50)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--gray-100)" }}>
                  <div style={{ width: 38, height: 38, background: "var(--red-pale)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", flexShrink: 0 }}><Icon name="package" size={17} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--gray-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--gray-500)" }}>${parseFloat(i.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })} c/u</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateQty(i.id, i.qty - 1)} style={{ width: 26, height: 26, border: "1.5px solid var(--gray-200)", borderRadius: 6, background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--gray-600)" }}>−</button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center", fontSize: 14 }}>{i.qty}</span>
                    <button onClick={() => updateQty(i.id, i.qty + 1)} style={{ width: 26, height: 26, border: "1.5px solid var(--gray-200)", borderRadius: 6, background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--gray-600)" }}>+</button>
                  </div>
                  <div style={{ minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: "var(--red)", fontSize: 14 }}>${(i.precio * i.qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                  </div>
                  <button onClick={() => setCart(c => c.filter(x => x.id !== i.id))} className="btn-ghost" style={{ padding: 5, color: "#dc2626", flexShrink: 0 }}><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--red-pale)", border: "1px solid #fecdd3", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "var(--gray-700)", fontSize: 14 }}>Total</span>
              <span style={{ fontWeight: 900, color: "var(--red)", fontSize: 20, letterSpacing: "-.02em" }}>${cartTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--red)" }}>MXN</span></span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <SelectField label="Dirección de entrega" value={orderForm.direccion_id} onChange={e => setOrderForm(f => ({ ...f, direccion_id: e.target.value }))}>
                {direcciones.length === 0 ? <option value="">Sin direcciones</option> : direcciones.map(d => <option key={d.id} value={d.id}>{d.linea1}, {d.ciudad}</option>)}
              </SelectField>
              <SelectField label="Método de pago" value={orderForm.metodo_pago} onChange={e => setOrderForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="contra_entrega">Contra entrega</option>
                <option value="plataforma">Plataforma</option>
              </SelectField>
            </div>

            {!direcciones.length && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 12px" }}>
                <Icon name="alert" size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#92400e" }}>Agrega una dirección en "Mis Direcciones" para continuar.</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} />Continuar</Btn>
              <Btn onClick={placeOrder} disabled={placing || !direcciones.length} style={{ flex: 2, justifyContent: "center" }}>
                {placing ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Procesando...</> : <><Icon name="check" size={16} />Confirmar pedido</>}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CLIENT: MIS PEDIDOS ──────────────────────────────────────────────────────
const ClientPedidos = ({ token }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => { (async () => { try { setPedidos(await http("/pedidos", {}, token)); } catch (e) { toast(e.message, "error"); } finally { setLoading(false); } })(); }, [token]);

  const openDetalle = async (id) => { setSelected(id); try { setDetalle(await http(`/pedidos/${id}`, {}, token)); } catch (e) { toast(e.message, "error"); } };

  const statusIcon = (s) => ({ pendiente: "refresh", en_proceso: "zap", enviado: "truck", entregado: "check", cancelado: "x" }[s] || "info");

  const DetallePanel = () => detalle && (
    <div className={isMobile ? "" : "card fade-in"} style={{ padding: isMobile ? 0 : 0, overflow: "hidden", ...(isMobile ? {} : { position: "sticky", top: 20 }) }}>
      <div style={{ background: "var(--red)", padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>PEDIDO</div><div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>#{selected}</div></div>
          <button onClick={() => { setSelected(null); setDetalle(null); }} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", cursor: "pointer", padding: 7, borderRadius: 8, display: "flex" }}><Icon name="x" size={15} /></button>
        </div>
        <div style={{ marginTop: 10 }}>{statusBadge(detalle.pedido?.estado)}</div>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "var(--white)" }}>
        <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 12, border: "1px solid var(--gray-100)" }}>
          <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Productos</div>
          {detalle.items?.map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
              <span style={{ color: "var(--gray-700)" }}>{i.producto_nombre} <span style={{ color: "var(--gray-400)" }}>×{i.cantidad}</span></span>
              <span style={{ fontWeight: 700 }}>${(i.precio_unitario * i.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14 }}>
            <span>Total</span><span style={{ color: "var(--red)" }}>${parseFloat(detalle.pedido?.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        {detalle.pago && (
          <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 10, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "var(--gray-700)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="creditCard" size={13} style={{ color: "var(--gray-400)" }} />{detalle.pago.metodo}</span>
            {statusBadge(detalle.pago.estado)}
          </div>
        )}
        {detalle.envio && (
          <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 10, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "var(--gray-700)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="truck" size={13} style={{ color: "var(--gray-400)" }} />{detalle.envio.transportista || "Pendiente"}</span>
            {statusBadge(detalle.envio.estado)}
          </div>
        )}
        <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 10, border: "1px solid var(--gray-100)", fontSize: 13, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Icon name="mapPin" size={14} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: "var(--gray-700)" }}>{detalle.pedido?.direccion_linea1}, {detalle.pedido?.direccion_ciudad}, {detalle.pedido?.direccion_estado} {detalle.pedido?.direccion_cp}</span>
        </div>
      </div>
    </div>
  );

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <PageHeader title="Mis Pedidos" subtitle="Seguimiento de tus compras" />
      {pedidos.length === 0 ? <EmptyState icon="shoppingBag" title="Sin pedidos" sub="¡Realiza tu primera compra desde el catálogo!" /> : isMobile ? (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pedidos.map((p, i) => (
              <div key={p.id} className="card fade-up" style={{ animationDelay: `${i * 0.04}s`, padding: 14, cursor: "pointer", border: selected === p.id ? "1.5px solid var(--red)" : "1px solid var(--gray-200)" }} onClick={() => openDetalle(p.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: "var(--red-pale)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", flexShrink: 0 }}><Icon name={statusIcon(p.estado)} size={19} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "var(--gray-900)" }}>Pedido #{p.id}</span>
                      {statusBadge(p.estado)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "var(--red)" }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {selected && detalle && (
            <Modal open={true} onClose={() => { setSelected(null); setDetalle(null); }} title={`Pedido #${selected}`}>
              <DetallePanel />
            </Modal>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pedidos.map((p, i) => (
              <div key={p.id} className="card fade-up" style={{ animationDelay: `${i * 0.04}s`, padding: 18, cursor: "pointer", transition: "all .2s", border: selected === p.id ? "1.5px solid var(--red)" : "1px solid var(--gray-200)", boxShadow: selected === p.id ? "var(--shadow-red)" : "var(--shadow-sm)" }} onClick={() => openDetalle(p.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: "var(--red-pale)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", flexShrink: 0 }}><Icon name={statusIcon(p.estado)} size={21} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "var(--gray-900)" }}>Pedido #{p.id}</span>
                      {statusBadge(p.estado)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 3 }}>{new Date(p.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "var(--red)" }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 11, color: "var(--gray-400)" }}>MXN</div>
                  </div>
                  <Icon name="chevronRight" size={16} style={{ color: "var(--gray-300)", flexShrink: 0 }} />
                </div>
              </div>
            ))}
          </div>
          {selected && detalle && <DetallePanel />}
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

  const load = useCallback(async () => { setLoading(true); try { setDirs(await http("/direcciones", {}, token)); } catch (e) { toast(e.message, "error"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const set = k => e => setForm(p => ({ ...p, [k]: e.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, es_principal: form.es_principal ? 1 : 0 };
      if (modal === "create") { await http("/direcciones", { method: "POST", body: JSON.stringify(body) }, token); toast("Dirección agregada"); }
      else { await http(`/direcciones/${modal.id}`, { method: "PUT", body: JSON.stringify(body) }, token); toast("Actualizada"); }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };

  const del = async (id) => { if (!confirm("¿Eliminar?")) return; try { await http(`/direcciones/${id}`, { method: "DELETE" }, token); toast("Eliminada"); load(); } catch (e) { toast(e.message, "error"); } };

  return (
    <div className="fade-up">
      <PageHeader title="Mis Direcciones" subtitle="Direcciones de entrega" actions={<Btn onClick={() => { setForm({ linea1: "", ciudad: "", estado: "", cp: "", pais: "México", es_principal: false }); setModal("create"); }}><Icon name="plus" size={16} />Nueva</Btn>} />
      {loading ? <Spinner /> : dirs.length === 0 ? (
        <EmptyState icon="mapPin" title="Sin direcciones" sub="Agrega una para poder comprar"
          action={<Btn onClick={() => { setForm({ linea1: "", ciudad: "", estado: "", cp: "", pais: "México", es_principal: false }); setModal("create"); }}><Icon name="plus" size={16} />Agregar</Btn>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {dirs.map((d, i) => (
            <div key={d.id} className="card fade-up" style={{ animationDelay: `${i * 0.05}s`, padding: 18, border: d.es_principal ? "1.5px solid var(--red)" : "1px solid var(--gray-200)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 38, height: 38, background: d.es_principal ? "var(--red)" : "var(--gray-100)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: d.es_principal ? "#fff" : "var(--gray-500)" }}><Icon name="mapPin" size={17} /></div>
                  {d.es_principal && <span className="badge badge-red-solid" style={{ fontSize: 10 }}>Principal</span>}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  <button className="btn-ghost" style={{ padding: 6 }} onClick={() => { setForm({ linea1: d.linea1, ciudad: d.ciudad, estado: d.estado, cp: d.cp, pais: d.pais, es_principal: !!d.es_principal }); setModal(d); }}><Icon name="edit" size={14} style={{ color: "var(--gray-400)" }} /></button>
                  <button className="btn-ghost" style={{ padding: 6 }} onClick={() => del(d.id)}><Icon name="trash" size={14} style={{ color: "#dc2626" }} /></button>
                </div>
              </div>
              <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: 14, marginBottom: 3 }}>{d.linea1}</div>
              <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{d.ciudad}, {d.estado} {d.cp}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 12, color: "var(--gray-400)" }}><Icon name="map" size={11} />{d.pais}</div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nueva Dirección" : "Editar Dirección"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Calle y número" value={form.linea1} onChange={set("linea1")} placeholder="Av. Reforma 123, Col. Centro" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputField label="Ciudad" value={form.ciudad} onChange={set("ciudad")} placeholder="Ciudad de México" />
            <InputField label="Estado" value={form.estado} onChange={set("estado")} placeholder="CDMX" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputField label="Código Postal" value={form.cp} onChange={set("cp")} placeholder="06600" maxLength={5} />
            <InputField label="País" value={form.pais} onChange={set("pais")} placeholder="México" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "var(--gray-700)", background: "var(--gray-50)", padding: "11px 13px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
            <input type="checkbox" checked={form.es_principal} onChange={set("es_principal")} style={{ width: 16, height: 16, accentColor: "var(--red)" }} />
            <span>Dirección principal</span>
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
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
      localStorage.setItem("user", JSON.stringify(updated)); onUpdate(updated); toast("Perfil actualizado");
    } catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  return (
    <div className="fade-up" style={{ maxWidth: 520 }}>
      <PageHeader title="Mi Perfil" subtitle="Tu información personal" />
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, var(--red) 0%, #9b111a 100%)", padding: "24px 24px 40px", position: "relative" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        </div>
        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -24, marginBottom: 14 }}>
            <div style={{ width: 56, height: 56, background: "var(--white)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "var(--red)", border: "3px solid var(--white)", boxShadow: "var(--shadow)", flexShrink: 0 }}>
              {user.nombre?.[0]?.toUpperCase()}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>{user.nombre}</h3>
              <span className={`badge ${user.rol === "admin" ? "badge-red" : "badge-gray"}`}>{user.rol === "admin" ? "Administrador" : "Cliente"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--gray-500)" }}><Icon name="mail" size={13} />{user.email}</div>
            {user.telefono && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--gray-500)" }}><Icon name="phone" size={13} />{user.telefono}</div>}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: "var(--gray-800)" }}>Editar información</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre completo" value={form.nombre} onChange={set("nombre")} />
          <InputField label="Correo electrónico" type="email" value={form.email} onChange={set("email")} />
          <InputField label="Teléfono (10 dígitos)" value={form.telefono} onChange={set("telefono")} placeholder="5512345678" />
          <Btn onClick={save} disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Guardando..." : <><Icon name="check" size={16} />Guardar cambios</>}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [page, setPage] = useState(() => { const u = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })(); return u?.rol === "admin" ? "dashboard" : "catalogo"; });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const isSmall = !isDesktop;

  useEffect(() => { injectStyles(); }, []);

  // Close sidebar on desktop
  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);

  const handleLogin = (u, t) => { setUser(u); setToken(t); setPage(u.rol === "admin" ? "dashboard" : "catalogo"); };
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); setToken(null); };

  if (!user || !token) return <><ToastContainer /><AuthScreen onLogin={handleLogin} /></>;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const isAdmin = user?.rol === "admin";

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <AdminDashboard token={token} />;
      case "productos": return <AdminProductos token={token} />;
      case "pedidos-admin": return <AdminPedidos token={token} />;
      case "usuarios": return <AdminUsuarios token={token} currentUser={user} />;
      case "categorias": return <AdminCategorias token={token} />;
      case "proveedores": return <AdminProveedores token={token} />;
      case "inventario": return <AdminInventario token={token} />;
      case "catalogo": return <ClientCatalogo token={token} onCartOpen={() => setCartOpen(true)} cart={cart} setCart={setCart} />;
      case "mis-pedidos": return <ClientPedidos token={token} />;
      case "mis-direcciones": return <ClientDirecciones token={token} />;
      case "mi-perfil": return <ClientPerfil token={token} user={user} onUpdate={u => setUser(u)} />;
      default: return <EmptyState icon="info" title="Página no encontrada" sub="" />;
    }
  };

  return (
    <>
      <ToastContainer />

      {/* Sidebar */}
      <Sidebar
        user={user} active={page} onNav={setPage} onLogout={handleLogout}
        isOpen={isDesktop || sidebarOpen} onClose={() => setSidebarOpen(false)}
        isMobile={isSmall}
      />

      {/* TopBar (mobile/tablet only) */}
      {isSmall && (
        <TopBar
          user={user} onMenuOpen={() => setSidebarOpen(true)}
          cartCount={cartCount} onCartOpen={() => setCartOpen(true)}
          page={page}
        />
      )}

      {/* Main content */}
      <main style={{
        marginLeft: isDesktop ? 248 : 0,
        paddingTop: isSmall ? "calc(var(--topbar-h) + 16px)" : 0,
        padding: isSmall ? `calc(var(--topbar-h) + 16px) 14px 80px` : "24px 28px",
        minHeight: "100vh",
        background: "var(--gray-50)",
      }}>
        {renderPage()}
      </main>

      {/* Cart FAB (mobile/tablet, client only) */}
      {isSmall && !isAdmin && cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          style={{ position: "fixed", bottom: 20, right: 16, zIndex: 180, background: "var(--red)", color: "#fff", border: "none", borderRadius: 16, padding: "13px 20px", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, boxShadow: "var(--shadow-red)", cursor: "pointer", animation: "fadeUp .3s ease" }}>
          <Icon name="cart" size={20} />
          {cartCount} {cartCount === 1 ? "producto" : "productos"} · ${cart.reduce((s, i) => s + i.precio * i.qty, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </button>
      )}

      {/* Cart Modal */}
      {!isAdmin && <CartModal open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} token={token} />}
    </>
  );
}

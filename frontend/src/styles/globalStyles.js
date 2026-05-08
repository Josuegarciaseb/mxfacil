export const injectStyles = () => {
  if (document.getElementById("app-global-styles")) return;
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

    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); z-index:9999; overflow-y:auto; padding:48px 16px 40px; animation:fadeIn .2s ease; }
    .modal { background:var(--white); border:1px solid var(--gray-200); border-radius:var(--radius-xl); padding:24px; width:100%; max-width:520px; margin:0 auto; box-shadow:var(--shadow-lg); animation:fadeUp .3s cubic-bezier(.22,1,.36,1); position:relative; }

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

    .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:199; }
    .sidebar-overlay.visible { display:block; animation:fadeIn .2s ease; }
    .table-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .page-header-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

    @media (max-width: 1023px) {
      :root { --sidebar-w: 0px; }
      .sidebar-desktop { transform: translateX(-100%); transition: transform .3s cubic-bezier(.22,1,.36,1); }
      .sidebar-desktop.open { transform: translateX(0); box-shadow: var(--shadow-lg); }
    }
    @media (max-width: 639px) {
      .modal-overlay { padding:24px 12px 32px; }
      .modal { padding:20px 16px 24px; }
      .form-grid { grid-template-columns: 1fr; gap: 10px; }
      table thead { display:none; }
      table tbody tr { display:block; border:1px solid var(--gray-200); border-radius:12px; margin-bottom:10px; background:var(--white); padding:12px; }
      table tbody td { display:block; border:none; padding:4px 0; font-size:13px; }
      table tbody td::before { content: attr(data-label); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--gray-400); display:block; margin-bottom:2px; }
      tbody tr:hover td { background:transparent; }
      .modal-footer { flex-direction: column-reverse !important; }
      .modal-footer button { width: 100%; justify-content: center; }
      .btn-ghost, .btn-sm { min-height: 36px; }
      .page-header { flex-direction: column !important; align-items: flex-start !important; }
    }
  `;
  const style = document.createElement("style");
  style.id = "app-global-styles";
  style.textContent = css;
  document.head.appendChild(style);
};

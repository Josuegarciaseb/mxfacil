import { useState, useRef, useEffect } from "react";
import Icon from "../ui/Icon";
import Logo from "../ui/Logo";

const NAV = [
  { id: "vendedor-dashboard", icon: "dashboard",   label: "Mi Panel"      },
  { id: "vendedor-productos", icon: "package",     label: "Mis Productos" },
  { id: "vendedor-pedidos",   icon: "shoppingBag", label: "Pedidos"       },
  { id: "vendedor-perfil",    icon: "user",        label: "Mi Perfil"     },
];

const BG          = "#173404";
const BG_ALT      = "#1e4205";
const BORDER      = "rgba(255,255,255,.07)";
const TEXT_MUTED  = "#89a880";
const TEXT_BRIGHT = "#e0edd5";
const ACCENT      = "#639922";

const VendorHeader = ({ user, page, onNav, onLogout, isSmall, isDesktop }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen,  setNavOpen]  = useState(false);
  const menuRef = useRef(null);
  const navRef  = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (navRef.current  && !navRef.current.contains(e.target))  setNavOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const currentLabel = NAV.find((n) => n.id === page)?.label ?? "Comercio Fácil";

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 150 }}>

      {/* ── Barra principal ── */}
      <div style={{
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        height: isSmall ? 58 : 68,
        display: "flex", alignItems: "center",
        padding: isSmall ? "0 12px" : "0 clamp(20px, 3vw, 48px)",
        gap: isSmall ? 10 : 16,
        boxShadow: "0 2px 16px rgba(0,0,0,.25)",
      }}>

        {/* Logo */}
        <button
          onClick={() => onNav("vendedor-dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "none", border: "none", cursor: "pointer",
            flexShrink: 0, padding: 0,
          }}
        >
          <Logo
            size={isSmall ? 34 : 40}
            showText={!isSmall}
            subtitle="Panel Vendedor"
          />
        </button>

        {/* Título de página en mobile */}
        {isSmall && (
          <span style={{
            flex: 1, fontWeight: 600, fontSize: 15, color: TEXT_BRIGHT,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontFamily: "'Sora',sans-serif",
          }}>
            {currentLabel}
          </span>
        )}

        {!isSmall && <div style={{ flex: 1 }} />}

        {/* Hamburger (mobile) */}
        {isSmall && (
          <div ref={navRef} style={{ position: "relative" }}>
            <button
              onClick={() => setNavOpen(!navOpen)}
              style={{
                background: navOpen ? `rgba(99,153,34,.18)` : "rgba(255,255,255,.07)",
                border: `1px solid ${navOpen ? `rgba(99,153,34,.4)` : BORDER}`,
                borderRadius: 9, padding: "7px 9px",
                cursor: "pointer", display: "flex", alignItems: "center",
                transition: "all .15s",
              }}
            >
              <Icon name="menu" size={19} style={{ color: TEXT_BRIGHT }} />
            </button>

            {navOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: BG_ALT, border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: 8, minWidth: 200,
                boxShadow: "0 12px 40px rgba(0,0,0,.4)", zIndex: 9999,
                animation: "fadeUp .2s ease",
              }}>
                {NAV.map(({ id, icon, label }) => {
                  const isActive = page === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { onNav(id); setNavOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 9,
                        padding: "10px 12px",
                        paddingLeft: isActive ? "9px" : "12px",
                        borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
                        border: "none", borderRadius: "0 9px 9px 0",
                        background: isActive ? `rgba(99,153,34,.18)` : "transparent",
                        color: isActive ? "#C0DD97" : TEXT_MUTED,
                        fontFamily: "'Sora',sans-serif", fontWeight: isActive ? 600 : 400, fontSize: 14,
                        cursor: "pointer", textAlign: "left", transition: "all .15s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = TEXT_BRIGHT; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT_MUTED; } }}
                    >
                      <Icon name={icon} size={15} style={{ color: isActive ? "#C0DD97" : "rgba(137,168,128,.65)" }} />
                      {label}
                    </button>
                  );
                })}
                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 6, paddingTop: 6 }}>
                  <button
                    onClick={() => { onLogout(); setNavOpen(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 9,
                      padding: "9px 12px", border: "none", borderRadius: 9,
                      background: "transparent", color: "rgba(137,168,128,.55)",
                      fontFamily: "'Sora',sans-serif", fontWeight: 400, fontSize: 14,
                      cursor: "pointer", textAlign: "left", transition: "all .15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,.12)"; e.currentTarget.style.color = "#fca5a5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(137,168,128,.55)"; }}
                  >
                    <Icon name="logout" size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Menú usuario (desktop) */}
        {!isSmall && (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: menuOpen ? `rgba(99,153,34,.18)` : "rgba(255,255,255,.07)",
                border: `1px solid ${menuOpen ? `rgba(99,153,34,.4)` : BORDER}`,
                borderRadius: 10, padding: "7px 14px",
                cursor: "pointer", transition: "all .15s",
                fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13,
              }}
              onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.background = "rgba(255,255,255,.11)"; }}
              onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.background = "rgba(255,255,255,.07)"; }}
            >
              <div style={{
                width: 26, height: 26,
                background: "linear-gradient(135deg,#1D4ED8,#1e3a5f)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                border: "2px solid rgba(255,255,255,.1)",
                fontFamily: "'Sora',sans-serif",
              }}>
                {user?.nombre?.[0]?.toUpperCase()}
              </div>
              <span style={{
                color: menuOpen ? "#C0DD97" : TEXT_BRIGHT,
                maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user?.nombre?.split(" ")[0]}
              </span>
              <Icon name="chevronRight" size={12} style={{
                color: TEXT_MUTED,
                transform: menuOpen ? "rotate(-90deg)" : "rotate(90deg)",
                transition: "transform .2s",
              }} />
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: BG_ALT, border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: 8, minWidth: 200,
                boxShadow: "0 12px 40px rgba(0,0,0,.4)", zIndex: 9999,
                animation: "fadeUp .2s ease",
              }}>
                <div style={{ padding: "8px 12px 10px", borderBottom: `1px solid ${BORDER}`, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT, fontFamily: "'Sora',sans-serif" }}>{user?.nombre}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1, fontFamily: "'Sora',sans-serif" }}>{user?.email}</div>
                  <span style={{
                    display: "inline-flex", marginTop: 6,
                    fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                    background: "rgba(29,78,216,.3)", color: "#93C5FD",
                    padding: "2px 8px", borderRadius: 99,
                    fontFamily: "'Sora',sans-serif",
                  }}>
                    Vendedor
                  </span>
                </div>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 6 }}>
                  <button
                    onClick={() => { onLogout(); setMenuOpen(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 9,
                      padding: "9px 12px", border: "none", borderRadius: 9,
                      background: "transparent", color: "rgba(137,168,128,.55)",
                      fontFamily: "'Sora',sans-serif", fontWeight: 400, fontSize: 14,
                      cursor: "pointer", textAlign: "left", transition: "all .15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,.12)"; e.currentTarget.style.color = "#fca5a5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(137,168,128,.55)"; }}
                  >
                    <Icon name="logout" size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Barra de navegación (desktop) ── */}
      {isDesktop && (
        <div style={{
          background: BG_ALT,
          borderBottom: `1px solid ${BORDER}`,
          height: 44,
          display: "flex", alignItems: "center",
          padding: "0 clamp(20px, 3vw, 48px)", gap: 0,
        }}>
          {NAV.map(({ id, icon, label }) => {
            const isActive = page === id;
            return (
              <button
                key={id}
                onClick={() => onNav(id)}
                style={{
                  padding: "0 20px", height: "100%", flexShrink: 0,
                  border: "none",
                  borderBottom: isActive ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
                  background: "transparent",
                  color: isActive ? "#C0DD97" : TEXT_MUTED,
                  fontFamily: "'Sora',sans-serif",
                  fontWeight: isActive ? 600 : 400, fontSize: 13,
                  cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 7,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = TEXT_BRIGHT; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = TEXT_MUTED; }}
              >
                <Icon name={icon} size={14} style={{ opacity: isActive ? 1 : .6 }} />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default VendorHeader;

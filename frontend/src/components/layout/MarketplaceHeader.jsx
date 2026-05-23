import { useState, useRef, useEffect } from "react";
import Icon from "../ui/Icon";
import Logo from "../ui/Logo";

const NAV_ITEMS = [
  { icon: "shoppingBag", label: "Mis Pedidos",     id: "mis-pedidos"     },
  { icon: "mapPin",      label: "Mis Direcciones", id: "mis-direcciones" },
  { icon: "user",        label: "Mi Perfil",       id: "mi-perfil"       },
];

const BG          = "#173404";
const BG_ALT      = "#1e4205";
const BORDER      = "rgba(255,255,255,.07)";
const TEXT_MUTED  = "#89a880";
const TEXT_BRIGHT = "#e0edd5";
const ACCENT      = "#639922";

const MarketplaceHeader = ({
  user, page, onNav, onLogout, onLoginClick,
  cartCount, onCartOpen,
  categorias, search, onSearch,
  catFilter, onCatFilter,
  isSmall, isDesktop,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isGuest = !user;

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 150 }}>

      {/* ── Barra principal ── */}
      <div style={{
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        height: isSmall ? 58 : 68,
        display: "flex", alignItems: "center",
        padding: isSmall ? "0 12px" : "0 clamp(20px, 3vw, 48px)",
        gap: isSmall ? 10 : "clamp(12px, 1.5vw, 24px)",
        boxShadow: "0 2px 16px rgba(0,0,0,.25)",
      }}>

        {/* Logo */}
        <button
          onClick={() => onNav("catalogo")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "none", border: "none", cursor: "pointer",
            flexShrink: 0, padding: 0,
          }}
        >
          <Logo
            size={isSmall ? 34 : 40}
            showText={!isSmall}
            subtitle="Mayoreo · México"
          />
        </button>

        {/* Buscador */}
        <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
          <div style={{ position: "relative", flex: 1, display: "flex" }}>
            <Icon name="search" size={15} style={{
              position: "absolute", left: 13, top: "50%",
              transform: "translateY(-50%)",
              color: TEXT_MUTED, pointerEvents: "none", zIndex: 1,
            }} />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={isSmall ? "Buscar productos..." : "Buscar productos al mayoreo..."}
              style={{
                flex: 1,
                height: isSmall ? 38 : 42,
                paddingLeft: 40,
                paddingRight: isSmall ? 12 : 0,
                borderRadius: isSmall ? 9 : "9px 0 0 9px",
                border: "1.5px solid rgba(255,255,255,.1)",
                borderRight: isSmall ? "1.5px solid rgba(255,255,255,.1)" : "none",
                background: "rgba(255,255,255,.07)",
                color: TEXT_BRIGHT,
                fontSize: 14, fontFamily: "'Sora',sans-serif",
                outline: "none", transition: "all .2s", width: "100%",
              }}
              onFocus={(e) => {
                e.target.style.background = "rgba(255,255,255,.11)";
                e.target.style.borderColor = `rgba(99,153,34,.6)`;
              }}
              onBlur={(e) => {
                e.target.style.background = "rgba(255,255,255,.07)";
                e.target.style.borderColor = "rgba(255,255,255,.1)";
              }}
            />
            {!isSmall && (
              <button style={{
                height: 42, padding: "0 22px", flexShrink: 0,
                background: ACCENT,
                color: "#fff", border: "none",
                borderRadius: "0 9px 9px 0",
                fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                boxShadow: `0 2px 8px rgba(99,153,34,.25)`,
                transition: "filter .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <Icon name="search" size={15} />
                Buscar
              </button>
            )}
          </div>
        </div>

        {/* Carrito */}
        <button
          onClick={onCartOpen}
          style={{
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 7,
            background: cartCount > 0
              ? "linear-gradient(135deg,var(--gold-light),var(--gold))"
              : "rgba(255,255,255,.07)",
            border: `1px solid ${cartCount > 0 ? "transparent" : BORDER}`,
            borderRadius: 10,
            padding: isSmall ? "7px 11px" : "9px 18px",
            cursor: "pointer",
            color: cartCount > 0 ? "#fff" : TEXT_MUTED,
            fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14,
            transition: "all .2s",
            boxShadow: cartCount > 0 ? "var(--shadow-gold)" : "none",
          }}
          onMouseEnter={(e) => {
            if (!cartCount) e.currentTarget.style.background = "rgba(255,255,255,.11)";
          }}
          onMouseLeave={(e) => {
            if (!cartCount) e.currentTarget.style.background = "rgba(255,255,255,.07)";
          }}
        >
          <Icon name="cart" size={isSmall ? 18 : 19} />
          {!isSmall && <span>Carrito</span>}
          {cartCount > 0 && (
            <span style={{
              background: "rgba(255,255,255,.28)",
              borderRadius: 99, padding: "1px 8px",
              fontSize: 12, fontWeight: 700,
            }}>
              {cartCount}
            </span>
          )}
        </button>

        {/* ── Menú de usuario (autenticado) ── */}
        {!isGuest && (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: menuOpen ? `rgba(99,153,34,.18)` : "rgba(255,255,255,.07)",
                border: `1px solid ${menuOpen ? `rgba(99,153,34,.4)` : BORDER}`,
                borderRadius: 10,
                padding: isSmall ? "6px 10px" : "7px 14px",
                cursor: "pointer", transition: "all .15s",
                fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13,
              }}
              onMouseEnter={(e) => {
                if (!menuOpen) e.currentTarget.style.background = "rgba(255,255,255,.11)";
              }}
              onMouseLeave={(e) => {
                if (!menuOpen) e.currentTarget.style.background = "rgba(255,255,255,.07)";
              }}
            >
              <div style={{
                width: 26, height: 26,
                background: `linear-gradient(135deg,${ACCENT},#27500A)`,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                border: "2px solid rgba(255,255,255,.1)",
                fontFamily: "'Sora',sans-serif",
              }}>
                {user?.nombre?.[0]?.toUpperCase()}
              </div>
              {!isSmall && (
                <span style={{
                  color: TEXT_BRIGHT,
                  maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.nombre?.split(" ")[0]}
                </span>
              )}
              <Icon
                name="chevronRight"
                size={12}
                style={{
                  color: TEXT_MUTED,
                  transform: menuOpen ? "rotate(-90deg)" : "rotate(90deg)",
                  transition: "transform .2s",
                }}
              />
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#1e4205",
                border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: 8, minWidth: 210,
                boxShadow: "0 12px 40px rgba(0,0,0,.4)",
                zIndex: 9999,
                animation: "fadeUp .2s ease",
              }}>
                {/* Info usuario */}
                <div style={{
                  padding: "8px 12px 10px",
                  borderBottom: `1px solid ${BORDER}`,
                  marginBottom: 6,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT, fontFamily: "'Sora',sans-serif" }}>{user?.nombre}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1, fontFamily: "'Sora',sans-serif" }}>{user?.email}</div>
                  <span style={{
                    display: "inline-flex", marginTop: 6,
                    fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                    background: `rgba(99,153,34,.3)`, color: "#C0DD97",
                    padding: "2px 8px", borderRadius: 99,
                    fontFamily: "'Sora',sans-serif",
                  }}>
                    Cliente Mayorista
                  </span>
                </div>

                {NAV_ITEMS.map(({ icon, label, id }) => {
                  const isActive = page === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { onNav(id); setMenuOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 9,
                        padding: "9px 12px", border: "none", borderRadius: 9,
                        paddingLeft: isActive ? "9px" : "12px",
                        borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
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

        {/* ── Botón de login para invitados ── */}
        {isGuest && (
          <button
            onClick={onLoginClick}
            style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 7,
              background: ACCENT,
              border: "none",
              borderRadius: 10,
              padding: isSmall ? "8px 14px" : "9px 20px",
              cursor: "pointer",
              color: "#fff",
              fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14,
              boxShadow: "0 2px 10px rgba(99,153,34,.35)",
              transition: "filter .15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            <Icon name="user" size={15} />
            {isSmall ? "Entrar" : "Iniciar sesión"}
          </button>
        )}
      </div>

      {/* ── Barra de categorías (desktop) ── */}
      {isDesktop && (
        <div style={{
          background: BG_ALT,
          borderBottom: `1px solid ${BORDER}`,
          height: 44,
          display: "flex", alignItems: "center",
          padding: "0 clamp(20px, 3vw, 48px)", gap: 0,
          overflowX: "auto",
        }}>
          {[{ id: "", nombre: "Todos" }, ...categorias].map((c) => {
            const isActive = catFilter == c.id || (!catFilter && c.id === "");
            return (
              <button
                key={c.id}
                onClick={() => {
                  onCatFilter(isActive && c.id !== "" ? "" : String(c.id));
                  onNav("catalogo");
                }}
                style={{
                  padding: "0 18px", height: "100%", flexShrink: 0,
                  border: "none",
                  borderBottom: isActive ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
                  background: "transparent",
                  color: isActive ? "#C0DD97" : TEXT_MUTED,
                  fontFamily: "'Sora',sans-serif",
                  fontWeight: isActive ? 600 : 400, fontSize: 13,
                  cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = TEXT_BRIGHT; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = TEXT_MUTED; }}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default MarketplaceHeader;

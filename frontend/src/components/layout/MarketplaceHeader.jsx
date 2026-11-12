import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import Logo from "../ui/Logo";

const accountLinks = [
  { id: "mis-pedidos", icon: "shoppingBag", label: "Mis pedidos" },
  { id: "mi-perfil", icon: "user", label: "Mi perfil" },
];

export default function MarketplaceHeader({
  user, page, onNav, onLogout, onLoginClick, cartCount, onCartOpen, search, onSearch, isSmall,
  deliveryAddress, onChooseAddress,
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const account = useRef(null);
  const accountButton = useRef(null);
  const firstName = user?.nombre?.trim().split(/\s+/)[0];

  useEffect(() => {
    if (!accountOpen) return;
    const closeOutside = (event) => {
      if (!account.current?.contains(event.target)) setAccountOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  return (
    <header className="market-header">
      <div className="market-header-inner">
        <button className="market-brand" aria-label="Comercio Fácil, ir al catálogo" onClick={() => onNav("catalogo")}>
          <Logo size={46} textColor="#fff" subtitleColor="#e4efd9" subtitle="Mayoreo · México" />
        </button>

        <button type="button" className="market-destination" onClick={onChooseAddress} aria-haspopup={user ? "dialog" : undefined}>
          <Icon name="mapPin" size={19} />
          <span className="market-destination-copy">
            <small>{firstName ? `Enviar a ${firstName}` : "Enviar a"}</small>{" "}
            <strong>{deliveryAddress ? `CP ${deliveryAddress.cp}` : "Elegir dirección"}</strong>
          </span>
          <Icon name="chevronRight" size={13} />
        </button>

        <form className="market-search" role="search" onSubmit={(event) => { event.preventDefault(); onNav("catalogo"); }}>
          <button aria-label="Buscar en el catálogo" type="submit"><Icon name="search" size={19} /></button>
          <input type="search" aria-label="Buscar productos"
            placeholder={isSmall ? "Buscar productos al mayoreo…" : "Buscar productos al mayoreo (ej. jitomate, arroz, semillas…)"}
            value={search} onChange={(event) => onSearch(event.target.value)} />
        </form>

        <div className="market-header-actions">
          {user ? (
            <div className="market-account" ref={account}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false); }}>
              <button ref={accountButton} className="market-action" aria-label="Menú de cuenta"
                aria-expanded={accountOpen} aria-controls="market-account-panel" onClick={() => setAccountOpen(!accountOpen)}>
                <Icon name="user" size={19} /><span>{firstName || "Mi cuenta"}</span>
                <Icon name="chevronDown" size={14} />
              </button>
              {accountOpen && (
                <nav className="market-account-panel" id="market-account-panel" aria-label="Mi cuenta">
                  <div className="market-account-info"><strong>{user.nombre}</strong><small>{user.email}</small></div>
                  {accountLinks.map(({ id, icon, label }) => (
                    <button key={id} aria-current={page === id ? "page" : undefined}
                      onClick={() => { setAccountOpen(false); onNav(id); }}>
                      <Icon name={icon} size={16} />{label}
                    </button>
                  ))}
                  <button onClick={() => { setAccountOpen(false); onLogout(); }}><Icon name="logout" size={16} />Cerrar sesión</button>
                </nav>
              )}
            </div>
          ) : (
            <button className="market-action" aria-label="Iniciar sesión" onClick={onLoginClick}>
              <Icon name="user" size={19} /><span>Iniciar sesión</span>
            </button>
          )}
          <button className="market-action market-cart" onClick={onCartOpen}
            aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}`}>
            <Icon name="cart" size={19} /><span>Carrito</span>
            <b className="market-cart-count">{cartCount}</b>
          </button>
        </div>
      </div>
    </header>
  );
}

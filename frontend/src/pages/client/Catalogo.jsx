import { useState, useEffect } from "react";
import { http } from "../../utils/api";
import { publicPrice, gross, money } from '../../utils/cart';
import { imageUrl } from '../../utils/config';
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";

const ClientCatalogo = ({
  token, setCart, cart = [], onProductsFetched,
  externalSearch, externalCatFilter, onCatFilter,
  onCategoriasFetched,
}) => {
  const [productos,  setProductos]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [viewMode,   setViewMode]   = useState("grid");
  const [sortOrder,  setSortOrder]  = useState("relevantes");

  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [localCatFilter, setLocalCatFilter] = useState("");

  const hasExternal = externalSearch !== undefined;
  const search      = hasExternal ? externalSearch.trim() : '';
  const catFilter   = hasExternal ? externalCatFilter : localCatFilter;
  const setFilter   = hasExternal ? onCatFilter       : setLocalCatFilter;

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [p, c] = await Promise.all([
          http("/productos", {}, token),
          http("/categorias", {}, token),
        ]);
        if (!live) return;
        setProductos(p); setCategorias(c); setLoadError(''); onProductsFetched?.(p);
        if (onCategoriasFetched) onCategoriasFetched(c);
      } catch (e) { if (live) setLoadError(e.message); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [token,onCategoriasFetched,onProductsFetched,attempt]);

  const addToCart = (p) => {
    const precioPublico = publicPrice(p.precio);
    if ((cart.find(i=>i.id===p.id)?.qty || 0) >= p.stock) return toast('Alcanzaste las existencias disponibles','warn');
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return c.map((i) => i.id === p.id ? { ...i, qty: Math.min(i.qty + 1,p.stock) } : i);
      return [...c, { ...p, precio: precioPublico, qty: 1 }];
    });
    toast(`${p.nombre} agregado al carrito`);
  };

  const filtered = productos
    .filter(
      (p) =>
        (!catFilter || p.categoria_id == catFilter) &&
        p.nombre.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "menor") return parseFloat(a.precio) - parseFloat(b.precio);
      if (sortOrder === "mayor") return parseFloat(b.precio) - parseFloat(a.precio);
      return 0;
    });

  const cols = isMobile
    ? "repeat(2, minmax(0, 1fr))"
    : isTablet
    ? "repeat(3, 1fr)"
    : "repeat(auto-fill, minmax(240px, 1fr))";

  return (
    <div className="fade-up">

      {/* ── Cabecera ── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 18, flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h1 style={{
            fontSize: isMobile ? 20 : 22, fontWeight: 900,
            color: "var(--gray-900)", letterSpacing: "-.02em", marginBottom: 2,
          }}>
            {catFilter
              ? (categorias.find((c) => c.id == catFilter)?.nombre ?? "Catálogo")
              : "Productos del campo al mayoreo"}
          </h1>
          <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
            {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            {search ? ` para "${search}"` : ""}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!isMobile && (
            <select
                aria-label="Ordenar productos"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
              fontSize: 13, padding: "7px 12px", borderRadius: 9,
              border: "1.5px solid var(--gray-200)", color: "var(--gray-700)",
              fontFamily: "'Sora',sans-serif", fontWeight: 500,
              background: "#fff", cursor: "pointer",
            }}>
              <option value="relevantes">Más relevantes</option>
              <option value="menor">Menor precio</option>
              <option value="mayor">Mayor precio</option>
            </select>
          )}
          <div style={{
            display: "flex", gap: 3, background: "#fff",
            borderRadius: 9, padding: 3,
            border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)",
          }}>
            {["grid", "list"].map((v) => (
              <button
                key={v}
                aria-label={v === 'grid' ? 'Vista de cuadrícula' : 'Vista de lista'}
                aria-pressed={viewMode === v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: "6px 9px", border: "none", borderRadius: 7, cursor: "pointer",
                  background: viewMode === v ? "var(--red)" : "transparent",
                  color: viewMode === v ? "#fff" : "var(--gray-400)",
                  transition: "all .15s",
                }}
              >
                <Icon name={v} size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chips de categoría — solo en mobile/tablet (desktop los tiene en el header) ── */}
      {!isDesktop && (
        <div style={{
          display: "flex", gap: 7, marginBottom: 16,
          overflowX: "auto", paddingBottom: 4, flexShrink: 0,
        }}>
          {[{ id: "", nombre: "Todos" }, ...categorias].map((c) => {
            const active = catFilter == c.id || (!catFilter && c.id === "");
            return (
              <button
                key={c.id}
                aria-pressed={active}
                onClick={() => setFilter(active && c.id !== "" ? "" : String(c.id))}
                style={{
                  padding: "5px 14px", borderRadius: 99, cursor: "pointer",
                  border: `1.5px solid ${active ? "var(--red)" : "var(--gray-200)"}`,
                  background: active
                    ? "linear-gradient(135deg,var(--red-light),var(--red))"
                    : "#fff",
                  color: active ? "#fff" : "var(--gray-600)",
                  fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  fontFamily: "'Sora',sans-serif", transition: "all .15s",
                  boxShadow: active ? "0 2px 8px rgba(200,32,42,.2)" : "none",
                  flexShrink: 0,
                }}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Resultados ── */}
      {loading ? <Spinner /> : loadError ? <div role="alert">No se pudo cargar el catálogo. <button className="btn-secondary" onClick={()=>{setLoading(true);setAttempt(n=>n+1);}}>Reintentar</button></div> : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Sin resultados"
          sub={search ? `No encontramos "${search}"` : "Prueba con otros filtros"}
        />
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? 10 : 16 }}>
          {filtered.map((p, i) => (
            <ProductCard key={p.id} p={p} i={i} isMobile={isMobile} onAdd={addToCart} atLimit={(cart.find(i=>i.id===p.id)?.qty||0)>=p.stock} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-100)" : "none",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-50)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{
                width: 52, height: 52, flexShrink: 0,
                background: "linear-gradient(135deg,var(--red-pale),#fff5f5)",
                borderRadius: 11,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--red-soft)",
              }}>
                <Icon name="package" size={24} style={{ color: "var(--red)", opacity: .5 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gray-900)", marginBottom: 3 }}>
                  {p.nombre}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.categoria_nombre}</span>
                  {p.presentacion && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: "var(--gray-100)", color: "var(--gray-500)" }}>
                      {p.presentacion}
                    </span>
                  )}
                  {p.stock === 0 && <span className="badge badge-red" style={{ fontSize: 10 }}>Agotado</span>}
                  {p.stock > 0 && p.stock <= 5 && <span className="badge badge-amber" style={{ fontSize: 10 }}>Últimas unidades</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--gray-400)", display: "flex", alignItems: "center", gap: 3 }}>
                  <Icon name="store" size={10} />
                  {p.proveedor_nombre}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "var(--red)", letterSpacing: "-.02em" }}>
                    ${money(gross(publicPrice(p.precio)))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 600 }}>IVA incluido</div>
                </div>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => addToCart(p)}
                  aria-label={`Agregar ${p.nombre}`} disabled={(cart.find(i=>i.id===p.id)?.qty||0)>=p.stock}
                  style={{ borderRadius: 8 }}
                >
                  <Icon name="plus" size={13} />
                  {!isMobile && "Agregar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ p, i, isMobile, onAdd, atLimit }) => {
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = p.image_url && !imgErr
    ? imageUrl(p.image_url)
    : null;

  return (
  <div
    className="product-card fade-up"
    style={{ animationDelay: Math.min(i * 0.04, 0.32) + "s" }}
  >
    <div style={{
      height: isMobile ? 120 : 148,
      background: "linear-gradient(145deg,#FFF1F2 0%,#FEF2F2 60%,#FFF5F5 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", borderBottom: "1px solid var(--gray-100)",
      overflow: "hidden",
    }}>
      {imgSrc ? (
        <img
          src={imgSrc}
          loading={i < 4 ? 'eager' : 'lazy'} decoding="async"
          alt={p.nombre}
          onError={() => setImgErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Icon name="package" size={isMobile ? 48 : 60} style={{ color: "var(--red)", opacity: .18 }} />
      )}
      {p.stock === 0 && (
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span className="badge badge-red" style={{ fontSize: 10 }}>Agotado</span>
        </div>
      )}
      {p.stock > 0 && p.stock <= 5 && (
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span className="badge badge-amber" style={{ fontSize: 10 }}>Últimas</span>
        </div>
      )}
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <span className="badge badge-gold" style={{ fontSize: 9, padding: "2px 7px" }}>MAYOREO</span>
      </div>
    </div>

    <div style={{ padding: isMobile ? "10px 12px 12px" : "12px 14px 14px" }}>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
        <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.categoria_nombre}</span>
        {p.presentacion && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: "var(--gray-100)", color: "var(--gray-500)" }}>
            {p.presentacion}
          </span>
        )}
      </div>
      <h4 style={{
        fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "var(--gray-900)",
        marginBottom: 4, lineHeight: 1.35,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {p.nombre}
      </h4>
      {!isMobile && p.descripcion && (
        <p style={{
          fontSize: 11, color: "var(--gray-500)", lineHeight: 1.5, marginBottom: 6,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {p.descripcion}
        </p>
      )}
      <div style={{ fontSize: 10, color: "var(--gray-400)", marginBottom: isMobile ? 6 : 8, display: "flex", alignItems: "center", gap: 3 }}>
        <Icon name="store" size={10} />
        {p.proveedor_nombre}
      </div>
      <div style={{ marginTop: isMobile ? 6 : 8 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
          <div>
            <div style={{
              fontSize: isMobile ? 18 : 21, fontWeight: 900, color: "var(--red)",
              letterSpacing: "-.03em", lineHeight: 1,
            }}>
              ${money(gross(publicPrice(p.precio)))}
            </div>
            <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 600, marginTop: 2 }}>
              IVA incluido
            </div>
          </div>
          <button
            className="btn-primary btn-sm"
            onClick={() => onAdd(p)}
            aria-label={`Agregar ${p.nombre}`} disabled={atLimit}
            style={{ borderRadius: 8, flexShrink: 0, gap: 5, padding: isMobile ? "7px 10px" : undefined }}
          >
            <Icon name="plus" size={13} />
            {!isMobile && "Agregar"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default ClientCatalogo;

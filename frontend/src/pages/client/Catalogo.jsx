import { useState, useEffect } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Icon from "../../components/ui/Icon";

const ClientCatalogo = ({ token, setCart }) => {
  const [productos,  setProductos]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("");
  const [viewMode,   setViewMode]   = useState("grid");
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
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1 }];
    });
    toast(`${p.nombre} anadido`);
  };

  const filtered = productos.filter(
    (p) => (!catFilter || p.categoria_id == catFilter) && p.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const cols = isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(230px, 1fr))";

  return (
    <div className="fade-up">
      <PageHeader title="Catalogo" subtitle={filtered.length + " productos"} />
      <div style={{ background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: 12, padding: isMobile ? "12px" : "14px 16px", marginBottom: 16, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, boxShadow: "var(--shadow-sm)" }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ flex: 1, minWidth: isMobile ? 0 : 160, fontSize: 13 }}>
            <option value="">Todas las categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <div style={{ display: "flex", gap: 3, background: "var(--gray-100)", borderRadius: 8, padding: 3 }}>
            {["grid", "list"].map((v) => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: "6px 9px", border: "none", borderRadius: 6, cursor: "pointer", background: viewMode === v ? "var(--white)" : "transparent", color: viewMode === v ? "var(--red)" : "var(--gray-500)", boxShadow: viewMode === v ? "var(--shadow-sm)" : "none", transition: "all .15s" }}>
                <Icon name={v} size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
        {[{ id: "", nombre: "Todos" }, ...categorias].map((c) => {
          const isActive = catFilter == c.id || (!catFilter && c.id === "");
          return (
            <button key={c.id} onClick={() => setCatFilter(catFilter == c.id ? "" : String(c.id))} style={{ padding: "5px 12px", borderRadius: 99, border: "1.5px solid " + (isActive ? "var(--red)" : "var(--gray-200)"), background: isActive ? "var(--red)" : "var(--white)", color: isActive ? "#fff" : "var(--gray-600)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
              {c.nombre}
            </button>
          );
        })}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon="search" title="Sin resultados" sub="Prueba otros filtros" />
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? 10 : 16 }}>
          {filtered.map((p, i) => (
            <div key={p.id} className="product-card fade-up" style={{ animationDelay: Math.min(i * 0.04, 0.3) + "s" }}>
              <div style={{ height: isMobile ? 110 : 140, background: "linear-gradient(135deg, var(--red-pale) 0%, #fff5f5 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Icon name="package" size={isMobile ? 44 : 56} style={{ color: "var(--red)", opacity: .2 }} />
                {p.stock === 0 && <div style={{ position: "absolute", top: 8, right: 8 }}><span className="badge badge-red" style={{ fontSize: 10 }}>Agotado</span></div>}
                {p.stock > 0 && p.stock <= 5 && <div style={{ position: "absolute", top: 8, right: 8 }}><span className="badge badge-amber" style={{ fontSize: 10 }}>Ultimas</span></div>}
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
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-50)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
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

export default ClientCatalogo;

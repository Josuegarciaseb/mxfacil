import { useState, useEffect } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { STATUS_ICONS } from "../../constants";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";
import Icon from "../../components/ui/Icon";

const DetalleContent = ({ detalle }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 12, border: "1px solid var(--gray-100)" }}>
      <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Productos</div>
      {detalle.items?.map((i) => (
        <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
          <div>
            <span style={{ color: "var(--gray-700)" }}>{i.producto_nombre} <span style={{ color: "var(--gray-400)" }}>x{i.cantidad}</span></span>
            {i.proveedor_nombre && (
              <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>{i.proveedor_nombre}</div>
            )}
          </div>
          <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>${(i.precio_unitario * i.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14 }}>
        <span>Total</span>
        <span style={{ color: "var(--red)" }}>${parseFloat(detalle.pedido?.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
    {detalle.pago && (
      <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 10, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "var(--gray-700)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="creditCard" size={13} style={{ color: "var(--gray-400)" }} />{detalle.pago.metodo}
        </span>
        <StatusBadge estado={detalle.pago.estado} />
      </div>
    )}
    {detalle.envio && (
      <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 10, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "var(--gray-700)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="truck" size={13} style={{ color: "var(--gray-400)" }} />{detalle.envio.transportista || "Pendiente"}
        </span>
        <StatusBadge estado={detalle.envio.estado} />
      </div>
    )}
    <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: 10, border: "1px solid var(--gray-100)", fontSize: 13, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <Icon name="mapPin" size={14} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
      <span style={{ color: "var(--gray-700)" }}>{detalle.pedido?.direccion_linea1}, {detalle.pedido?.direccion_ciudad}, {detalle.pedido?.direccion_estado} {detalle.pedido?.direccion_cp}</span>
    </div>
  </div>
);

const ClientPedidos = ({ token }) => {
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [detalle,  setDetalle]  = useState(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try { setPedidos(await http("/pedidos", {}, token)); }
      catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const openDetalle = async (id) => {
    setSelected(id);
    try { setDetalle(await http("/pedidos/" + id, {}, token)); }
    catch (e) { toast(e.message, "error"); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <PageHeader title="Mis Pedidos" subtitle="Seguimiento de tus compras" />

      {pedidos.length === 0 ? (
        <EmptyState icon="shoppingBag" title="Sin pedidos" sub="Realiza tu primera compra desde el catalogo" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected && !isMobile ? "1fr 340px" : "1fr", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pedidos.map((p, i) => (
              <div
                key={p.id}
                className="card fade-up"
                style={{ animationDelay: i * 0.04 + "s", padding: isMobile ? 14 : 18, cursor: "pointer", transition: "all .2s", border: selected === p.id ? "1.5px solid var(--red)" : "1px solid var(--gray-200)", boxShadow: selected === p.id ? "var(--shadow-red)" : "var(--shadow-sm)" }}
                onClick={() => openDetalle(p.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 14 }}>
                  <div style={{ width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, background: "var(--red-pale)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", flexShrink: 0 }}>
                    <Icon name={STATUS_ICONS[p.estado] || "info"} size={isMobile ? 19 : 21} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, color: "var(--gray-900)" }}>Pedido #{p.id}</span>
                      <StatusBadge estado={p.estado} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 3 }}>{new Date(p.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? 16 : 18, color: "var(--red)" }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 11, color: "var(--gray-400)" }}>MXN</div>
                  </div>
                  {!isMobile && <Icon name="chevronRight" size={16} style={{ color: "var(--gray-300)", flexShrink: 0 }} />}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar detalle — desktop */}
          {selected && detalle && !isMobile && (
            <div className="card fade-in" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 20 }}>
              <div style={{ background: "var(--red)", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>PEDIDO</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>#{selected}</div>
                  </div>
                  <button onClick={() => { setSelected(null); setDetalle(null); }} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", cursor: "pointer", padding: 7, borderRadius: 8, display: "flex" }}>
                    <Icon name="x" size={15} />
                  </button>
                </div>
                <div style={{ marginTop: 10 }}><StatusBadge estado={detalle.pedido?.estado} /></div>
              </div>
              <div style={{ padding: 16 }}>
                <DetalleContent detalle={detalle} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle — mobile */}
      {isMobile && selected && detalle && (
        <Modal open={true} onClose={() => { setSelected(null); setDetalle(null); }} title={"Pedido #" + selected}>
          <DetalleContent detalle={detalle} />
        </Modal>
      )}
    </div>
  );
};

export default ClientPedidos;

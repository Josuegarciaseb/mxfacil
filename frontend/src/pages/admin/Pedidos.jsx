import { useState, useCallback, useEffect } from "react";
import { http }           from "../../utils/api";
import { toast }          from "../../utils/toast";
import { useBreakpoint }  from "../../hooks/useBreakpoint";
import { ORDER_STATES }   from "../../constants";
import Spinner            from "../../components/ui/Spinner";
import EmptyState         from "../../components/ui/EmptyState";
import PageHeader         from "../../components/ui/PageHeader";
import Modal              from "../../components/ui/Modal";
import StatusBadge        from "../../components/ui/StatusBadge";
import { SelectField }    from "../../components/ui/FormFields";
import Icon               from "../../components/ui/Icon";

const AdminPedidos = ({ token }) => {
  const [pedidos,        setPedidos]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState("");
  const [selected,       setSelected]       = useState(null);
  const [detalle,        setDetalle]        = useState(null);
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
    try { setDetalle(await http(`/pedidos/${id}`, {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoadingDetalle(false); }
  };

  const cambiarEstado = async (id, estado) => {
    try { await http(`/pedidos/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }, token); toast("Estado actualizado"); load(); if (selected === id) openDetalle(id); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <PageHeader
        title="Pedidos" subtitle={`${pedidos.length} pedidos`}
        actions={<select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ minWidth: isMobile ? 150 : 180, fontSize: 13 }}>{["", ...ORDER_STATES].map((e) => <option key={e} value={e}>{e || "Todos"}</option>)}</select>}
      />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : pedidos.length === 0 ? <EmptyState icon="cart" title="Sin pedidos" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th>{!isMobile && <th>Fecha</th>}<th></th></tr></thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Pedido"  style={{ fontWeight: 700, color: "var(--red)" }}>#{p.id}</td>
                    <td data-label="Cliente" style={{ fontWeight: 500 }}>{p.usuario_nombre}</td>
                    <td data-label="Total"   style={{ fontWeight: 700 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td data-label="Estado"><StatusBadge estado={p.estado} /></td>
                    {!isMobile && <td data-label="Fecha" style={{ color: "var(--gray-500)" }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>}
                    <td><button className="btn-ghost btn-sm" onClick={() => openDetalle(p.id)}><Icon name="eye" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!selected} onClose={() => { setSelected(null); setDetalle(null); }} title={`Pedido #${selected}`}>
        {loadingDetalle ? <Spinner size={28} /> : detalle ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SelectField label="Cambiar estado" value={detalle.pedido.estado} onChange={(e) => cambiarEstado(selected, e.target.value)}>
              {ORDER_STATES.map((e) => <option key={e} value={e}>{e}</option>)}
            </SelectField>
            <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 14, border: "1px solid var(--gray-100)" }}>
              <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Productos</div>
              {detalle.items.map((i) => (
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
                <StatusBadge estado={detalle.pago.estado} />
              </div>
            )}
            {detalle.envio && (
              <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 12, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--gray-700)" }}><Icon name="truck" size={14} style={{ marginRight: 6, color: "var(--gray-400)", verticalAlign: "middle" }} />{detalle.envio.transportista || "Sin asignar"}</span>
                <StatusBadge estado={detalle.envio.estado} />
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminPedidos;

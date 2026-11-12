import { useState, useCallback, useEffect } from "react";
import { http }           from "../../utils/api";
import { toast }          from "../../utils/toast";
import { useBreakpoint }  from "../../hooks/useBreakpoint";
import { ORDER_STATES } from "../../constants";
import Spinner            from "../../components/ui/Spinner";
import EmptyState         from "../../components/ui/EmptyState";
import PageHeader         from "../../components/ui/PageHeader";
import StatusBadge        from "../../components/ui/StatusBadge";
import Icon               from "../../components/ui/Icon";
import DetalleGestion from "../../components/vendedor/DetalleGestion";
import { money } from "../../utils/cart";
import SolicitudesCastores from "../../components/shipping/SolicitudesCastores";

const totalVisible = total => total == null ? "Sin desglose histórico" : "$" + money(total);

const AdminPedidos = ({ token, gestionarPagos = false }) => {
  const [pedidos,        setPedidos]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState("");
  const [selected,       setSelected]       = useState(null);
  const { isMobile } = useBreakpoint();

  const load = useCallback(() => http(filtroEstado ? `/pedidos/admin?estado=${filtroEstado}` : "/pedidos/admin", {}, token)
    .then(setPedidos)
    .catch(e => toast(e.message, "error"))
    .finally(() => setLoading(false)), [token, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fade-up">
      <PageHeader
        title="Pedidos" subtitle={`${pedidos.length} pedidos`}
        actions={<select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ minWidth: isMobile ? 150 : 180, fontSize: 13 }}>{["", ...ORDER_STATES].map((e) => <option key={e} value={e}>{e || "Todos"}</option>)}</select>}
      />
      <SolicitudesCastores token={token} />
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
                    <td data-label="Total"   style={{ fontWeight: 700 }}>{totalVisible(p.total)}</td>
                    <td data-label="Estado"><StatusBadge estado={p.estado} /></td>
                    {!isMobile && <td data-label="Fecha" style={{ color: "var(--gray-500)" }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>}
                    <td><button aria-label={`Ver pedido #${p.id}`} className="btn-ghost btn-sm" onClick={() => setSelected(p.id)}><Icon name="eye" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && <DetalleGestion key={selected} selected={selected} token={token} gestionarPagos={gestionarPagos} onChange={load} onClose={()=>setSelected(null)}/>}
    </div>
  );
};

export default AdminPedidos;

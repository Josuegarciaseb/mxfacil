import { useState, useEffect } from "react";
import { http }           from "../../utils/api";
import { toast }          from "../../utils/toast";
import { useBreakpoint }  from "../../hooks/useBreakpoint";
import Spinner            from "../../components/ui/Spinner";
import EmptyState         from "../../components/ui/EmptyState";
import PageHeader         from "../../components/ui/PageHeader";
import StatusBadge        from "../../components/ui/StatusBadge";
import Icon               from "../../components/ui/Icon";

const STAT_CARDS = [
  { key: "productos",   label: "Productos",   icon: "package",  bg: "var(--red-pale)", color: "var(--red)"  },
  { key: "pedidos",     label: "Pedidos",     icon: "cart",     bg: "#eff6ff",         color: "#2563eb"     },
  { key: "usuarios",    label: "Usuarios",    icon: "users",    bg: "#f0fdf4",         color: "#16a34a"     },
  { key: "proveedores", label: "Proveedores", icon: "truck",    bg: "#fffbeb",         color: "#d97706"     },
];

const AdminDashboard = ({ token }) => {
  const [stats,   setStats]   = useState({ productos: 0, pedidos: 0, usuarios: 0, proveedores: 0 });
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        const [prods, peds, users, provs] = await Promise.all([
          http("/productos?activo=1", {}, token),
          http("/pedidos/admin",      {}, token),
          http("/usuario",            {}, token),
          http("/proveedores",        {}, token),
        ]);
        setStats({ productos: prods.length, pedidos: peds.length, usuarios: users.length, proveedores: provs.length });
        setRecent(peds.slice(0, 5));
      } catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <PageHeader title="Panel de Control" />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 10 : 16, marginBottom: 24 }}>
        {STAT_CARDS.map(({ key, label, icon, bg, color }) => (
          <div key={key} className="card" style={{ padding: isMobile ? 14 : 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 12 }}>
              <Icon name={icon} size={19} />
            </div>
            <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 900, color: "var(--gray-900)", letterSpacing: "-.02em" }}>{stats[key]}</div>
            <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--gray-100)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pedidos recientes</h3>
        </div>
        {recent.length === 0 ? <EmptyState icon="cart" title="Sin pedidos" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th>{!isMobile && <th>Fecha</th>}</tr></thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Pedido"  style={{ fontWeight: 700, color: "var(--red)" }}>#{p.id}</td>
                    <td data-label="Cliente" style={{ fontWeight: 500 }}>{p.usuario_nombre}</td>
                    <td data-label="Total"   style={{ fontWeight: 700 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td data-label="Estado"><StatusBadge estado={p.estado} /></td>
                    {!isMobile && <td data-label="Fecha" style={{ color: "var(--gray-500)" }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

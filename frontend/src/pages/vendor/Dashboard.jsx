import { useState, useEffect } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import Icon from "../../components/ui/Icon";

const VendedorDashboard = ({ token, user }) => {
  const [stats,   setStats]   = useState({ productos: 0, pedidos: 0, ingresos: 0 });
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        const [prods, peds] = await Promise.all([
          http("/productos?activo=&proveedor_id=" + user.proveedor_id, {}, token),
          http("/pedidos/admin", {}, token),
        ]);
        const ingresos = peds.reduce((s, p) => s + parseFloat(p.total || 0), 0);
        setStats({ productos: prods.length, pedidos: peds.length, ingresos });
        setRecent(peds.slice(0, 5));
      } catch (e) { toast(e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [token, user.proveedor_id]);

  const statCards = [
    { label: "Productos", value: stats.productos,  icon: "package",     bg: "var(--red-pale)", color: "var(--red)" },
    { label: "Pedidos",   value: stats.pedidos,    icon: "shoppingBag", bg: "#eff6ff",         color: "#2563eb" },
    { label: "Ingresos",  value: "$" + stats.ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 }), icon: "zap", bg: "#f0fdf4", color: "#16a34a" },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <PageHeader title="Mi Panel" subtitle={"Bienvenido, " + user.nombre} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + (isMobile ? 1 : 3) + ", 1fr)", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon, bg, color }) => (
          <div key={label} className="card" style={{ padding: isMobile ? 14 : 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 12 }}>
              <Icon name={icon} size={19} />
            </div>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: "var(--gray-900)", letterSpacing: "-.02em" }}>{value}</div>
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
              <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: "var(--red)" }}>#{p.id}</td>
                    <td>{p.usuario_nombre}</td>
                    <td style={{ fontWeight: 700 }}>${parseFloat(p.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td><StatusBadge estado={p.estado} /></td>
                    <td style={{ color: "var(--gray-500)", fontSize: 13 }}>{new Date(p.fecha).toLocaleDateString("es-MX")}</td>
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

export default VendedorDashboard;

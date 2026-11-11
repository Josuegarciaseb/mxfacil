import { useState, useEffect } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import Icon from "../../components/ui/Icon";
import { money } from "../../utils/cart";

const amounts = [
  ["importe_proveedor", "Mercancía a precio base"],
  ["comision", "Comisión de plataforma"],
  ["iva", "IVA del pedido"],
  ["total", "Importe al cliente"],
];

function collectionGroup(order) {
  if (order.pago_estado === "reembolsado") return "Reembolsado";
  if (order.estado === "cancelado" && order.pago_estado === "aprobado") return "Cobro por devolver";
  if (order.estado === "cancelado" || order.pago_estado === "rechazado") return "Cancelado o rechazado";
  if (order.pago_estado === "aprobado") return "Cobrado";
  if (order.pago_estado === "pendiente") return "Por cobrar";
  return "Por conciliar";
}

function amountSummary(orders, field, group) {
  if (group === "Cobro por devolver" && field !== "total") {
    return field === "comision" ? "$0.00" : "—";
  }
  if (orders.some(order => order[field] == null)) return "Sin desglose";
  const cents = orders.reduce((sum, order) => sum + Math.round(Number(order[field]) * 100), 0);
  return "$" + money(cents / 100);
}

const VendedorDashboard = ({ token, user }) => {
  const [productos, setProductos] = useState(0);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        let provId = user.proveedor_id;
        if (!provId) {
          const prov = await http("/proveedores/me", {}, token);
          provId = prov.id;
        }
        const [prods, peds] = await Promise.all([
          http("/productos/gestion?proveedor_id=" + provId, {}, token),
          http("/pedidos/admin", {}, token),
        ]);
        setProductos(prods.length);
        setOrders(peds);
        setError("");
      } catch (e) { setError(e.message); toast(e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [token, user.proveedor_id]);

  const statCards = [
    { label: "Productos", value: productos, icon: "package", bg: "var(--red-pale)", color: "var(--red)" },
    { label: "Pedidos", value: orders.length, icon: "shoppingBag", bg: "#eff6ff", color: "#2563eb" },
  ];

  if (loading) return <Spinner />;
  if (error) return <p role="alert">No se pudo cargar el panel. {error}</p>;
  const groups = ["Por cobrar", "Cobrado", "Cancelado o rechazado", "Reembolsado"];
  if (orders.some(order => collectionGroup(order) === "Cobro por devolver")) groups.push("Cobro por devolver");
  if (orders.some(order => collectionGroup(order) === "Por conciliar")) groups.push("Por conciliar");
  const recent = orders.slice(0, 5);

  return (
    <div className="fade-up">
      <PageHeader title="Mi Panel" subtitle={"Bienvenido, " + user.nombre} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
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

      <section className="card" style={{ padding: 16, marginBottom: 24 }}>
        <h3>Cobros de tus productos</h3>
        <p>Importes en MXN. El cobro contra entrega figura como cobrado cuando se registra la recepción del dinero.</p>
        <div className="table-scroll">
          <table aria-label="Desglose por estado de cobro">
            <thead><tr><th>Estado de cobro</th><th>Folios</th>{amounts.map(([key,title]) => <th key={key}>{title}</th>)}</tr></thead>
            <tbody>{groups.map(group => {
              const subset = orders.filter(order => collectionGroup(order) === group);
              return <tr key={group}><th scope="row">{group}</th><td>{subset.length}</td>
                {amounts.map(([field]) => <td key={field}>{amountSummary(subset,field,group)}</td>)}</tr>;
            })}</tbody>
          </table>
        </div>
      </section>
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
                    <td style={{ fontWeight: 700 }}>{p.total == null ? "Sin desglose" : "$" + money(p.total)}</td>
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

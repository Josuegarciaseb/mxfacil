import { STATUS_BADGE_MAP, STATUS_LABELS } from "../../constants";

const StatusBadge = ({ estado }) => (
  <span className={`badge ${STATUS_BADGE_MAP[estado] || "badge-gray"}`}>
    {STATUS_LABELS[estado] || estado}
  </span>
);

export default StatusBadge;

export function ProductStatusBadge({ producto }) {
  if (producto.categoria_en_catalogo === 0) return <span className="badge badge-gray">Fuera de catálogo</span>;
  return producto.activo
    ? <span className="badge badge-green">Activo</span>
    : <span className="badge badge-red">Inactivo</span>;
}

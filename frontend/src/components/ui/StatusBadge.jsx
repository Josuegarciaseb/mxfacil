import { STATUS_BADGE_MAP, STATUS_LABELS } from "../../constants";

const StatusBadge = ({ estado }) => (
  <span className={`badge ${STATUS_BADGE_MAP[estado] || "badge-gray"}`}>
    {STATUS_LABELS[estado] || estado}
  </span>
);

export default StatusBadge;

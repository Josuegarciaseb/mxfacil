import Icon from "./Icon";

const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ textAlign: "center", padding: "48px 20px" }}>
    <div
      style={{
        width: 64, height: 64,
        background: "var(--red-pale)",
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
        color: "var(--red)",
      }}
    >
      <Icon name={icon} size={28} />
    </div>
    <h3 style={{ fontSize: 17, marginBottom: 6, color: "var(--gray-800)" }}>{title}</h3>
    <p style={{ color: "var(--gray-500)", fontSize: 14, marginBottom: action ? 20 : 0 }}>{sub}</p>
    {action}
  </div>
);

export default EmptyState;

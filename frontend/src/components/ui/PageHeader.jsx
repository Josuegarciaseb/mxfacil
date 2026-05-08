const PageHeader = ({ title, subtitle, actions }) => (
  <div
    className="page-header"
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12,
    }}
  >
    <div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--gray-900)",
          marginBottom: 2,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: "var(--gray-500)", fontSize: 13 }}>{subtitle}</p>
      )}
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </div>
);

export default PageHeader;

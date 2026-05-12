const PageHeader = ({ title, subtitle, actions }) => (
  <div
    className="page-header"
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 22,
      flexWrap: "wrap",
      gap: 12,
    }}
  >
    <div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "var(--gray-900)",
          marginBottom: 2,
          letterSpacing: "-.02em",
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

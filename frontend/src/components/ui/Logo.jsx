const Logo = ({
  size        = 60,
  showText    = true,
  text        = "Comercio Fácil",
  subtitle    = null,
  textColor   = "#e0edd5",
  subtitleColor = "#89a880",
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <img
      src="/logo.svg"
      alt={showText ? "" : text}
      draggable={false}
      style={{
        width: `var(--brand-mark-size, ${size}px)`,
        height: `var(--brand-mark-size, ${size}px)`,
        objectFit: "contain",
        flexShrink: 0,
        userSelect: "none",
        filter: "var(--brand-mark-filter, brightness(0) invert(1))",
      }}
    />
    {showText && (
      <div style={{ lineHeight: 1.2 }}>
        <div style={{
          fontWeight: "var(--brand-weight, 600)",
          fontSize: "var(--brand-font-size, 20px)",
          color: textColor,
          letterSpacing: "-.01em",
          fontFamily: "'Sora', sans-serif",
        }}>
          {text}
        </div>
        {subtitle && (
          <div style={{
            fontSize: "var(--brand-sub-size, 9px)",
            fontWeight: 600,
            color: subtitleColor,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            fontFamily: "'Sora', sans-serif",
          }}>
            {subtitle}
          </div>
        )}
      </div>
    )}
  </div>
);

export default Logo;

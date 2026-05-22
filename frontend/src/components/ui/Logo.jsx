/**
 * Logo de la marca — usa el archivo en /public/logo.svg
 *
 * Props:
 *   size        — alto/ancho en px del logo (default 40)
 *   showText    — mostrar el nombre al lado (default true)
 *   text        — nombre de la marca
 *   subtitle    — línea pequeña debajo del nombre (null = ocultar)
 *   textColor   — color del nombre
 *   subtitleColor — color del subtítulo
 */
const Logo = ({
  size        = 40,
  showText    = true,
  text        = "Comercio Fácil",
  subtitle    = null,
  textColor   = "#e0edd5",
  subtitleColor = "#89a880",
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <img
      src="/logo.svg"
      alt={text}
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        userSelect: "none",
      }}
    />
    {showText && (
      <div style={{ lineHeight: 1.2 }}>
        <div style={{
          fontWeight: 600,
          fontSize: 15,
          color: textColor,
          letterSpacing: "-.01em",
          fontFamily: "'Sora', sans-serif",
        }}>
          {text}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 9,
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

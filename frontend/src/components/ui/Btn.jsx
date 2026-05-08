const Btn = ({
  children,
  onClick,
  variant = "primary",
  size,
  disabled,
  style: s = {},
  type = "button",
}) => (
  <button
    type={type}
    className={`btn-${variant}${size === "sm" ? " btn-sm" : ""}`}
    onClick={onClick}
    disabled={disabled}
    style={s}
  >
    {children}
  </button>
);

export default Btn;

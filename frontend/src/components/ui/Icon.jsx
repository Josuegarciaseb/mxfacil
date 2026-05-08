import { ICON_PATHS } from "../../constants";

const Icon = ({ name, size = 20, style: s = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline-block", flexShrink: 0, ...s }}
  >
    {ICON_PATHS[name] || ICON_PATHS.info}
  </svg>
);

export default Icon;

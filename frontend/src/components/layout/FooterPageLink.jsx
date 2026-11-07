import { Link } from "react-router-dom";

function scrollToStart(event) {
  if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

export default function FooterPageLink({ to, className, children }) {
  return <Link to={to} className={className} onClick={scrollToStart}>{children}</Link>;
}

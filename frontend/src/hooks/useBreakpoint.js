import { useState, useEffect } from "react";

export const useBreakpoint = () => {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    return window.innerWidth < 640
      ? "mobile"
      : window.innerWidth < 1024
      ? "tablet"
      : "desktop";
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    bp,
    isMobile:  bp === "mobile",
    isTablet:  bp === "tablet",
    isDesktop: bp === "desktop",
    isSmall:   bp !== "desktop",
  };
};

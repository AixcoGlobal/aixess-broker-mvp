import { useLayoutEffect, useRef } from "react";
import { useLanguage } from "../i18n.jsx";

// Keep the art-directed line breaks while fitting the actual translated glyphs.
export function FittedHeading({ as: Tag = "h2", children, ...props }) {
  const ref = useRef(null);
  const { locale } = useLanguage();

  useLayoutEffect(() => {
    const heading = ref.current;
    let active = true;
    let frame = 0;
    let previousWidth = -1;
    const fit = () => {
      if (!active || !heading.clientWidth) return;
      heading.style.removeProperty("font-size");
      const maxSize = parseFloat(getComputedStyle(heading).fontSize);
      const available = heading.clientWidth;
      const longest = Math.max(...Array.from(heading.children, (line) => line.getBoundingClientRect().width));
      if (longest > available - 2) {
        heading.style.fontSize = `${Math.floor(maxSize * (available - 2) / longest * 100) / 100}px`;
      }
    };
    const scheduleFit = () => {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    scheduleFit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      const width = heading.clientWidth;
      if (width !== previousWidth) {
        previousWidth = width;
        scheduleFit();
      }
    });
    observer?.observe(heading);
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(scheduleFit);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [locale]);

  return <Tag {...props} ref={ref} data-fitted-heading>{children}</Tag>;
}

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
    let fontsSettled = !document.fonts?.ready;
    let fontTimeout = 0;
    heading.dataset.fitReady = "false";
    const fit = () => {
      if (!active || !fontsSettled || !heading.clientWidth) return;
      heading.style.removeProperty("font-size");
      const maxSize = parseFloat(getComputedStyle(heading).fontSize);
      const available = heading.clientWidth;
      const longest = Math.max(...Array.from(heading.children, (line) => line.getBoundingClientRect().width));
      if (longest > available - 2) {
        heading.style.fontSize = `${Math.floor(maxSize * (available - 2) / longest * 100) / 100}px`;
      }
      heading.dataset.fitReady = "true";
    };
    const scheduleFit = () => {
      if (!active || !fontsSettled) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const settleFonts = () => {
      if (!active || fontsSettled) return;
      fontsSettled = true;
      window.clearTimeout(fontTimeout);
      fit();
      scheduleFit();
    };
    if (fontsSettled) {
      fit();
      scheduleFit();
    } else {
      fontTimeout = window.setTimeout(settleFonts, 1200);
      document.fonts.ready.then(settleFonts);
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      const width = heading.clientWidth;
      if (width !== previousWidth) {
        previousWidth = width;
        scheduleFit();
      }
    });
    observer?.observe(heading);
    window.addEventListener("resize", fit);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(fontTimeout);
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [locale]);

  return <Tag {...props} ref={ref} data-fitted-heading data-fit-ready="false">{children}</Tag>;
}

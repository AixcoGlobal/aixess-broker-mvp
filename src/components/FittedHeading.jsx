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
    // fonts.ready can resolve before a headline face has even started loading, so a fit
    // measured against the fallback face would stick. Refit whenever a face finishes:
    // the loadingdone event, the heading's own face promise (Safari is unreliable with
    // the event) and the lines' boxes changing when the web font swaps in all trigger it.
    document.fonts?.addEventListener?.("loadingdone", scheduleFit);
    const lineObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleFit);
    Array.from(heading.children).forEach((line) => lineObserver?.observe(line));
    const style = getComputedStyle(heading);
    document.fonts?.load?.(`${style.fontWeight} 64px ${style.fontFamily}`, heading.textContent)
      .then(scheduleFit, () => {});
    window.addEventListener("load", scheduleFit);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(fontTimeout);
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener?.("loadingdone", scheduleFit);
      lineObserver?.disconnect();
      window.removeEventListener("load", scheduleFit);
    };
  }, [locale]);

  return <Tag {...props} ref={ref} data-fitted-heading data-fit-ready="false">{children}</Tag>;
}

import { useLayoutEffect } from "react";
import { useLanguage } from "../i18n.jsx";

// Shrinks a wrapping headline only when one of its words is wider than the headline itself
// (ПЕРВОНАЧАЛЬНОГО, АДМИНИСТРИРОВАНИЯ in Russian, 31 October 2026), so the word stays inside its
// column instead of running into the next one. Lines keep wrapping as before; a headline whose
// words all fit keeps its size. With a selector, every match inside ref shares the smallest size.
export function useWordFit(ref, selector) {
  const { locale } = useLanguage();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const headings = selector ? Array.from(root.querySelectorAll(selector)) : [root];
    let frame = 0;
    const fit = () => {
      headings.forEach((heading) => heading.style.removeProperty("font-size"));
      let ratio = 1;
      headings.forEach((heading) => {
        // Measure with words kept whole, so a headline set to break long words mid-word
        // (ПРИСОЕ / ДИНЯЙТЕ / СЬ) still shows how much room its longest word needs.
        heading.style.overflowWrap = "normal";
        heading.style.wordBreak = "normal";
        const parent = heading.parentElement;
        const parentStyle = parent && getComputedStyle(parent);
        const room = parent ? parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight) : Infinity;
        // A headline allowed to grow to its longest word (min-width: min-content) is checked
        // against its column instead.
        const available = Math.min(heading.clientWidth, room);
        const needed = Math.max(heading.scrollWidth, heading.offsetWidth);
        heading.style.removeProperty("overflow-wrap");
        heading.style.removeProperty("word-break");
        if (available && needed > available + 0.5) ratio = Math.min(ratio, (available - 2) / needed);
      });
      if (ratio === 1) return;
      headings.forEach((heading) => {
        heading.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(heading).fontSize) * ratio * 100) / 100}px`;
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    let lastWidth = root.clientWidth;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (root.clientWidth === lastWidth) return;
      lastWidth = root.clientWidth;
      schedule();
    });
    observer?.observe(root);
    document.fonts?.ready?.then(schedule);
    document.fonts?.addEventListener?.("loadingdone", schedule);
    window.addEventListener("load", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [ref, selector, locale]);
}

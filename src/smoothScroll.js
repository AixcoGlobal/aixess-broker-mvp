import Lenis from "lenis";
import "lenis/dist/lenis.css";

// Eased wheel and trackpad scrolling (Kemo, 3 November 2026: "can we somehow make website scroll
// smoothly"), with Lenis. Only on a mouse or trackpad: phones and tablets keep the browser's own
// touch scrolling, and "reduce motion" keeps native scrolling everywhere. Menus, dialogs and the 3D
// model keep their own wheel handling; scroll boxes inside the page scroll before the page does.
let lenis = null;

export function startSmoothScroll() {
  if (lenis || typeof window === "undefined" || !window.matchMedia) return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return null;
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.1,
    smoothWheel: true,
    allowNestedScroll: true,
    prevent: (node) => Boolean(node.closest?.("[data-lenis-prevent], .lasha-menu, [role='dialog'], .building-map")),
  });
  // The site's own jumps (page changes, #contact, scroll-to-top, section links) call the browser's
  // scrolling directly; Lenis would otherwise keep easing towards its old target and undo them, so
  // any such call first ends Lenis's glide. Lenis moves the page through the untouched originals.
  const nativeScrollTo = window.scrollTo.bind(window);
  lenis.setScroll = (top) => nativeScrollTo({ top, behavior: "instant" });
  const endGlide = (method) => function (...args) {
    lenis?.reset();
    return method.apply(this, args);
  };
  window.scrollTo = endGlide(window.scrollTo);
  window.scroll = endGlide(window.scroll);
  window.scrollBy = endGlide(window.scrollBy);
  Element.prototype.scrollIntoView = endGlide(Element.prototype.scrollIntoView);
  return lenis;
}

// The open menu locks the page behind it.
export function pauseSmoothScroll(paused) {
  if (!lenis) return;
  if (paused) lenis.stop();
  else lenis.start();
}

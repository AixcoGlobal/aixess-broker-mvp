import { useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { glideScrollTo } from "./ScrollToTopButton.jsx";

/* A compact, translated cue at the hero's foot. A click glides to the end of its section
   (or of the element marked data-scroll-cue-end). */
export function ScrollDownCue({ className = "" }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      type="button"
      className={`scroll-down-cue${className ? ` ${className}` : ""}`}
      aria-label={t("scrollDown")}
      onClick={() => {
        const end = ref.current?.closest("[data-scroll-cue-end], section");
        if (!end) return;
        glideScrollTo(window.scrollY + end.getBoundingClientRect().bottom);
      }}
    >
      <span className="scroll-down-cue__label" aria-hidden="true">{t("scrollDiscover")}</span>
      <svg className="scroll-down-cue__chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
        <path className="scroll-down-cue__edge" d="M5 8l5 5 5-5" />
        <path className="scroll-down-cue__mark" d="M5 8l5 5 5-5" />
      </svg>
    </button>
  );
}

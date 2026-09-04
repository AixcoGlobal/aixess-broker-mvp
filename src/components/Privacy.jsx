import { useEffect, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { consentChoice, setConsent } from "../analytics.js";
import { PRIVACY_COPY } from "../privacy-copy.js";
import "./privacy.css";

export function PrivacyControls({ page }) {
  const { locale } = useLanguage(); const copy = PRIVACY_COPY[locale];
  const [open, setOpen] = useState(() => page !== "admin" && !consentChoice());
  useEffect(() => { if (page !== "admin" && !consentChoice()) setOpen(true); }, [page]);
  useEffect(() => { const sync = () => setOpen(!consentChoice()); window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  const choose = (value) => { setConsent(value); setOpen(false); };
  return <>
    <footer className="privacy-footer"><span>© {new Date().getFullYear()} AiXESS</span><a href="#privacy">{copy.policy}</a><button type="button" onClick={() => setOpen(true)}>{copy.settings}</button><a href="#admin">{copy.admin}</a></footer>
    {open && <section className="cookie-notice" aria-labelledby="cookie-title">
      <h2 id="cookie-title">{copy.title}</h2><p>{copy.copy} <a href="#privacy">{copy.policy}</a></p>
      <div className="cookie-actions"><button type="button" onClick={() => choose("rejected")}>{copy.reject}</button><button type="button" onClick={() => choose("accepted")}>{copy.accept}</button></div>
    </section>}
  </>;
}

export function PrivacyPage() {
  const { locale } = useLanguage(); const copy = PRIVACY_COPY[locale];
  return <article className="privacy-page"><a href="#home">← {copy.back}</a><p className="section-eyebrow">AiXESS · 04.09.2026</p><h1>{copy.policy}</h1>{copy.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</article>;
}

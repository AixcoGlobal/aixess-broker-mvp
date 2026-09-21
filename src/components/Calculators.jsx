import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { CALCULATOR_COPY } from "../calculator-copy.js";
import { CALCULATORS, calculateScenario } from "../utils/calculators.js";
import ClientPdf from "./ClientPdf.jsx";
import "./calculators.css";

function toolFromLocation() {
  const requested = new URLSearchParams(window.location.hash.split("?")[1]).get("tool");
  return CALCULATORS.some(calc => calc.id === requested) ? requested : "payment";
}

export default function Calculators() {
  const { locale, t } = useLanguage();
  const c = CALCULATOR_COPY[locale];
  const network = NETWORK_COPY[locale];
  const [active, setActive] = useState(toolFromLocation);
  const [scenarios, setScenarios] = useState(() => Object.fromEntries(CALCULATORS.map(calc => [calc.id, calc.defaults.map(String)])));
  const [outcome, setOutcome] = useState(null);
  const [dirty, setDirty] = useState(false);
  const resultsRef = useRef(null);
  const index = CALCULATORS.findIndex(calc => calc.id === active);
  const definition = CALCULATORS[index];
  const values = scenarios[active];
  useEffect(() => {
    if (outcome?.results && window.matchMedia?.("(max-width: 1000px)").matches) {
      resultsRef.current?.scrollIntoView?.({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [outcome]);
  useEffect(() => {
    const sync = () => { setActive(toolFromLocation()); setOutcome(null); setDirty(false); };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = (id) => {
    setActive(id); setOutcome(null); setDirty(false);
    window.history.replaceState({}, "", `#broker-tools?tool=${id}`);
  };
  const format = (value, kind) => {
    if (kind === "ratio") return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}×`;
    return new Intl.NumberFormat(locale, kind === "percent" ? { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 } : { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };
  return <section className="calculator-page">
    <p className="section-eyebrow">{t("brokerTools")}</p><h1>{c.title}</h1><p className="calculator-intro">{c.example}</p>
    <div className="calculator-tabs" role="tablist" aria-label={c.title}>{CALCULATORS.map((calc, i) => <button key={calc.id} id={`tab-${calc.id}`} role="tab" aria-selected={active === calc.id} aria-controls="calculator-panel" tabIndex={active === calc.id ? 0 : -1} onClick={() => select(calc.id)} onKeyDown={event => {
      let next;
      if (event.key === "ArrowRight") next = (i + 1) % CALCULATORS.length;
      if (event.key === "ArrowLeft") next = (i + CALCULATORS.length - 1) % CALCULATORS.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = CALCULATORS.length - 1;
      if (next !== undefined) { event.preventDefault(); select(CALCULATORS[next].id); document.getElementById(`tab-${CALCULATORS[next].id}`)?.focus(); }
    }}>{network.calculators[i][0]}</button>)}</div>
    <div id="calculator-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="calculator-layout">
      <form className="calculator-form" noValidate onSubmit={event => { event.preventDefault(); setOutcome(calculateScenario(active, values)); setDirty(false); }}>
        <h2>{network.calculators[index][0]}</h2>
        <div className="calculator-fields">{definition.fields.map((field, i) => <label key={field} htmlFor={`calc-${active}-${field}`}><span>{c.fields[field]}</span><input id={`calc-${active}-${field}`} type="number" inputMode="decimal" step="any" required value={values[i]} onChange={event => { const value = event.target.value; setScenarios(prev => ({ ...prev, [active]: prev[active].map((old, j) => j === i ? value : old) })); setDirty(true); setOutcome(null); }} /></label>)}</div>
        <div className="calculator-actions"><button type="submit" className="button button-primary">{c.calculate}</button><button type="button" className="button button-ghost" onClick={() => { setScenarios(prev => ({ ...prev, [active]: definition.defaults.map(String) })); setOutcome(null); setDirty(false); }}>{c.reset}</button></div>
        {outcome?.error && <p className="calculator-error" role="alert">{c.errors[outcome.error]}</p>}
        <p className="calculator-note">{c.notes[index]}</p>
      </form>
      <div ref={resultsRef} className="calculator-results" aria-live="polite" aria-atomic="true"><h2>{c.result}</h2>{outcome?.results ? <dl>{outcome.results.map((value, i) => <div key={c.outputs[index][i]}><dt>{c.outputs[index][i]}</dt><dd>{format(value, definition.formats[i])}</dd></div>)}</dl> : <p>{dirty ? c.changed : c.empty}</p>}<p className="calculator-note">{c.disclaimer}</p></div>
    </div>
    <ClientPdf locale={locale} active={active} values={values} ready={Boolean(outcome?.results) && !dirty} />
  </section>;
}

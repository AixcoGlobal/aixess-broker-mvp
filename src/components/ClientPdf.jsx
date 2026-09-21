import { useState } from "react";
import { CLIENT_PDF_COPY } from "../client-pdf-copy.js";
import { CALCULATOR_APARTMENTS } from "../data/calculatorApartments.js";
import { getGoldenPremiumUnit } from "../data/goldenPremiumApartments.js";
import { GOLDEN_PREMIUM_COPY } from "../golden-premium-copy.js";

export default function ClientPdf({ locale, active, values, ready }) {
  const c = CLIENT_PDF_COPY[locale];
  const [apartmentCode, setApartmentCode] = useState("A1305");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [state, setState] = useState("idle");
  const busy = state === "loading";
  const unit = CALCULATOR_APARTMENTS.find(item => item.code === apartmentCode);
  const goldenPremium = getGoldenPremiumUnit(apartmentCode);
  const goldenCopy = GOLDEN_PREMIUM_COPY[locale];
  async function download() {
    if (!ready || busy) return;
    const options = { locale, calculatorId: active, values: [...values], apartmentCode, clientName, clientAddress };
    setState("loading");
    try {
      const { downloadClientPdf } = await import("../utils/clientPdf.js");
      await downloadClientPdf(options);
      setState("success");
    } catch (error) {
      setState(error?.message === "glyph" ? "glyph" : "error");
    }
  }
  return <section className="client-pdf" aria-labelledby="client-pdf-title">
    <div><h2 id="client-pdf-title">{c.title}</h2><p className="calculator-note">{c.intro}</p></div>
    <fieldset disabled={busy} className="calculator-fields">
      <label htmlFor="pdf-apartment"><span>{c.apartment}</span><select id="pdf-apartment" value={apartmentCode} onChange={event => { setApartmentCode(event.target.value); setState("idle"); }}>
        {[false, true].map(premium => <optgroup key={String(premium)} label={premium ? goldenCopy.badge : c.regular}>
          {CALCULATOR_APARTMENTS.filter(apartment => Boolean(getGoldenPremiumUnit(apartment.code)) === premium).map(apartment => <option key={apartment.code} value={apartment.code} style={premium ? { color: "#9B6D15" } : undefined}>{apartment.code} · {new Intl.NumberFormat(locale).format(apartment.area)} m²</option>)}
        </optgroup>)}
      </select></label>
      <p className="calculator-note client-pdf-unit">{unit.block} · {c.floor}: {unit.floor} · {c.area}: {new Intl.NumberFormat(locale).format(unit.area)} m²</p>
      {goldenPremium && <p className="golden-premium-pdf-label">{goldenCopy.badge}</p>}
      <label htmlFor="pdf-client-name"><span>{c.name}</span><input id="pdf-client-name" type="text" value={clientName} maxLength={100} autoComplete="off" onChange={event => { setClientName(event.target.value); setState("idle"); }} /></label>
      <label htmlFor="pdf-client-address"><span>{c.address}</span><textarea id="pdf-client-address" value={clientAddress} maxLength={300} rows={3} autoComplete="off" placeholder={c.addressHint} onChange={event => { setClientAddress(event.target.value); setState("idle"); }} /></label>
    </fieldset>
    <p className="calculator-note">{c.selectedNote}</p>
    <div className="calculator-actions"><button type="button" className="button button-primary" disabled={!ready || busy} onClick={download}>{busy ? c.generating : c.download}</button></div>
    {!ready && <p className="calculator-note">{c.recalculate}</p>}
    <p className="client-pdf-status" role={state === "error" || state === "glyph" ? "alert" : "status"}>{state === "success" ? c.success : state === "error" ? c.error : state === "glyph" ? c.missingGlyph : ""}</p>
    <p className="calculator-note">{c.privacy}</p>
  </section>;
}

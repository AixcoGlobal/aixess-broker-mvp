import { useLanguage } from "../i18n.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { getWorkbookAvailableCount } from "../data/reveranceInventory.js";
import "./network.css";

export const CALCULATOR_IDS = ["payment", "yield", "finance", "growth"];

function Heading({ copy }) {
  return <div className="network-heading"><p className="section-eyebrow">{copy[0]}</p><h2>{copy[1]}</h2>{copy[2] && <p className="network-lead">{copy[2]}</p>}</div>;
}

function Cards({ rows }) {
  return <div className="network-grid">{rows.map(([title, copy], i) => <article className="network-card" key={title}><span className="network-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>;
}

export function NetworkSections({ sections }) {
  const { locale } = useLanguage();
  const c = NETWORK_COPY[locale];
  const stats = {
    en: ["TRANSACTIONS", "Georgia market brief", "MARKET SIZE", "Current research figure", "YOY MARKET GROWTH", "AVERAGE RENTAL YIELD", "GROSS DEVELOPMENT VALUE", "TRANSACTIONS", "PROFESSIONALS"],
    de: ["TRANSAKTIONEN", "Marktbericht Georgien", "MARKTVOLUMEN", "Aktuelle Forschungsangabe", "MARKTWACHSTUM ZUM VORJAHR", "DURCHSCHNITTLICHE MIETRENDITE", "BRUTTOPROJEKTWERT", "TRANSAKTIONEN", "FACHLEUTE"],
    pl: ["TRANSAKCJI", "Raport o rynku Gruzji", "WARTOŚĆ RYNKU", "Aktualne dane badawcze", "WZROST RYNKU ROK DO ROKU", "ŚREDNIA RENTOWNOŚĆ NAJMU", "ŁĄCZNA WARTOŚĆ INWESTYCJI", "TRANSAKCJI", "SPECJALISTÓW"],
    sl: ["TRANSAKCIJ", "Poročilo o gruzijskem trgu", "VELIKOST TRGA", "Aktualni raziskovalni podatek", "MEDLETNA RAST TRGA", "POVPREČNA DONOSNOST ODDAJANJA", "BRUTO VREDNOST PROJEKTOV", "TRANSAKCIJ", "STROKOVNJAKOV"],
    ru: ["СДЕЛОК", "Обзор рынка Грузии", "ОБЪЁМ РЫНКА", "Текущие данные исследования", "РОСТ РЫНКА ГОД К ГОДУ", "СРЕДНЯЯ ДОХОДНОСТЬ АРЕНДЫ", "СОВОКУПНАЯ СТОИМОСТЬ ПРОЕКТОВ", "СДЕЛОК", "СПЕЦИАЛИСТОВ"],
  }[locale];
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  const percent = (value) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value);
  const money = (value, currency) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 1, notation: "compact" }).format(value);
  const workwiseBrokerUrl = (type) => `https://workw.com/realestate/aixco/${type === "register" ? "broker-signup" : "broker-login"}?lang=${encodeURIComponent(locale)}`;
  const actions = (full = false) => <div className="network-actions"><a className="button button-primary" href={workwiseBrokerUrl("register")}>{full ? c.requestFull : c.request}</a><a className="button button-ghost" href={workwiseBrokerUrl("login")}>{full ? c.already : c.signIn}</a></div>;
  return sections.map((section) => {
    let content;
    switch (section) {
      case "introduction": content = <><Heading copy={[c.identity, c.hero.join(" "), c.intro]} /><p className="network-emphasis">{c.promise.join(" · ")}</p>{actions()}</>; break;
      case "commercial": content = <><Heading copy={c.commercial} /><p className="network-emphasis">{c.commercial[3]}</p></>; break;
      case "eligibility": content = <><Heading copy={c.eligibility} /><Cards rows={c.people} /><p className="network-emphasis">{c.network}</p>{actions()}</>; break;
      case "why": content = <><Heading copy={c.why} /><Cards rows={c.reasons} /></>; break;
      case "opportunity": content = <><Heading copy={c.opportunity.slice(0, 2)} /><p className="network-emphasis">{c.opportunity[2]}</p><p className="network-lead">{c.opportunity[3]}</p><dl className="network-stats">{[number(2), number(getWorkbookAvailableCount()), number(15), money(45000, "EUR")].map((value, i) => <div key={c.facts[i]}><dd>{value}</dd><dt>{c.facts[i]}</dt></div>)}</dl><p className="network-emphasis">{c.start}</p><a className="button button-primary" href={workwiseBrokerUrl("login")}>{c.inside}<span aria-hidden="true">→</span></a><p className="network-note">{c.terms}</p></>; break;
      case "advantage": content = <><Heading copy={c.advantage} /><Cards rows={c.advantages} /></>; break;
      case "process": content = <><Heading copy={c.process} /><ol className="network-steps">{c.steps.map(([title, copy], i) => <li key={title}><span className="network-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></>; break;
      case "tools": content = <><Heading copy={c.tools} /><div className="network-grid">{c.calculators.map(([title, copy], i) => <article className="network-card" key={title}><span className="network-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p><a className="text-link" href={`#calculators?tool=${CALCULATOR_IDS[i]}`}>{c.openCalculator}<span aria-hidden="true">↗</span></a></article>)}</div><a className="button button-primary" href="#calculators">{c.openCalculators}<span aria-hidden="true">→</span></a><p className="network-note"><strong>{c.clientPdf}</strong> — {c.pdfFuture}</p></>; break;
      case "client": content = <><p className="network-badge">{c.comingSoon}</p><Heading copy={c.client} /><p className="network-emphasis">{c.client[3]}</p></>; break;
      case "insights": content = <><Heading copy={c.insights} /><dl className="network-stats">{[[number(17478), stats[0], stats[1]], [money(1300000000, "USD"), stats[2], stats[3]], [`+${percent(.238)}`, stats[4], stats[3]], [percent(.074), stats[5], stats[3]]].map(([value, title, note]) => <div key={title}><dd>{value}</dd><dt>{title}</dt><p>{note}</p></div>)}</dl><div className="network-reports">{c.reports.map(title => <a className="network-report-link" key={title} href={workwiseBrokerUrl("login")}>{title}<span aria-hidden="true">↗</span></a>)}</div><p className="network-lead">{c.library}</p></>; break;
      case "services": content = <><Heading copy={c.services.slice(0, 2)} /><ol className="network-service-path">{c.serviceSteps.map(step => <li key={step}>{step}</li>)}</ol><p className="network-lead">{c.services[2]}</p></>; break;
      case "backing": content = <><Heading copy={c.backing} /><dl className="network-stats">{[["2009", c.heritage], [`${money(400000000, "USD")}+`, stats[6]], [`${number(2000)}+`, stats[7]], ["90+", stats[8]]].map(([value, title]) => <div key={title}><dd>{value}</dd><dt>{title}</dt></div>)}</dl><a className="button button-ghost" href="https://aixco.global" target="_blank" rel="noopener noreferrer">{c.discover}<span aria-hidden="true">↗</span></a></>; break;
      case "closing": content = <><Heading copy={c.closing} />{actions(true)}</>; break;
      default: throw new Error(`Unknown content section: ${section}`);
    }
    return <section key={section} className={`network-section network-${section}`} data-content-section={section}>{content}</section>;
  });
}

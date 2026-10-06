import { useLanguage } from "../i18n.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { HOME_HERO_LINES } from "../project-showcase-copy.js";

const ARROW = <span aria-hidden="true">→</span>;

export function HomeHero({ children }) {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const lines = HOME_HERO_LINES[locale] ?? HOME_HERO_LINES.en;

  return (
    <section className="lasha-hero" id="project">
      {children}
      <div className="lasha-hero-frame">
        <img
          className="lasha-hero-media"
          src="/assets/projects/reverance-skyline-1440.webp"
          srcSet="/assets/projects/reverance-skyline-720.webp 720w, /assets/projects/reverance-skyline-1440.webp 1440w"
          sizes="100vw"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="lasha-hero-copy">
          <h1>{lines.map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{copy.heroSubtitle}</p>
          <a className="lasha-hero-cta" href="#projects">{copy.heroCta} {ARROW}</a>
        </div>
      </div>
    </section>
  );
}

export function HomeMetrics() {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;

  return (
    <section className="lasha-metrics">
      {copy.metrics.map(([label, value, note]) => (
        <div key={label}>
          <p className="lasha-metrics-label">{label}</p>
          <p className="lasha-metrics-value" style={{ "--chars": Math.max(value.length, 6) }}>
            {value.replace(/\+$/, "")}
            {value.endsWith("+") && <span className="lasha-metrics-plus">+</span>}
          </p>
          <p className="lasha-metrics-note">{note}</p>
        </div>
      ))}
      <p className="lasha-metrics-tagline">
        {copy.metricsTagline.map((line) => <span key={line}>{line}</span>)}
      </p>
    </section>
  );
}

export function HomeAbout() {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;

  return (
    <section className="lasha-about" id="why-aixess" aria-labelledby="lasha-about-title">
      <img
        className="lasha-about-media"
        src="/assets/projects/reverance-entrance-1200.webp"
        srcSet="/assets/projects/reverance-entrance-600.webp 600w, /assets/projects/reverance-entrance-1200.webp 1200w"
        sizes="(max-width: 899px) 100vw, 50vw"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className="lasha-about-panel">
        <p className="lasha-eyebrow lasha-eyebrow-light">{copy.aboutEyebrow}</p>
        <h2 id="lasha-about-title">{copy.aboutTitle.map((line) => <span key={line}>{line}</span>)}</h2>
        <p className="lasha-about-body">{copy.aboutBody}</p>
        <ol className="lasha-about-points">
          {copy.aboutPoints.map((point, index) => (
            <li key={point}><span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>{point}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HomeStartingPoints() {
  const { locale } = useLanguage();
  const network = NETWORK_COPY[locale] || NETWORK_COPY.en;
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const [lead, accent] = copy.startingTitle;

  return (
    <section className="lasha-starting" aria-labelledby="lasha-starting-title">
      <p className="lasha-eyebrow">{network.introTagline}</p>
      <h2 id="lasha-starting-title"><span>{lead}</span> <span className="lasha-accent">{accent}</span></h2>
      <div className="lasha-starting-grid">
        {network.startingPoints.map(([title, description], index) => (
          <article key={title}>
            <span className="lasha-starting-rule" aria-hidden="true">
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeAccess({ availableResidences, onOpenModal }) {
  const { t } = useLanguage();

  return (
    <section className="lasha-access" aria-labelledby="lasha-access-title">
      <div className="lasha-access-copy">
        <p className="lasha-eyebrow">{t("brokerNetwork")}</p>
        <h2 id="lasha-access-title">{t("yourAccess")}<br />{t("startsHere")}</h2>
      </div>
      <p className="lasha-access-count">
        <strong>{availableResidences}</strong>
        <span>{t("availableResidences")}</span>
      </p>
      <div className="lasha-access-actions">
        <button className="lasha-button lasha-button-primary" type="button" onClick={() => onOpenModal("register")}>
          {t("registerAsBroker")} {ARROW}
        </button>
        <button className="lasha-button lasha-button-outline" type="button" onClick={() => onOpenModal("materials")}>
          {t("downloadMaterials")} {ARROW}
        </button>
      </div>
    </section>
  );
}

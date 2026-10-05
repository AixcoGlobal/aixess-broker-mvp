import { useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { PROJECT_SHOWCASE_COPY } from "../project-showcase-copy.js";
import { FEATURED_PROJECT, UPCOMING_PROJECTS } from "../data/projects.js";
import "./project-showcase.css";

export function ProjectShowcase({ onNavigate, upcoming = UPCOMING_PROJECTS }) {
  const { t, locale } = useLanguage();
  const copy = PROJECT_SHOWCASE_COPY[locale] || PROJECT_SHOWCASE_COPY.en;
  const network = NETWORK_COPY[locale] || NETWORK_COPY.en;
  const [active, setActive] = useState(0);
  const project = FEATURED_PROJECT;
  const image = project.gallery[active];
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: project.currency, maximumFractionDigits: 0 }).format(project.startingPrice);
  const facts = [
    [money, network.facts[3]],
    [`${project.downPaymentPercent}%`, copy.downPayment],
    [number(project.availableResidences), network.facts[1]],
    [String(project.completionYear), `${t("completion")} · ${t("july2028")}`],
  ];

  const exploreResidences = () => {
    document.getElementById("residences")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="project-showcase" id="projects" aria-labelledby="project-showcase-title">
      <header className="project-showcase-head">
        <p className="section-eyebrow">{copy.eyebrow}</p>
        <h2 id="project-showcase-title">{copy.title}</h2>
        <p className="project-showcase-lead">{copy.lead}</p>
      </header>

      <div className="project-feature">
        <figure className="project-feature-media">
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="(max-width: 899px) 100vw, 55vw"
            alt={copy.imageAlt}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="project-status"><span className="project-status-dot" aria-hidden="true" />{t("batumi")} · {copy.onSale}</figcaption>
        </figure>

        <div className="project-feature-side">
          <dl className="project-facts">
            {facts.map(([value, label]) => (
              <div key={label}><dd>{value}</dd><dt>{label}</dt></div>
            ))}
          </dl>
          <div className="project-card">
            <p className="project-card-live">{copy.onSale} · {copy.liveInventory}</p>
            <h3>{t("projectReverance")}</h3>
            <p>{network.opportunity[3]}</p>
            <p className="project-card-meta">{copy.location}</p>
            <div className="project-card-actions">
              <button className="button button-primary" type="button" onClick={exploreResidences}>
                {copy.exploreResidences}<span aria-hidden="true">→</span>
              </button>
              <button className="button button-ghost" type="button" onClick={() => onNavigate("broker-tools")}>
                {t("calculator")}<span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="project-thumbs" role="group" aria-label={copy.gallery}>
          {project.gallery.map((item, index) => (
            <button
              type="button"
              key={item.thumb}
              className={index === active ? "is-active" : ""}
              aria-pressed={index === active}
              aria-label={copy.showImage.replace("{{n}}", String(index + 1))}
              onClick={() => setActive(index)}
            >
              <img src={item.thumb} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="project-upcoming">
          <h3>{copy.next}</h3>
          <div className="project-upcoming-row">
            {upcoming.map((item) => (
              <article key={item.id}>
                <img src={item.image} alt="" loading="lazy" decoding="async" />
                <p className="project-upcoming-status">{item.location[locale] || item.location.en} · {copy.comingSoon}</p>
                <h4>{item.name}</h4>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { PROJECT_SHOWCASE_COPY } from "../project-showcase-copy.js";
import { FEATURED_PROJECT, UPCOMING_PROJECTS } from "../data/projects.js";
import "./project-showcase.css";

export function ProjectShowcase({ onNavigate, upcoming = UPCOMING_PROJECTS }) {
  const { t, locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const showcase = PROJECT_SHOWCASE_COPY[locale] || PROJECT_SHOWCASE_COPY.en;
  const [active, setActive] = useState(0);
  const project = FEATURED_PROJECT;
  const image = project.gallery[active];

  const exploreProject = () => {
    document.getElementById("residences")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="project-showcase" id="projects" aria-labelledby="project-showcase-title">
      <header className="project-showcase-head">
        <p className="lasha-eyebrow">{copy.projectEyebrow}</p>
        <h2 id="project-showcase-title">{copy.projectTitle}</h2>
      </header>

      <div className="project-feature">
        <div className="project-feature-gallery">
          <figure className="project-feature-media">
            <img
              src={image.src}
              srcSet={image.srcSet}
              sizes="(max-width: 899px) 100vw, 46vw"
              alt={showcase.imageAlt}
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className="project-thumbs" role="group" aria-label={copy.galleryLabel}>
            {project.gallery.map((item, index) => (
              <button
                type="button"
                key={item.thumb}
                className={index === active ? "is-active" : ""}
                aria-pressed={index === active}
                aria-label={copy.galleryImage.replace("{{n}}", String(index + 1))}
                onClick={() => setActive(index)}
              >
                <img src={item.thumb} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </div>

        <div className="project-feature-side">
          <dl className="project-facts">
            {copy.projectFacts.map(([value, label]) => (
              <div key={label}><dd>{value}</dd><dt>{label}</dt></div>
            ))}
          </dl>
          <div className="project-card">
            <h3>{copy.projectName}</h3>
            <p>{copy.projectBody}</p>
            <p className="project-card-meta">{copy.projectMeta}</p>
            <div className="project-card-actions">
              <button className="lasha-button lasha-button-primary" type="button" onClick={exploreProject}>
                {copy.exploreProject}<span aria-hidden="true">→</span>
              </button>
              <button className="lasha-button lasha-button-dark" type="button" onClick={() => onNavigate("broker-tools")}>
                {t("calculator")}<span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="project-upcoming">
          <h3>{showcase.next}</h3>
          <div className="project-upcoming-row">
            {upcoming.map((item) => (
              <article key={item.id}>
                <img src={item.image} alt="" loading="lazy" decoding="async" />
                <p className="project-upcoming-status">{item.location[locale] || item.location.en} · {showcase.comingSoon}</p>
                <h4>{item.name}</h4>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect } from "react";
import { useLanguage } from "../i18n.jsx";
import { DUBAI_PROJECTS_COPY } from "../dubai-projects-copy.js";
import { DUBAI_IMAGES_COPY } from "../dubai-projects-images-copy.js";
import { dubaiImage } from "../dubai-projects-data.js";
import { CONTACT } from "../contact-copy.js";
import { LashaArrow, routeLinkClick } from "./LashaHomeSections.jsx";
import "./reverance-project.css";
import "./dubai-projects.css";

// TRESORA and Downtown One, each on its own page: #tresora and #downtown-one, with sections at
// #tresora/spaces and the like. Kemo, 26 October 2026: the two Word briefs are the only approved text,
// so every visible word comes from them (dubai-projects-copy.js) and the sections follow their order.
// The developers' renderings stay as pictures, without captions. Every request button is an email to
// AiXESS that names the project and the request (the Vercel site has no form server).

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useDubaiCopy(key) {
  const { locale } = useLanguage();
  const copy = DUBAI_PROJECTS_COPY[locale] || DUBAI_PROJECTS_COPY.en;
  const images = DUBAI_IMAGES_COPY[locale] || DUBAI_IMAGES_COPY.en;
  return { common: copy.common, project: key ? copy[key] : null, all: copy, images: key ? images[key] : null };
}

// An email to AiXESS's verified address, already naming the project, its location and the request.
export function projectMailto(common, project, request) {
  const mail = common.mail;
  const name = project.hero.title.join(" ");
  const subject = mail.subject.replace("{{project}}", name).replace("{{request}}", request);
  const body = [`${mail.project}: ${name}`, `${mail.location}: ${project.place}`, `${mail.request}: ${request}`, "", `${mail.name}:`, `${mail.phone}:`, `${mail.message}:`, ""].join("\r\n");
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// The button's own words are the request named in the email.
function RequestButton({ common, project, label, primary = false }) {
  return (
    <a className={`button ${primary ? "button-primary" : "button-ghost"}`} href={projectMailto(common, project, label)} aria-label={`${label} (${common.opensEmail})`}>
      {label}<LashaArrow length={24} />
    </a>
  );
}

function Picture({ slug, alt = "", sizes, className, eager = false }) {
  const image = dubaiImage(slug);
  return <img className={className} src={image.src} srcSet={image.srcSet} sizes={sizes} width={image.width} height={image.height} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" />;
}

// Scrolls to a section of the page and moves focus there, keeping the page's own route in the address.
function scrollToSection(route, section, behavior) {
  const target = document.getElementById(`${route}-${section}`);
  if (!target) return false;
  target.scrollIntoView({ behavior: behavior || (reducedMotion() ? "auto" : "smooth"), block: "start" });
  const focusTarget = target.matches("h2, p") ? target : target.querySelector("h2") || target;
  if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
  focusTarget.focus({ preventScroll: true });
  return true;
}

function sectionLinkClick(route, section) {
  return (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}#${route}/${section}`);
    scrollToSection(route, section);
  };
}

// "#tresora/spaces" opens the page at that section (shared links, reload, Back and Forward).
function useSectionFromHash(route) {
  useEffect(() => {
    const timers = [];
    const scrollFromHash = () => {
      const [page, section] = window.location.hash.replace(/^#/, "").toLowerCase().split("/");
      if (page !== route || !section || !document.getElementById(`${route}-${section}`)) return;
      timers.push(window.setTimeout(() => scrollToSection(route, section, "auto"), 60));
      timers.push(window.setTimeout(() => scrollToSection(route, section, "auto"), 700));
    };
    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    window.addEventListener("popstate", scrollFromHash);
    return () => {
      window.removeEventListener("hashchange", scrollFromHash);
      window.removeEventListener("popstate", scrollFromHash);
      timers.forEach(window.clearTimeout);
    };
  }, [route]);
}

// The page hero: copy on the theme's ground, the developer's rendering beside it (above it on phones),
// so no text ever sits on the photograph. The hero grows with its copy.
function ProjectHero({ header, route, hero, image, imageAlt, children }) {
  return (
    <section className="lasha-page-hero lasha-page-hero-type dp-hero dp-hero-media" aria-labelledby={`${route}-title`}>
      {header}
      <figure className="dp-hero-figure">
        <Picture slug={image} alt={imageAlt} sizes="(max-width: 1099px) 100vw, 36vw" eager />
      </figure>
      <div className="lasha-page-hero-copy dp-hero-copy">
        <div className="dp-hero-head">
          <h1 className="lasha-page-hero-title" id={`${route}-title`}>{hero.title.map((line) => <span key={line}>{line}</span>)}</h1>
          <p className="dp-hero-subtitle">{hero.subtitle}</p>
          <p className="dp-hero-tagline">{hero.tagline}</p>
        </div>
        <div className="dp-hero-side">{children}</div>
      </div>
    </section>
  );
}

function SectionHeading({ id, eyebrow, title, lead }) {
  return (
    <header className="rp-heading">
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2 id={id}>{title}</h2>
      {lead && <p className="rp-lead">{lead}</p>}
    </header>
  );
}

function Paragraphs({ items, className = "dp-columns" }) {
  return <div className={className}>{items.map((text) => <p key={text}>{text}</p>)}</div>;
}

// A rendering on its own, without a caption.
function RenderFigure({ slug, alt, sizes, className = "" }) {
  return (
    <figure className={`dp-figure ${className}`}>
      <div className="dp-figure-frame"><Picture slug={slug} alt={alt} sizes={sizes} /></div>
    </figure>
  );
}

// Renderings without captions. `still`: TRESORA's brochure renderings, small sources shown near their own size.
function Gallery({ items, still = false }) {
  return (
    <ul className={`rp-gallery dp-gallery${still ? " dp-gallery-still" : ""}`}>
      {items.map(([slug, alt]) => (
        <li key={slug}>
          <Picture slug={slug} alt={alt} sizes={still ? "(max-width: 599px) calc(100vw - 2.5rem), (max-width: 1099px) 46vw, 27rem" : "(max-width: 599px) calc(100vw - 2.5rem), (max-width: 1099px) 46vw, 31vw"} />
        </li>
      ))}
    </ul>
  );
}

export function TresoraPage({ header }) {
  const route = "tresora";
  const { common, project, images } = useDubaiCopy("tresora");
  useSectionFromHash(route);
  const { hero, discover, highlights, spaces, lifestyle, location, payment, more, currency } = project;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;

  return (
    <>
      <ProjectHero header={header} route={route} hero={hero} image="tresora-tower" imageAlt={images.hero}>
        <p className="lasha-page-hero-text">{hero.intro}</p>
        <dl className="dp-hero-facts">
          {hero.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="it-hero-actions">
          <a className="button button-primary" href={`#${route}/spaces`} onClick={sectionLinkClick(route, "spaces")}>{hero.explore}<LashaArrow length={24} /></a>
          <RequestButton common={common} project={project} label={hero.availability} />
        </div>
      </ProjectHero>

      <main className="page-main dp-page">
        <section className="rp-section" id="tresora-discover" aria-labelledby="tresora-discover-title">
          <div className="dp-media-split dp-media-split-head">
            <SectionHeading id="tresora-discover-title" eyebrow={discover.eyebrow} title={discover.title} />
            <Paragraphs items={discover.body} className="dp-columns dp-columns-1" />
            <RenderFigure slug="tresora-facade" alt={images.facade} sizes="(max-width: 899px) calc(100vw - 2.5rem), 46vw" />
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-highlights" aria-labelledby="tresora-highlights-title">
          <SectionHeading id="tresora-highlights-title" title={highlights.title} />
          <ul className="dp-cards dp-cards-3">
            {highlights.items.map(([value, label]) => <li key={label}><strong>{value}</strong><p>{label}</p></li>)}
          </ul>
        </section>

        <section className="rp-section" id="tresora-spaces" aria-labelledby="tresora-spaces-title">
          <SectionHeading id="tresora-spaces-title" eyebrow={spaces.eyebrow} title={spaces.title} />
          <Paragraphs items={spaces.body} />
          <h3 className="dp-list-title dp-list-title-gap">{spaces.listTitle}</h3>
          <ul className="dp-list dp-list-2">{spaces.categories.map((name) => <li key={name}>{name}</li>)}</ul>
          <div className="rp-actions">
            <RequestButton common={common} project={project} label={spaces.units} primary />
            <RequestButton common={common} project={project} label={spaces.prices} />
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-lifestyle" aria-labelledby="tresora-lifestyle-title">
          <SectionHeading id="tresora-lifestyle-title" title={lifestyle.title} lead={lifestyle.lead} />
          <div className="dp-media-split dp-media-split-reverse">
            <div>
              <h3 className="dp-list-title">{lifestyle.listTitle}</h3>
              <ul className="dp-list dp-list-2">{lifestyle.amenities.map((name) => <li key={name}>{name}</li>)}</ul>
            </div>
            <RenderFigure slug="tresora-pool" alt={images.pool} sizes="(max-width: 899px) calc(100vw - 2.5rem), 46vw" />
          </div>
          <Gallery items={images.gallery} still />
        </section>

        <section className="rp-section" id="tresora-location" aria-labelledby="tresora-location-title">
          <SectionHeading id="tresora-location-title" eyebrow={location.eyebrow} title={location.title} />
          <div className="rp-split dp-split">
            <div>
              {location.body.map((text) => <p className="dp-text" key={text}>{text}</p>)}
              <div className="rp-actions">
                <a className="button button-primary" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${location.explore} (${common.opensMaps})`}>{location.explore}<LashaArrow length={24} /></a>
                <RequestButton common={common} project={project} label={location.contact} />
              </div>
            </div>
            <RenderFigure slug="tresora-map" alt={images.map} className="dp-map" sizes="(max-width: 899px) calc(100vw - 2.5rem), 40vw" />
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-payment" aria-labelledby="tresora-payment-title">
          <SectionHeading id="tresora-payment-title" eyebrow={payment.eyebrow} title={payment.title} />
          <Paragraphs items={payment.body} />
        </section>

        <section className="rp-section dp-closing" id="tresora-more" aria-labelledby="tresora-more-title">
          <SectionHeading id="tresora-more-title" title={more.title} />
          <Paragraphs items={more.body} />
          <div className="rp-actions">
            <RequestButton common={common} project={project} label={more.contact} primary />
            <RequestButton common={common} project={project} label={more.details} />
          </div>
          <div className="dp-terms" id="tresora-currency">
            <h3>{currency.title}</h3>
            <p>{currency.text}</p>
          </div>
        </section>
      </main>
    </>
  );
}

export function DowntownOnePage({ header }) {
  const route = "downtown-one";
  const { common, project, images } = useDubaiCopy("downtown");
  useSectionFromHash(route);
  const { hero, highlights, amenities, location, more } = project;

  return (
    <>
      <ProjectHero header={header} route={route} hero={hero} image="downtown-tower" imageAlt={images.hero}>
        {hero.body.map((text) => <p className="lasha-page-hero-text" key={text}>{text}</p>)}
        <div className="it-hero-actions">
          <a className="button button-primary" href={`#${route}/highlights`} onClick={sectionLinkClick(route, "highlights")}>{hero.explore}<LashaArrow length={24} /></a>
          <RequestButton common={common} project={project} label={hero.availability} />
        </div>
      </ProjectHero>

      <main className="page-main dp-page">
        <section className="rp-section" id="downtown-one-highlights" aria-labelledby="downtown-one-highlights-title">
          <SectionHeading id="downtown-one-highlights-title" title={highlights.title} />
          <ul className="dp-cards dp-cards-3">
            {highlights.items.map(([value, title, line]) => (
              <li key={title}>
                <strong>{value}</strong>
                <h3>{title}</h3>
                <p>{line}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rp-section rp-mist" id="downtown-one-amenities" aria-labelledby="downtown-one-amenities-title">
          <SectionHeading id="downtown-one-amenities-title" eyebrow={amenities.eyebrow} title={amenities.title} />
          <Paragraphs items={amenities.body} />
          <div className="dp-groups">
            {amenities.groups.map(([group, items]) => (
              <section key={group} aria-label={group}>
                <h3>{group}</h3>
                <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
          </div>
        </section>

        <section className="rp-section" id="downtown-one-gallery" aria-label={project.name}>
          <Gallery items={images.gallery} />
        </section>

        <section className="rp-section rp-mist" id="downtown-one-location" aria-labelledby="downtown-one-location-title">
          <SectionHeading id="downtown-one-location-title" eyebrow={location.eyebrow} title={location.title} />
          <div className="rp-split dp-split">
            <div>
              {location.body.map((text) => <p className="dp-text" key={text}>{text}</p>)}
              <h3 className="dp-list-title">{location.nearbyTitle}</h3>
              <ul className="dp-list dp-list-1">{location.nearby.map((item) => <li key={item}>{item}</li>)}</ul>
              <p className="dp-text dp-text-after">{location.closing}</p>
            </div>
            <RenderFigure slug="downtown-map" alt={images.map} className="dp-map" sizes="(max-width: 899px) calc(100vw - 2.5rem), 40vw" />
          </div>
        </section>

        <section className="rp-section dp-closing" id="downtown-one-more" aria-labelledby="downtown-one-more-title">
          <SectionHeading id="downtown-one-more-title" eyebrow={more.eyebrow} title={more.title} />
          <Paragraphs items={more.body} />
          <div className="rp-actions">
            <RequestButton common={common} project={project} label={more.brochure} primary />
            <RequestButton common={common} project={project} label={more.contact} />
          </div>
        </section>
      </main>
    </>
  );
}

// The homepage's Dubai cards, under the Batumi project: one per project, each opening its own page.
export function DubaiProjectCards({ onNavigate }) {
  const { common, all } = useDubaiCopy();
  const cards = [["tresora", all.tresora, "tresora-tower"], ["downtown-one", all.downtown, "downtown-street"]];
  return (
    <section className="dp-listing" id="dubai-projects" aria-labelledby="dubai-projects-title">
      <p className="lasha-eyebrow">{common.listEyebrow}</p>
      <h2 id="dubai-projects-title">{common.listTitle}</h2>
      <ul className="dp-listing-cards">
        {cards.map(([route, project, image]) => (
          <li key={route}>
            <article aria-labelledby={`${route}-card-title`}>
              <Picture slug={image} className="dp-listing-image" sizes="(max-width: 899px) calc(100vw - 2.5rem), 44vw" />
              <p className="dp-listing-category">{common.category}</p>
              <h3 id={`${route}-card-title`}>{project.cardName}</h3>
              <p className="dp-listing-line">{project.cardLine}</p>
              <p className="dp-listing-meta">{project.place}<br />{project.cardStatus}</p>
              <a className="lasha-button lasha-button-primary" href={`#${route}`} onClick={routeLinkClick(onNavigate, route)} aria-label={`${common.exploreProject}: ${project.cardName}`}>
                {common.exploreProject}<LashaArrow length={26} />
              </a>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { lazy, Suspense, useEffect, useState } from "react";

const ResidenceExplorer = lazy(() => import("./components/ResidenceExplorer").then((module) => ({
  default: module.ResidenceExplorer,
})));

const tickerItems = ["PROJECT REVERANCE", "BATUMI", "BROKER ACCESS OPEN"];

const navItems = [
  { key: "home", label: "PROJECT" },
  { key: "why-aixess", label: "WHY AIXESS" },
  { key: "residences", label: "RESIDENCES" },
  { key: "broker-access", label: "BROKER ACCESS" },
  { key: "resources", label: "RESOURCES" },
];

const validRoutes = new Set(navItems.map(({ key }) => key));

function routeFromLocation() {
  if (typeof window === "undefined") return "home";
  const route = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return validRoutes.has(route) ? route : "home";
}

function TickerGroup() {
  return (
    <span className="ticker-group" aria-hidden="true">
      {tickerItems.map((item) => (
        <span className="ticker-item" key={item}>
          {item}<span className="ticker-dot">•</span>
        </span>
      ))}
    </span>
  );
}

function SiteHeader({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal, pageHeader = false }) {
  const navigate = (page) => {
    onToggleMenu(false);
    onNavigate(page);
  };

  return (
    <header className={`site-header ${pageHeader ? "page-site-header" : ""}`}>
      <button className="brand" type="button" aria-label="Go to the AiXESS homepage" onClick={() => navigate("home")}>
        <img src="/assets/aixess-logo-white-cropped.png" alt="AiXESS" />
      </button>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map(({ key, label }) => (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <button className="button button-primary register-button" type="button" onClick={() => onOpenModal("register")}>REGISTER</button>
        <button className="button button-ghost login-button" type="button" onClick={() => onOpenModal("login")}>LOGIN</button>
      </div>

      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => onToggleMenu(!menuOpen)}
      >
        {menuOpen ? "CLOSE" : "MENU"}
      </button>

      <div className={`mobile-nav ${menuOpen ? "is-open" : ""}`} id="mobile-navigation">
        {navItems.map(({ key, label }) => (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {label}
          </button>
        ))}
        <button className="mobile-register" type="button" onClick={() => onOpenModal("register")}>REGISTER</button>
        <button type="button" onClick={() => onOpenModal("login")}>LOGIN</button>
      </div>
    </header>
  );
}

function Modal({ type, onClose, onSwitch }) {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const content = {
    register: {
      eyebrow: "AIXESS BROKER NETWORK",
      title: "Register as a broker.",
      copy: "Tell us where you operate and we’ll prepare your access to Project Reverance.",
      submit: "REQUEST BROKER ACCESS",
    },
    login: {
      eyebrow: "BROKER ACCESS",
      title: "Welcome back.",
      copy: "Sign in to continue to your project materials and active opportunities.",
      submit: "LOGIN",
    },
    materials: {
      eyebrow: "PROJECT REVERANCE",
      title: "Request project materials.",
      copy: "The broker dossier includes current availability, project information and supporting sales material.",
      submit: "REQUEST MATERIALS",
    },
  }[type];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>CLOSE</button>

        {!submitted ? (
          <>
            <p className="modal-eyebrow">{content.eyebrow}</p>
            <h2 id="modal-title">{content.title}</h2>
            <p className="modal-copy">{content.copy}</p>

            <form
              className="access-form"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              {type !== "login" && (
                <label>
                  <span>FULL NAME</span>
                  <input name="name" autoComplete="name" required placeholder="Your name" />
                </label>
              )}
              <label>
                <span>EMAIL ADDRESS</span>
                <input name="email" type="email" autoComplete="email" required placeholder="you@email.com" />
              </label>
              {type === "register" && (
                <label>
                  <span>PRIMARY MARKET</span>
                  <input name="market" required placeholder="City or region" />
                </label>
              )}
              {type === "login" && (
                <label>
                  <span>PASSWORD</span>
                  <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
                </label>
              )}
              <button className="button button-primary modal-submit" type="submit">{content.submit}</button>
            </form>

            {type === "login" && (
              <button className="modal-switch" type="button" onClick={() => onSwitch("register")}>
                NEED BROKER ACCESS? REGISTER
              </button>
            )}
          </>
        ) : (
          <div className="modal-success">
            <p className="modal-eyebrow">REQUEST RECEIVED</p>
            <h2>We’ll be in touch.</h2>
            <p className="modal-copy">
              Your request has been recorded for this MVP. The live connection will be added with the production backend.
            </p>
            <button className="button button-primary" type="button" onClick={onClose}>RETURN TO AIXESS</button>
          </div>
        )}
      </section>
    </div>
  );
}

function PageHeader({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="page-header-wrap">
      <SiteHeader
        currentPage={currentPage}
        menuOpen={menuOpen}
        onToggleMenu={onToggleMenu}
        onNavigate={onNavigate}
        onOpenModal={onOpenModal}
        pageHeader
      />
    </div>
  );
}

function PageIntro({ eyebrow, title, copy, children, image = "/assets/reverance-hero.webp" }) {
  return (
    <section className="page-intro">
      <div className="page-intro-copy">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-intro-copy-text">{copy}</p>
        {children}
      </div>
      <div className="page-intro-media">
        <img src={image} alt="Project Reverance in Batumi" />
        <span className="page-intro-media-label">PROJECT REVERANCE · BATUMI</span>
      </div>
    </section>
  );
}

const companyStats = [
  ["5,000+", "TRUSTED CLIENTS"],
  ["$400M", "GROSS DEVELOPMENT VALUE"],
  ["2,000+", "TOTAL TRANSACTIONS"],
  ["2009", "IN BUSINESS SINCE"],
];

function WhyAixessPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="route-page why-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <PageIntro
          eyebrow="WHY AIXESS"
          title={<>A clearer route<br />to the upside.</>}
          copy="Since 2009, AIXCO has helped clients buy, sell and broker real estate across Europe and the Gulf. Today we bring that discipline to selected emerging-market opportunities."
        >
          <div className="page-cta-row">
            <button className="button button-primary" type="button" onClick={() => onNavigate("residences")}>EXPLORE REVERANCE</button>
            <button className="text-link" type="button" onClick={() => onOpenModal("register")}>BECOME A BROKER <span aria-hidden="true">↗</span></button>
          </div>
        </PageIntro>

        <section className="page-section page-section-stats" aria-labelledby="aixess-track-record">
          <div className="section-heading-row">
            <p className="section-eyebrow">A TRACK RECORD THAT TRAVELS</p>
            <h2 id="aixess-track-record">The numbers behind the network.</h2>
          </div>
          <div className="company-stats-grid">
            {companyStats.map(([value, label]) => (
              <div className="company-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="page-section split-section" aria-labelledby="aixess-philosophy">
          <div>
            <p className="section-eyebrow">OUR PHILOSOPHY</p>
            <h2 id="aixess-philosophy">International reach.<br />Local conviction.</h2>
          </div>
          <div className="section-prose">
            <p>We select fewer opportunities, make the economics legible and stay close to every handover. That means transparent euro pricing, a real local team and a partner who remains accountable after the signature.</p>
            <div className="mini-facts">
              <div><strong>2009</strong><span>FIRST ACQUISITION</span></div>
              <div><strong>$4.2B+</strong><span>VALUE TRANSACTED</span></div>
              <div><strong>90+</strong><span>SKILLED EMPLOYEES</span></div>
            </div>
          </div>
        </section>

        <section className="page-section journey-section" aria-labelledby="aixess-journey">
          <div className="section-heading-row">
            <p className="section-eyebrow">HOW WE WORK</p>
            <h2 id="aixess-journey">A decision path built<br />for momentum.</h2>
          </div>
          <div className="journey-grid">
            {[
              ["01", "BUY AN APARTMENT", "Compare selected homes, book a private tour and reserve with a team that stays with you through ownership."],
              ["02", "BROKER REAL ESTATE", "Introduce qualified buyers, coordinate tours and manage deal flow with a clear, structured process."],
              ["03", "ADMINISTER YOUR PROPERTY", "From documentation and handover to reporting, rental coordination and ongoing administration."],
            ].map(([number, title, copy]) => (
              <article className="journey-card" key={number}>
                <span className="journey-number">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function BrokerAccessPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="route-page broker-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <PageIntro
          eyebrow="BROKER ACCESS"
          title={<>Turn the right<br />brief into a deal.</>}
          copy="AIXCO gives brokers a focused pipeline of selected property opportunities, the materials to sell them with confidence and a team that keeps momentum through close."
          image="/assets/reverance-explorer/building.webp"
        >
          <div className="page-cta-row">
            <button className="button button-primary" type="button" onClick={() => onOpenModal("register")}>REGISTER AS A BROKER</button>
            <button className="text-link" type="button" onClick={() => onNavigate("resources")}>VIEW RESOURCES <span aria-hidden="true">↗</span></button>
          </div>
        </PageIntro>

        <section className="page-section broker-process" aria-labelledby="broker-process-title">
          <div className="section-heading-row">
            <p className="section-eyebrow">THE BROKER PROCESS</p>
            <h2 id="broker-process-title">Less chasing.<br />More closing.</h2>
          </div>
          <div className="process-list">
            {[
              ["01", "ACCESS", "Verified pipeline, current inventory and clear project positioning."],
              ["02", "INTRODUCE", "Match the right opportunity to the right client with presentation-ready material."],
              ["03", "CLOSE", "Structured support from private tour through reservation and handover."],
            ].map(([number, title, copy]) => (
              <div className="process-row" key={number}>
                <span className="process-number">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="process-arrow" aria-hidden="true">↗</span>
              </div>
            ))}
          </div>
        </section>

        <section className="broker-callout" aria-label="Project Reverance broker opportunity">
          <div>
            <p className="section-eyebrow">PROJECT REVERANCE · BATUMI</p>
            <h2>28 selected residences.<br />One sharper proposition.</h2>
          </div>
          <dl className="broker-facts">
            <div><dt>ACCESS</dt><dd>FLOORS 13–14</dd></div>
            <div><dt>COMPLETION</dt><dd>JULY 2028</dd></div>
            <div><dt>POSITION</dt><dd>NEW BOULEVARD</dd></div>
          </dl>
        </section>
      </main>
    </div>
  );
}

const resources = [
  ["01", "REVERANCE BROCHURE", "Project overview, selected apartments and the broker-ready story for Batumi New Boulevard.", "CLIENTS & PARTNERS"],
  ["02", "AIXCO MEDICAL TOURISM GUIDE", "A practical guide to a connected market, prepared for clients who want more from their stay.", "AIXCO GUIDE"],
  ["03", "AIXCO LEISURE ACTIVITIES", "A considered view of the experiences, coastline and city energy around your next opportunity.", "AIXCO GUIDE"],
];

function ResourcesPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="route-page resources-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <PageIntro
          eyebrow="RESOURCES"
          title={<>Make the<br />next move clear.</>}
          copy="The essential AIXCO material for a confident first conversation, a better comparison and a faster decision. Request the current dossier and our team will send the right version for your client."
        >
          <div className="page-cta-row">
            <button className="button button-primary" type="button" onClick={() => onOpenModal("materials")}>REQUEST THE DOSSIER</button>
            <a className="text-link" href="mailto:info@aixco.global">EMAIL AIXCO <span aria-hidden="true">↗</span></a>
          </div>
        </PageIntro>

        <section className="page-section resource-section" aria-labelledby="resource-library">
          <div className="section-heading-row">
            <p className="section-eyebrow">THE LIBRARY</p>
            <h2 id="resource-library">Everything in one<br />place.</h2>
          </div>
          <div className="resource-grid">
            {resources.map(([number, title, copy, tag]) => (
              <article className="resource-card" key={title}>
                <div className="resource-card-top"><span>{number}</span><span>{tag}</span></div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <button className="resource-link" type="button" onClick={() => onOpenModal("materials")}>REQUEST PDF <span aria-hidden="true">↗</span></button>
              </article>
            ))}
          </div>
        </section>

        <section className="page-section faq-section" aria-labelledby="resource-faq">
          <div className="section-heading-row">
            <p className="section-eyebrow">QUICK ANSWERS</p>
            <h2 id="resource-faq">The details<br />clients ask first.</h2>
          </div>
          <div className="faq-list">
            {[
              ["What is the minimum investment?", "Secure a position from €5,000. The team will outline the right route for the client and the selected residence."],
              ["Can foreigners own property in Georgia?", "Yes. Foreign buyers can purchase and own Georgian property with minimal restrictions; AIXCO coordinates the process with local partners."],
              ["What does Reverance offer?", "AIXCO currently offers 28 selected apartments on floors 13 and 14, with completion scheduled for July 2028."],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ResidencesPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="route-page residences-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <section className="residences-route-intro">
          <div>
            <p className="section-eyebrow">PROJECT REVERANCE · BATUMI</p>
            <h1>One building.<br />Your next move.</h1>
          </div>
          <p>Explore the official 3D reconstruction, filter live availability and open a residence detail without leaving the project.</p>
        </section>
        <Suspense fallback={<div className="residence-explorer-loader" role="status">Preparing the interactive 3D explorer…</div>}>
          <ResidenceExplorer onBrokerAccess={() => onOpenModal("register")} />
        </Suspense>
      </main>
    </div>
  );
}

function HomePage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <>
      <section className="hero" id="project">
        <SiteHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />

        <div className="hero-media" aria-hidden="true">
          <img src="/assets/reverance-hero.webp" alt="" />
        </div>

        <div className="hero-copy">
          <h1>
            <span>MOVE THE</span>
            <span>DEAL</span>
            <span>FORWARD<span className="headline-period">.</span></span>
          </h1>
          <span className="accent-rule" aria-hidden="true" />
          <p className="hero-subtitle">A sharper route to premium<br />real-estate opportunities.</p>
          <div className="hero-meta" aria-label="Current project details">
            <span className="meta-project">PROJECT REVERANCE</span>
            <span className="meta-divider" aria-hidden="true" />
            <span>BATUMI</span>
            <span className="meta-dot" aria-hidden="true">•</span>
            <span>BROKER ACCESS OPEN</span>
          </div>
        </div>
      </section>

      <div className="project-ticker" aria-label="Project Reverance, Batumi, broker access open">
        <div className="ticker-track">
          <TickerGroup />
          <TickerGroup />
          <TickerGroup />
          <TickerGroup />
        </div>
      </div>

      <section className="access-section" id="why-aixess">
        <div className="access-copy">
          <p className="section-eyebrow">BROKER NETWORK</p>
          <h2>YOUR ACCESS<br />STARTS HERE.</h2>
        </div>

        <div className="access-actions">
          <button className="button button-primary access-button" type="button" onClick={() => onOpenModal("register")}>
            REGISTER AS A BROKER
          </button>
          <button className="button button-outline-dark access-button" type="button" onClick={() => onOpenModal("materials")}>
            DOWNLOAD PROJECT MATERIALS
          </button>
        </div>

        <div className="project-stats" aria-label="Project Reverance availability">
          <div className="stat stat-residences">
            <strong>28</strong>
            <span>SELECTED<br />RESIDENCES</span>
          </div>
          <span className="stat-divider" aria-hidden="true" />
          <div className="stat stat-completion">
            <span>COMPLETION</span>
            <strong>JULY 2028</strong>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="residence-explorer-loader" role="status">Preparing the interactive 3D explorer…</div>}>
        <ResidenceExplorer onBrokerAccess={() => onOpenModal("register")} />
      </Suspense>
    </>
  );
}

export function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(routeFromLocation);

  const openModal = (type) => {
    setMenuOpen(false);
    setActiveModal(type);
  };

  const navigatePage = (page) => {
    setMenuOpen(false);
    const nextPage = validRoutes.has(page) ? page : "home";
    if (nextPage === currentPage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", nextPage === "home" ? window.location.pathname : `${window.location.pathname}#${nextPage}`);
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const syncRoute = () => {
      setCurrentPage(routeFromLocation());
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  return (
    <main className="site-shell">
      {currentPage === "home" && <HomePage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "why-aixess" && <WhyAixessPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "residences" && <ResidencesPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "broker-access" && <BrokerAccessPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "resources" && <ResourcesPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}

      {activeModal && (
        <Modal key={activeModal} type={activeModal} onClose={() => setActiveModal(null)} onSwitch={setActiveModal} />
      )}
    </main>
  );
}

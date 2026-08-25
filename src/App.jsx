import { lazy, Suspense, useEffect, useState } from "react";

const ResidenceExplorer = lazy(() => import("./components/ResidenceExplorer").then((module) => ({
  default: module.ResidenceExplorer,
})));

const tickerItems = ["PROJECT REVERANCE", "BATUMI", "BROKER ACCESS OPEN"];

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

export function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const openModal = (type) => {
    setMenuOpen(false);
    setActiveModal(type);
  };

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="site-shell">
      <section className="hero" id="project">
        <header className="site-header">
          <button className="brand" type="button" aria-label="Go to the AiXESS homepage" onClick={() => scrollTo("project")}>
            <img src="/assets/aixess-logo-white-cropped.png" alt="AiXESS" />
          </button>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <button type="button" onClick={() => scrollTo("project")}>PROJECT</button>
            <button type="button" onClick={() => scrollTo("why-aixess")}>WHY AIXESS</button>
            <button type="button" onClick={() => scrollTo("residences")}>RESIDENCES</button>
            <button type="button" onClick={() => openModal("register")}>BROKER ACCESS</button>
            <button type="button" onClick={() => openModal("materials")}>RESOURCES</button>
          </nav>

          <div className="header-actions">
            <button className="button button-primary register-button" type="button" onClick={() => openModal("register")}>REGISTER</button>
            <button className="button button-ghost login-button" type="button" onClick={() => openModal("login")}>LOGIN</button>
          </div>

          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "CLOSE" : "MENU"}
          </button>

          <div className={`mobile-nav ${menuOpen ? "is-open" : ""}`} id="mobile-navigation">
            <button type="button" onClick={() => scrollTo("project")}>PROJECT</button>
            <button type="button" onClick={() => scrollTo("why-aixess")}>WHY AIXESS</button>
            <button type="button" onClick={() => scrollTo("residences")}>RESIDENCES</button>
            <button type="button" onClick={() => openModal("register")}>BROKER ACCESS</button>
            <button type="button" onClick={() => openModal("materials")}>RESOURCES</button>
            <button className="mobile-register" type="button" onClick={() => openModal("register")}>REGISTER</button>
            <button type="button" onClick={() => openModal("login")}>LOGIN</button>
          </div>
        </header>

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
          <button className="button button-primary access-button" type="button" onClick={() => openModal("register")}>
            REGISTER AS A BROKER
          </button>
          <button className="button button-outline-dark access-button" type="button" onClick={() => openModal("materials")}>
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
        <ResidenceExplorer onBrokerAccess={() => openModal("register")} />
      </Suspense>

      {activeModal && (
        <Modal key={activeModal} type={activeModal} onClose={() => setActiveModal(null)} onSwitch={setActiveModal} />
      )}
    </main>
  );
}

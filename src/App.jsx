import { lazy, Suspense, useEffect, useState } from "react";
import { CaretDown, Globe } from "@phosphor-icons/react";
import { LanguageProvider, LANGUAGE_OPTIONS, useLanguage } from "./i18n.jsx";

const ResidenceExplorer = lazy(() => import("./components/ResidenceExplorer").then((module) => ({
  default: module.ResidenceExplorer,
})));

const tickerItems = ["projectReverance", "batumi", "brokerAccessOpen"];

const navItems = [
  { key: "home", labelKey: "project" },
  { key: "why-aixess", labelKey: "whyAixess" },
  { key: "residences", labelKey: "residences" },
  { key: "broker-access", labelKey: "brokerAccess" },
  { key: "resources", labelKey: "resources" },
];

const validRoutes = new Set(navItems.map(({ key }) => key));

const WORKWISE_BROKER_PATHS = {
  login: "/realestate/aixco/broker-login",
  register: "/realestate/aixco/broker-signup",
};

function workwiseBrokerUrl(type, locale = "en") {
  return `https://workw.com${WORKWISE_BROKER_PATHS[type]}?lang=${encodeURIComponent(locale)}`;
}

function routeFromLocation() {
  if (typeof window === "undefined") return "home";
  const route = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return validRoutes.has(route) ? route : "home";
}

function TickerGroup() {
  const { t } = useLanguage();
  return (
    <span className="ticker-group" aria-hidden="true">
      {tickerItems.map((key) => (
        <span className="ticker-item" key={key}>
          {t(key)}<span className="ticker-dot">•</span>
        </span>
      ))}
    </span>
  );
}

function SiteHeader({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal, pageHeader = false }) {
  const { t, locale } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const navigate = (page) => {
    onToggleMenu(false);
    onNavigate(page);
  };

  return (
    <header className={`site-header ${pageHeader ? "page-site-header" : ""}`}>
      <button className="brand" type="button" aria-label={t("homeAria")} onClick={() => navigate("home")}>
        <img src="/assets/aixess-logo-white-cropped.png" alt="AiXESS" />
      </button>

      <nav className="desktop-nav" aria-label={t("primaryNavigation")}>
        {navItems.map(({ key, labelKey }) => (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {t(labelKey)}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <a className="button button-primary register-button" href={workwiseBrokerUrl("register", locale)}>{t("register")}</a>
        <a className="button button-ghost login-button" href={workwiseBrokerUrl("login", locale)}>{t("login")}</a>
      </div>

      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => onToggleMenu(!menuOpen)}
      >
        {menuOpen ? t("close") : t("menu")}
      </button>

      <div className={`mobile-nav ${menuOpen ? "is-open" : ""}`} id="mobile-navigation">
        {navItems.map(({ key, labelKey }) => (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {t(labelKey)}
          </button>
        ))}
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <a className="mobile-register" href={workwiseBrokerUrl("register", locale)}>{t("register")}</a>
        <a className="mobile-login" href={workwiseBrokerUrl("login", locale)}>{t("login")}</a>
      </div>
    </header>
  );
}

function LanguageSwitcher({ languageOpen, setLanguageOpen }) {
  const { t, locale, setLocale } = useLanguage();
  useEffect(() => {
    if (!languageOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLanguageOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [languageOpen, setLanguageOpen]);

  const chooseLanguage = (code) => {
    setLocale(code);
    setLanguageOpen(false);
  };

  return (
    <div className="language-switcher">
      <button
        className="language-switcher-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={languageOpen}
        aria-label={`${t("changeLanguage")}: ${locale.toUpperCase()}`}
        onClick={() => setLanguageOpen((open) => !open)}
      >
        <Globe aria-hidden="true" weight="bold" />
        <span>{locale.toUpperCase()}</span>
        <CaretDown aria-hidden="true" weight="bold" />
      </button>
      {languageOpen && (
        <div className="language-switcher-menu" role="listbox" aria-label={t("language")}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={locale === option.code}
              className={locale === option.code ? "is-active" : ""}
              onClick={() => chooseLanguage(option.code)}
            >
              <span>{option.label}</span><small>{option.shortLabel}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ type, onClose, onSwitch }) {
  const { t } = useLanguage();
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
      eyebrow: t("brokerNetwork"),
      title: t("registerModalTitle"),
      copy: t("registerModalCopy"),
      submit: t("requestBrokerAccess"),
    },
    login: {
      eyebrow: t("brokerAccess"),
      title: t("welcomeBack"),
      copy: t("loginModalCopy"),
      submit: t("login"),
    },
    materials: {
      eyebrow: t("projectReverance"),
      title: t("projectMaterials"),
      copy: t("projectMaterialsCopy"),
      submit: t("requestMaterials"),
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
        <button className="modal-close" type="button" onClick={onClose}>{t("closeModal")}</button>

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
                  <span>{t("fullName")}</span>
                  <input name="name" autoComplete="name" required placeholder={t("yourName")} />
                </label>
              )}
              <label>
                <span>{t("emailAddress")}</span>
                <input name="email" type="email" autoComplete="email" required placeholder={t("emailPlaceholder")} />
              </label>
              {type === "register" && (
                <label>
                  <span>{t("primaryMarket")}</span>
                  <input name="market" required placeholder={t("cityOrRegion")} />
                </label>
              )}
              {type === "login" && (
                <label>
                  <span>{t("password")}</span>
                  <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
                </label>
              )}
              <button className="button button-primary modal-submit" type="submit">{content.submit}</button>
            </form>

            {type === "login" && (
              <button className="modal-switch" type="button" onClick={() => onSwitch("register")}>
                {t("needBrokerAccess")}
              </button>
            )}
          </>
        ) : (
          <div className="modal-success">
            <p className="modal-eyebrow">{t("requestReceived")}</p>
            <h2>{t("wellBeInTouch")}</h2>
            <p className="modal-copy">
              {t("requestRecordedCopy")}
            </p>
            <button className="button button-primary" type="button" onClick={onClose}>{t("returnToAixess")}</button>
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
  const { t } = useLanguage();
  return (
    <section className="page-intro">
      <div className="page-intro-copy">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-intro-copy-text">{copy}</p>
        {children}
      </div>
      <div className="page-intro-media">
        <img src={image} alt={t("projectImageAlt")} />
        <span className="page-intro-media-label">{t("projectReveranceBatumi")}</span>
      </div>
    </section>
  );
}

const companyStats = [
  ["5,000+", "trustedClients"],
  ["$400M", "grossDevelopmentValue"],
  ["2,000+", "totalTransactions"],
  ["2009", "inBusinessSince"],
];

function WhyAixessPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  return (
    <div className="route-page why-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <PageIntro
          eyebrow={t("whyAixessEyebrow")}
          title={<>{t("clearerRoute")}<br />{t("toTheUpside")}</>}
          copy={t("whyAixessCopy")}
        >
          <div className="page-cta-row">
            <button className="button button-primary" type="button" onClick={() => onNavigate("residences")}>{t("exploreReverance")}</button>
            <button className="text-link" type="button" onClick={() => onOpenModal("register")}>{t("becomeBroker")} <span aria-hidden="true">↗</span></button>
          </div>
        </PageIntro>

        <section className="page-section page-section-stats" aria-labelledby="aixess-track-record">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("trackRecord")}</p>
            <h2 id="aixess-track-record">{t("numbersBehindNetwork")}</h2>
          </div>
          <div className="company-stats-grid">
            {companyStats.map(([value, label]) => (
              <div className="company-stat" key={label}>
                <strong>{value}</strong>
                <span>{t(label)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="page-section split-section" aria-labelledby="aixess-philosophy">
          <div>
            <p className="section-eyebrow">{t("ourPhilosophy")}</p>
            <h2 id="aixess-philosophy">{t("internationalReach")}<br />{t("localConviction")}</h2>
          </div>
          <div className="section-prose">
            <p>{t("philosophyCopy")}</p>
            <div className="mini-facts">
              <div><strong>2009</strong><span>{t("firstAcquisition")}</span></div>
              <div><strong>$4.2B+</strong><span>{t("valueTransacted")}</span></div>
              <div><strong>90+</strong><span>{t("skilledEmployees")}</span></div>
            </div>
          </div>
        </section>

        <section className="page-section journey-section" aria-labelledby="aixess-journey">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("howWeWork")}</p>
            <h2 id="aixess-journey">{t("decisionPath")}<br />{t("forMomentum")}</h2>
          </div>
          <div className="journey-grid">
            {[
              ["01", t("buyApartment"), t("buyApartmentCopy")],
              ["02", t("brokerRealEstate"), t("brokerRealEstateCopy")],
              ["03", t("administerProperty"), t("administerPropertyCopy")],
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
  const { t } = useLanguage();
  return (
    <div className="route-page broker-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <PageIntro
          eyebrow={t("brokerAccessEyebrow")}
          title={<>{t("turnRight")}<br />{t("briefIntoDeal")}</>}
          copy={t("brokerAccessCopy")}
          image="/assets/reverance-explorer/building.webp"
        >
          <div className="page-cta-row">
            <button className="button button-primary" type="button" onClick={() => onOpenModal("register")}>{t("registerAsBroker")}</button>
            <button className="text-link" type="button" onClick={() => onNavigate("resources")}>{t("viewResources")} <span aria-hidden="true">↗</span></button>
          </div>
        </PageIntro>

        <section className="page-section broker-process" aria-labelledby="broker-process-title">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("brokerProcess")}</p>
            <h2 id="broker-process-title">{t("lessChasing")}<br />{t("moreClosing")}</h2>
          </div>
          <div className="process-list">
            {[
              ["01", t("access"), t("accessCopy")],
              ["02", t("introduce"), t("introduceCopy")],
              ["03", t("closeStep"), t("closeCopy")],
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

        <section className="broker-callout" aria-label={t("projectReveranceBlock")}>
          <div>
            <p className="section-eyebrow">{t("projectReveranceBatumi")}</p>
            <h2>{t("selectedResidencesProposition")}<br />{t("sharperProposition")}</h2>
          </div>
          <dl className="broker-facts">
            <div><dt>{t("access")}</dt><dd>{t("floors1314")}</dd></div>
            <div><dt>{t("completion")}</dt><dd>{t("july2028")}</dd></div>
            <div><dt>{t("position")}</dt><dd>{t("newBoulevard")}</dd></div>
          </dl>
        </section>
      </main>
    </div>
  );
}

const resources = [
  ["01", "resourceBrochureTitle", "resourceBrochureCopy", "resourceClientsTag"],
  ["02", "resourceMedicalTitle", "resourceMedicalCopy", "resourceGuideTag"],
  ["03", "resourceLeisureTitle", "resourceLeisureCopy", "resourceGuideTag"],
];

function ResourcesPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  return (
    <div className="route-page resources-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <PageIntro
          eyebrow={t("resourcesEyebrow")}
          title={<>{t("makeMoveClear")}<br />{t("nextMoveClear")}</>}
          copy={t("resourcesCopy")}
        >
          <div className="page-cta-row">
            <button className="button button-primary" type="button" onClick={() => onOpenModal("materials")}>{t("requestDossier")}</button>
            <a className="text-link" href="mailto:info@aixco.global">{t("emailAixco")} <span aria-hidden="true">↗</span></a>
          </div>
        </PageIntro>

        <section className="page-section resource-section" aria-labelledby="resource-library">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("library")}</p>
            <h2 id="resource-library">{t("everythingOne")}<br />{t("place")}</h2>
          </div>
          <div className="resource-grid">
            {resources.map(([number, titleKey, copyKey, tagKey]) => (
              <article className="resource-card" key={titleKey}>
                <div className="resource-card-top"><span>{number}</span><span>{t(tagKey)}</span></div>
                <h3>{t(titleKey)}</h3>
                <p>{t(copyKey)}</p>
                <button className="resource-link" type="button" onClick={() => onOpenModal("materials")}>{t("requestPdf")} <span aria-hidden="true">↗</span></button>
              </article>
            ))}
          </div>
        </section>

        <section className="page-section faq-section" aria-labelledby="resource-faq">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("quickAnswers")}</p>
            <h2 id="resource-faq">{t("detailsClientsAsk")}<br />{t("clientsAskFirst")}</h2>
          </div>
          <div className="faq-list">
            {[
              [t("minimumInvestmentQuestion"), t("minimumInvestmentAnswer")],
              [t("foreignersOwnQuestion"), t("foreignersOwnAnswer")],
              [t("reveranceOfferQuestion"), t("reveranceOfferAnswer")],
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
  const { t } = useLanguage();
  return (
    <div className="route-page residences-page">
      <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      <main className="page-main">
        <section className="residences-route-intro">
          <div>
            <p className="section-eyebrow">{t("projectReveranceBatumi")}</p>
            <h1>{t("oneBuilding")}<br />{t("yourNextMove")}</h1>
          </div>
          <p>{t("residenceRouteCopy")}</p>
        </section>
        <Suspense fallback={<div className="residence-explorer-loader" role="status">{t("preparingInteractive")}</div>}>
          <ResidenceExplorer onBrokerAccess={() => onOpenModal("register")} />
        </Suspense>
      </main>
    </div>
  );
}

function HomePage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  return (
    <>
      <section className="hero" id="project">
        <SiteHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />

        <div className="hero-media" aria-hidden="true">
          <img src="/assets/reverance-hero.webp" alt="" />
        </div>

        <div className="hero-copy">
          <h1>
            <span>{t("moveThe")}</span>
            <span>{t("deal")}</span>
            <span>{t("forward")}<span className="headline-period">.</span></span>
          </h1>
          <span className="accent-rule" aria-hidden="true" />
          <p className="hero-subtitle">{t("heroSubtitle")}</p>
          <div className="hero-meta" aria-label={t("currentProjectDetails")}>
            <span className="meta-project">{t("projectReverance")}</span>
            <span className="meta-divider" aria-hidden="true" />
            <span>{t("batumi")}</span>
            <span className="meta-dot" aria-hidden="true">•</span>
            <span>{t("brokerAccessOpen")}</span>
          </div>
        </div>
      </section>

      <div className="project-ticker" aria-label={`${t("projectReverance")}, ${t("batumi")}, ${t("brokerAccessOpen")}`}>
        <div className="ticker-track">
          <TickerGroup />
          <TickerGroup />
          <TickerGroup />
          <TickerGroup />
        </div>
      </div>

      <section className="access-section" id="why-aixess">
        <div className="access-copy">
          <p className="section-eyebrow">{t("brokerNetwork")}</p>
          <h2>{t("yourAccess")}<br />{t("startsHere")}</h2>
        </div>

        <div className="access-actions">
          <button className="button button-primary access-button" type="button" onClick={() => onOpenModal("register")}>
            {t("registerAsBroker")}
          </button>
          <button className="button button-outline-dark access-button" type="button" onClick={() => onOpenModal("materials")}>
            {t("downloadMaterials")}
          </button>
        </div>

        <div className="project-stats" aria-label={t("projectAvailability")}>
          <div className="stat stat-residences">
            <strong>28</strong>
            <span>{t("selectedResidences")}</span>
          </div>
          <span className="stat-divider" aria-hidden="true" />
          <div className="stat stat-completion">
            <span>{t("completion")}</span>
            <strong>{t("july2028")}</strong>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="residence-explorer-loader" role="status">{t("preparingInteractive")}</div>}>
        <ResidenceExplorer onBrokerAccess={() => onOpenModal("register")} />
      </Suspense>
    </>
  );
}

function AppContent() {
  const { locale } = useLanguage();
  const [activeModal, setActiveModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(routeFromLocation);

  const openModal = (type) => {
    setMenuOpen(false);
    if (type === "register" || type === "login") {
      window.location.assign(workwiseBrokerUrl(type, locale));
      return;
    }
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

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

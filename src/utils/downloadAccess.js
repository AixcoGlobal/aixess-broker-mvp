export const DOWNLOAD_ACCESS_KEY = "aixess-download-access-v1";
export const AIXCO_DOWNLOAD_ACCESS_KEY = "aixco-download-access-v1";

export const BROCHURES = {
  en: {
    href: "https://www.aixco.global/aixco-global-op2/documents/reverance-brochure-en.pdf",
    fileName: "Reverance-brochure-EN.pdf",
  },
  de: {
    href: "https://www.aixco.global/aixco-global-op2/documents/reverance-brochure-de.pdf",
    fileName: "Reverance-brochure-DE.pdf",
  },
  pl: {
    href: "https://www.aixco.global/aixco-global-op2/documents/reverance-brochure-pl.pdf",
    fileName: "Reverance-brochure-PL.pdf",
  },
  sl: {
    href: "https://www.aixco.global/aixco-global-op2/documents/reverance-brochure-sl.pdf",
    fileName: "Reverance-brochure-SL.pdf",
  },
  ru: {
    href: "https://www.aixco.global/aixco-global-op2/documents/reverance-brochure-ru.pdf",
    fileName: "Reverance-brochure-RU.pdf",
  },
};

export function getBrochureDetails(locale) {
  return BROCHURES[locale] || BROCHURES.en;
}

export function hasDownloadAccess() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(DOWNLOAD_ACCESS_KEY) === "granted" ||
      window.localStorage.getItem(AIXCO_DOWNLOAD_ACCESS_KEY) === "granted"
    );
  } catch {
    return false;
  }
}

export function grantDownloadAccess() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOWNLOAD_ACCESS_KEY, "granted");
    window.localStorage.setItem(AIXCO_DOWNLOAD_ACCESS_KEY, "granted");
  } catch {
    // ignore
  }
}

export function triggerBrochureDownload(locale) {
  if (typeof document === "undefined") return;
  const brochure = getBrochureDetails(locale);
  const link = document.createElement("a");
  link.href = brochure.href;
  link.download = brochure.fileName;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      link.remove();
    } catch {
      // ignore
    }
  }, 250);
}

import { getWorkbookAvailableCount } from "./reveranceInventory.js";

// Homepage project showcase (Option A: featured project + project grid).
// Only projects with a confirmed name and approved imagery belong here.
// Future Dubai projects are added to UPCOMING_PROJECTS once Klem supplies
// their name, renders, pricing and handover date; until then the
// "next on AiXESS" row is not rendered.
export const FEATURED_PROJECT = {
  id: "reverance",
  startingPrice: 45000,
  currency: "EUR",
  downPaymentPercent: 10,
  availableResidences: getWorkbookAvailableCount(),
  completionYear: 2028,
  gallery: [
    {
      src: "/assets/projects/reverance-front-1400.webp",
      srcSet: "/assets/projects/reverance-front-700.webp 700w, /assets/projects/reverance-front-1400.webp 1400w",
      thumb: "/assets/projects/reverance-front-700.webp",
    },
    {
      src: "/assets/reverance-hero-1536.webp",
      srcSet: "/assets/reverance-hero-768.webp 768w, /assets/reverance-hero-1536.webp 1536w",
      thumb: "/assets/reverance-hero-768.webp",
    },
    {
      src: "/assets/projects/reverance-facade-700.webp",
      srcSet: "/assets/projects/reverance-facade-700.webp 700w",
      thumb: "/assets/projects/reverance-facade-700.webp",
    },
  ],
};

/** @type {Array<{ id: string, name: string, location: Record<string, string>, image: string }>} */
export const UPCOMING_PROJECTS = [];

import { useEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/* Time-of-day colour theme, copied from AIXCO.Global v4 (src/components/v4/TimeTheme.tsx and
   time-theme-boot.ts; Kemo, 8 October 2026). Day 06–14h cobalt, afternoon 14–19h sage,
   night 19–06h graphite, by the visitor's local time. index.html sets data-time-theme before
   paint with the same rules; keep the two in sync. */

export const TIME_THEME_STORAGE_KEY = "aixess-time-theme";
export const TIME_THEMES = ["day", "afternoon", "night"];

export function themeForHour(hour) {
  if (hour >= 6 && hour < 14) return "day";
  if (hour >= 14 && hour < 19) return "afternoon";
  return "night";
}

const listeners = new Set();
let state = null;

function readMode() {
  try {
    const stored = window.localStorage.getItem(TIME_THEME_STORAGE_KEY);
    if (TIME_THEMES.includes(stored)) return stored;
  } catch {
    // Storage can be unavailable; fall back to automatic.
  }
  return "auto";
}

const resolve = (mode) => (mode === "auto" ? themeForHour(new Date().getHours()) : mode);

function getState() {
  if (!state) {
    const mode = readMode();
    state = { mode, theme: resolve(mode) };
  }
  return state;
}

/* Theme photos on screen register here so a switch can decode their new versions first. */
const photos = new Set();

export function registerThemePhoto(photo) {
  photos.add(photo);
  return () => photos.delete(photo);
}

/** Starts decoding the given theme's version of every photo near the viewport. */
export function prepareTheme(theme) {
  return Promise.all([...photos].map((photo) => photo.prepare(theme)));
}

const notify = () => listeners.forEach((listener) => listener());
let pendingSwitch = 0;

/* Kemo (13 October 2026): switching felt laggy, with colours catching up one by one. The
   switch is now one compositor cross-fade of the whole page (View Transitions), with every
   colour and photo already in its new state underneath, so nothing trails behind. Browsers
   without View Transitions (and reduced motion) switch instantly. */
function applyTheme(mode, animate) {
  const root = document.documentElement;
  const theme = resolve(mode);
  const current = getState();
  const unchanged = current.mode === mode && current.theme === theme
    && root.dataset.timeTheme === theme && root.dataset.timeThemeMode === mode;
  const ticket = ++pendingSwitch; // also cancels a switch still waiting on its photos
  if (unchanged) return;

  const commit = (sync) => {
    if (ticket !== pendingSwitch) return;
    state = { mode, theme };
    root.dataset.timeTheme = theme;
    root.dataset.timeThemeMode = mode;
    if (sync) flushSync(notify);
    else notify();
  };

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reduce || typeof document.startViewTransition !== "function" || root.dataset.timeTheme === theme) {
    commit(false);
    return;
  }
  // Wait briefly for the new photos (usually already decoded when the menu opened), then fade.
  const ready = Promise.race([prepareTheme(theme), new Promise((done) => window.setTimeout(done, 450))]);
  ready.then(() => {
    if (ticket !== pendingSwitch) return;
    try {
      // Hover-length colour transitions would trail the fade, so they pause until it ends.
      const transition = document.startViewTransition(() => {
        root.classList.add("time-theme-switching");
        commit(true);
      });
      transition.finished.finally(() => root.classList.remove("time-theme-switching"));
    } catch {
      commit(false);
    }
  });
}

export function setTimeThemeMode(mode) {
  try {
    if (mode === "auto") window.localStorage.removeItem(TIME_THEME_STORAGE_KEY);
    else window.localStorage.setItem(TIME_THEME_STORAGE_KEY, mode);
  } catch {
    // The choice still applies for this page view.
  }
  applyTheme(mode, true);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTimeTheme() {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Keeps "auto" in step with the clock while the page stays open. */
export function useAutoClock(mode) {
  useEffect(() => {
    const actual = getState().mode;
    applyTheme(actual, false);
    if (actual !== "auto") return undefined;

    const tick = () => applyTheme("auto", true);
    const interval = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);
}

/** Test hook: forget the cached state so the next read starts from storage again. */
export function resetTimeThemeForTests() {
  state = null;
}

import VERSIONS from "virtual:aixess-asset-versions";

// A public file's URL with its content version ("?v=..."), so the browser can cache it for a
// year and still fetch a replaced file at once (scripts/asset-versions.mjs). Unknown paths,
// and every path in dev and tests, come back unchanged.
export const assetUrl = (path) => (VERSIONS[path] ? `${path}?v=${VERSIONS[path]}` : path);

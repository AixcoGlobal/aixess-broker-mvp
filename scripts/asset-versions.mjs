// Long browser caching for the files in public/ (photos, fonts, data, logos).
//
// Every reference to a public file gets "?v=<content hash>" at build time, and vercel.json
// caches any request carrying ?v= for a year. A replaced photo has a new hash, so visitors
// load the new file at once; an unchanged photo stays in their browser cache.
//
// - Literal paths in src/ and index.html are versioned by the transform below, before Vite
//   hashes the JS and CSS file names, so a new photo also gives the bundle a new name.
// - Paths built at runtime go through assetUrl() (src/assetUrl.js), which reads the
//   "virtual:aixess-asset-versions" map.
// - JSON files in public/data that list image paths are rewritten in dist with versioned
//   paths, and their own hash is taken from the rewritten text.
// A path that is not versioned still works; it is only cached the old way (revalidated).
// Dev and tests get an empty map, so URLs stay plain there.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const VIRTUAL_ID = "virtual:aixess-asset-versions";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const PATH_RE = /(?<![\w.-])\/(?:assets|fonts|brand|data)\/[\w./-]+\.(?:webp|png|jpe?g|svg|gif|avif|woff2?|ttf|otf|json|pdf|sog|txt)(?![\w?])/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const hashOf = (data) => createHash("sha256").update(data).digest("base64url").slice(0, 10);

export function versionPaths(text, versions) {
  return text.replace(PATH_RE, (match) => (versions[match] ? `${match}?v=${versions[match]}` : match));
}

export function assetVersions() {
  let isBuild = false;
  let publicDir = "";
  let outDir = "";
  let versions = {};
  const rewritten = new Map();

  const scan = () => {
    versions = {};
    rewritten.clear();
    const files = walk(publicDir).map((file) => ({ file, url: "/" + path.relative(publicDir, file).split(path.sep).join("/") }));
    const json = files.filter(({ url }) => url.startsWith("/data/") && url.endsWith(".json"));
    for (const { file, url } of files) if (!json.some((j) => j.url === url)) versions[url] = hashOf(readFileSync(file));
    for (const { file, url } of json) {
      const original = readFileSync(file, "utf8");
      const text = versionPaths(original, versions);
      if (text !== original) rewritten.set(url, text);
      versions[url] = hashOf(text);
    }
  };

  return {
    name: "aixess-asset-versions",
    enforce: "pre",
    // CSS pulled in with @import never reaches transform(), so url()s are also versioned in
    // PostCSS, after the imports are inlined.
    config: () => ({
      css: {
        postcss: {
          plugins: [{
            postcssPlugin: "aixess-asset-versions",
            // Once, not Declaration: Vite's own url() rewrite also runs in Once, right after this.
            Once(root) {
              if (!isBuild) return;
              root.walkDecls((decl) => {
                if (decl.value.includes("url(")) decl.value = versionPaths(decl.value, versions);
              });
            },
          }],
        },
      },
    }),
    configResolved(config) {
      isBuild = config.command === "build" && process.env.VITEST === undefined;
      publicDir = config.publicDir;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    buildStart() {
      if (isBuild) scan();
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      return id === RESOLVED_ID ? `export default ${JSON.stringify(isBuild ? versions : {})};` : null;
    },
    transform(code, id) {
      if (!isBuild || id.startsWith("\0") || id.includes("/node_modules/")) return null;
      if (!/\.(?:[cm]?jsx?|css|json)(?:\?|$)/.test(id)) return null;
      const next = versionPaths(code, versions);
      return next === code ? null : { code: next, map: null };
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!isBuild) return html;
        const themed = Object.fromEntries(Object.entries(versions).filter(([url]) => url.startsWith("/assets/themed/dubai-skyline-")));
        return versionPaths(html, versions).replace("/*asset-versions*/{}", JSON.stringify(themed));
      },
    },
    writeBundle() {
      if (!isBuild) return;
      for (const [url, text] of rewritten) writeFileSync(path.join(outDir, url), text);
    },
  };
}

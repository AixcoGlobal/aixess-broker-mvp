// Media for TRESORA and DOWNTOWN ONE: the developers' renderings and maps in public/assets/dubai/
// (WebP only), listed in src/data/dubai-media.json. Language-free: the words are in
// dubai-projects-copy.js and the pictures' descriptions in dubai-projects-images-copy.js.
import MEDIA from "./data/dubai-media.json";

// Responsive sources for a built image: src is the second-smallest width, full the largest.
export function dubaiImage(slug) {
  const meta = MEDIA[slug];
  if (!meta) throw new Error(`Unknown Dubai image: ${slug}`);
  const url = (width) => `/assets/dubai/${slug}-${width}.webp`;
  return {
    src: url(meta.widths[Math.min(1, meta.widths.length - 1)]),
    srcSet: meta.widths.map((width) => `${url(width)} ${width}w`).join(", "),
    full: url(meta.widths[meta.widths.length - 1]),
    width: meta.width,
    height: meta.height,
  };
}

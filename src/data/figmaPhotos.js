import SIZES from "./figma-photo-sizes.json";

// Photos drawn in Lasha's Figma file, imported unchanged by scripts/import-figma-photos.py
// (Kemo, 19 November 2026: the pages match the Figma file pixel for pixel). Every theme shows them.
export const FIGMA_PHOTOS = SIZES;

const url = (name, width) => `/assets/figma/${name}-${width}.webp`;

/** The WebP sources for one Figma photo: src (closest to defaultWidth), srcSet, width, height. */
export function figmaPhoto(name, defaultWidth = 1200) {
  const { width, height, widths } = SIZES[name];
  const fallback = widths.find((w) => w >= defaultWidth) ?? widths.at(-1);
  return { width, height, src: url(name, fallback), srcSet: widths.map((w) => `${url(name, w)} ${w}w`).join(", ") };
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/ResidenceExplorer.css", "utf8");

describe("portrait explorer viewport sizing", () => {
  const portraitStyles = css.slice(css.indexOf("@media (max-width: 1100px) and (orientation: portrait)"));

  it("expands the sticky viewer with the dynamic viewport, not the collapsed-toolbar minimum", () => {
    const sticky = portraitStyles.match(/\.explorer-sticky\s*\{([^}]+)\}/)[1];
    expect(sticky).toMatch(/height:\s*100dvh;/);
    expect(sticky).toMatch(/min-height:\s*100dvh;/);
    expect(sticky).not.toMatch(/100svh/);
  });

  it("lets the model fill the resized viewer instead of keeping a square frame", () => {
    expect(portraitStyles).toMatch(/\.explorer-stage\s*\{[^}]*inset:\s*0;/);
    expect(portraitStyles).toMatch(/\.explorer-model-host\s*\{[^}]*height:\s*100%;/);
    expect(portraitStyles).toMatch(/\.building-map,[\s\S]*?height:\s*100%;\s*aspect-ratio:\s*auto;/);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Ignore the English fallback when checking completeness: no locale should need it.
const source = readFileSync("src/i18n.jsx", "utf8");
const definitions = source.slice(source.indexOf("const ENGLISH"), source.indexOf("const LanguageContext"));
const { ENGLISH, TRANSLATIONS } = new Function(`${definitions.replaceAll("...ENGLISH,", "")} return { ENGLISH, TRANSLATIONS };`)();
const variables = (text) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();

describe("translation coverage", () => {
  it("interpolates the selected building in every model badge", () => {
    for (const labels of [ENGLISH, ...Object.values(TRANSLATIONS)]) {
      expect(variables(labels.officialReconstruction)).toEqual(["block"]);
      expect(labels.officialReconstruction.replace(/\{\{block\}\}/g, "B")).not.toMatch(/[{}]/);
    }
  });
  it("defines every literal label used by the interface", () => {
    for (const file of ["src/App.jsx", "src/components/ResidenceExplorer.jsx", "src/components/Reverance3D.jsx"]) {
      const code = readFileSync(file, "utf8");
      const keys = [...code.matchAll(/\bt\(\s*"([^"]+)"/g)].map((match) => match[1]);
      expect(keys.filter((key) => !(key in ENGLISH)), file).toEqual([]);
    }
  });

  for (const locale of ["de", "pl", "sl", "ru"]) {
    it(`translates every label and preserves interpolation values in ${locale}`, () => {
      for (const [key, english] of Object.entries(ENGLISH)) {
        expect(TRANSLATIONS[locale][key], `${locale}.${key}`).toBeTruthy();
        expect(variables(TRANSLATIONS[locale][key]), `${locale}.${key}`).toEqual(variables(english));
      }
    });
  }
});

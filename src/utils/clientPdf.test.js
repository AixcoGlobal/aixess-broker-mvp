import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { CALCULATORS } from "./calculators.js";
import { CALCULATOR_APARTMENTS } from "../data/calculatorApartments.js";
import { CLIENT_PDF_COPY } from "../client-pdf-copy.js";
import { generateClientPdf, PDF_FONT_FILES } from "./clientPdf.js";

const loadAssets = async () => ({
  fonts: await Promise.all(PDF_FONT_FILES.map(file => readFile(`public/fonts/client-pdf/${file}`))),
  logo: await readFile("public/assets/aixess-logo-white-cropped.png"),
  plan: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  points: [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 40 }, { x: 20, y: 40 }],
});
const options = { locale: "en", calculatorId: "payment", values: [90000, 10, 30, 60, 24], apartmentCode: "A1305" };

describe("client-facing PDF", () => {
  it.each(Object.keys(CLIENT_PDF_COPY).flatMap(locale => CALCULATORS.map(calc => [locale, calc])))("generates a localized %s %j PDF", async (locale, calc) => {
    const result = await generateClientPdf({ ...options, locale, calculatorId: calc.id, values: calc.defaults, clientName: "Łukasz Müller · Жан", clientAddress: "Šmartinska cesta 12, Ljubljana" }, { loadAssets });
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getTitle()).toContain("AiXESS");
    expect(result.filename).toBe(`aixess-reverance-A1305-${calc.id}-${locale}.pdf`);
  });
  it.each([
    { apartmentCode: "B1401" }, { locale: "xx" }, { clientName: "x".repeat(101) },
    { clientAddress: "x".repeat(301) }, { values: [90000, 10, 30, 50, 24] },
    { values: [90000, 10, 30, 60, ""] },
  ])("rejects invalid details before loading assets: %j", async overrides => {
    await expect(generateClientPdf({ ...options, ...overrides }, { loadAssets: () => { throw Error("must not load"); } })).rejects.toThrow("invalid");
  });
  it("reports unsupported glyphs instead of silently losing client information", async () => {
    await expect(generateClientPdf({ ...options, clientName: "😀" }, { loadAssets })).rejects.toThrow("glyph");
  });
  it("accepts maximum-length Cyrillic client information", async () => {
    const { bytes } = await generateClientPdf({ ...options, locale: "ru", clientName: "Ж".repeat(100), clientAddress: "Ж".repeat(300) }, { loadAssets });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });
  it("uses exactly the approved calculator shortlist without assigning prices", () => {
    expect(CALCULATOR_APARTMENTS.map(unit => unit.code)).toEqual(["A1305", "A1306", "A1307", "A1308", "A1309", "A1310", "A1401", "A1405", "A1407", "A1408"]);
    expect(CALCULATOR_APARTMENTS.every(unit => unit.block === "A" && [13, 14].includes(unit.floor) && !("price" in unit))).toBe(true);
  });
  it("has complete translated PDF and form labels", () => {
    for (const copy of Object.values(CLIENT_PDF_COPY)) {
      expect(Object.keys(copy)).toEqual(Object.keys(CLIENT_PDF_COPY.en));
      expect(Object.values(copy).every(value => typeof value === "string" && value.trim())).toBe(true);
    }
  });
});

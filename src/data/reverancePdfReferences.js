import { assetUrl } from "../assetUrl.js";
// Visual references extracted from the supplied Reverance renders and
// floorplans dossier. Workbook data remains authoritative for status, area,
// and price; these references only make the unit detail visuals local and
// deterministic for the 28 owned / Golden Premium apartments in the dossier.
const PDF_REFERENCE_CODES = [
  "A1406", "B1401", "B1310", "B1306", "A1307", "B1408", "B1305",
  "B1405", "B1308", "A1305", "A1310", "A1308", "A1306", "B1309",
  "A1407", "B1406", "A1301", "A1410", "B1409", "A1405", "A1309",
  "A1401", "B1407", "A1409", "B1307", "A1408", "B1410", "B1301",
];

export const REVERANCE_PDF_REFERENCE_CODES = Object.freeze(PDF_REFERENCE_CODES);

const REFERENCES = new Map(
  PDF_REFERENCE_CODES.map((code) => [code, Object.freeze({
    image2d: assetUrl(`/assets/reverance-pdf/${code}-plan.webp`),
    image3d: assetUrl(`/assets/reverance-pdf/${code}-render.webp`),
  })]),
);

export function getReverancePdfReference(code) {
  return REFERENCES.get(String(code || "")) || null;
}

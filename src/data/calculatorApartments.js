// Approved calculator-only shortlist supplied on 21 September 2026.
// Prices are deliberately omitted: area and selection are not a unit quote.
export const CALCULATOR_APARTMENTS = [
  ["A1305", 13, 32.4], ["A1306", 13, 32.3], ["A1307", 13, 32.4],
  ["A1308", 13, 32.3], ["A1309", 13, 32.4], ["A1310", 13, 32.3],
  ["A1401", 14, 46.4], ["A1405", 14, 32.4], ["A1407", 14, 32.4], ["A1408", 14, 32.3],
].map(([code, floor, area]) => ({ code, floor, area, block: "A" }));

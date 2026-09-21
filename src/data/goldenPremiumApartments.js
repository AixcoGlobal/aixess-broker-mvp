// Golden Premium inventory supplied in the premium-apartment workbook.
// Only these codes are premium. This newer workbook overrides the older
// stock ledger's status for overlapping block + apartment codes.
const AMENITIES = Object.freeze(["24/7 Security", "Gym", "Swimming Pool"]);

export const GOLDEN_PREMIUM_APARTMENTS = Object.freeze([
  { code: "A1301", building: "A", floor: 13, area: 46.4, price: 74704, status: "reserved", amenities: AMENITIES },
  { code: "A1305", building: "A", floor: 13, area: 32.4, price: 52164, status: "available", amenities: AMENITIES },
  { code: "A1306", building: "A", floor: 13, area: 32.3, price: 52003, status: "available", amenities: AMENITIES },
  { code: "A1307", building: "A", floor: 13, area: 32.4, price: 52164, status: "available", amenities: AMENITIES },
  { code: "A1308", building: "A", floor: 13, area: 32.3, price: 52003, status: "available", amenities: AMENITIES },
  { code: "A1309", building: "A", floor: 13, area: 32.4, price: 52164, status: "available", amenities: AMENITIES },
  { code: "A1310", building: "A", floor: 13, area: 32.3, price: 52003, status: "available", amenities: AMENITIES },
  { code: "A1401", building: "A", floor: 14, area: 46.4, price: 76885, status: "available", amenities: AMENITIES },
  { code: "A1405", building: "A", floor: 14, area: 32.4, price: 53687, status: "available", amenities: AMENITIES },
  { code: "A1406", building: "A", floor: 14, area: 32.3, price: 53521, status: "reserved", amenities: AMENITIES },
  { code: "A1407", building: "A", floor: 14, area: 32.4, price: 53687, status: "available", amenities: AMENITIES },
  { code: "A1408", building: "A", floor: 14, area: 32.3, price: 53521, status: "available", amenities: AMENITIES },
  { code: "A1409", building: "A", floor: 14, area: 32.4, price: 53687, status: "reserved", amenities: AMENITIES },
  { code: "A1410", building: "A", floor: 14, area: 32.3, price: 53521, status: "reserved", amenities: AMENITIES },
  { code: "B1301", building: "B", floor: 13, area: 46.4, price: 72709, status: "available", amenities: AMENITIES },
  { code: "B1305", building: "B", floor: 13, area: 32.4, price: 50771, status: "reserved", amenities: AMENITIES },
  { code: "B1306", building: "B", floor: 13, area: 32.3, price: 50614, status: "reserved", amenities: AMENITIES },
  { code: "B1307", building: "B", floor: 13, area: 32.4, price: 50771, status: "available", amenities: AMENITIES },
  { code: "B1308", building: "B", floor: 13, area: 32.3, price: 50614, status: "available", amenities: AMENITIES },
  { code: "B1309", building: "B", floor: 13, area: 32.4, price: 50771, status: "available", amenities: AMENITIES },
  { code: "B1310", building: "B", floor: 13, area: 32.3, price: 50614, status: "available", amenities: AMENITIES },
  { code: "B1401", building: "B", floor: 14, area: 46.4, price: 74704, status: "available", amenities: AMENITIES },
  { code: "B1405", building: "B", floor: 14, area: 32.4, price: 52164, status: "available", amenities: AMENITIES },
  { code: "B1406", building: "B", floor: 14, area: 32.3, price: 52003, status: "available", amenities: AMENITIES },
  { code: "B1407", building: "B", floor: 14, area: 32.4, price: 52164, status: "available", amenities: AMENITIES },
  { code: "B1408", building: "B", floor: 14, area: 32.3, price: 52003, status: "available", amenities: AMENITIES },
  { code: "B1409", building: "B", floor: 14, area: 32.4, price: 52164, status: "available", amenities: AMENITIES },
  { code: "B1410", building: "B", floor: 14, area: 32.3, price: 52003, status: "available", amenities: AMENITIES },
]);

export const GOLDEN_PREMIUM_SUMMARY = Object.freeze({
  total: GOLDEN_PREMIUM_APARTMENTS.length,
  available: GOLDEN_PREMIUM_APARTMENTS.filter((unit) => unit.status === "available").length,
  reserved: GOLDEN_PREMIUM_APARTMENTS.filter((unit) => unit.status === "reserved").length,
});

const BY_CODE = new Map(GOLDEN_PREMIUM_APARTMENTS.map((unit) => [unit.code, unit]));

export function getGoldenPremiumUnit(code) {
  return BY_CODE.get(String(code || "")) || null;
}

export function getGoldenPremiumAvailableCount() {
  return GOLDEN_PREMIUM_SUMMARY.available;
}

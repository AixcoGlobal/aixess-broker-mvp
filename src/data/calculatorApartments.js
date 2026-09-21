import { FINAL_ROWS } from "./reveranceInventory.js";
import { GOLDEN_PREMIUM_APARTMENTS, getGoldenPremiumUnit } from "./goldenPremiumApartments.js";

// Both owner workbooks, deduplicated by block + number. Selection is not a quote.
export const CALCULATOR_APARTMENTS = [
  ...FINAL_ROWS.filter(([id, block, , , status]) => status === "Available" && !getGoldenPremiumUnit(`${block}${id}`))
    .map(([id, block, floor, area]) => ({ code: `${block}${id}`, block, floor, area })),
  ...GOLDEN_PREMIUM_APARTMENTS.filter(unit => unit.status === "available")
    .map(({ code, building, floor, area }) => ({ code, block: building, floor, area })),
];

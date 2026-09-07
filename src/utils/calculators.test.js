import { describe, expect, it } from "vitest";
import { CALCULATORS, calculateScenario } from "./calculators.js";
import { NETWORK_COPY } from "../network-copy.js";
import { CALCULATOR_COPY } from "../calculator-copy.js";

describe("owner-supplied calculator formulas", () => {
  it("matches the supplied payment example", () => {
    expect(calculateScenario("payment", [90000, 10, 30, 60, 24]).results).toEqual([9000, 27000, 1125, 54000]);
  });
  it("adjusts rent for occupancy, tax and annual costs", () => {
    const result = calculateScenario("yield", [90000, 674, 500, 1, 100]).results;
    expect(result[0]).toBe(8088);
    expect(result[1]).toBeCloseTo(.0898666667);
    expect(result[2]).toBeCloseTo(7507.12);
    expect(result[3]).toBeCloseTo(.0834124444);
    expect(calculateScenario("yield", [90000, 674, 500, 1, 0]).results).toEqual([0, 0, -500, -500 / 90000]);
  });
  it("calculates amortization and supports zero interest and no borrowing", () => {
    const result = calculateScenario("finance", [90000, 60, 9, 20]).results;
    expect(result[0]).toBe(54000);
    expect(result[1]).toBeCloseTo(485.852016, 4);
    expect(result[3]).toBeCloseTo(result[1] * 240 - 54000);
    expect(calculateScenario("finance", [90000, 60, 0, 20]).results).toEqual([54000, 225, 2700, 0]);
    expect(calculateScenario("finance", [90000, 0, 9, 20]).results).toEqual([0, 0, 0, 0]);
    expect(calculateScenario("finance", [90000, 60, 1e-12, 20]).results[1]).toBeCloseTo(225);
  });
  it("compounds growth and allows a decline", () => {
    const result = calculateScenario("growth", [90000, 5, 10, 36000]).results;
    expect(result[0]).toBeCloseTo(146600.5164, 3);
    expect(result[1]).toBeCloseTo(56600.5164, 3);
    expect(calculateScenario("growth", [100000, -10, 2, 40000]).results).toEqual([81000, -19000, -.19, -.475]);
  });
  it.each([
    ["payment", [90000, 10, 30, 50, 24], "total"],
    ["payment", [90000, 10, 30, 60, 0], "positive"],
    ["yield", [0, 674, 500, 1, 100], "positive"],
    ["yield", [90000, 674, 500, 1, 101], "percentage"],
    ["yield", [90000, -1, 500, 1, 100], "nonnegative"],
    ["finance", [90000, 60, 9, 1.5], "integer"],
    ["growth", [90000, -100, 10, 36000], "growth"],
    ["growth", [90000, 100, 10000, 36000], "overflow"],
    ["finance", [90000, 60, "", 20], "required"],
    ["finance", [90000, 60, Infinity, 20], "required"],
  ])("rejects invalid %s scenarios", (id, values, error) => {
    expect(calculateScenario(id, values)).toEqual({ error });
  });
  it("exposes precisely the four calculators selected in the final document", () => {
    expect(CALCULATORS.map(c => c.id)).toEqual(["payment", "yield", "finance", "growth"]);
  });
});

function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
  expect(typeof value).toBe("string");
  expect(value.trim()).not.toBe("");
  return "string";
}

describe("new content translation coverage", () => {
  for (const collection of [NETWORK_COPY, CALCULATOR_COPY]) {
    for (const locale of ["de", "pl", "sl", "ru"]) {
      it(`has complete ${locale} copy without fallback`, () => {
        expect(shape(collection[locale])).toEqual(shape(collection.en));
      });
    }
  }
});

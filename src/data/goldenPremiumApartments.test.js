import { describe, expect, it } from "vitest";
import {
  GOLDEN_PREMIUM_APARTMENTS,
  GOLDEN_PREMIUM_SUMMARY,
  getGoldenPremiumUnit,
} from "./goldenPremiumApartments";

describe("Golden Premium inventory", () => {
  it("matches the supplied 28-unit premium workbook summary", () => {
    expect(GOLDEN_PREMIUM_APARTMENTS).toHaveLength(28);
    expect(GOLDEN_PREMIUM_SUMMARY).toEqual({ total: 28, available: 22, reserved: 6 });
    expect(new Set(GOLDEN_PREMIUM_APARTMENTS.map((unit) => unit.code)).size).toBe(28);
    expect(GOLDEN_PREMIUM_APARTMENTS.every((unit) => [13, 14].includes(unit.floor))).toBe(true);
  });

  it("keeps premium statuses and reference prices separate from general stock", () => {
    expect(getGoldenPremiumUnit("B1305")).toMatchObject({ status: "reserved", price: 50771 });
    expect(getGoldenPremiumUnit("B1306")).toMatchObject({ status: "reserved", price: 50614 });
    expect(getGoldenPremiumUnit("A1305")).toMatchObject({ status: "available", price: 52164 });
    expect(getGoldenPremiumUnit("not-a-unit")).toBeNull();
  });
});

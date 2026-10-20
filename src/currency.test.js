import { describe, expect, it } from "vitest";
import { formatEurSourcePrice, formatPrice, localizePrices } from "./currency.js";

describe("property currency", () => {
  it("shows USD in English, Polish and Russian and converted euros in German and Slovenian", () => {
    expect(formatPrice(59000, "en")).toBe("$59,000");
    expect(formatPrice(5900, "en", "k")).toBe("$5.9K");
    expect(formatPrice(59000, "de").replace(/\s/g, " ")).toBe("52.600 €");
    expect(formatPrice(5900, "sl").replace(/\s/g, " ")).toBe("5300 €");
    expect(formatPrice(59000, "ru").replace(/\s/g, " ")).toBe("59 000 $");
  });

  it("keeps workbook euro prices in euro locales and converts them elsewhere", () => {
    expect(formatEurSourcePrice(52164, "en")).toBe("$58,600");
    expect(formatEurSourcePrice(52164, "de").replace(/\s/g, " ")).toBe("52.164 €");
  });

  it("fills price tokens in copy", () => {
    expect(localizePrices("From {{usd:5900}} ({{usd:59000:k}})", "en")).toBe("From $5,900 ($59K)");
  });
});

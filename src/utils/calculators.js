// Formulas and examples ported from the owner's AiXESS_Calculator_Package.
export const CALCULATORS = [
  { id: "payment", fields: ["price", "down", "construction", "handover", "months"], defaults: [90000, 10, 30, 60, 24], formats: ["currency", "currency", "currency", "currency"] },
  { id: "yield", fields: ["price", "rent", "costs", "tax", "occupancy"], defaults: [90000, 674, 500, 1, 100], formats: ["currency", "percent", "currency", "percent"] },
  { id: "finance", fields: ["price", "financed", "interest", "years"], defaults: [90000, 60, 9, 20], formats: ["currency", "currency", "currency", "currency"] },
  { id: "growth", fields: ["value", "growth", "horizon", "cash"], defaults: [90000, 5, 10, 36000], formats: ["currency", "currency", "percent", "ratio"] },
];

export function calculateScenario(id, raw) {
  const definition = CALCULATORS.find(calc => calc.id === id);
  if (!definition) throw new Error("Unknown calculator");
  if (raw.length !== definition.fields.length || raw.some(value => String(value).trim() === "" || !Number.isFinite(Number(value)))) return { error: "required" };
  const values = raw.map(Number);
  const inputs = Object.fromEntries(definition.fields.map((field, i) => [field, values[i]]));
  for (const [field, value] of Object.entries(inputs)) {
    if (["price", "value", "cash", "months", "years", "horizon"].includes(field) && value <= 0) return { error: "positive" };
    if (["months", "years", "horizon"].includes(field) && !Number.isInteger(value)) return { error: "integer" };
    if (["down", "construction", "handover", "tax", "occupancy", "financed"].includes(field) && (value < 0 || value > 100)) return { error: "percentage" };
    if (field !== "growth" && value < 0) return { error: "nonnegative" };
    if (field === "growth" && value <= -100) return { error: "growth" };
  }
  let results;
  if (id === "payment") {
    const { price, down, construction, handover, months } = inputs;
    if (Math.abs(down + construction + handover - 100) > 1e-8) return { error: "total" };
    results = [price * down / 100, price * construction / 100, price * construction / 100 / months, price * handover / 100];
  } else if (id === "yield") {
    const { price, rent, occupancy, tax, costs } = inputs;
    const annual = rent * 12 * occupancy / 100;
    const net = annual * (1 - tax / 100) - costs;
    results = [annual, annual / price, net, net / price];
  } else if (id === "finance") {
    const { price, financed, interest, years } = inputs;
    const loan = price * financed / 100;
    const rate = interest / 100 / 12;
    const months = years * 12;
    // Algebraically equivalent amortization formula, stable for small rates.
    const payment = rate === 0 ? loan / months : loan * rate / -Math.expm1(-months * Math.log1p(rate));
    results = [loan, payment, payment * 12, Math.max(0, payment * months - loan)];
  } else {
    const { value, growth, horizon, cash } = inputs;
    const future = value * (1 + growth / 100) ** horizon;
    const gain = future - value;
    results = [future, gain, gain / value, gain / cash];
  }
  if (results.some(value => !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) return { error: "overflow" };
  return { results };
}

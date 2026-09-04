import { describe, expect, it } from "vitest";
import snapshot from "../../public/data/reverance-a.json";
import { applyWorkbookInventory, FINAL_ROWS, OWNED_ROWS } from "./reveranceInventory";

function summarize(units) {
  return units.reduce((result, unit) => {
    result[unit.status] = (result[unit.status] || 0) + 1;
    return result;
  }, {});
}

describe("Reverance workbook inventory", () => {
  it("keeps the supplied workbook rows auditable", () => {
    expect(FINAL_ROWS).toHaveLength(189);
    expect(OWNED_ROWS).toHaveLength(28);
    expect(FINAL_ROWS.every((row) => row[1] === "A" || row[1] === "B")).toBe(true);
  });

  it("builds complete, block-qualified inventory for both towers", () => {
    const next = applyWorkbookInventory(snapshot);
    expect(next.inventoryComplete).toBe(true);
    expect(next.blocks.map(({ id }) => id)).toEqual(["ReveranceA", "ReveranceB"]);

    const [a, b] = next.blocks.map((block) => block.floors.flatMap((floor) => floor.units));
    expect(a).toHaveLength(90);
    expect(b).toHaveLength(127);
    expect(summarize(a)).toEqual({ available: 62, reserved: 4, unavailable: 24 });
    expect(summarize(b)).toEqual({ available: 103, unavailable: 24 });
    expect(a.find((unit) => unit.name === "1301")).toMatchObject({ status: "reserved", block: "A" });
    expect(b.find((unit) => unit.name === "1301")).toMatchObject({ status: "available", block: "B", blockId: "ReveranceB" });
    expect(a.find((unit) => unit.name === "1501")).toMatchObject({ status: "unavailable" });
  });
});

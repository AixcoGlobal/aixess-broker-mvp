import { describe, expect, it } from "vitest";
import snapshot from "../../public/data/reverance-a.json";
import { applyWorkbookInventory, getWorkbookAvailableCount, FINAL_ROWS, OWNED_ROWS } from "./reveranceInventory";

function summarize(units) {
  return units.reduce((result, unit) => {
    result[unit.status] = (result[unit.status] || 0) + 1;
    return result;
  }, {});
}

describe("Reverance workbook inventory", () => {
  it("uses the explorer's available inventory for the marketing total", () => {
    const available = applyWorkbookInventory(snapshot).blocks.flatMap(block => block.floors.flatMap(floor => floor.units)).filter(unit => unit.status === "available");
    expect(getWorkbookAvailableCount()).toBe(163);
    expect(getWorkbookAvailableCount()).toBe(available.length);
  });
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
    expect(a).toHaveLength(180);
    expect(b).toHaveLength(180);
    expect(summarize(a)).toEqual({ available: 62, reserved: 4, unavailable: 24, sold: 90 });
    expect(summarize(b)).toEqual({ available: 101, reserved: 2, unavailable: 24, sold: 53 });
    expect(b.find(unit => unit.name === "1305").status).toBe("reserved");
    expect(b.find(unit => unit.name === "1306").status).toBe("reserved");
    expect(a.find((unit) => unit.name === "1301")).toMatchObject({ status: "reserved", block: "A" });
    expect(b.find((unit) => unit.name === "1301")).toMatchObject({ status: "available", block: "B", blockId: "ReveranceB" });
    expect(a.find((unit) => unit.name === "1501")).toMatchObject({ status: "unavailable" });
    expect(a.find((unit) => unit.name === "204")).toMatchObject({ status: "sold" });
    expect(b.find((unit) => unit.name === "204")).toMatchObject({ status: "available", totalArea: 68.3 });
    expect(next.blocks[0].floors[8].shapes[0].points).not.toEqual(next.blocks[1].floors[8].shapes[0].points);
    for (const block of next.blocks) {
      expect(block.floors.every(floor => floor.units.length === 12)).toBe(true);
      expect(new Set(block.floors.flatMap(floor => floor.units.map(unit => unit.id))).size).toBe(180);
    }
  });
});

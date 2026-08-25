import { describe, expect, it, vi } from "vitest";
import {
  getFloorSummary,
  getStatusLabel,
  loadLiveFloor,
  loadResidenceSnapshot,
  mergeFloorUnits,
  normalizeLiveUnit,
  normalizeStatus,
  validateSnapshot,
} from "./reveranceApi";

const validSnapshot = {
  schemaVersion: 1,
  buildingImage: "/building.webp",
  buildingShapes: [],
  floors: [{ number: 4, shapes: [], units: [] }],
};

describe("Reverance data adapter", () => {
  it("normalizes supported and unknown statuses", () => {
    expect(normalizeStatus("AVAILABLE")).toBe("available");
    expect(normalizeStatus("held")).toBe("unavailable");
    expect(getStatusLabel("reserved")).toBe("Reserved");
  });

  it("normalizes live API fields and nested areas", () => {
    expect(normalizeLiveUnit({
      id: "411",
      name: 411,
      status: "available",
      image_2d: "/411.png",
      floor: "4",
      rooms: "3",
      bedrooms: "1",
      total_area: "51.25",
      areas: [{ id: "1", type: "bedroom", type_label: "Bedroom", size: "12.4" }],
    })).toMatchObject({
      id: 411,
      name: "411",
      status: "available",
      image2d: "/411.png",
      floor: 4,
      rooms: 3,
      bedrooms: 1,
      totalArea: 51.25,
      areas: [{ id: 1, type: "bedroom", label: "Bedroom", size: 12.4 }],
    });
  });

  it("rejects incomplete snapshots", () => {
    expect(() => validateSnapshot(null)).toThrow("Unsupported residence data format");
    expect(() => validateSnapshot({ schemaVersion: 1, floors: [] })).toThrow("Residence data is incomplete");
    expect(validateSnapshot(validSnapshot)).toBe(validSnapshot);
  });

  it("loads and validates the local snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validSnapshot,
    });

    await expect(loadResidenceSnapshot({ fetcher })).resolves.toBe(validSnapshot);
    expect(fetcher).toHaveBeenCalledWith("/data/reverance-a.json", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("loads live floor inventory from the expected block endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { flats: [{ id: 1, name: "411", status: "available", floor: 4 }] } }),
    });

    const units = await loadLiveFloor("ReveranceA", 4, { fetcher });
    expect(units[0]).toMatchObject({ name: "411", status: "available", floor: 4 });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.otium.ge/api/floors/ReveranceA/4");
  });

  it("surfaces invalid live inventory without corrupting the snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    await expect(loadLiveFloor("ReveranceA", 4, { fetcher })).rejects.toThrow("live floor inventory response is invalid");
  });

  it("merges live status changes and newly published residences in numeric order", () => {
    const snapshotUnits = [
      { id: 2, name: "412", status: "reserved" },
      { id: 1, name: "411", status: "available" },
    ];
    const liveUnits = [
      { id: 2, name: "412", status: "available" },
      { id: 3, name: "413", status: "reserved" },
    ];

    expect(mergeFloorUnits(snapshotUnits, liveUnits)).toEqual([
      snapshotUnits[1],
      liveUnits[0],
      liveUnits[1],
    ]);
  });

  it("summarizes all inventory states", () => {
    expect(getFloorSummary({ units: [
      { status: "available" },
      { status: "reserved" },
      { status: "sold" },
      { status: "mystery" },
    ] })).toEqual({ total: 4, available: 1, reserved: 1, sold: 1, unavailable: 1 });
  });
});

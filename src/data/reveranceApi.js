import { applyWorkbookInventory } from "./reveranceInventory";

const SNAPSHOT_URL = "/data/reverance-a.json";
const LIVE_API_ROOT = "https://api.otium.ge/api";
const REQUEST_TIMEOUT_MS = 7000;

export const UNIT_STATUS = Object.freeze({
  available: "available",
  reserved: "reserved",
  sold: "sold",
  unavailable: "unavailable",
});

const STATUS_LABELS = Object.freeze({
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  unavailable: "Unavailable",
});

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeStatus(status) {
  const value = String(status || "unavailable").toLowerCase();
  return Object.hasOwn(UNIT_STATUS, value) ? value : UNIT_STATUS.unavailable;
}

export function getStatusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)];
}

export function normalizeLiveUnit(unit) {
  return {
    id: toNumber(unit.id),
    name: String(unit.name || ""),
    status: normalizeStatus(unit.status),
    price: unit.price ?? null,
    image2d: unit.image_2d || unit.image2d || null,
    image3d: unit.image_3d || unit.image3d || null,
    floor: toNumber(unit.floor),
    rooms: toNumber(unit.rooms),
    bedrooms: toNumber(unit.bedrooms),
    totalArea: toNumber(unit.total_area ?? unit.totalArea),
    areas: (unit.areas || []).map((area) => ({
      id: toNumber(area.id),
      type: String(area.type || "other"),
      label: String(area.type_label || area.label || area.type || "Area"),
      size: toNumber(area.size),
    })),
  };
}

export function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1) throw new Error("Unsupported residence data format.");
  if (!Array.isArray(snapshot.buildingShapes) || !Array.isArray(snapshot.floors)) {
    throw new Error("Residence data is incomplete.");
  }
  if (!snapshot.buildingImage || snapshot.floors.length === 0) {
    throw new Error("Residence assets are missing.");
  }
  return snapshot;
}

async function fetchJson(url, { fetcher = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (typeof fetcher !== "function") throw new Error("Network access is unavailable.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The residence service timed out.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadResidenceSnapshot(options = {}) {
  const snapshot = validateSnapshot(await fetchJson(SNAPSHOT_URL, options));
  // Keep the adapter's object identity for lightweight callers/tests while
  // enriching the official site snapshot with the workbook's two-block data.
  return snapshot.blockId ? applyWorkbookInventory(snapshot) : snapshot;
}

export async function loadLiveFloor(blockId, floorNumber, options = {}) {
  const payload = await fetchJson(
    `${LIVE_API_ROOT}/floors/${encodeURIComponent(blockId)}/${encodeURIComponent(floorNumber)}`,
    options,
  );

  if (!payload?.data || !Array.isArray(payload.data.flats)) {
    throw new Error("The live floor inventory response is invalid.");
  }

  return payload.data.flats.map(normalizeLiveUnit);
}

export function mergeFloorUnits(snapshotUnits, liveUnits) {
  const liveByName = new Map((liveUnits || []).map((unit) => [String(unit.name), unit]));
  const snapshotNames = new Set((snapshotUnits || []).map((unit) => String(unit.name)));
  const merged = (snapshotUnits || []).map((unit) => liveByName.get(String(unit.name)) || unit);

  for (const unit of liveUnits || []) {
    if (!snapshotNames.has(String(unit.name))) merged.push(unit);
  }

  return merged.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
}

export function getFloorSummary(floor) {
  const units = floor?.units || [];
  return units.reduce(
    (summary, unit) => {
      const status = normalizeStatus(unit.status);
      summary.total += 1;
      summary[status] += 1;
      return summary;
    },
    { total: 0, available: 0, reserved: 0, sold: 0, unavailable: 0 },
  );
}

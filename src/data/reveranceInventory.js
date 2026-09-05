// Canonical inventory imported from "Stock Reverance August 26- 1.xlsx".
// The workbook is kept as a source artifact; this small, deterministic module
// lets the visitor site render the same data without a network dependency.
import bPlans from './reveranceBPlans.json' with { type: 'json' };

const FINAL_ROWS = [
  [411, "A", 4, 64.5, "Available"], [412, "A", 4, 59.1, "Available"],
  [502, "A", 5, 53, "Available"], [511, "A", 5, 68.2, "Available"],
  [602, "A", 6, 53, "Available"], [603, "A", 6, 65.9, "Available"], [604, "A", 6, 61.6, "Available"], [611, "A", 6, 68.2, "Available"], [612, "A", 6, 59.1, "Available"],
  [701, "A", 7, 46.4, "Available"], [702, "A", 7, 53, "Available"], [703, "A", 7, 65.9, "Available"], [704, "A", 7, 61.6, "Available"], [706, "A", 7, 32.7, "Available"], [707, "A", 7, 33.2, "Available"], [708, "A", 7, 33.6, "Available"], [709, "A", 7, 34.1, "Available"], [710, "A", 7, 34.5, "Available"], [711, "A", 7, 68.2, "Available"], [712, "A", 7, 59.1, "Available"],
  [801, "A", 8, 46.4, "Available"], [802, "A", 8, 53, "Available"], [805, "A", 8, 32.3, "Available"], [806, "A", 8, 32.7, "Available"], [807, "A", 8, 33.2, "Available"], [808, "A", 8, 33.6, "Available"], [809, "A", 8, 34.1, "Available"], [810, "A", 8, 34.5, "Available"], [811, "A", 8, 68.2, "Available"], [812, "A", 8, 59.1, "Available"],
  [901, "A", 9, 46.4, "Available"], [902, "A", 9, 53, "Available"], [903, "A", 9, 65.9, "Available"], [904, "A", 9, 68.3, "Available"], [912, "A", 9, 59.1, "Available"],
  [1001, "A", 10, 46.4, "Available"], [1002, "A", 10, 53, "Available"], [1003, "A", 10, 65.9, "Available"], [1004, "A", 10, 68.3, "Available"], [1006, "A", 10, 34.1, "Available"], [1011, "A", 10, 61.5, "Available"], [1012, "A", 10, 59.1, "Available"],
  [1102, "A", 11, 53, "Available"], [1103, "A", 11, 65.9, "Available"], [1104, "A", 11, 68.3, "Available"], [1111, "A", 11, 61.5, "Available"], [1112, "A", 11, 59.1, "Available"],
  [1202, "A", 12, 53, "Available"], [1203, "A", 12, 65.9, "Available"], [1204, "A", 12, 68.3, "Available"], [1212, "A", 12, 59.1, "Available"],
  [1311, "A", 13, 64.8, "Available"],
  [1501, "A", 15, 46.4, "NFS"], [1502, "A", 15, 53, "NFS"], [1503, "A", 15, 65.9, "NFS"], [1504, "A", 15, 62, "NFS"], [1505, "A", 15, 32.4, "NFS"], [1506, "A", 15, 32.3, "NFS"], [1507, "A", 15, 32.4, "NFS"], [1508, "A", 15, 32.3, "NFS"], [1509, "A", 15, 32.4, "NFS"], [1510, "A", 15, 32.3, "NFS"], [1511, "A", 15, 64.8, "NFS"], [1512, "A", 15, 59.1, "NFS"],
  [1601, "A", 16, 46.4, "NFS"], [1602, "A", 16, 53, "NFS"], [1603, "A", 16, 65.9, "NFS"], [1604, "A", 16, 62, "NFS"], [1605, "A", 16, 32.4, "NFS"], [1606, "A", 16, 32.3, "NFS"], [1607, "A", 16, 32.4, "NFS"], [1608, "A", 16, 32.3, "NFS"], [1609, "A", 16, 32.4, "NFS"], [1610, "A", 16, 32.3, "NFS"], [1611, "A", 16, 64.8, "NFS"], [1612, "A", 16, 59.1, "NFS"],
  [204, "B", 2, 68.3, "Available"], [311, "B", 3, 64.5, "Available"],
  [403, "B", 4, 65.9, "Available"], [411, "B", 4, 64.5, "Available"], [412, "B", 4, 59.1, "Available"],
  [503, "B", 5, 65.9, "Available"], [504, "B", 5, 61.6, "Available"], [510, "B", 5, 34.5, "Available"], [511, "B", 5, 68.2, "Available"], [512, "B", 5, 59.1, "Available"],
  [602, "B", 6, 53, "Available"], [603, "B", 6, 65.9, "Available"], [604, "B", 6, 61.6, "Available"], [610, "B", 6, 34.5, "Available"], [611, "B", 6, 68.2, "Available"], [612, "B", 6, 59.1, "Available"],
  [701, "B", 7, 46.4, "Available"], [702, "B", 7, 53, "Available"], [703, "B", 7, 65.9, "Available"], [704, "B", 7, 61.6, "Available"], [705, "B", 7, 32.3, "Available"], [706, "B", 7, 32.7, "Available"], [707, "B", 7, 33.2, "Available"], [708, "B", 7, 33.6, "Available"], [709, "B", 7, 34.1, "Available"], [710, "B", 7, 34.5, "Available"], [711, "B", 7, 68.2, "Available"], [712, "B", 7, 59.1, "Available"],
  [801, "B", 8, 46.4, "Available"], [802, "B", 8, 53, "Available"], [803, "B", 8, 65.9, "Available"], [804, "B", 8, 61.6, "Available"], [805, "B", 8, 32.3, "Available"], [806, "B", 8, 32.7, "Available"], [807, "B", 8, 33.2, "Available"], [808, "B", 8, 33.6, "Available"], [809, "B", 8, 34.1, "Available"], [810, "B", 8, 34.5, "Available"], [811, "B", 8, 68.2, "Available"], [812, "B", 8, 59.1, "Available"],
  [901, "B", 9, 46.4, "Available"], [902, "B", 9, 53, "Available"], [903, "B", 9, 65.9, "Available"], [904, "B", 9, 68.3, "Available"], [905, "B", 9, 34.6, "Available"], [906, "B", 9, 34.1, "Available"], [907, "B", 9, 33.7, "Available"], [908, "B", 9, 33.1, "Available"], [911, "B", 9, 61.5, "Available"], [912, "B", 9, 59.1, "Available"],
  [1001, "B", 10, 46.4, "Available"], [1002, "B", 10, 53, "Available"], [1003, "B", 10, 65.9, "Available"], [1004, "B", 10, 68.3, "Available"], [1005, "B", 10, 34.6, "Available"], [1006, "B", 10, 34.1, "Available"], [1007, "B", 10, 33.7, "Available"], [1008, "B", 10, 33.1, "Available"], [1009, "B", 10, 32.8, "Available"], [1010, "B", 10, 32.2, "Available"], [1011, "B", 10, 61.5, "Available"], [1012, "B", 10, 59.1, "Available"],
  [1101, "B", 11, 46.4, "Available"], [1102, "B", 11, 53, "Available"], [1103, "B", 11, 65.9, "Available"], [1104, "B", 11, 68.3, "Available"], [1105, "B", 11, 34.6, "Available"], [1106, "B", 11, 34.1, "Available"], [1107, "B", 11, 33.7, "Available"], [1108, "B", 11, 33.1, "Available"], [1109, "B", 11, 32.8, "Available"], [1110, "B", 11, 32.2, "Available"], [1111, "B", 11, 61.5, "Available"], [1112, "B", 11, 59.1, "Available"],
  [1202, "B", 12, 53, "Available"], [1203, "B", 12, 65.9, "Available"], [1204, "B", 12, 68.3, "Available"], [1205, "B", 12, 34.6, "Available"], [1211, "B", 12, 61.5, "Available"], [1212, "B", 12, 59.1, "Available"],
  [1302, "B", 13, 53, "Available"], [1303, "B", 13, 65.9, "Available"], [1304, "B", 13, 62, "Available"], [1311, "B", 13, 64.8, "Available"], [1312, "B", 13, 59.1, "Available"],
  [1402, "B", 14, 53, "Available"], [1403, "B", 14, 65.9, "Available"], [1404, "B", 14, 62, "Available"], [1411, "B", 14, 64.8, "Available"],
  [1501, "B", 15, 46.4, "NFS"], [1502, "B", 15, 53, "NFS"], [1503, "B", 15, 65.9, "NFS"], [1504, "B", 15, 62, "NFS"], [1505, "B", 15, 32.4, "NFS"], [1506, "B", 15, 32.3, "NFS"], [1507, "B", 15, 32.4, "NFS"], [1508, "B", 15, 32.3, "NFS"], [1509, "B", 15, 32.4, "NFS"], [1510, "B", 15, 32.3, "NFS"], [1511, "B", 15, 64.8, "NFS"], [1512, "B", 15, 59.1, "NFS"],
  [1601, "B", 16, 46.4, "NFS"], [1602, "B", 16, 53, "NFS"], [1603, "B", 16, 65.9, "NFS"], [1604, "B", 16, 62, "NFS"], [1605, "B", 16, 32.4, "NFS"], [1606, "B", 16, 32.3, "NFS"], [1607, "B", 16, 32.4, "NFS"], [1608, "B", 16, 32.3, "NFS"], [1609, "B", 16, 32.4, "NFS"], [1610, "B", 16, 32.3, "NFS"], [1611, "B", 16, 64.8, "NFS"], [1612, "B", 16, 59.1, "NFS"],
];

const OWNED_ROWS = [
  [13, "A", "1301", 46.4, "Reserved"], [13, "A", "1305", 32.4, "Available"], [13, "A", "1306", 32.3, "Available"], [13, "A", "1307", 32.4, "Available"], [13, "A", "1308", 32.3, "Available"], [13, "A", "1309", 32.4, "Available"], [13, "A", "1310", 32.3, "Available"],
  [14, "A", "1401", 46.4, "Available"], [14, "A", "1405", 32.4, "Available"], [14, "A", "1406", 32.3, "Reserved"], [14, "A", "1407", 32.4, "Available"], [14, "A", "1408", 32.3, "Available"], [14, "A", "1409", 32.4, "Reserved"], [14, "A", "1410", 32.3, "Reserved"],
  [13, "B", "1301", 46.4, "Available"], [13, "B", "1305", 32.4, "Available"], [13, "B", "1306", 32.3, "Available"], [13, "B", "1307", 32.4, "Available"], [13, "B", "1308", 32.3, "Available"], [13, "B", "1309", 32.4, "Available"], [13, "B", "1310", 32.3, "Available"],
  [14, "B", "1401", 46.4, "Available"], [14, "B", "1405", 32.4, "Available"], [14, "B", "1406", 32.3, "Available"], [14, "B", "1407", 32.4, "Available"], [14, "B", "1408", 32.3, "Available"], [14, "B", "1409", 32.4, "Available"], [14, "B", "1410", 32.3, "Available"],
];

const BLOCK_IDS = Object.freeze({ A: "ReveranceA", B: "ReveranceB" });
const BLOCK_NAMES = Object.freeze({ A: "A Block", B: "B Block" });

function normalizeWorkbookStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "available" || value === "reserved" || value === "sold") return value;
  // NFS (not for sale) is intentionally distinct from sold.
  return "unavailable";
}

const EMPTY_PLAN_META = { rooms: null, bedrooms: null, areas: [], image2d: null, image3d: null, price: null };

function canonicalRows() {
  const rows = new Map();
  for (const [id, block, floor, area, status] of FINAL_ROWS) {
    rows.set(`${block}:${floor}:${id}`, { block, floor, name: String(id), area, status });
  }
  for (const [floor, block, name, area, status] of OWNED_ROWS) {
    rows.set(`${block}:${floor}:${name}`, { block, floor, name, area, status });
  }
  return [...rows.values()];
}

export function getWorkbookAvailableCount() {
  return canonicalRows().filter(row => normalizeWorkbookStatus(row.status) === "available").length;
}

function makeUnit(row, base) {
  // A similar area is not proof of the same apartment plan or bedroom count.
  const meta = base && (row.area == null || Math.abs(base.totalArea - row.area) < 0.05)
    ? base : EMPTY_PLAN_META;
  return {
    ...meta,
    id: row.block === "A" && base?.id !== undefined ? base.id : `${row.block}-${row.name}`,
    name: row.name,
    status: normalizeWorkbookStatus(row.status),
    floor: row.floor,
    totalArea: row.area == null ? base?.totalArea ?? null : Number(row.area),
    block: row.block,
    blockId: BLOCK_IDS[row.block],
    sourceStatus: row.status,
  };
}

function cloneFloor(floor, block, units) {
  return {
    ...floor,
    id: `${block}-${floor.number}`,
    units,
    shapes: (floor.shapes || []).map((shape) => ({
      ...shape,
      id: `${block}-${shape.id}`,
    })),
  };
}

/**
 * Workbook rows govern sales status; every other mapped apartment is sold,
 * as confirmed by the owner. Each block keeps its own official floor plans.
 */
export function applyWorkbookInventory(snapshot) {
  if (!snapshot?.blockId || !Array.isArray(snapshot.floors)) return snapshot;

  const rows = new Map(canonicalRows().map(row => [`${row.block}:${row.name}`, row]));
  const buildFloors = (source, block) => source.map(floor => {
    const metadata = new Map((floor.units || []).map(unit => [String(unit.name), unit]));
    const names = new Set((floor.shapes || []).map(shape => String(shape.target)));
    for (const row of rows.values()) if (row.block === block && row.floor === floor.number) names.add(row.name);
    const units = [...names].map(name => makeUnit(
      rows.get(`${block}:${name}`) || { block, name, floor: floor.number, area: null, status: 'Sold' },
      metadata.get(name),
    )).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return cloneFloor(floor, block, units);
  });
  const aFloors = buildFloors(snapshot.floors, 'A');
  const bFloors = buildFloors(bPlans.floors, 'B');

  const blocks = [
    { id: BLOCK_IDS.A, code: "A", name: BLOCK_NAMES.A, floors: aFloors },
    { id: BLOCK_IDS.B, code: "B", name: BLOCK_NAMES.B, floors: bFloors },
  ];
  return {
    ...snapshot,
    blockName: "A + B Blocks",
    floors: aFloors,
    blocks,
    inventorySource: "Stock Reverance August 26- 1.xlsx",
    inventoryComplete: true,
  };
}

export { BLOCK_IDS, BLOCK_NAMES, FINAL_ROWS, OWNED_ROWS, normalizeWorkbookStatus };

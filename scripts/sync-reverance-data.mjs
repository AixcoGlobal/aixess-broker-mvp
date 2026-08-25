import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const API_ORIGIN = "https://api.otium.ge";
const BLOCK_ID = "ReveranceA";
const PROJECT_ID = 7;
const projectRoot = process.cwd();
const assetDirectory = path.join(projectRoot, "public", "assets", "reverance-explorer");
const dataDirectory = path.join(projectRoot, "public", "data");

function parseMap(value) {
  if (!value) return { image: {}, spots: [] };
  return typeof value === "string" ? JSON.parse(value) : value;
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function normalizeShape(spot) {
  const points = (spot.points || []).map((point) => ({
    x: round(Number(spot.x) + (Number(spot.width) * Number(point.x)) / 100),
    y: round(Number(spot.y) + (Number(spot.height) * Number(point.y)) / 100),
  }));

  return {
    id: spot.id,
    target: String(spot.title || spot.actions?.link || ""),
    points,
  };
}

function normalizeUnit(unit) {
  return {
    id: Number(unit.id),
    name: String(unit.name),
    status: String(unit.status || "unavailable").toLowerCase(),
    price: unit.price,
    image2d: unit.image_2d || null,
    image3d: unit.image_3d || null,
    floor: Number(unit.floor),
    rooms: Number(unit.rooms || 0),
    bedrooms: Number(unit.bedrooms || 0),
    totalArea: Number(unit.total_area || 0),
    areas: (unit.areas || []).map((area) => ({
      id: Number(area.id),
      type: String(area.type || "other"),
      label: String(area.type_label || area.type || "Area"),
      size: Number(area.size || 0),
    })),
  };
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

async function download(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(assetDirectory, filename), bytes);
  return `/assets/reverance-explorer/${filename}`;
}

await mkdir(assetDirectory, { recursive: true });
await mkdir(dataDirectory, { recursive: true });
await Promise.all(
  ["motion-01.jpg", "motion-02.jpg", "motion-03.jpg"].map((filename) =>
    rm(path.join(assetDirectory, filename), { force: true }),
  ),
);

const blockPayload = await getJson(`${API_ORIGIN}/api/projects/${PROJECT_ID}/blocks/${BLOCK_ID}`);
const block = blockPayload.data;
const buildingMap = parseMap(block.map);
const buildingImage = await download(buildingMap.image.url || block.image, "building.webp");
const motionFrames = [];

const turnImage = block.gallery?.[1];
if (turnImage?.url) {
  const extension = path.extname(new URL(turnImage.url).pathname) || ".jpg";
  motionFrames.push(await download(turnImage.url, `motion-turn${extension}`));
}

const planAssets = new Map();
const floors = [];

for (const floorRecord of [...block.floors].sort((a, b) => Number(a.uuid) - Number(b.uuid))) {
  const number = Number(floorRecord.uuid);
  const floorMap = parseMap(floorRecord.map);
  const sourcePlan = floorMap.image?.url;
  let planImage = null;

  if (sourcePlan) {
    if (!planAssets.has(sourcePlan)) {
      const sourceUrl = new URL(sourcePlan);
      const sourceParts = sourceUrl.pathname.split("/").filter(Boolean);
      const storageId = sourceParts.at(-2) || number;
      const extension = path.extname(sourceUrl.pathname) || ".webp";
      const filename = `floor-plan-${storageId}${extension}`;
      planAssets.set(sourcePlan, await download(sourcePlan, filename));
    }
    planImage = planAssets.get(sourcePlan);
  }

  let units = [];
  try {
    const floorPayload = await getJson(`${API_ORIGIN}/api/floors/${BLOCK_ID}/${number}`);
    units = (floorPayload.data?.flats || []).map(normalizeUnit);
  } catch (error) {
    console.warn(`Floor ${number} inventory could not be refreshed: ${error.message}`);
  }

  floors.push({
    id: Number(floorRecord.id),
    number,
    planImage,
    shapes: (floorMap.spots || []).map(normalizeShape),
    units,
  });
}

const snapshot = {
  schemaVersion: 1,
  projectId: PROJECT_ID,
  blockId: BLOCK_ID,
  projectName: block.project_name || "Project Reverance",
  blockName: block.name || "A Block",
  syncedAt: new Date().toISOString(),
  buildingImage,
  motionFrames,
  buildingShapes: (buildingMap.spots || []).map(normalizeShape),
  floors,
};

await writeFile(
  path.join(dataDirectory, "reverance-a.json"),
  `${JSON.stringify(snapshot)}\n`,
  "utf8",
);

console.log(`Synced ${floors.length} floors and ${floors.reduce((sum, floor) => sum + floor.units.length, 0)} active unit records.`);

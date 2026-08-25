import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://api.otium.ge/api/projects/7";
const OUTPUT_DIR = path.resolve("references/reverance-360");

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

const projectResponse = await fetchJson(API_URL);
const project = projectResponse.data || projectResponse;
const frames = project.images3d || [];

if (frames.length < 24) {
  throw new Error(`Expected a full turntable but received ${frames.length} frames.`);
}

await mkdir(OUTPUT_DIR, { recursive: true });

const selected = frames;
await Promise.all(selected.map(async (frame, selectedIndex) => {
  const sourceIndex = frames.indexOf(frame);
  const fileName = `frame-${String(sourceIndex + 1).padStart(3, "0")}.png`;
  await download(frame.day_image_url, path.join(OUTPUT_DIR, fileName));
  process.stdout.write(`Downloaded ${selectedIndex + 1}/${selected.length}: ${fileName}\n`);
}));

await writeFile(
  path.join(OUTPUT_DIR, "manifest.json"),
  `${JSON.stringify({ source: API_URL, totalFrames: frames.length, selected }, null, 2)}\n`,
);

process.stdout.write(`Saved ${selected.length} reference frames to ${OUTPUT_DIR}\n`);

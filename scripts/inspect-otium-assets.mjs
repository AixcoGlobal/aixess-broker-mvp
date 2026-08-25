const base = "https://otium.ge";
const pageUrl = `${base}/ka/project/7/block/ReveranceA`;
const html = await fetch(pageUrl).then((response) => response.text());
const paths = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((match) => match[1]);
const assetPattern = /[^"']{0,100}(?:\.glb(?=[?"'])|\.gltf(?=[?"'])|\.fbx(?=[?"'])|\.obj(?=[?"'])|images3d|day_image_url|three\.module)[^"']{0,160}/ig;
let matches = 0;

for (const source of paths) {
  const url = new URL(source, base);
  const script = await fetch(url).then((response) => response.text());
  const hits = [...script.matchAll(assetPattern)].map((match) => match[0]);
  if (!hits.length) continue;
  matches += hits.length;
  process.stdout.write(`\n${url}\n${hits.slice(0, 30).join("\n")}\n`);
}

process.stdout.write(`\nScanned ${paths.length} scripts; found ${matches} model-related references.\n`);

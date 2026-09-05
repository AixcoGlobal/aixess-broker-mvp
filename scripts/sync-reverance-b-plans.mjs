// Refresh B's own plan geometry and unit metadata. Sales status comes from the workbook.
import { mkdir, writeFile } from 'node:fs/promises';
const origin = 'https://api.otium.ge';
const get = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
};
const block = (await get(`${origin}/api/projects/7/blocks/ReveranceB`)).data;
const plans = new Map();
await mkdir('public/assets/reverance-explorer', { recursive: true });
const floors = [];
for (const record of block.floors) {
  const number = Number(record.uuid);
  const payload = (await get(`${origin}/api/floors/ReveranceB/${number}`)).data;
  const map = JSON.parse(record.map);
  const url = map.image.url;
  if (!plans.has(url)) {
    const filename = `b-floor-plan-${new URL(url).pathname.split('/').slice(-2).join('-')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Missing plan ${url}`);
    await writeFile(`public/assets/reverance-explorer/${filename}`, Buffer.from(await response.arrayBuffer()));
    plans.set(url, `/assets/reverance-explorer/${filename}`);
  }
  floors.push({
    number, planImage: plans.get(url), source: url,
    shapes: map.spots.map(s => ({
      id: `B-${s.id}`, target: String(s.title),
      points: (s.points || []).map(p => ({ x: Number(s.x) + s.width*p.x/100, y: Number(s.y) + s.height*p.y/100 })),
    })),
    units: (payload.flats || []).map(u => ({
      id: `B-${u.name}`, name: String(u.name), floor: number,
      rooms: Number(u.rooms), bedrooms: Number(u.bedrooms), totalArea: Number(u.total_area),
      image2d: u.image_2d || null, image3d: u.image_3d || null, price: u.price ?? null,
      areas: (u.areas || []).map(a => ({id:a.id,type:a.type,label:a.type_label,size:Number(a.size)})),
    })),
  });
}
floors.sort((a,b)=>a.number-b.number);
await writeFile('src/data/reveranceBPlans.json', JSON.stringify({blockId:'ReveranceB',floors})+'\n');
console.log(`B: ${floors.length} floors, ${floors.reduce((s,f)=>s+f.shapes.length,0)} mapped apartments; ${plans.size} original plan images.`);

# ChatGPT prompt: Insights photos (afternoon and night versions)

Copy everything below the line into ChatGPT (a model that can edit images; agent mode if it should
open the links itself). It covers the three photos of the Insights page's "Understand the markets"
cards, added from Lasha's Figma file on 20 November 2026.

---

You are preparing photos for the AiXESS real-estate website. The site switches between three looks
by time of day: **day**, **afternoon** and **night**. Every photo needs one version per look,
showing the **same scene in different light**; the site cross-fades between them, so the versions
must line up exactly with the original.

## Step 1: get the three source photos (the day versions)

They are in the Figma file **mdoKe84QEOkpDthDFO8pyy**, page **AIXESS**, frame **INSIGHT**
(node 818:3), in the section "MARKET INTELLIGENCE / UNDERSTAND THE MARKETS" (frame y 899–1980):

| save as | card | Figma layer (open the link, it selects the layer) | shown on the site at |
| --- | --- | --- | --- |
| `insights-georgia.png` | GEORGIA – WHY BATUMI? (large card, left) | "Mask group" containing "batumi 1": https://www.figma.com/design/mdoKe84QEOkpDthDFO8pyy/Untitled?node-id=821-232 | 710 × 476 |
| `insights-dubai.png` | DUBAI – A GLOBAL REAL ESTATE HUB (top right) | "dubai 1": https://www.figma.com/design/mdoKe84QEOkpDthDFO8pyy/Untitled?node-id=821-229 | 564 × 188 |
| `insights-switzerland.png` | SWITZERLAND – STABILITY AND EXPERTISE (bottom right) | "swiss 1": https://www.figma.com/design/mdoKe84QEOkpDthDFO8pyy/Untitled?node-id=821-233 | 564 × 188 |

The whole frame, for context: https://www.figma.com/design/mdoKe84QEOkpDthDFO8pyy/Untitled?node-id=818-3

Export each layer from Figma as **PNG at 3x** (select the layer, right panel, Export, 3x, PNG),
exactly as Figma crops it. Do not edit these three files: they are the day versions.

The live page where they will appear (scroll to "UNDERSTAND THE MARKETS"):
https://aixess.global/#insights

## Step 2: make the afternoon and night versions

Edit each source photo (image in, image out); never generate a new picture from text.

| source | what it shows | make |
| --- | --- | --- |
| `insights-georgia.png` | Batumi, Georgia: Black Sea coastline curving left, beach promenade, the round glass tower and the Alphabet Tower, high-rises, green hills and mountains behind, clear sky with a few clouds | `insights-georgia-afternoon.png`, `insights-georgia-night.png` |
| `insights-dubai.png` | Dubai skyline in daylight, wide panorama, Burj Khalifa near the right third, low-rise city in front | `insights-dubai-afternoon.png`, `insights-dubai-night.png` |
| `insights-switzerland.png` | Swiss lake: calm water, lakeside town and promenade, snow-capped Alps behind, a modern glass and stone residence with balconies at the right | `insights-switzerland-afternoon.png`, `insights-switzerland-night.png` |

That is 6 images.

### Rules for every image (read before each one)

1. **Same photograph, new light only.** Keep the framing, camera position, lens, horizon,
   architecture, materials, windows, plants, water, skyline, mountains and every building exactly
   as they are. Nothing added, removed, moved or redrawn. No new buildings, cars, people, boats,
   birds, stars, moon, text, watermark or lens flare.
2. **Same size and shape.** Return the same aspect ratio as the source, uncropped, at the highest
   resolution you can (at least 2048 px on the long side). Never pad, letterbox or crop.
3. **Photorealistic.** It must look like a real photograph taken at that time of day: natural
   exposure, believable shadows and reflections, clean (no noise, painterly look,
   over-saturation or HDR halos).
4. **Keep empty sky calm.** Where the source has open sky, keep it a smooth gradient: no added
   clouds, no stars.

### Afternoon look (about 6 pm, golden hour)

Low warm sun from the side, long soft shadows, warm golden light raking across facades, stone and
glass, the sky shading from soft peach and amber near the horizon to a calm light blue above.
Water and glass reflect the warm sky. A few interior lights may glow softly. Bright and inviting,
not orange-washed.

### Night look (blue hour, just after dusk)

Deep navy-blue sky, darkest at the top and a little lighter near the horizon. **Beautiful,
realistic building lights**: warm 2700–3000 K light in most windows (varied: some rooms brighter,
a few dark, so it looks lived-in), soft facade uplights, street and promenade lights.

- **Georgia (Batumi):** the promenade and coastal road lit with a line of warm street lights, the
  high-rises and the round tower with lit windows, the Alphabet Tower lit, the lights reflected in
  the sea, the hills dark with a few scattered lights.
- **Dubai:** the whole skyline sparkling with thousands of warm and white lights, Burj Khalifa lit
  top to bottom, road lights in the city below. The same panorama, no fireworks.
- **Switzerland:** the lakeside town's windows and promenade lamps glowing and reflected in the
  calm lake, the Alps' snow faintly visible against the navy sky, the modern residence at the
  right with warm interior light behind its glass and soft balcony downlights.

Calm, premium, high-end real-estate night photography.

## Step 3: deliver

Return the **9 PNG files** (3 sources from Step 1 + 6 versions from Step 2), named exactly as above.
Check each version against its source before delivering: laid over the source, every building and
the horizon must sit in the same place.

If you can use GitHub: put them in `incoming/theme-photos/` in the repository
`AixcoGlobal/aixess-broker-mvp`, on a new branch, and say which branch. Otherwise attach the 9 files
in the reply, and they will be passed to Claude.

(For Claude, after delivery: the sources go in with `import-figma-photos.py` as the Figma photos
`insights-georgia`, `insights-dubai` and `insights-switzerland`, the versions with
`import-figma-photos.py --themes incoming/theme-photos`; the cards in
`src/components/InsightsToolsPages.jsx` switch to them as soon as they are in
`src/data/figma-photo-sizes.json`.)

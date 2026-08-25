"""Create a compact interior/window atlas from Otium's official A elevation.

Only the recessed window-wall portion of each bay is sampled. Balcony edges,
planter strips, trees, sky, cladding, and the roof are excluded so the atlas can
sit behind real balcony, rail, planter, and foliage geometry without becoming
another full-elevation billboard.
"""

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "reverance-explorer" / "building.webp"
OUTPUT = ROOT / "public" / "assets" / "reverance-3d" / "reverance-window-atlas.jpg"

BAYS = 8
FLOORS = 15
TILE_WIDTH = 256
TILE_HEIGHT = 224

# Front residential grid measured on the official 4000 × 4000 A Block image.
GRID_LEFT = 1240
GRID_RIGHT = 2760
GRID_TOP = 1000
GRID_BOTTOM = 3445

source = Image.open(SOURCE).convert("RGB")
atlas = Image.new("RGB", (BAYS * TILE_WIDTH, FLOORS * TILE_HEIGHT), "#16181a")

cell_width = (GRID_RIGHT - GRID_LEFT) / BAYS
cell_height = (GRID_BOTTOM - GRID_TOP) / FLOORS

for row in range(FLOORS):
    for bay in range(BAYS):
        x0 = round(GRID_LEFT + bay * cell_width + cell_width * 0.08)
        x1 = round(GRID_LEFT + (bay + 1) * cell_width - cell_width * 0.08)
        y0 = round(GRID_TOP + row * cell_height + cell_height * 0.05)
        # The bottom quarter contains balcony rails and planting; leave those
        # to the actual 3D geometry.
        y1 = round(GRID_TOP + row * cell_height + cell_height * 0.72)
        tile = source.crop((x0, y0, x1, y1)).resize((TILE_WIDTH, TILE_HEIGHT), Image.Resampling.LANCZOS)
        tile = ImageEnhance.Contrast(tile).enhance(1.035)
        tile = ImageEnhance.Color(tile).enhance(0.92)
        atlas.paste(tile, (bay * TILE_WIDTH, row * TILE_HEIGHT))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
atlas.save(OUTPUT, quality=91, optimize=True, progressive=True, subsampling=0)
print(OUTPUT.resolve())

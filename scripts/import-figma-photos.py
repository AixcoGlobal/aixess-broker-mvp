"""Import the photos Lasha's Figma file draws (file mdoKe84QEOkpDthDFO8pyy, 19 November 2026 export).

Kemo, 19 November 2026: "make sure that design matches figma pixel to pixel". Every page photo that
differs from the site's comes from the Figma file's own image fills, unchanged, as WebP at the
widths below. Originals are fetched once with GET /v1/files/:key/images and named by their
imageRef; run:

    python3 scripts/import-figma-photos.py <folder of originals named by imageRef>

Writes public/assets/figma/<name>-<width>.webp and src/data/figma-photo-sizes.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/figma"
MANIFEST = ROOT / "src/data/figma-photo-sizes.json"
WIDTHS = (480, 800, 1200, 1600, 2400, 3200)

# name -> imageRef prefix (the Figma layer that draws it)
PHOTOS = {
    # HOME (147:2)
    "home-hero": "09082a84",  # rarra-gigapixel-standard v2-2x 2
    "home-about": "150d9f00",  # connection 1
    "home-tresora": "50acc854",  # 5556 1
    "home-downtown": "7838a31f",  # center 1
    # AIXESS ADVANTAGE (175:607)
    "advantage-hero": "8cb480cc",  # 999 1
    "advantage-more": "1fc36e1e",  # 3af5f2d6…
    # BROKER ACCESS (216:153)
    "broker-hero": "fb33e489",  # 3:4 1
    "broker-join": "e19f832f",  # 777 1
    "broker-commercial": "747b1ba6",  # rand-gigapixel-standard v2-2
    "broker-workspace": "714bbd44",  # kk 1
    # REVERANCE (405:327)
    "reverance-hero": "0c4aec5a",  # 128-gigapixel-standard v2-2x 3
    # DOWNTOWN ONE (553:232)
    "downtown-hero": "d53ff9af",  # bluish-gigapixel-standard v2-2x 1
    "downtown-highlights": "101414dc",  # oplaa-gigapixel-high fidelity v2-2x 1
    "downtown-entertainment": "3b024b70",  # ent 1
    "downtown-map": "0518c9bf",  # last map 1
}


def main(source: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    for name, ref in PHOTOS.items():
        ref, crop = ref if isinstance(ref, tuple) else (ref, None)
        original = next(source.glob(f"{ref}*"))
        image = Image.open(original)
        image = image.convert("RGB" if crop else "RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
        if crop:
            image = image.resize((round(image.width * 4), round(image.height * 4)), Image.LANCZOS).crop(tuple(round(v * 4) for v in crop))
            image = image.resize((round(image.width / 4), round(image.height / 4)), Image.LANCZOS)
        widths = sorted({w for w in WIDTHS if w < image.width} | ({image.width} if image.width <= WIDTHS[-1] else {WIDTHS[-1]}))
        for width in widths:
            height = round(image.height * width / image.width)
            resized = image if width == image.width else image.resize((width, height), Image.LANCZOS)
            resized.save(OUT / f"{name}-{width}.webp", "WEBP", quality=86, method=6)
        manifest[name] = {"width": image.width, "height": image.height, "widths": widths}
        print(name, image.size, widths)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main(Path(sys.argv[1]))

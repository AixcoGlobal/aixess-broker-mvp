"""Derive the neutral champagne cladding sampled from official orbit frames."""

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "public" / "assets" / "reverance-3d" / "materials"
source = Image.open(MATERIALS / "anodized-champagne-basecolor.jpg").convert("RGB")
desaturated = ImageEnhance.Color(source).enhance(0.24)
desaturated = ImageEnhance.Contrast(desaturated).enhance(0.78)
target = Image.new("RGB", source.size, (188, 184, 170))
result = Image.blend(desaturated, target, 0.34)
result.save(MATERIALS / "anodized-reverance-stone-basecolor.jpg", quality=92, optimize=True)

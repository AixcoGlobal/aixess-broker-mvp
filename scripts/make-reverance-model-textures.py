from pathlib import Path
from PIL import Image, ImageEnhance

root = Path(__file__).resolve().parents[1]
source_path = root / "public" / "assets" / "reverance-explorer" / "building.webp"
output_dir = root / "public" / "assets" / "reverance-3d"
output_dir.mkdir(parents=True, exist_ok=True)

source = Image.open(source_path).convert("RGB")

# Exact balcony elevation crop from Otium's official 4000px front render.
# The rooftop crown remains modeled geometry so its open silhouette is preserved.
# The crop begins at the glass penthouse band. The open rooftop crown is
# geometry in the GLB, avoiding a flat sky-colored rectangle around the fins.
facade = source.crop((1175, 1000, 2835, 3775))
facade.thumbnail((1120, 2048), Image.Resampling.LANCZOS)
facade = ImageEnhance.Contrast(facade).enhance(1.03)
facade.save(output_dir / "reverance-front-facade.jpg", quality=92, optimize=True, progressive=True)

# Direct side elevation from Otium's official orbit (frame 21). This captures
# the silver rainscreen, recessed loggia stack, and base proportions.
side_source = Image.open(root / "references" / "reverance-360" / "frame-021.png").convert("RGB")
side = side_source.crop((585, 260, 828, 978))
side.thumbnail((520, 1536), Image.Resampling.LANCZOS)
side = ImageEnhance.Contrast(side).enhance(1.035)
side.save(output_dir / "reverance-side-facade.jpg", quality=92, optimize=True, progressive=True)

print((output_dir / "reverance-front-facade.jpg").resolve())
print((output_dir / "reverance-side-facade.jpg").resolve())

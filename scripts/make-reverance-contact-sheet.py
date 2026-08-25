from pathlib import Path
from PIL import Image, ImageDraw

source = Path("references/reverance-360")
files = sorted(source.glob("frame-*.png"))
if not files:
    raise SystemExit("No reference frames found")

columns = 4
thumb_width = 480
thumb_height = 270
label_height = 28
rows = (len(files) + columns - 1) // columns
sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + label_height)), "#11100f")
draw = ImageDraw.Draw(sheet)

for index, file in enumerate(files):
    image = Image.open(file).convert("RGB")
    image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
    x = (index % columns) * thumb_width
    y = (index // columns) * (thumb_height + label_height)
    sheet.paste(image, (x, y))
    draw.text((x + 10, y + thumb_height + 6), file.stem, fill="#f16510")

target = source / "contact-sheet.jpg"
sheet.save(target, quality=90, optimize=True)
print(target.resolve())

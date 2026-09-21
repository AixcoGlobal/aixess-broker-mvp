"""Inspect browser-generated client PDF QA artifacts; render comparison sheets."""
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

folder = Path("output/pdf/aixess-client-qa")
files = sorted(folder.glob("*.pdf"))
assert len(files) >= 31, "Generate the language/calculator and unit matrices first."
for source in files:
    doc = fitz.open(source)
    assert len(doc) == 2, source
    for page in doc:
        for word in page.get_text("words"):
            x0, y0, x1, y1, *_ = word
            assert x0 >= 0 and y0 >= 0 and x1 <= page.rect.width and y1 <= page.rect.height, (source.name, page.number + 1, word)
    assert "AiXESS" in doc[0].get_text(), source
    if source.name.startswith("unit-"):
        assert source.stem[5:] in doc[0].get_text()
    elif source.name == "long-client.pdf":
        assert doc[0].get_text().count("Ж") == 400
        words = doc[0].get_text("words")
        last_client = max(w[3] for w in words if "Ж" in w[4])
        plan_label = min(w[1] for w in words if w[4] == "Building")
        assert last_client < plan_label, (last_client, plan_label)
    else:
        assert "Šmartinska" in doc[0].get_text(), source
        assert "Łukasz" in doc[0].get_text(), source
    image = Image.new("RGB", (850, 650), "white")
    draw = ImageDraw.Draw(image)
    for index, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(.7, .7), alpha=False)
        image.paste(Image.frombytes("RGB", (pix.width, pix.height), pix.samples), (index * 425, 35))
        draw.text((index * 425 + 8, 8), f"{source.stem} / {index + 1}", fill="black")
    image.save(folder / f"{source.stem}-sheet.png")
print(f"PASS: {len(files)} two-page PDFs; text in bounds; client details and apartment identities retained.")

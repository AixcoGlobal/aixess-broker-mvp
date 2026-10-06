"""Build the horizontally condensed stand-ins for Lasha's Tusker Grotesk / Albireo widths.

Lasha's Figma frame sets display type in Tusker Grotesk at three apparent widths. Tusker is
not licensed for this project, so we scale the open-licence (SIL OFL) League Gothic, Oswald
(Cyrillic) and Barlow Condensed glyphs horizontally to the widths measured on the frame and
ship them under new family names, as the OFL requires for modified fonts.

Usage: python3 scripts/make-lasha-condensed-fonts.py   (needs fonttools + brotli)
"""
from pathlib import Path

from fontTools.ttLib import TTFont

FONTS = Path(__file__).resolve().parent.parent / "public" / "fonts" / "lasha"

# Oswald's cap height is 0.81 em against League Gothic's 0.74 em, so Cyrillic glyphs are
# also scaled vertically to share one font-size, and horizontally by 0.686 relative to
# League Gothic to keep the same line widths.
OSWALD_Y = 0.74 / 0.81
OSWALD_X = 0.686

LG = {"latin": "league-gothic-latin-f94aa8.woff2", "latin-ext": "league-gothic-latin-ext-a5f782.woff2"}
OSWALD = {"cyrillic": "oswald-cyrillic-36245d.woff2", "cyrillic-ext": "oswald-cyrillic-ext-ed25ae.woff2"}
BARLOW = {"latin": "barlow-condensed-latin-79f19b.woff2", "latin-ext": "barlow-condensed-latin-ext-477044.woff2"}

# family slug -> (League Gothic x-scale, Barlow x-scale or None)
WIDTHS = {
    "narrow": 0.55,   # hero headline, broker-access heading, 163 count
    "tall": 0.77,     # section headlines (about, Batumi, explorer, starting points)
    "display": 1.0,   # small card headings and eyebrows (Cyrillic only; Latin uses League Gothic)
}
NUM_TALL = 0.82      # project facts and explorer stats (Albireo's narrower numerals)


def scale_font(src, dest, sx, sy, family):
    font = TTFont(FONTS / src)
    glyf, hmtx = font["glyf"], font["hmtx"]
    for name in font.getGlyphOrder():
        glyph = glyf[name]
        if glyph.isComposite():
            for comp in glyph.components:
                comp.x = round(comp.x * sx)
                comp.y = round(comp.y * sy)
        elif glyph.numberOfContours > 0:
            glyph.coordinates.scale((sx, sy))
            glyph.coordinates.toInt()
        advance, lsb = hmtx[name]
        hmtx[name] = (round(advance * sx), round(lsb * sx))
    if "GPOS" in font:
        del font["GPOS"]  # kerning values would no longer match the scaled advances
    font["OS/2"].xAvgCharWidth = round(font["OS/2"].xAvgCharWidth * sx)
    for record in font["name"].names:
        if record.nameID in (1, 4, 16):
            record.string = family
        elif record.nameID == 6:
            record.string = family.replace(" ", "")
    font.flavor = "woff2"
    font.save(FONTS / dest)
    print(dest, (FONTS / dest).stat().st_size)


for slug, sx in WIDTHS.items():
    family = f"Lasha {slug.title()}"
    if sx != 1.0:
        for subset, src in LG.items():
            scale_font(src, f"lasha-{slug}-{subset}.woff2", sx, 1.0, family)
    for subset, src in OSWALD.items():
        scale_font(src, f"lasha-{slug}-{subset}.woff2", sx * OSWALD_X, OSWALD_Y, family)

for subset, src in BARLOW.items():
    scale_font(src, f"lasha-num-tall-{subset}.woff2", NUM_TALL, 1.0, "Lasha Num Tall")

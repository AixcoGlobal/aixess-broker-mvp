"""Build the horizontally condensed stand-ins for Lasha's Tusker Grotesk / Albireo widths.

Lasha's Figma frame sets display type in Tusker Grotesk at three apparent widths. Tusker is
not licensed for this project, so we scale the open-licence (SIL OFL) League Gothic, Oswald
(Cyrillic) and Barlow Condensed glyphs horizontally to the widths measured on the frame and
ship them under new family names, as the OFL requires for modified fonts.

Usage: python3 scripts/make-lasha-condensed-fonts.py   (needs fonttools + brotli)
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.varLib import instancer

FONTS = Path(__file__).resolve().parent.parent / "public" / "fonts" / "lasha"
SOURCES = Path(__file__).resolve().parent / "font-sources"

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
    "narrow": 0.55,   # broker-access heading, 163 count
    "tall": 0.77,     # section headlines (about, Batumi, explorer, starting points)
    "display": 1.0,   # small card headings and eyebrows (Cyrillic only; Latin uses League Gothic)
}
NUM_TALL = 0.82      # project facts and explorer stats (Albireo's narrower numerals)


# Lasha's hero headline uses a light Tusker cut. "Lasha Light" is Oswald (variable, OFL)
# pinned at weight 350, condensed to the frame's line widths
# and scaled vertically to League Gothic's cap height so every family shares one font-size.
LIGHT_WEIGHT = 350
LIGHT_X = 0.396
LIGHT_Y = OSWALD_Y * 0.982  # Tusker light caps sit 2% shorter than League Gothic's


def scale_font(src, dest, sx, sy, family, weight=None):
    font = TTFont(src if isinstance(src, Path) else FONTS / src)
    if weight is not None:
        font = instancer.instantiateVariableFont(font, {"wght": weight})
        # Oswald builds accents as composites positioned by anchors: flatten them first so
        # scaling cannot misplace a diacritic.
        glyf = font["glyf"]
        for name in font.getGlyphOrder():
            if glyf[name].isComposite():
                pen = TTGlyphPen(font.getGlyphSet())
                rec = DecomposingRecordingPen(font.getGlyphSet())
                font.getGlyphSet()[name].draw(rec)
                rec.replay(pen)
                glyf[name] = pen.glyph()
        for table in ("HVAR", "MVAR", "STAT"):
            if table in font:
                del font[table]
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

for subset in ("latin", "latin-ext", "cyrillic", "cyrillic-ext"):
    scale_font(SOURCES / f"oswald-variable-{subset}.woff2", f"lasha-light-{subset}.woff2",
               LIGHT_X, LIGHT_Y, "Lasha Light", weight=LIGHT_WEIGHT)

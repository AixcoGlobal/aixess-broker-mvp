"""Build the horizontally condensed stand-ins for Lasha's Tusker Grotesk / Albireo widths.

Lasha's Figma frame sets display type in Tusker Grotesk at three apparent widths. Tusker is
not licensed for this project, so we scale open-licence (SIL OFL) glyphs to the widths measured
on the frame and ship them under new family names, as the OFL requires for modified fonts:
Antonio for Latin headlines, Oswald for Cyrillic headlines and the light hero cut, and Sofia
Sans Extra Condensed for numbers. League Gothic and Barlow Condensed remain the width references.

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


LATIN_RANGES = {
    "latin": [*range(0x20, 0x100), 0x131, 0x152, 0x153, 0x2BB, 0x2BC, 0x2C6, 0x2DA, 0x2DC, 0x304, 0x308,
              *range(0x2000, 0x2070), 0x20AC, 0x2122, 0x2212, 0x2215],
    "latin-ext": [*range(0x100, 0x250), *range(0x1E00, 0x1EFF), *range(0x20A0, 0x20C0)],
    "cyrillic": [*range(0x400, 0x460), 0x490, 0x491, 0x4B0, 0x4B1, 0x2116],
    "cyrillic-ext": [*range(0x460, 0x530)],
}


def cap_em(font):
    return font["OS/2"].sCapHeight / font["head"].unitsPerEm


def mean_advance(font, text):
    """Mean advance of `text` in em, per unit of cap height, so fonts compare at equal cap height."""
    cmap, hmtx, upm = font.getBestCmap(), font["hmtx"], font["head"].unitsPerEm
    return sum(hmtx[cmap[ord(c)]][0] for c in text) / len(text) / upm / cap_em(font)


def instance(src, weight):
    font = TTFont(src)
    return instancer.instantiateVariableFont(font, {"wght": weight}) if "fvar" in font else font


def subset_font(src, dest, sx, sy, family, weight, unicodes):
    """Instance a variable OFL source, keep one unicode subset, then scale it like scale_font."""
    from fontTools import subset
    font = instance(src, weight)
    options = subset.Options()
    options.layout_features = ["kern", "liga", "tnum", "lnum", "pnum"]
    sub = subset.Subsetter(options)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    tmp = FONTS / f".{dest}.ttf"
    font.save(tmp)
    scale_font(tmp, dest, sx, sy, family, weight=None)
    tmp.unlink()


# Headline glyphs: Antonio (OFL) at weight 700 scored closest to Tusker Grotesk 3500 Medium in a
# glyph-overlap comparison against the real font (0.87 vs League Gothic's 0.81). It is scaled to
# League Gothic's cap height and to the same mean letter width, so the frame-measured WIDTHS and
# every CSS font-size stay valid.
CALIBRATION_TEXT = "DESIGNEDFORVALUEBUILTTOMRWAXKPHJQZ"
HEADLINE_SRC = SOURCES / "antonio-variable.ttf"
HEADLINE_WEIGHT = 700
# Numbers: Sofia Sans Extra Condensed (OFL) at weight 600 scored closest to Albireo Cond Medium's
# numerals (0.81 vs Barlow Condensed's 0.73). Matched to Barlow Condensed's digit widths.
NUMBER_SRC = SOURCES / "sofia-sans-extra-condensed-variable.ttf"
NUMBER_WEIGHT = 600

league = TTFont(FONTS / LG["latin"])
headline = instance(HEADLINE_SRC, HEADLINE_WEIGHT)
HEAD_Y = cap_em(league) / cap_em(headline)
HEAD_X = HEAD_Y * mean_advance(league, CALIBRATION_TEXT) / mean_advance(headline, CALIBRATION_TEXT)

barlow = TTFont(FONTS / BARLOW["latin"])
number = instance(NUMBER_SRC, NUMBER_WEIGHT)
NUM_Y = cap_em(barlow) / cap_em(number)
NUM_X = NUM_Y * mean_advance(barlow, "0123456789") / mean_advance(number, "0123456789")

for slug, sx in WIDTHS.items():
    family = f"Lasha {slug.title()}"
    for subset_name in ("latin", "latin-ext"):
        subset_font(HEADLINE_SRC, f"lasha-{slug}-{subset_name}.woff2", sx * HEAD_X, HEAD_Y, family,
                    HEADLINE_WEIGHT, LATIN_RANGES[subset_name])
    for subset_name, src in OSWALD.items():
        scale_font(src, f"lasha-{slug}-{subset_name}.woff2", sx * OSWALD_X, OSWALD_Y, family)

for subset_name in LATIN_RANGES:
    subset_font(NUMBER_SRC, f"lasha-num-{subset_name}.woff2", NUM_X, NUM_Y, "Lasha Num",
                NUMBER_WEIGHT, LATIN_RANGES[subset_name])
    subset_font(NUMBER_SRC, f"lasha-num-tall-{subset_name}.woff2", NUM_TALL * NUM_X, NUM_Y,
                "Lasha Num Tall", NUMBER_WEIGHT, LATIN_RANGES[subset_name])

for subset_name in ("latin", "latin-ext", "cyrillic", "cyrillic-ext"):
    scale_font(SOURCES / f"oswald-variable-{subset_name}.woff2", f"lasha-light-{subset_name}.woff2",
               LIGHT_X, LIGHT_Y, "Lasha Light", weight=LIGHT_WEIGHT)

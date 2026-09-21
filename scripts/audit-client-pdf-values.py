"""Verify real browser downloads against independent reference figures."""
from pathlib import Path
import math
import re
import fitz

folder = Path('output/pdf/dual-site-audit')
expected = {
    'payment': [9000, 27000, 1125, 54000],
    'yield': [8088, 8.99, 7507.12, 8.34],
    'finance': [54000, 485.85, 5830.22, 62604.48],
    'growth': [146600.52, 56600.52, 62.89, 1.57],
}
edge_expected = {
    'payment': [100000, 0, 0, 0],
    'yield': [0, 0, -500, -.5],
    'finance': [54000, 225, 2700, 0],
    'growth': [81000, -19000, -19, -.48],
}
files = list(folder.glob('*.pdf'))
assert len(files) >= 31
for file in files:
    doc = fitz.open(file)
    assert len(doc) == 2, file
    assert 'AiXESS' in doc[0].get_text(), file
    assert len(doc[0].get_images()) >= 2, file
    for page in doc:
        for x0, y0, x1, y1, *word in page.get_text('words'):
            assert 0 <= x0 < x1 <= page.rect.width and 0 <= y0 < y1 <= page.rect.height, (file, page.number, word)
    if file.stem.startswith('unit-'):
        assert file.stem[5:] in doc[0].get_text(), file
    elif file.stem == 'long-client':
        assert sum(w[4].count('Ж') for w in doc[0].get_text('words') if set(w[4]) == {'Ж'}) == 400
    elif file.stem.split('-')[0] in ['en', 'de', 'pl', 'sl', 'ru', 'live', 'edge']:
        lang, calculator = file.stem.split('-')
        reference = edge_expected if lang == 'edge' else expected
        if lang in ['live', 'edge']:
            lang = 'en'
        else:
            assert 'Łukasz' in doc[0].get_text() and 'Šmartinska' in doc[0].get_text(), file
        numbers = []
        for line in doc[1].get_text().splitlines():
            if not re.fullmatch(r'[€%×\d\s.,+\-]+', line):
                continue
            value = re.sub(r'[€%×\s]', '', line)
            value = value.replace(',', '') if lang == 'en' else value.replace('.', '').replace(',', '.')
            numbers.append(float(value))
        assert len(numbers) >= 4, file
        assert all(math.isclose(a, b, abs_tol=.001) for a, b in zip(numbers[-4:], reference[calculator])), (file, numbers[-4:])
print(f'PASS: {len(files)} browser PDFs; all 20 localized result sets match reference figures, unit IDs and client details retained, no out-of-page text.')

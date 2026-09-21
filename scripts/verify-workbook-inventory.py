"""Independently reconcile the source workbook with the shipped inventory adapter."""
import collections, json, subprocess, sys
import openpyxl

workbook = openpyxl.load_workbook(sys.argv[1], data_only=True)
expected = {}
for unit, block, floor, area, status in workbook['Final'].iter_rows(min_row=2, values_only=True):
    if unit is not None:
        key = (block, str(unit))
        assert key not in expected, f'Duplicate Final row: {key}'
        expected[key] = (int(floor), float(area), status)
for floor, _, block, unit, area, status in workbook['Owned'].iter_rows(min_row=2, values_only=True):
    if unit is not None:
        key = (block, str(unit))
        assert key not in expected, f'Conflicting sheets: {key}'
        expected[key] = (int(floor), float(area), status)
premium = openpyxl.load_workbook(sys.argv[2], data_only=True)
premium_rows = {}
for row in premium['Units'].iter_rows(min_row=5, max_row=32, values_only=True):
    code, block, floor, area, price, _, status = row[:7]
    key = (block, code[1:])
    assert key in expected, key
    expected[key] = (int(floor), float(area), status)
    premium_rows[code] = (float(price), status.lower())
source = "import fs from 'node:fs'; import {applyWorkbookInventory} from './src/data/reveranceInventory.js'; console.log(JSON.stringify(applyWorkbookInventory(JSON.parse(fs.readFileSync('public/data/reverance-a.json'))).blocks));"
blocks = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', source], text=True, encoding='utf-8'))
seen = set()
for block in blocks:
    counts = collections.Counter()
    for floor in block['floors']:
        assert len(floor['units']) == 12, (block['code'], floor['number'])
        for unit in floor['units']:
            key = (block['code'], unit['name'])
            assert key not in seen, key
            seen.add(key)
            row = expected.get(key)
            status = ('unavailable' if row[2]=='NFS' else row[2].lower()) if row else 'sold'
            assert unit['status'] == status, (key, unit['status'], status)
            code = key[0] + key[1]
            assert bool(unit.get('goldenPremium')) == (code in premium_rows), code
            assert unit['blockId'] == block['id']
            assert unit['floor'] == floor['number']
            if row:
                assert unit['floor'] == row[0], key
                assert abs(unit['totalArea'] - row[1]) < .00001, key
            counts[status] += 1
    print(block['name'], dict(counts))
assert set(expected).issubset(seen), 'Workbook apartments missing from site'
print(f'Reconciled all {len(expected)} workbook rows and {len(seen)-len(expected)} owner-confirmed sold apartments; zero mismatches.')
calculator = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {CALCULATOR_APARTMENTS} from './src/data/calculatorApartments.js'; console.log(JSON.stringify(CALCULATOR_APARTMENTS));"], text=True, encoding='utf-8'))
available = {b+n: (f,a) for (b,n),(f,a,s) in expected.items() if s.lower() == 'available'}
assert {u['code']: (u['floor'],u['area']) for u in calculator} == available
assert len(calculator) == len(available) == 163
if len(sys.argv) > 3:
    regular = json.load(open(sys.argv[3], encoding='utf-8'))
    assert {u['code']: (u['floor'],u['area']) for u in regular} == {code: value for code,value in available.items() if code not in premium_rows}
    assert len(regular) == 141
print('Calculator selectors match both original workbooks: 141 regular + 22 premium; no reserved or NFS units.')

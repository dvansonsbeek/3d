"""
Test if the "medieval bump" in our model residual vs Stephenson 2016 ΔT is a
spline-interpolation artifact through sparse medieval-era data.

Hypothesis: If primary-source observation density is low in the year 800-1300
window, the cubic spline (Table S15) is being constrained mostly by its smoothness
prior + neighboring data, not by direct observations. A purely physical model with
no Common-Era ice mass channel would then disagree systematically with the spline
in that window — and the disagreement would be a data-coverage artifact, not real.

Test:
  1. Count primary-source observations per century from Tables S01-S14.
  2. Also count by year-decade for finer resolution.
  3. Report observation density vs the residual amplitude (already computed).
"""

import re, json
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path('/home/dennis/code/3d/data/rspa20160404supp2')

# Table title -> source category
TABLE_INFO = {
    'S01': ('Babylonian lunar eclipses', 'Babylonian'),
    'S02': ('Babylonian lunar eclipses, ziqpu', 'Babylonian'),
    'S03': ('Babylonian solar eclipses', 'Babylonian'),
    'S04': ('Babylonian lunar eclipses in the Almagest', 'Almagest'),
    'S05': ('Chinese timed lunar eclipses', 'Chinese'),
    'S06': ('Chinese timed solar eclipses', 'Chinese'),
    'S07': ('Greek timed lunar and solar eclipses', 'Greek'),
    'S08': ('Arab timed solar eclipses', 'Arab'),
    'S09': ('Arab timed lunar eclipses', 'Arab'),
    'S10': ('Untimed total/annular solar eclipses', 'Untimed solar (T/A)'),
    'S11': ('Untimed partial solar eclipses', 'Untimed solar (partial)'),
    'S12': ('Untimed solar eclipses rose/set eclipsed', 'Untimed solar (R/S)'),
    'S13': ('Untimed lunar eclipses rose/set eclipsed', 'Untimed lunar (R/S)'),
    'S14': ('Untimed lunar eclipses obscuration estimate', 'Untimed lunar (obsc)'),
}

# Each table has a first column = table id, second column = year (may be negative)
# Match rows that start with whitespace + 2-digit table id + at least one number.
ROW_RE = re.compile(r'^\s+\d{2}\s+(-?\s*\d+)')

def parse_years(filepath):
    years = []
    for line in filepath.read_text().splitlines():
        m = ROW_RE.match(line)
        if not m:
            continue
        raw = m.group(1).replace(' ', '')
        years.append(int(raw))
    return years

def main():
    # Collect all observations: list of (year, table_id, source_category)
    all_obs = []
    print(f'{"Table":<8} {"Source":<24} {"N":>5}  {"Range":<20}')
    print('-' * 60)
    for table_id, (descr, category) in TABLE_INFO.items():
        fp = DATA_DIR / f'Table-{table_id}.txt'
        years = parse_years(fp)
        for y in years:
            all_obs.append((y, table_id, category))
        if years:
            print(f'{table_id:<8} {category:<24} {len(years):>5}  [{min(years):>5}, {max(years):>5}]')
        else:
            print(f'{table_id:<8} {category:<24} {len(years):>5}  (empty)')

    print('-' * 60)
    print(f'{"TOTAL":<8} {"":<24} {len(all_obs):>5}  [{min(y for y,_,_ in all_obs)}, {max(y for y,_,_ in all_obs)}]')

    # Count per century
    print()
    print('=' * 70)
    print('Observation density per century (-720 to 1700)')
    print('=' * 70)
    by_century = defaultdict(int)
    for y, _, _ in all_obs:
        century = (y // 100) * 100
        by_century[century] += 1

    print(f'{"Century":<14} {"N obs":>7}  Density')
    print('-' * 70)
    medieval_window = []
    for c in sorted(by_century):
        n = by_century[c]
        bar = '#' * min(n, 50)
        marker = ''
        if 800 <= c <= 1200:
            marker = ' <-- MEDIEVAL'
            medieval_window.append((c, n))
        print(f'{c:>5} to {c+99:<5} {n:>7}  {bar}{marker}')

    # Per-century breakdown by source for medieval window
    print()
    print('=' * 70)
    print(f'Medieval window (year 700 to 1399): breakdown by source')
    print('=' * 70)
    medieval_obs = [(y, t, c) for (y, t, c) in all_obs if 700 <= y <= 1399]
    by_century_cat = defaultdict(lambda: defaultdict(int))
    for y, t, cat in medieval_obs:
        century = (y // 100) * 100
        by_century_cat[century][cat] += 1
    cats = sorted(set(c for _, _, c in medieval_obs))
    header = f'{"Century":<14}' + ''.join(f'{c[:14]:>16}' for c in cats) + f'{"Total":>10}'
    print(header)
    print('-' * len(header))
    for c in sorted(by_century_cat):
        row = f'{c:>5} to {c+99:<5}'
        total = 0
        for cat in cats:
            n = by_century_cat[c].get(cat, 0)
            total += n
            row += f'{n:>16}'
        row += f'{total:>10}'
        print(row)

    # Also: compare medieval density to flanking periods (where our model agrees)
    print()
    print('=' * 70)
    print('Average observations per century by period')
    print('=' * 70)
    def avg_per_century(y_lo, y_hi):
        n = sum(1 for y, _, _ in all_obs if y_lo <= y <= y_hi)
        spans = (y_hi - y_lo + 1) / 100.0
        return n, spans, n / spans
    for lo, hi, label in [
        (-720, -100, 'Babylonian era (-720 to -100)'),
        (-100,  400, 'Greek/early Chinese (-100 to 400)'),
        ( 400,  700, 'Early medieval (400-700)'),
        ( 700, 1000, 'Pre-MWP / early MWP (700-1000)'),
        (1000, 1300, 'MWP peak (1000-1300)'),
        (1300, 1600, 'Late medieval (1300-1600)'),
        (1600, 1700, 'Telescopic era (1600-1700)'),
    ]:
        n, spans, density = avg_per_century(lo, hi)
        bar = '#' * int(density)
        print(f'  {label:<35} {n:>4} obs / {spans:.1f} cy = {density:>6.1f} obs/cy  {bar}')

    # Decade-resolution density in the medieval window
    print()
    print('=' * 70)
    print('Decade-resolution density in medieval window (year 600-1400)')
    print('=' * 70)
    by_decade = defaultdict(int)
    for y, _, _ in all_obs:
        if 600 <= y <= 1400:
            decade = (y // 10) * 10
            by_decade[decade] += 1
    print(f'{"Decade":<10} {"N":>4}  Cumulative')
    print('-' * 40)
    cumul = 0
    for d in range(600, 1410, 10):
        n = by_decade.get(d, 0)
        cumul += n
        bar = '#' * n
        marker = ' <-- peak medieval bump (year 960)' if d == 960 else ''
        if n == 0 and 800 <= d <= 1300:
            marker += ' [NO DATA]'
        print(f'{d:>5}-{d+9:<3} {n:>4}  {bar}{marker}')

    # Stephenson polynomial Table S15 — show segment boundaries (knots)
    # to see if knots are placed where data is sparse
    print()
    print('=' * 70)
    print('Stephenson spline knot positions (Table S15) vs observation density')
    print('=' * 70)
    spline = json.loads(Path('/home/dennis/code/3d/public/input/stephenson-2016-deltaT-polynomial.json').read_text())
    print(f'{"Segment":>4} {"Knot Y0":>10} {"Knot Y1":>10} {"Width":>8} {"Obs in seg":>12}')
    print('-' * 60)
    for seg in spline['segments']:
        if -100 <= seg['y0'] <= 1700:
            n_in_seg = sum(1 for y, _, _ in all_obs if seg['y0'] <= y <= seg['y1'])
            width = seg['y1'] - seg['y0']
            marker = ''
            if 800 <= seg['y0'] <= 1300:
                marker = ' <-- MEDIEVAL'
            print(f'{seg["i"]:>4} {seg["y0"]:>10.1f} {seg["y1"]:>10.1f} {width:>8.0f} {n_in_seg:>12}{marker}')

if __name__ == '__main__':
    main()

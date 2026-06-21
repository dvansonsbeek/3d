"""
Parse the 6 timed-lunar-eclipse tables from the Stephenson, Morrison & Hohenkerk
(2016) supplementary material into a single JSON catalog.

Input  : /home/dennis/code/3d/data/rspa20160404supp2/Table-S{01,02,04,05,07,09}.txt
Output : public/input/lunar-eclipses-stephenson-2016.json

Each row in the source tables encodes a SINGLE OBSERVATION'S derived ΔT value
(seconds). Stephenson et al. have already done the work of converting each
primary-source observed contact time (Babylonian / Chinese / Greek / Arab) into
an implied ΔT for that year. This means the L-5b comparison reduces to a clean
three-way ΔT test:

    obs ΔT  vs  NASA Espenak/Meeus ΔT  vs  model pure-tidal ΔT

Phase L-5b's console button (added to src/script.js) consumes this JSON and
reports which ΔT model (NASA's empirical fit vs our pure-tidal first-principles)
sits closer to the primary-source observations.

Total: ~270 timed lunar observations spanning -720 BCE to 1280 CE.

Source: Stephenson, F.R., Morrison, L.V., Hohenkerk, C.Y. (2016). Measurement
of the Earth's Rotation 720 BC to AD 2015. Proc. Roy. Soc. A 472:20160404.
https://royalsocietypublishing.org/doi/10.1098/rspa.2016.0404
"""

import re, json, sys
from pathlib import Path

SRC = Path('/home/dennis/code/3d/data/rspa20160404supp2')
OUT = Path(__file__).parent.parent / 'public' / 'input' / 'lunar-eclipses-stephenson-2016.json'

TABLE_NAMES = {
    'S01': 'Babylonian lunar eclipses',
    'S02': 'Babylonian lunar eclipses, culmination of ziqpu star',
    'S04': 'Babylonian lunar eclipses in the Almagest',
    'S05': 'Chinese timed lunar eclipses',
    'S07': 'Greek timed lunar and solar eclipses',
    'S09': 'Arab timed lunar eclipses',
}

# Numbers in the source tables may have a space between the sign and the digits
# (e.g. "- 95" for -95, "- 50" for -50). NUM matches signed integers with optional
# whitespace after the sign.
NUM = r'-?\s*\d+'

# Simple 4-column rows (S02, S05, S07, S09):  TableNum  Year  DT(s)  Weight
SIMPLE_ROW = re.compile(rf'^\s+(\d{{2}})\s+({NUM})\s+({NUM})\s+(\d+)\s*$')

# S01 has an extra "Degree" column between DT and Weight:  TableNum  Year  DT(s)  Degree  Weight
# Degree examples: "+100", "+ 20", "+ 30?"
S01_ROW = re.compile(rf'^\s+01\s+({NUM})\s+({NUM})\s+([+\-]\s*\d+\??)\s+(\d+)\s*$')

# S04 discrete-results rows have a free-text "Measurement" column:
#   TableNum  Year  DT(s)  Measurement  Weight
S04_DISCRETE_ROW = re.compile(r'^\s+04\s+(-?\d+)\s+(-?\d+)\s+(.{30,60}?)\s+(\d+)\s*$')

# S04 bounds-only rows (first section): TableNum Year DT-L(s) DT-U(s) Note...
S04_BOUNDS_ROW = re.compile(r'^\s+04\s+(-?\d+)\s+(\.{3,}|\d+|\[?\d+\]?)\s+(\.{3,}|\d+|\[?\d+\]?)\s+(.+?)\s*$')

def _int(s):
    """Parse an integer that may have a space between sign and digits ('- 95')."""
    return int(re.sub(r'\s+', '', s))

def parse_simple(path, table):
    out = []
    for line in path.read_text().splitlines():
        m = SIMPLE_ROW.match(line)
        if not m: continue
        tab, year, dt, weight = m.groups()
        if tab != table[-2:]: continue
        out.append({
            'source_table':      table,
            'source_table_name': TABLE_NAMES[table],
            'year':              _int(year),
            'dt_observed_sec':   _int(dt),
            'weight':            int(weight),
        })
    return out

def parse_s01(path):
    out = []
    for line in path.read_text().splitlines():
        m = S01_ROW.match(line)
        if not m: continue
        year, dt, degree, weight = m.groups()
        out.append({
            'source_table':      'S01',
            'source_table_name': TABLE_NAMES['S01'],
            'year':              _int(year),
            'dt_observed_sec':   _int(dt),
            'weight':            int(weight),
            'degree':            re.sub(r'\s+', '', degree),
        })
    return out

def parse_s04(path):
    """S04 has a bounds-only section + a discrete-results section."""
    out = []
    section = None  # 'bounds' or 'discrete'
    for line in path.read_text().splitlines():
        if 'Discrete results' in line:
            section = 'discrete'; continue
        if section == 'discrete':
            m = S04_DISCRETE_ROW.match(line)
            if m:
                year, dt, measurement, weight = m.groups()
                out.append({
                    'source_table':      'S04',
                    'source_table_name': TABLE_NAMES['S04'],
                    'year':              int(year),
                    'dt_observed_sec':   int(dt),
                    'weight':            int(weight),
                    'measurement':       measurement.strip(),
                })
        else:
            # bounds-only rows — present at top of S04, not used by main comparison
            m = S04_BOUNDS_ROW.match(line)
            if m and section is None:
                year, dt_l_raw, dt_u_raw, note = m.groups()
                def parse_bound(v):
                    if v == '...' or v.startswith('..'): return None
                    return int(re.sub(r'[\[\]]', '', v))
                out.append({
                    'source_table':      'S04',
                    'source_table_name': TABLE_NAMES['S04'],
                    'year':              int(year),
                    'dt_observed_sec':   None,  # bounded entry, no single value
                    'dt_lower_sec':      parse_bound(dt_l_raw),
                    'dt_upper_sec':      parse_bound(dt_u_raw),
                    'weight':            None,
                    'note':              note.strip(),
                })
    return out

def main():
    entries = []
    for table in ['S01', 'S02', 'S05', 'S07', 'S09']:
        path = SRC / f'Table-{table}.txt'
        rows = parse_s01(path) if table == 'S01' else parse_simple(path, table)
        print(f'  {table} ({TABLE_NAMES[table]}): {len(rows)} rows', file=sys.stderr)
        entries.extend(rows)

    s04 = parse_s04(SRC / 'Table-S04.txt')
    print(f'  S04 ({TABLE_NAMES["S04"]}): {len(s04)} rows', file=sys.stderr)
    entries.extend(s04)

    # Sort by year
    entries.sort(key=lambda e: (e['year'], e['source_table']))

    out = {
        '_meta': {
            'description':
              "Timed lunar eclipse observations from Stephenson, Morrison & Hohenkerk (2016), "
              "Proc. Roy. Soc. A 472:20160404 — supplementary tables S01, S02, S04, S05, S07, S09. "
              "Each row is a single primary-source observation reduced by the Stephenson team to "
              "an implied ΔT value (seconds). Phase L-5b uses this to compare our pure-tidal ΔT "
              "model and NASA's Espenak/Meeus polynomial directly against observation-derived ΔT.",
            'source_paper':    'Stephenson, F.R., Morrison, L.V., Hohenkerk, C.Y. (2016) Proc. Roy. Soc. A 472:20160404',
            'source_url':      'https://royalsocietypublishing.org/doi/10.1098/rspa.2016.0404',
            'time_range':      f"{entries[0]['year']} to {entries[-1]['year']}",
            'count':           len(entries),
            'tables_included': {k: TABLE_NAMES[k] for k in sorted(TABLE_NAMES)},
            'generator':       'scripts/parse_stephenson_lunar.py',
            'field_definitions': {
                'source_table':      "Table id in Stephenson supplementary (S01, S02, S04, S05, S07, S09).",
                'source_table_name': "Descriptive name from Stephenson 2016.",
                'year':              "Calendar year of observation (negative for BCE; proleptic Julian).",
                'dt_observed_sec':   "ΔT in seconds derived by Stephenson from this observation. NULL for S04 bounds-only entries.",
                'weight':            "Observation weight assigned by Stephenson (higher = more reliable; 0 = lowest). NULL for bounds-only.",
                'degree':            "S01 only: umbral magnitude (or qualitative '?' suffix).",
                'measurement':       "S04 only: narrative description of how the contact was timed.",
                'dt_lower_sec':      "S04 bounds rows only: ΔT lower limit (s).",
                'dt_upper_sec':      "S04 bounds rows only: ΔT upper limit (s).",
                'note':              "S04 bounds rows only: source note.",
            },
        },
        'entries': entries,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f'\nWrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT} '
          f'({OUT.stat().st_size // 1024} KB, {len(entries)} entries)', file=sys.stderr)

if __name__ == '__main__':
    main()

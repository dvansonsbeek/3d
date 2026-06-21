"""
Parse the 3 timed-solar-eclipse tables from the Stephenson, Morrison & Hohenkerk
(2016) supplementary material into a single JSON catalog.

Input  : /home/dennis/code/3d/data/rspa20160404supp2/Table-S{03,06,08}.txt
Output : public/input/solar-eclipses-stephenson-2016.json

Each row in the source tables encodes a SINGLE OBSERVATION'S derived ΔT value
(seconds). Stephenson et al. have already done the work of converting each
primary-source observed contact time (Babylonian, Chinese, Arab) into an
implied ΔT for that year — so the L-7 comparison reduces to the same clean
three-way ΔT test as L-5b but on an independent eclipse type:

    obs ΔT  vs  NASA Espenak/Meeus ΔT  vs  model pure-tidal + GIA α(t) ΔT

Phase L-7's console button (added to src/script.js) consumes this JSON and
reports whether the α(t) GIA viscoelastic correction — validated in doc 102
against 270 lunar observations — also holds up against the independent solar
observation record.

Total: 89 timed solar observations spanning -356 BCE to 1019 CE.

Source: Stephenson, F.R., Morrison, L.V., Hohenkerk, C.Y. (2016). Measurement
of the Earth's Rotation 720 BC to AD 2015. Proc. Roy. Soc. A 472:20160404.
https://royalsocietypublishing.org/doi/10.1098/rspa.2016.0404

Implementation mirrors scripts/parse_stephenson_lunar.py — same row format
across all six timed Stephenson tables (S01/S02/S04/S05/S07/S09 lunar +
S03/S06/S08 solar). S03 (Babylonian solar) has the extra "Degree" column
like S01 (Babylonian lunar); S06 and S08 use the simpler 4-column format.
"""

import re, json, sys
from pathlib import Path

SRC = Path('/home/dennis/code/3d/data/rspa20160404supp2')
OUT = Path(__file__).parent.parent / 'public' / 'input' / 'solar-eclipses-stephenson-2016.json'

TABLE_NAMES = {
    'S03': 'Babylonian solar eclipses',
    'S06': 'Chinese timed solar eclipses',
    'S08': 'Arab timed solar eclipses',
}

NUM = r'-?\s*\d+'
SIMPLE_ROW = re.compile(rf'^\s+(\d{{2}})\s+({NUM})\s+({NUM})\s+(\d+)\s*$')
S03_ROW    = re.compile(rf'^\s+03\s+({NUM})\s+({NUM})\s+([+\-]\s*\d+\??)\s+(\d+)\s*$')

def _int(s):
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

def parse_s03(path):
    out = []
    for line in path.read_text().splitlines():
        m = S03_ROW.match(line)
        if not m: continue
        year, dt, degree, weight = m.groups()
        out.append({
            'source_table':      'S03',
            'source_table_name': TABLE_NAMES['S03'],
            'year':              _int(year),
            'dt_observed_sec':   _int(dt),
            'weight':            int(weight),
            'degree':            re.sub(r'\s+', '', degree),
        })
    return out

def main():
    entries = []
    entries.extend(parse_s03(SRC / 'Table-S03.txt'))
    print(f'  S03 ({TABLE_NAMES["S03"]}): {len(entries)} rows', file=sys.stderr)
    for tab in ['S06', 'S08']:
        rows = parse_simple(SRC / f'Table-{tab}.txt', tab)
        print(f'  {tab} ({TABLE_NAMES[tab]}): {len(rows)} rows', file=sys.stderr)
        entries.extend(rows)

    entries.sort(key=lambda e: (e['year'], e['source_table']))

    out = {
        '_meta': {
            'description':
              "Timed solar eclipse observations from Stephenson, Morrison & Hohenkerk (2016), "
              "Proc. Roy. Soc. A 472:20160404 — supplementary tables S03, S06, S08. "
              "Each row is a single primary-source observation reduced by the Stephenson team to "
              "an implied ΔT value (seconds). Phase L-7 uses this as an INDEPENDENT cross-check "
              "(separate from the L-5b lunar 270-event validation in doc 102) that the GIA "
              "viscoelastic α(t) correction holds up against the solar observation record.",
            'source_paper':    'Stephenson, F.R., Morrison, L.V., Hohenkerk, C.Y. (2016) Proc. Roy. Soc. A 472:20160404',
            'source_url':      'https://royalsocietypublishing.org/doi/10.1098/rspa.2016.0404',
            'time_range':      f"{entries[0]['year']} to {entries[-1]['year']}",
            'count':           len(entries),
            'tables_included': {k: TABLE_NAMES[k] for k in sorted(TABLE_NAMES)},
            'generator':       'scripts/parse_stephenson_solar.py',
            'field_definitions': {
                'source_table':      "Table id in Stephenson supplementary (S03, S06, S08).",
                'source_table_name': "Descriptive name from Stephenson 2016.",
                'year':              "Calendar year of observation (negative for BCE; proleptic Julian).",
                'dt_observed_sec':   "ΔT in seconds derived by Stephenson from this observation.",
                'weight':            "Observation weight assigned by Stephenson (higher = more reliable; 0 = lowest).",
                'degree':            "S03 only: qualitative magnitude / phase description from cuneiform record.",
            },
            'note_on_completeness': (
                "Stephenson 2016 also has untimed solar eclipse tables S10 (total/annular at site), "
                "S11 (partial at site), S12 (sunrise/sunset eclipsed). These are NOT reduced to a "
                "single ΔT value per observation (they yield ΔT BOUNDS instead) so they require a "
                "different validation methodology than the timed-observation tables above."
            ),
        },
        'entries': entries,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f'\nWrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT} '
          f'({OUT.stat().st_size // 1024} KB, {len(entries)} entries)', file=sys.stderr)

if __name__ == '__main__':
    main()

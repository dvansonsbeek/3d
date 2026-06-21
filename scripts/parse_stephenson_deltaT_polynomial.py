"""
Parse Stephenson, Morrison & Hohenkerk (2016) ΔT polynomial spline (Table S15)
into JSON for the L-track diagnostic.

Input  : data/rspa20160404supp2/Table-S15.txt
Output : public/input/stephenson-2016-deltaT-polynomial.json

Stephenson 2016 fits a piecewise cubic spline to their full ΔT compilation
(both timed observations AND untimed visibility constraints) for the range
-720 BCE to 2016 CE. 54 spline segments. Their fit is the "official" ΔT for
this dataset — independent of NASA's Espenak/Meeus polynomial.

Used by the L-5b diagnostic to compare our model's residual structure against
the residual structure of Stephenson's own fit. If both show the same
medieval-era signature → the bump is in the data (not our model). If only
ours shows it → our model has a specific issue.

Polynomial evaluation:
    For Y in [K_i, K_{i+1}], compute
      t  = (Y - K_i) / (K_{i+1} - K_i)
      ΔT = a_0 + a_1·t + a_2·t² + a_3·t³   [seconds]

Usage:
    python3 scripts/parse_stephenson_deltaT_polynomial.py
"""

import re, json, sys
from pathlib import Path

SRC = Path('/home/dennis/code/3d/data/rspa20160404supp2/Table-S15.txt')
OUT = Path(__file__).parent.parent / 'public' / 'input' / 'stephenson-2016-deltaT-polynomial.json'

# Match data rows like:
#   1    -720.0     400.0   20550.593  -21268.478   11863.418   -4541.129
ROW_RE = re.compile(
    r'^\s+(\d+)\s+'                              # row index
    r'(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+'           # K_i, K_{i+1}
    r'(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+'           # a_0, a_1
    r'(-?\d+\.\d+)\s+(-?\d+\.\d+)\s*$'          # a_2, a_3
)

def main():
    text = SRC.read_text()
    segments = []
    for line in text.splitlines():
        m = ROW_RE.match(line)
        if not m: continue
        i, k0, k1, a0, a1, a2, a3 = m.groups()
        segments.append({
            'i':   int(i),
            'y0':  float(k0),
            'y1':  float(k1),
            'a':   [float(a0), float(a1), float(a2), float(a3)],
        })
    if not segments:
        print('ERROR: no segments parsed. Check Table-S15.txt format.', file=sys.stderr)
        sys.exit(1)

    # Sanity-check: continuity at segment boundaries (should be tight on a cubic spline)
    print(f'Parsed {len(segments)} spline segments covering {segments[0]["y0"]} to {segments[-1]["y1"]}', file=sys.stderr)
    print(f'Continuity check at segment boundaries:', file=sys.stderr)
    for k in range(len(segments) - 1):
        seg = segments[k]
        next_seg = segments[k+1]
        # Evaluate end of segment k at t=1
        a = seg['a']
        v_end = a[0] + a[1] + a[2] + a[3]
        # Evaluate start of segment k+1 at t=0
        v_start = next_seg['a'][0]
        diff = v_start - v_end
        if abs(diff) > 0.01:
            print(f'  boundary {seg["y1"]}: end seg {k+1} = {v_end:.4f}, start seg {k+2} = {v_start:.4f}, diff = {diff:+.4f}', file=sys.stderr)
    print(f'  (small differences expected; cubic spline fit is not C0-continuous everywhere)', file=sys.stderr)

    # Spot-check known values
    def evaluate(year):
        for seg in segments:
            if seg['y0'] <= year <= seg['y1']:
                t = (year - seg['y0']) / (seg['y1'] - seg['y0'])
                a = seg['a']
                return a[0] + a[1]*t + a[2]*t**2 + a[3]*t**3
        return None

    print(f'\nSpot-check values (from Stephenson polynomial):', file=sys.stderr)
    for y in [-700, 0, 500, 1000, 1500, 1900, 1950, 2000, 2015]:
        dt = evaluate(y)
        print(f'  year {y:6d}: ΔT = {dt:.2f} s' if dt is not None else f'  year {y:6d}: out of range', file=sys.stderr)

    # Write JSON
    out = {
        '_meta': {
            'description': "Stephenson, Morrison & Hohenkerk (2016) ΔT polynomial spline coefficients "
                           "from Proc. Roy. Soc. A 472:20160404 supplementary Table S15. "
                           "Piecewise cubic spline covering -720 BCE to 2016 CE, fitted to their "
                           "compiled observation dataset. Independent reference for comparing the "
                           "framework's ΔT predictions against the standard published fit.",
            'source_paper':    'Stephenson, F.R., Morrison, L.V., Hohenkerk, C.Y. (2016) Proc. Roy. Soc. A 472:20160404',
            'source_url':      'https://royalsocietypublishing.org/doi/10.1098/rspa.2016.0404',
            'source_table':    'S15',
            'segments':        len(segments),
            'year_range':      f'[{segments[0]["y0"]}, {segments[-1]["y1"]}]',
            'evaluation':      'For year Y in [y0, y1]: t = (Y - y0)/(y1 - y0); ΔT = a[0] + a[1]·t + a[2]·t² + a[3]·t³ seconds',
            'generator':       'scripts/parse_stephenson_deltaT_polynomial.py',
        },
        'segments': segments,
    }
    OUT.write_text(json.dumps(out, indent=2))
    print(f'\nWrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT} ({OUT.stat().st_size // 1024} KB)', file=sys.stderr)

if __name__ == '__main__':
    main()

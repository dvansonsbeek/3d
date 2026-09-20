#!/usr/bin/env python3
"""
L1 physical lines — THE ONE HOME of the climate formula's orbital line list
(holisticuniverse plan 06, T1 disposition; owner 2026-09-20).

    python3 scripts/l1_physical_lines.py            print the list
    python3 scripts/l1_physical_lines.py --write    write data/l1-physical-lines.json (inputs-stamped)

Every line is DERIVED from the engine's own spectrum (data/t1-engine-frequencies.json:
Earth's z and ζ secular modes from the 20-Myr deep mode table, and the of-date
precession rate p at J2000 from createModel). Berger/Laskar-style combinations:

    eccentricity          |g_i − g_j|      amplitude A_i·A_j
    obliquity             p + s_i          amplitude A_i
    climatic precession   p + g_i          amplitude A_i

Selection rule (one threshold, stated): relative amplitude within its family
≥ REL_THRESHOLD, period inside BAND_KYR, lines closer than DEDUPE are one line.
T1 measured this rule against a same-size random null: the physical set beats
the null in every LR04 regime up to ~25 lines and stops doing so beyond — the
threshold 0.1 gives the largest defensible set (25 lines: 10 ecc, 10 obl, 5 prec).

Plus the 405-kyr family: the g₂ − g₅ eccentricity fundamental (the engine's
20-Myr value, 405.6 kyr; the 1-Myr-window readings 388–425 kyr are inside that
window's Rayleigh uncertainty of ±164 kyr and are NOT distinct periods) and its
2nd / 3rd harmonics — the carbon-thermostat family of doc 92 §3, labelled
climate-internal, folded from the former L2 layer.

Consumers (the campaign moves them here one by one): scripts/milankovitch_
climate_formula.py, the constants generator, the runtime evaluators.
"""
import json
import platform
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools' / 'fit' / 'python'))
from artifact_inputs import build_inputs_block  # noqa: E402

SELF_REL = 'scripts/l1_physical_lines.py'
FREQ_REL = 'data/t1-engine-frequencies.json'
OUT_REL = 'data/l1-physical-lines.json'

REL_THRESHOLD = 0.1
BAND_KYR = (14.0, 300.0)
DEDUPE = 0.005

FREQ = json.loads((ROOT / FREQ_REL).read_text())
p = FREQ['pArcsecPerYr']
z, zeta = FREQ['z'], FREQ['zeta']


def period_kyr(f):
    return 1296000.0 / abs(f) / 1000.0


def candidates():
    c = []
    for i in range(len(z)):
        for j in range(i + 1, len(z)):
            f = z[i]['arcsecPerYr'] - z[j]['arcsecPerYr']
            if abs(f) > 1e-9:
                c.append(dict(family='eccentricity', label=f'g{i}−g{j}', arcsecPerYr=abs(f), amp=z[i]['amp'] * z[j]['amp']))
    for i, m in enumerate(zeta):
        c.append(dict(family='obliquity', label=f'p+s{i}', arcsecPerYr=p + m['arcsecPerYr'], amp=m['amp']))
    for i, m in enumerate(z):
        c.append(dict(family='climatic precession', label=f'p+g{i}', arcsecPerYr=p + m['arcsecPerYr'], amp=m['amp']))
    for x in c:
        x['periodKyr'] = period_kyr(x['arcsecPerYr'])
    for fam in ('eccentricity', 'obliquity', 'climatic precession'):
        amax = max(x['amp'] for x in c if x['family'] == fam)
        for x in c:
            if x['family'] == fam:
                x['relAmp'] = x['amp'] / amax
    return c


def select(c):
    keep = [x for x in c if BAND_KYR[0] <= x['periodKyr'] <= BAND_KYR[1] and x['relAmp'] >= REL_THRESHOLD]
    out = []
    for x in sorted(keep, key=lambda x: -x['relAmp']):
        if all(abs(x['periodKyr'] - o['periodKyr']) / o['periodKyr'] > DEDUPE for o in out):
            out.append(x)
    return sorted(out, key=lambda x: x['periodKyr'])


def family_405():
    zs = sorted(z, key=lambda m: -m['amp'])
    g5, g2 = zs[0]['arcsecPerYr'], zs[1]['arcsecPerYr']
    P = period_kyr(g2 - g5)
    return [
        dict(family='eccentricity fundamental', label='g₂−g₅', periodKyr=P, arcsecPerYr=abs(g2 - g5), note='the engine’s 20-Myr mean beat; the long-eccentricity metronome'),
        dict(family='climate-internal harmonic', label='(g₂−g₅)/2', periodKyr=P / 2, note='carbon-thermostat 2nd harmonic (doc 92 §3), not orbital forcing'),
        dict(family='climate-internal harmonic', label='(g₂−g₅)/3', periodKyr=P / 3, note='carbon-thermostat 3rd harmonic (doc 92 §3), not orbital forcing'),
    ]


def main():
    t0 = time.time()
    orbital = select(candidates())
    fam = family_405()
    lines = orbital + fam
    counts = {}
    for x in orbital:
        counts[x['family']] = counts.get(x['family'], 0) + 1
    print(f'L1 physical lines — threshold rel ≥ {REL_THRESHOLD}, band {BAND_KYR[0]:.0f}–{BAND_KYR[1]:.0f} kyr, dedupe {DEDUPE*100:.1f} % · p = {p:.4f} ″/yr')
    print(f'  {len(orbital)} orbital lines {counts} + {len(fam)} in the 405-kyr family = {len(lines)}')
    for x in lines:
        print(f"  {x['periodKyr']:8.2f} kyr  {x['family']:26s} {x['label']:10s}" + (f"  rel {x['relAmp']:.3f}" if 'relAmp' in x else f"  {x['note']}"))
    if '--write' in sys.argv:
        out = dict(
            _description=__doc__.strip(),
            config=dict(relThreshold=REL_THRESHOLD, bandKyr=list(BAND_KYR), dedupeFrac=DEDUPE, pArcsecPerYr=p, source=FREQ_REL),
            lines=[{k: v for k, v in x.items() if k != 'amp'} for x in lines],
            periodsKyr=[x['periodKyr'] for x in lines],
            meta=dict(script=SELF_REL, doc='docs/92-climate-formula.md (T1 disposition, plan 06)', runtime_sec=time.time() - t0, environment=dict(python=platform.python_version())),
            inputs=build_inputs_block(f'python3 {SELF_REL} --write', [FREQ_REL, SELF_REL]),
        )
        (ROOT / OUT_REL).write_text(json.dumps(out, indent=1) + '\n')
        print(f'wrote {OUT_REL}')


if __name__ == '__main__':
    main()

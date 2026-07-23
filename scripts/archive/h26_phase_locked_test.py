"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

H/26 phase-locked test: is the ~12.9-kyr archive line phased on the
Jupiter/Saturn-perihelion symmetric-alignment epochs?

Hypothesis (invariable-plane explorer observation): Jupiter's and Saturn's
perihelion points align symmetrically about Earth's every H/26 = 8H/208 =
12,896.8 yr, at epochs ≈ −31,200 / −18,300 / −5,500 / +7,400 CE. The band
scan (data/lattice-scan-band-3500-15000.json) independently found n = 207
(12,959 yr, unresolvable from 208) significant at ~3× the permutation p95 in
BOTH long archives (EPICA CO₂, Cheng speleothem). Period alone cannot
distinguish this clock from conventional semi-precession (H/26 = half of
H/13); the discriminating quantity is PHASE.

Test design (per archive, quadratic detrend as in the band scan):
  1. FREE fit at n = 208: amplitude + phase (2 dof), permutation p95
     (circular-shift-free label permutation, as in lattice_harmonic_scan).
  2. LOCKED fit: extrema pinned at the alignment epochs — single regressor
     cos(ω(y − 7,400)), signed amplitude only (1 dof; sign free because the
     hypothesis does not specify which polarity each archive should show).
  3. Report: locked/free amplitude retention |A_locked|/A_free (= |cos Δφ|),
     the phase offset in years, and whether the LOCKED amplitude still clears
     its own permutation p95.

Archives: Cheng δ¹⁸O (640 kyr, ~50 cycles), EPICA CO₂ (800 kyr, ~62 cycles),
GISP2 temperature (50 kyr, ~3.9 cycles — marginal), Bond stack (11.5 kyr,
< 1 cycle — reported unresolvable), Steinhilber TSI (9.4 kyr — unresolvable).

RESULTS ADDENDUM (superposed-epoch fold, run separately — keep these caveats
with the headline numbers):
  1. PATTERN, NOT PEAKS: the epoch-fold shows NO event-like anomaly at the
     alignment epochs (lag-0 bins unremarkable in both archives). What the
     locked fit detects is a small distributed periodic modulation (Cheng:
     ~0.1-0.3 permil on a 1.19-permil-std series, a few % of variance).
  2. The "4-yr extremum offset" (Cheng) is the phase of the best-fitting
     smooth cosine (uncertainty ~±300 yr); the folded composite is lumpy,
     with its actual minimum at lag +1,600..+2,100 yr.
  3. EPICA ALIASING: one folded bin (+40.6 ppm at lag −5,900..−5,400) is the
     ~100-kyr glacial terminations stacking (100 kyr ≈ 7.75 P) — part of
     EPICA's significance is sawtooth leakage. Cheng is the clean witness.
  4. DEGENERACY: the J/S-symmetric epochs sit ~295 yr from the framework's
     perihelion-solstice comb (perihelionalignmentYear 1246 + k·P/2), inside
     the phase resolution — the test cannot separate the J/S-perihelion clock
     from conventional semi-precession. Also NOT a swing driver (timescale:
     12.9 kyr cannot pace 1-3.5-kyr episodes).

Output: data/h26-phase-locked-test.json
Run:    python3 scripts/h26_phase_locked_test.py
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'h26-phase-locked-test.json'
sys.path.insert(0, str(REPO / 'scripts'))
from lattice_harmonic_scan import load_cheng, load_epica, load_steinhilber  # noqa: E402

EIGHT_H = 8 * 335317
N_H26 = 208
P = EIGHT_H / N_H26                      # 12,896.8 yr
OMEGA = 2.0 * math.pi / P
EPOCH_REF = 7400.0                        # locked extremum epoch (others follow at k·P)
ALIGN_EPOCHS = [-31200, -18300, -5500, 7400]
N_PERM = 500
RNG = np.random.default_rng(208)


def load_gisp2():
    rows = []
    for ln in open(REPO / 'data/gisp2-alley2000-raw.txt', encoding='latin-1'):
        p = ln.split()
        if len(p) == 2:
            try:
                a, t = float(p[0]), float(p[1])
                if 0 < a < 50 and -60 < t < -20:
                    rows.append([1950.0 - a * 1000.0, t])
            except ValueError:
                pass
    arr = np.array(sorted(rows))
    return arr[:, 0], arr[:, 1], {'label': 'GISP2 temperature (Alley 2000)'}


def load_bond_stack():
    lines = open(REPO / 'data/bond2001-raw.txt', encoding='latin-1').read().splitlines()
    rows = []
    for ln in lines:
        p = ln.split()
        if len(p) == 10:
            try:
                rows.append([float(x) for x in p])
            except ValueError:
                pass
    arr = np.array(rows)
    m = arr[:, 8] <= 11550
    return 1950.0 - arr[m, 8][::-1], arr[m, 9][::-1], {'label': 'Bond 2001 stacked %HSG'}


def detrend_quad(years, series):
    t = (years - years.mean()) / 1000.0
    X = np.column_stack([np.ones_like(t), t, t * t])
    b, *_ = np.linalg.lstsq(X, series, rcond=None)
    return series - X @ b


def free_fit(years, y):
    X = np.column_stack([np.cos(OMEGA * years), np.sin(OMEGA * years)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(math.hypot(b[0], b[1])), float(math.degrees(math.atan2(b[1], b[0])))


def locked_fit(years, y):
    c = np.cos(OMEGA * (years - EPOCH_REF))
    a = float(np.dot(c, y) / np.dot(c, c))
    return a


def perm_p95(years, y, fitter, n_perm=N_PERM):
    amps = []
    for _ in range(n_perm):
        perm = RNG.permutation(len(y))
        r = fitter(years, y[perm])
        amps.append(abs(r[0]) if isinstance(r, tuple) else abs(r))
    return float(np.percentile(amps, 95))


def main():
    print('=' * 88)
    print(f'H/26 PHASE-LOCKED TEST — n = {N_H26}, P = {P:.1f} yr; extrema pinned at '
          f'{ALIGN_EPOCHS} CE')
    print('=' * 88)

    datasets = {}
    for name, loader in [('cheng', load_cheng), ('epica', load_epica),
                         ('gisp2', load_gisp2), ('bond_stack', load_bond_stack),
                         ('steinhilber', load_steinhilber)]:
        years, series, meta = loader()
        years = np.asarray(years, dtype=float)
        series = np.asarray(series, dtype=float)
        span = years.max() - years.min()
        cycles = span / P
        y = detrend_quad(years, series)
        row = {'label': meta.get('label', name), 'span_yr': float(span),
               'cycles_of_P': round(cycles, 2), 'resolvable': bool(cycles >= 2.0)}
        print(f'\n── {name} ({row["label"]}) — {span:,.0f} yr = {cycles:.1f} cycles '
              f'{"" if row["resolvable"] else "→ NOT RESOLVABLE (reported for completeness)"} ──')

        amp_free, ph_free = free_fit(years, y)
        p95_free = perm_p95(years, y, free_fit)
        a_locked = locked_fit(years, y)
        p95_locked = perm_p95(years, y, locked_fit)
        # phase offset between free extremum and locked epoch, in years
        ymax_free = ph_free / 360.0 * P
        d = (ymax_free - EPOCH_REF) % P
        offset_yr = min(d, P - d)                       # to nearest max
        offset_half = min(abs(offset_yr), abs(P / 2 - offset_yr))  # to nearest extremum
        retention = abs(a_locked) / amp_free if amp_free else 0.0

        row.update({
            'free': {'amplitude': amp_free, 'phase_deg': ph_free, 'perm_p95': p95_free,
                     'significant': bool(amp_free > p95_free)},
            'locked': {'signed_amplitude': a_locked, 'perm_p95': p95_locked,
                       'significant': bool(abs(a_locked) > p95_locked)},
            'free_extremum_offset_from_epochs_yr': offset_half,
            'retention_locked_over_free': retention,
        })
        datasets[name] = row
        print(f'  FREE   : amp = {amp_free:10.4f}  phase = {ph_free:+7.1f}°  '
              f'p95 = {p95_free:.4f}  → {"SIGNIFICANT" if row["free"]["significant"] else "not significant"}')
        print(f'  LOCKED : amp = {a_locked:+10.4f}  (sign {"max" if a_locked > 0 else "MIN"} at epochs)  '
              f'p95 = {p95_locked:.4f}  → {"SIGNIFICANT" if row["locked"]["significant"] else "not significant"}')
        print(f'  free extremum offset from alignment epochs: {offset_half:.0f} yr '
              f'({offset_half / P * 360:.0f}°);  locked/free retention = {retention:.2f}')

    res = {k: v for k, v in datasets.items() if v['resolvable']}
    n_sig_locked = sum(v['locked']['significant'] for v in res.values())
    n_sig_free = sum(v['free']['significant'] for v in res.values())
    verdict = (
        f'Among resolvable archives ({", ".join(res)}): free fit significant in '
        f'{n_sig_free}/{len(res)}, phase-LOCKED fit significant in {n_sig_locked}/{len(res)}. '
        + ('The 12.9-kyr line survives with its extrema pinned at the J/S-perihelion '
           'alignment epochs — the alignment phase is consistent with the archive phase '
           'within the retention factors shown. Period alone still cannot separate this '
           'clock from semi-precession; the phase agreement is the new information. '
           'CAVEATS (see docstring addendum): distributed pattern only — no event-like '
           'anomalies at the epochs; EPICA partially termination-aliased; extremum comb '
           'degenerate with the perihelion-solstice (semi-precession) comb to ~295 yr.'
           if n_sig_locked == len(res) and len(res) > 0 else
           'Phase-locking costs significance in at least one archive — the archive line '
           'exists at this period but is not (fully) phased on the alignment epochs. '
           'The clock is real; the alignment-epoch phasing is not (yet) established.')
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Phase-locked test of the H/26 = 12,896.8-yr line: free '
                                  'amplitude+phase fit vs extrema pinned at the J/S-perihelion '
                                  'symmetric-alignment epochs (−31200/−18300/−5500/+7400 CE), '
                                  'per archive, quadratic detrend, label-permutation p95.'),
                  'n': N_H26, 'period_yr': P, 'epochs_ce': ALIGN_EPOCHS,
                  'n_permutations': N_PERM},
        'datasets': datasets,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

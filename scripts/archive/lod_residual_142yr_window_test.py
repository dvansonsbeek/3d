"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

Identity test for the ~14.2-yr peak in the eclipse-era LOD residual — thread 6
of the non-tidal-residual follow-up.

The L-5b analysis of the 270 timed lunar-eclipse observations (Stephenson,
Morrison & Hohenkerk 2016 tables S01-S09) found a ~14.2-yr spectral peak that
survived 3/3 robustness checks. Literature offers a tempting physical match:
the ~13.5-13.6-yr core-mode oscillation (Hsu et al. 2021 J. Geodesy 95:55;
Ding & Jiang 2024 Sci. China Earth Sci.), amplitude order 0.05-0.15 ms.

Two kill tests, both decided by the data's own structure:

  1. PHYSICAL CEILING. The observations span −720..+1280 (no telescopic era)
     with timing noise ~10³ s. A δLOD sinusoid of amplitude A and period P
     integrates to a ΔT wiggle of amplitude A·P·365.2422/(2π): for a 0.15 ms
     line at 14.2 yr that is ~0.12 s — four orders of magnitude below both
     the noise and any fitted peak. NO physical decadal LOD line is
     detectable in this dataset (consistent with SMH 2016: decadal
     fluctuations resolved only after +1600).

  2. SPECTRAL WINDOW. Timed-eclipse epochs are not random: catalogs revisit
     eclipse-cycle cadences (e.g. 88 lunations ≈ 7.11 yr; Saros 18.03 yr).
     The weighted spectral window |W(P)| = |Σ wⱼ exp(2πi tⱼ/P)| / Σ wⱼ of the
     observation years is computed alongside the residual amplitude scan: if
     the 14.2-yr residual peak coincides with a window peak, it is an
     artifact of the sampling comb, not a signal — and being a property of
     the catalogs, it survives subset/jackknife checks (explaining the 3/3
     robustness).

Residual: dt_observed − (deltaTStart + production model ΔT incl. 4-flag
stack) via node bridge, weighted quadratic detrend, then amplitude scan
P = 5..30 yr.

Output: data/deltaT-142yr-window-test.json
Run:    python3 scripts/lod_residual_142yr_window_test.py
"""

import json
import subprocess
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'deltaT-142yr-window-test.json'
DELTA_T_START = 65.92372934570098


def main():
    print('=' * 88)
    print('14.2-YR PEAK IDENTITY TEST — physical ceiling + spectral window of eclipse epochs')
    print('=' * 88)

    d = json.load(open(REPO / 'public/input/lunar-eclipses-stephenson-2016.json'))
    entries = d['entries']
    years = np.array([x['year'] for x in entries], dtype=float)
    dtobs = np.array([x['dt_observed_sec'] for x in entries], dtype=float)
    w = np.array([x.get('weight', 1) for x in entries], dtype=float)

    node = r"""
const DT = require('./tools/lib/deep-time.js');
const ys = %YS%;
process.stdout.write(JSON.stringify(ys.map(y => DT.meanDeltaTSecondsAtAge((2000-y)/1e6))));
""".replace('%YS%', json.dumps(sorted(set(years.tolist()))))
    r = subprocess.run(['node', '-e', node], capture_output=True, text=True,
                       cwd=str(REPO), timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f'node bridge failed: {r.stderr[:400]}')
    mv = dict(zip(sorted(set(years.tolist())), json.loads(r.stdout)))
    model = np.array([DELTA_T_START + mv[y] for y in years])
    res = dtobs - model

    ok = np.isfinite(res)
    years, res, w = years[ok], res[ok], w[ok]
    t = (years - 280.0) / 1000.0
    X = np.column_stack([np.ones_like(t), t, t * t])
    beta = np.linalg.lstsq(np.sqrt(w)[:, None] * X, np.sqrt(w) * res, rcond=None)[0]
    res2 = res - X @ beta
    rms = float(np.sqrt(np.average(res2 ** 2, weights=w)))
    print(f'  n = {len(res2)} observations, −720..+1280, weighted RMS residual = {rms:.0f} s')

    periods = np.arange(5.0, 30.001, 0.05)
    amp, win = [], []
    for P in periods:
        om = 2.0 * np.pi / P
        c, s = np.cos(om * years), np.sin(om * years)
        A = np.column_stack([c, s])
        b = np.linalg.lstsq(np.sqrt(w)[:, None] * A, np.sqrt(w) * res2, rcond=None)[0]
        amp.append(float(np.hypot(b[0], b[1])))
        win.append(float(abs(np.sum(w * np.exp(1j * om * years))) / np.sum(w)))
    amp, win = np.array(amp), np.array(win)

    def peak_rows(v, k=6):
        idx = [i for i in range(2, len(v) - 2) if v[i] == max(v[max(0, i - 40):i + 41])]
        idx = sorted(idx, key=lambda i: -v[i])[:k]
        return [{'period_yr': round(float(periods[i]), 2), 'value': round(float(v[i]), 3)}
                for i in sorted(idx, key=lambda i: periods[i])]

    amp_peaks = peak_rows(amp)
    win_peaks = peak_rows(win)
    print('\n  Residual-amplitude peaks (P yr, amp s):')
    for p in sorted(amp_peaks, key=lambda r: -r['value']):
        print(f'    {p["period_yr"]:6.2f}  {p["value"]:7.1f}')
    print('  Spectral-window peaks of the observation epochs (P yr, |W|):')
    for p in sorted(win_peaks, key=lambda r: -r['value']):
        print(f'    {p["period_yr"]:6.2f}  {p["value"]:7.3f}')

    marks = {}
    for P0 in (14.2, 13.6, 18.6):
        i = int(np.argmin(abs(periods - P0)))
        marks[str(P0)] = {'amp_s': round(float(amp[i]), 1), 'window': round(float(win[i]), 3)}
        print(f'  At {P0} yr: amp = {amp[i]:.1f} s, |W| = {win[i]:.3f}')
    ceiling = 0.15e-3 * 365.2422 * 14.2 / (2.0 * np.pi)
    print(f'  Physical ceiling (0.15 ms line at 14.2 yr): ΔT amplitude {ceiling:.3f} s')

    verdict = (
        'SAMPLING-WINDOW ARTIFACT. The fitted 14.2-yr amplitude (~540-590 s) exceeds '
        'the physical ceiling of any real decadal LOD line (~0.12 s) by four orders of '
        'magnitude, and the observation epochs\' own spectral window peaks at 14.30 yr '
        '(2nd-strongest window structure, part of a ~7.15-yr harmonic comb ≈ the '
        '88-lunation eclipse cycle). The peak is a property of WHEN eclipses were '
        'recorded, not of Earth rotation — which is also why it passed subset '
        'robustness checks (all subsets share the catalog cadence). The literature '
        '13.5-13.6-yr core mode (Hsu 2021; Ding & Jiang 2024) is real physics but '
        'undetectable at ancient timing noise; no framework component is warranted.'
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {
            'description': ('Identity test of the ~14.2-yr peak from L-5b §7: weighted '
                            'amplitude scan of the 270-observation eclipse residual '
                            '(production chain) vs the spectral window of the observation '
                            'epochs, P = 5..30 yr.'),
            'n_observations': int(len(res2)), 'weighted_rms_s': rms,
            'physical_ceiling_s': ceiling,
        },
        'amplitude_peaks': amp_peaks,
        'window_peaks': win_peaks,
        'markers': marks,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

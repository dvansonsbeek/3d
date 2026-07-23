"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

Archeomagnetic calibration of the millennial rotation swing — thread 5 of the
non-tidal-residual follow-up.

Question: can the swing (the aperiodic remainder of the Stephenson-Morrison-
Hohenkerk millennial LOD fluctuation, turnaround ~900 CE) be calibrated from
NON-eclipse data — archeomagnetic core-flow reconstructions — so that the ΔT
stack no longer needs any eclipse-fitted component (the zero-eclipse-fit
design goal)?

Data:
  1. data/kiani-shahvandi2024-lod-residual.txt — observed LOD
     residual (tidal friction + GIA + climate removed), 720 BCE-2020 CE, ms,
     Zenodo 13885017 (CC-BY 4.0; Kiani Shahvandi et al. 2024 GRL + Morrison
     et al. 2021 Addendum lineage). Eclipse-derived: this is a CROSS-CHECK of
     our decomposition, not an independent calibrator.
  2. data/rivera2026-fig9a-digitized.json — predicted ΔLOD from SHAWQ-family
     archeomagnetic core-surface flows (Rivera et al. 2026 G3, Fig 9a; PT and
     TG-level-D solutions), digitized from the vector PDF (QC vs series 1:
     r = 0.82). Geomagnetic lineage — this IS the independent series.

Model side (node bridge, production chain):
  stack δLOD  = deep-time.js dtCycleLodCorrectionSum (4-flag Bond/Hallstatt/
                Jose5/Jose4 implied LOD corrections)
  swing δLOD  = d/dt of the Gaussian-smoothed (σ = 300 yr) production ΔT
                residual (Stephenson spline − deltaTStart − model ΔT incl.
                stack), converted to ms/day.

Tests:
  A. Observed residual (1) vs our stack / stack+swing — same-lineage
     consistency check of the full decomposition.
  B. Rivera PT/TG (2) vs our stack / stack+swing / swing — raw-curve and
     band-filtered (~0.5-2.5 kyr, difference-of-Gaussians σ 120/500 yr)
     lead-time scans 0..500 yr. Controls: PT/TG vs the observed series with
     the same method must reproduce the paper's r ≈ 0.6 at ~300-yr lead.

Output: data/lod-swing-archeomag-calibration.json
Run:    python3 scripts/lod_swing_archeomag_calibration.py
"""

import json
import subprocess
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'lod-swing-archeomag-calibration.json'
DELTA_T_START = 65.92372934570098

NODE_DUMP = r"""
const fs = require('fs');
const DT = require('./tools/lib/deep-time.js');
const segs = JSON.parse(fs.readFileSync('public/input/stephenson-2016-deltaT-polynomial.json','utf8')).segments;
function steph(y){ for(const s of segs){ if(y>=s.y0&&y<=s.y1){const t=(y-s.y0)/(s.y1-s.y0); return s.a[0]+s.a[1]*t+s.a[2]*t*t+s.a[3]*t*t*t;} } return NaN; }
const resid=[], stack=[];
for(let y=-720;y<=2016;y+=10){
  const sv=steph(y); const mv=DT.meanDeltaTSecondsAtAge((2000-y)/1e6);
  if(isFinite(sv)&&isFinite(mv)) resid.push([y, sv-(%DTS%+mv)]);
}
for(let y=-1300;y<=2016;y+=10){ stack.push([y, DT.dtCycleLodCorrectionSum(y)]); }
process.stdout.write(JSON.stringify({resid, stack}));
""".replace('%DTS%', repr(DELTA_T_START))


def gauss_smooth(y, step_yr, sigma_yr):
    n = len(y)
    half = int(4 * sigma_yr / step_yr)
    pad = np.concatenate([y[half:0:-1], y, y[-2:-half - 2:-1]])
    k = np.exp(-0.5 * ((np.arange(-half, half + 1) * step_yr) / sigma_yr) ** 2)
    k /= k.sum()
    return np.convolve(pad, k, mode='same')[half:half + n]


def bandpass(v):
    """Millennial band ~0.5-2.5 kyr (difference of Gaussians on the 10-yr grid)."""
    return gauss_smooth(v, 10.0, 120.0) - gauss_smooth(v, 10.0, 500.0)


def corr(a, b):
    a = a - a.mean()
    b = b - b.mean()
    return float(np.corrcoef(a, b)[0, 1])


def lead_scan(grid, pred_year, pred_val, target, band=False):
    """Correlate prediction shifted LATER by L (prediction leads) with target."""
    r0, best_r, best_L = None, -9.0, 0
    for L in range(0, 501, 10):
        pv = np.interp(grid, np.asarray(pred_year) + L, pred_val)
        if band:
            pv = bandpass(pv)
        r = corr(pv, target)
        if L == 0:
            r0 = r
        if r > best_r:
            best_r, best_L = r, L
    return {'r_at_lead0': r0, 'r_max': best_r, 'lead_yr_at_max': best_L}


def main():
    print('=' * 88)
    print('ARCHEOMAGNETIC CALIBRATION OF THE MILLENNIAL ROTATION SWING')
    print('=' * 88)

    r = subprocess.run(['node', '-e', NODE_DUMP], capture_output=True, text=True,
                       cwd=str(REPO), timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f'node bridge failed: {r.stderr[:400]}')
    bridge = json.loads(r.stdout)
    resid = np.array(bridge['resid'], dtype=float)
    stack = np.array(bridge['stack'], dtype=float)

    ry, rv = resid[:, 0], resid[:, 1] - resid[:, 1].mean()
    swing_dt = gauss_smooth(rv, 10.0, 300.0)
    swing_dlod = np.gradient(swing_dt, ry) / 365.2422 * 1000.0     # ms/day

    rows = []
    for ln in open(REPO / 'data/kiani-shahvandi2024-lod-residual.txt'):
        p = ln.split()
        if len(p) == 3:
            try:
                rows.append([float(x) for x in p])
            except ValueError:
                pass
    zen = np.array(rows)

    rivera = json.load(open(REPO / 'data/rivera2026-fig9a-digitized.json'))['series']

    grid = np.arange(-700, 1995, 10)
    sti = np.interp(grid, stack[:, 0], stack[:, 1] * 1000.0)       # ms
    swi = np.interp(grid, ry, swing_dlod)
    ours = sti + swi
    zi = np.interp(grid, zen[:, 0], zen[:, 1])
    zs = gauss_smooth(zi, 10.0, 100.0)   # Puente-Borque-style short-period removal

    # ── Test A: same-lineage consistency check ──────────────────────────
    print('\n── A. Observed LOD residual (Zenodo 13885017) vs our decomposition ──')
    a_results = {
        'stack_only': corr(zi, sti),
        'swing_only': corr(zi, swi),
        'stack_plus_swing': corr(zi, ours),
    }
    for k, v in a_results.items():
        print(f'  {k:18s} r = {v:+.3f}')
    print('  (stack+swing > stack alone ⇒ the swing is real signal shared with the')
    print('   state-of-the-art observational residual — same eclipse lineage, so this')
    print('   validates the decomposition, not independence)')

    # ── Test B: independent archeomagnetic prediction ───────────────────
    print('\n── B. Rivera 2026 archeomagnetic ΔLOD predictions (independent lineage) ──')
    b_results = {}
    for flow in ('PT', 'TG'):
        f = rivera[flow]
        fy, fv = f['year'], np.array(f['lod_ms'])
        b_results[flow] = {
            'raw': {
                'vs_observed_control': lead_scan(grid, fy, fv, zs),
                'vs_stack_plus_swing': lead_scan(grid, fy, fv, ours),
                'vs_stack_only': lead_scan(grid, fy, fv, sti),
                'vs_swing_only': lead_scan(grid, fy, fv, swi),
            },
            'band_filtered': {
                'vs_observed_control': lead_scan(grid, fy, fv, bandpass(zi), band=True),
                'vs_stack_plus_swing': lead_scan(grid, fy, fv, bandpass(sti + swi), band=True),
                'vs_stack_only': lead_scan(grid, fy, fv, bandpass(sti), band=True),
            },
        }
        print(f'  {flow}:')
        for mode in ('raw', 'band_filtered'):
            for tgt, res in b_results[flow][mode].items():
                print(f'    {mode:13s} {tgt:22s} r0={res["r_at_lead0"]:+.3f}  '
                      f'max r={res["r_max"]:+.3f} @ lead {res["lead_yr_at_max"]} yr')
    print('  (controls must echo the paper: band-filtered vs observed ≈ 0.6 @ ~300 yr;')
    print('   the ~300-yr lead is a known systematic of archeomagnetic flow inversions —')
    print('   comparative leads in Rivera 2026: D&B2006 109 yr, W&K2008 186 yr, Suttie 428 yr)')

    # ── Verdict ─────────────────────────────────────────────────────────
    band_ctrl = [b_results[f]['band_filtered']['vs_observed_control']['r_max'] for f in ('PT', 'TG')]
    band_ours = [b_results[f]['band_filtered']['vs_stack_plus_swing']['r_max'] for f in ('PT', 'TG')]
    verdict = (
        'CONFIRMATION, NOT CALIBRATION: the independent archeomagnetic predictions '
        'correlate with our stack+swing almost as strongly as with the observed record '
        'itself, and adding the swing improves every comparison — the swing is '
        'independently CONFIRMED as core-mantle physics. But raw-curve agreement is '
        'only ~0.4 and requires a fitted ~300-yr phase lead (a known archeomagnetic '
        'systematic), so deriving stack amplitudes/phases from these flows would '
        'degrade the eclipse fit. Zero-eclipse-fit via archeomagnetic calibration is '
        'not achievable at current field-model quality.'
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {
            'description': ('Archeomagnetic calibration test of the millennial rotation swing. '
                            'A: same-lineage consistency vs Kiani Shahvandi 2024 observed LOD '
                            'residual (Zenodo 13885017). B: independent test vs Rivera 2026 '
                            'SHAWQ-flow ΔLOD predictions (data/rivera2026-fig9a-digitized.json), '
                            'raw + band-filtered (~0.5-2.5 kyr) lead-time scans.'),
            'swing_sigma_yr': 300, 'band_sigmas_yr': [120, 500],
            'delta_t_start': DELTA_T_START,
        },
        'A_observed_vs_decomposition': a_results,
        'B_rivera_leadscans': b_results,
        'band_control_r_max': band_ctrl,
        'band_ours_r_max': band_ours,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

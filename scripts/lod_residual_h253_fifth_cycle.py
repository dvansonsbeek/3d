"""
5th ΔT-stack cycle experiment: h253 (~1,326 yr) against the POST-4-flag residual.

Motivated by L-5b §14 (2026-07-22): after subtracting the shipped 4-flag stack
(Bond 8H/1830 + Hallstatt 8H/1104 + Jose5 8H/2989 + Jose4 8H/3749), the
Stephenson residual shows a flat lattice peak (ΔR² ≈ 0.031, amp ~73 s) across
n = 2015–2024. Candidate divisor:

    n = 2024 = 8·11·23  →  8H/2024 = H/253 = 1,325.36 yr
    gcd(2024, H) = 23 ✓  (the gcd rule all four shipped flags satisfy)
    structurally the 184th harmonic of 8H/11 (Earth ecliptic-perihelion family)

The gcd = 1 peak centre n = 2020 (112 × Jupiter orbit, 0.02%) is statistically
indistinguishable — this script scans both plus neighbors.

GO/NO-GO decision rule (mirrors the Eddy-999 rollback protocol, doc 102):
  1. ΔR² over detrend-only baseline ≥ 0.005 (family rule)
  2. NO ancient-window regression (−800..−300 per-era |residual| must not grow
     — the exact failure mode that rolled back Eddy: −70..−86 s/century there)
  3. Medieval 800–1200 window (the 990 CE bump) improves
  4. Amplitude sane (≤ ~150 s; the shipped cycles are FROZEN here, so Bond
     collinearity blow-up is structurally impossible in this fit)

Only if GO: integrate as 5th cycle via tools/fit/dt-corrections-fit.js
(CONFIG.cycles entry + Stage E) and sync via export-dt-corrections.js.

Output:
  - Console summary + verdict
  - JSON artifact at data/deltaT-h253-fifth-cycle-scan.json
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    H, EIGHT_H, load_stephenson, stephenson_delta_t_vector,
    model_delta_t_vector, fit_harmonics, harmonic_amp_phase,
)

SHIPPED_FIT = Path('/home/dennis/code/3d/data/deltaT-4flag-fit.json')
OUT_PATH    = Path('/home/dennis/code/3d/data/deltaT-h253-fifth-cycle-scan.json')

CANDIDATE_N = 2024          # gcd-compliant preferred candidate (H/253)
SCAN_NS     = [2013, 2015, 2016, 2017, 2018, 2019, 2020, 2021,
               2022, 2023, 2024, 2025, 2026, 2030]

ERA_BUCKETS = [
    (-800, -300, 'ancient  −800..−300  (Eddy failure-mode check)'),
    (-300,  400, 'classical −300..+400'),
    ( 400,  800, 'early-med  400..800'),
    ( 800, 1200, 'medieval  800..1200  (990-bump window)'),
    (1200, 1650, 'late-med 1200..1650'),
    (1650, 2017, 'modern   1650..2017  (Espenak territory)'),
]


def shipped_stack_delta_t(years):
    """Zero-anchored (J2000) ΔT contribution of the shipped 4-flag stack, in s.
    Coefficients from data/deltaT-4flag-fit.json — the single source the three
    code sites are synced from. Taper = 1 across the −720..2017 window."""
    coeffs = json.loads(SHIPPED_FIT.read_text())['shipped_coefficients']
    total = np.zeros_like(np.asarray(years, dtype=float))
    for name in ('bond', 'hallstatt', 'jose5', 'jose4'):
        c = coeffs[name]
        omega = 2.0 * math.pi * c['lattice_n'] / EIGHT_H
        raw = c['cos_coeff_s'] * np.cos(omega * years) + c['sin_coeff_s'] * np.sin(omega * years)
        total += raw - c['raw_at_j2000_s']
    return total


def era_table(years, resid_before, resid_after):
    rows = []
    for lo, hi, label in ERA_BUCKETS:
        m = (years >= lo) & (years < hi)
        if not m.any():
            continue
        b = float(np.mean(np.abs(resid_before[m])))
        a = float(np.mean(np.abs(resid_after[m])))
        rows.append({'label': label, 'before_s': b, 'after_s': a, 'delta_s': a - b})
    return rows


def main():
    print('=' * 85)
    print('5TH-CYCLE EXPERIMENT: h253 (8H/2024 = H/253 = 1,325.4 yr) vs POST-4-FLAG RESIDUAL')
    print('=' * 85)
    print()

    # ─── Residual after the shipped stack ───────────────────────────────
    years = np.arange(-720, 2017, 10, dtype=float)
    dt_stephenson = stephenson_delta_t_vector(years, load_stephenson())
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years, dt_stephenson, dt_model = years[valid], dt_stephenson[valid], dt_model[valid]

    stack = shipped_stack_delta_t(years)
    residual = dt_stephenson - dt_model - stack
    residual = residual - residual.mean()
    print(f'  Residual: n={len(years)} pts, −720..2017, AFTER shipped 4-flag stack')
    print(f'  Raw RMS = {np.sqrt((residual**2).mean()):.1f} s')
    print()

    # ─── Baseline: quadratic detrend only ───────────────────────────────
    base = fit_harmonics(years, residual, [], include_quadratic_detrend=True)
    print(f'── Baseline (1+t+t² detrend only): R² = {base["r2"]:.4f}, RMS = {base["rms_post"]:.1f} s ──')
    print()

    # ─── Divisor scan ───────────────────────────────────────────────────
    def gcd(a, b):
        while b:
            a, b = b, a % b
        return a

    print('     n     P (yr)    amp (s)   phase (°)      R²       ΔR²    gcd(n,H)')
    print('  ' + '─' * 74)
    scan_rows = []
    for n in SCAN_NS:
        P = EIGHT_H / n
        cand = [{'label': f'8H/{n}', 'P_target': P, 'n': n, 'P_actual': P}]
        f = fit_harmonics(years, residual, cand, include_quadratic_detrend=True)
        ap = harmonic_amp_phase(f, cand)[0]
        g = gcd(n, H)
        scan_rows.append({'n': n, 'period_yr': P, 'amp_s': ap['amplitude_s'],
                          'phase_deg': ap['phase_deg'], 'r2': f['r2'],
                          'delta_r2': f['r2'] - base['r2'], 'gcd_H': g})
        mark = ' ✓' if g > 1 else ''
        star = '  ◄' if n == CANDIDATE_N else ''
        print(f'  {n:>5}  {P:9.2f}  {ap["amplitude_s"]:8.1f}  {ap["phase_deg"]:+9.1f}'
              f'  {f["r2"]:8.4f}  {f["r2"]-base["r2"]:8.4f}     {g}{mark}{star}')
    print()

    # ─── GO/NO-GO profile for the gcd-compliant candidate ───────────────
    P_C = EIGHT_H / CANDIDATE_N
    cand = [{'label': f'8H/{CANDIDATE_N}', 'P_target': P_C, 'n': CANDIDATE_N, 'P_actual': P_C}]
    fC = fit_harmonics(years, residual, cand, include_quadratic_detrend=True)
    apC = harmonic_amp_phase(fC, cand)[0]
    dr2 = fC['r2'] - base['r2']

    # Cycle-only value at the bump centre (zero-anchored at J2000)
    n_det = 3
    cos_c, sin_c = float(fC['beta'][n_det]), float(fC['beta'][n_det + 1])
    omega = 2.0 * math.pi / P_C
    raw_j2000 = cos_c * math.cos(omega * 2000) + sin_c * math.sin(omega * 2000)
    cyc_990 = cos_c * math.cos(omega * 990) + sin_c * math.sin(omega * 990) - raw_j2000

    print(f'── GO/NO-GO: n = {CANDIDATE_N} (H/253 = {P_C:.2f} yr) ──')
    print(f'  Amplitude = {apC["amplitude_s"]:.1f} s   phase = {apC["phase_deg"]:+.1f}°   ΔR² = {dr2:+.4f}')
    print(f'  Cycle value at 990 CE (bump centre, J2000-anchored): {cyc_990:+.1f} s')
    print()
    print('  Per-era mean |residual| (detrend-only baseline → +h253):')
    eras = era_table(years, base['residual'], fC['residual'])
    for row in eras:
        print(f'    {row["label"]:<46} {row["before_s"]:7.1f} → {row["after_s"]:7.1f} s'
              f'  ({row["delta_s"]:+.1f})')
    print()

    ancient = next(r for r in eras if r['label'].startswith('ancient'))
    medieval = next(r for r in eras if r['label'].startswith('medieval'))
    checks = {
        'delta_r2_ge_0005':      dr2 >= 0.005,
        'no_ancient_regression': ancient['delta_s'] <= 5.0,
        'medieval_improves':     medieval['delta_s'] < 0.0,
        'amplitude_sane':        apC['amplitude_s'] <= 150.0,
    }
    print('── Decision rule ──')
    for k, v in checks.items():
        print(f'    {"✓" if v else "✗"} {k}')
    go = all(checks.values())
    print()
    print(f'  VERDICT: {"GO — integrate as 5th cycle via dt-corrections-fit.js Stage E" if go else "NO-GO — document and stand down (Eddy-protocol rollback territory)"}')
    print('=' * 85)

    OUT_PATH.write_text(json.dumps({
        '_meta': {
            'description': '5th-cycle (h253, 8H/2024 = H/253) scan against the post-4-flag Stephenson residual',
            'candidate_n': CANDIDATE_N,
            'decision_rule': list(checks.keys()),
        },
        'baseline': {'r2': base['r2'], 'rms_post_s': base['rms_post']},
        'scan': scan_rows,
        'candidate': {
            'n': CANDIDATE_N, 'period_yr': P_C,
            'cos_coeff_s': cos_c, 'sin_coeff_s': sin_c,
            'raw_at_j2000_s': raw_j2000,
            'amplitude_s': apC['amplitude_s'], 'phase_deg': apC['phase_deg'],
            'delta_r2': dr2, 'cycle_at_990ce_s': cyc_990,
        },
        'era_table': eras,
        'checks': checks,
        'verdict': 'GO' if go else 'NO-GO',
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

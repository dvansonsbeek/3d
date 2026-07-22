"""
H/46 millennial-cycle test: is the "missing 0.75 ms/day motion" one arc of a
~7,290-yr lattice cycle?

Context (2026-07-22): the post-4-flag Stephenson residual decomposes as linear
drift (≡ constant −0.73..−0.75 ms/day LOD offset over the ancient window) + a
symmetric 990 CE bump. The 2D epoch sweep proved no CONSTANT can explain it
(modern instrumental window pins δ ≈ 0 today). A long-period lattice scan then
found a 3-of-3-archive-significant band at ~5.8–8.3 kyr (Steinhilber ¹⁰Be
R²ₕ ≈ 0.11 + EPICA + Cheng all clearing p95), with the structurally cleanest
candidate at

    n = 368  →  8H/368 = H/46 = 7,289.5 yr
    — the 2nd harmonic of the H/23 fundamental (14,579 yr);
    the shipped Hallstatt cycle (H/138 = 2,430 yr) is the 6th harmonic
    of the SAME 23-prime family.

Geometry that makes this plausible: P/4 = 1,822 yr. A phase with maximum slope
(zero-crossing) near year ~0 puts the extremum (node in LOD terms) near
~1830 — i.e. maximal missing-motion in the Babylonian/classical window and
near-ZERO in the instrumental era. Exactly the era structure the data demand.

Key design point: over a 2.7-kyr window a 7.3-kyr sinusoid is nearly collinear
with a quadratic polynomial. So we do NOT stack cycle + quadratic; we COMPARE
model families on the same residual:

    A: intercept only                      (null)
    B: intercept + t + t²                  (current "drift" convention, 3 dof)
    C: intercept + cos + sin at P=7,289.5  (cycle, 3 dof — same dof as B!)
    C2: intercept + t + cos + sin          (cycle + linear leftover, 4 dof)

GO/NO-GO:
  1. C matches or beats B at equal dof (cycle explains the drift+curvature)
  2. Cycle's implied δLOD ≈ −0.7 ± 0.2 ms/day averaged over the ancient
     window, AND |δLOD| small (≲ 0.2 ms/day) over 1650–2017 (node near
     modern era — the property no constant could have)
  3. Espenak shape cost: cycle-minus-line RMS over 1650–2017 ≲ 5 s
  4. Amplitude sane (≲ ~450 s of ΔT; the −0.75 ms/day slope implies ~300 s)

Also scans the archive band's top divisors (322..488) for the ΔT-side optimum.

Output: data/deltaT-h46-millennial-cycle-fit.json
Run:    python3 scripts/lod_residual_h46_millennial_cycle.py
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    H, EIGHT_H, load_stephenson, stephenson_delta_t_vector,
    model_delta_t_vector,
)

SHIPPED_FIT = Path('/home/dennis/code/3d/data/deltaT-4flag-fit.json')
OUT_PATH    = Path('/home/dennis/code/3d/data/deltaT-h46-millennial-cycle-fit.json')

CAND_N   = 368                      # H/46 = 7,289.5 yr (2nd harmonic of H/23)
BAND_NS  = [322, 345, 366, 368, 427, 437, 460, 488]   # archive-significant band


def shipped_stack_delta_t(years):
    coeffs = json.loads(SHIPPED_FIT.read_text())['shipped_coefficients']
    total = np.zeros_like(np.asarray(years, dtype=float))
    for name in ('bond', 'hallstatt', 'jose5', 'jose4'):
        c = coeffs[name]
        omega = 2.0 * math.pi * c['lattice_n'] / EIGHT_H
        raw = c['cos_coeff_s'] * np.cos(omega * years) + c['sin_coeff_s'] * np.sin(omega * years)
        total += raw - c['raw_at_j2000_s']
    return total


def lstsq(cols, y):
    X = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    pred = X @ beta
    rms = float(np.sqrt(np.mean((y - pred) ** 2)))
    return beta, pred, rms


def main():
    print('=' * 88)
    print('H/46 MILLENNIAL-CYCLE TEST — is the missing 0.75 ms/day one arc of a 7,290-yr cycle?')
    print('=' * 88)
    print()

    years = np.arange(-720, 2017, 10, dtype=float)
    dt_stephenson = stephenson_delta_t_vector(years, load_stephenson())
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years = years[valid]
    residual = (dt_stephenson[valid] - dt_model[valid]) - shipped_stack_delta_t(years)
    residual = residual - residual.mean()
    t = (years - 1000.0) / 1000.0
    print(f'  Residual: n={len(years)}, −720..2017, after shipped 4-flag stack')
    print()

    # ─── Model family comparison at CAND_N ──────────────────────────────
    P = EIGHT_H / CAND_N
    om = 2.0 * math.pi / P
    one = np.ones_like(years)
    cosc, sinc = np.cos(om * years), np.sin(om * years)

    _, predA, rmsA = lstsq([one], residual)
    _, predB, rmsB = lstsq([one, t, t * t], residual)
    betaC, predC, rmsC = lstsq([one, cosc, sinc], residual)
    betaC2, predC2, rmsC2 = lstsq([one, t, cosc, sinc], residual)

    ampC = float(math.hypot(betaC[1], betaC[2]))
    phC  = float(math.degrees(math.atan2(betaC[2], betaC[1])))
    print('── Model family comparison (same residual) ──')
    print(f'  A  intercept only            RMS = {rmsA:7.1f} s   (1 dof)')
    print(f'  B  1 + t + t²  (drift conv.) RMS = {rmsB:7.1f} s   (3 dof)')
    print(f'  C  1 + H/46 cycle            RMS = {rmsC:7.1f} s   (3 dof)  amp = {ampC:.0f} s  phase = {phC:+.1f}°')
    print(f'  C2 1 + t + H/46 cycle        RMS = {rmsC2:7.1f} s   (4 dof)')
    print()

    # ─── Cycle geometry: implied δLOD profile ───────────────────────────
    # ΔT_c(y) = a·cos(ωy) + b·sin(ωy)  →  δLOD(y) = dΔT/dy / 365.2422 days
    a, b = float(betaC[1]), float(betaC[2])
    def dlod_us_per_day(y):
        ddt_dy = -a * om * math.sin(om * y) + b * om * math.cos(om * y)
        return ddt_dy / 365.2422 * 1e6   # μs/day
    # node (δLOD = 0): extremum of the sinusoid
    node = math.degrees(math.atan2(b, -a))  # solve -a sin + b cos = 0 → tan = b/... use numeric
    # numeric node search in 1000..2600
    node_year = min(range(1000, 2601), key=lambda y: abs(dlod_us_per_day(y)))
    ancient = float(np.mean([dlod_us_per_day(y) for y in range(-700, 400, 50)]))
    modern  = float(np.mean([dlod_us_per_day(y) for y in range(1650, 2018, 25)]))
    print('── Cycle geometry (the era-structure test) ──')
    print(f'  implied δLOD, ancient window (−700..400):   {ancient:+8.1f} μs/day   (target ≈ −700..−800)')
    print(f'  implied δLOD, instrumental era (1650..2017): {modern:+8.1f} μs/day   (target ≈ 0 ± 200)')
    print(f'  δLOD node (zero-crossing) at year ≈ {node_year}')
    print()

    # ─── Espenak-window shape cost ──────────────────────────────────────
    ye = np.arange(1650, 2018, 10, dtype=float)
    cyc_e = a * np.cos(om * ye) + b * np.sin(om * ye)
    # remove best line (deltaTStart + effective trend absorb linear parts)
    A_l = np.column_stack([np.ones_like(ye), ye])
    bl, *_ = np.linalg.lstsq(A_l, cyc_e, rcond=None)
    shape_cost = float(np.sqrt(np.mean((cyc_e - A_l @ bl) ** 2)))
    print(f'── Espenak-window shape cost (cycle minus best line, 1650–2017): {shape_cost:.2f} s ──')
    print()

    # ─── Band scan on the ΔT side ───────────────────────────────────────
    print('── ΔT-side scan across the archive-significant band ──')
    print('     n     P (yr)     RMS_C(s)   amp(s)   node(yr)   δLOD_anc   δLOD_mod')
    band_rows = []
    for n in BAND_NS:
        Pn = EIGHT_H / n
        omn = 2.0 * math.pi / Pn
        cn, sn = np.cos(omn * years), np.sin(omn * years)
        bC, pC, rC = lstsq([one, cn, sn], residual)
        an, bn_ = float(bC[1]), float(bC[2])
        def dl(y, an=an, bn_=bn_, omn=omn):
            return (-an * omn * math.sin(omn * y) + bn_ * omn * math.cos(omn * y)) / 365.2422 * 1e6
        nd = min(range(500, 3001), key=lambda y: abs(dl(y)))
        anc = float(np.mean([dl(y) for y in range(-700, 400, 50)]))
        mod = float(np.mean([dl(y) for y in range(1650, 2018, 25)]))
        amp_n = math.hypot(an, bn_)
        band_rows.append({'n': n, 'period_yr': Pn, 'rms_s': rC, 'amp_s': amp_n,
                          'node_year': nd, 'dlod_ancient_us': anc, 'dlod_modern_us': mod})
        mark = '  ◄ H/46' if n == CAND_N else ''
        print(f'  {n:>4}   {Pn:8.1f}   {rC:8.1f}   {amp_n:6.0f}    {nd:5d}     {anc:+7.1f}    {mod:+7.1f}{mark}')
    print()

    # ─── GO/NO-GO ───────────────────────────────────────────────────────
    checks = {
        'cycle_matches_drift_model_at_equal_dof': rmsC <= rmsB * 1.05,
        'ancient_dlod_in_range': -950.0 <= ancient <= -500.0,
        'modern_dlod_near_zero': abs(modern) <= 200.0,
        'espenak_shape_cost_small': shape_cost <= 5.0,
        'amplitude_sane': ampC <= 450.0,
    }
    print('── Decision rule ──')
    for k, v in checks.items():
        print(f'    {"✓" if v else "✗"} {k}')
    go = all(checks.values())
    print()
    print(f'  VERDICT: {"GO — the drift IS consistent with one arc of the H/46 cycle" if go else "NO-GO — the cycle does not reproduce the required era structure"}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {
            'description': 'H/46 (8H/368 = 7,289.5 yr) millennial-cycle fit against the post-4-flag Stephenson residual — tests whether the −0.75 ms/day ancient missing motion is one arc of a lattice cycle (2nd harmonic of the H/23 fundamental; Hallstatt = 6th harmonic). Archive support: 3-of-3 significant band 5.8–8.3 kyr (lattice-scan-band-3500-15000.json).',
            'candidate_n': CAND_N, 'period_yr': P,
        },
        'models': {'A_rms': rmsA, 'B_drift_rms': rmsB, 'C_cycle_rms': rmsC, 'C2_rms': rmsC2},
        'cycle': {'cos_s': a, 'sin_s': b, 'amplitude_s': ampC, 'phase_deg': phC,
                  'node_year': node_year, 'dlod_ancient_us_day': ancient,
                  'dlod_modern_us_day': modern, 'espenak_shape_cost_s': shape_cost},
        'band_scan': band_rows,
        'checks': checks,
        'verdict': 'GO' if go else 'NO-GO',
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

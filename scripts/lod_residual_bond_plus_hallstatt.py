"""
Joint fit of Stephenson ΔT residual to (Bond + Hallstatt) H-lattice cycles.

Tests the hypothesis: does adding a Hallstatt-period (8H/1104 = H/138 = 2430 yr)
harmonic term MEANINGFULLY improve the fit beyond the current single-Bond
(8H/1851 = 1449 yr) baseline?

Rationale: after the sun-longitude-harmonics gcd-rule fix, H/138 was identified
as a structurally-on-lattice (gcd = 23) divisor matching the well-established
Hallstatt cycle (~2400 yr, Damon & Sonett 1991; Steinhilber 2012). Both Bond
and Hallstatt have physical mechanisms plausibly modulating Earth's rotation
(mass distribution and moment-of-inertia changes), so the ΔT residual is the
right observational channel.

Decision rule for whether Hallstatt joins production:
  - Joint R² > single-Bond R² by ≥ 0.005 (marginal contribution ≥ 0.5%)
  - AND Hallstatt fitted amplitude is physically plausible (≤ ~200 sec; Bond's
    amplitude is 378 sec, so Hallstatt shouldn't dwarf it)
  - AND Bond's amplitude and phase remain broadly stable when Hallstatt is
    added (indicates no severe collinearity between the two frequencies)

Output:
  - Console summary of both fits + verdict
  - JSON artifact at data/deltaT-bond-plus-hallstatt-fit.json if useful
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

OUT_PATH = Path('/home/dennis/code/3d/data/deltaT-bond-plus-hallstatt-fit.json')

def main():
    print('=' * 85)
    print('JOINT ΔT RESIDUAL FIT: Bond (8H/1851) + Hallstatt (8H/1104)')
    print('=' * 85)
    print()

    P_BOND      = EIGHT_H / 1851
    P_HALLSTATT = EIGHT_H / 1104   # = H/138 exactly (1104 = 8·138)
    print(f'  Bond      period = 8H/1851 = H/{1851/8:.3f} = {P_BOND:.3f} yr')
    print(f'  Hallstatt period = 8H/1104 = H/{1104//8}   = {P_HALLSTATT:.3f} yr')
    print(f'  Hallstatt vs canonical (~2400 yr): {P_HALLSTATT-2400:+.1f} yr = {(P_HALLSTATT/2400-1)*100:+.2f}%')
    print()

    # ─── Build residual (same as lod_residual_1851_refit.py) ────────────
    years = np.arange(-720, 2017, 10, dtype=float)
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years         = years[valid]
    dt_stephenson = dt_stephenson[valid]
    dt_model      = dt_model[valid]
    residual_raw  = dt_stephenson - dt_model
    residual_mean = float(residual_raw.mean())
    residual_centered = residual_raw - residual_mean
    print(f'  Residual: n={len(years)} pts over {int(years.min())}..{int(years.max())} AD')
    print(f'  Residual RMS (raw)  = {np.sqrt((residual_centered**2).mean()):.1f} s')
    print()

    # ─── Baseline: Bond alone ───────────────────────────────────────────
    bond_only = [{'label': '8H/1851 (Bond)', 'P_target': P_BOND, 'n': 1851, 'P_actual': P_BOND}]
    fit_bond = fit_harmonics(years, residual_centered, bond_only, include_quadratic_detrend=True)
    ap_bond  = harmonic_amp_phase(fit_bond, bond_only)[0]

    print('── FIT A: Bond alone (baseline) ──')
    print(f'  R²                 = {fit_bond["r2"]:.6f}')
    print(f'  RMS pre / post     = {fit_bond["rms_pre"]:.1f} / {fit_bond["rms_post"]:.1f} s')
    print(f'  Bond amplitude     = {ap_bond["amplitude_s"]:.2f} s')
    print(f'  Bond phase (cos)   = {ap_bond["phase_deg"]:+.2f}°')
    print()

    # ─── Joint fit: Bond + Hallstatt ────────────────────────────────────
    both = [
        {'label': '8H/1851 (Bond)',      'P_target': P_BOND,      'n': 1851, 'P_actual': P_BOND},
        {'label': '8H/1104 (Hallstatt)', 'P_target': P_HALLSTATT, 'n': 1104, 'P_actual': P_HALLSTATT},
    ]
    fit_both = fit_harmonics(years, residual_centered, both, include_quadratic_detrend=True)
    ap_both  = harmonic_amp_phase(fit_both, both)
    ap_bond_joint      = ap_both[0]
    ap_hallstatt_joint = ap_both[1]

    print('── FIT B: Bond + Hallstatt (joint) ──')
    print(f'  R²                 = {fit_both["r2"]:.6f}')
    print(f'  RMS pre / post     = {fit_both["rms_pre"]:.1f} / {fit_both["rms_post"]:.1f} s')
    print(f'  Bond amplitude     = {ap_bond_joint["amplitude_s"]:.2f} s  (was {ap_bond["amplitude_s"]:.2f}, Δ={ap_bond_joint["amplitude_s"]-ap_bond["amplitude_s"]:+.2f})')
    print(f'  Bond phase (cos)   = {ap_bond_joint["phase_deg"]:+.2f}°  (was {ap_bond["phase_deg"]:+.2f}°, Δ={ap_bond_joint["phase_deg"]-ap_bond["phase_deg"]:+.2f}°)')
    print(f'  Hallstatt amp      = {ap_hallstatt_joint["amplitude_s"]:.2f} s')
    print(f'  Hallstatt phase    = {ap_hallstatt_joint["phase_deg"]:+.2f}°')
    print()

    # ─── Comparison and verdict ─────────────────────────────────────────
    dR2 = fit_both['r2'] - fit_bond['r2']
    dRMS = fit_bond['rms_post'] - fit_both['rms_post']
    print('── VERDICT ──')
    print(f'  ΔR² (joint − Bond-only)  = {dR2:+.6f}')
    print(f'  ΔRMS improvement         = {dRMS:+.1f} s  (positive = joint better)')
    print(f'  Bond amp change          = {ap_bond_joint["amplitude_s"] - ap_bond["amplitude_s"]:+.2f} s (collinearity check; <20 s = stable)')
    print()

    meaningful_r2  = dR2 >= 0.005
    stable_bond    = abs(ap_bond_joint['amplitude_s'] - ap_bond['amplitude_s']) < 20
    physical_amp   = ap_hallstatt_joint['amplitude_s'] <= 200
    verdict_pass   = meaningful_r2 and stable_bond and physical_amp

    print(f'  ΔR² ≥ 0.005:              {"✓" if meaningful_r2 else "✗"} ({dR2:+.6f})')
    print(f'  Bond stable (|Δamp|<20):  {"✓" if stable_bond else "✗"} ({ap_bond_joint["amplitude_s"] - ap_bond["amplitude_s"]:+.2f} s)')
    print(f'  Hallstatt physical (≤200): {"✓" if physical_amp else "✗"} ({ap_hallstatt_joint["amplitude_s"]:.2f} s)')
    print()
    if verdict_pass:
        print('  → Hallstatt ADDS meaningful signal. Ship code integration.')
    else:
        print('  → Hallstatt does NOT add meaningful signal. Bond alone is sufficient.')
        if not meaningful_r2:  print('    Reason: negligible R² improvement.')
        if not stable_bond:    print('    Reason: Bond amplitude shifts too much (collinearity).')
        if not physical_amp:   print('    Reason: Hallstatt fitted amplitude implausibly large.')
    print()

    # ─── Persist ────────────────────────────────────────────────────────
    # Compute cyclic evaluations at J2000 (anchor calibration values)
    omega_bond      = 2.0 * math.pi / P_BOND
    omega_hallstatt = 2.0 * math.pi / P_HALLSTATT
    # Coefficient indices in beta: [intercept, linear, quadratic, cos_b, sin_b, cos_h, sin_h]
    beta = fit_both['beta']
    cos_bond, sin_bond           = float(beta[3]), float(beta[4])
    cos_hallstatt, sin_hallstatt = float(beta[5]), float(beta[6])
    bond_at_j2000      = cos_bond      * math.cos(omega_bond      * 2000) + sin_bond      * math.sin(omega_bond      * 2000)
    hallstatt_at_j2000 = cos_hallstatt * math.cos(omega_hallstatt * 2000) + sin_hallstatt * math.sin(omega_hallstatt * 2000)

    output = {
        '_meta': {
            'description': ('Joint fit of Stephenson ΔT residual to Bond (8H/1851 = 1449 yr) '
                            'and Hallstatt (8H/1104 = H/138 = 2430 yr) H-lattice cycles. '
                            'Bond is the 73×J-S synodic top-ranked ΔT harmonic. Hallstatt is '
                            'the well-established ~2400-yr solar cycle (Damon & Sonett 1991) '
                            'that emerges naturally on the H-lattice via 8H/1104 = H/138 '
                            '(1104 = 2⁴·3·23, gcd with 8H shares H\'s 23 factor). This joint '
                            'fit tests whether the two cycles independently explain distinct '
                            'variance components of the ΔT residual.'),
            'source_script': 'scripts/lod_residual_bond_plus_hallstatt.py',
            'H_yr': H,
            'eight_H_yr': EIGHT_H,
            'bond_period_yr': P_BOND,
            'hallstatt_period_yr': P_HALLSTATT,
        },
        'fit_a_bond_only': {
            'r2': fit_bond['r2'],
            'rms_pre': fit_bond['rms_pre'],
            'rms_post': fit_bond['rms_post'],
            'bond_amplitude_s': ap_bond['amplitude_s'],
            'bond_phase_deg': ap_bond['phase_deg'],
        },
        'fit_b_bond_plus_hallstatt': {
            'r2': fit_both['r2'],
            'rms_pre': fit_both['rms_pre'],
            'rms_post': fit_both['rms_post'],
            'bond_amplitude_s': ap_bond_joint['amplitude_s'],
            'bond_phase_deg': ap_bond_joint['phase_deg'],
            'hallstatt_amplitude_s': ap_hallstatt_joint['amplitude_s'],
            'hallstatt_phase_deg': ap_hallstatt_joint['phase_deg'],
        },
        'delta_r2': dR2,
        'delta_rms_post': dRMS,
        'verdict': {
            'meaningful_r2':  meaningful_r2,
            'bond_stable':    stable_bond,
            'physical_amp':   physical_amp,
            'ship_integration': verdict_pass,
        },
        'coefficients_if_ship': {
            'BOND_LATTICE_N':           1851,
            'BOND_COS_COEFF_S':         cos_bond,
            'BOND_SIN_COEFF_S':         sin_bond,
            'BOND_DT_RAW_AT_J2000':     bond_at_j2000,
            'HALLSTATT_LATTICE_N':      1104,
            'HALLSTATT_COS_COEFF_S':    cos_hallstatt,
            'HALLSTATT_SIN_COEFF_S':    sin_hallstatt,
            'HALLSTATT_DT_RAW_AT_J2000': hallstatt_at_j2000,
        },
        'fit_metrics_in_sample': {
            'n_points':  len(years),
            'year_range': [float(years.min()), float(years.max())],
        },
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

"""
Triple joint fit: Bond (8H/1851) + Hallstatt (8H/1104) + Jose5 (8H/2989)
against Stephenson ΔT residual.

The 8H/2989 = 897.47 yr period was identified by the L-5b button's Section 14
divisor scan as the strongest remaining lattice signal after Bond (ΔR² = 0.0026,
amp ~70 s in lunar residual). Structural interpretation: 5 × Jose period
(5 × 179 yr = 895 yr, 0.28% offset) or 45 × Jupiter-Saturn synodic (0.45%).
Divisor 2989 = 7² × 61 satisfies the H-lattice gcd rule via H's 61 prime factor.

Method: same joint least-squares fit as lod_residual_bond_plus_hallstatt.py,
but with a third cos/sin pair for 8H/2989. Report per-term amplitude, phase,
Bond stability under the addition, and per-term collinearity via pairwise
correlation of design columns.

Output: console + data/deltaT-triple-bond-hallstatt-jose5-fit.json
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

OUT_PATH = Path('/home/dennis/code/3d/data/deltaT-triple-bond-hallstatt-jose5-fit.json')

def main():
    print('=' * 85)
    print('TRIPLE ΔT RESIDUAL FIT: Bond (8H/1851) + Hallstatt (8H/1104) + Jose5 (8H/2989)')
    print('=' * 85)
    print()

    P_BOND  = EIGHT_H / 1851
    P_HALL  = EIGHT_H / 1104
    P_JOSE5 = EIGHT_H / 2989
    print(f'  Bond      period = 8H/1851 = {P_BOND:.3f} yr  (73 × J-S synodic, 0.001% error)')
    print(f'  Hallstatt period = 8H/1104 = {P_HALL:.3f} yr  (H/138, gcd=23, Damon-Sonett 1991)')
    print(f'  Jose5     period = 8H/2989 = {P_JOSE5:.3f} yr  (7²·61, gcd=61; 5×Jose 179 yr, 0.28% offset)')
    print()

    # ─── Build residual (same window as prior fits) ─────────────────────
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
    print(f'  Residual: n={len(years)}, range {int(years.min())}..{int(years.max())} AD')
    print(f'  RMS raw (mean-subtracted): {np.sqrt((residual_centered**2).mean()):.1f} s')
    print()

    # ─── Fit A: Bond alone (baseline) ───────────────────────────────────
    fit_a = fit_harmonics(years, residual_centered,
                          [{'label':'Bond','P_target':P_BOND,'n':1851,'P_actual':P_BOND}],
                          include_quadratic_detrend=True)
    ap_a  = harmonic_amp_phase(fit_a, [{'label':'Bond','P_target':P_BOND,'n':1851,'P_actual':P_BOND}])[0]

    # ─── Fit B: Bond + Hallstatt ─────────────────────────────────────────
    two = [
        {'label':'Bond',     'P_target':P_BOND, 'n':1851, 'P_actual':P_BOND},
        {'label':'Hallstatt','P_target':P_HALL, 'n':1104, 'P_actual':P_HALL},
    ]
    fit_b = fit_harmonics(years, residual_centered, two, include_quadratic_detrend=True)
    ap_b  = harmonic_amp_phase(fit_b, two)

    # ─── Fit C: Bond + Hallstatt + Jose5 (the triple) ────────────────────
    three = [
        {'label':'Bond',     'P_target':P_BOND,  'n':1851, 'P_actual':P_BOND},
        {'label':'Hallstatt','P_target':P_HALL,  'n':1104, 'P_actual':P_HALL},
        {'label':'Jose5',    'P_target':P_JOSE5, 'n':2989, 'P_actual':P_JOSE5},
    ]
    fit_c = fit_harmonics(years, residual_centered, three, include_quadratic_detrend=True)
    ap_c  = harmonic_amp_phase(fit_c, three)

    print('── FIT A (Bond alone) ──')
    print(f'  R² = {fit_a["r2"]:.4f}, RMS pre/post = {fit_a["rms_pre"]:.1f} / {fit_a["rms_post"]:.1f} s')
    print(f'  Bond amp = {ap_a["amplitude_s"]:.2f} s, phase = {ap_a["phase_deg"]:+.2f}°')
    print()

    print('── FIT B (Bond + Hallstatt) ──')
    print(f'  R² = {fit_b["r2"]:.4f}, RMS pre/post = {fit_b["rms_pre"]:.1f} / {fit_b["rms_post"]:.1f} s')
    print(f'  Bond amp     = {ap_b[0]["amplitude_s"]:.2f} s (was {ap_a["amplitude_s"]:.2f}, Δ={ap_b[0]["amplitude_s"]-ap_a["amplitude_s"]:+.2f})')
    print(f'  Bond phase   = {ap_b[0]["phase_deg"]:+.2f}° (Δ={ap_b[0]["phase_deg"]-ap_a["phase_deg"]:+.2f}°)')
    print(f'  Hallstatt amp   = {ap_b[1]["amplitude_s"]:.2f} s, phase = {ap_b[1]["phase_deg"]:+.2f}°')
    print()

    print('── FIT C (Bond + Hallstatt + Jose5) ──')
    print(f'  R² = {fit_c["r2"]:.4f}, RMS pre/post = {fit_c["rms_pre"]:.1f} / {fit_c["rms_post"]:.1f} s')
    print(f'  Bond amp     = {ap_c[0]["amplitude_s"]:.2f} s (Δ vs A = {ap_c[0]["amplitude_s"]-ap_a["amplitude_s"]:+.2f}, Δ vs B = {ap_c[0]["amplitude_s"]-ap_b[0]["amplitude_s"]:+.2f})')
    print(f'  Bond phase   = {ap_c[0]["phase_deg"]:+.2f}° (Δ vs A = {ap_c[0]["phase_deg"]-ap_a["phase_deg"]:+.2f}°, Δ vs B = {ap_c[0]["phase_deg"]-ap_b[0]["phase_deg"]:+.2f}°)')
    print(f'  Hallstatt amp   = {ap_c[1]["amplitude_s"]:.2f} s (Δ vs B = {ap_c[1]["amplitude_s"]-ap_b[1]["amplitude_s"]:+.2f})')
    print(f'  Hallstatt phase = {ap_c[1]["phase_deg"]:+.2f}° (Δ vs B = {ap_c[1]["phase_deg"]-ap_b[1]["phase_deg"]:+.2f}°)')
    print(f'  Jose5 amp    = {ap_c[2]["amplitude_s"]:.2f} s')
    print(f'  Jose5 phase  = {ap_c[2]["phase_deg"]:+.2f}°')
    print()

    # ─── Marginal contributions ─────────────────────────────────────────
    print('── VERDICT ──')
    dR2_B_A = fit_b['r2'] - fit_a['r2']
    dR2_C_B = fit_c['r2'] - fit_b['r2']
    dR2_C_A = fit_c['r2'] - fit_a['r2']
    dRMS_C_A = fit_a['rms_post'] - fit_c['rms_post']
    print(f'  ΔR² (Bond → +Hallstatt):        {dR2_B_A:+.6f}')
    print(f'  ΔR² (+Hallstatt → +Jose5):      {dR2_C_B:+.6f}')
    print(f'  ΔR² (Bond → +Hallstatt+Jose5):  {dR2_C_A:+.6f}')
    print(f'  ΔRMS improvement (Bond → triple): {dRMS_C_A:+.1f} s')
    print()

    # Physical amplitude constraint checks
    print('  Amplitude constraints:')
    physical_hall  = ap_c[1]['amplitude_s'] <= 200
    physical_jose5 = ap_c[2]['amplitude_s'] <= 200
    print(f'    Hallstatt ≤ 200 s: {"✓" if physical_hall else "✗"} ({ap_c[1]["amplitude_s"]:.1f})')
    print(f'    Jose5     ≤ 200 s: {"✓" if physical_jose5 else "✗"} ({ap_c[2]["amplitude_s"]:.1f})')
    print()

    # Compute cos/sin coefficients + raw-at-J2000 for each
    def report_coeffs(name, fit, i, n):
        beta = fit['beta']
        # col_labels: ['intercept', 'linear (per kyr)', 'quadratic (per kyr²)', 'cos(n=X)', 'sin(n=X)', ...]
        n_detrend = 3
        ci = float(beta[n_detrend + 2*i])
        si = float(beta[n_detrend + 2*i + 1])
        P = EIGHT_H / n
        omega = 2 * math.pi / P
        raw_j2000 = ci * math.cos(omega * 2000) + si * math.sin(omega * 2000)
        return {'cos': ci, 'sin': si, 'raw_j2000': raw_j2000, 'period_yr': P,
                'amplitude': math.hypot(ci, si)}

    coefs_bond      = report_coeffs('Bond', fit_c, 0, 1851)
    coefs_hallstatt = report_coeffs('Hallstatt', fit_c, 1, 1104)
    coefs_jose5     = report_coeffs('Jose5', fit_c, 2, 2989)

    print('── Coefficients from triple fit ──')
    print(f'  Bond      cos={coefs_bond["cos"]:>10.4f} sin={coefs_bond["sin"]:>10.4f} raw@J2000={coefs_bond["raw_j2000"]:>10.4f}')
    print(f'  Hallstatt cos={coefs_hallstatt["cos"]:>10.4f} sin={coefs_hallstatt["sin"]:>10.4f} raw@J2000={coefs_hallstatt["raw_j2000"]:>10.4f}')
    print(f'  Jose5     cos={coefs_jose5["cos"]:>10.4f} sin={coefs_jose5["sin"]:>10.4f} raw@J2000={coefs_jose5["raw_j2000"]:>10.4f}')
    print()

    # Persist
    output = {
        '_meta': {
            'description': ('Triple joint fit of Stephenson ΔT residual to Bond (8H/1851), '
                            'Hallstatt (8H/1104 = H/138), and Jose5 (8H/2989 = 7²·61 harmonic ~897 yr). '
                            'Jose5 divisor identified by L-5b button Section 14 as the strongest remaining '
                            'lattice signal after Bond (ΔR² = 0.0026). H-lattice compliant via H\'s 61 prime.'),
            'source_script': 'scripts/lod_residual_triple_bond_hallstatt_jose5.py',
            'H_yr': H, 'eight_H_yr': EIGHT_H,
        },
        'periods_yr': {
            'bond': P_BOND, 'hallstatt': P_HALL, 'jose5': P_JOSE5,
        },
        'fit_a_bond_alone': {
            'r2': fit_a['r2'], 'rms_post': fit_a['rms_post'],
            'bond_amp': ap_a['amplitude_s'], 'bond_phase_deg': ap_a['phase_deg'],
        },
        'fit_b_bond_hallstatt': {
            'r2': fit_b['r2'], 'rms_post': fit_b['rms_post'],
            'bond_amp': ap_b[0]['amplitude_s'], 'bond_phase_deg': ap_b[0]['phase_deg'],
            'hallstatt_amp': ap_b[1]['amplitude_s'], 'hallstatt_phase_deg': ap_b[1]['phase_deg'],
        },
        'fit_c_triple': {
            'r2': fit_c['r2'], 'rms_post': fit_c['rms_post'],
            'bond_amp': ap_c[0]['amplitude_s'], 'bond_phase_deg': ap_c[0]['phase_deg'],
            'hallstatt_amp': ap_c[1]['amplitude_s'], 'hallstatt_phase_deg': ap_c[1]['phase_deg'],
            'jose5_amp': ap_c[2]['amplitude_s'], 'jose5_phase_deg': ap_c[2]['phase_deg'],
        },
        'marginal_contributions': {
            'delta_r2_bond_to_bond_hall':   dR2_B_A,
            'delta_r2_bond_hall_to_triple': dR2_C_B,
            'delta_r2_bond_to_triple':      dR2_C_A,
            'delta_rms_bond_to_triple':     dRMS_C_A,
        },
        'coefficients_for_script_js': {
            'BOND_LATTICE_N':                     1851,
            'BOND_COS_COEFF_S':                   coefs_bond['cos'],
            'BOND_SIN_COEFF_S':                   coefs_bond['sin'],
            'BOND_DT_RAW_AT_J2000_FROM_FIT':      coefs_bond['raw_j2000'],
            'HALLSTATT_LATTICE_N':                1104,
            'HALLSTATT_COS_COEFF_S':              coefs_hallstatt['cos'],
            'HALLSTATT_SIN_COEFF_S':              coefs_hallstatt['sin'],
            'HALLSTATT_DT_RAW_AT_J2000_FROM_FIT': coefs_hallstatt['raw_j2000'],
            'JOSE5_LATTICE_N':                    2989,
            'JOSE5_COS_COEFF_S':                  coefs_jose5['cos'],
            'JOSE5_SIN_COEFF_S':                  coefs_jose5['sin'],
            'JOSE5_DT_RAW_AT_J2000_FROM_FIT':     coefs_jose5['raw_j2000'],
        },
        'fit_metrics': {
            'n_points': len(years),
            'year_range': [float(years.min()), float(years.max())],
        },
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

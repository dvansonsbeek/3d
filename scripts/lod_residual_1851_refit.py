"""
Refit the Stephenson ΔT residual using 8H/n = 8H/1851 = 1449.24 yr
(exactly 73 × Jupiter-Saturn synodic cycles = 73 × 19.853 yr) instead of
8H/1825 = 1469.88 yr.

Rationale (from scripts/lod_residual_divisor_scan_jse.py):
  n=1851 is the top-ranked 8H divisor in the sub-Milankovitch band (500-5000 yr).
  It matches "73 × J-S synodic" to 0.00% error — a framework-native structural
  interpretation cleaner than the paper's original n=1825 (74 × J-S synodic to
  0.05% error).

  The R² difference between n=1851 and n=1825 is only 0.0009 (0.4987 vs 0.4978),
  but the structural interpretation ("73 × J-S synodic") is dramatically cleaner
  and PREDICTED by Charvátová's Solar Inertial Motion theory as a Jupiter-Saturn
  resonance signature.

Output:
  - Console report of new cos/sin coefficients at n=1851 for updating src/script.js
  - JSON artifact at data/deltaT-1851-residual-fit.json (companion to
    data/deltaT-bond-cycle-residual-fit.json, which used n=1825)
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

# Constants (framework-consistent, matching lod_residual_lattice_fit.py)
JUPITER_PERIOD_YR = 11.8598
SATURN_PERIOD_YR  = 29.4570
J_S_SYNODIC_YR    = 1.0 / (1.0/JUPITER_PERIOD_YR - 1.0/SATURN_PERIOD_YR)  # ≈ 19.85260

OUT_PATH = Path('/home/dennis/code/3d/data/deltaT-1851-residual-fit.json')

def main():
    print('=' * 85)
    print('BOND-SCALE REFIT AT 8H/1851 = 73 × J-S SYNODIC')
    print('=' * 85)
    print()
    print(f'  8H                    = {EIGHT_H:.0f} yr')
    print(f'  n                     = 1851 (was 1825 in original Bond fit)')
    print(f'  Period 8H/1851        = {EIGHT_H/1851:.6f} yr')
    print(f'  73 × J-S synodic      = {73 * J_S_SYNODIC_YR:.6f} yr')
    print(f'  Error                 = {abs(EIGHT_H/1851 - 73*J_S_SYNODIC_YR)/(73*J_S_SYNODIC_YR)*100:.4f}%')
    print()
    print(f'  For comparison:')
    print(f'  8H/1825               = {EIGHT_H/1825:.6f} yr')
    print(f'  74 × J-S synodic      = {74 * J_S_SYNODIC_YR:.6f} yr')
    print(f'  Bond (paleoclimate)   = 1470.00 yr')
    print()

    # ─── Build residual on 10-yr grid ─────────────────────────────────
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
    print(f'  Residual: n={len(years)} pts, RMS = {np.sqrt((residual_centered**2).mean()):.1f} s')
    print()

    # ─── Fit at n=1851 ─────────────────────────────────────────────────
    n_1851 = 1851
    P_1851 = EIGHT_H / n_1851
    candidate = [{'label': f'8H/{n_1851}', 'P_target': P_1851, 'n': n_1851, 'P_actual': P_1851}]
    fit = fit_harmonics(years, residual_centered, candidate, include_quadratic_detrend=True)
    ap  = harmonic_amp_phase(fit, candidate)[0]

    # Extract polynomial + Bond coefficients
    #  col_labels: ['intercept', 'linear (per kyr)', 'quadratic (per kyr²)', 'cos(n=1851)', 'sin(n=1851)']
    beta = fit['beta']
    intercept       = float(beta[0])
    linear_per_kyr  = float(beta[1])
    quadratic_kyr2  = float(beta[2])
    cos_coeff       = float(beta[3])
    sin_coeff       = float(beta[4])

    print('─── FIT RESULTS at n=1851 ───')
    print(f'  R² (in-sample):        {fit["r2"]:.4f}')
    print(f'  RMS residual pre-fit:  {fit["rms_pre"]:.1f} s')
    print(f'  RMS residual post-fit: {fit["rms_post"]:.1f} s')
    print()
    print(f'  Polynomial detrend coefficients (per kyr from center year):')
    print(f'    intercept          = {intercept:+.6f} s')
    print(f'    linear     (/kyr)  = {linear_per_kyr:+.6f} s')
    print(f'    quadratic  (/kyr²) = {quadratic_kyr2:+.6f} s')
    print()
    print(f'  Cyclic harmonic (this is what src/script.js uses):')
    print(f'    BOND_COS_COEFF_S   = {cos_coeff:.14f}')
    print(f'    BOND_SIN_COEFF_S   = {sin_coeff:.14f}')
    print(f'    amplitude          = {ap["amplitude_s"]:.4f} s')
    print(f'    phase (cos-form)   = {ap["phase_deg"]:+.4f}°')
    print()

    # Compute Bond raw at J2000 (subtracted for anchor preservation in script.js)
    omega_1851 = 2.0 * math.pi / P_1851
    raw_j2000  = cos_coeff * math.cos(omega_1851 * 2000) + sin_coeff * math.sin(omega_1851 * 2000)
    print(f'  Bond raw at J2000      = {raw_j2000:.6f} s')
    print(f'    (subtracted in script.js so anchored ΔT(2000) = 0 by construction)')
    print()

    # Comparison: what n=1825 gave (for reference in the commit message)
    print('─── COMPARISON: n=1825 (paper original) vs n=1851 (73×J-S synodic) ───')
    n_1825 = 1825
    P_1825 = EIGHT_H / n_1825
    candidate_1825 = [{'label': f'8H/{n_1825}', 'P_target': P_1825, 'n': n_1825, 'P_actual': P_1825}]
    fit_1825 = fit_harmonics(years, residual_centered, candidate_1825, include_quadratic_detrend=True)
    ap_1825  = harmonic_amp_phase(fit_1825, candidate_1825)[0]
    print(f'  {"n":<8} {"period":<12} {"R²":<10} {"RMS":<10} {"amp":<10} {"phase":<10}')
    print(f'  {"-"*8} {"-"*12} {"-"*10} {"-"*10} {"-"*10} {"-"*10}')
    print(f'  {"1825":<8} {P_1825:<12.4f} {fit_1825["r2"]:<10.4f} {fit_1825["rms_post"]:<10.1f} '
          f'{ap_1825["amplitude_s"]:<10.2f} {ap_1825["phase_deg"]:<+10.2f}')
    print(f'  {"1851":<8} {P_1851:<12.4f} {fit["r2"]:<10.4f} {fit["rms_post"]:<10.1f} '
          f'{ap["amplitude_s"]:<10.2f} {ap["phase_deg"]:<+10.2f}')
    print(f'  ΔR² (1851 − 1825): {fit["r2"] - fit_1825["r2"]:+.5f}')
    print()

    # ─── Persist ───────────────────────────────────────────────────────
    output = {
        '_meta': {
            'description': ('Single-component 8H/n = 8H/1851 fit to Stephenson ΔT residual. '
                            'n=1851 corresponds to 73 × Jupiter-Saturn synodic cycles (0.00% error) '
                            '— the top-ranked 8H integer divisor in the sub-Milankovitch band per '
                            'scripts/lod_residual_divisor_scan_jse.py. Structural interpretation is '
                            'cleaner than the paper\'s original n=1825 (74 × J-S synodic to 0.05% error). '
                            'Amplitude and phase are FITTED to eclipse residual — turning this on in '
                            'src/script.js violates the paper\'s zero-eclipse-fit claim. Long-term fix '
                            'is to derive amplitude/phase from Bond 1997 IRD or equivalent paleoclimate.'),
            'source_script': 'scripts/lod_residual_1851_refit.py',
            'framework_n': 1851,
            'framework_period_yr': P_1851,
            'j_s_synodic_yr': J_S_SYNODIC_YR,
            'j_s_synodic_multiple': 73,
            'j_s_synodic_error_pct': abs(P_1851 - 73*J_S_SYNODIC_YR)/(73*J_S_SYNODIC_YR)*100,
            'eight_H_yr': EIGHT_H,
            'H_yr': H,
        },
        'coefficients_for_script_js': {
            'BOND_LATTICE_N':    n_1851,
            'BOND_COS_COEFF_S':  cos_coeff,
            'BOND_SIN_COEFF_S':  sin_coeff,
            'BOND_DT_RAW_AT_J2000': raw_j2000,  # For reference; script.js computes this at runtime
            'BOND_AMPLITUDE_S':  ap['amplitude_s'],
            'BOND_PHASE_DEG':    ap['phase_deg'],
        },
        'fit_metrics_in_sample': {
            'n_points':  len(years),
            'year_range': [float(years.min()), float(years.max())],
            'r2':        fit['r2'],
            'rms_pre':   fit['rms_pre'],
            'rms_post':  fit['rms_post'],
        },
        'comparison_to_1825': {
            'n_1825_r2':    fit_1825['r2'],
            'n_1851_r2':    fit['r2'],
            'delta_r2':     fit['r2'] - fit_1825['r2'],
        },
        'polynomial_detrend_reference_only': {
            'intercept':       intercept,
            'linear_per_kyr':  linear_per_kyr,
            'quadratic_kyr2':  quadratic_kyr2,
            'center_year':     float(years.mean()),
            'residual_mean_removed': residual_mean,
            'note': ('Polynomial coefficients are absorbed into the anchor calibration and are NOT '
                     'propagated to src/script.js (per commit 67624c2 design decision). Only the '
                     'cyclic cos/sin part is used as the ΔT correction.'),
        },
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

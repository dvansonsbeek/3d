"""
Jupiter92 isolated re-fit — against Stephenson residual AFTER Bond, Hallstatt,
and Jose5 corrections are already subtracted.

Previous solo fit was against RAW Stephenson residual, giving a phase that
absorbs Bond-band signal (since Bond dominates). L-5b with all four flags ON
showed Jupiter92 did NOT improve metrics — likely because its phase was
Bond-contaminated.

This script:
  1. Load Stephenson ΔT
  2. Compute framework model ΔT (pure-tidal, no corrections)
  3. Add Bond correction using SHIPPED coefficients (data/deltaT-1851-residual-fit.json)
  4. Add Hallstatt correction using SHIPPED coefficients (80 s constrained)
  5. Add Jose5 correction using SHIPPED coefficients (50 s constrained)
  6. Compute residual after all three corrections applied
  7. Fit Jupiter92 (8H/2461) alone against this residual → isolated phase
  8. Scale to 35 s target amplitude

Output: console + data/jupiter92-isolated-refit.json
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

OUT_PATH = Path('/home/dennis/code/3d/data/jupiter92-isolated-refit.json')

# Shipped coefficients (from src/script.js)
BOND_N = 1851;      BOND_COS = 156.48439921860614; BOND_SIN = 343.78858156076024
HALL_N = 1104;      HALL_COS = -1.574249;          HALL_SIN = 79.984509
JOSE5_N = 2989;     JOSE5_COS = -48.24;            JOSE5_SIN = -13.14
JUP92_N = 2461      # target divisor

# Holocene taper — same for all four
TAPER_FULL = 4500.0
TAPER_TOTAL = 6000.0

def holocene_taper(year):
    dy = abs(year - 2000)
    if dy <= TAPER_FULL: return 1.0
    if dy >= TAPER_TOTAL: return 0.0
    u = (dy - TAPER_FULL) / (TAPER_TOTAL - TAPER_FULL)
    return 0.5 * (1.0 + math.cos(math.pi * u))

def apply_cycle_correction(years, cos_c, sin_c, n):
    P = EIGHT_H / n
    omega = 2 * math.pi / P
    raw_j2000 = cos_c * math.cos(omega * 2000) + sin_c * math.sin(omega * 2000)
    out = np.zeros_like(years)
    for i, y in enumerate(years):
        t = holocene_taper(float(y))
        if t <= 0:
            out[i] = 0.0
        else:
            raw = cos_c * math.cos(omega * y) + sin_c * math.sin(omega * y)
            out[i] = t * (raw - raw_j2000)
    return out

def main():
    print('=' * 85)
    print('JUPITER92 ISOLATED RE-FIT — against post-Bond+Hallstatt+Jose5 residual')
    print('=' * 85)
    print()

    # Load Stephenson ΔT and framework model
    years = np.arange(-720, 2017, 10, dtype=float)
    segs = load_stephenson()
    dt_s = stephenson_delta_t_vector(years, segs)
    dt_m = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_s)
    years = years[valid]; dt_s = dt_s[valid]; dt_m = dt_m[valid]

    # Compute each shipped correction
    bond_corr  = apply_cycle_correction(years, BOND_COS,  BOND_SIN,  BOND_N)
    hall_corr  = apply_cycle_correction(years, HALL_COS,  HALL_SIN,  HALL_N)
    jose5_corr = apply_cycle_correction(years, JOSE5_COS, JOSE5_SIN, JOSE5_N)

    # Model + all three corrections
    dt_m_corrected = dt_m + bond_corr + hall_corr + jose5_corr

    # Residual after all three
    residual = dt_s - dt_m_corrected
    residual_centered = residual - residual.mean()

    print(f'  Data range: {int(years.min())}..{int(years.max())} AD, n = {len(years)}')
    print(f'  RMS(raw residual):                    {np.sqrt(np.mean((dt_s - dt_m)**2)):.1f} s')
    print(f'  RMS(post-Bond residual):              {np.sqrt(np.mean((dt_s - dt_m - bond_corr)**2)):.1f} s')
    print(f'  RMS(post-Bond+Hall residual):         {np.sqrt(np.mean((dt_s - dt_m - bond_corr - hall_corr)**2)):.1f} s')
    print(f'  RMS(post-B+H+Jose5 residual [target]): {residual.std():.1f} s')
    print()

    # Fit Jupiter92 alone against this residual
    cand = [{'label':'Jupiter92', 'P_target': EIGHT_H/JUP92_N, 'n': JUP92_N, 'P_actual': EIGHT_H/JUP92_N}]
    fit = fit_harmonics(years, residual_centered, cand, include_quadratic_detrend=True)
    ap = harmonic_amp_phase(fit, cand)[0]

    beta = fit['beta']
    ci = float(beta[3]); si = float(beta[4])
    P = EIGHT_H / JUP92_N
    omega = 2 * math.pi / P
    raw_j2000 = ci * math.cos(omega * 2000) + si * math.sin(omega * 2000)

    print('── Jupiter92 fit against post-B+H+Jose5 residual ──')
    print(f'  R² (against post-B+H+Jose5)      = {fit["r2"]:.4f}')
    print(f'  RMS pre / post fit               = {fit["rms_pre"]:.2f} / {fit["rms_post"]:.2f} s')
    print(f'  Free-fit amp                     = {ap["amplitude_s"]:.3f} s')
    print(f'  Free-fit phase (cos-form)        = {ap["phase_deg"]:+.3f}°')
    print(f'  Coefficients (free):             cos = {ci:.4f}, sin = {si:.4f}')
    print()

    # Scale to 35 s target
    target = 35.0
    scale = target / ap['amplitude_s']
    sc_cos = ci * scale
    sc_sin = si * scale
    sc_raw = raw_j2000 * scale
    sc_amp = math.hypot(sc_cos, sc_sin)

    print(f'── Scaled to {target:.0f} s target ──')
    print(f'  cos = {sc_cos:.4f}')
    print(f'  sin = {sc_sin:.4f}')
    print(f'  amp = {sc_amp:.4f}')
    print(f'  raw @ J2000 (would be subtracted) = {sc_raw:.4f}')
    print()

    # Compare with previous solo-fit
    print('── Comparison: previous solo fit vs new isolated fit ──')
    print(f'  Previous (against raw residual):  cos = -56.44, sin = 171.64  (amp = 181, phase = -108°)')
    print(f'  New      (post-B+H+Jose5):        cos = {ci:>6.2f}, sin = {si:>6.2f}  (amp = {ap["amplitude_s"]:.0f}, phase = {ap["phase_deg"]:+.0f}°)')
    print(f'  Scaled shipped previous:          cos = -10.9337, sin = 33.2484  (amp = 35)')
    print(f'  Scaled shipped NEW:               cos = {sc_cos:>7.4f}, sin = {sc_sin:>7.4f}  (amp = {sc_amp:.4f})')
    print()

    output = {
        '_meta': {
            'description': ('Jupiter92 (8H/2461) isolated re-fit against Stephenson ΔT residual AFTER '
                            'Bond + Hallstatt + Jose5 corrections have been applied (using shipped '
                            'coefficients). Fixes the phase-contamination issue from the earlier solo '
                            'fit which was against raw Stephenson residual and inherited Bond\'s phase.'),
            'source_script': 'scripts/jupiter92_isolated_refit.py',
            'H_yr': H, 'eight_H_yr': EIGHT_H,
        },
        'inputs': {
            'BOND_N': BOND_N, 'BOND_COS': BOND_COS, 'BOND_SIN': BOND_SIN,
            'HALL_N': HALL_N, 'HALL_COS': HALL_COS, 'HALL_SIN': HALL_SIN,
            'JOSE5_N': JOSE5_N, 'JOSE5_COS': JOSE5_COS, 'JOSE5_SIN': JOSE5_SIN,
            'JUP92_N': JUP92_N, 'target_amplitude_s': target,
        },
        'free_fit_isolated': {
            'r2_local': fit['r2'],
            'amplitude_s': ap['amplitude_s'],
            'phase_deg': ap['phase_deg'],
            'cos_free': ci, 'sin_free': si,
            'raw_j2000_free': raw_j2000,
        },
        'scaled_to_35s_ship_values': {
            'cos': sc_cos, 'sin': sc_sin, 'amplitude': sc_amp,
            'raw_j2000': sc_raw,
        },
        'previous_solo_fit_reference': {
            'cos_free': -56.44, 'sin_free': 171.64, 'amp_free': 181, 'phase_deg': -108.20,
            'cos_scaled_shipped': -10.9337, 'sin_scaled_shipped': 33.2484,
        },
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

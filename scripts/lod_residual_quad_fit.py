"""
Four-way joint fit: Bond (8H/1851) + Hallstatt (8H/1104) + Jose5 (8H/2989)
+ Jupiter92 (8H/2461) against Stephenson ΔT residual.

Jupiter92 was identified by L-5b Section 14 (with Bond+Hallstatt+Jose5 all ON)
as the NEW top remaining 8H residual signal: period 1090 yr, amp 52.4 s,
ΔR² = 0.0013. Structural: 2461 = 23 × 107, gcd(2461, H) = 23 shares H's 23
prime. Physical: 92 × Jupiter orbit (0.02% error, best of three candidates:
92×Jupiter, 37×Saturn, 55×J-S synodic).

Method: extends triple fit with a fourth cos/sin pair. Reports per-term
amplitude/phase, stability of prior terms, and collinearity indicators.

Output: console + data/deltaT-quad-fit.json
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

OUT_PATH = Path('/home/dennis/code/3d/data/deltaT-quad-fit.json')

def main():
    print('=' * 85)
    print('QUAD ΔT RESIDUAL FIT: Bond + Hallstatt + Jose5 + Jupiter92')
    print('=' * 85)
    P_BOND      = EIGHT_H / 1851
    P_HALL      = EIGHT_H / 1104
    P_JOSE5     = EIGHT_H / 2989
    P_JUP92     = EIGHT_H / 2461
    print()
    print(f'  Bond      P = {P_BOND:.2f} yr (73×J-S synodic; gcd=1)')
    print(f'  Hallstatt P = {P_HALL:.2f} yr (H/138; gcd=23)')
    print(f'  Jose5     P = {P_JOSE5:.2f} yr (5×Jose 179; gcd=61)')
    print(f'  Jupiter92 P = {P_JUP92:.2f} yr (92×Jupiter orbit; gcd=23)')
    print()

    years = np.arange(-720, 2017, 10, dtype=float)
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years         = years[valid]
    dt_stephenson = dt_stephenson[valid]
    dt_model      = dt_model[valid]
    residual_raw  = dt_stephenson - dt_model
    residual_centered = residual_raw - residual_raw.mean()

    four = [
        {'label':'Bond',      'P_target':P_BOND,  'n':1851, 'P_actual':P_BOND},
        {'label':'Hallstatt', 'P_target':P_HALL,  'n':1104, 'P_actual':P_HALL},
        {'label':'Jose5',     'P_target':P_JOSE5, 'n':2989, 'P_actual':P_JOSE5},
        {'label':'Jupiter92', 'P_target':P_JUP92, 'n':2461, 'P_actual':P_JUP92},
    ]
    fit = fit_harmonics(years, residual_centered, four, include_quadratic_detrend=True)
    ap  = harmonic_amp_phase(fit, four)

    print(f'── Quad fit — R² = {fit["r2"]:.4f}, RMS pre/post = {fit["rms_pre"]:.1f} / {fit["rms_post"]:.1f} s ──')
    for label, a in zip(['Bond','Hallstatt','Jose5','Jupiter92'], ap):
        print(f'  {label:9s} amp = {a["amplitude_s"]:.2f} s, phase = {a["phase_deg"]:+.2f}°')
    print()

    beta = fit['beta']
    n_detrend = 3

    def coeffs(i, n):
        ci = float(beta[n_detrend + 2*i])
        si = float(beta[n_detrend + 2*i + 1])
        P = EIGHT_H / n
        omega = 2 * math.pi / P
        raw_j2000 = ci * math.cos(omega * 2000) + si * math.sin(omega * 2000)
        return {'cos': ci, 'sin': si, 'raw_j2000': raw_j2000, 'amplitude': math.hypot(ci, si), 'period_yr': P}

    coefs = {
        'bond':      coeffs(0, 1851),
        'hallstatt': coeffs(1, 1104),
        'jose5':     coeffs(2, 2989),
        'jupiter92': coeffs(3, 2461),
    }

    print('── Coefficients ──')
    for name, c in coefs.items():
        print(f'  {name:9s} cos={c["cos"]:>10.4f}  sin={c["sin"]:>10.4f}  amp={c["amplitude"]:>7.2f}  raw@J2000={c["raw_j2000"]:>8.2f}')
    print()

    # Scale Jupiter92 to target 35 s
    TARGET_JUP92 = 35.0
    scale = TARGET_JUP92 / coefs['jupiter92']['amplitude']
    scaled_cos = coefs['jupiter92']['cos'] * scale
    scaled_sin = coefs['jupiter92']['sin'] * scale
    print(f'── Jupiter92 scaled to {TARGET_JUP92:.0f} s target amplitude ──')
    print(f'  cos = {scaled_cos:.4f}')
    print(f'  sin = {scaled_sin:.4f}')
    print(f'  amp = {math.hypot(scaled_cos, scaled_sin):.4f}')
    print()

    output = {
        '_meta': {
            'description': ('4-way joint fit: Bond + Hallstatt + Jose5 + Jupiter92 (8H/2461 = 1090 yr) '
                            'against Stephenson ΔT residual. Jupiter92 identified by L-5b Section 14 '
                            'with all three prior corrections enabled. Structural: 2461 = 23·107; '
                            'physical: 92 × Jupiter orbit (0.02% error).'),
            'source_script': 'scripts/lod_residual_quad_fit.py',
            'H_yr': H, 'eight_H_yr': EIGHT_H,
        },
        'periods_yr': {'bond': P_BOND, 'hallstatt': P_HALL, 'jose5': P_JOSE5, 'jupiter92': P_JUP92},
        'quad_fit_r2': fit['r2'],
        'quad_fit_rms_post': fit['rms_post'],
        'amplitudes_free_fit': {name: c['amplitude'] for name, c in coefs.items()},
        'coefficients_free_fit': coefs,
        'jupiter92_scaled_to_35s': {
            'cos': scaled_cos, 'sin': scaled_sin,
            'raw_j2000': scaled_cos * math.cos(2*math.pi/P_JUP92 * 2000) + scaled_sin * math.sin(2*math.pi/P_JUP92 * 2000),
        },
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

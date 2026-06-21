"""
2-component fit test: does adding the de Vries solar cycle (8H/12774 = 210 yr)
to the Bond cycle (8H/1825 = 1470 yr) improve the fit and survive cross-validation?

Hypotheses:
  H1: Braun et al. 2005 mechanism is correct → 1470 yr = 7 × 210 yr means
      both cycles should be physically present in the data. The 2-component
      fit should have higher CV R² than Bond alone.
  H0: Bond captures everything visible at our resolution; de Vries adds nothing.

A caveat to keep in mind:
  The Stephenson spline (Table S15) has wide knot spacing (segments 100-600 yr).
  Cubic spline interpolation smooths out short-period structure within each
  knot interval. So a 210-yr signal in the raw observations may NOT propagate
  into the spline-vs-model residual. If de Vries comes back ~zero amplitude,
  it could be because the spline ate it, not because it isn't there.

  We test on the spline-residual anyway because that's what we have, but
  document this limitation in the output.
"""

import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    EIGHT_H, load_stephenson, stephenson_delta_t_vector,
    model_delta_t_vector, fit_harmonics, harmonic_amp_phase,
)
from lod_residual_lattice_cv import fit_and_predict

# Candidate sets
BOND_ONLY = [
    {'label': 'Bond ~1470 yr',         'n': 1825,  'P_actual': EIGHT_H / 1825},
]
BOND_PLUS_DEVRIES = [
    {'label': 'Bond ~1470 yr',         'n': 1825,  'P_actual': EIGHT_H / 1825},
    {'label': 'de Vries ~210 yr',      'n': 12774, 'P_actual': EIGHT_H / 12774},
]
DEVRIES_ONLY = [
    {'label': 'de Vries ~210 yr',      'n': 12774, 'P_actual': EIGHT_H / 12774},
]

def print_cv_row(label, result):
    print(f'  {label:40s}  R²_train={result["r2_train"]:>+7.4f}  RMS_tr={result["rms_train"]:>6.1f}s  '
          f'R²_test={result["r2_test"]:>+7.4f}  RMS_te={result["rms_test"]:>6.1f}s')

def main():
    print('=' * 85)
    print('2-COMPONENT FIT: BOND (8H/1825) + DE VRIES (8H/12774) cross-validation')
    print('=' * 85)
    print()
    print(f'  Period ratio: 12774 / 1825 = {12774/1825:.6f}  (exactly 7)')
    print(f'  Period (Bond):    8H/1825 = {EIGHT_H/1825:.3f} yr')
    print(f'  Period (de Vries): 8H/12774 = {EIGHT_H/12774:.3f} yr')
    print()

    # ─── Build residual on 10-yr grid ─────────────────────────────────────
    years = np.arange(-720, 2017, 10, dtype=float)
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years = years[valid]
    residual = dt_stephenson[valid] - dt_model[valid]
    residual = residual - residual.mean()
    print(f'Residual: n={len(years)} points, RMS = {np.sqrt(np.mean(residual**2)):.1f} s')

    # Nyquist sanity check for de Vries
    nyquist_period = 20.0  # 10-yr sampling
    print(f'Sampling: 10-yr grid → Nyquist period = {nyquist_period} yr.')
    print(f'  Bond (1470 yr): well-resolved ({1470/20:.1f} samples per cycle, ~{2730/1470:.2f} cycles in window)')
    print(f'  de Vries (210 yr): resolved ({210/20:.1f} samples per cycle, ~{2730/210:.1f} cycles in window)')
    print()

    # ─── IN-SAMPLE FITS — three models compared ─────────────────────────
    print('=' * 85)
    print('IN-SAMPLE FITS (full window)')
    print('=' * 85)
    fit_detrend = fit_harmonics(years, residual, [], include_quadratic_detrend=True)
    fit_bond    = fit_harmonics(years, residual, BOND_ONLY, include_quadratic_detrend=True)
    fit_devries = fit_harmonics(years, residual, DEVRIES_ONLY, include_quadratic_detrend=True)
    fit_both    = fit_harmonics(years, residual, BOND_PLUS_DEVRIES, include_quadratic_detrend=True)

    ap_bond_alone = harmonic_amp_phase(fit_bond, BOND_ONLY)
    ap_devries_alone = harmonic_amp_phase(fit_devries, DEVRIES_ONLY)
    ap_both = harmonic_amp_phase(fit_both, BOND_PLUS_DEVRIES)

    print(f'  {"Model":<40s}  {"R²":>8} {"RMS (s)":>10}  {"Bond amp":>10}  {"de Vries amp":>13}')
    print(f'  {"-"*40}  {"-"*8} {"-"*10}  {"-"*10}  {"-"*13}')
    print(f'  {"Detrend only":<40s}  {fit_detrend["r2"]:>8.4f} {fit_detrend["rms_post"]:>10.1f}  {"":>10}  {"":>13}')
    print(f'  {"Bond only":<40s}  {fit_bond["r2"]:>8.4f} {fit_bond["rms_post"]:>10.1f}  '
          f'{ap_bond_alone[0]["amplitude_s"]:>10.1f}  {"":>13}')
    print(f'  {"de Vries only":<40s}  {fit_devries["r2"]:>8.4f} {fit_devries["rms_post"]:>10.1f}  '
          f'{"":>10}  {ap_devries_alone[0]["amplitude_s"]:>13.2f}')
    print(f'  {"Bond + de Vries":<40s}  {fit_both["r2"]:>8.4f} {fit_both["rms_post"]:>10.1f}  '
          f'{ap_both[0]["amplitude_s"]:>10.1f}  {ap_both[1]["amplitude_s"]:>13.2f}')
    print()
    delta_r2_devries = fit_both['r2'] - fit_bond['r2']
    print(f'  ΔR² from adding de Vries to Bond:  {delta_r2_devries:+.4f}')
    print(f'  ΔRMS from adding de Vries to Bond: {fit_both["rms_post"]-fit_bond["rms_post"]:+.1f} s')
    if delta_r2_devries < 0.005:
        print(f'  → de Vries adds ESSENTIALLY NOTHING in-sample.')
    else:
        print(f'  → de Vries adds measurable but small in-sample improvement.')
    print()

    # ─── CROSS-VALIDATION (all 4 splits as before) ─────────────────────
    cv_splits = [
        ('SPLIT 1: train -720..1500, test 1500..2016', years <= 1500, years >  1500),
        ('SPLIT 2: train 0..2016, test -720..0',       years >= 0,    years <  0),
        ('SPLIT 3: alternating decades',
            (np.arange(len(years)) % 2) == 0, (np.arange(len(years)) % 2) == 1),
        ('SPLIT 4: train -720..900, test 900..2016',   years <= 900,  years >  900),
    ]

    for name, mask_tr, mask_te in cv_splits:
        print('=' * 85)
        print(name)
        print('=' * 85)
        yr_tr, yr_te = years[mask_tr], years[mask_te]
        res_tr, res_te = residual[mask_tr], residual[mask_te]
        print(f'  Train: n={len(yr_tr)} [{yr_tr.min():.0f}..{yr_tr.max():.0f}], '
              f'Test: n={len(yr_te)} [{yr_te.min():.0f}..{yr_te.max():.0f}]')
        print()
        r_bond  = fit_and_predict(yr_tr, res_tr, yr_te, res_te, BOND_ONLY)
        r_dev   = fit_and_predict(yr_tr, res_tr, yr_te, res_te, DEVRIES_ONLY)
        r_both  = fit_and_predict(yr_tr, res_tr, yr_te, res_te, BOND_PLUS_DEVRIES)
        print_cv_row('Bond (n=1825) only', r_bond)
        print_cv_row('de Vries (n=12774) only', r_dev)
        print_cv_row('Bond + de Vries', r_both)
        delta = r_both['r2_test'] - r_bond['r2_test']
        print()
        if delta > 0.02:
            print(f'  → Adding de Vries IMPROVES out-of-sample R² by {delta:+.4f}  ✓')
        elif delta > -0.02:
            print(f'  → Adding de Vries is NEUTRAL out-of-sample (Δ R²_test = {delta:+.4f})')
        else:
            print(f'  → Adding de Vries HURTS out-of-sample R² by {delta:+.4f}  ✗ (overfit)')
        print()

    # ─── INTERPRETATION ─────────────────────────────────────────────────
    print('=' * 85)
    print('INTERPRETATION')
    print('=' * 85)
    print('  If Bond+de Vries OUT-PERFORMS Bond alone across multiple splits:')
    print('    → Both cycles are physically present in the rotation record.')
    print('    → Supports Braun et al. 2005 mechanism (1470 = 7 × 210 via non-linear')
    print('      thermohaline response to solar forcing).')
    print()
    print('  If Bond+de Vries MATCHES Bond alone:')
    print('    → de Vries either absent or below our resolution.')
    print('    → CAVEAT: Stephenson spline (Table S15) has knot spacing 100-600 yr')
    print('      and may smooth out 210-yr signal in raw observations. Even if real,')
    print('      de Vries wouldn\'t survive into the spline-based residual.')
    print()
    print('  If Bond+de Vries IS WORSE out-of-sample:')
    print('    → de Vries component is overfitting noise; reject for inclusion.')

if __name__ == '__main__':
    main()

"""
Out-of-sample cross-validation for the 8H/n lattice fit found in
scripts/lod_residual_lattice_fit.py.

Hypothesis test:
  H1: The 1470-yr Bond-cycle harmonic (8H/1825) explains real physics →
      a fit on EARLY data should PREDICT the LATE data.
  H0: The 1470-yr fit is just curve-fitting the medieval bump →
      out-of-sample R² will collapse to ~0 or go negative.

Tests:
  1. Train on years -720 to 1500, predict on 1500-2016.
  2. Train on years 0 to 2016 (skip pre-CE), predict on -720 to 0.
  3. Train on alternating decades, predict on the other half (random-CV).
  4. Compare 1-component (Bond-only) vs 3-component (Bond + 800 + 1000) vs
     detrend-only baselines on each split.

A real result needs:
  • Out-of-sample R² > 0.5 on at least 2 of 3 splits.
  • Predicted curve visually tracks observed residual in test window.
  • 1-component fit (n=1825 only) should ALSO survive — if you need all 3
    to predict, that's a warning sign for overfitting.
"""

import math
import sys
from pathlib import Path
import numpy as np

# Import the model+residual machinery from the previous script
sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    EIGHT_H, load_stephenson, stephenson_delta_t_vector,
    model_delta_t_vector, fit_harmonics, harmonic_amp_phase,
)

# Greedy-selected 3-component set from previous run
SELECTED_3 = [
    {'label': 'Bond ~1470 yr',          'n': 1825, 'P_actual': EIGHT_H / 1825},
    {'label': 'MWP-FWHM-fit ~800 yr',   'n': 3353, 'P_actual': EIGHT_H / 3353},
    {'label': 'Eddy/Eddy-Bond ~1000',   'n': 2683, 'P_actual': EIGHT_H / 2683},
]
SELECTED_1 = SELECTED_3[:1]   # Bond-only

# ============================================================================
# CROSS-VAL UTILITY
# ============================================================================

def evaluate_on_test(beta, col_labels, years_test, candidates,
                     include_quadratic_detrend=True, year_center=None):
    """Apply fitted coefficients to a test year set; return predictions."""
    years_test = np.asarray(years_test, dtype=float)
    if year_center is None:
        year_center = years_test.mean()
    t = years_test - year_center
    cols = [np.ones_like(t)]
    if include_quadratic_detrend:
        cols.append(t / 1000.0)
        cols.append((t / 1000.0) ** 2)
    for c in candidates:
        omega = 2.0 * math.pi / c['P_actual']
        cols.append(np.cos(omega * years_test))
        cols.append(np.sin(omega * years_test))
    X = np.column_stack(cols)
    return X @ beta

def fit_and_predict(years_train, residual_train, years_test, residual_test, candidates):
    """Fit on train, predict on test. Returns dict of metrics + predictions."""
    # Fit on training set
    fit = fit_harmonics(years_train, residual_train, candidates, include_quadratic_detrend=True)
    # The fit centers years at train.mean() — use the same center for evaluation
    train_center = float(years_train.mean())
    pred_test = evaluate_on_test(fit['beta'], fit['col_labels'], years_test,
                                  candidates, include_quadratic_detrend=True,
                                  year_center=train_center)
    # Out-of-sample R²
    ss_res = float(np.sum((residual_test - pred_test) ** 2))
    ss_tot = float(np.sum((residual_test - residual_test.mean()) ** 2))
    r2_oos = 1.0 - ss_res / max(ss_tot, 1e-12)
    rms_oos = float(np.sqrt(np.mean((residual_test - pred_test) ** 2)))
    return {
        'r2_train':    fit['r2'],
        'rms_train':   fit['rms_post'],
        'r2_test':     r2_oos,
        'rms_test':    rms_oos,
        'pred_test':   pred_test,
        'fit':         fit,
    }

def print_cv_result(name, result, residual_test):
    print(f'  {name:35s}  R²_train={result["r2_train"]:>+7.4f}  RMS_train={result["rms_train"]:>7.1f}s  '
          f'R²_test={result["r2_test"]:>+7.4f}  RMS_test={result["rms_test"]:>7.1f}s')

# ============================================================================
# MAIN
# ============================================================================

def main():
    print('=' * 80)
    print('CROSS-VALIDATION: out-of-sample test for sub-kyr 8H/n lattice fit')
    print('=' * 80)
    print()

    # Build full residual time series (10-yr resolution)
    years = np.arange(-720, 2017, 10, dtype=float)
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years = years[valid]
    residual = dt_stephenson[valid] - dt_model[valid]
    residual = residual - residual.mean()
    print(f'Full residual: n={len(years)} points, year [{years.min():.0f}, {years.max():.0f}]')
    print(f'Full residual: RMS = {np.sqrt(np.mean(residual**2)):.1f} s')
    print()

    # ─── SPLIT 1: TRAIN −720→1500, TEST 1500→2016 ───────────────────────
    # This tests whether a fit using mostly the MEDIEVAL bump predicts the
    # post-medieval era. Easy to overfit medieval if so.
    print('=' * 80)
    print('SPLIT 1: TRAIN −720..1500, TEST 1500..2016')
    print(f'  Tests whether a fit dominated by medieval-bump data extrapolates')
    print(f'  to the post-medieval era. (The hardest direction — most likely')
    print(f'  to expose overfit.)')
    print('=' * 80)
    mask_train = years <= 1500
    mask_test  = years >  1500
    yr_train, yr_test = years[mask_train], years[mask_test]
    res_train, res_test = residual[mask_train], residual[mask_test]
    print(f'  Train: n={len(yr_train)} ({yr_train.min():.0f} to {yr_train.max():.0f})')
    print(f'  Test:  n={len(yr_test)} ({yr_test.min():.0f} to {yr_test.max():.0f}), RMS={np.sqrt(np.mean(res_test**2)):.1f}s')
    print()

    r_detrend = fit_and_predict(yr_train, res_train, yr_test, res_test, [])
    r_bond1   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_1)
    r_3comp   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_3)
    print(f'  {"Model":<35s}  {"R²_train":>10s}  {"RMS_tr":>8s}  {"R²_test":>10s}  {"RMS_te":>8s}')
    print(f'  {"-"*35}  {"-"*10}  {"-"*8}  {"-"*10}  {"-"*8}')
    print_cv_result('Detrend only (baseline)', r_detrend, res_test)
    print_cv_result('+ Bond n=1825 (P=1470 yr)', r_bond1, res_test)
    print_cv_result('+ Bond + 800 + 1000 yr', r_3comp, res_test)

    # Print predicted vs actual at sample years in test set
    print()
    print(f'  Predicted vs actual in test window (1-comp Bond):')
    print(f'  {"Year":>5} {"actual (s)":>12} {"pred (s)":>12} {"err":>10}')
    sample = [1550, 1600, 1700, 1800, 1900, 1950, 2000]
    for sy in sample:
        idx = int(np.argmin(np.abs(yr_test - sy)))
        if abs(yr_test[idx] - sy) < 15:
            err = res_test[idx] - r_bond1['pred_test'][idx]
            print(f'  {yr_test[idx]:>5.0f} {res_test[idx]:>+12.1f} {r_bond1["pred_test"][idx]:>+12.1f} {err:>+10.1f}')

    # ─── SPLIT 2: TRAIN 0→2016, TEST −720→0 ────────────────────────────
    print()
    print('=' * 80)
    print('SPLIT 2: TRAIN 0..2016, TEST −720..0')
    print(f'  Reverse direction: fit using mostly post-CE data (including')
    print(f'  medieval bump), predict pre-CE Babylonian era.')
    print('=' * 80)
    mask_train = years >= 0
    mask_test  = years <  0
    yr_train, yr_test = years[mask_train], years[mask_test]
    res_train, res_test = residual[mask_train], residual[mask_test]
    print(f'  Train: n={len(yr_train)} ({yr_train.min():.0f} to {yr_train.max():.0f})')
    print(f'  Test:  n={len(yr_test)} ({yr_test.min():.0f} to {yr_test.max():.0f}), RMS={np.sqrt(np.mean(res_test**2)):.1f}s')
    print()

    r_detrend = fit_and_predict(yr_train, res_train, yr_test, res_test, [])
    r_bond1   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_1)
    r_3comp   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_3)
    print(f'  {"Model":<35s}  {"R²_train":>10s}  {"RMS_tr":>8s}  {"R²_test":>10s}  {"RMS_te":>8s}')
    print(f'  {"-"*35}  {"-"*10}  {"-"*8}  {"-"*10}  {"-"*8}')
    print_cv_result('Detrend only (baseline)', r_detrend, res_test)
    print_cv_result('+ Bond n=1825 (P=1470 yr)', r_bond1, res_test)
    print_cv_result('+ Bond + 800 + 1000 yr', r_3comp, res_test)

    # Predicted vs actual in test set
    print()
    print(f'  Predicted vs actual in test window (1-comp Bond):')
    print(f'  {"Year":>5} {"actual (s)":>12} {"pred (s)":>12} {"err":>10}')
    sample = [-700, -600, -500, -400, -300, -200, -100]
    for sy in sample:
        idx = int(np.argmin(np.abs(yr_test - sy)))
        if abs(yr_test[idx] - sy) < 15:
            err = res_test[idx] - r_bond1['pred_test'][idx]
            print(f'  {yr_test[idx]:>5.0f} {res_test[idx]:>+12.1f} {r_bond1["pred_test"][idx]:>+12.1f} {err:>+10.1f}')

    # ─── SPLIT 3: ALTERNATING DECADES (random-CV) ──────────────────────
    print()
    print('=' * 80)
    print('SPLIT 3: ALTERNATING decades (interleaved train/test)')
    print(f'  Every other decade goes to train vs test. This is the gentlest')
    print(f'  test (no extrapolation), but does check whether the fit smoothly')
    print(f'  interpolates with no Runge-like behavior between training points.')
    print('=' * 80)
    rng = np.random.default_rng(seed=7)
    train_mask = (np.arange(len(years)) % 2) == 0
    test_mask = ~train_mask
    yr_train, yr_test = years[train_mask], years[test_mask]
    res_train, res_test = residual[train_mask], residual[test_mask]
    print(f'  Train: n={len(yr_train)}, Test: n={len(yr_test)}, '
          f'test RMS={np.sqrt(np.mean(res_test**2)):.1f}s')
    print()

    r_detrend = fit_and_predict(yr_train, res_train, yr_test, res_test, [])
    r_bond1   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_1)
    r_3comp   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_3)
    print(f'  {"Model":<35s}  {"R²_train":>10s}  {"RMS_tr":>8s}  {"R²_test":>10s}  {"RMS_te":>8s}')
    print(f'  {"-"*35}  {"-"*10}  {"-"*8}  {"-"*10}  {"-"*8}')
    print_cv_result('Detrend only (baseline)', r_detrend, res_test)
    print_cv_result('+ Bond n=1825 (P=1470 yr)', r_bond1, res_test)
    print_cv_result('+ Bond + 800 + 1000 yr', r_3comp, res_test)

    # ─── SPLIT 4: TRAIN −720→900 (PRE-bump), TEST 900→2016 (post-+during-bump) ──
    print()
    print('=' * 80)
    print('SPLIT 4: TRAIN −720..900 (PRE-MWP), TEST 900..2016 (MWP+post)')
    print(f'  THE TOUGHEST TEST. Train data has NO information about the')
    print(f'  medieval bump itself. If the Bond cycle predicts it from')
    print(f'  earlier-Holocene structure alone, that\'s the real validation.')
    print('=' * 80)
    mask_train = years <= 900
    mask_test  = years >  900
    yr_train, yr_test = years[mask_train], years[mask_test]
    res_train, res_test = residual[mask_train], residual[mask_test]
    print(f'  Train: n={len(yr_train)} ({yr_train.min():.0f} to {yr_train.max():.0f})')
    print(f'  Test:  n={len(yr_test)} ({yr_test.min():.0f} to {yr_test.max():.0f}), RMS={np.sqrt(np.mean(res_test**2)):.1f}s')
    print(f'  Train contains: {(res_train<0).sum()} negative + {(res_train>0).sum()} positive points')
    print(f'  Test  contains: {(res_test<0).sum()} negative + {(res_test>0).sum()} positive points')
    print(f'  Test RMS dominated by medieval bump (years 900-1300).')
    print()

    r_detrend = fit_and_predict(yr_train, res_train, yr_test, res_test, [])
    r_bond1   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_1)
    r_3comp   = fit_and_predict(yr_train, res_train, yr_test, res_test, SELECTED_3)
    print(f'  {"Model":<35s}  {"R²_train":>10s}  {"RMS_tr":>8s}  {"R²_test":>10s}  {"RMS_te":>8s}')
    print(f'  {"-"*35}  {"-"*10}  {"-"*8}  {"-"*10}  {"-"*8}')
    print_cv_result('Detrend only (baseline)', r_detrend, res_test)
    print_cv_result('+ Bond n=1825 (P=1470 yr)', r_bond1, res_test)
    print_cv_result('+ Bond + 800 + 1000 yr', r_3comp, res_test)

    print()
    print(f'  Predicted vs actual in test window (1-comp Bond):')
    print(f'  {"Year":>5} {"actual (s)":>12} {"pred (s)":>12} {"err":>10}')
    sample = [950, 1000, 1100, 1200, 1300, 1500, 1800, 2000]
    for sy in sample:
        idx = int(np.argmin(np.abs(yr_test - sy)))
        if abs(yr_test[idx] - sy) < 15:
            err = res_test[idx] - r_bond1['pred_test'][idx]
            print(f'  {yr_test[idx]:>5.0f} {res_test[idx]:>+12.1f} {r_bond1["pred_test"][idx]:>+12.1f} {err:>+10.1f}')

    # ─── INTERPRETATION GUIDE ───────────────────────────────────────────
    print()
    print('=' * 80)
    print('INTERPRETATION')
    print('=' * 80)
    print('  ✓ Real physics (Bond cycle is real) if:')
    print('     - Split 4 (pre-MWP train) gives R²_test > +0.5')
    print('     - 1-comp model survives all splits with R²_test > 0')
    print('  ⚠ Suspicious if:')
    print('     - 1-comp R²_test gets worse than detrend on any split')
    print('     - Need all 3 components to maintain performance')
    print('  ✗ Pure curve-fit if:')
    print('     - Split 4 R²_test < 0  (can\'t predict beyond train window)')
    print('     - 3-comp out-performs 1-comp on train but loses out-of-sample')


if __name__ == '__main__':
    main()

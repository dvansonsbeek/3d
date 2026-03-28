#!/usr/bin/env python3
"""
Verify Earth perihelion longitude and ERD (Earth Rate Deviation) quality.

Loads simulation truth data from data/01-holistic-year-objects-data.xlsx and
compares against the fitted harmonic formulas in predictive_formula.py.

Checks:
  1. Perihelion longitude RMSE and max error vs simulation truth
  2. J2000 perihelion accuracy vs IAU reference (102.947°)
  3. ERD analytical vs numerical derivative of truth data
  4. Pass/fail thresholds — non-zero exit if any check fails

Intended to run after fit_perihelion_harmonics.py as part of the fitting pipeline.

Usage: python tools/fit/python/verify_perihelion_erd.py
"""

import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ─── Path setup ───────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
_REPO = _HERE.parent.parent.parent
_LIB_PYTHON = _REPO / 'tools' / 'lib' / 'python'

sys.path.insert(0, str(_HERE))       # load_constants.py
sys.path.insert(0, str(_LIB_PYTHON)) # predictive_formula.py, constants_scripts.py

from load_constants import C
from predictive_formula import calc_earth_perihelion, calc_erd

# ─── Configuration ────────────────────────────────────────────────────────────
EXCEL_PATH = _REPO / 'data' / '01-holistic-year-objects-data.xlsx'
SHEET_NAME = 'Holistic_objects_PerihelionPlan'

# IAU reference perihelion longitude at J2000
J2000_REF_DEG = 102.947

# Pass/fail thresholds
PERI_RMSE_WARN  = 0.010   # degrees — yellow warning
PERI_RMSE_FAIL  = 0.050   # degrees — red fail
PERI_MAX_FAIL   = 0.500   # degrees — max single-point error fail
J2000_FAIL      = 0.010   # degrees — J2000 accuracy fail
ERD_RMSE_WARN   = 0.0010  # degrees/year — ERD comparison warning
ERD_RMSE_FAIL   = 0.0050  # degrees/year — ERD comparison fail

ERD_STEP_YEARS  = int(C.get('stepYears', 20))  # data step size (years), used for numerical derivative


def load_truth():
    """Load Earth Perihelion ICRF from the Excel simulation data and unwrap."""
    df = pd.read_excel(str(EXCEL_PATH), sheet_name=SHEET_NAME)

    # Downsample by stepYears for consistency with fitting scripts
    step = int(C.get('stepYears', 20))
    df = df.iloc[::step].reset_index(drop=True)

    years = df['Model Year'].values.astype(float)
    peri_raw = df['Earth Perihelion ICRF'].values.astype(float)
    peri_unwrapped = np.rad2deg(np.unwrap(np.deg2rad(peri_raw)))
    print(f'  Downsampled by {step}: {len(years)} points')
    return years, peri_unwrapped


def angular_diff(a, b):
    """Signed angular difference a - b, wrapped to [-180, 180]."""
    d = (a - b + 540.0) % 360.0 - 180.0
    return d


def check(label, passed, detail=''):
    """Print a pass/fail line."""
    mark = '✓' if passed else '✗'
    suffix = f'  {detail}' if detail else ''
    print(f'  {mark} {label}{suffix}')
    return passed


def main():
    print('═══════════════════════════════════════════════════════════════')
    print('  PERIHELION & ERD VERIFICATION')
    print('═══════════════════════════════════════════════════════════════')

    # ── Load truth ────────────────────────────────────────────────────────────
    print(f'\nLoading truth data from {EXCEL_PATH.name} ...')
    try:
        years, peri_truth = load_truth()
    except FileNotFoundError:
        print(f'\n  ERROR: data file not found: {EXCEL_PATH}')
        print('  Run step 3 (export from browser GUI) first.')
        sys.exit(2)

    n = len(years)
    year_lo, year_hi = int(years[0]), int(years[-1])
    print(f'  {n} data points, {year_lo} to {year_hi} (step ~{ERD_STEP_YEARS} yr)')

    # ── Section 1: Perihelion longitude ──────────────────────────────────────
    print('\n── 1. Perihelion Longitude ──────────────────────────────────────')

    peri_pred = np.array([calc_earth_perihelion(int(y)) for y in years])

    # calc_earth_perihelion returns a value in [0, 360]; truth is unwrapped
    # (many full cycles over the 335k-yr range). Compare using angular difference
    # per point so wrapping does not inflate residuals.
    residuals = np.array([angular_diff(t % 360.0, p) for t, p in zip(peri_truth, peri_pred)])
    rmse = np.sqrt(np.mean(residuals ** 2))
    max_err = np.max(np.abs(residuals))
    max_err_year = years[np.argmax(np.abs(residuals))]
    mean_err = np.mean(residuals)

    print(f'  RMSE    : {rmse:.6f}°')
    print(f'  Max err : {max_err:.6f}°  (year {max_err_year:.0f})')
    print(f'  Mean err: {mean_err:.6f}°')

    # ── Section 2: J2000 accuracy ─────────────────────────────────────────────
    print('\n── 2. J2000 Accuracy ────────────────────────────────────────────')

    j2000_pred = calc_earth_perihelion(2000)
    j2000_idx = np.argmin(np.abs(years - 2000))
    j2000_truth = peri_truth[j2000_idx] % 360.0
    j2000_diff = angular_diff(j2000_pred, J2000_REF_DEG)
    j2000_vs_data = angular_diff(j2000_pred, j2000_truth)

    print(f'  Predicted at J2000 : {j2000_pred:.4f}°')
    print(f'  Truth data (nearest): {j2000_truth:.4f}°  (year {years[j2000_idx]:.0f})')
    print(f'  IAU reference       : {J2000_REF_DEG:.4f}°')
    print(f'  Diff vs IAU ref     : {j2000_diff:+.4f}°')
    print(f'  Diff vs truth data  : {j2000_vs_data:+.4f}°')

    # ── Section 3: ERD — analytical vs numerical ──────────────────────────────
    print('\n── 3. ERD (Earth Rate Deviation) ────────────────────────────────')

    mean_rate = 360.0 / (C['H'] / 16)

    # Numerical ERD from truth data: central difference where possible
    # Forward difference at start, backward at end
    erd_numerical = np.empty(n)
    erd_numerical[0]    = (peri_truth[1]  - peri_truth[0])    / ERD_STEP_YEARS
    erd_numerical[-1]   = (peri_truth[-1] - peri_truth[-2])   / ERD_STEP_YEARS
    erd_numerical[1:-1] = (peri_truth[2:] - peri_truth[:-2])  / (2 * ERD_STEP_YEARS)

    erd_analytical = np.array([calc_erd(int(y)) for y in years])

    # calc_erd returns only the harmonic deviation from the mean rate.
    # The numerical derivative of the unwrapped truth includes the mean rate.
    # Subtract the mean rate to get the deviation for a fair comparison.
    erd_numerical_deviation = erd_numerical - mean_rate

    erd_residuals = erd_numerical_deviation - erd_analytical
    erd_rmse = np.sqrt(np.mean(erd_residuals ** 2))
    erd_max      = np.max(np.abs(erd_residuals))
    erd_max_year = years[np.argmax(np.abs(erd_residuals))]

    print(f'  Mean precession rate: {mean_rate:.6f}°/yr  (360° / (H/16))')
    print(f'  ERD RMSE (anal vs num deviation): {erd_rmse:.6f}°/yr')
    print(f'  ERD max error                   : {erd_max:.6f}°/yr  (year {erd_max_year:.0f})')

    # Spot checks at key years
    spot_years = [2000, 1000, -10000, -100000, -301340]
    print(f'\n  Spot checks (ERD deviation from mean rate):')
    for yr in spot_years:
        if year_lo <= yr <= year_hi:
            idx = np.argmin(np.abs(years - yr))
            print(f'    {yr:>8}: analytical={erd_analytical[idx]:+.6f}°/yr  '
                  f'numerical={erd_numerical_deviation[idx]:+.6f}°/yr  '
                  f'diff={erd_residuals[idx]:+.6f}°/yr')
        else:
            val = calc_erd(yr)
            print(f'    {yr:>8}: analytical={val:+.6f}°/yr  (outside data range)')

    # ── Pass/fail summary ─────────────────────────────────────────────────────
    print('\n── Summary ──────────────────────────────────────────────────────')
    all_passed = True
    warned = False

    ok = rmse < PERI_RMSE_FAIL
    all_passed &= ok
    if rmse >= PERI_RMSE_WARN:
        warned = True
    check(
        f'Perihelion RMSE < {PERI_RMSE_FAIL}°',
        ok,
        f'actual {rmse:.6f}°{"  ⚠ above warn threshold" if rmse >= PERI_RMSE_WARN else ""}',
    )

    ok = max_err < PERI_MAX_FAIL
    all_passed &= ok
    check(f'Perihelion max error < {PERI_MAX_FAIL}°', ok, f'actual {max_err:.6f}°')

    ok = abs(j2000_diff) < J2000_FAIL
    all_passed &= ok
    check(f'J2000 accuracy vs IAU < {J2000_FAIL}°', ok, f'diff {j2000_diff:+.4f}°')

    ok = erd_rmse < ERD_RMSE_FAIL
    all_passed &= ok
    if erd_rmse >= ERD_RMSE_WARN:
        warned = True
    check(
        f'ERD analytical vs numerical RMSE < {ERD_RMSE_FAIL}°/yr',
        ok,
        f'actual {erd_rmse:.6f}°/yr{"  ⚠ above warn threshold" if erd_rmse >= ERD_RMSE_WARN else ""}',
    )

    print()
    if all_passed and not warned:
        print('  PASS — perihelion and ERD are within spec. Safe to proceed.')
        sys.exit(0)
    elif all_passed:
        print('  PASS with warnings — results are acceptable but review recommended.')
        sys.exit(0)
    else:
        print('  FAIL — re-run fit_perihelion_harmonics.py and update predictive_formula.py.')
        sys.exit(1)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
GREEDY FEATURE SELECTION — PHYSICAL-BEAT VERSION
=================================================

Finds additional candidate features that could further reduce RMSE on top
of the physical-beat feature matrix (predictive_formula_physical.py).

Method:
  1. Load training data + physical-beat coefficients
  2. Compute residuals from current physical-beat model
  3. Generate ~800 candidate features (pure H/N periods, ERD cross-products,
     period-pair beats, angle cross-terms, etc.)
  4. Rank candidates by |correlation| with residuals
  5. For top candidates: re-fit ridge regression with +1 term, measure
     the actual RMSE improvement
  6. Report top candidates per planet

Usage:
  python greedy_features_physical.py --planet venus [--top 30] [--refit 10]

The candidates reveal which additional frequencies (beyond physical beats)
are present in the residuals.
"""

import math
import sys
import argparse
from pathlib import Path
from typing import List, Tuple, Dict

import pandas as pd
import numpy as np

_LIB_PYTHON = str(Path(__file__).resolve().parent.parent.parent / 'lib' / 'python')
sys.path.insert(0, _LIB_PYTHON)

from predictive_formula_physical import (
    build_features_physical, feature_count,
    calc_earth_perihelion, calc_planet_perihelion, calc_erd,
    calc_obliquity, calc_eccentricity,
    time_offset,
)
from constants_scripts import (
    H, EARTH_OBLIQUITY_MEAN as EARTH_OBLIQ_MEAN,
    _ECCENTRICITY_DERIVED_MEAN as EARTH_ECC_MEAN,
    PERIHELION_ECLIPTIC_YEARS, LONGITUDE_PERIHELION,
)
from planet_beats import fundamental_periods, PERIOD_KEYS

PLANET_FLUCT_COLS = {
    'mercury': 'Mercury Precession Fluctuation',
    'venus':   'Venus Precession Fluctuation',
    'mars':    'Mars Precession Fluctuation',
    'jupiter': 'Jupiter Precession Fluctuation',
    'saturn':  'Saturn Precession Fluctuation',
    'uranus':  'Uranus Precession Fluctuation',
    'neptune': 'Neptune Precession Fluctuation',
}
PLANET_NAMES = {
    'mercury': 'Mercury', 'venus': 'Venus', 'mars': 'Mars',
    'jupiter': 'Jupiter', 'saturn': 'Saturn', 'uranus': 'Uranus', 'neptune': 'Neptune',
}


def load_physical_coefficients(planet_key):
    """Load physical-beat coefficients from *_coeffs_physical.py file."""
    import importlib
    mod_name = f'coefficients.{planet_key}_coeffs_physical'
    mod = importlib.import_module(mod_name)
    attr = f'{PLANET_NAMES[planet_key].upper()}_COEFFS_PHYSICAL'
    return np.array(getattr(mod, attr))


def load_training_data(excel_path):
    """Load Excel data, downsampled by stepYears for fit speed (same as train_precession)."""
    from load_constants import C as _C
    df = pd.read_excel(excel_path, sheet_name='Holistic_objects_PerihelionPlan')
    step = int(_C.get('stepYears', 23))
    df = df.iloc[::step].reset_index(drop=True)
    result = {}
    for planet_key, col_name in PLANET_FLUCT_COLS.items():
        rows = df[['Model Year', col_name]].dropna()
        years = [int(r) for r in rows['Model Year']]
        flucts = [float(v) for v in rows[col_name]]
        result[planet_key] = (years, flucts)
    return result


def build_feature_matrix(years, planet_key):
    """Build physical-beat feature matrix."""
    planet_name = PLANET_NAMES[planet_key]
    X = [build_features_physical(y, planet_name) for y in years]
    return np.array(X, dtype=np.float64)


def build_candidate_features(years, planet_key):
    """
    Generate candidate features beyond the physical-beat matrix.

    Focuses on:
      1. Pure H/N periods for n = 2..200 (many are not physical beats)
      2. Cross-products of periods with angle, ERD, ERD²
      3. Beat frequencies between physical periods (high harmonics)
      4. Triple-product combinations

    Returns list of (name, values_array) pairs.
    """
    planet_name = PLANET_NAMES[planet_key]
    p_period = abs(PERIHELION_ECLIPTIC_YEARS[planet_name])
    p_theta0 = LONGITUDE_PERIHELION[planet_name]

    candidates = []
    N = len(years)
    t_arr = np.array([time_offset(y) for y in years])

    theta_E_arr = np.array([calc_earth_perihelion(y) for y in years])
    theta_P_arr = np.array([calc_planet_perihelion(p_theta0, p_period, y) for y in years])
    erd_arr     = np.array([calc_erd(y) for y in years])
    obliq_arr   = np.array([calc_obliquity(y) for y in years]) - EARTH_OBLIQ_MEAN
    ecc_arr     = np.array([calc_eccentricity(y) for y in years]) - EARTH_ECC_MEAN

    diff_arr  = np.radians(theta_E_arr) - np.radians(theta_P_arr)
    sum_arr   = np.radians(theta_E_arr) + np.radians(theta_P_arr)
    erd2_arr  = erd_arr ** 2

    def add_periodic(label, period):
        """Add sin/cos + all cross-products for a period."""
        if period is None or abs(period) < 1:
            return
        ph = 2 * math.pi * t_arr / period
        s = np.sin(ph)
        c = np.cos(ph)
        # Simple
        candidates.append((f'sin(2πt/{label})', s))
        candidates.append((f'cos(2πt/{label})', c))
        # × angle
        candidates.append((f'sin(2πt/{label})×cos(δ)', s * np.cos(diff_arr)))
        candidates.append((f'sin(2πt/{label})×sin(δ)', s * np.sin(diff_arr)))
        candidates.append((f'cos(2πt/{label})×cos(δ)', c * np.cos(diff_arr)))
        candidates.append((f'cos(2πt/{label})×sin(δ)', c * np.sin(diff_arr)))
        # × 2δ
        candidates.append((f'sin(2πt/{label})×cos(2δ)', s * np.cos(2*diff_arr)))
        candidates.append((f'cos(2πt/{label})×cos(2δ)', c * np.cos(2*diff_arr)))
        candidates.append((f'sin(2πt/{label})×sin(2δ)', s * np.sin(2*diff_arr)))
        candidates.append((f'cos(2πt/{label})×sin(2δ)', c * np.sin(2*diff_arr)))
        # × ERD
        candidates.append((f'ERD×sin(2πt/{label})', erd_arr * s))
        candidates.append((f'ERD×cos(2πt/{label})', erd_arr * c))
        candidates.append((f'ERD²×sin(2πt/{label})', erd2_arr * s))
        candidates.append((f'ERD²×cos(2πt/{label})', erd2_arr * c))

    # -----------------------------------------------------------------------
    # 1. Pure H/N periods (many may not be physical beats)
    # -----------------------------------------------------------------------
    for n in list(range(2, 200)) + [220, 250, 272, 300, 350, 400, 500]:
        add_periodic(f'H/{n}', H / n)

    # -----------------------------------------------------------------------
    # 2. Planet-specific physical period higher harmonics (n=3, 5, 6, 7)
    #    (the base matrix has n=1, 2, 4, 8)
    # -----------------------------------------------------------------------
    pp = fundamental_periods(planet_name)
    for k in PERIOD_KEYS:
        period = pp['T_' + k]
        if period is None:
            continue
        for n in [3, 5, 6, 7, 12, 16]:
            add_periodic(f'T_{k}/{n}', period / n)

    return candidates


def ridge_fit_extra(X, y, extra_col, alpha=0.01):
    Xaug = np.column_stack([X, extra_col])
    n, p = Xaug.shape
    A = Xaug.T @ Xaug + alpha * np.eye(p)
    b = Xaug.T @ y
    w = np.linalg.solve(A, b)
    pred = Xaug @ w
    res = y - pred
    rmse = float(np.sqrt(np.mean(res**2)))
    ss_tot = float(np.sum((y - y.mean())**2))
    r2 = 1.0 - float(np.sum(res**2)) / ss_tot
    return rmse, r2


def compute_current_rmse(X, y, coeffs):
    pred = X @ coeffs
    res = y - pred
    rmse = float(np.sqrt(np.mean(res**2)))
    ss_tot = float(np.sum((y - y.mean())**2))
    r2 = 1.0 - float(np.sum(res**2)) / ss_tot
    return rmse, r2, res


def analyse_planet(planet_key, years, flucts, top_n=30, refit_n=10):
    planet_name = PLANET_NAMES[planet_key]
    print(f"\n{'='*70}")
    print(f"  {planet_name.upper()}  ({len(years)} data points)")
    print(f"{'='*70}")

    y = np.array(flucts, dtype=np.float64)

    print("  Building physical-beat feature matrix...", end='', flush=True)
    X = build_feature_matrix(years, planet_key)
    print(f" done. Shape: {X.shape}")

    print("  Loading coefficients...", end='', flush=True)
    coeffs = load_physical_coefficients(planet_key)
    rmse0, r2_0, residuals = compute_current_rmse(X, y, coeffs)
    print(f" done.")
    print(f"  Current model: RMSE={rmse0:.4f} \"/cy  R²={r2_0:.6f}")
    print(f"  Residual std:  {residuals.std():.4f} \"/cy")

    print(f"  Generating candidate features...", end='', flush=True)
    candidates = build_candidate_features(years, planet_key)
    print(f" {len(candidates)} candidates.")

    corrs = []
    for name, vals in candidates:
        v = vals.astype(np.float64)
        std = v.std()
        if std < 1e-12:
            corrs.append((name, 0.0, v))
            continue
        corr = float(np.corrcoef(residuals, v)[0, 1])
        corrs.append((name, corr, v))

    corrs.sort(key=lambda x: abs(x[1]), reverse=True)

    print(f"\n  Top {top_n} candidates by |correlation| with residuals:")
    print(f"  {'Rank':<5} {'|Corr|':>8}  {'Corr':>8}  Feature")
    print(f"  {'-'*65}")
    for i, (name, corr, _) in enumerate(corrs[:top_n]):
        print(f"  {i+1:<5} {abs(corr):>8.4f}  {corr:>+8.4f}  {name}")

    if refit_n > 0:
        print(f"\n  Refitting with each of top {refit_n} candidates (+1 term ridge):")
        print(f"  {'Rank':<5} {'RMSE_new':>10} {'ΔRMSE':>10} {'R²_new':>10}  Feature")
        print(f"  {'-'*70}")
        for i, (name, corr, vals) in enumerate(corrs[:refit_n]):
            v = vals.astype(np.float64)
            rmse_new, r2_new = ridge_fit_extra(X, y, v)
            delta = rmse_new - rmse0
            print(f"  {i+1:<5} {rmse_new:>10.4f} {delta:>+10.4f} {r2_new:>10.6f}  {name}")

    return corrs[:top_n]


def main():
    parser = argparse.ArgumentParser(description='Greedy feature selection (physical-beat version)')
    parser.add_argument('--top', type=int, default=30)
    parser.add_argument('--refit', type=int, default=10)
    parser.add_argument('--planet', type=str, default=None, choices=list(PLANET_FLUCT_COLS.keys()))
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    excel_path = repo_root / 'data' / '01-holistic-year-objects-data.xlsx'

    print("Loading training data from Excel...")
    data = load_training_data(str(excel_path))

    planets_to_run = [args.planet] if args.planet else list(PLANET_FLUCT_COLS.keys())
    for planet_key in planets_to_run:
        if planet_key not in data:
            continue
        years, flucts = data[planet_key]
        analyse_planet(planet_key, years, flucts, top_n=args.top, refit_n=args.refit)


if __name__ == '__main__':
    main()

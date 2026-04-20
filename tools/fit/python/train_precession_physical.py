#!/usr/bin/env python3
"""
PHYSICAL-BEAT TRAINING SCRIPT (v2)
===================================

Trains precession coefficients for planets using the physical-beat feature
matrix (predictive_formula_physical.py). All feature frequencies are derived
from model-parameters.json — no hardcoded H_DIV_X constants.

When model-parameters.json changes, the feature VALUES auto-update. You must
re-run this script to retrain coefficients (coefficients are the one thing
that does NOT auto-update).

Training target: Observed Excel fluctuations
Method: Ridge regression (α=0.01)
Output: Coefficient files per planet

Usage:
    cd tools/fit/python

    # Train all 7 planets (dry run):
    python train_precession_physical.py

    # Train all 7 planets and update fitted-coefficients.json:
    python train_precession_physical.py --write

    # Train SINGLE planet (much faster):
    python train_precession_physical.py --planet venus
    python train_precession_physical.py --planet mars --write

    # Valid planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

Each planet's coefficient count differs (frozen axials give fewer features).
"""

import argparse
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

_LIB_PYTHON = str(Path(__file__).resolve().parent.parent.parent / 'lib' / 'python')
sys.path.insert(0, _LIB_PYTHON)

from predictive_formula_physical import build_features_physical, feature_count
from load_constants import C


PLANETS_FLUCT_COLS = {
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


def load_excel_data(excel_path):
    df = pd.read_excel(excel_path, sheet_name='Holistic_objects_PerihelionPlan')
    step = int(C.get('stepYears', 23))
    df = df.iloc[::step].reset_index(drop=True)
    print(f'  Downsampled by {step}: {len(df)} rows')

    data = {key: [] for key in PLANETS_FLUCT_COLS}
    for _, row in df.iterrows():
        try:
            year = int(row['Model Year'])
        except (ValueError, KeyError):
            continue
        for planet_key, col_name in PLANETS_FLUCT_COLS.items():
            try:
                value = float(row[col_name])
                data[planet_key].append((year, value))
            except (ValueError, KeyError):
                pass
    return data


def solve_ridge(X, y, alpha=0.01):
    n_features = X.shape[1]
    XtX = X.T @ X
    XtX[np.diag_indices_from(XtX)] += alpha
    Xty = X.T @ y
    L = np.linalg.cholesky(XtX)
    z = np.linalg.solve(L, Xty)
    w = np.linalg.solve(L.T, z)
    return w


def train_planet(years, fluctuations, planet_name, alpha=0.01):
    X_list = [build_features_physical(y, planet_name) for y in years]
    X = np.array(X_list)
    y = np.array(fluctuations)
    w = solve_ridge(X, y, alpha)
    predictions = X @ w
    residuals = y - predictions
    n = len(years)
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    rmse = math.sqrt(ss_res / n)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    return w.tolist(), rmse, float(r2)


def write_coefficients(planet_key, coefficients, rmse, r2, output_dir):
    planet_name = PLANET_NAMES[planet_key]
    n_terms = len(coefficients)
    filename = output_dir / f"{planet_key}_coeffs_physical.py"
    with open(filename, 'w') as f:
        f.write(f'"""\n')
        f.write(f'{planet_name} Coefficients (Physical-Beat {n_terms}-term system)\n')
        f.write(f'RMSE: {rmse:.4f} arcsec/century\n')
        f.write(f'R²: {r2:.6f}\n')
        f.write(f'"""\n\n')
        f.write(f'# {planet_name.upper()} PHYSICAL-BEAT COEFFICIENTS ({n_terms} terms)\n')
        f.write(f'{planet_name.upper()}_COEFFS_PHYSICAL = [\n')
        for i, coef in enumerate(coefficients):
            f.write(f'    {coef:>18.10f},  # Term {i}\n')
        f.write(']\n')
    return filename


def main():
    parser = argparse.ArgumentParser(
        description='Train precession coefficients using physical-beat features.',
    )
    parser.add_argument('--planet', type=str, default=None, choices=list(PLANETS_FLUCT_COLS.keys()),
                        help='Train only one planet (default: all 7)')
    parser.add_argument('--write', action='store_true', help='Write to fitted-coefficients.json')
    args = parser.parse_args()

    if args.planet:
        planets_to_train = {args.planet: PLANET_NAMES[args.planet]}
        mode_label = f"SINGLE PLANET ({PLANET_NAMES[args.planet]})"
    else:
        planets_to_train = PLANET_NAMES
        mode_label = "ALL 7 PLANETS"

    print("=" * 70)
    print(f"PHYSICAL-BEAT PRECESSION TRAINING — {mode_label}")
    print("=" * 70)
    for p in planets_to_train:
        n = feature_count(PLANET_NAMES[p])
        print(f"  {PLANET_NAMES[p]:<10} feature count: {n}")
    print(f"\nRegularization: Ridge regression (α=0.01)")
    print()

    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    excel_path = repo_root / 'data' / '01-holistic-year-objects-data.xlsx'
    output_dir = repo_root / 'tools' / 'lib' / 'python' / 'coefficients'

    print("Loading observed data from Excel...")
    data = load_excel_data(str(excel_path))

    print("\nData points per planet:")
    for planet_key in planets_to_train:
        if planet_key in data:
            print(f"  {PLANET_NAMES[planet_key]:<10}: {len(data[planet_key]):>4} points")

    print()
    print("-" * 70)
    print(f"{'Planet':<10} {'RMSE':>12} {'R²':>12} {'Features':>10} {'Output File'}")
    print("-" * 70)

    results = {}
    for planet_key, planet_name in planets_to_train.items():
        if planet_key not in data or not data[planet_key]:
            print(f"{planet_name:<10} {'No data':<12}")
            continue
        years = [pt[0] for pt in data[planet_key]]
        fluctuations = [pt[1] for pt in data[planet_key]]
        coefficients, rmse, r2 = train_planet(years, fluctuations, planet_name)
        output_file = write_coefficients(planet_key, coefficients, rmse, r2, output_dir)
        n_terms = len(coefficients)
        results[planet_key] = {
            'coefficients': coefficients, 'rmse': rmse, 'r2': r2,
            'output_file': output_file.name, 'n_terms': n_terms,
        }
        print(f"{planet_name:<10} {rmse:>12.4f} {r2:>12.6f} {n_terms:>10} {output_file.name}")

    print("-" * 70)
    print()

    # Sample predictions
    print("Sample predictions vs observed (year 2000):")
    print(f"{'Planet':<10} {'Year':>6} {'Predicted':>12} {'Observed':>12} {'Diff':>12}")
    print("-" * 56)
    for planet_key in planets_to_train:
        if planet_key not in results:
            continue
        closest_year, closest_fluct, min_diff = None, None, float('inf')
        for y, fluct in data[planet_key]:
            if abs(y - 2000) < min_diff:
                min_diff = abs(y - 2000); closest_year = y; closest_fluct = fluct
        if closest_year is not None:
            features = build_features_physical(closest_year, PLANET_NAMES[planet_key])
            predicted = sum(c * f for c, f in zip(results[planet_key]['coefficients'], features))
            diff = predicted - closest_fluct
            print(f"{PLANET_NAMES[planet_key]:<10} {closest_year:>6} {predicted:>12.4f} {closest_fluct:>12.4f} {diff:>+12.4f}")

    if args.write:
        import json
        json_path = repo_root / 'public' / 'input' / 'fitted-coefficients.json'
        fc = json.loads(json_path.read_text())
        coeffs_dict = fc.get('PREDICT_COEFFS_PHYSICAL', {}) or {}
        for planet_key, res in results.items():
            coeffs_dict[planet_key] = [float(c) for c in res['coefficients']]
        fc['PREDICT_COEFFS_PHYSICAL'] = coeffs_dict
        json_path.write_text(json.dumps(fc, indent=2) + '\n')
        print(f'\n✓ Written PREDICT_COEFFS_PHYSICAL to fitted-coefficients.json')
    else:
        print('\n  (dry run — add --write to update fitted-coefficients.json)')


if __name__ == "__main__":
    main()

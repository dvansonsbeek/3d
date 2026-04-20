#!/usr/bin/env python3
"""
UNIFIED TRAINING SCRIPT
========================

Trains precession coefficients for all 7 planets (or a single planet) using
the unified feature matrix. All planets use the SAME feature structure.

Training target: Observed Excel fluctuations
Method: Ridge regression (α=0.01)
Output: Coefficient files for each planet

Usage:
    cd tools/fit/python

    # Train all 7 planets (dry run — does NOT update fitted-coefficients.json):
    python train_precession.py

    # Train all 7 planets and update fitted-coefficients.json:
    python train_precession.py --write

    # Train a SINGLE planet (much faster — useful for iteration):
    python train_precession.py --planet venus
    python train_precession.py --planet mars --write

    # Valid planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

When --planet is used with --write, only that planet's entry in
fitted-coefficients.json is replaced; other planets' coefficients are preserved.

Author: Holistic Universe Model
"""

import argparse
import math
import os
import sys
from pathlib import Path
from typing import List, Tuple, Dict

import numpy as np
import pandas as pd

# Add tools/lib/python/ to path for shared formula modules
_LIB_PYTHON = str(Path(__file__).resolve().parent.parent.parent / 'lib' / 'python')
sys.path.insert(0, _LIB_PYTHON)

# Import unified feature builder
from predictive_formula import (
    build_features, PLANETS, H, J2000,
    calc_earth_perihelion, calc_erd
)
from load_constants import C


PLANET_FLUCTUATION_COLS = {
    'mercury': 'Mercury Precession Fluctuation',
    'venus': 'Venus Precession Fluctuation',
    'mars': 'Mars Precession Fluctuation',
    'jupiter': 'Jupiter Precession Fluctuation',
    'saturn': 'Saturn Precession Fluctuation',
    'uranus': 'Uranus Precession Fluctuation',
    'neptune': 'Neptune Precession Fluctuation',
}


def load_excel_data(excel_path: str) -> Dict[str, List[Tuple[int, float]]]:
    """
    Load observed fluctuations from Excel file.

    Returns dict: planet_key -> [(year, fluctuation), ...]
    """
    df = pd.read_excel(excel_path, sheet_name='Holistic_objects_PerihelionPlan')

    # Downsample by stepYears for fitting efficiency
    step = int(C.get('stepYears', 23))
    df = df.iloc[::step].reset_index(drop=True)
    print(f'  Downsampled by {step}: {len(df)} rows')

    data = {key: [] for key in PLANET_FLUCTUATION_COLS}

    for _, row in df.iterrows():
        try:
            year = int(row['Model Year'])
        except (ValueError, KeyError):
            continue

        for planet_key, col_name in PLANET_FLUCTUATION_COLS.items():
            try:
                value = float(row[col_name])
                data[planet_key].append((year, value))
            except (ValueError, KeyError):
                pass

    return data


def solve_ridge(X: np.ndarray, y: np.ndarray, alpha: float = 0.01) -> np.ndarray:
    """
    Solve ridge regression: minimize ||Xw - y||² + α||w||²

    Solution: w = (X.T @ X + α*I)^-1 @ X.T @ y

    Uses numpy's Cholesky decomposition for numerical stability.
    """
    n_features = X.shape[1]

    # Compute X.T @ X + α*I
    XtX = X.T @ X
    XtX[np.diag_indices_from(XtX)] += alpha

    # Compute X.T @ y
    Xty = X.T @ y

    # Solve using Cholesky: (XtX) @ w = Xty
    L = np.linalg.cholesky(XtX)
    z = np.linalg.solve(L, Xty)
    w = np.linalg.solve(L.T, z)

    return w


def train_planet(
    years: List[int],
    fluctuations: List[float],
    planet_period: float,
    planet_theta0: float,
    alpha: float = 0.01
) -> Tuple[List[float], float, float]:
    """
    Train coefficients for a single planet using ridge regression.

    Returns:
        coefficients: Trained coefficient list
        rmse: Root mean square error
        r2: R² score
    """
    n_samples = len(years)

    # Build feature matrix
    X_list = []
    for year in years:
        features = build_features(year, planet_period, planet_theta0)
        X_list.append(features)

    X = np.array(X_list)
    y = np.array(fluctuations)

    # Solve ridge regression
    w = solve_ridge(X, y, alpha)

    # Calculate metrics
    predictions = X @ w
    residuals = y - predictions

    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)

    rmse = math.sqrt(ss_res / n_samples)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return w.tolist(), rmse, float(r2)


def write_coefficients(
    planet_key: str,
    coefficients: List[float],
    rmse: float,
    r2: float,
    output_dir: Path
):
    """Write coefficients to a Python file."""
    planet_name = PLANETS[planet_key]['name'].upper()
    n_terms = len(coefficients)

    filename = output_dir / f"{planet_key}_coeffs_unified.py"

    with open(filename, 'w') as f:
        f.write(f'"""\n')
        f.write(f'{PLANETS[planet_key]["name"]} Coefficients (Unified {n_terms}-term system)\n')
        f.write(f'RMSE: {rmse:.4f} arcsec/century\n')
        f.write(f'R²: {r2:.6f}\n')
        f.write(f'"""\n\n')
        f.write(f'# {planet_name} COEFFICIENTS ({n_terms} terms)\n')
        f.write(f'{planet_name}_COEFFS = [\n')

        for i, coef in enumerate(coefficients):
            f.write(f'    {coef:>18.10f},  # Term {i}\n')

        f.write(']\n')

    return filename


def main():
    """Train planets with unified feature matrix (all or single via --planet)."""
    # ─── Parse CLI arguments ──────────────────────────────────────────────
    parser = argparse.ArgumentParser(
        description='Train precession coefficients (all planets or a single one).',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='Examples:\n'
               '  python train_precession.py                         # all 7 planets, dry run\n'
               '  python train_precession.py --write                 # all 7, update JSON\n'
               '  python train_precession.py --planet venus          # venus only, dry run\n'
               '  python train_precession.py --planet mars --write   # mars only, update JSON\n'
    )
    parser.add_argument('--planet', type=str, default=None,
                        choices=list(PLANETS.keys()),
                        help='Train only one planet (default: all 7)')
    parser.add_argument('--write', action='store_true',
                        help='Write results to fitted-coefficients.json')
    args = parser.parse_args()

    # Determine which planets to train
    if args.planet:
        planets_to_train = {args.planet: PLANETS[args.planet]}
        mode_label = f"SINGLE PLANET ({PLANETS[args.planet]['name']})"
    else:
        planets_to_train = PLANETS
        mode_label = "ALL 7 PLANETS"

    print("=" * 70)
    print(f"UNIFIED PRECESSION TRAINING — {mode_label}")
    print("=" * 70)
    test_feat = build_features(2000, list(PLANETS.values())[0]['period'], list(PLANETS.values())[0]['theta0'])
    n_terms = len(test_feat)
    print(f"\nFeature matrix: {n_terms} terms (same for all planets)")
    print(f"Regularization: Ridge regression (α=0.01)")

    # Verify Earth perihelion at J2000
    earth_peri_j2000 = calc_earth_perihelion(2000)
    print(f"Earth perihelion at J2000: {earth_peri_j2000:.6f}°")
    print()

    # Paths
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    excel_path = repo_root / 'data' / '01-holistic-year-objects-data.xlsx'
    output_dir = repo_root / 'tools' / 'lib' / 'python' / 'coefficients'

    # Load data
    print("Loading observed data from Excel...")
    data = load_excel_data(str(excel_path))

    # Show data counts
    print("\nData points per planet:")
    for planet_key in planets_to_train:
        if planet_key in data:
            print(f"  {PLANETS[planet_key]['name']:<10}: {len(data[planet_key]):>4} points")

    print()
    print("-" * 70)
    print(f"{'Planet':<10} {'RMSE':>12} {'R²':>12} {'Output File'}")
    print("-" * 70)

    # Train each planet
    results = {}
    for planet_key, planet_info in planets_to_train.items():
        if planet_key not in data or not data[planet_key]:
            print(f"{planet_info['name']:<10} {'No data':<12}")
            continue

        # Extract years and fluctuations
        years = [pt[0] for pt in data[planet_key]]
        fluctuations = [pt[1] for pt in data[planet_key]]

        # Train
        coefficients, rmse, r2 = train_planet(
            years,
            fluctuations,
            planet_info['period'],
            planet_info['theta0']
        )

        # Save coefficients
        output_file = write_coefficients(
            planet_key,
            coefficients,
            rmse,
            r2,
            output_dir
        )

        results[planet_key] = {
            'coefficients': coefficients,
            'rmse': rmse,
            'r2': r2,
            'output_file': output_file.name
        }

        print(f"{planet_info['name']:<10} {rmse:>12.4f} {r2:>12.6f} {output_file.name}")

    print("-" * 70)
    print()

    # Show sample predictions at J2000
    print("Sample predictions vs observed (year 2000):")
    print(f"{'Planet':<10} {'Year':>6} {'Predicted':>12} {'Observed':>12} {'Diff':>12}")
    print("-" * 56)

    for planet_key in planets_to_train:
        if planet_key not in results:
            continue

        # Find observed value closest to year 2000
        closest_year = None
        closest_fluct = None
        min_diff = float('inf')

        for year, fluct in data[planet_key]:
            if abs(year - 2000) < min_diff:
                min_diff = abs(year - 2000)
                closest_year = year
                closest_fluct = fluct

        if closest_year is not None:
            # Predict
            features = build_features(
                closest_year,
                PLANETS[planet_key]['period'],
                PLANETS[planet_key]['theta0']
            )
            predicted = sum(c * f for c, f in zip(results[planet_key]['coefficients'], features))
            diff = predicted - closest_fluct
            print(f"{PLANETS[planet_key]['name']:<10} {closest_year:>6} {predicted:>12.4f} {closest_fluct:>12.4f} {diff:>+12.4f}")

    print()
    print("Training complete. Coefficient files written to tools/lib/python/coefficients/ directory.")

    # ─── Write to fitted-coefficients.json if --write flag is present ───
    if args.write:
        import json
        json_path = Path(__file__).resolve().parent.parent.parent.parent / 'public' / 'input' / 'fitted-coefficients.json'
        fc = json.loads(json_path.read_text())
        # Merge into existing coeffs (preserves other planets when training single)
        coeffs_dict = fc.get('PREDICT_COEFFS_UNIFIED', {}) or {}
        for planet_key, res in results.items():
            coeffs_dict[planet_key] = [float(c) for c in res['coefficients']]
        fc['PREDICT_COEFFS_UNIFIED'] = coeffs_dict
        json_path.write_text(json.dumps(fc, indent=2) + '\n')
        trained_list = ', '.join(PLANETS[k]['name'] for k in results.keys())
        print(f'\n✓ Written to fitted-coefficients.json (trained: {trained_list})')
        if args.planet:
            other_planets = [PLANETS[k]['name'] for k in PLANETS if k not in results]
            if other_planets:
                print(f'  Other planets preserved: {", ".join(other_planets)}')
    else:
        print('\n  (dry run — add --write to update fitted-coefficients.json)')


if __name__ == "__main__":
    main()

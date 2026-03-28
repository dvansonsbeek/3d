#!/usr/bin/env python3
"""
UNIFIED TRAINING SCRIPT
========================

Trains precession coefficients for all 7 planets using the unified feature
matrix. All planets use the SAME feature structure.

Training target: Observed Excel fluctuations
Method: Ridge regression (α=0.01)
Output: Coefficient files for each planet

Usage:
    cd tools/fit/python
    python train_precession.py

Author: Holistic Universe Model
"""

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
    step = 20  # matches stepYears in model-parameters.json
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
    """Train all planets with unified feature matrix."""
    print("=" * 70)
    print("UNIFIED PRECESSION TRAINING")
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
    for planet_key in PLANETS:
        if planet_key in data:
            print(f"  {PLANETS[planet_key]['name']:<10}: {len(data[planet_key]):>4} points")

    print()
    print("-" * 70)
    print(f"{'Planet':<10} {'RMSE':>12} {'R²':>12} {'Output File'}")
    print("-" * 70)

    # Train each planet
    results = {}
    for planet_key, planet_info in PLANETS.items():
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

    for planet_key in PLANETS:
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
    if '--write' in sys.argv:
        import json
        json_path = Path(__file__).resolve().parent.parent.parent.parent / 'public' / 'input' / 'fitted-coefficients.json'
        fc = json.loads(json_path.read_text())
        coeffs_dict = {}
        for planet_key, res in results.items():
            coeffs_dict[planet_key] = [float(c) for c in res['coefficients']]
        fc['PREDICT_COEFFS_UNIFIED'] = coeffs_dict
        json_path.write_text(json.dumps(fc, indent=2) + '\n')
        print(f'\n✓ Written PREDICT_COEFFS_UNIFIED to fitted-coefficients.json')
    else:
        print('\n  (dry run — add --write to update fitted-coefficients.json)')


if __name__ == "__main__":
    main()

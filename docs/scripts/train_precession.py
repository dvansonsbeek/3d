#!/usr/bin/env python3
"""
UNIFIED TRAINING SCRIPT
========================

Trains precession coefficients for all 7 planets using the unified 273-term
feature matrix. All planets use the SAME feature structure.

Training target: Observed CSV fluctuations
Method: Ridge regression (α=0.01)
Output: Coefficient files for each planet

Author: Holistic Universe Model
"""

import math
import os
from pathlib import Path
from typing import List, Tuple, Dict

import pandas as pd

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
    df = pd.read_excel(excel_path, sheet_name='Perihelion Planets')

    data = {key: [] for key in PLANET_FLUCTUATION_COLS}

    for _, row in df.iterrows():
        try:
            year = int(row['Year'])
        except (ValueError, KeyError):
            continue

        for planet_key, col_name in PLANET_FLUCTUATION_COLS.items():
            try:
                value = float(row[col_name])
                data[planet_key].append((year, value))
            except (ValueError, KeyError):
                pass

    return data


# ============================================================================
# Pure Python Linear Algebra (no numpy)
# ============================================================================

def matrix_transpose(A: List[List[float]]) -> List[List[float]]:
    """Transpose a matrix."""
    rows = len(A)
    cols = len(A[0])
    return [[A[i][j] for i in range(rows)] for j in range(cols)]


def matrix_multiply(A: List[List[float]], B: List[List[float]]) -> List[List[float]]:
    """Multiply two matrices A @ B."""
    rows_a = len(A)
    cols_a = len(A[0])
    cols_b = len(B[0])

    result = [[0.0] * cols_b for _ in range(rows_a)]

    for i in range(rows_a):
        for j in range(cols_b):
            for k in range(cols_a):
                result[i][j] += A[i][k] * B[k][j]

    return result


def matrix_vector_multiply(A: List[List[float]], v: List[float]) -> List[float]:
    """Multiply matrix A by vector v."""
    rows = len(A)
    cols = len(A[0])
    result = [0.0] * rows

    for i in range(rows):
        for j in range(cols):
            result[i] += A[i][j] * v[j]

    return result


def vector_dot(a: List[float], b: List[float]) -> float:
    """Dot product of two vectors."""
    return sum(ai * bi for ai, bi in zip(a, b))


def cholesky_decomposition(A: List[List[float]]) -> List[List[float]]:
    """
    Cholesky decomposition: A = L @ L.T
    Returns lower triangular matrix L.
    A must be symmetric positive definite.
    """
    n = len(A)
    L = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))

            if i == j:
                val = A[i][i] - s
                if val <= 0:
                    # Add small regularization if needed
                    val = 1e-10
                L[i][j] = math.sqrt(val)
            else:
                L[i][j] = (A[i][j] - s) / L[j][j] if L[j][j] != 0 else 0

    return L


def forward_substitution(L: List[List[float]], b: List[float]) -> List[float]:
    """Solve L @ x = b for x, where L is lower triangular."""
    n = len(b)
    x = [0.0] * n

    for i in range(n):
        s = sum(L[i][j] * x[j] for j in range(i))
        x[i] = (b[i] - s) / L[i][i] if L[i][i] != 0 else 0

    return x


def backward_substitution(U: List[List[float]], b: List[float]) -> List[float]:
    """Solve U @ x = b for x, where U is upper triangular."""
    n = len(b)
    x = [0.0] * n

    for i in range(n - 1, -1, -1):
        s = sum(U[i][j] * x[j] for j in range(i + 1, n))
        x[i] = (b[i] - s) / U[i][i] if U[i][i] != 0 else 0

    return x


def solve_ridge(X: List[List[float]], y: List[float], alpha: float = 0.01) -> List[float]:
    """
    Solve ridge regression: minimize ||Xw - y||² + α||w||²

    Solution: w = (X.T @ X + α*I)^-1 @ X.T @ y

    Uses Cholesky decomposition for numerical stability.
    """
    n_samples = len(X)
    n_features = len(X[0])

    # Compute X.T @ X
    Xt = matrix_transpose(X)
    XtX = matrix_multiply(Xt, X)

    # Add regularization: XtX + α*I
    for i in range(n_features):
        XtX[i][i] += alpha

    # Compute X.T @ y
    Xty = [sum(Xt[i][j] * y[j] for j in range(n_samples)) for i in range(n_features)]

    # Solve using Cholesky: (XtX) @ w = Xty
    # XtX = L @ L.T
    # L @ z = Xty (forward substitution)
    # L.T @ w = z (backward substitution)
    L = cholesky_decomposition(XtX)
    Lt = matrix_transpose(L)

    z = forward_substitution(L, Xty)
    w = backward_substitution(Lt, z)

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
    X = []
    y = list(fluctuations)

    for year in years:
        features = build_features(year, planet_period, planet_theta0)
        X.append(features)

    # Solve ridge regression
    coefficients = solve_ridge(X, y, alpha)

    # Calculate metrics
    predictions = [sum(c * f for c, f in zip(coefficients, row)) for row in X]
    residuals = [yi - pi for yi, pi in zip(y, predictions)]

    ss_res = sum(r * r for r in residuals)
    y_mean = sum(y) / len(y)
    ss_tot = sum((yi - y_mean) ** 2 for yi in y)

    rmse = math.sqrt(ss_res / n_samples)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return coefficients, rmse, r2


def write_coefficients(
    planet_key: str,
    coefficients: List[float],
    rmse: float,
    r2: float,
    output_dir: Path
):
    """Write coefficients to a Python file."""
    planet_name = PLANETS[planet_key]['name'].upper()

    filename = output_dir / f"{planet_key}_coeffs_unified.py"

    with open(filename, 'w') as f:
        f.write(f'"""\n')
        f.write(f'{PLANETS[planet_key]["name"]} Coefficients (Unified 273-term system)\n')
        f.write(f'RMSE: {rmse:.4f} arcsec/century\n')
        f.write(f'R²: {r2:.6f}\n')
        f.write(f'"""\n\n')
        f.write(f'# {planet_name} COEFFICIENTS (273 terms)\n')
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
    print(f"\nFeature matrix: 273 terms (same for all planets)")
    print(f"Regularization: Ridge regression (α=0.01)")
    print()

    # Paths
    script_dir = Path(__file__).parent
    excel_path = script_dir / '..' / '98-holistic-year-objects-data.xlsx'
    output_dir = script_dir

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

    # Show sample predictions
    print("Sample predictions vs observed (around year 2000):")
    print(f"{'Planet':<10} {'Predicted':>12} {'Observed':>12} {'Diff':>12}")
    print("-" * 50)

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
            print(f"{PLANETS[planet_key]['name']:<10} {predicted:>12.4f} {closest_fluct:>12.4f} {diff:>+12.4f}")

    print()
    print("Training complete. Coefficient files written to docs/ directory.")
    print("\nTo use these coefficients:")
    print("  from unified_precession import predict_fluctuation")
    print("  from mercury_coeffs_unified import MERCURY_COEFFS")
    print("  fluct = predict_fluctuation(2024, 'mercury', MERCURY_COEFFS)")


if __name__ == "__main__":
    main()

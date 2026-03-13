#!/usr/bin/env python3
"""
OBSERVED FORMULA TRAINING SCRIPT
==================================

Trains precession coefficients for all 7 planets using the OBSERVED feature
matrix (225 terms for most planets, 328 terms for Venus).

Unlike train_precession.py which uses the predictive 429-term feature matrix,
this script uses the observed formula's feature builders that take actual
Excel-observed values (perihelion, ERD, obliquity, eccentricity) as inputs.

Training target: Observed Excel fluctuations
Method: Least-squares via SVD (numpy.linalg.lstsq)
Output: Coefficient files for each planet (*_coeffs.py)

Author: Holistic Universe Model
"""

import math
import numpy as np
from pathlib import Path
from typing import List, Dict

# Import observed feature builders and constants
from observed_formula import (
    build_feature_matrix, build_feature_matrix_venus,
    PLANETS, H, ANCHOR, EXCEL_COLS,
    EARTH_ECC_MEAN, load_excel_data,
)


def load_training_data() -> List[Dict]:
    """
    Load all observed data from Excel file.

    Returns list of row dicts with year, earth params, planet perihelions,
    and planet fluctuations.
    """
    data = load_excel_data()

    rows = []
    for year, d in data.items():
        entry = {
            'year': year,
            'theta_E': d['theta_E'],
            'erd': d['erd'],
            'eccentricity': d['eccentricity'],
            'obliquity': d['obliquity'],
        }
        for planet_key in PLANETS:
            entry[f'{planet_key}_perihelion'] = d[f'{planet_key}_perihelion']
            entry[f'{planet_key}_fluctuation'] = d[f'{planet_key}_actual']
        rows.append(entry)

    return rows


def train_planet(
    planet_key: str,
    rows: List[Dict],
):
    """
    Train coefficients for a single planet using observed feature matrix.

    Uses SVD-based least-squares (numpy.linalg.lstsq) for numerical stability
    with the high-dimensional feature matrix.

    Returns:
        coefficients (list), rmse (float), r2 (float), n_terms (int)
    """
    planet_info = PLANETS[planet_key]
    planet_period = planet_info['period']
    peri_key = f'{planet_key}_perihelion'
    fluct_key = f'{planet_key}_fluctuation'

    X_list = []
    y_list = []

    for row in rows:
        year = row['year']
        theta_E = row['theta_E']
        erd = row['erd']
        planet_perihelion = row[peri_key]
        obliquity = row['obliquity']
        eccentricity = row['eccentricity']
        fluctuation = row[fluct_key]

        if planet_key == 'venus':
            features = build_feature_matrix_venus(
                year, theta_E, erd, planet_period,
                planet_perihelion, obliquity, eccentricity
            )
        else:
            features = build_feature_matrix(
                year, theta_E, erd, planet_period,
                planet_perihelion, obliquity, eccentricity
            )

        X_list.append(features)
        y_list.append(fluctuation)

    X = np.array(X_list)
    y = np.array(y_list)

    n_samples, n_terms = X.shape

    # Solve using SVD-based least-squares (handles near-singular matrices)
    coefficients, residuals, rank, sv = np.linalg.lstsq(X, y, rcond=None)

    # Calculate metrics
    predictions = X @ coefficients
    res = y - predictions

    ss_res = np.sum(res ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)

    rmse = np.sqrt(ss_res / n_samples)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return coefficients.tolist(), float(rmse), float(r2), n_terms


def write_coefficients(
    planet_key: str,
    coefficients: list,
    rmse: float,
    r2: float,
    n_terms: int,
    output_dir: Path
) -> Path:
    """Write coefficients to a Python file."""
    planet_name = PLANETS[planet_key]['name'].upper()

    filename = output_dir / f"{planet_key}_coeffs.py"

    with open(filename, 'w') as f:
        f.write(f'"""\n')
        f.write(f'{PLANETS[planet_key]["name"]} Observed Coefficients ({n_terms}-term system)\n')
        f.write(f'RMSE: {rmse:.4f} arcsec/century\n')
        f.write(f'R²: {r2:.6f}\n')
        f.write(f'EARTH_ECC_MEAN: {EARTH_ECC_MEAN:.15f}\n')
        f.write(f'"""\n\n')
        f.write(f'# {planet_name} COEFFICIENTS ({n_terms} terms)\n')
        f.write(f'{planet_name}_COEFFS = [\n')

        for i, coef in enumerate(coefficients):
            f.write(f'    {coef:>22.14f},  # Term {i}\n')

        f.write(']\n')

    return filename


def main():
    """Train all planets with observed feature matrix."""
    print("=" * 70)
    print("OBSERVED FORMULA TRAINING (numpy)")
    print("=" * 70)
    print(f"\nFeature matrix: 225 terms (328 for Venus)")
    print(f"Method: Least-squares via SVD")
    print(f"EARTH_ECC_MEAN: {EARTH_ECC_MEAN:.15f}")
    print()

    # Paths
    output_dir = Path(__file__).parent

    # Load data
    print("Loading observed data from Excel...")
    rows = load_training_data()
    print(f"Loaded {len(rows)} data points")
    print()

    print("-" * 70)
    print(f"{'Planet':<10} {'Terms':>6} {'RMSE':>12} {'R²':>12} {'Output File'}")
    print("-" * 70)

    # Train each planet
    planet_order = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']

    for planet_key in planet_order:
        coefficients, rmse, r2, n_terms = train_planet(planet_key, rows)

        output_file = write_coefficients(
            planet_key, coefficients, rmse, r2, n_terms, output_dir
        )

        print(f"{PLANETS[planet_key]['name']:<10} {n_terms:>6} {rmse:>12.4f} {r2:>12.6f} {output_file.name}")

    print("-" * 70)
    print()
    print("Training complete. Coefficient files written to docs/ directory.")


if __name__ == "__main__":
    main()

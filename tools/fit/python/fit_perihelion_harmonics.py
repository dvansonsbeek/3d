#!/usr/bin/env python3
"""
Fit Earth perihelion longitude harmonics from simulation data.

Reads 'Earth Perihelion (Ecliptic)' from data/01-holistic-year-objects-data.xlsx
(11,553 data points, 29-year steps) and fits a 21-term Fourier series to the
residuals after removing the linear precession trend.

Produced constants:
    PERI_HARMONICS_RAW  — [divisor, sin_coeff, cos_coeff] × 21 terms
    PERI_OFFSET         — DC offset (degrees)

Usage: python tools/fit/python/fit_perihelion_harmonics.py
"""

import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Add load_constants path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_constants import C

H = C['H']
BALANCE_YEAR = C['balancedYear']
PERI_PERIOD = H / 16  # perihelion precession cycle in years

EXCEL_PATH = Path(__file__).resolve().parent.parent.parent.parent / 'data' / '01-holistic-year-objects-data.xlsx'


def load_data():
    """Load Earth perihelion ecliptic longitude and unwrap."""
    df = pd.read_excel(str(EXCEL_PATH), sheet_name='Holistic_objects_PerihelionPlan')
    years = df['Model Year'].values.astype(float)
    peri_raw = df['Earth Perihelion ICRF'].values.astype(float)

    # Unwrap: perihelion longitude advances ~360° per H/16 years.
    # np.unwrap works in radians, so convert, unwrap, convert back.
    peri_unwrapped = np.rad2deg(np.unwrap(np.deg2rad(peri_raw)))

    return years, peri_unwrapped


def fit_harmonics(years, peri, divisors):
    """Fit Fourier harmonics to perihelion residuals.

    Model: peri(year) = 270 + (360/PERI_PERIOD) * t + offset + Σ harmonics
    where t = year - BALANCE_YEAR
    """
    n = len(years)
    t = years - BALANCE_YEAR

    # Linear trend: 270° + mean_rate × t
    mean_rate = 360.0 / PERI_PERIOD
    linear = 270.0 + mean_rate * t

    # Residuals from linear trend
    residuals = peri - linear

    # Design matrix: [1 (offset), sin_1, cos_1, sin_2, cos_2, ...]
    m = 1 + len(divisors) * 2  # offset + sin/cos pairs
    A = np.zeros((n, m))
    A[:, 0] = 1.0  # offset column

    for k, div in enumerate(divisors):
        phase = 2 * math.pi * t / (H / div)
        A[:, 1 + 2*k] = np.sin(phase)
        A[:, 2 + 2*k] = np.cos(phase)

    # Least squares solve
    x, res, rank, sv = np.linalg.lstsq(A, residuals, rcond=None)

    offset = x[0]
    harmonics = []
    for k, div in enumerate(divisors):
        harmonics.append((div, x[1 + 2*k], x[2 + 2*k]))

    # RMSE
    pred = A @ x
    rmse = np.sqrt(np.mean((residuals - pred) ** 2))

    return harmonics, offset, rmse


def greedy_select(years, peri, base_divisors, max_harmonics, candidate_range=100):
    """Greedy forward selection starting from base divisors.

    Uses vectorized candidate evaluation: pre-build sin/cos columns for all
    candidates, then test each by appending 2 columns to the current design matrix.
    """
    n = len(years)
    t = years - BALANCE_YEAR
    mean_rate = 360.0 / PERI_PERIOD
    residuals = peri - (270.0 + mean_rate * t)

    # Pre-compute sin/cos for all candidate divisors
    candidates = list(range(2, candidate_range + 1))
    sin_cols = {}
    cos_cols = {}
    for d in candidates:
        phase = 2 * math.pi * t / (H / d)
        sin_cols[d] = np.sin(phase)
        cos_cols[d] = np.cos(phase)

    current = list(base_divisors)

    # Build initial design matrix
    def build_A(divs):
        m = 1 + len(divs) * 2
        A = np.zeros((n, m))
        A[:, 0] = 1.0
        for k, d in enumerate(divs):
            A[:, 1 + 2*k] = sin_cols[d]
            A[:, 2 + 2*k] = cos_cols[d]
        return A

    A_current = build_A(current)
    x, _, _, _ = np.linalg.lstsq(A_current, residuals, rcond=None)
    rmse = np.sqrt(np.mean((residuals - A_current @ x) ** 2))
    print(f'    Base ({len(current)}): RMSE = {rmse:.6f}°')

    while len(current) < max_harmonics:
        best_div = None
        best_rmse = rmse

        # Test each candidate by appending its 2 columns
        current_set = set(current)
        for d in candidates:
            if d in current_set:
                continue
            A_test = np.column_stack([A_current, sin_cols[d], cos_cols[d]])
            x_test, _, _, _ = np.linalg.lstsq(A_test, residuals, rcond=None)
            test_rmse = np.sqrt(np.mean((residuals - A_test @ x_test) ** 2))
            if test_rmse < best_rmse - 1e-7:
                best_rmse = test_rmse
                best_div = d

        if best_div is None:
            break

        current.append(best_div)
        current.sort()
        A_current = build_A(current)
        x, _, _, _ = np.linalg.lstsq(A_current, residuals, rcond=None)
        rmse = np.sqrt(np.mean((residuals - A_current @ x) ** 2))

        # Find amplitude of added harmonic
        for k, d in enumerate(current):
            if d == best_div:
                amp = math.sqrt(x[1 + 2*k]**2 + x[2 + 2*k]**2)
                break
        print(f'    + H/{best_div} (amp={amp:.6f}°): RMSE = {rmse:.6f}° [{",".join(str(d) for d in current)}]')

    # Extract final results
    offset = x[0]
    harmonics = []
    for k, d in enumerate(current):
        harmonics.append((d, x[1 + 2*k], x[2 + 2*k]))

    return current, harmonics, offset, rmse


def main():
    print('═══════════════════════════════════════════════════════════════')
    print('  PERIHELION HARMONIC FIT')
    print('═══════════════════════════════════════════════════════════════')
    print(f'\nH = {H}, BALANCE_YEAR = {BALANCE_YEAR}')
    print(f'PERI_PERIOD = H/16 = {PERI_PERIOD:.1f} years')

    years, peri = load_data()
    print(f'\n{len(years)} data points, years {years[0]:.0f} to {years[-1]:.0f}')

    # J2000 check
    j2000_idx = np.argmin(np.abs(years - 2000))
    print(f'J2000 perihelion: {peri[j2000_idx] % 360:.4f}° (expected ~102.947°)')

    # ─── Fit with current 21 divisors ────────────────────────────────
    current_divisors = [16, 32, 48, 64, 3, 29, 24, 8, 40, 13, 45, 80, 272, 56, 61, 35, 544, 21, 5, 96, 816]
    current_divisors.sort()
    print(f'\n── Current {len(current_divisors)} harmonics ──')
    harmonics, offset, rmse = fit_harmonics(years, peri, current_divisors)
    print(f'RMSE = {rmse:.6f}°')
    print(f'PERI_OFFSET = {offset:.6f}')

    # J2000 prediction
    t_2000 = 2000 - BALANCE_YEAR
    pred_2000 = 270.0 + 360.0 / PERI_PERIOD * t_2000 + offset
    for div, sc, cc in harmonics:
        phase = 2 * math.pi * t_2000 / (H / div)
        pred_2000 += sc * math.sin(phase) + cc * math.cos(phase)
    print(f'J2000 prediction: {pred_2000 % 360:.4f}° (data: {peri[j2000_idx] % 360:.4f}°)')

    # ─── Greedy search ────────────────────────────────────────────────
    print(f'\n── Greedy selection (start from H/16, H/32) ──')
    base = [16, 32]
    greedy_divs, greedy_harm, greedy_offset, greedy_rmse = greedy_select(
        years, peri, base, 25, candidate_range=900
    )

    # J2000 prediction with greedy
    pred_2000g = 270.0 + 360.0 / PERI_PERIOD * t_2000 + greedy_offset
    for div, sc, cc in greedy_harm:
        phase = 2 * math.pi * t_2000 / (H / div)
        pred_2000g += sc * math.sin(phase) + cc * math.cos(phase)

    # ─── Output ───────────────────────────────────────────────────────
    print(f'\n═══════════════════════════════════════════════════════════════')
    print(f'  COPY-PASTE OUTPUT')
    print(f'═══════════════════════════════════════════════════════════════')

    print(f'\n// Perihelion harmonics — {len(greedy_divs)} terms, RMSE = {greedy_rmse:.4f}°')
    print(f'// Fitted from {len(years)} simulation data points (29-yr steps)')
    print(f'const PERI_HARMONICS_RAW = [')
    for div, sc, cc in greedy_harm:
        amp = math.sqrt(sc**2 + cc**2)
        print(f'  [{div:>4},  {sc:>10.6f},  {cc:>10.6f}],  // H/{div}  amp={amp:.6f}°')
    print(f'];')
    print(f'const PERI_OFFSET = {greedy_offset:.6f};')

    print(f'\nJ2000: {pred_2000g % 360:.4f}° (data: {peri[j2000_idx] % 360:.4f}°, ref: 102.947°)')

    # Summary
    print(f'\n── Summary ──')
    print(f'Current ({len(current_divisors)} terms): RMSE = {rmse:.6f}°, offset = {offset:.6f}')
    print(f'Greedy  ({len(greedy_divs)} terms):  RMSE = {greedy_rmse:.6f}°, offset = {greedy_offset:.6f}')

    # ─── Write to fitted-coefficients.json if --write flag is present ───
    import json
    if '--write' in sys.argv:
        json_path = Path(__file__).resolve().parent.parent.parent / 'public' / 'input' / 'fitted-coefficients.json'
        fc = json.loads(json_path.read_text())
        fc['PERI_HARMONICS_RAW'] = [[int(d), s, c] for d, s, c in harmonics]
        fc['PERI_OFFSET'] = offset
        json_path.write_text(json.dumps(fc, indent=2) + '\n')
        print(f'\n✓ Written PERI_HARMONICS to fitted-coefficients.json')
    else:
        print(f'\n  (dry run — add --write to update fitted-coefficients.json)')


if __name__ == '__main__':
    main()

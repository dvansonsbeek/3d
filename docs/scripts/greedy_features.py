#!/usr/bin/env python3
"""
GREEDY FORWARD FEATURE SELECTION
==================================

Finds candidate features beyond the current 429-term matrix that could
further reduce RMSE for each planet.

Method:
  1. Load training data and current 429-term coefficients
  2. Compute residuals from current model
  3. Generate ~800+ candidate features (new periods, angle harmonics,
     cross products, beat frequencies)
  4. For each candidate: compute |correlation| with residuals
  5. For top candidates: re-fit ridge regression with 320 terms,
     measure actual RMSE improvement
  6. Report top candidates per planet

Usage:
  cd docs/scripts
  python greedy_features.py [--top 30] [--refit 10] [--planet venus]
"""

import math
import sys
import argparse
from pathlib import Path
from typing import List, Tuple, Dict

import pandas as pd
import numpy as np

# Add script dir to path
sys.path.insert(0, str(Path(__file__).parent))

from predictive_formula import (
    build_features, PLANETS, H,
    EARTH_PERI_PERIOD, EARTH_PERI_2, EARTH_PERI_3, EARTH_PERI_4,
    OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_4, H_DIV_5, H_DIV_12, H_DIV_13,
    H_DIV_21, H_DIV_24, H_DIV_29, H_DIV_40, H_DIV_55, H_DIV_77, H_DIV_78,
    H_DIV_80, H_DIV_94, H_DIV_9, H_DIV_45, H_DIV_60,
    H_DIV_41, H_DIV_56, H_DIV_75, H_DIV_110,
    H_DIV_39,
    calc_earth_perihelion, calc_planet_perihelion, calc_erd,
    calc_obliquity, calc_eccentricity,
    time_offset, EARTH_OBLIQ_MEAN, EARTH_ECC_MEAN
)

# Periods already in the feature matrix (to avoid duplicates in simple sin/cos).
# GROUP 17 forms: H/60 simple, H/24 ×angle, H/45 ×angle, H/9 ×2δ
# GROUP 18 forms: H/110 simple, H/60 ×angle, H/75 simple, H/41 ×angle, H/56 simple, H/45 simple
# GROUP 19 forms: H/56 ×angle, H/41 ×2δ, ERD×H/110, ERD×6δ, H/39 ×angle
# Remaining valid candidates for existing periods:
#   H/9:  simple, ×angle (only ×2δ in G17)
#   H/24: simple, ×2δ, ×ERD (only ×angle in G17)
#   H/41: simple, ×ERD (×angle in G18, ×2δ in G19)
#   H/56: ×2δ, ×ERD (simple in G18, ×angle in G19)
#   H/60: ×2δ, ×ERD (simple in G17, ×angle in G18)
#   H/110: ×angle, ×2δ (simple in G18, ERD× in G19)
#   H/39: simple, ×2δ, ×ERD (×angle in G19)
EXISTING_PERIODS = {
    EARTH_PERI_PERIOD, EARTH_PERI_2, EARTH_PERI_3, EARTH_PERI_4,
    OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_4, H_DIV_5, H_DIV_12, H_DIV_13,
    H_DIV_21, H_DIV_24, H_DIV_29, H_DIV_40, H_DIV_55, H_DIV_77, H_DIV_78,
    H_DIV_80, H_DIV_94, H,
    H_DIV_60, H_DIV_45, H_DIV_110, H_DIV_75, H_DIV_56,
    # H/9, H/41, H/39 NOT listed — only partial forms in matrix
}

PLANET_FLUCTUATION_COLS = {
    'mercury': 'Mercury Precession Fluctuation',
    'venus':   'Venus Precession Fluctuation',
    'mars':    'Mars Precession Fluctuation',
    'jupiter': 'Jupiter Precession Fluctuation',
    'saturn':  'Saturn Precession Fluctuation',
    'uranus':  'Uranus Precession Fluctuation',
    'neptune': 'Neptune Precession Fluctuation',
}

COEFFS_FILES = {
    'mercury': 'mercury_coeffs_unified',
    'venus':   'venus_coeffs_unified',
    'mars':    'mars_coeffs_unified',
    'jupiter': 'jupiter_coeffs_unified',
    'saturn':  'saturn_coeffs_unified',
    'uranus':  'uranus_coeffs_unified',
    'neptune': 'neptune_coeffs_unified',
}


def load_coefficients(planet_key: str) -> np.ndarray:
    """Load planet coefficients from *_coeffs_unified.py file."""
    import importlib
    mod = importlib.import_module(COEFFS_FILES[planet_key])
    name = PLANETS[planet_key]['name'].upper() + '_COEFFS'
    return np.array(getattr(mod, name))


def load_training_data(excel_path: str) -> Dict[str, Tuple[List[int], List[float]]]:
    """Load year + fluctuation data from Excel for all planets."""
    df = pd.read_excel(excel_path, sheet_name='Holistic_objects_PerihelionPlan')
    result = {}
    for planet_key, col_name in PLANET_FLUCTUATION_COLS.items():
        rows = df[['Model Year', col_name]].dropna()
        years = [int(r) for r in rows['Model Year']]
        flucts = [float(v) for v in rows[col_name]]
        result[planet_key] = (years, flucts)
    return result


def build_feature_matrix(years: List[int], planet_key: str) -> np.ndarray:
    """Build 429-term feature matrix for a planet."""
    planet = PLANETS[planet_key]
    X = [build_features(y, planet['period'], planet['theta0']) for y in years]
    return np.array(X, dtype=np.float64)


def build_candidate_features(
    years: List[int],
    planet_key: str,
) -> List[Tuple[str, np.ndarray]]:
    """
    Generate candidate features not currently in the 429-term matrix.

    Returns list of (name, values_array) pairs.
    """
    planet = PLANETS[planet_key]
    p_period = planet['period']
    p_theta0 = planet['theta0']

    candidates = []
    N = len(years)
    t_arr = np.array([time_offset(y) for y in years])

    # Pre-compute derived quantities for all years
    theta_E_arr = np.array([calc_earth_perihelion(y) for y in years])
    theta_P_arr = np.array([calc_planet_perihelion(p_theta0, p_period, y) for y in years])
    erd_arr     = np.array([calc_erd(y) for y in years])
    obliq_arr   = np.array([calc_obliquity(y) for y in years]) - EARTH_OBLIQ_MEAN
    ecc_arr     = np.array([calc_eccentricity(y) for y in years]) - EARTH_ECC_MEAN

    diff_arr     = np.radians(theta_E_arr) - np.radians(theta_P_arr)
    sum_arr      = np.radians(theta_E_arr) + np.radians(theta_P_arr)
    erd2_arr     = erd_arr ** 2
    erd3_arr     = erd_arr ** 3

    def add_periodic(label: str, period: float, include_angle: bool = True,
                     include_erd: bool = True):
        """Add sin/cos, optionally ×angle and ×ERD for given period."""
        ph = 2 * math.pi * t_arr / period
        s = np.sin(ph)
        c = np.cos(ph)

        candidates.append((f'sin(2πt/{label})', s))
        candidates.append((f'cos(2πt/{label})', c))

        if include_angle:
            candidates.append((f'sin(2πt/{label})×cos(δ)', s * np.cos(diff_arr)))
            candidates.append((f'sin(2πt/{label})×sin(δ)', s * np.sin(diff_arr)))
            candidates.append((f'cos(2πt/{label})×cos(δ)', c * np.cos(diff_arr)))
            candidates.append((f'cos(2πt/{label})×sin(δ)', c * np.sin(diff_arr)))
            candidates.append((f'sin(2πt/{label})×cos(2δ)', s * np.cos(2*diff_arr)))
            candidates.append((f'cos(2πt/{label})×cos(2δ)', c * np.cos(2*diff_arr)))
            candidates.append((f'sin(2πt/{label})×sin(2δ)', s * np.sin(2*diff_arr)))
            candidates.append((f'cos(2πt/{label})×sin(2δ)', c * np.sin(2*diff_arr)))

        if include_erd:
            candidates.append((f'ERD×sin(2πt/{label})', erd_arr * s))
            candidates.append((f'ERD×cos(2πt/{label})', erd_arr * c))
            candidates.append((f'ERD²×sin(2πt/{label})', erd2_arr * s))
            candidates.append((f'ERD²×cos(2πt/{label})', erd2_arr * c))

    # -----------------------------------------------------------------------
    # 1. New pure H-derived periods not in existing set
    # -----------------------------------------------------------------------
    new_h_divs = [6, 7, 9, 10, 11, 14, 15, 17, 18, 19, 20, 22, 23, 25, 26,
                  27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42,
                  44, 45, 46, 48, 50, 52, 56, 64, 65, 68, 72, 75, 90, 96,
                  100, 105, 110, 115, 120, 128, 144, 160, 192]
    for n in new_h_divs:
        period = H / n
        if period not in EXISTING_PERIODS:
            add_periodic(f'H/{n}', period, include_angle=True, include_erd=True)

    # -----------------------------------------------------------------------
    # 1b. GROUP 17/18 periods — missing cross-forms not yet in the matrix
    # -----------------------------------------------------------------------
    # H/60: simple(G17) + ×angle(G18) → still missing: ×2δ, ×ERD
    ph60 = 2 * math.pi * t_arr / H_DIV_60
    s60, c60 = np.sin(ph60), np.cos(ph60)
    for tag, v in [('sin(2πt/H/60)×cos(2δ)', s60*np.cos(2*diff_arr)),
                   ('cos(2πt/H/60)×cos(2δ)', c60*np.cos(2*diff_arr)),
                   ('sin(2πt/H/60)×sin(2δ)', s60*np.sin(2*diff_arr)),
                   ('cos(2πt/H/60)×sin(2δ)', c60*np.sin(2*diff_arr)),
                   ('ERD×sin(2πt/H/60)', erd_arr*s60),
                   ('ERD×cos(2πt/H/60)', erd_arr*c60)]:
        candidates.append((tag, v))

    # H/9: ×2δ(G17) → still missing: simple, ×angle, ×ERD
    ph9 = 2 * math.pi * t_arr / H_DIV_9
    s9, c9 = np.sin(ph9), np.cos(ph9)
    for tag, v in [('sin(2πt/H/9)', s9),
                   ('cos(2πt/H/9)', c9),
                   ('sin(2πt/H/9)×cos(δ)', s9*np.cos(diff_arr)),
                   ('sin(2πt/H/9)×sin(δ)', s9*np.sin(diff_arr)),
                   ('cos(2πt/H/9)×cos(δ)', c9*np.cos(diff_arr)),
                   ('cos(2πt/H/9)×sin(δ)', c9*np.sin(diff_arr)),
                   ('ERD×sin(2πt/H/9)', erd_arr*s9),
                   ('ERD×cos(2πt/H/9)', erd_arr*c9)]:
        candidates.append((tag, v))

    # H/45: ×angle(G17) + simple(G18) → still missing: ×2δ, ×ERD
    ph45 = 2 * math.pi * t_arr / H_DIV_45
    s45, c45 = np.sin(ph45), np.cos(ph45)
    for tag, v in [('sin(2πt/H/45)×cos(2δ)', s45*np.cos(2*diff_arr)),
                   ('cos(2πt/H/45)×cos(2δ)', c45*np.cos(2*diff_arr)),
                   ('sin(2πt/H/45)×sin(2δ)', s45*np.sin(2*diff_arr)),
                   ('cos(2πt/H/45)×sin(2δ)', c45*np.sin(2*diff_arr)),
                   ('ERD×sin(2πt/H/45)', erd_arr*s45),
                   ('ERD×cos(2πt/H/45)', erd_arr*c45)]:
        candidates.append((tag, v))

    # H/24: ×angle(G17) → still missing: simple, ×2δ, ×ERD
    ph24 = 2 * math.pi * t_arr / H_DIV_24
    s24, c24 = np.sin(ph24), np.cos(ph24)
    for tag, v in [('sin(2πt/H/24)', s24),
                   ('cos(2πt/H/24)', c24),
                   ('sin(2πt/H/24)×cos(2δ)', s24*np.cos(2*diff_arr)),
                   ('cos(2πt/H/24)×cos(2δ)', c24*np.cos(2*diff_arr)),
                   ('sin(2πt/H/24)×sin(2δ)', s24*np.sin(2*diff_arr)),
                   ('cos(2πt/H/24)×sin(2δ)', c24*np.sin(2*diff_arr)),
                   ('ERD×sin(2πt/H/24)', erd_arr*s24),
                   ('ERD×cos(2πt/H/24)', erd_arr*c24),
                   ('ERD²×sin(2πt/H/24)', erd2_arr*s24),
                   ('ERD²×cos(2πt/H/24)', erd2_arr*c24)]:
        candidates.append((tag, v))

    # H/41: ×angle(G18) + ×2δ(G19) → still missing: simple, ×ERD
    ph41 = 2 * math.pi * t_arr / H_DIV_41
    s41, c41 = np.sin(ph41), np.cos(ph41)
    for tag, v in [('sin(2πt/H/41)', s41),
                   ('cos(2πt/H/41)', c41),
                   ('ERD×sin(2πt/H/41)', erd_arr*s41),
                   ('ERD×cos(2πt/H/41)', erd_arr*c41)]:
        candidates.append((tag, v))

    # H/110: simple(G18) + ERD×(G19) → still missing: ×angle, ×2δ
    ph110 = 2 * math.pi * t_arr / H_DIV_110
    s110, c110 = np.sin(ph110), np.cos(ph110)
    for tag, v in [('sin(2πt/H/110)×cos(δ)', s110*np.cos(diff_arr)),
                   ('sin(2πt/H/110)×sin(δ)', s110*np.sin(diff_arr)),
                   ('cos(2πt/H/110)×cos(δ)', c110*np.cos(diff_arr)),
                   ('cos(2πt/H/110)×sin(δ)', c110*np.sin(diff_arr)),
                   ('sin(2πt/H/110)×cos(2δ)', s110*np.cos(2*diff_arr)),
                   ('cos(2πt/H/110)×cos(2δ)', c110*np.cos(2*diff_arr))]:
        candidates.append((tag, v))

    # H/75: simple(G18) → still missing: ×angle, ×2δ, ×ERD
    ph75 = 2 * math.pi * t_arr / H_DIV_75
    s75, c75 = np.sin(ph75), np.cos(ph75)
    for tag, v in [('sin(2πt/H/75)×cos(δ)', s75*np.cos(diff_arr)),
                   ('sin(2πt/H/75)×sin(δ)', s75*np.sin(diff_arr)),
                   ('cos(2πt/H/75)×cos(δ)', c75*np.cos(diff_arr)),
                   ('cos(2πt/H/75)×sin(δ)', c75*np.sin(diff_arr)),
                   ('sin(2πt/H/75)×cos(2δ)', s75*np.cos(2*diff_arr)),
                   ('cos(2πt/H/75)×cos(2δ)', c75*np.cos(2*diff_arr)),
                   ('ERD×sin(2πt/H/75)', erd_arr*s75),
                   ('ERD×cos(2πt/H/75)', erd_arr*c75)]:
        candidates.append((tag, v))

    # H/56: simple(G18) + ×angle(G19) → still missing: ×2δ, ×ERD
    ph56 = 2 * math.pi * t_arr / H_DIV_56
    s56, c56 = np.sin(ph56), np.cos(ph56)
    for tag, v in [('sin(2πt/H/56)×cos(2δ)', s56*np.cos(2*diff_arr)),
                   ('cos(2πt/H/56)×cos(2δ)', c56*np.cos(2*diff_arr)),
                   ('sin(2πt/H/56)×sin(2δ)', s56*np.sin(2*diff_arr)),
                   ('cos(2πt/H/56)×sin(2δ)', c56*np.sin(2*diff_arr)),
                   ('ERD×sin(2πt/H/56)', erd_arr*s56),
                   ('ERD×cos(2πt/H/56)', erd_arr*c56)]:
        candidates.append((tag, v))

    # H/39: ×angle(G19) → still missing: simple, ×2δ, ×ERD
    ph39 = 2 * math.pi * t_arr / H_DIV_39
    s39, c39 = np.sin(ph39), np.cos(ph39)
    for tag, v in [('sin(2πt/H/39)', s39),
                   ('cos(2πt/H/39)', c39),
                   ('sin(2πt/H/39)×cos(2δ)', s39*np.cos(2*diff_arr)),
                   ('cos(2πt/H/39)×cos(2δ)', c39*np.cos(2*diff_arr)),
                   ('sin(2πt/H/39)×sin(2δ)', s39*np.sin(2*diff_arr)),
                   ('cos(2πt/H/39)×sin(2δ)', c39*np.sin(2*diff_arr)),
                   ('ERD×sin(2πt/H/39)', erd_arr*s39),
                   ('ERD×cos(2πt/H/39)', erd_arr*c39)]:
        candidates.append((tag, v))

    # -----------------------------------------------------------------------
    # 2. Higher harmonics of existing key periods
    # -----------------------------------------------------------------------
    add_periodic('H/96',    H / 96)    # 6th harmonic of Earth perihelion
    add_periodic('H/112',   H / 112)   # 7th harmonic
    add_periodic('H/24+beat', H / 24)  # if planet has H/24 in beat list

    # -----------------------------------------------------------------------
    # 3. Higher harmonics of the difference angle δ (beyond n=3 already in matrix)
    # -----------------------------------------------------------------------
    for n in [4, 5, 6]:
        candidates.append((f'cos({n}δ)', np.cos(n * diff_arr)))
        candidates.append((f'sin({n}δ)', np.sin(n * diff_arr)))
        candidates.append((f'ERD×cos({n}δ)', erd_arr * np.cos(n * diff_arr)))
        candidates.append((f'ERD×sin({n}δ)', erd_arr * np.sin(n * diff_arr)))

    # -----------------------------------------------------------------------
    # 4. Higher harmonics of sum angle Σ (beyond n=1 already in matrix)
    # -----------------------------------------------------------------------
    for n in [2, 3, 4]:
        candidates.append((f'cos({n}Σ)', np.cos(n * sum_arr)))
        candidates.append((f'sin({n}Σ)', np.sin(n * sum_arr)))

    # -----------------------------------------------------------------------
    # 5. Obliquity/eccentricity × higher angle harmonics
    # -----------------------------------------------------------------------
    for n in [3, 4]:
        candidates.append((f'obliq×cos({n}δ)', obliq_arr * np.cos(n * diff_arr)))
        candidates.append((f'obliq×sin({n}δ)', obliq_arr * np.sin(n * diff_arr)))
        candidates.append((f'ecc×cos({n}δ)', ecc_arr * np.cos(n * diff_arr)))
        candidates.append((f'ecc×sin({n}δ)', ecc_arr * np.sin(n * diff_arr)))

    # Obliq/ecc × period for additional periods
    for label, period in [('H/3', INCLIN_CYCLE), ('H/4', H_DIV_4), ('H/5', H_DIV_5)]:
        ph = 2 * math.pi * t_arr / period
        candidates.append((f'obliq×sin(2πt/{label})', obliq_arr * np.sin(ph)))
        candidates.append((f'obliq×cos(2πt/{label})', obliq_arr * np.cos(ph)))
        candidates.append((f'ecc×sin(2πt/{label})', ecc_arr * np.sin(ph)))
        candidates.append((f'ecc×cos(2πt/{label})', ecc_arr * np.cos(ph)))

    # Obliq²/ecc² terms
    candidates.append(('obliq²', obliq_arr ** 2))
    candidates.append(('ecc²', ecc_arr ** 2))
    candidates.append(('obliq×ecc', obliq_arr * ecc_arr))
    candidates.append(('obliq²×cos(δ)', (obliq_arr**2) * np.cos(diff_arr)))
    candidates.append(('obliq²×sin(δ)', (obliq_arr**2) * np.sin(diff_arr)))
    candidates.append(('ecc²×cos(δ)', (ecc_arr**2) * np.cos(diff_arr)))

    # -----------------------------------------------------------------------
    # 6. ERD⁴ and higher ERD power terms
    # -----------------------------------------------------------------------
    erd4_arr = erd_arr ** 4
    candidates.append(('ERD⁴', erd4_arr))
    candidates.append(('ERD⁴×cos(δ)', erd4_arr * np.cos(diff_arr)))
    candidates.append(('ERD⁴×sin(δ)', erd4_arr * np.sin(diff_arr)))
    candidates.append(('ERD³×cos(2δ)', erd3_arr * np.cos(2 * diff_arr)))
    candidates.append(('ERD³×sin(2δ)', erd3_arr * np.sin(2 * diff_arr)))

    # -----------------------------------------------------------------------
    # 7. Beat frequencies between key pairs not yet in matrix
    # -----------------------------------------------------------------------
    beat_new = [
        (OBLIQ_CYCLE, INCLIN_CYCLE),
        (EARTH_PERI_PERIOD, H_DIV_5),
        (OBLIQ_CYCLE, H_DIV_5),
        (INCLIN_CYCLE, H_DIV_4),
        (EARTH_PERI_PERIOD, H_DIV_4),
    ]
    for p1, p2 in beat_new:
        beat = abs(p1 - p2)
        sumf = (p1 * p2) / (p1 + p2)
        n1, n2 = round(H / p1), round(H / p2)
        for bp, tag in [(beat, 'beat'), (sumf, 'sumf')]:
            if bp not in EXISTING_PERIODS and bp > 1:
                ph = 2 * math.pi * t_arr / bp
                candidates.append((f'sin({tag}[H/{n1},H/{n2}])', np.sin(ph)))
                candidates.append((f'cos({tag}[H/{n1},H/{n2}])', np.cos(ph)))
                candidates.append((f'sin({tag})×cos(δ)', np.sin(ph) * np.cos(diff_arr)))
                candidates.append((f'cos({tag})×cos(δ)', np.cos(ph) * np.cos(diff_arr)))

    # -----------------------------------------------------------------------
    # 8. Planet-angle × planet-period harmonics (2nd order: n=2 of planet period)
    # -----------------------------------------------------------------------
    ph_p2 = 2 * math.pi * t_arr / (p_period / 2)
    candidates.append(('sin(2πt/[P/2])', np.sin(ph_p2)))
    candidates.append(('cos(2πt/[P/2])', np.cos(ph_p2)))
    candidates.append(('sin(2πt/[P/2])×cos(δ)', np.sin(ph_p2) * np.cos(diff_arr)))
    candidates.append(('cos(2πt/[P/2])×cos(δ)', np.cos(ph_p2) * np.cos(diff_arr)))

    # -----------------------------------------------------------------------
    # 9. Periodic × 3δ for additional periods (Group 14 has planet_period and
    #    EARTH_PERI_PERIOD; add OBLIQ_CYCLE and INCLIN_CYCLE)
    # -----------------------------------------------------------------------
    for label, period in [('H/8', OBLIQ_CYCLE), ('H/3', INCLIN_CYCLE),
                           ('H/5', H_DIV_5), ('H/4', H_DIV_4)]:
        ph = 2 * math.pi * t_arr / period
        s, c = np.sin(ph), np.cos(ph)
        candidates.append((f'sin(2πt/{label})×cos(3δ)', s * np.cos(3 * diff_arr)))
        candidates.append((f'sin(2πt/{label})×sin(3δ)', s * np.sin(3 * diff_arr)))
        candidates.append((f'cos(2πt/{label})×cos(3δ)', c * np.cos(3 * diff_arr)))
        candidates.append((f'cos(2πt/{label})×sin(3δ)', c * np.sin(3 * diff_arr)))

    # -----------------------------------------------------------------------
    # 10. Triple products: periodic × periodic × angle (not currently in matrix)
    # -----------------------------------------------------------------------
    triple_pairs = [
        (EARTH_PERI_PERIOD, OBLIQ_CYCLE),
        (EARTH_PERI_PERIOD, INCLIN_CYCLE),
        (OBLIQ_CYCLE, H_DIV_5),
    ]
    for p1, p2 in triple_pairs:
        ph1 = 2 * math.pi * t_arr / p1
        ph2 = 2 * math.pi * t_arr / p2
        n1, n2 = round(H / p1), round(H / p2)
        for s_or_c_1, label1 in [(np.sin(ph1), 'sin'), (np.cos(ph1), 'cos')]:
            for s_or_c_2, label2 in [(np.sin(ph2), 'sin'), (np.cos(ph2), 'cos')]:
                base = s_or_c_1 * s_or_c_2
                candidates.append(
                    (f'{label1}(H/{n1})×{label2}(H/{n2})×cos(δ)', base * np.cos(diff_arr))
                )
                candidates.append(
                    (f'{label1}(H/{n1})×{label2}(H/{n2})×sin(δ)', base * np.sin(diff_arr))
                )

    return candidates


def ridge_fit_extra(X: np.ndarray, y: np.ndarray,
                    extra_col: np.ndarray, alpha: float = 0.01
                    ) -> Tuple[float, float]:
    """
    Fit ridge regression with X augmented by one extra column.
    Returns (rmse, r2).
    Uses numpy lstsq approach for speed.
    """
    Xaug = np.column_stack([X, extra_col])
    # Ridge: (X'X + αI)w = X'y
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


def compute_current_rmse(X: np.ndarray, y: np.ndarray,
                          coeffs: np.ndarray) -> Tuple[float, float, np.ndarray]:
    """Compute current model RMSE and residuals."""
    pred = X @ coeffs
    res = y - pred
    rmse = float(np.sqrt(np.mean(res**2)))
    ss_tot = float(np.sum((y - y.mean())**2))
    r2 = 1.0 - float(np.sum(res**2)) / ss_tot
    return rmse, r2, res


def analyse_planet(
    planet_key: str,
    years: List[int],
    flucts: List[float],
    top_n: int = 30,
    refit_n: int = 10,
):
    """Full greedy analysis for one planet."""
    planet_name = PLANETS[planet_key]['name']
    print(f"\n{'='*70}")
    print(f"  {planet_name.upper()}  ({len(years)} data points)")
    print(f"{'='*70}")

    y = np.array(flucts, dtype=np.float64)

    # 1. Build base feature matrix
    print("  Building 429-term feature matrix...", end='', flush=True)
    X = build_feature_matrix(years, planet_key)
    print(f" done. Shape: {X.shape}")

    # 2. Load coefficients and compute residuals
    print("  Loading coefficients...", end='', flush=True)
    coeffs = load_coefficients(planet_key)
    rmse0, r2_0, residuals = compute_current_rmse(X, y, coeffs)
    print(f" done.")
    print(f"  Current model: RMSE={rmse0:.4f} \"/cy  R²={r2_0:.6f}")
    print(f"  Residual std:  {residuals.std():.4f} \"/cy")

    # 3. Generate candidates
    print(f"  Generating candidate features...", end='', flush=True)
    candidates = build_candidate_features(years, planet_key)
    # Normalize each candidate for correlation computation
    print(f" {len(candidates)} candidates.")

    # 4. Rank by absolute correlation with residuals
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

    # 5. Refit with top candidates
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
    parser = argparse.ArgumentParser(description='Greedy forward feature selection')
    parser.add_argument('--top', type=int, default=30,
                        help='Number of top candidates to show (default 30)')
    parser.add_argument('--refit', type=int, default=10,
                        help='Number of top candidates to refit with (default 10)')
    parser.add_argument('--planet', type=str, default=None,
                        help='Analyse only this planet (default: all)')
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    excel_path = script_dir / '..' / '98-holistic-year-objects-data.xlsx'

    print("Loading training data from Excel...")
    data = load_training_data(str(excel_path))

    planets_to_run = [args.planet] if args.planet else list(PLANETS.keys())

    all_results = {}
    for planet_key in planets_to_run:
        if planet_key not in PLANETS:
            print(f"Unknown planet: {planet_key}")
            continue
        if planet_key not in data:
            print(f"No data for: {planet_key}")
            continue
        years, flucts = data[planet_key]
        top = analyse_planet(planet_key, years, flucts,
                             top_n=args.top, refit_n=args.refit)
        all_results[planet_key] = top

    # -----------------------------------------------------------------------
    # Summary: features that rank highly across multiple planets
    # -----------------------------------------------------------------------
    if len(planets_to_run) > 1:
        print(f"\n\n{'='*70}")
        print("  CROSS-PLANET SUMMARY: features appearing in top-10 for 2+ planets")
        print(f"{'='*70}")
        from collections import defaultdict
        score = defaultdict(list)
        for planet_key, tops in all_results.items():
            for rank, (name, corr, _) in enumerate(tops[:10]):
                score[name].append((rank + 1, planet_key, corr))

        multi = {k: v for k, v in score.items() if len(v) >= 2}
        multi_sorted = sorted(multi.items(), key=lambda x: sum(r for r, _, _ in x[1]))

        for name, entries in multi_sorted[:20]:
            parts = ', '.join(
                f"{PLANETS[pk]['name']}(#{r} {c:+.3f})"
                for r, pk, c in sorted(entries)
            )
            print(f"  {name}")
            print(f"    {parts}")


if __name__ == '__main__':
    main()

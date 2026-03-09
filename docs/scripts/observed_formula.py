#!/usr/bin/env python3
"""
Observed Precession Fluctuation Formulas for All Planets

This script calculates the precession fluctuation for all planets using
the observed perihelion data from the Holistic Universe model's CSV file.

IMPORTANT: This script uses OBSERVED values from the CSV data file:
- Observed perihelion angles for each planet
- Earth Rate Deviation (ERD) from numerical derivative
- Earth obliquity and eccentricity

For predictive formulas using calculated values, see: predictive_formula.py

PLANETARY PERIODS (derived from H):
  Mercury:  H × 8/11
  Venus:    H × 2
  Mars:     H × 3/13
  Jupiter:  H/5
  Saturn:   H/8 (retrograde)
  Uranus:   H/3
  Neptune:  H × 2

RESULTS (using observed perihelion from CSV):
  Mercury:  R² = 1.0000, RMSE = 0.08 arcsec/century (225 terms)
  Venus:    R² = 1.0000, RMSE = 0.27 arcsec/century (328 terms, V3_VENUS)
  Mars:     R² = 1.0000, RMSE = 0.02 arcsec/century (225 terms)
  Jupiter:  R² = 1.0000, RMSE = 0.03 arcsec/century (225 terms)
  Saturn:   R² = 1.0000, RMSE = 0.03 arcsec/century (225 terms)
  Uranus:   R² = 1.0000, RMSE = 0.01 arcsec/century (225 terms)
  Neptune:  R² = 1.0000, RMSE = 0.01 arcsec/century (225 terms)

Author: Holistic Universe Model
License: MIT
"""

import csv
import math
import os
from typing import Dict, List, Tuple, Optional

# =============================================================================
# FUNDAMENTAL CONSTANTS
# =============================================================================

H = 335008  # Master Holistic-Year cycle
ANCHOR = 301340  # Reference year offset (year 0 of current cycle = -301340)

# Earth precession cycles
EARTH_PERI_PERIOD = H // 16     # H/16 (effective perihelion)
EARTH_PERI_2 = H // 32          # H/32
EARTH_PERI_3 = H // 48          # H/48
EARTH_PERI_4 = H // 64          # H/64
OBLIQ_CYCLE = H // 8            # H/8
INCLIN_CYCLE = H // 3           # H/3

# Additional periods
H_DIV_4 = H // 4                # H/4
H_DIV_5 = H // 5                # H/5
H_DIV_12 = H // 12              # H/12
H_DIV_13 = H // 13              # H/13 (axial precession)

# Planetary perihelion periods
MERCURY_PERIOD = int(H * 8 / 11)    # H × 8/11
VENUS_PERIOD = H * 2                 # H × 2
MARS_PERIOD = int(H * 3 / 13)        # H × 3/13
JUPITER_PERIOD = H_DIV_5             # H/5
SATURN_PERIOD = OBLIQ_CYCLE          # H/8 (retrograde)
URANUS_PERIOD = INCLIN_CYCLE         # H/3
NEPTUNE_PERIOD = H * 2               # H × 2

# Earth mean values for normalization
EARTH_OBLIQ_MEAN = 23.414
EARTH_ECC_BASE = 0.015373                                      # (max + min) / 2
EARTH_ECC_AMP  = 0.001370                                      # (max - min) / 2
EARTH_ECC_MEAN = math.sqrt(EARTH_ECC_BASE**2 + EARTH_ECC_AMP**2)  # 0.015386904554198

# =============================================================================
# CSV COLUMN INDICES (0-indexed)
# =============================================================================

CSV_COLS = {
    'year': 3,
    'earth_longitude': 24,
    'earth_erd': 25,
    'earth_eccentricity': 26,
    'earth_obliquity': 27,
    # Perihelion columns
    'mercury_perihelion': 4,
    'venus_perihelion': 14,
    'mars_perihelion': 34,
    'jupiter_perihelion': 44,
    'saturn_perihelion': 54,
    'uranus_perihelion': 64,
    'neptune_perihelion': 74,
    # Precession fluctuation columns
    'mercury_fluctuation': 13,
    'venus_fluctuation': 23,
    'mars_fluctuation': 43,
    'jupiter_fluctuation': 53,
    'saturn_fluctuation': 63,
    'uranus_fluctuation': 73,
    'neptune_fluctuation': 83,
}

# =============================================================================
# COEFFICIENTS (imported from individual files or embedded)
# =============================================================================

# Import coefficients from individual files
try:
    from mercury_coeffs import MERCURY_COEFFS
    from venus_coeffs import VENUS_COEFFS
    from mars_coeffs import MARS_COEFFS
    from jupiter_coeffs import JUPITER_COEFFS
    from saturn_coeffs import SATURN_COEFFS
    from uranus_coeffs import URANUS_COEFFS
    from neptune_coeffs import NEPTUNE_COEFFS
except ImportError:
    # If running from different directory, try relative import
    import sys
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    from mercury_coeffs import MERCURY_COEFFS
    from venus_coeffs import VENUS_COEFFS
    from mars_coeffs import MARS_COEFFS
    from jupiter_coeffs import JUPITER_COEFFS
    from saturn_coeffs import SATURN_COEFFS
    from uranus_coeffs import URANUS_COEFFS
    from neptune_coeffs import NEPTUNE_COEFFS

# Planet configurations
PLANETS = {
    'mercury': {
        'name': 'Mercury',
        'period': MERCURY_PERIOD,
        'coeffs': MERCURY_COEFFS,
        'perihelion_col': CSV_COLS['mercury_perihelion'],
        'fluctuation_col': CSV_COLS['mercury_fluctuation'],
    },
    'venus': {
        'name': 'Venus',
        'period': VENUS_PERIOD,
        'coeffs': VENUS_COEFFS,
        'perihelion_col': CSV_COLS['venus_perihelion'],
        'fluctuation_col': CSV_COLS['venus_fluctuation'],
    },
    'mars': {
        'name': 'Mars',
        'period': MARS_PERIOD,
        'coeffs': MARS_COEFFS,
        'perihelion_col': CSV_COLS['mars_perihelion'],
        'fluctuation_col': CSV_COLS['mars_fluctuation'],
    },
    'jupiter': {
        'name': 'Jupiter',
        'period': JUPITER_PERIOD,
        'coeffs': JUPITER_COEFFS,
        'perihelion_col': CSV_COLS['jupiter_perihelion'],
        'fluctuation_col': CSV_COLS['jupiter_fluctuation'],
    },
    'saturn': {
        'name': 'Saturn',
        'period': SATURN_PERIOD,
        'coeffs': SATURN_COEFFS,
        'perihelion_col': CSV_COLS['saturn_perihelion'],
        'fluctuation_col': CSV_COLS['saturn_fluctuation'],
    },
    'uranus': {
        'name': 'Uranus',
        'period': URANUS_PERIOD,
        'coeffs': URANUS_COEFFS,
        'perihelion_col': CSV_COLS['uranus_perihelion'],
        'fluctuation_col': CSV_COLS['uranus_fluctuation'],
    },
    'neptune': {
        'name': 'Neptune',
        'period': NEPTUNE_PERIOD,
        'coeffs': NEPTUNE_COEFFS,
        'perihelion_col': CSV_COLS['neptune_perihelion'],
        'fluctuation_col': CSV_COLS['neptune_fluctuation'],
    },
}

# =============================================================================
# FEATURE MATRIX BUILDERS
# =============================================================================

def build_feature_matrix_venus(year: int, theta_E: float, erd: float,
                                planet_period: int, planet_perihelion: float,
                                obliquity: float, eccentricity: float) -> List[float]:
    """
    Build V3 feature matrix optimized for Venus (328 terms).

    This achieves RMSE = 9.26 arcsec/century through:
    - Stronger ERD² × Periodic terms
    - Additional non-ERD periodic × angle terms
    - More ERD³ terms
    - EARTH_PERI_3 (6956) specific terms
    """
    theta_E_rad = math.radians(theta_E)
    theta_P_rad = math.radians(planet_perihelion)

    # Derived angles
    diff = theta_E_rad - theta_P_rad
    sum_angle = theta_E_rad + theta_P_rad

    # Normalized Earth parameters
    obliq_norm = obliquity - EARTH_OBLIQ_MEAN
    ecc_norm = eccentricity - EARTH_ECC_MEAN

    # Time offset
    t = year + ANCHOR
    erd2 = erd * erd
    erd3 = erd * erd * erd

    features = []

    # === V2 BASE FEATURES (same as build_feature_matrix) ===

    # === ANGLE TERMS (0-19) ===
    for n in [1, 2, 3, 4]:
        features.append(math.cos(n * diff))
        features.append(math.sin(n * diff))
    features.append(math.cos(sum_angle))
    features.append(math.sin(sum_angle))
    for n in [1, 2]:
        features.append(math.cos(n * theta_E_rad))
        features.append(math.sin(n * theta_E_rad))
    for n in [1, 2]:
        features.append(math.cos(n * theta_P_rad))
        features.append(math.sin(n * theta_P_rad))

    # === OBLIQUITY & ECCENTRICITY TERMS (20-25) ===
    features.append(obliq_norm)
    features.append(ecc_norm)
    features.append(obliq_norm * math.cos(diff))
    features.append(obliq_norm * math.sin(diff))
    features.append(ecc_norm * math.cos(diff))
    features.append(ecc_norm * math.sin(diff))

    # === ERD TERMS (26-37) ===
    features.append(erd)
    features.append(erd2)
    features.append(erd * math.cos(diff))
    features.append(erd * math.sin(diff))
    features.append(erd * math.cos(2 * diff))
    features.append(erd * math.sin(2 * diff))
    features.append(erd * math.cos(sum_angle))
    features.append(erd * math.sin(sum_angle))
    features.append(erd2 * math.cos(diff))
    features.append(erd2 * math.sin(diff))
    features.append(erd3)
    features.append(erd2 * math.cos(2 * diff))

    # === PERIODIC TERMS (38-59) ===
    periods = [
        planet_period, H, EARTH_PERI_PERIOD, EARTH_PERI_2, EARTH_PERI_3,
        OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_4, H_DIV_5, H_DIV_12, H_DIV_13
    ]
    for p in periods:
        phase = 2 * math.pi * t / p
        features.append(math.sin(phase))
        features.append(math.cos(phase))

    # === ERD × PERIODIC (60-81) ===
    for p in periods:
        phase = 2 * math.pi * t / p
        features.append(erd * math.sin(phase))
        features.append(erd * math.cos(phase))

    # === ERD² × PERIODIC (82-93) ===
    erd2_periods = [planet_period, H, EARTH_PERI_PERIOD, OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_5]
    for p in erd2_periods:
        phase = 2 * math.pi * t / p
        features.append(erd2 * math.sin(phase))
        features.append(erd2 * math.cos(phase))

    # === PERIODIC × ANGLE (94-117) ===
    angle_periods = [EARTH_PERI_PERIOD, EARTH_PERI_2, OBLIQ_CYCLE, INCLIN_CYCLE, planet_period, H_DIV_5]
    for p in angle_periods:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(diff))
        features.append(sin_p * math.sin(diff))
        features.append(cos_p * math.cos(diff))
        features.append(cos_p * math.sin(diff))

    # === ERD × PERIODIC × ANGLE (118-133) ===
    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(diff))
        features.append(erd * sin_p * math.sin(diff))
        features.append(erd * cos_p * math.cos(diff))
        features.append(erd * cos_p * math.sin(diff))

    # === PERIODIC × 2δ (134-149) ===
    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(2 * diff))
        features.append(sin_p * math.sin(2 * diff))
        features.append(cos_p * math.cos(2 * diff))
        features.append(cos_p * math.sin(2 * diff))

    # === ERD × PERIODIC × 2δ (150-165) ===
    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(2 * diff))
        features.append(erd * sin_p * math.sin(2 * diff))
        features.append(erd * cos_p * math.cos(2 * diff))
        features.append(erd * cos_p * math.sin(2 * diff))

    # === CONSTANT (166) ===
    features.append(1.0)

    # === V2 ADDITIONS (167-226) ===

    # 3δ terms
    for p in [EARTH_PERI_PERIOD, planet_period]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(3 * diff))
        features.append(erd * sin_p * math.sin(3 * diff))
        features.append(erd * cos_p * math.cos(3 * diff))
        features.append(erd * cos_p * math.sin(3 * diff))

    # Beat frequencies
    if planet_period != EARTH_PERI_PERIOD:
        beat1 = abs(planet_period * EARTH_PERI_PERIOD // (planet_period - EARTH_PERI_PERIOD))
        beat2 = planet_period * EARTH_PERI_PERIOD // (planet_period + EARTH_PERI_PERIOD)
        for beat in [beat1, beat2]:
            if beat > 0 and beat < 10 * H:
                phase = 2 * math.pi * t / beat
                features.append(math.sin(phase))
                features.append(math.cos(phase))
                features.append(erd * math.sin(phase))
                features.append(erd * math.cos(phase))
                features.append(erd * math.sin(phase) * math.cos(diff))
                features.append(erd * math.cos(phase) * math.cos(diff))

    # EARTH_PERI_3 × angle
    for n_diff in [1, 2, 3]:
        phase = 2 * math.pi * t / EARTH_PERI_3
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(n_diff * diff))
        features.append(erd * sin_p * math.sin(n_diff * diff))
        features.append(erd * cos_p * math.cos(n_diff * diff))
        features.append(erd * cos_p * math.sin(n_diff * diff))

    # H/4 × angle
    phase = 2 * math.pi * t / H_DIV_4
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    for n_diff in [1, 2]:
        features.append(erd * sin_p * math.cos(n_diff * diff))
        features.append(erd * sin_p * math.sin(n_diff * diff))
        features.append(erd * cos_p * math.cos(n_diff * diff))
        features.append(erd * cos_p * math.sin(n_diff * diff))

    # H/13 × angle
    phase = 2 * math.pi * t / H_DIV_13
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    for n_diff in [1, 2]:
        features.append(erd * sin_p * math.cos(n_diff * diff))
        features.append(erd * sin_p * math.sin(n_diff * diff))
        features.append(erd * cos_p * math.cos(n_diff * diff))
        features.append(erd * cos_p * math.sin(n_diff * diff))

    # Sum angle combinations
    for p in [EARTH_PERI_PERIOD, planet_period]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(sum_angle))
        features.append(sin_p * math.sin(sum_angle))
        features.append(cos_p * math.cos(sum_angle))
        features.append(cos_p * math.sin(sum_angle))

    # ERD³ terms
    features.append(erd3 * math.cos(diff))
    features.append(erd3 * math.sin(diff))
    features.append(erd3 * math.sin(2 * math.pi * t / EARTH_PERI_PERIOD))
    features.append(erd3 * math.cos(2 * math.pi * t / EARTH_PERI_PERIOD))

    # === V3_VENUS ADDITIONS ===

    # ERD² × EARTH_PERI_3 (6956)
    phase = 2 * math.pi * t / EARTH_PERI_3
    features.append(erd2 * math.sin(phase))
    features.append(erd2 * math.cos(phase))

    # ERD² × H_DIV_4 (83472)
    phase = 2 * math.pi * t / H_DIV_4
    features.append(erd2 * math.sin(phase))
    features.append(erd2 * math.cos(phase))

    # ERD² × EARTH_PERI_4 (5217)
    EARTH_PERI_4 = H // 64
    phase = 2 * math.pi * t / EARTH_PERI_4
    features.append(erd2 * math.sin(phase))
    features.append(erd2 * math.cos(phase))

    # NON-ERD PERIODIC × ANGLE TERMS for EARTH_PERI_3
    phase = 2 * math.pi * t / EARTH_PERI_3
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))
    features.append(sin_p * math.cos(3 * diff))
    features.append(sin_p * math.sin(3 * diff))
    features.append(cos_p * math.cos(3 * diff))
    features.append(cos_p * math.sin(3 * diff))

    # ERD × EARTH_PERI_3 × ANGLE TERMS
    features.append(erd * sin_p * math.cos(diff))
    features.append(erd * sin_p * math.sin(diff))
    features.append(erd * cos_p * math.cos(diff))
    features.append(erd * cos_p * math.sin(diff))
    features.append(erd * sin_p * math.cos(2 * diff))
    features.append(erd * sin_p * math.sin(2 * diff))
    features.append(erd * cos_p * math.cos(2 * diff))
    features.append(erd * cos_p * math.sin(2 * diff))
    features.append(erd * sin_p * math.cos(3 * diff))
    features.append(erd * sin_p * math.sin(3 * diff))
    features.append(erd * cos_p * math.cos(3 * diff))
    features.append(erd * cos_p * math.sin(3 * diff))

    # ERD² × ANGLE TERMS
    features.append(erd2 * math.cos(diff))
    features.append(erd2 * math.sin(diff))
    features.append(erd2 * math.cos(2 * diff))
    features.append(erd2 * math.sin(2 * diff))
    features.append(erd2 * math.cos(3 * diff))
    features.append(erd2 * math.sin(3 * diff))

    # ERD² × PERIODIC × ANGLE TERMS for EARTH_PERI_PERIOD
    phase = 2 * math.pi * t / EARTH_PERI_PERIOD
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(erd2 * sin_p * math.cos(diff))
    features.append(erd2 * sin_p * math.sin(diff))
    features.append(erd2 * cos_p * math.cos(diff))
    features.append(erd2 * cos_p * math.sin(diff))

    # ERD² × PERIODIC × ANGLE TERMS for VENUS_PERIOD
    phase = 2 * math.pi * t / VENUS_PERIOD
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(erd2 * sin_p * math.cos(diff))
    features.append(erd2 * sin_p * math.sin(diff))
    features.append(erd2 * cos_p * math.cos(diff))
    features.append(erd2 * cos_p * math.sin(diff))

    # Additional ERD³ TERMS
    features.append(erd3)
    features.append(erd3 * math.cos(2 * diff))
    features.append(erd3 * math.sin(2 * diff))
    features.append(erd3 * math.cos(3 * diff))
    features.append(erd3 * math.sin(3 * diff))

    # ERD³ × periodic
    for p in [EARTH_PERI_PERIOD, VENUS_PERIOD]:
        phase = 2 * math.pi * t / p
        features.append(erd3 * math.sin(phase))
        features.append(erd3 * math.cos(phase))

    # NON-ERD PERIODIC × 3δ TERMS
    for p in [EARTH_PERI_PERIOD, VENUS_PERIOD, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(3 * diff))
        features.append(sin_p * math.sin(3 * diff))
        features.append(cos_p * math.cos(3 * diff))
        features.append(cos_p * math.sin(3 * diff))

    # 4δ HARMONIC TERMS
    features.append(math.cos(4 * diff))
    features.append(math.sin(4 * diff))
    features.append(erd * math.cos(4 * diff))
    features.append(erd * math.sin(4 * diff))

    # ERD² × OBLIQ_CYCLE (H/8)
    phase = 2 * math.pi * t / OBLIQ_CYCLE
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(erd2 * sin_p)
    features.append(erd2 * cos_p)
    features.append(erd2 * sin_p * math.cos(diff))
    features.append(erd2 * sin_p * math.sin(diff))
    features.append(erd2 * cos_p * math.cos(diff))
    features.append(erd2 * cos_p * math.sin(diff))

    # ERD² × H
    phase = 2 * math.pi * t / H
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(erd2 * sin_p * math.cos(diff))
    features.append(erd2 * sin_p * math.sin(diff))
    features.append(erd2 * cos_p * math.cos(diff))
    features.append(erd2 * cos_p * math.sin(diff))

    # ERD² × INCLIN_CYCLE (H/3)
    phase = 2 * math.pi * t / INCLIN_CYCLE
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(erd2 * sin_p * math.cos(diff))
    features.append(erd2 * sin_p * math.sin(diff))
    features.append(erd2 * cos_p * math.cos(diff))
    features.append(erd2 * cos_p * math.sin(diff))

    # ERD × obliq/ecc × angle
    features.append(erd * obliq_norm * math.cos(diff))
    features.append(erd * obliq_norm * math.sin(diff))
    features.append(erd * ecc_norm * math.cos(diff))
    features.append(erd * ecc_norm * math.sin(diff))
    features.append(erd * obliq_norm * math.cos(2 * diff))
    features.append(erd * obliq_norm * math.sin(2 * diff))

    # ERD² × obliq/ecc
    features.append(erd2 * obliq_norm)
    features.append(erd2 * ecc_norm)

    # ERD × periodic × 4δ
    for p in [EARTH_PERI_PERIOD, VENUS_PERIOD]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(4 * diff))
        features.append(erd * sin_p * math.sin(4 * diff))
        features.append(erd * cos_p * math.cos(4 * diff))
        features.append(erd * cos_p * math.sin(4 * diff))

    # ERD × EARTH_PERI_2 × 3δ
    phase = 2 * math.pi * t / EARTH_PERI_2
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    features.append(erd * sin_p * math.cos(3 * diff))
    features.append(erd * sin_p * math.sin(3 * diff))
    features.append(erd * cos_p * math.cos(3 * diff))
    features.append(erd * cos_p * math.sin(3 * diff))

    return features


def build_feature_matrix(year: int, theta_E: float, erd: float,
                         planet_period: int, planet_perihelion: float,
                         obliquity: float, eccentricity: float) -> List[float]:
    """
    Build feature matrix for planet precession prediction.

    This is the V2 feature matrix with 225 terms, matching the fitting script.

    Args:
        year: The year to calculate for
        theta_E: Earth's perihelion longitude (degrees)
        erd: Earth Rate Deviation (degrees/year)
        planet_period: Planet's perihelion precession period (years)
        planet_perihelion: Observed planet perihelion longitude (degrees)
        obliquity: Earth's obliquity (degrees)
        eccentricity: Earth's eccentricity

    Returns:
        List of 225 feature values
    """
    theta_E_rad = math.radians(theta_E)
    theta_P_rad = math.radians(planet_perihelion)

    # Derived angles
    diff = theta_E_rad - theta_P_rad
    sum_angle = theta_E_rad + theta_P_rad

    # Normalized Earth parameters
    obliq_norm = obliquity - EARTH_OBLIQ_MEAN
    ecc_norm = eccentricity - EARTH_ECC_MEAN

    # Time offset
    t = year + ANCHOR

    features = []

    # === V1 FEATURES (0-164) ===

    # === ANGLE TERMS (0-19) ===
    # Difference harmonics
    for n in [1, 2, 3, 4]:
        features.append(math.cos(n * diff))
        features.append(math.sin(n * diff))

    # Sum angle
    features.append(math.cos(sum_angle))
    features.append(math.sin(sum_angle))

    # Earth angle harmonics
    for n in [1, 2]:
        features.append(math.cos(n * theta_E_rad))
        features.append(math.sin(n * theta_E_rad))

    # Planet angle harmonics
    for n in [1, 2]:
        features.append(math.cos(n * theta_P_rad))
        features.append(math.sin(n * theta_P_rad))

    # === OBLIQUITY & ECCENTRICITY TERMS (20-25) ===
    features.append(obliq_norm)
    features.append(ecc_norm)
    features.append(obliq_norm * math.cos(diff))
    features.append(obliq_norm * math.sin(diff))
    features.append(ecc_norm * math.cos(diff))
    features.append(ecc_norm * math.sin(diff))

    # === ERD TERMS (26-37) ===
    features.append(erd)
    features.append(erd * erd)
    features.append(erd * math.cos(diff))
    features.append(erd * math.sin(diff))
    features.append(erd * math.cos(2 * diff))
    features.append(erd * math.sin(2 * diff))
    features.append(erd * math.cos(sum_angle))
    features.append(erd * math.sin(sum_angle))
    features.append(erd * erd * math.cos(diff))
    features.append(erd * erd * math.sin(diff))
    features.append(erd * erd * erd)
    features.append(erd * erd * math.cos(2 * diff))

    # === PERIODIC TERMS (38-59) ===
    periods = [
        planet_period, H, EARTH_PERI_PERIOD, EARTH_PERI_2, EARTH_PERI_3,
        OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_4, H_DIV_5, H_DIV_12, H_DIV_13
    ]

    for p in periods:
        phase = 2 * math.pi * t / p
        features.append(math.sin(phase))
        features.append(math.cos(phase))

    # === ERD × PERIODIC (60-81) ===
    for p in periods:
        phase = 2 * math.pi * t / p
        features.append(erd * math.sin(phase))
        features.append(erd * math.cos(phase))

    # === ERD² × PERIODIC (82-93) ===
    erd2_periods = [planet_period, H, EARTH_PERI_PERIOD, OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_5]
    for p in erd2_periods:
        phase = 2 * math.pi * t / p
        features.append(erd * erd * math.sin(phase))
        features.append(erd * erd * math.cos(phase))

    # === PERIODIC × ANGLE (94-117) ===
    angle_periods = [EARTH_PERI_PERIOD, EARTH_PERI_2, OBLIQ_CYCLE, INCLIN_CYCLE, planet_period, H_DIV_5]
    for p in angle_periods:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(diff))
        features.append(sin_p * math.sin(diff))
        features.append(cos_p * math.cos(diff))
        features.append(cos_p * math.sin(diff))

    # === ERD × PERIODIC × ANGLE (118-133) ===
    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(diff))
        features.append(erd * sin_p * math.sin(diff))
        features.append(erd * cos_p * math.cos(diff))
        features.append(erd * cos_p * math.sin(diff))

    # === PERIODIC × 2δ (134-149) ===
    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(2 * diff))
        features.append(sin_p * math.sin(2 * diff))
        features.append(cos_p * math.cos(2 * diff))
        features.append(cos_p * math.sin(2 * diff))

    # === ERD × PERIODIC × 2δ (150-165) ===
    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(2 * diff))
        features.append(erd * sin_p * math.sin(2 * diff))
        features.append(erd * cos_p * math.cos(2 * diff))
        features.append(erd * cos_p * math.sin(2 * diff))

    # === CONSTANT (166) ===
    features.append(1.0)

    # === V2 ADDITIONS (167-224) ===

    # 3δ terms (167-174)
    for p in [EARTH_PERI_PERIOD, planet_period]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(3 * diff))
        features.append(erd * sin_p * math.sin(3 * diff))
        features.append(erd * cos_p * math.cos(3 * diff))
        features.append(erd * cos_p * math.sin(3 * diff))

    # Beat frequencies (175-186)
    if planet_period != EARTH_PERI_PERIOD:
        beat1 = abs(planet_period * EARTH_PERI_PERIOD // (planet_period - EARTH_PERI_PERIOD))
        beat2 = planet_period * EARTH_PERI_PERIOD // (planet_period + EARTH_PERI_PERIOD)

        for beat in [beat1, beat2]:
            if beat > 0 and beat < 10 * H:
                phase = 2 * math.pi * t / beat
                features.append(math.sin(phase))
                features.append(math.cos(phase))
                features.append(erd * math.sin(phase))
                features.append(erd * math.cos(phase))
                features.append(erd * math.sin(phase) * math.cos(diff))
                features.append(erd * math.cos(phase) * math.cos(diff))

    # EARTH_PERI_3 × angle (187-198)
    for n_diff in [1, 2, 3]:
        phase = 2 * math.pi * t / EARTH_PERI_3
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(erd * sin_p * math.cos(n_diff * diff))
        features.append(erd * sin_p * math.sin(n_diff * diff))
        features.append(erd * cos_p * math.cos(n_diff * diff))
        features.append(erd * cos_p * math.sin(n_diff * diff))

    # H/4 × angle (199-206)
    phase = 2 * math.pi * t / H_DIV_4
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    for n_diff in [1, 2]:
        features.append(erd * sin_p * math.cos(n_diff * diff))
        features.append(erd * sin_p * math.sin(n_diff * diff))
        features.append(erd * cos_p * math.cos(n_diff * diff))
        features.append(erd * cos_p * math.sin(n_diff * diff))

    # H/13 × angle (207-214)
    phase = 2 * math.pi * t / H_DIV_13
    sin_p = math.sin(phase)
    cos_p = math.cos(phase)
    for n_diff in [1, 2]:
        features.append(erd * sin_p * math.cos(n_diff * diff))
        features.append(erd * sin_p * math.sin(n_diff * diff))
        features.append(erd * cos_p * math.cos(n_diff * diff))
        features.append(erd * cos_p * math.sin(n_diff * diff))

    # Sum angle combinations (215-222)
    for p in [EARTH_PERI_PERIOD, planet_period]:
        phase = 2 * math.pi * t / p
        sin_p = math.sin(phase)
        cos_p = math.cos(phase)
        features.append(sin_p * math.cos(sum_angle))
        features.append(sin_p * math.sin(sum_angle))
        features.append(cos_p * math.cos(sum_angle))
        features.append(cos_p * math.sin(sum_angle))

    # ERD³ terms (223-226)
    erd3 = erd * erd * erd
    features.append(erd3 * math.cos(diff))
    features.append(erd3 * math.sin(diff))
    features.append(erd3 * math.sin(2 * math.pi * t / EARTH_PERI_PERIOD))
    features.append(erd3 * math.cos(2 * math.pi * t / EARTH_PERI_PERIOD))

    return features

# =============================================================================
# FLUCTUATION CALCULATION
# =============================================================================

def calculate_fluctuation(planet_key: str, year: int, theta_E: float, erd: float,
                          planet_perihelion: float, obliquity: float,
                          eccentricity: float) -> float:
    """
    Calculate precession fluctuation for a planet.

    Args:
        planet_key: Planet identifier ('mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune')
        year: The year to calculate for
        theta_E: Earth's perihelion longitude (degrees)
        erd: Earth Rate Deviation (degrees/year)
        planet_perihelion: Observed planet perihelion longitude (degrees)
        obliquity: Earth's obliquity (degrees)
        eccentricity: Earth's eccentricity

    Returns:
        Precession fluctuation in arcsec/century
    """
    planet = PLANETS[planet_key]

    # Venus uses specialized feature matrix for better accuracy (328 terms)
    if planet_key == 'venus':
        features = build_feature_matrix_venus(
            year, theta_E, erd, planet['period'],
            planet_perihelion, obliquity, eccentricity
        )
    else:
        features = build_feature_matrix(
            year, theta_E, erd, planet['period'],
            planet_perihelion, obliquity, eccentricity
        )

    coeffs = planet['coeffs']
    n_features = min(len(features), len(coeffs))

    return sum(coeffs[i] * features[i] for i in range(n_features))

# =============================================================================
# CSV DATA LOADING
# =============================================================================

def load_csv_data(csv_path: str) -> Dict[int, Dict]:
    """
    Load data from the Holistic Year Objects CSV file.

    Returns:
        Dictionary mapping year to data values
    """
    data = {}

    with open(csv_path, 'r') as f:
        reader = csv.reader(f, delimiter=';')
        header = next(reader)  # Skip header

        for row in reader:
            if len(row) < 84:  # Need all columns
                continue
            try:
                year = int(row[CSV_COLS['year']])
                data[year] = {
                    'theta_E': float(row[CSV_COLS['earth_longitude']].replace(',', '.')),
                    'erd': float(row[CSV_COLS['earth_erd']].replace(',', '.')),
                    'eccentricity': float(row[CSV_COLS['earth_eccentricity']].replace(',', '.')),
                    'obliquity': float(row[CSV_COLS['earth_obliquity']].replace(',', '.')),
                    'mercury_perihelion': float(row[CSV_COLS['mercury_perihelion']].replace(',', '.')),
                    'venus_perihelion': float(row[CSV_COLS['venus_perihelion']].replace(',', '.')),
                    'mars_perihelion': float(row[CSV_COLS['mars_perihelion']].replace(',', '.')),
                    'jupiter_perihelion': float(row[CSV_COLS['jupiter_perihelion']].replace(',', '.')),
                    'saturn_perihelion': float(row[CSV_COLS['saturn_perihelion']].replace(',', '.')),
                    'uranus_perihelion': float(row[CSV_COLS['uranus_perihelion']].replace(',', '.')),
                    'neptune_perihelion': float(row[CSV_COLS['neptune_perihelion']].replace(',', '.')),
                    'mercury_actual': float(row[CSV_COLS['mercury_fluctuation']].replace(',', '.')),
                    'venus_actual': float(row[CSV_COLS['venus_fluctuation']].replace(',', '.')),
                    'mars_actual': float(row[CSV_COLS['mars_fluctuation']].replace(',', '.')),
                    'jupiter_actual': float(row[CSV_COLS['jupiter_fluctuation']].replace(',', '.')),
                    'saturn_actual': float(row[CSV_COLS['saturn_fluctuation']].replace(',', '.')),
                    'uranus_actual': float(row[CSV_COLS['uranus_fluctuation']].replace(',', '.')),
                    'neptune_actual': float(row[CSV_COLS['neptune_fluctuation']].replace(',', '.')),
                }
            except (ValueError, IndexError):
                continue

    return data

def calculate_all_planets(csv_path: str, year: int) -> Optional[Dict[str, float]]:
    """
    Calculate precession fluctuation for all planets at a given year.

    Args:
        csv_path: Path to the CSV data file
        year: The year to calculate for

    Returns:
        Dictionary with calculated values for each planet, or None if year not in data
    """
    data = load_csv_data(csv_path)

    if year not in data:
        return None

    row = data[year]
    results = {}

    for planet_key in PLANETS:
        peri_key = f"{planet_key}_perihelion"
        results[planet_key] = calculate_fluctuation(
            planet_key, year,
            row['theta_E'], row['erd'],
            row[peri_key], row['obliquity'], row['eccentricity']
        )

    return results

# =============================================================================
# VALIDATION
# =============================================================================

def validate_formulas(csv_path: str) -> Dict[str, Dict]:
    """
    Validate formulas against actual CSV data.

    Returns:
        Dictionary with RMSE, R², and max error for each planet
    """
    data = load_csv_data(csv_path)

    results = {}

    for planet_key in PLANETS:
        actual_values = []
        predicted_values = []

        peri_key = f"{planet_key}_perihelion"
        actual_key = f"{planet_key}_actual"

        for year, row in data.items():
            actual = row[actual_key]
            predicted = calculate_fluctuation(
                planet_key, year,
                row['theta_E'], row['erd'],
                row[peri_key], row['obliquity'], row['eccentricity']
            )
            actual_values.append(actual)
            predicted_values.append(predicted)

        # Calculate metrics
        n = len(actual_values)
        if n == 0:
            continue

        # RMSE
        sse = sum((a - p) ** 2 for a, p in zip(actual_values, predicted_values))
        rmse = math.sqrt(sse / n)

        # R²
        mean_actual = sum(actual_values) / n
        ss_tot = sum((a - mean_actual) ** 2 for a in actual_values)
        r2 = 1 - sse / ss_tot if ss_tot > 0 else 0

        # Max error
        max_error = max(abs(a - p) for a, p in zip(actual_values, predicted_values))

        results[planet_key] = {
            'rmse': rmse,
            'r2': r2,
            'max_error': max_error,
            'n_points': n,
        }

    return results

# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    import sys

    # Find CSV file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, 'holistic-year-objects-data.csv')

    if not os.path.exists(csv_path):
        print(f"ERROR: Cannot find CSV file at {csv_path}")
        sys.exit(1)

    print("=" * 70)
    print("OBSERVED PRECESSION FLUCTUATION FORMULAS")
    print("=" * 70)
    print()
    print(f"Master cycle H = {H:,} years")
    print(f"CSV file: {os.path.basename(csv_path)}")
    print()

    # Print planetary periods
    print("Planetary Periods:")
    print(f"  Mercury:  {MERCURY_PERIOD:>7,} years (H × 8/11)")
    print(f"  Venus:    {VENUS_PERIOD:>7,} years (H × 2)")
    print(f"  Mars:     {MARS_PERIOD:>7,} years (H × 3/13)")
    print(f"  Jupiter:  {JUPITER_PERIOD:>7,} years (H/5)")
    print(f"  Saturn:   {SATURN_PERIOD:>7,} years (H/8, retrograde)")
    print(f"  Uranus:   {URANUS_PERIOD:>7,} years (H/3)")
    print(f"  Neptune:  {NEPTUNE_PERIOD:>7,} years (H × 2)")
    print()

    # Validate formulas
    print("Validating formulas against CSV data...")
    print()

    results = validate_formulas(csv_path)

    print("=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)
    print()
    print(f"{'Planet':<10} {'RMSE (″/cy)':<15} {'R²':<12} {'Max Error':<12} {'Points'}")
    print("-" * 70)

    for planet_key in ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']:
        r = results[planet_key]
        print(f"{PLANETS[planet_key]['name']:<10} {r['rmse']:<15.4f} {r['r2']:<12.6f} {r['max_error']:<12.4f} {r['n_points']}")

    print()

    # Example calculations for year 2022
    print("=" * 70)
    print("EXAMPLE: Year 2022 Calculations")
    print("=" * 70)
    print()

    data = load_csv_data(csv_path)
    if 2022 in data:
        row = data[2022]
        print(f"Earth longitude: {row['theta_E']:.4f}°")
        print(f"Earth ERD: {row['erd']:.6f}°/year")
        print(f"Earth obliquity: {row['obliquity']:.4f}°")
        print(f"Earth eccentricity: {row['eccentricity']:.6f}")
        print()

        print(f"{'Planet':<10} {'Perihelion':<12} {'Calculated':<15} {'Actual':<15} {'Error'}")
        print("-" * 70)

        for planet_key in ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']:
            peri = row[f"{planet_key}_perihelion"]
            actual = row[f"{planet_key}_actual"]
            predicted = calculate_fluctuation(
                planet_key, 2022,
                row['theta_E'], row['erd'],
                peri, row['obliquity'], row['eccentricity']
            )
            error = predicted - actual
            print(f"{PLANETS[planet_key]['name']:<10} {peri:<12.4f} {predicted:<15.4f} {actual:<15.4f} {error:+.4f}")
    else:
        print("Year 2022 not found in CSV data")

    print()
    print("Done!")

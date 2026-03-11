#!/usr/bin/env python3
"""
HOLISTIC UNIVERSE MODEL — PREDICTIVE FORMULA SYSTEM
=====================================================

Deterministic formulas for calculating all Holistic Universe Model values
from a single input: YEAR. No observations required.

SECTIONS:
  A. Fundamental Constants & Derived Periods
  B. Planet Configurations
  C. Earth — Orbital Elements (obliquity, eccentricity, inclination,
     perihelion longitude, ERD)
  D. Planet Perihelion Calculation
  E. Earth — Time Periods (solar year, sidereal year, day length,
     sidereal day, stellar day)
  F. Earth — Precession Periods (axial, perihelion, inclination)
  G. Unified Feature Matrix (273-term precession prediction)
  H. Prediction Functions

Adding new formula categories:
  - Insert a new lettered section between existing ones
  - Constants go in Section A; the formula function goes in its own section
  - This keeps the file extensible without reordering existing code

Author: Holistic Universe Model
License: MIT
"""

import math
from typing import List, Tuple, Dict

from constants_scripts import (
    H, BALANCE_YEAR, EARTH_BASE_ECCENTRICITY, EARTH_ECCENTRICITY_AMPLITUDE,
    EARTH_OBLIQUITY_MEAN, EARTH_INCLINATION_MEAN, EARTH_INCLINATION_AMPLITUDE,
    _SIDEREAL_YEAR_S, _MEAN_SOLAR_YEAR_DAYS, _MEAN_SIDEREAL_YEAR_DAYS,
    _MEAN_LENGTH_OF_DAY, _MEAN_ANOM_YEAR_DAYS, _ECCENTRICITY_DERIVED_MEAN,
    TROPICAL_YEAR_HARMONICS, SIDEREAL_YEAR_HARMONICS, ANOMALISTIC_YEAR_HARMONICS,
)

# =============================================================================
# SECTION A: FUNDAMENTAL CONSTANTS
# =============================================================================

ANCHOR_YEAR = BALANCE_YEAR      # from constants_scripts (1246 - 14.5*(H/16))
J2000 = 2000                    # J2000 epoch (perihelion reference)

# --- Day & Year constants (all derived in constants_scripts) ---
MEAN_SOLAR_YEAR_DAYS = _MEAN_SOLAR_YEAR_DAYS
SIDEREAL_YEAR_SECONDS = _SIDEREAL_YEAR_S
MEAN_DAY_LENGTH = _MEAN_LENGTH_OF_DAY
MEAN_ANOM_YEAR_DAYS = _MEAN_ANOM_YEAR_DAYS

# --- RA solar day offset (measured, Fourier fit) ---
# Confirmed by "Solar day multiepoch" test: 65 epochs spanning one full H.
# Offset is relative to meanlengthofday (= MEAN_DAY_LENGTH).
# Mean of -14.194 ms has no known physical explanation.
RA_SOLAR_DAY_OFFSET_MEAN_MS  = -14.194   # ms/day, unknown cause
RA_SOLAR_DAY_OFFSET_ECC_MS   =  -5.640   # ms/day amplitude at period H/16 (eccentricity)
RA_SOLAR_DAY_OFFSET_OBLIQ_MS =  -1.684   # ms/day amplitude at period H/8  (obliquity)

# --- Year-length Fourier means (derived, not fitted) ---
# tropical = round(input × H/16) / (H/16)
# sidereal = tropical × H / (H - 13)
# anomalistic = tropical × H / (H - 16)
TROPICAL_YEAR_MEAN = _MEAN_SOLAR_YEAR_DAYS
SIDEREAL_YEAR_MEAN = _MEAN_SIDEREAL_YEAR_DAYS
ANOMALISTIC_YEAR_MEAN = _MEAN_ANOM_YEAR_DAYS

# --- Earth parameters (from constants_scripts) ---
EARTH_INCLIN_MEAN = EARTH_INCLINATION_MEAN
EARTH_INCLIN_AMPL = EARTH_INCLINATION_AMPLITUDE

# =============================================================================
# SECTION A (cont.): DERIVED PERIODS (all from H)
# =============================================================================

# Earth cycles
EARTH_PERI_PERIOD = H / 16      # H/16 - perihelion precession
EARTH_PERI_2 = H / 32           # H/32 - 2nd harmonic
EARTH_PERI_3 = H / 48           # H/48 - 3rd harmonic
EARTH_PERI_4 = H / 64           # H/64 - 4th harmonic
OBLIQ_CYCLE = H / 8             # H/8 - obliquity
INCLIN_CYCLE = H / 3            # H/3 - inclination

# Additional periods
H_DIV_4 = H / 4                 # H/4
H_DIV_5 = H / 5                 # H/5
H_DIV_12 = H / 12               # H/12
H_DIV_13 = H / 13               # H/13 (axial precession)
H_DIV_24 = H / 24               # H/24
H_DIV_29 = H / 29               # H/29
H_DIV_40 = H / 40               # H/40

# Additional periods for Venus accuracy
H_DIV_21 = H / 21               # H/21
H_DIV_55 = H / 55               # H/55
H_DIV_77 = H / 77               # H/77
H_DIV_78 = H / 78               # H/78
H_DIV_80 = H / 80               # H/80 (5th harmonic of Earth perihelion)
H_DIV_94 = H / 94               # H/94

# =============================================================================
# SECTION B: PLANET CONFIGURATIONS
# Planet periods derived from H using Fibonacci-related fractions
# THETA0 = official J2000 perihelion longitude
# =============================================================================

PLANETS = {
    'mercury': {
        'name': 'Mercury',
        'period': H * 8 / 11,       # H × 8/11
        'theta0': 77.4569131,       # J2000 perihelion longitude
        'baseline': 1296000 / (H * 8 / 11) * 100,
    },
    'venus': {
        'name': 'Venus',
        'period': H * 2,            # H × 2
        'theta0': 131.5765919,
        'baseline': 1296000 / (H * 2) * 100,
    },
    'mars': {
        'name': 'Mars',
        'period': H * 3 / 13,       # H × 3/13
        'theta0': 336.0650681,
        'baseline': 1296000 / (H * 3 / 13) * 100,
    },
    'jupiter': {
        'name': 'Jupiter',
        'period': H / 5,            # H/5
        'theta0': 14.70659401,
        'baseline': 1296000 / (H / 5) * 100,
    },
    'saturn': {
        'name': 'Saturn',
        'period': H / 8,            # H/8 (retrograde, = obliquity cycle)
        'theta0': 92.12794343,
        'baseline': -1296000 / (H / 8) * 100,
        # Note: Saturn's period equals the obliquity cycle, creating strong
        # coupling with Earth's obliquity/eccentricity variations (GROUP 15)
    },
    'uranus': {
        'name': 'Uranus',
        'period': H / 3,            # H/3
        'theta0': 170.7308251,
        'baseline': 1296000 / (H / 3) * 100,
    },
    'neptune': {
        'name': 'Neptune',
        'period': H * 2,            # H × 2
        'theta0': 45.80124471,
        'baseline': 1296000 / (H * 2) * 100,
    },
}

# Earth mean values for normalization (from constants_scripts, sourced from constants.js)
EARTH_OBLIQ_MEAN = EARTH_OBLIQUITY_MEAN
EARTH_ECC_BASE = EARTH_BASE_ECCENTRICITY
EARTH_ECC_AMP  = EARTH_ECCENTRICITY_AMPLITUDE
EARTH_ECC_MEAN = _ECCENTRICITY_DERIVED_MEAN

# Earth perihelion harmonics (for perihelion and ERD calculation)
PERI_HARMONICS = [
    (EARTH_PERI_PERIOD, 4.8906, -0.0223),
    (EARTH_PERI_2, 2.6637, 0.2477),
    (EARTH_PERI_3, 0.2217, 0.0202),
    (EARTH_PERI_4, 0.0708, 0.0123),
    (INCLIN_CYCLE, -0.1318, 0.0073),
    (OBLIQ_CYCLE, 0.1200, -0.0078),
    (H_DIV_29, -0.1309, -0.0060),
    (H_DIV_24, 0.1303, 0.0060),
    (H_DIV_40, 0.0163, 0.0007),
    (H_DIV_13, 0.0118, 0.0005),
    (H_DIV_80, 0.0105, 0.0019),
]
PERI_OFFSET = -0.2608

# =============================================================================
# SECTION C: EARTH ORBITAL PARAMETERS
# Obliquity, eccentricity, inclination, perihelion longitude, ERD
# =============================================================================

def time_offset(year: int) -> float:
    """Time relative to ANCHOR_YEAR (for periodic terms)."""
    return year - ANCHOR_YEAR


def calc_earth_perihelion(year: int) -> float:
    """Calculate Earth's perihelion longitude at given year (degrees)."""
    t = time_offset(year)
    mean_rate = 360.0 / EARTH_PERI_PERIOD
    longitude = 270.0 + mean_rate * t

    for period, sin_c, cos_c in PERI_HARMONICS:
        phase = 2 * math.pi * t / period
        longitude += sin_c * math.sin(phase) + cos_c * math.cos(phase)

    return (longitude + PERI_OFFSET) % 360


def calc_erd(year: int) -> float:
    """
    Calculate Earth Rate Deviation (analytical derivative of perihelion).

    For harmonic A*sin(ωt) + B*cos(ωt), derivative is:
        A*ω*cos(ωt) - B*ω*sin(ωt)

    Returns: ERD in degrees/year
    """
    t = time_offset(year)
    erd = 0.0

    for period, sin_c, cos_c in PERI_HARMONICS:
        omega = 2 * math.pi / period
        phase = omega * t
        erd += sin_c * omega * math.cos(phase) - cos_c * omega * math.sin(phase)

    return erd


def calc_obliquity(year: int) -> float:
    """Calculate Earth's obliquity at given year (degrees)."""
    t = time_offset(year)
    obliq = EARTH_OBLIQ_MEAN
    obliq -= EARTH_INCLIN_AMPL * math.cos(2 * math.pi * t / INCLIN_CYCLE)
    obliq += EARTH_INCLIN_AMPL * math.cos(2 * math.pi * t / OBLIQ_CYCLE)
    return obliq


def calc_eccentricity(year: int) -> float:
    """Calculate Earth's orbital eccentricity at given year.

    Formula: e(t) = e₀ + (-A - (e₀ - e_base)·cos(φ))·cos(φ)
    where e₀ = sqrt(e_base² + A²), e_base = 0.015372, A = 0.00137032
    Only 2 free parameters: extremes are exactly e_base ± A.
    """
    t = time_offset(year)
    cos_phi = math.cos(2 * math.pi * t / EARTH_PERI_PERIOD)
    h1 = EARTH_ECC_MEAN - EARTH_ECC_BASE
    return EARTH_ECC_MEAN + (-EARTH_ECC_AMP - h1 * cos_phi) * cos_phi


def calc_inclination(year: int) -> float:
    """
    Calculate Earth's orbital inclination to the invariable plane (degrees).

    Formula: I(t) = I₀ - A·cos(2πt / T_I)

    The inclination and obliquity share the same amplitude (A = 0.634°) because
    they are geometrically coupled — as Earth's orbital plane tilts relative to
    the invariable plane, the obliquity changes by the same amount.
    """
    t = time_offset(year)
    return EARTH_INCLIN_MEAN - EARTH_INCLIN_AMPL * math.cos(
        2 * math.pi * t / INCLIN_CYCLE
    )


# =============================================================================
# SECTION D: PLANET PERIHELION CALCULATION
# =============================================================================

def calc_planet_perihelion(theta0: float, period: float, year: int) -> float:
    """
    Calculate planet's perihelion longitude at given year.

    Formula: θ(t) = θ₀ + 360° × (year - J2000) / T

    Args:
        theta0: J2000 perihelion longitude (degrees)
        period: Precession period (years)
        year: Calendar year

    Returns: Perihelion longitude in degrees [0, 360)
    """
    return (theta0 + 360.0 * (year - J2000) / period) % 360


# =============================================================================
# SECTION E: DAY & YEAR LENGTHS
# Solar year, sidereal year, day length, sidereal day, stellar day —
# all derived from obliquity and eccentricity formulas above.
# =============================================================================

def _eval_fourier(t: float, mean: float,
                   harmonics: list) -> float:
    """Evaluate a Fourier harmonic series: mean + Σ(sin_c·sin(2πt/T) + cos_c·cos(2πt/T))."""
    result = mean
    for period, sin_c, cos_c in harmonics:
        phase = 2 * math.pi * t / period
        result += sin_c * math.sin(phase) + cos_c * math.cos(phase)
    return result


def calc_solar_year(year: int) -> float:
    """
    Calculate the length of the solar (tropical) year in days.

    Fourier harmonic formula (March 2026):
      Y_solar(t) = mean + Σ harmonics at H/8, H/3, H/16
      where t = year - ANCHOR_YEAR

    Fitted from 491 data points spanning the full Holistic Year.
    RMS = 0.003 seconds.  Dominant term: H/8 (obliquity cycle, 1.82s).
    """
    t = time_offset(year)
    return _eval_fourier(t, TROPICAL_YEAR_MEAN, TROPICAL_YEAR_HARMONICS)


def calc_sidereal_year(year: int) -> float:
    """
    Calculate the length of the sidereal year in days.

    Fourier harmonic formula (March 2026):
      Y_sid(t) = mean + Σ harmonics at H/8, H/3
      where t = year - ANCHOR_YEAR

    Fitted from 491 data points spanning the full Holistic Year.
    RMS = 0.0002 seconds.  Both terms ~0.09s amplitude.
    """
    t = time_offset(year)
    return _eval_fourier(t, SIDEREAL_YEAR_MEAN, SIDEREAL_YEAR_HARMONICS)


def calc_day_length(year: int) -> float:
    """
    Calculate the length of a day in SI seconds.

    Formula: D = Y_sid(seconds) / Y_sid(days)

    The sidereal year in SI seconds is fixed (31,558,149.724 s).
    As the sidereal year in days changes, the day length adjusts
    accordingly.
    """
    sid_days = calc_sidereal_year(year)
    return SIDEREAL_YEAR_SECONDS / sid_days


def calc_measured_solar_day(year: int) -> float:
    """
    Calculate the RA-measured solar day length in SI seconds.

    RA-based measurements (Methods A and D) consistently show the solar day
    shorter than meanlengthofday by a Fourier-modulated offset:

      offset(t) = −14.194 − 5.640·cos(2π·t/(H/16)) − 1.684·cos(2π·t/(H/8))  [ms/day]

    where t = year − ANCHOR_YEAR.

    Confirmed by "Solar day multiepoch" test across 65 epochs spanning one H.
    Regression: R² = 0.994, RMS = 0.324 ms.

    Component summary:
      Mean (−14.194 ms): constant offset, physical cause unknown.
      H/16 term (±5.640 ms): modulated by eccentricity (perihelion precession).
      H/8  term (∓1.684 ms): modulated by obliquity (obliquity cycle).
    """
    t = time_offset(year)
    offset_ms = (
        RA_SOLAR_DAY_OFFSET_MEAN_MS
        + RA_SOLAR_DAY_OFFSET_ECC_MS   * math.cos(2 * math.pi * t / EARTH_PERI_PERIOD)
        + RA_SOLAR_DAY_OFFSET_OBLIQ_MS * math.cos(2 * math.pi * t / OBLIQ_CYCLE)
    )
    return calc_day_length(year) + offset_ms / 1000.0


def calc_solar_year_seconds(year: int) -> float:
    """
    Calculate the length of the solar (tropical) year in SI seconds.

    Formula: Y_solar(s) = Y_solar(days) × D(s)
    """
    return calc_solar_year(year) * calc_day_length(year)


def calc_sidereal_year_seconds(year: int) -> float:
    """
    Calculate the length of the sidereal year in SI seconds.

    The sidereal year in SI seconds is fixed at 31,558,149.724 s.
    This function exists for API consistency so that all year-length
    outputs are available in the same units.
    """
    return SIDEREAL_YEAR_SECONDS


def calc_anomalistic_year(year: int) -> float:
    """
    Calculate the length of the anomalistic year in days.

    Fourier harmonic formula (March 2026):
      Y_anom(t) = mean + Σ harmonics at H/8, H/3, H/16, H/24
      where t = year - ANCHOR_YEAR

    Fitted from 491 data points spanning the full Holistic Year.
    RMS = 0.002 seconds.  Dominant term: H/3 (inclination cycle, 0.17s).
    H/24 = H/(3×8) is the beat frequency between H/3 and H/8.
    """
    t = time_offset(year)
    return _eval_fourier(t, ANOMALISTIC_YEAR_MEAN, ANOMALISTIC_YEAR_HARMONICS)


def calc_anomalistic_year_seconds(year: int) -> float:
    """
    Calculate the length of the anomalistic year in SI seconds.

    Formula: Y_anom(s) = Y_anom(days) × D(s)

    Uses the Fourier-based anomalistic year in days multiplied by the
    current day length.
    """
    return calc_anomalistic_year(year) * calc_day_length(year)


def calc_sidereal_day(year: int) -> float:
    """
    Calculate the length of the sidereal day in SI seconds.

    Formula: D_sid = Y_solar(s) / (Y_solar(s) / 86400 + 1)

    Based on 86400-second solar days. The sidereal day is the time for
    one full rotation relative to the stars — slightly shorter than the
    solar day because the Earth must rotate an extra ~1° per day to
    compensate for its orbital motion.
    """
    sy_s = calc_solar_year_seconds(year)
    return sy_s / (sy_s / 86400 + 1)


def calc_stellar_day(year: int) -> float:
    """
    Calculate the length of the stellar day in SI seconds.

    Formula: D_star = ((Y_solar(s) / (Y_solar(days) + 1)) / (H/13))
                      / (Y_solar(days) + 1) + D_sid

    Based on 86400-second solar days. The stellar day accounts for
    the additional precession correction beyond the sidereal day.
    """
    sy_s = calc_solar_year_seconds(year)
    sy_d = calc_solar_year(year)
    sid_day = calc_sidereal_day(year)
    return ((sy_s / (sy_d + 1)) / (H / 13)) / (sy_d + 1) + sid_day


# =============================================================================
# SECTION F: PRECESSION DURATIONS
# Axial, perihelion, and inclination precession periods — all derived
# from the coin rotation paradox applied to different year types.
# =============================================================================

def calc_axial_precession(year: int) -> float:
    """
    Calculate the axial precession period in years.

    Formula: P_A = Y_sid / (Y_sid - Y_solar)

    Coin rotation paradox: the precession period equals the sidereal year
    divided by the difference between sidereal and solar years.
    At the mean: H/13.
    """
    sid = calc_sidereal_year(year)
    sol = calc_solar_year(year)
    return sid / (sid - sol)


def calc_perihelion_precession(year: int) -> float:
    """
    Calculate the perihelion precession period in years.

    Formula: P_P = Y_anom(s) / (Y_anom(s) - Y_solar(s))

    Coin rotation paradox applied to the anomalistic and solar years
    in seconds. At the mean: H/16.
    """
    anom_s = calc_anomalistic_year_seconds(year)
    sol_s = calc_solar_year_seconds(year)
    return anom_s / (anom_s - sol_s)


def calc_inclination_precession(year: int) -> float:
    """
    Calculate the inclination precession period in years.

    Formula: P_I = Y_anom(s) / (Y_anom(s) - Y_sid(s))

    Coin rotation paradox applied to the anomalistic and sidereal years
    in seconds. At the mean: H/3.
    """
    anom_s = calc_anomalistic_year_seconds(year)
    sid_s = calc_sidereal_year_seconds(year)
    return anom_s / (anom_s - sid_s)


# =============================================================================
# SECTION G: UNIFIED FEATURE MATRIX (273 terms)
# =============================================================================

def build_features(year: int, planet_period: float, planet_theta0: float) -> List[float]:
    """
    Build unified 273-term feature matrix for any planet.

    This is the SAME structure for all 7 planets. Only the planet_period
    and planet_theta0 parameters vary.

    Feature groups:
    - Angle terms (diff, sum, harmonics): 18 terms
    - Obliquity/Eccentricity terms: 6 terms
    - ERD terms (linear, quadratic, cubic): 12 terms
    - Periodic terms (11 periods × 2): 22 terms
    - ERD × Periodic (11 periods × 2): 22 terms
    - ERD² × Periodic (6 periods × 2): 12 terms
    - Periodic × Angle (6 periods × 4): 24 terms
    - ERD × Periodic × Angle (4 periods × 4): 16 terms
    - Periodic × 2δ (4 periods × 4): 16 terms
    - Periodic × Periodic (6 pairs × 2): 12 terms
    - Constant: 1 term
    - ERD × Sum-angle: 4 terms
    - Extended harmonics (3δ, beats, sum-angle): 60 terms
    - Venus periodic terms (H/80, H/21, periodic×3δ): 16 terms
    - Time-varying obliq/ecc interactions: 12 terms (critical for Saturn)
    - Venus fine-tuning (H/78, H/94, H/77, H/55): 20 terms

    Total: 273 terms
    """
    # Time offset for periodic terms
    t = time_offset(year)

    # Calculate all inputs from formulas
    theta_E = calc_earth_perihelion(year)
    theta_P = calc_planet_perihelion(planet_theta0, planet_period, year)
    erd = calc_erd(year)
    obliq = calc_obliquity(year)
    ecc = calc_eccentricity(year)

    # Convert to radians
    theta_E_rad = math.radians(theta_E)
    theta_P_rad = math.radians(theta_P)

    # Derived angles
    diff = theta_E_rad - theta_P_rad      # Difference angle
    sum_angle = theta_E_rad + theta_P_rad  # Sum angle

    # Normalized Earth parameters
    obliq_norm = obliq - EARTH_OBLIQ_MEAN
    ecc_norm = ecc - EARTH_ECC_MEAN

    # ERD powers
    erd2 = erd * erd
    erd3 = erd2 * erd

    features = []

    # =========================================================================
    # GROUP 1: ANGLE TERMS (0-17) - 18 terms
    # =========================================================================

    # Difference angle harmonics (n=1,2,3,4)
    for n in [1, 2, 3, 4]:
        features.append(math.cos(n * diff))
        features.append(math.sin(n * diff))

    # Sum angle
    features.append(math.cos(sum_angle))
    features.append(math.sin(sum_angle))

    # Earth angle harmonics (n=1,2)
    for n in [1, 2]:
        features.append(math.cos(n * theta_E_rad))
        features.append(math.sin(n * theta_E_rad))

    # Planet angle harmonics (n=1,2)
    for n in [1, 2]:
        features.append(math.cos(n * theta_P_rad))
        features.append(math.sin(n * theta_P_rad))

    # =========================================================================
    # GROUP 2: OBLIQUITY & ECCENTRICITY TERMS (18-23) - 6 terms
    # =========================================================================

    features.append(obliq_norm)
    features.append(ecc_norm)
    features.append(obliq_norm * math.cos(diff))
    features.append(obliq_norm * math.sin(diff))
    features.append(ecc_norm * math.cos(diff))
    features.append(ecc_norm * math.sin(diff))

    # =========================================================================
    # GROUP 3: ERD TERMS (24-35) - 12 terms
    # =========================================================================

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

    # =========================================================================
    # GROUP 4: PERIODIC TERMS (36-57) - 22 terms
    # =========================================================================

    periods = [
        planet_period,      # Planet's own period
        H,                  # Master cycle
        EARTH_PERI_PERIOD,  # Earth perihelion (H/16)
        EARTH_PERI_2,       # 2nd harmonic (H/32)
        EARTH_PERI_3,       # 3rd harmonic (H/48)
        OBLIQ_CYCLE,        # Obliquity (H/8)
        INCLIN_CYCLE,       # Inclination (H/3)
        H_DIV_4,            # H/4
        H_DIV_5,            # H/5
        H_DIV_12,           # H/12
        H_DIV_13,           # H/13 (axial precession)
    ]

    for p in periods:
        phase = 2 * math.pi * t / p
        features.append(math.sin(phase))
        features.append(math.cos(phase))

    # =========================================================================
    # GROUP 5: ERD × PERIODIC (58-79) - 22 terms
    # =========================================================================

    for p in periods:
        phase = 2 * math.pi * t / p
        features.append(erd * math.sin(phase))
        features.append(erd * math.cos(phase))

    # =========================================================================
    # GROUP 6: ERD² × PERIODIC (80-91) - 12 terms
    # =========================================================================

    erd2_periods = [planet_period, H, EARTH_PERI_PERIOD, OBLIQ_CYCLE, INCLIN_CYCLE, H_DIV_5]
    for p in erd2_periods:
        phase = 2 * math.pi * t / p
        features.append(erd2 * math.sin(phase))
        features.append(erd2 * math.cos(phase))

    # =========================================================================
    # GROUP 7: PERIODIC × ANGLE (92-115) - 24 terms
    # =========================================================================

    angle_periods = [EARTH_PERI_PERIOD, EARTH_PERI_2, OBLIQ_CYCLE, INCLIN_CYCLE, planet_period, H_DIV_5]
    for p in angle_periods:
        phase = 2 * math.pi * t / p
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(sin_p * math.cos(diff))
        features.append(sin_p * math.sin(diff))
        features.append(cos_p * math.cos(diff))
        features.append(cos_p * math.sin(diff))

    # =========================================================================
    # GROUP 8: ERD × PERIODIC × ANGLE (116-131) - 16 terms
    # =========================================================================

    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(erd * sin_p * math.cos(diff))
        features.append(erd * sin_p * math.sin(diff))
        features.append(erd * cos_p * math.cos(diff))
        features.append(erd * cos_p * math.sin(diff))

    # =========================================================================
    # GROUP 9: PERIODIC × 2δ (132-147) - 16 terms
    # =========================================================================

    for p in [EARTH_PERI_PERIOD, EARTH_PERI_2, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(sin_p * math.cos(2 * diff))
        features.append(sin_p * math.sin(2 * diff))
        features.append(cos_p * math.cos(2 * diff))
        features.append(cos_p * math.sin(2 * diff))

    # =========================================================================
    # GROUP 10: PERIODIC × PERIODIC (148-159) - 12 terms
    # =========================================================================

    period_pairs = [
        (EARTH_PERI_PERIOD, planet_period),
        (EARTH_PERI_PERIOD, OBLIQ_CYCLE),
        (OBLIQ_CYCLE, planet_period),
        (OBLIQ_CYCLE, INCLIN_CYCLE),
        (planet_period, INCLIN_CYCLE),
        (EARTH_PERI_PERIOD, INCLIN_CYCLE),
    ]
    for p1, p2 in period_pairs:
        ph1 = 2 * math.pi * t / p1
        ph2 = 2 * math.pi * t / p2
        features.append(math.sin(ph1) * math.sin(ph2))
        features.append(math.cos(ph1) * math.cos(ph2))

    # =========================================================================
    # GROUP 11: CONSTANT (160) - 1 term
    # =========================================================================

    features.append(1.0)

    # =========================================================================
    # GROUP 12: ERD × SUM-ANGLE (161-164) - 4 terms
    # =========================================================================

    features.append(erd * math.cos(2 * sum_angle))
    features.append(erd * math.sin(2 * sum_angle))
    features.append(erd2 * math.cos(sum_angle))
    features.append(erd2 * math.sin(sum_angle))

    # =========================================================================
    # GROUP 13: EXTENDED HARMONICS (165-224) - 60 terms
    # =========================================================================

    # 3δ terms (4)
    features.append(math.cos(3 * diff))
    features.append(math.sin(3 * diff))
    features.append(erd * math.cos(3 * diff))
    features.append(erd * math.sin(3 * diff))

    # Beat frequencies (12)
    beat_pairs = [
        (EARTH_PERI_PERIOD, planet_period),
        (OBLIQ_CYCLE, planet_period),
        (INCLIN_CYCLE, planet_period),
    ]
    for p1, p2 in beat_pairs:
        if p1 != p2:
            beat = abs(p1 - p2)
            sumf = (p1 * p2) / (p1 + p2)
        else:
            beat = H
            sumf = p1 / 2
        for bp in [beat, sumf]:
            phase = 2 * math.pi * t / bp
            features.append(math.sin(phase))
            features.append(math.cos(phase))

    # EARTH_PERI_3 × angle (4)
    phase = 2 * math.pi * t / EARTH_PERI_3
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/4 × angle (4)
    phase = 2 * math.pi * t / H_DIV_4
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/13 × angle (4)
    phase = 2 * math.pi * t / H_DIV_13
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # Sum angle combinations (16)
    for p in [EARTH_PERI_PERIOD, OBLIQ_CYCLE, planet_period, H]:
        phase = 2 * math.pi * t / p
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(sin_p * math.cos(sum_angle))
        features.append(sin_p * math.sin(sum_angle))
        features.append(cos_p * math.cos(sum_angle))
        features.append(cos_p * math.sin(sum_angle))

    # ERD³ × angle (4)
    features.append(erd3 * math.cos(diff))
    features.append(erd3 * math.sin(diff))
    features.append(erd3 * math.cos(2 * diff))
    features.append(erd3 * math.sin(2 * diff))

    # ERD² × periodic × angle (12)
    for p in [EARTH_PERI_PERIOD, planet_period, OBLIQ_CYCLE]:
        phase = 2 * math.pi * t / p
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(erd2 * sin_p * math.cos(diff))
        features.append(erd2 * sin_p * math.sin(diff))
        features.append(erd2 * cos_p * math.cos(diff))
        features.append(erd2 * cos_p * math.sin(diff))

    # =========================================================================
    # GROUP 14: VENUS PERIODIC TERMS (225-240) - 16 terms
    # =========================================================================

    # H/80 periodic terms (2)
    phase = 2 * math.pi * t / H_DIV_80
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/21 periodic terms (2)
    phase = 2 * math.pi * t / H_DIV_21
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/80 × angle (4)
    phase = 2 * math.pi * t / H_DIV_80
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # Periodic × 3δ for planet_period and EARTH_PERI_PERIOD (8)
    # Venus has strong 3δ × periodic interactions
    for p in [planet_period, EARTH_PERI_PERIOD]:
        phase = 2 * math.pi * t / p
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(sin_p * math.cos(3 * diff))
        features.append(sin_p * math.sin(3 * diff))
        features.append(cos_p * math.cos(3 * diff))
        features.append(cos_p * math.sin(3 * diff))

    # =========================================================================
    # GROUP 15: TIME-VARYING OBLIQ/ECC INTERACTIONS (241-252) - 12 terms
    # These terms are critical for Saturn's accuracy. Saturn's retrograde
    # precession (period = H/8 = obliquity cycle) creates strong coupling
    # between obliquity/eccentricity variations and precession fluctuations.
    # Without these terms, Saturn RMSE was 2.32; with them it drops to 0.29.
    # =========================================================================

    # Obliquity × ERD × angle (4)
    features.append(obliq_norm * erd * math.cos(diff))
    features.append(obliq_norm * erd * math.sin(diff))
    features.append(obliq_norm * erd * math.cos(2 * diff))
    features.append(obliq_norm * erd * math.sin(2 * diff))

    # Eccentricity × ERD × angle (4)
    features.append(ecc_norm * erd * math.cos(diff))
    features.append(ecc_norm * erd * math.sin(diff))
    features.append(ecc_norm * erd * math.cos(2 * diff))
    features.append(ecc_norm * erd * math.sin(2 * diff))

    # Obliquity × periodic (2)
    phase = 2 * math.pi * t / EARTH_PERI_PERIOD
    features.append(obliq_norm * math.sin(phase))
    features.append(obliq_norm * math.cos(phase))

    # Eccentricity × periodic (2)
    features.append(ecc_norm * math.sin(phase))
    features.append(ecc_norm * math.cos(phase))

    # =========================================================================
    # GROUP 16: VENUS FINE-TUNING (253-272) - 20 terms
    # =========================================================================

    # H/78 periodic terms (2)
    phase = 2 * math.pi * t / H_DIV_78
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/94 periodic terms (2)
    phase = 2 * math.pi * t / H_DIV_94
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/77 periodic terms (2)
    phase = 2 * math.pi * t / H_DIV_77
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/55 periodic terms (2)
    phase = 2 * math.pi * t / H_DIV_55
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/78 × angle (4)
    phase = 2 * math.pi * t / H_DIV_78
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/94 × angle (4)
    phase = 2 * math.pi * t / H_DIV_94
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # ERD × H/78 (2)
    phase = 2 * math.pi * t / H_DIV_78
    features.append(erd * math.sin(phase))
    features.append(erd * math.cos(phase))

    # ERD × H/94 (2)
    phase = 2 * math.pi * t / H_DIV_94
    features.append(erd * math.sin(phase))
    features.append(erd * math.cos(phase))

    return features


# =============================================================================
# SECTION H: PREDICTION FUNCTIONS
# =============================================================================

def predict_fluctuation(year: int, planet_key: str, coefficients: List[float]) -> float:
    """
    Predict precession fluctuation for a planet at given year.

    Args:
        year: Calendar year
        planet_key: Planet identifier ('mercury', 'venus', etc.)
        coefficients: Trained coefficient array (273 values)

    Returns:
        Precession fluctuation in arcsec/century
    """
    planet = PLANETS[planet_key]
    features = build_features(year, planet['period'], planet['theta0'])

    return sum(c * f for c, f in zip(coefficients, features))


def predict_total_precession(year: int, planet_key: str, coefficients: List[float]) -> float:
    """
    Predict total precession rate (baseline + fluctuation).

    Returns:
        Total precession in arcsec/century
    """
    planet = PLANETS[planet_key]
    fluctuation = predict_fluctuation(year, planet_key, coefficients)
    return planet['baseline'] + fluctuation


# =============================================================================
# VERIFICATION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("HOLISTIC UNIVERSE MODEL — PREDICTIVE FORMULA SYSTEM")
    print("=" * 70)

    # Verify feature count
    test_features = build_features(2022, PLANETS['mars']['period'], PLANETS['mars']['theta0'])
    print(f"\nFeature matrix size: {len(test_features)} terms")

    # --- Section B: Planet configurations ---
    print("\n--- Section B: Planet Configurations ---")
    print(f"{'Planet':<10} {'Period':>12} {'Theta0':>12} {'Baseline':>12}")
    print("-" * 50)
    for key, planet in PLANETS.items():
        print(f"{planet['name']:<10} {planet['period']:>12.0f} {planet['theta0']:>12.4f}° {planet['baseline']:>+12.1f}")

    # --- Section C: Earth — Orbital Elements ---
    print("\n--- Section C: Earth — Orbital Elements ---")
    print(f"{'Year':>8} {'Perihelion':>12} {'ERD':>14} {'Obliquity':>12} {'Eccentricity':>14} {'Inclination':>12}")
    print("-" * 78)
    for year in [2000, 2022, 2100]:
        peri = calc_earth_perihelion(year)
        erd = calc_erd(year)
        obliq = calc_obliquity(year)
        ecc = calc_eccentricity(year)
        inclin = calc_inclination(year)
        print(f"{year:>8} {peri:>12.4f}° {erd:>14.8f} {obliq:>12.4f}° {ecc:>14.6f} {inclin:>12.4f}°")

    # --- Section D: Planet perihelions ---
    print("\n--- Section D: Planet Perihelion Longitudes (2022) ---")
    for key, planet in PLANETS.items():
        peri = calc_planet_perihelion(planet['theta0'], planet['period'], 2022)
        print(f"  {planet['name']:<10} {peri:>10.4f}°")

    # --- Section E: Earth — Time Periods ---
    print("\n--- Section E: Earth — Time Periods ---")
    print(f"{'Year':>8} {'Solar Year':>16} {'Sidereal Year':>16} {'Day Length':>16}")
    print(f"{'':>8} {'(days)':>16} {'(days)':>16} {'(SI seconds)':>16}")
    print("-" * 60)
    for year in [2000, 2022, 2100, -10000, 10000]:
        sy = calc_solar_year(year)
        sid = calc_sidereal_year(year)
        dl = calc_day_length(year)
        print(f"{year:>8} {sy:>16.9f} {sid:>16.9f} {dl:>16.6f}")

    print()
    print(f"{'Year':>8} {'Solar (s)':>18} {'Sidereal (s)':>18} {'Anomalistic (s)':>18}")
    print("-" * 64)
    for year in [2000, 2022, 2100, -10000, 10000]:
        sy_s = calc_solar_year_seconds(year)
        sid_s = calc_sidereal_year_seconds(year)
        anom_s = calc_anomalistic_year_seconds(year)
        print(f"{year:>8} {sy_s:>18.3f} {sid_s:>18.3f} {anom_s:>18.3f}")

    print()
    print(f"{'Year':>8} {'Day Length (s)':>18} {'Sidereal Day (s)':>18} {'Stellar Day (s)':>18} {'Measured Solar (s)':>20}")
    print("-" * 86)
    for year in [2000, 2022, 2100, -10000, 10000]:
        dl = calc_day_length(year)
        sid_d = calc_sidereal_day(year)
        star_d = calc_stellar_day(year)
        msd = calc_measured_solar_day(year)
        offset_ms = (msd - dl) * 1000   # negative = measured is shorter than meanlengthofday
        print(f"{year:>8} {dl:>18.6f} {sid_d:>18.6f} {star_d:>18.6f} {msd:>18.6f} ({offset_ms:+.3f} ms)")

    # --- Section F: Earth — Precession Periods ---
    print("\n--- Section F: Earth — Precession Periods ---")
    print(f"{'Year':>8} {'Axial (yr)':>16} {'Perihelion (yr)':>16} {'Inclination (yr)':>18}")
    print("-" * 62)
    for year in [2000, 2022, 2100, -10000, 10000]:
        ax = calc_axial_precession(year)
        peri = calc_perihelion_precession(year)
        incl = calc_inclination_precession(year)
        print(f"{year:>8} {ax:>16.2f} {peri:>16.2f} {incl:>18.2f}")

    print("\nSystem ready.")

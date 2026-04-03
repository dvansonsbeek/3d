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
     ascending node, perihelion longitude, ERD)
  D. Planet Perihelion Calculation
  D2. All Planets — Orbital Elements (ascending node, inclination, eccentricity)
  E. Earth — Time Periods (solar year, sidereal year, day length,
     sidereal day, stellar day)
  F. Earth — Precession Periods (axial, perihelion, inclination)
  G. Unified Feature Matrix (429-term precession prediction)
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
    INCL_MEAN, INCL_AMP, INCL_PHASE_ANGLE, INCL_PERIOD, OMEGA_J2000, INCL_ECLIPTIC,
    ECC_BASE, ECC_AMPLITUDE, ECC_PHASE_J2000,
    AXIAL_TILT, LONGITUDE_PERIHELION, PERIHELION_ECLIPTIC_YEARS,
    OBLIQUITY_CYCLE, EARTH_RA_ANGLE, BALANCED_JD,
    _START_MODEL_JD, JUNE_SOLSTICE_2000_JD, SOLSTICE_JD_HARMONICS,
    CARDINAL_POINT_ANCHORS, CARDINAL_POINT_HARMONICS,
    SOLSTICE_OBLIQUITY_MEAN, SOLSTICE_OBLIQUITY_HARMONICS,
    PERI_HARMONICS, PERI_OFFSET,
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
H_DIV_61 = H / 61               # H/61 — Earth perihelion harmonic
H_DIV_80 = H / 80               # H/80 (5th harmonic of Earth perihelion)
H_DIV_94 = H / 94               # H/94

# Greedy-selected periods (GROUP 17) — from forward feature selection
H_DIV_9  = H / 9                # H/9   — Mercury H/9×2δ cross-term
H_DIV_45 = H / 45               # H/45  — Venus secondary improvement
H_DIV_60 = H / 60               # H/60  — Venus primary improvement (strongest signal)

# Greedy-selected periods (GROUP 18) — round-2 forward feature selection
H_DIV_41  = H / 41              # H/41  — Mercury cross-term
H_DIV_56  = H / 56              # H/56  — Mercury simple
H_DIV_75  = H / 75              # H/75  — Venus/Jupiter simple
H_DIV_110 = H / 110             # H/110 — Venus primary round-2 (strongest signal)

# Greedy-selected periods (GROUP 19) — round-3 forward feature selection
H_DIV_39  = H / 39              # H/39  — Mercury/Venus angle cross-term

# Greedy-selected periods (GROUP 20) — round-4 forward feature selection
H_DIV_37  = H / 37              # H/37  — Mercury primary round-4
H_DIV_96  = H / 96              # H/96  — Venus (6th harmonic of Earth perihelion)
H_DIV_112 = H / 112             # H/112 — Venus (7th harmonic of Earth perihelion)

# Greedy-selected periods (GROUP 21) — round-5 forward feature selection
H_DIV_7   = H / 7               # H/7   — Jupiter primary round-5
H_DIV_18  = H / 18              # H/18  — Jupiter secondary round-5
H_DIV_38  = H / 38              # H/38  — Mercury/Saturn cross-term

# Greedy-selected periods (GROUP 22) — round-6 forward feature selection
H_DIV_31  = H / 31              # H/31  — Venus dominant round-6 (ΔRMSE -1.55)
H_DIV_35  = H / 35              # H/35  — Earth perihelion harmonic

# Greedy-selected periods (GROUP 23) — round-7 forward feature selection
H_DIV_128 = H / 128             # H/128 — Venus primary round-7 (8th harmonic of Earth perihelion)
H_DIV_42  = H / 42              # H/42  — Venus secondary round-7

# Saturn high-frequency harmonics (GROUP 24) — H/(8×34) harmonic series
# Fundamental period H/272 = H/(8×34) connects Saturn precession (H/8) with Fibonacci-34
H_DIV_272  = H / 272            # H/272  — n=1 fundamental (1231.6 yr)
H_DIV_544  = H / 544            # H/544  — n=2 (615.8 yr)
H_DIV_816  = H / 816            # H/816  — n=3 (410.5 yr)
H_DIV_1088 = H / 1088           # H/1088 — n=4 (307.9 yr)
H_DIV_1360 = H / 1360           # H/1360 — n=5 (246.3 yr)
H_DIV_1632 = H / 1632           # H/1632 — n=6 (205.3 yr)
H_DIV_1904 = H / 1904           # H/1904 — n=7 (175.9 yr)
H_DIV_2176 = H / 2176           # H/2176 — n=8 (154.0 yr)
H_DIV_2448 = H / 2448           # H/2448 — n=9 (136.8 yr)

# Venus high-frequency triplets (GROUP 25) — carrier ± 16 sideband structure
# Carriers at H/140,141,142 (~2376 yr) with ±16 sidebands from Earth perihelion
H_DIV_124  = H / 124            # H/124  — sideband (H/140 - 16)
H_DIV_125  = H / 125            # H/125  — sideband (H/141 - 16)
H_DIV_126  = H / 126            # H/126  — sideband (H/142 - 16)
H_DIV_129  = H / 129            # H/129  — secondary carrier
H_DIV_139  = H / 139            # H/139  — carrier cluster
H_DIV_140  = H / 140            # H/140  — carrier
H_DIV_141  = H / 141            # H/141  — primary carrier (strongest signal)
H_DIV_142  = H / 142            # H/142  — carrier
H_DIV_143  = H / 143            # H/143  — carrier cluster
H_DIV_157  = H / 157            # H/157  — sideband (H/141 + 16)
H_DIV_158  = H / 158            # H/158  — sideband (H/142 + 16)

# =============================================================================
# SECTION B: PLANET CONFIGURATIONS
# Planet periods derived from H using Fibonacci-related fractions
# THETA0 = official J2000 perihelion longitude
# =============================================================================

PLANETS = {
    'mercury': {
        'name': 'Mercury',
        'period': PERIHELION_ECLIPTIC_YEARS['Mercury'],
        'theta0': LONGITUDE_PERIHELION['Mercury'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Mercury'] * 100,
    },
    'venus': {
        'name': 'Venus',
        'period': PERIHELION_ECLIPTIC_YEARS['Venus'],
        'theta0': LONGITUDE_PERIHELION['Venus'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Venus'] * 100,
    },
    'mars': {
        'name': 'Mars',
        'period': PERIHELION_ECLIPTIC_YEARS['Mars'],
        'theta0': LONGITUDE_PERIHELION['Mars'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Mars'] * 100,
    },
    'jupiter': {
        'name': 'Jupiter',
        'period': PERIHELION_ECLIPTIC_YEARS['Jupiter'],
        'theta0': LONGITUDE_PERIHELION['Jupiter'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Jupiter'] * 100,
    },
    'saturn': {
        'name': 'Saturn',
        'period': abs(PERIHELION_ECLIPTIC_YEARS['Saturn']),  # retrograde (negative in constants)
        'theta0': LONGITUDE_PERIHELION['Saturn'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Saturn'] * 100,
        # Note: Saturn's period equals the obliquity cycle, creating strong
        # coupling with Earth's obliquity/eccentricity variations (GROUP 15)
    },
    'uranus': {
        'name': 'Uranus',
        'period': PERIHELION_ECLIPTIC_YEARS['Uranus'],
        'theta0': LONGITUDE_PERIHELION['Uranus'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Uranus'] * 100,
    },
    'neptune': {
        'name': 'Neptune',
        'period': PERIHELION_ECLIPTIC_YEARS['Neptune'],
        'theta0': LONGITUDE_PERIHELION['Neptune'],
        'baseline': 1296000 / PERIHELION_ECLIPTIC_YEARS['Neptune'] * 100,
    },
}

# Earth mean values for normalization (from constants_scripts, sourced from constants.js)
EARTH_OBLIQ_MEAN = EARTH_OBLIQUITY_MEAN
EARTH_ECC_BASE = EARTH_BASE_ECCENTRICITY
EARTH_ECC_AMP  = EARTH_ECCENTRICITY_AMPLITUDE
EARTH_ECC_MEAN = _ECCENTRICITY_DERIVED_MEAN

# Earth perihelion harmonics — loaded from fitted-coefficients.js via constants chain.
# Updated automatically when fit_perihelion_harmonics.py reruns.
# PERI_HARMONICS: list of (period_years, sin_coeff, cos_coeff)
# PERI_OFFSET: DC offset in degrees

# =============================================================================
# SECTION C: EARTH ORBITAL PARAMETERS
# Obliquity, eccentricity, inclination, ascending node, perihelion longitude, ERD
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
    """Calculate Earth's obliquity at given year (degrees).
    Primary formula: 12-harmonic fit, RMSE 1.45 arcsec over full H."""
    t = time_offset(year)
    obliq = SOLSTICE_OBLIQUITY_MEAN
    for div, sin_c, cos_c in SOLSTICE_OBLIQUITY_HARMONICS:
        phase = 2 * math.pi * t / (H / div)
        obliq += sin_c * math.sin(phase) + cos_c * math.cos(phase)
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


def calc_ascending_node(year: int) -> float:
    """
    Calculate Earth's ascending node longitude on the invariable plane (degrees).

    Formula: Ω(t) = Ω_J2000 + 360° × (year - 2000) / T

    where Ω_J2000 = 284.51° and T = H/3 (inclination precession period).
    """
    return (OMEGA_J2000["Earth"] + 360.0 * (year - J2000) / INCL_PERIOD["Earth"]) % 360


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
# SECTION D2: ALL PLANETS — ORBITAL ELEMENTS
# Ascending node, inclination to invariable plane, eccentricity
# All oscillate at the planet's precession period (= INCL_PERIOD from constants)
# =============================================================================

def calc_planet_ascending_node(planet: str, year: int) -> float:
    """
    Calculate planet's ascending node longitude on the invariable plane.

    Formula: Ω(t) = Ω_J2000 + 360° × (year - 2000) / T

    Args:
        planet: Planet name (e.g. 'Mercury')
        year: Calendar year

    Returns: Ascending node longitude in degrees [0, 360)
    """
    omega0 = OMEGA_J2000[planet]
    period = INCL_PERIOD[planet]
    return (omega0 + 360.0 * (year - J2000) / period) % 360


def calc_planet_perihelion_icrf(planet: str, year: int) -> float:
    """
    Calculate planet's ICRF perihelion longitude at given year (degrees).
    Used as reference angle for inclination oscillation.
    """
    peri0 = LONGITUDE_PERIHELION[planet]
    period = INCL_PERIOD[planet]
    return (peri0 + 360.0 * (year - J2000) / period) % 360


def calc_planet_inclination(planet: str, year: int) -> float:
    """
    Calculate planet's inclination to the invariable plane (degrees).

    Formula: i(t) = mean + sign × amplitude × cos(ω̃_ICRF(t) - phaseAngle)

    The inclination oscillates with the ICRF perihelion longitude.
    Saturn is anti-phase (sign = -1). Amplitude is derived from ψ/(d×√m).

    Args:
        planet: Planet name (e.g. 'Mercury')
        year: Calendar year

    Returns: Inclination in degrees
    """
    peri = calc_planet_perihelion_icrf(planet, year)
    mean = INCL_MEAN[planet]
    amp = INCL_AMP[planet]
    phase = INCL_PHASE_ANGLE[planet]
    sign = -1 if planet == 'Saturn' else 1
    return mean + sign * amp * math.cos(math.radians(peri - phase))


def calc_planet_eccentricity(planet: str, year: int) -> float:
    """
    Calculate planet's orbital eccentricity at given year.

    Formula: e(t) = e_base + e_amp × cos(2π(year - 2000) / (H/16) + φ_J2000)

    All planets oscillate at period H/16 = 20,957 years.
    Earth uses a different formula (calc_eccentricity) with derived mean.

    Args:
        planet: Planet name (e.g. 'Mercury')
        year: Calendar year

    Returns: Eccentricity (dimensionless)
    """
    if planet == "Earth":
        return calc_eccentricity(year)
    base = ECC_BASE[planet]
    amp = ECC_AMPLITUDE[planet]
    phase_j2000 = math.radians(ECC_PHASE_J2000[planet])
    t = year - J2000
    period = H / 16
    return base + amp * math.cos(2 * math.pi * t / period + phase_j2000)


def calc_planet_obliquity(planet: str, year: int) -> float:
    """
    Calculate planet's dynamic obliquity (axial tilt) at given year.

    Anchored to J2000: at year 2000, returns the known axial tilt.
    Oscillation tied to invariable-plane inclination dynamics.
    Venus and Neptune have no obliquity cycle (returns static value).

    See docs/37-planets-precession-cycles.md § Obliquity Cycle Theory.

    Args:
        planet: Planet name (e.g. 'Mercury')
        year: Calendar year

    Returns: Obliquity in degrees
    """
    if planet == "Earth":
        return calc_obliquity(year)
    cycle = OBLIQUITY_CYCLE.get(planet)
    tilt_j2000 = AXIAL_TILT[planet]
    if cycle is None:
        return tilt_j2000
    # Anchor to J2000 via inclination oscillation
    incl_j2000 = calc_planet_inclination(planet, J2000)
    incl_now = calc_planet_inclination(planet, year)
    return tilt_j2000 + (incl_now - incl_j2000)


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
# SECTION E2: SOLSTICE PREDICTION
# Solstice RA: fully derived from model parameters (zero fitted constants).
# Solstice JD: anchored at J2000 solstice, zero fitted constants.
# See docs/14-solstice-prediction.md
# =============================================================================

# Pre-compute harmonic contributions at J2000 for each cardinal point
_CP_T2000 = J2000 - ANCHOR_YEAR
_CP_HARMONICS_AT_J2000 = {}
for _cp_type in ('SS', 'WS', 'VE', 'AE'):
    _CP_HARMONICS_AT_J2000[_cp_type] = sum(
        sin_c * math.sin(2 * math.pi * _CP_T2000 / (H / div))
        + cos_c * math.cos(2 * math.pi * _CP_T2000 / (H / div))
        for div, sin_c, cos_c in CARDINAL_POINT_HARMONICS[_cp_type]
    )
# Legacy alias
_SOLSTICE_HARMONICS_AT_J2000 = _CP_HARMONICS_AT_J2000['SS']


def calc_solstice_ra(year: int, cp_type: str = 'SS') -> float:
    """
    Compute RA (degrees) where a cardinal point occurs.
    Fully derived — zero fitted constants.

    Formula: RA(t) = (baseRA − earthRAAngle/sin(ε)) + (A/sin(ε)) × [−sin(H/3) + sin(H/8)]

    RMSE: 0.089° (0.36 min RA) over full H, same for all 4 cardinal points.

    Args:
        year: Calendar year
        cp_type: 'SS', 'WS', 'VE', or 'AE' (default 'SS')

    Returns: Cardinal point RA in degrees
    """
    t = time_offset(year)
    sin_e = math.sin(math.radians(EARTH_OBLIQ_MEAN))
    base_ra = {'SS': 90, 'WS': 270, 'VE': 0, 'AE': 180}[cp_type]
    ra_mean = base_ra - EARTH_RA_ANGLE / sin_e
    amp = EARTH_INCLIN_AMPL / sin_e
    phase3 = 2 * math.pi * t / (H / 3)
    phase8 = 2 * math.pi * t / (H / 8)
    return ra_mean + amp * (-math.sin(phase3) + math.sin(phase8))


def calc_solstice_jd(year: int, cp_type: str = 'SS') -> float:
    """
    Compute Julian Day when a cardinal point occurs.
    Anchored at the observed J2000 value for each cardinal point.

    12 harmonics (5 Fibonacci + 7 overtones) per cardinal point.
    RMSE: SS 2.7min, WS 5.3min, VE 3.0min, AE 5.0min.

    Args:
        year: Calendar year
        cp_type: 'SS', 'WS', 'VE', or 'AE' (default 'SS')

    Returns: Julian Day of the cardinal point
    """
    t = time_offset(year)
    anchor = CARDINAL_POINT_ANCHORS[cp_type]
    harmonics = CARDINAL_POINT_HARMONICS[cp_type]
    jd = anchor + MEAN_SOLAR_YEAR_DAYS * (year - J2000)
    for div, sin_c, cos_c in harmonics:
        phase = 2 * math.pi * t / (H / div)
        jd += sin_c * math.sin(phase) + cos_c * math.cos(phase)
    jd -= _CP_HARMONICS_AT_J2000[cp_type]
    return jd


def calc_solstice_year_length(year: int, cp_type: str = 'SS') -> float:
    """
    Compute the cardinal-point year length — time between consecutive events.

    At J2000: SS=365.2416d (shortest), WS=365.2427d (longest), spread ~98s.

    Args:
        year: Calendar year
        cp_type: 'SS', 'WS', 'VE', or 'AE' (default 'SS')

    Returns: Cardinal point year length in days
    """
    t = time_offset(year)
    harmonics = CARDINAL_POINT_HARMONICS[cp_type]
    length = MEAN_SOLAR_YEAR_DAYS
    for div, sin_c, cos_c in harmonics:
        period = H / div
        omega = 2 * math.pi / period
        phase = omega * t
        length += sin_c * omega * math.cos(phase) - cos_c * omega * math.sin(phase)
    return length


# Legacy alias for backward compatibility
calc_solstice_obliquity = calc_obliquity


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
# SECTION G: UNIFIED FEATURE MATRIX (429 terms)
# =============================================================================

def build_features(year: int, planet_period: float, planet_theta0: float) -> List[float]:
    """
    Build unified 429-term feature matrix for any planet.

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
    - Greedy-selected: H/60 simple, H/24×angle, H/45×angle, H/9×2δ: 14 terms
    - Greedy round-2: H/110, H/60×angle, H/75, H/41×angle, H/56, H/45 simple: 16 terms
    - Greedy round-3: H/56×angle, H/41×2δ, ERD×H/110, ERD×6δ, H/39×angle: 16 terms
    - Greedy round-4: H/60×2δ, H/112×angle, H/39×2δ, H/96×angle, H/37: 18 terms
    - Greedy round-5: H/96×2δ, H/7+angle, H/18, H/37×2δ, H/38×2δ, ERD×6δ: 22 terms
    - Greedy round-6: H/31 bundle: 10 terms
    - Greedy round-7: H/128 bundle, H/42 bundle: 20 terms

    Total: 429 terms
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
    obliq_norm = obliq - SOLSTICE_OBLIQUITY_MEAN
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

    # =========================================================================
    # GROUP 17: GREEDY-SELECTED TERMS (273-286) - 14 terms
    # Found by greedy forward feature selection (greedy_features.py).
    # H/60 is the dominant missing signal for Venus (saves 4.45 "/cy RMSE).
    # H/24×angle is dominant for Mercury (saves 0.93 "/cy RMSE).
    # H/45×angle is secondary for Venus.
    # H/9×2δ is secondary for Mercury.
    # =========================================================================

    # H/60 simple (2) — primary Venus improvement
    phase = 2 * math.pi * t / H_DIV_60
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/24 × angle (4) — primary Mercury improvement
    phase = 2 * math.pi * t / H_DIV_24
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/45 × angle (4) — secondary Venus improvement
    phase = 2 * math.pi * t / H_DIV_45
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/9 × 2δ (4) — secondary Mercury improvement
    phase = 2 * math.pi * t / H_DIV_9
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # =========================================================================
    # GROUP 18: GREEDY ROUND-2 TERMS (287-302) - 16 terms
    # Found by second round of greedy_features.py on updated residuals.
    # H/110 is the strongest new Venus signal (-1.40 "/cy RMSE each round).
    # H/60×angle expands the GROUP 17 H/60 to include cross-angle terms.
    # H/75 helps Venus and Jupiter.
    # H/41×angle is primary new Mercury term.
    # H/56 and H/45 simple complete round-2 improvements.
    # =========================================================================

    # H/110 simple (2) — Venus primary round-2
    phase = 2 * math.pi * t / H_DIV_110
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/60 × angle (4) — Venus secondary (H/60 simple already in GROUP 17)
    phase = 2 * math.pi * t / H_DIV_60
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/75 simple (2) — Venus/Jupiter
    phase = 2 * math.pi * t / H_DIV_75
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/41 × angle (4) — Mercury primary round-2
    phase = 2 * math.pi * t / H_DIV_41
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/56 simple (2) — Mercury secondary round-2
    phase = 2 * math.pi * t / H_DIV_56
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/45 simple (2) — Neptune (H/45 was in GROUP 17 only as ×angle)
    phase = 2 * math.pi * t / H_DIV_45
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # =========================================================================
    # GROUP 19: GREEDY ROUND-3 TERMS (303-318) - 16 terms
    # H/56×angle is Mercury's strongest round-3 signal, also Neptune.
    # H/41×2δ completes Mercury's H/41 (×angle was in GROUP 18).
    # ERD×H/110 is Venus's strongest new signal (simple was in GROUP 18).
    # ERD×6δ is Venus's second strongest residual correlator.
    # H/39×angle helps both Mercury and Venus.
    # =========================================================================

    # H/56 × angle (4) — Mercury primary round-3, Neptune secondary
    phase = 2 * math.pi * t / H_DIV_56
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/41 × 2δ (4) — Mercury secondary round-3 (×angle already in G18)
    phase = 2 * math.pi * t / H_DIV_41
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # ERD × H/110 (2) — Venus primary round-3 (simple already in G18)
    phase = 2 * math.pi * t / H_DIV_110
    features.append(erd * math.sin(phase))
    features.append(erd * math.cos(phase))

    # ERD × 6δ (2) — Venus secondary round-3
    features.append(erd * math.sin(6 * diff))
    features.append(erd * math.cos(6 * diff))

    # H/39 × angle (4) — Mercury/Venus tertiary round-3
    phase = 2 * math.pi * t / H_DIV_39
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # =========================================================================
    # GROUP 20: GREEDY ROUND-4 TERMS (319-336) - 18 terms
    # H/60×2δ is Venus's strongest round-4 signal.
    # H/112×angle is Venus's second (7th harmonic of Earth perihelion).
    # H/39×2δ completes Venus/Mercury H/39 (×angle was in GROUP 19).
    # H/96×angle is Venus's fourth (6th harmonic of Earth perihelion).
    # H/37 simple is Mercury's strongest new period signal.
    # =========================================================================

    # H/60 × 2δ (4) — Venus primary round-4
    phase = 2 * math.pi * t / H_DIV_60
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # H/112 × angle (4) — Venus secondary round-4
    phase = 2 * math.pi * t / H_DIV_112
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/39 × 2δ (4) — Venus/Mercury tertiary round-4
    phase = 2 * math.pi * t / H_DIV_39
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # H/96 × angle (4) — Venus quaternary round-4
    phase = 2 * math.pi * t / H_DIV_96
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/37 simple (2) — Mercury primary round-4
    phase = 2 * math.pi * t / H_DIV_37
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # =========================================================================
    # GROUP 21: GREEDY ROUND-5 TERMS (337-358) - 22 terms
    # H/96×2δ is Venus's dominant round-5 signal (ΔRMSE -0.50).
    # H/7×angle and H/18 simple help Jupiter.
    # H/37×2δ completes Mercury's H/37 (simple was in GROUP 20).
    # H/38×2δ helps Mercury and Saturn.
    # ERD×6δ extends the 6δ pattern for Venus.
    # =========================================================================

    # H/96 × 2δ (4) — Venus dominant round-5
    phase = 2 * math.pi * t / H_DIV_96
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # H/7 simple + ×angle (6) — Jupiter primary round-5
    phase = 2 * math.pi * t / H_DIV_7
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p)
    features.append(cos_p)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))

    # H/18 simple (2) — Jupiter secondary round-5
    phase = 2 * math.pi * t / H_DIV_18
    features.append(math.sin(phase))
    features.append(math.cos(phase))

    # H/37 × 2δ (4) — Mercury round-5
    phase = 2 * math.pi * t / H_DIV_37
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # H/38 × 2δ (4) — Mercury/Saturn round-5
    phase = 2 * math.pi * t / H_DIV_38
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # ERD × 6δ (2) — Venus round-5
    features.append(erd * math.cos(6 * diff))
    features.append(erd * math.sin(6 * diff))

    # =========================================================================
    # GROUP 22: GREEDY ROUND-6 TERMS (359-368) - 10 terms
    # H/31 bundle is Venus's dominant round-6 signal (ΔRMSE -1.55).
    # =========================================================================

    # H/31 simple + ×angle + ×2δ (10) — Venus dominant round-6
    phase = 2 * math.pi * t / H_DIV_31
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p)
    features.append(cos_p)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # =========================================================================
    # GROUP 23: GREEDY ROUND-7 TERMS (369-388) - 20 terms
    # H/128 is Venus's primary round-7 signal (8th harmonic of perihelion).
    # H/42 is Venus's secondary round-7 signal.
    # =========================================================================

    # H/128 simple + ×angle + ×2δ (10) — Venus primary round-7
    phase = 2 * math.pi * t / H_DIV_128
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p)
    features.append(cos_p)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # H/42 simple + ×angle + ×2δ (10) — Venus secondary round-7
    phase = 2 * math.pi * t / H_DIV_42
    sin_p, cos_p = math.sin(phase), math.cos(phase)
    features.append(sin_p)
    features.append(cos_p)
    features.append(sin_p * math.cos(diff))
    features.append(sin_p * math.sin(diff))
    features.append(cos_p * math.cos(diff))
    features.append(cos_p * math.sin(diff))
    features.append(sin_p * math.cos(2 * diff))
    features.append(sin_p * math.sin(2 * diff))
    features.append(cos_p * math.cos(2 * diff))
    features.append(cos_p * math.sin(2 * diff))

    # =========================================================================
    # GROUP 24: SATURN HIGH-FREQUENCY HARMONICS (389-406) - 18 terms
    # H/(8×34×n) harmonic series for n=1..9
    # Fundamental H/272 connects Saturn precession (H/8) with Fibonacci-34.
    # Dominates Saturn/Jupiter residuals; helps all planets except Venus.
    # =========================================================================

    for p in [H_DIV_272, H_DIV_544, H_DIV_816, H_DIV_1088,
              H_DIV_1360, H_DIV_1632, H_DIV_1904, H_DIV_2176, H_DIV_2448]:
        phase = 2 * math.pi * t / p
        features.append(math.sin(phase))
        features.append(math.cos(phase))

    # =========================================================================
    # GROUP 25: VENUS HIGH-FREQUENCY TRIPLETS (429-428) - 22 terms
    # Carrier signals near H/141 (~2376 yr) with ±16 sidebands from Earth
    # perihelion modulation. Three triplets: H/{125,141,157}, H/{124,140,156},
    # H/{126,142,158}, plus cluster members H/129, H/139, H/143.
    # =========================================================================

    for p in [H_DIV_124, H_DIV_125, H_DIV_126, H_DIV_129, H_DIV_139,
              H_DIV_140, H_DIV_141, H_DIV_142, H_DIV_143, H_DIV_157, H_DIV_158]:
        phase = 2 * math.pi * t / p
        features.append(math.sin(phase))
        features.append(math.cos(phase))

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
        coefficients: Trained coefficient array (429 values)

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
    print(f"{'Year':>8} {'Perihelion':>12} {'ERD':>14} {'Obliquity':>12} {'Eccentricity':>14} {'Inclination':>12} {'Asc.Node':>10}")
    print("-" * 88)
    for year in [2000, 2022, 2100]:
        peri = calc_earth_perihelion(year)
        erd = calc_erd(year)
        obliq = calc_obliquity(year)
        ecc = calc_eccentricity(year)
        inclin = calc_inclination(year)
        asc_node = calc_ascending_node(year)
        print(f"{year:>8} {peri:>12.4f}° {erd:>14.8f} {obliq:>12.4f}° {ecc:>14.6f} {inclin:>12.4f}° {asc_node:>8.4f}°")

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

    # --- Section D2: All Planets — Orbital Elements ---
    print("\n--- Section D2: All Planets — Orbital Elements (2000) ---")
    print(f"{'Planet':<10} {'Asc.Node':>10} {'Inclination':>12} {'Incl.Mean':>10} {'Eccentricity':>14} {'Ecc.Base':>12}")
    print("-" * 72)
    from constants_scripts import PLANET_NAMES as _PN
    for planet in _PN:
        node = calc_planet_ascending_node(planet, 2000)
        incl_val = calc_planet_inclination(planet, 2000)
        mean_val = INCL_MEAN[planet]
        ecc_val = calc_planet_eccentricity(planet, 2000)
        base_val = ECC_BASE[planet]
        print(f"  {planet:<10} {node:>8.4f}° {incl_val:>10.6f}° {mean_val:>10.6f}° {ecc_val:>14.8f} {base_val:>12.8f}")

    print(f"\n{'Planet':<10} {'Year':>6} {'Asc.Node':>10} {'Inclination':>12} {'Eccentricity':>14}")
    print("-" * 56)
    for planet in ["Mercury", "Earth", "Jupiter", "Saturn"]:
        for year in [2000, 5000, 10000, -5000]:
            node = calc_planet_ascending_node(planet, year)
            incl_val = calc_planet_inclination(planet, year)
            ecc_val = calc_planet_eccentricity(planet, year)
            print(f"  {planet:<10} {year:>6} {node:>8.4f}° {incl_val:>10.6f}° {ecc_val:>14.8f}")

    print("\nSystem ready.")

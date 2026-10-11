#!/usr/bin/env python3
"""
ESSRT — PREDICTIVE FORMULA SYSTEM
=====================================================

Deterministic formulas for calculating all ESSRT model values
from a single input: YEAR. No observations required.

SECTIONS:
  A. Fundamental Constants & Derived Periods
  B. Planet Configurations
  C. Earth — Orbital Elements (eccentricity, inclination,
     ascending node, perihelion longitude, ERD)
  D. Planet Perihelion Calculation
  D2. All Planets — Orbital Elements (ascending node, inclination, eccentricity)
  E. Earth — Time Periods (solar year, sidereal year, day length,
     sidereal day, stellar day)
  F. Earth — Precession Periods (axial, perihelion, inclination)
  (G/H — the 429-term feature matrix and prediction functions of the retired
   planet predict device — deleted at plan 09; git history carries them)

Adding new formula categories:
  - Insert a new lettered section between existing ones
  - Constants go in Section A; the formula function goes in its own section
  - This keeps the file extensible without reordering existing code

Author: D. van Sonsbeek (holisticuniverse.com)
License: MIT
"""

import math
from typing import List, Tuple, Dict

from constants_scripts import (
    H, BALANCE_YEAR, K_DEVICE_WHEEL_PHASE_J2000_CYCLES, EARTH_BASE_ECCENTRICITY, EARTH_ECCENTRICITY_AMPLITUDE,
    EARTH_OBLIQUITY_MEAN, EARTH_INCLINATION_AMPLITUDE,
    _SIDEREAL_YEAR_S, _MEAN_SOLAR_YEAR_DAYS, _MEAN_SIDEREAL_YEAR_DAYS,
    _MEAN_LENGTH_OF_DAY, _MEAN_ANOM_YEAR_DAYS, _ECCENTRICITY_DERIVED_MEAN,
    TROPICAL_YEAR_HARMONICS, SIDEREAL_YEAR_HARMONICS, ANOMALISTIC_YEAR_HARMONICS,
    INCL_PERIOD, OMEGA_J2000, INCL_ECLIPTIC,
    AXIAL_TILT, LONGITUDE_PERIHELION, PERIHELION_ECLIPTIC_YEARS,
    OBLIQUITY_CYCLE, EARTH_RA_ANGLE, BALANCED_JD,
    _START_MODEL_JD, JUNE_SOLSTICE_2000_JD, SOLSTICE_JD_HARMONICS,
    CARDINAL_POINT_ANCHORS, CARDINAL_POINT_HARMONICS,
    PERI_HARMONICS, PERI_OFFSET,
)
# (plan 09: SOLSTICE_OBLIQUITY_MEAN / _HARMONICS — the 16-harmonic obliquity
# comb — are deleted; this mirror carries no obliquity of date. The model's
# obliquity is the hybrid ε of @essrt/physics `model.earth.obliquityDeg`.)

# =============================================================================
# SECTION A: FUNDAMENTAL CONSTANTS
# =============================================================================

ANCHOR_YEAR = BALANCE_YEAR      # from constants_scripts — 2000 since plan 07 R10 (the combs' phase origin is J2000)
J2000 = 2000                    # J2000 epoch (perihelion reference)

# --- Day & Year constants (all derived in constants_scripts; J2000-anchored) ---
# Note: these are J2000 snapshot values. The predictive-formula system is
# scoped to the modern era (±2 kyr around J2000), where ESSRT-driven drift
# in H, LOD, and the sidereal year is sub-ppm and well below the formula's
# noise floor. For deep-time epochs, use src/script.js helpers
# meanSiderealYearSecondsAtAge(t_Ma), meanLodSecondsAtAge(t_Ma),
# meanHAtAge(t_Ma) instead — see docs/99-expanding-solar-system-resonance-theory.md.
MEAN_SOLAR_YEAR_DAYS = _MEAN_SOLAR_YEAR_DAYS
SIDEREAL_YEAR_SECONDS = _SIDEREAL_YEAR_S        # J2000 snapshot
MEAN_DAY_LENGTH = _MEAN_LENGTH_OF_DAY            # J2000 snapshot
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
# (EARTH_INCLIN_MEAN left with calc_inclination, the H/3 device, at plan 07 R5/R9;
# the amplitude survives as the retired cardinal-RA device's input below.)
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
        'period': abs(PERIHELION_ECLIPTIC_YEARS['Venus']),  # retrograde (negative in constants)
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
        # Note: Saturn's period equals the device's obliquity cycle (H/8)
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
    # Plan 07 R10: the 270° convention is the device's perihelion wheel at the
    # retired origin; at J2000 it stands 16 × the device phase on.
    longitude = 270.0 + 360.0 * 16 * K_DEVICE_WHEEL_PHASE_J2000_CYCLES + mean_rate * t

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


# (calc_obliquity — the 16-harmonic comb mirror — deleted at plan 09.)



def calc_eccentricity(year: int) -> float:
    """Calculate Earth's orbital eccentricity at given year — the model's ONE law.

    e(t) = base' · (1 + cos θ(t) / 2),  θ(t) = 2π · 3t/H − π  (the H/3 System-Reset
    lattice phase, t from BALANCE_YEAR; θ(J2000) = 81.178°). base' = EARTH_ECC_MEAN
    (eccentricityDerivedMean, derived from e(J2000) and the anchor). This is the
    J2000-anchored snapshot form of @essrt/physics moon/ecc-channel.cjs eccAt —
    the SAME law both engines inject into the predict feature basis
    (computeEccentricityEarth), so the trained coefficients and the runtime
    features are a matched pair. The former H/16 law-of-cosines form remains
    for the PLANETS' wobble laws only.
    """
    t = time_offset(year)
    cos_theta = -math.cos(2 * math.pi * t / INCLIN_CYCLE)   # θ = 2π·3t/H − π
    return EARTH_ECC_MEAN * (1 + cos_theta / 2)


# (Plan 07 R5/R9: calc_inclination(year) — Earth's inclination to the
# invariable plane as the K device's H/3 cosine, I₀ − A·cos(2πt/T_I) — stood
# here. Deleted with the device: the published i_inv is the one-source engine
# reading (@essrt/physics model.earth.inclinationDeg; the simulator's
# inclInvPlaneModel), which Python does not mirror.)


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


# (Plan 07 R5: calc_planet_inclination(planet, year) — the ψ law's
# oscillation i(t) = mean + s·amp·cos(ϖ_ICRF(t) − anchor) — stood here.
# Deleted with the law; a planet's inclination of date is the N-body chain's
# (@essrt/physics model.planets.inclinationDeg), which Python does not mirror.)


# Plan 07 R6: calc_planet_eccentricity stood here — the Python mirror of the
# retired K law, e(t) = base + amp·cos(2π(t−2000)/(H/16) + φ_J2000). It had no
# caller but this module's own demo, and it carried a defect the JS side had
# already fixed: it ran EVERY planet at H/16 rather than the planet's own
# wobble beat (the 8.3-1 S-P1 correction, 1.3–6.7× wrong away from the
# anchor). A planet's eccentricity of date is the N-body chain's.
# Earth's own eccentricity is unaffected: calc_eccentricity(year).


def calc_planet_obliquity(planet: str, year: int) -> float:
    """
    Calculate planet's dynamic obliquity (axial tilt) at given year.

    Anchored to J2000: at year 2000, returns the known axial tilt.
    Oscillation tied to invariable-plane inclination dynamics.
    Venus and Neptune have no obliquity cycle (returns static value).

    Obliquity cycle: obliquity = |inclination − ecliptic|; Venus/Neptune static.

    Args:
        planet: Planet name (e.g. 'Mercury')
        year: Calendar year

    Returns: Obliquity in degrees
    """
    if planet == "Earth":
        return AXIAL_TILT["Earth"]   # plan 09: the J2000 tilt; the obliquity of date is the package hybrid
    # The planets' obliquity cycles left with plan 06 Phase 7 commit 2 (the
    # spin channel carries them); the ψ-law anchoring that followed here
    # (tilt_J2000 + Δ inclination) left with the law at plan 07 R5. The J2000
    # tilt is what this mirror can still state.
    return AXIAL_TILT[planet]


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

    Fitted from 491 data points spanning the full Earth Fundamental Cycle.
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

    Fitted from 491 data points spanning the full Earth Fundamental Cycle.
    RMS = 0.0002 seconds.  Both terms ~0.09s amplitude.
    """
    t = time_offset(year)
    return _eval_fourier(t, SIDEREAL_YEAR_MEAN, SIDEREAL_YEAR_HARMONICS)


def calc_day_length(year: int) -> float:
    """
    Calculate the length of a day in SI seconds.

    Formula: D = Y_sid(seconds) / Y_sid(days)

    The sidereal year in SI seconds is held at its J2000 snapshot value
    (31,558,149.724 s) throughout this formula's modern-era scope (±2 kyr
    around J2000). As the sidereal year in days changes, the day length
    adjusts accordingly.

    Deep-time note: under ESSRT (docs/99-expanding-solar-system-resonance-theory.md),
    the sidereal year in SI seconds drifts at deep time via Driver 2
    (solar mass loss → Kepler). For epochs outside ±2 kyr, use
    src/script.js helper meanSiderealYearSecondsAtAge(t_Ma) instead of
    the J2000 constant SIDEREAL_YEAR_SECONDS used here.
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

    The sidereal year in SI seconds is held at its J2000 snapshot value
    (31,558,149.724 s) throughout this formula's modern-era scope (±2 kyr
    around J2000). This function exists for API consistency so that all
    year-length outputs are available in the same units.

    Deep-time note: under ESSRT (docs/99-expanding-solar-system-resonance-theory.md),
    the sidereal year in SI seconds drifts at deep time via Driver 2
    (solar mass loss → Kepler) — see src/script.js helper
    meanSiderealYearSecondsAtAge(t_Ma) for epoch-correct values outside
    the modern-era ±2 kyr window.
    """
    return SIDEREAL_YEAR_SECONDS


def calc_anomalistic_year(year: int) -> float:
    """
    Calculate the length of the anomalistic year in days.

    Fourier harmonic formula (March 2026):
      Y_anom(t) = mean + Σ harmonics at H/8, H/3, H/16, H/24
      where t = year - ANCHOR_YEAR

    Fitted from 491 data points spanning the full Earth Fundamental Cycle.
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
# SECTIONS G/H — the 429-term unified feature matrix (`build_features`) and
# the prediction functions of the retired planet predict device — DELETED at
# plan 09: their last live input was the obliquity comb. Git history carries
# them (the untracked local archive keeps a copy).
# =============================================================================

# =============================================================================
# VERIFICATION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("ESSRT — PREDICTIVE FORMULA SYSTEM")
    print("=" * 70)

    # --- Section B: Planet configurations ---
    print("\n--- Section B: Planet Configurations ---")
    print(f"{'Planet':<10} {'Period':>12} {'Theta0':>12} {'Baseline':>12}")
    print("-" * 50)
    for key, planet in PLANETS.items():
        print(f"{planet['name']:<10} {planet['period']:>12.0f} {planet['theta0']:>12.4f}° {planet['baseline']:>+12.1f}")

    # --- Section C: Earth — Orbital Elements ---
    print("\n--- Section C: Earth — Orbital Elements ---")
    print(f"{'Year':>8} {'Perihelion':>12} {'ERD':>14} {'Eccentricity':>14} {'Asc.Node':>10}")
    print("-" * 64)
    for year in [2000, 2022, 2100]:
        peri = calc_earth_perihelion(year)
        erd = calc_erd(year)
        ecc = calc_eccentricity(year)
        asc_node = calc_ascending_node(year)
        print(f"{year:>8} {peri:>12.4f}° {erd:>14.8f} {ecc:>14.6f} {asc_node:>8.4f}°")

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

    # --- Section D2: All Planets — Ascending nodes (the device's linear rate) ---
    # (Plan 07 R5: the inclination and mean-inclination columns — the ψ law's
    # outputs — left with the law.)
    print("\n--- Section D2: All Planets — Ascending Node (2000) ---")
    print(f"{'Planet':<10} {'Asc.Node':>10}")
    print("-" * 22)
    from constants_scripts import PLANET_NAMES as _PN
    for planet in _PN:
        node = calc_planet_ascending_node(planet, 2000)
        print(f"  {planet:<10} {node:>8.4f}°")

    print("\nSystem ready.")

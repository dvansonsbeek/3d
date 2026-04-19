#!/usr/bin/env python3
"""
SHARED CONSTANTS AND UTILITIES FOR FIBONACCI LAWS OF PLANETARY MOTION
=====================================================================

This module provides the common data and helper functions used across all
Fibonacci investigation scripts. Import with:

    from constants_scripts import *

Data sources:
  - Masses: JPL DE440 (solar mass units)
  - J2000 eccentricities: NASA Planetary Fact Sheet
  - Base eccentricities: Holistic Universe Model midpoint predictions
  - Inclination amplitudes: Computed from ψ/(d×√m) with pure Fibonacci divisors
  - Semi-major axes: NASA Planetary Fact Sheet (AU)
  - Orbital periods: Derived from semi-major axes (years)
  - Oscillation period fractions: Holistic Universe Model (T_osc/H = a/b)

Framework (2025):
  - Single ψ-constant for all 8 planets
  - Pure Fibonacci divisors d ∈ {3, 5, 21, 34}
  - Saturn sole anti-phase planet (MAX inclination at balanced year)
  - Six laws: Inclination Amplitude, Inclination Balance, Eccentricity Balance,
    Perihelion Argument, Eccentricity Formation, and Precession Rate
"""

import math
import sys
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════
# SOURCE OF TRUTH: tools/lib/constants.js (loaded via Node.js bridge)
# ═══════════════════════════════════════════════════════════════════════════
# All input constants, derived values, and fitted coefficients are loaded from
# constants.js via load_constants.py. No values are hardcoded here.

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / 'fit' / 'python'))
from load_constants import C as _C

# ═══════════════════════════════════════════════════════════════════════════
# FUNDAMENTAL CONSTANTS (from constants.js)
# ═══════════════════════════════════════════════════════════════════════════

H = _C['H']
PHI = (1 + math.sqrt(5)) / 2  # Golden ratio ≈ 1.618034
J2000_YEAR = 2000
BALANCE_YEAR = _C['balancedYear']

# Model reference point
_START_MODEL_JD = _C['startmodelJD']
JUNE_SOLSTICE_2000_JD = _C['ASTRO_REFERENCE']['juneSolstice2000_JD']
_START_MODEL_YEAR = _C['startmodelYear'] + (_C['correctionDays'] / _C['meanSolarYearDays'])
_MEAN_SOLAR_YEAR = _C['meanSolarYearDays']
BALANCED_JD = _C['balancedJD']

# Earth parameters
EARTH_BASE_ECCENTRICITY = _C['eccentricityBase']
EARTH_ECCENTRICITY_AMPLITUDE = _C['eccentricityAmplitude']
EARTH_OBLIQUITY_MEAN = _C['earthtiltMean']
EARTH_INCLINATION_MEAN = _C['earthInvPlaneInclinationMean']
EARTH_INCLINATION_AMPLITUDE = _C['earthInvPlaneInclinationAmplitude']
EARTH_RA_ANGLE = _C['earthRAAngle']

# Cardinal Point JD harmonics (fitted, from constants.js)
CARDINAL_POINT_ANCHORS = {k: v for k, v in _C['CARDINAL_POINT_ANCHORS'].items()}
CARDINAL_POINT_HARMONICS = {
    k: [tuple(h) for h in v] for k, v in _C['CARDINAL_POINT_HARMONICS'].items()
}
SOLSTICE_JD_HARMONICS = CARDINAL_POINT_HARMONICS['SS']

# Obliquity formula (fitted, from constants.js)
SOLSTICE_OBLIQUITY_MEAN = _C['SOLSTICE_OBLIQUITY_MEAN']
SOLSTICE_OBLIQUITY_HARMONICS = [tuple(h) for h in _C['SOLSTICE_OBLIQUITY_HARMONICS']]

# Earth perihelion harmonics (fitted, from fitted-coefficients.js via constants.js)
# PERI_HARMONICS: list of (period_years, sin_coeff, cos_coeff)
# PERI_OFFSET: DC offset in degrees
PERI_HARMONICS = [tuple(h) for h in _C['PERI_HARMONICS']]
PERI_OFFSET = _C['PERI_OFFSET']

# Earth phase angle: ω̃_ICRF at max inclination (from balanced year)
PHASE_ANGLE = 21.77  # degrees (was 203.3195 in ascending-node-based model)

# Physical & astronomical constants (from constants.js)
_AU_KM = _C['currentAUDistance']
_SIDEREAL_YEAR_S = _C['meanSiderealYearSeconds']
_G = _C['G_CONSTANT']
_MASS_RATIO_EARTH_MOON = _C['MASS_RATIO_EARTH_MOON']
_INPUT_MEAN_SOLAR_YEAR = _C['inputMeanSolarYear']

# Moon input constants (from constants.js)
_MOON_SIDEREAL_MONTH_INPUT = _C['moonSiderealMonthInput']
_MOON_DISTANCE_KM = _C['moonDistance']

# DE440 Sun/planet mass ratios (from constants.js)
_MASS_RATIO_DE440 = {name.capitalize(): ratio for name, ratio in _C['massRatioDE440'].items()}

# Planet solarYearInput values (from constants.js planets object)
_SOLAR_YEAR_INPUT = {
    p['name']: p['solarYearInput'] for p in _C['planets'].values()
}

# ═══════════════════════════════════════════════════════════════════════════
# DERIVED CONSTANTS (from constants.js, no recomputation needed)
# ═══════════════════════════════════════════════════════════════════════════

_MEAN_SOLAR_YEAR_DAYS = _C['meanSolarYearDays']
_MEAN_SIDEREAL_YEAR_DAYS = _C['meanSiderealYearDays']
_MEAN_LENGTH_OF_DAY = _SIDEREAL_YEAR_S / _MEAN_SIDEREAL_YEAR_DAYS
_MEAN_SIDEREAL_DAY = (_MEAN_SOLAR_YEAR_DAYS / (_MEAN_SOLAR_YEAR_DAYS + 1)) * _MEAN_LENGTH_OF_DAY
_TOTAL_DAYS_IN_H = _C['totalDaysInH']
_MEAN_ANOM_YEAR_DAYS = _C['meanAnomalisticYearDays']
_ECCENTRICITY_DERIVED_MEAN = _C['eccentricityDerivedMean']

# Year-length harmonics (fitted, from constants.js — periods use H, not hardcoded)
TROPICAL_YEAR_HARMONICS = [
    (H / h[0], h[1], h[2]) for h in _C['TROPICAL_YEAR_HARMONICS']
]
SIDEREAL_YEAR_HARMONICS = [
    (H / h[0], h[1], h[2]) for h in _C['SIDEREAL_YEAR_HARMONICS']
]
ANOMALISTIC_YEAR_HARMONICS = [
    (H / h[0], h[1], h[2]) for h in _C['ANOMALISTIC_YEAR_HARMONICS']
]

# Moon sidereal month
_MOON_SIDEREAL_MONTH = _TOTAL_DAYS_IN_H / math.ceil(_TOTAL_DAYS_IN_H / _MOON_SIDEREAL_MONTH_INPUT)

# GM_SUN from Kepler's 3rd law
_GM_SUN = (4 * math.pi**2 * _AU_KM**3) / _SIDEREAL_YEAR_S**2
_M_SUN = _GM_SUN / _G

# Earth mass via Moon orbital mechanics
_SOLAR_SIDEREAL_DAY_RATIO = _MEAN_LENGTH_OF_DAY / _MEAN_SIDEREAL_DAY
_GM_EARTH_MOON_SYSTEM = (4 * math.pi**2 * _MOON_DISTANCE_KM**3) / \
    (_MOON_SIDEREAL_MONTH * _MEAN_LENGTH_OF_DAY)**2
_GM_EARTH = _GM_EARTH_MOON_SYSTEM * \
    (_MASS_RATIO_EARTH_MOON / (_MASS_RATIO_EARTH_MOON + 1)) * _SOLAR_SIDEREAL_DAY_RATIO

# ═══════════════════════════════════════════════════════════════════════════
# PLANET LIST (inner → outer)
# ═══════════════════════════════════════════════════════════════════════════

PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars",
                "Jupiter", "Saturn", "Uranus", "Neptune"]

# ═══════════════════════════════════════════════════════════════════════════
# MASSES (solar mass units) — computed from DE440 mass ratios
# Replicates constants.js section 9: massFraction[k] = 1 / ratio
# Earth via Moon orbital mechanics (same chain as constants.js)
# ═══════════════════════════════════════════════════════════════════════════

MASS = {p: 1.0 / _MASS_RATIO_DE440[p] for p in PLANET_NAMES if p != "Earth"}
MASS["Earth"] = (_GM_EARTH / _G) / _M_SUN

# Alias used in some scripts
MASSES = MASS

# Precomputed √m
SQRT_M = {p: math.sqrt(MASS[p]) for p in PLANET_NAMES}

# ═══════════════════════════════════════════════════════════════════════════
# ECCENTRICITIES
# ═══════════════════════════════════════════════════════════════════════════

# J2000 snapshot values (from constants.js planets + ASTRO_REFERENCE)
ECC_J2000 = {p['name']: p['orbitalEccentricityJ2000'] for p in _C['planets'].values()}
ECC_J2000["Earth"] = _C['ASTRO_REFERENCE']['earthEccentricityJ2000']

# Base eccentricities (from constants.js orbitalEccentricityBase)
ECC_BASE = {p['name']: p['orbitalEccentricityBase'] for p in _C['planets'].values()}
ECC_BASE["Earth"] = EARTH_BASE_ECCENTRICITY

# Eccentricity amplitudes (from constants.js orbitalEccentricityAmplitude)
ECC_AMPLITUDE_K = _C['eccentricityAmplitudeK']

AXIAL_TILT = {p['name']: p['axialTiltJ2000'] for p in _C['planets'].values()}
AXIAL_TILT["Earth"] = EARTH_OBLIQUITY_MEAN

LONGITUDE_PERIHELION = {p['name']: p['longitudePerihelion'] for p in _C['planets'].values()}
LONGITUDE_PERIHELION["Earth"] = _C['ASTRO_REFERENCE']['earthPerihelionLongitudeJ2000']  # 102.947
PERIHELION_ECLIPTIC_YEARS = {p['name']: p['perihelionEclipticYears'] for p in _C['planets'].values()}

# Predicted obliquity cycle periods (years) from Fibonacci decomposition
# See docs/37-planets-precession-cycles.md § Obliquity Cycle Theory
# Mercury, Earth, Mars: confirmed (0.2%, 2%, 0.7% error vs observations)
# Jupiter, Saturn, Uranus: predictions; Venus, Neptune: N/A
OBLIQUITY_CYCLE = {
    "Mercury": H * 8 / 3,     # 8H/3 = 894,179 yr (observed ~895 kyr, Bills 2005)
    "Venus":   None,           # N/A — tidally damped at 177°
    "Earth":   H / 8,          # H/8 = 41,915 yr (observed ~41,000 yr)
    "Mars":    3 * H / 8,      # 3H/8 = 125,744 yr (observed ~124,800 yr, Laskar 2004)
    "Jupiter": H / 2,          # H/2 = 167,659 yr (prediction)
    "Saturn":  H / 3,          # H/3 = 111,772 yr (prediction, mirror-pair with Earth)
    "Uranus":  H / 2,          # H/2 = 167,659 yr (prediction, tentative)
    "Neptune": None,           # N/A — frozen at ~28°
}

ECC_AMPLITUDE = {p['name']: p['orbitalEccentricityAmplitude'] for p in _C['planets'].values()}
ECC_AMPLITUDE["Earth"] = EARTH_ECCENTRICITY_AMPLITUDE

# Eccentricity phase angles at J2000 (degrees)
# Inner planets: solved from J2000 constraint cos(φ) = (e_J2000 - e_base) / e_amplitude
# Outer planets: set to maximize proximity to JPL J2000 eccentricity (amplitude negligible)
# Each planet oscillates at its own eccentricity cycle (axial-meets-inclination beat)
# Earth phase = ω + 90° = 192.95° (longitude of perihelion + 90°)
ECC_PHASE_J2000 = {p['name']: p['eccentricityPhaseJ2000'] for p in _C['planets'].values()}
ECC_PHASE_J2000["Earth"] = _C['ASTRO_REFERENCE']['earthPerihelionLongitudeJ2000'] + 90  # ω + 90°

# Default eccentricity set for balance computations: BASE values
# (base eccentricities give 100% Law 5 balance by construction)
ECCENTRICITIES = dict(ECC_BASE)

# Aliases
ECC = ECCENTRICITIES
ECC_DUAL_BALANCED = ECC_BASE  # Legacy alias (base eccentricities supersede dual-balanced)

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI DIVISORS (pure Fibonacci, mirror-symmetric)
# ═══════════════════════════════════════════════════════════════════════════

# Pure Fibonacci divisor assignments — Config #1, the unique mirror-symmetric
# configuration from exhaustive search of 7,558,272 candidates (755 achieve
# balance above 99.994%; this is the only one with exact mirror symmetry).
D = {p['name']: p['fibonacciD'] for p in _C['planets'].values()}
D["Earth"] = 3  # F_4 (Earth is the observer, not in planets object)

# Alias for backwards compatibility
D_INCL = D

# Mirror pairs across the asteroid belt
MIRROR_PAIRS = [
    ("Mars", "Jupiter"),     # d = 5 (F_5), belt-adjacent
    ("Earth", "Saturn"),     # d = 3 (F_4), middle
    ("Venus", "Neptune"),    # d = 34 (F_9), far
    ("Mercury", "Uranus"),   # d = 21 (F_8), outermost
]

# ═══════════════════════════════════════════════════════════════════════════
# PHASE GROUPS
# ═══════════════════════════════════════════════════════════════════════════

# Balance groups: Saturn is the sole anti-phase planet
# Per-planet phase angles are in INCL_CYCLE_ANCHOR (ICRF perihelion at balanced year)
PHASE_GROUP = {
    "Mercury": "in-phase", "Venus": "in-phase", "Earth": "in-phase", "Mars": "in-phase",
    "Jupiter": "in-phase", "Saturn": "anti-phase", "Uranus": "in-phase", "Neptune": "in-phase",
}

# Planet lists by balance group
GROUP_IN_PHASE = [p for p in PLANET_NAMES if p != "Saturn"]
GROUP_ANTI = ["Saturn"]
# Backwards compatibility aliases
GROUP_203 = GROUP_IN_PHASE  # legacy alias
GROUP_23 = GROUP_ANTI

# ═══════════════════════════════════════════════════════════════════════════
# ψ-CONSTANT (single, universal)
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci numbers used in the formula
FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]

# ψ derived from Earth's fitted inclination amplitude: PSI = d_Earth × amp_Earth × √m_Earth
PSI = 3 * EARTH_INCLINATION_AMPLITUDE * math.sqrt(MASS["Earth"])

# Backwards compatibility aliases
PSI1 = PSI
PSI1_THEORY = PSI

# ═══════════════════════════════════════════════════════════════════════════
# INCLINATION AMPLITUDES (computed from ψ/(d×√m), degrees)
# ═══════════════════════════════════════════════════════════════════════════

# Amplitudes are derived quantities, not input data
INCL_AMP = {p: PSI / (D[p] * SQRT_M[p]) for p in PLANET_NAMES}

# Alias used in some scripts
INCLINATION_AMPS = INCL_AMP

# ═══════════════════════════════════════════════════════════════════════════
# ORBITAL PROPERTIES
# ═══════════════════════════════════════════════════════════════════════════

# Semi-major axes (AU) and orbital periods — computed from Holistic chain
# Replicates constants.js section 10:
#   solarYearCount = round(totalDaysInH / solarYearInput)
#   orbitDistance = ((H / solarYearCount)²)^(1/3)     [Kepler's 3rd law]
#   period = H / solarYearCount                       [in solar years]
_SOLAR_YEAR_COUNT = {}
SEMI_MAJOR = {"Earth": 1.0}
ORBITAL_PERIOD = {"Earth": 1.0}
for _p, _syi in _SOLAR_YEAR_INPUT.items():
    _syc = round(_TOTAL_DAYS_IN_H / _syi)
    _SOLAR_YEAR_COUNT[_p] = _syc
    SEMI_MAJOR[_p] = ((H / _syc) ** 2) ** (1/3)
    ORBITAL_PERIOD[_p] = H / _syc

# Alias
SMA = SEMI_MAJOR

# J2000 invariable plane inclinations (from constants.js invPlaneInclinationJ2000)
INCL_J2000 = {p['name']: round(p['invPlaneInclinationJ2000'], 4) for p in _C['planets'].values()}
INCL_J2000["Earth"] = 1.5787  # Souami & Souchay 2012

# J2000 longitude of ascending node (from constants.js ascendingNodeInvPlane)
OMEGA_J2000 = {p['name']: p['ascendingNodeInvPlane'] for p in _C['planets'].values()}
OMEGA_J2000["Earth"] = _C['earthAscendingNodeInvPlane']  # 284.51

# Mean inclinations to invariable plane (from constants.js invPlaneInclinationMean)
INCL_MEAN = {p['name']: p['invPlaneInclinationMean'] for p in _C['planets'].values()}
INCL_MEAN["Earth"] = EARTH_INCLINATION_MEAN

# Phase angle for inclination oscillation (from constants.js inclinationCycleAnchor)
INCL_CYCLE_ANCHOR = {p['name']: p['inclinationCycleAnchor'] for p in _C['planets'].values()}
INCL_CYCLE_ANCHOR["Earth"] = PHASE_ANGLE  # 21.77

# J2000 orbital inclination to ecliptic (from constants.js eclipticInclinationJ2000)
INCL_ECLIPTIC = {p['name']: round(p['eclipticInclinationJ2000'], 3) for p in _C['planets'].values()}
INCL_ECLIPTIC["Earth"] = 0.000

# Inclination oscillation periods (years)
INCL_PERIOD = {
    "Mercury": round(H * 8 / 11),  # H × 8/11
    "Venus":   H * 2,               # H × 2
    "Earth":   round(H / 3),        # H/3
    "Mars":    round(H * 3 / 13),   # H × 3/13
    "Jupiter": round(H / 5),        # H/5
    "Saturn":  round(H / 8),        # H/8
    "Uranus":  round(H / 3),        # H/3
    "Neptune": H * 2,               # H × 2
}

# ═══════════════════════════════════════════════════════════════════════════
# OSCILLATION PERIOD FRACTIONS (T_osc / H = a / b)
# ═══════════════════════════════════════════════════════════════════════════

PERIOD_FRAC = {
    "Mercury": (8, 11),
    "Venus":   (2, 1),
    "Earth":   (1, 3),
    "Mars":    (3, 13),
    "Jupiter": (1, 5),
    "Saturn":  (1, 8),
    "Uranus":  (1, 3),
    "Neptune": (2, 1),
}

# E–J–S period denominators (used in ψ formula)
FIBONACCI_SLOTS = {"Earth": 3, "Jupiter": 5, "Saturn": 8}

# ═══════════════════════════════════════════════════════════════════════════
# ECCENTRICITY LADDER (ξ-ladder)
# ═══════════════════════════════════════════════════════════════════════════

# Eccentricity ladder multipliers (relative to Venus = 1)
K_ECC = {
    "Mercury": 8, "Venus": 1, "Earth": 5/2, "Mars": 5,
}

# Outer planet eccentricity ratios
# Jupiter-Saturn: ξ_S = (8/13)×ξ_J
# Uranus-Neptune: ξ_U = 5×ξ_N

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI SEQUENCES AND RATIO MATCHING
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci numbers used for ratio matching (unique values)
FIB_MATCH = [1, 2, 3, 5, 8, 13, 21]

# Fibonacci index lookup: Fibonacci number → position (1-indexed: F_1=1, F_3=2, ...)
FIB_INDEX = {1: 1, 2: 3, 3: 4, 5: 5, 8: 6, 13: 7, 21: 8, 34: 9, 55: 10, 89: 11}

# Fibonacci set for membership testing
FIB_SET = set(FIB_MATCH)


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def eta(planet):
    """Mass-weighted inclination amplitude: η = amp × √m"""
    return INCL_AMP[planet] * SQRT_M[planet]


def xi(planet, use_j2000=False):
    """Mass-weighted eccentricity: ξ = e × √m
    If use_j2000=True, uses ECC_J2000 values; otherwise uses ECC_BASE (default).
    """
    e = ECC_J2000[planet] if use_j2000 else ECC_BASE[planet]
    return e * SQRT_M[planet]


def xi_base(planet):
    """Mass-weighted base eccentricity: ξ = e_base × √m"""
    return ECC_BASE[planet] * SQRT_M[planet]


def pct_err(predicted, actual):
    """Percentage error: (predicted - actual) / actual × 100"""
    if actual == 0:
        return float('inf')
    return (predicted - actual) / actual * 100


def nearest_fib_ratio(value, fibs=None):
    """Find nearest Fibonacci ratio a/b to value.
    Returns (a, b, ratio, relative_error).
    """
    if fibs is None:
        fibs = FIB_MATCH
    best_err = float('inf')
    best = None
    for a in fibs:
        for b in fibs:
            r = a / b
            err = abs(value / r - 1.0) if value != 0 and r > 0 else float('inf')
            if err < best_err:
                best_err = err
                best = (a, b, r, err)
    return best


def fib_str(n, d=1):
    """Format a fraction n/d as string."""
    if d == 1:
        return str(n)
    return f"{n}/{d}"


def fib_n(n):
    """Return n-th Fibonacci number (F_0=0, F_1=1, F_2=1, ...)"""
    if n < len(FIB):
        return FIB[n]
    a, b = FIB[-2], FIB[-1]
    for _ in range(n - len(FIB) + 1):
        a, b = b, a + b
    return b


def pisano_period(m):
    """Compute Pisano period π(m) — period of Fibonacci sequence mod m"""
    a, b = 0, 1
    for i in range(1, 6 * m + 1):
        a, b = b, (a + b) % m
        if a == 0 and b == 1:
            return i
    return -1


# ═══════════════════════════════════════════════════════════════════════════
# PRECOMPUTED MASS-WEIGHTED PARAMETERS
# ═══════════════════════════════════════════════════════════════════════════

# Mass-weighted inclination amplitudes
ETA = {p: eta(p) for p in PLANET_NAMES}

# Mass-weighted eccentricities (default set)
XI = {p: xi(p) for p in PLANET_NAMES}

# Mass-weighted base eccentricities
XI_BASE = {p: xi_base(p) for p in PLANET_NAMES}


# ═══════════════════════════════════════════════════════════════════════════
# LAW VERIFICATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def inclination_weight(planet):
    """Law 3 structural weight: w_j = √(m × a × (1-e²)) / d"""
    m = MASS[planet]
    a = SMA[planet]
    e = ECC[planet]
    d = D[planet]
    return math.sqrt(m * a * (1 - e**2)) / d


def eccentricity_weight(planet):
    """Law 5 eccentricity weight: v_j = √m × a^(3/2) × e / √d"""
    m = MASS[planet]
    a = SMA[planet]
    e = ECC[planet]
    d = D[planet]
    return math.sqrt(m) * a**1.5 * e / math.sqrt(d)


def verify_law2():
    """Verify Law 3: inclination balance between in-phase and anti-phase groups.
    Returns (sum_pro, sum_anti, balance_pct).
    """
    sum_pro = sum(inclination_weight(p) for p in GROUP_IN_PHASE)
    sum_anti = sum(inclination_weight(p) for p in GROUP_ANTI)
    balance = 1 - abs(sum_pro - sum_anti) / (sum_pro + sum_anti)
    return sum_pro, sum_anti, balance * 100


def verify_law3():
    """Verify Law 5: eccentricity balance between in-phase and anti-phase groups.
    Returns (sum_pro, sum_anti, balance_pct).
    """
    sum_pro = sum(eccentricity_weight(p) for p in GROUP_IN_PHASE)
    sum_anti = sum(eccentricity_weight(p) for p in GROUP_ANTI)
    balance = 1 - abs(sum_pro - sum_anti) / (sum_pro + sum_anti)
    return sum_pro, sum_anti, balance * 100


def predict_saturn_eccentricity():
    """Finding 4: predict Saturn's eccentricity from eccentricity balance.
    Returns (predicted_e, actual_e, error_pct).
    """
    sum_pro = sum(eccentricity_weight(p) for p in GROUP_IN_PHASE)
    coeff = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
    predicted = sum_pro / coeff
    actual = ECC["Saturn"]
    return predicted, actual, pct_err(predicted, actual)


def compute_mean_inclination(planet):
    """Compute mean inclination from J2000 constraint.
    mean = i_J2000 - amp × cos(ω̃_J2000 - phaseAngle)
    """
    amp = INCL_AMP[planet]
    i_j2000 = INCL_J2000[planet]
    peri_long = LONGITUDE_PERIHELION[planet]
    phase = INCL_CYCLE_ANCHOR[planet]
    sign = -1 if planet == 'Saturn' else 1
    mean = i_j2000 - sign * amp * math.cos(math.radians(peri_long - phase))
    return mean

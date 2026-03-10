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
  - Saturn sole retrograde planet (23° phase group)
  - Six laws: Inclination Amplitude, Inclination Balance, Eccentricity Balance,
    Perihelion Argument, Eccentricity Formation, and Precession Rate
"""

import math

# ═══════════════════════════════════════════════════════════════════════════
# FUNDAMENTAL CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

H = 335008  # Holistic-Year (years)
PHI = (1 + math.sqrt(5)) / 2  # Golden ratio ≈ 1.618034
J2000_YEAR = 2000
BALANCE_YEAR = round(1246 - 14.5 * (H / 16))  # balance year: 1246 - 14.5*(H/16)

# Earth parameters (constants.js section 3)
EARTH_BASE_ECCENTRICITY = 0.015372           # eccentricityBase: (max + min) / 2
EARTH_ECCENTRICITY_AMPLITUDE = 0.00137032    # eccentricityAmplitude: (max - min) / 2
EARTH_OBLIQUITY_MEAN = 23.41357              # earthtiltMean
EARTH_INCLINATION_MEAN = 1.481179            # earthInvPlaneInclinationMean
EARTH_INCLINATION_AMPLITUDE = 0.635970       # earthInvPlaneInclinationAmplitude

# Phase angle from s₈ eigenmode of Laplace-Lagrange secular perturbation theory
PHASE_ANGLE = 203.3195  # degrees

# Physical & astronomical constants (constants.js section 2)
_AU_KM = 149597870.698828            # km
_SIDEREAL_YEAR_S = 31558149.8        # seconds
_G = 6.6743e-20                      # km³/(kg·s²)
_MASS_RATIO_EARTH_MOON = 81.3007
_INPUT_MEAN_SOLAR_YEAR = 365.2421897 # days

# Moon input constants (constants.js section 4)
_MOON_SIDEREAL_MONTH_INPUT = 27.32166156  # days
_MOON_DISTANCE_KM = 384399.07            # km

# DE440 Sun/planet mass ratios (constants.js section 2)
_MASS_RATIO_DE440 = {
    "Mercury": 6023625.5, "Venus": 408523.72, "Mars": 3098703.59,
    "Jupiter": 1047.348625, "Saturn": 3497.9018,
    "Uranus": 22902.944, "Neptune": 19412.237,
}

# Planet solarYearInput values (constants.js section 5)
_SOLAR_YEAR_INPUT = {
    "Mercury": 87.9686, "Venus": 224.695, "Mars": 686.931,
    "Jupiter": 4330.5, "Saturn": 10747.0,
    "Uranus": 30586, "Neptune": 59980,
}

# ═══════════════════════════════════════════════════════════════════════════
# DERIVED CONSTANTS — replicates constants.js computation chain (sections 6-10)
# ═══════════════════════════════════════════════════════════════════════════

# Year and day lengths (constants.js section 6)
_MEAN_SOLAR_YEAR_DAYS = round(_INPUT_MEAN_SOLAR_YEAR * (H / 16)) / (H / 16)
_MEAN_SIDEREAL_YEAR_DAYS = _MEAN_SOLAR_YEAR_DAYS * (H / 13) / ((H / 13) - 1)
_MEAN_LENGTH_OF_DAY = _SIDEREAL_YEAR_S / _MEAN_SIDEREAL_YEAR_DAYS  # seconds
_MEAN_SIDEREAL_DAY = (_MEAN_SOLAR_YEAR_DAYS / (_MEAN_SOLAR_YEAR_DAYS + 1)) * _MEAN_LENGTH_OF_DAY
_TOTAL_DAYS_IN_H = H * _MEAN_SOLAR_YEAR_DAYS

# Moon sidereal month (constants.js section 7)
_MOON_SIDEREAL_MONTH = _TOTAL_DAYS_IN_H / math.ceil(_TOTAL_DAYS_IN_H / _MOON_SIDEREAL_MONTH_INPUT)

# GM_SUN from Kepler's 3rd law (constants.js section 9)
_GM_SUN = (4 * math.pi**2 * _AU_KM**3) / _SIDEREAL_YEAR_S**2
_M_SUN = _GM_SUN / _G

# Earth mass via Moon orbital mechanics (constants.js section 9)
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

# J2000 snapshot values (used in Holistic model computation chain)
ECC_J2000 = {
    "Mercury": 0.20563593,
    "Venus":   0.00677672,
    "Earth":   0.01671022,
    "Mars":    0.09339410,
    "Jupiter": 0.04838624,
    "Saturn":  0.05386179,
    "Uranus":  0.04725744,
    "Neptune": 0.00859048,
}

# Model-predicted base (midpoint) eccentricities
# Earth is from 3D simulation; others are model predictions
ECC_BASE = {
    "Mercury": 0.20853,
    "Venus":   0.00679,
    "Earth":   0.015372,
    "Mars":    0.09347,
    "Jupiter": 0.04839,
    "Saturn":  0.05386,
    "Uranus":  0.04726,
    "Neptune": 0.00870,
}

# Default eccentricity set: J2000 for most, base for Earth
# (used in significance tests, eccentricity balance, etc.)
ECCENTRICITIES = {
    "Mercury": 0.20563593,
    "Venus":   0.00677672,
    "Earth":   0.015372,    # base eccentricity from Holistic model
    "Mars":    0.09339410,
    "Jupiter": 0.04838624,
    "Saturn":  0.05386179,
    "Uranus":  0.04725744,
    "Neptune": 0.00859048,
}

# Dual-balanced eccentricities: inner planets use J2000, outer planets
# optimized for simultaneous 100% inclination + eccentricity balance.
# From constants.js orbitalEccentricity (see docs/20-constants-reference.md §675).
ECC_DUAL_BALANCED = {
    "Mercury": 0.20563593,  # J2000
    "Venus":   0.00677672,  # J2000
    "Earth":   0.01671022,  # J2000 (dual-balanced outer planets were optimized with this value)
    "Mars":    0.09339410,  # J2000
    "Jupiter": 0.04821478,  # Dual-balanced (-0.35% from J2000)
    "Saturn":  0.05374486,  # Dual-balanced = Law 5 prediction (-0.22% from J2000)
    "Uranus":  0.04734421,  # Dual-balanced (+0.18% from J2000)
    "Neptune": 0.00867761,  # Dual-balanced (+1.01% from J2000)
}

# Alias
ECC = ECCENTRICITIES

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI DIVISORS (pure Fibonacci, mirror-symmetric)
# ═══════════════════════════════════════════════════════════════════════════

# Pure Fibonacci divisor assignments — Config #3, the unique mirror-symmetric
# configuration from exhaustive search of 7,558,272 candidates (755 achieve
# balance above 99.994%; this is the only one with exact mirror symmetry).
D = {
    "Mercury": 21,  # F_8
    "Venus":   34,  # F_9
    "Earth":    3,  # F_4
    "Mars":     5,  # F_5
    "Jupiter":  5,  # F_5
    "Saturn":   3,  # F_4
    "Uranus":  21,  # F_8
    "Neptune": 34,  # F_9
}

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

# Phase groups from s₈ eigenmode (γ₈ ≈ 203.3195°)
# Saturn is the sole retrograde planet
PHASE_GROUP = {
    "Mercury": 203, "Venus": 203, "Earth": 203, "Mars": 203,
    "Jupiter": 203, "Saturn": 23, "Uranus": 203, "Neptune": 203,
}

# Planet lists by phase group
GROUP_203 = [p for p in PLANET_NAMES if PHASE_GROUP[p] == 203]
GROUP_23 = [p for p in PLANET_NAMES if PHASE_GROUP[p] == 23]

# ═══════════════════════════════════════════════════════════════════════════
# ψ-CONSTANT (single, universal)
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci numbers used in the formula
FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]

# Theoretical ψ from H and Fibonacci numbers (exact, zero free parameters)
# ψ = F_5 × F_8² / (2H) = 5 × 21² / (2 × 335008) = 2205/670016
PSI = FIB[5] * FIB[8]**2 / (2 * H)

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

# J2000 invariable plane inclinations (degrees) — Souami & Souchay 2012
INCL_J2000 = {
    "Mercury": 6.3473,
    "Venus":   2.1545,
    "Earth":   1.5787,
    "Mars":    1.6312,
    "Jupiter": 0.3220,
    "Saturn":  0.9255,
    "Uranus":  0.9947,
    "Neptune": 0.7354,
}

# J2000 longitude of ascending node (degrees) — Souami & Souchay 2012
OMEGA_J2000 = {
    "Mercury": 32.83,
    "Venus":   54.70,
    "Earth":   284.51,
    "Mars":    354.87,
    "Jupiter": 312.89,
    "Saturn":  118.81,
    "Uranus":  307.80,
    "Neptune": 192.04,
}

# J2000 orbital inclination to ecliptic (degrees)
INCL_ECLIPTIC = {
    "Mercury": 7.005,
    "Venus":   3.395,
    "Earth":   0.000,
    "Mars":    1.850,
    "Jupiter": 1.303,
    "Saturn":  2.489,
    "Uranus":  0.773,
    "Neptune": 1.770,
}

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
# ECCENTRICITY LADDER (Finding 6)
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


def xi(planet, use_base=False):
    """Mass-weighted eccentricity: ξ = e × √m
    If use_base=True, uses ECC_BASE values; otherwise uses ECCENTRICITIES (default).
    """
    e = ECC_BASE[planet] if use_base else ECCENTRICITIES[planet]
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
    """Verify Law 3: inclination balance between phase groups.
    Returns (sum_203, sum_23, balance_pct).
    """
    sum_203 = sum(inclination_weight(p) for p in GROUP_203)
    sum_23 = sum(inclination_weight(p) for p in GROUP_23)
    balance = 1 - abs(sum_203 - sum_23) / (sum_203 + sum_23)
    return sum_203, sum_23, balance * 100


def verify_law3():
    """Verify Law 5: eccentricity balance between phase groups.
    Returns (sum_203, sum_23, balance_pct).
    """
    sum_203 = sum(eccentricity_weight(p) for p in GROUP_203)
    sum_23 = sum(eccentricity_weight(p) for p in GROUP_23)
    balance = 1 - abs(sum_203 - sum_23) / (sum_203 + sum_23)
    return sum_203, sum_23, balance * 100


def predict_saturn_eccentricity():
    """Finding 4: predict Saturn's eccentricity from eccentricity balance.
    Returns (predicted_e, actual_e, error_pct).
    """
    sum_203 = sum(eccentricity_weight(p) for p in GROUP_203)
    coeff = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
    predicted = sum_203 / coeff
    actual = ECC["Saturn"]
    return predicted, actual, pct_err(predicted, actual)


def compute_mean_inclination(planet):
    """Compute mean inclination from J2000 constraint.
    mean = i_J2000 - amp × cos(Ω_J2000 - φ_group)
    """
    amp = INCL_AMP[planet]
    i_j2000 = INCL_J2000[planet]
    omega = OMEGA_J2000[planet]
    phi = PHASE_ANGLE if PHASE_GROUP[planet] == 203 else PHASE_ANGLE - 180
    mean = i_j2000 - amp * math.cos(math.radians(omega - phi))
    return mean

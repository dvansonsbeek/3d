#!/usr/bin/env python3
"""
SHARED CONSTANTS AND UTILITIES FOR FIBONACCI LAWS OF PLANETARY MOTION
=====================================================================

This module provides the common data and helper functions used across all
Fibonacci investigation scripts. Import with:

    from fibonacci_data import *

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

# Earth base eccentricity (from 3D simulation — arithmetic midpoint)
EARTH_BASE_ECCENTRICITY = 0.015373

# Phase angle from s₈ eigenmode of Laplace-Lagrange secular perturbation theory
PHASE_ANGLE = 203.3195  # degrees

# ═══════════════════════════════════════════════════════════════════════════
# PLANET LIST (inner → outer)
# ═══════════════════════════════════════════════════════════════════════════

PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars",
                "Jupiter", "Saturn", "Uranus", "Neptune"]

# ═══════════════════════════════════════════════════════════════════════════
# MASSES (solar mass units, from Holistic computation chain)
# Derived from JPL mass ratios via the model's GM_SUN calculation.
# Earth uses Moon-based derivation (see 88-verify-laws.js).
# ═══════════════════════════════════════════════════════════════════════════

MASS = {
    "Mercury": 1.66012977e-7,
    "Venus":   2.44783828e-6,
    "Earth":   3.00345781e-6,  # Earth + Moon system (Moon-based derivation)
    "Mars":    3.22715604e-7,
    "Jupiter": 9.54791916e-4,
    "Saturn":  2.85885670e-4,
    "Uranus":  4.36625091e-5,
    "Neptune": 5.15138982e-5,
}

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
    "Earth":   0.015373,
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
    "Earth":   0.015373,    # base eccentricity from Holistic model
    "Mars":    0.09339410,
    "Jupiter": 0.04838624,
    "Saturn":  0.05386179,
    "Uranus":  0.04725744,
    "Neptune": 0.00859048,
}

# Alias
ECC = ECCENTRICITIES

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI DIVISORS (pure Fibonacci, mirror-symmetric)
# ═══════════════════════════════════════════════════════════════════════════

# Pure Fibonacci divisor assignments — Config #32, the unique mirror-symmetric
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

# Semi-major axes (AU) — from Holistic computation chain
# Derived from orbital periods via Kepler's 3rd law with H = 335,008
SEMI_MAJOR = {
    "Mercury": 0.3871067366,
    "Venus":   0.7233418423,
    "Earth":   1.0000000000,
    "Mars":    1.5236643290,
    "Jupiter": 5.1997058190,
    "Saturn":  9.5306163820,
    "Uranus":  19.138024550,
    "Neptune": 29.960474780,
}

# Alias
SMA = SEMI_MAJOR

# Orbital periods (years)
ORBITAL_PERIOD = {
    "Mercury": 0.24085,
    "Venus":   0.61520,
    "Earth":   1.00002,
    "Mars":    1.88085,
    "Jupiter": 11.8622,
    "Saturn":  29.4571,
    "Uranus":  84.0107,
    "Neptune": 164.790,
}

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

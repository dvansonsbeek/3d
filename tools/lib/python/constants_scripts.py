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
  - Base eccentricities: the model's midpoint predictions
  - Inclination amplitudes: RETIRED with the ψ law (plan 07 R5) — the
    N-body chain carries a planet's inclination of date
  - Semi-major axes: NASA Planetary Fact Sheet (AU)
  - Orbital periods: Derived from semi-major axes (years)
  - Oscillation period fractions: the model's (T_osc/H = a/b)

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
BALANCE_YEAR = _C['balancedYear']   # plan 07 R10: 2000 — the combs' phase origin is J2000
# Plan 07 R10: the K device's perihelion wheel stands 16 × this (anchor-unit
# cycles) on at J2000 — the "270° at the origin" convention's J2000 phase.
K_DEVICE_WHEEL_PHASE_J2000_CYCLES = _C['kDeviceWheelPhaseAtJ2000Cycles']

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

# Earth inclination cycle anchor: ω̃_ICRF at max inclination (from balanced year)
EARTH_INCL_CYCLE_ANCHOR = 21.77  # degrees (was 203.3195 in ascending-node-based model)

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

# Moon sidereal month (matches constants.js line 271 / script.js line 3347:
# integer orbit count via Math.round, then total-days-in-H divided by count).
# round() in Python uses banker's rounding which diverges from JS Math.round
# at exact .5 boundaries; for these inputs the fractional part is ~0.14, so
# round() matches Math.round() exactly.
_MOON_SIDEREAL_MONTH = _TOTAL_DAYS_IN_H / round(
    _TOTAL_DAYS_IN_H / _MOON_SIDEREAL_MONTH_INPUT
)

# GM_SUN from Kepler's 3rd law
_GM_SUN = (4 * math.pi**2 * _AU_KM**3) / _SIDEREAL_YEAR_S**2
_M_SUN = _GM_SUN / _G

# Earth mass via Moon orbital mechanics (matches constants.js / script.js).
# Δa correction for the Moon's apparent semi-major axis:
#   Δa = a_M × M_M/(M_E + M_M) × m ≈ 349 km
# is the leading-order correction for the Sun's tidal coupling to the
# Earth-Moon barycentric wobble (Earth-Moon-Sun 3-body). Closes
# G(M_E + M_M) to ~3.7 ppm of JPL DE440 — better and more physically
# motivated than the older "1 + 1/year" SSDR factor that was used here
# previously. See doc 24 for the universal mass-from-moon formula.
_MOON_ORBITAL_SHIFT_KM = _MOON_DISTANCE_KM * (1.0 / (_MASS_RATIO_EARTH_MOON + 1)) \
    * (_MOON_SIDEREAL_MONTH / _MEAN_SIDEREAL_YEAR_DAYS)
_MOON_DISTANCE_CORRECTED_KM = _MOON_DISTANCE_KM + _MOON_ORBITAL_SHIFT_KM
_GM_EARTH_MOON_SYSTEM = (4 * math.pi**2 * _MOON_DISTANCE_CORRECTED_KM**3) / \
    (_MOON_SIDEREAL_MONTH * _MEAN_LENGTH_OF_DAY)**2
_GM_EARTH = _GM_EARTH_MOON_SYSTEM * \
    (_MASS_RATIO_EARTH_MOON / (_MASS_RATIO_EARTH_MOON + 1))

# ═══════════════════════════════════════════════════════════════════════════
# PLANET LIST (inner → outer)
# ═══════════════════════════════════════════════════════════════════════════

PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars",
                "Jupiter", "Saturn", "Uranus", "Neptune"]

# ═══════════════════════════════════════════════════════════════════════════
# MASSES (solar mass units) — Fibonacci-law convention: Earth ALONE,
# other planets SYSTEM (planet + moons)
# ───────────────────────────────────────────────────────────────────────────
# • MASS["Earth"]                 — Earth ALONE (Moon factored out via the
#                                   Moon-orbital-mechanics chain above; matches
#                                   M_EARTH_ALONE in script.js)
# • MASS[<other planet>]          — planet + moons SYSTEM (matches
#                                   M_<PLANET>_SYSTEM in script.js); for the
#                                   moonless inner planets Mercury / Venus this
#                                   is identical to ALONE; for Mars, Jupiter,
#                                   Saturn, Uranus, Neptune the satellites add
#                                   a small but non-zero contribution.
#
# The Fibonacci-law balance equations compare M_Earth_ALONE against
# M_<other>_SYSTEM because Earth's contribution to the balance is the planet
# itself (the Moon is already accounted for separately in the inclination
# constant ψ), while each outer planet's gravitational signature on the
# Sun's wobble is the full planet+moons SYSTEM. Using SYSTEM for Earth
# would double-count the Moon; using ALONE for the outer planets would
# under-count their gravitational effect.
#
# Source ratios: astro-reference.json::massRatioDE440 (JPL DE440 SYSTEM
# ratios for the 7 non-Earth planets). Earth's mass is computed independently
# from Moon orbital mechanics (see _GM_EARTH derivation above).
# ═══════════════════════════════════════════════════════════════════════════

MASS = {p: 1.0 / _MASS_RATIO_DE440[p] for p in PLANET_NAMES if p != "Earth"}
MASS["Earth"] = (_GM_EARTH / _G) / _M_SUN

# Explicit ALONE / SYSTEM aliases — useful when a script wants to make the
# convention visible at the call site. Numerically identical to MASS[planet]
# (Earth ALONE, others SYSTEM); provided for readability, not for new physics.
MASS_EARTH_ALONE   = MASS["Earth"]
MASS_MERCURY_SYSTEM = MASS["Mercury"]   # Mercury has no moons; SYSTEM ≡ ALONE
MASS_VENUS_SYSTEM   = MASS["Venus"]     # Venus has no moons; SYSTEM ≡ ALONE
MASS_MARS_SYSTEM    = MASS["Mars"]
MASS_JUPITER_SYSTEM = MASS["Jupiter"]
MASS_SATURN_SYSTEM  = MASS["Saturn"]
MASS_URANUS_SYSTEM  = MASS["Uranus"]
MASS_NEPTUNE_SYSTEM = MASS["Neptune"]

# Alias used in some scripts
MASSES = MASS

# Precomputed √m (uses the same ALONE/SYSTEM convention as MASS)
SQRT_M = {p: math.sqrt(MASS[p]) for p in PLANET_NAMES}

# ═══════════════════════════════════════════════════════════════════════════
# ECCENTRICITIES
# ═══════════════════════════════════════════════════════════════════════════

# J2000 snapshot values (from constants.js planets + ASTRO_REFERENCE)
ECC_J2000 = {p['name']: p['orbitalEccentricityJ2000'] for p in _C['planets'].values()}
ECC_J2000["Earth"] = _C['ASTRO_REFERENCE']['earthEccentricityJ2000']

# Plan 07 R6: ECC_BASE and ECC_AMPLITUDE_K are RETIRED with the K law. The
# planets' base eccentricity was the K law's System-Reset construction and the
# K constant was inverted from Earth's calibration; neither exists any more.
# Analyses that want "the planet eccentricities" should use ECC_J2000 above —
# the observed values the N-body chain is anchored on. Earth's own base and
# amplitude survive as EARTH_BASE_ECCENTRICITY / EARTH_ECCENTRICITY_AMPLITUDE.

AXIAL_TILT = {p['name']: p['axialTiltJ2000'] for p in _C['planets'].values()}
AXIAL_TILT["Earth"] = EARTH_OBLIQUITY_MEAN

LONGITUDE_PERIHELION = {p['name']: p['longitudePerihelion'] for p in _C['planets'].values()}
LONGITUDE_PERIHELION["Earth"] = _C['ASTRO_REFERENCE']['earthPerihelionLongitudeJ2000']  # 102.947
PERIHELION_ECLIPTIC_YEARS = {p['name']: p['perihelionEclipticYears'] for p in _C['planets'].values()}

# Obliquity cycle periods (years) — loaded from model-parameters.json via constants.js.
# Obliquity cycle theory: obliquity = |inclination − ecliptic|; Venus/Neptune static.
# Mercury: 8H/3 (Fibonacci decomposition). Mars: 8H/21 (= Jupiter axial, mirror swap).
# Venus/Neptune: 8H/100 (= ICRF period → two-component formula cancels → constant obliquity).
# The planets' obliquityCycle was retired at plan 06 Phase 7 commit 2 (the
# device's beat of its integer axial and obliquity fractions); this dict has
# raised KeyError on import ever since, which made the whole module — and
# every script importing it — unrunnable, unnoticed, because no gate runs
# them. Fixed at plan 07 R6. Earth's H/8 entry survives.
OBLIQUITY_CYCLE = {"Earth": H / 8}  # 8 = 5 + 3 (the H/5 + H/3 beat)

# Plan 07 R6: the planets' ECC_AMPLITUDE and ECC_PHASE_J2000 went with the K
# law too. Earth's amplitude and phase stay, on the Earth side.
EARTH_ECC_AMPLITUDE = EARTH_ECCENTRICITY_AMPLITUDE
EARTH_ECC_PHASE_J2000 = _C['ASTRO_REFERENCE']['earthPerihelionLongitudeJ2000'] + 90  # ω + 90°

# Plan 07 R6: ECCENTRICITIES / ECC / ECC_DUAL_BALANCED all aliased ECC_BASE,
# the retired balance construction. The eccentricity set an analysis should
# use is ECC_J2000 — the observation, not a construction fitted to balance.
ECCENTRICITIES = dict(ECC_J2000)
ECC = ECCENTRICITIES

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI DIVISORS (pure Fibonacci, mirror-symmetric)
# ═══════════════════════════════════════════════════════════════════════════

# (Plan 07 R8: D / D_INCL — the per-planet divisor assignments of the retired
# ψ/K laws (model-parameters fibonacciD) — left with the laws' inputs; the
# JSON no longer carries them.)

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
# (ψ-CONSTANT and INCLINATION AMPLITUDES — RETIRED, plan 07 R5)
# PSI = 3 × amp_Earth × √m_Earth, its PSI1/PSI1_THEORY aliases, and the
# per-planet INCL_AMP = PSI/(d×√m) (alias INCLINATION_AMPS) stood here — the
# Python mirror of the ψ inclination law. Deleted with the law: a planet's
# inclination of date has one home, the N-body chain (@essrt/physics
# model.planets.inclinationDeg).
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci numbers (the retired divisor vocabulary; kept for the scripts that
# still read FIB as a plain list)
FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]

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

# (INCL_MEAN — the ψ law's per-planet mean inclinations, read from
# constants.js invPlaneInclinationMean — left with the law at plan 07 R5.)

# (Plan 07 R8: INCL_CYCLE_ANCHOR — the per-planet phase anchors of the retired
# ψ inclination law (model-parameters inclinationCycleAnchor) — left with the
# law's inputs. Earth's anchor, EARTH_INCL_CYCLE_ANCHOR, stays: it phases the
# eccentricity channel and is R10's subject.)

# J2000 orbital inclination to ecliptic (from constants.js eclipticInclinationJ2000)
INCL_ECLIPTIC = {p['name']: round(p['eclipticInclinationJ2000'], 3) for p in _C['planets'].values()}
INCL_ECLIPTIC["Earth"] = 0.000

# Perihelion ecliptic periods (years) — loaded from model-parameters.json via constants.js.
# These are the planet's perihelion precession rate as observed from Earth's ecliptic frame.
# Historical note: this dict is named INCL_PERIOD for backward compatibility; downstream
# consumers treat it as the planet's "own-frame" precession rate.
# NOTE: absolute (positive) periods. Venus (prograde) and Saturn (retrograde) kept as abs.
INCL_PERIOD = {p['name']: abs(round(p['perihelionEclipticYears']))
               for p in _C['planets'].values()}
INCL_PERIOD["Earth"] = round(H / 3)  # Earth uses ICRF period here (H/3) not ecliptic (H/16)

# ═══════════════════════════════════════════════════════════════════════════
# (OSCILLATION PERIOD FRACTIONS — RETIRED, plan 07 R1/R8)
# PERIOD_FRAC read model-parameters perihelionEclipticFraction directly — the
# H·num/den lattice periods of the retired device. The JSON no longer carries
# the pairs; a planet's perihelion period is the N-body chain's inertial
# apsidal period, 1,296,000/g yr, which PERIHELION_ECLIPTIC_YEARS / INCL_PERIOD
# above now carry through the bridge.
# ═══════════════════════════════════════════════════════════════════════════

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

# (eta(planet) — the mass-weighted ψ amplitude η = amp × √m — left with the
# ψ law at plan 07 R5.)


def xi(planet, use_j2000=True):
    """Mass-weighted eccentricity: ξ = e × √m

    Plan 07 R6: the `use_j2000=False` branch read ECC_BASE, the retired K
    law's construction. The observed J2000 eccentricity is now the only
    source, and the parameter is kept only so existing call sites still work.
    """
    e = ECC_J2000[planet]
    return e * SQRT_M[planet]


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

# (ETA — the mass-weighted ψ amplitudes — left with the ψ law at plan 07 R5.)

# Mass-weighted eccentricities, on the observed J2000 values
# (plan 07 R6: XI_BASE — the same on the retired K law's base — is gone with it)
XI = {p: xi(p) for p in PLANET_NAMES}


# ═══════════════════════════════════════════════════════════════════════════
# (LAW VERIFICATION FUNCTIONS — RETIRED, plan 07 R6/R8)
# inclination_weight, eccentricity_weight, verify_law2, verify_law3 and
# predict_saturn_eccentricity — the balance-law instruments on the divisor
# table D — stood here. The laws went at R6, the divisor at R8; doc 109 is the
# evidence record.
# ═══════════════════════════════════════════════════════════════════════════


# (compute_mean_inclination(planet) — the ψ law's J2000 constraint,
# mean = i_J2000 − s·amp·cos(ϖ_J2000 − anchor) — left with the law at plan 07 R5.)

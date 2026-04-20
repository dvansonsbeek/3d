"""
PHYSICAL-BEAT PREDICTIVE FORMULA (v2)
======================================

Feature matrix built entirely from physical periods derived from
model-parameters.json (via planet_beats module). No hardcoded H_DIV_X
constants — when you change a planet's period in JSON, ALL derived
feature frequencies update automatically.

AUTO-UPDATE GUARANTEES:
  ✓ Feature VALUES at any given year (always use current physical periods)
  ✓ Feature FREQUENCIES (tied to JSON periods, not hardcoded)

NOT AUTO-UPDATED (requires manual re-training):
  ✗ Fitted coefficients — must re-run train_precession_physical.py after
    any change to model-parameters.json that affects planet periods.
  ✗ Feature SET (which beats to include) — current design includes ALL
    physical beats per planet. If you want feature selection, run
    greedy_features.py (not yet updated for this formula).

FEATURE GROUPS:
  A. Earth reference (shared across all planets) — 38 terms
  B. Planet angles & cross-angles                  — 12 terms
  C. Planet fundamental periods                    — 12 terms (6 × sin/cos)
  D. Internal beats (planet × planet periods)      — up to 60 terms
  E. Earth cross-beats (planet × Earth periods)    — up to 144 terms
  F. Period × angle cross-terms                    — up to 24 terms
  I. Period × 2δ cross-products                    — up to 24 terms
  J. Fundamental × Earth sidebands (n=1 carrier)   — up to 384 terms
  K. High-harmonic ICRF internal-beat carriers ×   — 144 terms
     Earth ecl sidebands (captures 8H/N residuals
     like Venus's H/116 peak = 8×(V_ecl+V_icrf))
  L. High-harmonic fundamental carriers × Earth    — up to 288 terms
     ecl sidebands (captures residuals like
     Venus's 12·V_icrf ± k·E_ecl)

HARMONIC_ORDERS = (1, 2, 4, 6, 8, 12, 16) — Fourier harmonics of every
physical period and beat. Required because orbital oscillations are not
pure sinusoids (eccentricity, geocentric projection introduce harmonics).

Total: up to ~2100 features per planet (less for planets with None/frozen periods).

Usage:
    from predictive_formula_physical import build_features_physical
    features = build_features_physical(2000, 'Venus')  # list of 314 floats
"""

import math
import sys
from pathlib import Path
from typing import List, Tuple

# Path setup for sibling imports
_LIB_PYTHON = Path(__file__).resolve().parent
if str(_LIB_PYTHON) not in sys.path:
    sys.path.insert(0, str(_LIB_PYTHON))
_FIT_PYTHON = _LIB_PYTHON.parent.parent / 'fit' / 'python'
if str(_FIT_PYTHON) not in sys.path:
    sys.path.insert(0, str(_FIT_PYTHON))

from constants_scripts import (
    H, BALANCE_YEAR, EARTH_OBLIQUITY_MEAN,
    TROPICAL_YEAR_HARMONICS, SIDEREAL_YEAR_HARMONICS, ANOMALISTIC_YEAR_HARMONICS,
    PERI_HARMONICS, PERI_OFFSET, _ECCENTRICITY_DERIVED_MEAN,
    SOLSTICE_OBLIQUITY_MEAN, SOLSTICE_OBLIQUITY_HARMONICS,
    LONGITUDE_PERIHELION, PERIHELION_ECLIPTIC_YEARS,
)
from planet_beats import (
    fundamental_periods, internal_beats, earth_cross_beats, PERIOD_KEYS,
)

ANCHOR_YEAR = BALANCE_YEAR
J2000 = 2000
EARTH_ECC_MEAN = _ECCENTRICITY_DERIVED_MEAN


# =============================================================================
# FEATURE TEMPLATE — static list of (planet_period_key, earth_period_key, ...)
# built once per planet so the feature matrix has a stable column count.
# =============================================================================

# Earth fundamental periods (fixed — Earth is reference frame)
_EARTH_PERIODS = fundamental_periods('Earth')


def _get_feature_template(planet_name):
    """
    Build the static template of features for a given planet.
    Returns list of (group, tag, period_or_None) used to decide feature count.
    Periods that are None (e.g., frozen axial for Uranus/Neptune) are SKIPPED
    entirely — so feature count differs per planet.
    """
    template = []

    pp = fundamental_periods(planet_name)

    # GROUP C: fundamental periods (6 × sin/cos = 12 max)
    for k in PERIOD_KEYS:
        t = pp['T_' + k]
        if t is not None:
            template.append(('C', f'T_{k}', t))

    # GROUP D: internal beats (15 pairs × 2 = 30 max; × sin/cos = 60)
    for (k1, k2), b in internal_beats(planet_name).items():
        if b['sum'] is not None:
            template.append(('D', f'{k1}+{k2}', b['sum']))
        if b['diff'] is not None:
            template.append(('D', f'{k1}-{k2}', b['diff']))

    # GROUP E: Earth cross-beats (36 pairs × 2 = 72 max; × sin/cos = 144)
    for (pk, ek), b in earth_cross_beats(planet_name).items():
        if b['sum'] is not None:
            template.append(('E', f'{pk}+{ek}', b['sum']))
        if b['diff'] is not None:
            template.append(('E', f'{pk}-{ek}', b['diff']))

    return template


# Cache templates per planet (loaded at import time for all 7 planets)
_TEMPLATES = {
    p: _get_feature_template(p)
    for p in ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
}


def feature_count(planet_name):
    """Return total feature count for a planet (used for coefficient arrays)."""
    template = _TEMPLATES[planet_name]
    n_fundamental = sum(1 for g, _, _ in template if g == 'C')
    # GROUP A: 18 angle + 6 obliq/ecc + 16 ERD + 4 (3/4δ) + 4 sum-angle/ERD + 1 constant = 49
    # GROUP B: 12 planet angle cross-terms
    # GROUPS C+D+E: N harmonic orders × 2 (sin+cos) per template entry
    # (HARMONIC_ORDERS is defined inside build_features_physical — keep in sync)
    _N_HARMONIC_ORDERS = 7  # (1, 2, 4, 6, 8, 12, 16)
    n_period_features = len(template) * 2 * _N_HARMONIC_ORDERS
    # GROUP F: 4 cross-angle features per fundamental period
    n_group_f = 4 * n_fundamental
    # GROUPS G and H removed (0% impact per Venus diagnostic)
    # GROUP I: 4 period × 2δ features per fundamental
    n_group_i = 4 * n_fundamental
    # GROUP J: 4 Earth cycles × 4 harmonics × 4 (sin/cos combinations) per fundamental = 64
    n_group_j = 64 * n_fundamental
    # GROUP K: 2 carriers (ecl±icrf) × 6 harmonics × 3 sidebands × 4 combos = 144
    #          (only if both T_ecl and T_icrf are present — true for all planets)
    pp_check = fundamental_periods(planet_name)
    n_group_k = 144 if (pp_check['T_ecl'] is not None and pp_check['T_icrf'] is not None) else 0
    # GROUP L: fundamental × 4 carrier harmonics × 3 sidebands × 4 combos = 48 per fundamental
    n_group_l = 48 * n_fundamental
    # GROUP A = 49 (earth reference + constant)
    # GROUP B = 10 (planet angle cross-terms: n=3,4 θ_P; obliq/ecc × 2δ; cos_E×cos_P, cos_E×sin_P)
    return 49 + 10 + n_period_features + n_group_f + n_group_i + n_group_j + n_group_k + n_group_l


# =============================================================================
# EARTH ORBITAL ELEMENT FUNCTIONS (from original predictive_formula.py)
# =============================================================================

def time_offset(year):
    return year - ANCHOR_YEAR


def calc_earth_perihelion(year):
    t = time_offset(year)
    mean_rate = 360.0 / (H / 16)
    longitude = 270.0 + mean_rate * t
    for period, sin_c, cos_c in PERI_HARMONICS:
        phase = 2 * math.pi * t / period
        longitude += sin_c * math.sin(phase) + cos_c * math.cos(phase)
    longitude += PERI_OFFSET
    return longitude % 360


def calc_obliquity(year):
    t_fractional = year - J2000
    total = SOLSTICE_OBLIQUITY_MEAN
    for period, sin_c, cos_c in SOLSTICE_OBLIQUITY_HARMONICS:
        phase = 2 * math.pi * t_fractional / period
        total += sin_c * math.sin(phase) + cos_c * math.cos(phase)
    return total


def calc_eccentricity(year):
    """Earth eccentricity at given year."""
    from predictive_formula import calc_eccentricity as _calc_ecc_v1
    return _calc_ecc_v1(year)


def calc_erd(year):
    """Earth Rotational Day (from original predictive_formula.py)."""
    from predictive_formula import calc_erd as _calc_erd_v1
    return _calc_erd_v1(year)


def calc_planet_perihelion(theta0, period, year):
    """Planet perihelion longitude at given year (simple linear rate model)."""
    t = year - J2000
    mean_rate = 360.0 / period
    return (theta0 + mean_rate * t) % 360


# =============================================================================
# BUILD FEATURES
# =============================================================================

def build_features_physical(year, planet_name, planet_period=None, planet_theta0=None):
    """
    Build feature matrix for a planet using physical-beat frequencies.

    Args:
        year: calendar year (int)
        planet_name: 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'
        planet_period: (optional) override ecliptic period; defaults to JSON value
        planet_theta0: (optional) override perihelion longitude; defaults to JSON value

    Returns:
        list of floats — the feature vector for this year & planet.
    """
    template = _TEMPLATES[planet_name]

    t = time_offset(year)

    # Planet perihelion (use JSON values by default)
    if planet_period is None:
        planet_period = abs(PERIHELION_ECLIPTIC_YEARS[planet_name])
    if planet_theta0 is None:
        planet_theta0 = LONGITUDE_PERIHELION[planet_name]

    # Earth inputs
    theta_E = calc_earth_perihelion(year)
    theta_P = calc_planet_perihelion(planet_theta0, planet_period, year)
    erd = calc_erd(year)
    obliq = calc_obliquity(year)
    ecc = calc_eccentricity(year)

    theta_E_rad = math.radians(theta_E)
    theta_P_rad = math.radians(theta_P)
    diff = theta_E_rad - theta_P_rad
    sum_angle = theta_E_rad + theta_P_rad

    obliq_norm = obliq - SOLSTICE_OBLIQUITY_MEAN
    ecc_norm = ecc - EARTH_ECC_MEAN

    erd2 = erd * erd

    features = []

    # =========================================================================
    # GROUP A: EARTH REFERENCE (shared across all planets) — 38 terms
    # =========================================================================

    # A1. Angle harmonics (18)
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

    # A2. Obliquity/eccentricity terms (6)
    features.append(obliq_norm)
    features.append(ecc_norm)
    features.append(obliq_norm * math.cos(diff))
    features.append(obliq_norm * math.sin(diff))
    features.append(ecc_norm * math.cos(diff))
    features.append(ecc_norm * math.sin(diff))

    # A3. ERD (linear, quadratic, cubic, cross-terms) (16)
    erd3 = erd2 * erd
    features.append(erd)
    features.append(erd2)
    features.append(erd3)
    features.append(erd * math.cos(diff))
    features.append(erd * math.sin(diff))
    features.append(erd * math.cos(2 * diff))
    features.append(erd * math.sin(2 * diff))
    features.append(erd * math.cos(sum_angle))
    features.append(erd * math.sin(sum_angle))
    features.append(erd * obliq_norm)
    features.append(erd * ecc_norm)
    features.append(erd2 * math.cos(diff))
    features.append(erd2 * math.sin(diff))
    features.append(erd2 * math.cos(2 * diff))
    features.append(erd * math.cos(3 * diff))
    features.append(erd * math.sin(3 * diff))

    # A4. 3δ angle terms (4)
    features.append(math.cos(3 * diff))
    features.append(math.sin(3 * diff))
    features.append(math.cos(4 * diff))
    features.append(math.sin(4 * diff))

    # A5. Sum-angle higher harmonics + ERD × sum-angle (4)
    features.append(erd * math.cos(2 * sum_angle))
    features.append(erd * math.sin(2 * sum_angle))
    features.append(erd2 * math.cos(sum_angle))
    features.append(erd2 * math.sin(sum_angle))

    # Constant term (bias)
    features.append(1.0)

    # =========================================================================
    # GROUP B: Planet angle cross-terms (12)
    # =========================================================================
    for n in [3, 4]:
        features.append(math.cos(n * theta_P_rad))
        features.append(math.sin(n * theta_P_rad))
    features.append(obliq_norm * math.cos(2 * diff))
    features.append(obliq_norm * math.sin(2 * diff))
    features.append(ecc_norm * math.cos(2 * diff))
    features.append(ecc_norm * math.sin(2 * diff))
    features.append(math.cos(theta_E_rad) * math.cos(theta_P_rad))
    features.append(math.cos(theta_E_rad) * math.sin(theta_P_rad))
    # (12 terms)

    # =========================================================================
    # GROUPS C, D, E: Physical periods + beats — harmonic orders 1, 2, 4, 8
    # Each harmonic gives sin + cos → 8 features per template entry.
    # Harmonics 1-8 capture the fine structure that pure fundamentals miss.
    # =========================================================================
    HARMONIC_ORDERS = (1, 2, 4, 6, 8, 12, 16)
    for _group, _tag, period in template:
        if period is None:
            continue
        base_phase = 2 * math.pi * t / period
        for n in HARMONIC_ORDERS:
            features.append(math.cos(n * base_phase))
            features.append(math.sin(n * base_phase))

    # =========================================================================
    # GROUP F: Fundamental periods × angle cross-terms (n=1 only)
    # =========================================================================
    pp = fundamental_periods(planet_name)
    for k in PERIOD_KEYS:
        period = pp['T_' + k]
        if period is None:
            continue
        phase = 2 * math.pi * t / period
        features.append(math.cos(phase) * math.cos(diff))
        features.append(math.sin(phase) * math.sin(diff))
        features.append(math.cos(phase) * math.cos(2 * diff))
        features.append(math.sin(phase) * math.sin(2 * diff))

    # GROUPS G and H (ERD × period, ERD × period × angle) were REMOVED after
    # diagnostic analysis showed 0.00% contribution to Venus impact — the
    # Fourier ERD approximation doesn't carry useful information at these
    # higher-order products. 48 features freed with zero accuracy loss.

    # =========================================================================
    # GROUP I: Period × 2δ cross-products (4 per fundamental)
    # Captures higher-order angle interactions with planet motion.
    # =========================================================================
    for k in PERIOD_KEYS:
        period = pp['T_' + k]
        if period is None:
            continue
        phase = 2 * math.pi * t / period
        sin_p, cos_p = math.sin(phase), math.cos(phase)
        features.append(sin_p * math.cos(2 * diff))
        features.append(sin_p * math.sin(2 * diff))
        features.append(cos_p * math.cos(2 * diff))
        features.append(cos_p * math.sin(2 * diff))

    # =========================================================================
    # GROUP J: Planet fundamental × Earth periodic harmonics (SIDEBAND STRUCTURE)
    # Captures amplitude modulation of planet motion by Earth's cycles.
    # For each planet fundamental T_P and Earth cycle T_E at k-th harmonic:
    #   sin(2πt/T_P) × sin(k·2πt/T_E) → sidebands at T_P ± k·T_E rates
    #
    # Earth cycles used: perihelion (H/16), obliquity (H/8), inclination (H/3),
    # axial (H/13), ecliptic precession (H/5)
    # Harmonics of Earth cycles: k = 1, 2, 3, 4 (captures steps of Earth peri)
    # =========================================================================
    EARTH_CYCLES_FOR_SIDEBANDS = [
        _EARTH_PERIODS['T_ecl'],    # H/16 — perihelion (creates main sidebands)
        _EARTH_PERIODS['T_obliq'],  # H/8  — obliquity
        _EARTH_PERIODS['T_icrf'],   # H/3  — inclination cycle
        _EARTH_PERIODS['T_axial'],  # -H/13 — axial precession
    ]
    SIDEBAND_HARMONICS = (1, 2, 3, 4)

    for k in PERIOD_KEYS:
        period = pp['T_' + k]
        if period is None:
            continue
        phase_p = 2 * math.pi * t / period
        sin_p, cos_p = math.sin(phase_p), math.cos(phase_p)

        for T_E in EARTH_CYCLES_FOR_SIDEBANDS:
            for harm in SIDEBAND_HARMONICS:
                phase_e = harm * 2 * math.pi * t / T_E
                sin_e, cos_e = math.sin(phase_e), math.cos(phase_e)
                # All 4 combinations: sin×sin, sin×cos, cos×sin, cos×cos
                features.append(sin_p * sin_e)
                features.append(sin_p * cos_e)
                features.append(cos_p * sin_e)
                features.append(cos_p * cos_e)

    # =========================================================================
    # GROUP L: High-harmonic planet fundamentals × Earth ecl sidebands
    # Captures amplitude modulation of n·T_fundamental by Earth ecliptic
    # perihelion. Complements GROUP J (n=1 carrier) and GROUP K (beat carrier).
    # Discovered from Venus residual (post-GROUP K) showing 12·V_icrf sidebands
    # at 8H/1320 ± k·8H/128.
    # =========================================================================
    CARRIER_HARMONICS_L = (6, 10, 12, 16)
    SIDEBAND_L_HARMONICS = (1, 2, 3)
    phi_e_ecl_L = 2 * math.pi * t / _EARTH_PERIODS['T_ecl']
    for k_fund in PERIOD_KEYS:
        period_L = pp['T_' + k_fund]
        if period_L is None:
            continue
        phi_fund = 2 * math.pi * t / period_L
        for n_L in CARRIER_HARMONICS_L:
            cc_L = math.cos(n_L * phi_fund)
            sc_L = math.sin(n_L * phi_fund)
            for k_h in SIDEBAND_L_HARMONICS:
                mod_phase_L = k_h * phi_e_ecl_L
                sm_L = math.sin(mod_phase_L)
                cm_L = math.cos(mod_phase_L)
                features.append(sc_L * sm_L)
                features.append(sc_L * cm_L)
                features.append(cc_L * sm_L)
                features.append(cc_L * cm_L)

    # =========================================================================
    # GROUP K: High-harmonic ICRF internal-beat carriers × Earth ecl sidebands
    # Captures amplitude modulation of n·(T_ecl ± T_icrf) by Earth ecliptic
    # perihelion. Expressed in 8H/N: a peak at 8H/N = n·(P_ecl_freq ± P_icrf_freq)
    # + k·E_ecl_freq becomes a bilinear sin/cos product.
    # Discovered from Venus residual analysis: peak at 8H/928 = 8×(V_ecl+V_icrf).
    # =========================================================================
    CARRIER_HARMONICS_K = (2, 4, 6, 8, 10, 12)
    SIDEBAND_K_HARMONICS = (1, 2, 3)  # positive only — negative k is redundant

    T_p_ecl = pp['T_ecl']
    T_p_icrf = pp['T_icrf']
    if T_p_ecl is not None and T_p_icrf is not None:
        phi_ecl  = 2 * math.pi * t / T_p_ecl
        phi_icrf = 2 * math.pi * t / T_p_icrf
        phi_e_ecl = 2 * math.pi * t / _EARTH_PERIODS['T_ecl']
        for sign in (+1, -1):
            for n in CARRIER_HARMONICS_K:
                carrier_phase = n * (phi_ecl + sign * phi_icrf)
                sc = math.sin(carrier_phase)
                cc = math.cos(carrier_phase)
                for k_h in SIDEBAND_K_HARMONICS:
                    mod_phase = k_h * phi_e_ecl
                    sm = math.sin(mod_phase)
                    cm = math.cos(mod_phase)
                    features.append(sc * sm)
                    features.append(sc * cm)
                    features.append(cc * sm)
                    features.append(cc * cm)

    return features


if __name__ == '__main__':
    # Self-test: show feature counts per planet
    print("Physical-beat feature counts per planet:")
    print(f"{'Planet':<10} {'Features':>10} {'(template size)':>16}")
    for p in ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']:
        template = _TEMPLATES[p]
        features = build_features_physical(2000, p)
        print(f"  {p:<10} {len(features):>10}   ({len(template)} template entries)")

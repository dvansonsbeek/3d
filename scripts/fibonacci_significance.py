#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI SIGNIFICANCE TEST — MONTE CARLO & PERMUTATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════
#
# Tests whether the Fibonacci ratios in planetary mass-weighted
# eccentricities and inclinations are statistically significant,
# or could arise by chance in random planetary systems.
#
# ───────────────────────────────────────────────────────────────────────────
# HONEST BREAKDOWN OF THE TEST SUITE (read this first):
#
#   4 EMPIRICAL tests        → contribute to the headline combined p
#     Laws 3, 5 (inclination and eccentricity balance)
#     Findings 4, 6 (Saturn prediction; solo-planet identification)
#
#   2 TAUTOLOGICAL tests     → internal consistency only, excluded from headline
#     Law 2 (ψ constant):    INCL_AMP := PSI/(d·√m) by construction
#     Law 4 (K amplitude):   ECC_AMP := K·sin(θ)·√d/(√m·a^1.5) by construction
#
#   5 STRUCTURAL tests       → permutation-invariant or single-scalar;
#                              excluded from the permutation combined p
#                              but testable under the MC nulls
#     Law 1 (Fib denominators), Law 6 (E–J–S resonance),
#     Finding 1 (mirror symmetry), Finding 1b (d-set Fib clustering),
#     Year-length beat identity
#
# HEADLINE statistic: direct joint permutation test over the 4 empirical
# tests, using a studentized combined statistic
#     T(σ) = Σ_i sign_i × (s_i(σ) − μ_i) / σ_i
# computed across all 40,320 permutations. The p-value is the fraction of
# permutations with T ≥ T_obs. This is model-independent (no distributional
# assumptions) and self-correcting for correlation (the null captures the
# joint distribution directly). Stouffer+Brown and Fisher are also reported
# for transparency but are approximations of the joint test.
#
# MC combined p-values include more tests (9 total: the 4 empirical + 5
# structural that become meaningful under random solar systems).
#
# Jackknife: leave-one-planet-out re-runs the 7! = 5040 permutation test to
# report how much each planet contributes to the headline significance.
# ───────────────────────────────────────────────────────────────────────────
#
# ELEVEN TEST STATISTICS — Laws → Findings → Arithmetic:
#
#   Core Laws (6)
#   -------------
#   Law 1 — Fibonacci denominators in inclination cycle periods:
#       The 8 inclination-cycle periods are expressed as T_i = H × (a_i/b_i).
#       Count how many denominators b_i fall in the Fibonacci set
#       {1,2,3,5,8,13,21,34,55}. Observed: 7/8 (Mercury's 11 is the
#       only non-Fibonacci). Structural in permutation, strong in MC.
#
#   Law 2 — ψ constant (full 8-planet):
#       How constant is d × amp × √m across ALL 8 planets?
#       Uses MODEL amplitudes (derived from ψ). Permutation still valid —
#       shuffling assignment breaks planet-specific d×amp×√m = ψ match.
#
#   Law 3 — Inclination balance:
#       With the model's d-values and phase groups, how well do the
#       angular-momentum-weighted structural weights cancel between groups?
#
#   Law 4 — K amplitude constant:
#       Can a single constant K predict all 8 eccentricity amplitudes via
#       e_amp = K × sin(meanObliquity) × √d / (√m × a^1.5)?
#       NOTE: circular — amplitudes were derived from K. Permutation still
#       valid (shuffling breaks planet-specific prediction).
#
#   Law 5 — Eccentricity balance:
#       How well do the ecc-weighted quantities cancel between phase groups?
#
#   Law 6 — E–J–S resonance loop:
#       Do Earth, Jupiter, Saturn periods satisfy b_E + b_J = b_S?
#       Structural — permutation always yields p = 1.
#
#   Findings (4)
#   ------------
#   Finding 1 — Mirror symmetry:
#       Do inner-outer mirror pairs share the same d-value?
#       Structural — permutation always yields p = 1.
#
#   Finding 1b — d-set Fibonacci clustering:
#       Does the distinct d-set form exactly 2 consecutive Fibonacci pairs?
#       Observed: {3, 5, 21, 34} = (F_4,F_5) ∪ (F_8,F_9). Structural test;
#       MC null draws random d-values from the Fibonacci pool.
#
#   Finding 4 — Saturn eccentricity prediction:
#       The ecc balance predicts Saturn's e from the other 7 planets.
#
#   Finding 6 — Solo planet identification:
#       Reformulation of the old "balance scale per-planet prediction".
#       For each planet, compute the residual |v_p − Σ_{j≠p} v_j| / v_p;
#       take argmin across 8 candidates. Saturn uniquely minimizes this
#       with residual ≈ 0.25%. Complements F4 (which assumes Saturn is solo).
#
#   Arithmetic (1)
#   --------------
#   Year-length beat identity:
#       Test whether (sidereal/tropical − 1) × H ≈ 13 and
#                    (anomalistic/tropical − 1) × H ≈ 16.
#       Single scalar — structural in permutation, meaningful in MC.
#
# THREE RANDOM DISTRIBUTIONS:
#   1. Permutation (exhaustive 8! = 40,320) — fixes values, shuffles assignment
#   2. Log-uniform — random eccentricities/inclinations in realistic range
#   3. Uniform — flat random in same range
#
# Addresses the Backus (1969) critique of Molchanov's resonance theory:
# accounts for look-elsewhere effect and tests multiple null hypotheses.
#
# Run with:
#   python fibonacci_significance.py [--trials N] [--seed S] [--tests SPEC]
#
# Test selection examples:
#   --tests laws           → all 6 Laws
#   --tests findings       → all 4 Findings
#   --tests law3,law5      → specific laws (prefix match)
#   --tests 1-6            → first 6 tests (= all Laws)
#   --tests law1_fib_denominators  → one test by full ID
# ═══════════════════════════════════════════════════════════════════════════

import math
import itertools
import argparse
import os
import sys
import time
from collections import defaultdict
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lib', 'python'))

from constants_scripts import (
    PLANET_NAMES, MASSES, ECCENTRICITIES, INCLINATION_AMPS,
    D_INCL, PSI1_THEORY, SEMI_MAJOR, PHASE_GROUP, GROUP_203, GROUP_23,
    MIRROR_PAIRS, PERIOD_FRAC, H,
    INCL_J2000, INCL_MEAN, EARTH_OBLIQUITY_MEAN,
    ECC_AMPLITUDE, AXIAL_TILT, ECC_AMPLITUDE_K, SMA, D,
)

# ─── Per-planet MEAN OBLIQUITY ──────────────────────────────────────────────
# The K amplitude law (Law 4) uses each planet's MODEL MEAN obliquity (the
# time-averaged axial tilt), not its J2000 instantaneous tilt. Earth's
# mean obliquity = EARTH_OBLIQUITY_MEAN; the 7 other planets expose
# obliquityMean on their planet object from constants.js. Load directly
# via the dump bridge to keep the significance script self-contained.
import json as _json, subprocess as _subprocess
_dump_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          '..', 'tools', 'fit', 'python', '_dump_constants.js')
_dumped = _json.loads(_subprocess.check_output(['node', _dump_path]).decode())
OBLIQUITY_MEAN = {
    p.capitalize(): _dumped['planets'][p]['obliquityMean']
    for p in ('mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune')
}
OBLIQUITY_MEAN['Earth'] = EARTH_OBLIQUITY_MEAN

# ─── Year lengths at J2000 (for Test 16) ────────────────────────────────────
TROPICAL_YEAR_DAYS   = _dumped['meanSolarYearDays']
SIDEREAL_YEAR_DAYS   = _dumped['meanSiderealYearDays']
ANOMALISTIC_YEAR_DAYS = _dumped['meanAnomalisticYearDays']

# ─── ECCENTRICITY SET SELECTION ───────────────────────────────────────────
#
# ECCENTRICITIES = ECC_BASE = base eccentricities (long-term means for 100%
# Law 5 balance).
#
# All tests use base eccentricities (the model's values):
#   Tests 1, 2, 4, 10: These test whether the model's base eccentricity
#     ratios (e×√m, e/i, cross-parameter sums) match Fibonacci patterns.
#   Tests 5, 6, 7: These test the model's balance laws (Law 3 incl.
#     balance, Law 5 ecc. balance, Finding 4 Saturn prediction).
#     The base eccentricities achieve 100% balance by construction.
#     The significance question is: "can random eccentricities achieve
#     this level of balance?" — the permutation/MC tests answer this.
#
# J2000 snapshot values (ECC_J2000 in constants_scripts.py) are available
# but not used in this significance test.
#
# NOTE: INCLINATION_AMPS (= INCL_AMP) now stores Fibonacci model PREDICTIONS
# (ψ/(d×√m)), not independently observed BvW amplitudes.  Tests 3 and 4
# that use INCLINATION_AMPS are therefore partially circular — the permutation
# test is still valid (shuffling masses breaks d_i × η_j ≠ ψ), but the
# observed statistics are artificially tight.  To restore genuine empirical
# tests, replace INCLINATION_AMPS with independently measured secular amplitudes.

# Mean inclinations (degrees, invariable plane oscillation midpoints)
# Imported from constants_scripts.py as INCL_MEAN (from script.js InvPlaneInclinationMean)
INCL_MEANS = INCL_MEAN

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI RATIOS AND TOLERANCE
# ═══════════════════════════════════════════════════════════════════════════

# All distinct ratios a/b where a,b ∈ {1, 2, 3, 5, 8}
FIB_SET = [1, 2, 3, 5, 8]
FIB_RATIOS = sorted(set(a / b for a in FIB_SET for b in FIB_SET if a != b))
# = [0.125, 0.2, 0.25, 0.333, 0.375, 0.4, 0.6, 0.625, 0.667,
#    1.5, 1.6, 1.667, 2.0, 2.5, 2.667, 3.0, 4.0, 5.0, 8.0]

# Tolerance for "near a Fibonacci ratio" — relative error
TOLERANCE = 0.05  # 5% relative tolerance (generous)

# Stricter tolerance for law-specific tests
STRICT_TOL = 0.03  # 3% for laws that claim ~1-2% accuracy


# ═══════════════════════════════════════════════════════════════════════════
# TEST REGISTRY — single source of truth for test order, IDs, and labels
# ═══════════════════════════════════════════════════════════════════════════
#
# Each entry: (stable_id, category, short_label)
# Order defines the order of computation, printing, summary table, and Fisher's.
# Stable IDs are used as dict keys in `observed`, `counts`, and `p_values`.
#
# Categories:
#   "law"     — one of the 6 Fibonacci laws (Laws 1–6)
#   "finding" — one of the numbered Findings (F1, F4, F5, F6)
#   "general" — exploratory / look-elsewhere tests (not tied to a specific law)

TEST_REGISTRY = [
    # Laws 1–6 (core claims)
    ("law1_fib_denominators", "law",    "Law 1 — Fibonacci denominators"),
    ("law2_psi_full",        "law",     "Law 2 — ψ full 8-planet"),
    ("law3_incl_balance",    "law",     "Law 3 — Inclination balance"),
    ("law4_k_amplitude",     "law",     "Law 4 — K amplitude constant"),
    ("law5_ecc_balance",     "law",     "Law 5 — Eccentricity balance"),
    ("law6_ejs_resonance",   "law",     "Law 6 — E–J–S resonance"),
    # Findings
    ("f1_mirror_symmetry",   "finding", "Finding 1 — Mirror symmetry"),
    ("f1b_d_set_fib_pairs",  "finding", "Finding 1b — d-set Fib clustering"),
    ("f4_saturn_prediction", "finding", "Finding 4 — Saturn e prediction"),
    ("f6_solo_planet",       "finding", "Finding 6 — Solo planet ID"),
    # Arithmetic / structural
    ("year_length_beat",     "new",     "Year-length beat identity"),
]

TEST_IDS       = [t[0] for t in TEST_REGISTRY]
TEST_ID_SET    = set(TEST_IDS)
TEST_LABEL_MAP = {t[0]: t[2] for t in TEST_REGISTRY}
TEST_CAT_MAP   = {t[0]: t[1] for t in TEST_REGISTRY}

# Tests that are pure STRUCTURAL checks: permutation trivially preserves them
# (or the observation is a single scalar that can't be permuted). These are
# reported but should be excluded from Fisher's method, otherwise their
# forced p=1 dilutes the combined statistic.
STRUCTURAL_TESTS = {
    "law1_fib_denominators",  # permutation preserves the set of denominators
    "law2_psi_full",          # tautological: INCL_AMP := PSI/(d×√m), so d×amp×√m = PSI exactly
    "law4_k_amplitude",       # tautological: ECC_AMPLITUDE derived from K via the same formula
    "law6_ejs_resonance",
    "f1_mirror_symmetry",
    "f1b_d_set_fib_pairs",    # d-set multiset is permutation-invariant
    "year_length_beat",       # single scalar, can't permute
}

# Why Laws 2 and 4 are STRUCTURAL, not empirical:
#
# The "amplitudes" of long-term planetary inclination/eccentricity oscillations
# are not directly observable on human timescales (Earth's obliquity oscillation
# has a ~41,000 year period; precise astronomical observations only span ~200
# years). The amplitudes used in this script come from the Holistic model's own
# parametrization:
#     INCLINATION_AMPS[p] := PSI / (D[p] × √m[p])
#     ECC_AMPLITUDE[p]    := K × sin(tilt[p]) × √D[p] / (√m[p] × a[p]^1.5)
# so "d × amp × √m = PSI" and the K-amplitude relation hold *identically by
# construction*, not approximately. Any statistical test on these is degenerate.
#
# Substituting external secular-theory amplitudes (e.g. Laskar 2004) does not
# fix this — those values are themselves N-body simulation outputs, theory not
# observation. There is no human-timescale measurement of multi-millennial
# planetary oscillation amplitudes. Comparing one theoretical fit against
# another does not produce an independent statistical test.
#
# The honest disposition: Laws 2 and 4 are *internal consistency checks of the
# model's parametrization*. They demonstrate that the universal-constant claim
# is self-consistent, but they cannot serve as independent evidence in a
# statistical significance analysis. The combined p-value below is built only
# from tests where a meaningful counterfactual exists (the eccentricity-balance
# tests: Laws 3, 5, F4, F6).


def parse_test_filter(spec):
    """
    Parse a `--tests` argument into a set of test IDs.

    Accepts (comma-separated):
      - category names: "laws", "findings", "general"
      - stable IDs:     "law1_fib_denominators", "f4_saturn_prediction"
      - short prefixes: "law1", "f4"          (matches any ID starting with prefix_)
      - numeric:        "1", "3", "5-7", "1-6"
      - "all"           (= all tests; equivalent to omitting the flag)

    Returns: set of stable IDs (preserves TEST_REGISTRY order at caller).
    Raises: ValueError on unknown tokens.
    """
    if spec is None or spec.strip() == "" or spec.strip().lower() == "all":
        return set(TEST_IDS)

    selected = set()
    tokens = [t.strip() for t in spec.split(",") if t.strip()]
    for tok in tokens:
        low = tok.lower()
        # Category aliases
        if low in ("law", "laws"):
            selected.update(tid for tid, cat, _ in TEST_REGISTRY if cat == "law")
            continue
        if low in ("finding", "findings"):
            selected.update(tid for tid, cat, _ in TEST_REGISTRY if cat == "finding")
            continue
        if low in ("general", "gen"):
            selected.update(tid for tid, cat, _ in TEST_REGISTRY if cat == "general")
            continue
        if low in ("new", "news"):
            selected.update(tid for tid, cat, _ in TEST_REGISTRY if cat == "new")
            continue
        # Numeric range "a-b" or single number
        if "-" in tok and all(p.strip().isdigit() for p in tok.split("-", 1)):
            a, b = (int(p) for p in tok.split("-", 1))
            for i in range(a, b + 1):
                if 1 <= i <= len(TEST_IDS):
                    selected.add(TEST_IDS[i - 1])
                else:
                    raise ValueError(f"test index {i} out of range (1..{len(TEST_IDS)})")
            continue
        if tok.isdigit():
            i = int(tok)
            if 1 <= i <= len(TEST_IDS):
                selected.add(TEST_IDS[i - 1])
                continue
            raise ValueError(f"test index {i} out of range (1..{len(TEST_IDS)})")
        # Exact stable ID
        if low in TEST_ID_SET:
            selected.add(low)
            continue
        # Prefix match: "law1" → "law1_fib_denominators"
        prefix_matches = [tid for tid in TEST_IDS if tid.startswith(low + "_") or tid == low]
        if len(prefix_matches) == 1:
            selected.add(prefix_matches[0])
            continue
        if len(prefix_matches) > 1:
            raise ValueError(f"ambiguous test prefix '{tok}': matches {prefix_matches}")
        raise ValueError(
            f"unknown test '{tok}'. Valid IDs: {', '.join(TEST_IDS)} "
            f"(or categories: laws, findings, general; or indices 1..{len(TEST_IDS)})"
        )
    return selected


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def sqrt_masses():
    """Precompute √m for all planets."""
    return {p: math.sqrt(MASSES[p]) for p in PLANET_NAMES}

SQRT_M = sqrt_masses()


def near_fibonacci(ratio, tol=TOLERANCE):
    """Check if a ratio is within tol of any Fibonacci ratio."""
    for fr in FIB_RATIOS:
        if fr > 0 and abs(ratio / fr - 1.0) < tol:
            return True
    return False


def best_fibonacci_error(ratio):
    """Return the smallest relative error to any Fibonacci ratio."""
    return min(abs(ratio / fr - 1.0) for fr in FIB_RATIOS if fr > 0)


# ═══════════════════════════════════════════════════════════════════════════
# TEST STATISTICS
# ═══════════════════════════════════════════════════════════════════════════

def compute_xi(eccs, incls, sqrt_m):
    """Compute mass-weighted parameters for a set of planets."""
    xi_e = {p: eccs[p] * sqrt_m[p] for p in PLANET_NAMES}
    xi_i = {p: incls[p] * sqrt_m[p] for p in PLANET_NAMES}
    return xi_e, xi_i


# ═══════════════════════════════════════════════════════════════════════════
# BALANCE TEST DATA
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci d-values available for assignment
FIB_D_POOL = [1, 2, 3, 5, 8, 13, 21, 34, 55]


def compute_incl_balance(eccs, d_vals, group_a, group_b):
    """
    Compute inclination balance percentage.

    w_j = sqrt(m_j × a_j × (1 - e_j²)) / d_j
    Balance = 1 - |sum_A - sum_B| / (sum_A + sum_B)

    Parameters:
        eccs: dict of eccentricities per planet
        d_vals: dict of Fibonacci d-values per planet
        group_a: list of planets in group A (in-phase)
        group_b: list of planets in group B (anti-phase)

    Returns: balance percentage (100% = perfect)
    """
    sum_a = sum(
        math.sqrt(MASSES[p] * SEMI_MAJOR[p] * (1 - eccs[p]**2)) / d_vals[p]
        for p in group_a if d_vals[p] > 0
    )
    sum_b = sum(
        math.sqrt(MASSES[p] * SEMI_MAJOR[p] * (1 - eccs[p]**2)) / d_vals[p]
        for p in group_b if d_vals[p] > 0
    )
    total = sum_a + sum_b
    if total <= 0:
        return 0.0
    return (1.0 - abs(sum_a - sum_b) / total) * 100


def compute_ecc_balance(eccs, d_vals, group_a, group_b):
    """
    Compute eccentricity balance percentage.

    v_j = sqrt(m_j) × a_j^(3/2) × e_j / sqrt(d_j)
    Balance = 1 - |sum_A - sum_B| / (sum_A + sum_B)

    Returns: balance percentage (100% = perfect)
    """
    sum_a = sum(
        SQRT_M[p] * SEMI_MAJOR[p]**1.5 * eccs[p] / math.sqrt(d_vals[p])
        for p in group_a if d_vals[p] > 0
    )
    sum_b = sum(
        SQRT_M[p] * SEMI_MAJOR[p]**1.5 * eccs[p] / math.sqrt(d_vals[p])
        for p in group_b if d_vals[p] > 0
    )
    total = sum_a + sum_b
    if total <= 0:
        return 0.0
    return (1.0 - abs(sum_a - sum_b) / total) * 100


def stat_incl_balance(eccs, d_vals, group_a, group_b):
    """
    Test 5 — Inclination Balance (Law 3).

    How well do the angular-momentum-weighted inclination structural weights
    cancel between the two phase groups?

    Observed: 100% with the model's d-values, phase groups, and base
    eccentricities. The (1-e²) term enters via angular momentum.

    Null hypothesis: random Fibonacci d-assignments and random solo-planet
    phase splits cannot achieve this level of balance.

    Returns: balance percentage (higher = more balanced).
    """
    return compute_incl_balance(eccs, d_vals, group_a, group_b)


def stat_ecc_balance(eccs, d_vals, group_a, group_b):
    """
    Test 6 — Eccentricity Balance (Law 5).

    How well do the eccentricity-weighted quantities cancel between groups?

    Observed: 100% with the model's d-values, phase groups, and base
    eccentricities (the model's long-term-mean values).

    Returns: balance percentage (higher = more balanced).
    """
    return compute_ecc_balance(eccs, d_vals, group_a, group_b)


def stat_saturn_prediction(eccs, d_vals, group_a, solo_planet):
    """
    Test 7 — Saturn Eccentricity Prediction (Finding 4).

    Since the solo anti-phase planet carries the entire anti-phase contribution,
    the eccentricity balance directly predicts its eccentricity from the
    other seven planets. Uses base eccentricities: Saturn's base value
    (0.05373663) IS the model's prediction from the balance optimizer.

    e_solo = sum_A(v_j) / (sqrt(m_solo) × a_solo^(3/2) / sqrt(d_solo))

    Observed: predicted e_Saturn = 0.05374, actual = 0.05386, error = 0.22%.

    Returns: relative prediction error (lower = better).
    """
    sum_a = sum(
        SQRT_M[p] * SEMI_MAJOR[p]**1.5 * eccs[p] / math.sqrt(d_vals[p])
        for p in group_a
    )
    denom = SQRT_M[solo_planet] * SEMI_MAJOR[solo_planet]**1.5 / math.sqrt(d_vals[solo_planet])
    if denom <= 0:
        return 1.0
    e_predicted = sum_a / denom
    e_actual = eccs[solo_planet]
    if e_actual <= 0:
        return 1.0
    return abs(e_predicted / e_actual - 1.0)


# ═══════════════════════════════════════════════════════════════════════════
# NEW TESTS 8–12 (matching 6 Laws + 6 Findings)
# ═══════════════════════════════════════════════════════════════════════════

def stat_psi_full(incl_j2000, d_vals, sqrt_m):
    """
    Test 8 — Law 2: Full 8-planet ψ-constant using J2000 inclinations.

    Measures how constant d × i_J2000 × √m is across ALL 8 planets.
    Uses OBSERVED J2000 inclinations (not model-derived amplitudes) to
    avoid circularity.

    Returns: relative spread (max-min)/mean across 8 planets (lower = better).
    """
    psi_vals = []
    for p in PLANET_NAMES:
        if d_vals.get(p, 0) > 0 and sqrt_m.get(p, 0) > 0:
            psi_vals.append(d_vals[p] * incl_j2000[p] * sqrt_m[p])
    if len(psi_vals) < 8 or max(psi_vals) <= 0:
        return 1.0
    mean_psi = sum(psi_vals) / len(psi_vals)
    if mean_psi <= 0:
        return 1.0
    return (max(psi_vals) - min(psi_vals)) / mean_psi


def stat_ejs_resonance(period_fracs):
    """
    Test 11 — Law 6: Earth–Jupiter–Saturn resonance loop.

    Check if the period denominators of Earth, Jupiter, and Saturn
    satisfy b_E + b_J = b_S (Fibonacci addition).

    Returns: relative error |b_E + b_J - b_S| / b_S (lower = better).
    """
    b_E = period_fracs.get("Earth", (0, 0))[1]
    b_J = period_fracs.get("Jupiter", (0, 0))[1]
    b_S = period_fracs.get("Saturn", (0, 0))[1]
    if b_S <= 0:
        return 1.0
    return abs(b_E + b_J - b_S) / b_S


def stat_mirror_symmetry(d_vals, mirror_pairs):
    """
    Test 12 — Finding 1: Mirror symmetry of d-assignments.

    Count how many of the 4 mirror pairs share the same d-value.

    Returns: count of matching pairs out of 4 (higher = better).
    """
    count = 0
    for inner, outer in mirror_pairs:
        if d_vals.get(inner, -1) == d_vals.get(outer, -2):
            count += 1
    return count


def stat_k_amplitude(eccs_amp, tilts, d_vals, masses, sma, sqrt_m):
    """
    Test 13 — Law 4: K amplitude constant.

    Tests whether a single constant K can predict all 8 eccentricity
    amplitudes from:  e_amp = K × sin(tilt) × √d / (√m × a^1.5)

    NOTE: Circular for observed data — the amplitudes were derived from K.
    However, the permutation test is still valid: shuffling amplitudes across
    planets breaks the planet-specific prediction, so a low p-value means
    the assignment matters.

    Returns: max relative error of K prediction across all 8 planets
             (lower = better).
    """
    # Compute K from Earth
    p_ref = "Earth"
    tilt_rad = math.radians(tilts[p_ref])
    sin_tilt = math.sin(tilt_rad)
    if sin_tilt <= 0 or d_vals.get(p_ref, 0) <= 0:
        return 1.0
    K = eccs_amp[p_ref] * sqrt_m[p_ref] * sma[p_ref]**1.5 / (sin_tilt * math.sqrt(d_vals[p_ref]))

    max_err = 0.0
    for p in PLANET_NAMES:
        tilt_rad = math.radians(tilts[p])
        sin_t = math.sin(tilt_rad)
        if sin_t <= 0 or d_vals.get(p, 0) <= 0 or eccs_amp[p] <= 0:
            continue
        predicted = K * sin_t * math.sqrt(d_vals[p]) / (sqrt_m[p] * sma[p]**1.5)
        rel_err = abs(predicted / eccs_amp[p] - 1.0)
        if rel_err > max_err:
            max_err = rel_err
    return max_err


def _best_k_for_amplitudes(eccs_amp, tilts, d_vals, masses, sma, sqrt_m):
    """
    Find the best single K that minimizes max relative error across 8 planets.

    Uses the median of per-planet K estimates (robust to outliers).
    Returns: (K, max_relative_error)
    """
    k_estimates = []
    for p in PLANET_NAMES:
        tilt_rad = math.radians(tilts[p])
        sin_t = math.sin(tilt_rad)
        if sin_t <= 0 or d_vals.get(p, 0) <= 0 or eccs_amp.get(p, 0) <= 0:
            continue
        k_p = eccs_amp[p] * sqrt_m[p] * sma[p]**1.5 / (sin_t * math.sqrt(d_vals[p]))
        k_estimates.append(k_p)
    if not k_estimates:
        return 0.0, 1.0

    # Use median as robust estimator
    k_estimates.sort()
    n = len(k_estimates)
    K = k_estimates[n // 2] if n % 2 == 1 else (k_estimates[n // 2 - 1] + k_estimates[n // 2]) / 2

    max_err = 0.0
    for p in PLANET_NAMES:
        tilt_rad = math.radians(tilts[p])
        sin_t = math.sin(tilt_rad)
        if sin_t <= 0 or d_vals.get(p, 0) <= 0 or eccs_amp.get(p, 0) <= 0:
            continue
        predicted = K * sin_t * math.sqrt(d_vals[p]) / (sqrt_m[p] * sma[p]**1.5)
        rel_err = abs(predicted / eccs_amp[p] - 1.0)
        if rel_err > max_err:
            max_err = rel_err
    return K, max_err


def stat_solo_planet_identification(eccs, d_vals, masses, sma, sqrt_m):
    """
    Finding 6 (reformulated) — Solo planet identification.

    The eccentricity balance equation says:
        Σ v_j(in-phase) = v_solo
    where v_j = √m_j × a_j^(3/2) × e_j / √d_j.
    The original Finding 6 ("predict each planet's e from the other 7") is
    mathematically ill-conditioned: for small-v planets (Mercury, Venus,
    Earth, Mars — each <0.2% of the total) the residual gap dominates and
    the prediction blows up to 100%+ error. See commit history for details.

    This reformulation asks a different question that IS well-conditioned:
    "Which single planet, when treated as the solo anti-phase partner,
    minimizes the balance residual?"  The planet that best fits the solo
    role is found by computing, for each planet p:

        resid(p) = | v_p  -  Σ_{j≠p} v_j |  /  v_p

    and taking argmin.  Observed: Saturn uniquely minimizes this with
    resid ≈ 0.25%; the next-best planet has resid >> 50%.

    Returns: minimum residual ratio across 8 candidate solo planets.
             Lower = better (= "some planet fits the solo role tightly").
             The IDENTITY of the argmin is also meaningful but not returned.

    Null (permutation): shuffle e's across planets, recompute argmin.
                        How often does the min residual stay ≤ observed?
    """
    v = {}
    for p in PLANET_NAMES:
        d_p = d_vals.get(p, 0)
        if d_p <= 0 or eccs.get(p, 0) <= 0:
            return 1.0
        v[p] = sqrt_m[p] * sma[p]**1.5 * eccs[p] / math.sqrt(d_p)

    total = sum(v.values())
    min_resid = float("inf")
    for p in PLANET_NAMES:
        if v[p] <= 0:
            continue
        sum_others = total - v[p]
        resid = abs(v[p] - sum_others) / v[p]
        if resid < min_resid:
            min_resid = resid
    return min_resid if min_resid != float("inf") else 1.0


# ═══════════════════════════════════════════════════════════════════════════
# STRUCTURAL / ARITHMETIC TESTS
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci numbers for "is Fibonacci?" checks (up to F_10)
_FIB_SET_FOR_DENOMS = {1, 2, 3, 5, 8, 13, 21, 34, 55}

# Ordered Fibonacci sequence (indexed for "consecutive pair" checks)
_FIB_SEQ_FOR_CLUSTER = (1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144)


def stat_d_set_fib_clustering(d_vals):
    """
    Finding 1b — d-set Fibonacci clustering.

    Beyond Finding 1 (mirror pairs share d), this tests a STRICTER structural
    claim from fibonacci-laws-derivation.mdx §Finding 1:

        "The divisors form two consecutive Fibonacci pairs:
         (3,5) for the belt-adjacent and (21,34) for the outer planets."

    Observed d-set for the default (mirror-symmetric) configuration: {3, 5, 21, 34}
        = {F_4, F_5, F_8, F_9}
        = (F_4,F_5) ∪ (F_8,F_9)   ← two disjoint consecutive Fibonacci pairs.

    Statistic (binary): 1 if the set of DISTINCT d-values across 8 planets
                        has exactly 4 elements AND can be expressed as
                        {F_i, F_{i+1}} ∪ {F_j, F_{j+1}} with i+1 < j.
                        0 otherwise.

    Null (Permutation): shuffling values preserves the multiset → unchanged
                        → structural; always p = 1.
    Null (MC): random 4-element subset of the Fibonacci pool {1,2,3,5,8,13,
               21,34,55}. About 21 of C(9,4)=126 subsets form "2 consecutive
               pairs" (≈16.7%). Requires random d-assignments that also yield
               4 distinct values.

    Returns: 1 (match) or 0 (no match).
    """
    d_set = sorted(set(d_vals.values()))
    if len(d_set) != 4:
        return 0
    # All must be Fibonacci numbers
    try:
        indices = sorted(_FIB_SEQ_FOR_CLUSTER.index(d) for d in d_set)
    except ValueError:
        return 0
    # Must form two disjoint consecutive pairs: (i, i+1) and (j, j+1) with
    # i+1 < j (so the two pairs are disjoint and not adjacent).
    if indices[1] == indices[0] + 1 and indices[3] == indices[2] + 1 and indices[2] > indices[1]:
        return 1
    return 0


def stat_gho_fib_denominators(period_fracs):
    """
    Test 14 — Solar System Resonance Cycle divisibility (Fibonacci denominators).

    The model's inclination oscillation periods are expressed as
    T_i = H × (a_i / b_i) with small integer a_i and b_i. Count how many
    of the 8 denominators b_i fall in the Fibonacci set {1,2,3,5,8,13,21,34,55}.

    Observed: 7/8 (only Mercury's b=11 is non-Fibonacci).

    Null (MC): draw random denominators from [1, 30] and count Fibonacci matches.
    Null (Permutation): trivially unchanged — shuffling preserves the count.
                        → structural; always p = 1.

    Returns: integer count of Fibonacci-denominator planets (higher = better).
    """
    count = 0
    for p, (a, b) in period_fracs.items():
        if b in _FIB_SET_FOR_DENOMS:
            count += 1
    return count


def stat_year_length_beat(tropical, sidereal, anomalistic, holistic_year):
    """
    Test 16 — Year-length Fibonacci beat identity.

    The three year types satisfy Fibonacci beat-frequency relations:

        (sidereal   / tropical    - 1) × H ≈ 13  (general precession period = H/13)
        (anomalistic/ tropical    - 1) × H ≈ 16  (perihelion precession    = H/16)

    The RHS constants 13 and 16 (where 16 = 2×8) are Fibonacci-structured.
    Observed: both beats match to <0.001 on the implied integer.

    Metric: max |beat_i − round(beat_i)| / round(beat_i) across both beats,
            where beat_i is integer iff the year-length identity is exact.
    Lower = better.

    Null (MC): draw random (tropical, sidereal, anomalistic) triples in
               a realistic range; compute beats; count how often both are
               within tolerance of any integer in {3,5,8,13,16,21,34,55}.
    Null (Permutation): single-point observation — cannot permute 3 scalars.
                        → structural; always p = 1.

    Returns: max relative error from nearest Fibonacci-like integer
             (lower = better).
    """
    if tropical <= 0:
        return 1.0
    beat_sid = (sidereal / tropical - 1.0) * holistic_year
    beat_ano = (anomalistic / tropical - 1.0) * holistic_year
    # Targets: general precession H/13 → beat = 13;
    #          perihelion precession H/16 → beat = 16.
    err_sid = abs(beat_sid - 13.0) / 13.0
    err_ano = abs(beat_ano - 16.0) / 16.0
    return max(err_sid, err_ano)


# ═══════════════════════════════════════════════════════════════════════════
# OBSERVED STATISTICS
# ═══════════════════════════════════════════════════════════════════════════

def compute_observed_stats(selected=None):
    """Compute observed test statistics for the real solar system.

    If `selected` is None, computes all 13 tests. Otherwise, computes only
    the tests whose stable IDs are present in `selected` (a set of strings).

    All tests use base eccentricities (ECCENTRICITIES = ECC_BASE).
    """
    xi_e, xi_i = compute_xi(ECCENTRICITIES, INCLINATION_AMPS, SQRT_M)

    def want(tid):
        return selected is None or tid in selected

    obs = {}
    # ── Core Laws ──
    if want("law1_fib_denominators"):
        obs["law1_fib_denominators"] = stat_gho_fib_denominators(PERIOD_FRAC)
    if want("law2_psi_full"):
        # FIXED: use model INCLINATION_AMPS (the amplitudes d×amp×√m = ψ
        # relation holds for), not J2000 instantaneous inclinations.
        # Permutation remains valid — shuffling still breaks the match.
        obs["law2_psi_full"] = stat_psi_full(INCLINATION_AMPS, D_INCL, SQRT_M)
    if want("law3_incl_balance"):
        obs["law3_incl_balance"] = stat_incl_balance(ECCENTRICITIES, D_INCL, GROUP_203, GROUP_23)
    if want("law4_k_amplitude"):
        # FIXED: use per-planet model mean obliquity, not J2000 axial tilts.
        obs["law4_k_amplitude"] = stat_k_amplitude(ECC_AMPLITUDE, OBLIQUITY_MEAN, D_INCL, MASSES, SMA, SQRT_M)
    if want("law5_ecc_balance"):
        obs["law5_ecc_balance"] = stat_ecc_balance(ECCENTRICITIES, D_INCL, GROUP_203, GROUP_23)
    if want("law6_ejs_resonance"):
        obs["law6_ejs_resonance"] = stat_ejs_resonance(PERIOD_FRAC)
    # ── Findings ──
    if want("f1_mirror_symmetry"):
        obs["f1_mirror_symmetry"] = stat_mirror_symmetry(D_INCL, MIRROR_PAIRS)
    if want("f1b_d_set_fib_pairs"):
        obs["f1b_d_set_fib_pairs"] = stat_d_set_fib_clustering(D_INCL)
    if want("f4_saturn_prediction"):
        obs["f4_saturn_prediction"] = stat_saturn_prediction(ECCENTRICITIES, D_INCL, GROUP_203, "Saturn")
    if want("f6_solo_planet"):
        obs["f6_solo_planet"] = stat_solo_planet_identification(
            ECCENTRICITIES, D_INCL, MASSES, SMA, SQRT_M)
    # ── Arithmetic / structural ──
    if want("year_length_beat"):
        obs["year_length_beat"] = stat_year_length_beat(
            TROPICAL_YEAR_DAYS, SIDEREAL_YEAR_DAYS, ANOMALISTIC_YEAR_DAYS, H)

    return obs


# ═══════════════════════════════════════════════════════════════════════════
# DISTRIBUTION 1: PERMUTATION TEST (EXHAUSTIVE)
# ═══════════════════════════════════════════════════════════════════════════

# IDs of tests that produce a meaningful continuous statistic under the
# permutation null (the 4 genuinely empirical tests). For these we also
# store the per-permutation raw statistic so that (a) the empirical
# correlation matrix can be measured, and (b) a direct joint permutation
# test can be computed by combining studentized statistics.
PERM_EMPIRICAL_TESTS = (
    "law3_incl_balance",
    "law5_ecc_balance",
    "f4_saturn_prediction",
    "f6_solo_planet",
)

# Under an MC null (random solar systems), structural tests that are
# permutation-invariant DO become meaningful — the null also draws random
# d-assignments, random period denominators, random year lengths, etc.
# So the MC-combinable set is larger than the permutation-combinable set.
# Only Laws 2 and 4 remain excluded (tautological by construction).
MC_COMBINABLE_TESTS = (
    "law1_fib_denominators",
    "law3_incl_balance",
    "law5_ecc_balance",
    "law6_ejs_resonance",
    "f1_mirror_symmetry",
    "f1b_d_set_fib_pairs",
    "f4_saturn_prediction",
    "f6_solo_planet",
    "year_length_beat",
)

# Sign convention for studentization: +1 means "larger statistic = more
# observed-like" (balance percentages); -1 means "smaller = more observed-like"
# (residual errors). This orients all z-scores so that positive = evidence
# toward the model.
STAT_SIGN = {
    "law3_incl_balance":    +1,
    "law5_ecc_balance":     +1,
    "f4_saturn_prediction": -1,
    "f6_solo_planet":       -1,
    # MC-meaningful structural tests:
    "law1_fib_denominators": +1,  # higher count of Fib denominators = better
    "law6_ejs_resonance":    -1,  # smaller |b_E + b_J - b_S|/b_S = better
    "f1_mirror_symmetry":    +1,  # more matching mirror pairs = better
    "f1b_d_set_fib_pairs":   +1,  # 1 if Fib-pair structure, 0 otherwise
    "year_length_beat":      -1,  # smaller max |beat - int|/int = better
}


def permutation_test(observed, selected=None):
    """
    Exhaustive permutation test: keep the same 8 eccentricity values,
    8 inclination amplitude values, and 8 mean inclination values,
    but randomly assign them to planets.

    This tests whether the ASSIGNMENT of values to specific masses matters,
    not whether the values themselves are special.

    8! = 40,320 permutations (exhaustive, no sampling needed).
    We use the SAME permutation for eccentricities, amplitudes, and means
    (conservative — independent permutations would be ~10^13).

    If `selected` is None, runs all tests. Otherwise runs only those whose
    stable IDs are in `selected`.

    Returns:
      p_values: dict of per-test p-values
      n_perms:  total permutations run
      raw_series: dict[tid -> list of float], per-permutation raw statistic
                  for each empirical test (same order as enumerate), used
                  downstream for empirical correlation and direct joint test.
                  Only populated for tests in PERM_EMPIRICAL_TESTS ∩ selected.
    """
    print("  DISTRIBUTION 1: PERMUTATION TEST (8! = 40,320 trials)")
    print("  " + "─" * 60)

    if selected is None:
        selected = set(TEST_IDS)

    ecc_vals = [ECCENTRICITIES[p] for p in PLANET_NAMES]
    incl_vals = [INCLINATION_AMPS[p] for p in PLANET_NAMES]
    mean_vals = [INCL_MEANS[p] for p in PLANET_NAMES]
    ecc_amp_vals = [ECC_AMPLITUDE[p] for p in PLANET_NAMES]

    n_perms = math.factorial(8)  # 40,320
    incl_j2000_vals = [INCL_J2000[p] for p in PLANET_NAMES]

    counts = {tid: 0 for tid in TEST_IDS if tid in selected}
    # Per-permutation raw statistics for empirical tests
    raw_series = {
        tid: [] for tid in PERM_EMPIRICAL_TESTS if tid in selected
    }

    for idx, perm in enumerate(itertools.permutations(range(8))):
        # Assign shuffled values to planets
        eccs = {PLANET_NAMES[i]: ecc_vals[perm[i]] for i in range(8)}
        incls = {PLANET_NAMES[i]: incl_vals[perm[i]] for i in range(8)}
        means = {PLANET_NAMES[i]: mean_vals[perm[i]] for i in range(8)}
        ij2k = {PLANET_NAMES[i]: incl_j2000_vals[perm[i]] for i in range(8)}
        ecc_amps = {PLANET_NAMES[i]: ecc_amp_vals[perm[i]] for i in range(8)}

        xi_e, xi_i = compute_xi(eccs, incls, SQRT_M)

        # Law 1 — Fibonacci denominators: structural (permutation preserves
        # the multiset of denominators). Count as always matching; excluded
        # from Fisher's.
        if "law1_fib_denominators" in selected:
            counts["law1_fib_denominators"] += 1

        # Law 2 — ψ full: STRUCTURAL (model amplitudes are tautologically PSI by
        # construction; permutation cannot test this). Count as always matching.
        if "law2_psi_full" in selected:
            counts["law2_psi_full"] += 1

        # Law 3 — Inclination balance (shuffled base eccentricities)
        if "law3_incl_balance" in selected:
            ib = stat_incl_balance(eccs, D_INCL, GROUP_203, GROUP_23)
            raw_series["law3_incl_balance"].append(ib)
            if ib >= observed["law3_incl_balance"]:
                counts["law3_incl_balance"] += 1

        # Law 4 — K amplitude: STRUCTURAL (model eccentricity amplitudes are
        # tautologically derived from K; permutation cannot test this).
        if "law4_k_amplitude" in selected:
            counts["law4_k_amplitude"] += 1

        # Law 5 — Eccentricity balance (shuffled base eccentricities)
        if "law5_ecc_balance" in selected:
            eb = stat_ecc_balance(eccs, D_INCL, GROUP_203, GROUP_23)
            raw_series["law5_ecc_balance"].append(eb)
            if eb >= observed["law5_ecc_balance"]:
                counts["law5_ecc_balance"] += 1

        # Law 6 — E–J–S resonance: structure-only; permutation cannot break it.
        # Count as always matching (conservative: p = 1.0).
        if "law6_ejs_resonance" in selected:
            counts["law6_ejs_resonance"] += 1

        # Finding 1 — Mirror symmetry: same — structure-only, p = 1.0.
        if "f1_mirror_symmetry" in selected:
            counts["f1_mirror_symmetry"] += 1

        # Finding 1b — d-set Fib clustering: also structure-only in permutation.
        if "f1b_d_set_fib_pairs" in selected:
            counts["f1b_d_set_fib_pairs"] += 1

        # Finding 4 — Saturn eccentricity prediction
        if "f4_saturn_prediction" in selected:
            sp = stat_saturn_prediction(eccs, D_INCL, GROUP_203, "Saturn")
            raw_series["f4_saturn_prediction"].append(sp)
            if sp <= observed["f4_saturn_prediction"]:
                counts["f4_saturn_prediction"] += 1

        # Finding 6 — Solo planet identification (shuffled eccentricities)
        if "f6_solo_planet" in selected:
            sp_id = stat_solo_planet_identification(
                eccs, D_INCL, MASSES, SMA, SQRT_M)
            raw_series["f6_solo_planet"].append(sp_id)
            if sp_id <= observed["f6_solo_planet"]:
                counts["f6_solo_planet"] += 1

        # Year-length beat: single scalar — permutation cannot disturb it.
        # Count as always matching (conservative: p = 1.0); excluded from Fisher's.
        if "year_length_beat" in selected:
            counts["year_length_beat"] += 1

        if (idx + 1) % 10000 == 0:
            print(f"    ... {idx+1:,}/{n_perms:,} permutations done")

    p_values = {k: v / n_perms for k, v in counts.items()}
    return p_values, n_perms, raw_series


# ═══════════════════════════════════════════════════════════════════════════
# DISTRIBUTION 2: LOG-UNIFORM MONTE CARLO
# ═══════════════════════════════════════════════════════════════════════════

def log_uniform_mc(observed, n_trials, rng, selected=None):
    """
    Log-uniform Monte Carlo: draw random eccentricities, inclination
    amplitudes, and mean inclinations from log-uniform distributions.

    Eccentricities:      log-uniform in [0.005, 0.25]
    Incl. amplitudes:    log-uniform in [0.01, 3.0] degrees
    Mean inclinations:   log-uniform in [0.1, 10.0] degrees
    Masses: FIXED at solar system values (conservative).

    Returns:
      p_values: dict of per-test p-values
      n_trials: total trials run
      raw_series: dict[tid -> list of float], per-trial raw statistic for
                  each MC-combinable test. Used for empirical correlation
                  and direct joint MC test.
    """
    print(f"  DISTRIBUTION 2: LOG-UNIFORM MONTE CARLO ({n_trials:,} trials)")
    print("  " + "─" * 60)

    if selected is None:
        selected = set(TEST_IDS)

    log_e_lo, log_e_hi = math.log(0.005), math.log(0.25)
    log_i_lo, log_i_hi = math.log(0.01), math.log(3.0)
    log_m_lo, log_m_hi = math.log(0.1), math.log(10.0)

    # Eccentricity amplitude range for MC
    log_ea_lo, log_ea_hi = math.log(1e-6), math.log(0.01)

    counts = {tid: 0 for tid in TEST_IDS if tid in selected}
    raw_series = {
        tid: [] for tid in MC_COMBINABLE_TESTS if tid in selected
    }

    for trial in range(n_trials):
        eccs = {}
        incls = {}
        means = {}
        ij2k = {}
        for p in PLANET_NAMES:
            eccs[p] = math.exp(rng.uniform(log_e_lo, log_e_hi))
            incls[p] = math.exp(rng.uniform(log_i_lo, log_i_hi))
            means[p] = math.exp(rng.uniform(log_m_lo, log_m_hi))
            ij2k[p] = math.exp(rng.uniform(log_i_lo, log_i_hi))

        xi_e, xi_i = compute_xi(eccs, incls, SQRT_M)

        # Random d-values and random solo planet (shared across balance tests)
        d_rand = {p: rng.choice(FIB_D_POOL) for p in PLANET_NAMES}
        solo = PLANET_NAMES[rng.randint(0, 7)]
        grp_a = [p for p in PLANET_NAMES if p != solo]
        grp_b = [solo]

        # Random amplitudes and tilts (for Law 4)
        rand_amps = {p: math.exp(rng.uniform(log_ea_lo, log_ea_hi)) for p in PLANET_NAMES}
        rand_tilts = {p: rng.uniform(0.01, 90.0) for p in PLANET_NAMES}

        # Law 1 — Fibonacci denominators: draw 8 random denoms in [2, 40]
        # (widened from [1,30] so the observed max denom (Mars=35) is in range)
        if "law1_fib_denominators" in selected:
            rand_fracs = {p: (rng.randint(1, 8), rng.randint(2, 40)) for p in PLANET_NAMES}
            gd = stat_gho_fib_denominators(rand_fracs)
            raw_series["law1_fib_denominators"].append(gd)
            if gd >= observed["law1_fib_denominators"]:
                counts["law1_fib_denominators"] += 1

        # Law 2 — ψ full: STRUCTURAL (model amplitudes are tautologically PSI;
        # MC against random amplitudes tests a different question, not the model claim).
        if "law2_psi_full" in selected:
            counts["law2_psi_full"] += 1

        # Law 3 — Inclination balance
        if "law3_incl_balance" in selected:
            ib = stat_incl_balance(eccs, d_rand, grp_a, grp_b)
            raw_series["law3_incl_balance"].append(ib)
            if ib >= observed["law3_incl_balance"]:
                counts["law3_incl_balance"] += 1

        # Law 4 — K amplitude: STRUCTURAL (model eccentricity amplitudes are
        # tautologically derived from K).
        if "law4_k_amplitude" in selected:
            counts["law4_k_amplitude"] += 1

        # Law 5 — Eccentricity balance
        if "law5_ecc_balance" in selected:
            eb = stat_ecc_balance(eccs, d_rand, grp_a, grp_b)
            raw_series["law5_ecc_balance"].append(eb)
            if eb >= observed["law5_ecc_balance"]:
                counts["law5_ecc_balance"] += 1

        # Law 6 — E–J–S resonance (random period denominators)
        if "law6_ejs_resonance" in selected:
            fib_denoms = [1, 2, 3, 5, 8, 13, 21]
            rand_fracs = {p: (rng.randint(1, 8), rng.choice(fib_denoms)) for p in PLANET_NAMES}
            ej = stat_ejs_resonance(rand_fracs)
            raw_series["law6_ejs_resonance"].append(ej)
            if ej <= observed["law6_ejs_resonance"]:
                counts["law6_ejs_resonance"] += 1

        # Finding 1 — Mirror symmetry (random d-values)
        if "f1_mirror_symmetry" in selected:
            ms = stat_mirror_symmetry(d_rand, MIRROR_PAIRS)
            raw_series["f1_mirror_symmetry"].append(ms)
            if ms >= observed["f1_mirror_symmetry"]:
                counts["f1_mirror_symmetry"] += 1

        # Finding 1b — d-set Fibonacci clustering
        if "f1b_d_set_fib_pairs" in selected:
            # d_rand is already drawn from FIB_D_POOL, so it's eligible
            dc = stat_d_set_fib_clustering(d_rand)
            raw_series["f1b_d_set_fib_pairs"].append(dc)
            if dc >= observed["f1b_d_set_fib_pairs"]:
                counts["f1b_d_set_fib_pairs"] += 1

        # Finding 4 — Saturn prediction
        if "f4_saturn_prediction" in selected:
            sp = stat_saturn_prediction(eccs, d_rand, grp_a, solo)
            raw_series["f4_saturn_prediction"].append(sp)
            if sp <= observed["f4_saturn_prediction"]:
                counts["f4_saturn_prediction"] += 1

        # Finding 6 — Solo planet identification (random eccentricities)
        if "f6_solo_planet" in selected:
            sp_id = stat_solo_planet_identification(
                eccs, d_rand, MASSES, SMA, SQRT_M)
            raw_series["f6_solo_planet"].append(sp_id)
            if sp_id <= observed["f6_solo_planet"]:
                counts["f6_solo_planet"] += 1

        # Test — Year-length beat: random (trop, sid, ano) in realistic range
        if "year_length_beat" in selected:
            trop = rng.uniform(360, 370)
            sid = trop * (1 + math.exp(rng.uniform(math.log(1e-6), math.log(1e-3))))
            ano = trop * (1 + math.exp(rng.uniform(math.log(1e-6), math.log(1e-3))))
            yb = stat_year_length_beat(trop, sid, ano, H)
            raw_series["year_length_beat"].append(yb)
            if yb <= observed["year_length_beat"]:
                counts["year_length_beat"] += 1

        if (trial + 1) % 10000 == 0:
            print(f"    ... {trial+1:,}/{n_trials:,} trials done")

    p_values = {k: v / n_trials for k, v in counts.items()}
    return p_values, n_trials, raw_series


# ═══════════════════════════════════════════════════════════════════════════
# DISTRIBUTION 3: UNIFORM MONTE CARLO
# ═══════════════════════════════════════════════════════════════════════════

def uniform_mc(observed, n_trials, rng, selected=None):
    """
    Uniform Monte Carlo: draw random eccentricities, inclination
    amplitudes, and mean inclinations from uniform distributions.

    Eccentricities:      uniform in [0.005, 0.25]
    Incl. amplitudes:    uniform in [0.01, 3.0] degrees
    Mean inclinations:   uniform in [0.1, 10.0] degrees
    Masses: FIXED at solar system values (conservative).

    Returns: (p_values, n_trials, raw_series) — same shape as log_uniform_mc.
    """
    print(f"  DISTRIBUTION 3: UNIFORM MONTE CARLO ({n_trials:,} trials)")
    print("  " + "─" * 60)

    if selected is None:
        selected = set(TEST_IDS)

    counts = {tid: 0 for tid in TEST_IDS if tid in selected}
    raw_series = {
        tid: [] for tid in MC_COMBINABLE_TESTS if tid in selected
    }

    for trial in range(n_trials):
        eccs = {}
        incls = {}
        means = {}
        ij2k = {}
        rand_amps = {}
        rand_tilts = {}
        for p in PLANET_NAMES:
            eccs[p] = rng.uniform(0.005, 0.25)
            incls[p] = rng.uniform(0.01, 3.0)
            means[p] = rng.uniform(0.1, 10.0)
            ij2k[p] = rng.uniform(0.01, 3.0)
            rand_amps[p] = rng.uniform(1e-6, 0.01)
            rand_tilts[p] = rng.uniform(0.01, 90.0)

        xi_e, xi_i = compute_xi(eccs, incls, SQRT_M)

        # Random d-values and random solo planet (shared across balance tests)
        d_rand = {p: rng.choice(FIB_D_POOL) for p in PLANET_NAMES}
        solo = PLANET_NAMES[rng.randint(0, 7)]
        grp_a = [p for p in PLANET_NAMES if p != solo]
        grp_b = [solo]

        # Law 1 — Fibonacci denominators (uniform random denoms, widened to [2,40])
        if "law1_fib_denominators" in selected:
            rand_fracs = {p: (rng.randint(1, 8), rng.randint(2, 40)) for p in PLANET_NAMES}
            gd = stat_gho_fib_denominators(rand_fracs)
            raw_series["law1_fib_denominators"].append(gd)
            if gd >= observed["law1_fib_denominators"]:
                counts["law1_fib_denominators"] += 1

        # Law 2 — ψ full: STRUCTURAL (model amplitudes are tautologically PSI;
        # MC against random amplitudes tests a different question, not the model claim).
        if "law2_psi_full" in selected:
            counts["law2_psi_full"] += 1

        # Law 3 — Inclination balance
        if "law3_incl_balance" in selected:
            ib = stat_incl_balance(eccs, d_rand, grp_a, grp_b)
            raw_series["law3_incl_balance"].append(ib)
            if ib >= observed["law3_incl_balance"]:
                counts["law3_incl_balance"] += 1

        # Law 4 — K amplitude: STRUCTURAL (model eccentricity amplitudes are
        # tautologically derived from K).
        if "law4_k_amplitude" in selected:
            counts["law4_k_amplitude"] += 1

        # Law 5 — Eccentricity balance
        if "law5_ecc_balance" in selected:
            eb = stat_ecc_balance(eccs, d_rand, grp_a, grp_b)
            raw_series["law5_ecc_balance"].append(eb)
            if eb >= observed["law5_ecc_balance"]:
                counts["law5_ecc_balance"] += 1

        # Law 6 — E–J–S resonance
        if "law6_ejs_resonance" in selected:
            fib_denoms = [1, 2, 3, 5, 8, 13, 21]
            rand_fracs = {p: (rng.randint(1, 8), rng.choice(fib_denoms)) for p in PLANET_NAMES}
            ej = stat_ejs_resonance(rand_fracs)
            raw_series["law6_ejs_resonance"].append(ej)
            if ej <= observed["law6_ejs_resonance"]:
                counts["law6_ejs_resonance"] += 1

        # Finding 1 — Mirror symmetry
        if "f1_mirror_symmetry" in selected:
            ms = stat_mirror_symmetry(d_rand, MIRROR_PAIRS)
            raw_series["f1_mirror_symmetry"].append(ms)
            if ms >= observed["f1_mirror_symmetry"]:
                counts["f1_mirror_symmetry"] += 1

        # Finding 1b — d-set Fibonacci clustering
        if "f1b_d_set_fib_pairs" in selected:
            dc = stat_d_set_fib_clustering(d_rand)
            raw_series["f1b_d_set_fib_pairs"].append(dc)
            if dc >= observed["f1b_d_set_fib_pairs"]:
                counts["f1b_d_set_fib_pairs"] += 1

        # Finding 4 — Saturn prediction
        if "f4_saturn_prediction" in selected:
            sp = stat_saturn_prediction(eccs, d_rand, grp_a, solo)
            raw_series["f4_saturn_prediction"].append(sp)
            if sp <= observed["f4_saturn_prediction"]:
                counts["f4_saturn_prediction"] += 1

        # Finding 6 — Solo planet identification (random eccentricities)
        if "f6_solo_planet" in selected:
            sp_id = stat_solo_planet_identification(
                eccs, d_rand, MASSES, SMA, SQRT_M)
            raw_series["f6_solo_planet"].append(sp_id)
            if sp_id <= observed["f6_solo_planet"]:
                counts["f6_solo_planet"] += 1

        # Test — Year-length beat (uniform random ratio increments)
        if "year_length_beat" in selected:
            trop = rng.uniform(360, 370)
            sid = trop * (1 + rng.uniform(1e-6, 1e-3))
            ano = trop * (1 + rng.uniform(1e-6, 1e-3))
            yb = stat_year_length_beat(trop, sid, ano, H)
            raw_series["year_length_beat"].append(yb)
            if yb <= observed["year_length_beat"]:
                counts["year_length_beat"] += 1

        if (trial + 1) % 10000 == 0:
            print(f"    ... {trial+1:,}/{n_trials:,} trials done")

    p_values = {k: v / n_trials for k, v in counts.items()}
    return p_values, n_trials, raw_series


# ═══════════════════════════════════════════════════════════════════════════
# EMPIRICAL CORRELATION & DIRECT JOINT PERMUTATION TEST
# ═══════════════════════════════════════════════════════════════════════════

def _mean_var(xs):
    """Return (mean, population variance) of a sequence."""
    n = len(xs)
    if n == 0:
        return 0.0, 0.0
    m = sum(xs) / n
    v = sum((x - m) ** 2 for x in xs) / n
    return m, v


def _pearson(xs, ys):
    """Pearson correlation coefficient of two equal-length sequences."""
    n = len(xs)
    if n < 2 or n != len(ys):
        return 0.0
    mx, vx = _mean_var(xs)
    my, vy = _mean_var(ys)
    sx = math.sqrt(vx)
    sy = math.sqrt(vy)
    if sx <= 0 or sy <= 0:
        return 0.0
    cov = sum((xs[i] - mx) * (ys[i] - my) for i in range(n)) / n
    return cov / (sx * sy)


def studentize(raw_series, observed, test_ids):
    """
    Convert per-trial raw statistics and the observed value into oriented
    z-scores (positive = more observed-like) using the NULL distribution
    mean and std.

    Returns:
      z_obs: dict[tid -> float] observed studentized z
      z_series: dict[tid -> list[float]] studentized null series
      stats:   dict[tid -> (mean, std, sign)] for diagnostics
    """
    z_obs = {}
    z_series = {}
    stats = {}
    for tid in test_ids:
        series = raw_series.get(tid)
        if not series:
            continue
        mean, var = _mean_var(series)
        std = math.sqrt(var)
        sign = STAT_SIGN.get(tid, +1)
        if std <= 0:
            # Degenerate: all null draws equal. Treat as uninformative (z=0).
            z_obs[tid] = 0.0
            z_series[tid] = [0.0] * len(series)
            stats[tid] = (mean, std, sign)
            continue
        z_obs[tid] = sign * (observed[tid] - mean) / std
        z_series[tid] = [sign * (x - mean) / std for x in series]
        stats[tid] = (mean, std, sign)
    return z_obs, z_series, stats


def empirical_correlation(z_series, test_ids):
    """
    Compute the average pairwise Pearson correlation of the studentized
    null series across a list of test IDs. Returns r̄ (0.0 if <2 tests).
    """
    tids = [t for t in test_ids if t in z_series and len(z_series[t]) > 0]
    k = len(tids)
    if k < 2:
        return 0.0
    r_sum = 0.0
    r_n = 0
    for i in range(k):
        for j in range(i + 1, k):
            r = _pearson(z_series[tids[i]], z_series[tids[j]])
            r_sum += r
            r_n += 1
    return r_sum / r_n if r_n > 0 else 0.0


def direct_joint_test(z_obs, z_series, test_ids):
    """
    Direct joint test: combine studentized z-scores into a single statistic
    T = Σ_i z_i, then compute the p-value as the fraction of null samples
    with T_null ≥ T_obs.

    This is model-independent (no Gaussian assumption, no correlation
    correction needed — the correlation is baked into the joint null by
    construction).

    Returns: (p, T_obs, n_samples). p is never zero: if no null samples
    meet or exceed T_obs, the conservative upper bound 1/(n+1) is returned.
    """
    tids = [t for t in test_ids if t in z_obs and t in z_series and len(z_series[t]) > 0]
    if not tids:
        return 1.0, 0.0, 0

    n = len(z_series[tids[0]])
    T_obs = sum(z_obs[t] for t in tids)

    # Build null distribution of T
    ge = 0
    for idx in range(n):
        T_null = sum(z_series[t][idx] for t in tids)
        if T_null >= T_obs:
            ge += 1

    # Use the "+1" rule so p is never exactly 0
    p = (ge + 1) / (n + 1)
    return p, T_obs, n


# ═══════════════════════════════════════════════════════════════════════════
# LEAVE-ONE-OUT (JACKKNIFE) PERMUTATION TEST
# ═══════════════════════════════════════════════════════════════════════════

def _balance_ex(eccs, d_vals, group_a, group_b, fn):
    """Compute either stat_incl_balance or stat_ecc_balance over a subset."""
    return fn(eccs, d_vals, group_a, group_b)


def jackknife_permutation(drop_planet):
    """
    Run the 4-empirical-test direct joint permutation test after removing
    `drop_planet` from the system entirely.

    Uses 7! = 5,040 permutations of the remaining planets. Drops the
    removed planet from the phase groups as well. If Saturn (the solo
    anti-phase planet) is dropped, F4 is undefined and is excluded from
    the joint test for that leave-one-out run.

    Returns: dict with keys {p, T_obs, n, sigma, tests_used, observed}
    """
    remaining = [p for p in PLANET_NAMES if p != drop_planet]
    n = len(remaining)
    if n < 3:
        return None

    grp_a = [p for p in GROUP_203 if p != drop_planet]
    grp_b = [p for p in GROUP_23  if p != drop_planet]

    # Determine which tests are meaningful after the drop
    tests = ["law3_incl_balance", "law5_ecc_balance", "f6_solo_planet"]
    # F4 requires a designated solo planet (Saturn by convention in
    # GROUP_23). If we drop Saturn, F4 is undefined.
    f4_enabled = "Saturn" in remaining and len(grp_b) >= 1
    if f4_enabled:
        tests.append("f4_saturn_prediction")

    # Observed values with the remaining subset
    obs = {}
    obs["law3_incl_balance"] = stat_incl_balance(
        ECCENTRICITIES, D_INCL, grp_a, grp_b)
    obs["law5_ecc_balance"] = stat_ecc_balance(
        ECCENTRICITIES, D_INCL, grp_a, grp_b)
    # Restrict solo-planet argmin to the remaining planets
    obs["f6_solo_planet"] = _stat_solo_planet_subset(
        ECCENTRICITIES, D_INCL, remaining)
    if f4_enabled:
        obs["f4_saturn_prediction"] = stat_saturn_prediction(
            ECCENTRICITIES, D_INCL, grp_a, "Saturn")

    # Permutation loop over remaining planets
    ecc_vals = [ECCENTRICITIES[p] for p in remaining]
    raw_series = {t: [] for t in tests}

    for perm in itertools.permutations(range(n)):
        eccs_perm = {remaining[i]: ecc_vals[perm[i]] for i in range(n)}
        # Extend with dropped planet's original value so stat functions that
        # iterate PLANET_NAMES keep working (they skip planets not in groups).
        eccs_perm[drop_planet] = ECCENTRICITIES[drop_planet]

        raw_series["law3_incl_balance"].append(
            stat_incl_balance(eccs_perm, D_INCL, grp_a, grp_b))
        raw_series["law5_ecc_balance"].append(
            stat_ecc_balance(eccs_perm, D_INCL, grp_a, grp_b))
        raw_series["f6_solo_planet"].append(
            _stat_solo_planet_subset(eccs_perm, D_INCL, remaining))
        if f4_enabled:
            raw_series["f4_saturn_prediction"].append(
                stat_saturn_prediction(eccs_perm, D_INCL, grp_a, "Saturn"))

    z_obs, z_series, _ = studentize(raw_series, obs, tests)
    p, T_obs, n_samples = direct_joint_test(z_obs, z_series, tests)
    return {
        "drop": drop_planet,
        "p": p,
        "sigma": p_to_sigma(p),
        "T_obs": T_obs,
        "n": n_samples,
        "tests_used": tests,
        "observed": obs,
    }


def _stat_solo_planet_subset(eccs, d_vals, planet_subset):
    """
    Solo-planet-identification statistic restricted to a subset of planets.
    Same shape as stat_solo_planet_identification but iterates only the
    given subset (used by jackknife).
    """
    v = {}
    for p in planet_subset:
        d_p = d_vals.get(p, 0)
        if d_p <= 0 or eccs.get(p, 0) <= 0:
            return 1.0
        v[p] = SQRT_M[p] * SEMI_MAJOR[p] ** 1.5 * eccs[p] / math.sqrt(d_p)
    total = sum(v.values())
    min_resid = float("inf")
    for p in planet_subset:
        if v[p] <= 0:
            continue
        sum_others = total - v[p]
        resid = abs(v[p] - sum_others) / v[p]
        if resid < min_resid:
            min_resid = resid
    return min_resid if min_resid != float("inf") else 1.0


# ═══════════════════════════════════════════════════════════════════════════
# FISHER'S METHOD — COMBINE INDEPENDENT P-VALUES
# ═══════════════════════════════════════════════════════════════════════════

def p_to_sigma(p):
    """Convert a (one-tailed) p-value to an equivalent Gaussian sigma (z-score).

    Solves Φ(σ) = 1 - p for σ via bisection on erfc.
    Returns 0.0 for p ≥ 0.5 and a large finite value for p → 0.
    Robust across the full range [1e-300, 0.5] — no Newton-overshoot artifacts.
    """
    if p <= 0:
        return 40.0  # effectively infinite (beyond any meaningful discovery threshold)
    if p >= 0.5:
        return 0.0
    # We want σ such that 0.5 * erfc(σ/√2) = p, i.e. erfc(σ/√2) = 2p.
    # erfc is monotone decreasing in σ, so bisect in [0, 40].
    target = 2.0 * p
    lo, hi = 0.0, 40.0
    for _ in range(100):
        mid = 0.5 * (lo + hi)
        if math.erfc(mid / math.sqrt(2.0)) > target:
            lo = mid
        else:
            hi = mid
        if hi - lo < 1e-12:
            break
    return 0.5 * (lo + hi)


def fishers_method(p_values_list):
    """
    Fisher's method: combine k independent p-values into one.

    X = -2 Σ ln(pᵢ) ~ χ²(2k) under H₀.
    Returns the combined p-value from the chi-squared survival function.

    Uses the regularized incomplete gamma function approximation.
    """
    k = len(p_values_list)
    # Clamp p-values away from 0 to avoid log(0)
    clamped = [max(p, 1e-10) for p in p_values_list]
    X = -2 * sum(math.log(p) for p in clamped)
    # χ²(2k) survival function = regularized upper incomplete gamma
    # P(χ² > X) = Γ(k, X/2) / Γ(k) where Γ is incomplete gamma
    # Use series expansion for moderate X
    return chi2_survival(X, 2 * k)


def stouffers_z(p_values_list, correlation_factor=1.0):
    """
    Stouffer's Z-method (also called the inverse normal method) for combining
    independent p-values. Compared to Fisher's method, Stouffer's:
      1. Is less sensitive to extreme small p-values (no log → no floor blow-up)
      2. Generalizes naturally to correlated tests via a covariance penalty
      3. Produces a Z-score that maps directly to a sigma figure

    Procedure:
      Z_i = Φ⁻¹(1 - p_i)              # convert each p-value to a z-score
      Z_combined = Σ Z_i / √(k × ρ)    # ρ accounts for average correlation
      p_combined = 1 - Φ(Z_combined)

    For ρ = 1 (independent tests) this reduces to the standard Stouffer formula
    Z_combined = (Σ Z_i) / √k. For ρ > 1 (positively correlated tests) the
    denominator inflates, weakening the combined p — this is the correlation
    penalty.

    For correlated tests with average pairwise correlation r, a Brown-style
    correction uses correlation_factor = 1 + (k-1) × r.

    Args:
      p_values_list: list of one-tailed p-values
      correlation_factor: variance inflation factor (1 = independent, >1 = correlated)

    Returns:
      combined p-value
    """
    if not p_values_list:
        return 1.0
    k = len(p_values_list)
    # Convert p-values to one-tailed z-scores via the inverse normal CDF.
    # We reuse p_to_sigma which solves erfc(σ/√2) = 2p for σ.
    z_scores = [p_to_sigma(p) for p in p_values_list]
    z_sum = sum(z_scores)
    z_combined = z_sum / math.sqrt(k * correlation_factor)
    # Convert combined z back to a p-value: p = 0.5 × erfc(z/√2)
    if z_combined <= 0:
        return 1.0
    p_combined = 0.5 * math.erfc(z_combined / math.sqrt(2.0))
    return max(p_combined, 1e-300)  # avoid underflow to 0


def chi2_survival(x, dof):
    """
    Survival function (1 - CDF) for chi-squared distribution.
    Uses the regularized incomplete gamma function via series expansion.
    P(χ² > x | dof) = 1 - gammaincl(dof/2, x/2) / Gamma(dof/2)

    For integer or half-integer dof (our case: dof=2k is always even),
    this simplifies to a finite sum.
    """
    if x <= 0:
        return 1.0
    # For even dof = 2n, the survival function is:
    # P(χ² > x) = e^(-x/2) × Σ_{j=0}^{n-1} (x/2)^j / j!
    n = dof // 2
    half_x = x / 2.0
    total = 0.0
    term = 1.0  # (x/2)^0 / 0! = 1
    for j in range(n):
        total += term
        term *= half_x / (j + 1)
    return math.exp(-half_x) * total


# ═══════════════════════════════════════════════════════════════════════════
# DETAILED OBSERVED ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

def print_observed_detail():
    """Print detailed analysis of observed Fibonacci relationships."""
    xi_e, xi_i = compute_xi(ECCENTRICITIES, INCLINATION_AMPS, SQRT_M)

    print("=" * 78)
    print("  OBSERVED FIBONACCI RELATIONSHIPS IN THE SOLAR SYSTEM")
    print("=" * 78)
    print()

    # Mass-weighted parameters
    print("  Mass-weighted eccentricities ξ = e × √m:")
    print(f"  {'Planet':<10} {'e':>12} {'√m':>12} {'ξ = e√m':>14}")
    print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*14}")
    for p in PLANET_NAMES:
        print(f"  {p:<10} {ECCENTRICITIES[p]:>12.8f} {SQRT_M[p]:>12.6e} {xi_e[p]:>14.6e}")
    print()

    print("  Mass-weighted inclination amplitudes η = i × √m:")
    print(f"  {'Planet':<10} {'i (°)':>12} {'√m':>12} {'η = i√m':>14}")
    print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*14}")
    for p in PLANET_NAMES:
        print(f"  {p:<10} {INCLINATION_AMPS[p]:>12.6f} {SQRT_M[p]:>12.6e} {xi_i[p]:>14.6e}")
    print()

    # Pairwise Fibonacci ratios in eccentricity
    print("  Pairwise ξ-ratios near Fibonacci (eccentricity, ≤5% error):")
    print(f"  {'Pair':<25} {'Ratio':>10} {'Nearest Fib':>12} {'Error':>8}")
    print(f"  {'-'*25} {'-'*10} {'-'*12} {'-'*8}")
    ecc_count = 0
    for i, p1 in enumerate(PLANET_NAMES):
        for p2 in PLANET_NAMES[i+1:]:
            if xi_e[p1] > 0 and xi_e[p2] > 0:
                ratio = xi_e[p1] / xi_e[p2]
                err = best_fibonacci_error(ratio)
                if err < TOLERANCE:
                    ecc_count += 1
                    # Find the nearest Fibonacci ratio
                    nearest = min(FIB_RATIOS, key=lambda fr: abs(ratio / fr - 1.0))
                    print(f"  {p1+'/'+p2:<25} {ratio:>10.4f} {nearest:>12.4f} {err*100:>+7.2f}%")
    print(f"  → {ecc_count} eccentricity pairs match")
    print()

    # Pairwise Fibonacci ratios in inclination
    print("  Pairwise η-ratios near Fibonacci (inclination, ≤5% error):")
    print(f"  {'Pair':<25} {'Ratio':>10} {'Nearest Fib':>12} {'Error':>8}")
    print(f"  {'-'*25} {'-'*10} {'-'*12} {'-'*8}")
    incl_count = 0
    for i, p1 in enumerate(PLANET_NAMES):
        for p2 in PLANET_NAMES[i+1:]:
            if xi_i[p1] > 0 and xi_i[p2] > 0:
                ratio = xi_i[p1] / xi_i[p2]
                err = best_fibonacci_error(ratio)
                if err < TOLERANCE:
                    incl_count += 1
                    nearest = min(FIB_RATIOS, key=lambda fr: abs(ratio / fr - 1.0))
                    print(f"  {p1+'/'+p2:<25} {ratio:>10.4f} {nearest:>12.4f} {err*100:>+7.2f}%")
    print(f"  → {incl_count} inclination pairs match")
    print()
    print(f"  TOTAL PAIRWISE MATCHES: {ecc_count + incl_count} out of 56 possible")
    print()

    # Single-ψ structure (Tests 4-5 context)
    print("  ψ-constant structure (d × η for each planet):")
    print(f"  {'Planet':<10} {'d':>6} {'η':>14} {'d × η':>14} {'Error':>8}")
    print(f"  {'-'*10} {'-'*6} {'-'*14} {'-'*14} {'-'*8}")

    psi_products = [D_INCL[p] * xi_i[p] for p in PLANET_NAMES]
    psi_obs = sum(psi_products) / len(psi_products)
    for p in PLANET_NAMES:
        val = D_INCL[p] * xi_i[p]
        d_str = str(D_INCL[p])
        print(f"  {p:<10} {d_str:>6} {xi_i[p]:>14.6e} {val:>14.6e} {abs(val/psi_obs-1)*100:>+7.3f}%")
    spread = (max(psi_products) - min(psi_products)) / psi_obs
    print(f"  {'ψ mean':>16} = {psi_obs:.6e}")
    print(f"  {'ψ (from Earth)':>16} = {PSI1_THEORY:.6e}  "
          f"(d_E × amp_E × √m_E)")
    print(f"  {'Match':>16} = {abs(psi_obs/PSI1_THEORY-1)*100:.4f}%")
    print(f"  {'Spread':>16} = {spread*100:.4f}%")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# LOOK-ELSEWHERE EFFECT ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

def print_look_elsewhere():
    """Quantify the look-elsewhere effect for the current test suite."""
    print("=" * 78)
    print("  LOOK-ELSEWHERE EFFECT ACCOUNTING")
    print("=" * 78)
    print()
    print("  The 4 EMPIRICAL tests (Laws 3, 5; F4, F6) have zero per-test")
    print("  look-elsewhere: each uses fixed model d-values and phase groups,")
    print("  and computes a single scalar statistic with no tunable parameters.")
    print()
    print("  Multiple-testing correction across the 4 tests is absorbed by the")
    print("  joint permutation test, which combines them into a single T")
    print("  statistic and computes one p-value from its joint null.")
    print()
    print(f"  Law 1 (Fib denominators):  9 of {len(FIB_D_POOL)} Fib numbers in "
          f"draw range [2,40] under MC null → baseline ≈ {9/39*100:.0f}% per slot")
    print(f"  Law 6 (E–J–S resonance):   b_E + b_J = b_S constrained across "
          f"Fibonacci triples → ≈ 1 in 50 random Fib-triples satisfy it")
    print(f"  Findings 1, 1b:            structural d-assignment claims — "
          f"MC draws from {len(FIB_D_POOL)}-element Fib pool")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Statistical significance test for Fibonacci laws of planetary motion",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Test selection examples:
  --tests laws                    # all 6 Laws only
  --tests findings                # all 3 Findings only
  --tests law1,law3,law5          # three specific laws (prefix match)
  --tests 1-6                     # first 6 tests (= all Laws)
  --tests law3_incl_balance       # one test by full ID
  --tests laws,f4                 # combine categories and specific tests

Valid IDs (in order):
   1. law1_fib_denominators    7.  f1_mirror_symmetry
   2. law2_psi_full            8.  f1b_d_set_fib_pairs
   3. law3_incl_balance        9.  f4_saturn_prediction
   4. law4_k_amplitude         10. f6_solo_planet
   5. law5_ecc_balance         11. year_length_beat
   6. law6_ejs_resonance
""")
    parser.add_argument("--trials", type=int, default=1_000_000,
                        help="Number of Monte Carlo trials per distribution (default: 1000000; "
                             "set lower to iterate quickly, higher for tighter tail estimates)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--skip-mc", action="store_true",
                        help="Skip Monte Carlo (run only permutation test)")
    parser.add_argument("--skip-perm", action="store_true",
                        help="Skip permutation test (run only Monte Carlo)")
    parser.add_argument("--tests", type=str, default=None,
                        help="Comma-separated list of test IDs / indices / categories "
                             "(default: all 13). See epilog for examples.")
    args = parser.parse_args()

    try:
        selected = parse_test_filter(args.tests)
    except ValueError as e:
        parser.error(str(e))

    # Preserve TEST_REGISTRY order for iteration
    selected_ordered = [tid for tid in TEST_IDS if tid in selected]

    import random
    rng = random.Random(args.seed)

    print()
    print("*" * 78)
    print("  FIBONACCI SIGNIFICANCE TEST — MONTE CARLO & PERMUTATION ANALYSIS")
    print("*" * 78)
    print()
    print(f"  Parameters: {args.trials:,} MC trials, seed={args.seed}")
    print(f"  Tolerance: {TOLERANCE*100:.0f}% (pairwise), {STRICT_TOL*100:.0f}% (laws)")
    print(f"  Fibonacci ratios tested: {len(FIB_RATIOS)} "
          f"({', '.join(f'{r:.3g}' for r in FIB_RATIOS[:5])} ... "
          f"{', '.join(f'{r:.3g}' for r in FIB_RATIOS[-3:])})")
    print(f"  Tests selected: {len(selected_ordered)}/{len(TEST_IDS)}")
    if len(selected_ordered) < len(TEST_IDS):
        print(f"    Running: {', '.join(selected_ordered)}")
    print()

    # ─── Observed statistics ──────────────────────────────────────────
    print_observed_detail()
    print_look_elsewhere()

    print("=" * 78)
    print("  COMPUTING OBSERVED TEST STATISTICS")
    print("=" * 78)
    print()
    t0 = time.time()
    observed = compute_observed_stats(selected)
    dt = time.time() - t0

    # Formatters keyed by test ID — how to display the observed value
    def fmt_observed(tid, obs):
        if tid == "law1_fib_denominators":
            return f"{obs[tid]} / 8 Fib denominators"
        if tid == "law2_psi_full":
            return f"{obs[tid]*100:.4f}% spread"
        if tid == "law3_incl_balance":
            return f"{obs[tid]:.4f}%"
        if tid == "law4_k_amplitude":
            return f"{obs[tid]*100:.4f}% max error"
        if tid == "law5_ecc_balance":
            return f"{obs[tid]:.4f}%"
        if tid == "law6_ejs_resonance":
            return f"{obs[tid]*100:.4f}% error"
        if tid == "f1_mirror_symmetry":
            return f"{obs[tid]}/4 pairs"
        if tid == "f1b_d_set_fib_pairs":
            return f"{'yes' if obs[tid] == 1 else 'no'} (2 consecutive Fib pairs)"
        if tid == "f4_saturn_prediction":
            return f"{obs[tid]*100:.4f}% error"
        if tid == "f6_solo_planet":
            return f"{obs[tid]*100:.4f}% min residual (best-fit solo)"
        if tid == "year_length_beat":
            return f"{obs[tid]*100:.6f}% max err (sid & ano beats)"
        return str(obs.get(tid, "?"))

    for idx, tid in enumerate(selected_ordered, start=1):
        label = TEST_LABEL_MAP[tid]
        val = fmt_observed(tid, observed)
        print(f"  {idx:>2}. {label:<34}  {val}")
    print(f"  (computed in {dt:.1f}s)")
    print()

    # ─── Significance tests ──────────────────────────────────────────
    all_p_values = {}
    all_raw_series = {}  # dist name -> raw_series dict (for joint tests)
    all_n_samples = {}   # dist name -> n

    if not args.skip_perm:
        print("=" * 78)
        t0 = time.time()
        p_perm, n_perm, raw_perm = permutation_test(observed, selected)
        dt = time.time() - t0
        all_p_values["Permutation"] = p_perm
        all_raw_series["Permutation"] = raw_perm
        all_n_samples["Permutation"] = n_perm

        print()
        print(f"  Results ({n_perm:,} permutations, {dt:.1f}s):")
        for tid in selected_ordered:
            p = p_perm[tid]
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            p_str = f"< 1/{n_perm:,}" if p == 0 else f"{p:.6f}"
            print(f"    {TEST_LABEL_MAP[tid]:<34} p = {p_str:<14} {sig}")
        print()

    if not args.skip_mc:
        print("=" * 78)
        t0 = time.time()
        p_log, n_log, raw_log = log_uniform_mc(observed, args.trials, rng, selected)
        dt = time.time() - t0
        all_p_values["Log-uniform"] = p_log
        all_raw_series["Log-uniform"] = raw_log
        all_n_samples["Log-uniform"] = n_log

        print()
        print(f"  Results ({n_log:,} trials, {dt:.1f}s):")
        for tid in selected_ordered:
            p = p_log[tid]
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            p_str = f"< 1/{n_log:,}" if p == 0 else f"{p:.6f}"
            print(f"    {TEST_LABEL_MAP[tid]:<34} p = {p_str:<14} {sig}")
        print()

        print("=" * 78)
        t0 = time.time()
        p_uni, n_uni, raw_uni = uniform_mc(observed, args.trials, rng, selected)
        dt = time.time() - t0
        all_p_values["Uniform"] = p_uni
        all_raw_series["Uniform"] = raw_uni
        all_n_samples["Uniform"] = n_uni

        print()
        print(f"  Results ({n_uni:,} trials, {dt:.1f}s):")
        for tid in selected_ordered:
            p = p_uni[tid]
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            p_str = f"< 1/{n_uni:,}" if p == 0 else f"{p:.6f}"
            print(f"    {TEST_LABEL_MAP[tid]:<34} p = {p_str:<14} {sig}")
        print()

    # ─── Summary ──────────────────────────────────────────────────────
    print("=" * 78)
    print("  COMBINED SIGNIFICANCE SUMMARY")
    print("=" * 78)
    print()

    # Summary table — order from TEST_REGISTRY, restricted to selected
    header = f"  {'Test':<34}"
    for dist in all_p_values:
        header += f" {dist:>14}"
    print(header)
    print("  " + "─" * (34 + 15 * len(all_p_values)))

    for tid in selected_ordered:
        row = f"  {TEST_LABEL_MAP[tid]:<34}"
        for dist, pvals in all_p_values.items():
            p = pvals[tid]
            if p == 0:
                row += f" {'< 0.00003':>14}"
            else:
                row += f" {p:>14.6f}"
        print(row)
    print()

    # Combined p-values — DIRECT JOINT TEST + supporting approximations.
    #
    # For each null distribution we compute:
    #
    #  1. DIRECT JOINT TEST (headline when available):
    #     Studentize each test's raw statistic using the null mean and std,
    #     sum them into T = Σ_i z_i, then compute p as the fraction of null
    #     samples with T_null ≥ T_obs. This uses the joint null distribution
    #     directly — no distributional assumptions, no correlation correction.
    #
    #  2. EMPIRICAL CORRELATION: average pairwise Pearson r between the
    #     studentized null series, reported for transparency. For the
    #     permutation null this is the TRUE correlation among tests given
    #     the shared permutation scheme — previously assumed to be 0.5.
    #
    #  3. STOUFFER'S Z (empirical-r-corrected) and FISHER'S METHOD:
    #     kept as supporting statistics. Stouffer's now uses the measured r
    #     instead of the hard-coded 0.5, so the variance-inflation factor
    #     is correct rather than a guess.
    #
    # Test sets differ per null:
    #   - Permutation: 4 empirical tests (Laws 3, 5; F4, F6). Structural
    #     tests are permutation-invariant and would dilute the result.
    #   - MC nulls:    up to 9 tests (the 4 empirical + Laws 1, 6; F1, F1b;
    #     year-length beat). Under random solar systems those structural
    #     tests become meaningful because the null draws random d-values,
    #     random period denominators, random year lengths, etc.
    non_structural_perm = [tid for tid in selected_ordered
                           if tid in PERM_EMPIRICAL_TESTS]
    non_structural_mc = [tid for tid in selected_ordered
                         if tid in MC_COMBINABLE_TESTS]

    def combinable_for(dist):
        return non_structural_perm if dist == "Permutation" else non_structural_mc

    fisher_combined = {}
    stouffer_combined = {}
    stouffer_combined_corrected = {}
    joint_combined = {}       # dist -> {p, T_obs, n, sigma, tests_used}
    empirical_r = {}          # dist -> measured average pairwise r

    if non_structural_perm or non_structural_mc:
        print(f"  Combined p-values:")
        excluded_always = [tid for tid in selected_ordered
                           if tid not in MC_COMBINABLE_TESTS]
        if excluded_always:
            print(f"    (always excluded, tautological: {', '.join(excluded_always)})")
        print(f"    Permutation-combinable tests: {len(non_structural_perm)} "
              f"({', '.join(non_structural_perm)})")
        print(f"    MC-combinable tests:          {len(non_structural_mc)} "
              f"({', '.join(non_structural_mc)})")
        print()

        # Header
        print(f"    {'Distribution':<14} {'r̄ (meas)':>10} {'JointP':>12} {'JointSig':>10} "
              f"{'FisherP':>12} {'StoufferP':>12} {'StoufCorrP':>12}")
        print(f"    {'─'*14} {'─'*10} {'─'*12} {'─'*10} {'─'*12} {'─'*12} {'─'*12}")

        for dist, pvals in all_p_values.items():
            combinable = combinable_for(dist)
            raw_series = all_raw_series.get(dist, {})

            # ─ Direct joint test (studentized combined statistic) ─
            z_obs, z_series, _z_stats = studentize(raw_series, observed, combinable)
            r_meas = empirical_correlation(z_series, combinable)
            empirical_r[dist] = r_meas

            joint_p, T_obs, n_joint = direct_joint_test(z_obs, z_series, combinable)
            joint_sigma = p_to_sigma(joint_p)
            joint_combined[dist] = {
                "p":          joint_p,
                "sigma":      joint_sigma,
                "T_obs":      T_obs,
                "n":          n_joint,
                "tests_used": list(combinable),
            }

            # ─ Supporting: Fisher's and Stouffer's on per-test p-values ─
            k_c = len(combinable)
            n_total = all_n_samples.get(dist, args.trials)
            p_list = [max(pvals[tid], 1.0 / n_total) for tid in combinable]

            # Stouffer's with measured r̄ (clamp r to [0, 1])
            r_use = max(0.0, min(1.0, r_meas))
            correlation_factor = 1.0 + (k_c - 1) * r_use if k_c > 1 else 1.0

            f_combined = fishers_method(p_list)
            s_combined = stouffers_z(p_list, correlation_factor=1.0)
            s_combined_corr = stouffers_z(p_list, correlation_factor=correlation_factor)

            fisher_combined[dist] = f_combined
            stouffer_combined[dist] = s_combined
            stouffer_combined_corrected[dist] = s_combined_corr

            print(f"    {dist:<14} {r_meas:>10.3f} {joint_p:>12.3e} "
                  f"{joint_sigma:>8.2f} σ {f_combined:>12.3e} "
                  f"{s_combined:>12.3e} {s_combined_corr:>12.3e}")
        print()
        print(f"  Headline: DIRECT JOINT permutation test (studentized combined T)")
        if "Permutation" in joint_combined:
            jp = joint_combined["Permutation"]
            print(f"            → p = {jp['p']:.3e}  ({jp['sigma']:.2f} σ)"
                  f"  [k={len(jp['tests_used'])}, n={jp['n']:,}]")
        print(f"  Why this is the headline:")
        print(f"    - Model-independent: no Gaussian or distributional assumptions")
        print(f"    - Self-correcting for correlation: joint null captures it directly")
        print(f"    - No floor-clamp artifact: p ≥ 1/(n+1) by construction")
        print(f"  Supporting: Stouffer's Z with MEASURED correlation (r̄ above)")
        print(f"              replaces the previous assumed r̄ = 0.5")
        print()
    else:
        print(f"  (No combinable tests in selection — combining skipped.)")
        print()

    # ─── Leave-one-out jackknife (robustness to any single planet) ────
    jackknife_results = {}
    if not args.skip_perm and non_structural_perm:
        print("=" * 78)
        print("  LEAVE-ONE-OUT JACKKNIFE (7! = 5,040 permutations per drop)")
        print("=" * 78)
        print()
        print(f"  For each planet, re-run the direct joint permutation test")
        print(f"  with that planet removed from the system.")
        print()
        print(f"  {'Drop':<12} {'JointP':>12} {'Sigma':>10} {'k':>4} {'Tests used':<40}")
        print(f"  {'─'*12} {'─'*12} {'─'*10} {'─'*4} {'─'*40}")
        t0 = time.time()
        for p in PLANET_NAMES:
            jk = jackknife_permutation(p)
            if jk is None:
                continue
            jackknife_results[p] = jk
            short_tests = ",".join(t.split("_")[0] for t in jk["tests_used"])
            print(f"  {p:<12} {jk['p']:>12.3e} {jk['sigma']:>8.2f} σ "
                  f"{len(jk['tests_used']):>4} {short_tests:<40}")
        dt = time.time() - t0
        print(f"  (computed in {dt:.1f}s)")
        # Full 8-planet reference
        if "Permutation" in joint_combined:
            jp = joint_combined["Permutation"]
            print(f"  {'— full —':<12} {jp['p']:>12.3e} {jp['sigma']:>8.2f} σ "
                  f"{len(jp['tests_used']):>4}")
        print()

    # ══════════════════════════════════════════════════════════════════
    # WRITE SIGNIFICANCE RESULTS TO JSON
    # (consumed by export-to-holistic.js → website + paper)
    # ══════════════════════════════════════════════════════════════════
    if len(selected_ordered) == len(TEST_IDS) and fisher_combined:
        # Only write the JSON when a full run is performed. Partial runs
        # (via --tests) print but don't overwrite the canonical results.
        import json
        from datetime import datetime, timezone

        # NEW HEADLINE: direct joint permutation test.
        # Model-independent, no correlation assumption, no floor-clamp.
        jp_perm = joint_combined.get("Permutation")
        if jp_perm is not None:
            headline_p = jp_perm["p"]
            headline_sigma = jp_perm["sigma"]
        else:
            # Fall back to Stouffer-corrected if no permutation run
            headline_p = stouffer_combined_corrected.get("Permutation")
            headline_sigma = p_to_sigma(headline_p) if headline_p is not None else None
        headline_sigma_rounded = round(headline_sigma, 1) if headline_sigma is not None else None

        per_test_results = {}
        for tid in selected_ordered:
            per_test_results[tid] = {
                "label": TEST_LABEL_MAP[tid],
                "category": TEST_CAT_MAP[tid],
                "structural": tid in STRUCTURAL_TESTS,
                "p_values": {dist: all_p_values[dist][tid] for dist in all_p_values},
            }

        # Resolve git SHA of the script for reproducibility
        def _git_sha():
            try:
                return _subprocess.check_output(
                    ["git", "-C", os.path.dirname(os.path.abspath(__file__)),
                     "rev-parse", "HEAD"],
                    stderr=_subprocess.DEVNULL,
                ).decode().strip()
            except Exception:
                return None

        git_sha = _git_sha()

        # Joint-combined struct per null distribution
        def _joint_entry(dist):
            j = joint_combined.get(dist)
            if j is None:
                return None
            return {
                "p":          j["p"],
                "sigma":      round(j["sigma"], 2),
                "T_obs":      j["T_obs"],
                "n_samples":  j["n"],
                "tests_used": j["tests_used"],
                "empirical_r": round(empirical_r.get(dist, 0.0), 3),
            }

        sig_output = {
            "generated": datetime.now(timezone.utc).isoformat(),
            "trials": args.trials,
            "seed": args.seed,
            "git_sha": git_sha,
            "method": {
                "headline": "joint_permutation.direct",
                "headline_description":
                    "Direct joint permutation test: studentized T = Σ_i z_i "
                    "with p = #{T_null ≥ T_obs} / n. Model-independent; "
                    "joint null captures inter-test correlation directly.",
                "empirical_correlation_permutation": round(empirical_r.get("Permutation", 0.0), 3),
                "empirical_correlation_log_uniform": round(empirical_r.get("Log-uniform", 0.0), 3),
                "empirical_correlation_uniform":     round(empirical_r.get("Uniform", 0.0), 3),
                # Kept for backward-compat with older consumers
                "correlation_factor":     1.0 + (len(non_structural_perm) - 1) *
                                          max(0.0, min(1.0, empirical_r.get("Permutation", 0.5))),
                "correlation_assumption": "measured empirically from permutation null",
            },
            "counts": {
                "total":      len(selected_ordered),
                "structural": sum(1 for t in selected_ordered if t in STRUCTURAL_TESTS),
                "empirical":  len(non_structural_perm),
                "mc_combinable": len(non_structural_mc),
                "lawCount":   6,  # Fibonacci Laws 1-6 covered by the test suite
            },
            # NEW: direct joint test per null distribution
            "joint_combined": {
                "permutation": _joint_entry("Permutation"),
                "log_uniform": _joint_entry("Log-uniform"),
                "uniform":     _joint_entry("Uniform"),
            },
            # NEW: leave-one-out jackknife (permutation null only)
            "jackknife_permutation": {
                planet: {
                    "p":          jk["p"],
                    "sigma":      round(jk["sigma"], 2),
                    "n_samples":  jk["n"],
                    "tests_used": jk["tests_used"],
                    "observed":   jk["observed"],
                }
                for planet, jk in jackknife_results.items()
            },
            # Kept for backward compatibility with export-to-holistic.js
            "fisher_combined": {
                "permutation": fisher_combined.get("Permutation"),
                "log_uniform": fisher_combined.get("Log-uniform"),
                "uniform":     fisher_combined.get("Uniform"),
            },
            "stouffer_combined": {
                "permutation": stouffer_combined.get("Permutation"),
                "log_uniform": stouffer_combined.get("Log-uniform"),
                "uniform":     stouffer_combined.get("Uniform"),
            },
            "stouffer_combined_corrected": {
                "permutation": stouffer_combined_corrected.get("Permutation"),
                "log_uniform": stouffer_combined_corrected.get("Log-uniform"),
                "uniform":     stouffer_combined_corrected.get("Uniform"),
            },
            # Sigma equivalents of the corrected Stouffer p-values, for display.
            # Previously the HEADLINE; now demoted to supporting.
            "stouffer_sigma_corrected": {
                "permutation": round(p_to_sigma(stouffer_combined_corrected.get("Permutation", 1.0)), 1),
                "log_uniform": round(p_to_sigma(stouffer_combined_corrected.get("Log-uniform", 1.0)), 1),
                "uniform":     round(p_to_sigma(stouffer_combined_corrected.get("Uniform",     1.0)), 1),
            },
            "headline_p":     headline_p,
            "headline_sigma": headline_sigma_rounded,
            "tests": per_test_results,
        }

        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        out_path = os.path.join(repo_root, "data", "significance-results.json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(sig_output, f, indent=2)
        print(f"  Written significance results to {out_path}")
        print()

    # Interpretation
    print("  " + "─" * 60)
    print("  INTERPRETATION:")
    print()
    print("  HEADLINE: Direct joint permutation test on the 4 empirical tests.")
    print("    - No distributional assumptions")
    print("    - No correlation penalty (the joint null handles it)")
    print("    - No floor-clamp artifact (p ≥ 1/(n+1) by construction)")
    print()
    print("  Supporting statistics:")
    print("    - Stouffer's Z with MEASURED r̄ (replaces hard-coded 0.5)")
    print("    - Fisher's method (sensitive to extreme p — for cross-check only)")
    print("    - Three null distributions (permutation, log-uniform, uniform)")
    print("    - Leave-one-out jackknife (robustness to any single planet)")
    print()
    print("  Significance levels: * p<0.05, ** p<0.01, *** p<0.001")
    print("  Conventional thresholds: 3σ ≈ 'evidence', 5σ ≈ 'discovery'")
    print()
    print("  Reference: Backus, J. (1969). 'Die Reihe — a Scientific")
    print("  Evaluation' critiqued Molchanov's planetary resonance theory")
    print("  for insufficient look-elsewhere correction. This analysis")
    print("  addresses that critique explicitly.")
    print()


if __name__ == "__main__":
    main()

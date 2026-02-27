#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI SIGNIFICANCE TEST — MONTE CARLO & PERMUTATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════
#
# Tests whether the Fibonacci ratios in planetary mass-weighted
# eccentricities and inclinations are statistically significant,
# or could arise by chance in random planetary systems.
#
# TWELVE TEST STATISTICS (matching the six Fibonacci Laws + six Findings):
#
#   Test 1  — Pairwise Fibonacci count (general):
#       How many planet pairs have ξ-ratios near a Fibonacci ratio?
#
#   Test 2  — Eccentricity Ladder (Finding 5):
#       Can 4 planets form a Fibonacci ladder e·√m = {a,b,c,d}×ξ_ref?
#
#   Test 3  — ψ-Constant best-3 (general search):
#       Can 3 planets satisfy d₁·i·√m ≈ d₂·i·√m ≈ d₃·i·√m with Fib weights?
#       NOTE: partially circular — uses model-derived INCLINATION_AMPS.
#
#   Test 4  — Cross-parameter ratio (general):
#       Does (Λ_ecc + Λ_amp) / Λ_mean match a Fibonacci ratio?
#       NOTE: partially circular — Λ_amp uses model-derived amplitudes.
#
#   Test 5  — Inclination Balance (Law 3):
#       With the model's Fibonacci d-values and phase groups, how well do the
#       angular-momentum-weighted structural weights cancel? Observed: 99.9998%.
#
#   Test 6  — Eccentricity Balance (Law 5):
#       With the model's d-values, how well do the eccentricity weights cancel
#       between the two phase groups? Observed: 99.88%.
#
#   Test 7  — Saturn Eccentricity Prediction (Finding 4):
#       The eccentricity balance predicts Saturn's eccentricity from the other 7
#       planets. Observed: 0.24% error.
#
#   Test 8  — ψ-Constant full 8-planet (Law 2):
#       How constant is d × η = d × i_amp × √m across ALL 8 planets?
#       Observed: <0.75% max error (0 free parameters).
#
#   Test 9  — Precession Fibonacci hierarchy (Law 1):
#       How many pairwise precession-period ratios match Fibonacci ratios?
#       Observed: 12/28 pairs match within 5%.
#
#   Test 10 — R² partition sums (Law 4):
#       For the 4 mirror pairs, how many R² pair sums match Fibonacci ratios?
#       Observed: 4/4 match within 5%.
#
#   Test 11 — E–J–S resonance loop (Law 6):
#       Do Earth, Jupiter, Saturn periods satisfy b_E + b_J = b_S?
#       Observed: exactly 3 + 5 = 8 (0% error).
#
#   Test 12 — Mirror symmetry (Finding 1):
#       Do the d-assignments show inner-outer mirror symmetry?
#       Observed: 4/4 mirror pairs share the same d.
#
# THREE RANDOM DISTRIBUTIONS:
#   1. Permutation (exhaustive 8! = 40,320) — fixes values, shuffles assignment
#   2. Log-uniform — random eccentricities/inclinations in realistic range
#   3. Uniform — flat random in same range
#
# Addresses the Backus (1969) critique of Molchanov's resonance theory:
# accounts for look-elsewhere effect and tests multiple null hypotheses.
#
# Run with: python fibonacci_significance.py [--trials N] [--seed S]
# ═══════════════════════════════════════════════════════════════════════════

import math
import itertools
import argparse
import time
from collections import defaultdict

from fibonacci_data import (
    PLANET_NAMES, MASSES, ECCENTRICITIES, INCLINATION_AMPS,
    D_INCL, PSI1_THEORY, SEMI_MAJOR, PHASE_GROUP, GROUP_203, GROUP_23,
    MIRROR_PAIRS, INCL_PERIOD, PERIOD_FRAC, H,
    INCL_J2000,
)

# NOTE: INCLINATION_AMPS (= INCL_AMP) now stores Fibonacci model PREDICTIONS
# (ψ/(d×√m)), not independently observed BvW amplitudes.  Tests 3 and 4
# that use INCLINATION_AMPS are therefore partially circular — the permutation
# test is still valid (shuffling masses breaks d_i × η_j ≠ ψ), but the
# observed statistics are artificially tight.  To restore genuine empirical
# tests, replace INCLINATION_AMPS with independently measured secular amplitudes.

# Mean inclinations (degrees, invariable plane oscillation midpoints)
INCL_MEANS = {
    "Mercury": 5.900, "Venus": 3.055, "Earth": 1.482, "Mars": 3.600,
    "Jupiter": 0.363, "Saturn": 0.941, "Uranus": 1.018, "Neptune": 0.670,
}

# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI RATIOS AND TOLERANCE
# ═══════════════════════════════════════════════════════════════════════════

# All distinct ratios a/b where a,b ∈ {1, 2, 3, 5, 8}
FIB_SET = [1, 2, 3, 5, 8]
FIB_RATIOS = sorted(set(a / b for a in FIB_SET for b in FIB_SET if a != b))
# = [0.125, 0.2, 0.25, 0.333, 0.375, 0.4, 0.6, 0.625, 0.667,
#    1.5, 1.6, 1.667, 2.0, 2.5, 2.667, 3.0, 4.0, 5.0, 8.0]

# Extended set including 13 and 21 — used for system-level tests (Tests 6-7)
# where the model predicts ratios like 13/3, 21, 5
FIB_SET_EXT = [1, 2, 3, 5, 8, 13, 21]
FIB_RATIOS_EXT = sorted(set(a / b for a in FIB_SET_EXT for b in FIB_SET_EXT if a != b))

# Tolerance for "near a Fibonacci ratio" — relative error
TOLERANCE = 0.05  # 5% relative tolerance (generous)

# Stricter tolerance for law-specific tests
STRICT_TOL = 0.03  # 3% for laws that claim ~1-2% accuracy


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


def best_fibonacci_error_ext(ratio):
    """Return the smallest relative error to any extended Fibonacci ratio.
    Uses {1,2,3,5,8,13,21} — more ratios to check (larger look-elsewhere),
    but captures system-level relations like 13/3 and 21."""
    return min(abs(ratio / fr - 1.0) for fr in FIB_RATIOS_EXT if fr > 0)


# ═══════════════════════════════════════════════════════════════════════════
# TEST STATISTICS
# ═══════════════════════════════════════════════════════════════════════════

def compute_xi(eccs, incls, sqrt_m):
    """Compute mass-weighted parameters for a set of planets."""
    xi_e = {p: eccs[p] * sqrt_m[p] for p in PLANET_NAMES}
    xi_i = {p: incls[p] * sqrt_m[p] for p in PLANET_NAMES}
    return xi_e, xi_i


def stat_pairwise_count(xi_e, xi_i, tol=TOLERANCE):
    """
    Test 1: Count how many pairwise ξ-ratios are near Fibonacci ratios.
    Tests both eccentricity and inclination.
    Total pairs: C(8,2) = 28 for ecc + 28 for incl = 56 tests.
    """
    count = 0
    for i, p1 in enumerate(PLANET_NAMES):
        for p2 in PLANET_NAMES[i+1:]:
            # Eccentricity ratio
            if xi_e[p2] > 0 and xi_e[p1] > 0:
                ratio = xi_e[p1] / xi_e[p2]
                if near_fibonacci(ratio, tol):
                    count += 1
            # Inclination ratio
            if xi_i[p2] > 0 and xi_i[p1] > 0:
                ratio = xi_i[p1] / xi_i[p2]
                if near_fibonacci(ratio, tol):
                    count += 1
    return count


def stat_ladder(xi_e, tol=STRICT_TOL):
    """
    Test 2 — Finding 5: Find the best 4-planet Fibonacci ladder in eccentricity.

    For each subset of 4 planets, try each as reference and check if the
    other 3 have ξ-ratios to the reference that are all Fibonacci ratios.

    Returns: (best_count, best_mean_error)
      best_count: max number of Fibonacci-matching ratios in any 4-planet subset
      best_mean_error: mean relative error for the best ladder
    """
    best_count = 0
    best_mean_err = 1.0

    for subset in itertools.combinations(PLANET_NAMES, 4):
        for ref in subset:
            xi_ref = xi_e[ref]
            if xi_ref <= 0:
                continue
            matches = 0
            errors = []
            for p in subset:
                if p == ref:
                    continue
                ratio = xi_e[p] / xi_ref
                err = best_fibonacci_error(ratio)
                errors.append(err)
                if err < tol:
                    matches += 1

            if matches > best_count or (matches == best_count and
                                         sum(errors) / len(errors) < best_mean_err):
                best_count = matches
                best_mean_err = sum(errors) / len(errors)

    return best_count, best_mean_err


def stat_psi_constant(xi_i, tol=STRICT_TOL):
    """
    Test 3 — General: Find best 3-planet ψ-constant (d × i × √m = const).

    For each subset of 3 planets, try all assignments of Fibonacci weights
    d ∈ {1, 2, 3, 5, 8} and measure how constant d × ξ_i is.

    Returns: best relative spread (max-min)/mean for any triplet+weights.
    """
    best_spread = 1.0
    fib_weights = [1, 2, 3, 5, 8]

    for subset in itertools.combinations(PLANET_NAMES, 3):
        xi_vals = [xi_i[p] for p in subset]
        if any(v <= 0 for v in xi_vals):
            continue

        # Try all ordered assignments of 3 distinct weights from fib_weights
        for weights in itertools.permutations(fib_weights, 3):
            psi_vals = [w * x for w, x in zip(weights, xi_vals)]
            mean_psi = sum(psi_vals) / 3
            if mean_psi <= 0:
                continue
            spread = (max(psi_vals) - min(psi_vals)) / mean_psi
            if spread < best_spread:
                best_spread = spread

    return best_spread




# Angular momentum weights W = m√a (precomputed, fixed for all tests)
W = {p: MASSES[p] * math.sqrt(SEMI_MAJOR[p]) for p in PLANET_NAMES}


def stat_cross_parameter(eccs, incl_means, incl_amps):
    """
    Test 4 — Cross-parameter ratio (Λ_ecc + Λ_amp) / Λ_mean.

    Links all three fundamental orbital parameters in one equation.
    The model claims this equals 5 = F₅ at 1.66%.

    NOTE: Partially circular — Λ_amp uses model-derived amplitudes.
    Look-elsewhere: we check against all extended Fibonacci ratios (~42).

    Returns: best relative error to any extended Fibonacci ratio.
    """
    le = sum(W[p] * eccs[p] for p in PLANET_NAMES)
    la = sum(W[p] * math.radians(incl_amps[p]) for p in PLANET_NAMES)
    lm = sum(W[p] * math.radians(incl_means[p]) for p in PLANET_NAMES)
    if lm <= 0:
        return 1.0
    ratio = (le + la) / lm
    return best_fibonacci_error_ext(ratio)


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
        group_a: list of planets in group A (203°)
        group_b: list of planets in group B (23°)

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

    Observed: 99.9998% with the model's d-values and phase groups.
    Null hypothesis: random Fibonacci d-assignments and random solo-planet
    phase splits cannot achieve this level of balance.

    Returns: balance percentage (higher = more balanced).
    """
    return compute_incl_balance(eccs, d_vals, group_a, group_b)


def stat_ecc_balance(eccs, d_vals, group_a, group_b):
    """
    Test 6 — Eccentricity Balance (Law 5).

    How well do the eccentricity-weighted quantities cancel between groups?

    Observed: 99.88% with the model's d-values and phase groups.

    Returns: balance percentage (higher = more balanced).
    """
    return compute_ecc_balance(eccs, d_vals, group_a, group_b)


def stat_saturn_prediction(eccs, d_vals, group_a, solo_planet):
    """
    Test 7 — Saturn Eccentricity Prediction (Finding 4).

    Since the solo retrograde planet carries the entire 23° contribution,
    the eccentricity balance directly predicts its eccentricity from the
    other seven planets.

    e_solo = sum_A(v_j) / (sqrt(m_solo) × a_solo^(3/2) / sqrt(d_solo))

    Observed: predicted e_Saturn = 0.05373, actual = 0.05386, error = 0.24%.

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


def stat_prec_hierarchy(prec_periods, tol=TOLERANCE):
    """
    Test 9 — Law 1: Fibonacci precession hierarchy.

    For 8 precession periods, count how many pairwise ratios match
    Fibonacci ratios (F_a/F_b where a,b ∈ {1,2,3,5,8,13,21,34}).

    Total pairs: C(8,2) = 28.

    Returns: count of matching pairs (higher = better).
    """
    count = 0
    periods = [prec_periods[p] for p in PLANET_NAMES]
    for i in range(len(periods)):
        for j in range(i + 1, len(periods)):
            if periods[i] > 0 and periods[j] > 0:
                ratio = periods[i] / periods[j]
                if best_fibonacci_error_ext(ratio) < tol:
                    count += 1
    return count


# Wide Fibonacci ratio set for R² partition test (needs 34, 55, 89, 377)
FIB_SET_WIDE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]
FIB_RATIOS_WIDE = sorted(set(a / b for a in FIB_SET_WIDE for b in FIB_SET_WIDE if a != b))


def best_fibonacci_error_wide(ratio):
    """Return the smallest relative error to any wide Fibonacci ratio."""
    return min(abs(ratio / fr - 1.0) for fr in FIB_RATIOS_WIDE if fr > 0)


def stat_r2_partition(eccs, incl_j2000, mirror_pairs, tol=TOLERANCE):
    """
    Test 10 — Law 4: R² partition sums.

    For each mirror pair, compute R²_A + R²_B where R = e / i_rad.
    Count how many pair sums match a Fibonacci ratio (a/b where a,b
    are Fibonacci numbers up to 377).

    Returns: count of matching pairs out of 4 (higher = better).
    """
    count = 0
    for inner, outer in mirror_pairs:
        i_inner = math.radians(incl_j2000.get(inner, 0))
        i_outer = math.radians(incl_j2000.get(outer, 0))
        if i_inner <= 0 or i_outer <= 0:
            continue
        r_inner = eccs.get(inner, 0) / i_inner
        r_outer = eccs.get(outer, 0) / i_outer
        r2_sum = r_inner**2 + r_outer**2
        if r2_sum > 0 and best_fibonacci_error_wide(r2_sum) < tol:
            count += 1
    return count


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


# ═══════════════════════════════════════════════════════════════════════════
# OBSERVED STATISTICS
# ═══════════════════════════════════════════════════════════════════════════

def compute_observed_stats():
    """Compute all 12 test statistics for the real solar system."""
    xi_e, xi_i = compute_xi(ECCENTRICITIES, INCLINATION_AMPS, SQRT_M)

    obs = {}
    obs["pairwise_count"] = stat_pairwise_count(xi_e, xi_i)
    obs["ladder_count"], obs["ladder_mean_err"] = stat_ladder(xi_e)
    obs["psi_spread"] = stat_psi_constant(xi_i)
    obs["cross_param"] = stat_cross_parameter(ECCENTRICITIES, INCL_MEANS, INCLINATION_AMPS)
    obs["incl_balance"] = stat_incl_balance(ECCENTRICITIES, D_INCL, GROUP_203, GROUP_23)
    obs["ecc_balance"] = stat_ecc_balance(ECCENTRICITIES, D_INCL, GROUP_203, GROUP_23)
    obs["saturn_pred"] = stat_saturn_prediction(ECCENTRICITIES, D_INCL, GROUP_203, "Saturn")
    # New tests 8–12
    obs["psi_full"] = stat_psi_full(INCL_J2000, D_INCL, SQRT_M)
    obs["prec_hierarchy"] = stat_prec_hierarchy(INCL_PERIOD)
    obs["r2_partition"] = stat_r2_partition(ECCENTRICITIES, INCL_J2000, MIRROR_PAIRS)
    obs["ejs_resonance"] = stat_ejs_resonance(PERIOD_FRAC)
    obs["mirror_symmetry"] = stat_mirror_symmetry(D_INCL, MIRROR_PAIRS)

    return obs


# ═══════════════════════════════════════════════════════════════════════════
# DISTRIBUTION 1: PERMUTATION TEST (EXHAUSTIVE)
# ═══════════════════════════════════════════════════════════════════════════

def permutation_test(observed):
    """
    Exhaustive permutation test: keep the same 8 eccentricity values,
    8 inclination amplitude values, and 8 mean inclination values,
    but randomly assign them to planets.

    This tests whether the ASSIGNMENT of values to specific masses matters,
    not whether the values themselves are special.

    8! = 40,320 permutations (exhaustive, no sampling needed).
    We use the SAME permutation for eccentricities, amplitudes, and means
    (conservative — independent permutations would be ~10^13).
    """
    print("  DISTRIBUTION 1: PERMUTATION TEST (8! = 40,320 trials)")
    print("  " + "─" * 60)

    ecc_vals = [ECCENTRICITIES[p] for p in PLANET_NAMES]
    incl_vals = [INCLINATION_AMPS[p] for p in PLANET_NAMES]
    mean_vals = [INCL_MEANS[p] for p in PLANET_NAMES]

    n_perms = math.factorial(8)  # 40,320
    incl_j2000_vals = [INCL_J2000[p] for p in PLANET_NAMES]
    prec_vals = [INCL_PERIOD[p] for p in PLANET_NAMES]

    counts = {"pairwise": 0, "ladder": 0, "psi": 0, "cross_param": 0,
              "incl_balance": 0, "ecc_balance": 0, "saturn_pred": 0,
              "psi_full": 0, "prec_hierarchy": 0, "r2_partition": 0,
              "ejs_resonance": 0, "mirror_symmetry": 0}

    for idx, perm in enumerate(itertools.permutations(range(8))):
        # Assign shuffled eccentricities, amplitudes, means, J2000 incl, prec periods
        eccs = {PLANET_NAMES[i]: ecc_vals[perm[i]] for i in range(8)}
        incls = {PLANET_NAMES[i]: incl_vals[perm[i]] for i in range(8)}
        means = {PLANET_NAMES[i]: mean_vals[perm[i]] for i in range(8)}
        ij2k = {PLANET_NAMES[i]: incl_j2000_vals[perm[i]] for i in range(8)}
        precs = {PLANET_NAMES[i]: prec_vals[perm[i]] for i in range(8)}

        xi_e, xi_i = compute_xi(eccs, incls, SQRT_M)

        # Test 1: Pairwise count
        pc = stat_pairwise_count(xi_e, xi_i)
        if pc >= observed["pairwise_count"]:
            counts["pairwise"] += 1

        # Test 2: Ladder
        lc, _ = stat_ladder(xi_e)
        if lc >= observed["ladder_count"]:
            counts["ladder"] += 1

        # Test 3: ψ-constant (3-planet)
        ps = stat_psi_constant(xi_i)
        if ps <= observed["psi_spread"]:
            counts["psi"] += 1

        # Test 4: Cross-parameter ratio
        cp = stat_cross_parameter(eccs, means, incls)
        if cp <= observed["cross_param"]:
            counts["cross_param"] += 1

        # Tests 5-7: Balance conditions (model d-values, shuffled eccentricities)
        ib = stat_incl_balance(eccs, D_INCL, GROUP_203, GROUP_23)
        if ib >= observed["incl_balance"]:
            counts["incl_balance"] += 1

        eb = stat_ecc_balance(eccs, D_INCL, GROUP_203, GROUP_23)
        if eb >= observed["ecc_balance"]:
            counts["ecc_balance"] += 1

        sp = stat_saturn_prediction(eccs, D_INCL, GROUP_203, "Saturn")
        if sp <= observed["saturn_pred"]:
            counts["saturn_pred"] += 1

        # Test 8: ψ full 8-planet (model d-values, shuffled J2000 inclinations)
        pf = stat_psi_full(ij2k, D_INCL, SQRT_M)
        if pf <= observed["psi_full"]:
            counts["psi_full"] += 1

        # Test 9: Precession hierarchy (shuffled periods)
        ph = stat_prec_hierarchy(precs)
        if ph >= observed["prec_hierarchy"]:
            counts["prec_hierarchy"] += 1

        # Test 10: R² partition (shuffled eccs + shuffled J2000 incl)
        rp = stat_r2_partition(eccs, ij2k, MIRROR_PAIRS)
        if rp >= observed["r2_partition"]:
            counts["r2_partition"] += 1

        # Tests 11-12: Not meaningful for permutation (structure is fixed)
        # E-J-S resonance and mirror symmetry depend on planet identity, not values
        # Count as always matching (conservative: p = 1.0)
        counts["ejs_resonance"] += 1
        counts["mirror_symmetry"] += 1

        if (idx + 1) % 10000 == 0:
            print(f"    ... {idx+1:,}/{n_perms:,} permutations done")

    p_values = {k: v / n_perms for k, v in counts.items()}
    return p_values, n_perms


# ═══════════════════════════════════════════════════════════════════════════
# DISTRIBUTION 2: LOG-UNIFORM MONTE CARLO
# ═══════════════════════════════════════════════════════════════════════════

def log_uniform_mc(observed, n_trials, rng):
    """
    Log-uniform Monte Carlo: draw random eccentricities, inclination
    amplitudes, and mean inclinations from log-uniform distributions.

    Eccentricities:      log-uniform in [0.005, 0.25]
    Incl. amplitudes:    log-uniform in [0.01, 3.0] degrees
    Mean inclinations:   log-uniform in [0.1, 10.0] degrees
    Masses: FIXED at solar system values (conservative).
    """
    print(f"  DISTRIBUTION 2: LOG-UNIFORM MONTE CARLO ({n_trials:,} trials)")
    print("  " + "─" * 60)

    log_e_lo, log_e_hi = math.log(0.005), math.log(0.25)
    log_i_lo, log_i_hi = math.log(0.01), math.log(3.0)
    log_m_lo, log_m_hi = math.log(0.1), math.log(10.0)

    # Precession period range (years) for MC
    log_prec_lo, log_prec_hi = math.log(30000), math.log(700000)

    counts = {"pairwise": 0, "ladder": 0, "psi": 0, "cross_param": 0,
              "incl_balance": 0, "ecc_balance": 0, "saturn_pred": 0,
              "psi_full": 0, "prec_hierarchy": 0, "r2_partition": 0,
              "ejs_resonance": 0, "mirror_symmetry": 0}

    for trial in range(n_trials):
        eccs = {}
        incls = {}
        means = {}
        ij2k = {}
        precs = {}
        for p in PLANET_NAMES:
            eccs[p] = math.exp(rng.uniform(log_e_lo, log_e_hi))
            incls[p] = math.exp(rng.uniform(log_i_lo, log_i_hi))
            means[p] = math.exp(rng.uniform(log_m_lo, log_m_hi))
            ij2k[p] = math.exp(rng.uniform(log_i_lo, log_i_hi))
            precs[p] = math.exp(rng.uniform(log_prec_lo, log_prec_hi))

        xi_e, xi_i = compute_xi(eccs, incls, SQRT_M)

        pc = stat_pairwise_count(xi_e, xi_i)
        if pc >= observed["pairwise_count"]:
            counts["pairwise"] += 1

        lc, _ = stat_ladder(xi_e)
        if lc >= observed["ladder_count"]:
            counts["ladder"] += 1

        ps = stat_psi_constant(xi_i)
        if ps <= observed["psi_spread"]:
            counts["psi"] += 1

        cp = stat_cross_parameter(eccs, means, incls)
        if cp <= observed["cross_param"]:
            counts["cross_param"] += 1

        # Tests 5-7: Random d-values and random solo planet
        d_rand = {p: rng.choice(FIB_D_POOL) for p in PLANET_NAMES}
        solo = PLANET_NAMES[rng.randint(0, 7)]
        grp_a = [p for p in PLANET_NAMES if p != solo]
        grp_b = [solo]

        ib = stat_incl_balance(eccs, d_rand, grp_a, grp_b)
        if ib >= observed["incl_balance"]:
            counts["incl_balance"] += 1

        eb = stat_ecc_balance(eccs, d_rand, grp_a, grp_b)
        if eb >= observed["ecc_balance"]:
            counts["ecc_balance"] += 1

        sp = stat_saturn_prediction(eccs, d_rand, grp_a, solo)
        if sp <= observed["saturn_pred"]:
            counts["saturn_pred"] += 1

        # Test 8: ψ full 8-planet (random d-values, random amplitudes)
        pf = stat_psi_full(ij2k, d_rand, SQRT_M)
        if pf <= observed["psi_full"]:
            counts["psi_full"] += 1

        # Test 9: Precession hierarchy (random periods)
        ph = stat_prec_hierarchy(precs)
        if ph >= observed["prec_hierarchy"]:
            counts["prec_hierarchy"] += 1

        # Test 10: R² partition (random eccs + random J2000 incl)
        rp = stat_r2_partition(eccs, ij2k, MIRROR_PAIRS)
        if rp >= observed["r2_partition"]:
            counts["r2_partition"] += 1

        # Test 11: E-J-S resonance — random period denominators
        fib_denoms = [1, 2, 3, 5, 8, 13, 21]
        rand_fracs = {p: (rng.randint(1, 8), rng.choice(fib_denoms)) for p in PLANET_NAMES}
        ej = stat_ejs_resonance(rand_fracs)
        if ej <= observed["ejs_resonance"]:
            counts["ejs_resonance"] += 1

        # Test 12: Mirror symmetry — random d-values, check if mirror pairs match
        ms = stat_mirror_symmetry(d_rand, MIRROR_PAIRS)
        if ms >= observed["mirror_symmetry"]:
            counts["mirror_symmetry"] += 1

        if (trial + 1) % 10000 == 0:
            print(f"    ... {trial+1:,}/{n_trials:,} trials done")

    p_values = {k: v / n_trials for k, v in counts.items()}
    return p_values, n_trials


# ═══════════════════════════════════════════════════════════════════════════
# DISTRIBUTION 3: UNIFORM MONTE CARLO
# ═══════════════════════════════════════════════════════════════════════════

def uniform_mc(observed, n_trials, rng):
    """
    Uniform Monte Carlo: draw random eccentricities, inclination
    amplitudes, and mean inclinations from uniform distributions.

    Eccentricities:      uniform in [0.005, 0.25]
    Incl. amplitudes:    uniform in [0.01, 3.0] degrees
    Mean inclinations:   uniform in [0.1, 10.0] degrees
    Masses: FIXED at solar system values (conservative).
    """
    print(f"  DISTRIBUTION 3: UNIFORM MONTE CARLO ({n_trials:,} trials)")
    print("  " + "─" * 60)

    counts = {"pairwise": 0, "ladder": 0, "psi": 0, "cross_param": 0,
              "incl_balance": 0, "ecc_balance": 0, "saturn_pred": 0,
              "psi_full": 0, "prec_hierarchy": 0, "r2_partition": 0,
              "ejs_resonance": 0, "mirror_symmetry": 0}

    for trial in range(n_trials):
        eccs = {}
        incls = {}
        means = {}
        ij2k = {}
        precs = {}
        for p in PLANET_NAMES:
            eccs[p] = rng.uniform(0.005, 0.25)
            incls[p] = rng.uniform(0.01, 3.0)
            means[p] = rng.uniform(0.1, 10.0)
            ij2k[p] = rng.uniform(0.01, 3.0)
            precs[p] = rng.uniform(30000, 700000)

        xi_e, xi_i = compute_xi(eccs, incls, SQRT_M)

        pc = stat_pairwise_count(xi_e, xi_i)
        if pc >= observed["pairwise_count"]:
            counts["pairwise"] += 1

        lc, _ = stat_ladder(xi_e)
        if lc >= observed["ladder_count"]:
            counts["ladder"] += 1

        ps = stat_psi_constant(xi_i)
        if ps <= observed["psi_spread"]:
            counts["psi"] += 1

        cp = stat_cross_parameter(eccs, means, incls)
        if cp <= observed["cross_param"]:
            counts["cross_param"] += 1

        # Tests 5-7: Random d-values and random solo planet
        d_rand = {p: rng.choice(FIB_D_POOL) for p in PLANET_NAMES}
        solo = PLANET_NAMES[rng.randint(0, 7)]
        grp_a = [p for p in PLANET_NAMES if p != solo]
        grp_b = [solo]

        ib = stat_incl_balance(eccs, d_rand, grp_a, grp_b)
        if ib >= observed["incl_balance"]:
            counts["incl_balance"] += 1

        eb = stat_ecc_balance(eccs, d_rand, grp_a, grp_b)
        if eb >= observed["ecc_balance"]:
            counts["ecc_balance"] += 1

        sp = stat_saturn_prediction(eccs, d_rand, grp_a, solo)
        if sp <= observed["saturn_pred"]:
            counts["saturn_pred"] += 1

        # Test 8: ψ full 8-planet
        pf = stat_psi_full(ij2k, d_rand, SQRT_M)
        if pf <= observed["psi_full"]:
            counts["psi_full"] += 1

        # Test 9: Precession hierarchy
        ph = stat_prec_hierarchy(precs)
        if ph >= observed["prec_hierarchy"]:
            counts["prec_hierarchy"] += 1

        # Test 10: R² partition
        rp = stat_r2_partition(eccs, ij2k, MIRROR_PAIRS)
        if rp >= observed["r2_partition"]:
            counts["r2_partition"] += 1

        # Test 11: E-J-S resonance
        fib_denoms = [1, 2, 3, 5, 8, 13, 21]
        rand_fracs = {p: (rng.randint(1, 8), rng.choice(fib_denoms)) for p in PLANET_NAMES}
        ej = stat_ejs_resonance(rand_fracs)
        if ej <= observed["ejs_resonance"]:
            counts["ejs_resonance"] += 1

        # Test 12: Mirror symmetry
        ms = stat_mirror_symmetry(d_rand, MIRROR_PAIRS)
        if ms >= observed["mirror_symmetry"]:
            counts["mirror_symmetry"] += 1

        if (trial + 1) % 10000 == 0:
            print(f"    ... {trial+1:,}/{n_trials:,} trials done")

    p_values = {k: v / n_trials for k, v in counts.items()}
    return p_values, n_trials


# ═══════════════════════════════════════════════════════════════════════════
# FISHER'S METHOD — COMBINE INDEPENDENT P-VALUES
# ═══════════════════════════════════════════════════════════════════════════

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
    print(f"  {'ψ theory':>16} = {PSI1_THEORY:.6e}  "
          f"(F₅×F₈²/(2H) = 2205/667776)")
    print(f"  {'Match':>16} = {abs(psi_obs/PSI1_THEORY-1)*100:.4f}%")
    print(f"  {'Spread':>16} = {spread*100:.4f}%")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# LOOK-ELSEWHERE EFFECT ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

def print_look_elsewhere():
    """Quantify the look-elsewhere effect for each test."""
    print("=" * 78)
    print("  LOOK-ELSEWHERE EFFECT ACCOUNTING")
    print("=" * 78)
    print()

    n_fib_ratios = len(FIB_RATIOS)
    n_pairs = 28  # C(8,2)
    n_pairwise_tests = 2 * n_pairs * n_fib_ratios

    n_4subsets = 70  # C(8,4)
    n_ladder_tests = n_4subsets * 4 * 3 * n_fib_ratios  # subsets × refs × others × ratios

    n_3subsets = 56  # C(8,3)
    n_weight_perms = 60  # P(5,3) = 5×4×3
    n_psi_tests = n_3subsets * n_weight_perms

    print(f"  Test 1 (Pairwise):   {n_pairwise_tests:>6,} implicit comparisons")
    print(f"    = {n_pairs} pairs × 2 properties × {n_fib_ratios} Fibonacci ratios")
    print()
    print(f"  Test 2 (Ladder):     {n_ladder_tests:>6,} implicit comparisons")
    print(f"    = {n_4subsets} subsets × 4 refs × 3 others × {n_fib_ratios} ratios")
    print()
    print(f"  Test 3 (ψ-constant): {n_psi_tests:>6,} implicit comparisons")
    print(f"    = {n_3subsets} subsets × {n_weight_perms} weight permutations")
    print()
    n_fib_ratios_ext = len(FIB_RATIOS_EXT)
    print(f"  Test 4 (Cross-param):{n_fib_ratios_ext:>6,} implicit comparisons")
    print(f"    = 1 ratio × {n_fib_ratios_ext} extended Fibonacci ratios (incl. 13, 21)")
    print(f"    (system-level sum — no subset/weight optimization)")
    print()
    n_d_configs = len(FIB_D_POOL)**8 * 8
    print(f"  Test 5 (Incl. bal.):       0 look-elsewhere (fixed d + phase)")
    print(f"    Perm: fixed model d-values, shuffled eccentricities")
    print(f"    MC: random d from {len(FIB_D_POOL)} choices × 8 planets × 8 solo choices")
    print()
    print(f"  Test 6 (Ecc. bal.):        0 look-elsewhere (fixed d + phase)")
    print(f"    Same null model as Test 5")
    print()
    print(f"  Test 7 (Saturn pred.):     0 look-elsewhere (fixed d + phase)")
    print(f"    Prediction from balance equation — no optimization")
    print()
    print("  NOTE: Tests 1-4 are accounted for automatically by the Monte Carlo approach,")
    print("  since each random trial computes the SAME optimized statistics.")
    print("  Tests 5-7 have zero look-elsewhere (fixed predictions, no optimization).")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Statistical significance test for Fibonacci laws of planetary motion")
    parser.add_argument("--trials", type=int, default=100_000,
                        help="Number of Monte Carlo trials per distribution (default: 100000)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--skip-mc", action="store_true",
                        help="Skip Monte Carlo (run only permutation test)")
    parser.add_argument("--skip-perm", action="store_true",
                        help="Skip permutation test (run only Monte Carlo)")
    args = parser.parse_args()

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
    print()

    # ─── Observed statistics ──────────────────────────────────────────
    print_observed_detail()
    print_look_elsewhere()

    print("=" * 78)
    print("  COMPUTING OBSERVED TEST STATISTICS")
    print("=" * 78)
    print()
    t0 = time.time()
    observed = compute_observed_stats()
    dt = time.time() - t0

    print(f"  Test 1  — Pairwise Fibonacci count:     {observed['pairwise_count']}")
    print(f"  Test 2  — Ladder (max matching):        {observed['ladder_count']} "
          f"(mean error: {observed['ladder_mean_err']*100:.2f}%)")
    print(f"  Test 3  — ψ-constant (min spread):      {observed['psi_spread']*100:.4f}%")
    print(f"  Test 4  — Cross-parameter (error):      {observed['cross_param']*100:.4f}%")
    print(f"  Test 5  — Incl. balance (Law 3):        {observed['incl_balance']:.4f}%")
    print(f"  Test 6  — Ecc. balance (Law 5):         {observed['ecc_balance']:.4f}%")
    print(f"  Test 7  — Saturn prediction (error):    {observed['saturn_pred']*100:.4f}%")
    print(f"  Test 8  — ψ full 8-planet (spread):     {observed['psi_full']*100:.4f}%")
    print(f"  Test 9  — Prec. hierarchy (pairs):      {observed['prec_hierarchy']}")
    print(f"  Test 10 — R² partition (matching):      {observed['r2_partition']}/4")
    print(f"  Test 11 — E–J–S resonance (error):     {observed['ejs_resonance']*100:.4f}%")
    print(f"  Test 12 — Mirror symmetry (matching):   {observed['mirror_symmetry']}/4")
    print(f"  (computed in {dt:.1f}s)")
    print()

    # ─── Significance tests ──────────────────────────────────────────
    all_p_values = {}

    if not args.skip_perm:
        print("=" * 78)
        t0 = time.time()
        p_perm, n_perm = permutation_test(observed)
        dt = time.time() - t0
        all_p_values["Permutation"] = p_perm

        print()
        print(f"  Results ({n_perm:,} permutations, {dt:.1f}s):")
        for test_name, p in p_perm.items():
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            p_str = f"< 1/{n_perm:,}" if p == 0 else f"{p:.6f}"
            print(f"    {test_name:<12} p = {p_str:<14} {sig}")
        print()

    if not args.skip_mc:
        print("=" * 78)
        t0 = time.time()
        p_log, n_log = log_uniform_mc(observed, args.trials, rng)
        dt = time.time() - t0
        all_p_values["Log-uniform"] = p_log

        print()
        print(f"  Results ({n_log:,} trials, {dt:.1f}s):")
        for test_name, p in p_log.items():
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            p_str = f"< 1/{n_log:,}" if p == 0 else f"{p:.6f}"
            print(f"    {test_name:<12} p = {p_str:<14} {sig}")
        print()

        print("=" * 78)
        t0 = time.time()
        p_uni, n_uni = uniform_mc(observed, args.trials, rng)
        dt = time.time() - t0
        all_p_values["Uniform"] = p_uni

        print()
        print(f"  Results ({n_uni:,} trials, {dt:.1f}s):")
        for test_name, p in p_uni.items():
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            p_str = f"< 1/{n_uni:,}" if p == 0 else f"{p:.6f}"
            print(f"    {test_name:<12} p = {p_str:<14} {sig}")
        print()

    # ─── Summary ──────────────────────────────────────────────────────
    print("=" * 78)
    print("  COMBINED SIGNIFICANCE SUMMARY")
    print("=" * 78)
    print()

    test_labels = ["pairwise", "ladder", "psi", "cross_param",
                    "incl_balance", "ecc_balance", "saturn_pred",
                    "psi_full", "prec_hierarchy", "r2_partition",
                    "ejs_resonance", "mirror_symmetry"]
    law_labels = {
        "pairwise":        "Pairwise Fibonacci count",
        "ladder":          "Finding 5 — Ecc. Ladder",
        "psi":             "ψ-Constant (3-planet)",
        "cross_param":     "Cross-parameter ratio",
        "incl_balance":    "Law 3 — Incl. Balance",
        "ecc_balance":     "Law 5 — Ecc. Balance",
        "saturn_pred":     "Finding 4 — Saturn e pred",
        "psi_full":        "Law 2 — ψ full 8-planet",
        "prec_hierarchy":  "Law 1 — Prec. hierarchy",
        "r2_partition":    "Law 4 — R² partition",
        "ejs_resonance":   "Law 6 — E–J–S resonance",
        "mirror_symmetry": "Finding 1 — Mirror symm.",
    }

    # Summary table
    header = f"  {'Test':<30}"
    for dist in all_p_values:
        header += f" {dist:>14}"
    print(header)
    print("  " + "─" * (30 + 15 * len(all_p_values)))

    for test in test_labels:
        row = f"  {law_labels[test]:<30}"
        for dist, pvals in all_p_values.items():
            p = pvals[test]
            if p == 0:
                row += f" {'< 0.00003':>14}"
            else:
                row += f" {p:>14.6f}"
        print(row)
    print()

    # Fisher's combined p-value per distribution
    print("  Fisher's combined p-values (all 12 tests):")
    for dist, pvals in all_p_values.items():
        p_list = [pvals[t] for t in test_labels]
        # Replace exact zeros with conservative bound
        n_total = 40320 if dist == "Permutation" else args.trials
        p_list = [max(p, 1.0 / n_total) for p in p_list]
        combined = fishers_method(p_list)
        sig = "***" if combined < 0.001 else "**" if combined < 0.01 else "*" if combined < 0.05 else ""
        print(f"    {dist:<14} p_combined = {combined:.2e}  {sig}")
    print()

    # Interpretation
    print("  " + "─" * 60)
    print("  INTERPRETATION:")
    print()
    print("  Significance levels: * p<0.05, ** p<0.01, *** p<0.001")
    print()
    print("  If p < 0.05 for ALL three distributions, the result is robust")
    print("  against the choice of null model.")
    print()
    print("  The permutation test is the most conservative (same values,")
    print("  different assignment). The MC tests are the most general")
    print("  (completely random planetary systems).")
    print()
    print("  Reference: Backus, J. (1969). 'Die Reihe — a Scientific")
    print("  Evaluation' critiqued Molchanov's planetary resonance theory")
    print("  for insufficient look-elsewhere correction. This analysis")
    print("  addresses that critique explicitly.")
    print()


if __name__ == "__main__":
    main()

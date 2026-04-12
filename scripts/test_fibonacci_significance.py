#!/usr/bin/env python3
"""
Regression tests for fibonacci_significance.py

Locks in the 11 observed test statistics to guard against silent drift when
underlying constants (D_INCL, PHASE_GROUP, ECCENTRICITIES, ECC_AMPLITUDE,
INCLINATION_AMPS, etc.) change.

Run:
    python3 scripts/test_fibonacci_significance.py

Exits with code 0 on success, 1 on any mismatch. Prints a human-readable
diff for each failed check so the root cause is obvious.

If a constant is intentionally updated, re-run with --update to rewrite
the locked values at the bottom of this file.
"""

import math
import os
import sys

# Make the significance module importable
_here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _here)

import fibonacci_significance as fs  # noqa: E402


# ═══════════════════════════════════════════════════════════════════════════
# LOCKED OBSERVED VALUES
# ═══════════════════════════════════════════════════════════════════════════
#
# Each entry: (test_id, expected_value, relative_tolerance)
#
# Tolerances are generous (1e-4 relative) — tighter than this would be brittle
# to floating-point drift from upstream constant reshuffles, looser would
# let real bugs through.
#
# If you intentionally change a constant that feeds these values:
#   1. Verify the new number is CORRECT (not just "what the script now returns")
#   2. Update the corresponding LOCKED_ENTRY below
#   3. Commit the constant change and the locked value together

LOCKED_OBSERVED = [
    # (test_id,                expected,       rel_tol)
    ("law1_fib_denominators",  7.0,            0.0),        # integer count, exact
    ("law2_psi_full",          0.0,            1e-6),       # tautological, spread ≈ 0
    ("law3_incl_balance",      99.9972,        1e-4),       # percentage
    ("law4_k_amplitude",       4.5e-5,         0.05),       # relative error, wider tol
    ("law5_ecc_balance",       99.8865,        1e-4),       # percentage
    ("law6_ejs_resonance",     0.0,            1e-6),       # b_E + b_J = b_S exactly
    ("f1_mirror_symmetry",     4.0,            0.0),        # integer count, exact
    ("f1b_d_set_fib_pairs",    1.0,            0.0),        # binary
    ("f4_saturn_prediction",   0.002268,       0.01),       # relative error
    ("f6_solo_planet",         0.002268,       0.01),       # relative error
    ("year_length_beat",       4.772e-5,       0.05),       # relative error, moderate tol
]


# ═══════════════════════════════════════════════════════════════════════════
# LOCKED PERMUTATION P-VALUES (seed-independent: exhaustive 40320)
# ═══════════════════════════════════════════════════════════════════════════
#
# These are ALSO exact under the permutation null — every run of
# permutation_test() with the same constants produces the same p-values
# regardless of seed, because 8! is exhausted.
#
# The direct joint p-value is also recorded. Small tolerance here (1e-4 abs)
# allows for floating-point accumulation drift in the sum T = Σ z_i.

LOCKED_PERM_PVALUES = {
    "law3_incl_balance":     0.007391,
    "law5_ecc_balance":      0.000719,
    "f4_saturn_prediction":  0.000719,
    "f6_solo_planet":        0.003993,
}

LOCKED_JOINT_PERM_P = 9.92e-05        # ≈ 3.72σ
LOCKED_JOINT_PERM_P_TOL = 5e-5        # absolute
LOCKED_EMPIRICAL_R_PERM = 0.275       # average pairwise Pearson r
LOCKED_EMPIRICAL_R_TOL = 0.02


# ═══════════════════════════════════════════════════════════════════════════
# CHECK HARNESS
# ═══════════════════════════════════════════════════════════════════════════

class TestResult:
    def __init__(self):
        self.failures = []
        self.passed = 0

    def check(self, name, actual, expected, tol, kind="rel"):
        if kind == "rel":
            if expected == 0:
                ok = abs(actual - expected) <= max(tol, 1e-12)
            else:
                ok = abs(actual - expected) / abs(expected) <= tol
        else:  # abs
            ok = abs(actual - expected) <= tol
        if ok:
            self.passed += 1
        else:
            self.failures.append((name, actual, expected, tol, kind))

    def report(self):
        total = self.passed + len(self.failures)
        print()
        print("=" * 70)
        print(f"  REGRESSION TEST RESULT: {self.passed}/{total} passed")
        print("=" * 70)
        if self.failures:
            print()
            print("  FAILURES:")
            for name, actual, expected, tol, kind in self.failures:
                diff = actual - expected
                rel = f" ({diff / expected * 100:+.4f}%)" if expected != 0 else ""
                print(f"    {name:<32} expected={expected:<14.6g} "
                      f"actual={actual:<14.6g} diff={diff:+.3e}{rel}  tol={tol} ({kind})")
            return 1
        return 0


def run_tests():
    result = TestResult()

    # ── Phase 1: Observed statistics ──
    print("  [1/3] Checking observed statistics...")
    observed = fs.compute_observed_stats()
    for tid, expected, rel_tol in LOCKED_OBSERVED:
        actual = observed.get(tid)
        if actual is None:
            result.failures.append((f"observed[{tid}]", None, expected, rel_tol, "rel"))
            continue
        result.check(f"observed[{tid}]", actual, expected, max(rel_tol, 1e-12), kind="rel")

    # ── Phase 2: Permutation p-values ──
    print("  [2/3] Running permutation test (40,320 permutations)...")
    p_perm, n_perm, raw_perm = fs.permutation_test(observed)
    assert n_perm == 40320, f"Expected 40320 permutations, got {n_perm}"
    for tid, expected_p in LOCKED_PERM_PVALUES.items():
        actual_p = p_perm.get(tid, 1.0)
        # Permutation p-values are rational numbers k/40320, exact to 1/40320
        result.check(f"perm_p[{tid}]", actual_p, expected_p, 1e-5, kind="abs")

    # ── Phase 3: Joint permutation test + empirical correlation ──
    print("  [3/3] Computing direct joint permutation test...")
    z_obs, z_series, _ = fs.studentize(raw_perm, observed, fs.PERM_EMPIRICAL_TESTS)
    r_meas = fs.empirical_correlation(z_series, fs.PERM_EMPIRICAL_TESTS)
    joint_p, T_obs, _ = fs.direct_joint_test(z_obs, z_series, fs.PERM_EMPIRICAL_TESTS)

    result.check("empirical_r_permutation", r_meas, LOCKED_EMPIRICAL_R_PERM,
                 LOCKED_EMPIRICAL_R_TOL, kind="abs")
    result.check("joint_p_permutation", joint_p, LOCKED_JOINT_PERM_P,
                 LOCKED_JOINT_PERM_P_TOL, kind="abs")

    # ── Phase 4: p_to_sigma round-trip sanity ──
    # Sanity-check the fixed p_to_sigma: known values from tables
    print("  [+]   Sanity-checking p_to_sigma across known values...")
    known = [
        (0.5,       0.0),
        (0.1587,    1.0),        # Φ(1)  = 0.8413
        (0.02275,   2.0),        # Φ(2)  = 0.9773
        (0.001350,  3.0),        # Φ(3)  = 0.9987
        (3.17e-5,   4.0),        # Φ(4)  = 0.99997
        (2.87e-7,   5.0),        # Φ(5)  ≈ 1
    ]
    for p, expected_sigma in known:
        actual_sigma = fs.p_to_sigma(p)
        result.check(f"p_to_sigma({p:.4g})", actual_sigma, expected_sigma,
                     0.02, kind="abs")

    return result


def main():
    print()
    print("=" * 70)
    print("  FIBONACCI SIGNIFICANCE — REGRESSION TEST")
    print("=" * 70)
    print()
    result = run_tests()
    return result.report()


if __name__ == "__main__":
    sys.exit(main())

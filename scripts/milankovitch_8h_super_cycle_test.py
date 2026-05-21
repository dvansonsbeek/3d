#!/usr/bin/env python3
"""
MILANKOVITCH 8H SUPER-CYCLE STATISTICAL TEST
==============================================

Tests the hypothesis that major Phanerozoic geological and climatic events
cluster preferentially near integer multiples of 8H = 2,682,536 years (the
Solar System Resonance Cycle), more often than random placement predicts.

Pre-registration
----------------

HYPOTHESIS (H1, one-sided):
  The median fractional residual of major event boundaries from the nearest
  integer multiple of 8H is LESS than the median residual expected from
  uniformly random placement.

NULL (H0):
  Event boundaries are placed uniformly at random in [0, 600 Myr], so the
  fractional residual from the nearest 8H integer is uniformly distributed
  on [0, 0.5].

TEST STATISTIC:
  median fractional residual of the 20 pre-registered events
  = median over events of  |t_event mod 8H| / (4 H)
  where the operation is computed against the nearest integer multiple
  (i.e., wrapped distance, max possible value 0.5 → 0).

PRE-REGISTERED EVENT LIST (locked before analysis):
  Tier 1 — Big Five mass extinctions (universally agreed biosphere resets):
    1. End-Ordovician                       443.1 Ma  (Silurian/Ord boundary)
    2. Late Devonian (Frasnian-Famennian)   371.1 Ma
    3. End-Permian                          251.902 Ma
    4. End-Triassic                         201.36 Ma  (Jurassic/Tri boundary)
    5. End-Cretaceous (K-Pg)                66.0 Ma

  Tier 2 — major Phanerozoic Period boundaries (GSSP-defined, ICS 2023):
    6. Phanerozoic start (Cambrian base)    538.8 Ma
    7. Ordovician/Cambrian                  486.85 Ma
    8. Devonian/Silurian                    419.62 Ma
    9. Carboniferous/Devonian               358.86 Ma
   10. Permian/Carboniferous                298.9 Ma
   11. Cretaceous/Jurassic                  145.0 Ma
   12. Neogene/Paleogene                    23.04 Ma
   13. Quaternary/Neogene                   2.58 Ma

  Tier 3 — major Cenozoic Epoch boundaries + climate transitions:
   14. Eocene/Paleocene                     56.0 Ma
   15. Oligocene/Eocene                     33.9 Ma   (EOT)
   16. Pliocene/Miocene                     5.333 Ma
   17. PETM (event, not boundary)           55.8 Ma
   18. MMCO peak                            15.0 Ma
   19. Late Miocene cooling onset           7.0 Ma
   20. iNHG (NH ice-sheet establishment)    2.7 Ma

NULL DISTRIBUTION:
  Place 20 boundaries uniformly at random in [0, 600 Myr]. Compute median
  fractional residual. Repeat N_TRIALS = 100,000 times. Build empirical
  null distribution of the test statistic.

VERDICT RULES (one-sided, pre-registered):
  p < 0.001  → strong evidence: 8H super-cycle structure is real;
               add to canonical docs
  0.001 ≤ p < 0.01 → suggestive: 8H structure beyond chance;
                     document as preliminary
  0.01 ≤ p < 0.05  → weak: alignment present but not strong;
                     do not document as claim
  p ≥ 0.05  → no evidence: alignment is consistent with chance;
              do not document

SENSITIVITY ANALYSES (also pre-registered):
  S1. Drop Quaternary/Neogene (2.58 Ma) — was identified by user; does the
      result survive removal?
  S2. Use mean instead of median fractional residual.
  S3. Test for "near hits" (within 1% of integer): count, compare to
      Poisson expectation.
  S4. Compare against alternative test periods (7H, 9H, 13H) — does the
      8H result hold specifically vs nearby integer-H values?

Notes
-----
* Dates from International Commission on Stratigraphy 2023 chronostratigraphic
  chart (https://stratigraphy.org/chart) where available; other dates from
  peer-reviewed primary sources cited inline.
* RNG seeded for reproducibility.
* Boundary list locked BEFORE running the test. Modifications to the list
  invalidate the pre-registration.

Run:  python3 scripts/milankovitch_8h_super_cycle_test.py
"""

import json
import time
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
OUT_PATH = DATA_DIR / "milankovitch-8h-super-cycle-test.json"

# Solar System Resonance Cycle
H = 335.317                # kyr
EIGHT_H = 8 * H            # = 2,682.536 kyr = 2.682536 Myr

# Time range over which null boundaries are placed (Phanerozoic ~600 Myr)
TEST_RANGE_MYR = (0.0, 600.0)

# Random null trials
N_TRIALS = 100_000
RNG_SEED = 20260520

# Pre-registered event list (locked)
EVENTS = [
    # Tier 1 — Big Five mass extinctions
    ("End-Ordovician extinction",     443.1,  "Tier 1", "Big Five"),
    ("Late Devonian (F-F) extinction", 371.1, "Tier 1", "Big Five"),
    ("End-Permian extinction",        251.902, "Tier 1", "Big Five"),
    ("End-Triassic extinction",       201.36, "Tier 1", "Big Five"),
    ("End-Cretaceous (K-Pg) extinction", 66.0, "Tier 1", "Big Five"),

    # Tier 2 — major Phanerozoic Period boundaries (ICS 2023)
    ("Cambrian base (Phanerozoic start)", 538.8, "Tier 2", "Period boundary"),
    ("Ordovician/Cambrian",            486.85, "Tier 2", "Period boundary"),
    ("Devonian/Silurian",              419.62, "Tier 2", "Period boundary"),
    ("Carboniferous/Devonian",         358.86, "Tier 2", "Period boundary"),
    ("Permian/Carboniferous",          298.9,  "Tier 2", "Period boundary"),
    ("Cretaceous/Jurassic",            145.0,  "Tier 2", "Period boundary"),
    ("Neogene/Paleogene",              23.04,  "Tier 2", "Period boundary"),
    ("Quaternary/Neogene",             2.58,   "Tier 2", "Period boundary (user-identified)"),

    # Tier 3 — major Cenozoic boundaries + climate transitions
    ("Eocene/Paleocene",               56.0,   "Tier 3", "Epoch boundary"),
    ("Oligocene/Eocene (EOT)",         33.9,   "Tier 3", "Epoch boundary + EOT"),
    ("Pliocene/Miocene",               5.333,  "Tier 3", "Epoch boundary (user-identified)"),
    ("PETM",                           55.8,   "Tier 3", "Climate event"),
    ("MMCO peak",                      15.0,   "Tier 3", "Climate event"),
    ("Late Miocene cooling onset",     7.0,    "Tier 3", "Climate event"),
    ("iNHG (NH ice-sheet est.)",       2.7,    "Tier 3", "Climate event"),
]


def fractional_residual(age_myr, period_myr=EIGHT_H / 1000.0):
    """Compute |age mod period| / (period/2). Returns value in [0, 1]
    where 0 = exact alignment with k×period for some integer k,
    1 = exactly between two integers (maximum residual).
    """
    age = float(age_myr)
    r = age % period_myr
    r_wrap = min(r, period_myr - r)  # distance to nearest integer multiple
    return r_wrap / (period_myr / 2.0)


def median_frac_residual(ages_myr, period_myr=EIGHT_H / 1000.0):
    return float(np.median([fractional_residual(a, period_myr) for a in ages_myr]))


def near_int_count(ages_myr, threshold=0.10, period_myr=EIGHT_H / 1000.0):
    """Count events with fractional residual below threshold (= within
    threshold × period/2 of an integer multiple)."""
    return sum(1 for a in ages_myr if fractional_residual(a, period_myr) < threshold)


def run_null(n_events, n_trials, period_myr, rng, range_myr=TEST_RANGE_MYR):
    """Generate null distribution by random uniform placement."""
    medians = np.zeros(n_trials)
    near_hits = np.zeros(n_trials, dtype=int)
    for i in range(n_trials):
        ages = rng.uniform(range_myr[0], range_myr[1], n_events)
        medians[i] = median_frac_residual(ages, period_myr)
        near_hits[i] = near_int_count(ages, 0.10, period_myr)
    return medians, near_hits


def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H SUPER-CYCLE STATISTICAL TEST (pre-registered)")
    print("=" * 78)
    print(f"  8H = {EIGHT_H} kyr = {EIGHT_H/1000:.6f} Myr")
    print(f"  Phanerozoic test range: {TEST_RANGE_MYR[0]}-{TEST_RANGE_MYR[1]} Myr")
    print(f"  Event count: {len(EVENTS)}")
    print(f"  N_TRIALS: {N_TRIALS:,}")
    print(f"  RNG seed: {RNG_SEED}")
    print()

    EIGHT_H_MYR = EIGHT_H / 1000.0

    # Per-event details
    print(f"  {'#':>3}  {'Event':<38}  {'Age (Ma)':>9}  {'k':>4}  {'k*8H':>8}  {'|Δ| (Myr)':>10}  {'frac.':>6}")
    print(f"  {'-'*3}  {'-'*38}  {'-'*9}  {'-'*4}  {'-'*8}  {'-'*10}  {'-'*6}")
    event_details = []
    ages = []
    for i, (name, age_myr, tier, kind) in enumerate(EVENTS):
        k = round(age_myr / EIGHT_H_MYR)
        k_age = k * EIGHT_H_MYR
        delta = age_myr - k_age
        frac = fractional_residual(age_myr, EIGHT_H_MYR)
        ages.append(age_myr)
        event_details.append({
            "n": i + 1, "name": name, "age_myr": age_myr,
            "tier": tier, "kind": kind, "k": k, "k_eight_h_myr": k_age,
            "delta_myr": delta, "fractional_residual": frac,
        })
        print(f"  {i+1:>3}  {name:<38}  {age_myr:>9.3f}  {k:>4d}  {k_age:>8.2f}  {abs(delta):>10.3f}  {frac:>6.3f}")

    # Observed test statistic
    obs_median = median_frac_residual(ages, EIGHT_H_MYR)
    obs_mean = float(np.mean([fractional_residual(a, EIGHT_H_MYR) for a in ages]))
    obs_near_hits = near_int_count(ages, 0.10, EIGHT_H_MYR)

    print()
    print(f"  Observed median fractional residual: {obs_median:.4f}")
    print(f"  Observed mean fractional residual:   {obs_mean:.4f}")
    print(f"  Events with fractional residual < 0.10 (within 5% of integer): {obs_near_hits}/{len(EVENTS)}")
    print(f"  Expected under uniform null: median ≈ 0.500, near-hits ≈ {0.10 * len(EVENTS):.1f}")

    # Null distribution
    print()
    print(f"  Generating null distribution ({N_TRIALS:,} trials)...")
    rng = np.random.default_rng(RNG_SEED)
    null_medians, null_near_hits = run_null(len(EVENTS), N_TRIALS, EIGHT_H_MYR, rng)

    # One-sided p-values
    p_median = float(np.mean(null_medians <= obs_median))
    p_near_hits = float(np.mean(null_near_hits >= obs_near_hits))

    print()
    print(f"  Primary test (median fractional residual):")
    print(f"    Observed:  {obs_median:.4f}")
    print(f"    Null median:   {np.median(null_medians):.4f}")
    print(f"    Null 5th pct:  {np.percentile(null_medians, 5):.4f}")
    print(f"    p (one-sided): {p_median:.5f}")

    print()
    print(f"  Secondary test (near-int hits, frac < 0.10):")
    print(f"    Observed: {obs_near_hits}/{len(EVENTS)}")
    print(f"    Null median:   {np.median(null_near_hits):.1f}")
    print(f"    Null 95th pct: {np.percentile(null_near_hits, 95):.0f}")
    print(f"    p (one-sided): {p_near_hits:.5f}")

    # Verdict
    if p_median < 0.001:
        verdict = "STRONG (p < 0.001): 8H super-cycle structure is statistically significant"
    elif p_median < 0.01:
        verdict = "SUGGESTIVE (p < 0.01): 8H alignment beyond chance, but moderate"
    elif p_median < 0.05:
        verdict = "WEAK (p < 0.05): alignment present but not strong enough to claim"
    else:
        verdict = "NULL (p ≥ 0.05): observed alignment is consistent with random placement"

    print()
    print(f"  VERDICT: {verdict}")

    # Sensitivity analyses
    print()
    print("=" * 78)
    print("SENSITIVITY ANALYSES")
    print("=" * 78)

    # S1: Drop user-identified events (Quaternary/Neogene = 2.58 Ma, Pliocene/Miocene = 5.333 Ma)
    user_identified = {"Quaternary/Neogene", "Pliocene/Miocene"}
    ages_no_user = [age for name, age, _, _ in EVENTS if name not in user_identified]
    obs_no_user = median_frac_residual(ages_no_user, EIGHT_H_MYR)
    null_medians_no_user, _ = run_null(len(ages_no_user), N_TRIALS, EIGHT_H_MYR,
                                        np.random.default_rng(RNG_SEED + 1))
    p_no_user = float(np.mean(null_medians_no_user <= obs_no_user))
    print(f"  S1. Drop user-identified events ({len(ages_no_user)} events): median = {obs_no_user:.4f}, p = {p_no_user:.5f}")

    # S2: Mean residual
    null_means, _ = run_null(len(EVENTS), N_TRIALS, EIGHT_H_MYR,
                              np.random.default_rng(RNG_SEED + 2))
    # Need to compute null means properly (we ran medians above)
    rng_alt = np.random.default_rng(RNG_SEED + 3)
    null_means_v2 = np.array([
        np.mean([fractional_residual(a, EIGHT_H_MYR)
                 for a in rng_alt.uniform(TEST_RANGE_MYR[0], TEST_RANGE_MYR[1], len(EVENTS))])
        for _ in range(N_TRIALS)
    ])
    p_mean = float(np.mean(null_means_v2 <= obs_mean))
    print(f"  S2. Mean fractional residual: observed = {obs_mean:.4f}, p = {p_mean:.5f}")

    # S3: Already computed (near-int hits)
    print(f"  S3. Near-int hits (frac < 0.10): {obs_near_hits}/{len(EVENTS)}, p = {p_near_hits:.5f}")

    # S4: Alternative test periods
    print(f"  S4. Alternative test periods (does 8H stand out vs nearby periods?):")
    print(f"      {'period (kyr)':>14}  {'period (Myr)':>13}  {'obs median':>11}  {'p (one-sided)':>14}")
    alt_periods_kyr = [
        ("7H = 7×335.317",      7 * H),
        ("8H = 8×335.317 (this model)", 8 * H),
        ("9H = 9×335.317",      9 * H),
        ("13H = 13×335.317",    13 * H),
        ("21H = 21×335.317",    21 * H),
        ("64H = 64×335.317",    64 * H),
        ("100×H",               100 * H),
    ]
    alt_results = []
    for label, period_kyr in alt_periods_kyr:
        period_myr = period_kyr / 1000.0
        obs_med = median_frac_residual(ages, period_myr)
        rng_a = np.random.default_rng(RNG_SEED + hash(label) % 1000)
        nulls = np.array([
            median_frac_residual(rng_a.uniform(TEST_RANGE_MYR[0], TEST_RANGE_MYR[1], len(EVENTS)), period_myr)
            for _ in range(N_TRIALS // 10)  # fewer trials for sensitivity
        ])
        p_alt = float(np.mean(nulls <= obs_med))
        alt_results.append({"label": label, "period_kyr": period_kyr,
                            "obs_median": obs_med, "p_one_sided": p_alt})
        marker = " ★" if abs(period_kyr - 8 * H) < 0.01 else ""
        print(f"      {label:<14}  {period_myr:>13.4f}  {obs_med:>11.4f}  {p_alt:>14.5f}{marker}")

    runtime = time.time() - t0
    print()
    print(f"[runtime] {runtime:.1f} seconds")

    # Save full results
    result = {
        "meta": {
            "script": "milankovitch_8h_super_cycle_test.py",
            "H_kyr": H,
            "eight_H_kyr": EIGHT_H,
            "test_range_myr": list(TEST_RANGE_MYR),
            "n_events": len(EVENTS),
            "n_trials": N_TRIALS,
            "rng_seed": RNG_SEED,
            "pre_registered": True,
        },
        "events": event_details,
        "primary_test": {
            "observed_median_fractional_residual": obs_median,
            "null_median": float(np.median(null_medians)),
            "null_5th_pct": float(np.percentile(null_medians, 5)),
            "p_one_sided": p_median,
        },
        "secondary_test_near_int_hits": {
            "observed": obs_near_hits,
            "null_median": float(np.median(null_near_hits)),
            "null_95th_pct": float(np.percentile(null_near_hits, 95)),
            "p_one_sided": p_near_hits,
        },
        "verdict": verdict,
        "sensitivity_analyses": {
            "S1_drop_user_identified": {
                "n_events": len(ages_no_user),
                "observed_median": obs_no_user,
                "p_one_sided": p_no_user,
            },
            "S2_mean_residual": {
                "observed_mean": obs_mean,
                "p_one_sided": p_mean,
            },
            "S3_near_int_hits": {
                "observed": obs_near_hits,
                "p_one_sided": p_near_hits,
            },
            "S4_alternative_periods": alt_results,
        },
        "runtime_seconds": runtime,
    }

    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\n[saved] {OUT_PATH}")


if __name__ == "__main__":
    main()

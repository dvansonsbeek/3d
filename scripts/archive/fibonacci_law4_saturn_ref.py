#!/usr/bin/env python3
"""
LAW 4: ECCENTRICITY PREDICTIONS — COMPARING REFERENCE CHOICES
===============================================================

Three scenarios:
  A) e_E = 0.015321 as reference (1 free parameter)
  B) e_Saturn from Law 3 (Finding 4) as reference (0 free parameters!)
  C) Law 4 alone — pure Fibonacci constraints (0 free parameters)

Key question: scenario B and C both have zero free parameters — which is better?
"""

import math
import sys
sys.path.insert(0, '.')
from fibonacci_data import *

print("=" * 78)
print("LAW 4: COMPARING REFERENCE CHOICES")
print("=" * 78)

# Mean inclinations from Law 1
mean_incl_rad = {}
for p in PLANET_NAMES:
    mean_incl_rad[p] = math.radians(compute_mean_inclination(p))

# Fibonacci pair constraints
# R² sums
R2_SUMS = {
    ("Mars", "Jupiter"):    377/5,
    ("Earth", "Saturn"):    34/3,
    ("Venus", "Neptune"):   1/2,
    ("Mercury", "Uranus"):  21/2,
}

# Second constraints
C2 = {
    ("Mars", "Jupiter"):    ("product", 34/2),
    ("Earth", "Saturn"):    ("product", 2/1),
    ("Venus", "Neptune"):   ("ratio", 2/8),
    ("Mercury", "Uranus"):  ("ratio", 2/3),
}

def solve_pair_from_constraints(pair):
    """Solve a pair using both Fibonacci constraints (no external reference)."""
    inner, outer = pair
    S = R2_SUMS[pair]
    c2type, c2val = C2[pair]

    if c2type == "product":
        P = c2val
        disc = S**2 - 4*P**2
        u1 = (S + math.sqrt(disc)) / 2
        u2 = (S - math.sqrt(disc)) / 2
        r_large = math.sqrt(u1)
        r_small = math.sqrt(u2)
        # Inner gets smaller root
        return r_small, r_large
    else:  # ratio: R_inner/R_outer = Q
        Q = c2val
        rb2 = S / (1 + Q**2)
        ra2 = Q**2 * rb2
        return math.sqrt(ra2), math.sqrt(rb2)


def solve_pair_from_one_known(pair, known_planet, known_e):
    """Solve a pair given one planet's eccentricity, using R² sum."""
    inner, outer = pair
    S = R2_SUMS[pair]
    R_known = known_e / mean_incl_rad[known_planet]

    R2_other = S - R_known**2
    if R2_other < 0:
        return None, None
    R_other = math.sqrt(R2_other)

    if known_planet == inner:
        return R_known, R_other
    else:
        return R_other, R_known


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO A: e_E = 0.015321 as reference
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SCENARIO A: e_E = 0.015321 as reference (1 free parameter)")
print("─" * 78)

pred_A = {}
pred_A["Earth"] = EARTH_BASE_ECCENTRICITY

# Earth/Saturn: use R² sum with known R_E
R_E_a, R_S_a = solve_pair_from_one_known(("Earth", "Saturn"), "Earth", pred_A["Earth"])
pred_A["Saturn"] = R_S_a * mean_incl_rad["Saturn"]

# Other pairs: self-contained
for pair in [("Mars", "Jupiter"), ("Venus", "Neptune"), ("Mercury", "Uranus")]:
    inner, outer = pair
    R_in, R_out = solve_pair_from_constraints(pair)
    pred_A[inner] = R_in * mean_incl_rad[inner]
    pred_A[outer] = R_out * mean_incl_rad[outer]

print(f"\n{'Planet':>10}  {'Predicted':>12}  {'Observed':>12}  {'Error':>8}")
print("─" * 48)
for p in PLANET_NAMES:
    e_obs = ECC[p]
    if p == "Earth":
        print(f"{p:>10}  {pred_A[p]:12.6f}  {e_obs:12.6f}     ref")
    else:
        err = (pred_A[p] - e_obs) / e_obs * 100
        print(f"{p:>10}  {pred_A[p]:12.6f}  {e_obs:12.6f}  {err:+6.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO B: Saturn from Law 3 as reference (0 free parameters)
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SCENARIO B: Saturn from Law 3 as reference (0 free parameters)")
print("─" * 78)

# Law 3 Saturn prediction
sum_203 = sum(eccentricity_weight(p) for p in GROUP_203)
coeff_S = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
e_S_law3 = sum_203 / coeff_S
print(f"\n  Law 3 predicts e_Saturn = {e_S_law3:.6f} (actual {ECC['Saturn']:.6f}, err {(e_S_law3-ECC['Saturn'])/ECC['Saturn']*100:+.2f}%)")

pred_B = {}
pred_B["Saturn"] = e_S_law3

# Earth/Saturn: use R² sum with known R_S (from Law 3)
R_E_b, R_S_b = solve_pair_from_one_known(("Earth", "Saturn"), "Saturn", pred_B["Saturn"])
pred_B["Earth"] = R_E_b * mean_incl_rad["Earth"]
print(f"  → Predicted e_Earth = {pred_B['Earth']:.6f} (actual {ECC['Earth']:.6f}, err {(pred_B['Earth']-ECC['Earth'])/ECC['Earth']*100:+.2f}%)")

# Other pairs: self-contained (same as A)
for pair in [("Mars", "Jupiter"), ("Venus", "Neptune"), ("Mercury", "Uranus")]:
    inner, outer = pair
    R_in, R_out = solve_pair_from_constraints(pair)
    pred_B[inner] = R_in * mean_incl_rad[inner]
    pred_B[outer] = R_out * mean_incl_rad[outer]

print(f"\n{'Planet':>10}  {'Predicted':>12}  {'Observed':>12}  {'Error':>8}  {'Source':>30}")
print("─" * 80)
for p in PLANET_NAMES:
    e_obs = ECC[p]
    err = (pred_B[p] - e_obs) / e_obs * 100
    if p == "Saturn":
        source = "Law 3 (Finding 4)"
    elif p == "Earth":
        source = "R² sum from Saturn"
    elif p in ["Mars", "Jupiter"]:
        source = "product (Mars/Jupiter)"
    elif p in ["Venus", "Neptune"]:
        source = "ratio (Venus/Neptune)"
    else:
        source = "ratio (Mercury/Uranus)"
    print(f"{p:>10}  {pred_B[p]:12.6f}  {e_obs:12.6f}  {err:+6.2f}%  {source:>30}")

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO C: Pure Law 4 (0 free parameters)
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SCENARIO C: Pure Law 4 — all 8 from Fibonacci constraints (0 free parameters)")
print("─" * 78)

pred_C = {}
for pair in MIRROR_PAIRS:
    inner, outer = pair
    R_in, R_out = solve_pair_from_constraints(pair)
    pred_C[inner] = R_in * mean_incl_rad[inner]
    pred_C[outer] = R_out * mean_incl_rad[outer]

print(f"\n{'Planet':>10}  {'Predicted':>12}  {'Observed':>12}  {'Error':>8}  {'Source':>30}")
print("─" * 80)
for p in PLANET_NAMES:
    e_obs = ECC[p]
    err = (pred_C[p] - e_obs) / e_obs * 100
    if p in ["Mars", "Jupiter"]:
        source = "product (Mars/Jupiter)"
    elif p in ["Earth", "Saturn"]:
        source = "product (Earth/Saturn)"
    elif p in ["Venus", "Neptune"]:
        source = "ratio (Venus/Neptune)"
    else:
        source = "ratio (Mercury/Uranus)"
    print(f"{p:>10}  {pred_C[p]:12.6f}  {e_obs:12.6f}  {err:+6.2f}%  {source:>30}")

# Law 3 cross-check for scenario C
print(f"\n  Law 3 cross-check with predicted eccentricities:")
sum_203_C = 0
for p in GROUP_203:
    v = math.sqrt(MASS[p]) * SMA[p]**1.5 * pred_C[p] / math.sqrt(D[p])
    sum_203_C += v
v_S_C = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 * pred_C["Saturn"] / math.sqrt(D["Saturn"])
balance_C = (1 - abs(sum_203_C - v_S_C) / (sum_203_C + v_S_C)) * 100
print(f"  Balance with predicted eccentricities: {balance_C:.4f}%")
print(f"  (Actual eccentricities give: 99.8779%)")

# ─────────────────────────────────────────────────────────────────────────────
# COMPARISON TABLE
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 78)
print("COMPARISON: ALL THREE SCENARIOS")
print("=" * 78)

print(f"\n{'Planet':>10}  {'A (e_E ref)':>12}  {'B (Saturn ref)':>14}  {'C (pure L4)':>12}  {'Observed':>12}")
print("─" * 66)
for p in PLANET_NAMES:
    print(f"{p:>10}  {pred_A[p]:12.6f}  {pred_B[p]:14.6f}  {pred_C[p]:12.6f}  {ECC[p]:12.6f}")

print(f"\n{'Planet':>10}  {'A error':>10}  {'B error':>10}  {'C error':>10}")
print("─" * 44)
max_err = {'A': 0, 'B': 0, 'C': 0}
for p in PLANET_NAMES:
    err_A = (pred_A[p] - ECC[p]) / ECC[p] * 100
    err_B = (pred_B[p] - ECC[p]) / ECC[p] * 100
    err_C = (pred_C[p] - ECC[p]) / ECC[p] * 100
    max_err['A'] = max(max_err['A'], abs(err_A))
    max_err['B'] = max(max_err['B'], abs(err_B))
    max_err['C'] = max(max_err['C'], abs(err_C))
    print(f"{p:>10}  {err_A:+8.2f}%  {err_B:+8.2f}%  {err_C:+8.2f}%")

print(f"\n  Max |error|:  A={max_err['A']:.2f}%   B={max_err['B']:.2f}%   C={max_err['C']:.2f}%")
print(f"  Free params:  A=1 (e_E)  B=0 (Law 3)  C=0 (pure)")

print("\n" + "=" * 78)
print("COMPLETE")
print("=" * 78)

#!/usr/bin/env python3
"""
DIRECTION 2: Derive eccentricity quantization from balance equations
====================================================================

Test whether the R² pair constraints (Law 4) are consequences
of Laws 2-5 combined with mirror symmetry, or independent empirical facts.

Key questions:
1. How many degrees of freedom remain after Law 5 balance?
2. Does balance + mirror symmetry + Law 2 constrain R values to Fibonacci?
3. Do random eccentricities satisfying Law 5 produce Fibonacci R² sums?
"""

import sys
import os
import math
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

print("=" * 78)
print("DIRECTION 2: DERIVE FROM BALANCE EQUATIONS")
print("=" * 78)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: DEGREES OF FREEDOM ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 1: Degrees of freedom analysis")
print("─" * 78)

print("""
Unknowns: 8 eccentricities (one per planet)

Constraints from existing laws:
  Law 2 (inclination constant): determines 8 amplitudes → 0 constraints on e
  Law 3 (inclination balance):  automatic from Law 2 → 0 constraints on e
  Law 5 (eccentricity balance): 1 equation (sum_203 = sum_23)

Mirror symmetry:
  d_inner = d_outer for each pair → does this constrain e?
  NO: mirror symmetry fixes d values, not eccentricities.

So: 8 unknowns, 1 equation → 7 degrees of freedom

The R² pair constraints add 8 equations (2 per 4 pairs).
These CANNOT all follow from Law 5 alone (1 eq ≠ 9 eq).

Question: do ANY of the R² constraints follow from Law 5?
""")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: ALGEBRAIC ANALYSIS — Law 5 + R substitution
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 2: Algebraic substitution — e = R × i_mean_rad in Law 5")
print("─" * 78)

# Mean inclinations from Law 2
INCL_MEAN = {p: compute_mean_inclination(p) for p in PLANET_NAMES}

# Eccentricity balance weight: v_j = √m × a^(3/2) × e / √d
# Substitute e_j = R_j × i_mean_rad_j:
# v_j = √m_j × a_j^(3/2) × R_j × i_mean_rad_j / √d_j
#     = R_j × [√m_j × a_j^(3/2) × i_mean_rad_j / √d_j]
#     = R_j × C_j
# where C_j is fully determined by known quantities

C = {}
for p in PLANET_NAMES:
    C[p] = math.sqrt(MASS[p]) * SMA[p]**1.5 * math.radians(INCL_MEAN[p]) / math.sqrt(D[p])

print("\nCoefficients C_j = √m × a^(3/2) × i_mean_rad / √d:")
for p in PLANET_NAMES:
    print(f"  {p:10s}: C = {C[p]:.6e}")

print("\nLaw 5 balance in terms of R:")
print("  Σ(203°) R_j × C_j = Σ(23°) R_j × C_j")
print("  = R_Saturn × C_Saturn")
print()

sum_203_C = sum(C[p] for p in GROUP_203)
C_Saturn = C["Saturn"]

print(f"  Σ C_j (203°) = {sum_203_C:.6e}")
print(f"  C_Saturn      = {C_Saturn:.6e}")
print(f"  Ratio = {sum_203_C / C_Saturn:.4f}")

# The balance equation is:
# R_Me*C_Me + R_Ve*C_Ve + R_Ea*C_Ea + R_Ma*C_Ma + R_Ju*C_Ju + R_Ur*C_Ur + R_Ne*C_Ne = R_Sa*C_Sa
R_VAL = {}
for p in PLANET_NAMES:
    i_rad = math.radians(INCL_MEAN[p])
    R_VAL[p] = ECC[p] / i_rad

print("\nActual R values and C×R = v contributions:")
print(f"{'Planet':>10} {'R':>8} {'C':>12} {'R×C (=v_j)':>12} {'% of group':>10}")
sum_203_v = sum(R_VAL[p] * C[p] for p in GROUP_203)
for p in GROUP_203:
    v = R_VAL[p] * C[p]
    pct = v / sum_203_v * 100
    print(f"  {p:>10} {R_VAL[p]:>8.4f} {C[p]:>12.6e} {v:>12.6e} {pct:>9.2f}%")
print(f"  {'SUM 203°':>10} {'':>8} {'':>12} {sum_203_v:>12.6e}")
print(f"  {'Saturn':>10} {R_VAL['Saturn']:>8.4f} {C['Saturn']:>12.6e} {R_VAL['Saturn']*C['Saturn']:>12.6e}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: WHICH PLANETS DOMINATE?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 3: Sensitivity analysis — which R values matter most?")
print("─" * 78)

print("\nRelative weight of each planet's C coefficient:")
total_C = sum(abs(C[p]) for p in PLANET_NAMES)
for p in PLANET_NAMES:
    print(f"  {p:10s}: C = {C[p]:.6e} ({abs(C[p])/total_C*100:.2f}% of total)")

print("\nJupiter and Saturn dominate. The 4 inner planets contribute:")
inner_C = sum(C[p] for p in ["Mercury", "Venus", "Earth", "Mars"])
print(f"  Inner C sum = {inner_C:.6e} = {inner_C/sum_203_C*100:.2f}% of 203° sum")
print(f"  This means: inner planet eccentricities are WEAKLY constrained by Law 5")
print(f"  The balance is primarily Jupiter+Uranus+Neptune vs Saturn")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: MONTE CARLO — Random e satisfying Law 5
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 4: Monte Carlo — do random eccentricities satisfying Law 5")
print("         produce Fibonacci R² pair sums?")
print("─" * 78)

# Strategy: fix 7 eccentricities randomly, solve for Saturn e from balance
# Then check R² pair sums

N_TRIALS = 50000
targets = {
    ("Mars", "Jupiter"): 377/5,
    ("Earth", "Saturn"): 34/3,
    ("Mercury", "Uranus"): 21/2,
    ("Venus", "Neptune"): 1/2,
}

# Track how often R² sums land near Fibonacci targets
near_count = {pair: 0 for pair in MIRROR_PAIRS}
all_R2_sums = {pair: [] for pair in MIRROR_PAIRS}

valid_trials = 0

for trial in range(N_TRIALS):
    # Generate random eccentricities for 7 planets (not Saturn)
    # Use realistic ranges: log-uniform in [0.005, 0.25]
    e_rand = {}
    for p in PLANET_NAMES:
        if p == "Saturn":
            continue
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.25)))

    # Solve for Saturn e from Law 5 balance
    sum_203 = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * e_rand[p] / math.sqrt(D[p])
                  for p in GROUP_203)
    coeff_Sa = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
    e_Sa = sum_203 / coeff_Sa

    if e_Sa < 0 or e_Sa > 0.5:
        continue

    e_rand["Saturn"] = e_Sa
    valid_trials += 1

    # Compute R² pair sums
    for pair in MIRROR_PAIRS:
        inner, outer = pair
        R_in = e_rand[inner] / math.radians(INCL_MEAN[inner])
        R_out = e_rand[outer] / math.radians(INCL_MEAN[outer])
        R2_sum = R_in**2 + R_out**2
        all_R2_sums[pair].append(R2_sum)

        target = targets[pair]
        if abs(R2_sum / target - 1) < 0.05:  # within 5%
            near_count[pair] += 1

print(f"\n{valid_trials} valid trials (Saturn e in [0, 0.5])")
print(f"\nHow often do R² pair sums land within 5% of Fibonacci targets?\n")
print(f"{'Pair':<22} {'Target':>8} {'Near%':>8} {'Mean':>10} {'Std':>10} {'Min':>10} {'Max':>10}")
print("─" * 78)

for pair in MIRROR_PAIRS:
    inner, outer = pair
    target = targets[pair]
    pct = near_count[pair] / valid_trials * 100 if valid_trials > 0 else 0
    vals = all_R2_sums[pair]
    mean_v = sum(vals) / len(vals) if vals else 0
    std_v = (sum((v - mean_v)**2 for v in vals) / len(vals))**0.5 if vals else 0
    min_v = min(vals) if vals else 0
    max_v = max(vals) if vals else 0
    print(f"  {inner}/{outer:<14s} {target:>8.3f} {pct:>7.2f}% {mean_v:>10.2f} {std_v:>10.2f} {min_v:>10.2f} {max_v:>10.2f}")

# Test all 4 pairs simultaneously near targets
all_near = 0
for trial_idx in range(min(valid_trials, len(all_R2_sums[MIRROR_PAIRS[0]]))):
    all_match = True
    for pair in MIRROR_PAIRS:
        target = targets[pair]
        val = all_R2_sums[pair][trial_idx]
        if abs(val / target - 1) > 0.05:
            all_match = False
            break
    if all_match:
        all_near += 1

print(f"\nAll 4 pairs within 5% simultaneously: {all_near}/{valid_trials} = {all_near/valid_trials*100:.4f}%")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: CONSTRAINED MONTE CARLO — Fix inner ladder, vary outer
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 5: Constrained MC — fix inner ladder (Finding 6), vary outer")
print("─" * 78)

# Inner planets: ξ_V : ξ_E : ξ_Ma : ξ_Me = 1 : 5/2 : 5 : 8
# Free parameter: ξ_V (or e_E)
# Then 4 outer planets have 4 unknowns, 1 balance equation → 3 DOF

N_TRIALS2 = 100000
near_count2 = {pair: 0 for pair in MIRROR_PAIRS}
all_R2_sums2 = {pair: [] for pair in MIRROR_PAIRS}
valid2 = 0

xi_V_actual = XI["Venus"]

for trial in range(N_TRIALS2):
    # Vary ξ_V around actual value (±50%)
    xi_V_rand = xi_V_actual * math.exp(random.uniform(-0.5, 0.5))

    # Inner planet eccentricities from ladder
    e_rand = {}
    e_rand["Venus"] = xi_V_rand / SQRT_M["Venus"]
    e_rand["Earth"] = (5/2) * xi_V_rand / SQRT_M["Earth"]
    e_rand["Mars"] = 5 * xi_V_rand / SQRT_M["Mars"]
    e_rand["Mercury"] = 8 * xi_V_rand / SQRT_M["Mercury"]

    # Random outer planets (not Saturn): log-uniform
    for p in ["Jupiter", "Uranus", "Neptune"]:
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.15)))

    # Solve Saturn from balance
    sum_203 = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * e_rand[p] / math.sqrt(D[p])
                  for p in GROUP_203)
    coeff_Sa = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
    e_Sa = sum_203 / coeff_Sa

    if e_Sa < 0 or e_Sa > 0.3:
        continue

    e_rand["Saturn"] = e_Sa
    valid2 += 1

    for pair in MIRROR_PAIRS:
        inner, outer = pair
        R_in = e_rand[inner] / math.radians(INCL_MEAN[inner])
        R_out = e_rand[outer] / math.radians(INCL_MEAN[outer])
        R2_sum = R_in**2 + R_out**2
        all_R2_sums2[pair].append(R2_sum)
        target = targets[pair]
        if abs(R2_sum / target - 1) < 0.05:
            near_count2[pair] += 1

print(f"\n{valid2} valid trials")
print(f"\n{'Pair':<22} {'Target':>8} {'Near%':>8} {'Mean':>10} {'Std':>10}")
print("─" * 60)

for pair in MIRROR_PAIRS:
    inner, outer = pair
    target = targets[pair]
    pct = near_count2[pair] / valid2 * 100 if valid2 > 0 else 0
    vals = all_R2_sums2[pair]
    mean_v = sum(vals) / len(vals) if vals else 0
    std_v = (sum((v - mean_v)**2 for v in vals) / len(vals))**0.5 if vals else 0
    print(f"  {inner}/{outer:<14s} {target:>8.3f} {pct:>7.2f}% {mean_v:>10.2f} {std_v:>10.2f}")

all_near2 = 0
for trial_idx in range(min(valid2, len(all_R2_sums2[MIRROR_PAIRS[0]]))):
    all_match = True
    for pair in MIRROR_PAIRS:
        target = targets[pair]
        val = all_R2_sums2[pair][trial_idx]
        if abs(val / target - 1) > 0.05:
            all_match = False
            break
    if all_match:
        all_near2 += 1

print(f"\nAll 4 near targets simultaneously: {all_near2}/{valid2} = {all_near2/valid2*100:.4f}%" if valid2 > 0 else "No valid trials")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: DOES THE BALANCE CONSTRAIN R RATIOS WITHIN MIRROR PAIRS?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 6: Balance constraint on R ratios within pairs")
print("─" * 78)

print("\nFor mirror pair (A, B) with d_A = d_B = d:")
print("  v_A = √m_A × a_A^(3/2) × e_A / √d = C_A × R_A  (where C uses i_mean)")
print("  v_B = √m_B × a_B^(3/2) × e_B / √d = C_B × R_B")
print()
print("The ratio v_A/v_B = (C_A × R_A) / (C_B × R_B)")
print("This is NOT constrained by Law 5 alone (Law 5 constrains the SUM)")
print()

# For each mirror pair, compute the ratio v_A/v_B
print("Actual v_A/v_B ratios within mirror pairs:")
for pair in MIRROR_PAIRS:
    inner, outer = pair
    v_in = eccentricity_weight(inner)
    v_out = eccentricity_weight(outer)
    ratio = v_in / v_out
    # Try to match to Fibonacci
    best = nearest_fib_ratio(ratio, [1, 2, 3, 5, 8, 13, 21, 34, 55, 89])
    print(f"  {inner}/{outer}: v_in/v_out = {ratio:.6f} ≈ {best[0]}/{best[1]} = {best[2]:.6f} (err {best[3]*100:.2f}%)")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: CORRELATION BETWEEN LAW 3 AND R² CONSTRAINTS
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 7: Correlation — when Law 5 balance is high, are R² sums")
print("         closer to Fibonacci targets?")
print("─" * 78)

# Run MC with random eccentricities, track balance % AND R² sums
N_TRIALS3 = 100000
balance_and_R2 = []

for trial in range(N_TRIALS3):
    e_rand = {}
    for p in PLANET_NAMES:
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.25)))

    # Compute balance
    sum_203 = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * e_rand[p] / math.sqrt(D[p])
                  for p in GROUP_203)
    sum_23 = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 * e_rand["Saturn"] / math.sqrt(D["Saturn"])
    balance = 1 - abs(sum_203 - sum_23) / (sum_203 + sum_23)

    # Compute R² sum errors
    total_R2_err = 0
    for pair in MIRROR_PAIRS:
        inner, outer = pair
        R_in = e_rand[inner] / math.radians(INCL_MEAN[inner])
        R_out = e_rand[outer] / math.radians(INCL_MEAN[outer])
        R2_sum = R_in**2 + R_out**2
        target = targets[pair]
        total_R2_err += abs(R2_sum / target - 1)

    balance_and_R2.append((balance, total_R2_err))

# Sort by balance and bin
balance_and_R2.sort(key=lambda x: x[0], reverse=True)

print(f"\n{'Balance range':>20} {'Count':>8} {'Mean R² err':>12} {'Med R² err':>12}")
print("─" * 60)

for lo, hi in [(0.99, 1.0), (0.95, 0.99), (0.90, 0.95), (0.80, 0.90), (0.50, 0.80), (0.0, 0.50)]:
    subset = [(b, r) for b, r in balance_and_R2 if lo <= b < hi]
    if subset:
        r2_errs = [r for _, r in subset]
        r2_errs_sorted = sorted(r2_errs)
        mean_r2 = sum(r2_errs) / len(r2_errs)
        med_r2 = r2_errs_sorted[len(r2_errs_sorted)//2]
        print(f"  {lo:.2f} – {hi:.2f}     {len(subset):>8} {mean_r2:>12.4f} {med_r2:>12.4f}")

# Check the actual solar system
actual_balance = verify_law3()[2]
actual_R2_err = 0
for pair in MIRROR_PAIRS:
    inner, outer = pair
    R_in = ECC[inner] / math.radians(INCL_MEAN[inner])
    R_out = ECC[outer] / math.radians(INCL_MEAN[outer])
    R2_sum = R_in**2 + R_out**2
    target = targets[pair]
    actual_R2_err += abs(R2_sum / target - 1)

print(f"\n  Solar System:       balance={actual_balance:.4f}%, R² total err={actual_R2_err:.4f}")
print(f"  (For reference: total R² error = sum of |R²_sum/target - 1| across 4 pairs)")

print("\n" + "=" * 78)
print("DIRECTION 2 COMPLETE")
print("=" * 78)

#!/usr/bin/env python3
"""
LAW 4 (ECCENTRICITY CONSTANT) — VERIFICATION
==============================================

Consolidated verification of Law 4: eccentricity predictions via R² pair
constraints across mirror-symmetric planet pairs.

Sections:
  1. R = e / i_mean_rad for all planets
  2. Full 8-planet prediction chain from e_E = 0.015373 (1 free param)
  3. Three scenario comparison: e_E ref / Saturn-Law3 ref / pure Law 4
  4. Product vs ratio assignment rule analysis
  5. Balance equation independence (DOF + Monte Carlo)
  6. Correlation: Law 5 balance vs R² proximity

Consolidated from:
  - fibonacci_law4_predictions.py   (full prediction chain)
  - fibonacci_law4_saturn_ref.py    (scenario comparison)
  - fibonacci_eccentricity_balance.py (balance equation analysis)
  - fibonacci_assignment_rule.py    (product vs ratio rule)
"""

import math
import random
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *


# ═══════════════════════════════════════════════════════════════════════════
# COMMON SETUP
# ═══════════════════════════════════════════════════════════════════════════

# Mean inclinations from Law 2 (ψ-derived)
INCL_MEAN = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
INCL_MEAN_RAD = {p: math.radians(INCL_MEAN[p]) for p in PLANET_NAMES}

# R = e / i_mean_rad for all planets
R_VAL = {p: ECC[p] / INCL_MEAN_RAD[p] for p in PLANET_NAMES}

# R² sum targets (Fibonacci fractions)
R2_SUMS = {
    ("Mars", "Jupiter"):   377 / 5,   # F_14 / F_5
    ("Earth", "Saturn"):   34 / 3,    # F_9 / F_4
    ("Venus", "Neptune"):  1 / 2,     # F_1 / F_3
    ("Mercury", "Uranus"): 21 / 2,    # F_8 / F_3
}

# Second constraints per pair
C2_TARGETS = {
    ("Mars", "Jupiter"):   ("product", 34 / 2),   # R_Ma × R_Ju = 17
    ("Earth", "Saturn"):   ("product", 2 / 1),     # R_E × R_S = 2
    ("Venus", "Neptune"):  ("ratio",   2 / 8),     # R_V / R_Ne = 0.25
    ("Mercury", "Uranus"): ("ratio",   2 / 3),     # R_Me / R_Ur = 0.667
}


def solve_pair_from_constraints(pair):
    """Solve a pair using both Fibonacci constraints (no external reference).
    Returns (R_inner, R_outer)."""
    S = R2_SUMS[pair]
    c2type, c2val = C2_TARGETS[pair]

    if c2type == "product":
        P = c2val
        disc = S**2 - 4 * P**2
        u1 = (S + math.sqrt(disc)) / 2
        u2 = (S - math.sqrt(disc)) / 2
        return math.sqrt(u2), math.sqrt(u1)  # inner=smaller, outer=larger
    else:
        Q = c2val
        rb2 = S / (1 + Q**2)
        ra2 = Q**2 * rb2
        return math.sqrt(ra2), math.sqrt(rb2)


def solve_pair_from_one_known(pair, known_planet, known_e):
    """Solve a pair given one planet's eccentricity via R² sum.
    Returns (R_inner, R_outer)."""
    inner, outer = pair
    S = R2_SUMS[pair]
    R_known = known_e / INCL_MEAN_RAD[known_planet]
    R2_other = S - R_known**2
    R_other = math.sqrt(max(0, R2_other))

    if known_planet == inner:
        return R_known, R_other
    else:
        return R_other, R_known


def predict_eccentricities(scenario):
    """Predict all 8 eccentricities for a given scenario.
    scenario: 'A' (e_E ref), 'B' (Saturn-Law3 ref), 'C' (pure Law 4)
    Returns dict of predicted eccentricities."""
    pred = {}

    if scenario == 'A':
        pred["Earth"] = EARTH_BASE_ECCENTRICITY
        _, R_S = solve_pair_from_one_known(
            ("Earth", "Saturn"), "Earth", pred["Earth"])
        pred["Saturn"] = R_S * INCL_MEAN_RAD["Saturn"]
        for pair in [("Mars", "Jupiter"), ("Venus", "Neptune"),
                     ("Mercury", "Uranus")]:
            inner, outer = pair
            R_in, R_out = solve_pair_from_constraints(pair)
            pred[inner] = R_in * INCL_MEAN_RAD[inner]
            pred[outer] = R_out * INCL_MEAN_RAD[outer]

    elif scenario == 'B':
        e_S_law3, _, _ = predict_saturn_eccentricity()
        pred["Saturn"] = e_S_law3
        R_E, _ = solve_pair_from_one_known(
            ("Earth", "Saturn"), "Saturn", pred["Saturn"])
        pred["Earth"] = R_E * INCL_MEAN_RAD["Earth"]
        for pair in [("Mars", "Jupiter"), ("Venus", "Neptune"),
                     ("Mercury", "Uranus")]:
            inner, outer = pair
            R_in, R_out = solve_pair_from_constraints(pair)
            pred[inner] = R_in * INCL_MEAN_RAD[inner]
            pred[outer] = R_out * INCL_MEAN_RAD[outer]

    elif scenario == 'C':
        for pair in MIRROR_PAIRS:
            inner, outer = pair
            R_in, R_out = solve_pair_from_constraints(pair)
            pred[inner] = R_in * INCL_MEAN_RAD[inner]
            pred[outer] = R_out * INCL_MEAN_RAD[outer]

    return pred


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: R VALUES FOR ALL PLANETS
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 78)
print("LAW 4 (ECCENTRICITY CONSTANT) — VERIFICATION")
print("=" * 78)

print("\n─── Section 1: R = e / i_mean_rad for all planets ───\n")

print(f"{'Planet':>10}  {'e':>10}  {'i_mean°':>8}  {'i_mean_rad':>12}  "
      f"{'R=e/i':>10}  {'R²':>10}")
print("─" * 75)
for p in PLANET_NAMES:
    print(f"{p:>10}  {ECC[p]:10.6f}  {INCL_MEAN[p]:8.4f}  "
          f"{INCL_MEAN_RAD[p]:12.6e}  {R_VAL[p]:10.4f}  {R_VAL[p]**2:10.4f}")

# R² pair sums vs Fibonacci targets
print(f"\n{'Pair':>20}  {'R²_sum':>10}  {'Target':>10}  {'Error%':>8}")
print("─" * 55)
for pair in MIRROR_PAIRS:
    inner, outer = pair
    r2sum = R_VAL[inner]**2 + R_VAL[outer]**2
    target = R2_SUMS[pair]
    err = (r2sum / target - 1) * 100
    print(f"{inner+'/'+outer:>20}  {r2sum:10.4f}  {target:10.4f}  {err:+6.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: FULL 8-PLANET PREDICTION CHAIN FROM e_E
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 2: Full 8-planet prediction chain from e_E = 0.015373")
print("=" * 78)

e_E = EARTH_BASE_ECCENTRICITY
R_E = e_E / INCL_MEAN_RAD["Earth"]
print(f"\n  R_Earth = {e_E} / {INCL_MEAN_RAD['Earth']:.6e} = {R_E:.6f}")

# Earth/Saturn — R² sum
S_ES = 34 / 3
R2_S = S_ES - R_E**2
R_S = math.sqrt(R2_S)
e_S_pred = R_S * INCL_MEAN_RAD["Saturn"]
print(f"\n  Earth/Saturn (R² sum = 34/3 = {S_ES:.4f}):")
print(f"    R_Saturn = √({S_ES:.4f} - {R_E**2:.6f}) = {R_S:.6f}")
print(f"    e_Saturn = {e_S_pred:.6f}  (obs: {ECC['Saturn']:.6f}, "
      f"err: {(e_S_pred-ECC['Saturn'])/ECC['Saturn']*100:+.2f}%)")
print(f"    Cross-check: R_E × R_S = {R_E*R_S:.4f} (target: 2, "
      f"err: {(R_E*R_S/2 - 1)*100:+.2f}%)")

# Mars/Jupiter — product constraint
S_MJ = 377 / 5
P_MJ = 34 / 2
disc = S_MJ**2 - 4 * P_MJ**2
u1 = (S_MJ + math.sqrt(disc)) / 2
u2 = (S_MJ - math.sqrt(disc)) / 2
R_Ma, R_Ju = math.sqrt(u2), math.sqrt(u1)
e_Ma = R_Ma * INCL_MEAN_RAD["Mars"]
e_Ju = R_Ju * INCL_MEAN_RAD["Jupiter"]
print(f"\n  Mars/Jupiter (R² sum = 377/5, product = 34/2 = 17):")
print(f"    R_Mars = {R_Ma:.6f}, R_Jupiter = {R_Ju:.6f}")
print(f"    e_Mars    = {e_Ma:.6f}  (obs: {ECC['Mars']:.6f}, "
      f"err: {(e_Ma-ECC['Mars'])/ECC['Mars']*100:+.2f}%)")
print(f"    e_Jupiter = {e_Ju:.6f}  (obs: {ECC['Jupiter']:.6f}, "
      f"err: {(e_Ju-ECC['Jupiter'])/ECC['Jupiter']*100:+.2f}%)")

# Venus/Neptune — ratio constraint
S_VN = 1 / 2
Q_VN = 2 / 8
R2_Ne = S_VN / (1 + Q_VN**2)
R_V = Q_VN * math.sqrt(R2_Ne)
R_Ne = math.sqrt(R2_Ne)
e_V = R_V * INCL_MEAN_RAD["Venus"]
e_Ne = R_Ne * INCL_MEAN_RAD["Neptune"]
print(f"\n  Venus/Neptune (R² sum = 1/2, ratio R_V/R_Ne = 2/8 = 0.25):")
print(f"    R_Venus = {R_V:.6f}, R_Neptune = {R_Ne:.6f}")
print(f"    e_Venus   = {e_V:.6f}  (obs: {ECC['Venus']:.6f}, "
      f"err: {(e_V-ECC['Venus'])/ECC['Venus']*100:+.2f}%)")
print(f"    e_Neptune = {e_Ne:.6f}  (obs: {ECC['Neptune']:.6f}, "
      f"err: {(e_Ne-ECC['Neptune'])/ECC['Neptune']*100:+.2f}%)")

# Mercury/Uranus — ratio constraint
S_MU = 21 / 2
Q_MU = 2 / 3
R2_Ur = S_MU / (1 + Q_MU**2)
R_Me = Q_MU * math.sqrt(R2_Ur)
R_Ur = math.sqrt(R2_Ur)
e_Me = R_Me * INCL_MEAN_RAD["Mercury"]
e_Ur = R_Ur * INCL_MEAN_RAD["Uranus"]
print(f"\n  Mercury/Uranus (R² sum = 21/2, ratio R_Me/R_Ur = 2/3):")
print(f"    R_Mercury = {R_Me:.6f}, R_Uranus = {R_Ur:.6f}")
print(f"    e_Mercury = {e_Me:.6f}  (obs: {ECC['Mercury']:.6f}, "
      f"err: {(e_Me-ECC['Mercury'])/ECC['Mercury']*100:+.2f}%)")
print(f"    e_Uranus  = {e_Ur:.6f}  (obs: {ECC['Uranus']:.6f}, "
      f"err: {(e_Ur-ECC['Uranus'])/ECC['Uranus']*100:+.2f}%)")

# Summary
predictions_A = predict_eccentricities('A')
print(f"\n{'Planet':>10}  {'Predicted':>12}  {'Observed':>12}  {'Error':>8}  "
      f"{'Source':>25}")
print("─" * 75)
for p in PLANET_NAMES:
    e_obs = ECC[p]
    if p == "Earth":
        print(f"{p:>10}  {predictions_A[p]:12.6f}  {e_obs:12.6f}     ref  "
              f"{'input (reference)':>25}")
    else:
        err = (predictions_A[p] - e_obs) / e_obs * 100
        if p == "Saturn":
            source = "R² sum (Earth/Saturn)"
        elif p in ["Mars", "Jupiter"]:
            source = "product (Mars/Jupiter)"
        elif p in ["Venus", "Neptune"]:
            source = "ratio (Venus/Neptune)"
        else:
            source = "ratio (Mercury/Uranus)"
        print(f"{p:>10}  {predictions_A[p]:12.6f}  {e_obs:12.6f}  "
              f"{err:+6.2f}%  {source:>25}")

# Law 5 cross-check
e_S_law5, _, _ = predict_saturn_eccentricity()
print(f"\n  Law 5 cross-check: e_Saturn = {e_S_law5:.6f} "
      f"(err: {(e_S_law5-ECC['Saturn'])/ECC['Saturn']*100:+.2f}%)")
print(f"  Law 4 prediction:  e_Saturn = {e_S_pred:.6f} "
      f"(err: {(e_S_pred-ECC['Saturn'])/ECC['Saturn']*100:+.2f}%)")
print(f"  Consistency gap: {abs(e_S_law5 - e_S_pred)/ECC['Saturn']*100:.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: THREE SCENARIO COMPARISON
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 3: Three scenario comparison")
print("=" * 78)

pred_A = predict_eccentricities('A')
pred_B = predict_eccentricities('B')
pred_C = predict_eccentricities('C')

print(f"\n  Scenario A: e_E = 0.015373 as reference (1 free parameter)")
print(f"  Scenario B: Saturn from Law 3 as reference (0 free parameters)")
print(f"  Scenario C: Pure Law 4 — all from Fibonacci constraints (0 free parameters)")

print(f"\n{'Planet':>10}  {'A (e_E ref)':>12}  {'B (Sat ref)':>12}  "
      f"{'C (pure L4)':>12}  {'Observed':>12}")
print("─" * 66)
for p in PLANET_NAMES:
    print(f"{p:>10}  {pred_A[p]:12.6f}  {pred_B[p]:12.6f}  "
          f"{pred_C[p]:12.6f}  {ECC[p]:12.6f}")

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

print(f"\n  Max |error|:  A={max_err['A']:.2f}%   B={max_err['B']:.2f}%   "
      f"C={max_err['C']:.2f}%")
print(f"  Free params:  A=1 (e_E)  B=0 (Law 3)  C=0 (pure)")

# Law 3 cross-check for scenario C
sum_203_C = 0
for p in GROUP_203:
    v = math.sqrt(MASS[p]) * SMA[p]**1.5 * pred_C[p] / math.sqrt(D[p])
    sum_203_C += v
v_S_C = (math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5
         * pred_C["Saturn"] / math.sqrt(D["Saturn"]))
balance_C = (1 - abs(sum_203_C - v_S_C) / (sum_203_C + v_S_C)) * 100
print(f"\n  Law 3 balance with Scenario C eccentricities: {balance_C:.4f}%")
actual_bal = verify_law3()[2]
print(f"  Law 3 balance with actual eccentricities:     {actual_bal:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: PRODUCT VS RATIO ASSIGNMENT RULE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 4: Product vs ratio assignment rule")
print("=" * 78)

# Both constraint types for all pairs
print(f"\n{'Pair':>20}  {'R²_sum':>8}  {'R_prod':>8}  {'R_ratio':>8}  "
      f"{'Assigned':>10}")
print("─" * 65)
for inner, outer in MIRROR_PAIRS:
    r2sum = R_VAL[inner]**2 + R_VAL[outer]**2
    rprod = R_VAL[inner] * R_VAL[outer]
    rratio = R_VAL[inner] / R_VAL[outer]
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {r2sum:8.4f}  {rprod:8.4f}  "
          f"{rratio:8.4f}  {c2type:>10}")

# Physical discriminators
print(f"\n{'Pair':>20}  {'k':>3}  {'d':>3}  {'d_idx':>5}  "
      f"{'R²_in%':>8}  {'R²_out%':>8}  {'Type':>8}")
print("─" * 65)
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d = D[inner]
    d_idx = FIB_INDEX.get(d, '?')
    r2in = R_VAL[inner]**2
    r2out = R_VAL[outer]**2
    r2sum = r2in + r2out
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {k:>3}  {d:>3}  {d_idx:>5}  "
          f"{r2in/r2sum*100:8.2f}  {r2out/r2sum*100:8.2f}  {c2type:>8}")

# Quadratic root analysis
print("\n  Quadratic root analysis:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S = R2_SUMS[(inner, outer)]
    c2type, c2val = C2_TARGETS[(inner, outer)]

    if c2type == "product":
        P = c2val
        disc = S**2 - 4 * P**2
        u1 = (S + math.sqrt(disc)) / 2
        u2 = (S - math.sqrt(disc)) / 2
        r1, r2 = math.sqrt(u1), math.sqrt(u2)
        print(f"\n    k={k} {inner}/{outer} (PRODUCT R×R = {c2val:.0f}):")
        print(f"      Roots: {r1:.4f} and {r2:.4f}")
        print(f"      Inner={inner} gets SMALLER root → R={r2:.4f} "
              f"(actual {R_VAL[inner]:.4f})")
        print(f"      Outer={outer} gets LARGER root  → R={r1:.4f} "
              f"(actual {R_VAL[outer]:.4f})")
    else:
        Q = c2val
        rb2 = S / (1 + Q**2)
        ra = math.sqrt(Q**2 * rb2)
        rb = math.sqrt(rb2)
        print(f"\n    k={k} {inner}/{outer} (RATIO R_in/R_out = {c2val:.4f}):")
        print(f"      Unique solution: R_{inner} = {ra:.4f}, "
              f"R_{outer} = {rb:.4f}")
        print(f"      Actual: R_{inner} = {R_VAL[inner]:.4f}, "
              f"R_{outer} = {R_VAL[outer]:.4f}")

# Test: can RATIO work for ALL pairs?
print("\n  Test: universal RATIO (R_out/R_in) for all pairs:")
extended_fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]
total_err_ratio = 0
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S = R2_SUMS[(inner, outer)]
    actual_ratio = R_VAL[outer] / R_VAL[inner]
    best = nearest_fib_ratio(actual_ratio, extended_fibs)
    a_fib, b_fib, Q, Q_err = best
    r_in = math.sqrt(S / (1 + Q**2))
    r_out = Q * r_in
    err_in = abs(r_in - R_VAL[inner]) / R_VAL[inner] * 100
    err_out = abs(r_out - R_VAL[outer]) / R_VAL[outer] * 100
    total_err_ratio += err_in + err_out
    print(f"    k={k} {inner}/{outer}: R_out/R_in = {actual_ratio:.4f} → "
          f"best {a_fib}/{b_fib} = {Q:.4f} (fit {Q_err*100:+.2f}%)")

# Compare accuracy: mixed vs uniform
total_err_mixed = 0
for pair in MIRROR_PAIRS:
    inner, outer = pair
    R_in, R_out = solve_pair_from_constraints(pair)
    err_in = abs(R_in - R_VAL[inner]) / R_VAL[inner] * 100
    err_out = abs(R_out - R_VAL[outer]) / R_VAL[outer] * 100
    total_err_mixed += err_in + err_out

print(f"\n    Total |R| error — mixed product/ratio: {total_err_mixed:.2f}%")
print(f"    Total |R| error — universal ratio:     {total_err_ratio:.2f}%")

# Summary of the rule
print("""
  Assignment rule summary:
    Product pairs (k=1,2): d ≤ F_5 (small d), belt-adjacent
      → R²_inner contributes <6% of R² sum (inner suppressed)
    Ratio pairs (k=3,4): d ≥ F_8 (large d), belt-distant
      → R values more balanced between inner and outer""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: BALANCE EQUATION INDEPENDENCE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 5: Balance equation independence (DOF + Monte Carlo)")
print("=" * 78)

# DOF analysis
print("""
  Degrees of freedom analysis:
    Unknowns: 8 eccentricities
    Law 5 (eccentricity balance): 1 equation → 7 DOF remain
    R² pair constraints add: 8 equations (2 per 4 pairs)
    These CANNOT follow from Law 5 alone (1 eq ≠ 9 eq)
""")

# Algebraic coefficients: v_j = R_j × C_j where C_j = √m × a^(3/2) × i_rad / √d
C_coeff = {}
for p in PLANET_NAMES:
    C_coeff[p] = (math.sqrt(MASS[p]) * SMA[p]**1.5
                  * INCL_MEAN_RAD[p] / math.sqrt(D[p]))

print("  Law 5 balance in R-variables: Σ(203°) R_j × C_j = R_Saturn × C_Saturn")
print(f"  where C_j = √m × a^(3/2) × i_mean_rad / √d\n")

sum_203_C_coeff = sum(C_coeff[p] for p in GROUP_203)
print(f"    Σ C_j (203°) = {sum_203_C_coeff:.6e}")
print(f"    C_Saturn      = {C_coeff['Saturn']:.6e}")

total_C = sum(abs(C_coeff[p]) for p in PLANET_NAMES)
inner_C = sum(C_coeff[p] for p in ["Mercury", "Venus", "Earth", "Mars"])
print(f"\n    Inner planet C sum = {inner_C/sum_203_C_coeff*100:.2f}% of 203° sum")
print(f"    → inner eccentricities are WEAKLY constrained by Law 5")

# Monte Carlo: random e satisfying Law 5
print("\n  Monte Carlo: random eccentricities satisfying Law 5 balance...")
N_TRIALS = 50000
targets = {pair: R2_SUMS[pair] for pair in MIRROR_PAIRS}
near_count = {pair: 0 for pair in MIRROR_PAIRS}
all_R2_sums = {pair: [] for pair in MIRROR_PAIRS}
valid_trials = 0

random.seed(42)
for trial in range(N_TRIALS):
    e_rand = {}
    for p in PLANET_NAMES:
        if p == "Saturn":
            continue
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.25)))

    sum_203 = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * e_rand[p] / math.sqrt(D[p])
                  for p in GROUP_203)
    coeff_Sa = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
    e_Sa = sum_203 / coeff_Sa

    if e_Sa < 0 or e_Sa > 0.5:
        continue

    e_rand["Saturn"] = e_Sa
    valid_trials += 1

    for pair in MIRROR_PAIRS:
        inner, outer = pair
        R_in = e_rand[inner] / INCL_MEAN_RAD[inner]
        R_out = e_rand[outer] / INCL_MEAN_RAD[outer]
        R2_sum = R_in**2 + R_out**2
        all_R2_sums[pair].append(R2_sum)
        if abs(R2_sum / targets[pair] - 1) < 0.05:
            near_count[pair] += 1

print(f"\n    {valid_trials} valid trials (Saturn e in [0, 0.5])")
print(f"\n    {'Pair':<22} {'Target':>8} {'Near 5%':>8} {'Mean':>10} "
      f"{'Std':>10}")
print("    " + "─" * 62)
for pair in MIRROR_PAIRS:
    inner, outer = pair
    target = targets[pair]
    pct = near_count[pair] / valid_trials * 100 if valid_trials > 0 else 0
    vals = all_R2_sums[pair]
    mean_v = sum(vals) / len(vals) if vals else 0
    std_v = (sum((v - mean_v)**2 for v in vals) / len(vals))**0.5 if vals else 0
    print(f"    {inner}/{outer:<14s} {target:>8.3f} {pct:>7.2f}% "
          f"{mean_v:>10.2f} {std_v:>10.2f}")

# All 4 near simultaneously
all_near = 0
for i in range(min(valid_trials, len(all_R2_sums[MIRROR_PAIRS[0]]))):
    all_match = all(
        abs(all_R2_sums[pair][i] / targets[pair] - 1) < 0.05
        for pair in MIRROR_PAIRS)
    if all_match:
        all_near += 1

print(f"\n    All 4 within 5% simultaneously: {all_near}/{valid_trials} "
      f"= {all_near/valid_trials*100:.4f}%" if valid_trials > 0 else
      "    No valid trials")

# Constrained MC: fix inner ladder, vary outer
print("\n  Constrained MC: fix inner ladder (Finding 6), vary outer...")
N_TRIALS2 = 100000
near_count2 = {pair: 0 for pair in MIRROR_PAIRS}
all_R2_sums2 = {pair: [] for pair in MIRROR_PAIRS}
valid2 = 0
xi_V_actual = XI["Venus"]

random.seed(42)
for trial in range(N_TRIALS2):
    xi_V_rand = xi_V_actual * math.exp(random.uniform(-0.5, 0.5))
    e_rand = {}
    e_rand["Venus"] = xi_V_rand / SQRT_M["Venus"]
    e_rand["Earth"] = (5 / 2) * xi_V_rand / SQRT_M["Earth"]
    e_rand["Mars"] = 5 * xi_V_rand / SQRT_M["Mars"]
    e_rand["Mercury"] = 8 * xi_V_rand / SQRT_M["Mercury"]

    for p in ["Jupiter", "Uranus", "Neptune"]:
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.15)))

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
        R_in = e_rand[inner] / INCL_MEAN_RAD[inner]
        R_out = e_rand[outer] / INCL_MEAN_RAD[outer]
        R2_sum = R_in**2 + R_out**2
        all_R2_sums2[pair].append(R2_sum)
        if abs(R2_sum / targets[pair] - 1) < 0.05:
            near_count2[pair] += 1

print(f"\n    {valid2} valid trials")
print(f"\n    {'Pair':<22} {'Target':>8} {'Near 5%':>8} {'Mean':>10} "
      f"{'Std':>10}")
print("    " + "─" * 62)
for pair in MIRROR_PAIRS:
    inner, outer = pair
    target = targets[pair]
    pct = near_count2[pair] / valid2 * 100 if valid2 > 0 else 0
    vals = all_R2_sums2[pair]
    mean_v = sum(vals) / len(vals) if vals else 0
    std_v = (sum((v - mean_v)**2 for v in vals) / len(vals))**0.5 if vals else 0
    print(f"    {inner}/{outer:<14s} {target:>8.3f} {pct:>7.2f}% "
          f"{mean_v:>10.2f} {std_v:>10.2f}")

all_near2 = 0
for i in range(min(valid2, len(all_R2_sums2[MIRROR_PAIRS[0]]))):
    all_match = all(
        abs(all_R2_sums2[pair][i] / targets[pair] - 1) < 0.05
        for pair in MIRROR_PAIRS)
    if all_match:
        all_near2 += 1
if valid2 > 0:
    print(f"\n    All 4 near simultaneously: {all_near2}/{valid2} "
          f"= {all_near2/valid2*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: CORRELATION — LAW 5 BALANCE VS R² PROXIMITY
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 6: Correlation — when Law 5 balance is high, are R² sums")
print("           closer to Fibonacci targets?")
print("=" * 78)

N_TRIALS3 = 100000
balance_and_R2 = []

random.seed(42)
for trial in range(N_TRIALS3):
    e_rand = {}
    for p in PLANET_NAMES:
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.25)))

    sum_203 = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * e_rand[p] / math.sqrt(D[p])
                  for p in GROUP_203)
    sum_23 = (math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5
              * e_rand["Saturn"] / math.sqrt(D["Saturn"]))
    balance = 1 - abs(sum_203 - sum_23) / (sum_203 + sum_23)

    total_R2_err = 0
    for pair in MIRROR_PAIRS:
        inner, outer = pair
        R_in = e_rand[inner] / INCL_MEAN_RAD[inner]
        R_out = e_rand[outer] / INCL_MEAN_RAD[outer]
        R2_sum = R_in**2 + R_out**2
        total_R2_err += abs(R2_sum / targets[pair] - 1)

    balance_and_R2.append((balance, total_R2_err))

balance_and_R2.sort(key=lambda x: x[0], reverse=True)

print(f"\n    {'Balance range':>20} {'Count':>8} {'Mean R² err':>12} "
      f"{'Med R² err':>12}")
print("    " + "─" * 56)
for lo, hi in [(0.99, 1.0), (0.95, 0.99), (0.90, 0.95),
               (0.80, 0.90), (0.50, 0.80), (0.0, 0.50)]:
    subset = [(b, r) for b, r in balance_and_R2 if lo <= b < hi]
    if subset:
        r2_errs = sorted([r for _, r in subset])
        mean_r2 = sum(r2_errs) / len(r2_errs)
        med_r2 = r2_errs[len(r2_errs) // 2]
        print(f"    {lo:.2f} – {hi:.2f}     {len(subset):>8} "
              f"{mean_r2:>12.4f} {med_r2:>12.4f}")

actual_R2_err = 0
for pair in MIRROR_PAIRS:
    inner, outer = pair
    R_in = R_VAL[inner]
    R_out = R_VAL[outer]
    R2_sum = R_in**2 + R_out**2
    actual_R2_err += abs(R2_sum / targets[pair] - 1)

print(f"\n    Solar System: balance={verify_law3()[2]:.4f}%, "
      f"R² total err={actual_R2_err:.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# COMPLETE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("LAW 4 VERIFICATION COMPLETE")
print("=" * 78)

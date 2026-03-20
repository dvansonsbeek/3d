#!/usr/bin/env python3
"""
INVESTIGATION: RESOLVE THE PRODUCT-PAIR ASSIGNMENT RULE
========================================================

Why do belt-adjacent pairs (k=1,2) use R_inner × R_outer (product) constraints,
while outer pairs (k=3,4) use R_inner / R_outer (ratio) constraints?

And within product-pair solutions, why is R_inner < R_outer — opposite to what
the simple quadratic solver assumes?

This script investigates:
1. Physical properties that distinguish product vs ratio pairs
2. The quadratic root assignment problem
3. Whether a universal rule (product OR ratio) can work for all pairs
4. Coupling strength / belt proximity as the discriminator
5. Fibonacci index patterns in the constraint type
"""

import math
import sys
sys.path.insert(0, '.')
from fibonacci_data import *

print("=" * 78)
print("INVESTIGATION: PRODUCT vs RATIO ASSIGNMENT RULE")
print("=" * 78)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: Compute R values for all planets
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 1: R = e / i_mean_rad for all planets")
print("─" * 78)

# Compute mean inclinations from ψ-derived amplitudes
mean_incl = {}
for p in PLANET_NAMES:
    mean_incl[p] = compute_mean_inclination(p)

R = {}
for p in PLANET_NAMES:
    i_rad = math.radians(mean_incl[p])
    R[p] = ECC[p] / i_rad

print(f"\n{'Planet':>10}  {'e':>10}  {'i_mean°':>8}  {'i_mean_rad':>12}  {'R=e/i':>10}  {'R²':>10}")
print("─" * 75)
for p in PLANET_NAMES:
    i_rad = math.radians(mean_incl[p])
    print(f"{p:>10}  {ECC[p]:10.6f}  {mean_incl[p]:8.4f}  {i_rad:12.6e}  {R[p]:10.4f}  {R[p]**2:10.4f}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Mirror pair analysis — both constraint types for all pairs
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 2: Both constraint types tested for ALL pairs")
print("─" * 78)

# Known Fibonacci targets from Direction 1
R2_SUM_TARGETS = {
    ("Mars", "Jupiter"):    (377, 5),    # F_14/F_5
    ("Earth", "Saturn"):    (34, 3),     # F_9/F_4
    ("Venus", "Neptune"):   (1, 2),      # F_1/F_3
    ("Mercury", "Uranus"):  (21, 2),     # F_8/F_3
}

# Known C2 constraints
C2_TARGETS = {
    ("Mars", "Jupiter"):    ("product", 34, 2),   # R_Ma × R_Ju = 34/2 = 17
    ("Earth", "Saturn"):    ("product", 2, 1),     # R_E × R_Sa = 2/1 = 2
    ("Venus", "Neptune"):   ("ratio", 2, 8),       # R_V / R_Ne = 2/8 = 0.25
    ("Mercury", "Uranus"):  ("ratio", 2, 3),       # R_Me / R_Ur = 2/3 = 0.667
}

print(f"\n{'Pair':>20}  {'R²_sum':>8}  {'R_prod':>8}  {'R_ratio':>8}  {'Assigned':>10}")
print("─" * 65)
for inner, outer in MIRROR_PAIRS:
    r2sum = R[inner]**2 + R[outer]**2
    rprod = R[inner] * R[outer]
    rratio = R[inner] / R[outer]
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {r2sum:8.4f}  {rprod:8.4f}  {rratio:8.4f}  {c2type:>10}")

# Test: what if we use PRODUCT for ALL pairs?
print("\n\nTest: PRODUCT constraint for ALL pairs (find nearest Fibonacci ratio):")
print(f"{'Pair':>20}  {'R_prod':>10}  {'Best F_a/F_b':>14}  {'Error%':>8}")
print("─" * 60)
for inner, outer in MIRROR_PAIRS:
    rprod = R[inner] * R[outer]
    a, b, ratio, err = nearest_fib_ratio(rprod, FIB[1:15])
    print(f"{inner+'/'+outer:>20}  {rprod:10.4f}  {a:>3}/{b:<3} = {ratio:8.4f}  {err*100:+8.2f}%")

# Test: what if we use RATIO for ALL pairs?
print("\nTest: RATIO constraint (inner/outer) for ALL pairs:")
print(f"{'Pair':>20}  {'R_ratio':>10}  {'Best F_a/F_b':>14}  {'Error%':>8}")
print("─" * 60)
for inner, outer in MIRROR_PAIRS:
    rratio = R[inner] / R[outer]
    a, b, ratio, err = nearest_fib_ratio(rratio, FIB[1:15])
    print(f"{inner+'/'+outer:>20}  {rratio:10.4f}  {a:>3}/{b:<3} = {ratio:8.4f}  {err*100:+8.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Physical discriminators — what separates product from ratio pairs?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 3: Physical discriminators — product vs ratio pairs")
print("─" * 78)

print(f"\n{'Pair':>20}  {'k':>3}  {'d':>3}  {'d_idx':>5}  {'m_in/m_out':>10}  {'a_in/a_out':>10}  {'R_in/R_out':>10}  {'Type':>8}")
print("─" * 85)
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d = D[inner]
    d_idx = FIB_INDEX.get(d, '?')
    m_ratio = MASS[inner] / MASS[outer]
    a_ratio = SMA[inner] / SMA[outer]
    r_ratio = R[inner] / R[outer]
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {k:>3}  {d:>3}  {d_idx:>5}  {m_ratio:10.6f}  {a_ratio:10.6f}  {r_ratio:10.4f}  {c2type:>8}")

# Key observation: R_inner < R_outer for product pairs, R_inner < R_outer also for ratio pairs
# But for product pairs, R_inner << R_outer (factors of ~4-6x)
# For ratio pairs, R_inner ~comparable to R_outer (within factor of ~2)
print("\nR_inner / R_outer ratios:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    r_ratio = R[inner] / R[outer]
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"  k={k}: R_{inner}/R_{outer} = {r_ratio:.4f} ({c2type})")

print("\nR_inner values:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"  k={k}: R_{inner} = {R[inner]:.4f}, R_{outer} = {R[outer]:.4f} ({c2type})")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Quadratic root analysis — both solutions for each pair
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 4: Quadratic root analysis — solving R values from constraints")
print("─" * 78)

for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S_num, S_den = R2_SUM_TARGETS[(inner, outer)]
    S = S_num / S_den
    c2type, c2_num, c2_den = C2_TARGETS[(inner, outer)]
    C2 = c2_num / c2_den

    print(f"\n  Pair k={k}: {inner}/{outer}")
    print(f"    R² sum = {S_num}/{S_den} = {S:.4f}")
    print(f"    C2 ({c2type}) = {c2_num}/{c2_den} = {C2:.4f}")

    if c2type == "product":
        # R_A × R_B = P, R_A² + R_B² = S
        # → R_A² + P²/R_A² = S → R_A⁴ - S×R_A² + P² = 0
        # Let u = R_A²: u² - S×u + P² = 0
        P = C2
        disc = S**2 - 4*P**2
        if disc >= 0:
            u1 = (S + math.sqrt(disc)) / 2
            u2 = (S - math.sqrt(disc)) / 2
            r1 = math.sqrt(u1)
            r2 = math.sqrt(u2)
            print(f"    Two solutions: R = {r1:.4f} and R = {r2:.4f}")
            print(f"    Product check: {r1:.4f} × {r2:.4f} = {r1*r2:.4f} (target {P:.4f})")
            print(f"    Sum check: {r1**2:.4f} + {r2**2:.4f} = {r1**2+r2**2:.4f} (target {S:.4f})")

            # Which assignment is correct?
            err_direct = abs(r1 - R[inner])/R[inner] + abs(r2 - R[outer])/R[outer]
            err_swap = abs(r2 - R[inner])/R[inner] + abs(r1 - R[outer])/R[outer]

            print(f"    Assignment 1: {inner}={r1:.4f}, {outer}={r2:.4f} → total err {err_direct*100:.2f}%")
            print(f"    Assignment 2: {inner}={r2:.4f}, {outer}={r1:.4f} → total err {err_swap*100:.2f}%")
            print(f"    Actual: {inner}={R[inner]:.4f}, {outer}={R[outer]:.4f}")

            if err_swap < err_direct:
                print(f"    → CORRECT assignment: inner gets SMALLER root")
            else:
                print(f"    → CORRECT assignment: inner gets LARGER root")

    elif c2type == "ratio":
        # R_A / R_B = Q, R_A² + R_B² = S
        # → Q²×R_B² + R_B² = S → R_B² = S/(1+Q²)
        Q = C2
        rb2 = S / (1 + Q**2)
        ra2 = Q**2 * rb2
        ra = math.sqrt(ra2)
        rb = math.sqrt(rb2)
        print(f"    Unique solution: R_{inner} = {ra:.4f}, R_{outer} = {rb:.4f}")
        print(f"    Ratio check: {ra:.4f}/{rb:.4f} = {ra/rb:.4f} (target {Q:.4f})")
        print(f"    Sum check: {ra**2:.4f} + {rb**2:.4f} = {ra**2+rb**2:.4f} (target {S:.4f})")
        print(f"    Actual: {inner}={R[inner]:.4f}, {outer}={R[outer]:.4f}")
        err_a = abs(ra - R[inner])/R[inner] * 100
        err_b = abs(rb - R[outer])/R[outer] * 100
        print(f"    Errors: {inner}={err_a:+.2f}%, {outer}={err_b:+.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Alternative — can we use RATIO for ALL pairs?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 5: Test universal RATIO constraint for all pairs")
print("─" * 78)

print("\nFor each pair, find best Fibonacci ratio R_inner/R_outer and solve:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S_num, S_den = R2_SUM_TARGETS[(inner, outer)]
    S = S_num / S_den
    actual_ratio = R[inner] / R[outer]

    # Find best Fibonacci ratio
    extended_fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]
    best_err = float('inf')
    best_q = None
    for a in extended_fibs:
        for b in extended_fibs:
            q = a / b
            err = abs(actual_ratio / q - 1)
            if err < best_err:
                best_err = err
                best_q = (a, b, q, err)

    a_fib, b_fib, Q, Q_err = best_q

    # Solve: R_A/R_B = Q, R_A² + R_B² = S
    rb2 = S / (1 + Q**2)
    ra2 = Q**2 * rb2
    ra = math.sqrt(ra2)
    rb = math.sqrt(rb2)

    err_a = (ra - R[inner]) / R[inner] * 100
    err_b = (rb - R[outer]) / R[outer] * 100

    print(f"\n  k={k} {inner}/{outer}:")
    print(f"    Actual ratio = {actual_ratio:.6f}")
    print(f"    Best Fibonacci: {a_fib}/{b_fib} = {Q:.6f} (fit error: {Q_err*100:.2f}%)")
    print(f"    Predicted: R_{inner} = {ra:.4f} (actual {R[inner]:.4f}, err {err_a:+.2f}%)")
    print(f"    Predicted: R_{outer} = {rb:.4f} (actual {R[outer]:.4f}, err {err_b:+.2f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: Alternative — can we use PRODUCT for ALL pairs?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 6: Test universal PRODUCT constraint for all pairs")
print("─" * 78)

print("\nFor each pair, find best Fibonacci ratio for R_inner × R_outer and solve:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S_num, S_den = R2_SUM_TARGETS[(inner, outer)]
    S = S_num / S_den
    actual_prod = R[inner] * R[outer]

    # Find best Fibonacci ratio
    best_err = float('inf')
    best_p = None
    for a in extended_fibs:
        for b in extended_fibs:
            p = a / b
            err = abs(actual_prod / p - 1)
            if err < best_err:
                best_err = err
                best_p = (a, b, p, err)

    a_fib, b_fib, P, P_err = best_p

    # Solve: R_A × R_B = P, R_A² + R_B² = S
    # u² - S×u + P² = 0
    disc = S**2 - 4*P**2
    if disc < 0:
        print(f"\n  k={k} {inner}/{outer}: No real solution (discriminant < 0)")
        print(f"    Product target {a_fib}/{b_fib} = {P:.4f} too large for sum {S:.4f}")
        continue

    u1 = (S + math.sqrt(disc)) / 2
    u2 = (S - math.sqrt(disc)) / 2
    r_large = math.sqrt(u1)
    r_small = math.sqrt(u2)

    # Try both assignments
    err_correct = abs(r_small - R[inner])/R[inner] + abs(r_large - R[outer])/R[outer]
    err_swap = abs(r_large - R[inner])/R[inner] + abs(r_small - R[outer])/R[outer]

    if err_correct < err_swap:
        ra, rb = r_small, r_large
        note = "inner=small"
    else:
        ra, rb = r_large, r_small
        note = "inner=large"

    err_a = (ra - R[inner]) / R[inner] * 100
    err_b = (rb - R[outer]) / R[outer] * 100

    print(f"\n  k={k} {inner}/{outer}:")
    print(f"    Actual product = {actual_prod:.6f}")
    print(f"    Best Fibonacci: {a_fib}/{b_fib} = {P:.6f} (fit error: {P_err*100:.2f}%)")
    print(f"    Roots: {r_large:.4f} and {r_small:.4f}")
    print(f"    Best assignment ({note}): R_{inner} = {ra:.4f} (actual {R[inner]:.4f}, err {err_a:+.2f}%)")
    print(f"                              R_{outer} = {rb:.4f} (actual {R[outer]:.4f}, err {err_b:+.2f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: The belt proximity hypothesis
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 7: Belt proximity and coupling strength analysis")
print("─" * 78)

# Laplace-Lagrange coupling is proportional to α × b^(1)_{3/2}(α) where α = a_in/a_out
# For small α: b^(1)_{3/2}(α) ≈ 3α
# Belt position: ~2.77 AU (asteroid belt center)
BELT_CENTER = 2.77  # AU

print(f"\n{'Pair':>20}  {'k':>3}  {'α=a_in/a_out':>12}  {'Cross-belt':>10}  {'Type':>8}")
print("─" * 65)
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    alpha = SMA[inner] / SMA[outer]
    cross = "YES" if (SMA[inner] < BELT_CENTER and SMA[outer] > BELT_CENTER) else "NO"
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {k:>3}  {alpha:12.6f}  {cross:>10}  {c2type:>8}")

print("\n\nAll pairs cross the belt. Let's look at distance from belt:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d_inner = BELT_CENTER - SMA[inner]
    d_outer = SMA[outer] - BELT_CENTER
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"  k={k} {inner+'/'+outer:>18}: inner {d_inner:7.3f} AU from belt, "
          f"outer {d_outer:7.3f} AU from belt ({c2type})")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: R² as function of coupling — inner R² vs outer R²
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 8: Inner R² vs outer R² — the asymmetry pattern")
print("─" * 78)

print(f"\n{'Pair':>20}  {'R²_in':>10}  {'R²_out':>10}  {'R²_in/R²_out':>12}  {'R²_out/R²_in':>12}  {'Type':>8}")
print("─" * 80)
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    r2in = R[inner]**2
    r2out = R[outer]**2
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {r2in:10.4f}  {r2out:10.4f}  {r2in/r2out:12.4f}  {r2out/r2in:12.4f}  {c2type:>8}")

print("\nKey observation: for product pairs, R²_out >> R²_in")
print("For ratio pairs, R²_in and R²_out are more balanced")

# Fraction of R²_sum from inner planet
print(f"\n{'Pair':>20}  {'%_from_inner':>12}  {'%_from_outer':>12}  {'Type':>8}")
print("─" * 60)
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    r2in = R[inner]**2
    r2out = R[outer]**2
    r2sum = r2in + r2out
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"{inner+'/'+outer:>20}  {r2in/r2sum*100:12.2f}%  {r2out/r2sum*100:12.2f}%  {c2type:>8}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: Can we reformulate products as alternative ratios?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 9: Alternative formulations — R² ratio within pair")
print("─" * 78)

print("\nRather than R_in × R_out, try R²_out / R²_in or R_out / R_in:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    r_ratio = R[outer] / R[inner]
    r2_ratio = R[outer]**2 / R[inner]**2

    a1, b1, q1, e1 = nearest_fib_ratio(r_ratio, extended_fibs)
    a2, b2, q2, e2 = nearest_fib_ratio(r2_ratio, extended_fibs)

    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"\n  k={k} {inner+'/'+outer:>18} ({c2type}):")
    print(f"    R_out/R_in = {r_ratio:.4f} → best {a1}/{b1} = {q1:.4f} ({e1*100:+.2f}%)")
    print(f"    R²_out/R²_in = {r2_ratio:.4f} → best {a2}/{b2} = {q2:.4f} ({e2*100:+.2f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10: UNIFIED formulation — ALL pairs via R_out/R_in ratio
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 10: UNIFIED formulation — ALL pairs via R_out/R_in")
print("─" * 78)

print("\nCan we express everything with just R² sum + R_out/R_in ratio?")
print("This would eliminate the product/ratio distinction entirely.\n")

total_err = 0
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S_num, S_den = R2_SUM_TARGETS[(inner, outer)]
    S = S_num / S_den

    actual_ratio_out_in = R[outer] / R[inner]

    # Best Fibonacci match for R_out/R_in
    best = None
    best_err = float('inf')
    for a in extended_fibs:
        for b in extended_fibs:
            q = a / b
            err = abs(actual_ratio_out_in / q - 1)
            if err < best_err:
                best_err = err
                best = (a, b, q, err)

    a_fib, b_fib, Q, Q_err = best

    # Solve: R_out/R_in = Q, R_in² + R_out² = S
    # R_out = Q × R_in → R_in²(1 + Q²) = S → R_in = √(S/(1+Q²))
    r_in = math.sqrt(S / (1 + Q**2))
    r_out = Q * r_in

    err_in = (r_in - R[inner]) / R[inner] * 100
    err_out = (r_out - R[outer]) / R[outer] * 100

    # Predicted eccentricities
    i_in_rad = math.radians(mean_incl[inner])
    i_out_rad = math.radians(mean_incl[outer])
    e_pred_in = r_in * i_in_rad
    e_pred_out = r_out * i_out_rad
    e_err_in = (e_pred_in - ECC[inner]) / ECC[inner] * 100
    e_err_out = (e_pred_out - ECC[outer]) / ECC[outer] * 100

    total_err += abs(err_in) + abs(err_out)

    print(f"  k={k} {inner}/{outer}:")
    print(f"    R_out/R_in = {actual_ratio_out_in:.6f}")
    print(f"    Best Fibonacci: {a_fib}/{b_fib} = {Q:.6f} ({Q_err*100:+.2f}%)")
    print(f"    R_{inner:>7} = {r_in:.4f} (actual {R[inner]:.4f}, err {err_in:+.2f}%)")
    print(f"    R_{outer:>7} = {r_out:.4f} (actual {R[outer]:.4f}, err {err_out:+.2f}%)")
    print(f"    e_{inner:>7} = {e_pred_in:.6f} (actual {ECC[inner]:.6f}, err {e_err_in:+.2f}%)")
    print(f"    e_{outer:>7} = {e_pred_out:.6f} (actual {ECC[outer]:.6f}, err {e_err_out:+.2f}%)")

print(f"\n  Total |R| error (all 8 planets): {total_err:.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 11: Compare unified ratio vs mixed product/ratio accuracy
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 11: Accuracy comparison — unified ratio vs mixed product/ratio")
print("─" * 78)

# Mixed (original): use product for k=1,2 and ratio for k=3,4
print("\nMIXED (product for k=1,2; ratio for k=3,4):")
total_err_mixed = 0
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    S_num, S_den = R2_SUM_TARGETS[(inner, outer)]
    S = S_num / S_den
    c2type, c2_num, c2_den = C2_TARGETS[(inner, outer)]
    C2 = c2_num / c2_den

    if c2type == "product":
        P = C2
        disc = S**2 - 4*P**2
        u1 = (S + math.sqrt(disc)) / 2
        u2 = (S - math.sqrt(disc)) / 2
        r_large = math.sqrt(u1)
        r_small = math.sqrt(u2)
        # Inner gets smaller root
        ra, rb = r_small, r_large
    else:  # ratio
        Q = C2
        rb2 = S / (1 + Q**2)
        ra2 = Q**2 * rb2
        ra = math.sqrt(ra2)
        rb = math.sqrt(rb2)

    err_a = abs(ra - R[inner]) / R[inner] * 100
    err_b = abs(rb - R[outer]) / R[outer] * 100
    total_err_mixed += err_a + err_b

    # Predicted eccentricities
    i_in_rad = math.radians(mean_incl[inner])
    i_out_rad = math.radians(mean_incl[outer])
    e_pred_in = ra * i_in_rad
    e_pred_out = rb * i_out_rad
    e_err_in = (e_pred_in - ECC[inner]) / ECC[inner] * 100
    e_err_out = (e_pred_out - ECC[outer]) / ECC[outer] * 100

    print(f"  k={k} {inner:>7}/{outer:>7}: e_{inner:>7} err {e_err_in:+6.2f}%, "
          f"e_{outer:>7} err {e_err_out:+6.2f}%")

print(f"  Total |R| error: {total_err_mixed:.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 12: The assignment rule — what distinguishes product pairs?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 12: Summary — what determines the constraint type?")
print("─" * 78)

print("""
OBSERVATION 1: Product pairs (k=1,2) vs ratio pairs (k=3,4)

  k=1 Mars/Jupiter (d=5):   PRODUCT R×R = 17     → R_Mars << R_Jupiter
  k=2 Earth/Saturn (d=3):   PRODUCT R×R = 2      → R_Earth << R_Saturn
  k=3 Venus/Neptune (d=34): RATIO R_in/R_out=1/4  → R_Venus < R_Neptune (comparable)
  k=4 Mercury/Uranus (d=21):RATIO R_in/R_out=2/3  → R_Mercury ≈ R_Uranus

OBSERVATION 2: Fibonacci index of d
  Product pairs: d_idx = 4 (d=3, Earth/Saturn) and 5 (d=5, Mars/Jupiter) — SMALL d
  Ratio pairs:   d_idx = 8 (d=21, Mercury/Uranus) and 9 (d=34, Venus/Neptune) — LARGE d

  Rule candidate: d ≤ F_5 → product, d ≥ F_8 → ratio
  Or equivalently: d_idx ≤ 5 → product, d_idx ≥ 8 → ratio

OBSERVATION 3: k ≤ 2 → product, k ≥ 3 → ratio
  This is equivalent to "belt-adjacent" vs "belt-distant"

OBSERVATION 4: For product pairs, inner R² contributes <6% of R² sum
  The inner planet's eccentricity is "suppressed" relative to inclination.
  For ratio pairs, the R values are more balanced.

OBSERVATION 5: For product pairs, the inner planet has LARGER |cos(Ω-φ)|:
""")

for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    phi = math.radians(PHASE_ANGLE)
    cos_in = abs(math.cos(math.radians(OMEGA_J2000[inner]) - phi))
    cos_out = abs(math.cos(math.radians(OMEGA_J2000[outer]) - phi))
    c2type = C2_TARGETS[(inner, outer)][0]
    print(f"  k={k} |cos(Ω-φ)| inner={cos_in:.4f}, outer={cos_out:.4f} ({c2type})")

print("\n" + "=" * 78)
print("INVESTIGATION COMPLETE")
print("=" * 78)

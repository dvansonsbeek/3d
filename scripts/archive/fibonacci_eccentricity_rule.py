#!/usr/bin/env python3
"""
DIRECTION 1: Find the rule mapping d → R² target
=================================================

Systematic analysis of the AMD partition constraints to find a formula
that predicts which Fibonacci ratio belongs to which mirror pair.

If found, the chain H → ψ → inclinations → R² rule → eccentricities
would close completely (0 or 1 free parameter for all 8 planets).
"""

import sys
import os
import math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

print("=" * 78)
print("DIRECTION 1: FIND THE RULE MAPPING d → R² TARGET")
print("=" * 78)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: BUILD MASTER TABLE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 1: Master table of mirror pair properties")
print("─" * 78)

# Compute mean inclinations
INCL_MEAN = {p: compute_mean_inclination(p) for p in PLANET_NAMES}

# Compute R = e / i_mean_rad for each planet
R_VAL = {}
for p in PLANET_NAMES:
    i_rad = math.radians(INCL_MEAN[p])
    R_VAL[p] = ECC[p] / i_rad

# R² pair sums and products/ratios (from Finding 5 & 7)
# Using mean inclinations
print("\nMirror pairs — R values and R² analysis:\n")
print(f"{'Pair':<22} {'d':>3} {'F_idx':>5} {'k':>3} {'R_inner':>8} {'R_outer':>8} {'R²_sum':>10} {'R_prod/rat':>10}")
print("─" * 78)

pair_data = []
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d = D[inner]  # same for both
    # Fibonacci index
    fib_idx = {3: 4, 5: 5, 21: 8, 34: 9}[d]

    R_in = R_VAL[inner]
    R_out = R_VAL[outer]
    R2_sum = R_in**2 + R_out**2

    # Belt-adjacent pairs use product, outer pairs use ratio
    if k <= 2:  # Mars/Jupiter, Earth/Saturn
        R_constraint2 = R_in * R_out  # product
        c2_label = "product"
    else:  # Venus/Neptune, Mercury/Uranus
        R_constraint2 = R_in / R_out  # ratio (inner/outer)
        c2_label = "ratio"

    pair_data.append({
        'inner': inner, 'outer': outer, 'd': d, 'fib_idx': fib_idx,
        'k': k, 'R_in': R_in, 'R_out': R_out,
        'R2_sum': R2_sum, 'c2': R_constraint2, 'c2_label': c2_label
    })

    print(f"  {inner}/{outer:<14s} {d:>3} {fib_idx:>5} {k:>3} {R_in:>8.4f} {R_out:>8.4f} {R2_sum:>10.4f} {R_constraint2:>10.4f} ({c2_label})")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: EXPRESS R² SUMS AS F_a / F_b
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 2: R² sums as Fibonacci ratios F_a/F_b")
print("─" * 78)

# Known targets from Finding 5 (mean inclinations)
TARGETS_R2SUM = {
    ("Mars", "Jupiter"):     (377, 5),    # F_14/F_5
    ("Earth", "Saturn"):     (34, 3),     # F_9/F_4
    ("Mercury", "Uranus"):   (21, 2),     # F_8/F_3
    ("Venus", "Neptune"):    (1, 2),      # F_1/F_3 or F_2/F_3
}

TARGETS_C2 = {
    ("Mars", "Jupiter"):     (34, 2),     # product = 34/2 = 17 = F_9/F_3
    ("Earth", "Saturn"):     (2, 1),      # product = 2 = F_3
    ("Mercury", "Uranus"):   (2, 3),      # ratio = 2/3 = F_3/F_4
    ("Venus", "Neptune"):    (2, 8),      # ratio = 2/8 = F_3/F_6
}

# Fibonacci index lookup
def fib_index_of(n):
    """Return the Fibonacci index of n, or None."""
    for i, f in enumerate(FIB):
        if f == n:
            return i
    return None

print(f"\n{'Pair':<20} {'R²_sum':>8} {'Target':>8} {'F_a/F_b':>10} {'idx_a':>5} {'idx_b':>5} {'d_idx':>5} {'Error%':>8}")
print("─" * 78)

for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_R2SUM[key]
    target = num / den
    err = (pd['R2_sum'] / target - 1) * 100
    idx_a = fib_index_of(num)
    idx_b = fib_index_of(den)
    print(f"  {pd['inner']}/{pd['outer']:<12s} {pd['R2_sum']:>8.3f} {target:>8.3f} {num}/{den:<6} {str(idx_a):>5} {str(idx_b):>5} {pd['fib_idx']:>5} {err:>+8.2f}%")

print(f"\n{'Pair':<20} {'C2_val':>8} {'Target':>8} {'F_a/F_b':>10} {'idx_a':>5} {'idx_b':>5} {'Type':>8}")
print("─" * 78)

for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_C2[key]
    target = num / den
    err = (pd['c2'] / target - 1) * 100
    idx_a = fib_index_of(num)
    idx_b = fib_index_of(den)
    print(f"  {pd['inner']}/{pd['outer']:<12s} {pd['c2']:>8.4f} {target:>8.4f} {num}/{den:<6} {str(idx_a):>5} {str(idx_b):>5} {pd['c2_label']:>8} {err:>+8.2f}%")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: PATTERN ANALYSIS — FIBONACCI INDEX ARITHMETIC
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 3: Pattern analysis — Fibonacci index arithmetic")
print("─" * 78)

print("\nR² sum numerator/denominator Fibonacci INDICES vs pair properties:\n")
print(f"{'Pair':<20} {'d':>3} {'d_idx':>5} {'k':>3} {'num_idx':>7} {'den_idx':>7} {'num_idx - d_idx':>15} {'den_idx - d_idx':>15}")
print("─" * 78)

for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_R2SUM[key]
    idx_a = fib_index_of(num)
    idx_b = fib_index_of(den)
    di = pd['fib_idx']
    diff_a = idx_a - di if idx_a is not None else '?'
    diff_b = idx_b - di if idx_b is not None else '?'
    print(f"  {pd['inner']}/{pd['outer']:<12s} {pd['d']:>3} {di:>5} {pd['k']:>3} {str(idx_a):>7} {str(idx_b):>7} {str(diff_a):>15} {str(diff_b):>15}")

# Check cross-pair references
print("\nCross-pair reference analysis:")
print("Does the R² sum numerator of one pair reference another pair's d?")
for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_R2SUM[key]
    # Check if num or den equals any other pair's d
    for pd2 in pair_data:
        if pd2 is pd:
            continue
        if num == pd2['d']:
            print(f"  {pd['inner']}/{pd['outer']}: numerator {num} = d of {pd2['inner']}/{pd2['outer']}")
        if den == pd2['d']:
            print(f"  {pd['inner']}/{pd['outer']}: denominator {den} = d of {pd2['inner']}/{pd2['outer']}")

print("\nDoes the C2 constraint reference another pair's d?")
for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_C2[key]
    for pd2 in pair_data:
        if pd2 is pd:
            continue
        if num == pd2['d']:
            print(f"  {pd['inner']}/{pd['outer']}: C2 numerator {num} = d of {pd2['inner']}/{pd2['outer']}")
        if den == pd2['d']:
            print(f"  {pd['inner']}/{pd['outer']}: C2 denominator {den} = d of {pd2['inner']}/{pd2['outer']}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: SYSTEMATIC FORMULA SEARCH FOR R² SUM
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 4: Systematic formula search — R²_sum = F_f(d_idx)/F_g(d_idx)")
print("─" * 78)

# For each pair, we know d_idx. Try to express the R² sum target
# as F_{f(d_idx)} / F_{g(d_idx)} where f, g are simple functions

# Try: R²_sum = F_{a*d_idx + b} / F_{c*d_idx + d_const}
# for small integer coefficients

print("\nSearching for R²_sum = F_{a*d_idx + b} / F_{c*d_idx + d_const}...")
print("Trying a,b,c,d ∈ {-3,...,3}\n")

best_formulas = []

for a_coeff in range(-3, 4):
    for b_coeff in range(-5, 10):
        for c_coeff in range(-3, 4):
            for d_coeff in range(-5, 10):
                total_err = 0
                valid = True
                for pd in pair_data:
                    di = pd['fib_idx']
                    num_idx = a_coeff * di + b_coeff
                    den_idx = c_coeff * di + d_coeff
                    if num_idx < 0 or den_idx < 0 or num_idx > 17 or den_idx > 17:
                        valid = False
                        break
                    predicted = FIB[num_idx] / FIB[den_idx] if FIB[den_idx] > 0 else 0
                    if predicted == 0:
                        valid = False
                        break
                    err = abs(pd['R2_sum'] / predicted - 1)
                    total_err += err
                if valid and total_err < 0.1:  # < 10% total error across 4 pairs
                    best_formulas.append((total_err, a_coeff, b_coeff, c_coeff, d_coeff))

best_formulas.sort()

if best_formulas:
    print(f"Found {len(best_formulas)} formulas with <10% total error\n")
    print(f"{'Rank':<5} {'a':>3} {'b':>3} {'c':>3} {'d':>3} {'TotErr%':>10} Formula")
    print("─" * 70)
    for i, (te, a_, b_, c_, d_) in enumerate(best_formulas[:15]):
        formula = f"F_({a_}*idx + {b_}) / F_({c_}*idx + {d_})"
        print(f"{i+1:<5} {a_:>3} {b_:>3} {c_:>3} {d_:>3} {te*100:>10.3f}% {formula}")

        # Show per-pair results
        if i < 5:
            for pd in pair_data:
                di = pd['fib_idx']
                ni = a_ * di + b_
                di_ = c_ * di + d_
                pred = FIB[ni] / FIB[di_] if FIB[di_] > 0 else 0
                err = (pd['R2_sum'] / pred - 1) * 100 if pred > 0 else float('inf')
                print(f"        {pd['inner']}/{pd['outer']}: F_{ni}/F_{di_} = {FIB[ni]}/{FIB[di_]} = {pred:.3f}, actual={pd['R2_sum']:.3f}, err={err:+.2f}%")
else:
    print("No formulas found with <10% total error")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: ALTERNATIVE INPUTS — TRY k, d, F_idx pairs
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 5: Try R²_sum as function of TWO pair indices")
print("─" * 78)

# Each mirror pair has TWO d_indices (inner and outer are the same).
# But the pair also has a belt position k.
# Also try using both members' period fraction denominators

print("\nPer-pair detailed Fibonacci decomposition:\n")

for pd in pair_data:
    inner, outer = pd['inner'], pd['outer']
    key = (inner, outer)
    num, den = TARGETS_R2SUM[key]
    num2, den2 = TARGETS_C2[key]

    b_inner = PERIOD_FRAC[inner][1]
    b_outer = PERIOD_FRAC[outer][1]

    print(f"  {inner}/{outer} (d={pd['d']}, F_idx={pd['fib_idx']}, k={pd['k']}):")
    print(f"    Period fractions: b_inner={b_inner}, b_outer={b_outer}")
    print(f"    R²_sum target = {num}/{den} = {num/den:.3f}")
    print(f"    C2 target = {num2}/{den2} = {num2/den2:.4f} ({pd['c2_label']})")

    # Try to express targets using b values
    # Test: target = F_{f(b_in, b_out)} / F_{g(b_in, b_out)}
    for ai in range(0, 16):
        for bi in range(1, 16):
            if FIB[bi] == 0:
                continue
            test_val = FIB[ai] / FIB[bi]
            if abs(test_val - num/den) / (num/den) < 0.001 if num/den > 0 else test_val < 0.001:
                # Check if ai or bi relates to b_inner, b_outer
                connections = []
                if ai == b_inner: connections.append(f"num_idx={ai}=b_inner")
                if ai == b_outer: connections.append(f"num_idx={ai}=b_outer")
                if bi == b_inner: connections.append(f"den_idx={bi}=b_inner")
                if bi == b_outer: connections.append(f"den_idx={bi}=b_outer")
                if ai == b_inner + b_outer: connections.append(f"num_idx={ai}=b_inner+b_outer")
                if ai == abs(b_inner - b_outer): connections.append(f"num_idx={ai}=|b_inner-b_outer|")
                if bi == b_inner + b_outer: connections.append(f"den_idx={bi}=b_inner+b_outer")
                conn_str = ", ".join(connections) if connections else "no direct connection"
                print(f"    → F_{ai}/F_{bi} = {FIB[ai]}/{FIB[bi]} = {test_val:.4f} [{conn_str}]")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: DOES F₃=2 HAVE A STRUCTURAL ROLE?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 6: The role of F₃ = 2 in all constraints")
print("─" * 78)

print("\nF₃ = 2 = F_{b_Earth} appears in EVERY constraint:")
print("  R² sums: 21/2, 34/3, 1/2, 377/5 — denominator is 2 for outer pairs")
print("  C2: 2/3, 2/8, 2 (=2/1), 34/2 — 2 in numerator or denominator everywhere")
print()
print("F₃ = 2 is also the denominator of ψ = 2205/(2H)")
print("And F₃ = F_{b_E} where b_E = 3 is Earth's period denominator")
print()

# Test: can we factor out F₃ systematically?
# For R² sums: divide by 2 where it appears
print("R² sums with F₃=2 factored out:")
for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_R2SUM[key]
    if den == 2:
        print(f"  {pd['inner']}/{pd['outer']}: {num}/{den} = {num} / F₃  →  residual = {num} = F_{fib_index_of(num)}")
    elif num == 2:
        print(f"  {pd['inner']}/{pd['outer']}: {num}/{den} = F₃ / {den}  →  residual = 1/{den}")
    else:
        print(f"  {pd['inner']}/{pd['outer']}: {num}/{den} — F₃ not in simple position")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: VERIFY R² CONSTRAINTS WITH DIFFERENT INCLINATION DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 7: R² constraints with J2000 vs mean vs midpoint inclinations")
print("─" * 78)

# Method 1: J2000 inclinations
print("\nUsing J2000 inclinations:")
for pd in pair_data:
    inner, outer = pd['inner'], pd['outer']
    R_in = ECC[inner] / math.radians(INCL_J2000[inner])
    R_out = ECC[outer] / math.radians(INCL_J2000[outer])
    R2_sum = R_in**2 + R_out**2
    key = (inner, outer)
    num, den = TARGETS_R2SUM[key]
    target = num / den
    err = (R2_sum / target - 1) * 100
    print(f"  {inner}/{outer}: R²_sum = {R2_sum:.4f}, target {num}/{den} = {target:.4f}, err = {err:+.2f}%")

# Method 2: Mean inclinations (from ψ formula)
print("\nUsing mean inclinations (ψ-derived):")
for pd in pair_data:
    inner, outer = pd['inner'], pd['outer']
    R_in = ECC[inner] / math.radians(INCL_MEAN[inner])
    R_out = ECC[outer] / math.radians(INCL_MEAN[outer])
    R2_sum = R_in**2 + R_out**2
    key = (inner, outer)
    num, den = TARGETS_R2SUM[key]
    target = num / den
    err = (R2_sum / target - 1) * 100
    print(f"  {inner}/{outer}: R²_sum = {R2_sum:.4f}, target {num}/{den} = {target:.4f}, err = {err:+.2f}%")

# Method 3: Midpoint (mean between J2000 range)
print("\nUsing midpoint inclinations (J2000 mean = mean from ψ formula):")
print("  (These are the same as method 2 above — mean IS the midpoint)")

# Method 4: Use amplitude directly
print("\nUsing amplitude instead of mean: R_alt = e / amp_rad:")
for pd in pair_data:
    inner, outer = pd['inner'], pd['outer']
    R_in = ECC[inner] / math.radians(INCL_AMP[inner])
    R_out = ECC[outer] / math.radians(INCL_AMP[outer])
    R2_sum = R_in**2 + R_out**2
    for fib_range in range(1, 16):
        for fib_den_range in range(1, 16):
            if FIB[fib_den_range] == 0:
                continue
            test = FIB[fib_range] / FIB[fib_den_range]
            if test > 0 and abs(R2_sum / test - 1) < 0.05:
                key = (inner, outer)
                print(f"  {inner}/{outer}: R²_sum = {R2_sum:.4f} ≈ F_{fib_range}/F_{fib_den_range} = {FIB[fib_range]}/{FIB[fib_den_range]} = {test:.4f} (err {(R2_sum/test-1)*100:+.2f}%)")
                break
        else:
            continue
        break

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8: COMBINED R² + C2 — CAN WE DERIVE R_individual?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 8: Solve for individual R values from pair constraints")
print("─" * 78)

print("\nFor each pair, solve:")
print("  R²_A + R²_B = S  (R² sum)")
print("  R_A × R_B = P  or  R_A / R_B = Q  (product or ratio)")

for pd in pair_data:
    inner, outer = pd['inner'], pd['outer']
    key = (inner, outer)
    num_s, den_s = TARGETS_R2SUM[key]
    num_c, den_c = TARGETS_C2[key]
    S = num_s / den_s
    C = num_c / den_c

    print(f"\n  {inner}/{outer}: S = {num_s}/{den_s} = {S:.4f}, ", end="")

    if pd['c2_label'] == 'product':
        P = C
        print(f"P = {num_c}/{den_c} = {P:.4f} (product)")
        # R²_A + R²_B = S, R_A × R_B = P
        # (R_A + R_B)² = S + 2P, (R_A - R_B)² = S - 2P
        sum_sq = S + 2 * P
        diff_sq = S - 2 * P
        if sum_sq >= 0 and diff_sq >= 0:
            R_sum = math.sqrt(sum_sq)
            R_diff = math.sqrt(diff_sq)
            R_A = (R_sum + R_diff) / 2
            R_B = (R_sum - R_diff) / 2
            print(f"    Solved: R_{inner} = {R_A:.4f}, R_{outer} = {R_B:.4f}")
            print(f"    Actual: R_{inner} = {R_VAL[inner]:.4f}, R_{outer} = {R_VAL[outer]:.4f}")
            print(f"    Error:  {(R_A/R_VAL[inner]-1)*100:+.2f}%, {(R_B/R_VAL[outer]-1)*100:+.2f}%")
            # Predict eccentricities
            e_A = R_A * math.radians(INCL_MEAN[inner])
            e_B = R_B * math.radians(INCL_MEAN[outer])
            print(f"    Predicted e: {inner}={e_A:.5f} (actual {ECC[inner]:.5f}, err {(e_A/ECC[inner]-1)*100:+.2f}%)")
            print(f"    Predicted e: {outer}={e_B:.5f} (actual {ECC[outer]:.5f}, err {(e_B/ECC[outer]-1)*100:+.2f}%)")
    else:
        Q = C
        print(f"Q = {num_c}/{den_c} = {Q:.4f} (ratio R_inner/R_outer)")
        # R²_A + R²_B = S, R_A = Q × R_B
        # Q²R²_B + R²_B = S → R_B = √(S/(Q²+1))
        R_B = math.sqrt(S / (Q**2 + 1))
        R_A = Q * R_B
        print(f"    Solved: R_{inner} = {R_A:.4f}, R_{outer} = {R_B:.4f}")
        print(f"    Actual: R_{inner} = {R_VAL[inner]:.4f}, R_{outer} = {R_VAL[outer]:.4f}")
        print(f"    Error:  {(R_A/R_VAL[inner]-1)*100:+.2f}%, {(R_B/R_VAL[outer]-1)*100:+.2f}%")
        e_A = R_A * math.radians(INCL_MEAN[inner])
        e_B = R_B * math.radians(INCL_MEAN[outer])
        print(f"    Predicted e: {inner}={e_A:.5f} (actual {ECC[inner]:.5f}, err {(e_A/ECC[inner]-1)*100:+.2f}%)")
        print(f"    Predicted e: {outer}={e_B:.5f} (actual {ECC[outer]:.5f}, err {(e_B/ECC[outer]-1)*100:+.2f}%)")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9: SEARCH FOR UNIFIED R² FORMULA USING PHYSICAL PROPERTIES
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 9: Search for R²_sum as function of physical properties")
print("─" * 78)

print("\nTest R²_sum = f(mass_ratio, sma_ratio, d) for each pair:\n")

for pd in pair_data:
    inner, outer = pd['inner'], pd['outer']
    m_ratio = MASS[inner] / MASS[outer]
    a_ratio = SMA[inner] / SMA[outer]
    d = pd['d']
    L_ratio = math.sqrt(MASS[inner] * SMA[inner]) / math.sqrt(MASS[outer] * SMA[outer])

    print(f"  {inner}/{outer}: m_ratio={m_ratio:.6f}, a_ratio={a_ratio:.6f}, d={d}")
    print(f"    L_ratio (ang.mom.) = {L_ratio:.6f}")
    print(f"    R²_sum = {pd['R2_sum']:.4f}")
    print(f"    R²_sum × d = {pd['R2_sum'] * d:.4f}")
    print(f"    R²_sum / d = {pd['R2_sum'] / d:.6f}")
    print(f"    R²_sum × m_ratio = {pd['R2_sum'] * m_ratio:.6f}")
    print(f"    R²_sum × a_ratio = {pd['R2_sum'] * a_ratio:.6f}")

print("\n" + "=" * 78)
print("DIRECTION 1 COMPLETE")
print("=" * 78)

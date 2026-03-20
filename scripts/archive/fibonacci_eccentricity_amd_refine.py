#!/usr/bin/env python3
"""
ECCENTRICITY CONSTANT — AMD Formula Refinement
===============================================

Super-fine optimization of the breakthrough results:
  2-param: ξ × AMD^(-0.50) × i_mean^(-0.25) → 95.5%
  3-param: AMD^(-0.43) × T_incl^(0.23) × i_mean^(-0.15) → 74.3%

This script:
A. Ultra-fine grid optimization (0.001 step)
B. Planet-by-planet analysis of the best formula
C. Physical interpretation and simplification
D. What the formula predicts for each planet's eccentricity
E. Nearest simple-fraction exponents
F. Monte Carlo significance test
"""

import sys, os, math
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE ALL QUANTITIES
# ═══════════════════════════════════════════════════════════════════════════

XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
XI_V = XI_ALL['Venus']
I_RAD = {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES}
I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}
L_CIRC = {p: MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES}
AMD = {p: L_CIRC[p] * (1 - math.sqrt(1 - ECC[p]**2)) for p in PLANET_NAMES}
SQRT_A = {p: math.sqrt(SMA[p]) for p in PLANET_NAMES}

def spread(values):
    mn, mx = min(values), max(values)
    if mn <= 0: return float('inf')
    return mx / mn - 1


print("=" * 100)
print("ECCENTRICITY CONSTANT — AMD Formula Refinement")
print("=" * 100)


# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: Ultra-fine 2-param optimization
# ═══════════════════════════════════════════════════════════════════════════

print("\n─── A. Ultra-fine 2-param: ξ × AMD^α × i_mean^β ───\n")

best2 = (float('inf'), 0, 0)
for a_s in range(-600, -300):  # α around -0.5
    for b_s in range(-400, 0):  # β around -0.25
        alpha = a_s * 0.001
        beta = b_s * 0.001
        vals = [XI_ALL[p] * AMD[p]**alpha * I_MEAN_RAD[p]**beta for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            if sp < best2[0]:
                best2 = (sp, alpha, beta)

sp, alpha, beta = best2
print(f"  BEST 2-param: AMD^({alpha:.3f}) × i_mean^({beta:.3f})  spread={sp*100:.4f}%")
vals = [XI_ALL[p] * AMD[p]**alpha * I_MEAN_RAD[p]**beta for p in PLANET_NAMES]
C_mean = sum(vals) / len(vals)
print(f"  Constant C = {C_mean:.6f} (mean)")
print(f"\n  {'Planet':>10} | {'Value':>12} | {'C/C_mean':>10} | {'Deviation%':>10}")
print("  " + "─" * 55)
for j, p in enumerate(PLANET_NAMES):
    print(f"  {p:>10} | {vals[j]:>12.6f} | {vals[j]/C_mean:>10.6f} | {(vals[j]/C_mean-1)*100:>+10.4f}%")

# Check nearby simple fractions
print(f"\n  Nearby simple fractions:")
for a_try, b_try, label in [
    (-1/2, -1/4, "AMD^(-1/2) × i_mean^(-1/4)"),
    (-1/2, -1/3, "AMD^(-1/2) × i_mean^(-1/3)"),
    (-1/2, -1/5, "AMD^(-1/2) × i_mean^(-1/5)"),
    (-1/2, -2/7, "AMD^(-1/2) × i_mean^(-2/7)"),
    (-1/2, -3/13, "AMD^(-1/2) × i_mean^(-3/13)"),
    (-1/2, -1/4, "AMD^(-1/2) × i_mean^(-1/4)"),
]:
    vals = [XI_ALL[p] * AMD[p]**a_try * I_MEAN_RAD[p]**b_try for p in PLANET_NAMES]
    sp = spread(vals)
    print(f"    {label:>45s}  →  {sp*100:>8.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: Ultra-fine 3-param optimization with T_incl
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION B: Ultra-fine 3-param: ξ × AMD^α × T_incl^β × i_mean^γ")
print("=" * 100)

# Start from the coarse best: AMD^(-0.43) × T_incl^(0.23) × i_mean^(-0.15)
# Fine-tune around that
best3 = (float('inf'), 0, 0, 0)
for a_s in range(-550, -350):  # α around -0.45
    alpha = a_s * 0.001
    for b_s in range(0, 350):  # β around 0.2
        beta = b_s * 0.001
        for g_s in range(-300, 0):  # γ around -0.15
            gamma = g_s * 0.001
            vals = [XI_ALL[p] * AMD[p]**alpha * INCL_PERIOD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                if sp < best3[0]:
                    best3 = (sp, alpha, beta, gamma)

sp, alpha, beta, gamma = best3
print(f"\n  BEST 3-param: AMD^({alpha:.3f}) × T_incl^({beta:.3f}) × i_mean^({gamma:.3f})")
print(f"  Spread: {sp*100:.4f}%")

vals = [XI_ALL[p] * AMD[p]**alpha * INCL_PERIOD[p]**beta
        * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
C_mean = sum(vals) / len(vals)
print(f"  Constant C = {C_mean:.6e} (mean)")
print(f"\n  {'Planet':>10} | {'Value':>14} | {'C/C_mean':>10} | {'Deviation%':>10}")
print("  " + "─" * 60)
for j, p in enumerate(PLANET_NAMES):
    print(f"  {p:>10} | {vals[j]:>14.6e} | {vals[j]/C_mean:>10.6f} | {(vals[j]/C_mean-1)*100:>+10.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: Try i_amp instead of i_mean in the 3-param
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION C: Ultra-fine 3-param with i_amp: ξ × AMD^α × T_incl^β × i_amp^γ")
print("=" * 100)

best3a = (float('inf'), 0, 0, 0)
for a_s in range(-550, -350):
    alpha = a_s * 0.001
    for b_s in range(0, 350):
        beta = b_s * 0.001
        for g_s in range(-300, 300):
            gamma = g_s * 0.001
            vals = [XI_ALL[p] * AMD[p]**alpha * INCL_PERIOD[p]**beta
                    * I_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                if sp < best3a[0]:
                    best3a = (sp, alpha, beta, gamma)

sp, alpha, beta, gamma = best3a
print(f"\n  BEST: AMD^({alpha:.3f}) × T_incl^({beta:.3f}) × i_amp^({gamma:.3f})")
print(f"  Spread: {sp*100:.4f}%")
vals = [XI_ALL[p] * AMD[p]**alpha * INCL_PERIOD[p]**beta
        * I_RAD[p]**gamma for p in PLANET_NAMES]
C_mean = sum(vals) / len(vals)
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:>14.6e}  ({(vals[j]/C_mean-1)*100:>+7.3f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: Ultra-fine 3-param with both i_amp and i_mean (no T_incl)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION D: Ultra-fine 3-param: ξ × AMD^α × i_amp^β × i_mean^γ (no T_incl)")
print("=" * 100)

best3b = (float('inf'), 0, 0, 0)
for a_s in range(-550, -350):
    alpha = a_s * 0.001
    for b_s in range(-300, 100):
        beta = b_s * 0.001
        for g_s in range(-400, 0):
            gamma = g_s * 0.001
            vals = [XI_ALL[p] * AMD[p]**alpha * I_RAD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                if sp < best3b[0]:
                    best3b = (sp, alpha, beta, gamma)

sp, alpha, beta, gamma = best3b
print(f"\n  BEST: AMD^({alpha:.3f}) × i_amp^({beta:.3f}) × i_mean^({gamma:.3f})")
print(f"  Spread: {sp*100:.4f}%")
vals = [XI_ALL[p] * AMD[p]**alpha * I_RAD[p]**beta
        * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
C_mean = sum(vals) / len(vals)
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:>14.6e}  ({(vals[j]/C_mean-1)*100:>+7.3f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: Physical interpretation of the best 2-param formula
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION E: Physical interpretation")
print("=" * 100)

# The formula ξ × AMD^(-1/2) × i_mean^(-1/4) = C
# Expanding: e√m × (m√a × f(e))^(-1/2) × i_mean^(-1/4) = C
# where f(e) = 1-√(1-e²) ≈ e²/2
# For small e: e√m / (e√(m√a/2)) / i_mean^(1/4) = √(2/√a) / i_mean^(1/4) = C
# So: 2/√a / i_mean^(1/2) = C²
# Or: i_mean = 2/(C² × √a) ∝ 1/√a

print(f"\n  The formula says: i_mean ∝ 1/√a (approximately)")
print(f"  Check: i_mean × √a = const?")
print(f"\n  {'Planet':>10} | {'i_mean(°)':>10} | {'√a':>8} | {'i_mean°×√a':>12} | {'i_mean_rad^0.5×a^0.25':>22}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    prod = I_MEAN_DEG[p] * SQRT_A[p]
    prod2 = I_MEAN_RAD[p]**0.5 * SMA[p]**0.25
    print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {SQRT_A[p]:>8.4f} | {prod:>12.4f} | {prod2:>22.6f}")

# The outlier is Jupiter (i_mean = 0.33°, far below predicted)
# This means Jupiter has "too little" mean inclination for its distance
# OR equivalently, Jupiter has "too much" eccentricity for its low inclination

# Show what eccentricity the formula predicts
print(f"\n─── Eccentricity predictions from AMD formula ───")
# Use best 2-param: AMD^(-0.50) × i_mean^(-0.25)
sp, alpha, beta = best2
vals = [XI_ALL[p] * AMD[p]**alpha * I_MEAN_RAD[p]**beta for p in PLANET_NAMES]
C_pred = sum(vals) / len(vals)

print(f"\n  From ξ × AMD^({alpha:.3f}) × i_mean^({beta:.3f}) = {C_pred:.6f}")
print(f"  If we fix all other parameters, predict each planet's eccentricity:")
print(f"\n  {'Planet':>10} | {'e_actual':>10} | {'e_predicted':>11} | {'Δ%':>8}")
print("  " + "─" * 50)
for p in PLANET_NAMES:
    # C = e√m × (m√a f(e))^α × i_mean^β
    # This is transcendental in e due to f(e) = 1-√(1-e²)
    # For small e: f(e) ≈ e²/2
    # C ≈ e√m × (m√a e²/2)^α × i_mean^β
    # C ≈ e^(1+2α) × m^(1/2+α) × (√a)^α × 2^(-α) × i_mean^β
    # e^(1+2α) = C / (m^(1/2+α) × (√a)^α × 2^(-α) × i_mean^β)
    # e = (...)^(1/(1+2α))

    # Numerical: binary search for e that gives C_pred
    e_lo, e_hi = 1e-6, 0.5
    for _ in range(100):
        e_mid = (e_lo + e_hi) / 2
        xi_mid = e_mid * SQRT_M[p]
        amd_mid = L_CIRC[p] * (1 - math.sqrt(1 - e_mid**2))
        val_mid = xi_mid * amd_mid**alpha * I_MEAN_RAD[p]**beta
        if val_mid < C_pred:
            e_lo = e_mid
        else:
            e_hi = e_mid
    e_pred = (e_lo + e_hi) / 2
    delta = (e_pred - ECC[p]) / ECC[p] * 100
    print(f"  {p:>10} | {ECC[p]:>10.6f} | {e_pred:>11.6f} | {delta:>+7.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: Monte Carlo significance test
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION F: Monte Carlo significance test")
print("How likely is a random set of 8 eccentricities to achieve ≤95.5% spread?")
print("Keeping masses, semi-major axes, and mean inclinations fixed")
print("=" * 100)

random.seed(42)
N_TRIALS = 100000
obs_spread = best2[0]

# Generate random eccentricities with same AMD budget
count_better = 0
for _ in range(N_TRIALS):
    # Draw random eccentricities uniform in [0, max observed ecc for each class]
    rand_ecc = {}
    for p in PLANET_NAMES:
        # Uniform in [0, 0.3] (Mercury-like range)
        rand_ecc[p] = random.uniform(0.001, 0.25)

    # Compute formula values
    rand_vals = []
    valid = True
    for p in PLANET_NAMES:
        e = rand_ecc[p]
        xi = e * SQRT_M[p]
        amd = L_CIRC[p] * (1 - math.sqrt(1 - e**2))
        val = xi * amd**best2[1] * I_MEAN_RAD[p]**best2[2]
        if val <= 0:
            valid = False
            break
        rand_vals.append(val)

    if valid:
        sp = spread(rand_vals)
        if sp <= obs_spread:
            count_better += 1

p_val = count_better / N_TRIALS
print(f"\n  Observed spread: {obs_spread*100:.4f}%")
print(f"  Trials: {N_TRIALS:,}")
print(f"  Better or equal: {count_better}")
print(f"  p-value: {p_val:.6f}")
if count_better == 0:
    print(f"  p-value: < {1/N_TRIALS:.1e}")

# Also test with matched AMD total
count_matched = 0
ecc_list = [ECC[p] for p in PLANET_NAMES]
for _ in range(N_TRIALS):
    # Shuffle eccentricities among planets (keep same set of e values)
    shuffled = ecc_list.copy()
    random.shuffle(shuffled)

    rand_vals = []
    valid = True
    for j, p in enumerate(PLANET_NAMES):
        e = shuffled[j]
        xi = e * SQRT_M[p]
        amd = L_CIRC[p] * (1 - math.sqrt(1 - e**2))
        val = xi * amd**best2[1] * I_MEAN_RAD[p]**best2[2]
        if val <= 0:
            valid = False
            break
        rand_vals.append(val)

    if valid:
        sp = spread(rand_vals)
        if sp <= obs_spread:
            count_matched += 1

p_shuffle = count_matched / N_TRIALS
print(f"\n  Shuffle test (same e values, permute among planets):")
print(f"  Better or equal: {count_matched}")
print(f"  p-value: {p_shuffle:.6f}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: Simple fraction exponents — find elegant form
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION G: Search for elegant simple-fraction exponents")
print("=" * 100)

# 2-param: AMD^α × i_mean^β with simple fractions
print(f"\n─── 2-param simple fractions ───\n")
fracs = [-2, -3/2, -5/3, -1, -4/5, -3/4, -2/3, -5/8, -3/5, -1/2,
         -2/5, -3/8, -1/3, -5/13, -3/8, -1/4, -1/5, -2/13, -1/8, 0,
         1/8, 1/5, 1/4, 1/3, 3/8, 2/5, 1/2, 3/5, 5/8, 2/3, 3/4, 4/5, 1]
# Focus on a near -0.5, b near -0.25
fib_fracs = [a/b for a in range(-3, 4) for b in [1, 2, 3, 5, 8, 13, 21] if b != 0 and -1 <= a/b <= 0]
fib_fracs = sorted(set(fib_fracs))

results = []
for a_try in [-1/2, -3/5, -2/5, -3/8, -5/13, -5/8, -2/3, -1/3]:
    for b_try in [-1/2, -1/3, -1/4, -1/5, -2/5, -3/8, -2/7, -3/13, -1/8, -2/13, -5/21]:
        vals = [XI_ALL[p] * AMD[p]**a_try * I_MEAN_RAD[p]**b_try for p in PLANET_NAMES]
        sp = spread(vals)
        results.append((sp, a_try, b_try))

results.sort()
for sp, a, b in results[:20]:
    # Check if Fibonacci-related
    marker = ""
    print(f"  AMD^({a:>7.4f}) × i_mean^({b:>7.4f})  →  {sp*100:>8.4f}%{marker}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: What if we use η (= ψ/d = i_amp × √m) instead of i_mean?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION H: Replace i_mean with η = ψ/d (mass-weighted amplitude)")
print("ξ × AMD^α × η^β")
print("=" * 100)

ETA_ALL = {p: I_RAD[p] * SQRT_M[p] for p in PLANET_NAMES}

best_h = (float('inf'), 0, 0)
for a_s in range(-600, -300):
    alpha = a_s * 0.001
    for b_s in range(-400, 400):
        beta = b_s * 0.001
        vals = [XI_ALL[p] * AMD[p]**alpha * ETA_ALL[p]**beta for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            if sp < best_h[0]:
                best_h = (sp, alpha, beta)

sp, alpha, beta = best_h
print(f"\n  BEST: AMD^({alpha:.3f}) × η^({beta:.3f})  spread={sp*100:.4f}%")
vals = [XI_ALL[p] * AMD[p]**alpha * ETA_ALL[p]**beta for p in PLANET_NAMES]
C_mean = sum(vals) / len(vals)
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:>12.6f}  ({(vals[j]/C_mean-1)*100:>+7.3f}%)")

# Also: ξ × AMD^α × η^β × T_incl^γ
print(f"\n─── With T_incl: ξ × AMD^α × η^β × T_incl^γ ───")
best_ht = (float('inf'), 0, 0, 0)
for a_s in range(-55, -35):
    alpha = a_s * 0.01
    for b_s in range(-30, 30):
        beta = b_s * 0.01
        for g_s in range(0, 35):
            gamma = g_s * 0.01
            vals = [XI_ALL[p] * AMD[p]**alpha * ETA_ALL[p]**beta * INCL_PERIOD[p]**gamma
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                if sp < best_ht[0]:
                    best_ht = (sp, alpha, beta, gamma)

sp, alpha, beta, gamma = best_ht
print(f"  BEST: AMD^({alpha:.3f}) × η^({beta:.3f}) × T_incl^({gamma:.3f})  spread={sp*100:.4f}%")
vals = [XI_ALL[p] * AMD[p]**alpha * ETA_ALL[p]**beta * INCL_PERIOD[p]**gamma
        for p in PLANET_NAMES]
C_mean = sum(vals) / len(vals)
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:>14.6e}  ({(vals[j]/C_mean-1)*100:>+7.3f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION I: Express in terms of basic variables (e, m, a, i)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION I: Express formula in basic variables")
print("ξ × AMD^(-1/2) × i_mean^(-1/4) in terms of e, m, a, i_mean")
print("=" * 100)

# ξ = e × √m = e × m^(1/2)
# AMD = m × √a × (1 - √(1-e²))
# AMD^(-1/2) = 1 / √(m × √a × (1-√(1-e²)))
# i_mean^(-1/4)
#
# Full: e × m^(1/2) × (m × √a × (1-√(1-e²)))^(-1/2) × i_mean^(-1/4)
# = e × m^(1/2) × m^(-1/2) × a^(-1/4) × (1-√(1-e²))^(-1/2) × i_mean^(-1/4)
# = e / √(1-√(1-e²)) × a^(-1/4) × i_mean^(-1/4)
# = e / √f(e) × (a × i_mean)^(-1/4)
#
# For small e: f(e) = 1-√(1-e²) ≈ e²/2
# e/√(e²/2) = e/(e/√2) = √2
# So: ≈ √2 × (a × i_mean)^(-1/4)
# Mass cancels exactly!

print(f"\n  MASS CANCELS EXACTLY!")
print(f"  ξ × AMD^(-1/2) × i_mean^(-1/4) = e/√f(e) × (a × i_mean)^(-1/4)")
print(f"  where f(e) = 1 - √(1-e²)")
print(f"  For small e: ≈ √2 / (a × i_mean)^(1/4)")
print(f"  Mass m does not appear → pure geometry + eccentricity!")

print(f"\n  {'Planet':>10} | {'e/√f(e)':>10} | {'(a×i_m)^-1/4':>14} | {'product':>10} | {'√2':>8} | {'e/√f(e) vs √2':>14}")
print("  " + "─" * 90)
sqrt2 = math.sqrt(2)
for p in PLANET_NAMES:
    e = ECC[p]
    fe = 1 - math.sqrt(1 - e**2)
    e_ratio = e / math.sqrt(fe)
    geom = (SMA[p] * I_MEAN_RAD[p])**(-0.25)
    product = e_ratio * geom
    print(f"  {p:>10} | {e_ratio:>10.6f} | {geom:>14.6f} | {product:>10.6f} | {sqrt2:>8.6f} | {(e_ratio/sqrt2-1)*100:>+12.3f}%")

print(f"\n  Mercury's e/√f(e) deviates {((ECC['Mercury']/math.sqrt(1-math.sqrt(1-ECC['Mercury']**2)))/sqrt2-1)*100:.3f}% from √2")
print(f"  → The formula is NOT exactly mass-independent (e/√f(e) differs from √2 for Mercury)")
print(f"  → But mass enters ONLY through the nonlinear f(e) correction — purely eccentricity-driven")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION J: GRAND SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("GRAND SUMMARY: Best eccentricity constant formulas found")
print("=" * 100)

summary = []

# 2-param optimized
sp2, a2, b2 = best2
summary.append((f'ξ × AMD^({a2:.3f}) × i_mean^({b2:.3f})', sp2, 2, 'AMD+i_mean'))

# 2-param simple fraction
vals = [XI_ALL[p] * AMD[p]**(-0.5) * I_MEAN_RAD[p]**(-0.25) for p in PLANET_NAMES]
summary.append(('ξ × AMD^(-1/2) × i_mean^(-1/4)', spread(vals), 2, 'simple fractions'))

# 3-param with T_incl
sp3, a3, b3, g3 = best3
summary.append((f'ξ × AMD^({a3:.3f}) × T_incl^({b3:.3f}) × i_mean^({g3:.3f})', sp3, 3, 'AMD+T_incl+i_mean'))

# 3-param with i_amp (no T)
sp3b, a3b, b3b, g3b = best3b
summary.append((f'ξ × AMD^({a3b:.3f}) × i_amp^({b3b:.3f}) × i_mean^({g3b:.3f})', sp3b, 3, 'AMD+i_amp+i_mean'))

# 3-param with i_amp + T_incl
sp3a, a3a, b3a, g3a = best3a
summary.append((f'ξ × AMD^({a3a:.3f}) × T_incl^({b3a:.3f}) × i_amp^({g3a:.3f})', sp3a, 3, 'AMD+T_incl+i_amp'))

# η-based
sp_h, a_h, b_h = best_h
summary.append((f'ξ × AMD^({a_h:.3f}) × η^({b_h:.3f})', sp_h, 2, 'AMD+η'))

# Previous best (no AMD)
vals = [XI_ALL[p] * INCL_PERIOD[p]**1.70 * I_RAD[p]**0.85 * I_MEAN_RAD[p]**(-0.60)
        for p in PLANET_NAMES]
summary.append(('ξ × T_incl^1.70 × i_amp^0.85 × i_mean^-0.60', spread(vals), 3, 'prev session'))

# Fibonacci benchmark
vals = [ECC[p] * PERIOD_FRAC[p][0] / (D[p] * PERIOD_FRAC[p][1]**2) for p in PLANET_NAMES]
summary.append(('e × a/(d × b²) [Fibonacci q.n.]', spread(vals), 'Fib', 'benchmark'))

print(f"\n  {'N':>4} | {'Formula':>65} | {'Spread%':>10} | {'Type':>15}")
print("  " + "─" * 105)
for name, sp, n, typ in sorted(summary, key=lambda x: x[1]):
    marker = " ★" if sp == min(s[1] for s in summary) else ""
    print(f"  {str(n):>4} | {name:>65} | {sp*100:>10.4f}%{marker} | {typ:>15}")

print(f"\n" + "=" * 100)
print("DONE")
print("=" * 100)

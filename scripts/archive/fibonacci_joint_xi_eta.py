#!/usr/bin/env python3
"""
Joint ξ-η law: search for relationships connecting eccentricity and inclination.

Since η = ψ/d (constant law) and ξ = k×ξ_V (ladder), any joint law is
really about connecting k and d — the eccentricity and inclination quantum numbers.

Directions:
A. Power-law: ξ^α × η^β = constant → k^α / d^β = constant
B. ξ × η product: the geometric mean of orbital deviations
C. ξ/η = k×d/R as function of semi-major axis a
D. The Kozai integral: √(1-e²) × cos(i) per planet
E. log(ξ) vs log(η): do planets fall on a line?
F. The R = e/i_mean values: cross-pair Fibonacci patterns
G. ξ^α × η^β × a^γ = constant (including semi-major axis)
H. Separation into inner/outer: do separate laws exist?
I. The b (period denominator) as bridge between k and d
"""

import math
import sys
import numpy as np
sys.path.insert(0, '.')
from fibonacci_data import *

PLANET_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

# Fundamental data
ECC_ALL = {p: ECC[p] for p in PLANET_NAMES}
MASS_ALL = {p: MASS[p] for p in PLANET_NAMES}
SMA_ALL = {p: SMA[p] for p in PLANET_NAMES}
D_ALL = {p: D[p] for p in PLANET_NAMES}
XI_ALL = {p: ECC[p] * math.sqrt(MASS[p]) for p in PLANET_NAMES}
ETA_ALL = {p: PSI / D[p] for p in PLANET_NAMES}

# Period fractions
A_FRAC = {'Mercury': 8, 'Venus': 2, 'Earth': 1, 'Mars': 3,
           'Jupiter': 1, 'Saturn': 1, 'Uranus': 1, 'Neptune': 2}
B_FRAC = {'Mercury': 11, 'Venus': 1, 'Earth': 3, 'Mars': 13,
           'Jupiter': 5, 'Saturn': 8, 'Uranus': 3, 'Neptune': 1}

# Eccentricity ladder
K_LADDER = {'Mercury': 8, 'Venus': 1, 'Earth': 5/2, 'Mars': 5,
            'Jupiter': 141, 'Saturn': 85, 'Uranus': 29.5, 'Neptune': 5.8}

# Inclination amplitudes and means
I_AMP = {p: INCL_AMP[p] for p in PLANET_NAMES}  # degrees
I_MEAN = {}
for p in PLANET_NAMES:
    I_MEAN[p] = math.degrees(compute_mean_inclination(p))

# Fibonacci numbers
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
LUCAS = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322]

xi_V = XI_ALL['Venus']
R_master = PSI / xi_V

print("=" * 100)
print("JOINT ξ-η LAW — Searching for eccentricity-inclination connection")
print("=" * 100)

# =====================================================================
# A. POWER-LAW SEARCH: ξ^α × η^β = constant
# =====================================================================
print(f"\n{'='*100}")
print("A. POWER-LAW: ξ^α × η^β = constant")
print(f"{'='*100}")

print(f"""
  Since ξ = k×ξ_V and η = ψ/d, this becomes:
    (k×ξ_V)^α × (ψ/d)^β = C
    k^α × d^(-β) = C / (ξ_V^α × ψ^β)  = constant

  So we're really looking for: k^α / d^β = constant
  Or equivalently: k = A × d^(β/α)
""")

xi_arr = np.array([XI_ALL[p] for p in PLANET_NAMES])
eta_arr = np.array([ETA_ALL[p] for p in PLANET_NAMES])
k_arr = np.array([K_LADDER[p] for p in PLANET_NAMES])
d_arr = np.array([D_ALL[p] for p in PLANET_NAMES], dtype=float)
a_arr = np.array([SMA_ALL[p] for p in PLANET_NAMES])
m_arr = np.array([MASS_ALL[p] for p in PLANET_NAMES])
b_arr = np.array([B_FRAC[p] for p in PLANET_NAMES], dtype=float)
a_frac_arr = np.array([A_FRAC[p] for p in PLANET_NAMES], dtype=float)

# Search k^α / d^β = const
print(f"  Search: k^α / d^β = const (or equivalently ξ^α × η^β = const)")
best_spread = 1e10
best_a = best_b = 0
for a10 in range(-30, 31):
    for b10 in range(-30, 31):
        alpha = a10 / 10
        beta = b10 / 10
        if alpha == 0 and beta == 0: continue
        combo = xi_arr**alpha * eta_arr**beta
        if min(combo) > 0:
            sp = (max(combo)/min(combo) - 1) * 100
            if sp < best_spread:
                best_spread = sp
                best_a = alpha
                best_b = beta

print(f"  Best: ξ^{best_a:.1f} × η^{best_b:.1f} → spread {best_spread:.1f}%")
combo = xi_arr**best_a * eta_arr**best_b
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo[i]:.6e}")

# Fine search around best
print(f"\n  Fine search around best:")
for a100 in range(int(best_a*100)-20, int(best_a*100)+21):
    for b100 in range(int(best_b*100)-20, int(best_b*100)+21):
        alpha = a100 / 100
        beta = b100 / 100
        if alpha == 0 and beta == 0: continue
        combo = xi_arr**alpha * eta_arr**beta
        if min(combo) > 0:
            sp = (max(combo)/min(combo) - 1) * 100
            if sp < best_spread:
                best_spread = sp
                best_a = alpha
                best_b = beta

print(f"  Best: ξ^{best_a:.2f} × η^{best_b:.2f} → spread {best_spread:.1f}%")
# This is equivalent to k^α / d^β
alpha_kd = best_a
beta_kd = -best_b
print(f"  = k^{alpha_kd:.2f} × d^{beta_kd:.2f} = const (up to fixed ξ_V, ψ factors)")

combo = xi_arr**best_a * eta_arr**best_b
for i, p in enumerate(PLANET_NAMES):
    k = K_LADDER[PLANET_NAMES[i]]
    d = D_ALL[PLANET_NAMES[i]]
    print(f"    {p:>10}: ξ^α×η^β = {combo[i]:.6e}, k^α×d^β = {k**alpha_kd * d**beta_kd:.4f}")

# =====================================================================
# B. ξ × η PRODUCT: geometric mean of orbital deviations
# =====================================================================
print(f"\n{'='*100}")
print("B. ξ × η PRODUCT")
print(f"{'='*100}")

print(f"""
  ξ × η = (e×√m) × (i_amp×√m) = e × i_amp × m

  This is proportional to e × i_amp × m — the product of both orbital
  deviations weighted by mass. It's NOT the AMD (which uses e² + i²).

  ξ×η = k×ξ_V × ψ/d = k/d × ξ_V × ψ = k/d × ψ²/R
""")

print(f"  {'Planet':>10} | {'ξ':>12} | {'η':>12} | {'ξ×η':>14} | {'k':>8} | {'d':>4} | {'k/d':>10} | {'d×ξ×η':>14} | {'d²×ξ×η':>14}")
print("  " + "─" * 120)
xi_eta = {}
for p in PLANET_NAMES:
    xi = XI_ALL[p]
    eta = ETA_ALL[p]
    prod = xi * eta
    xi_eta[p] = prod
    k = K_LADDER[p]
    d = D_ALL[p]
    print(f"  {p:>10} | {xi:>12.4e} | {eta:>12.4e} | {prod:>14.6e} | {k:>8.1f} | {d:>4} | {k/d:>10.4f} | {d*prod:>14.6e} | {d**2*prod:>14.6e}")

vals = list(xi_eta.values())
print(f"\n  Spread of ξ×η: {(max(vals)/min(vals)-1)*100:.1f}%")
vals_d = [D_ALL[p] * xi_eta[p] for p in PLANET_NAMES]
print(f"  Spread of d×ξ×η: {(max(vals_d)/min(vals_d)-1)*100:.1f}%")

# k/d values
print(f"\n  k/d values (= ξ/η × R/d²):")
kd_ratios = {}
for p in PLANET_NAMES:
    k = K_LADDER[p]
    d = D_ALL[p]
    kd_ratios[p] = k/d
    print(f"    {p:>10}: k/d = {k/d:.4f}")

# Sort by k/d
sorted_kd = sorted(kd_ratios.items(), key=lambda x: x[1])
print(f"\n  Sorted by k/d:")
for p, v in sorted_kd:
    print(f"    {p:>10}: k/d = {v:.4f}")

# Do k/d ratios between planets give Fibonacci?
print(f"\n  Ratios of adjacent k/d values:")
for i in range(len(sorted_kd)-1):
    p1, v1 = sorted_kd[i]
    p2, v2 = sorted_kd[i+1]
    ratio = v2/v1
    closest_fib_ratio = min([(f2/f1, f1, f2) for f1 in FIB[:10] for f2 in FIB[:10] if f1 > 0 and f2 > f1],
                           key=lambda x: abs(x[0] - ratio))
    print(f"    {p2:>10}/{p1:<10}: {v2:.4f}/{v1:.4f} = {ratio:.4f} ≈ {closest_fib_ratio[2]}/{closest_fib_ratio[1]} = {closest_fib_ratio[0]:.4f} ({(ratio/closest_fib_ratio[0]-1)*100:+.1f}%)")

# =====================================================================
# C. ξ/η AS FUNCTION OF SEMI-MAJOR AXIS
# =====================================================================
print(f"\n{'='*100}")
print("C. ξ/η = e/i_amp AS FUNCTION OF a")
print(f"{'='*100}")

print(f"""
  ξ/η = k×d/R (dimensionless ratio, mass cancels)
  Does this follow a smooth curve as function of a?
""")

print(f"  {'Planet':>10} | {'a (AU)':>8} | {'ξ/η':>12} | {'k×d/R':>10} | {'k×d':>8} | {'log(a)':>8} | {'log(ξ/η)':>10}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    xi = XI_ALL[p]
    eta = ETA_ALL[p]
    a = SMA_ALL[p]
    kd = K_LADDER[p] * D_ALL[p]
    print(f"  {p:>10} | {a:>8.3f} | {xi/eta:>12.6f} | {kd/R_master:>10.6f} | {kd:>8.1f} | {math.log10(a):>8.4f} | {math.log10(xi/eta):>10.4f}")

# Try: ξ/η = C × a^γ
print(f"\n  Power-law fit: ξ/η = C × a^γ")
log_a = np.log(a_arr)
log_ratio = np.log(xi_arr / eta_arr)

# Linear regression: log(ξ/η) = γ×log(a) + log(C)
from numpy.polynomial import polynomial as P
coeffs = np.polyfit(log_a, log_ratio, 1)
gamma = coeffs[0]
logC = coeffs[1]
C_fit = math.exp(logC)
print(f"  Best fit: ξ/η = {C_fit:.4f} × a^{gamma:.4f}")
residuals = log_ratio - (gamma * log_a + logC)
print(f"  Residuals (in log space):")
for i, p in enumerate(PLANET_NAMES):
    pred = C_fit * a_arr[i]**gamma
    actual = xi_arr[i] / eta_arr[i]
    err_pct = (pred/actual - 1) * 100
    print(f"    {p:>10}: actual={actual:.6f}, pred={pred:.6f}, err={err_pct:+.1f}%")

# =====================================================================
# D. THE KOZAI INTEGRAL: √(1-e²) × cos(i)
# =====================================================================
print(f"\n{'='*100}")
print("D. KOZAI-LIDOV INTEGRAL: √(1-e²) × cos(i)")
print(f"{'='*100}")

print(f"""
  In the Kozai-Lidov mechanism, the quantity:
    K = √(1-e²) × cos(i)
  is conserved for a test particle under a distant perturber.

  For the full N-body problem this isn't exactly conserved,
  but it connects e and i. Does it show structure?
""")

print(f"  Using i_amp:")
print(f"  {'Planet':>10} | {'e':>8} | {'i_amp°':>8} | {'√(1-e²)':>10} | {'cos(i)':>10} | {'K':>12} | {'d×K':>10} | {'1-K':>12}")
print("  " + "─" * 100)
K_kozai_amp = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    i_rad = math.radians(I_AMP[p])
    sqr = math.sqrt(1 - e**2)
    cosi = math.cos(i_rad)
    K = sqr * cosi
    K_kozai_amp[p] = K
    d = D_ALL[p]
    print(f"  {p:>10} | {e:>8.4f} | {I_AMP[p]:>8.4f} | {sqr:>10.6f} | {cosi:>10.8f} | {K:>12.8f} | {d*K:>10.6f} | {1-K:>12.8e}")

print(f"\n  Using i_mean:")
print(f"  {'Planet':>10} | {'e':>8} | {'i_mean°':>8} | {'K':>12} | {'1-K':>12} | {'d×(1-K)':>12} | {'d²×(1-K)':>12}")
print("  " + "─" * 100)
K_kozai_mean = {}
one_minus_K = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    i_rad = math.radians(I_MEAN[p])
    K = math.sqrt(1 - e**2) * math.cos(i_rad)
    K_kozai_mean[p] = K
    omK = 1 - K
    one_minus_K[p] = omK
    d = D_ALL[p]
    print(f"  {p:>10} | {e:>8.4f} | {I_MEAN[p]:>8.4f} | {K:>12.8f} | {omK:>12.6e} | {d*omK:>12.6e} | {d**2*omK:>12.6e}")

# 1-K ≈ e²/2 + i²/2 for small e, i (same as AMD per unit m√a!)
print(f"\n  Note: 1-K ≈ (e² + i²)/2 for small angles — same as AMD/m√a")
print(f"  So Kozai integral ≈ 1 - AMD/(m√a) for each planet")

# Does d × (1-K) show pattern?
vals_dk = [D_ALL[p] * one_minus_K[p] for p in PLANET_NAMES]
print(f"\n  Spread of d×(1-K): {(max(vals_dk)/min(vals_dk)-1)*100:.1f}%")

# Does d² × (1-K) = d² × (e²+i²)/2?
vals_d2k = [D_ALL[p]**2 * one_minus_K[p] for p in PLANET_NAMES]
print(f"  Spread of d²×(1-K): {(max(vals_d2k)/min(vals_d2k)-1)*100:.1f}%")

# Optimize: d^α × (1-K) = const
best_sp = 1e10
best_alpha = 0
for a10 in range(-30, 31):
    alpha = a10/10
    combo = d_arr**alpha * np.array([one_minus_K[p] for p in PLANET_NAMES])
    if min(combo) > 0:
        sp = (max(combo)/min(combo) - 1) * 100
        if sp < best_sp:
            best_sp = sp
            best_alpha = alpha
print(f"  Best d^α × (1-K): d^{best_alpha:.1f} → spread {best_sp:.1f}%")

# =====================================================================
# E. LOG-LOG PLOT: log(ξ) vs log(η)
# =====================================================================
print(f"\n{'='*100}")
print("E. LOG-LOG ANALYSIS: log(ξ) vs log(η)")
print(f"{'='*100}")

print(f"""
  If ξ^α × η^β = C, then α×log(ξ) + β×log(η) = log(C)
  → log(ξ) = -(β/α)×log(η) + log(C)/α
  → linear relationship in log-log space

  But since η takes only 4 values (d∈{{3,5,21,34}}), the log-log "plot"
  has only 4 distinct η values with 2 planets each.
""")

print(f"  {'Planet':>10} | {'log₁₀(ξ)':>12} | {'log₁₀(η)':>12} | {'d':>4} | {'k':>8}")
print("  " + "─" * 55)
for p in PLANET_NAMES:
    xi = XI_ALL[p]
    eta = ETA_ALL[p]
    print(f"  {p:>10} | {math.log10(xi):>12.4f} | {math.log10(eta):>12.4f} | {D_ALL[p]:>4} | {K_LADDER[p]:>8.1f}")

# Group by d (η level)
print(f"\n  Grouped by η level (d value):")
groups = {}
for p in PLANET_NAMES:
    d = D_ALL[p]
    if d not in groups:
        groups[d] = []
    groups[d].append(p)

for d in sorted(groups.keys()):
    planets = groups[d]
    eta = PSI / d
    print(f"\n  d={d}, η={eta:.6e} (log={math.log10(eta):.4f}):")
    for p in planets:
        xi = XI_ALL[p]
        k = K_LADDER[p]
        print(f"    {p:>10}: ξ={xi:.6e} (log={math.log10(xi):.4f}), k={k}, k_ratio={K_LADDER[planets[0]]/K_LADDER[planets[1]] if len(planets)==2 else 'N/A':.4f}")

# Within each η level, what's the ξ ratio?
print(f"\n  Within each d-group, ξ₁/ξ₂ = k₁/k₂:")
for d in sorted(groups.keys()):
    planets = groups[d]
    if len(planets) == 2:
        p1, p2 = planets
        xi1, xi2 = XI_ALL[p1], XI_ALL[p2]
        k1, k2 = K_LADDER[p1], K_LADDER[p2]
        ratio = xi1/xi2
        print(f"  d={d}: {p1}/{p2} = {xi1:.4e}/{xi2:.4e} = {ratio:.4f} (k₁/k₂ = {k1/k2:.4f})")

# =====================================================================
# F. LAW 4 R VALUES AND CROSS-PAIR PATTERNS
# =====================================================================
print(f"\n{'='*100}")
print("F. LAW 4 CONSTRAINT VALUES")
print(f"{'='*100}")

print(f"""
  Law 4 gives two constraints per mirror pair.
  Belt-adjacent pairs use product, outer pairs use ratio.

  R = e / i_mean for each planet.
  Can we find a pattern in how the Law 4 Fibonacci numbers
  relate to d for each pair?
""")

# Compute R values
R_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    i_mean_rad = math.radians(I_MEAN[p])
    R_vals[p] = e / i_mean_rad

mirror_pairs = [
    ('Mars', 'Jupiter', 5, '34/3', '2', 'product'),
    ('Earth', 'Saturn', 3, '34/3', '2', 'product'),
    ('Venus', 'Neptune', 34, '1/2', '2/8', 'ratio'),
    ('Mercury', 'Uranus', 21, '21/2', '2/3', 'ratio'),
]

print(f"  {'Pair':>20} | {'d':>4} | {'R₁':>10} | {'R₂':>10} | {'R₁²+R₂²':>10} | {'R₁×R₂':>10} | {'R₁/R₂':>10} | {'Fib sum':>10} | {'Fib prod/ratio':>14}")
print("  " + "─" * 110)
for p1, p2, d, fib_sum, fib_pr, ptype in mirror_pairs:
    R1 = R_vals[p1]
    R2 = R_vals[p2]
    print(f"  {p1+'/'+p2:>20} | {d:>4} | {R1:>10.6f} | {R2:>10.6f} | {R1**2+R2**2:>10.6f} | {R1*R2:>10.6f} | {R1/R2:>10.6f} | {fib_sum:>10} | {fib_pr:>14}")

# The Fibonacci constraint values: do they relate to d?
print(f"""
  Constraint values by pair:
  d= 5 (Mars/Jup):   R²₁+R²₂ = 34/3 = F₉/F₄ = {34/3:.4f},  R₁R₂ = 2 = F₃
  d= 3 (Earth/Sat):  R²₁+R²₂ = 34/3 = F₉/F₄ = {34/3:.4f},  R₁R₂ = 2 = F₃
  d=34 (Venus/Nep):  R²₁+R²₂ = 1/2  = F₁/F₃ = 0.5000,     R₁/R₂ = 2/8 = F₃/F₆
  d=21 (Merc/Ura):   R²₁+R²₂ = 21/2 = F₈/F₃ = {21/2:.4f},  R₁/R₂ = 2/3 = F₃/F₄

  Pattern in R² sums:
  d= 3,5 (belt-adj):  R²₁+R²₂ = 34/3 = F₉/F₄ = 11.333
  d=21:                R²₁+R²₂ = 21/2 = F₈/F₃ = 10.500
  d=34:                R²₁+R²₂ =  1/2 = F₁/F₃ =  0.500

  Interesting: the Fibonacci INDICES in the sum:
  d= 3,5:  F₉/F₄  → indices 9,4
  d=21=F₈: F₈/F₃  → indices 8,3  (numerator index = index of d!)
  d=34=F₉: F₁/F₃  → indices 1,3
""")

# Check: for d=F_n, is the R² sum = F_n/F₃?
# d=3=F₄: 34/3 — this would be F₉/F₄, not F₄/F₃
# d=5=F₅: 34/3 — same
# d=21=F₈: 21/2 = F₈/F₃ ← YES, d/F₃
# d=34=F₉: 1/2 = F₁/F₃ ← no, not d/F₃

# What about using the actual constraint equations to derive k from d?
print(f"\n  DERIVING k FROM R AND d:")
print(f"  For belt-adjacent pairs (product constraint R₁×R₂ = 2):")
print(f"    R = e/i_mean. Since e = k×ξ_V/√m and i_mean depends on secular precession,")
print(f"    R is NOT simply proportional to k.")
print(f"    But: ξ = e√m = R × i_mean × √m, and if i_mean were ∝ ψ/(d√m),")
print(f"    then ξ ∝ R × ψ/d, so k ∝ R × R_master/d")

print(f"\n  Check: k vs R × R/d  (where R = e/i_mean):")
print(f"  {'Planet':>10} | {'R_planet':>10} | {'R×R_mast/d':>12} | {'k':>8} | {'err':>8}")
print("  " + "─" * 55)
for p in PLANET_NAMES:
    R_p = R_vals[p]
    d = D_ALL[p]
    predicted_k = R_p * R_master / d
    k = K_LADDER[p]
    err = (predicted_k/k - 1) * 100
    print(f"  {p:>10} | {R_p:>10.6f} | {predicted_k:>12.4f} | {k:>8.1f} | {err:>+8.1f}%")

# =====================================================================
# G. ξ^α × η^β × a^γ = constant
# =====================================================================
print(f"\n{'='*100}")
print("G. THREE-PARAMETER: ξ^α × η^β × a^γ = constant")
print(f"{'='*100}")

print(f"  Adding semi-major axis as a bridge between ξ and η")

best_spread = 1e10
best_params = (0, 0, 0)
for a10 in range(-20, 21):
    for b10 in range(-20, 21):
        for g10 in range(-20, 21):
            alpha = a10/10
            beta = b10/10
            gamma = g10/10
            if alpha == 0 and beta == 0 and gamma == 0: continue
            combo = xi_arr**alpha * eta_arr**beta * a_arr**gamma
            if min(combo) > 0:
                sp = (max(combo)/min(combo) - 1) * 100
                if sp < best_spread:
                    best_spread = sp
                    best_params = (alpha, beta, gamma)

a, b, g = best_params
print(f"  Best: ξ^{a:.1f} × η^{b:.1f} × a^{g:.1f} → spread {best_spread:.1f}%")
combo = xi_arr**a * eta_arr**b * a_arr**g
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo[i]:.6e}")

# Fine search
best_spread2 = best_spread
best_params2 = best_params
for a100 in range(int(a*100)-15, int(a*100)+16):
    for b100 in range(int(b*100)-15, int(b*100)+16):
        for g100 in range(int(g*100)-15, int(g*100)+16):
            aa = a100/100
            bb = b100/100
            gg = g100/100
            combo = xi_arr**aa * eta_arr**bb * a_arr**gg
            if min(combo) > 0:
                sp = (max(combo)/min(combo) - 1) * 100
                if sp < best_spread2:
                    best_spread2 = sp
                    best_params2 = (aa, bb, gg)

a2, b2, g2 = best_params2
print(f"\n  Fine: ξ^{a2:.2f} × η^{b2:.2f} × a^{g2:.2f} → spread {best_spread2:.1f}%")
combo2 = xi_arr**a2 * eta_arr**b2 * a_arr**g2
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo2[i]:.6e}")

# =====================================================================
# H. INNER vs OUTER: separate laws?
# =====================================================================
print(f"\n{'='*100}")
print("H. SEPARATE INNER/OUTER LAWS")
print(f"{'='*100}")

inner = ['Mercury', 'Venus', 'Earth', 'Mars']
outer = ['Jupiter', 'Saturn', 'Uranus', 'Neptune']

for group_name, group in [('INNER', inner), ('OUTER', outer)]:
    print(f"\n  {group_name} planets:")
    xi_g = np.array([XI_ALL[p] for p in group])
    eta_g = np.array([ETA_ALL[p] for p in group])
    a_g = np.array([SMA_ALL[p] for p in group])

    # ξ^α × η^β search
    best_sp = 1e10
    best_ab = (0, 0)
    for a10 in range(-30, 31):
        for b10 in range(-30, 31):
            alpha = a10/10
            beta = b10/10
            if alpha == 0 and beta == 0: continue
            combo = xi_g**alpha * eta_g**beta
            if min(combo) > 0:
                sp = (max(combo)/min(combo) - 1) * 100
                if sp < best_sp:
                    best_sp = sp
                    best_ab = (alpha, beta)

    aa, bb = best_ab
    print(f"    ξ^{aa:.1f} × η^{bb:.1f} → spread {best_sp:.1f}%")
    combo = xi_g**aa * eta_g**bb
    for i, p in enumerate(group):
        print(f"      {p:>10}: {combo[i]:.6e} (k={K_LADDER[p]}, d={D_ALL[p]})")

    # ξ^α × η^β × a^γ
    best_sp2 = 1e10
    best_abg = (0, 0, 0)
    for a10 in range(-20, 21):
        for b10 in range(-20, 21):
            for g10 in range(-20, 21):
                alpha = a10/10
                beta = b10/10
                gamma = g10/10
                if alpha == 0 and beta == 0 and gamma == 0: continue
                combo = xi_g**alpha * eta_g**beta * a_g**gamma
                if min(combo) > 0:
                    sp = (max(combo)/min(combo) - 1) * 100
                    if sp < best_sp2:
                        best_sp2 = sp
                        best_abg = (alpha, beta, gamma)

    aa2, bb2, gg2 = best_abg
    print(f"    ξ^{aa2:.1f} × η^{bb2:.1f} × a^{gg2:.1f} → spread {best_sp2:.1f}%")
    combo = xi_g**aa2 * eta_g**bb2 * a_g**gg2
    for i, p in enumerate(group):
        print(f"      {p:>10}: {combo[i]:.6e}")

# =====================================================================
# I. THE b (PERIOD DENOMINATOR) AS BRIDGE
# =====================================================================
print(f"\n{'='*100}")
print("I. PERIOD DENOMINATOR b AS BRIDGE BETWEEN k AND d")
print(f"{'='*100}")

print(f"""
  Each planet has: d (inclination divisor), k (eccentricity multiplier),
  b (period denominator), a_frac (period numerator).
  Period = (a/b) × H.

  Can b connect k and d?
  d = b × F for some Fibonacci F (the "coupling quantum number").
  So b divides d: d/b = F.
""")

print(f"  {'Planet':>10} | {'d':>4} | {'k':>8} | {'b':>4} | {'a':>4} | {'F=d/b':>8} | {'k/b':>8} | {'k×b':>8} | {'k/F':>8} | {'k×F':>8}")
print("  " + "─" * 90)
for p in PLANET_NAMES:
    d = D_ALL[p]
    k = K_LADDER[p]
    b = B_FRAC[p]
    a_f = A_FRAC[p]
    F = d / b
    print(f"  {p:>10} | {d:>4} | {k:>8.1f} | {b:>4} | {a_f:>4} | {F:>8.4f} | {k/b:>8.4f} | {k*b:>8.1f} | {k/F:>8.4f} | {k*F:>8.1f}")

# Check k/b and k×F patterns
print(f"\n  k/b values: does this simplify?")
for p in PLANET_NAMES:
    k = K_LADDER[p]
    b = B_FRAC[p]
    ratio = k/b
    # Check if ratio is Fibonacci or half-Fibonacci
    closest = min(FIB[:10] + [f/2 for f in FIB[:10]], key=lambda f: abs(f - ratio) if f > 0 else 999)
    print(f"    {p:>10}: k/b = {ratio:.4f} ≈ {closest} ({(ratio/closest-1)*100:+.1f}%)" if closest > 0 else f"    {p:>10}: k/b = {ratio:.4f}")

# k/F = k×b/d values
print(f"\n  k×b/d = k/F values:")
for p in PLANET_NAMES:
    k = K_LADDER[p]
    b = B_FRAC[p]
    d = D_ALL[p]
    val = k*b/d
    print(f"    {p:>10}: k×b/d = {val:.4f}")

# Try: k × b^α / d^β = const
print(f"\n  Search: k × b^α / d^β = const:")
best_sp = 1e10
for a10 in range(-30, 31):
    for b10 in range(-30, 31):
        alpha = a10/10
        beta = b10/10
        combo = k_arr * b_arr**alpha / d_arr**beta
        if min(combo) > 0:
            sp = (max(combo)/min(combo) - 1) * 100
            if sp < best_sp:
                best_sp = sp
                best_ab = (alpha, beta)
aa, bb = best_ab
print(f"  Best: k × b^{aa:.1f} / d^{bb:.1f} → spread {best_sp:.1f}%")
combo = k_arr * b_arr**aa / d_arr**bb
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo[i]:.4f}")

# Full: k^α × b^β × d^γ = const
print(f"\n  Full: k^α × b^β × d^γ = const:")
best_sp = 1e10
for a10 in range(-20, 21):
    for b10 in range(-20, 21):
        for g10 in range(-20, 21):
            alpha = a10/10
            beta = b10/10
            gamma = g10/10
            if alpha == 0 and beta == 0 and gamma == 0: continue
            combo = k_arr**alpha * b_arr**beta * d_arr**gamma
            if min(combo) > 0:
                sp = (max(combo)/min(combo) - 1) * 100
                if sp < best_sp:
                    best_sp = sp
                    best_abg = (alpha, beta, gamma)
aa, bb, gg = best_abg
print(f"  Best: k^{aa:.1f} × b^{bb:.1f} × d^{gg:.1f} → spread {best_sp:.1f}%")
combo = k_arr**aa * b_arr**bb * d_arr**gg
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo[i]:.4f}")

# =====================================================================
# J. EXHAUSTIVE: k^α × d^β × b^γ × a_frac^δ = const
# =====================================================================
print(f"\n{'='*100}")
print("J. EXHAUSTIVE: k^α × d^β × b^γ × a_frac^δ = const")
print(f"{'='*100}")

best_sp = 1e10
best_4 = (0,0,0,0)
for a10 in range(-15, 16):
    for b10 in range(-15, 16):
        for g10 in range(-15, 16):
            for d10 in range(-15, 16):
                alpha = a10/10
                beta = b10/10
                gamma = g10/10
                delta = d10/10
                if alpha == 0 and beta == 0 and gamma == 0 and delta == 0: continue
                combo = k_arr**alpha * d_arr**beta * b_arr**gamma * a_frac_arr**delta
                if min(combo) > 0:
                    sp = (max(combo)/min(combo) - 1) * 100
                    if sp < best_sp:
                        best_sp = sp
                        best_4 = (alpha, beta, gamma, delta)

aa, bb, gg, dd = best_4
print(f"  Best: k^{aa:.1f} × d^{bb:.1f} × b^{gg:.1f} × a_frac^{dd:.1f} → spread {best_sp:.1f}%")
combo = k_arr**aa * d_arr**bb * b_arr**gg * a_frac_arr**dd
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo[i]:.4f} (k={K_LADDER[p]}, d={D_ALL[p]}, b={B_FRAC[p]}, a={A_FRAC[p]})")

# =====================================================================
# K. PHYSICAL: ξ^α × η^β × T_incl^γ = const (using precession period)
# =====================================================================
print(f"\n{'='*100}")
print("K. WITH PRECESSION PERIOD: ξ^α × η^β × T^γ = const")
print(f"{'='*100}")

T_arr = np.array([INCL_PERIOD[p] for p in PLANET_NAMES])

best_spread = 1e10
for a10 in range(-20, 21):
    for b10 in range(-20, 21):
        for g10 in range(-20, 21):
            alpha = a10/10
            beta = b10/10
            gamma = g10/10
            if alpha == 0 and beta == 0 and gamma == 0: continue
            combo = xi_arr**alpha * eta_arr**beta * T_arr**gamma
            if min(combo) > 0:
                sp = (max(combo)/min(combo) - 1) * 100
                if sp < best_spread:
                    best_spread = sp
                    best_params = (alpha, beta, gamma)

a, b, g = best_params
print(f"  Best: ξ^{a:.1f} × η^{b:.1f} × T^{g:.1f} → spread {best_spread:.1f}%")
combo = xi_arr**a * eta_arr**b * T_arr**g
for i, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {combo[i]:.6e}")

# =====================================================================
# SUMMARY
# =====================================================================
print(f"\n{'='*100}")
print("SUMMARY — JOINT ξ-η LAW RESULTS")
print(f"{'='*100}")

print(f"""
  SEARCH RESULTS (spread = max/min - 1):

  A. ξ^α × η^β = const
     → Best reduces to k^α/d^β = const
     → This is the fundamental question: how do k and d relate?

  G. ξ^α × η^β × a^γ = const
     → Adding a as bridge

  H. Inner/outer separate laws

  I. Period denominator b as bridge: k^α × b^β × d^γ = const

  J. All quantum numbers: k^α × d^β × b^γ × a_frac^δ = const

  K. With precession period: ξ^α × η^β × T^γ = const

  KEY FINDING: The k/d connection through b and F=d/b (coupling number)
""")

print("=" * 100)
print("DONE")
print("=" * 100)

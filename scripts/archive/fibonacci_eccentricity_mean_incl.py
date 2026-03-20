#!/usr/bin/env python3
"""
ECCENTRICITY CONSTANT — Role of Mean Inclination
=================================================

The mean inclination (baseline around which each planet oscillates) differs
significantly from the amplitude. Could it play a damping/scaling role in
the eccentricity formula?

Formula candidates:
  ξ × T^α × i_amp^β × i_mean^γ = constant?
  ξ × T^α × i_mean^β = constant?

Mean inclinations from the Holistic model table:
  mean = i_J2000 - amp × cos(Ω_J2000 - φ_group)
"""

import sys, os, math
from itertools import product as iprod

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE ALL QUANTITIES
# ═══════════════════════════════════════════════════════════════════════════

XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
XI_V = XI_ALL['Venus']
I_RAD = {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES}

# Mean inclination (degrees) from model: i_J2000 - amp * cos(Ω - φ)
I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}

# Ratio: amplitude / mean  (how much of the inclination is oscillation)
AMP_OVER_MEAN = {p: INCL_AMP[p] / I_MEAN_DEG[p] if I_MEAN_DEG[p] > 0 else float('inf')
                 for p in PLANET_NAMES}

# Mean inclination mass-weighted: i_mean × √m
ETA_MEAN = {p: I_MEAN_RAD[p] * SQRT_M[p] for p in PLANET_NAMES}

# Total inclination budget: amp + mean (in some sense)
I_TOTAL_RAD = {p: math.radians(INCL_J2000[p]) for p in PLANET_NAMES}

print("=" * 90)
print("ECCENTRICITY CONSTANT — Role of Mean Inclination")
print("=" * 90)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: Diagnostic — show all inclination components
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n{'Planet':>10} | {'ξ/ξ_V':>8} | {'e':>10} | {'i_amp(°)':>8} | {'i_mean(°)':>9} | {'i_J2000(°)':>10} | {'amp/mean':>8} | {'η_amp':>10} | {'η_mean':>10} | {'T_prec':>8}")
print("─" * 130)
for p in PLANET_NAMES:
    print(f"{p:>10} | {XI_ALL[p]/XI_V:>8.3f} | {ECC[p]:.6f} | {INCL_AMP[p]:>8.4f} | {I_MEAN_DEG[p]:>9.4f} | {INCL_J2000[p]:>10.4f} | {AMP_OVER_MEAN[p]:>8.4f} | {I_RAD[p]*SQRT_M[p]:>10.4e} | {ETA_MEAN[p]:>10.4e} | {INCL_PERIOD[p]:>8.0f}")

print(f"\nKey observation: Mercury has highest mean (6.73°) and moderate ξ/ξ_V (7.9)")
print(f"                Jupiter has lowest mean (0.33°) and highest ξ/ξ_V (141)")
print(f"                Venus/Neptune mirror: similar mean, amp/mean very different")


# ═══════════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════════

EXPONENTS = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]
COARSE = [-2, -1, -1/2, 0, 1/2, 1, 2]

def fmt_exp(e):
    fracs = {-2: '-2', -1.5: '-3/2', -1: '-1', -2/3: '-2/3', -0.5: '-1/2',
             -1/3: '-1/3', 0: '0', 1/3: '1/3', 0.5: '1/2', 2/3: '2/3',
             1: '1', 1.5: '3/2', 2: '2'}
    for k, v in fracs.items():
        if abs(e - k) < 0.001:
            return v
    return f'{e:.3f}'

def spread(values):
    mn, mx = min(values), max(values)
    if mn <= 0: return float('inf')
    return mx / mn - 1


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: ξ × i_mean^α — single parameter
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION B: ξ × i_mean^α = constant?")
print("=" * 90)

print(f"\n  {'α':>6s} | {'Spread %':>10s} | Mercury    Venus      Earth      Mars       Jupiter    Saturn     Uranus     Neptune")
print("  " + "─" * 110)
for alpha in EXPONENTS:
    if alpha == 0: continue
    vals = [XI_ALL[p] * I_MEAN_RAD[p]**alpha for p in PLANET_NAMES]
    sp = spread(vals)
    val_str = "  ".join(f"{v:>9.4e}" for v in vals)
    print(f"  {fmt_exp(alpha):>6s} | {sp*100:>10.2f} | {val_str}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: ξ × T^α × i_mean^β — two parameters
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION C: ξ × T_prec^α × i_mean^β = constant?")
print("=" * 90)

best_c = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * INCL_PERIOD[p]**alpha * I_MEAN_RAD[p]**beta
                for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_c.append((sp, alpha, beta, vals))

best_c.sort()
print(f"\nTop 20:\n")
for i, (sp, a, b, vals) in enumerate(best_c[:20]):
    print(f"  {i+1:>2}. ξ × T^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s})  →  spread {sp*100:>8.2f}%")

# Details + refine top 3
for i, (sp, a, b, vals) in enumerate(best_c[:3]):
    print(f"\n  Rank {i+1}: ξ × T^({fmt_exp(a)}) × i_mean^({fmt_exp(b)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    # Fine refinement
    best_ref = (sp, a, b)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            a2, b2 = a+da, b+db
            vals2 = [XI_ALL[p] * INCL_PERIOD[p]**a2 * I_MEAN_RAD[p]**b2 for p in PLANET_NAMES]
            if min(vals2) > 0:
                sp2 = spread(vals2)
                if sp2 < best_ref[0]:
                    best_ref = (sp2, a2, b2)
    print(f"  → Refined: T^({best_ref[1]:.3f}) × i_mean^({best_ref[2]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: ξ × T^α × i_amp^β × i_mean^γ — three parameters
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION D: ξ × T^α × i_amp^β × i_mean^γ = constant?")
print("(Using both inclination components)")
print("=" * 90)

best_d = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        for gamma in EXPONENTS:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * INCL_PERIOD[p]**alpha * I_RAD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_d.append((sp, alpha, beta, gamma, vals))

best_d.sort()
print(f"\nTop 30:\n")
for i, (sp, a, b, g, vals) in enumerate(best_d[:30]):
    print(f"  {i+1:>2}. ξ × T^({fmt_exp(a):>5s}) × i_amp^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  spread {sp*100:>8.2f}%")

# Details + refine top 5
for i, (sp, a, b, g, vals) in enumerate(best_d[:5]):
    print(f"\n  Rank {i+1}: ξ × T^({fmt_exp(a)}) × i_amp^({fmt_exp(b)}) × i_mean^({fmt_exp(g)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    # Fine refinement
    best_ref = (sp, a, b, g, vals)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            for dg in [j*0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * INCL_PERIOD[p]**a2 * I_RAD[p]**b2
                         * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2, vals2)
    sp2, a2, b2, g2, vals2 = best_ref
    print(f"  → Refined: T^({a2:.3f}) × i_amp^({b2:.3f}) × i_mean^({g2:.3f})  spread={sp2*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"      {p:>10}: {vals2[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: Replace i_amp with amp/mean ratio
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION E: ξ × T^α × (amp/mean)^β = constant?")
print("amp/mean measures what fraction of inclination is oscillation")
print("=" * 90)

best_e = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * INCL_PERIOD[p]**alpha * AMP_OVER_MEAN[p]**beta
                for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_e.append((sp, alpha, beta, vals))

best_e.sort()
print(f"\nTop 20:\n")
for i, (sp, a, b, vals) in enumerate(best_e[:20]):
    print(f"  {i+1:>2}. ξ × T^({fmt_exp(a):>5s}) × (amp/mean)^({fmt_exp(b):>5s})  →  spread {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, vals) in enumerate(best_e[:3]):
    print(f"\n  Rank {i+1}: ξ × T^({fmt_exp(a)}) × (amp/mean)^({fmt_exp(b)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}  (amp/mean = {AMP_OVER_MEAN[p]:.4f})")

    best_ref = (sp, a, b)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            a2, b2 = a+da, b+db
            vals2 = [XI_ALL[p] * INCL_PERIOD[p]**a2 * AMP_OVER_MEAN[p]**b2 for p in PLANET_NAMES]
            if min(vals2) > 0:
                sp2 = spread(vals2)
                if sp2 < best_ref[0]:
                    best_ref = (sp2, a2, b2)
    print(f"  → Refined: T^({best_ref[1]:.3f}) × (amp/mean)^({best_ref[2]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: 4-param with mean: ξ × T^α × i_amp^β × i_mean^γ × a^δ
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION F: ξ × T^α × i_amp^β × i_mean^γ × a^δ = constant?")
print("(Best 3-param + semi-major axis)")
print("=" * 90)

best_f = []
for alpha in COARSE:
    for beta in COARSE:
        for gamma in COARSE:
            for delta in COARSE:
                if alpha == 0 and beta == 0 and gamma == 0 and delta == 0: continue
                vals = [XI_ALL[p] * INCL_PERIOD[p]**alpha * I_RAD[p]**beta
                        * I_MEAN_RAD[p]**gamma * SMA[p]**delta for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp = spread(vals)
                    best_f.append((sp, alpha, beta, gamma, delta, vals))

best_f.sort()
print(f"\nTested {len(best_f)} combinations\n")
print("Top 30:\n")
for i, (sp, a, b, g, d, vals) in enumerate(best_f[:30]):
    print(f"  {i+1:>2}. ξ×T^({fmt_exp(a):>5s})×i_amp^({fmt_exp(b):>5s})×i_mean^({fmt_exp(g):>5s})×a^({fmt_exp(d):>5s})  →  spread {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, g, d, vals) in enumerate(best_f[:3]):
    print(f"\n  Rank {i+1}: ξ × T^({fmt_exp(a)}) × i_amp^({fmt_exp(b)}) × i_mean^({fmt_exp(g)}) × a^({fmt_exp(d)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b, g, d, vals)
    step = 0.1
    for da in [j*step for j in range(-5, 6)]:
        for db in [j*step for j in range(-5, 6)]:
            for dg in [j*step for j in range(-5, 6)]:
                for dd in [j*step for j in range(-5, 6)]:
                    a2, b2, g2, d2 = a+da, b+db, g+dg, d+dd
                    vals2 = [XI_ALL[p] * INCL_PERIOD[p]**a2 * I_RAD[p]**b2
                             * I_MEAN_RAD[p]**g2 * SMA[p]**d2 for p in PLANET_NAMES]
                    if min(vals2) > 0:
                        sp2 = spread(vals2)
                        if sp2 < best_ref[0]:
                            best_ref = (sp2, a2, b2, g2, d2, vals2)
    sp2, a2, b2, g2, d2, vals2 = best_ref
    print(f"  → Refined: T^({a2:.3f})×i_amp^({b2:.3f})×i_mean^({g2:.3f})×a^({d2:.3f})  spread={sp2*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"      {p:>10}: {vals2[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: Mass-weighted mean inclination: η_mean = i_mean × √m
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION G: Using η_mean = i_mean × √m (mass-weighted mean inclination)")
print("=" * 90)

print(f"\n  {'Planet':>10} | {'η_mean':>10} | {'η_amp':>10} | {'η_m/η_a':>10} | {'ξ':>10} | {'ξ/η_mean':>10}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    eta_m = ETA_MEAN[p]
    eta_a = I_RAD[p] * SQRT_M[p]
    print(f"  {p:>10} | {eta_m:.4e} | {eta_a:.4e} | {eta_m/eta_a:>10.4f} | {XI_ALL[p]:.4e} | {XI_ALL[p]/eta_m:>10.4f}")

# ξ × η_mean^α
print(f"\n─── ξ × η_mean^α ───")
for alpha in EXPONENTS:
    if alpha == 0: continue
    vals = [XI_ALL[p] * ETA_MEAN[p]**alpha for p in PLANET_NAMES]
    sp = spread(vals)
    if sp < 50:  # only show good ones
        print(f"  α={fmt_exp(alpha):>5s}  →  spread {sp*100:>8.2f}%")

# ξ × η_mean^α × T^β
print(f"\n─── ξ × η_mean^α × T^β ───")
best_g = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * ETA_MEAN[p]**alpha * INCL_PERIOD[p]**beta
                for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_g.append((sp, alpha, beta, vals))
best_g.sort()
print(f"Top 15:")
for i, (sp, a, b, vals) in enumerate(best_g[:15]):
    print(f"  {i+1:>2}. ξ × η_mean^({fmt_exp(a):>5s}) × T^({fmt_exp(b):>5s})  →  spread {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: Reverse-engineer T_prec using i_mean
# If ξ × T^(3/2) × i_amp^(2/3) × i_mean^γ = C, what γ minimizes spread?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION H: Fix T=T_prec, find optimal γ in ξ × T^(3/2) × i_amp^(2/3) × i_mean^γ")
print("(Adding mean inclination to the original best formula)")
print("=" * 90)

print(f"\n  {'γ':>6s} | {'Spread%':>10s} | Mercury    Venus      Earth      Mars       Jupiter    Saturn     Uranus     Neptune")
print("  " + "─" * 120)

best_gamma = (float('inf'), 0, [])
for g_step in range(-40, 41):
    gamma = g_step * 0.05
    vals = [XI_ALL[p] * INCL_PERIOD[p]**1.5 * I_RAD[p]**(2/3) * I_MEAN_RAD[p]**gamma
            for p in PLANET_NAMES]
    sp = spread(vals)
    if sp < best_gamma[0]:
        best_gamma = (sp, gamma, vals)
    if g_step % 4 == 0:  # print every 0.2
        val_str = "  ".join(f"{v:>9.3e}" for v in vals)
        print(f"  {gamma:>6.2f} | {sp*100:>10.2f} | {val_str}")

sp, gamma, vals = best_gamma
print(f"\n  BEST: γ = {gamma:.2f}, spread = {sp*100:.4f}%")
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:.6e}")

# Now optimize all three exponents together
print(f"\n─── Full optimization: ξ × T^α × i_amp^β × i_mean^γ ───")
best_full = (float('inf'), 0, 0, 0, [])
for a_s in range(-10, 31):  # α from -0.5 to 3.0
    for b_s in range(-20, 21):  # β from -1 to 1
        for g_s in range(-20, 21):  # γ from -1 to 1
            alpha = a_s * 0.1
            beta = b_s * 0.05
            gamma = g_s * 0.05
            vals = [XI_ALL[p] * INCL_PERIOD[p]**alpha * I_RAD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                if sp < best_full[0]:
                    best_full = (sp, alpha, beta, gamma, vals)

sp, alpha, beta, gamma, vals = best_full
print(f"\n  BEST: T^({alpha:.2f}) × i_amp^({beta:.2f}) × i_mean^({gamma:.2f})")
print(f"  Spread: {sp*100:.4f}%")
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:.6e}")

# Now compute required T_prec for perfect constant with this formula
C_target = sum(vals) / len(vals)  # use mean as target
print(f"\n  Target C = {C_target:.6e}")
print(f"\n  Required T_prec for perfect constant:")
print(f"  {'Planet':>10} | {'T_required':>12} | {'T_current':>10} | {'Δ%':>8} | {'T_req/H':>10} | {'Nearest':>10}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    xi = XI_ALL[p]
    i_a = I_RAD[p]
    i_m = I_MEAN_RAD[p]
    # C = ξ × T^α × i_amp^β × i_mean^γ  →  T = (C / (ξ × i_amp^β × i_mean^γ))^(1/α)
    if alpha != 0:
        T_req = (C_target / (xi * i_a**beta * i_m**gamma))**(1/alpha)
    else:
        T_req = float('inf')
    T_cur = INCL_PERIOD[p]
    delta = (T_req - T_cur) / T_cur * 100
    ratio = T_req / H

    # Find nearest Fibonacci fraction
    best_frac = None
    best_err = float('inf')
    for a_n in range(1, 20):
        for b_n in [1, 2, 3, 5, 8, 11, 13, 21, 34]:
            frac = a_n / b_n
            err = abs(ratio - frac) / max(ratio, 0.001)
            if err < best_err:
                best_err = err
                best_frac = (a_n, b_n, err)
    a_n, b_n, err = best_frac
    print(f"  {p:>10} | {T_req:>12.0f} | {T_cur:>10.0f} | {delta:>+7.2f}% | {ratio:>10.6f} | {a_n:>3}/{b_n:<3} ({err*100:.2f}%)")


print(f"\n" + "=" * 90)
print("DONE")
print("=" * 90)

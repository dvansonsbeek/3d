#!/usr/bin/env python3
"""
ECCENTRICITY CONSTANT — Deep AMD Exploration
=============================================

Following up on the breakthrough: ξ × AMD^(-1/2) × i_mean^(-1/2) → 141.5%

Key insight: AMD_i = m_i × √a_i × (1 - √(1-e_i²))
For small e: AMD ≈ m√a × e²/2, so ξ/√AMD ≈ √(2/√a)
The formula encodes ξ ∝ √(i_mean × √a) — a relationship between
eccentricity, mean inclination, and distance.

This script explores:
A. The AMD^(-1/2) result in detail
B. Adding T_incl to the AMD formula
C. Alternative AMD-derived quantities (AMD/L_circ, relative AMD)
D. Full optimization with AMD + T_incl + inclination quantities
E. Physical interpretation: does i_mean × √a = const hold?
F. What the formula predicts for each planet's eccentricity
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
I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}

# Angular momentum quantities
L_CIRC = {p: MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES}
AMD = {p: L_CIRC[p] * (1 - math.sqrt(1 - ECC[p]**2)) for p in PLANET_NAMES}

# AMD relative to circular: AMD/L_circ = 1 - √(1-e²) ≈ e²/2
AMD_REL = {p: AMD[p] / L_CIRC[p] for p in PLANET_NAMES}

# AMD fraction of total system AMD
AMD_TOTAL = sum(AMD.values())
AMD_FRAC = {p: AMD[p] / AMD_TOTAL for p in PLANET_NAMES}

# √a
SQRT_A = {p: math.sqrt(SMA[p]) for p in PLANET_NAMES}

# AMD eccentricity: e_AMD = √(2 × AMD_rel) = √(2 × (1 - √(1-e²)))
E_AMD = {p: math.sqrt(2 * AMD_REL[p]) for p in PLANET_NAMES}

# Inclination AMD: AMD_incl = m√a × (1 - cos(i)) ≈ m√a × i²/2
AMD_INCL = {p: L_CIRC[p] * (1 - math.cos(math.radians(INCL_J2000[p])))
            for p in PLANET_NAMES}
AMD_INCL_MEAN = {p: L_CIRC[p] * (1 - math.cos(math.radians(I_MEAN_DEG[p])))
                 for p in PLANET_NAMES}

# Total AMD (ecc + incl) per planet
AMD_SUM = {p: AMD[p] + AMD_INCL[p] for p in PLANET_NAMES}

# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
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
    return f'{e:.2f}'

def spread(values):
    mn, mx = min(values), max(values)
    if mn <= 0: return float('inf')
    return mx / mn - 1

print("=" * 100)
print("ECCENTRICITY CONSTANT — Deep AMD Exploration")
print("=" * 100)


# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: AMD^(-1/2) result in detail
# ═══════════════════════════════════════════════════════════════════════════

print("\n─── A. Diagnostic: AMD quantities ───\n")
print(f"  {'Planet':>10} | {'ξ':>10} | {'AMD':>10} | {'AMD_rel':>10} | {'L_circ':>10} | {'AMD_incl':>10} | {'AMD_i_mn':>10} | {'ξ/√AMD':>10} | {'i_mean×√a':>10}")
print("  " + "─" * 120)
for p in PLANET_NAMES:
    xia = XI_ALL[p] / math.sqrt(AMD[p])
    ima = I_MEAN_DEG[p] * SQRT_A[p]
    print(f"  {p:>10} | {XI_ALL[p]:.4e} | {AMD[p]:.4e} | {AMD_REL[p]:.4e} | {L_CIRC[p]:.4e} | {AMD_INCL[p]:.4e} | {AMD_INCL_MEAN[p]:.4e} | {xia:>10.6f} | {ima:>10.4f}")

print(f"\n  ξ/√AMD spread: {spread([XI_ALL[p]/math.sqrt(AMD[p]) for p in PLANET_NAMES])*100:.2f}%")
print(f"  i_mean×√a spread: {spread([I_MEAN_DEG[p]*SQRT_A[p] for p in PLANET_NAMES])*100:.2f}%")

# Verify: ξ/√AMD ≈ √(2/√a) for small e
print(f"\n─── Verification: ξ/√AMD vs √(2/√a) ───\n")
print(f"  {'Planet':>10} | {'ξ/√AMD':>10} | {'√(2/√a)':>10} | {'Δ%':>8} | {'e':>8} | {'f(e)/(e²/2)':>12}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    xia = XI_ALL[p] / math.sqrt(AMD[p])
    approx = math.sqrt(2 / SQRT_A[p])
    delta = (xia - approx) / approx * 100
    fe = 1 - math.sqrt(1 - ECC[p]**2)
    ratio = fe / (ECC[p]**2 / 2) if ECC[p] > 0 else 1.0
    print(f"  {p:>10} | {xia:>10.6f} | {approx:>10.6f} | {delta:>+7.3f}% | {ECC[p]:>8.6f} | {ratio:>12.6f}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: ξ × AMD^α × i_mean^β — fine grid
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION B: ξ × AMD^α × i_mean^β — fine grid optimization")
print("=" * 100)

best_b = []
for a_s in range(-30, 1):  # AMD exponent (negative expected)
    for b_s in range(-30, 1):  # i_mean exponent (negative expected)
        alpha = a_s * 0.05
        beta = b_s * 0.05
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * AMD[p]**alpha * I_MEAN_RAD[p]**beta for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_b.append((sp, alpha, beta, vals))

best_b.sort()
print(f"\nTop 20:")
for i, (sp, a, b, _) in enumerate(best_b[:20]):
    print(f"  {i+1:>2}. AMD^({a:>6.3f}) × i_mean^({b:>6.3f})  →  {sp*100:>8.4f}%")

# Show details of best
sp, a, b, vals = best_b[0]
print(f"\n  BEST: AMD^({a:.3f}) × i_mean^({b:.3f})  spread={sp*100:.4f}%")
for j, p in enumerate(PLANET_NAMES):
    print(f"    {p:>10}: {vals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: AMD + T_incl
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION C: ξ × AMD^α × T_incl^β (combine AMD with Fibonacci timescale)")
print("=" * 100)

best_c = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * AMD[p]**alpha * INCL_PERIOD[p]**beta for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_c.append((sp, alpha, beta, vals))

best_c.sort()
print(f"\nTop 20:")
for i, (sp, a, b, _) in enumerate(best_c[:20]):
    print(f"  {i+1:>2}. AMD^({fmt_exp(a):>5s}) × T_incl^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, vals) in enumerate(best_c[:3]):
    print(f"\n  Rank {i+1}: AMD^({fmt_exp(a)}) × T_incl^({fmt_exp(b)})  spread={sp*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            a2, b2 = a+da, b+db
            vals2 = [XI_ALL[p] * AMD[p]**a2 * INCL_PERIOD[p]**b2 for p in PLANET_NAMES]
            if min(vals2) > 0:
                sp2 = spread(vals2)
                if sp2 < best_ref[0]:
                    best_ref = (sp2, a2, b2)
    print(f"  → Refined: AMD^({best_ref[1]:.3f}) × T_incl^({best_ref[2]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: AMD + T_incl + i_mean (3-param with AMD)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION D: ξ × AMD^α × T_incl^β × i_mean^γ (3-param)")
print("=" * 100)

best_d = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        for gamma in EXPONENTS:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * AMD[p]**alpha * INCL_PERIOD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_d.append((sp, alpha, beta, gamma, vals))

best_d.sort()
print(f"\nTop 30:")
for i, (sp, a, b, g, _) in enumerate(best_d[:30]):
    print(f"  {i+1:>2}. AMD^({fmt_exp(a):>5s}) × T_incl^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")

# Refine top 5
for i, (sp, a, b, g, vals) in enumerate(best_d[:5]):
    print(f"\n  Rank {i+1}: AMD^({fmt_exp(a)}) × T_incl^({fmt_exp(b)}) × i_mean^({fmt_exp(g)})  spread={sp*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b, g)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            for dg in [j*0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * AMD[p]**a2 * INCL_PERIOD[p]**b2
                         * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2)
    print(f"  → Refined: AMD^({best_ref[1]:.3f}) × T_incl^({best_ref[2]:.3f}) × i_mean^({best_ref[3]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: AMD + i_amp + i_mean (without T_incl)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION E: ξ × AMD^α × i_amp^β × i_mean^γ (no precession period)")
print("=" * 100)

best_e = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        for gamma in EXPONENTS:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * AMD[p]**alpha * I_RAD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_e.append((sp, alpha, beta, gamma, vals))

best_e.sort()
print(f"\nTop 20:")
for i, (sp, a, b, g, _) in enumerate(best_e[:20]):
    print(f"  {i+1:>2}. AMD^({fmt_exp(a):>5s}) × i_amp^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, g, vals) in enumerate(best_e[:3]):
    print(f"\n  Rank {i+1}: AMD^({fmt_exp(a)}) × i_amp^({fmt_exp(b)}) × i_mean^({fmt_exp(g)})  spread={sp*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b, g)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            for dg in [j*0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * AMD[p]**a2 * I_RAD[p]**b2
                         * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2)
    print(f"  → Refined: AMD^({best_ref[1]:.3f}) × i_amp^({best_ref[2]:.3f}) × i_mean^({best_ref[3]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: Alternative AMD quantities
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION F: Alternative AMD-derived quantities")
print("Using AMD_rel, AMD_incl, AMD_sum, AMD_frac")
print("=" * 100)

AMD_VARIANTS = {
    'AMD_rel':      AMD_REL,        # 1-√(1-e²) (dimensionless)
    'AMD_incl':     AMD_INCL,       # m√a(1-cos(i_J2000))
    'AMD_incl_mn':  AMD_INCL_MEAN,  # m√a(1-cos(i_mean))
    'AMD_sum':      AMD_SUM,        # AMD_ecc + AMD_incl
    'AMD_frac':     AMD_FRAC,       # AMD_ecc / total system AMD
}

for vname, vdata in AMD_VARIANTS.items():
    # ξ × variant^α × i_mean^β
    best = []
    for alpha in EXPONENTS:
        for beta in EXPONENTS:
            if alpha == 0 and beta == 0: continue
            vals = [XI_ALL[p] * vdata[p]**alpha * I_MEAN_RAD[p]**beta
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best.append((sp, alpha, beta))
    best.sort()
    print(f"\n─── ξ × {vname}^α × i_mean^β ───")
    for i, (sp, a, b) in enumerate(best[:5]):
        print(f"    {i+1}. {vname}^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")

    # ξ × variant^α × i_mean^β × T_incl^γ
    best3 = []
    for alpha in COARSE:
        for beta in COARSE:
            for gamma in COARSE:
                if alpha == 0 and beta == 0 and gamma == 0: continue
                vals = [XI_ALL[p] * vdata[p]**alpha * I_MEAN_RAD[p]**beta
                        * INCL_PERIOD[p]**gamma for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp = spread(vals)
                    best3.append((sp, alpha, beta, gamma))
    best3.sort()
    print(f"  + T_incl:")
    for i, (sp, a, b, g) in enumerate(best3[:3]):
        print(f"    {i+1}. {vname}^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s}) × T_incl^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: 4-param: AMD + T_incl + i_amp + i_mean
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION G: 4-param: ξ × AMD^α × T_incl^β × i_amp^γ × i_mean^δ")
print("=" * 100)

best_g = []
for a in COARSE:
    for b in COARSE:
        for g in COARSE:
            for d in COARSE:
                if a == 0 and b == 0 and g == 0 and d == 0: continue
                vals = [XI_ALL[p] * AMD[p]**a * INCL_PERIOD[p]**b
                        * I_RAD[p]**g * I_MEAN_RAD[p]**d for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp = spread(vals)
                    best_g.append((sp, a, b, g, d, vals))

best_g.sort()
print(f"\nTop 20:")
for i, (sp, a, b, g, d, _) in enumerate(best_g[:20]):
    print(f"  {i+1:>2}. AMD^({fmt_exp(a):>5s}) × T_incl^({fmt_exp(b):>5s}) × i_amp^({fmt_exp(g):>5s}) × i_mean^({fmt_exp(d):>5s})  →  {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, g, d, vals) in enumerate(best_g[:3]):
    print(f"\n  Rank {i+1}: AMD^({fmt_exp(a)}) × T_incl^({fmt_exp(b)}) × i_amp^({fmt_exp(g)}) × i_mean^({fmt_exp(d)})")
    print(f"  Spread: {sp*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b, g, d)
    step = 0.1
    for da in [j*step for j in range(-5, 6)]:
        for db in [j*step for j in range(-5, 6)]:
            for dg in [j*step for j in range(-5, 6)]:
                for dd in [j*step for j in range(-5, 6)]:
                    a2, b2, g2, d2 = a+da, b+db, g+dg, d+dd
                    vals2 = [XI_ALL[p] * AMD[p]**a2 * INCL_PERIOD[p]**b2
                             * I_RAD[p]**g2 * I_MEAN_RAD[p]**d2 for p in PLANET_NAMES]
                    if min(vals2) > 0:
                        sp2 = spread(vals2)
                        if sp2 < best_ref[0]:
                            best_ref = (sp2, a2, b2, g2, d2)
    sp2, a2, b2, g2, d2 = best_ref
    print(f"  → Refined: AMD^({a2:.2f}) × T_incl^({b2:.2f}) × i_amp^({g2:.2f}) × i_mean^({d2:.2f})  spread={sp2*100:.4f}%")
    # Show refined values
    vals2 = [XI_ALL[p] * AMD[p]**a2 * INCL_PERIOD[p]**b2
             * I_RAD[p]**g2 * I_MEAN_RAD[p]**d2 for p in PLANET_NAMES]
    for j, p in enumerate(PLANET_NAMES):
        print(f"      {p:>10}: {vals2[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: Physical interpretation — decompose AMD formula
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION H: Physical decomposition of the AMD formula")
print("ξ × AMD^(-1/2) × i_mean^(-1/2) ≈ √(2/√a) × 1/√i_mean")
print("Does this simplify to: 2 / (i_mean × √a) = C² ?")
print("=" * 100)

# The formula says: ξ / √(AMD × i_mean) = C
# For small e: ξ/√AMD ≈ √(2/√a), so the formula becomes √(2/(√a × i_mean)) = C
# Equivalently: i_mean × √a = 2/C²

product = {p: I_MEAN_RAD[p] * SQRT_A[p] for p in PLANET_NAMES}
product_deg = {p: I_MEAN_DEG[p] * SQRT_A[p] for p in PLANET_NAMES}
print(f"\n  {'Planet':>10} | {'i_mean(°)':>10} | {'√a':>10} | {'i_mean°×√a':>12} | {'i_mean_rad×√a':>14} | {'ξ/√(AMD×i_m)':>14}")
print("  " + "─" * 90)
for p in PLANET_NAMES:
    val = XI_ALL[p] / math.sqrt(AMD[p] * I_MEAN_RAD[p])
    print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {SQRT_A[p]:>10.4f} | {product_deg[p]:>12.4f} | {product[p]:>14.6f} | {val:>14.6f}")

print(f"\n  i_mean°×√a spread: {spread(list(product_deg.values()))*100:.2f}%")
print(f"  Full formula spread: {spread([XI_ALL[p]/math.sqrt(AMD[p]*I_MEAN_RAD[p]) for p in PLANET_NAMES])*100:.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION I: Try replacing AMD with m×√a directly
# Since AMD ≈ m√a × e²/2, the formula might work with m√a
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION I: Decompose AMD — try m×√a (= L_circ) and e separately")
print("ξ = e√m, so ξ × (m√a)^α × i_mean^β = e × m^(1/2+α) × a^(α/2) × i_mean^β")
print("=" * 100)

# ξ × L_circ^α × i_mean^β
best_i = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * L_CIRC[p]**alpha * I_MEAN_RAD[p]**beta
                for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_i.append((sp, alpha, beta))

best_i.sort()
print(f"\nTop 15: ξ × L_circ^α × i_mean^β")
for i, (sp, a, b) in enumerate(best_i[:15]):
    print(f"  {i+1:>2}. L_circ^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")

# ξ × √a^α × i_mean^β (just the geometric part)
best_ia = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * SQRT_A[p]**alpha * I_MEAN_RAD[p]**beta
                for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_ia.append((sp, alpha, beta))

best_ia.sort()
print(f"\nTop 15: ξ × √a^α × i_mean^β")
for i, (sp, a, b) in enumerate(best_ia[:15]):
    print(f"  {i+1:>2}. √a^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION J: AMD_rel instead of AMD (removes mass and √a dependence)
# AMD_rel = 1 - √(1-e²) ≈ e²/2
# ξ × AMD_rel^α = e√m × (e²/2)^α — pure eccentricity information
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION J: AMD_rel = 1-√(1-e²) ≈ e²/2 (removes m, a)")
print("ξ × AMD_rel^α × i_mean^β × T_incl^γ")
print("=" * 100)

best_j = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        for gamma in EXPONENTS:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * AMD_REL[p]**alpha * I_MEAN_RAD[p]**beta
                    * INCL_PERIOD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_j.append((sp, alpha, beta, gamma))

best_j.sort()
print(f"\nTop 20:")
for i, (sp, a, b, g) in enumerate(best_j[:20]):
    print(f"  {i+1:>2}. AMD_rel^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s}) × T_incl^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, g) in enumerate(best_j[:3]):
    best_ref = (sp, a, b, g)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            for dg in [j*0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * AMD_REL[p]**a2 * I_MEAN_RAD[p]**b2
                         * INCL_PERIOD[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2)
    print(f"  Rank {i+1}: AMD_rel^({fmt_exp(a)})×i_mean^({fmt_exp(b)})×T_incl^({fmt_exp(g)}) → refined: AMD_rel^({best_ref[1]:.3f})×i_mean^({best_ref[2]:.3f})×T_incl^({best_ref[3]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION K: GRAND SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION K: GRAND SUMMARY — All approaches compared")
print("=" * 100)

summary = []

# 1-param
vals = [XI_ALL[p] / math.sqrt(AMD[p]) for p in PLANET_NAMES]
summary.append(('ξ × AMD^(-1/2) [1-param, no incl]', spread(vals), 1))

# 2-param AMD
vals = [XI_ALL[p] * AMD[p]**(-0.5) * I_MEAN_RAD[p]**(-0.5) for p in PLANET_NAMES]
summary.append(('ξ × AMD^(-1/2) × i_mean^(-1/2) [2-param]', spread(vals), 2))

# Best from Section B (fine grid)
sp, a, b, _ = best_b[0]
vals = [XI_ALL[p] * AMD[p]**a * I_MEAN_RAD[p]**b for p in PLANET_NAMES]
summary.append((f'ξ × AMD^({a:.2f}) × i_mean^({b:.2f}) [2-param opt]', spread(vals), 2))

# Previous session best (no AMD)
vals = [XI_ALL[p] * INCL_PERIOD[p]**1.70 * I_RAD[p]**0.85 * I_MEAN_RAD[p]**(-0.60)
        for p in PLANET_NAMES]
summary.append(('ξ × T_incl^1.70 × i_amp^0.85 × i_mean^-0.60 [prev best]', spread(vals), 3))

# Best from Section D (3-param with T_incl)
if best_d:
    sp, a, b, g, _ = best_d[0]
    summary.append((f'ξ × AMD^({fmt_exp(a)}) × T_incl^({fmt_exp(b)}) × i_mean^({fmt_exp(g)}) [3-param]', sp, 3))

# Best from Section E (3-param no T_incl)
if best_e:
    sp, a, b, g, _ = best_e[0]
    summary.append((f'ξ × AMD^({fmt_exp(a)}) × i_amp^({fmt_exp(b)}) × i_mean^({fmt_exp(g)}) [3-param no T]', sp, 3))

# Best from Section G (4-param)
if best_g:
    sp, a, b, g, d, _ = best_g[0]
    summary.append((f'ξ×AMD^({fmt_exp(a)})×T^({fmt_exp(b)})×i_a^({fmt_exp(g)})×i_m^({fmt_exp(d)}) [4-param]', sp, 4))

# Fibonacci quantum numbers benchmark
vals = [ECC[p] * PERIOD_FRAC[p][0] / (D[p] * PERIOD_FRAC[p][1]**2) for p in PLANET_NAMES]
summary.append(('e × a/(d × b²) [Fibonacci q.n. benchmark]', spread(vals), 'Fib'))

print(f"\n  {'N':>4} | {'Formula':>60} | {'Spread%':>10}")
print("  " + "─" * 80)
for name, sp, n in sorted(summary, key=lambda x: x[1]):
    marker = " ★" if sp == min(s[1] for s in summary) else ""
    print(f"  {str(n):>4} | {name:>60} | {sp*100:>10.2f}%{marker}")


print(f"\n" + "=" * 100)
print("DONE")
print("=" * 100)

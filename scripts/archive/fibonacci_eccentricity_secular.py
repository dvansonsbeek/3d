#!/usr/bin/env python3
"""
ECCENTRICITY CONSTANT — Secular Theory Parameters
===================================================

Explores the eccentricity constant using physically motivated parameters
from Laplace-Lagrange secular perturbation theory:

1. g-mode eigenfrequencies (perihelion precession)
2. s-mode eigenfrequencies (nodal precession)
3. A-matrix diagonal elements (free eccentricity precession rates)
4. Angular momentum: L_circ = m × √a, AMD ∝ m√a × e²/2
5. Orbital energy: E ∝ -m/(2a)
6. Mean motion: n = 2π/P

Key question: Does using eccentricity precession periods (g-modes)
instead of inclination precession periods (s-modes) improve the formula?
"""

import sys, os, math
from itertools import product as iprod

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# SECULAR THEORY EIGENFREQUENCIES
# Sources: Brouwer & van Woerkom (1950), Laskar (1990), Murray & Dermott
# ═══════════════════════════════════════════════════════════════════════════

# g-mode eigenfrequencies (eccentricity, arcsec/yr)
# From Laskar (1990) / Nobili et al. (1989)
G_FREQ = {
    'g1': 5.59,    # Mercury-dominated
    'g2': 7.452,   # Venus-dominated
    'g3': 17.368,  # Earth-dominated
    'g4': 17.916,  # Mars-dominated
    'g5': 4.257,   # Jupiter-dominated
    'g6': 28.245,  # Saturn-dominated
    'g7': 3.088,   # Uranus-dominated
    'g8': 0.672,   # Neptune-dominated
}

# s-mode eigenfrequencies (inclination, arcsec/yr)
# Note: s₅ ≈ 0 (angular momentum conservation)
S_FREQ = {
    's1': -5.59,   # Mercury-dominated
    's2': -7.05,   # Venus-dominated
    's3': -18.85,  # Earth-dominated
    's4': -17.755, # Mars-dominated
    's5': 0.0,     # Total angular momentum (exact zero)
    's6': -26.34,  # Saturn-dominated
    's7': -2.99,   # Uranus-dominated
    's8': -0.692,  # Neptune-dominated
}

# Dominant g-mode for each planet (which eigenmode has largest amplitude)
DOMINANT_G = {
    'Mercury': 'g5',   # Mercury's perihelion precession dominated by Jupiter
    'Venus':   'g2',   # Venus by g₂
    'Earth':   'g3',   # Earth by g₃ (but g₂ and g₄ also significant)
    'Mars':    'g4',   # Mars by g₄
    'Jupiter': 'g5',   # Jupiter by g₅
    'Saturn':  'g6',   # Saturn by g₆
    'Uranus':  'g7',   # Uranus by g₇
    'Neptune': 'g8',   # Neptune by g₈
}

# Dominant s-mode for each planet
DOMINANT_S = {
    'Mercury': 's1',
    'Venus':   's2',
    'Earth':   's3',
    'Mars':    's4',
    'Jupiter': 's6',   # Jupiter's inclination dominated by Saturn coupling
    'Saturn':  's6',
    'Uranus':  's7',
    'Neptune': 's8',
}

# Perihelion precession rates (total, arcsec/century)
# From secular theory (includes mutual perturbations but NOT GR)
# These are the A-matrix diagonal: ϖ̇ = Σⱼ Aⱼₖ eⱼ cos(ϖⱼ - ϖₖ) ...
# Approximate total secular precession rates from BvW/Laskar:
PERIHELION_RATE = {  # arcsec/yr (secular only, no GR)
    'Mercury': 5.38,    # slow (low mass, but inner)
    'Venus':   7.35,    # moderate
    'Earth':   17.25,   # significant (Jupiter coupling)
    'Mars':    17.77,   # significant
    'Jupiter': 4.31,    # slow (dominant mass)
    'Saturn':  28.22,   # fast (near-resonance with Jupiter)
    'Uranus':  3.11,    # slow (far)
    'Neptune': 0.67,    # very slow (outermost)
}

# GR perihelion precession correction (arcsec/century)
GR_PRECESSION = {
    'Mercury': 42.98,   # famously 43"/century
    'Venus':    8.62,
    'Earth':    3.84,
    'Mars':     1.35,
    'Jupiter':  0.062,
    'Saturn':   0.014,
    'Uranus':   0.002,
    'Neptune':  0.0008,
}

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE DERIVED PHYSICAL QUANTITIES
# ═══════════════════════════════════════════════════════════════════════════

# Mass-weighted eccentricity
XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
XI_V = XI_ALL['Venus']

# Inclination quantities
I_RAD = {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES}
I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}

# Perihelion precession period (years) — secular only
T_PERIHELION = {p: 1296000.0 / PERIHELION_RATE[p] for p in PLANET_NAMES}

# Total perihelion precession including GR (arcsec/yr = arcsec/century / 100)
TOTAL_PREC_RATE = {p: PERIHELION_RATE[p] + GR_PRECESSION[p] / 100
                   for p in PLANET_NAMES}
T_TOTAL_PREC = {p: 1296000.0 / TOTAL_PREC_RATE[p] for p in PLANET_NAMES}

# Dominant g-mode period (years)
T_G_DOMINANT = {p: 1296000.0 / abs(G_FREQ[DOMINANT_G[p]])
                for p in PLANET_NAMES}

# Dominant s-mode period (years) — using |s| for period
T_S_DOMINANT = {}
for p in PLANET_NAMES:
    s = abs(S_FREQ[DOMINANT_S[p]])
    T_S_DOMINANT[p] = 1296000.0 / s if s > 0 else float('inf')

# Circular angular momentum: L_circ = m × √(G×M×a) ∝ m × √a
L_CIRC = {p: MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES}

# Angular Momentum Deficit: AMD ≈ L_circ × (1 - √(1-e²)) ≈ L_circ × e²/2
AMD = {p: L_CIRC[p] * (1 - math.sqrt(1 - ECC[p]**2)) for p in PLANET_NAMES}

# Mean motion: n = 2π/P (rad/yr)
MEAN_MOTION = {p: 2 * math.pi / ORBITAL_PERIOD[p] for p in PLANET_NAMES}

# Keplerian velocity: v ∝ √(1/a) (relative to Earth)
V_KEPLER = {p: 1.0 / math.sqrt(SMA[p]) for p in PLANET_NAMES}

# Secular frequency ratio: g/s for dominant modes
FREQ_RATIO_GS = {}
for p in PLANET_NAMES:
    g = abs(G_FREQ[DOMINANT_G[p]])
    s = abs(S_FREQ[DOMINANT_S[p]])
    FREQ_RATIO_GS[p] = g / s if s > 0 else float('inf')

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

EXPONENTS = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]
FINE_EXP = [i * 0.1 for i in range(-20, 31)]

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


# ═══════════════════════════════════════════════════════════════════════════
print("=" * 100)
print("ECCENTRICITY CONSTANT — Secular Theory Parameters")
print("=" * 100)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: Display all physical quantities
# ═══════════════════════════════════════════════════════════════════════════

print("\n─── A. Physical Quantities Diagnostic ───\n")
print(f"  {'Planet':>10} | {'ξ':>10} | {'ξ/ξ_V':>8} | {'T_incl(yr)':>10} | {'T_perih(yr)':>11} | {'T_g_dom(yr)':>11} | {'T_total(yr)':>11} | {'L_circ':>10} | {'AMD':>10}")
print("  " + "─" * 120)
for p in PLANET_NAMES:
    print(f"  {p:>10} | {XI_ALL[p]:.4e} | {XI_ALL[p]/XI_V:>8.3f} | {INCL_PERIOD[p]:>10.0f} | {T_PERIHELION[p]:>11.0f} | {T_G_DOMINANT[p]:>11.0f} | {T_TOTAL_PREC[p]:>11.0f} | {L_CIRC[p]:.4e} | {AMD[p]:.4e}")

print(f"\n  {'Planet':>10} | {'i_amp(°)':>10} | {'i_mean(°)':>10} | {'n(rad/yr)':>10} | {'v_Kep':>8} | {'g/s ratio':>10} | {'GR(\"/cty)':>10}")
print("  " + "─" * 90)
for p in PLANET_NAMES:
    print(f"  {p:>10} | {INCL_AMP[p]:>10.4f} | {I_MEAN_DEG[p]:>10.4f} | {MEAN_MOTION[p]:>10.4f} | {V_KEPLER[p]:>8.4f} | {FREQ_RATIO_GS[p]:>10.4f} | {GR_PRECESSION[p]:>10.4f}")

print(f"\n  Key: T_incl = Holistic model inclination period")
print(f"       T_perih = Secular perihelion precession period (no GR)")
print(f"       T_g_dom = Dominant g-mode period")
print(f"       T_total = Total perihelion precession (secular + GR)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: Replace T_incl with T_perihelion in the formula
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION B: Use perihelion precession period instead of inclination period")
print("Compare ξ × T^α × i_amp^β for T_incl vs T_perih vs T_total vs T_g_dom")
print("=" * 100)

# Define all time scale options
TIMESCALES = {
    'T_incl':  INCL_PERIOD,
    'T_perih': T_PERIHELION,
    'T_total': T_TOTAL_PREC,
    'T_g_dom': T_G_DOMINANT,
}

for ts_name, ts_data in TIMESCALES.items():
    print(f"\n─── {ts_name} ───")
    best = []
    for alpha in EXPONENTS:
        for beta in EXPONENTS:
            if alpha == 0 and beta == 0: continue
            vals = [XI_ALL[p] * ts_data[p]**alpha * I_RAD[p]**beta
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best.append((sp, alpha, beta))
    best.sort()
    print(f"  Top 10:")
    for i, (sp, a, b) in enumerate(best[:10]):
        print(f"    {i+1:>2}. ξ × {ts_name}^({fmt_exp(a):>5s}) × i_amp^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: Three-param with perihelion period + i_mean
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION C: ξ × T_perih^α × i_amp^β × i_mean^γ (perihelion precession)")
print("=" * 100)

best_c = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        for gamma in EXPONENTS:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * T_PERIHELION[p]**alpha * I_RAD[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_c.append((sp, alpha, beta, gamma, vals))

best_c.sort()
print(f"\nTop 20:")
for i, (sp, a, b, g, _) in enumerate(best_c[:20]):
    print(f"  {i+1:>2}. ξ × T_perih^({fmt_exp(a):>5s}) × i_amp^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, g, vals) in enumerate(best_c[:3]):
    print(f"\n  Rank {i+1}: T_perih^({fmt_exp(a)}) × i_amp^({fmt_exp(b)}) × i_mean^({fmt_exp(g)})  spread={sp*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b, g)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            for dg in [j*0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * T_PERIHELION[p]**a2 * I_RAD[p]**b2
                         * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2)
    print(f"  → Refined: T_perih^({best_ref[1]:.3f}) × i_amp^({best_ref[2]:.3f}) × i_mean^({best_ref[3]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: Angular momentum quantities
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION D: Angular momentum quantities")
print("ξ × L_circ^α × T_perih^β and variants")
print("=" * 100)

PHYS_PARAMS = {
    'L_circ':    L_CIRC,
    'AMD':       AMD,
    'n':         MEAN_MOTION,
    'v_Kep':     V_KEPLER,
    'a':         SMA,
    'g/s':       FREQ_RATIO_GS,
}

# Two-param: ξ × param^α × T_perih^β
for param_name, param_data in PHYS_PARAMS.items():
    best = []
    for alpha in EXPONENTS:
        for beta in EXPONENTS:
            if alpha == 0 and beta == 0: continue
            vals = [XI_ALL[p] * param_data[p]**alpha * T_PERIHELION[p]**beta
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best.append((sp, alpha, beta))
    best.sort()
    print(f"\n─── ξ × {param_name}^α × T_perih^β ───")
    for i, (sp, a, b) in enumerate(best[:5]):
        print(f"    {i+1}. {param_name}^({fmt_exp(a):>5s}) × T_perih^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: Comprehensive 3-param search with perihelion + physics
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION E: ξ × T_perih^α × [physics]^β × i_mean^γ")
print("Searching with each physical parameter alongside T_perih and i_mean")
print("=" * 100)

COARSE = [-2, -1, -1/2, 0, 1/2, 1, 2]

for param_name, param_data in PHYS_PARAMS.items():
    best = []
    for alpha in COARSE:
        for beta in COARSE:
            for gamma in COARSE:
                if alpha == 0 and beta == 0 and gamma == 0: continue
                vals = [XI_ALL[p] * T_PERIHELION[p]**alpha * param_data[p]**beta
                        * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp = spread(vals)
                    best.append((sp, alpha, beta, gamma))
    best.sort()
    print(f"\n─── ξ × T_perih^α × {param_name}^β × i_mean^γ ───")
    for i, (sp, a, b, g) in enumerate(best[:5]):
        print(f"    {i+1}. T_perih^({fmt_exp(a):>5s}) × {param_name}^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: Use both timescales: T_perih AND T_incl
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION F: Use BOTH timescales together")
print("ξ × T_incl^α × T_perih^β × i_mean^γ")
print("=" * 100)

best_f = []
for alpha in COARSE:
    for beta in COARSE:
        for gamma in COARSE:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * INCL_PERIOD[p]**alpha * T_PERIHELION[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_f.append((sp, alpha, beta, gamma, vals))

best_f.sort()
print(f"\nTop 20:")
for i, (sp, a, b, g, _) in enumerate(best_f[:20]):
    print(f"  {i+1:>2}. T_incl^({fmt_exp(a):>5s}) × T_perih^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")

# Refine top 3
for i, (sp, a, b, g, vals) in enumerate(best_f[:3]):
    print(f"\n  Rank {i+1}: T_incl^({fmt_exp(a)}) × T_perih^({fmt_exp(b)}) × i_mean^({fmt_exp(g)})")
    print(f"  Spread: {sp*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    best_ref = (sp, a, b, g)
    for da in [j*0.1 for j in range(-5, 6)]:
        for db in [j*0.1 for j in range(-5, 6)]:
            for dg in [j*0.1 for j in range(-5, 6)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * INCL_PERIOD[p]**a2 * T_PERIHELION[p]**b2
                         * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2)
    print(f"  → Refined: T_incl^({best_ref[1]:.2f}) × T_perih^({best_ref[2]:.2f}) × i_mean^({best_ref[3]:.2f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: 4-param with i_amp + i_mean + T_perih + (T_incl or L or a)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION G: 4-param search — best physics-only combination")
print("ξ × T_perih^α × i_amp^β × i_mean^γ × [4th]^δ")
print("=" * 100)

FOURTH = {
    'T_incl':  INCL_PERIOD,
    'L_circ':  L_CIRC,
    'a':       SMA,
    'n':       MEAN_MOTION,
    'g/s':     FREQ_RATIO_GS,
}

for name4, data4 in FOURTH.items():
    best = []
    for a in COARSE:
        for b in COARSE:
            for g in COARSE:
                for d in COARSE:
                    if a == 0 and b == 0 and g == 0 and d == 0: continue
                    vals = [XI_ALL[p] * T_PERIHELION[p]**a * I_RAD[p]**b
                            * I_MEAN_RAD[p]**g * data4[p]**d for p in PLANET_NAMES]
                    if min(vals) > 0:
                        sp = spread(vals)
                        best.append((sp, a, b, g, d))
    best.sort()
    print(f"\n─── ξ × T_perih^α × i_amp^β × i_mean^γ × {name4}^δ ───")
    for i, (sp, a, b, g, d) in enumerate(best[:5]):
        print(f"    {i+1}. T_perih^({fmt_exp(a):>5s}) × i_amp^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s}) × {name4}^({fmt_exp(d):>5s})  →  {sp*100:>8.2f}%")

    # Refine best
    if best:
        sp0, a0, b0, g0, d0 = best[0]
        best_ref = (sp0, a0, b0, g0, d0)
        step = 0.1
        for da in [j*step for j in range(-5, 6)]:
            for db in [j*step for j in range(-5, 6)]:
                for dg in [j*step for j in range(-5, 6)]:
                    for dd in [j*step for j in range(-5, 6)]:
                        a2, b2, g2, d2 = a0+da, b0+db, g0+dg, d0+dd
                        vals = [XI_ALL[p] * T_PERIHELION[p]**a2 * I_RAD[p]**b2
                                * I_MEAN_RAD[p]**g2 * data4[p]**d2 for p in PLANET_NAMES]
                        if min(vals) > 0:
                            sp2 = spread(vals)
                            if sp2 < best_ref[0]:
                                best_ref = (sp2, a2, b2, g2, d2)
        print(f"  → Refined: T_perih^({best_ref[1]:.2f}) × i_amp^({best_ref[2]:.2f}) × i_mean^({best_ref[3]:.2f}) × {name4}^({best_ref[4]:.2f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: T_perih / T_incl ratio as a single parameter
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION H: T_perih / T_incl ratio — does the eccentricity/inclination")
print("precession timescale ratio carry information?")
print("=" * 100)

T_RATIO = {p: T_PERIHELION[p] / INCL_PERIOD[p] for p in PLANET_NAMES}

print(f"\n  {'Planet':>10} | {'T_perih':>10} | {'T_incl':>10} | {'T_p/T_i':>10} | {'ξ':>10} | {'ξ × ratio':>12}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    print(f"  {p:>10} | {T_PERIHELION[p]:>10.0f} | {INCL_PERIOD[p]:>10.0f} | {T_RATIO[p]:>10.4f} | {XI_ALL[p]:.4e} | {XI_ALL[p] * T_RATIO[p]:>12.4e}")

# ξ × (T_p/T_i)^α
print(f"\n─── ξ × (T_perih/T_incl)^α ───")
for alpha in EXPONENTS:
    if alpha == 0: continue
    vals = [XI_ALL[p] * T_RATIO[p]**alpha for p in PLANET_NAMES]
    sp = spread(vals)
    if sp < 100:
        print(f"  α={fmt_exp(alpha):>5s}  →  spread {sp*100:>8.2f}%")

# ξ × (T_p/T_i)^α × i_mean^β
print(f"\n─── ξ × (T_p/T_i)^α × i_mean^β ───")
best_h = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * T_RATIO[p]**alpha * I_MEAN_RAD[p]**beta
                for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_h.append((sp, alpha, beta))
best_h.sort()
print(f"  Top 10:")
for i, (sp, a, b) in enumerate(best_h[:10]):
    print(f"    {i+1:>2}. (T_p/T_i)^({fmt_exp(a):>5s}) × i_mean^({fmt_exp(b):>5s})  →  {sp*100:>8.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION I: GR correction as parameter
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION I: GR precession as parameter")
print("ξ × GR^α × T_perih^β × i_mean^γ")
print("=" * 100)

GR_RATE = {p: GR_PRECESSION[p] / 100 for p in PLANET_NAMES}  # "/yr

best_i = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        for gamma in EXPONENTS:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * GR_RATE[p]**alpha * T_PERIHELION[p]**beta
                    * I_MEAN_RAD[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_i.append((sp, alpha, beta, gamma))

best_i.sort()
print(f"\nTop 15:")
for i, (sp, a, b, g) in enumerate(best_i[:15]):
    print(f"  {i+1:>2}. GR^({fmt_exp(a):>5s}) × T_perih^({fmt_exp(b):>5s}) × i_mean^({fmt_exp(g):>5s})  →  {sp*100:>8.2f}%")

# Refine top 1
if best_i:
    sp0, a0, b0, g0 = best_i[0]
    best_ref = (sp0, a0, b0, g0)
    for da in [j*0.05 for j in range(-10, 11)]:
        for db in [j*0.05 for j in range(-10, 11)]:
            for dg in [j*0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a0+da, b0+db, g0+dg
                vals = [XI_ALL[p] * GR_RATE[p]**a2 * T_PERIHELION[p]**b2
                        * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp2 = spread(vals)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2)
    print(f"\n  → Refined: GR^({best_ref[1]:.3f}) × T_perih^({best_ref[2]:.3f}) × i_mean^({best_ref[3]:.3f})  spread={best_ref[0]*100:.4f}%")

    # Show values
    a2, b2, g2 = best_ref[1], best_ref[2], best_ref[3]
    vals = [XI_ALL[p] * GR_RATE[p]**a2 * T_PERIHELION[p]**b2
            * I_MEAN_RAD[p]**g2 for p in PLANET_NAMES]
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION J: T_perih / H ratio — does it have Fibonacci structure?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION J: T_perihelion / H — Fibonacci fractions?")
print("Compare inclination vs perihelion Fibonacci structure")
print("=" * 100)

print(f"\n  {'Planet':>10} | {'T_perih/H':>12} | {'Nearest a/b':>12} | {'Error%':>8} | {'T_incl/H':>12} | {'a_i/b_i':>8}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    ratio_p = T_PERIHELION[p] / H
    # Find nearest simple fraction
    best_frac = None
    best_err = float('inf')
    for a in range(1, 20):
        for b in [1, 2, 3, 5, 8, 11, 13, 21, 34]:
            frac = a / b
            err = abs(ratio_p - frac) / max(ratio_p, 0.001)
            if err < best_err:
                best_err = err
                best_frac = (a, b, err)
    a_f, b_f, err = best_frac
    a_i, b_i = PERIOD_FRAC[p]
    print(f"  {p:>10} | {ratio_p:>12.6f} | {a_f:>3}/{b_f:<3} ({err*100:>5.2f}%) | {err*100:>7.2f} | {INCL_PERIOD[p]/H:>12.6f} | {a_i}/{b_i}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION K: COMPREHENSIVE COMPARISON — Summary of all approaches
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 100)
print("SECTION K: COMPREHENSIVE COMPARISON")
print("Summary of best results from each approach")
print("=" * 100)

results = []

# Previous best: ξ × T_incl^(1.70) × i_amp^(0.85) × i_mean^(-0.60)
vals = [XI_ALL[p] * INCL_PERIOD[p]**1.70 * I_RAD[p]**0.85 * I_MEAN_RAD[p]**(-0.60)
        for p in PLANET_NAMES]
results.append(('T_incl^1.70 × i_amp^0.85 × i_mean^-0.60', spread(vals)))

# T_perih versions
vals = [XI_ALL[p] * T_PERIHELION[p]**1.5 * I_RAD[p]**(2/3)
        for p in PLANET_NAMES]
results.append(('T_perih^3/2 × i_amp^2/3', spread(vals)))

vals = [XI_ALL[p] * T_PERIHELION[p]**1.5 * I_RAD[p]**(2/3) * I_MEAN_RAD[p]**(-1/3)
        for p in PLANET_NAMES]
results.append(('T_perih^3/2 × i_amp^2/3 × i_mean^-1/3', spread(vals)))

# T_total (with GR)
vals = [XI_ALL[p] * T_TOTAL_PREC[p]**1.5 * I_RAD[p]**(2/3) * I_MEAN_RAD[p]**(-1/3)
        for p in PLANET_NAMES]
results.append(('T_total^3/2 × i_amp^2/3 × i_mean^-1/3', spread(vals)))

# Both timescales
vals = [XI_ALL[p] * INCL_PERIOD[p]**1 * T_PERIHELION[p]**0.5 * I_MEAN_RAD[p]**(-0.5)
        for p in PLANET_NAMES]
results.append(('T_incl^1 × T_perih^0.5 × i_mean^-0.5', spread(vals)))

# With L_circ
vals = [XI_ALL[p] * T_PERIHELION[p]**1.5 * I_MEAN_RAD[p]**(-0.5) * L_CIRC[p]**0.5
        for p in PLANET_NAMES]
results.append(('T_perih^3/2 × i_mean^-1/2 × L^1/2', spread(vals)))

# Previous best: raw Fibonacci quantum numbers
vals = [XI_ALL[p] * (PERIOD_FRAC[p][0] / PERIOD_FRAC[p][1]**2)**(-1) * I_RAD[p]
        for p in PLANET_NAMES]
results.append(('b²/a × i_amp (Fibonacci)', spread(vals)))

print(f"\n  {'Formula':>55} | {'Spread%':>10}")
print("  " + "─" * 70)
for name, sp in sorted(results, key=lambda x: x[1]):
    marker = " ← BEST" if sp == min(r[1] for r in results) else ""
    print(f"  {name:>55} | {sp*100:>10.2f}%{marker}")

print(f"\n" + "=" * 100)
print("DONE")
print("=" * 100)

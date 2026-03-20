#!/usr/bin/env python3
"""
DIRECTION 3: Search for universal eccentricity constant (ψ_ecc)
================================================================

Systematic brute-force search for a formula of the form:
    d^α × e^β_e × m^β_m × a^γ = constant

across all 8 planets, analogous to the inclination law d × amp × √m = ψ.

Also tests:
- Different d-scalings (d, √d, d², 1/d, 1/√d)
- Period-based scaling (orbital period T, precession period H/b)
- R ≈ 311 integration
- Separate inner/outer formulas
"""

import sys
import os
import math
import itertools

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

print("=" * 78)
print("DIRECTION 3: SEARCH FOR UNIVERSAL ECCENTRICITY CONSTANT")
print("=" * 78)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: SYSTEMATIC POWER SCAN
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 1: Systematic power scan — d^α × e × m^β × a^γ = constant?")
print("─" * 78)

# Grid of exponents to test
alphas = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]
betas = [0, 0.25, 1/3, 0.5, 2/3, 0.75, 1]
gammas = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]

results = []

for alpha, beta, gamma in itertools.product(alphas, betas, gammas):
    values = []
    for p in PLANET_NAMES:
        d = D[p]
        e = ECC[p]
        m = MASS[p]
        a = SMA[p]
        val = (d ** alpha) * e * (m ** beta) * (a ** gamma)
        values.append(val)

    if min(values) > 0:
        spread = max(values) / min(values) - 1  # 0 = perfect constant
        mean_val = sum(values) / len(values)
        rel_std = (sum((v - mean_val)**2 for v in values) / len(values))**0.5 / mean_val
        results.append((spread, rel_std, alpha, beta, gamma, values))

results.sort(key=lambda x: x[0])

print(f"\nTested {len(results)} combinations of (α, β, γ)")
print(f"\nTop 20 results (smallest spread = most constant):\n")
print(f"{'Rank':<5} {'α (d)':<8} {'β (m)':<8} {'γ (a)':<8} {'Spread %':<12} {'Rel StdDev %':<14}")
print("─" * 65)

for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results[:20]):
    print(f"{i+1:<5} {alpha:<8.2f} {beta:<8.4f} {gamma:<8.2f} {spread*100:<12.2f} {rel_std*100:<14.4f}")

# Show details for top 5
print("\n\nDetailed values for top 5:\n")
for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results[:5]):
    print(f"  Rank {i+1}: d^{alpha:.2f} × e × m^{beta:.4f} × a^{gamma:.2f}")
    print(f"  Spread: {spread*100:.2f}%, Rel StdDev: {rel_std*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:10s}: {values[j]:.6e}")
    print()

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: ALSO TEST WITH e² (AMD-natural) AND √e
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 2: Test different eccentricity powers — d^α × e^p × m^β × a^γ")
print("─" * 78)

e_powers = [0.5, 1.0, 1.5, 2.0]
results2 = []

for e_pow in e_powers:
    for alpha, beta, gamma in itertools.product(alphas, betas, gammas):
        values = []
        for p in PLANET_NAMES:
            d = D[p]
            e = ECC[p]
            m = MASS[p]
            a = SMA[p]
            val = (d ** alpha) * (e ** e_pow) * (m ** beta) * (a ** gamma)
            values.append(val)

        if min(values) > 0:
            spread = max(values) / min(values) - 1
            mean_val = sum(values) / len(values)
            rel_std = (sum((v - mean_val)**2 for v in values) / len(values))**0.5 / mean_val
            results2.append((spread, rel_std, alpha, beta, gamma, e_pow, values))

results2.sort(key=lambda x: x[0])

print(f"\nTested {len(results2)} combinations (including e^p variation)")
print(f"\nTop 20 results:\n")
print(f"{'Rank':<5} {'α(d)':<7} {'β(m)':<7} {'γ(a)':<7} {'p(e)':<7} {'Spread%':<10} {'RelStd%':<10}")
print("─" * 60)

for i, (spread, rel_std, alpha, beta, gamma, e_pow, values) in enumerate(results2[:20]):
    print(f"{i+1:<5} {alpha:<7.1f} {beta:<7.3f} {gamma:<7.1f} {e_pow:<7.1f} {spread*100:<10.2f} {rel_std*100:<10.4f}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: TEST WITH PRECESSION PERIODS INSTEAD OF a
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 3: Replace a with precession period — d^α × e × m^β × T_prec^γ")
print("─" * 78)

T_PREC = {p: INCL_PERIOD[p] for p in PLANET_NAMES}

results3 = []

for alpha, beta, gamma in itertools.product(alphas, betas, gammas):
    values = []
    for p in PLANET_NAMES:
        d = D[p]
        e = ECC[p]
        m = MASS[p]
        t = T_PREC[p]
        val = (d ** alpha) * e * (m ** beta) * (t ** gamma)
        values.append(val)

    if min(values) > 0:
        spread = max(values) / min(values) - 1
        mean_val = sum(values) / len(values)
        rel_std = (sum((v - mean_val)**2 for v in values) / len(values))**0.5 / mean_val
        results3.append((spread, rel_std, alpha, beta, gamma, values))

results3.sort(key=lambda x: x[0])

print(f"\nTop 20 results:\n")
print(f"{'Rank':<5} {'α(d)':<8} {'β(m)':<8} {'γ(T)':<8} {'Spread%':<12} {'RelStd%':<12}")
print("─" * 60)

for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results3[:20]):
    print(f"{i+1:<5} {alpha:<8.1f} {beta:<8.3f} {gamma:<8.1f} {spread*100:<12.2f} {rel_std*100:<12.4f}")

# Show details for top 3
print("\nTop 3 details:")
for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results3[:3]):
    print(f"\n  Rank {i+1}: d^{alpha:.1f} × e × m^{beta:.3f} × T_prec^{gamma:.1f}")
    print(f"  Spread: {spread*100:.2f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:10s}: {values[j]:.6e}  (T_prec={T_PREC[p]:>7d} yr)")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: TEST WITH PERIOD FRACTION b (H/T = b/a)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 4: Use period fraction denominator b — d^α × e × m^β × b^γ")
print("─" * 78)

B_FRAC = {p: PERIOD_FRAC[p][1] / PERIOD_FRAC[p][0] for p in PLANET_NAMES}  # b/a = H/T

results4 = []

for alpha, beta, gamma in itertools.product(alphas, betas, gammas):
    values = []
    for p in PLANET_NAMES:
        d = D[p]
        e = ECC[p]
        m = MASS[p]
        b = B_FRAC[p]
        val = (d ** alpha) * e * (m ** beta) * (b ** gamma)
        values.append(val)

    if min(values) > 0:
        spread = max(values) / min(values) - 1
        mean_val = sum(values) / len(values)
        rel_std = (sum((v - mean_val)**2 for v in values) / len(values))**0.5 / mean_val
        results4.append((spread, rel_std, alpha, beta, gamma, values))

results4.sort(key=lambda x: x[0])

print(f"\nTop 20 results:\n")
print(f"{'Rank':<5} {'α(d)':<8} {'β(m)':<8} {'γ(b)':<8} {'Spread%':<12} {'RelStd%':<12}")
print("─" * 60)

for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results4[:20]):
    print(f"{i+1:<5} {alpha:<8.1f} {beta:<8.3f} {gamma:<8.1f} {spread*100:<12.2f} {rel_std*100:<12.4f}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: SEPARATE INNER/OUTER — DOES EACH HALF HAVE A CONSTANT?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 5: Separate inner (4) and outer (4) planet scans")
print("─" * 78)

INNER = ["Mercury", "Venus", "Earth", "Mars"]
OUTER = ["Jupiter", "Saturn", "Uranus", "Neptune"]

for group_name, group in [("INNER", INNER), ("OUTER", OUTER)]:
    results_grp = []
    for alpha, beta, gamma in itertools.product(alphas, betas, gammas):
        values = []
        for p in group:
            d = D[p]
            e = ECC[p]
            m = MASS[p]
            a = SMA[p]
            val = (d ** alpha) * e * (m ** beta) * (a ** gamma)
            values.append(val)

        if min(values) > 0:
            spread = max(values) / min(values) - 1
            mean_val = sum(values) / len(values)
            rel_std = (sum((v - mean_val)**2 for v in values) / len(values))**0.5 / mean_val
            results_grp.append((spread, rel_std, alpha, beta, gamma, values))

    results_grp.sort(key=lambda x: x[0])

    print(f"\n{group_name} planets — Top 10:\n")
    print(f"{'Rank':<5} {'α(d)':<8} {'β(m)':<8} {'γ(a)':<8} {'Spread%':<12} {'RelStd%':<12}")
    print("─" * 60)

    for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results_grp[:10]):
        print(f"{i+1:<5} {alpha:<8.1f} {beta:<8.3f} {gamma:<8.1f} {spread*100:<12.2f} {rel_std*100:<12.4f}")

    # Detail for top 3
    for i, (spread, rel_std, alpha, beta, gamma, values) in enumerate(results_grp[:3]):
        print(f"\n  {group_name} Rank {i+1}: d^{alpha:.1f} × e × m^{beta:.3f} × a^{gamma:.1f}, spread={spread*100:.2f}%")
        for j, p in enumerate(group):
            print(f"    {p:10s}: {values[j]:.6e}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: REFERENCE — CURRENT ECCENTRICITY STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 6: Reference — current eccentricity structure")
print("─" * 78)

# Inner planet ladder: ξ ratios
xi_V = XI["Venus"]
print("\nInner planet ξ = e × √m ladder (normalized to Venus = 1):")
for p in INNER:
    ratio = XI[p] / xi_V
    print(f"  {p:10s}: ξ = {XI[p]:.6e}, ratio = {ratio:.4f}")

print(f"\nTarget ratios: Venus=1, Earth=5/2={5/2:.4f}, Mars=5, Mercury=8")

# Outer planet ξ ratios
print("\nOuter planet ξ = e × √m:")
for p in OUTER:
    print(f"  {p:10s}: ξ = {XI[p]:.6e}")
print(f"  ξ_S/ξ_J = {XI['Saturn']/XI['Jupiter']:.4f} (target 8/13 = {8/13:.4f})")
print(f"  ξ_U/ξ_N = {XI['Uranus']/XI['Neptune']:.4f} (target 5)")

# d × ξ for all planets (the "eccentricity ladder" check)
print("\nAll planets — d × ξ (should be constant if eccentricity had same formula as inclination):")
for p in PLANET_NAMES:
    dxi = D[p] * XI[p]
    print(f"  {p:10s}: d={D[p]:>2d}, ξ={XI[p]:.6e}, d×ξ = {dxi:.6e}")
vals_dxi = [D[p] * XI[p] for p in PLANET_NAMES]
spread_dxi = max(vals_dxi) / min(vals_dxi) - 1
print(f"  Spread: {spread_dxi*100:.1f}% — {'NOT constant' if spread_dxi > 0.1 else 'approximately constant'}")

# √d × ξ (from eccentricity balance weight)
print("\nAll planets — √d × ξ:")
for p in PLANET_NAMES:
    sdxi = math.sqrt(D[p]) * XI[p]
    print(f"  {p:10s}: √d×ξ = {sdxi:.6e}")
vals_sdxi = [math.sqrt(D[p]) * XI[p] for p in PLANET_NAMES]
spread_sdxi = max(vals_sdxi) / min(vals_sdxi) - 1
print(f"  Spread: {spread_sdxi*100:.1f}%")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: FINE-GRID AROUND BEST RESULTS
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 78)
print("SECTION 7: Fine-grid search around best all-planet results")
print("─" * 78)

# Take top 3 from Section 1 and refine
if results:
    for rank, (spread, rel_std, alpha_c, beta_c, gamma_c, _) in enumerate(results[:3]):
        print(f"\nRefining around rank {rank+1}: α={alpha_c:.2f}, β={beta_c:.4f}, γ={gamma_c:.2f}")

        fine_results = []
        for da in [x * 0.1 for x in range(-5, 6)]:
            for db in [x * 0.05 for x in range(-5, 6)]:
                for dg in [x * 0.1 for x in range(-5, 6)]:
                    a_ = alpha_c + da
                    b_ = beta_c + db
                    g_ = gamma_c + dg
                    values = []
                    for p in PLANET_NAMES:
                        val = (D[p] ** a_) * ECC[p] * (MASS[p] ** b_) * (SMA[p] ** g_)
                        values.append(val)
                    if min(values) > 0:
                        sp = max(values) / min(values) - 1
                        fine_results.append((sp, a_, b_, g_))

        fine_results.sort()
        print(f"  Best refinement: α={fine_results[0][1]:.2f}, β={fine_results[0][2]:.4f}, γ={fine_results[0][3]:.2f}, spread={fine_results[0][0]*100:.2f}%")
        for i in range(min(5, len(fine_results))):
            s, a_, b_, g_ = fine_results[i]
            print(f"    #{i+1}: α={a_:.2f}, β={b_:.4f}, γ={g_:.2f}, spread={s*100:.2f}%")

print("\n" + "=" * 78)
print("DIRECTION 3 COMPLETE")
print("=" * 78)

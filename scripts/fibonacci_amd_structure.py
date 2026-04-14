#!/usr/bin/env python3
"""
AMD FIBONACCI STRUCTURE — SYSTEMATIC INVESTIGATION
=====================================================

The Angular Momentum Deficit (AMD) provides a conserved quantity that
naturally decomposes into eccentricity and inclination contributions:

    AMD_i ≈ m_i √(a_i) × (e_i²/2 + i_i²/2)
          = √(a_i)/2 × (ξ_i² + η_i²)

where ξ = e√m and η = i√m are the Fibonacci-natural variables.

Previous findings:
  - √m is the unique optimal mass exponent (α=0.50, spread 0.11%)
  - AMD_J^(e)/AMD_S^(e) ≈ 2 = F₃ (0.5%) — robust across definitions

This script systematically investigates whether AMD provides a UNIFIED
Fibonacci structure encompassing both eccentricity and inclination.

Conclusion: AMD eccentricity ratios show Fibonacci structure (especially
AMD_J/AMD_S ≈ 2), but the √a factor DILUTES Fibonacci compared to ξ-ratios.
No AMD Fibonacci ladder exists. ξ-ratios are cleaner than AMD ratios.

Sections:
  1. Per-planet AMD decomposition (eccentricity, inclination, total)
  2. All pairwise AMD eccentricity ratios — Fibonacci search
  3. All pairwise AMD inclination ratios — Fibonacci search
  4. All pairwise TOTAL AMD ratios — Fibonacci search
  5. AMD Fibonacci ladder (inner + outer planets)
  6. Comparison: AMD ratios vs ξ-ratios vs η-ratios
  7. System-level AMD Fibonacci relations (extending known results)
  8. Cross-parameter AMD identities
"""

import numpy as np
import math
import sys
from pathlib import Path
from itertools import combinations

# Load shared constants from tools/lib/python/constants_scripts.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'tools' / 'lib' / 'python'))
from constants_scripts import *

np.set_printoptions(precision=6, suppress=True)


# ═══════════════════════════════════════════════════════════════════════════
# AMD COMPUTATION
# ═══════════════════════════════════════════════════════════════════════════

def amd_ecc(planet, ecc_dict=None):
    """Eccentricity contribution to AMD: m √a e²/2"""
    e = (ecc_dict or ECC_BASE)[planet]
    return MASS[planet] * math.sqrt(SMA[planet]) * e**2 / 2


def amd_incl(planet, amp_dict=None):
    """Inclination contribution to AMD: m √a i²/2 (i in radians)"""
    i_deg = (amp_dict or INCL_AMP)[planet]
    i_rad = math.radians(i_deg)
    return MASS[planet] * math.sqrt(SMA[planet]) * i_rad**2 / 2


def amd_total(planet, ecc_dict=None, amp_dict=None):
    """Total AMD: eccentricity + inclination"""
    return amd_ecc(planet, ecc_dict) + amd_incl(planet, amp_dict)


def section(title):
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
    print()


def main():
    print()
    print("  AMD FIBONACCI STRUCTURE — SYSTEMATIC INVESTIGATION")
    print("  " + "=" * 55)

    # ═══════════════════════════════════════════════════════════════════════
    # 1. PER-PLANET AMD DECOMPOSITION
    # ═══════════════════════════════════════════════════════════════════════
    section("1. PER-PLANET AMD DECOMPOSITION")

    print("  AMD_i = m_i √a_i × (e_i²/2 + i_amp²/2)")
    print("  Using model base eccentricities and inclination amplitudes")
    print()

    print(f"  {'Planet':<10} {'AMD_ecc':>12} {'AMD_incl':>12} {'AMD_total':>12}"
          f"  {'ecc/total':>10} {'m√a':>12}")
    print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*12}  {'-'*10} {'-'*12}")

    amd_e = {}
    amd_i = {}
    amd_t = {}
    msa = {}

    for p in PLANET_NAMES:
        ae = amd_ecc(p)
        ai = amd_incl(p)
        at = ae + ai
        amd_e[p] = ae
        amd_i[p] = ai
        amd_t[p] = at
        msa[p] = MASS[p] * math.sqrt(SMA[p])
        frac = ae / at if at > 0 else 0
        print(f"  {p:<10} {ae:>12.4e} {ai:>12.4e} {at:>12.4e}"
              f"  {frac:>9.1%} {msa[p]:>12.4e}")

    print()
    total_amd = sum(amd_t.values())
    total_amd_e = sum(amd_e.values())
    total_amd_i = sum(amd_i.values())
    print(f"  System totals:")
    print(f"    AMD_ecc   = {total_amd_e:.4e}  ({total_amd_e/total_amd:.1%})")
    print(f"    AMD_incl  = {total_amd_i:.4e}  ({total_amd_i/total_amd:.1%})")
    print(f"    AMD_total = {total_amd:.4e}")
    print()
    print(f"  Jupiter dominates: {amd_t['Jupiter']/total_amd:.1%} of total AMD")
    print(f"  Jupiter+Saturn: {(amd_t['Jupiter']+amd_t['Saturn'])/total_amd:.1%}")

    # ═══════════════════════════════════════════════════════════════════════
    # 2. ALL PAIRWISE AMD ECCENTRICITY RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("2. ALL PAIRWISE AMD ECCENTRICITY RATIOS")

    print("  AMD_ecc_i / AMD_ecc_j for all pairs (larger/smaller)")
    print("  Testing whether ratios are Fibonacci numbers or ratios")
    print()

    print(f"  {'Pair':<20} {'Ratio':>10} {'Nearest Fib':>12} {'Error':>8}")
    print(f"  {'-'*20} {'-'*10} {'-'*12} {'-'*8}")

    fib_pairs_ecc = []
    for p1, p2 in combinations(PLANET_NAMES, 2):
        v1, v2 = amd_e[p1], amd_e[p2]
        if v1 < v2:
            p1, p2 = p2, p1
            v1, v2 = v2, v1
        ratio = v1 / v2 if v2 > 0 else float('inf')
        a, b, fr, err = nearest_fib_ratio(ratio)
        frac = f"{a}/{b}" if b > 1 else str(a)
        mark = " ◄" if err < 0.05 else ""
        fib_pairs_ecc.append((p1, p2, ratio, frac, fr, err))
        if err < 0.10:  # Show pairs within 10%
            print(f"  {p1+'/'+p2:<20} {ratio:>10.4f} {frac:>12} {err*100:>+7.2f}%{mark}")

    print()
    # Count how many are within thresholds
    for thresh in [0.01, 0.02, 0.05, 0.10]:
        n = sum(1 for _, _, _, _, _, e in fib_pairs_ecc if e < thresh)
        print(f"  Within {thresh*100:.0f}%: {n}/{len(fib_pairs_ecc)} pairs")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. ALL PAIRWISE AMD INCLINATION RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("3. ALL PAIRWISE AMD INCLINATION RATIOS")

    print(f"  {'Pair':<20} {'Ratio':>10} {'Nearest Fib':>12} {'Error':>8}")
    print(f"  {'-'*20} {'-'*10} {'-'*12} {'-'*8}")

    fib_pairs_incl = []
    for p1, p2 in combinations(PLANET_NAMES, 2):
        v1, v2 = amd_i[p1], amd_i[p2]
        if v1 < v2:
            p1, p2 = p2, p1
            v1, v2 = v2, v1
        ratio = v1 / v2 if v2 > 0 else float('inf')
        a, b, fr, err = nearest_fib_ratio(ratio)
        frac = f"{a}/{b}" if b > 1 else str(a)
        mark = " ◄" if err < 0.05 else ""
        fib_pairs_incl.append((p1, p2, ratio, frac, fr, err))
        if err < 0.10:
            print(f"  {p1+'/'+p2:<20} {ratio:>10.4f} {frac:>12} {err*100:>+7.2f}%{mark}")

    print()
    for thresh in [0.01, 0.02, 0.05, 0.10]:
        n = sum(1 for _, _, _, _, _, e in fib_pairs_incl if e < thresh)
        print(f"  Within {thresh*100:.0f}%: {n}/{len(fib_pairs_incl)} pairs")

    # ═══════════════════════════════════════════════════════════════════════
    # 4. ALL PAIRWISE TOTAL AMD RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("4. ALL PAIRWISE TOTAL AMD RATIOS")

    print(f"  {'Pair':<20} {'Ratio':>10} {'Nearest Fib':>12} {'Error':>8}"
          f"  {'ecc-only':>10}")
    print(f"  {'-'*20} {'-'*10} {'-'*12} {'-'*8} {'-'*10}")

    fib_pairs_total = []
    for p1, p2 in combinations(PLANET_NAMES, 2):
        v1, v2 = amd_t[p1], amd_t[p2]
        if v1 < v2:
            p1, p2 = p2, p1
            v1, v2 = v2, v1
        ratio = v1 / v2 if v2 > 0 else float('inf')
        a, b, fr, err = nearest_fib_ratio(ratio)
        frac = f"{a}/{b}" if b > 1 else str(a)

        # Compare with ecc-only ratio
        e1, e2 = amd_e[max(p1, p2, key=lambda x: amd_e[x])], \
                  amd_e[min(p1, p2, key=lambda x: amd_e[x])]
        ecc_ratio = e1 / e2 if e2 > 0 else float('inf')
        _, _, _, err_ecc = nearest_fib_ratio(ecc_ratio)

        mark = " ◄" if err < 0.05 else ""
        fib_pairs_total.append((p1, p2, ratio, frac, fr, err))
        if err < 0.10:
            better = "total" if err < err_ecc else "ecc"
            print(f"  {p1+'/'+p2:<20} {ratio:>10.4f} {frac:>12} {err*100:>+7.2f}%{mark}"
                  f"  {ecc_ratio:>10.4f}")

    print()
    for thresh in [0.01, 0.02, 0.05, 0.10]:
        n_t = sum(1 for _, _, _, _, _, e in fib_pairs_total if e < thresh)
        n_e = sum(1 for _, _, _, _, _, e in fib_pairs_ecc if e < thresh)
        n_i = sum(1 for _, _, _, _, _, e in fib_pairs_incl if e < thresh)
        print(f"  Within {thresh*100:.0f}%: total {n_t}, ecc {n_e}, incl {n_i} (of {len(fib_pairs_total)})")

    # ═══════════════════════════════════════════════════════════════════════
    # 5. FOCUSED: OUTER PLANET AMD RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("5. OUTER PLANET AMD RATIOS (Jupiter, Saturn, Uranus, Neptune)")

    outer = ["Jupiter", "Saturn", "Uranus", "Neptune"]

    for label, amd_dict in [("AMD_ecc", amd_e), ("AMD_incl", amd_i),
                             ("AMD_total", amd_t)]:
        print(f"  {label}:")
        for p1, p2 in combinations(outer, 2):
            v1, v2 = amd_dict[p1], amd_dict[p2]
            if v1 < v2:
                p1, p2 = p2, p1
                v1, v2 = v2, v1
            ratio = v1 / v2
            a, b, fr, err = nearest_fib_ratio(ratio)
            frac = f"{a}/{b}" if b > 1 else str(a)
            mark = " ◄" if err < 0.03 else ""
            print(f"    {p1+'/'+p2:<20} {ratio:>10.4f} ≈ {frac:>5} = {fr:.3f}"
                  f" ({err*100:+.2f}%){mark}")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # 6. FOCUSED: INNER PLANET AMD RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("6. INNER PLANET AMD RATIOS (Mercury, Venus, Earth, Mars)")

    inner = ["Mercury", "Venus", "Earth", "Mars"]

    for label, amd_dict in [("AMD_ecc", amd_e), ("AMD_incl", amd_i),
                             ("AMD_total", amd_t)]:
        print(f"  {label}:")
        for p1, p2 in combinations(inner, 2):
            v1, v2 = amd_dict[p1], amd_dict[p2]
            if v1 < v2:
                p1, p2 = p2, p1
                v1, v2 = v2, v1
            ratio = v1 / v2
            a, b, fr, err = nearest_fib_ratio(ratio)
            frac = f"{a}/{b}" if b > 1 else str(a)
            mark = " ◄" if err < 0.05 else ""
            print(f"    {p1+'/'+p2:<20} {ratio:>10.4f} ≈ {frac:>5} = {fr:.3f}"
                  f" ({err*100:+.2f}%){mark}")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # 7. COMPARISON: AMD vs ξ vs η RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("7. COMPARISON: AMD_ecc vs ξ RATIOS (outer planets)")

    print("  AMD_ecc ratio = (m√a × e²/2) ratio")
    print("  ξ ratio       = (e√m) ratio")
    print("  These differ by the √a factor")
    print()

    print(f"  {'Pair':<20} {'AMD_e ratio':>12} {'ξ ratio':>10} {'AMD Fib':>10}"
          f" {'ξ Fib':>10} {'AMD err':>8} {'ξ err':>8}")
    print(f"  {'-'*20} {'-'*12} {'-'*10} {'-'*10} {'-'*10} {'-'*8} {'-'*8}")

    outer_pairs = [("Jupiter", "Saturn"), ("Jupiter", "Uranus"),
                   ("Jupiter", "Neptune"), ("Saturn", "Uranus"),
                   ("Saturn", "Neptune"), ("Uranus", "Neptune")]

    for p1, p2 in outer_pairs:
        amd_ratio = amd_e[p1] / amd_e[p2] if amd_e[p2] > 0 else float('inf')
        xi1 = ECC_BASE[p1] * SQRT_M[p1]
        xi2 = ECC_BASE[p2] * SQRT_M[p2]
        xi_ratio = xi1 / xi2

        a1, b1, fr1, err1 = nearest_fib_ratio(amd_ratio)
        a2, b2, fr2, err2 = nearest_fib_ratio(xi_ratio)
        frac1 = f"{a1}/{b1}" if b1 > 1 else str(a1)
        frac2 = f"{a2}/{b2}" if b2 > 1 else str(a2)

        better = "AMD" if err1 < err2 else "ξ"
        print(f"  {p1[:3]+'/'+p2[:3]:<20} {amd_ratio:>12.4f} {xi_ratio:>10.4f}"
              f" {frac1:>10} {frac2:>10} {err1*100:>+7.2f}% {err2*100:>+7.2f}%"
              f"  ← {better}")

    print()
    print("  AMD differs from ξ by the √(a₁/a₂) factor.")
    print(f"  √(a_J/a_S) = {math.sqrt(SMA['Jupiter']/SMA['Saturn']):.4f}")
    print(f"  √(a_J/a_U) = {math.sqrt(SMA['Jupiter']/SMA['Uranus']):.4f}")
    print(f"  √(a_J/a_N) = {math.sqrt(SMA['Jupiter']/SMA['Neptune']):.4f}")

    # ═══════════════════════════════════════════════════════════════════════
    # 8. AMD FIBONACCI LADDER (INNER PLANETS)
    # ═══════════════════════════════════════════════════════════════════════
    section("8. AMD ECCENTRICITY FIBONACCI LADDER")

    print("  Existing ξ-ladder: d_ecc × ξ = const for 4 inner planets")
    print("  Question: Is there an AMD analog? d_amd × AMD_ecc = const?")
    print()

    # First show the ξ-ladder
    inner_ecc = ["Venus", "Earth", "Mars", "Mercury"]
    d_ecc_vals = {"Venus": 1, "Earth": 2/5, "Mars": 1/5, "Mercury": 1/8}

    print("  Existing ξ-ladder (for reference):")
    xi_products = []
    for p in inner_ecc:
        xi_p = ECC_BASE[p] * SQRT_M[p]
        d = d_ecc_vals[p]
        prod = d * xi_p
        xi_products.append(prod)
        print(f"    {p:<10} d={d:<6g}  ξ={xi_p:.4e}  d×ξ={prod:.4e}")
    xi_spread = (max(xi_products) - min(xi_products)) / np.mean(xi_products) * 100
    print(f"    Spread: {xi_spread:.3f}%")
    print()

    # Now test AMD ladder: can we find d values that make d × AMD_ecc = const?
    print("  AMD eccentricity values:")
    for p in inner_ecc:
        print(f"    {p:<10} AMD_ecc = {amd_e[p]:.4e}")
    print()

    # Pairwise ratios to determine what d values would be needed
    print("  Pairwise AMD_ecc ratios (normalized to Venus=1):")
    for p in inner_ecc:
        ratio = amd_e["Venus"] / amd_e[p] if amd_e[p] > 0 else float('inf')
        a, b, fr, err = nearest_fib_ratio(ratio)
        frac = f"{a}/{b}" if b > 1 else str(a)
        print(f"    Venus/{p:<10} = {ratio:.4f} ≈ {frac} ({err*100:.2f}%)")

    print()

    # Test if AMD_ecc ratios reveal the √a correction to the ξ-ladder
    print("  √a correction factor (AMD vs ξ):")
    print(f"    ξ-ladder d values:   Venus=1, Earth=2/5, Mars=1/5, Mercury=1/8")
    print(f"    AMD adds √(a_p/a_V) factor:")
    for p in inner_ecc:
        sqrt_a_ratio = math.sqrt(SMA[p] / SMA["Venus"])
        eff_d = d_ecc_vals[p] * sqrt_a_ratio
        print(f"    {p:<10} √(a/a_V)={sqrt_a_ratio:.4f}  effective d_AMD = {eff_d:.4f}")

    # ═══════════════════════════════════════════════════════════════════════
    # 9. CROSS-BELT AMD STRUCTURE
    # ═══════════════════════════════════════════════════════════════════════
    section("9. CROSS-BELT AMD STRUCTURE")

    print("  AMD totals by region:")
    inner_total_e = sum(amd_e[p] for p in ["Mercury", "Venus", "Earth", "Mars"])
    outer_total_e = sum(amd_e[p] for p in ["Jupiter", "Saturn", "Uranus", "Neptune"])
    inner_total_i = sum(amd_i[p] for p in ["Mercury", "Venus", "Earth", "Mars"])
    outer_total_i = sum(amd_i[p] for p in ["Jupiter", "Saturn", "Uranus", "Neptune"])
    inner_total_t = inner_total_e + inner_total_i
    outer_total_t = outer_total_e + outer_total_i

    print(f"    Inner AMD_ecc:   {inner_total_e:.4e}")
    print(f"    Outer AMD_ecc:   {outer_total_e:.4e}")
    print(f"    Ratio outer/inner (ecc): {outer_total_e/inner_total_e:.2f}")
    a, b, fr, err = nearest_fib_ratio(outer_total_e / inner_total_e)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"      ≈ {frac} = {fr:.3f} ({err*100:.2f}%)")
    print()

    print(f"    Inner AMD_incl:  {inner_total_i:.4e}")
    print(f"    Outer AMD_incl:  {outer_total_i:.4e}")
    print(f"    Ratio outer/inner (incl): {outer_total_i/inner_total_i:.2f}")
    a, b, fr, err = nearest_fib_ratio(outer_total_i / inner_total_i)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"      ≈ {frac} = {fr:.3f} ({err*100:.2f}%)")
    print()

    print(f"    Inner AMD_total: {inner_total_t:.4e}")
    print(f"    Outer AMD_total: {outer_total_t:.4e}")
    print(f"    Ratio outer/inner (total): {outer_total_t/inner_total_t:.2f}")
    a, b, fr, err = nearest_fib_ratio(outer_total_t / inner_total_t)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"      ≈ {frac} = {fr:.3f} ({err*100:.2f}%)")
    print()

    # Cross ratios: AMD_ecc / AMD_incl per region
    print("  AMD_ecc / AMD_incl per region:")
    r_inner = inner_total_e / inner_total_i
    r_outer = outer_total_e / outer_total_i
    r_system = total_amd_e / total_amd_i
    for label, r in [("Inner", r_inner), ("Outer", r_outer), ("System", r_system)]:
        a, b, fr, err = nearest_fib_ratio(r)
        frac = f"{a}/{b}" if b > 1 else str(a)
        print(f"    {label:<10} AMD_ecc/AMD_incl = {r:.4f} ≈ {frac} ({err*100:.2f}%)")

    # ═══════════════════════════════════════════════════════════════════════
    # 10. LAW 3 ANALOG IN AMD
    # ═══════════════════════════════════════════════════════════════════════
    section("10. HISTORICAL TRIAD TEST IN AMD")

    print("  Historical triad (inclination): 3η_E + 5η_J = 8η_S")
    print("  (No longer exact with balance-model amplitudes.)")
    print("  Does an analogous relation hold for AMD?")
    print()

    # Test: 3×AMD_E + 5×AMD_J = 8×AMD_S
    for label, amd_dict in [("AMD_ecc", amd_e), ("AMD_incl", amd_i),
                             ("AMD_total", amd_t)]:
        lhs = 3 * amd_dict["Earth"] + 5 * amd_dict["Jupiter"]
        rhs = 8 * amd_dict["Saturn"]
        err = (lhs / rhs - 1) * 100
        print(f"  {label}: 3×E + 5×J = {lhs:.4e}, 8×S = {rhs:.4e}, error = {err:+.2f}%")

    print()

    # Search for better Fibonacci coefficients in AMD
    print("  Searching for Fibonacci triad a×E + b×J = c×S in AMD_ecc:")
    best_err = float('inf')
    best = None
    fibs = [1, 2, 3, 5, 8, 13, 21]
    for a in fibs:
        for b in fibs:
            for c in fibs:
                if a + b == c or abs(a + b - c) <= 1:  # Fibonacci-like constraint
                    lhs = a * amd_e["Earth"] + b * amd_e["Jupiter"]
                    rhs = c * amd_e["Saturn"]
                    if rhs > 0:
                        err = abs(lhs / rhs - 1)
                        if err < best_err:
                            best_err = err
                            best = (a, b, c, err)
    if best:
        a, b, c, err = best
        print(f"  Best: {a}×E + {b}×J = {c}×S  ({err*100:.3f}%)")
    print()

    # Also search without a+b=c constraint
    print("  Unrestricted search (a×E + b×J = c×S):")
    best_err = float('inf')
    best = None
    for a in fibs:
        for b in fibs:
            for c in fibs:
                lhs = a * amd_e["Earth"] + b * amd_e["Jupiter"]
                rhs = c * amd_e["Saturn"]
                if rhs > 0:
                    err = abs(lhs / rhs - 1)
                    if err < best_err:
                        best_err = err
                        best = (a, b, c, err)
    if best:
        a, b, c, err = best
        print(f"  Best: {a}×E + {b}×J = {c}×S  ({err*100:.3f}%)")
        print(f"  Check: a+b=c? {a}+{b}={a+b} vs {c}")

    print()

    # Test AMD_ecc triads with all planet triplets
    print("  Testing all planet triplets for Fibonacci triads (a×P1 + b×P2 = c×P3):")
    print("  Only showing results with error < 2%:")
    print()

    results = []
    for p1, p2, p3 in [(p1, p2, p3)
                         for p1 in PLANET_NAMES
                         for p2 in PLANET_NAMES
                         for p3 in PLANET_NAMES
                         if PLANET_NAMES.index(p1) < PLANET_NAMES.index(p2)
                         and p3 != p1 and p3 != p2]:
        for a in fibs:
            for b in fibs:
                for c in fibs:
                    lhs = a * amd_e[p1] + b * amd_e[p2]
                    rhs = c * amd_e[p3]
                    if rhs > 0:
                        err = abs(lhs / rhs - 1)
                        if err < 0.02 and a + b == c:
                            results.append((p1, p2, p3, a, b, c, err))

    # Sort by error and show top results
    results.sort(key=lambda x: x[6])
    shown = set()
    for p1, p2, p3, a, b, c, err in results[:15]:
        key = (frozenset([p1, p2]), p3)
        if key not in shown:
            shown.add(key)
            print(f"    {a}×{p1[:3]} + {b}×{p2[:3]} = {c}×{p3[:3]}"
                  f"  ({err*100:.3f}%)  [a+b={a+b}=c={c}]")

    # ═══════════════════════════════════════════════════════════════════════
    # 11. ROBUST QUANTITIES: WHAT SURVIVES ACROSS DEFINITIONS?
    # ═══════════════════════════════════════════════════════════════════════
    section("11. ROBUSTNESS CHECK: MODEL BASE vs J2000")

    print("  Testing which AMD ratios are robust (same at model base and J2000)")
    print()

    amd_e_j2k = {p: MASS[p] * math.sqrt(SMA[p]) * ECC_J2000[p]**2 / 2
                 for p in PLANET_NAMES}

    key_pairs = [("Jupiter", "Saturn"), ("Jupiter", "Uranus"),
                 ("Saturn", "Uranus"), ("Jupiter", "Neptune"),
                 ("Mercury", "Mars"), ("Mercury", "Earth")]

    print(f"  {'Pair':<20} {'Base ratio':>12} {'J2000 ratio':>12}"
          f" {'Base Fib':>10} {'J2000 Fib':>10} {'Δ%':>8}")
    print(f"  {'-'*20} {'-'*12} {'-'*12} {'-'*10} {'-'*10} {'-'*8}")

    for p1, p2 in key_pairs:
        rb = amd_e[p1] / amd_e[p2]
        rj = amd_e_j2k[p1] / amd_e_j2k[p2]
        ab, bb, frb, eb = nearest_fib_ratio(rb)
        aj, bj, frj, ej = nearest_fib_ratio(rj)
        fracb = f"{ab}/{bb}" if bb > 1 else str(ab)
        fracj = f"{aj}/{bj}" if bj > 1 else str(aj)
        delta = (rb / rj - 1) * 100
        print(f"  {p1[:3]+'/'+p2[:3]:<20} {rb:>12.4f} {rj:>12.4f}"
              f" {fracb:>10} {fracj:>10} {delta:>+7.2f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # 12. SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    section("SUMMARY")

    # Count Fibonacci hits
    n_ecc_5 = sum(1 for _, _, _, _, _, e in fib_pairs_ecc if e < 0.05)
    n_incl_5 = sum(1 for _, _, _, _, _, e in fib_pairs_incl if e < 0.05)
    n_total_5 = sum(1 for _, _, _, _, _, e in fib_pairs_total if e < 0.05)
    n_total = len(fib_pairs_ecc)

    print(f"  1. PAIRWISE FIBONACCI RATIOS (within 5% of a Fibonacci ratio):")
    print(f"     AMD_ecc:   {n_ecc_5}/{n_total} pairs")
    print(f"     AMD_incl:  {n_incl_5}/{n_total} pairs")
    print(f"     AMD_total: {n_total_5}/{n_total} pairs")
    print()

    print("  2. KEY AMD ECCENTRICITY RATIOS:")
    for p1, p2 in [("Jupiter", "Saturn"), ("Jupiter", "Uranus"),
                    ("Saturn", "Uranus")]:
        r = amd_e[p1] / amd_e[p2]
        a, b, fr, err = nearest_fib_ratio(r)
        frac = f"{a}/{b}" if b > 1 else str(a)
        print(f"     AMD_{p1[:3]}/AMD_{p2[:3]} = {r:.4f} ≈ {frac} ({err*100:.2f}%)")
    print()

    print("  3. LAW 3 ANALOG: 3×AMD_E + 5×AMD_J = 8×AMD_S?")
    lhs = 3 * amd_e["Earth"] + 5 * amd_e["Jupiter"]
    rhs = 8 * amd_e["Saturn"]
    print(f"     Error: {(lhs/rhs-1)*100:.2f}%")
    print()

    print("  4. CROSS-BELT AMD RATIO:")
    r = outer_total_e / inner_total_e
    a, b, fr, err = nearest_fib_ratio(r)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"     Outer/Inner AMD_ecc = {r:.2f} ≈ {frac} ({err*100:.2f}%)")
    r = outer_total_t / inner_total_t
    a, b, fr, err = nearest_fib_ratio(r)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"     Outer/Inner AMD_total = {r:.2f} ≈ {frac} ({err*100:.2f}%)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
EXOPLANET FIBONACCI LAW TESTS: TRAPPIST-1 and Kepler-90
=========================================================

Tests whether the three Fibonacci Laws of Planetary Motion (discovered for
the Solar System) apply to exoplanet systems.

Solar System Laws (reference):
  Law 2: d × amplitude × √m = ψ (inclination amplitude, single ψ constant)
  Law 3: Σ(203°) w_j = Σ(23°) w_j (inclination balance, 99.9998%)
  Law 5: Σ(203°) v_j = Σ(23°) v_j (eccentricity balance, 99.88%)
  Additional: ξ = e × √m forms Fibonacci-ratio ladders (inner planets)

Key variables:
  ξ = e × √m  (mass-weighted eccentricity)
  η = i × √m  (mass-weighted inclination)

Systems tested:
  1. TRAPPIST-1: 7 planets, all masses known (Agol et al. 2021, PSJ 2, 1)
     - Eccentricities from Grimm et al. 2018 (A&A 613, A68)
     - Famous near-Fibonacci resonance chain
  2. Kepler-90: 8 planets, but only 2 outer masses measured
     - Period ratios testable for all 8 planets

Run: python3 fibonacci_exoplanet_test.py
"""

import math
from itertools import combinations


# ═══════════════════════════════════════════════════════════════════════════
# DATA
# ═══════════════════════════════════════════════════════════════════════════

# Fibonacci numbers and ratios for matching
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

def fib_ratios(max_val=13):
    """Generate all unique Fibonacci ratios p/q with p,q <= max_val."""
    fibs = [f for f in FIB if f <= max_val]
    ratios = set()
    for p in fibs:
        for q in fibs:
            if p != q:
                r = p / q
                if 0.1 < r < 10:
                    ratios.add((p, q, r))
    return sorted(ratios, key=lambda x: x[2])

FIBO_RATIOS = fib_ratios(13)

def closest_fib_ratio(value, threshold=0.05):
    """Find closest Fibonacci ratio to value. Returns (p, q, ratio, error%)."""
    best = None
    best_err = float('inf')
    for p, q, r in FIBO_RATIOS:
        err = abs(value / r - 1)
        if err < best_err:
            best_err = err
            best = (p, q, r, err * 100)
    if best and best[3] < threshold * 100:
        return best
    return None


# ═══════════════════════════════════════════════════════════════════════════
# SOLAR SYSTEM (reference values)
# ═══════════════════════════════════════════════════════════════════════════

# Mass in solar masses, eccentricity (base), inclination amplitude (degrees)
SOLAR = {
    "Venus":   {"m": 2.44784e-6, "e": 0.0068,  "i": 1.055, "P_yr": 0.6152},
    "Earth":   {"m": 3.00273e-6, "e": 0.01532, "i": 0.635, "P_yr": 1.0},
    "Mars":    {"m": 3.22715e-7, "e": 0.0934,  "i": 2.236, "P_yr": 1.8809},
    "Jupiter": {"m": 9.5479e-4,  "e": 0.0489,  "i": 0.063, "P_yr": 11.862},
    "Saturn":  {"m": 2.8588e-4,  "e": 0.0557,  "i": 0.165, "P_yr": 29.457},
    "Uranus":  {"m": 4.3662e-5,  "e": 0.0472,  "i": 0.062, "P_yr": 84.011},
    "Neptune": {"m": 5.1514e-5,  "e": 0.0086,  "i": 0.058, "P_yr": 164.79},
}


# ═══════════════════════════════════════════════════════════════════════════
# TRAPPIST-1 DATA
# ═══════════════════════════════════════════════════════════════════════════

# Star mass: 0.0898 ± 0.0023 M_sun (Agol et al. 2021)
TRAPPIST1_STAR_MASS = 0.0898  # M_sun

# Planet data from Agol et al. 2021 (PSJ 2, 1) and Grimm et al. 2018 (A&A 613, A68)
# Masses in Earth masses, converted to solar mass ratios below
# Eccentricities from Grimm et al. 2018 (photodynamical analysis)
# Inclinations are line-of-sight (transit); mutual inclinations are < 0.1°

M_EARTH_SOLAR = 3.00273e-6  # Earth mass in solar masses

TRAPPIST1 = {
    "b": {"P_days": 1.510826, "a_AU": 0.01154, "m_earth": 1.374,
           "e": 0.00622, "i_transit": 89.728},
    "c": {"P_days": 2.421937, "a_AU": 0.01580, "m_earth": 1.308,
           "e": 0.00654, "i_transit": 89.778},
    "d": {"P_days": 4.049219, "a_AU": 0.02227, "m_earth": 0.388,
           "e": 0.00837, "i_transit": 89.896},
    "e": {"P_days": 6.101013, "a_AU": 0.02925, "m_earth": 0.692,
           "e": 0.00510, "i_transit": 89.793},
    "f": {"P_days": 9.207540, "a_AU": 0.03849, "m_earth": 1.039,
           "e": 0.01007, "i_transit": 89.740},
    "g": {"P_days": 12.352446, "a_AU": 0.04683, "m_earth": 1.321,
           "e": 0.00208, "i_transit": 89.742},
    "h": {"P_days": 18.772866, "a_AU": 0.06189, "m_earth": 0.326,
           "e": 0.00567, "i_transit": 89.805},
}

# Add mass in solar masses (as fraction of STAR mass for consistency,
# but we use stellar mass ratio m/M_star like the solar system)
for p in TRAPPIST1.values():
    p["m_solar"] = p["m_earth"] * M_EARTH_SOLAR
    p["m_star_ratio"] = p["m_earth"] * M_EARTH_SOLAR / TRAPPIST1_STAR_MASS


# ═══════════════════════════════════════════════════════════════════════════
# KEPLER-90 DATA
# ═══════════════════════════════════════════════════════════════════════════

# Star mass: 1.242 ± 0.097 M_sun
KEPLER90_STAR_MASS = 1.242  # M_sun

# Periods from Kepler mission; masses for g, h from Liang et al. 2021 + 2024 update
# Inner planet masses estimated from radii using mass-radius relations
KEPLER90 = {
    "b": {"P_days": 7.008151,   "a_AU": 0.074, "m_earth": 2.0,  "e": None, "note": "estimated mass"},
    "c": {"P_days": 8.719375,   "a_AU": 0.089, "m_earth": 3.0,  "e": None, "note": "estimated mass"},
    "i": {"P_days": 14.44912,   "a_AU": 0.124, "m_earth": 2.5,  "e": None, "note": "estimated mass"},
    "d": {"P_days": 59.73667,   "a_AU": 0.320, "m_earth": 8.0,  "e": None, "note": "estimated mass"},
    "e": {"P_days": 91.93913,   "a_AU": 0.424, "m_earth": 5.0,  "e": None, "note": "estimated mass"},
    "f": {"P_days": 124.9144,   "a_AU": 0.527, "m_earth": 5.5,  "e": None, "note": "estimated mass"},
    "g": {"P_days": 210.73514,  "a_AU": 0.737, "m_earth": 15.0, "e": 0.0292, "note": "TTV mass"},
    "h": {"P_days": 331.60296,  "a_AU": 1.012, "m_earth": 203., "e": 0.0276, "note": "TTV mass"},
}


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def xi(e, m_solar):
    """Mass-weighted eccentricity: ξ = e × √m."""
    return e * math.sqrt(m_solar)

def eta(i_deg, m_solar):
    """Mass-weighted inclination: η = i × √m."""
    return i_deg * math.sqrt(m_solar)

def period_ratio(P1, P2):
    """Period ratio P2/P1 (assumes P2 > P1)."""
    return P2 / P1


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: TRAPPIST-1 PERIOD RATIOS
# ═══════════════════════════════════════════════════════════════════════════

def section_1():
    print()
    print("=" * 80)
    print("  SECTION 1: TRAPPIST-1 PERIOD RATIOS — Fibonacci resonance chain")
    print("=" * 80)
    print()

    planets = list(TRAPPIST1.keys())
    periods = [TRAPPIST1[p]["P_days"] for p in planets]

    # Known near-resonance chain: 8:5, 5:3, 3:2, 3:2, 4:3, 3:2
    print("  Adjacent period ratios:")
    print(f"  {'Pair':<8} {'P₂/P₁':>10} {'Nearest':>10} {'Fib?':>6} {'Error%':>8}")
    print("  " + "─" * 50)

    fib_count = 0
    total_pairs = 0
    for i in range(len(planets) - 1):
        p1, p2 = planets[i], planets[i+1]
        ratio = periods[i+1] / periods[i]
        total_pairs += 1

        match = closest_fib_ratio(ratio, threshold=0.03)
        if match:
            fib_count += 1
            p, q, r, err = match
            print(f"  {p1}/{p2}    {ratio:>10.5f} {q:>3}/{p:<3}     YES  {err:>+7.3f}%")
        else:
            # Check non-Fibonacci simple fractions
            best_p, best_q, best_err = 0, 0, 999
            for np in range(1, 12):
                for nq in range(1, 12):
                    if np != nq:
                        r = nq / np
                        e = abs(ratio / r - 1) * 100
                        if e < best_err and e < 3:
                            best_p, best_q, best_err = np, nq, e
            if best_err < 3:
                print(f"  {p1}/{p2}    {ratio:>10.5f} {best_p:>3}/{best_q:<3}      no  {best_err:>+7.3f}%")
            else:
                print(f"  {p1}/{p2}    {ratio:>10.5f}     —       no       —")

    print()
    print(f"  Fibonacci matches: {fib_count}/{total_pairs} adjacent pairs (within 3%)")

    # Check which period ratios involve Fibonacci numbers
    print()
    print("  Detailed resonance chain analysis:")
    print()

    chain = [
        ("b", "c", 8, 5, "8:5"),
        ("c", "d", 5, 3, "5:3"),
        ("d", "e", 3, 2, "3:2"),
        ("e", "f", 3, 2, "3:2"),
        ("f", "g", 4, 3, "4:3"),
        ("g", "h", 3, 2, "3:2"),
    ]

    fib_nums = {1, 2, 3, 5, 8, 13, 21}

    print(f"  {'Pair':>5}  {'Nominal':>8}  {'Actual':>10}  {'Error%':>8}  {'Both Fib?':>10}")
    print("  " + "─" * 55)
    for p1, p2, n2, n1, label in chain:
        actual = TRAPPIST1[p2]["P_days"] / TRAPPIST1[p1]["P_days"]
        nominal = n2 / n1
        err = (actual / nominal - 1) * 100
        both_fib = "YES" if (n1 in fib_nums and n2 in fib_nums) else "no"
        print(f"    {label:>5}  {nominal:>8.4f}  {actual:>10.5f}  {err:>+7.3f}%  {both_fib:>10}")

    # Count Fibonacci resonances
    fib_res = sum(1 for _, _, n2, n1, _ in chain
                  if n1 in fib_nums and n2 in fib_nums)
    print()
    print(f"  Resonances with BOTH integers being Fibonacci: {fib_res}/{len(chain)}")
    print(f"  Note: 4:3 has 3 ∈ Fib but 4 ∉ Fib")
    print()
    print("  The TRAPPIST-1 resonance chain is dominated by Fibonacci-number ratios:")
    print("  8:5, 5:3, 3:2, 3:2, 3:2 (5 of 6 pairs) — only f:g uses 4:3.")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: TRAPPIST-1 MASS-WEIGHTED ECCENTRICITY (ξ = e√m)
# ═══════════════════════════════════════════════════════════════════════════

def section_2():
    print()
    print()
    print("=" * 80)
    print("  SECTION 2: TRAPPIST-1 ξ = e×√m analysis")
    print("=" * 80)
    print()

    # Compute ξ for each planet using m/M_star (analogous to Solar System)
    print("  Mass-weighted eccentricities (using m/M_star):")
    print(f"  {'Planet':>8} {'e':>10} {'m/M★':>12} {'√(m/M★)':>12} {'ξ = e√m':>14}")
    print("  " + "─" * 62)

    xi_vals = {}
    for name, p in TRAPPIST1.items():
        m_ratio = p["m_star_ratio"]
        sq_m = math.sqrt(m_ratio)
        xi_val = p["e"] * sq_m
        xi_vals[name] = xi_val
        print(f"  {name:>8} {p['e']:>10.5f} {m_ratio:>12.6e} {sq_m:>12.6e} {xi_val:>14.6e}")

    # All pairwise ξ-ratios
    print()
    print("  Pairwise ξ-ratios:")
    print(f"  {'Pair':>8}  {'ξ₁/ξ₂':>10}  {'Nearest Fib':>14}  {'Error%':>8}")
    print("  " + "─" * 50)

    planets = list(TRAPPIST1.keys())
    fib_matches = 0
    total_pairs = 0
    for i in range(len(planets)):
        for j in range(i+1, len(planets)):
            p1, p2 = planets[i], planets[j]
            ratio = xi_vals[p1] / xi_vals[p2]
            if ratio < 1:
                ratio = 1 / ratio
                p1, p2 = p2, p1
            total_pairs += 1
            match = closest_fib_ratio(ratio, threshold=0.05)
            if match:
                fib_matches += 1
                fp, fq, fr, err = match
                print(f"  {p1}/{p2}    {ratio:>10.4f}  {fp:>3}/{fq:<3}          {err:>+7.2f}%")

    print()
    print(f"  Fibonacci matches within 5%: {fib_matches}/{total_pairs} pairs")

    # Check for Fibonacci ladder structure (like Solar System inner planets)
    print()
    print("  Looking for Fibonacci ladder structure (sorted by ξ):")
    sorted_planets = sorted(xi_vals.items(), key=lambda x: x[1])
    print(f"  {'Planet':>8} {'ξ':>14} {'Ratio to smallest':>20} {'Nearest Fib':>14}")
    print("  " + "─" * 62)
    xi_min = sorted_planets[0][1]
    for name, val in sorted_planets:
        ratio = val / xi_min
        match = closest_fib_ratio(ratio, threshold=0.10)
        fib_str = f"{match[0]}/{match[1]} ({match[3]:+.1f}%)" if match else "—"
        print(f"  {name:>8} {val:>14.6e} {ratio:>20.4f} {fib_str:>14}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: TRAPPIST-1 INCLINATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

def section_3():
    print()
    print()
    print("=" * 80)
    print("  SECTION 3: TRAPPIST-1 inclination analysis")
    print("=" * 80)
    print()

    # The transit inclinations are all ~89.7-89.9° — nearly edge-on
    # What matters for the Fibonacci laws is the MUTUAL inclination,
    # i.e., deviation from perfect coplanarity

    # Compute mutual inclination from transit inclination
    # Mutual inclination ≈ |i - 90°| (deviation from perfect alignment)
    # This is NOT the same as the Solar System's inclination amplitude,
    # but it's the closest accessible proxy

    print("  Transit inclinations → mutual inclination proxy:")
    print("  (Deviation from 90° as proxy for misalignment)")
    print()

    print(f"  {'Planet':>8} {'i_transit':>10} {'Δi = |90-i|':>12} {'m/M★':>12} {'η = Δi×√m':>14}")
    print("  " + "─" * 62)

    eta_vals = {}
    for name, p in TRAPPIST1.items():
        delta_i = abs(90.0 - p["i_transit"])
        m_ratio = p["m_star_ratio"]
        eta_val = delta_i * math.sqrt(m_ratio)
        eta_vals[name] = eta_val
        print(f"  {name:>8} {p['i_transit']:>10.3f} {delta_i:>12.3f}° {m_ratio:>12.6e} {eta_val:>14.6e}")

    print()
    print("  WARNING: Transit inclinations measure the line-of-sight geometry,")
    print("  not the dynamical inclination oscillation amplitudes used in the")
    print("  Solar System's Fibonacci laws. The mutual inclinations in TRAPPIST-1")
    print("  are < 0.1° (the flattest known system). This proxy is approximate.")

    # Check for ψ-constant-like structure
    print()
    print("  Testing ψ-constant: is there d such that d × Δi × √m = const?")
    print()

    # Try all Fibonacci weights d ∈ {1, 2, 3, 5, 8, 13}
    fibs = [1, 2, 3, 5, 8, 13]
    planets = list(TRAPPIST1.keys())

    # For each pair, what d-ratio would make d×η constant?
    print(f"  {'P1':>4} {'P2':>4} {'η₁':>12} {'η₂':>12} {'η₁/η₂':>10} {'Nearest d₂/d₁':>14}")
    print("  " + "─" * 62)
    for i in range(len(planets)):
        for j in range(i+1, len(planets)):
            p1, p2 = planets[i], planets[j]
            if eta_vals[p1] > 0 and eta_vals[p2] > 0:
                ratio = eta_vals[p1] / eta_vals[p2]
                # For d1*η1 = d2*η2, need d2/d1 = η1/η2
                match = closest_fib_ratio(ratio, threshold=0.10)
                if match:
                    fp, fq, fr, err = match
                    print(f"  {p1:>4} {p2:>4} {eta_vals[p1]:>12.4e} {eta_vals[p2]:>12.4e} "
                          f"{ratio:>10.4f} {fp:>3}/{fq:<3} ({err:+.1f}%)")

    print()
    print("  Note: Because transit inclination deviations from 90° are dominated")
    print("  by viewing geometry (not dynamics), any Fibonacci matches here are")
    print("  tentative and would need confirmation with dynamical inclinations.")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: TRAPPIST-1 ADDITIVE TRIADS
# ═══════════════════════════════════════════════════════════════════════════

def section_4():
    print()
    print()
    print("=" * 80)
    print("  SECTION 4: TRAPPIST-1 Fibonacci additive triads (ξ)")
    print("=" * 80)
    print()

    # Test: do any triplets satisfy a·ξ₁ + b·ξ₂ = c·ξ₃
    # where (a, b, c) are Fibonacci numbers with a + b = c?

    fib_triads = [(1, 1, 2), (1, 2, 3), (2, 3, 5), (3, 5, 8), (5, 8, 13)]

    xi_vals = {}
    for name, p in TRAPPIST1.items():
        xi_vals[name] = p["e"] * math.sqrt(p["m_star_ratio"])

    planets = list(TRAPPIST1.keys())

    print("  Testing a·ξ₁ + b·ξ₂ = c·ξ₃ for Fibonacci triads (a+b=c):")
    print()

    best_matches = []
    for i in range(len(planets)):
        for j in range(i+1, len(planets)):
            for k in range(len(planets)):
                if k == i or k == j:
                    continue
                for a, b, c in fib_triads:
                    lhs = a * xi_vals[planets[i]] + b * xi_vals[planets[j]]
                    rhs = c * xi_vals[planets[k]]
                    if rhs > 0:
                        err = abs(lhs / rhs - 1) * 100
                        if err < 5:
                            best_matches.append((planets[i], planets[j], planets[k],
                                                a, b, c, err))

    if best_matches:
        best_matches.sort(key=lambda x: x[6])
        print(f"  {'P₁':>4} {'P₂':>4} {'P₃':>4} {'a':>3} {'b':>3} {'c':>3} {'Error%':>8}")
        print("  " + "─" * 40)
        for p1, p2, p3, a, b, c, err in best_matches[:15]:
            print(f"  {p1:>4} {p2:>4} {p3:>4} {a:>3} {b:>3} {c:>3} {err:>+7.2f}%")
    else:
        print("  No triads found within 5% error.")

    print()

    # Also test with permuted weight assignments
    print("  Also testing a·ξ₁ = b·ξ₂ + c·ξ₃ (rearranged):")
    best2 = []
    for i in range(len(planets)):
        for j in range(i+1, len(planets)):
            for k in range(j+1, len(planets)):
                for a, b, c in fib_triads:
                    # All 3 arrangements
                    x = [xi_vals[planets[i]], xi_vals[planets[j]], xi_vals[planets[k]]]
                    for p, q, r in [(0,1,2), (0,2,1), (1,2,0)]:
                        lhs = c * x[r]
                        rhs = a * x[p] + b * x[q]
                        if lhs > 0:
                            err = abs(rhs / lhs - 1) * 100
                            if err < 3:
                                names = [planets[i], planets[j], planets[k]]
                                best2.append((names[p], names[q], names[r],
                                            a, b, c, err))

    if best2:
        best2.sort(key=lambda x: x[6])
        print(f"  {'P₁':>4} {'P₂':>4} {'P₃':>4} {'a':>3} {'b':>3} {'c':>3} {'Error%':>8}")
        print("  " + "─" * 40)
        for p1, p2, p3, a, b, c, err in best2[:10]:
            print(f"  {p1:>4} {p2:>4} {p3:>4} {a:>3} {b:>3} {c:>3} {err:>+7.2f}%")
    else:
        print("  No triads found within 3% error.")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: KEPLER-90 PERIOD RATIOS
# ═══════════════════════════════════════════════════════════════════════════

def section_5():
    print()
    print()
    print("=" * 80)
    print("  SECTION 5: KEPLER-90 PERIOD RATIOS")
    print("=" * 80)
    print()

    planets = list(KEPLER90.keys())
    periods = [KEPLER90[p]["P_days"] for p in planets]

    print("  Adjacent period ratios:")
    print(f"  {'Pair':>8}  {'P₂/P₁':>10}  {'Nearest simple':>14}  {'Fib?':>6}  {'Error%':>8}")
    print("  " + "─" * 55)

    fib_count = 0
    for i in range(len(planets) - 1):
        p1, p2 = planets[i], planets[i+1]
        ratio = periods[i+1] / periods[i]

        # Find closest simple fraction
        best_n, best_d, best_err = 0, 0, 999
        for n in range(1, 15):
            for d in range(1, 15):
                r = n / d
                e = abs(ratio / r - 1) * 100
                if e < best_err and 0.5 < r < 10:
                    best_n, best_d, best_err = n, d, e

        fib_nums = {1, 2, 3, 5, 8, 13}
        is_fib = best_n in fib_nums and best_d in fib_nums
        if is_fib:
            fib_count += 1

        fib_str = "YES" if is_fib else "no"
        print(f"  {p1:>3}/{p2:<3}  {ratio:>10.5f}  {best_d:>3}:{best_n:<3}         {fib_str:>6}  {best_err:>+7.3f}%")

    print()
    print(f"  Fibonacci-only fractions: {fib_count}/{len(planets)-1} adjacent pairs")

    # All-pairs period ratios
    print()
    print("  All-pairs period ratios — checking Fibonacci fractions:")
    print(f"  {'P₁':>4} {'P₂':>4} {'P₂/P₁':>10} {'Nearest Fib':>14} {'Error%':>8}")
    print("  " + "─" * 50)

    fib_all = 0
    total_all = 0
    for i in range(len(planets)):
        for j in range(i+1, len(planets)):
            p1, p2 = planets[i], planets[j]
            ratio = periods[j] / periods[i]
            total_all += 1
            match = closest_fib_ratio(ratio, threshold=0.03)
            if match:
                fib_all += 1
                fp, fq, fr, err = match
                print(f"  {p1:>4} {p2:>4} {ratio:>10.4f} {fp:>3}/{fq:<3}          {err:>+7.2f}%")

    print()
    print(f"  Fibonacci ratio matches (within 3%): {fib_all}/{total_all} pairs")

    # Known near-commensurabilities
    print()
    print("  Known near-commensurabilities in Kepler-90:")
    print("    b:c ≈ 4:5, c:i ≈ 3:5, i:d ≈ 1:4")
    print("    d:e:f:g:h ≈ 2:3:4:7:11")
    print("    Note: 2, 3, 5, 8, 13 are Fibonacci; 4, 7, 11 are not")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: KEPLER-90 OUTER PLANETS ξ ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

def section_6():
    print()
    print()
    print("=" * 80)
    print("  SECTION 6: KEPLER-90 outer planets g & h — ξ analysis")
    print("=" * 80)
    print()

    print("  Only planets g and h have measured masses and eccentricities.")
    print()

    g = KEPLER90["g"]
    h = KEPLER90["h"]

    m_g = g["m_earth"] * M_EARTH_SOLAR / KEPLER90_STAR_MASS
    m_h = h["m_earth"] * M_EARTH_SOLAR / KEPLER90_STAR_MASS

    xi_g = g["e"] * math.sqrt(m_g)
    xi_h = h["e"] * math.sqrt(m_h)

    print(f"  Planet g: m/M★ = {m_g:.6e}, e = {g['e']}, ξ = {xi_g:.6e}")
    print(f"  Planet h: m/M★ = {m_h:.6e}, e = {h['e']}, ξ = {xi_h:.6e}")
    print()

    ratio = xi_h / xi_g
    print(f"  ξ_h / ξ_g = {ratio:.4f}")
    match = closest_fib_ratio(ratio, threshold=0.10)
    if match:
        fp, fq, fr, err = match
        print(f"  Nearest Fibonacci ratio: {fp}/{fq} = {fr:.4f} (error: {err:+.2f}%)")
    else:
        print(f"  No Fibonacci ratio match within 10%")

    print()
    print("  Period ratio g:h:")
    p_ratio = h["P_days"] / g["P_days"]
    print(f"    P_h/P_g = {p_ratio:.5f}")
    match = closest_fib_ratio(p_ratio, threshold=0.05)
    if match:
        fp, fq, fr, err = match
        print(f"    Nearest Fibonacci ratio: {fp}/{fq} = {fr:.5f} (error: {err:+.2f}%)")

    # Mass ratio
    m_ratio = h["m_earth"] / g["m_earth"]
    print(f"    m_h/m_g = {m_ratio:.2f}")
    match = closest_fib_ratio(m_ratio, threshold=0.10)
    if match:
        fp, fq, fr, err = match
        print(f"    Nearest Fibonacci ratio: {fp}/{fq} = {fr:.4f} (error: {err:+.2f}%)")
    else:
        print(f"    No Fibonacci ratio match within 10% (mass ratio ≈ {m_ratio:.1f})")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: COMPARISON — Solar System vs TRAPPIST-1 Fibonacci scores
# ═══════════════════════════════════════════════════════════════════════════

def section_7():
    print()
    print()
    print("=" * 80)
    print("  SECTION 7: COMPARATIVE ANALYSIS — Fibonacci content")
    print("=" * 80)
    print()

    # Solar System period ratios (adjacent pairs)
    solar_planets = ["Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]
    solar_periods = [SOLAR[p]["P_yr"] for p in solar_planets]

    print("  Solar System adjacent period ratios:")
    print(f"  {'Pair':>16}  {'P₂/P₁':>10}  {'Nearest Fib':>14}  {'Error%':>8}")
    print("  " + "─" * 55)

    ss_fib = 0
    ss_total = len(solar_planets) - 1
    for i in range(ss_total):
        p1, p2 = solar_planets[i], solar_planets[i+1]
        ratio = solar_periods[i+1] / solar_periods[i]
        match = closest_fib_ratio(ratio, threshold=0.05)
        if match:
            ss_fib += 1
            fp, fq, fr, err = match
            print(f"  {p1:>8}/{p2:<8} {ratio:>10.4f}  {fp:>3}/{fq:<3}          {err:>+7.2f}%")
        else:
            print(f"  {p1:>8}/{p2:<8} {ratio:>10.4f}         —           —")

    print()
    print(f"  Solar System: {ss_fib}/{ss_total} adjacent pairs match Fibonacci ratios (5%)")

    # TRAPPIST-1 period ratios
    t1_planets = list(TRAPPIST1.keys())
    t1_periods = [TRAPPIST1[p]["P_days"] for p in t1_planets]

    t1_fib = 0
    t1_total = len(t1_planets) - 1
    for i in range(t1_total):
        ratio = t1_periods[i+1] / t1_periods[i]
        match = closest_fib_ratio(ratio, threshold=0.05)
        if match:
            t1_fib += 1

    print(f"  TRAPPIST-1:   {t1_fib}/{t1_total} adjacent pairs match Fibonacci ratios (5%)")

    # Kepler-90
    k90_planets = list(KEPLER90.keys())
    k90_periods = [KEPLER90[p]["P_days"] for p in k90_planets]

    k90_fib = 0
    k90_total = len(k90_planets) - 1
    for i in range(k90_total):
        ratio = k90_periods[i+1] / k90_periods[i]
        match = closest_fib_ratio(ratio, threshold=0.05)
        if match:
            k90_fib += 1

    print(f"  Kepler-90:    {k90_fib}/{k90_total} adjacent pairs match Fibonacci ratios (5%)")

    # ξ-ratio analysis
    print()
    print("  Mass-weighted eccentricity (ξ) pairwise Fibonacci matches:")
    print()

    # Solar System ξ values
    ss_xi = {}
    for name, p in SOLAR.items():
        ss_xi[name] = p["e"] * math.sqrt(p["m"])

    ss_xi_fib = 0
    ss_xi_total = 0
    for p1, p2 in combinations(SOLAR.keys(), 2):
        ratio = ss_xi[p1] / ss_xi[p2]
        if ratio < 1:
            ratio = 1 / ratio
        ss_xi_total += 1
        match = closest_fib_ratio(ratio, threshold=0.05)
        if match:
            ss_xi_fib += 1

    print(f"  Solar System:  {ss_xi_fib}/{ss_xi_total} ξ-ratio pairs match Fibonacci (5%)")

    # TRAPPIST-1 ξ values
    t1_xi = {}
    for name, p in TRAPPIST1.items():
        t1_xi[name] = p["e"] * math.sqrt(p["m_star_ratio"])

    t1_xi_fib = 0
    t1_xi_total = 0
    for p1, p2 in combinations(TRAPPIST1.keys(), 2):
        ratio = t1_xi[p1] / t1_xi[p2]
        if ratio < 1:
            ratio = 1 / ratio
        t1_xi_total += 1
        match = closest_fib_ratio(ratio, threshold=0.05)
        if match:
            t1_xi_fib += 1

    print(f"  TRAPPIST-1:    {t1_xi_fib}/{t1_xi_total} ξ-ratio pairs match Fibonacci (5%)")

    # Summary table
    print()
    print("  ┌──────────────┬────────────┬─────────────┬─────────────────────┐")
    print("  │ System       │ Planets    │ Period-Fib% │ ξ-Fib% (if avail)  │")
    print("  ├──────────────┼────────────┼─────────────┼─────────────────────┤")
    print(f"  │ Solar System │ 7 (Venus-N)│ {ss_fib}/{ss_total} = {100*ss_fib/ss_total:.0f}%     │ {ss_xi_fib}/{ss_xi_total} = {100*ss_xi_fib/ss_xi_total:.0f}%            │")
    print(f"  │ TRAPPIST-1   │ 7 (b-h)   │ {t1_fib}/{t1_total} = {100*t1_fib/t1_total:.0f}%     │ {t1_xi_fib}/{t1_xi_total} = {100*t1_xi_fib/t1_xi_total:.0f}%            │")
    print(f"  │ Kepler-90    │ 8 (b-h)   │ {k90_fib}/{k90_total} = {100*k90_fib/k90_total:.0f}%     │ insufficient data   │")
    print("  └──────────────┴────────────┴─────────────┴─────────────────────┘")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8: TRAPPIST-1 "HOLISTIC YEAR" ANALOG
# ═══════════════════════════════════════════════════════════════════════════

def section_8():
    print()
    print()
    print("=" * 80)
    print("  SECTION 8: TRAPPIST-1 — searching for a 'Holistic Year' analog")
    print("=" * 80)
    print()

    # In the Solar System, H = 333,888 years is the fundamental period
    # Can we find a fundamental period for TRAPPIST-1?

    # One approach: find the LCM-like combination of all periods
    # Or: find integer multiples of periods that all nearly coincide

    periods = [TRAPPIST1[p]["P_days"] for p in TRAPPIST1]
    names = list(TRAPPIST1.keys())

    # Resonance chain: the periods are close to simple integer ratios
    # Let's express each period as n_i × T_fundamental

    # From the resonance chain: b:c:d:e:f:g:h ≈ 24:15:9:6:4:3:2
    # (inverting: 1/P ∝ n_i)
    # Actually, from the known near-resonances:
    # P_c/P_b ≈ 8/5, P_d/P_c ≈ 5/3, P_e/P_d ≈ 3/2,
    # P_f/P_e ≈ 3/2, P_g/P_f ≈ 4/3, P_h/P_g ≈ 3/2

    # Chain from b: b → ×8/5 → ×5/3 → ×3/2 → ×3/2 → ×4/3 → ×3/2
    # Cumulative: 1, 8/5, 8/3, 4, 6, 8, 12
    # So P_b : P_c : ... : P_h ≈ 1 : 8/5 : 8/3 : 4 : 6 : 8 : 12

    chain_ratios = [1, 8/5, (8/5)*(5/3), (8/5)*(5/3)*(3/2),
                    (8/5)*(5/3)*(3/2)*(3/2), (8/5)*(5/3)*(3/2)*(3/2)*(4/3),
                    (8/5)*(5/3)*(3/2)*(3/2)*(4/3)*(3/2)]

    print("  Nominal resonance chain (from b):")
    print(f"  {'Planet':>8} {'P (days)':>10} {'P/P_b':>10} {'Nominal':>10} {'Error%':>8}")
    print("  " + "─" * 55)
    for i, name in enumerate(names):
        actual_ratio = periods[i] / periods[0]
        nominal = chain_ratios[i]
        err = (actual_ratio / nominal - 1) * 100
        print(f"  {name:>8} {periods[i]:>10.4f} {actual_ratio:>10.5f} {nominal:>10.5f} {err:>+7.3f}%")

    # LCM of denominators in the chain
    # P_b × 24 should be close to a common period
    # Multiply: 1 × 8/5 × 5/3 × 3/2 × 3/2 × 4/3 × 3/2 = 8×5×3×3×4×3 / (5×3×2×2×3×2) = 1296/360 = 3.6
    # Wait, let me compute: P_h/P_b = product of all ratios
    print()
    print(f"  P_h/P_b = {periods[-1]/periods[0]:.5f} (nominal: {chain_ratios[-1]:.5f} = 12)")

    # The "super-period" where all planets return to conjunction
    # Approximate: find T such that T/P_i ≈ integer for all i
    # This is the LCM analog

    # From exact Agol periods, find best integer fits
    print()
    print("  Searching for common super-period T where T/P_i ≈ integer:")
    print()

    best_T = None
    best_err = 999

    for T_mult in range(10, 500):
        T = T_mult * periods[0]  # T = n × P_b
        total_err = 0
        for p in periods:
            n = T / p
            nearest_int = round(n)
            if nearest_int > 0:
                total_err += abs(n / nearest_int - 1)
        avg_err = total_err / len(periods)
        if avg_err < best_err:
            best_err = avg_err
            best_T = T
            best_mult = T_mult

    print(f"  Best super-period: T = {best_mult} × P_b = {best_T:.4f} days")
    print(f"  Average fractional deviation from integers: {best_err*100:.4f}%")
    print()
    print(f"  {'Planet':>8} {'T/P':>10} {'Nearest int':>12} {'Error%':>8}")
    print("  " + "─" * 45)
    for i, name in enumerate(names):
        n = best_T / periods[i]
        nearest = round(n)
        err = (n / nearest - 1) * 100
        print(f"  {name:>8} {n:>10.4f} {nearest:>12} {err:>+7.3f}%")

    print()
    print(f"  Super-period in years: {best_T/365.25:.2f} years")
    print(f"  Compare: Solar System H = 333,888 years")
    print()
    print("  Note: TRAPPIST-1's super-period is vastly shorter because all")
    print("  orbital periods are < 20 days (vs years for the Solar System).")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9: SUMMARY AND CONCLUSIONS
# ═══════════════════════════════════════════════════════════════════════════

def section_9():
    print()
    print()
    print("=" * 80)
    print("  SECTION 9: SUMMARY AND CONCLUSIONS")
    print("=" * 80)
    print()

    print("  1. TRAPPIST-1 PERIOD RATIOS — STRONG Fibonacci content")
    print("     5 of 6 adjacent period ratios involve Fibonacci numbers only:")
    print("     8:5, 5:3, 3:2, 3:2, 3:2 (only f:g ≈ 4:3 uses non-Fibonacci 4)")
    print("     This is consistent with Pletser (2019) and KAM theory predictions.")
    print()

    print("  2. TRAPPIST-1 ξ = e√m — INCONCLUSIVE")
    print("     Eccentricities are extremely small (~0.002-0.01), all similar in")
    print("     magnitude. The ξ values don't show the wide dynamic range (Venus")
    print("     to Mars spans 14×) seen in the Solar System. Any Fibonacci structure")
    print("     in ξ-ratios would be buried in measurement uncertainty.")
    print()

    print("  3. TRAPPIST-1 INCLINATIONS — NOT TESTABLE with current data")
    print("     Transit inclinations measure viewing geometry, not dynamical")
    print("     inclination amplitudes. TRAPPIST-1 is the flattest known system")
    print("     (mutual inclinations < 0.1°), so η = i×√m values would be")
    print("     extremely small and dominated by measurement error.")
    print()

    print("  4. KEPLER-90 — LIMITED by mass data")
    print("     Only 2 of 8 planets have TTV-measured masses and eccentricities.")
    print("     Period ratios show some Fibonacci content but also non-Fibonacci")
    print("     fractions (4:5 for b:c, ~4:1 for i:d).")
    print()

    print("  5. KEY INSIGHT: The Fibonacci Laws require mass-weighted variables")
    print("     (ξ = e√m, η = i√m), which need BOTH masses AND eccentricities/")
    print("     inclinations at high precision. Current exoplanet data provides:")
    print("     - Periods: excellent (PPM precision from transit timing)")
    print("     - Masses: good for TRAPPIST-1 (3-5%), limited elsewhere")
    print("     - Eccentricities: poor (≲0.01, measurement errors comparable)")
    print("     - Dynamical inclinations: unavailable for nearly all systems")
    print()

    print("  6. MOST PROMISING EXOPLANET TARGETS for future testing:")
    print("     - Systems with independently measured eccentricities (RV + transit)")
    print("     - Systems with large eccentricity spread (not near-circular)")
    print("     - Systems with TTV-measured masses for 4+ planets")
    print("     - Kepler-80 (5 planets, TTVs available)")
    print("     - TOI-178 (6 planets in Laplace resonance chain)")
    print()

    print("  OVERALL: The TRAPPIST-1 resonance chain strongly supports the")
    print("  Fibonacci period ratio prediction from KAM theory. However, the")
    print("  deeper Fibonacci Laws (ξ-ladders, ψ-constant, additive triads)")
    print("  cannot yet be tested on exoplanets due to insufficient precision")
    print("  in eccentricity and inclination measurements.")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    print()
    print("╔" + "═" * 78 + "╗")
    print("║  EXOPLANET FIBONACCI LAW TESTS: TRAPPIST-1 and Kepler-90" + " " * 21 + "║")
    print("╚" + "═" * 78 + "╝")

    section_1()   # TRAPPIST-1 period ratios
    section_2()   # TRAPPIST-1 ξ = e√m
    section_3()   # TRAPPIST-1 inclination
    section_4()   # TRAPPIST-1 additive triads
    section_5()   # Kepler-90 period ratios
    section_6()   # Kepler-90 outer planets
    section_7()   # Comparative analysis
    section_8()   # TRAPPIST-1 "Holistic Year" analog
    section_9()   # Summary

    print()


if __name__ == "__main__":
    main()

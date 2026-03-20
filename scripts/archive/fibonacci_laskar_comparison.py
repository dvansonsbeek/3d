#!/usr/bin/env python3
"""
PUBLISHED SECULAR SOLUTIONS vs FIBONACCI ECCENTRICITY STRUCTURE
================================================================

Uses Brouwer & van Woerkom (1950) eccentricity eigenvectors — the published
secular solution that includes higher-order terms — to compute proper
eccentricities and test the Fibonacci ladder.

Two definitions of "proper eccentricity" are tested:
  A. Dominant eigenmode amplitude: max_l |E_{l,i}| for planet i
  B. Oscillation midpoint: (e_max + e_min) / 2 from time evolution

Data source: Fitzpatrick, "An Introduction to Celestial Mechanics",
Chapter 10, Tables 10.1–10.4 (UT Austin). These tables reproduce the
Brouwer & van Woerkom (1950) secular solution, as also given in
Murray & Dermott (1999), "Solar System Dynamics", Tables 7.1–7.3.

Eigenfrequency comparison: first-order (our A matrix), BvW (1950),
and Laskar (1988/1990).

References:
  - Brouwer, D. & van Woerkom, A.J.J. (1950), Astronomical Papers XIII
  - Laskar, J. (1988), A&A 198, 341 — secular evolution 10 Myr
  - Laskar, J. (1990), Icarus 88, 266 — chaotic motion eigenfreqs
  - Murray, C.D. & Dermott, S.F. (1999), Solar System Dynamics, Ch. 7
  - Fitzpatrick, R. (2012), An Introduction to Celestial Mechanics, Ch. 10
"""

import numpy as np
from fibonacci_data import *

np.set_printoptions(precision=6, suppress=True)


# ═══════════════════════════════════════════════════════════════════════════
# PUBLISHED DATA: BvW/Fitzpatrick Tables 10.1–10.4
# ═══════════════════════════════════════════════════════════════════════════

# Eigenfrequencies g_l and f_l (arcsec/yr) — Table 10.1
# These are from the BvW secular solution (includes GR for inner planets)
BVW_G = np.array([5.462, 7.346, 17.33, 18.00, 3.724, 22.44, 2.708, 0.6345])
BVW_F = np.array([-5.201, -6.570, -18.74, -17.64, 0.000, -25.90, -2.911, -0.6788])

# Phase angles (degrees) — Table 10.1
BVW_BETA = np.array([89.65, 195.0, 336.1, 319.0, 30.12, 131.0, 109.9, 67.98])
BVW_GAMMA = np.array([20.23, 318.3, 255.6, 296.9, 107.5, 127.3, 315.6, 202.8])

# Eccentricity eigenvector components E[l,i] × 10^5 — Table 10.2
# Rows: l = 1...8 (modes), Columns: i = 1...8 (planets Mer→Nep)
BVW_E_RAW = np.array([
    [18128,   629,   404,    66,     0,     0,     0,     0],  # l=1 (g1)
    [-2331,  1919,  1497,   265,    -1,    -1,     0,     0],  # l=2 (g2)
    [  154, -1262,  1046,  2979,     0,     0,     0,     0],  # l=3 (g3)
    [ -169,  1489, -1485,  7281,     0,     0,     0,     0],  # l=4 (g4)
    [ 2446,  1636,  1634,  1878,  4331,  3416, -4388,   159],  # l=5 (g5)
    [   10,   -51,   242,  1562, -1560,  4830,  -180,   -13],  # l=6 (g6)
    [   59,    58,    62,    82,   207,   189,  2999,  -322],  # l=7 (g7)
    [    0,     1,     1,     2,     6,     6,   144,   954],  # l=8 (g8)
])

# Convert to actual eccentricity units
BVW_E = BVW_E_RAW / 1e5

# Published min/max eccentricities — Table 10.4
BVW_E_EXTREMES = {
    "Mercury":  (0.130,   0.233),
    "Venus":    (0.000,   0.0705),
    "Earth":    (0.000,   0.0638),
    "Mars":     (0.0444,  0.141),
    "Jupiter":  (0.0256,  0.0611),
    "Saturn":   (0.0121,  0.0845),
    "Uranus":   (0.0106,  0.0771),
    "Neptune":  (0.00460, 0.0145),
}

# Laskar (1990) eigenfrequencies for comparison
LASKAR_G = np.array([5.59, 7.45, 17.37, 17.92, 4.26, 28.22, 3.09, 0.67])
LASKAR_LABELS = ["g₁", "g₂", "g₃", "g₄", "g₅", "g₆", "g₇", "g₈"]


def section(title):
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
    print()


def main():
    print()
    print("  PUBLISHED SECULAR SOLUTIONS vs FIBONACCI ECCENTRICITY STRUCTURE")
    print("  " + "=" * 60)

    # ═══════════════════════════════════════════════════════════════════════
    # 1. EIGENFREQUENCY COMPARISON
    # ═══════════════════════════════════════════════════════════════════════
    section("1. EIGENFREQUENCY COMPARISON: FIRST-ORDER vs BvW vs LASKAR")

    # Build our first-order A matrix for comparison
    from fibonacci_gr_eccentricity import build_A_matrix
    A = build_A_matrix(include_gr=False)
    RAD_TO_ARCSEC = 3600 * 180 / np.pi

    evals, evecs = np.linalg.eigh(A)
    our_g = np.sort(evals) * RAD_TO_ARCSEC  # rad/yr → "/yr
    # Reorder to match conventional g1...g8
    our_g_sorted = np.sort(our_g)

    # Sort BvW and Laskar for comparison
    bvw_sorted = np.sort(BVW_G)
    laskar_sorted = np.sort(LASKAR_G)

    print(f"  {'Mode':<6} {'1st-order':>10} {'BvW 1950':>10} {'Laskar':>10}"
          f"  {'1st/L err':>10} {'BvW/L err':>10}")
    print(f"  {'-'*6} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")

    rms_1st = 0
    rms_bvw = 0
    for i in range(8):
        e1 = (our_g_sorted[i] / laskar_sorted[i] - 1) * 100
        e2 = (bvw_sorted[i] / laskar_sorted[i] - 1) * 100
        rms_1st += e1**2
        rms_bvw += e2**2
        print(f"  {LASKAR_LABELS[i]:<6} {our_g_sorted[i]:>10.3f} {bvw_sorted[i]:>10.3f}"
              f" {laskar_sorted[i]:>10.3f}  {e1:>+9.1f}%  {e2:>+9.1f}%")

    rms_1st = np.sqrt(rms_1st / 8)
    rms_bvw = np.sqrt(rms_bvw / 8)
    print(f"\n  RMS error vs Laskar:  1st-order {rms_1st:.1f}%,  BvW {rms_bvw:.1f}%")
    print(f"  BvW is {rms_1st/rms_bvw:.0f}× more accurate than 1st-order secular theory")

    # ═══════════════════════════════════════════════════════════════════════
    # 2. EIGENVECTOR ANALYSIS: DOMINANT MODES
    # ═══════════════════════════════════════════════════════════════════════
    section("2. BvW EIGENVECTOR DECOMPOSITION")

    print("  Eccentricity = Σ_l E_{l,i} × exp(i × (g_l × t + β_l))")
    print()
    print(f"  {'Planet':<10} {'Dominant':>8} {'e_dom':>10} {'2nd mode':>10}"
          f" {'e_2nd':>10} {'ratio':>8}")
    print(f"  {'-'*10} {'-'*8} {'-'*10} {'-'*10} {'-'*10} {'-'*8}")

    dominant_e = {}
    for idx, p in enumerate(PLANET_NAMES):
        # Amplitudes for this planet across all modes
        amps = np.abs(BVW_E[:, idx])
        sorted_modes = np.argsort(amps)[::-1]
        dom_l = sorted_modes[0]
        sec_l = sorted_modes[1]
        e_dom = amps[dom_l]
        e_sec = amps[sec_l]
        dominant_e[p] = e_dom
        ratio = e_dom / e_sec if e_sec > 0 else float('inf')
        print(f"  {p:<10} g{dom_l+1:<7d} {e_dom:>10.5f} g{sec_l+1:<9d}"
              f" {e_sec:>10.5f} {ratio:>7.1f}×")

    print()
    print("  KEY: ratio = dominant/second. Higher = cleaner mode separation.")
    print("  Earth has ratio ~1.0 — NO strongly dominant mode!")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. PROPER ECCENTRICITIES: THREE DEFINITIONS
    # ═══════════════════════════════════════════════════════════════════════
    section("3. PROPER ECCENTRICITIES: THREE DEFINITIONS")

    print("  Definition A: Dominant eigenmode amplitude max_l |E_{l,i}|")
    print("  Definition B: BvW published midpoint (e_max + e_min) / 2")
    print("  Definition C: Numerical midpoint from time evolution")
    print()

    # Compute numerical midpoints from time evolution
    # e_i(t) = |Σ_l E_{l,i} × exp(i × θ_l(t))| where θ_l = g_l × t + β_l
    T_EVAL = 50_000_000  # 50 Myr — long enough for full oscillation
    N_STEPS = 500_000
    t = np.linspace(0, T_EVAL, N_STEPS)

    # Convert eigenfrequencies to rad/yr
    g_rad = BVW_G * np.pi / (180 * 3600)  # "/yr → rad/yr
    beta_rad = BVW_BETA * np.pi / 180  # degrees → radians

    numerical_midpoint = {}
    numerical_min = {}
    numerical_max = {}

    for idx, p in enumerate(PLANET_NAMES):
        # Compute complex eccentricity vector at each time
        z = np.zeros(N_STEPS, dtype=complex)
        for l in range(8):
            phase = g_rad[l] * t + beta_rad[l]
            z += BVW_E[l, idx] * np.exp(1j * phase)
        e_t = np.abs(z)
        numerical_midpoint[p] = (np.max(e_t) + np.min(e_t)) / 2
        numerical_min[p] = np.min(e_t)
        numerical_max[p] = np.max(e_t)

    # Print comparison table
    print(f"  {'Planet':<10} {'A: dom':>10} {'B: pub':>10} {'C: num':>10}"
          f"  {'Model base':>10} {'J2000':>10}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10}  {'-'*10} {'-'*10}")

    for p in PLANET_NAMES:
        e_lo, e_hi = BVW_E_EXTREMES[p]
        pub_mid = (e_lo + e_hi) / 2
        print(f"  {p:<10} {dominant_e[p]:>10.5f} {pub_mid:>10.5f}"
              f" {numerical_midpoint[p]:>10.5f}"
              f"  {ECC_BASE[p]:>10.5f} {ECC_J2000[p]:>10.5f}")

    # ═══════════════════════════════════════════════════════════════════════
    # 4. COMPARISON WITH MODEL BASE ECCENTRICITIES
    # ═══════════════════════════════════════════════════════════════════════
    section("4. BvW PROPER ECCENTRICITIES vs MODEL BASE VALUES")

    print(f"  {'Planet':<10} {'BvW mid':>10} {'Model base':>10} {'Δ%':>8}"
          f"   {'BvW dom':>10} {'Model base':>10} {'Δ%':>8}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*8}"
          f"   {'-'*10} {'-'*10} {'-'*8}")

    for p in PLANET_NAMES:
        mid = numerical_midpoint[p]
        base = ECC_BASE[p]
        err_mid = (mid / base - 1) * 100 if base > 0 else float('inf')
        dom = dominant_e[p]
        err_dom = (dom / base - 1) * 100 if base > 0 else float('inf')
        print(f"  {p:<10} {mid:>10.5f} {base:>10.5f} {err_mid:>+7.1f}%"
              f"   {dom:>10.5f} {base:>10.5f} {err_dom:>+7.1f}%")

    print()
    print("  'BvW mid' = numerical oscillation midpoint (≈ published Table 10.4)")
    print("  'BvW dom' = dominant eigenmode amplitude")

    # ═══════════════════════════════════════════════════════════════════════
    # 5. FIBONACCI ECCENTRICITY LADDER — ALL THREE DEFINITIONS
    # ═══════════════════════════════════════════════════════════════════════
    section("5. INNER PLANET FIBONACCI ECCENTRICITY LADDER")

    print("  Ladder: d_ecc × ξ = constant for Venus, Earth, Mars, Mercury")
    print("  where ξ = e × √m and d_ecc from fibonacci_data.py")
    print()

    inner_planets = ["Venus", "Earth", "Mars", "Mercury"]
    d_ecc_vals = {"Venus": 1, "Earth": 2/5, "Mars": 1/5, "Mercury": 1/8}

    # Test with multiple eccentricity definitions
    definitions = {
        "Model base":       {p: ECC_BASE[p] for p in inner_planets},
        "J2000":            {p: ECC_J2000[p] for p in inner_planets},
        "BvW midpoint":     {p: numerical_midpoint[p] for p in inner_planets},
        "BvW dominant":     {p: dominant_e[p] for p in inner_planets},
    }

    for label, ecc_dict in definitions.items():
        products = []
        for p in inner_planets:
            xi = ecc_dict[p] * SQRT_M[p]
            d = d_ecc_vals[p]
            products.append(d * xi)
        mean_prod = np.mean(products)
        spread = (max(products) - min(products)) / mean_prod * 100
        print(f"  {label:<20}  d×ξ products: ", end="")
        for i, p in enumerate(inner_planets):
            print(f"{products[i]:.4e}", end="  ")
        print(f"  spread = {spread:.2f}%")

    print()
    print("  The Fibonacci ladder requires spread → 0%. Model base achieves 0.01%.")

    # ═══════════════════════════════════════════════════════════════════════
    # 6. JUPITER–SATURN ECCENTRICITY RATIO
    # ═══════════════════════════════════════════════════════════════════════
    section("6. JUPITER–SATURN ECCENTRICITY RATIO")

    print(f"  {'Source':<25} {'e_J':>10} {'e_S':>10} {'e_J/e_S':>10}"
          f"  {'Model':>10} {'err':>8}")
    print(f"  {'-'*25} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*8}")

    model_ratio = ECC_BASE["Jupiter"] / ECC_BASE["Saturn"]

    sources = {
        "Model base": (ECC_BASE["Jupiter"], ECC_BASE["Saturn"]),
        "J2000": (ECC_J2000["Jupiter"], ECC_J2000["Saturn"]),
        "BvW midpoint": (numerical_midpoint["Jupiter"], numerical_midpoint["Saturn"]),
        "BvW dominant": (dominant_e["Jupiter"], dominant_e["Saturn"]),
    }

    for label, (ej, es) in sources.items():
        ratio = ej / es
        err = (ratio / model_ratio - 1) * 100
        print(f"  {label:<25} {ej:>10.5f} {es:>10.5f} {ratio:>10.4f}"
              f"  {model_ratio:>10.4f} {err:>+7.1f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # 7. OUTER PLANET ξ-RATIOS
    # ═══════════════════════════════════════════════════════════════════════
    section("7. OUTER PLANET ξ-RATIOS")

    print("  ξ = e × √m for Jupiter, Saturn, Uranus")
    print()

    outer = ["Jupiter", "Saturn", "Uranus"]
    pairs = [("Jupiter", "Saturn"), ("Jupiter", "Uranus"), ("Saturn", "Uranus")]
    model_fibs = {"Jupiter-Saturn": (13, 8), "Jupiter-Uranus": (5, 1),
                  "Saturn-Uranus": (3, 1)}

    for label, ecc_dict_name in [("Model base", ECC_BASE),
                                  ("J2000", ECC_J2000),
                                  ("BvW midpoint", numerical_midpoint),
                                  ("BvW dominant", dominant_e)]:
        print(f"  {label}:")
        for p1, p2 in pairs:
            xi1 = ecc_dict_name[p1] * SQRT_M[p1]
            xi2 = ecc_dict_name[p2] * SQRT_M[p2]
            ratio = xi1 / xi2
            pair_key = f"{p1}-{p2}"
            fib_a, fib_b = model_fibs[pair_key]
            fib_ratio = fib_a / fib_b
            err = (ratio / fib_ratio - 1) * 100
            a2, b2, r2, e2 = nearest_fib_ratio(ratio)
            frac2 = f"{a2}/{b2}" if b2 > 1 else str(a2)
            print(f"    ξ_{p1[:3]}/ξ_{p2[:3]} = {ratio:.4f}"
                  f"  model: {fib_a}/{fib_b} = {fib_ratio:.3f} ({err:+.1f}%)"
                  f"  nearest Fib: {frac2} = {r2:.3f} ({e2*100:.1f}%)")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # 8. PHYSICAL INSIGHT: WHY BvW ≠ MODEL
    # ═══════════════════════════════════════════════════════════════════════
    section("8. PHYSICAL INSIGHT: WHY BvW MIDPOINTS ≠ MODEL BASE VALUES")

    print("  The secular solution gives oscillation envelopes, NOT the model's")
    print("  'base' eccentricities. Key observations:")
    print()

    # Check if min eccentricity hits zero
    for p in PLANET_NAMES:
        e_min = numerical_min[p]
        e_max = numerical_max[p]
        mid = numerical_midpoint[p]
        amp = (e_max - e_min) / 2
        if e_min < 0.001:
            print(f"  {p}: e oscillates through NEAR-ZERO"
                  f" (min={e_min:.5f}, max={e_max:.5f}, mid={mid:.5f})")
        else:
            print(f"  {p}: e oscillates from {e_min:.5f} to {e_max:.5f}"
                  f" (mid={mid:.5f}, amp={amp:.5f})")

    print()
    print("  For Venus and Earth, e passes through ~0, giving midpoints ~e_max/2.")
    print("  The model base eccentricities are NOT secular oscillation midpoints.")
    print("  They correspond to a DIFFERENT physical quantity.")
    print()
    print("  Possibilities:")
    print("  a) Formation-epoch values (imprinted, not secular averages)")
    print("  b) True proper elements from chaotic secular evolution (Laskar)")
    print("  c) Long-term (>100 Myr) averages including chaotic diffusion")

    # ═══════════════════════════════════════════════════════════════════════
    # 9. MODE PARTICIPATION: WHICH PLANETS ARE 'CLEAN'?
    # ═══════════════════════════════════════════════════════════════════════
    section("9. MODE PARTICIPATION ANALYSIS")

    print("  For each planet: fraction of total amplitude in dominant mode")
    print("  Higher fraction = cleaner proper eccentricity")
    print()
    print(f"  {'Planet':<10} {'Total Σ|E|':>12} {'Dominant':>10} {'Fraction':>10}"
          f"  {'Assessment':>15}")
    print(f"  {'-'*10} {'-'*12} {'-'*10} {'-'*10}  {'-'*15}")

    for idx, p in enumerate(PLANET_NAMES):
        amps = np.abs(BVW_E[:, idx])
        total = np.sum(amps)
        dom = np.max(amps)
        frac = dom / total
        assessment = ("clean" if frac > 0.7 else
                      "moderate" if frac > 0.4 else
                      "MIXED")
        print(f"  {p:<10} {total:>12.5f} {dom:>10.5f} {frac:>9.1%}"
              f"  {assessment:>15}")

    print()
    print("  Clean mode separation → proper eccentricity is well-defined.")
    print("  Mixed modes → the concept of a single proper eccentricity breaks down.")
    print("  The inner planets (Venus, Earth) have NO clean dominant mode in BvW.")

    # ═══════════════════════════════════════════════════════════════════════
    # 10. INVARIANT QUANTITY TEST: DOES THE FIBONACCI LADDER USE AMD?
    # ═══════════════════════════════════════════════════════════════════════
    section("10. AMD (ANGULAR MOMENTUM DEFICIT) ECCENTRICITY COMPARISON")

    print("  AMD_ecc_i ≈ m_i √a_i e_i² / 2")
    print("  If Fibonacci structure acts on AMD-natural variables,")
    print("  the relevant quantity might be √(AMD) rather than e×√m.")
    print()

    # Compute AMD eccentricity contribution for each definition
    for label, ecc_dict in [("Model base", ECC_BASE),
                             ("J2000", ECC_J2000),
                             ("BvW midpoint", numerical_midpoint)]:
        print(f"  {label}:")
        amd_vals = {}
        for p in PLANET_NAMES:
            e = ecc_dict[p]
            amd_ecc = MASS[p] * np.sqrt(SMA[p]) * e**2 / 2
            amd_vals[p] = amd_ecc
            print(f"    {p:<10} e={e:.5f}  AMD_ecc = {amd_ecc:.4e}")

        # Check outer planet AMD ratios
        for p1, p2 in [("Jupiter", "Saturn"), ("Jupiter", "Uranus")]:
            r = amd_vals[p1] / amd_vals[p2]
            a, b, fr, err = nearest_fib_ratio(r)
            frac = f"{a}/{b}" if b > 1 else str(a)
            print(f"    AMD_{p1[:3]}/AMD_{p2[:3]} = {r:.3f}"
                  f" ≈ {frac} = {fr:.3f} ({err*100:.1f}%)")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # 11. SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    section("SUMMARY")

    print("  1. EIGENFREQUENCIES: BvW (1950) is much more accurate than first-order")
    print("     theory. Our first-order A matrix fails for inner planets because it")
    print("     uses only b^(2) off-diagonal coupling. BvW includes higher-order terms.")
    print()
    print("  2. PROPER ECCENTRICITIES: BvW midpoints do NOT match model base values.")
    print("     Venus and Earth have e_min ≈ 0, so midpoints ≈ e_max/2 — far from the")
    print("     model's base values. Mars and outer planets match better.")
    print()
    print("  3. FIBONACCI LADDER: the inner planet d×ξ spread at BvW midpoints is large")
    print("     (>> 1%), compared to 0.01% at model base values and ~4% at J2000.")
    print("     The Fibonacci ladder is NOT a property of BvW secular oscillation midpoints.")
    print()
    print("  4. MODE MIXING: Venus and Earth have no strongly dominant eigenmode —")
    print("     their eccentricity is a comparably-weighted sum of modes g2–g5.")
    print("     The concept of a single 'proper eccentricity' is ill-defined for them.")
    print()
    print("  5. OUTER PLANET ξ-RATIOS: Remain approximately Fibonacci across all")
    print("     definitions, though the specific Fibonacci numbers may differ.")
    print()
    print("  6. CONCLUSION: The Fibonacci eccentricity structure is not a consequence")
    print("     of BvW secular theory. The 'base eccentricities' in the Fibonacci model")
    print("     correspond to a quantity that is NOT the secular oscillation midpoint.")
    print("     Possible interpretations: formation-epoch imprints, long-term chaotic")
    print("     averages (Laskar), or an as-yet-unidentified dynamical invariant.")
    print()
    print("  NEXT STEPS:")
    print("  - Use Laskar (2008) published 5 Gyr eccentricity ranges for long-term")
    print("    average comparison")
    print("  - Use REBOUND N-body integration for definitive proper eccentricities")
    print("  - Test whether dominant eigenmode amplitudes (not midpoints) carry the")
    print("    Fibonacci structure more cleanly than midpoints")


if __name__ == "__main__":
    main()

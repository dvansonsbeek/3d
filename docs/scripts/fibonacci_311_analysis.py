#!/usr/bin/env python3
"""
R ≈ 311 AND THE ψ-ECCENTRICITY CONNECTION
==========================================

Merged investigation combining two analyses:

Part 1 — CAN ψ BE DERIVED FROM H?
  Investigates whether the inclination ψ-constant can be expressed in terms of
  H = 335,008, φ, π, Fibonacci numbers, and/or Earth's base eccentricity.
  Also investigates the master ratio R = ψ/ξ_V connecting inclination to
  eccentricity constants.
  (10 sections, originally fibonacci_psi_from_H.py)

Part 2 — FRESH INVESTIGATION: R ≈ 311 AND THE LAST FREE PARAMETER
  Deep analysis of R from multiple angles: factor structure of 2205/11025,
  number-theoretic properties of 311 (Pisano period, Zeckendorf representation),
  √m weighting / AMD connection, and the inner eccentricity quartet.
  (10 sections, originally fibonacci_R311_fresh.py)

Run: python3 fibonacci_R311_analysis.py
"""

import math
from fractions import Fraction
from collections import Counter

from fibonacci_data import (
    H, PHI, PLANET_NAMES, MASS, ECC_BASE, INCL_AMP, SEMI_MAJOR, SMA,
    PERIOD_FRAC, D_INCL, K_ECC,
    FIB, FIB_MATCH, FIB_INDEX, FIB_SET,
    ETA, XI_BASE, SQRT_M,
    nearest_fib_ratio, fib_str, fib_n, pisano_period,
    PSI1_THEORY, EARTH_BASE_ECCENTRICITY,
)


# ═══════════════════════════════════════════════════════════════════════════
# LOCAL CONSTANTS AND HELPERS
# ═══════════════════════════════════════════════════════════════════════════

PI = math.pi

# Part 1 uses a FIB list starting at F₁=1 (no F₀=0)
_FIB_VALS = FIB[1:]  # [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...]
_FIB_VAL_SET = set(_FIB_VALS)


def _find_nice_number(value):
    """Check if a value is close to a 'nice' number (integer, Fibonacci, φ power, etc.)"""
    if value <= 0:
        return ""

    results = []

    # Check integers
    nearest_int = round(value)
    if nearest_int > 0 and abs(value / nearest_int - 1) < 0.02:
        results.append(f"≈ {nearest_int} ({(value/nearest_int - 1)*100:+.2f}%)")

    # Check Fibonacci numbers
    for f in _FIB_VALS:
        if f > 0 and abs(value / f - 1) < 0.02:
            results.append(f"≈ F({f}) ({(value/f - 1)*100:+.2f}%)")
            break

    # Check Fibonacci ratios
    for f1 in _FIB_VALS[:10]:
        for f2 in _FIB_VALS[:10]:
            if f2 > 0:
                r = f1 / f2
                if r > 0 and abs(value / r - 1) < 0.005:
                    results.append(f"≈ {f1}/{f2} ({(value/r - 1)*100:+.3f}%)")
                    break

    # Check golden ratio powers
    for n in range(-10, 15):
        phi_n = PHI ** n
        if abs(value / phi_n - 1) < 0.02:
            results.append(f"≈ φ^{n} ({(value/phi_n - 1)*100:+.2f}%)")

    # Check π multiples
    for k in [1, 2, 3, 5, 8, 13]:
        for d in [1, 2, 3, 4, 5, 6, 8, 10, 12]:
            r = k * PI / d
            if r > 0 and abs(value / r - 1) < 0.005:
                results.append(f"≈ {k}π/{d} ({(value/r - 1)*100:+.3f}%)")
                break

    if results:
        return " ← CLOSE: " + " | ".join(results[:3])
    return ""


# ╔═════════════════════════════════════════════════════════════════════════╗
# ║  PART 1: CAN ψ BE DERIVED FROM H?  (10 sections)                     ║
# ╚═════════════════════════════════════════════════════════════════════════╝


def _p1_section_1():
    """Compute precise values of the ψ-constants."""
    print("=" * 80)
    print("  SECTION 1: PRECISE VALUES OF THE ψ-CONSTANTS")
    print("=" * 80)
    print()

    # Compute ψ from each member planet
    psi1_planets = ["Venus", "Earth", "Mars", "Neptune"]
    psi1_values = []
    for p in psi1_planets:
        d = D_INCL[p]
        psi = d * ETA[p]
        psi1_values.append(psi)
        print(f"  {p:<10}: d={d:<5}  η = {ETA[p]:.6e}  ψ = d×η = {psi:.6e}")

    psi1_mean = sum(psi1_values) / len(psi1_values)
    print(f"\n  Mean ψ = {psi1_mean:.8e}")
    print(f"  Spread: {(max(psi1_values) - min(psi1_values)) / psi1_mean * 100:.3f}%")
    print()

    # [Historical] ψ₂ from Venus (d=3) and Uranus (d=8)
    # NOTE: ψ₂ eliminated in current model; Uranus is ψ (d=21)
    psi2_V = 3 * ETA["Venus"]
    psi2_U = 8 * ETA["Uranus"]
    psi2_mean = (psi2_V + psi2_U) / 2
    print(f"  [Historical] ψ₂ from Venus (d=3):  {psi2_V:.6e}")
    print(f"  [Historical] ψ₂ from Uranus (d=8): {psi2_U:.6e}")
    print(f"  Historical ψ₂/ψ = {psi2_mean / psi1_mean:.6f}  (was 3/2 = 1.500)")
    print()

    # ψ₃ from Jupiter (d=1) — current model
    psi3_J = 1 * ETA["Jupiter"]
    print(f"  ψ₃ = η_J = {psi3_J:.6e}")
    print(f"  ψ₃/ψ = {psi3_J / psi1_mean:.6f}  (from balance condition)")
    print()

    # Also compute the eccentricity constant
    xi_V = XI_BASE["Venus"]
    print(f"  Eccentricity base unit: ξ_V = {xi_V:.6e}")
    print(f"  Law 1 anchor: (5/2)×ξ_V = ξ_E → ξ_E = {2.5 * xi_V:.6e}")
    print(f"  Actual ξ_E = {XI_BASE['Earth']:.6e}")
    print()

    # The eccentricity "ψ-equivalent"
    print(f"  ψ (inclination)  = {psi1_mean:.6e}")
    print(f"  ξ_V (eccentricity) = {xi_V:.6e}")
    print(f"  Ratio ψ/ξ_V = {psi1_mean / xi_V:.6f}")
    print()

    return psi1_mean, psi2_mean, psi3_J, xi_V


def _p1_section_2(psi1):
    """Test ψ against H — direct relationships."""
    print()
    print("=" * 80)
    print("  SECTION 2: ψ vs H — DIRECT RELATIONSHIPS")
    print("=" * 80)
    print()

    print("  Raw products and ratios with H:")
    print()

    tests = [
        ("ψ × H", psi1 * H),
        ("ψ × H²", psi1 * H**2),
        ("ψ × √H", psi1 * math.sqrt(H)),
        ("ψ × H^(1/3)", psi1 * H**(1/3)),
        ("ψ / H", psi1 / H),
        ("1 / (ψ × H)", 1 / (psi1 * H)),
        ("H × ψ²", H * psi1**2),
        ("H / ψ", H / psi1),
        ("H / ψ²", H / psi1**2),
    ]

    for label, value in tests:
        best_match = _find_nice_number(value)
        print(f"  {label:<20} = {value:>14.6f}  {best_match}")

    print()

    # ψ in radians
    psi1_rad = psi1 * PI / 180
    print(f"  ψ in radians = {psi1_rad:.8e}")
    print()

    tests_rad = [
        ("ψ_rad × H", psi1_rad * H),
        ("ψ_rad × H²", psi1_rad * H**2),
        ("ψ_rad × √H", psi1_rad * math.sqrt(H)),
        ("1 / (ψ_rad × H)", 1 / (psi1_rad * H)),
        ("H / ψ_rad", H / psi1_rad),
        ("H × ψ_rad", H * psi1_rad),
        ("H² × ψ_rad", H**2 * psi1_rad),
    ]

    print("  Same tests with ψ in radians:")
    print()
    for label, value in tests_rad:
        best_match = _find_nice_number(value)
        print(f"  {label:<22} = {value:>14.6f}  {best_match}")

    print()

    # Check: does ψ relate to 1/H through Fibonacci?
    print("  Fibonacci/φ combinations with H:")
    print()

    for f in _FIB_VALS[:12]:
        ratio = psi1 / (f / H)
        match = _find_nice_number(ratio)
        if "CLOSE" in match:
            print(f"    ψ / ({f}/H) = {ratio:.6f}  {match}")

    for f in _FIB_VALS[:12]:
        ratio = psi1 * H / f
        match = _find_nice_number(ratio)
        if "CLOSE" in match:
            print(f"    ψ × H / {f} = {ratio:.6f}  {match}")

    # ψ × H = ?
    product = psi1 * H
    print(f"\n  ψ × H = {product:.6f}")
    print(f"  Nearby Fibonacci numbers: ... 610, 987, 1597 ...")
    print(f"  ψ × H / 1 = {product:.4f}")
    for f in _FIB_VALS[:12]:
        ratio = product / f
        if 0.9 < ratio < 1.1:
            print(f"    ψ × H ≈ {f}  (error: {(product/f - 1)*100:+.2f}%)")

    # Check golden ratio powers
    print()
    print("  Check if ψ × H = φ^n for some n:")
    log_phi = math.log(product) / math.log(PHI)
    print(f"    ψ × H = {product:.6f}")
    print(f"    log_φ(ψ × H) = {log_phi:.4f}")
    print(f"    Nearest integer: {round(log_phi)}")
    print(f"    φ^{round(log_phi)} = {PHI**round(log_phi):.6f}"
          f"  (error: {(product/PHI**round(log_phi) - 1)*100:+.2f}%)")


def _p1_section_3(psi1, xi_V):
    """Relationship between ψ and eccentricity constants."""
    print()
    print("=" * 80)
    print("  SECTION 3: RELATIONSHIP BETWEEN ψ AND ECCENTRICITY CONSTANTS")
    print("=" * 80)
    print()

    e_E = ECC_BASE["Earth"]
    m_E = MASS["Earth"]
    xi_E = XI_BASE["Earth"]
    eta_E = ETA["Earth"]

    print(f"  Earth's mass-weighted eccentricity: ξ_E = {xi_E:.6e}")
    print(f"  Earth's mass-weighted inclination:  η_E = {eta_E:.6e}")
    print(f"  Earth's i/e ratio: {INCL_AMP['Earth'] / e_E:.4f}")
    print()

    # Is ψ / ξ_E a Fibonacci ratio?
    ratio1 = psi1 / xi_E
    print(f"  ψ / ξ_E = {ratio1:.4f}")
    best = _find_nice_number(ratio1)
    print(f"    {best}")
    print()

    # Is ψ / η_E a Fibonacci ratio?
    ratio2 = psi1 / eta_E
    print(f"  ψ / η_E = {ratio2:.4f}  (should be d_E = 3)")
    print()

    # Is ξ_V / η_E a Fibonacci ratio?
    ratio3 = xi_V / eta_E
    print(f"  ξ_V / η_E = {ratio3:.6f}")
    best = _find_nice_number(ratio3)
    print(f"    {best}")
    print()

    # Is ψ / ξ_V a Fibonacci ratio?
    ratio4 = psi1 / xi_V
    print(f"  ψ / ξ_V = {ratio4:.4f}")
    best = _find_nice_number(ratio4)
    print(f"    {best}")
    print()

    # The "inclination-eccentricity ratio" for each planet
    print("  i/e ratio for each planet:")
    print(f"  {'Planet':<10} {'i/e':>10} {'d_incl':>8} {'k_ecc':>8}"
          f" {'d/k':>8} {'i×d_ecc/(e×d_incl)':>20}")
    print(f"  {'─'*10} {'─'*10} {'─'*8} {'─'*8} {'─'*8} {'─'*20}")

    for p in ["Venus", "Earth", "Mars"]:
        ie_ratio = INCL_AMP[p] / ECC_BASE[p]
        d = D_INCL[p]
        k = K_ECC[p]
        dk_ratio = d / k
        print(f"  {p:<10} {ie_ratio:>10.4f} {d:>8.1f} {k:>8.1f}"
              f" {dk_ratio:>8.4f} {ie_ratio * k / d:>20.4f}")

    print()
    print(f"  If i/e × k/d is constant, it would connect the two laws.")
    print()

    # Check: is i/e × k/d constant across inner planets?
    ie_kd = []
    for p in ["Venus", "Earth", "Mars"]:
        val = INCL_AMP[p] / ECC_BASE[p] * K_ECC[p] / D_INCL[p]
        ie_kd.append(val)
    mean_ie_kd = sum(ie_kd) / len(ie_kd)
    spread = (max(ie_kd) - min(ie_kd)) / mean_ie_kd * 100
    print(f"  i/e × k/d values: {[f'{v:.4f}' for v in ie_kd]}")
    print(f"  Mean: {mean_ie_kd:.4f}  Spread: {spread:.2f}%")
    best = _find_nice_number(mean_ie_kd)
    print(f"  {best}")
    print()

    print("  UNIFIED FORMULA: for inner planets (Venus, Earth, Mars):")
    print()
    print("  i/e = (ψ × 2.5) / (d × k × ξ_E)")
    print()
    print("  This should be constant if d×k is the same ratio for all planets.")
    print()
    ratio_check = psi1 * 2.5 / xi_E
    print(f"  ψ × 2.5 / ξ_E = {ratio_check:.4f}")
    print()
    for p in ["Venus", "Earth", "Mars"]:
        d = D_INCL[p]
        k = K_ECC[p]
        pred_ie = ratio_check / (d * k)
        actual_ie = INCL_AMP[p] / ECC_BASE[p]
        err = (pred_ie / actual_ie - 1) * 100
        print(f"  {p:<8}: d×k = {d*k:>6.1f}  predicted i/e = {pred_ie:>8.4f}"
              f"  actual = {actual_ie:>8.4f}  err = {err:+.2f}%")

    print()
    # The universal ratio R = ψ / ξ_E
    R = psi1 / xi_E
    print(f"  UNIVERSAL RATIO: R = ψ / ξ_E = {R:.6f}")
    print()
    print(f"  For Earth: R / d_E = {R / 3:.4f}  vs actual i_E/e_E = {INCL_AMP['Earth']/ECC_BASE['Earth']:.4f}")
    print(f"  Wait — for Earth, k_E = 5/2 = d_E/? Hmm.")
    print()

    xi_V_check = XI_BASE["Venus"]
    print(f"  Verification: ξ_V (base eccentricity unit) = {xi_V_check:.6e}")
    for p in ["Venus", "Earth", "Mars", "Mercury"]:
        k = K_ECC[p]
        print(f"    {p:<10}: ξ/k = {XI_BASE[p]/k:.6e}  (should ≈ {xi_V_check:.6e},"
              f"  err: {(XI_BASE[p]/k/xi_V_check - 1)*100:+.2f}%)")

    print()

    R2 = psi1 / xi_V_check
    print(f"  R = ψ / ξ_V = {R2:.4f}")
    best = _find_nice_number(R2)
    print(f"  {best}")
    print()

    return R2


def _p1_section_4(psi1):
    """Systematic search for ψ = f(H, φ, π, Fibonacci)."""
    print()
    print("=" * 80)
    print("  SECTION 4: SYSTEMATIC SEARCH FOR ψ = f(H, φ, π, Fibonacci)")
    print("=" * 80)
    print()

    psi1_rad = psi1 * PI / 180

    candidates = []

    # Type 1: ψ = F_a / (F_b × H^p)
    for fa in _FIB_VALS[:14]:
        for fb in _FIB_VALS[:14]:
            for p_num, p_den in [(1, 1), (1, 2), (1, 3), (2, 3), (2, 1), (3, 2)]:
                p = p_num / p_den
                pred = fa / (fb * H**p)
                if pred > 0:
                    err = abs(psi1 / pred - 1)
                    if err < 0.01:
                        candidates.append((err, f"ψ = {fa} / ({fb} × H^({p_num}/{p_den}))",
                                          pred, "degrees"))
                    err_rad = abs(psi1_rad / pred - 1)
                    if err_rad < 0.01:
                        candidates.append((err_rad, f"ψ_rad = {fa} / ({fb} × H^({p_num}/{p_den}))",
                                          pred, "radians"))

    # Type 2: ψ = F_a × φ^n / (F_b × H^p)
    for fa in _FIB_VALS[:10]:
        for fb in _FIB_VALS[:10]:
            for n in range(-5, 6):
                for p_num, p_den in [(1, 1), (1, 2), (1, 3), (2, 3)]:
                    p = p_num / p_den
                    pred = fa * PHI**n / (fb * H**p)
                    if pred > 0:
                        err = abs(psi1 / pred - 1)
                        if err < 0.005:
                            candidates.append((err, f"ψ = {fa}×φ^{n} / ({fb}×H^({p_num}/{p_den}))",
                                              pred, "degrees"))
                        err_rad = abs(psi1_rad / pred - 1)
                        if err_rad < 0.005:
                            candidates.append((err_rad, f"ψ_rad = {fa}×φ^{n} / ({fb}×H^({p_num}/{p_den}))",
                                              pred, "radians"))

    # Type 3: ψ = F_a × π^n / (F_b × H^p)
    for fa in _FIB_VALS[:10]:
        for fb in _FIB_VALS[:10]:
            for n in range(-3, 4):
                for p_num, p_den in [(1, 1), (1, 2), (1, 3), (2, 3)]:
                    p = p_num / p_den
                    pred = fa * PI**n / (fb * H**p)
                    if pred > 0:
                        err = abs(psi1 / pred - 1)
                        if err < 0.005:
                            candidates.append((err, f"ψ = {fa}×π^{n} / ({fb}×H^({p_num}/{p_den}))",
                                              pred, "degrees"))

    # Type 4: ψ = φ^n / H^p
    for n in range(-20, 20):
        for p_num, p_den in [(1, 1), (1, 2), (1, 3), (2, 3), (3, 4), (1, 4)]:
            p = p_num / p_den
            pred = PHI**n / H**p
            if pred > 0:
                err = abs(psi1 / pred - 1)
                if err < 0.02:
                    candidates.append((err, f"ψ = φ^{n} / H^({p_num}/{p_den})", pred, "degrees"))
                err_rad = abs(psi1_rad / pred - 1)
                if err_rad < 0.02:
                    candidates.append((err_rad, f"ψ_rad = φ^{n} / H^({p_num}/{p_den})", pred, "radians"))

    # Type 5: ψ = 1 / (F × H^p)
    for f in _FIB_VALS[:14]:
        for p_num, p_den in [(1, 2), (1, 3), (2, 3), (3, 4), (1, 4), (1, 1)]:
            p = p_num / p_den
            pred = 1 / (f * H**p)
            if pred > 0:
                err = abs(psi1 / pred - 1)
                if err < 0.02:
                    candidates.append((err, f"ψ = 1 / ({f} × H^({p_num}/{p_den}))", pred, "degrees"))

    # Sort by error
    candidates.sort(key=lambda x: x[0])

    # Remove duplicates
    seen = set()
    unique = []
    for err, label, pred, unit in candidates:
        if label not in seen:
            seen.add(label)
            unique.append((err, label, pred, unit))

    print(f"  Found {len(unique)} candidates with < 2% error:")
    print()

    for err, label, pred, unit in unique[:25]:
        print(f"  {err*100:>6.3f}%  {label:<50} = {pred:.6e} ({unit})")

    if not unique:
        print("  No candidates found with < 2% error.")
        print("  ψ may not have a simple expression in terms of H alone.")

    print()


def _p1_section_5(psi1):
    """ψ from the period structure."""
    print()
    print("=" * 80)
    print("  SECTION 5: ψ FROM THE PERIOD STRUCTURE")
    print("=" * 80)
    print()

    # Factorize H
    print(f"  H = {H:,}")
    n = H
    factors = []
    temp = n
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23]:
        while temp % p == 0:
            factors.append(p)
            temp //= p
    if temp > 1:
        factors.append(temp)
    print(f"  Factorization: {' × '.join(str(f) for f in factors)}")
    print(f"  = {factors}")
    print()

    fc = Counter(factors)
    factor_str = " × ".join(f"{p}^{e}" if e > 1 else str(p) for p, e in sorted(fc.items()))
    print(f"  H = {factor_str}")
    print()

    print("  H in terms of oscillation periods:")
    for p in ["Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]:
        a, b = PERIOD_FRAC[p]
        T = H * a / b
        print(f"    H / T_{p} = {H / T:.4f} = b/a = {b}/{a}")

    print()

    # Can ψ be expressed using the oscillation periods?
    print("  ψ in terms of oscillation periods:")
    print()

    for p in ["Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]:
        a, b = PERIOD_FRAC[p]
        T = H * a / b
        ratio = psi1 * T
        best = _find_nice_number(ratio)
        print(f"    ψ × T_{p:<8} = {ratio:>10.4f}  {best}")

    print()

    # Total mass
    total_mass = sum(MASS.values())
    print(f"  Total planet mass = {total_mass:.6e} M_sun")
    print(f"  √(total mass) = {math.sqrt(total_mass):.6e}")
    print(f"  ψ / √(total mass) = {psi1 / math.sqrt(total_mass):.6f}")
    print(f"  ψ × √(total mass) = {psi1 * math.sqrt(total_mass):.6e}")
    print()

    # Jupiter mass dominates
    print(f"  Jupiter mass fraction: {MASS['Jupiter'] / total_mass * 100:.1f}%")
    print(f"  ψ / √(m_J) = {psi1 / SQRT_M['Jupiter']:.6f}")
    best = _find_nice_number(psi1 / SQRT_M["Jupiter"])
    print(f"    {best}")
    print()

    print(f"  ψ × √(m_J) = {psi1 * SQRT_M['Jupiter']:.6e}")
    print(f"  (This is just ψ₃ × d_J... not helpful)")


def _p1_section_6(psi1, xi_V):
    """The master ratio — connecting inclination to eccentricity."""
    print()
    print("=" * 80)
    print("  SECTION 6: THE MASTER RATIO — CONNECTING INCLINATION TO ECCENTRICITY")
    print("=" * 80)
    print()

    R = psi1 / xi_V
    print(f"  R = ψ / ξ_V = {R:.6f}")
    print()

    xi_E = XI_BASE["Earth"]
    R_E = psi1 / xi_E
    print(f"  R_E = ψ / ξ_E = {R_E:.6f}")
    print(f"  R_E = R / 2.5 = {R / 2.5:.6f}")
    print()

    # Is R a Fibonacci ratio × some power of 10?
    print("  Searching for R as Fibonacci expression:")
    print()

    for fa in _FIB_VALS[:12]:
        for fb in _FIB_VALS[:12]:
            ratio = fa / fb
            err = abs(R / ratio - 1)
            if err < 0.05:
                print(f"    R ≈ {fa}/{fb} = {ratio:.4f}  (error: {err*100:+.3f}%)")

    print()

    # Check R × various simple numbers
    for mult_name, mult in [("1", 1), ("2", 2), ("3", 3), ("5", 5), ("8", 8),
                             ("φ", PHI), ("φ²", PHI**2), ("π", PI),
                             ("2π", 2*PI), ("π/2", PI/2),
                             ("√2", math.sqrt(2)), ("√3", math.sqrt(3)),
                             ("√5", math.sqrt(5)), ("√φ", math.sqrt(PHI))]:
        val = R * mult
        best = _find_nice_number(val)
        if best:
            print(f"    R × {mult_name:<4} = {val:>10.4f}  {best}")

    print()

    # R_E
    print(f"  R_E = ψ / ξ_E = {R_E:.6f}")
    for mult_name, mult in [("1", 1), ("2", 2), ("3", 3), ("5", 5),
                             ("φ", PHI), ("φ²", PHI**2), ("π", PI)]:
        val = R_E * mult
        best = _find_nice_number(val)
        if best:
            print(f"    R_E × {mult_name:<4} = {val:>10.4f}  {best}")

    print()

    # i/e = R_E / d for ψ planets
    print("  i/e = R_E / d for ψ planets (using ξ_E as eccentricity reference):")
    print()
    for p in ["Venus", "Earth", "Mars"]:
        d = D_INCL[p]
        k = K_ECC[p]
        pred_ie = R_E * 2.5 / (d * k)
        actual_ie = INCL_AMP[p] / ECC_BASE[p]
        print(f"    {p:<8}: d={d:<5} k={k:<5}  d×k={d*k:<8.1f}"
              f"  pred i/e = {pred_ie:.4f}  actual = {actual_ie:.4f}"
              f"  err: {(pred_ie/actual_ie-1)*100:+.2f}%")

    print()
    print("  The product d × k for inner planets:")
    for p in ["Venus", "Earth", "Mars"]:
        d = D_INCL[p]
        k = K_ECC[p]
        dk = d * k
        print(f"    {p:<8}: d×k = {d} × {k} = {dk}")

    print()
    print("  d × k: Venus = 2, Earth = 7.5, Mars = 13")
    print("  Ratios: Earth/Venus = 7.5/2 = 3.75, Mars/Earth = 13/7.5 = 1.733")
    print(f"  Mars/Venus = 13/2 = 6.5")
    print()

    print("  Decomposing d×k = b × F × k_ecc:")
    for p in ["Venus", "Earth", "Mars"]:
        a, b = PERIOD_FRAC[p]
        d = D_INCL[p]
        F = d / b
        k = K_ECC[p]
        dk = d * k
        print(f"    {p:<8}: b={b}, F={F:.2f}, k={k}, b×F×k = {b*F*k:.2f}")

    print()
    print("  Interesting: b×F×k for Venus=2, Earth=7.5, Mars=13")
    print("  b alone:  Venus=1, Earth=3, Mars=13")
    print("  k alone:  Venus=1, Earth=2.5, Mars=5")
    print("  b×k:      Venus=1, Earth=7.5, Mars=65")
    print("  F×k:      Venus=2, Earth=2.5, Mars=1")
    print()

    # Testing d×k / Fibonacci
    print("  Testing: d×k / Fibonacci:")
    for f in _FIB_VALS[:8]:
        vals = {}
        for p in ["Venus", "Earth", "Mars"]:
            d = D_INCL[p]
            k = K_ECC[p]
            vals[p] = d * k / f
        print(f"    /{f}: V={vals['Venus']:.3f}  E={vals['Earth']:.3f}  M={vals['Mars']:.3f}")


def _p1_section_7(psi1):
    """ψ × H — deeper decomposition."""
    print()
    print("=" * 80)
    print("  SECTION 7: ψ × H — DEEPER DECOMPOSITION")
    print("=" * 80)
    print()

    product = psi1 * H
    print(f"  ψ × H = {product:.8f}")
    print()

    log_phi = math.log(product) / math.log(PHI)
    print(f"  log_φ(ψ × H) = {log_phi:.6f}")
    print(f"  So ψ × H ≈ φ^{log_phi:.4f}")
    print()

    # Try fractional powers of φ
    for num in range(-10, 10):
        for den in range(1, 13):
            p = num / den
            pred = PHI ** p
            err = abs(product / pred - 1)
            if err < 0.003:
                print(f"    φ^({num}/{den}) = {pred:.8f}  error: {err*100:+.4f}%")

    print()

    print(f"  ψ × H ≈ 11/10?  11/10 = {11/10:.6f}  error: {(product/(11/10) - 1)*100:+.4f}%")
    print(f"  ψ × H ≈ (F_4+F_6)/10 = (3+8)/10?")
    print()

    # Fibonacci sum combinations / simple denominators
    print("  ψ × H as Fibonacci sum / denominator:")
    for fa in range(1, 50):
        for den in range(1, 20):
            ratio = fa / den
            err = abs(product / ratio - 1)
            if err < 0.001:
                fib_check = fa in _FIB_VAL_SET
                print(f"    {fa}/{den} = {ratio:.6f}  error: {err*100:+.4f}%"
                      f"  {'(Fibonacci)' if fib_check else ''}")

    print()

    # ψ_rad × H
    product_rad = psi1 * PI / 180 * H
    print(f"  ψ_rad × H = {product_rad:.8f}")
    print()

    for fa in _FIB_VALS[:12]:
        for fb in _FIB_VALS[:12]:
            ratio = fa / fb
            err = abs(product_rad / ratio - 1)
            if err < 0.01:
                print(f"    ψ_rad × H ≈ {fa}/{fb} = {ratio:.6f}"
                      f"  error: {err*100:+.4f}%")

    # Check π-related expressions
    for fa in range(1, 20):
        for fb in range(1, 20):
            for pi_pow in [-1, 0, 1, 2]:
                ratio = fa / fb * PI**pi_pow
                err = abs(product_rad / ratio - 1)
                if err < 0.005 and pi_pow != 0:
                    print(f"    ψ_rad × H ≈ {fa}/{fb} × π^{pi_pow} = {ratio:.6f}"
                          f"  error: {err*100:+.4f}%")


def _p1_section_8(psi1, xi_V, R):
    """Comprehensive summary of Part 1 findings."""
    print()
    print("=" * 80)
    print("  SECTION 8: COMPREHENSIVE SUMMARY")
    print("=" * 80)
    print()

    print("  THE TWO FREE PARAMETERS:")
    print(f"    ψ = {psi1:.8e}  (degrees × √M_sun)")
    print(f"    ξ_V = {xi_V:.8e}  (dimensionless × √M_sun)")
    print(f"    R = ψ/ξ_V = {R:.4f}")
    print()

    product = psi1 * H
    print(f"    ψ × H = {product:.6f}")
    print(f"    Best match: 11/10 = 1.1000 (error: {(product/1.1 - 1)*100:+.3f}%)")
    print()

    print("  PREDICTION CAPABILITY:")
    print()
    print("  Given: mass (m), orbital position (k from belt), period fraction (a/b)")
    print()
    print("  Inclination amplitude:")
    print("    i = ψ / (d × √m)  where d = b × F(k)")
    print("    Predicts 7/8 planets to < 1%")
    print()
    print("  Base eccentricity:")
    print("    e = (k_ecc / 2.5) × ξ_E / √m  where ξ_E = 2.5 × ξ_V")
    print("    Predicts 4/8 inner planets to < 1.5%")
    print()

    # What if ψ × H = 11/10 exactly?
    psi1_pred = 11 / (10 * H)
    print(f"  IF ψ = 11 / (10 × H) = {psi1_pred:.8e}:")
    print()

    for p in ["Venus", "Earth", "Mars", "Neptune"]:
        d = D_INCL[p]
        m = MASS[p]
        i_pred = psi1_pred / (d * math.sqrt(m))
        i_actual = INCL_AMP[p]
        err = (i_pred / i_actual - 1) * 100
        print(f"    {p:<10}: i_pred = {i_pred:.4f}°  i_actual = {i_actual:.4f}°"
              f"  error: {err:+.3f}%")

    print()

    print("  Note: 11 = 3 + 8 (Mercury's period denominator)")
    print("  So ψ = (3 + 8) / (10 × H) = (F_4 + F_6) / (10 × H)")
    print()
    print("  10 = 2 × 5 = F_3 × F_5")
    print("  So ψ = (F_4 + F_6) / (F_3 × F_5 × H)")
    print(f"  = (3 + 8) / (2 × 5 × {H})")
    approx_psi = 11 / (10 * H)
    print(f"  = 11 / {10 * H}")
    print(f"  = {approx_psi:.10e}")
    print(f"  actual ψ = {psi1:.10e}")
    print(f"  error: {(approx_psi / psi1 - 1)*100:+.4f}%")
    print()

    print("  FULL PREDICTIVE CHAIN (if ψ = 11/(10H)):")
    print()
    print("  INPUT: planet name → determines m, b, F, k_ecc, ψ-group")
    print(f"  UNIVERSAL CONSTANTS: H = {H}, ψ = 11/(10H), e_E = {EARTH_BASE_ECCENTRICITY}")
    print()
    print("  OUTPUT (inclination):")

    psi1_formula = 11 / (10 * H)
    psi2_formula = 1.5 * psi1_formula

    for p in ["Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]:
        d = D_INCL[p]
        m = MASS[p]

        if p == "Uranus":
            psi_use = psi1_formula  # Uranus now ψ (d=8)
            psi_label = "ψ"
        elif p == "Jupiter":
            psi_use = ETA["Jupiter"]  # Can't predict from formula alone
            psi_label = "ψ₃"
        elif p == "Saturn":
            psi_label = "L3"
            psi_use = None
        else:
            psi_use = psi1_formula
            psi_label = "ψ"

        if psi_use is not None and psi_label != "ψ₃":
            i_pred = psi_use / (d * math.sqrt(m))
            i_actual = INCL_AMP[p]
            err = (i_pred / i_actual - 1) * 100
            print(f"    {p:<10} ({psi_label}): d={d:<5}  i = {i_pred:.4f}°"
                  f"  actual={i_actual:.3f}°  err={err:+.3f}%")
        else:
            print(f"    {p:<10} ({psi_label}): requires separate determination")


def _p1_section_9(psi1, xi_V):
    """Can e_Earth be derived from H?"""
    print()
    print("=" * 80)
    print("  SECTION 9: CAN e_Earth BE DERIVED FROM H?")
    print("=" * 80)
    print()

    e_E = ECC_BASE["Earth"]
    m_E = MASS["Earth"]
    xi_E = XI_BASE["Earth"]

    print(f"  e_E = {e_E}")
    print(f"  ξ_E = e_E × √m_E = {xi_E:.8e}")
    print(f"  ξ_V = ξ_E / 2.5 = {xi_V:.8e}")
    print()

    # Test: is e_E expressible in terms of H?
    print("  e_E vs H:")
    print(f"    e_E × H = {e_E * H:.4f}")
    best = _find_nice_number(e_E * H)
    print(f"    {best}")
    print()

    print(f"  ξ_E × H = {xi_E * H:.8f}")
    best = _find_nice_number(xi_E * H)
    print(f"    {best}")
    print()

    print(f"  ξ_V × H = {xi_V * H:.8f}")
    best = _find_nice_number(xi_V * H)
    print(f"    {best}")
    print()

    # Search for e_E as f(H, φ, Fibonacci)
    print("  Searching for e_E = f(H, φ, π, Fibonacci):")
    print()

    candidates = []

    for fa in _FIB_VALS[:12]:
        for fb in _FIB_VALS[:12]:
            for p_num, p_den in [(1, 2), (1, 3), (2, 3), (1, 1), (3, 4), (1, 4)]:
                p = p_num / p_den
                pred = fa / (fb * H**p)
                err = abs(e_E / pred - 1)
                if err < 0.02:
                    candidates.append((err, f"e_E = {fa}/({fb}×H^({p_num}/{p_den}))", pred))

    for n in range(-15, 15):
        for p_num, p_den in [(1, 2), (1, 3), (2, 3), (1, 1)]:
            p = p_num / p_den
            pred = PHI**n / H**p
            err = abs(e_E / pred - 1)
            if err < 0.02:
                candidates.append((err, f"e_E = φ^{n}/H^({p_num}/{p_den})", pred))

    R_E = psi1 / xi_E
    print(f"  R_E = ψ / ξ_E = {R_E:.6f}")
    best = _find_nice_number(R_E)
    print(f"    {best}")
    print()

    print(f"  R_E ≈ {R_E:.2f}")
    print(f"    Nearby: 5³ = 125 ({(R_E/125 - 1)*100:+.2f}%)")
    print(f"    89+34 = 123 ({(R_E/123 - 1)*100:+.2f}%)")
    print(f"    8×13+21 = 125 ({(R_E/125 - 1)*100:+.2f}%)")
    print(f"    φ^10 = {PHI**10:.2f} ({(R_E/PHI**10 - 1)*100:+.2f}%)")
    print()

    candidates.sort(key=lambda x: x[0])
    seen = set()
    print("  Best expressions for e_E:")
    for err, label, pred in candidates[:15]:
        if label not in seen:
            seen.add(label)
            print(f"    {err*100:>6.3f}%  {label:<45} = {pred:.8f}")

    print()

    val = R_E * math.sqrt(m_E)
    print(f"  R_E × √m_E = {val:.6e}")
    best = _find_nice_number(val)
    print(f"    {best}")
    print()

    ie_ratio = INCL_AMP["Earth"] / e_E
    print(f"  Check: R_E = d_E × (i_E/e_E) = 3 × {ie_ratio:.4f} = {3*ie_ratio:.4f}")
    print(f"  This is just a restatement of the definition.")
    print()

    # i_E/e_E analysis
    print(f"  i_E / e_E = {ie_ratio:.6f}")
    for f in _FIB_VALS[:10]:
        for n in range(-5, 5):
            val = f * PHI**n
            err = abs(ie_ratio / val - 1)
            if err < 0.02:
                print(f"    i_E/e_E ≈ {f} × φ^{n} = {val:.4f}  ({err*100:+.3f}%)")

    # Simple combinations
    for a in range(1, 100):
        for b in range(1, 10):
            val = a / b
            err = abs(ie_ratio / val - 1)
            if err < 0.002:
                a_fib = a in _FIB_VAL_SET
                b_fib = b in _FIB_VAL_SET
                tag = ""
                if a_fib:
                    tag += " a=Fib"
                if b_fib:
                    tag += " b=Fib"
                print(f"    i_E/e_E ≈ {a}/{b} = {val:.4f}  ({err*100:+.4f}%){tag}")

    print()


def _p1_section_10(psi1, xi_V):
    """Prediction with minimum free parameters."""
    print()
    print("=" * 80)
    print("  SECTION 10: PREDICTION WITH MINIMUM FREE PARAMETERS")
    print("=" * 80)
    print()

    print("  Current state: 2 free parameters")
    print("    ψ = 3.2995 × 10⁻³")
    print("    e_E = 0.015373")
    print()
    print("  Can we reduce to 1 free parameter?")
    print("  Can we reduce to 0 free parameters?")
    print()

    # Option A: if ψ = 11/(10H)
    psi1_A = 11 / (10 * H)
    print("  OPTION A: ψ = 11/(10H)")
    print(f"    Predicted ψ = {psi1_A:.8e}")
    print(f"    Actual ψ = {psi1:.8e}")
    print(f"    Error: {(psi1_A/psi1 - 1)*100:+.4f}%")
    print()

    print("    Inclination predictions with ψ = 11/(10H):")
    print()

    for p in ["Venus", "Earth", "Mars", "Neptune"]:
        d = D_INCL[p]
        m = MASS[p]
        i_pred = psi1_A / (d * math.sqrt(m))
        i_actual = INCL_AMP[p]
        err = (i_pred / i_actual - 1) * 100
        print(f"    {p:<10}: {i_pred:.4f}° vs {i_actual:.3f}°  ({err:+.3f}%)")

    # Uranus via ψ (d=21)
    i_U = psi1_A / (D_INCL["Uranus"] * math.sqrt(MASS["Uranus"]))
    print(f"    {'Uranus':<10}: {i_U:.4f}° vs {INCL_AMP['Uranus']:.3f}°"
          f"  ({(i_U/INCL_AMP['Uranus']-1)*100:+.3f}%)")

    print()

    # Products
    prod = psi1 * ECC_BASE["Earth"]
    print(f"  ψ × e_E = {prod:.8e}")
    best = _find_nice_number(prod * H)
    print(f"  ψ × e_E × H = {prod * H:.8e}  {best}")
    best2 = _find_nice_number(prod * H**2)
    print(f"  ψ × e_E × H² = {prod * H**2:.4f}  {best2}")
    print()

    # Summary
    print("  ╔══════════════════════════════════════════════════════════════════╗")
    print("  ║  MINIMUM FREE PARAMETER ANALYSIS                               ║")
    print("  ║                                                                 ║")
    print("  ║  Inclination: potentially 0 free parameters                     ║")
    print("  ║    if ψ = 11/(10H) holds (error ~0.1%)                       ║")
    print("  ║    All i amplitudes derivable from H + mass + quantum numbers   ║")
    print("  ║                                                                 ║")
    print("  ║  Eccentricity: still needs 1 free parameter (e_E or ξ_V)       ║")
    print("  ║    No clean expression for e_E in terms of H found yet         ║")
    print("  ║    The ratio R = ψ/ξ_V ≈ 311 is not a clean Fibonacci ratio  ║")
    print("  ║                                                                 ║")
    print("  ║  Total: 1 free parameter (e_Earth) + H + masses + quantum #s   ║")
    print("  ║  predicts both i and e for 7 planets                           ║")
    print("  ╚══════════════════════════════════════════════════════════════════╝")


def part1_psi_from_H():
    """Part 1: Can ψ be derived from H?"""
    print()
    print("*" * 80)
    print("  PART 1: INVESTIGATION — CAN ψ BE DERIVED FROM H?")
    print("*" * 80)
    print()

    psi1, psi2, psi3, xi_V = _p1_section_1()
    _p1_section_2(psi1)
    R = _p1_section_3(psi1, xi_V)
    _p1_section_4(psi1)
    _p1_section_5(psi1)
    _p1_section_6(psi1, xi_V)
    _p1_section_7(psi1)
    _p1_section_8(psi1, xi_V, R)
    _p1_section_9(psi1, xi_V)
    _p1_section_10(psi1, xi_V)


# ╔═════════════════════════════════════════════════════════════════════════╗
# ║  PART 2: R ≈ 311 AND THE LAST FREE PARAMETER  (10 sections)           ║
# ╚═════════════════════════════════════════════════════════════════════════╝


def _p2_section_1():
    """R in terms of e_E — the triad structure."""
    print()
    print("=" * 80)
    print("  SECTION 1: R IN TERMS OF e_E — THE TRIAD STRUCTURE")
    print("=" * 80)
    print()

    psi1 = 2205 / (2 * H)
    xi_V = XI_BASE["Venus"]
    xi_E = XI_BASE["Earth"]
    R = psi1 / xi_V

    print(f"  ψ = 2205/(2H) = {psi1:.10e}")
    print(f"  ξ_V = e_V × √m_V = {xi_V:.10e}")
    print(f"  R = ψ/ξ_V = {R:.6f}")
    print()

    # ξ_V = (2/5) × ξ_E
    xi_V_from_E = (2 / 5) * xi_E
    print(f"  ξ_V = (2/5) × ξ_E = (2/5) × {xi_E:.10e} = {xi_V_from_E:.10e}")
    print(f"  Check: {xi_V:.10e} vs {xi_V_from_E:.10e} ({(xi_V/xi_V_from_E-1)*100:+.3f}%)")
    print()

    R_via_E = (5 / 2) * psi1 / xi_E
    print(f"  R = (5/2) × ψ / ξ_E = {R_via_E:.6f}")
    print()

    val_num = 5 * 2205
    print(f"  R = (5 × 2205) / (4H × e_E × √m_E)")
    print(f"    = {val_num} / (4 × {H} × {ECC_BASE['Earth']} × {SQRT_M['Earth']:.8e})")
    print(f"    = {val_num} / {4 * H * xi_E:.6f}")
    print(f"    = {val_num / (4 * H * xi_E):.6f}")
    print()

    print(f"  KEY: 11025 = 105² = (5 × 21)² = (F₅ × F₈)²")
    print(f"  So: R = (F₅ × F₈)² / (4H × ξ_E)")
    print(f"       = (F₅ × F₈)² / (2F₃ × H × e_E × √m_E)")
    print()

    R_times_xiE = R * xi_E
    formula_val = (5 * 21)**2 / (4 * H)
    print(f"  R × ξ_E = {R_times_xiE:.8e}")
    print(f"  (F₅ × F₈)² / (4H) = {formula_val:.8e}")
    print(f"  Agreement: {(R_times_xiE/formula_val - 1)*100:+.4f}%")
    print()

    print(f"  Note: R × ξ_E = ψ × (5/2) = (5/2) × 2205/(2H) = 11025/(4H)")
    print(f"  This is exact by construction (inner ladder).")
    print()

    # If R = 311 exactly
    xiE_if_R311 = 11025 / (4 * H * 311)
    eE_if_R311 = xiE_if_R311 / SQRT_M["Earth"]
    print(f"  IF R = 311 exactly:")
    print(f"    ξ_E = 11025 / (4H × 311) = {xiE_if_R311:.8e}")
    print(f"    e_E = ξ_E / √m_E = {eE_if_R311:.8f}")
    print(f"    Actual e_E = {ECC_BASE['Earth']:.8f}")
    print(f"    Difference: {(eE_if_R311/ECC_BASE['Earth'] - 1)*100:+.4f}%")
    print()

    R_exact_from_data = (5 * 21)**2 / (4 * H * xi_E)
    print(f"  R from data = {R_exact_from_data:.8f}")
    print(f"  R = 311 would give {311:.8f}")
    print(f"  Deviation: {(R_exact_from_data/311 - 1)*100:+.4f}%")
    print()

    # Try R = 311 + small fraction
    for num in range(0, 10):
        for den in range(1, 20):
            R_try = 311 + num / den
            err = abs(R_exact_from_data / R_try - 1)
            if err < 0.0002 and num != 0:
                print(f"    R ≈ 311 + {num}/{den} = {R_try:.6f} ({err*100:.4f}%)")

    print()
    return R


def _p2_section_2(R):
    """Factor analysis of 2205 and 11025."""
    print()
    print("=" * 80)
    print("  SECTION 2: FACTOR ANALYSIS OF 2205 AND 11025")
    print("=" * 80)
    print()

    print("  2205 = 3² × 5 × 7²")
    print("       = F₅ × F₈² = 5 × 21²")
    print()
    print("  11025 = 3² × 5² × 7² = (3 × 5 × 7)² = 105²")
    print("        = (F₅ × F₈)² = (5 × 21)²")
    print()

    print("  Structure:")
    print("    ψ × 2H = F₅ × F₈² = F_{b_J} × F_{b_S}² = 2205")
    print("    R × ξ_E × 4H = (F₅ × F₈)² = (F_{b_J} × F_{b_S})² = 11025 = 5 × 2205")
    print()

    print("  R = (F₅/F₃) × ψ / ξ_E = (5/2) × ψ / ξ_E")
    print("  The factor 5/2 = F₅/F₃ is the eccentricity ladder ratio ξ_E/ξ_V")
    print()

    xi_E = XI_BASE["Earth"]
    print(f"  ξ_E = e_E × √m_E = {xi_E:.10e}")
    print(f"  ξ_E × H = {xi_E * H:.8f}")
    print(f"  ξ_E × 2H = {xi_E * 2 * H:.8f}")
    print(f"  ξ_E × 4H = {xi_E * 4 * H:.8f}")
    print()

    val = xi_E * 4 * H
    print(f"  ξ_E × 4H = {val:.6f}")
    print(f"  11025 / (ξ_E × 4H) = {11025/val:.6f} = R")
    print()

    print("  Exploration: ξ_E × 4H = 11025/R")
    print(f"  If R = 311: ξ_E × 4H = {11025/311:.6f}")
    print()

    # Search for ξ_E × 4H as Fibonacci expression
    target = xi_E * 4 * H
    print(f"  Target: {target:.6f}")
    best = []
    for fa in range(1, 15):
        for fb in range(1, 15):
            fib_a = FIB[fa] if fa < len(FIB) else 0
            fib_b = FIB[fb] if fb < len(FIB) else 0
            if fib_a > 0 and fib_b > 0:
                for fc in range(1, 12):
                    fib_c = FIB[fc] if fc < len(FIB) else 0
                    if fib_c > 0:
                        val_try = fib_a * fib_b / fib_c
                        err = abs(target / val_try - 1)
                        if err < 0.01:
                            best.append((err, f"F_{fa}×F_{fb}/F_{fc} = {fib_a}×{fib_b}/{fib_c} = {val_try:.4f}"))

    # Also try single and squared
    for fa in range(1, 17):
        fib_a = FIB[fa] if fa < len(FIB) else 0
        if fib_a > 0:
            err = abs(target / fib_a - 1)
            if err < 0.05:
                best.append((err, f"F_{fa} = {fib_a}"))

    for fa in range(1, 12):
        for fb in range(1, 12):
            fib_a = FIB[fa] if fa < len(FIB) else 0
            fib_b = FIB[fb] if fb < len(FIB) else 0
            if fib_a > 0 and fib_b > 0:
                val_try = fib_a / fib_b
                err = abs(target / val_try - 1)
                if err < 0.01:
                    best.append((err, f"F_{fa}/F_{fb} = {fib_a}/{fib_b} = {val_try:.4f}"))

    best.sort()
    seen = set()
    for err, desc in best[:10]:
        if desc not in seen:
            seen.add(desc)
            print(f"    {err*100:>7.4f}%  {desc}")

    print()

    print(f"  11025/R ≈ {11025/R:.6f}")
    target2 = 11025 / R
    for fa in range(1, 17):
        fib_a = FIB[fa] if fa < len(FIB) else 0
        if fib_a > 0:
            err = abs(target2 / fib_a - 1)
            if err < 0.05:
                print(f"    11025/R ≈ F_{fa} = {fib_a} ({err*100:.3f}%)")

    print(f"    F₉ = 34. 11025/R = {11025/R:.4f}. 11025/34 = {11025/34:.4f} → R_if_34 = {11025/34:.4f}")
    print(f"    Actual R = {R:.4f}")
    print()


def _p2_section_3(R):
    """Number-theoretic properties of 311."""
    print()
    print("=" * 80)
    print("  SECTION 3: NUMBER-THEORETIC PROPERTIES OF 311")
    print("=" * 80)
    print()

    is_prime = all(311 % i != 0 for i in range(2, 18))
    print(f"  311 is {'prime' if is_prime else 'composite'}")
    print()

    print(f"  311 mod 5 = {311 % 5}")
    print(f"  311 mod 10 = {311 % 10}")
    print(f"  311 = 5 × 62 + 1")
    print()

    pi311 = pisano_period(311)
    print(f"  Pisano period π(311) = {pi311}")
    print(f"  (The Fibonacci sequence mod 311 repeats every {pi311} terms)")
    print()

    print(f"  311 - 1 = 310 = 2 × 5 × 31")
    if pi311 > 0:
        print(f"  π(311) divides 310: {310 % pi311 == 0}")
        p = pi311
        factors = []
        for f in range(2, p + 1):
            while p % f == 0:
                factors.append(f)
                p //= f
            if p == 1:
                break
        print(f"  π(311) = {pi311} = {'×'.join(str(f) for f in factors)}")
    print()

    # F(310) mod 311
    a, b = 0, 1
    for i in range(310):
        a, b = b, (a + b) % 311
    print(f"  F(310) mod 311 = {a}")
    print(f"  (Should be 0 for primes ≡ ±1 mod 5)")
    print()

    # Wall-Sun-Sun test
    a2, b2 = 0, 1
    for i in range(310):
        a2, b2 = b2, (a2 + b2) % (311 * 311)
    print(f"  F(310) mod 311² = {a2}")
    f310_div_311 = a2 // 311
    print(f"  F(310) / 311 mod 311 = {f310_div_311}")
    print(f"  Wall-Sun-Sun prime test: F(p-1)/p mod p = {f310_div_311 % 311}")
    if f310_div_311 % 311 == 0:
        print("  311 IS a Wall-Sun-Sun prime! (extremely rare)")
    else:
        print("  311 is not a Wall-Sun-Sun prime")
    print()

    # Nearby Fibonacci numbers
    print("  Nearby Fibonacci numbers:")
    print(f"    F_14 = 377")
    print(f"    F_13 = 233")
    print(f"    F_12 = 144")
    print(f"    311 - 233 = 78")
    print(f"    377 - 311 = 66")
    print()

    # Zeckendorf representation
    print("  311 as sum of Fibonacci numbers (Zeckendorf):")
    remaining = 311
    zeck = []
    for i in range(len(FIB) - 1, 0, -1):
        if FIB[i] <= remaining:
            zeck.append(f"F_{i}={FIB[i]}")
            remaining -= FIB[i]
            if remaining == 0:
                break
    print(f"    311 = {' + '.join(zeck)} = {' + '.join(str(FIB[int(z.split('=')[0][2:])]) for z in zeck)}")
    print()

    # Combinations
    print("  311 as combinations of Fibonacci numbers:")
    for fa in range(1, 15):
        for fb in range(0, 15):
            val = FIB[fa]**2 + FIB[fb]
            if val == 311:
                print(f"    F_{fa}² + F_{fb} = {FIB[fa]}² + {FIB[fb]} = {val}")
    for fa in range(1, 15):
        for fb in range(0, 15):
            val = FIB[fa]**2 - FIB[fb]
            if val == 311:
                print(f"    F_{fa}² - F_{fb} = {FIB[fa]}² - {FIB[fb]} = {val}")
    for fa in range(1, 12):
        for fb in range(fa, 12):
            for fc in range(0, 12):
                val = FIB[fa] * FIB[fb] + FIB[fc]
                if val == 311:
                    print(f"    F_{fa}×F_{fb} + F_{fc} = {FIB[fa]}×{FIB[fb]} + {FIB[fc]} = {val}")
                val2 = FIB[fa] * FIB[fb] - FIB[fc]
                if val2 == 311:
                    print(f"    F_{fa}×F_{fb} - F_{fc} = {FIB[fa]}×{FIB[fb]} - {FIB[fc]} = {val2}")
    print()

    # Lucas numbers
    LUCAS = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322, 521, 843]
    print("  Lucas number check:")
    for i, L in enumerate(LUCAS):
        if abs(L - 311) < 30:
            print(f"    L_{i} = {L} (diff from 311: {311 - L})")
    print()

    # Golden ratio powers
    for n in range(1, 20):
        if abs(PHI**n - 311) < 20:
            print(f"    φ^{n} = {PHI**n:.4f} (diff from 311: {311 - PHI**n:.4f})")
    print(f"    Note: F_14 = 377 = closest Fibonacci to 311")
    print()


def _p2_section_4(R):
    """e_E × H products — Fibonacci expression for e_E?"""
    print()
    print("=" * 80)
    print("  SECTION 4: e_E × H PRODUCTS — FIBONACCI EXPRESSION FOR e_E?")
    print("=" * 80)
    print()

    e_E = ECC_BASE["Earth"]
    sqrt_mE = SQRT_M["Earth"]

    print(f"  e_E = {e_E}")
    print(f"  √m_E = {sqrt_mE:.8e}")
    print(f"  ξ_E = e_E × √m_E = {e_E * sqrt_mE:.8e}")
    print()

    print(f"  e_E × H = {e_E * H:.4f}")
    print(f"  e_E × 2H = {e_E * 2 * H:.4f}")
    print(f"  e_E × H² = {e_E * H**2:.2f}")
    print(f"  e_E × √H = {e_E * math.sqrt(H):.6f}")
    print()

    target = e_E * H
    print(f"  Searching for e_E × H ≈ {target:.4f} as Fibonacci expression:")
    print()

    best = []

    for fa in range(1, 17):
        for fb in range(1, 17):
            val = FIB[fa] * FIB[fb]
            if val > 0:
                err = abs(target / val - 1)
                if err < 0.02:
                    best.append((err, f"F_{fa}×F_{fb} = {FIB[fa]}×{FIB[fb]} = {val}"))

    for fa in range(1, 17):
        val = FIB[fa] ** 2
        if val > 0:
            err = abs(target / val - 1)
            if err < 0.05:
                best.append((err, f"F_{fa}² = {FIB[fa]}² = {val}"))

    for fa in range(1, 15):
        for fb in range(1, 15):
            for fc in range(1, 10):
                val = FIB[fa] * FIB[fb] / FIB[fc]
                if val > 100:
                    err = abs(target / val - 1)
                    if err < 0.005:
                        best.append((err, f"F_{fa}×F_{fb}/F_{fc} = {FIB[fa]}×{FIB[fb]}/{FIB[fc]} = {val:.2f}"))

    for fa in range(1, 12):
        for fb in range(fa, 12):
            for fc in range(fb, 12):
                val = FIB[fa] * FIB[fb] * FIB[fc]
                if val > 0:
                    err = abs(target / val - 1)
                    if err < 0.01:
                        best.append((err, f"F_{fa}×F_{fb}×F_{fc} = {FIB[fa]}×{FIB[fb]}×{FIB[fc]} = {val}"))

    best.sort()
    seen = set()
    for err, desc in best[:15]:
        if desc not in seen:
            seen.add(desc)
            print(f"    {err*100:>7.4f}%  {desc}")

    print()

    # ξ_E × H
    xi_E = e_E * sqrt_mE
    target2 = xi_E * H
    print(f"  ξ_E × H = {target2:.8f}")
    print(f"  Searching for ξ_E × H ≈ {target2:.6f}:")
    print()

    best2 = []
    for fa in range(1, 17):
        for fb in range(1, 17):
            fib_a = FIB[fa]
            fib_b = FIB[fb]
            if fib_b > 0:
                val = fib_a / fib_b
                err = abs(target2 / val - 1)
                if err < 0.01:
                    best2.append((err, f"F_{fa}/F_{fb} = {fib_a}/{fib_b} = {val:.6f}"))

    for fa in range(1, 17):
        fib_a = FIB[fa]
        if fib_a > 0:
            err = abs(target2 / fib_a - 1)
            if err < 0.1:
                best2.append((err, f"F_{fa} = {fib_a}"))

    for fa in range(1, 14):
        for fb in range(1, 14):
            for fc in range(1, 14):
                val = FIB[fa] * FIB[fb] / FIB[fc]
                if 0 < val < 100:
                    err = abs(target2 / val - 1)
                    if err < 0.005:
                        best2.append((err, f"F_{fa}×F_{fb}/F_{fc} = {FIB[fa]}×{FIB[fb]}/{FIB[fc]} = {val:.6f}"))

    best2.sort()
    seen2 = set()
    for err, desc in best2[:10]:
        if desc not in seen2:
            seen2.add(desc)
            print(f"    {err*100:>7.4f}%  {desc}")

    print()

    target3 = xi_E * H
    print(f"  ξ_E × H = {target3:.8f}")
    print(f"  ψ × 2H = 2205")
    print(f"  Ratio: (ψ × 2H) / (ξ_E × H) = 2205 / {target3:.6f} = {2205/target3:.4f}")
    print()

    print(f"  2205/(ξ_E × H) = 2ψ/ξ_E = 4R/5 = {4*R/5:.4f}")
    print(f"  Check: 4 × {R:.4f} / 5 = {4*R/5:.4f}")
    print()


def _p2_section_5():
    """Cross-parameter identities (i × e × m)."""
    print()
    print("=" * 80)
    print("  SECTION 5: CROSS-PARAMETER IDENTITIES")
    print("=" * 80)
    print()

    print("  For each inner planet, compute i × e × m, i × e × √m, etc.:")
    print()

    print(f"  {'Planet':<10} {'i×e':>12} {'i×e×m':>12} {'i×e×√m':>12} {'η×ξ':>12}")
    print(f"  {'─'*10} {'─'*12} {'─'*12} {'─'*12} {'─'*12}")

    for p in ["Venus", "Earth", "Mars", "Mercury"]:
        i = INCL_AMP.get(p, 0)
        e = ECC_BASE[p]
        m = MASS[p]
        ie = i * e
        iem = i * e * m
        iesm = i * e * math.sqrt(m)
        eta_xi = ETA[p] * XI_BASE[p] if p in INCL_AMP and INCL_AMP[p] > 0 else 0
        if i > 0:
            print(f"  {p:<10} {ie:>12.6e} {iem:>12.6e} {iesm:>12.6e} {eta_xi:>12.6e}")
        else:
            print(f"  {p:<10} {'N/A':>12} {'N/A':>12} {'N/A':>12} {'N/A':>12}")

    print()

    psi1 = 2205 / (2 * H)
    R_val = psi1 / XI_BASE["Venus"]

    print("  Predicted η × ξ = (ψ²/R) × k_ecc/d_incl:")
    print()

    for p in ["Venus", "Earth", "Mars"]:
        d = D_INCL[p]
        k = K_ECC[p]
        pred = (psi1**2 / R_val) * k / d
        actual = ETA[p] * XI_BASE[p]
        err = (pred / actual - 1) * 100
        print(f"    {p:<8}: pred = {pred:.6e}, actual = {actual:.6e}, err = {err:+.3f}%")

    print()

    # Ratios of η×ξ between planets
    print("  Ratios of η×ξ between planets:")
    print(f"    (η×ξ)_E / (η×ξ)_V = {ETA['Earth']*XI_BASE['Earth']/(ETA['Venus']*XI_BASE['Venus']):.4f}")
    print(f"    Predicted: (k_E/d_E) / (k_V/d_V) = ({5/2}/{3}) / ({1}/{2})")
    print(f"             = {(5/2)/3 / (1/2):.4f}")
    print(f"    (η×ξ)_M / (η×ξ)_V = {ETA['Mars']*XI_BASE['Mars']/(ETA['Venus']*XI_BASE['Venus']):.4f}")
    print(f"    Predicted: (k_M/d_M) / (k_V/d_V) = ({5}/{13/5}) / ({1}/{2})")
    print(f"             = {(5)/(13/5) / (1/2):.4f}")
    print()

    for p in ["Venus", "Earth", "Mars"]:
        d = D_INCL[p]
        k = K_ECC[p]
        print(f"    {p}: k_ecc/d_incl = {k}/{d} = {k/d:.4f}")
    print()
    print("  The RATIOS of η×ξ products are determined by k/d alone —")
    print("  they are R-independent and purely Fibonacci.")
    print()


def _p2_section_6(R):
    """R and the eccentricity period structure."""
    print()
    print("=" * 80)
    print("  SECTION 6: R AND THE ECCENTRICITY PERIOD STRUCTURE")
    print("=" * 80)
    print()

    print("  Earth's eccentricity period: T_peri = H/16")
    print("  16 = 13 + 3 = F₇ + F₄ = b_axial + b_incl")
    print()

    print(f"  F_16 = {FIB[16]} = 987")
    print(f"  F_16 / H = {FIB[16] / H:.8e}")
    xi_V = XI_BASE["Venus"]
    print(f"  ξ_V = {xi_V:.8e}")
    print(f"  ξ_V / (F_16/H) = {xi_V / (FIB[16]/H):.6f}")
    print()

    inner_sum = 1 + 5/2 + 5 + 8
    print(f"  Sum of inner eccentricity weights: {inner_sum}")
    print()

    print("  Triad connections (historical inclination, eccentricity analog):")
    print("  Inclination: 3η_E + 5η_J = 8η_S (historical — no longer exact)")
    print("  Eccentricity: 5ξ_J ≈ 8ξ_S (2.6% error)")
    print()

    xi_E = XI_BASE["Earth"]
    xi_J = XI_BASE["Jupiter"]
    xi_S = XI_BASE["Saturn"]

    three_prime = (8 * xi_S - 5 * xi_J) / xi_E
    print(f"  If 3'ξ_E + 5ξ_J = 8ξ_S:")
    print(f"    3' = (8ξ_S - 5ξ_J) / ξ_E = {three_prime:.4f}")
    print()

    target = three_prime
    print(f"  Target: 3' = {target:.6f}")
    best = []
    for fa in range(0, 15):
        for fb in range(1, 15):
            val = FIB[fa] / FIB[fb]
            if val > 0:
                err = abs(target / val - 1)
                if err < 0.05:
                    best.append((err, f"F_{fa}/F_{fb} = {FIB[fa]}/{FIB[fb]} = {val:.4f}"))
    best.sort()
    for err, desc in best[:5]:
        print(f"    {err*100:.3f}%  {desc}")
    print()

    # Inclination Law 3
    eta_E = ETA["Earth"]
    eta_J = ETA["Jupiter"]
    eta_S = ETA["Saturn"]
    incl_err = (3 * eta_E + 5 * eta_J) / (8 * eta_S) - 1
    print("  Historical inclination triad: 3η_E + 5η_J = 8η_S")
    print(f"    Error: {incl_err*100:+.3f}%")
    print()

    print("  Eccentricity triad variants:")
    for a in [1, 2, 3, 5, 8, 13]:
        for b in [1, 2, 3, 5, 8]:
            for c in [1, 2, 3, 5, 8]:
                if a + b == c or abs(a + b - c) <= 1:
                    continue
                pred = a * xi_E + b * xi_J
                target_val = c * xi_S
                if target_val > 0:
                    err = abs(pred / target_val - 1)
                    if err < 0.05:
                        print(f"    {a}ξ_E + {b}ξ_J ≈ {c}ξ_S ({err*100:.2f}%)")

    print()


def _p2_section_7():
    """[REMOVED] Selection rule — obsolete in new framework.

    The old idx(F) = 2k-4 selection rule and d = b × F decomposition have been
    superseded. The new framework finds pure Fibonacci d-values by exhaustive
    search (Config #32 of 755 valid configurations).
    """
    pass


def _p2_section_8():
    """√m weighting — connection to AMD."""
    print()
    print("=" * 80)
    print("  SECTION 8: √m WEIGHTING — CONNECTION TO AMD")
    print("=" * 80)
    print()

    print("  AMD (Angular Momentum Deficit) for small e, i:")
    print("    AMD_i ≈ m_i √(a_i) (e_i²/2 + i_i²/2)")
    print("          = √(a_i)/2 × (m_i×e_i² + m_i×i_i²)")
    print("          = √(a_i)/2 × (ξ_i² + η_i²)")
    print()
    print("  KEY INSIGHT: AMD decomposes naturally into ξ² + η² terms!")
    print("  Our mass-weighted quantities appear SQUARED in the AMD.")
    print()

    # Compute AMD for each planet
    print(f"  {'Planet':<10} {'ξ²':>12} {'η²':>12} {'ξ²+η²':>12} {'√a':>8} {'AMD':>12}")
    print(f"  {'─'*10} {'─'*12} {'─'*12} {'─'*12} {'─'*8} {'─'*12}")

    for p in PLANET_NAMES:
        xi_p = XI_BASE[p]
        eta_p = ETA[p] if INCL_AMP[p] > 0 else 0
        xi2 = xi_p ** 2
        eta2 = eta_p ** 2
        sqrt_a = math.sqrt(SMA[p])

        i_rad = math.radians(INCL_AMP.get(p, 0))
        e = ECC_BASE[p]
        m = MASS[p]
        amd_proper = m * math.sqrt(SMA[p]) * (1 - math.sqrt(1 - e**2) * math.cos(i_rad))

        print(f"  {p:<10} {xi2:>12.4e} {eta2:>12.4e} {xi2+eta2:>12.4e}"
              f" {sqrt_a:>8.3f} {amd_proper:>12.4e}")

    print()

    print("  WHY √m SPECIFICALLY:")
    print()
    print("  The AMD formula involves m × e² = (e√m)² = ξ²")
    print("  and m × i² = (i√m)² = η²")
    print()
    print("  So √m is the unique mass exponent that makes:")
    print("    1. AMD = sum of SQUARES of individual planet quantities")
    print("    2. Each quantity ξ = e×√m is the 'natural' AMD variable")
    print("    3. The Fibonacci structure acts on the AMD-natural variables")
    print()

    # Test other mass exponents
    print("  Testing other mass exponents (does Fibonacci structure hold?):")
    print()

    for alpha in [0.25, 0.333, 0.5, 0.667, 0.75, 1.0]:
        vals = {}
        for p in ["Venus", "Earth", "Mars", "Mercury"]:
            vals[p] = ECC_BASE[p] * MASS[p] ** alpha

        ratios = {
            "E/V": vals["Earth"] / vals["Venus"],
            "M/V": vals["Mars"] / vals["Venus"],
            "Hg/V": vals["Mercury"] / vals["Venus"],
        }

        err_E = abs(ratios["E/V"] / 2.5 - 1)
        err_M = abs(ratios["M/V"] / 5 - 1)
        err_Hg = abs(ratios["Hg/V"] / 8 - 1)
        max_err = max(err_E, err_M, err_Hg)

        print(f"    α={alpha:.3f}: E/V={ratios['E/V']:.3f}(5/2={err_E*100:.1f}%)"
              f" M/V={ratios['M/V']:.3f}(5={err_M*100:.1f}%)"
              f" Hg/V={ratios['Hg/V']:.3f}(8={err_Hg*100:.1f}%)"
              f" max_err={max_err*100:.1f}%")

    print()
    print("  Note: α=0.5 (√m) is NOT the only mass exponent that works")
    print("  for the eccentricity ladder. The ladder ratios are largely")
    print("  determined by the eccentricities themselves, not the masses,")
    print("  because the mass ratio is the same factor in all comparisons.")
    print()

    # Inclination test
    print("  For INCLINATION (Law 2), test: does d × i × m^α = const?")
    print()

    d_incl_subset = {"Venus": 34, "Earth": 3, "Neptune": 34}

    for alpha in [0.25, 0.333, 0.5, 0.667, 0.75, 1.0]:
        psi_vals = {}
        for p in ["Venus", "Earth", "Neptune"]:
            psi_vals[p] = d_incl_subset[p] * INCL_AMP[p] * MASS[p] ** alpha

        mean = sum(psi_vals.values()) / 3
        spread = max(abs(v / mean - 1) for v in psi_vals.values())

        print(f"    α={alpha:.3f}: ψ_V={psi_vals['Venus']:.4e},"
              f" ψ_E={psi_vals['Earth']:.4e},"
              f" ψ_N={psi_vals['Neptune']:.4e},"
              f" spread={spread*100:.2f}%")

    print()
    print("  The optimal mass exponent for the ψ-constant is the one that")
    print("  minimizes the spread across Venus, Earth, and Neptune.")
    print()

    # Find optimal alpha
    best_alpha = 0.5
    best_spread = float('inf')
    for alpha_100 in range(0, 150):
        alpha = alpha_100 / 100
        psi_vals = [d_incl_subset[p] * INCL_AMP[p] * MASS[p] ** alpha
                    for p in ["Venus", "Earth", "Neptune"]]
        mean = sum(psi_vals) / 3
        spread = max(abs(v / mean - 1) for v in psi_vals)
        if spread < best_spread:
            best_spread = spread
            best_alpha = alpha

    print(f"  Optimal α = {best_alpha:.2f} (spread = {best_spread*100:.3f}%)")
    print(f"  Standard α = 0.50 (spread = ?)")

    psi_50 = [d_incl_subset[p] * INCL_AMP[p] * MASS[p] ** 0.5
              for p in ["Venus", "Earth", "Neptune"]]
    mean_50 = sum(psi_50) / 3
    spread_50 = max(abs(v / mean_50 - 1) for v in psi_50)
    print(f"  Spread at α=0.50: {spread_50*100:.3f}%")
    print()

    if abs(best_alpha - 0.5) < 0.05:
        print("  → α = 0.50 (√m) IS or IS NEAR the optimal exponent")
    else:
        print(f"  → Optimal α = {best_alpha} differs from 0.50")

    print()


def _p2_section_9():
    """R and the Law 1 inner quartet."""
    print()
    print("=" * 80)
    print("  SECTION 9: R AND THE LAW 1 INNER QUARTET")
    print("=" * 80)
    print()

    ladder = [1, Fraction(5, 2), 5, 8]
    ladder_sum = sum(ladder)
    ladder_prod = 1
    for l in ladder:
        ladder_prod *= l

    print(f"  Inner eccentricity ladder: {[str(l) for l in ladder]}")
    print(f"  Sum: {ladder_sum} = {float(ladder_sum)}")
    print(f"  Product: {ladder_prod} = {float(ladder_prod)}")
    print()

    print(f"  Product = 100 = 4 × 25 = 2² × 5² = F₃² × F₅²")
    print(f"         = (F₃ × F₅)² = 10²")
    print()

    xi_V = XI_BASE["Venus"]
    sigma_ecc = sum(float(k) * xi_V for k in ladder)
    psi1 = 2205 / (2 * H)
    R_val = psi1 / xi_V

    print(f"  Σ_ecc = Σ(k × ξ_V) = {float(ladder_sum)} × ξ_V = {sigma_ecc:.6e}")
    print(f"  ψ = {psi1:.6e}")
    print(f"  ψ / Σ_ecc = {psi1/sigma_ecc:.4f}")
    print(f"  R / {float(ladder_sum)} = {R_val/float(ladder_sum):.4f}")
    print()

    R_over_165 = R_val / 16.5
    print(f"  R / 16.5 = {R_over_165:.4f}")

    R_2_33 = 2 * R_val / 33
    print(f"  2R / 33 = {R_2_33:.4f}")
    print()

    print("  Note: Earth's eccentricity ladder position k=5/2 differs from")
    print("  its Law 3 weight of 3 in the inclination triad.")
    print("  The inner and outer systems have different weight structures.")
    print()


def _p2_section_10(R):
    """Comprehensive summary of Part 2."""
    print()
    print("=" * 80)
    print("  SECTION 10: COMPREHENSIVE SUMMARY")
    print("=" * 80)
    print()

    print("  ═══ R ≈ 311: CURRENT STATUS ═══")
    print()
    print(f"  R = ψ/ξ_V = {R:.6f}")
    print()
    print("  Structural expressions:")
    print("    R = (F₅ × F₈)² / (4H × ξ_E)")
    print("    R = (5/2) × ψ / ξ_E")
    print("    R = 2205 / (2H × ξ_V)")
    print()
    print("  Number-theoretic facts about 311:")
    print("    • 311 is prime")
    print("    • 311 ≡ 1 (mod 5)")
    print("    • Not a Fibonacci number, Lucas number, or simple Fibonacci product")
    print()
    print("  CONCLUSION ON R:")
    print("    R ≈ 311 remains an irreducible constant. It is not expressible")
    print("    as a simple Fibonacci product or ratio. The eccentricity base")
    print("    unit ξ_V requires one independent measurement (e_E).")
    print()

    print("  ═══ D-VALUE ASSIGNMENT ═══")
    print()
    print("  The d-values are now pure Fibonacci numbers found by exhaustive search")
    print("  (Config #32 of 755 valid configurations). Mirror symmetry is exact")
    print("  for all 4 inner/outer pairs: {Mars↔Jupiter(5), Earth↔Saturn(3),")
    print("  Venus↔Neptune(34), Mercury↔Uranus(21)}.")
    print()

    print("  ═══ √m WEIGHTING: AMD CONNECTION ═══")
    print()
    print("  KEY FINDING: √m is the natural mass exponent for AMD decomposition")
    print("    AMD_i ≈ √(a_i)/2 × (ξ_i² + η_i²)")
    print("    where ξ = e√m, η = i√m")
    print()
    print("    This means:")
    print("    • Our mass-weighted quantities appear SQUARED in the AMD")
    print("    • The Fibonacci structure operates on AMD-natural variables")
    print("    • √m is not arbitrary — it's the AMD decomposition exponent")
    print()


def part2_R311_analysis():
    """Part 2: R ≈ 311 and the last free parameter."""
    print()
    print("*" * 80)
    print("  PART 2: FRESH INVESTIGATION — R ≈ 311 AND THE LAST FREE PARAMETER")
    print("*" * 80)
    print()

    R = _p2_section_1()
    _p2_section_2(R)
    _p2_section_3(R)
    _p2_section_4(R)
    _p2_section_5()
    _p2_section_6(R)
    _p2_section_7()
    _p2_section_8()
    _p2_section_9()
    _p2_section_10(R)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    part1_psi_from_H()
    part2_R311_analysis()


if __name__ == "__main__":
    main()

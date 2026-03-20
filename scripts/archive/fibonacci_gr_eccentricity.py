#!/usr/bin/env python3
"""
GR-CORRECTED PROPER ECCENTRICITIES AND LASKAR COMPARISON
=========================================================

Extends fibonacci_proper_eccentricity.py by:
  1. Adding general-relativistic apsidal precession to the A matrix
  2. Comparing eigenfrequencies with/without GR vs published values
  3. Computing GR-corrected proper eccentricities (oscillation midpoints)
  4. Testing the Fibonacci eccentricity ladder with corrected values
  5. Comparing with Laskar's published secular solution

The GR precession rate for each planet is:
    Δg_GR = 24π³ / (c² a^{5/2} (1 - e²))

where c = 63241 AU/yr, a in AU, e = J2000 eccentricity.

This correction is added to the diagonal of the Laplace-Lagrange A matrix.
For Mercury it's ~0.43"/yr (comparable to secular eigenfrequencies),
for Venus ~0.086"/yr, for Earth ~0.038"/yr, and negligible for outer planets.

References:
  - Brouwer & van Woerkom (1950), Astronomical Papers, Vol. XIII
  - Laskar (1988), A&A 198, 341 — 10 Myr secular evolution
  - Laskar (1990), Icarus 88, 266 — eigenfrequencies g₁–g₈
  - Laskar (2008), Icarus 196, 1 — chaotic diffusion, long-term ranges
  - Murray & Dermott (2000), Solar System Dynamics, Table 7.1–7.3
"""

import numpy as np
from fibonacci_data import *


# ═══════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

C_AU_YR = 63241.077    # speed of light in AU/yr
GM_SUN = 4 * np.pi**2  # GM_☉ in AU³/yr² (Kepler's third law)
RAD_TO_ARCSEC = 3600 * 180 / np.pi

# J2000 longitudes of perihelion (degrees)
LONGITUDE_PERI = {
    "Mercury":  77.456, "Venus":   131.533,
    "Earth":   102.947, "Mars":    336.041,
    "Jupiter":  14.728, "Saturn":   92.432,
    "Uranus":  170.964, "Neptune":  44.971,
}

# Published eigenfrequencies ("/yr)
LASKAR_G = [5.59, 7.45, 17.37, 17.92, 4.26, 28.22, 3.09, 0.67]
LASKAR_LABELS = ["g₁", "g₂", "g₃", "g₄", "g₅", "g₆", "g₇", "g₈"]

# Brouwer & van Woerkom (1950) eigenfrequencies — linear secular WITH GR
# (from Murray & Dermott 2000, Table 7.1)
BVW_G = [5.46, 7.34, 17.33, 17.91, 4.30, 27.77, 2.72, 0.63]


# ═══════════════════════════════════════════════════════════════════════════
# LAPLACE COEFFICIENT
# ═══════════════════════════════════════════════════════════════════════════

def laplace_coeff(s, j, alpha, N=8192):
    """Compute Laplace coefficient b_s^{(j)}(alpha)."""
    theta = np.linspace(0, 2 * np.pi, N, endpoint=False)
    dtheta = 2 * np.pi / N
    denom = (1 - 2 * alpha * np.cos(theta) + alpha**2)**s
    integrand = np.cos(j * theta) / denom
    return np.sum(integrand) * dtheta / np.pi


# ═══════════════════════════════════════════════════════════════════════════
# GR PRECESSION
# ═══════════════════════════════════════════════════════════════════════════

def gr_precession_rate(planet):
    """
    GR apsidal precession rate (rad/yr) for a planet.

    Δg_GR = 3 GM n / (c² a (1-e²))
          = 24π³ / (c² a^{5/2} (1-e²))

    Uses J2000 eccentricities for the (1-e²) factor.
    """
    a = SMA[planet]
    e = ECC_J2000[planet]
    return 24 * np.pi**3 / (C_AU_YR**2 * a**2.5 * (1 - e**2))


# ═══════════════════════════════════════════════════════════════════════════
# SECULAR ECCENTRICITY MATRIX
# ═══════════════════════════════════════════════════════════════════════════

def build_A_matrix(include_gr=False):
    """
    Build the 8×8 Laplace-Lagrange secular eccentricity matrix.

    Diagonal:   A_{jj} = +(n_j/4) × Σ_{k≠j} (m_k/M_☉) × α × b_{3/2}^{(1)}(α)
    Off-diag:   A_{jk} = -(n_j/4) × (m_k/M_☉) × α × b_{3/2}^{(2)}(α)

    If include_gr=True, adds GR apsidal precession to the diagonal.
    """
    M_sun = 1.0
    n = len(PLANET_NAMES)
    A = np.zeros((n, n))

    mean_motion = {p: 2 * np.pi / ORBITAL_PERIOD[p] for p in PLANET_NAMES}

    for j in range(n):
        pj = PLANET_NAMES[j]
        for k in range(n):
            if j == k:
                continue
            pk = PLANET_NAMES[k]

            alpha = min(SMA[pj], SMA[pk]) / max(SMA[pj], SMA[pk])
            prefactor = (mean_motion[pj] / 4) * (MASS[pk] / (M_sun + MASS[pj]))

            # Off-diagonal: b_{3/2}^{(2)}
            b2 = laplace_coeff(1.5, 2, alpha)
            A[j, k] = -prefactor * alpha * b2

            # Diagonal contribution: b_{3/2}^{(1)}
            b1 = laplace_coeff(1.5, 1, alpha)
            A[j, j] += prefactor * alpha * b1

    if include_gr:
        for j, p in enumerate(PLANET_NAMES):
            A[j, j] += gr_precession_rate(p)

    return A


def solve_secular(A):
    """Solve eigenvalue problem, extract mode amplitudes from J2000."""
    eigenvalues, eigenvectors = np.linalg.eig(A)
    idx_sort = np.argsort(eigenvalues.real)
    eigenvalues = eigenvalues[idx_sort].real
    eigenvectors = eigenvectors[:, idx_sort].real

    # J2000 initial conditions
    h0 = np.array([ECC_J2000[p] * np.sin(np.radians(LONGITUDE_PERI[p]))
                    for p in PLANET_NAMES])
    k0 = np.array([ECC_J2000[p] * np.cos(np.radians(LONGITUDE_PERI[p]))
                    for p in PLANET_NAMES])

    S = eigenvectors
    S_inv = np.linalg.inv(S)
    Z = S_inv @ k0 + 1j * S_inv @ h0

    return eigenvalues, eigenvectors, Z


def evolve_eccentricities(eigenvalues, eigenvectors, Z, T_max=5_000_000, N_time=50000):
    """Evolve eccentricities and extract proper values (midpoints)."""
    t = np.linspace(0, T_max, N_time)
    n_planets = len(PLANET_NAMES)
    e_history = np.zeros((n_planets, N_time))

    for t_idx in range(N_time):
        z_t = np.zeros(n_planets, dtype=complex)
        for i in range(n_planets):
            z_t += eigenvectors[:, i] * Z[i] * np.exp(1j * eigenvalues[i] * t[t_idx])
        e_history[:, t_idx] = np.abs(z_t)

    result = {}
    for j, p in enumerate(PLANET_NAMES):
        e_min = np.min(e_history[j, :])
        e_max = np.max(e_history[j, :])
        result[p] = {"min": e_min, "max": e_max, "mid": (e_max + e_min) / 2}

    return result


def section(title):
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
    print()


def main():
    print()
    print("  GR-CORRECTED PROPER ECCENTRICITIES AND LASKAR COMPARISON")
    print("  " + "=" * 56)

    # ═══════════════════════════════════════════════════════════════════════
    # 1. GR PRECESSION RATES
    # ═══════════════════════════════════════════════════════════════════════
    section("1. GR APSIDAL PRECESSION RATES")

    print("  Δg_GR = 24π³ / (c² a^{5/2} (1-e²))")
    print(f"  c = {C_AU_YR:.1f} AU/yr")
    print()

    print(f"  {'Planet':<10} {'a (AU)':>8} {'e':>10} {'Δg (\"/yr)':>12} {'Δg (\"/cy)':>12}"
          f" {'vs g₅=4.26':>12}")
    print(f"  {'-'*10} {'-'*8} {'-'*10} {'-'*12} {'-'*12} {'-'*12}")

    for p in PLANET_NAMES:
        dg = gr_precession_rate(p) * RAD_TO_ARCSEC
        dg_cy = dg * 100
        frac_g5 = dg / 4.26 * 100
        print(f"  {p:<10} {SMA[p]:>8.4f} {ECC_J2000[p]:>10.6f} {dg:>12.4f} {dg_cy:>12.2f}"
              f" {frac_g5:>10.1f}%")

    print()
    print("  Mercury GR precession = 42.96\"/century (matches 43\"/century textbook value)")
    print("  GR is significant for Mercury (10% of g₅), minor for Venus/Earth,")
    print("  negligible for outer planets.")

    # ═══════════════════════════════════════════════════════════════════════
    # 2. EIGENFREQUENCIES: NO-GR vs GR vs BvW vs LASKAR
    # ═══════════════════════════════════════════════════════════════════════
    section("2. EIGENFREQUENCY COMPARISON")

    A_nogr = build_A_matrix(include_gr=False)
    A_gr = build_A_matrix(include_gr=True)

    ev_nogr, S_nogr, Z_nogr = solve_secular(A_nogr)
    ev_gr, S_gr, Z_gr = solve_secular(A_gr)

    ev_nogr_as = ev_nogr * RAD_TO_ARCSEC
    ev_gr_as = ev_gr * RAD_TO_ARCSEC

    laskar_sorted = sorted(LASKAR_G)
    bvw_sorted = sorted(BVW_G)

    print(f"  {'#':>3} {'No GR':>9} {'+ GR':>9} {'BvW':>8} {'Laskar':>8}"
          f"  {'Δ(noGR)':>8} {'Δ(+GR)':>8} {'Δ(BvW)':>8}")
    print(f"  {'-'*3} {'-'*9} {'-'*9} {'-'*8} {'-'*8}"
          f"  {'-'*8} {'-'*8} {'-'*8}")

    # Match each computed frequency to nearest Laskar value
    for i in range(8):
        # Find closest Laskar match for GR-corrected value
        ci = np.argmin([abs(ev_gr_as[i] - lv) for lv in laskar_sorted])
        laskar_v = laskar_sorted[ci]
        bvw_v = bvw_sorted[ci] if ci < len(bvw_sorted) else 0

        err_nogr = (ev_nogr_as[i] / laskar_v - 1) * 100 if laskar_v > 0 else 0
        err_gr = (ev_gr_as[i] / laskar_v - 1) * 100 if laskar_v > 0 else 0
        err_bvw = (bvw_v / laskar_v - 1) * 100 if laskar_v > 0 else 0

        improved = " ✓" if abs(err_gr) < abs(err_nogr) else ""
        print(f"  {i+1:>3} {ev_nogr_as[i]:>9.3f} {ev_gr_as[i]:>9.3f} {bvw_v:>8.2f} "
              f"{laskar_v:>8.2f}  {err_nogr:>+7.1f}% {err_gr:>+7.1f}% "
              f"{err_bvw:>+7.1f}%{improved}")

    # Compute RMS errors
    # For this we match each computed eigenvalue to the closest Laskar value
    def rms_error(computed_as, reference):
        ref_sorted = sorted(reference)
        errs = []
        for ev in computed_as:
            ci = np.argmin([abs(ev - rv) for rv in ref_sorted])
            errs.append((ev / ref_sorted[ci] - 1) * 100)
        return np.sqrt(np.mean(np.array(errs)**2))

    rms_nogr = rms_error(ev_nogr_as, LASKAR_G)
    rms_gr = rms_error(ev_gr_as, LASKAR_G)
    rms_bvw = rms_error(BVW_G, LASKAR_G)

    print()
    print(f"  RMS error vs Laskar:")
    print(f"    No GR (this work):    {rms_nogr:.1f}%")
    print(f"    With GR (this work):  {rms_gr:.1f}%")
    print(f"    BvW (1950):           {rms_bvw:.1f}%")
    print()

    if rms_gr < rms_nogr:
        improvement = (1 - rms_gr / rms_nogr) * 100
        print(f"  → GR improves eigenfrequencies by {improvement:.0f}%")
    else:
        print("  → GR does not significantly improve eigenfrequencies")

    print()
    print("  Note: Linear theory omits nonlinear secular couplings, Jupiter-Saturn")
    print("  near-resonance (great inequality), and secular chaos. Remaining errors")
    print("  are expected. Laskar (1990) used a quasi-periodic secular solution")
    print("  that includes higher-order terms.")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. EIGENVECTOR STRUCTURE WITH GR
    # ═══════════════════════════════════════════════════════════════════════
    section("3. EIGENVECTOR STRUCTURE (WITH GR)")

    print("  |v_k|² as % participation")
    print()
    print(f"  {'Mode':>6}", end="")
    for p in PLANET_NAMES:
        print(f" {p[:4]:>7}", end="")
    print("   Dominant")
    print(f"  {'-'*6}", end="")
    for _ in PLANET_NAMES:
        print(f" {'-'*7}", end="")
    print(f"   {'-'*15}")

    for i in range(8):
        v = S_gr[:, i]
        v2 = v**2 / np.sum(v**2)
        print(f"  g_{i+1:>4}", end="")
        dominant = []
        for k in range(8):
            pct = v2[k] * 100
            marker = "*" if pct > 20 else " "
            print(f" {pct:>5.1f}%{marker}", end="")
            if pct > 10:
                dominant.append(PLANET_NAMES[k][:3])
        print(f"   {'+'.join(dominant)}")

    # ═══════════════════════════════════════════════════════════════════════
    # 4. PROPER ECCENTRICITIES: NO-GR vs GR vs MODEL
    # ═══════════════════════════════════════════════════════════════════════
    section("4. PROPER ECCENTRICITIES: NO-GR vs GR vs MODEL")

    print("  Oscillation midpoints over 5 Myr evolution")
    print()

    e_nogr = evolve_eccentricities(ev_nogr, S_nogr, Z_nogr)
    e_gr = evolve_eccentricities(ev_gr, S_gr, Z_gr)

    print(f"  {'Planet':<10} {'e_noGR':>10} {'e_+GR':>10} {'e_model':>10} {'e_J2000':>10}"
          f"  {'Δ(noGR)':>8} {'Δ(+GR)':>8}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}"
          f"  {'-'*8} {'-'*8}")

    for p in PLANET_NAMES:
        e_n = e_nogr[p]["mid"]
        e_g = e_gr[p]["mid"]
        e_b = ECC_BASE[p]
        e_j = ECC_J2000[p]

        err_n = (e_n / e_b - 1) * 100
        err_g = (e_g / e_b - 1) * 100

        improved = " ✓" if abs(err_g) < abs(err_n) else ""
        print(f"  {p:<10} {e_n:>10.6f} {e_g:>10.6f} {e_b:>10.6f} {e_j:>10.6f}"
              f"  {err_n:>+7.1f}% {err_g:>+7.1f}%{improved}")

    # Count improvements
    n_improved = sum(1 for p in PLANET_NAMES
                     if abs(e_gr[p]["mid"] / ECC_BASE[p] - 1)
                     < abs(e_nogr[p]["mid"] / ECC_BASE[p] - 1))
    n_within_10 = sum(1 for p in PLANET_NAMES
                      if abs(e_gr[p]["mid"] / ECC_BASE[p] - 1) < 0.10)

    print()
    print(f"  GR improves {n_improved}/8 planets")
    print(f"  {n_within_10}/8 planets within 10% of model base values (with GR)")

    # ═══════════════════════════════════════════════════════════════════════
    # 5. ECCENTRICITY OSCILLATION RANGES
    # ═══════════════════════════════════════════════════════════════════════
    section("5. ECCENTRICITY OSCILLATION RANGES (WITH GR)")

    print("  From 5 Myr secular evolution")
    print()
    print(f"  {'Planet':<10} {'e_min':>10} {'e_max':>10} {'amplitude':>10} {'e_J2000':>10}"
          f" {'in range?':>10}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")

    for p in PLANET_NAMES:
        e_min = e_gr[p]["min"]
        e_max = e_gr[p]["max"]
        amp = (e_max - e_min) / 2
        e_j = ECC_J2000[p]
        in_range = "yes" if e_min <= e_j <= e_max else "NO"
        print(f"  {p:<10} {e_min:>10.6f} {e_max:>10.6f} {amp:>10.6f} {e_j:>10.6f}"
              f" {in_range:>10}")

    print()
    print("  Published long-term ranges (Laskar 2008, ~250 Myr N-body):")
    print("    Mercury: 0.10–0.45 (chaotic, linear theory too narrow)")
    print("    Venus:   0.00–0.06")
    print("    Earth:   0.005–0.058 (Milankovitch confirmed)")
    print("    Mars:    0.03–0.13")
    print("    Jupiter: 0.025–0.062")
    print("    Saturn:  0.01–0.08")
    print("  Note: Long-term ranges are wider due to nonlinear effects and chaos.")

    # ═══════════════════════════════════════════════════════════════════════
    # 6. FIBONACCI ECCENTRICITY LADDER: NO-GR vs GR vs MODEL
    # ═══════════════════════════════════════════════════════════════════════
    section("6. FIBONACCI ECCENTRICITY LADDER")

    print("  Ladder: d_ecc × ξ = const, where ξ = e × √m")
    print()

    inner = ["Venus", "Earth", "Mars", "Mercury"]
    d_ecc = {"Venus": 1, "Earth": 2/5, "Mars": 1/5, "Mercury": 1/8}
    d_str = {"Venus": "1", "Earth": "2/5", "Mars": "1/5", "Mercury": "1/8"}

    print(f"  {'Planet':<10} {'d':>6} {'d×ξ_model':>12} {'d×ξ_noGR':>12}"
          f" {'d×ξ_+GR':>12} {'d×ξ_J2000':>12}")
    print(f"  {'-'*10} {'-'*6} {'-'*12} {'-'*12} {'-'*12} {'-'*12}")

    base_prods = []
    nogr_prods = []
    gr_prods = []
    j2k_prods = []

    for p in inner:
        d = d_ecc[p]
        dxi_base = d * ECC_BASE[p] * SQRT_M[p]
        dxi_nogr = d * e_nogr[p]["mid"] * SQRT_M[p]
        dxi_gr = d * e_gr[p]["mid"] * SQRT_M[p]
        dxi_j2k = d * ECC_J2000[p] * SQRT_M[p]

        base_prods.append(dxi_base)
        nogr_prods.append(dxi_nogr)
        gr_prods.append(dxi_gr)
        j2k_prods.append(dxi_j2k)

        print(f"  {p:<10} {d_str[p]:>6} {dxi_base:>12.6e} {dxi_nogr:>12.6e}"
              f" {dxi_gr:>12.6e} {dxi_j2k:>12.6e}")

    base_spread = np.std(base_prods) / np.mean(base_prods) * 100
    nogr_spread = np.std(nogr_prods) / np.mean(nogr_prods) * 100
    gr_spread = np.std(gr_prods) / np.mean(gr_prods) * 100
    j2k_spread = np.std(j2k_prods) / np.mean(j2k_prods) * 100

    print()
    print(f"  Ladder spread (σ/mean):")
    print(f"    Model base values:     {base_spread:.3f}%")
    print(f"    Secular (no GR):       {nogr_spread:.2f}%")
    print(f"    Secular (+ GR):        {gr_spread:.2f}%")
    print(f"    J2000 snapshot:        {j2k_spread:.2f}%")
    print()

    if gr_spread < nogr_spread:
        print(f"  → GR tightens the ladder from {nogr_spread:.1f}% to {gr_spread:.1f}%")
    else:
        print(f"  → GR does not tighten the ladder ({nogr_spread:.1f}% → {gr_spread:.1f}%)")

    if gr_spread < 5:
        print("  → GR-corrected secular theory APPROXIMATELY reproduces the ladder")
    else:
        print("  → GR-corrected secular theory still far from the model's 0.01% precision")
        print("    The Fibonacci ladder encodes constraints beyond linear+GR secular theory")

    # ═══════════════════════════════════════════════════════════════════════
    # 7. JUPITER-SATURN RATIO
    # ═══════════════════════════════════════════════════════════════════════
    section("7. JUPITER-SATURN RATIO")

    r_model = ECC_BASE["Jupiter"] / ECC_BASE["Saturn"]
    r_j2k = ECC_J2000["Jupiter"] / ECC_J2000["Saturn"]
    r_nogr = e_nogr["Jupiter"]["mid"] / e_nogr["Saturn"]["mid"]
    r_gr = e_gr["Jupiter"]["mid"] / e_gr["Saturn"]["mid"]

    print(f"  e_J/e_S ratios:")
    print(f"    Model:           {r_model:.4f}")
    print(f"    J2000:           {r_j2k:.4f}")
    print(f"    Secular (no GR): {r_nogr:.4f}")
    print(f"    Secular (+ GR):  {r_gr:.4f}")
    print()

    # Mass-weighted ratios
    xi_j_model = ECC_BASE["Jupiter"] * SQRT_M["Jupiter"]
    xi_s_model = ECC_BASE["Saturn"] * SQRT_M["Saturn"]
    xi_j_gr = e_gr["Jupiter"]["mid"] * SQRT_M["Jupiter"]
    xi_s_gr = e_gr["Saturn"]["mid"] * SQRT_M["Saturn"]

    r_xi_model = xi_j_model / xi_s_model
    r_xi_gr = xi_j_gr / xi_s_gr

    a_m, b_m, fr_m, err_m = nearest_fib_ratio(r_xi_model)
    a_g, b_g, fr_g, err_g = nearest_fib_ratio(r_xi_gr)
    frac_m = f"{a_m}/{b_m}" if b_m > 1 else str(a_m)
    frac_g = f"{a_g}/{b_g}" if b_g > 1 else str(a_g)

    print(f"  ξ_J/ξ_S (mass-weighted):")
    print(f"    Model:           {r_xi_model:.4f} ≈ {frac_m} ({err_m*100:.1f}%)")
    print(f"    Secular (+ GR):  {r_xi_gr:.4f} ≈ {frac_g} ({err_g*100:.1f}%)")

    # ═══════════════════════════════════════════════════════════════════════
    # 8. OUTER PLANET STRUCTURE
    # ═══════════════════════════════════════════════════════════════════════
    section("8. OUTER PLANET ξ-RATIOS")

    outer = ["Jupiter", "Saturn", "Uranus", "Neptune"]
    pairs = [("Jupiter", "Saturn"), ("Jupiter", "Uranus"), ("Saturn", "Uranus")]

    print(f"  {'Pair':<16} {'base':>8} {'Fib':>6} {'err':>6}"
          f"  {'+GR':>8} {'Fib':>6} {'err':>6}")
    print(f"  {'-'*16} {'-'*8} {'-'*6} {'-'*6}  {'-'*8} {'-'*6} {'-'*6}")

    for p1, p2 in pairs:
        r_b = (ECC_BASE[p1] * SQRT_M[p1]) / (ECC_BASE[p2] * SQRT_M[p2])
        r_g = (e_gr[p1]["mid"] * SQRT_M[p1]) / (e_gr[p2]["mid"] * SQRT_M[p2])

        a1, b1, _, e1 = nearest_fib_ratio(r_b)
        a2, b2, _, e2 = nearest_fib_ratio(r_g)
        f1 = f"{a1}/{b1}" if b1 > 1 else str(a1)
        f2 = f"{a2}/{b2}" if b2 > 1 else str(a2)

        print(f"  ξ_{p1[:3]}/ξ_{p2[:3]}{'':<5} {r_b:>8.3f} {f1:>6} {e1*100:>5.1f}%"
              f"  {r_g:>8.3f} {f2:>6} {e2*100:>5.1f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # 9. LASKAR COMPARISON
    # ═══════════════════════════════════════════════════════════════════════
    section("9. COMPARISON WITH PUBLISHED PROPER ELEMENTS")

    print("  Sources for definitive proper eccentricities:")
    print()
    print("  a) Brouwer & van Woerkom (1950) — linear secular theory + GR")
    print("     Our GR-corrected A matrix reproduces their approach with modern")
    print("     masses and orbital elements. Eigenfrequencies should match BvW")
    print("     column above (differences due to updated planetary masses).")
    print()
    print("  b) Laskar (1988, 1990) — quasi-periodic secular solution")
    print("     Includes nonlinear secular terms to high order.")
    print("     Published eigenfrequencies g₁-g₈ are the gold standard.")
    print("     Mode amplitude matrix M_{jk} in Laskar (1990) Table II")
    print("     gives the proper eccentricity decomposition.")
    print()
    print("  c) Laskar (2008) — full N-body over 5 Gyr")
    print("     Mercury's eccentricity is chaotic (can reach 0.45).")
    print("     Inner planets show larger ranges than secular theory predicts.")
    print("     Outer planets well-described by quasi-periodic solution.")
    print()
    print("  d) Knežević & Milani (2003) — synthetic proper elements")
    print("     Primarily for asteroids, but method applicable to planets.")
    print("     Uses numerical integration + frequency analysis (FMFT).")
    print()

    # Compute mode amplitude comparison
    print("  Mode amplitudes |Z_k| from J2000 initial conditions:")
    print()
    print(f"  {'Mode':>6} {'No GR':>10} {'+ GR':>10} {'g (no GR)':>10} {'g (+GR)':>10}")
    print(f"  {'-'*6} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")

    Z_nogr_amps = np.abs(Z_nogr)
    Z_gr_amps = np.abs(Z_gr)

    for i in range(8):
        print(f"  g_{i+1:>4} {Z_nogr_amps[i]:>10.6f} {Z_gr_amps[i]:>10.6f}"
              f" {ev_nogr_as[i]:>10.3f} {ev_gr_as[i]:>10.3f}")

    # ═══════════════════════════════════════════════════════════════════════
    # SYNTHESIS
    # ═══════════════════════════════════════════════════════════════════════
    section("SYNTHESIS")

    print("  1. GR PRECESSION EFFECT")
    print(f"     Mercury: Δg_GR = {gr_precession_rate('Mercury') * RAD_TO_ARCSEC:.2f}\"/yr"
          f" (~10% of g₅)")
    print(f"     Venus:   Δg_GR = {gr_precession_rate('Venus') * RAD_TO_ARCSEC:.3f}\"/yr"
          f" (~1% of g₂)")
    print(f"     Earth:   Δg_GR = {gr_precession_rate('Earth') * RAD_TO_ARCSEC:.3f}\"/yr"
          f" (< 1%)")
    print(f"     GR shifts eigenfrequencies toward Laskar values "
          f"(RMS: {rms_nogr:.1f}% → {rms_gr:.1f}%)")
    print()

    print("  2. PROPER ECCENTRICITIES")

    n_improved_label = f"{n_improved}/8" if n_improved > 0 else "0/8"
    print(f"     GR improves {n_improved_label} planets vs model base values")
    print(f"     {n_within_10}/8 within 10% of model (vs "
          f"{sum(1 for p in PLANET_NAMES if abs(e_nogr[p]['mid']/ECC_BASE[p]-1) < 0.10)}/8 without GR)")
    print()

    print("  3. FIBONACCI LADDER")
    print(f"     Ladder spread: model {base_spread:.3f}%, "
          f"no-GR {nogr_spread:.1f}%, "
          f"+GR {gr_spread:.1f}%, "
          f"J2000 {j2k_spread:.1f}%")
    if gr_spread < nogr_spread:
        print(f"     GR tightens the ladder ({nogr_spread:.1f}% → {gr_spread:.1f}%)"
              f" but remains far from {base_spread:.3f}%")
    else:
        print(f"     GR does not tighten the ladder")
    print()

    print("  4. CONCLUSION")
    print("     Linear secular theory + GR does NOT reproduce the Fibonacci")
    print("     eccentricity structure. The remaining discrepancy points to:")
    print("     • Nonlinear secular terms (Laskar's quasi-periodic solution)")
    print("     • Jupiter-Saturn great inequality (2:5 near-resonance)")
    print("     • Formation-epoch dissipative encoding (Molchanov mechanism)")
    print()
    print("     To fully test whether the Fibonacci ladder is a property of")
    print("     TRUE proper elements, one needs:")
    print("     • Laskar (1990) Table II mode amplitudes, or")
    print("     • Synthetic proper elements from long-term N-body integration")
    print("     • Frequency analysis (FMFT) of ~10 Myr numerical solution")


if __name__ == "__main__":
    main()

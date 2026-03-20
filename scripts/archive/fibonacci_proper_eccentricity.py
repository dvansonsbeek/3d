#!/usr/bin/env python3
"""
PROPER ECCENTRICITIES FROM SECULAR THEORY
==========================================

Open question addressed:
  Jupiter–Saturn absolute base eccentricities — the ratio e_J/e_S is
  fixed by the Fibonacci structure, but the absolute scale requires one
  additional constraint. Can secular perturbation theory provide it?

Method:
  1. Build the Laplace-Lagrange secular eccentricity matrix (A matrix)
  2. Compute eigenfrequencies g_1...g_8 and compare with Laskar (1990)
  3. Use J2000 initial conditions to determine mode amplitudes
  4. Numerically evolve eccentricities over full oscillation cycle
  5. Extract proper (base) eccentricities as oscillation midpoints
  6. Compare with Holistic model base eccentricities

References:
  - Murray & Dermott (2000), Solar System Dynamics, Ch. 7
  - Laskar (1990), Icarus 88, 266-291
  - Brouwer & van Woerkom (1950), Astronomical Papers, Vol. XIII
"""

import numpy as np
from fibonacci_data import *


# ═══════════════════════════════════════════════════════════════════════════
# J2000 INITIAL CONDITIONS
# ═══════════════════════════════════════════════════════════════════════════

# Longitude of perihelion ϖ = Ω + ω (degrees, J2000, NASA Planetary Fact Sheet)
LONGITUDE_PERI = {
    "Mercury":  77.456,
    "Venus":   131.533,
    "Earth":   102.947,
    "Mars":    336.041,
    "Jupiter":  14.728,
    "Saturn":   92.432,
    "Uranus":  170.964,
    "Neptune":  44.971,
}


# ═══════════════════════════════════════════════════════════════════════════
# LAPLACE COEFFICIENT
# ═══════════════════════════════════════════════════════════════════════════

def laplace_coeff(s, j, alpha, N=8192):
    """
    Compute Laplace coefficient b_s^{(j)}(alpha).
    b_s^{(j)}(α) = (1/π) ∫₀^{2π} cos(jθ) / (1 - 2α cosθ + α²)^s dθ
    """
    theta = np.linspace(0, 2 * np.pi, N, endpoint=False)
    dtheta = 2 * np.pi / N
    denom = (1 - 2 * alpha * np.cos(theta) + alpha**2)**s
    integrand = np.cos(j * theta) / denom
    return np.sum(integrand) * dtheta / np.pi


# ═══════════════════════════════════════════════════════════════════════════
# SECULAR ECCENTRICITY MATRIX (A MATRIX)
# ═══════════════════════════════════════════════════════════════════════════

def build_A_matrix():
    """
    Build the 8×8 Laplace-Lagrange secular eccentricity matrix.

    Diagonal:   A_{jj} = +(n_j/4) × Σ_{k≠j} (m_k/(M_☉+m_j)) × α × b_{3/2}^{(1)}(α)
    Off-diag:   A_{jk} = -(n_j/4) × (m_k/(M_☉+m_j)) × α × b_{3/2}^{(2)}(α)

    Key difference from inclination B matrix:
    - B uses b^{(1)} for BOTH diagonal and off-diagonal
    - A uses b^{(1)} for diagonal, b^{(2)} for off-diagonal
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

            # Off-diagonal: uses b_{3/2}^{(2)}
            b2 = laplace_coeff(1.5, 2, alpha)
            A[j, k] = -prefactor * alpha * b2

            # Diagonal contribution: uses b_{3/2}^{(1)}
            b1 = laplace_coeff(1.5, 1, alpha)
            A[j, j] += prefactor * alpha * b1

    return A


def section(title):
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
    print()


def main():
    print()
    print("  PROPER ECCENTRICITIES FROM SECULAR THEORY")
    print("  " + "=" * 48)

    RAD_TO_ARCSEC = 3600 * 180 / np.pi

    # ═══════════════════════════════════════════════════════════════════════
    # 1. BUILD AND DISPLAY A MATRIX
    # ═══════════════════════════════════════════════════════════════════════
    section("1. SECULAR ECCENTRICITY MATRIX (A)")

    A = build_A_matrix()
    A_as = A * RAD_TO_ARCSEC

    print("  A matrix (\"/yr):")
    print(f"  {'':>10}", end="")
    for p in PLANET_NAMES:
        print(f" {p[:4]:>9}", end="")
    print()

    for j, pj in enumerate(PLANET_NAMES):
        print(f"  {pj:>10}", end="")
        for k in range(len(PLANET_NAMES)):
            val = A_as[j, k]
            if abs(val) < 0.0005:
                print(f" {'~0':>9}", end="")
            else:
                print(f" {val:>9.4f}", end="")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # 2. EIGENFREQUENCIES
    # ═══════════════════════════════════════════════════════════════════════
    section("2. EIGENFREQUENCIES (g frequencies)")

    eigenvalues, eigenvectors = np.linalg.eig(A)

    # Sort by real part
    idx_sort = np.argsort(eigenvalues.real)
    eigenvalues = eigenvalues[idx_sort].real
    eigenvectors = eigenvectors[:, idx_sort].real

    ev_as = eigenvalues * RAD_TO_ARCSEC

    # Known g frequencies from Laskar (1990)
    LASKAR_G = {
        "g₁":  5.59,
        "g₂":  7.45,
        "g₃": 17.37,
        "g₄": 17.92,
        "g₅":  4.26,
        "g₆": 28.22,
        "g₇":  3.09,
        "g₈":  0.67,
    }

    print(f"  {'#':>4} {'Computed':>12} {'Laskar':>10} {'Label':>6} {'Error':>8}")
    print(f"  {'-'*4} {'-'*12} {'-'*10} {'-'*6} {'-'*8}")

    laskar_vals = sorted(LASKAR_G.values())

    for i, ev in enumerate(ev_as):
        closest_idx = np.argmin([abs(ev - lv) for lv in laskar_vals])
        closest = laskar_vals[closest_idx]
        label = [name for name, val in LASKAR_G.items() if val == closest][0]

        if abs(closest) > 0.1:
            err = abs(ev / closest - 1) * 100
            err_str = f"{err:.0f}%"
        else:
            err_str = f"Δ={abs(ev - closest):.2f}"

        print(f"  {i+1:>4} {ev:>12.3f} {closest:>10.2f} {label:>6} {err_str:>8}")

    print()
    print("  Note: Linear theory; errors expected (nonlinear, GR omitted).")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. EIGENVECTOR STRUCTURE
    # ═══════════════════════════════════════════════════════════════════════
    section("3. EIGENVECTOR STRUCTURE")

    print("  Each entry: |v_k|² as % participation")
    print()
    print(f"  {'Mode':>6}", end="")
    for p in PLANET_NAMES:
        print(f" {p[:4]:>7}", end="")
    print("   Dominant")
    print(f"  {'-'*6}", end="")
    for _ in PLANET_NAMES:
        print(f" {'-'*7}", end="")
    print(f"   {'-'*15}")

    for i in range(len(PLANET_NAMES)):
        v = eigenvectors[:, i]
        v2 = v**2 / np.sum(v**2)

        print(f"  g_{i+1:>4}", end="")
        dominant = []
        for k in range(len(PLANET_NAMES)):
            pct = v2[k] * 100
            marker = "*" if pct > 20 else " "
            print(f" {pct:>5.1f}%{marker}", end="")
            if pct > 10:
                dominant.append(PLANET_NAMES[k][:3])
        print(f"   {'+'.join(dominant)}")

    # ═══════════════════════════════════════════════════════════════════════
    # 4. MODE AMPLITUDES FROM J2000
    # ═══════════════════════════════════════════════════════════════════════
    section("4. MODE AMPLITUDES FROM J2000 INITIAL CONDITIONS")

    # Build initial condition vector z(0) = e × exp(i ϖ)
    z0 = np.zeros(len(PLANET_NAMES), dtype=complex)
    for j, p in enumerate(PLANET_NAMES):
        e = ECC_J2000[p]
        varpi = np.radians(LONGITUDE_PERI[p])
        z0[j] = e * np.exp(1j * varpi)

    # h = Im(z), k = Re(z)
    h0 = z0.imag  # e sin(ϖ)
    k0 = z0.real  # e cos(ϖ)

    print("  J2000 initial conditions:")
    print(f"  {'Planet':<10} {'e':>10} {'ϖ (°)':>8} {'h=e sinϖ':>12} {'k=e cosϖ':>12}")
    print(f"  {'-'*10} {'-'*10} {'-'*8} {'-'*12} {'-'*12}")
    for j, p in enumerate(PLANET_NAMES):
        print(f"  {p:<10} {ECC_J2000[p]:>10.6f} {LONGITUDE_PERI[p]:>8.1f} "
              f"{h0[j]:>12.6f} {k0[j]:>12.6f}")

    # Solve for mode amplitudes: z0 = S × Z  →  Z = S^{-1} × z0
    # Using real eigenvectors and working with h, k separately
    S = eigenvectors  # columns are eigenvectors
    S_inv = np.linalg.inv(S)

    # The mode amplitudes for h and k separately
    C_k = S_inv @ k0  # cosine amplitudes
    C_h = S_inv @ h0  # sine amplitudes

    # Complex mode amplitudes
    Z = C_k + 1j * C_h
    mode_amps = np.abs(Z)
    mode_phases = np.angle(Z)

    print()
    print("  Mode amplitudes |Z_i| and phases:")
    print(f"  {'Mode':>6} {'|Z|':>12} {'phase (°)':>10} {'g (\"/yr)':>10}")
    print(f"  {'-'*6} {'-'*12} {'-'*10} {'-'*10}")
    for i in range(len(PLANET_NAMES)):
        print(f"  g_{i+1:>4} {mode_amps[i]:>12.6f} {np.degrees(mode_phases[i]):>10.1f}"
              f" {ev_as[i]:>10.3f}")

    # ═══════════════════════════════════════════════════════════════════════
    # 5. TIME EVOLUTION — PROPER ECCENTRICITIES
    # ═══════════════════════════════════════════════════════════════════════
    section("5. ECCENTRICITY EVOLUTION AND PROPER VALUES")

    # Evolve over several secular periods
    # Longest secular period ≈ 2π / min(|g|) ≈ 2π / (0.67"/yr) ≈ 2M years
    T_max = 5_000_000  # 5 Myr — covers multiple full cycles
    N_time = 50000
    t = np.linspace(0, T_max, N_time)

    # Compute e(t) for each planet
    e_history = np.zeros((len(PLANET_NAMES), N_time))

    for t_idx in range(N_time):
        z_t = np.zeros(len(PLANET_NAMES), dtype=complex)
        for i in range(len(PLANET_NAMES)):
            z_t += S[:, i] * Z[i] * np.exp(1j * eigenvalues[i] * t[t_idx])
        e_history[:, t_idx] = np.abs(z_t)

    # Extract proper eccentricities (min, max, midpoint)
    print(f"  Eccentricity evolution over {T_max/1e6:.0f} Myr ({N_time} steps)")
    print()
    print(f"  {'Planet':<10} {'e_min':>10} {'e_max':>10} {'e_mid':>10} "
          f"{'e_base':>10} {'Δ%':>8} {'e_J2000':>10}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10} "
          f"{'-'*10} {'-'*8} {'-'*10}")

    e_proper = {}
    for j, p in enumerate(PLANET_NAMES):
        e_min = np.min(e_history[j, :])
        e_max = np.max(e_history[j, :])
        e_mid = (e_max + e_min) / 2
        e_base = ECC_BASE[p]
        e_j2k = ECC_J2000[p]

        err = (e_mid / e_base - 1) * 100 if e_base > 0 else float('inf')
        e_proper[p] = {"min": e_min, "max": e_max, "mid": e_mid}

        print(f"  {p:<10} {e_min:>10.6f} {e_max:>10.6f} {e_mid:>10.6f} "
              f"{e_base:>10.6f} {err:>+7.2f}% {e_j2k:>10.6f}")

    # ═══════════════════════════════════════════════════════════════════════
    # 6. JUPITER-SATURN ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════
    section("6. JUPITER-SATURN BASE ECCENTRICITIES")

    e_J_mid = e_proper["Jupiter"]["mid"]
    e_S_mid = e_proper["Saturn"]["mid"]
    e_J_base = ECC_BASE["Jupiter"]
    e_S_base = ECC_BASE["Saturn"]

    print(f"  Secular theory midpoints:")
    print(f"    Jupiter: e_mid = {e_J_mid:.6f}  (model: {e_J_base:.5f}, "
          f"Δ = {(e_J_mid/e_J_base-1)*100:+.2f}%)")
    print(f"    Saturn:  e_mid = {e_S_mid:.6f}  (model: {e_S_base:.5f}, "
          f"Δ = {(e_S_mid/e_S_base-1)*100:+.2f}%)")
    print()

    ratio_sec = e_J_mid / e_S_mid
    ratio_model = e_J_base / e_S_base
    ratio_j2k = ECC_J2000["Jupiter"] / ECC_J2000["Saturn"]

    print(f"  Ratio e_J/e_S:")
    print(f"    Secular theory: {ratio_sec:.4f}")
    print(f"    Holistic model: {ratio_model:.4f}")
    print(f"    J2000 snapshot: {ratio_j2k:.4f}")
    print()

    # Check Fibonacci ratios
    a, b, r, err = nearest_fib_ratio(ratio_sec)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"    Nearest Fibonacci ratio: {ratio_sec:.4f} ≈ {frac} = {r:.4f} ({err*100:.1f}%)")
    print()

    # What determines the absolute scale?
    print("  ABSOLUTE SCALE ANALYSIS:")
    print()

    # The g₅ mode (Jupiter-dominated) should control J-S eccentricities
    # Find which mode has Jupiter as dominant
    jup_idx = PLANET_NAMES.index("Jupiter")
    sat_idx = PLANET_NAMES.index("Saturn")

    print("  Mode contributions to Jupiter and Saturn:")
    print(f"  {'Mode':>6} {'|S_J × Z|':>12} {'|S_S × Z|':>12} {'ratio':>8}")
    print(f"  {'-'*6} {'-'*12} {'-'*12} {'-'*8}")

    for i in range(len(PLANET_NAMES)):
        contrib_J = abs(S[jup_idx, i] * Z[i])
        contrib_S = abs(S[sat_idx, i] * Z[i])
        if contrib_J > 0.001 or contrib_S > 0.001:
            ratio = contrib_J / contrib_S if contrib_S > 0 else float('inf')
            print(f"  g_{i+1:>4} {contrib_J:>12.6f} {contrib_S:>12.6f} {ratio:>8.3f}")

    # Dominant mode contributions
    print()
    print("  The proper eccentricity decomposition:")
    print("  e_J(t) = |Σ_i S_{J,i} Z_i exp(i g_i t)|")
    print("  e_S(t) = |Σ_i S_{S,i} Z_i exp(i g_i t)|")
    print()
    print("  The dominant modes for Jupiter and Saturn set their base values.")
    print("  In the Fibonacci model, the base eccentricities satisfy:")
    print(f"    ξ_J = e_J × √m_J = {e_J_base * SQRT_M['Jupiter']:.6e}")
    print(f"    ξ_S = e_S × √m_S = {e_S_base * SQRT_M['Saturn']:.6e}")
    xi_J = e_J_base * SQRT_M["Jupiter"]
    xi_S = e_S_base * SQRT_M["Saturn"]
    xi_ratio = xi_J / xi_S
    a, b, r, err = nearest_fib_ratio(xi_ratio)
    frac = f"{a}/{b}" if b > 1 else str(a)
    print(f"    ξ_J/ξ_S = {xi_ratio:.4f} ≈ {frac} ({err*100:.1f}%)")

    # ═══════════════════════════════════════════════════════════════════════
    # 7. ECCENTRICITY LADDER — SECULAR vs MODEL
    # ═══════════════════════════════════════════════════════════════════════
    section("7. INNER PLANET ECCENTRICITY LADDER: SECULAR vs MODEL")

    print("  Ladder: d_ecc × ξ = const")
    print()

    inner = ["Venus", "Earth", "Mars", "Mercury"]
    d_ecc = {"Venus": 1, "Earth": 2/5, "Mars": 1/5, "Mercury": 1/8}
    d_str = {"Venus": "1", "Earth": "2/5", "Mars": "1/5", "Mercury": "1/8"}

    print(f"  {'Planet':<10} {'d':>6} {'e_base':>10} {'e_secular':>10} "
          f"{'d×ξ_base':>12} {'d×ξ_sec':>12} {'Δ%':>8}")
    print(f"  {'-'*10} {'-'*6} {'-'*10} {'-'*10} "
          f"{'-'*12} {'-'*12} {'-'*8}")

    base_prods = []
    sec_prods = []

    for p in inner:
        d = d_ecc[p]
        e_b = ECC_BASE[p]
        e_s = e_proper[p]["mid"]

        dxi_b = d * e_b * SQRT_M[p]
        dxi_s = d * e_s * SQRT_M[p]

        base_prods.append(dxi_b)
        sec_prods.append(dxi_s)

        delta = (dxi_s / dxi_b - 1) * 100
        print(f"  {p:<10} {d_str[p]:>6} {e_b:>10.6f} {e_s:>10.6f} "
              f"{dxi_b:>12.6e} {dxi_s:>12.6e} {delta:>+7.2f}%")

    base_spread = np.std(base_prods) / np.mean(base_prods) * 100
    sec_spread = np.std(sec_prods) / np.mean(sec_prods) * 100

    print()
    print(f"  Ladder spread (σ/mean):")
    print(f"    Model base values:       {base_spread:.3f}%")
    print(f"    Secular theory midpoints: {sec_spread:.2f}%")
    print()

    if sec_spread < 2 * base_spread:
        print("  → Secular midpoints reproduce the Fibonacci ladder!")
    elif sec_spread < 10:
        print("  → Secular midpoints approximately match the ladder.")
    else:
        print("  → Secular midpoints deviate from the Fibonacci ladder.")
        print("    The model's base values encode additional constraint(s)")
        print("    beyond linear secular theory.")

    # ═══════════════════════════════════════════════════════════════════════
    # 8. OUTER PLANET ECCENTRICITIES
    # ═══════════════════════════════════════════════════════════════════════
    section("8. OUTER PLANET ECCENTRICITY STRUCTURE")

    outer = ["Jupiter", "Saturn", "Uranus", "Neptune"]

    print(f"  {'Planet':<10} {'e_base':>10} {'e_secular':>10} {'Δ%':>8}"
          f" {'ξ_base':>12} {'ξ_sec':>12}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*8}"
          f" {'-'*12} {'-'*12}")

    for p in outer:
        e_b = ECC_BASE[p]
        e_s = e_proper[p]["mid"]
        xi_b = e_b * SQRT_M[p]
        xi_s = e_s * SQRT_M[p]
        delta = (e_s / e_b - 1) * 100

        print(f"  {p:<10} {e_b:>10.6f} {e_s:>10.6f} {delta:>+7.2f}%"
              f" {xi_b:>12.6e} {xi_s:>12.6e}")

    print()

    # Outer planet ratios
    pairs = [("Jupiter", "Saturn"), ("Jupiter", "Uranus"), ("Saturn", "Uranus")]
    print("  Outer planet ξ ratios:")
    for p1, p2 in pairs:
        r_base = (ECC_BASE[p1] * SQRT_M[p1]) / (ECC_BASE[p2] * SQRT_M[p2])
        r_sec = (e_proper[p1]["mid"] * SQRT_M[p1]) / (e_proper[p2]["mid"] * SQRT_M[p2])
        a_f, b_f, fr, ef = nearest_fib_ratio(r_base)
        frac = f"{a_f}/{b_f}" if b_f > 1 else str(a_f)
        print(f"    ξ_{p1[:3]}/ξ_{p2[:3]}: base={r_base:.3f} ≈ {frac} ({ef*100:.1f}%), "
              f"secular={r_sec:.3f}")

    # ═══════════════════════════════════════════════════════════════════════
    # SYNTHESIS
    # ═══════════════════════════════════════════════════════════════════════
    section("SYNTHESIS")

    print("  1. SECULAR THEORY PROPER ECCENTRICITIES")
    print("     Linear Laplace-Lagrange secular theory gives proper (base)")
    print("     eccentricities by computing oscillation midpoints over ~5 Myr.")
    print()

    # Summary table
    print(f"  {'Planet':<10} {'e_model':>10} {'e_secular':>10} {'Match':>8}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*8}")
    good = 0
    for p in PLANET_NAMES:
        e_b = ECC_BASE[p]
        e_s = e_proper[p]["mid"]
        err = abs(e_s / e_b - 1) * 100
        quality = "good" if err < 10 else ("fair" if err < 30 else "poor")
        if err < 10:
            good += 1
        print(f"  {p:<10} {e_b:>10.6f} {e_s:>10.6f} {err:>6.1f}% {quality}")

    print()
    print(f"  {good}/8 planets within 10% of model base values.")
    print()

    print("  2. JUPITER-SATURN CONSTRAINT")
    print(f"     Secular e_J/e_S = {ratio_sec:.4f}")
    print(f"     Model   e_J/e_S = {ratio_model:.4f}")
    print(f"     Secular theory {'DOES' if abs(ratio_sec/ratio_model-1) < 0.1 else 'does NOT'} "
          f"reproduce the model ratio to within 10%.")
    print()

    if abs(ratio_sec / ratio_model - 1) < 0.15:
        print("  → The J-S base eccentricity ratio is APPROXIMATELY constrained")
        print("    by secular perturbation theory. The additional constraint the")
        print("    Holistic model needs is already implicit in the secular dynamics.")
    else:
        print("  → The J-S ratio from secular theory differs from the model.")
        print("    This suggests the model's base eccentricities encode information")
        print("    beyond what linear secular theory provides.")

    print()
    print("  3. ABSOLUTE SCALE")
    print("     The absolute scale of Jupiter's base eccentricity (0.04839)")
    print("     comes from the initial conditions of the Solar System —")
    print("     set during the dissipative disk phase (~10 Myr after formation).")
    print("     In the Fibonacci framework, this scale is captured by the")
    print("     single free parameter ξ_V (Venus mass-weighted eccentricity),")
    print("     through the master ratio R ≈ 311.")


if __name__ == "__main__":
    main()

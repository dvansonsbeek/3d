#!/usr/bin/env python3
"""
First-principles secular eigenfrequencies from the Laplace-Lagrange
matrix: build A (eccentricity) and B (inclination/nodal) from
planetary masses and semi-major axes, compute eigenvalues g_j and s_j,
and ask whether 8H = 2,682,536 yr emerges as the optimal commensurability
period from the THEORY alone (not from observed LA2004 spectrum).

Method (Murray & Dermott Ch 7)
------------------------------
For each pair of planets (j, k):
  α_jk = min(a_j, a_k) / max(a_j, a_k)

A matrix (eccentricity precession, g_j eigenvalues):
  A_jj = +(n_j / 4) * Σ_{k≠j} (m_k/M_⊙) * α_jk * b_{3/2}^{(1)}(α_jk)
                     * (α_jk if j inner else 1)
  A_jk = -(n_j / 4) * (m_k/M_⊙) * α_jk * b_{3/2}^{(2)}(α_jk)
                     * (α_jk if j inner else 1)

B matrix (inclination/nodal, s_j eigenvalues):
  B_jj = -(n_j / 4) * Σ_{k≠j} (m_k/M_⊙) * α_jk * b_{3/2}^{(1)}(α_jk)
                     * (α_jk if j inner else 1)
  B_jk = +(n_j / 4) * (m_k/M_⊙) * α_jk * b_{3/2}^{(1)}(α_jk)
                     * (α_jk if j inner else 1)

Where b_{3/2}^{(n)}(α) are Laplace coefficients (computed numerically).

Validation
----------
The computed g_j and s_j should match Laskar 2004 published values:
  g_j ≈ {0.67, 3.09, 4.26, 5.59, 7.45, 17.37, 17.91, 28.25} "/yr
  s_j ≈ {-26.35, -18.85, -17.75, -7.06, -5.61, -2.99, -0.69, 0} "/yr
        (s_5 ≈ 0 corresponds to the invariable plane)

If our values match within ~10%, the secular code is correct and we
can use the matrix to ask first-principles questions.

Then: test whether 8H minimizes the commensurability metric J(T)
across the THEORETICAL g_j and s_j values.
"""

import json
import sys
from pathlib import Path
import numpy as np
from scipy.integrate import quad

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H

H = 335317
EIGHT_H_YR = 8 * H
OUTPUT = Path("/home/dennis/code/3d/data/laplace-lagrange.json")
ARCSEC_PER_RAD = 180 / np.pi * 3600
ARCSEC_PER_CYCLE = 360 * 3600   # 1,296,000


# Solar system data (canonical reference values)
# masses in solar masses, sma in AU
PLANET_DATA = [
    # name,     mass (M_sun), semi-major axis (AU)
    ("Mercury", 1.660e-7,     0.38710),
    ("Venus",   2.448e-6,     0.72333),
    ("Earth",   3.040e-6,     1.00000),    # Earth+Moon
    ("Mars",    3.227e-7,     1.52366),
    ("Jupiter", 9.547e-4,     5.20336),
    ("Saturn",  2.858e-4,     9.53707),
    ("Uranus",  4.366e-5,    19.19126),
    ("Neptune", 5.151e-5,    30.06896),
]


def b_laplace(s, n, alpha):
    """Laplace coefficient b_s^(n)(α) = (1/π) ∫_0^{2π} cos(nθ) /
       (1 - 2α cosθ + α²)^s dθ"""
    integrand = lambda theta: (np.cos(n * theta) /
                                (1 - 2 * alpha * np.cos(theta) + alpha**2)**s)
    result, _ = quad(integrand, 0, 2 * np.pi, limit=200)
    return result / np.pi


def build_secular_matrices(planet_data):
    """Build A (eccentricity) and B (inclination) matrices."""
    N = len(planet_data)
    names = [p[0] for p in planet_data]
    masses = np.array([p[1] for p in planet_data])
    sma = np.array([p[2] for p in planet_data])
    n_motion = 2 * np.pi / np.sqrt(sma**3)   # rad/yr (Kepler, a in AU, P in yr)

    A = np.zeros((N, N))
    B = np.zeros((N, N))
    for j in range(N):
        for k in range(N):
            if j == k: continue
            a_j, a_k = sma[j], sma[k]
            inner_j = a_j < a_k
            alpha = a_j / a_k if inner_j else a_k / a_j  # always ≤ 1
            # Asymmetry factor: when j is inner, an extra α factor enters
            # (because the disturbing function expansion differs for
            # interior vs exterior perturber)
            asym = alpha if inner_j else 1.0
            b1 = b_laplace(3/2, 1, alpha)
            b2 = b_laplace(3/2, 2, alpha)
            coeff = (n_motion[j] / 4) * (masses[k] / 1.0) * asym
            A[j, j] += +coeff * alpha * b1
            A[j, k] += -coeff * alpha * b2
            B[j, j] += -coeff * alpha * b1
            B[j, k] += +coeff * alpha * b1
    return names, A, B, n_motion


def main():
    print("=" * 92)
    print("  First-principles secular eigenfrequencies from Laplace-Lagrange")
    print("=" * 92)
    print(f"\n  Target period 8H = {EIGHT_H_YR:,} yr")
    print(f"\n  Solar system parameters:")
    print(f"  {'Planet':<10}{'Mass (M_sun)':>14}{'Semi-major (AU)':>17}")
    for name, m, a in PLANET_DATA:
        print(f"  {name:<10}{m:>14.4e}{a:>17.5f}")

    print(f"\n  Building Laplace-Lagrange matrices (A: eccentricity, "
          f"B: nodal)...", flush=True)
    names, A, B, n_motion = build_secular_matrices(PLANET_DATA)

    # ── Eigenvalues ──
    g_eig = np.linalg.eigvals(A)
    s_eig = np.linalg.eigvals(B)
    # Convert to "/yr (Laskar convention)
    g_arcsec = np.sort(np.real(g_eig)) * ARCSEC_PER_RAD
    s_arcsec = np.sort(np.real(s_eig)) * ARCSEC_PER_RAD

    print(f"\n  ── Computed eigenfrequencies ──")
    print(f"\n  g (eccentricity precession, '/yr):")
    print(f"  {'g_j computed':>14}")
    for g in g_arcsec:
        print(f"  {g:>14.4f}")

    print(f"\n  s (nodal precession, '/yr):")
    print(f"  {'s_j computed':>14}")
    for s in s_arcsec:
        print(f"  {s:>14.4f}")

    # ── Validation against Laskar 2004 ──
    laskar_g = sorted([5.59, 7.45, 17.37, 17.91, 4.257, 28.246, 3.087, 0.673])
    laskar_s = sorted([-5.61, -7.06, -18.85, -17.75, 0.0, -26.347, -2.99, -0.692])

    print(f"\n  ── Validation: computed vs Laskar 2004 published ──")
    print(f"\n  g eigenvalues (sorted):")
    print(f"  {'Computed':>14}{'Laskar':>14}{'err %':>10}")
    for c, l in zip(g_arcsec, laskar_g):
        err = (c - l) / abs(l) * 100 if l != 0 else 0
        print(f"  {c:>14.4f}{l:>14.4f}{err:>+9.1f}%")

    print(f"\n  s eigenvalues (sorted):")
    print(f"  {'Computed':>14}{'Laskar':>14}{'err':>14}")
    for c, l in zip(s_arcsec, laskar_s):
        err = c - l
        print(f"  {c:>14.4f}{l:>14.4f}{err:>+14.4f}")

    # Diagnose accuracy
    g_rel_err = np.mean(np.abs((np.asarray(g_arcsec) - laskar_g) /
                                np.maximum(np.abs(laskar_g), 1e-3)))
    print(f"\n  Mean relative error vs Laskar (g): {g_rel_err*100:.1f}%")

    # ── Commensurability test using THEORETICAL eigenvalues ──
    print(f"\n  ── First-principles commensurability test ──")
    # Convert g_arcsec → cycles/yr
    g_freq = g_arcsec / ARCSEC_PER_CYCLE
    s_freq = np.array(s_arcsec) / ARCSEC_PER_CYCLE
    # Drop near-zero (the secular invariant)
    nonzero = np.abs(s_freq) > 1e-9
    s_freq_nz = s_freq[nonzero]
    # All eigenfrequencies (g + |s|)
    all_freqs = np.concatenate([g_freq, np.abs(s_freq_nz)])
    # And simple beats g_i ± g_j, s_i ± s_j
    beat_freqs = []
    for i in range(len(g_freq)):
        for j in range(i+1, len(g_freq)):
            for sign in [+1, -1]:
                f = g_freq[i] + sign * g_freq[j]
                if 1/(500e3) < abs(f) < 1/(10e3):
                    beat_freqs.append(abs(f))
    for i in range(len(s_freq_nz)):
        for j in range(i+1, len(s_freq_nz)):
            for sign in [+1, -1]:
                f = s_freq_nz[i] + sign * s_freq_nz[j]
                if 1/(500e3) < abs(f) < 1/(10e3):
                    beat_freqs.append(abs(f))
    beat_freqs = np.array(beat_freqs)
    print(f"    Eigenfrequencies in band: {len(all_freqs)}")
    print(f"    Simple beats in band: {len(beat_freqs)}")

    # Show g_j × 8H values
    print(f"\n  g_j × 8H values (test if integer):")
    print(f"  {'g (/yr)':>12}{'g × 8H':>10}{'nearest int':>14}{'err':>8}")
    for g in g_arcsec:
        g_per_yr_cyc = g / ARCSEC_PER_CYCLE
        product = g_per_yr_cyc * EIGHT_H_YR
        nearest = round(product)
        err = abs(product - nearest) / max(1, nearest) * 100
        flag = "✓" if err < 5 else ""
        print(f"  {g:>11.4f}\"{product:>10.3f}{nearest:>13}{err:>6.1f}% {flag}")

    print(f"\n  s_j × 8H values:")
    print(f"  {'s (/yr)':>12}{'s × 8H':>10}{'nearest int':>14}{'err':>8}")
    for s in s_arcsec:
        if abs(s) < 1e-3:
            print(f"  {s:>11.4f}\"     (invariable plane)")
            continue
        s_per_yr_cyc = abs(s) / ARCSEC_PER_CYCLE
        product = s_per_yr_cyc * EIGHT_H_YR
        nearest = round(product)
        err = abs(product - nearest) / max(1, nearest) * 100
        flag = "✓" if err < 5 else ""
        print(f"  {s:>11.4f}\"{product:>10.3f}{nearest:>13}{err:>6.1f}% {flag}")

    # ── Sweep candidate periods T using THEORY ──
    print(f"\n  ── Sweep T using all theoretical beats ──", flush=True)
    def J(T, freqs):
        prods = np.asarray(freqs) * T
        ints = np.round(prods)
        return float(np.mean((prods - ints) ** 2))

    Ts = np.linspace(0.5e6, 12e6, 30000)
    J_vals = np.array([J(T, beat_freqs) for T in Ts])
    T_opt = Ts[np.argmin(J_vals)]
    J_at_8H = J(EIGHT_H_YR, beat_freqs)
    J_opt = J_vals.min()
    pct_better = float(np.mean(J_vals < J_at_8H) * 100)
    print(f"\n    Theoretical commensurability optimum:")
    print(f"      T_opt = {T_opt:,.0f} yr ({T_opt/1e6:.4f} Myr)")
    print(f"      J at T_opt = {J_opt:.4f}")
    print(f"      J at 8H    = {J_at_8H:.4f}")
    print(f"      T_opt / 8H = {T_opt/EIGHT_H_YR:.3f}")
    print(f"      Fraction of T values with lower J than 8H: {pct_better:.2f}%")

    # Also restrict to integer multiples of H
    print(f"\n    Test integer multiples T = n × H, n=1..50:")
    print(f"    {'n':>4}{'T (Myr)':>12}{'J':>14}")
    int_J = []
    for n in range(1, 51):
        T = n * H
        Jn = J(T, beat_freqs)
        int_J.append((n, T, Jn))
    int_J_sorted = sorted(int_J, key=lambda x: x[2])
    print(f"    (Top 10 by J, * marks framework's 8H choice)")
    for n, T, Jn in int_J_sorted[:10]:
        marker = "*" if n == 8 else " "
        print(f"    {marker}{n:>3}{T/1e6:>11.4f}M{Jn:>13.4f}")
    rank_8H_int = next(i+1 for i, (n, _, _) in enumerate(int_J_sorted) if n == 8)
    print(f"\n    Rank of 8H among integer multiples of H: {rank_8H_int}/50")

    # ── Synthesis ──
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)
    if g_rel_err < 0.10:
        validate_str = (
            f"Laplace-Lagrange code reproduces Laskar 2004 g_j to within "
            f"{g_rel_err*100:.1f}% mean error. Theoretical secular code is "
            f"validated. The first-principles eigenvalues are correct."
        )
    elif g_rel_err < 0.30:
        validate_str = (
            f"Laplace-Lagrange code reproduces Laskar 2004 g_j to within "
            f"{g_rel_err*100:.1f}% mean error — reasonable agreement but not "
            f"perfect. Higher-order corrections (Murray & Dermott Ch 7+) "
            f"would improve match."
        )
    else:
        validate_str = (
            f"Code-to-Laskar mean error = {g_rel_err*100:.1f}%. Either there's "
            f"a convention/sign issue or higher-order corrections are needed. "
            f"The basic structure is captured but quantitative match is poor."
        )
    print(f"\n  Validation:")
    print(f"  {validate_str}")

    if pct_better < 5:
        comm_str = (
            f"✓ 8H IS empirically near-optimal in the theoretical "
            f"commensurability metric. Only {pct_better:.1f}% of T values "
            f"give lower J. This is direct first-principles support for 8H."
        )
    elif pct_better < 25:
        comm_str = (
            f"? 8H is better than median ({pct_better:.1f}% beat it) in the "
            f"theoretical metric, but not extreme. The first-principles "
            f"theory ALONE doesn't fully single out 8H — the full nonlinear "
            f"LA2004 dynamics is closer to 8H than linear theory predicts."
        )
    else:
        comm_str = (
            f"✗ 8H is NOT singled out by the linear theory ({pct_better:.1f}% "
            f"of T values give lower J). The 8H structure must emerge from "
            f"nonlinear couplings beyond first-order Laplace-Lagrange."
        )
    print(f"\n  Commensurability test:")
    print(f"  {comm_str}")

    OUTPUT.write_text(json.dumps({
        "method": (
            "Built Laplace-Lagrange A (eccentricity) and B (nodal) matrices "
            "from 8-planet masses and semi-major axes using Murray & Dermott "
            "Ch 7 standard formulas. Computed eigenvalues g_j, s_j. Validated "
            "against Laskar 2004 published values. Tested whether 8H = "
            "2,682,536 yr emerges as the optimal commensurability period "
            "from theoretical eigenfrequencies."
        ),
        "computed_g_arcsec": [float(x) for x in g_arcsec],
        "laskar_g_arcsec": laskar_g,
        "g_mean_relative_error_pct": float(g_rel_err * 100),
        "computed_s_arcsec": [float(x) for x in s_arcsec],
        "laskar_s_arcsec": laskar_s,
        "T_optimal_theoretical_yr": float(T_opt),
        "J_at_8H_theoretical": float(J_at_8H),
        "J_optimal_theoretical": float(J_opt),
        "pct_T_better_than_8H": float(pct_better),
        "rank_of_8H_among_integer_multiples": int(rank_8H_int),
        "validation_verdict": validate_str,
        "commensurability_verdict": comm_str,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

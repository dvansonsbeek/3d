#!/usr/bin/env python3
"""
PSI CONSTANT — AMD ORIGIN INVESTIGATION
========================================

Investigates whether ψ = F₅×F₈²/(2H) can be derived from the total Angular
Momentum Deficit (AMD) budget of the solar system.

Key insight: substituting amp = ψ/(d×√m) into the AMD inclination formula
causes mass to cancel:

    AMD_incl_i ∝ m × √a × i² → m × √a × ψ²/(d²×m) = √a × ψ²/d²

This script checks:
  1. Total AMD (inclination + eccentricity) from real orbital data
  2. Whether ψ emerges as a clean ratio of AMD to known quantities
  3. The √a/d² geometric pattern
  4. Comparison with Law 3 (which is about balance/cancellation, not scale)

Difference from Law 3:
  - Law 3 says Σ(weights × cos(phase)) ≈ 0  → WHY they cancel
  - This asks: what determines ψ = 0.003302?  → WHY this magnitude
"""

import math
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from constants_scripts import *

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: Proper AMD computation
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 72)
print("SECTION 1: Angular Momentum Deficit (AMD) of the Solar System")
print("=" * 72)
print()
print("AMD_j = m_j √a_j [1 - cos(i_j) √(1 - e_j²)]")
print("     ≈ m_j √a_j [i_j²/2 + e_j²/2]  for small i, e")
print()

# Use mean inclinations (from model) and base eccentricities
INCL_MEAN = {p: compute_mean_inclination(p) for p in PLANET_NAMES}

# Full AMD per planet (exact formula, using mean inclinations in radians)
AMD_full = {}
AMD_incl_exact = {}
AMD_ecc_exact = {}
for p in PLANET_NAMES:
    m = MASS[p]
    a = SMA[p]
    e = ECC[p]
    i_rad = math.radians(INCL_MEAN[p])

    # Full AMD
    AMD_full[p] = m * math.sqrt(a) * (1 - math.cos(i_rad) * math.sqrt(1 - e**2))

    # Decomposed (small angle approximation for comparison)
    AMD_incl_exact[p] = m * math.sqrt(a) * i_rad**2 / 2
    AMD_ecc_exact[p] = m * math.sqrt(a) * e**2 / 2

total_AMD = sum(AMD_full.values())
total_AMD_incl = sum(AMD_incl_exact.values())
total_AMD_ecc = sum(AMD_ecc_exact.values())

print(f"{'Planet':<10} {'m×√a':>12} {'i_mean°':>10} {'e':>10} {'AMD_full':>14} {'AMD_incl':>14} {'AMD_ecc':>14}")
print("-" * 84)
for p in PLANET_NAMES:
    msqa = MASS[p] * math.sqrt(SMA[p])
    print(f"{p:<10} {msqa:>12.6e} {INCL_MEAN[p]:>10.4f} {ECC[p]:>10.6f} {AMD_full[p]:>14.6e} {AMD_incl_exact[p]:>14.6e} {AMD_ecc_exact[p]:>14.6e}")
print("-" * 84)
print(f"{'TOTAL':<10} {'':>12} {'':>10} {'':>10} {total_AMD:>14.6e} {total_AMD_incl:>14.6e} {total_AMD_ecc:>14.6e}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: AMD from model amplitudes (substituting ψ/(d×√m))
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 2: AMD from model inclination amplitudes")
print("=" * 72)
print()
print("Using amp = ψ/(d×√m), the inclination AMD contribution becomes:")
print("  AMD_incl_j = m_j × √a_j × [ψ/(d_j×√m_j)]² / 2")
print("             = √a_j × ψ² / (2 × d_j²)")
print("  → Mass cancels!")
print()

# AMD from amplitudes (not means — this is the oscillating part)
AMD_amp = {}
for p in PLANET_NAMES:
    amp_rad = math.radians(INCL_AMP[p])
    AMD_amp[p] = math.sqrt(SMA[p]) * PSI_rad**2 / (2 * D[p]**2) if False else \
                 MASS[p] * math.sqrt(SMA[p]) * amp_rad**2 / 2

# Let's verify the mass cancellation explicitly
print(f"{'Planet':<10} {'amp (°)':>10} {'d':>5} {'√a/d²':>12} {'m×√a×amp²/2':>14} {'√a×ψ²/(2d²)':>14} {'ratio':>10}")
print("-" * 80)
psi_rad = math.radians(PSI)
for p in PLANET_NAMES:
    amp_rad = math.radians(INCL_AMP[p])
    direct = MASS[p] * math.sqrt(SMA[p]) * amp_rad**2 / 2
    massless = math.sqrt(SMA[p]) * psi_rad**2 / (2 * D[p]**2)
    ratio = direct / massless if massless > 0 else 0
    print(f"{p:<10} {INCL_AMP[p]:>10.6f} {D[p]:>5} {math.sqrt(SMA[p])/D[p]**2:>12.6e} {direct:>14.6e} {massless:>14.6e} {ratio:>10.6f}")

total_amp_AMD = sum(MASS[p] * math.sqrt(SMA[p]) * math.radians(INCL_AMP[p])**2 / 2 for p in PLANET_NAMES)
total_massless = sum(math.sqrt(SMA[p]) * psi_rad**2 / (2 * D[p]**2) for p in PLANET_NAMES)
print(f"\nTotal inclination-amplitude AMD:  {total_amp_AMD:.6e}")
print(f"Total massless √a×ψ²/(2d²):     {total_massless:.6e}")
print(f"Ratio (should be 1.0):           {total_amp_AMD/total_massless:.6f}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: Can ψ be expressed as a ratio of AMD to something?
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 3: ψ as a ratio of AMD quantities")
print("=" * 72)
print()

# Total orbital angular momentum: L_j = m_j × √a_j (in normalized units)
L_total = sum(MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES)
print(f"Total orbital ang. mom. (Σ m×√a):  {L_total:.6e}")
print(f"Total AMD (full):                   {total_AMD:.6e}")
print(f"Total AMD (inclination only):       {total_AMD_incl:.6e}")
print(f"Total AMD (eccentricity only):      {total_AMD_ecc:.6e}")
print()

# Key ratios
C_AMD = total_AMD / L_total
C_incl = total_AMD_incl / L_total
C_ecc = total_AMD_ecc / L_total
print(f"AMD/L_total =                       {C_AMD:.6e}")
print(f"AMD_incl/L_total =                  {C_incl:.6e}")
print(f"AMD_ecc/L_total =                   {C_ecc:.6e}")
print()

# Compare to ψ
print("--- Comparing to ψ ---")
print(f"ψ =                                 {PSI:.6e}")
print(f"ψ² =                                {PSI**2:.6e}")
print(f"ψ (radians) =                       {psi_rad:.6e}")
print(f"ψ² (radians) =                      {psi_rad**2:.6e}")
print()

# Systematic ratio search
print("Ratios involving AMD and ψ:")
ratios_to_check = {
    "AMD_total / ψ": total_AMD / PSI,
    "AMD_total / ψ²": total_AMD / PSI**2,
    "AMD_incl / ψ": total_AMD_incl / PSI,
    "AMD_incl / ψ²": total_AMD_incl / PSI**2,
    "AMD_ecc / ψ": total_AMD_ecc / PSI,
    "AMD_ecc / ψ²": total_AMD_ecc / PSI**2,
    "ψ / C_AMD": PSI / C_AMD,
    "ψ / C_incl": PSI / C_incl,
    "ψ / C_ecc": PSI / C_ecc,
    "ψ² / C_AMD": PSI**2 / C_AMD,
    "ψ² / C_incl": PSI**2 / C_incl,
    "ψ / √(C_incl)": PSI / math.sqrt(C_incl),
    "√(C_incl) / ψ": math.sqrt(C_incl) / PSI,
    "L_total × ψ²": L_total * PSI**2,
    "AMD_incl / (L_total × ψ²)": total_AMD_incl / (L_total * PSI**2),
}
for name, val in ratios_to_check.items():
    # Check if close to simple fraction
    best = nearest_fib_ratio(val)
    a, b, r, err = best
    fib_note = f"  ≈ {a}/{b} ({err*100:.3f}%)" if err < 0.05 else ""
    print(f"  {name:<35} = {val:>14.6e}{fib_note}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: The geometric sum Σ √a/d²
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 4: Geometric sum Σ √a_j / d_j²")
print("=" * 72)
print()
print("Since AMD_incl(amp) = ψ²_rad × Σ √a_j / (2 d_j²), the sum Σ √a/d²")
print("is what ψ must 'fill' to produce the right total amplitude AMD.")
print()

geo_sum = 0
for p in PLANET_NAMES:
    contrib = math.sqrt(SMA[p]) / D[p]**2
    geo_sum += contrib
    print(f"  {p:<10}  √a/d² = {contrib:.6e}  (d={D[p]}, √a={math.sqrt(SMA[p]):.4f})")
print(f"\n  Σ √a/d² = {geo_sum:.6e}")
print()

# What ψ would need to be to produce the observed total inclination AMD
# total_AMD_incl = ψ²_rad × geo_sum / 2
# ψ_rad = √(2 × total_AMD_incl / geo_sum)
psi_rad_from_AMD = math.sqrt(2 * total_AMD_incl / geo_sum)
psi_deg_from_AMD = math.degrees(psi_rad_from_AMD)
print(f"  If ψ were determined by total inclination AMD:")
print(f"    ψ_required = √(2 × AMD_incl / Σ(√a/d²))")
print(f"    ψ_required = {psi_deg_from_AMD:.6e}° = {psi_rad_from_AMD:.6e} rad")
print(f"    ψ_actual   = {PSI:.6e}° = {psi_rad:.6e} rad")
print(f"    Ratio ψ_actual/ψ_required = {PSI/psi_deg_from_AMD:.6f}")
print()
print("  NOTE: These differ because ψ determines AMPLITUDES of oscillation,")
print("  not MEAN inclinations. The total AMD is dominated by mean inclinations.")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: ψ from amplitude-AMD vs mean-AMD
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 5: Amplitude-AMD budget")
print("=" * 72)
print()
print("The amplitude AMD is the OSCILLATING part of the inclination AMD.")
print("Total amplitude-AMD = Σ m_j √a_j × amp_j² / 2 = ψ²_rad/(2) × Σ √a_j/d_j²")
print()

# This is the AMD that oscillates — the part ψ directly controls
print(f"  Amplitude-AMD total = {total_amp_AMD:.6e}")
print(f"  = ψ²_rad/2 × Σ √a/d² = {psi_rad**2/2 * geo_sum:.6e}")
print(f"  Match: {total_amp_AMD / (psi_rad**2/2 * geo_sum):.10f}")
print()

# Now: what fraction of total AMD is the oscillating part?
frac = total_amp_AMD / total_AMD
print(f"  Amplitude-AMD / Total AMD = {frac:.6e} = {frac*100:.4f}%")
print(f"  Amplitude-AMD / Incl-AMD  = {total_amp_AMD/total_AMD_incl:.6e} = {total_amp_AMD/total_AMD_incl*100:.4f}%")
print()

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: Ratio R = ψ₁/ξ_V and AMD connection
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 6: R ≈ 311 in AMD terms")
print("=" * 72)
print()

xi_V = XI["Venus"]
R_val = PSI / xi_V
print(f"  ψ = {PSI:.6e}")
print(f"  ξ_V = e_V × √m_V = {ECC['Venus']:.8f} × {SQRT_M['Venus']:.6e} = {xi_V:.6e}")
print(f"  R = ψ/ξ_V = {R_val:.4f}")
print()

# Since ψ = amp × d × √m, and ξ = e × √m:
# R = ψ/ξ_V = (amp_V × d_V × √m_V) / (e_V × √m_V) = amp_V × d_V / e_V
R_check = INCL_AMP["Venus"] * D["Venus"] / ECC["Venus"]
print(f"  R = amp_V × d_V / e_V = {INCL_AMP['Venus']:.6f} × {D['Venus']} / {ECC['Venus']:.8f} = {R_check:.4f}")
print()

# For ALL planets: amp × d / e should also relate to R
print("  For each planet: ψ/ξ_j = amp_j × d_j / e_j")
print(f"  {'Planet':<10} {'amp×d/e':>12} {'ψ/ξ':>12} {'ratio to R':>12}")
print("  " + "-" * 50)
for p in PLANET_NAMES:
    xi_p = XI[p]
    ratio_p = PSI / xi_p
    amp_d_e = INCL_AMP[p] * D[p] / ECC[p]
    print(f"  {p:<10} {amp_d_e:>12.4f} {ratio_p:>12.4f} {ratio_p/R_val:>12.6f}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: ψ expressed through total angular momentum
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 7: ψ from angular momentum ratios")
print("=" * 72)
print()

# Jupiter dominates angular momentum
L = {p: MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES}
print(f"  Orbital angular momentum L_j = m_j × √a_j (natural units):")
for p in PLANET_NAMES:
    pct = L[p] / L_total * 100
    print(f"    {p:<10}  L = {L[p]:.6e}  ({pct:.2f}%)")
print(f"    {'TOTAL':<10}  L = {L_total:.6e}")
print()

# ψ / L ratios
print(f"  ψ / L_total = {PSI / L_total:.6e}")
print(f"  ψ / L_Jupiter = {PSI / L['Jupiter']:.6e}")
print(f"  ψ × L_total = {PSI * L_total:.6e}")
print()

# Check if ψ² × L_total gives something recognizable
val = PSI**2 * L_total
print(f"  ψ² × L_total = {val:.6e}")
# Compare to total AMD
print(f"  Total AMD    = {total_AMD:.6e}")
print(f"  Ratio AMD/(ψ²×L) = {total_AMD / val:.6f}")
print()

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8: Deeper — ψ from AMD concentration coefficient
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 8: AMD concentration and ψ")
print("=" * 72)
print()

# Laskar's AMD stability criterion uses C = AMD / L
# Our model has ψ controlling the amplitude oscillation
# C_incl = AMD_incl / L ≈ Σ m√a × i²/2 / Σ m√a
# If all planets had the SAME inclination i₀:
#   C_incl = i₀²/2
#   i₀ = √(2 × C_incl)
i_eff = math.degrees(math.sqrt(2 * C_incl))
print(f"  AMD concentration C = AMD/L = {C_AMD:.6e}")
print(f"  Inclination concentration C_incl = {C_incl:.6e}")
print(f"  Effective uniform inclination i_eff = √(2×C_incl) = {i_eff:.4f}°")
print(f"  ψ = {PSI:.6e}°")
print(f"  i_eff / ψ = {i_eff / PSI:.6f}")
print()

# What about the RMS inclination weighted by m√a?
i_rms_sq = sum(MASS[p]*math.sqrt(SMA[p])*math.radians(INCL_MEAN[p])**2 for p in PLANET_NAMES) / L_total
i_rms = math.degrees(math.sqrt(i_rms_sq))
print(f"  RMS inclination (m√a-weighted) = {i_rms:.4f}°")
print(f"  i_rms / ψ = {i_rms / PSI:.6f}")
print()

# Same but for amplitudes
amp_rms_sq = sum(MASS[p]*math.sqrt(SMA[p])*math.radians(INCL_AMP[p])**2 for p in PLANET_NAMES) / L_total
amp_rms = math.degrees(math.sqrt(amp_rms_sq))
print(f"  RMS amplitude (m√a-weighted) = {amp_rms:.6f}°")
print(f"  amp_rms / ψ = {amp_rms / PSI:.6f}")
print()

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9: The key equation — solving for ψ from AMD
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 9: Can we invert — derive ψ from AMD + Fibonacci structure?")
print("=" * 72)
print()
print("If the total inclination AMD is determined by formation physics, and")
print("the Fibonacci structure (d-values) is determined by KAM stability,")
print("then ψ is FIXED by:")
print()
print("  AMD_incl = (ψ_rad²/2) × Σ(√a_j / d_j²)   ... [amplitudes]")
print()
print("But amplitudes don't set the total AMD — means do. Let's check if")
print("means are also constrained by ψ somehow.")
print()

# Mean inclinations vs amplitudes
print(f"  {'Planet':<10} {'i_mean°':>10} {'amp°':>10} {'mean/amp':>10} {'d':>5}")
print("  " + "-" * 50)
for p in PLANET_NAMES:
    ratio = INCL_MEAN[p] / INCL_AMP[p] if INCL_AMP[p] > 0 else 0
    print(f"  {p:<10} {INCL_MEAN[p]:>10.4f} {INCL_AMP[p]:>10.6f} {ratio:>10.4f} {D[p]:>5}")

print()
print("  Mean/amplitude ratio is NOT constant — means are independently set")
print("  by J2000 snapshot + model constraint, not by ψ alone.")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 10: Total ξ (eccentricity) connection
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 10: ψ and total eccentricity budget (ξ)")
print("=" * 72)
print()

total_xi = sum(XI[p] for p in PLANET_NAMES)
total_xi_d = sum(XI[p] * D[p] for p in PLANET_NAMES)
total_eta = sum(ETA[p] for p in PLANET_NAMES)
total_eta_d = sum(ETA[p] * D[p] for p in PLANET_NAMES)

print(f"  Σ ξ_j = Σ e_j×√m_j = {total_xi:.6e}")
print(f"  Σ ξ_j×d_j = {total_xi_d:.6e}")
print(f"  Σ η_j = Σ amp_j×√m_j = ψ×Σ(1/d_j) = {total_eta:.6e}")
print(f"  ψ × Σ(1/d_j) = {PSI * sum(1/D[p] for p in PLANET_NAMES):.6e}")
print(f"  Σ η_j×d_j = ψ×N = ψ×8 = {total_eta_d:.6e}  (ψ×8 = {PSI*8:.6e})")
print()

# R connects ψ to ξ — check if R × total_xi gives something
print(f"  R × Σξ = {R_val * total_xi:.6e}")
print(f"  ψ × 8 / Σξ = {PSI * 8 / total_xi:.6f}")
print(f"  (Σξ)² / (Ση)² = {total_xi**2 / total_eta**2:.6f}")
print()

# The eccentricity ladder: d × ξ = constant for inner planets
print("  Eccentricity ladder (d×ξ for each planet):")
for p in PLANET_NAMES:
    d_xi = D[p] * XI[p]
    print(f"    {p:<10}  d×ξ = {D[p]:>3} × {XI[p]:.6e} = {d_xi:.6e}")

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 11: Summary — what constrains ψ?
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 72)
print("SECTION 11: Summary")
print("=" * 72)
print()
print(f"  ψ = {PSI:.10f}° = {psi_rad:.10e} rad")
print(f"  ψ = F₅ × F₈² / (2H) = 5 × 441 / {2*H} = 2205/{2*H}")
print()
print(f"  H = {H}")
print(f"  H factorization: 2⁵ × 19² × 29 = {2**5 * 19**2 * 29}")
print()
print(f"  ψ_rad² × Σ(√a/d²) / 2 = {psi_rad**2 * geo_sum / 2:.6e}  [amplitude AMD]")
print(f"  Total mean-incl AMD     = {total_AMD_incl:.6e}")
print(f"  Total ecc AMD           = {total_AMD_ecc:.6e}")
print(f"  Total full AMD          = {total_AMD:.6e}")
print()

# Final check: is there a clean Fibonacci ratio between amp-AMD and total AMD?
r_amp_total = total_amp_AMD / total_AMD
r_amp_incl = total_amp_AMD / total_AMD_incl
r_incl_ecc = total_AMD_incl / total_AMD_ecc
print("  Key AMD ratios:")
best = nearest_fib_ratio(r_amp_total)
print(f"    Amp-AMD / Total-AMD = {r_amp_total:.6e}  (nearest Fib: {best[0]}/{best[1]} = {best[2]:.4f}, err {best[3]*100:.2f}%)")
best = nearest_fib_ratio(r_amp_incl)
print(f"    Amp-AMD / Incl-AMD  = {r_amp_incl:.6e}  (nearest Fib: {best[0]}/{best[1]} = {best[2]:.4f}, err {best[3]*100:.2f}%)")
best = nearest_fib_ratio(r_incl_ecc)
print(f"    Incl-AMD / Ecc-AMD  = {r_incl_ecc:.6f}  (nearest Fib: {best[0]}/{best[1]} = {best[2]:.4f}, err {best[3]*100:.2f}%)")
best = nearest_fib_ratio(total_AMD_ecc / total_AMD_incl)
print(f"    Ecc-AMD / Incl-AMD  = {total_AMD_ecc/total_AMD_incl:.6f}  (nearest Fib: {best[0]}/{best[1]} = {best[2]:.4f}, err {best[3]*100:.2f}%)")

# Check ratio of total AMD to L_total against Fibonacci
best = nearest_fib_ratio(C_AMD * 1e4)
print(f"    C_AMD × 10⁴         = {C_AMD*1e4:.6f}  (nearest Fib: {best[0]}/{best[1]} = {best[2]:.4f}, err {best[3]*100:.2f}%)")

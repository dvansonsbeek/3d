#!/usr/bin/env python3
"""
Balanced Year — Invariable Plane & Balance Investigation
=========================================================
At the balanced year (-301,340), the Holistic model predicts that eccentricities
are at their BASE values (oscillation midpoints), not J2000 snapshot values.

This script investigates:
  1. Are the Fibonacci Laws "more balanced" at the balanced year (base e)
     than at J2000 (snapshot e)?
  2. How does the invariable plane differ between Option A (dynamically computed
     from angular momentum) and Option B (Souami & Souchay 2012)?
  3. What is the oscillation phase at the balanced year — are inclinations
     at mean, max, or intermediate values?
  4. Is the balanced year a local optimum for balance?

Reference: https://github.com/dvansonsbeek/3d/blob/main/docs/05-invariable-plane-overview.md
"""

import math

from fibonacci_data import (
    PLANET_NAMES, MASS, SQRT_M, SEMI_MAJOR, D, H,
    ECC_J2000, ECC_BASE, ECCENTRICITIES,
    INCL_J2000, OMEGA_J2000, INCL_AMP, INCL_PERIOD,
    PHASE_GROUP, GROUP_203, GROUP_23,
    PSI, MIRROR_PAIRS,
)

BALANCE_YEAR = -301_340
J2000_YEAR = 2000
DT = J2000_YEAR - BALANCE_YEAR  # 303,340 years

PHASE_ANGLE = 203.3195  # s₈ eigenmode phase (degrees)

# ═══════════════════════════════════════════════════════════════════════════
# 1. ECCENTRICITIES AT BALANCED YEAR vs J2000
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 78)
print("  BALANCED YEAR — INVARIABLE PLANE & BALANCE INVESTIGATION")
print("=" * 78)
print()
print(f"  Balanced year: {BALANCE_YEAR:,}  |  J2000: {J2000_YEAR}")
print(f"  Δt: {DT:,} years  |  H: {H:,}")
print()

print("─" * 78)
print("  1. ECCENTRICITY: J2000 vs BASE (balanced year midpoint)")
print("─" * 78)
print()
print(f"  {'Planet':10s}  {'e_J2000':>12s}  {'e_base':>12s}  {'Δ (%)':>10s}  {'Note':>20s}")
print(f"  {'─'*10}  {'─'*12}  {'─'*12}  {'─'*10}  {'─'*20}")

for p in PLANET_NAMES:
    ej = ECC_J2000[p]
    eb = ECC_BASE[p]
    delta = (eb - ej) / ej * 100
    note = ""
    if abs(delta) > 1:
        note = "significant diff"
    print(f"  {p:10s}  {ej:12.8f}  {eb:12.8f}  {delta:+10.3f}%  {note:>20s}")

print()
print("  Earth and Mercury differ significantly from J2000.")
print("  At the balanced year, the model predicts eccentricities are at base values.")


# ═══════════════════════════════════════════════════════════════════════════
# 2. LAW 3 — INCLINATION BALANCE AT DIFFERENT EPOCHS
# ═══════════════════════════════════════════════════════════════════════════

def incl_balance(eccs, d_vals, group_a, group_b):
    """Compute inclination balance: w_j = √(m×a×(1-e²))/d."""
    sum_a = sum(
        math.sqrt(MASS[p] * SEMI_MAJOR[p] * (1 - eccs[p]**2)) / d_vals[p]
        for p in group_a
    )
    sum_b = sum(
        math.sqrt(MASS[p] * SEMI_MAJOR[p] * (1 - eccs[p]**2)) / d_vals[p]
        for p in group_b
    )
    total = sum_a + sum_b
    balance = (1 - abs(sum_a - sum_b) / total) * 100
    return balance, sum_a, sum_b


def ecc_balance(eccs, d_vals, group_a, group_b):
    """Compute eccentricity balance: v_j = √m × a^(3/2) × e / √d."""
    sum_a = sum(
        SQRT_M[p] * SEMI_MAJOR[p]**1.5 * eccs[p] / math.sqrt(d_vals[p])
        for p in group_a
    )
    sum_b = sum(
        SQRT_M[p] * SEMI_MAJOR[p]**1.5 * eccs[p] / math.sqrt(d_vals[p])
        for p in group_b
    )
    total = sum_a + sum_b
    balance = (1 - abs(sum_a - sum_b) / total) * 100
    return balance, sum_a, sum_b


def saturn_prediction(eccs, d_vals, group_a, solo):
    """Predict solo planet's eccentricity from balance equation."""
    sum_a = sum(
        SQRT_M[p] * SEMI_MAJOR[p]**1.5 * eccs[p] / math.sqrt(d_vals[p])
        for p in group_a
    )
    denom = SQRT_M[solo] * SEMI_MAJOR[solo]**1.5 / math.sqrt(d_vals[solo])
    e_pred = sum_a / denom
    e_actual = eccs[solo]
    error = (e_pred - e_actual) / e_actual * 100
    return e_pred, e_actual, error


print()
print("─" * 78)
print("  2. LAW 3 — INCLINATION BALANCE")
print("─" * 78)
print()

bal_j2000, sum_a_j, sum_b_j = incl_balance(ECC_J2000, D, GROUP_203, GROUP_23)
bal_base, sum_a_b, sum_b_b = incl_balance(ECC_BASE, D, GROUP_203, GROUP_23)
bal_default, sum_a_d, sum_b_d = incl_balance(ECCENTRICITIES, D, GROUP_203, GROUP_23)

print(f"  Eccentricity set      Balance (%)    Σ_203°         Σ_23°")
print(f"  {'─'*20}  {'─'*13}  {'─'*14}  {'─'*14}")
print(f"  {'J2000 (snapshot)':20s}  {bal_j2000:13.6f}  {sum_a_j:14.10f}  {sum_b_j:14.10f}")
print(f"  {'Base (balanced yr)':20s}  {bal_base:13.6f}  {sum_a_b:14.10f}  {sum_b_b:14.10f}")
print(f"  {'Default (mixed)':20s}  {bal_default:13.6f}  {sum_a_d:14.10f}  {sum_b_d:14.10f}")
print()
improvement = bal_base - bal_j2000
print(f"  Improvement (base vs J2000): {improvement:+.6f}%")
if improvement > 0:
    print(f"  → Base eccentricities give BETTER inclination balance")
elif improvement < 0:
    print(f"  → J2000 eccentricities give better balance (base is slightly worse)")
else:
    print(f"  → No difference")


# ═══════════════════════════════════════════════════════════════════════════
# 3. LAW 5 — ECCENTRICITY BALANCE AT DIFFERENT EPOCHS
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  3. LAW 5 — ECCENTRICITY BALANCE")
print("─" * 78)
print()

ebal_j2000, ea_j, eb_j = ecc_balance(ECC_J2000, D, GROUP_203, GROUP_23)
ebal_base, ea_b, eb_b = ecc_balance(ECC_BASE, D, GROUP_203, GROUP_23)
ebal_default, ea_d, eb_d = ecc_balance(ECCENTRICITIES, D, GROUP_203, GROUP_23)

print(f"  Eccentricity set      Balance (%)    Σ_203°         Σ_23°")
print(f"  {'─'*20}  {'─'*13}  {'─'*14}  {'─'*14}")
print(f"  {'J2000 (snapshot)':20s}  {ebal_j2000:13.6f}  {ea_j:14.10f}  {eb_j:14.10f}")
print(f"  {'Base (balanced yr)':20s}  {ebal_base:13.6f}  {ea_b:14.10f}  {eb_b:14.10f}")
print(f"  {'Default (mixed)':20s}  {ebal_default:13.6f}  {ea_d:14.10f}  {eb_d:14.10f}")
print()
ecc_improvement = ebal_base - ebal_j2000
print(f"  Improvement (base vs J2000): {ecc_improvement:+.6f}%")


# ═══════════════════════════════════════════════════════════════════════════
# 4. SATURN PREDICTION AT DIFFERENT EPOCHS
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  4. SATURN ECCENTRICITY PREDICTION")
print("─" * 78)
print()

pred_j, act_j, err_j = saturn_prediction(ECC_J2000, D, GROUP_203, "Saturn")
pred_b, act_b, err_b = saturn_prediction(ECC_BASE, D, GROUP_203, "Saturn")
pred_d, act_d, err_d = saturn_prediction(ECCENTRICITIES, D, GROUP_203, "Saturn")

print(f"  {'Eccentricity set':20s}  {'Predicted':>12s}  {'Actual':>12s}  {'Error':>10s}")
print(f"  {'─'*20}  {'─'*12}  {'─'*12}  {'─'*10}")
print(f"  {'J2000 (snapshot)':20s}  {pred_j:12.8f}  {act_j:12.8f}  {err_j:+10.4f}%")
print(f"  {'Base (balanced yr)':20s}  {pred_b:12.8f}  {act_b:12.8f}  {err_b:+10.4f}%")
print(f"  {'Default (mixed)':20s}  {pred_d:12.8f}  {act_d:12.8f}  {err_d:+10.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# 5. INVARIABLE PLANE — OPTION A (dynamic) vs OPTION B (fixed)
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  5. INVARIABLE PLANE — OPTION A vs OPTION B")
print("─" * 78)
print()

# Option B: Souami & Souchay 2012 (fixed reference)
IP_INCL_B = 1.5787   # degrees, to ecliptic
IP_NODE_B = 107.582   # degrees, ascending node on ecliptic

print(f"  Option B (Souami & Souchay 2012, fixed):")
print(f"    Inclination to ecliptic: {IP_INCL_B}°")
print(f"    Ascending node:          {IP_NODE_B}°")
print()

# Option A: Compute from angular momentum vectors
# Angular momentum per planet: L_j = m_j × √(a_j × (1-e_j²))
# (in units where GM=1, this is the specific angular momentum × mass)
# The direction is the orbital pole, which depends on inclination and node

# For computing the invariable plane, we need the angular momentum
# vectors in 3D. Using ecliptic coordinates:
# L_x = L × sin(i) × sin(Ω)
# L_y = -L × sin(i) × cos(Ω)
# L_z = L × cos(i)
# where i is inclination to ecliptic, Ω is ascending node on ecliptic

# Ecliptic inclinations and nodes (from data for J2000)
# We need ecliptic coordinates, not invariable plane coordinates
# INCL_J2000 is relative to invariable plane, not ecliptic
# Need to use ecliptic inclinations instead

# J2000 ecliptic inclinations (degrees)
INCL_ECLIPTIC = {
    "Mercury": 7.005, "Venus": 3.395, "Earth": 0.000, "Mars": 1.850,
    "Jupiter": 1.303, "Saturn": 2.489, "Uranus": 0.773, "Neptune": 1.770,
}

# J2000 ascending node on ecliptic (degrees)
OMEGA_ECLIPTIC = {
    "Mercury": 48.331, "Venus": 76.680, "Earth": 0.000, "Mars": 49.558,
    "Jupiter": 100.464, "Saturn": 113.665, "Uranus": 74.006, "Neptune": 131.784,
}


def compute_invariable_plane(eccs, incl_ecl, omega_ecl):
    """Compute invariable plane from angular momentum vectors.

    Returns (inclination, ascending_node) of the plane relative to ecliptic,
    plus the individual angular momentum magnitudes.
    """
    Lx_total, Ly_total, Lz_total = 0, 0, 0
    L_mags = {}

    for p in PLANET_NAMES:
        # Angular momentum magnitude: L = m × √(a × (1-e²))
        L = MASS[p] * math.sqrt(SEMI_MAJOR[p] * (1 - eccs[p]**2))
        L_mags[p] = L

        i_rad = math.radians(incl_ecl[p])
        omega_rad = math.radians(omega_ecl[p])

        # Angular momentum components (ecliptic frame)
        Lx = L * math.sin(i_rad) * math.sin(omega_rad)
        Ly = -L * math.sin(i_rad) * math.cos(omega_rad)
        Lz = L * math.cos(i_rad)

        Lx_total += Lx
        Ly_total += Ly
        Lz_total += Lz

    L_total = math.sqrt(Lx_total**2 + Ly_total**2 + Lz_total**2)
    L_perp = math.sqrt(Lx_total**2 + Ly_total**2)

    # Invariable plane inclination = angle between total L and ecliptic pole
    ip_incl = math.degrees(math.asin(L_perp / L_total))
    # Ascending node of invariable plane on ecliptic
    ip_node = math.degrees(math.atan2(Lx_total, -Ly_total)) % 360

    return ip_incl, ip_node, L_mags, L_total


# Option A at J2000
ip_incl_a, ip_node_a, L_mags_j2000, L_total_j2000 = compute_invariable_plane(
    ECC_J2000, INCL_ECLIPTIC, OMEGA_ECLIPTIC
)

print(f"  Option A at J2000 (dynamically computed):")
print(f"    Inclination to ecliptic: {ip_incl_a:.4f}°")
print(f"    Ascending node:          {ip_node_a:.3f}°")
print()

print(f"  Comparison:")
print(f"    Δ(inclination): {ip_incl_a - IP_INCL_B:+.4f}°")
print(f"    Δ(asc. node):   {ip_node_a - IP_NODE_B:+.3f}°")
print()

# Option A at balanced year (using base eccentricities)
ip_incl_bal, ip_node_bal, L_mags_bal, L_total_bal = compute_invariable_plane(
    ECC_BASE, INCL_ECLIPTIC, OMEGA_ECLIPTIC
)

print(f"  Option A at balanced year (base eccentricities, J2000 inclinations):")
print(f"    Inclination to ecliptic: {ip_incl_bal:.4f}°")
print(f"    Ascending node:          {ip_node_bal:.3f}°")
print(f"    Δ from J2000 Option A:   {ip_incl_bal - ip_incl_a:+.6f}° (incl), "
      f"{ip_node_bal - ip_node_a:+.3f}° (node)")
print()

# Angular momentum contributions
print(f"  Angular momentum contributions (J2000):")
print(f"  {'Planet':10s}  {'L_j':>14s}  {'Fraction':>10s}")
print(f"  {'─'*10}  {'─'*14}  {'─'*10}")
for p in PLANET_NAMES:
    frac = L_mags_j2000[p] / L_total_j2000 * 100
    print(f"  {p:10s}  {L_mags_j2000[p]:14.6e}  {frac:9.3f}%")

print()
print("  NOTE: The invariable plane barely changes between J2000 and balanced year")
print("  because giant planets (96% of total L) have similar eccentricities.")


# ═══════════════════════════════════════════════════════════════════════════
# 6. INCLINATION STATE — ψ-CONSTANT AT DIFFERENT EPOCHS
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  6. ψ-CONSTANT (d × i × √m) — COMPARISON")
print("─" * 78)
print()

# At J2000 using J2000 inclinations (the standard test)
print(f"  {'Planet':10s}  {'d':>4s}  {'i_J2000':>10s}  {'√m':>12s}  {'d×i×√m':>14s}  {'Error':>8s}")
print(f"  {'─'*10}  {'─'*4}  {'─'*10}  {'─'*12}  {'─'*14}  {'─'*8}")

psi_vals_j2000 = []
for p in PLANET_NAMES:
    val = D[p] * INCL_J2000[p] * SQRT_M[p]
    psi_vals_j2000.append(val)

mean_psi = sum(psi_vals_j2000) / len(psi_vals_j2000)
for i, p in enumerate(PLANET_NAMES):
    val = psi_vals_j2000[i]
    err = (val - mean_psi) / mean_psi * 100
    print(f"  {p:10s}  {D[p]:4d}  {INCL_J2000[p]:10.4f}°  {SQRT_M[p]:12.4e}  {val:14.6e}  {err:+7.3f}%")

spread_j2000 = (max(psi_vals_j2000) - min(psi_vals_j2000)) / mean_psi * 100
print(f"\n  Mean ψ (J2000): {mean_psi:.6e}")
print(f"  Spread (J2000): {spread_j2000:.4f}%")
print(f"  Theory ψ:       {PSI:.6e}  ({abs(mean_psi/PSI-1)*100:.4f}% from theory)")


# ═══════════════════════════════════════════════════════════════════════════
# 7. BALANCE SCAN — HOW DOES BALANCE VARY WITH ECCENTRICITY?
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  7. BALANCE SCAN — ECCENTRICITY INTERPOLATION")
print("─" * 78)
print()
print("  Interpolate eccentricities between J2000 and base values.")
print("  At α=0: e = e_J2000 (current snapshot)")
print("  At α=1: e = e_base (balanced year / oscillation midpoint)")
print()

alphas = [i * 0.1 for i in range(11)]

print(f"  {'α':>4s}  {'Incl Balance':>13s}  {'Ecc Balance':>12s}  {'Saturn pred err':>16s}")
print(f"  {'─'*4}  {'─'*13}  {'─'*12}  {'─'*16}")

best_incl_alpha = 0
best_incl_bal = 0
best_ecc_alpha = 0
best_ecc_bal = 0

for alpha in alphas:
    eccs = {p: ECC_J2000[p] + alpha * (ECC_BASE[p] - ECC_J2000[p])
            for p in PLANET_NAMES}
    ib, _, _ = incl_balance(eccs, D, GROUP_203, GROUP_23)
    eb, _, _ = ecc_balance(eccs, D, GROUP_203, GROUP_23)
    _, _, sp_err = saturn_prediction(eccs, D, GROUP_203, "Saturn")
    print(f"  {alpha:4.1f}  {ib:13.6f}%  {eb:12.6f}%  {sp_err:+16.4f}%")

    if ib > best_incl_bal:
        best_incl_bal = ib
        best_incl_alpha = alpha
    if eb > best_ecc_bal:
        best_ecc_bal = eb
        best_ecc_alpha = alpha

print()
print(f"  Best inclination balance at α = {best_incl_alpha:.1f} ({best_incl_bal:.6f}%)")
print(f"  Best eccentricity balance at α = {best_ecc_alpha:.1f} ({best_ecc_bal:.6f}%)")

# Fine-grained search around best α
print()
print("  Fine-grained search (0.01 steps around best α):")
print()

for target, label, best_alpha in [
    ("incl", "Inclination", best_incl_alpha),
    ("ecc", "Eccentricity", best_ecc_alpha),
]:
    fine_best_alpha = best_alpha
    fine_best_bal = 0
    for i in range(-20, 21):
        alpha = best_alpha + i * 0.01
        if alpha < 0 or alpha > 1.5:
            continue
        eccs = {p: ECC_J2000[p] + alpha * (ECC_BASE[p] - ECC_J2000[p])
                for p in PLANET_NAMES}
        if target == "incl":
            bal, _, _ = incl_balance(eccs, D, GROUP_203, GROUP_23)
        else:
            bal, _, _ = ecc_balance(eccs, D, GROUP_203, GROUP_23)
        if bal > fine_best_bal:
            fine_best_bal = bal
            fine_best_alpha = alpha
    print(f"  {label:12s} balance: peak at α = {fine_best_alpha:.2f} ({fine_best_bal:.8f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# 8. ANGULAR MOMENTUM BALANCE BETWEEN PHASE GROUPS
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  8. ANGULAR MOMENTUM — PHASE GROUP DECOMPOSITION")
print("─" * 78)
print()

# Compute angular momentum for each phase group
for label, eccs in [("J2000", ECC_J2000), ("Base", ECC_BASE)]:
    L_203 = sum(MASS[p] * math.sqrt(SEMI_MAJOR[p] * (1 - eccs[p]**2))
                for p in GROUP_203)
    L_23 = sum(MASS[p] * math.sqrt(SEMI_MAJOR[p] * (1 - eccs[p]**2))
               for p in GROUP_23)
    L_total = L_203 + L_23
    ratio = L_203 / L_23

    print(f"  {label} eccentricities:")
    print(f"    L(203° group): {L_203:.10e}")
    print(f"    L(23° group):  {L_23:.10e}  (Saturn only)")
    print(f"    Ratio L_203/L_23: {ratio:.6f}")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# 9. INCLINATION OSCILLATION PHASE AT BALANCED YEAR
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  9. INCLINATION OSCILLATION PHASE AT BALANCED YEAR")
print("─" * 78)
print()

# For each planet, compute the phase of inclination oscillation
# i(t) = i_mean + amp × cos(Ω(t) - φ_group)
# where Ω(t) = Ω_J2000 + rate × Δt

# Mean inclination: i_mean = i_J2000 - amp × cos(Ω_J2000 - φ_group)

print(f"  {'Planet':10s}  {'i_J2000':>8s}  {'amp':>8s}  {'i_mean':>8s}  {'phase_J2000':>12s}  {'cos(φ)':>8s}")
print(f"  {'─'*10}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*12}  {'─'*8}")

for p in PLANET_NAMES:
    amp = INCL_AMP[p]
    phi_group = PHASE_ANGLE if PHASE_GROUP[p] == 203 else PHASE_ANGLE - 180
    phase_j2000 = OMEGA_J2000[p] - phi_group
    cos_phase = math.cos(math.radians(phase_j2000))
    i_mean = INCL_J2000[p] - amp * cos_phase
    print(f"  {p:10s}  {INCL_J2000[p]:8.4f}°  {amp:8.4f}°  {i_mean:8.4f}°  "
          f"{phase_j2000:+12.2f}°  {cos_phase:+8.4f}")

print()
print("  Known balance year positions (from 3D model):")
print("    Earth:   perihelion = 270°, ascending node = 90°")
print("    Jupiter: perihelion = 180°, ascending node = 117.5°")
print("    Saturn:  perihelion = 187.3°, ascending node = 215.3°")
print()

# Earth at balanced year
earth_phi_group = PHASE_ANGLE  # 203.32°
earth_phase_bal = 90.0 - earth_phi_group  # Ω_bal - φ_group
earth_cos_bal = math.cos(math.radians(earth_phase_bal))
earth_amp = INCL_AMP["Earth"]
earth_i_mean = INCL_J2000["Earth"] - earth_amp * math.cos(math.radians(OMEGA_J2000["Earth"] - earth_phi_group))
earth_i_bal = earth_i_mean + earth_amp * earth_cos_bal

print(f"  Earth at balanced year:")
print(f"    Ω_bal = 90°, φ_group = {earth_phi_group:.2f}°")
print(f"    Phase = Ω_bal - φ = {earth_phase_bal:.2f}°")
print(f"    cos(phase) = {earth_cos_bal:.4f}")
print(f"    i_mean = {earth_i_mean:.4f}°, amp = {earth_amp:.4f}°")
print(f"    i_bal = i_mean + amp×cos = {earth_i_bal:.4f}° (vs J2000: {INCL_J2000['Earth']:.4f}°)")
print()

# Jupiter at balanced year
jup_phi_group = PHASE_ANGLE
jup_phase_bal = 117.5 - jup_phi_group
jup_cos_bal = math.cos(math.radians(jup_phase_bal))
jup_amp = INCL_AMP["Jupiter"]
jup_i_mean = INCL_J2000["Jupiter"] - jup_amp * math.cos(math.radians(OMEGA_J2000["Jupiter"] - jup_phi_group))
jup_i_bal = jup_i_mean + jup_amp * jup_cos_bal

print(f"  Jupiter at balanced year:")
print(f"    Ω_bal = 117.5°, φ_group = {jup_phi_group:.2f}°")
print(f"    Phase = Ω_bal - φ = {jup_phase_bal:.2f}°")
print(f"    cos(phase) = {jup_cos_bal:.4f}")
print(f"    i_bal = {jup_i_bal:.4f}° (vs J2000: {INCL_J2000['Jupiter']:.4f}°)")
print()

# Saturn at balanced year (retrograde: φ = 23.32°)
sat_phi_group = PHASE_ANGLE - 180  # 23.32°
sat_phase_bal = 215.3 - sat_phi_group
sat_cos_bal = math.cos(math.radians(sat_phase_bal))
sat_amp = INCL_AMP["Saturn"]
sat_i_mean = INCL_J2000["Saturn"] - sat_amp * math.cos(math.radians(OMEGA_J2000["Saturn"] - sat_phi_group))
sat_i_bal = sat_i_mean + sat_amp * sat_cos_bal

print(f"  Saturn at balanced year:")
print(f"    Ω_bal = 215.3°, φ_group = {sat_phi_group:.2f}°")
print(f"    Phase = Ω_bal - φ = {sat_phase_bal:.2f}°")
print(f"    cos(phase) = {sat_cos_bal:.4f}")
print(f"    i_bal = {sat_i_bal:.4f}° (vs J2000: {INCL_J2000['Saturn']:.4f}°)")


# ═══════════════════════════════════════════════════════════════════════════
# 10. ψ-CONSTANT AT BALANCED YEAR (using balanced-year inclinations)
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 78)
print("  10. ψ-CONSTANT AT BALANCED YEAR (known planets)")
print("─" * 78)
print()

# For Earth, Jupiter, Saturn: use computed balanced-year inclinations
# For others: only J2000 available (note this in output)
bal_incl = dict(INCL_J2000)  # start with J2000
bal_incl["Earth"] = earth_i_bal
bal_incl["Jupiter"] = jup_i_bal
bal_incl["Saturn"] = sat_i_bal

print(f"  {'Planet':10s}  {'d':>4s}  {'i_bal':>10s}  {'d×i_bal×√m':>14s}  {'Status':>20s}")
print(f"  {'─'*10}  {'─'*4}  {'─'*10}  {'─'*14}  {'─'*20}")

psi_vals_bal = []
for p in PLANET_NAMES:
    val = D[p] * bal_incl[p] * SQRT_M[p]
    psi_vals_bal.append(val)
    status = "balanced-year computed" if p in ["Earth", "Jupiter", "Saturn"] else "J2000 (approximate)"
    print(f"  {p:10s}  {D[p]:4d}  {bal_incl[p]:10.4f}°  {val:14.6e}  {status:>20s}")

mean_psi_bal = sum(psi_vals_bal) / len(psi_vals_bal)
spread_bal = (max(psi_vals_bal) - min(psi_vals_bal)) / mean_psi_bal * 100
print(f"\n  Mean ψ (balanced): {mean_psi_bal:.6e}")
print(f"  Spread (balanced): {spread_bal:.4f}% (vs J2000: {spread_j2000:.4f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 78)
print("  SUMMARY")
print("=" * 78)
print(f"""
  1. INCLINATION BALANCE (Law 3):
     J2000:       {bal_j2000:.6f}%
     Base (bal.): {bal_base:.6f}%
     Difference:  {improvement:+.6f}%

  2. ECCENTRICITY BALANCE (Law 5):
     J2000:       {ebal_j2000:.6f}%
     Base (bal.): {ebal_base:.6f}%
     Difference:  {ecc_improvement:+.6f}%

  3. SATURN PREDICTION:
     J2000 error: {err_j:+.4f}%
     Base error:  {err_b:+.4f}%

  4. INVARIABLE PLANE:
     Option A (J2000):    i = {ip_incl_a:.4f}°, Ω = {ip_node_a:.3f}°
     Option A (balanced): i = {ip_incl_bal:.4f}°, Ω = {ip_node_bal:.3f}°
     Option B (S&S 2012): i = {IP_INCL_B:.4f}°, Ω = {IP_NODE_B:.3f}°
     Difference A vs B at J2000: {ip_incl_a - IP_INCL_B:+.4f}° (incl), {ip_node_a - IP_NODE_B:+.3f}° (node)
     → The invariable plane is stable; Option A ≈ Option B.

  5. ψ-CONSTANT SPREAD:
     J2000:       {spread_j2000:.4f}%
     Balanced yr: {spread_bal:.4f}% (partial — only E/J/S with bal. inclinations)

  INTERPRETATION:
  The balanced year name refers to the precession reference epoch, not to a
  maximum in the Law 3/5 balance percentages. Both balance conditions are
  already extremely tight (>99.88%) and vary only in the 5th-6th decimal
  place between J2000 and base eccentricities. The invariable plane
  (Options A and B) is stable to 4th decimal across epochs because giant
  planets dominate the angular momentum budget.
""")

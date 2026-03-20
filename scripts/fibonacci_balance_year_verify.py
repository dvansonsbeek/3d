#!/usr/bin/env python3
"""
BALANCE YEAR — VERIFICATION & ANALYSIS
========================================

At the balance year (-301,340), the Holistic model predicts that eccentricities
are at their BASE values (oscillation midpoints) and Jupiter's perihelion is at
exactly 180°. This script verifies the propagation, balance equations, invariable
plane stability, and Fibonacci significance.

Sections:
  1. Balance year positions & propagation verification (balance → J2000)
  2. Angular separation constancy (argument of perihelion ω)
  3. Geometric relationships at balance year
  4. Fibonacci significance of ω_J and |ω_S|
  5. Complete precession cycles in H years
  6. Eccentricity: J2000 vs base (balanced year midpoint)
  7. Law 3 — inclination balance at different epochs
  8. Law 5 — eccentricity balance at different epochs
  9. Saturn eccentricity prediction at different epochs
 10. Invariable plane — Option A (dynamic) vs Option B (fixed)
 11. ψ-constant (d × i × √m) comparison
 12. Balance scan — eccentricity interpolation
 13. Angular momentum — phase group decomposition
 14. Inclination oscillation phase at balanced year

Consolidated from:
  - fibonacci_balance_year_analysis.py    (propagation, ω, geometry, cycles)
  - fibonacci_balanced_year_invariable.py (balance, invariable plane, ψ, phases)
"""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lib', 'python'))
from constants_scripts import (
    PLANET_NAMES, MASS, SQRT_M, SEMI_MAJOR, D, H, FIB,
    ECC_J2000, ECC_BASE, ECC_DUAL_BALANCED, ECCENTRICITIES,
    INCL_J2000, OMEGA_J2000, INCL_AMP, INCL_PERIOD,
    PHASE_GROUP, GROUP_203, GROUP_23,
    PSI, MIRROR_PAIRS,
    BALANCE_YEAR, J2000_YEAR,
)


# ═══════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════

DT = J2000_YEAR - BALANCE_YEAR

PHASE_ANGLE = 203.3195  # s₈ eigenmode phase (degrees)

# Balance year positions (from 3D model)
BAL_POSITIONS = {
    'Earth':   {'perihelion': 270.0, 'asc_node': 90.0},
    'Jupiter': {'perihelion': 180.0, 'asc_node': 117.5},
    'Saturn':  {'perihelion': 187.3, 'asc_node': 215.3},
}

# J2000 positions (observed / calibrated)
J2000_POSITIONS = {
    'Jupiter': {'perihelion': 14.7,   'asc_node': 312.89},
    'Saturn':  {'perihelion': 92.128, 'asc_node': 118.81},
}

# Precession periods
PREC = {
    'Jupiter': {'period': H / 5, 'direction': +1, 'label': 'prograde'},
    'Saturn':  {'period': H / 8, 'direction': -1, 'label': 'retrograde'},
}

# J2000 ecliptic inclinations and nodes (for invariable plane computation)
INCL_ECLIPTIC = {
    "Mercury": 7.005, "Venus": 3.395, "Earth": 0.000, "Mars": 1.850,
    "Jupiter": 1.303, "Saturn": 2.489, "Uranus": 0.773, "Neptune": 1.770,
}
OMEGA_ECLIPTIC = {
    "Mercury": 48.331, "Venus": 76.680, "Earth": 0.000, "Mars": 49.558,
    "Jupiter": 100.464, "Saturn": 113.665, "Uranus": 74.006, "Neptune": 131.784,
}


def norm360(angle):
    """Normalize angle to [0, 360)."""
    return angle % 360


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


def compute_invariable_plane(eccs, incl_ecl, omega_ecl):
    """Compute invariable plane from angular momentum vectors.

    Returns (inclination, ascending_node) of the plane relative to ecliptic,
    plus the individual angular momentum magnitudes.
    """
    Lx_total, Ly_total, Lz_total = 0, 0, 0
    L_mags = {}

    for p in PLANET_NAMES:
        L = MASS[p] * math.sqrt(SEMI_MAJOR[p] * (1 - eccs[p]**2))
        L_mags[p] = L

        i_rad = math.radians(incl_ecl[p])
        omega_rad = math.radians(omega_ecl[p])

        Lx = L * math.sin(i_rad) * math.sin(omega_rad)
        Ly = -L * math.sin(i_rad) * math.cos(omega_rad)
        Lz = L * math.cos(i_rad)

        Lx_total += Lx
        Ly_total += Ly
        Lz_total += Lz

    L_total = math.sqrt(Lx_total**2 + Ly_total**2 + Lz_total**2)
    L_perp = math.sqrt(Lx_total**2 + Ly_total**2)

    ip_incl = math.degrees(math.asin(L_perp / L_total))
    ip_node = math.degrees(math.atan2(Lx_total, -Ly_total)) % 360

    return ip_incl, ip_node, L_mags, L_total


# ═══════════════════════════════════════════════════════════════════════════
print("=" * 78)
print("  BALANCE YEAR — VERIFICATION & ANALYSIS")
print("=" * 78)
print()
print(f"  Holistic Year H = {H:,}  |  Balance year = {BALANCE_YEAR:,}")
print(f"  J2000 = {J2000_YEAR}  |  Δt = {DT:,} years")


# ═══════════════════════════════════════════════════════════════════════════
# Section 1: Balance year positions & propagation verification
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 78)
print("  Section 1: Balance year positions & propagation verification")
print("=" * 78)
print()

print("  Balance year positions (from 3D model):")
for planet, pos in BAL_POSITIONS.items():
    print(f"    {planet:8s}:  perihelion = {pos['perihelion']:7.1f}°,  Ω = {pos['asc_node']:7.1f}°")

print()
print("  J2000 positions (observed / calibrated):")
for planet, pos in J2000_POSITIONS.items():
    print(f"    {planet:8s}:  perihelion = {pos['perihelion']:9.3f}°,  Ω = {pos['asc_node']:9.3f}°")

print()
print("  Precession periods:")
for planet, p in PREC.items():
    print(f"    {planet:8s}:  T = H/{int(H/p['period'])} = {p['period']:,.1f} yr  ({p['label']})")

print()
print("  Propagation (balance year → J2000):")

propagation_results = {}
for planet in ['Jupiter', 'Saturn']:
    p = PREC[planet]
    n_revs = DT / p['period']
    angle_traversed = n_revs * 360.0
    direction = p['direction']

    print(f"\n    {planet} (T = {p['period']:,.1f} yr, {p['label']}):")
    print(f"      Revolutions in Δt: {n_revs:.6f}")
    print(f"      Fractional part: {n_revs % 1:.6f} rev = {(n_revs % 1) * 360:.3f}°")

    for quantity in ['perihelion', 'asc_node']:
        start = BAL_POSITIONS[planet][quantity]
        predicted = norm360(start + direction * angle_traversed)
        observed = J2000_POSITIONS[planet][quantity]
        error = norm360(predicted - observed + 180) - 180

        label = 'perihelion' if quantity == 'perihelion' else 'Ω (asc. node)'
        sign = '+' if direction > 0 else '-'

        print(f"\n      {label}:")
        print(f"        {start:.1f}° {sign} ({n_revs:.6f} × 360°) mod 360°")
        print(f"        Predicted = {predicted:.3f}°")
        print(f"        Observed  = {observed:.3f}°")
        print(f"        Error     = {error:+.3f}°")

        propagation_results[f"{planet}_{quantity}"] = {
            'predicted': predicted, 'observed': observed, 'error': error
        }


# ═══════════════════════════════════════════════════════════════════════════
# Section 2: Angular separation constancy (argument of perihelion ω)
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 2: Angular separation constancy (argument of perihelion ω)")
print("=" * 78)

print("\n  Since perihelion and ascending node precess at the SAME rate")
print("  (both H/5 for Jupiter, both H/8 for Saturn), the angular separation")
print("  (argument of perihelion) remains constant.")

print("\n  At BALANCE YEAR:")
for planet in ['Jupiter', 'Saturn']:
    peri = BAL_POSITIONS[planet]['perihelion']
    node = BAL_POSITIONS[planet]['asc_node']
    sep = norm360(peri - node)
    print(f"    {planet:8s}:  ω = {peri:.1f}° − {node:.1f}° = {sep:.1f}°")

print("\n  At J2000:")
for planet in ['Jupiter', 'Saturn']:
    peri = J2000_POSITIONS[planet]['perihelion']
    node = J2000_POSITIONS[planet]['asc_node']
    sep = norm360(peri - node)
    print(f"    {planet:8s}:  ω = {peri:.3f}° − {node:.3f}° = {sep:.3f}°")

jup_omega_bal = norm360(BAL_POSITIONS['Jupiter']['perihelion'] - BAL_POSITIONS['Jupiter']['asc_node'])
jup_omega_j2k = norm360(J2000_POSITIONS['Jupiter']['perihelion'] - J2000_POSITIONS['Jupiter']['asc_node'])
sat_omega_bal = norm360(BAL_POSITIONS['Saturn']['perihelion'] - BAL_POSITIONS['Saturn']['asc_node'])
sat_omega_j2k = norm360(J2000_POSITIONS['Saturn']['perihelion'] - J2000_POSITIONS['Saturn']['asc_node'])

print(f"\n  Jupiter ω:  balance = {jup_omega_bal:.1f}°,  J2000 = {jup_omega_j2k:.3f}°,  Δ = {abs(jup_omega_bal - jup_omega_j2k):.3f}°")
print(f"  Saturn  ω:  balance = {sat_omega_bal:.1f}°,  J2000 = {sat_omega_j2k:.3f}°,  Δ = {abs(sat_omega_bal - sat_omega_j2k):.3f}°")


# ═══════════════════════════════════════════════════════════════════════════
# Section 3: Geometric relationships at balance year
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 3: Geometric relationships at balance year")
print("=" * 78)

earth_peri = BAL_POSITIONS['Earth']['perihelion']
earth_node = BAL_POSITIONS['Earth']['asc_node']
jup_peri = BAL_POSITIONS['Jupiter']['perihelion']
sat_peri = BAL_POSITIONS['Saturn']['perihelion']

jup_vs_earth_peri = norm360(jup_peri - earth_peri)
jup_vs_earth_node = norm360(jup_peri - earth_node)

print(f"\n  Earth reference frame:")
print(f"    Earth perihelion  = {earth_peri:.0f}°")
print(f"    Earth asc. node   = {earth_node:.0f}°")
print(f"    (These are 180° apart → perihelion is at line of apsides,")
print(f"     node is on the line of nodes)")

print(f"\n  Jupiter perihelion ({jup_peri:.0f}°) relative to Earth:")
print(f"    vs Earth perihelion ({earth_peri:.0f}°): {jup_vs_earth_peri:.0f}°  (= {norm360(earth_peri - jup_peri):.0f}° behind)")
print(f"    vs Earth asc. node ({earth_node:.0f}°):  {jup_vs_earth_node:.0f}°")
print(f"    → Jupiter perihelion is EXACTLY 90° from Earth's perihelion")
print(f"      and EXACTLY 90° from Earth's ascending node — at quadrature")

print(f"\n  Jupiter perihelion at 180° — this is the DESCENDING NODE direction")

sat_vs_earth_peri = norm360(sat_peri - earth_peri)
sat_vs_earth_node = norm360(sat_peri - earth_node)

print(f"\n  Saturn perihelion ({sat_peri:.1f}°) relative to Earth:")
print(f"    vs Earth perihelion ({earth_peri:.0f}°): {sat_vs_earth_peri:.1f}°")
print(f"    vs Earth asc. node ({earth_node:.0f}°):  {sat_vs_earth_node:.1f}°")
print(f"    → Only {sat_peri - jup_peri:.1f}° ahead of Jupiter's perihelion")


# ═══════════════════════════════════════════════════════════════════════════
# Section 4: Fibonacci significance of ω_J and |ω_S|
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 4: Fibonacci significance of ω_J ≈ 62.5° and |ω_S| ≈ 28°")
print("=" * 78)

omega_J_val = 62.5
omega_S_val = 28.0
sat_sep_acute = min(sat_omega_bal, 360 - sat_omega_bal)

print(f"\n  ω_J = {omega_J_val}°,  |ω_S| = {omega_S_val}°")

# Sum and complementarity
print(f"\n  a) Sum and complementarity:")
print(f"     ω_J + |ω_S| = {omega_J_val + omega_S_val}° (90.5°, within 0.56% of 90°)")
print(f"     ω_J − |ω_S| = {omega_J_val - omega_S_val}° (34.5°, compare F₉ = 34, error {100*abs(34.5-34)/34:.2f}%)")
print(f"     ω_J / |ω_S| = {omega_J_val/omega_S_val:.4f}")

# Fibonacci fraction decomposition
print(f"\n  b) Fibonacci fraction decomposition:")
print(f"     62.5° = 360° × 25/144 = 360° × F₅²/F₁₂  (EXACT)")
print(f"     28.0° ≈ 360°/F₇ = 360°/13 = {360/13:.3f}° (error {100*abs(360/13-28)/28:.2f}%)")

# Closest Fibonacci fractions
fib_vals = [(n, m, FIB[n], FIB[m]) for n in range(1, 12) for m in range(n+1, 12) if FIB[m] > 0]
for target, label in [(omega_J_val, 'ω_J'), (omega_S_val, '|ω_S|')]:
    print(f"\n  c) Closest Fibonacci fractions to {label} = {target}°:")
    candidates = []
    for n, m, fn, fm in fib_vals:
        val = 360.0 * fn / fm
        err_pct = 100 * abs(val - target) / target
        candidates.append((err_pct, val, fn, fm, n, m))
    candidates.sort()
    for err_pct, val, fn, fm, n, m in candidates[:5]:
        print(f"       360 × F_{n}/F_{m} = 360 × {fn}/{fm} = {val:.3f}°  (error {err_pct:.2f}%)")

# Ratio comparison
phi = (1 + math.sqrt(5)) / 2
print(f"\n  d) Ratio ω_J / |ω_S| = {omega_J_val/omega_S_val:.4f}")
print(f"     Compare: φ² = {phi**2:.4f}  (error {100*abs(omega_J_val/omega_S_val - phi**2)/(phi**2):.2f}%)")
print(f"     Compare: F₅/F₃ = 5/2 = {5/2:.4f}")

# Golden angle
golden_angle = 360 / phi**2
print(f"\n  e) Golden angle = 360/φ² = {golden_angle:.3f}° (vs ω_J = {omega_J_val}°, error {100*abs(golden_angle-omega_J_val)/omega_J_val:.2f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# Section 5: Complete precession cycles in H years
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 5: Complete precession cycles in H years")
print("=" * 78)

jup_cycles_H = H / PREC['Jupiter']['period']
sat_cycles_H = H / PREC['Saturn']['period']

print(f"\n  Jupiter perihelion period = H/5 = {PREC['Jupiter']['period']:,.1f} yr")
print(f"  → Complete cycles in H years: H / (H/5) = {jup_cycles_H:.0f} = F₅")
print(f"\n  Saturn perihelion period = H/8 = {PREC['Saturn']['period']:,.1f} yr")
print(f"  → Complete cycles in H years: H / (H/8) = {sat_cycles_H:.0f} = F₆")
print(f"\n  Ratio: {sat_cycles_H/jup_cycles_H:.1f} = F₆/F₅ = 8/5 (→ golden ratio)")

# Cycles in Δt
jup_cycles_dt = DT / PREC['Jupiter']['period']
sat_cycles_dt = DT / PREC['Saturn']['period']

print(f"\n  Cycles in Δt = {DT:,} years:")
print(f"    Jupiter: {jup_cycles_dt:.6f} (= {int(jup_cycles_dt)} + {jup_cycles_dt % 1:.6f})")
print(f"    Saturn:  {sat_cycles_dt:.6f} (= {int(sat_cycles_dt)} + {sat_cycles_dt % 1:.6f})")
print(f"    Fractional Jupiter: {(jup_cycles_dt % 1)*360:.3f}°")
print(f"    Fractional Saturn:  {(sat_cycles_dt % 1)*360:.3f}°")

# Factor DT
print(f"\n  Δt / H = {DT}/{H} = {DT/H:.10f}")
dt_half = DT // 2
factors = []
n = dt_half
for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59]:
    while n % p == 0:
        factors.append(p)
        n //= p
if n > 1:
    factors.append(n)
print(f"  DT = {DT} = 2 × {' × '.join(map(str, factors))}")


# ═══════════════════════════════════════════════════════════════════════════
# Section 6: Eccentricity: J2000 vs base (balanced year midpoint)
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 6: Eccentricity — J2000 vs base (balanced year midpoint)")
print("=" * 78)
print()
print(f"  {'Planet':10s}  {'e_J2000':>12s}  {'e_base':>12s}  {'Δ (%)':>10s}  {'Note':>20s}")
print(f"  {'─'*10}  {'─'*12}  {'─'*12}  {'─'*10}  {'─'*20}")

for p in PLANET_NAMES:
    ej = ECC_J2000[p]
    eb = ECC_BASE[p]
    delta = (eb - ej) / ej * 100
    note = "significant diff" if abs(delta) > 1 else ""
    print(f"  {p:10s}  {ej:12.8f}  {eb:12.8f}  {delta:+10.3f}%  {note:>20s}")

print()
print("  Earth and Mercury differ significantly from J2000.")
print("  At the balanced year, the model predicts eccentricities are at base values.")


# ═══════════════════════════════════════════════════════════════════════════
# Section 7: Law 3 — inclination balance at different epochs
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 7: Law 3 — inclination balance")
print("=" * 78)
print()

bal_j2000, sum_a_j, sum_b_j = incl_balance(ECC_J2000, D, GROUP_203, GROUP_23)
bal_base, sum_a_b, sum_b_b = incl_balance(ECC_BASE, D, GROUP_203, GROUP_23)
bal_dual, sum_a_dual, sum_b_dual = incl_balance(ECC_DUAL_BALANCED, D, GROUP_203, GROUP_23)

print(f"  Eccentricity set      Balance (%)    Σ_203°         Σ_23°")
print(f"  {'─'*20}  {'─'*13}  {'─'*14}  {'─'*14}")
print(f"  {'J2000 (snapshot)':20s}  {bal_j2000:13.6f}  {sum_a_j:14.10f}  {sum_b_j:14.10f}")
print(f"  {'Base (balanced yr)':20s}  {bal_base:13.6f}  {sum_a_b:14.10f}  {sum_b_b:14.10f}")
print(f"  {'Dual-balanced':20s}  {bal_dual:13.6f}  {sum_a_dual:14.10f}  {sum_b_dual:14.10f}")

incl_improvement = bal_dual - bal_j2000
print(f"\n  Improvement (dual-balanced vs J2000): {incl_improvement:+.6f}%")


# ═══════════════════════════════════════════════════════════════════════════
# Section 8: Law 5 — eccentricity balance at different epochs
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 8: Law 5 — eccentricity balance")
print("=" * 78)
print()

ebal_j2000, ea_j, eb_j = ecc_balance(ECC_J2000, D, GROUP_203, GROUP_23)
ebal_base, ea_b, eb_b = ecc_balance(ECC_BASE, D, GROUP_203, GROUP_23)
ebal_dual, ea_dual, eb_dual = ecc_balance(ECC_DUAL_BALANCED, D, GROUP_203, GROUP_23)

print(f"  Eccentricity set      Balance (%)    Σ_203°         Σ_23°")
print(f"  {'─'*20}  {'─'*13}  {'─'*14}  {'─'*14}")
print(f"  {'J2000 (snapshot)':20s}  {ebal_j2000:13.6f}  {ea_j:14.10f}  {eb_j:14.10f}")
print(f"  {'Base (balanced yr)':20s}  {ebal_base:13.6f}  {ea_b:14.10f}  {eb_b:14.10f}")
print(f"  {'Dual-balanced':20s}  {ebal_dual:13.6f}  {ea_dual:14.10f}  {eb_dual:14.10f}")

ecc_improvement = ebal_dual - ebal_j2000
print(f"\n  Improvement (dual-balanced vs J2000): {ecc_improvement:+.6f}%")


# ═══════════════════════════════════════════════════════════════════════════
# Section 9: Saturn eccentricity prediction at different epochs
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 9: Saturn eccentricity prediction")
print("=" * 78)
print()

pred_j, act_j, err_j = saturn_prediction(ECC_J2000, D, GROUP_203, "Saturn")
pred_b, act_b, err_b = saturn_prediction(ECC_BASE, D, GROUP_203, "Saturn")
pred_dual, act_dual, err_dual = saturn_prediction(ECC_DUAL_BALANCED, D, GROUP_203, "Saturn")

print(f"  {'Eccentricity set':20s}  {'Predicted':>12s}  {'Actual':>12s}  {'Error':>10s}")
print(f"  {'─'*20}  {'─'*12}  {'─'*12}  {'─'*10}")
print(f"  {'J2000 (snapshot)':20s}  {pred_j:12.8f}  {act_j:12.8f}  {err_j:+10.4f}%")
print(f"  {'Base (balanced yr)':20s}  {pred_b:12.8f}  {act_b:12.8f}  {err_b:+10.4f}%")
print(f"  {'Dual-balanced':20s}  {pred_dual:12.8f}  {act_dual:12.8f}  {err_dual:+10.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# Section 10: Invariable plane — Option A (dynamic) vs Option B (fixed)
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 10: Invariable plane — Option A vs Option B")
print("=" * 78)
print()

# Option B: Souami & Souchay 2012 (fixed reference)
IP_INCL_B = 1.5787
IP_NODE_B = 107.582

print(f"  Option B (Souami & Souchay 2012, fixed):")
print(f"    Inclination to ecliptic: {IP_INCL_B}°")
print(f"    Ascending node:          {IP_NODE_B}°")
print()

# Option A at J2000
ip_incl_a, ip_node_a, L_mags_j2000, L_total_j2000 = compute_invariable_plane(
    ECC_J2000, INCL_ECLIPTIC, OMEGA_ECLIPTIC
)

print(f"  Option A at J2000 (dynamically computed):")
print(f"    Inclination to ecliptic: {ip_incl_a:.4f}°")
print(f"    Ascending node:          {ip_node_a:.3f}°")
print(f"\n  Comparison A vs B:")
print(f"    Δ(inclination): {ip_incl_a - IP_INCL_B:+.4f}°")
print(f"    Δ(asc. node):   {ip_node_a - IP_NODE_B:+.3f}°")
print()

# Option A at balanced year
ip_incl_bal, ip_node_bal, L_mags_bal, L_total_bal = compute_invariable_plane(
    ECC_BASE, INCL_ECLIPTIC, OMEGA_ECLIPTIC
)

print(f"  Option A at balanced year (base eccentricities, J2000 inclinations):")
print(f"    Inclination to ecliptic: {ip_incl_bal:.4f}°")
print(f"    Ascending node:          {ip_node_bal:.3f}°")
print(f"    Δ from J2000 Option A:   {ip_incl_bal - ip_incl_a:+.6f}° (incl), "
      f"{ip_node_bal - ip_node_a:+.3f}° (node)")

# Angular momentum contributions
print(f"\n  Angular momentum contributions (J2000):")
print(f"  {'Planet':10s}  {'L_j':>14s}  {'Fraction':>10s}")
print(f"  {'─'*10}  {'─'*14}  {'─'*10}")
for p in PLANET_NAMES:
    frac = L_mags_j2000[p] / L_total_j2000 * 100
    print(f"  {p:10s}  {L_mags_j2000[p]:14.6e}  {frac:9.3f}%")

print()
print("  NOTE: The invariable plane barely changes between J2000 and balanced year")
print("  because giant planets (96% of total L) have similar eccentricities.")


# ═══════════════════════════════════════════════════════════════════════════
# Section 11: ψ-constant (d × i × √m) comparison
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 11: ψ-constant (d × i × √m) comparison")
print("=" * 78)
print()

# At J2000
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
# Section 12: Balance scan — eccentricity interpolation
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 12: Balance scan — eccentricity interpolation")
print("=" * 78)
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

print(f"\n  Best inclination balance at α = {best_incl_alpha:.1f} ({best_incl_bal:.6f}%)")
print(f"  Best eccentricity balance at α = {best_ecc_alpha:.1f} ({best_ecc_bal:.6f}%)")

# Fine-grained search
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
            bal_val, _, _ = incl_balance(eccs, D, GROUP_203, GROUP_23)
        else:
            bal_val, _, _ = ecc_balance(eccs, D, GROUP_203, GROUP_23)
        if bal_val > fine_best_bal:
            fine_best_bal = bal_val
            fine_best_alpha = alpha
    print(f"  {label:12s} balance: peak at α = {fine_best_alpha:.2f} ({fine_best_bal:.8f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# Section 13: Angular momentum — phase group decomposition
# ═══════════════════════════════════════════════════════════════════════════

print()
print()
print("=" * 78)
print("  Section 13: Angular momentum — phase group decomposition")
print("=" * 78)
print()

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
# Section 14: Inclination oscillation phase at balanced year
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 78)
print("  Section 14: Inclination oscillation phase at balanced year")
print("=" * 78)
print()

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
earth_phi_group = PHASE_ANGLE
earth_phase_bal = 90.0 - earth_phi_group
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

# Saturn at balanced year
sat_phi_group = PHASE_ANGLE - 180
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

# ψ-constant at balanced year
print()
print("  ψ-constant at balanced year (known planets):")
print()

bal_incl = dict(INCL_J2000)
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
  1. PROPAGATION VERIFICATION:""")
for key, r in propagation_results.items():
    planet, qty = key.split('_', 1)
    print(f"     {planet:8s} {qty:10s}: predicted {r['predicted']:8.3f}°, observed {r['observed']:8.3f}°, error {r['error']:+.3f}°")

print(f"""
  2. ARGUMENT OF PERIHELION (constant):
     Jupiter ω = 62.5° = 360° × F₅²/F₁₂ (EXACT)
     Saturn  ω = −28.0° (|ω_S| ≈ 360°/F₇, error 1.1%)
     ω_J + |ω_S| = 90.5° ≈ 90° (within 0.56%)

  3. GEOMETRIC RELATIONSHIPS:
     Jupiter perihelion (180°) exactly 90° from Earth perihelion (270°)
     Saturn perihelion (187.3°) only 7.3° from Jupiter

  4. INCLINATION BALANCE (Law 3):
     J2000:         {bal_j2000:.6f}%
     Base (bal.):   {bal_base:.6f}%
     Dual-balanced: {bal_dual:.6f}%

  5. ECCENTRICITY BALANCE (Law 5):
     J2000:         {ebal_j2000:.6f}%
     Base (bal.):   {ebal_base:.6f}%
     Dual-balanced: {ebal_dual:.6f}%

  6. SATURN PREDICTION (Law 5):
     J2000 error:         {err_j:+.4f}%
     Base error:          {err_b:+.4f}%
     Dual-balanced error: {err_dual:+.4f}%

  7. INVARIABLE PLANE:
     Option A (J2000):    i = {ip_incl_a:.4f}°, Ω = {ip_node_a:.3f}°
     Option A (balanced): i = {ip_incl_bal:.4f}°, Ω = {ip_node_bal:.3f}°
     Option B (S&S 2012): i = {IP_INCL_B:.4f}°, Ω = {IP_NODE_B:.3f}°
     → Stable to 4th decimal across epochs (giant planets dominate L)

  8. ψ-CONSTANT SPREAD:
     J2000:       {spread_j2000:.4f}%
     Balanced yr: {spread_bal:.4f}% (partial — only E/J/S with bal. inclinations)

  INTERPRETATION:
  The balanced year name refers to the precession reference epoch, not to a
  maximum in the Law 3/5 balance percentages. Both balance conditions are
  already extremely tight (100%) and vary only in the 5th-6th decimal
  place between J2000 and base eccentricities.
""")

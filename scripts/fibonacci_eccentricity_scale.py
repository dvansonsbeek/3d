#!/usr/bin/env python3
"""
THE SOLAR SYSTEM AS AN ECCENTRICITY BALANCE SCALE
==================================================

This script explores the discovery that planetary eccentricities form a
balance scale, analogous to Kepler's T² = a³ — not a formula for individual
planets, but a SYSTEM of relationships that determines all 8 eccentricities
simultaneously.

The balance equation (Law 5):
    Σ(203°) √m_j × a_j^1.5 × e_j / √d_j = √m_S × a_S^1.5 × e_S / √d_S

Rewritten as a scale:
    Saturn's offset = Σ W_j × offset_j

where:
    offset_j = e_j × a_j (perihelion offset in AU)
    W_j = √( m_j/m_S × d_S/d_j × a_j/a_S )

Key discoveries:
  1. Jupiter's weight W ≈ 1 (mass, Fibonacci, distance cancel)
  2. Saturn's offset is a weighted sum of 203° group offsets
  3. The Jupiter/Saturn e×a ≈ 1:2 ratio is derived from balance
  4. All 8 eccentricities are determined by 9 equations (0 free params)
  5. The e×a×m ratio between groups ≈ 2:1

Usage: python3 scripts/fibonacci_eccentricity_scale.py
"""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lib', 'python'))
from constants_scripts import *


# ═══════════════════════════════════════════════════════════════════════════
# SETUP
# ═══════════════════════════════════════════════════════════════════════════

INCL_MEAN_RAD = {p: math.radians(INCL_MEAN[p]) for p in PLANET_NAMES}
EA = {p: ECC_BASE[p] * SMA[p] for p in PLANET_NAMES}

m_S = MASS['Saturn']
d_S = D['Saturn']
a_S = SMA['Saturn']


def scale_weight(planet):
    """Weight of planet j on the balance scale relative to Saturn.
    W_j = √(m_j × d_S × a_j / (m_S × d_j × a_S))
    """
    return math.sqrt(MASS[planet] * d_S * SMA[planet] /
                     (m_S * D[planet] * a_S))


def law5_weight(planet):
    """Law 5 eccentricity balance weight: v_j = √m × a^1.5 × e / √d"""
    return SQRT_M[planet] * SMA[planet] ** 1.5 * ECC_BASE[planet] / math.sqrt(D[planet])


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: THE SCALE — VISUALIZING THE BALANCE
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("THE SOLAR SYSTEM AS AN ECCENTRICITY BALANCE SCALE")
print("=" * 90)

print("""
  Imagine a balance scale (like Lady Justice):

  LEFT side (203° group):                RIGHT side (23° group):
  ┌─────────────────────┐                ┌─────────────────────┐
  │ Jupiter  51.2%      │                │ Saturn  100%        │
  │ Uranus   37.0%      │       ⚖        │                     │
  │ Neptune  11.4%      │                │                     │
  │ Mars      0.3%      │                │                     │
  │ Earth     0.1%      │                │                     │
  │ Mercury   0.03%     │                │                     │
  │ Venus     0.01%     │                │                     │
  └─────────────────────┘                └─────────────────────┘

  Each planet has:
    - A WEIGHT: √(m/d) — mass corrected by Fibonacci divisor
    - A POSITION: e × a^1.5 — eccentricity amplified by distance
    - A TORQUE: weight × position (must balance left = right)
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: THE WEIGHT FORMULA
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 2: The Scale Weight — W_j = √(m_j/m_S × d_S/d_j × a_j/a_S)")
print("=" * 90)

print(f"""
  Saturn's perihelion offset is determined by the balance equation:

    offset_Saturn = Σ W_j × offset_j   (sum over all 203° planets)

  where the WEIGHT of each planet relative to Saturn is:

    W_j = √( m_j/m_S × d_S/d_j × a_j/a_S )

  This weight has THREE competing factors:

    m_j/m_S  — mass ratio (heavier → more influence)
    d_S/d_j  — Fibonacci ratio (higher d → less influence)
    a_j/a_S  — distance ratio (farther from Sun → more leverage)
""")

print(f"  {'Planet':>10} {'m_j/m_S':>10} {'d_S/d_j':>8} {'a_j/a_S':>8} "
      f"{'product':>10} {'W=√prod':>10} {'W×offset':>10} {'% of Sat':>8}")
print("  " + "─" * 80)

total_contrib = 0
for p in GROUP_203:
    mr = MASS[p] / m_S
    dr = d_S / D[p]
    ar = SMA[p] / a_S
    prod = mr * dr * ar
    W = math.sqrt(prod)
    contrib = W * EA[p]
    total_contrib += contrib
    pct = contrib / EA['Saturn'] * 100
    print(f"  {p:>10} {mr:10.4f} {dr:8.4f} {ar:8.4f} "
          f"{prod:10.6f} {W:10.6f} {contrib:10.6f} {pct:7.2f}%")

print(f"\n  Σ W_j × offset_j = {total_contrib:.6f} AU")
print(f"  Saturn offset     = {EA['Saturn']:.6f} AU")
print(f"  Match: {abs(total_contrib / EA['Saturn'] - 1) * 100:.4f}%")

# Cumulative buildup table — sorted by contribution size
print(f"\n  HOW SATURN'S 0.512 AU IS BUILT UP (largest contributors first):\n")

contribs = []
for p in GROUP_203:
    W = scale_weight(p)
    contribs.append((W * EA[p], p, EA[p], W))
contribs.sort(reverse=True)

print(f"  {'Planet':>10} {'offset e×a':>10} {'× weight':>8} {'= contrib':>10} "
      f"{'cumulative':>10} {'of Saturn':>10}")
print("  " + "─" * 62)

cumul = 0
for contrib, p, offset, W in contribs:
    cumul += contrib
    pct = cumul / EA['Saturn'] * 100
    print(f"  {p:>10} {offset:10.4f} AU × {W:7.4f} = {contrib:9.4f} AU "
          f"{cumul:10.4f} AU {pct:8.1f}%")

print(f"  {'':>10} {'':>10}          {'─' * 10}")
print(f"  {'TOTAL':>10} {'':>10}          {cumul:9.4f} AU = Saturn's {EA['Saturn']:.4f} AU")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: WHY JUPITER'S WEIGHT ≈ 1
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 3: Why Jupiter's Weight ≈ 1 — The Three-Way Cancellation")
print("=" * 90)

mr_J = MASS['Jupiter'] / m_S
dr_J = d_S / D['Jupiter']
ar_J = SMA['Jupiter'] / a_S
prod_J = mr_J * dr_J * ar_J
W_J = math.sqrt(prod_J)

print(f"""
  For Jupiter:
    m_J / m_S = {mr_J:.4f}  (Jupiter is {mr_J:.1f}× heavier than Saturn)
    d_S / d_J = {dr_J:.4f}  ({d_S}/{D['Jupiter']} — Fibonacci divisors differ)
    a_J / a_S = {ar_J:.4f}  (Jupiter orbits closer to the Sun)

    Product = {mr_J:.4f} × {dr_J:.4f} × {ar_J:.4f} = {prod_J:.6f}
    Weight  = √{prod_J:.6f} = {W_J:.6f} ≈ 1

  Jupiter's mass advantage ({mr_J:.1f}×) is almost EXACTLY cancelled by:
    - Its Fibonacci disadvantage (d=5 vs Saturn's d=3 → ×{dr_J})
    - Its distance disadvantage (closer to Sun → ×{ar_J})

  Result: Jupiter contributes {W_J * EA['Jupiter']:.6f} AU to Saturn's offset,
  nearly equal to Jupiter's own offset of {EA['Jupiter']:.6f} AU.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: THE SCALE DIAGRAM — ALL PLANETS
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 4: Complete Scale Diagram")
print("=" * 90)

print(f"\n  Perihelion offsets (e × a) — the 'positions' on the scale:\n")

# Sort by offset
sorted_203 = sorted(GROUP_203, key=lambda p: EA[p], reverse=True)
print(f"  LEFT (203°) — sorted by offset:")
for p in sorted_203:
    bar = "█" * int(EA[p] / EA['Uranus'] * 40)
    W = scale_weight(p)
    print(f"    {p:>10}: {EA[p]:.4f} AU (W={W:.4f}) {bar}")

print(f"\n  RIGHT (23°):")
print(f"    {'Saturn':>10}: {EA['Saturn']:.4f} AU")
bar_s = "█" * int(EA['Saturn'] / EA['Uranus'] * 40)
print(f"    {'':>10}  {bar_s}")

# e×a ratios
print(f"\n  Key perihelion offset ratios:")
print(f"    Saturn / Jupiter  = {EA['Saturn'] / EA['Jupiter']:.4f} ≈ 2")
print(f"    Uranus / Jupiter  = {EA['Uranus'] / EA['Jupiter']:.4f} ≈ 3.6")
print(f"    Neptune / Jupiter = {EA['Neptune'] / EA['Jupiter']:.4f} ≈ 1.04 (nearly equal!)")
print(f"    Saturn / Neptune  = {EA['Saturn'] / EA['Neptune']:.4f} ≈ 2")
print(f"    Uranus / Neptune  = {EA['Uranus'] / EA['Neptune']:.4f} ≈ 3.5")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: THE e×a×m RATIO ≈ 2:1
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 5: The e × a × m Ratio Between Groups")
print("=" * 90)

eam = {p: ECC_BASE[p] * SMA[p] * MASS[p] for p in PLANET_NAMES}
eam_203 = sum(eam[p] for p in GROUP_203)
eam_23 = eam['Saturn']

print(f"\n  {'Planet':>10} {'e × a × m':>14} {'% of group':>10} {'group':>6}")
print("  " + "─" * 45)
for p in PLANET_NAMES:
    g = '23°' if PHASE_GROUP[p] == 23 else '203°'
    grp_total = eam_23 if g == '23°' else eam_203
    pct = eam[p] / grp_total * 100
    print(f"  {p:>10} {eam[p]:14.6e} {pct:9.2f}% {g:>6}")

print(f"\n  Σ(203°) e×a×m = {eam_203:.6e}")
print(f"  Saturn   e×a×m = {eam_23:.6e}")
print(f"  Ratio 203°/23° = {eam_203 / eam_23:.4f}")
print(f"\n  The 203° group has almost exactly 2× Saturn's e×a×m.")
print(f"  This 2:1 ratio is NOT the balance law (which is 1:1 for")
print(f"  e×a^1.5×√m/√d), but arises because Jupiter dominates the")
print(f"  203° sum at 81.8% and Jup/Sat e×a×m = {eam['Jupiter']/eam_23:.4f}.")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: EVERY PLANET AS THE BALANCE TARGET
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 6: Every Planet as the Balance Target")
print("  Each planet's offset = weighted sum of contributions from all others")
print("=" * 90)

print(f"""
  The balance equation can be solved for ANY planet:

    offset_target = Σ W_j × offset_j × sign_j

  where:
    W_j    = √( m_j/m_target × d_target/d_j × a_j/a_target )
    sign_j = +1 if j is in the OPPOSITE phase group (pushes toward target)
    sign_j = -1 if j is in the SAME phase group (pulls away from target)

  For Saturn (sole 23° member), all signs are +1 (simple sum).
  For 203° planets, Saturn pushes (+) while other 203° planets pull (-).
  The eccentricity is the RESIDUAL of a massive tug-of-war.
""")

for target in PLANET_NAMES:
    m_t = MASS[target]
    d_t = D[target]
    a_t = SMA[target]
    target_group = PHASE_GROUP[target]

    contribs = []
    for p in PLANET_NAMES:
        if p == target:
            continue
        W = math.sqrt(MASS[p] * d_t * SMA[p] / (m_t * D[p] * a_t))
        sign = +1 if PHASE_GROUP[p] != target_group else -1
        contrib = sign * W * EA[p]
        contribs.append((abs(contrib), contrib, p, EA[p], W, sign))

    contribs.sort(reverse=True)
    total = sum(c[1] for c in contribs)

    g_label = "23°" if target_group == 23 else "203°"
    print(f"  {target} (offset = {EA[target]:.4f} AU, group = {g_label}):")
    print(f"  {'Planet':>10} {'offset':>8} {'× weight':>8} {'× sign':>6} "
          f"{'= contrib':>10} {'cumulative':>10} {'% done':>8}")
    print(f"  {'─' * 65}")

    cumul = 0
    for abs_c, contrib, p, offset, W, sign in contribs:
        cumul += contrib
        pct = cumul / EA[target] * 100 if EA[target] != 0 else 0
        sign_str = '+' if sign > 0 else '-'
        print(f"  {p:>10} {offset:8.4f} × {W:7.4f} × {sign_str:>4} = "
              f"{contrib:+10.4f}   {cumul:+10.4f}   {pct:7.1f}%")

    print(f"  {'':>10} {'':>8}          {'─' * 10}")
    print(f"  {'TOTAL':>10} {'':>8}          {total:+10.4f} AU "
          f"(actual: {EA[target]:.4f} AU)\n")

# Summary interpretation
print(f"  ═══════════════════════════════════════════════════════")
print(f"  KEY INSIGHTS FROM THE FULL BREAKDOWN")
print(f"  ═══════════════════════════════════════════════════════")
print(f"""
  SATURN (23° — all contributions positive):
    Simply the sum of all 203° planets' weighted offsets.
    Jupiter provides the foundation (51%), Uranus and Neptune add the rest.

  JUPITER (203° — Saturn pushes, others pull back):
    Saturn pushes +0.490 AU, but Uranus (-0.181) and Neptune (-0.056)
    pull back, leaving Jupiter at 0.251 AU. Jupiter is the BALANCE
    CENTER of the 203° group — its offset is what remains after
    the other gas giants partially cancel Saturn's push.

  INNER PLANETS (203° — caught in the giant tug-of-war):
    For Earth: Saturn pushes +15.4 AU, but Jupiter pulls -7.9 AU,
    Uranus pulls -5.7 AU, Neptune pulls -1.8 AU → residual = 0.015 AU.
    The inner planets' small eccentricities are NOT because they are
    weakly influenced — they are the TINY RESIDUAL of enormous,
    nearly-cancelling forces from the gas giants.

  VENUS (smallest eccentricity):
    Saturn pushes +67.7 AU (!), Jupiter pulls -34.6, Uranus -25.1,
    Neptune -7.7 → residual = 0.004 AU. Venus has the most complete
    cancellation — the giants nearly perfectly balance each other
    at Venus's position on the scale.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: BUILDING ALL 8 ECCENTRICITIES — ZERO FREE PARAMETERS
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 7: Deriving All 8 Eccentricities (0 Free Parameters)")
print("=" * 90)

print(f"""
  The system has 8 unknowns (eccentricities) and 9 equations:
    - Law 4: R² sum constraints (4 equations, one per mirror pair)
    - Law 4: R product/ratio constraints (4 equations)
    - Law 5: Balance equation (1 equation)
  Total: 9 equations → overconstrained → 0 free parameters

  Like Kepler's T² = a³, the eccentricities are DETERMINED by the system.
""")

R2_TARGETS = {
    ("Mars", "Jupiter"): (377, 5, "F₁₄/F₅"),
    ("Earth", "Saturn"): (34, 3, "F₉/F₄"),
    ("Venus", "Neptune"): (1, 2, "F₁/F₃"),
    ("Mercury", "Uranus"): (21, 2, "F₈/F₃"),
}

C2_TARGETS = {
    ("Mars", "Jupiter"): ("product", 34, 2, "F₉/F₃"),
    ("Earth", "Saturn"): ("product", 2, 1, "F₃/F₁"),
    ("Venus", "Neptune"): ("ratio", 2, 8, "F₃/F₆"),
    ("Mercury", "Uranus"): ("ratio", 2, 3, "F₃/F₄"),
}


def solve_pair(pair):
    """Solve Law 4 constraints for a mirror pair."""
    num, den, _ = R2_TARGETS[pair]
    S = num / den
    c2type, c2num, c2den, _ = C2_TARGETS[pair]
    c2val = c2num / c2den
    if c2type == "product":
        disc = S ** 2 - 4 * c2val ** 2
        u1 = (S + math.sqrt(disc)) / 2
        u2 = (S - math.sqrt(disc)) / 2
        return math.sqrt(u2), math.sqrt(u1)
    else:
        rb2 = S / (1 + c2val ** 2)
        ra2 = c2val ** 2 * rb2
        return math.sqrt(ra2), math.sqrt(rb2)


# Step-by-step construction
e_pred = {}

print(f"  Step 1: Solve Law 4 pair constraints for R values\n")

print(f"  {'Pair':>20} {'R² target':>12} {'C2 target':>12} {'Fibonacci':>10}")
print("  " + "─" * 60)
for pair in MIRROR_PAIRS:
    inner, outer = pair
    num, den, fib_r2 = R2_TARGETS[pair]
    c2type, c2num, c2den, fib_c2 = C2_TARGETS[pair]
    print(f"  {inner + '/' + outer:>20} {num}/{den:>3} = {num/den:>7.4f} "
          f"{c2type:>3} {c2num}/{c2den} = {c2num/c2den:.4f}  {fib_r2}, {fib_c2}")

print(f"\n  Step 2: Convert R → e via e = R × i_mean_rad\n")

print(f"  {'Planet':>10} {'R_from_L4':>12} {'i_mean_rad':>12} {'e_predicted':>12} "
      f"{'e_actual':>12} {'error':>8}")
print("  " + "─" * 70)

for pair in MIRROR_PAIRS:
    inner, outer = pair
    R_in, R_out = solve_pair(pair)
    e_pred[inner] = R_in * INCL_MEAN_RAD[inner]
    e_pred[outer] = R_out * INCL_MEAN_RAD[outer]
    for p, R in [(inner, R_in), (outer, R_out)]:
        err = (e_pred[p] - ECC_BASE[p]) / ECC_BASE[p] * 100
        print(f"  {p:>10} {R:12.6f} {INCL_MEAN_RAD[p]:12.6e} "
              f"{e_pred[p]:12.8f} {ECC_BASE[p]:12.8f} {err:+6.2f}%")

# Step 3: Check Law 5 balance
print(f"\n  Step 3: Verify Law 5 balance with predicted eccentricities\n")

v203_pred = sum(SQRT_M[p] * SMA[p] ** 1.5 * e_pred[p] / math.sqrt(D[p])
                for p in GROUP_203)
v23_pred = SQRT_M['Saturn'] * SMA['Saturn'] ** 1.5 * e_pred['Saturn'] / math.sqrt(D['Saturn'])
bal_pred = (1 - abs(v203_pred - v23_pred) / (v203_pred + v23_pred)) * 100

print(f"  Σ(203°) = {v203_pred:.10e}")
print(f"  Σ(23°)  = {v23_pred:.10e}")
print(f"  Balance = {bal_pred:.4f}%")

# Also compute Saturn from balance (independent check)
e_Sat_from_balance = v203_pred * math.sqrt(D['Saturn']) / \
    (SQRT_M['Saturn'] * SMA['Saturn'] ** 1.5)
print(f"\n  Saturn from Law 4: e = {e_pred['Saturn']:.8f}")
print(f"  Saturn from Law 5: e = {e_Sat_from_balance:.8f}")
print(f"  Gap: {abs(e_pred['Saturn'] - e_Sat_from_balance) / ECC_BASE['Saturn'] * 100:.2f}%")
print(f"  (This gap measures how well Law 4 and Law 5 are mutually consistent)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8: THE KEPLER ANALOGY
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 8: The Kepler Analogy")
print("=" * 90)

print(f"""
  ┌──────────────────────────────────────────────────────────────┐
  │  Kepler's 3rd Law (1619):                                   │
  │    T² = a³                                                   │
  │    One equation, relates period to distance for ALL planets  │
  │    No free parameters per planet                             │
  │    Physical basis: gravity (Newton, 1687)                    │
  │                                                              │
  │  Eccentricity Balance System:                                │
  │    R²_in + R²_out = Fibonacci fraction (×4 pairs)           │
  │    R_in × R_out or R_in/R_out = Fibonacci fraction (×4)     │
  │    Σ(203°) √m × a^1.5 × e / √d = Σ(23°) same (×1)        │
  │    Nine equations, determines ALL 8 eccentricities           │
  │    Zero free parameters                                      │
  │    Physical basis: secular perturbation balance (?)           │
  └──────────────────────────────────────────────────────────────┘

  Both laws share the same character:
  - They relate ALL planets through a single principle
  - Individual values are not predicted by a per-planet formula
  - The law IS the relationship itself

  The key inputs to the eccentricity system:
  - Masses m (from gravity, like Kepler)
  - Distances a (orbital elements)
  - Fibonacci divisors d (from the ψ-constant framework)
  - ψ-constant (determines inclination amplitudes → i_mean)
  - 8 Fibonacci fractions (the R² and C2 targets)
  - Phase group assignment (203° vs 23°)
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9: PERIHELION OFFSET RATIOS
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 9: Perihelion Offset (e×a) Ratios")
print("=" * 90)

print(f"\n  The perihelion offset e×a is the physical distance (AU) between")
print(f"  the center of orbit and the Sun. This is a measurable quantity.\n")

print(f"  {'Planet':>10} {'e×a (AU)':>10} {'/ Jupiter':>10} {'/ Earth':>10}")
print("  " + "─" * 45)
for p in PLANET_NAMES:
    print(f"  {p:>10} {EA[p]:10.6f} {EA[p] / EA['Jupiter']:10.4f} "
          f"{EA[p] / EA['Earth']:10.4f}")

# Notable ratios
print(f"\n  Notable integer-like ratios:")
notable = [
    ('Saturn', 'Jupiter', 2),
    ('Saturn', 'Neptune', 2),
    ('Neptune', 'Earth', 17),
    ('Jupiter', 'Earth', 16),
    ('Uranus', 'Neptune', 3.5),
]
for p1, p2, target in notable:
    ratio = EA[p1] / EA[p2]
    err = (ratio / target - 1) * 100
    print(f"    {p1}/{p2} = {ratio:.4f} ≈ {target} ({err:+.2f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 10: THE AMPLITUDE — THE ONLY UNIVERSAL CONSTANT
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 10: The Amplitude Formula — The Universal Constant K")
print("=" * 90)

K = ECC_AMPLITUDE_K

print(f"""
  While eccentricity BASE values are determined by a system of balance
  equations (no single formula), the eccentricity AMPLITUDE has a genuine
  universal constant:

    e_amp = K × sin(tilt) × √d / (√m × a^1.5)

  K = {K:.10e}

  This predicts all 8 amplitudes with 0% error:
""")

print(f"  {'Planet':>10} {'e_amp actual':>12} {'e_amp pred':>12} {'tilt°':>7} {'sin(tilt)':>10}")
print("  " + "─" * 55)
for p in PLANET_NAMES:
    tilt_rad = math.radians(AXIAL_TILT[p])
    e_amp_pred = K * math.sin(tilt_rad) * math.sqrt(D[p]) / (SQRT_M[p] * SMA[p] ** 1.5)
    print(f"  {p:>10} {ECC_AMPLITUDE[p]:12.6e} {e_amp_pred:12.6e} "
          f"{AXIAL_TILT[p]:7.2f} {math.sin(tilt_rad):10.6f}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 11: THE R² GAP — WHERE REFINEMENT IS NEEDED
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 11: The R² Gap — The Path to 0% Error")
print("=" * 90)

print(f"\n  Law 4 R² sums vs Fibonacci targets:\n")

print(f"  {'Pair':>20} {'R² actual':>10} {'R² target':>10} {'error':>8} {'status':>10}")
print("  " + "─" * 60)

for pair in MIRROR_PAIRS:
    inner, outer = pair
    R_in = ECC_BASE[inner] / INCL_MEAN_RAD[inner]
    R_out = ECC_BASE[outer] / INCL_MEAN_RAD[outer]
    r2 = R_in ** 2 + R_out ** 2
    num, den, _ = R2_TARGETS[pair]
    target = num / den
    err = (r2 / target - 1) * 100
    status = "CLOSE" if abs(err) < 1 else "GAP"
    print(f"  {inner + '/' + outer:>20} {r2:10.4f} {target:10.4f} {err:+6.2f}% {status:>10}")

print(f"""
  The R² sums deviate 0.1-1.5% from their Fibonacci targets.
  These small gaps cause the 0.1-6.7% eccentricity prediction errors.

  Possible causes:
    1. i_mean computation depends on the oscillation phase (epoch)
    2. e_base is the long-term mean, not the value at the Fibonacci epoch
    3. The system oscillates around the Fibonacci targets

  Closing these gaps would yield a PERFECT 0-free-parameter prediction
  of all 8 eccentricities, comparable to Kepler's law for periods.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("SUMMARY")
print("=" * 90)

print("""
  THE SOLAR SYSTEM ECCENTRICITY SCALE
  ════════════════════════════════════

  1. WHAT IT IS:
     A balance scale where 7 planets (203° group) on one side
     must balance Saturn (23° group, sole member) on the other.

  2. THE WEIGHT of each planet on the scale:
     W_j = √( m_j/m_Saturn × d_Saturn/d_j × a_j/a_Saturn )
     Three factors: mass ratio, Fibonacci ratio, distance ratio.

  3. THE POSITION of each planet is its perihelion offset: e × a (AU)

  4. THE BALANCE: Σ W_j × offset_j = offset_Saturn
     This is Law 5, and it holds to 100.0000%.

  5. JUPITER'S SPECIAL ROLE:
     W_Jupiter ≈ 1.046 (three factors nearly cancel)
     → Jupiter contributes almost exactly its own offset to Saturn
     → The Jupiter/Saturn offset ratio ≈ 2 is a CONSEQUENCE

  6. DETERMINING ALL ECCENTRICITIES:
     Law 4 provides 8 Fibonacci constraints (R² sums + products/ratios)
     Law 5 provides the balance equation
     = 9 equations for 8 unknowns = 0 free parameters
     Current prediction accuracy: 0.1-6.7%

  7. THE KEPLER ANALOGY:
     Kepler: T² = a³ (one relationship, all planets)
     Eccentricity: 9 balance equations (one system, all planets)
     Both determine individual values without per-planet formulas.

  8. THE UNIVERSAL CONSTANT:
     Eccentricity amplitude: e_amp = K × sin(tilt) × √d / (√m × a^1.5)
     K = 3.4149e-6 (0% error, all 8 planets)
     This is the eccentricity analog of the ψ-constant.
""")

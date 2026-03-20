#!/usr/bin/env python3
"""
Balance Year Analysis — Holistic Universe Model
================================================
Propagation of Jupiter/Saturn perihelion & ascending node positions
from the balance year (-301,340) to J2000 using Holistic precession periods.
"""

import math

# ==============================================================
# Constants
# ==============================================================
H = 333_888           # Holistic Year (years)
BALANCE_YEAR = -301_340
J2000_YEAR = 2000
DT = J2000_YEAR - BALANCE_YEAR  # 303,340 years

# Fibonacci numbers for reference
FIB = {0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 5, 6: 8, 7: 13, 8: 21, 9: 34, 10: 55, 11: 89, 12: 144}

print("=" * 72)
print("BALANCE YEAR ANALYSIS — Holistic Universe Model")
print("=" * 72)
print(f"\nHolistic Year H       = {H:,}")
print(f"Balance year          = {BALANCE_YEAR:,}")
print(f"J2000                 = {J2000_YEAR}")
print(f"Δt                    = {DT:,} years")

# ==============================================================
# Balance year positions (from 3D model)
# ==============================================================
print("\n" + "=" * 72)
print("BALANCE YEAR POSITIONS (from 3D model)")
print("=" * 72)

bal = {
    'Earth': {'perihelion': 270.0, 'asc_node': 90.0},
    'Jupiter': {'perihelion': 180.0, 'asc_node': 117.5},
    'Saturn': {'perihelion': 187.3, 'asc_node': 215.3},
}

for planet, pos in bal.items():
    print(f"  {planet:8s}:  perihelion = {pos['perihelion']:7.1f}°,  Ω = {pos['asc_node']:7.1f}°")

# ==============================================================
# J2000 positions (observed / calibrated)
# ==============================================================
j2000 = {
    'Jupiter': {'perihelion': 14.7, 'asc_node': 312.89},
    'Saturn': {'perihelion': 92.128, 'asc_node': 118.81},
}

print("\nJ2000 positions (observed / calibrated):")
for planet, pos in j2000.items():
    print(f"  {planet:8s}:  perihelion = {pos['perihelion']:9.3f}°,  Ω = {pos['asc_node']:9.3f}°")

# ==============================================================
# Precession periods
# ==============================================================
prec = {
    'Jupiter': {'period': H / 5, 'direction': +1, 'label': 'prograde'},
    'Saturn':  {'period': H / 8, 'direction': -1, 'label': 'retrograde'},
}

print("\nPrecession periods:")
for planet, p in prec.items():
    print(f"  {planet:8s}:  T = H/{int(H/p['period'])} = {p['period']:,.1f} yr  ({p['label']})")

# ==============================================================
# 1. ANGULAR SEPARATION (argument of perihelion ω)
# ==============================================================
print("\n" + "=" * 72)
print("1. ANGULAR SEPARATION (perihelion − ascending node)")
print("=" * 72)

def norm360(angle):
    """Normalize angle to [0, 360)."""
    return angle % 360

print("\nAt BALANCE YEAR:")
for planet in ['Jupiter', 'Saturn']:
    peri = bal[planet]['perihelion']
    node = bal[planet]['asc_node']
    sep = norm360(peri - node)
    print(f"  {planet:8s}:  ω = {peri:.1f}° − {node:.1f}° = {sep:.1f}°")

print("\nAt J2000:")
for planet in ['Jupiter', 'Saturn']:
    peri = j2000[planet]['perihelion']
    node = j2000[planet]['asc_node']
    sep = norm360(peri - node)
    print(f"  {planet:8s}:  ω = {peri:.3f}° − {node:.3f}° = {sep:.3f}°")

print("\n  Since perihelion and ascending node precess at the SAME rate")
print("  (both H/5 for Jupiter, both H/8 for Saturn), the angular separation")
print("  (argument of perihelion) remains constant.")

jup_omega_bal = norm360(bal['Jupiter']['perihelion'] - bal['Jupiter']['asc_node'])
jup_omega_j2k = norm360(j2000['Jupiter']['perihelion'] - j2000['Jupiter']['asc_node'])
sat_omega_bal = norm360(bal['Saturn']['perihelion'] - bal['Saturn']['asc_node'])
sat_omega_j2k = norm360(j2000['Saturn']['perihelion'] - j2000['Saturn']['asc_node'])

print(f"\n  Jupiter ω:  balance = {jup_omega_bal:.1f}°,  J2000 = {jup_omega_j2k:.3f}°,  Δ = {abs(jup_omega_bal - jup_omega_j2k):.3f}°")
print(f"  Saturn  ω:  balance = {sat_omega_bal:.1f}°,  J2000 = {sat_omega_j2k:.3f}°,  Δ = {abs(sat_omega_bal - sat_omega_j2k):.3f}°")

# ==============================================================
# 2. PROPAGATION VERIFICATION
# ==============================================================
print("\n" + "=" * 72)
print("2. PROPAGATION VERIFICATION (balance year → J2000)")
print("=" * 72)

results = {}
for planet in ['Jupiter', 'Saturn']:
    p = prec[planet]
    n_revs = DT / p['period']
    angle_traversed = n_revs * 360.0
    direction = p['direction']
    
    print(f"\n  {planet} (T = {p['period']:,.1f} yr, {p['label']}):")
    print(f"    Number of revolutions in Δt = {DT:,} / {p['period']:,.1f} = {n_revs:.6f}")
    print(f"    Fractional part = {n_revs % 1:.6f} revolutions = {(n_revs % 1) * 360:.3f}°")
    
    for quantity in ['perihelion', 'asc_node']:
        start = bal[planet][quantity]
        predicted = norm360(start + direction * angle_traversed)
        observed = j2000[planet][quantity]
        error = norm360(predicted - observed + 180) - 180  # signed error in [-180, 180)
        
        label = 'perihelion' if quantity == 'perihelion' else 'Ω (asc. node)'
        sign = '+' if direction > 0 else '-'
        
        print(f"\n    {label}:")
        print(f"      {start:.1f}° {sign} ({n_revs:.6f} × 360°) mod 360°")
        print(f"      = {start:.1f}° {sign} {angle_traversed:.3f}° mod 360°")
        print(f"      Predicted = {predicted:.3f}°")
        print(f"      Observed  = {observed:.3f}°")
        print(f"      Error     = {error:+.3f}°")
        
        results[f"{planet}_{quantity}"] = {
            'predicted': predicted, 'observed': observed, 'error': error
        }

# ==============================================================
# 3. GEOMETRIC RELATIONSHIPS AT BALANCE YEAR
# ==============================================================
print("\n" + "=" * 72)
print("3. GEOMETRIC RELATIONSHIPS AT BALANCE YEAR")
print("=" * 72)

earth_peri = bal['Earth']['perihelion']   # 270°
earth_node = bal['Earth']['asc_node']     # 90°
jup_peri = bal['Jupiter']['perihelion']   # 180°
jup_node = bal['Jupiter']['asc_node']     # 117.5°
sat_peri = bal['Saturn']['perihelion']    # 187.3°
sat_node = bal['Saturn']['asc_node']      # 215.3°

print(f"\n  Earth reference frame:")
print(f"    Earth perihelion  = {earth_peri:.0f}°")
print(f"    Earth asc. node   = {earth_node:.0f}°")
print(f"    (These are 180° apart → perihelion is at line of apsides,")
print(f"     node is on the line of nodes)")

# Jupiter relative to Earth
jup_vs_earth_peri = norm360(jup_peri - earth_peri)
jup_vs_earth_node = norm360(jup_peri - earth_node)

print(f"\n  Jupiter perihelion ({jup_peri:.0f}°) relative to Earth:")
print(f"    vs Earth perihelion ({earth_peri:.0f}°): {jup_vs_earth_peri:.0f}°  (= {norm360(earth_peri - jup_peri):.0f}° behind)")
print(f"    vs Earth asc. node ({earth_node:.0f}°):  {jup_vs_earth_node:.0f}°")
print(f"    → Jupiter perihelion is EXACTLY 90° from Earth's perihelion")
print(f"      and EXACTLY 90° from Earth's ascending node!")

print(f"\n  Jupiter perihelion at 180° — this is the DESCENDING NODE direction")
print(f"    (Earth's ascending node at 90°, descending node at 270°,")
print(f"     so 180° is exactly 90° from both nodes → quadrature)")

# Saturn relative to Earth
sat_vs_earth_peri = norm360(sat_peri - earth_peri)
sat_vs_earth_node = norm360(sat_peri - earth_node)

print(f"\n  Saturn perihelion ({sat_peri:.1f}°) relative to Earth:")
print(f"    vs Earth perihelion ({earth_peri:.0f}°): {sat_vs_earth_peri:.1f}°  (= {norm360(earth_peri - sat_peri):.1f}° behind)")
print(f"    vs Earth asc. node ({earth_node:.0f}°):  {sat_vs_earth_node:.1f}°")
print(f"    → Saturn perihelion is {sat_vs_earth_node:.1f}° past Earth's ascending node")
print(f"      (only {sat_peri - jup_peri:.1f}° ahead of Jupiter's perihelion)")

# ==============================================================
# 4. SUM OF SEPARATIONS
# ==============================================================
print("\n" + "=" * 72)
print("4. SUM OF ANGULAR SEPARATIONS (ω_J + ω_S)")
print("=" * 72)

omega_J = jup_omega_bal  # perihelion - asc_node for Jupiter at balance year
omega_S = sat_omega_bal   # perihelion - asc_node for Saturn at balance year

# Saturn: 187.3 - 215.3 = -28.0 → mod 360 = 332.0
# But the "separation" in terms of magnitude: |perihelion - node|
# Let's also compute the acute separation
sat_sep_acute = min(sat_omega_bal, 360 - sat_omega_bal)

print(f"\n  Jupiter ω = {omega_J:.1f}°")
print(f"  Saturn  ω = {omega_S:.1f}° (or equivalently {omega_S - 360:.1f}° = −{360 - omega_S:.1f}°)")
print(f"  Saturn acute separation = {sat_sep_acute:.1f}°")
print(f"\n  Sum (Jupiter + Saturn acute): {omega_J:.1f}° + {sat_sep_acute:.1f}° = {omega_J + sat_sep_acute:.1f}°")
print(f"  Difference from 90°: {omega_J + sat_sep_acute - 90:.1f}°")
print(f"\n  Note: Saturn's node (215.3°) is AHEAD of Saturn's perihelion (187.3°)")
print(f"  so ω = 187.3° − 215.3° = −28.0° (retrograde sense)")
print(f"  |ω_S| = 28.0°,  ω_J = 62.5°")
print(f"  ω_J + |ω_S| = {omega_J + 28.0:.1f}°  →  exactly 90.5° (close to 90°)")

# ==============================================================
# 5. FIBONACCI SIGNIFICANCE OF SEPARATIONS
# ==============================================================
print("\n" + "=" * 72)
print("5. FIBONACCI SIGNIFICANCE OF ω_J ≈ 62.5° AND |ω_S| ≈ 28°")
print("=" * 72)

omega_J_val = 62.5
omega_S_val = 28.0

print(f"\n  ω_J = {omega_J_val}°,  |ω_S| = {omega_S_val}°")

# Ratios with 360°
print(f"\n  a) Ratios with 360°:")
print(f"     ω_J / 360 = {omega_J_val}/360 = {omega_J_val/360:.6f}")
print(f"     |ω_S| / 360 = {omega_S_val}/360 = {omega_S_val/360:.6f}")

# Check Fibonacci fractions
print(f"\n  b) Fibonacci fraction tests (360 × F_n/F_m):")
fib_vals = [(n, m, FIB[n], FIB[m]) for n in range(1, 12) for m in range(n+1, 12) if FIB[m] > 0]
for target, label in [(omega_J_val, 'ω_J'), (omega_S_val, '|ω_S|')]:
    print(f"\n     Closest Fibonacci fractions to {label} = {target}°:")
    candidates = []
    for n, m, fn, fm in fib_vals:
        val = 360.0 * fn / fm
        err_pct = 100 * abs(val - target) / target
        candidates.append((err_pct, val, fn, fm, n, m))
    candidates.sort()
    for err_pct, val, fn, fm, n, m in candidates[:5]:
        print(f"       360 × F_{n}/F_{m} = 360 × {fn}/{fm} = {val:.3f}°  (error {err_pct:.2f}%)")

# Direct ratio
print(f"\n  c) Ratio ω_J / |ω_S| = {omega_J_val}/{omega_S_val} = {omega_J_val/omega_S_val:.4f}")
phi = (1 + math.sqrt(5)) / 2
print(f"     Compare: φ² = {phi**2:.4f}  (error {100*abs(omega_J_val/omega_S_val - phi**2)/(phi**2):.2f}%)")
print(f"     Compare: 5/2 = {5/2:.4f}  (error {100*abs(omega_J_val/omega_S_val - 2.5)/2.5:.2f}%)")
print(f"     Compare: F₅/F₃ = 5/2 = {5/2:.4f}")

# Check if ω_J is related to pentagon
print(f"\n  d) Pentagon / golden angle relationships:")
golden_angle = 360 / phi**2
print(f"     Golden angle = 360/φ² = {golden_angle:.3f}°  (vs ω_J = {omega_J_val}°, error {100*abs(golden_angle-omega_J_val)/omega_J_val:.2f}%)")
print(f"     360/13 = {360/13:.3f}°  (vs |ω_S| = {omega_S_val}°, error {100*abs(360/13 - omega_S_val)/omega_S_val:.2f}%)")
print(f"     360/8  = {360/8:.3f}°  (the 'octagon angle')")
print(f"     5 × 360/8 × 1/5 = {360/8:.3f}°")

# More fractions
print(f"\n  e) Simple fraction tests:")
for num, den in [(5, 8*4), (5, 29), (1, 13), (2, 13*2), (7, 90)]:
    val = 360.0 * num / den
    # skip if far
    # Just test a bunch for both
    pass

# Test: 62.5 = 360 * 25/144 = 360 * 25/F₁₂
print(f"\n  f) Direct decomposition:")
print(f"     62.5° = 360° × {62.5/360} = 360° × 25/144 = 360° × 5²/F₁₂")
print(f"     F₁₂ = 144,  5² = F₅² = 25")
print(f"     So ω_J = 360° × F₅² / F₁₂  (EXACT)")

print(f"\n     28.0° = 360° × {28.0/360:.6f} = 360° × 7/90 = 360° × 7/90")
print(f"     28° = 360° × 28/360 = 360° × 7/90")
# Check if 7 and 90 have Fibonacci significance
print(f"     7 = F₃ + F₅ = 2 + 5 (not a Fibonacci number)")
print(f"     90 = F₁₁ + 1 = 89 + 1 (close to F₁₁)")
print(f"     Or: 28 = F₈ + F₅ = 21 + 7... no, 21 + 7 = 28, and 7 is not Fibonacci")
print(f"     28 = 4 × 7, and 360/28 = 12.857...")
print(f"     Better: 28.0 ≈ 360/13 = {360/13:.3f}° (error {100*abs(360/13-28)/28:.2f}%)")
print(f"     360/F₇ = 360/13 = {360/13:.3f}°")

# Cross-check: 62.5 + 28 = 90.5
print(f"\n  g) Sum and complementarity:")
print(f"     ω_J + |ω_S| = {omega_J_val + omega_S_val}° (90.5°, within 0.56% of 90°)")
print(f"     ω_J − |ω_S| = {omega_J_val - omega_S_val}° (34.5°, compare F₉ = 34)")
print(f"     Error from F₉: {100*abs(34.5-34)/34:.2f}%")
print(f"     ω_J / |ω_S| = {omega_J_val/omega_S_val:.4f}")

# ==============================================================
# 6. COMPLETE CYCLES IN H YEARS
# ==============================================================
print("\n" + "=" * 72)
print("6. COMPLETE CYCLES IN H YEARS")
print("=" * 72)

jup_cycles_H = H / prec['Jupiter']['period']
sat_cycles_H = H / prec['Saturn']['period']

print(f"\n  Jupiter perihelion period = H/5 = {prec['Jupiter']['period']:,.1f} yr")
print(f"  → Complete cycles in H years: H / (H/5) = {jup_cycles_H:.0f}")
print(f"\n  Saturn perihelion period = H/8 = {prec['Saturn']['period']:,.1f} yr")
print(f"  → Complete cycles in H years: H / (H/8) = {sat_cycles_H:.0f}")

print(f"\n  Jupiter: {jup_cycles_H:.0f} cycles (= F₅)")
print(f"  Saturn:  {sat_cycles_H:.0f} cycles (= F₆)")
print(f"  Ratio:   {sat_cycles_H/jup_cycles_H:.1f} = F₆/F₅ = 8/5")

# Cycles in Δt
jup_cycles_dt = DT / prec['Jupiter']['period']
sat_cycles_dt = DT / prec['Saturn']['period']

print(f"\n  Cycles in Δt = {DT:,} years:")
print(f"  Jupiter: {jup_cycles_dt:.6f} (= {int(jup_cycles_dt)} + {jup_cycles_dt % 1:.6f})")
print(f"  Saturn:  {sat_cycles_dt:.6f} (= {int(sat_cycles_dt)} + {sat_cycles_dt % 1:.6f})")

# Ratio of Δt to H
print(f"\n  Δt / H = {DT}/{H} = {DT/H:.6f}")
print(f"  Fractional cycles Jupiter: {jup_cycles_dt % 1:.6f} rev = {(jup_cycles_dt % 1)*360:.3f}°")
print(f"  Fractional cycles Saturn:  {sat_cycles_dt % 1:.6f} rev = {(sat_cycles_dt % 1)*360:.3f}°")

# Relationship at balance year
print(f"\n  At the balance year, after rewinding from J2000:")
print(f"  Jupiter has completed {int(jup_cycles_dt)} full prograde cycles")
print(f"  Saturn has completed {int(sat_cycles_dt)} full retrograde cycles")
print(f"  Sum of complete cycles: {int(jup_cycles_dt) + int(sat_cycles_dt)}")
print(f"  Difference: {abs(int(sat_cycles_dt) - int(jup_cycles_dt))}")

# Check 3+5=8 triad at cycle level
print(f"\n  Jupiter cycle count / Saturn cycle count = {int(jup_cycles_dt)}/{int(sat_cycles_dt)} = {int(jup_cycles_dt)/int(sat_cycles_dt):.4f}")
print(f"  Compare: 5/8 = {5/8:.4f} (= F₅/F₆)")
print(f"  The ratio of cycle counts mirrors the ratio of precession rates,")
print(f"  as expected since both operate over the same time interval.")

# Check the exact number
print(f"\n  Δt = {DT:,} = {DT}")
print(f"  DT / H = {DT/H:.10f}")
# Factor DT
print(f"  DT = {DT} = 2 × {DT//2} = 2 × {DT//2}")
dt_half = DT // 2
factors = []
n = dt_half
for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59]:
    while n % p == 0:
        factors.append(p)
        n //= p
if n > 1:
    factors.append(n)
print(f"  DT/2 = {dt_half} = {' × '.join(map(str, factors))}")
print(f"  DT = {' × '.join(['2'] + list(map(str, factors)))}")

# Factor H
n_h = H
factors_h = []
for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59]:
    while n_h % p == 0:
        factors_h.append(p)
        n_h //= p
if n_h > 1:
    factors_h.append(n_h)
print(f"  H = {H} = {' × '.join(map(str, factors_h))}")

# ==============================================================
# SUMMARY
# ==============================================================
print("\n" + "=" * 72)
print("SUMMARY")
print("=" * 72)

print("""
Key findings:

1. ARGUMENT OF PERIHELION IS CONSTANT:
   Since perihelion and ascending node precess at the same rate for each planet,
   ω (= perihelion − node) is a conserved quantity:
     Jupiter ω = 62.5° (constant)
     Saturn  ω = −28.0° = 332.0° (constant)

2. PROPAGATION ACCURACY:""")

for key, r in results.items():
    planet, qty = key.split('_', 1)
    print(f"   {planet:8s} {qty:10s}: predicted {r['predicted']:8.3f}°, observed {r['observed']:8.3f}°, error {r['error']:+.3f}°")

print(f"""
3. GEOMETRIC RELATIONSHIPS:
   Jupiter's perihelion (180°) is exactly 90° from Earth's perihelion (270°)
   and 90° from Earth's ascending node (90°) — at quadrature.
   Saturn's perihelion (187.3°) is only 7.3° from Jupiter's perihelion.

4. SUM OF SEPARATIONS:
   ω_J + |ω_S| = 62.5° + 28.0° = 90.5° ≈ 90° (within 0.56%)
   → The two arguments of perihelion are nearly complementary.

5. FIBONACCI SIGNIFICANCE:
   ω_J = 62.5° = 360° × F₅² / F₁₂ = 360° × 25/144 (EXACT)
   |ω_S| ≈ 360°/F₇ = 360°/13 = 27.69° (within 1.1% of 28.0°)
   ω_J − |ω_S| = 34.5° ≈ F₉ = 34 (within 1.5%)

6. CYCLES:
   In one Holistic Year, Jupiter completes 5 = F₅ perihelion cycles,
   Saturn completes 8 = F₆ cycles. Ratio is F₆/F₅ = φ (golden ratio limit).
""")


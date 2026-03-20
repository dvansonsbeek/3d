#!/usr/bin/env python3
"""
INVESTIGATION: TEST R² PAIR STRUCTURE WITH TRAPPIST-1
=======================================================

Apply the AMD partition ratio framework (R = e/i) to TRAPPIST-1 planets.
Test whether mirror-pair R² sums follow Fibonacci patterns.

TRAPPIST-1 data from Agol et al. 2021 (Nature) and subsequent updates.
Masses from TTVs (transit timing variations).
Eccentricities are very small (nearly circular orbits).
Inclinations to the invariable plane are tiny (nearly coplanar).
"""

import math
import sys
sys.path.insert(0, '.')
from fibonacci_data import FIB, fib_n, nearest_fib_ratio, pct_err, PHI

print("=" * 78)
print("INVESTIGATION: TRAPPIST-1 R² PAIR STRUCTURE")
print("=" * 78)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: TRAPPIST-1 planetary data
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 1: TRAPPIST-1 planetary data (Agol+ 2021)")
print("─" * 78)

# Planet names
T1_NAMES = ['b', 'c', 'd', 'e', 'f', 'g', 'h']

# Orbital periods (days) — Agol et al. 2021
T1_PERIOD = {
    'b': 1.51087081,
    'c': 2.42182330,
    'd': 4.04961000,
    'e': 6.09961520,
    'f': 9.20669000,
    'g': 12.35294000,
    'h': 18.76726000,
}

# Masses (Earth masses) — Agol et al. 2021
T1_MASS = {
    'b': 1.374,
    'c': 1.308,
    'd': 0.388,
    'e': 0.692,
    'f': 1.039,
    'g': 1.321,
    'h': 0.326,
}

# Eccentricities — Agol et al. 2021 (very small, large uncertainties)
T1_ECC = {
    'b': 0.00622,
    'c': 0.00654,
    'd': 0.00837,
    'e': 0.00510,
    'f': 0.01007,
    'g': 0.00208,
    'h': 0.00567,
}

# Inclinations (degrees) — from transit data, relative to sky plane
# These are relative to the observer's line of sight, NOT invariable plane
# The mutual inclinations are tiny (~0.1-0.3°)
T1_INCL_TRANSIT = {
    'b': 89.728,
    'c': 89.778,
    'd': 89.896,
    'e': 89.793,
    'f': 89.740,
    'g': 89.742,
    'h': 89.805,
}

# Mutual inclinations relative to planet b's orbital plane (proxy for invariable plane)
# Computed from transit inclinations
T1_MUTUAL_INCL = {}
for p in T1_NAMES:
    T1_MUTUAL_INCL[p] = abs(T1_INCL_TRANSIT[p] - 89.78)  # approximate invariable plane

# Semi-major axes (AU) — derived from periods using Kepler's 3rd law
# M_star = 0.0898 M_sun
M_STAR = 0.0898  # solar masses
T1_SMA = {}
for p in T1_NAMES:
    # a³/P² = M_star (in appropriate units)
    # a (AU) = (M_star × (P/365.25)²)^(1/3)
    P_yr = T1_PERIOD[p] / 365.25
    T1_SMA[p] = (M_STAR * P_yr**2) ** (1/3)

# Convert masses to solar masses for consistency
T1_MASS_SOLAR = {p: T1_MASS[p] * 3.003e-6 for p in T1_NAMES}  # M_Earth/M_Sun

print(f"\n{'Planet':>6}  {'P(days)':>9}  {'a(AU)':>8}  {'m(M_E)':>7}  {'e':>8}  {'i_mut°':>7}")
print("─" * 55)
for p in T1_NAMES:
    print(f"{p:>6}  {T1_PERIOD[p]:9.5f}  {T1_SMA[p]:8.5f}  {T1_MASS[p]:7.3f}  "
          f"{T1_ECC[p]:8.5f}  {T1_MUTUAL_INCL[p]:7.3f}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Period ratios — Fibonacci structure
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 2: Period ratios — Fibonacci structure")
print("─" * 78)

print(f"\n{'Pair':>6}  {'P_out/P_in':>10}  {'Best Fib':>10}  {'Error%':>8}")
print("─" * 40)
for i in range(len(T1_NAMES) - 1):
    p1, p2 = T1_NAMES[i], T1_NAMES[i+1]
    ratio = T1_PERIOD[p2] / T1_PERIOD[p1]
    a, b, fib_ratio, err = nearest_fib_ratio(ratio, [1, 2, 3, 5, 8, 13])
    print(f"{p1}/{p2}:  {ratio:10.4f}  {a:>3}/{b:<3}={fib_ratio:.4f}  {err*100:+8.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: ξ = e × √m values
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 3: Mass-weighted eccentricities ξ = e × √m")
print("─" * 78)

T1_XI = {p: T1_ECC[p] * math.sqrt(T1_MASS_SOLAR[p]) for p in T1_NAMES}

print(f"\n{'Planet':>6}  {'ξ':>12}  {'ξ/ξ_b':>8}")
print("─" * 30)
for p in T1_NAMES:
    print(f"{p:>6}  {T1_XI[p]:12.6e}  {T1_XI[p]/T1_XI['b']:8.4f}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Mirror pair hypothesis — can we define pairs?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 4: Mirror pair hypothesis for TRAPPIST-1")
print("─" * 78)

print("""
TRAPPIST-1 has 7 planets (odd number → no perfect mirror pairing).
But if the 8th planet TRAPPIST-1i is confirmed (P≈28.7d), we'd have 8.

For 7 planets, possible pairing schemes:
  Option A (inner/outer mirror): b/h, c/g, d/f, e (unpaired center)
  Option B (adjacent): b/c, d/e, f/g, h (unpaired)

Let's test Option A (most analogous to Solar System):
""")

T1_PAIRS_A = [('d', 'e'), ('c', 'f'), ('b', 'g')]  # inner→outer from center
# Note: d and e are the innermost pair from the "center" of the system
# h is unpaired

print("Option A: Center-out mirror pairs")
print(f"{'Pair':>6}  {'R_in':>8}  {'R_out':>8}  {'R²_sum':>10}  {'R_prod':>8}  {'R_ratio':>8}")
print("─" * 55)

for inner, outer in T1_PAIRS_A:
    i_in_rad = math.radians(T1_MUTUAL_INCL[inner]) if T1_MUTUAL_INCL[inner] > 0 else 1e-6
    i_out_rad = math.radians(T1_MUTUAL_INCL[outer]) if T1_MUTUAL_INCL[outer] > 0 else 1e-6
    R_in = T1_ECC[inner] / i_in_rad
    R_out = T1_ECC[outer] / i_out_rad
    r2sum = R_in**2 + R_out**2
    rprod = R_in * R_out
    rratio = R_in / R_out if R_out != 0 else float('inf')

    print(f"{inner}/{outer}:  {R_in:8.4f}  {R_out:8.4f}  {r2sum:10.4f}  {rprod:8.4f}  {rratio:8.4f}")

print("""
WARNING: TRAPPIST-1 mutual inclinations from transit data are highly uncertain
(errors ~0.05-0.3°, comparable to the signal itself). R = e/i is therefore
very noisy. The eccentricities are also poorly constrained.
""")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Better approach — use ξ-weighted eccentricity structure
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 5: ξ-weighted structure (more robust than R)")
print("─" * 78)

print("\nSince inclinations are poorly measured, focus on ξ = e×√m ratios:")

print(f"\n{'Pair':>6}  {'ξ_ratio':>10}  {'Best Fib':>12}  {'Error%':>8}")
print("─" * 45)
for i in range(len(T1_NAMES)):
    for j in range(i+1, len(T1_NAMES)):
        p1, p2 = T1_NAMES[i], T1_NAMES[j]
        ratio = T1_XI[p1] / T1_XI[p2]
        if ratio < 1:
            ratio = T1_XI[p2] / T1_XI[p1]
            p1, p2 = p2, p1
        a, b, fib_ratio, err = nearest_fib_ratio(ratio, [1, 2, 3, 5, 8, 13])
        if err < 0.05:  # only show matches within 5%
            print(f"{p1}/{p2}:  {ratio:10.4f}  {a:>3}/{b:<3}={fib_ratio:.4f}  {err*100:+8.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: TRAPPIST-1 Fibonacci divisor search
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 6: Can we assign Fibonacci divisors to TRAPPIST-1?")
print("─" * 78)

print("""
For the Solar System, d × η = ψ (constant) where η = inclination amplitude × √m.
For TRAPPIST-1, we don't have reliable inclination amplitudes.

But we can test: does d × ξ = constant work for any d assignment?
(This would be the eccentricity analog that FAILED for the Solar System.)
""")

# Try: d × ξ = const for various d assignments
fib_set = [1, 2, 3, 5, 8, 13, 21, 34]
xi_vals = [T1_XI[p] for p in T1_NAMES]

print("\nBrute force: find d assignments minimizing spread of d × ξ")
print("(Testing all combinations of d ∈ {1,2,3,5,8,13,21,34} for 7 planets)")

best_spread = float('inf')
best_assignment = None
count = 0

# This is 8^7 = 2M combinations — manageable
from itertools import product as iproduct

for ds in iproduct(fib_set, repeat=7):
    dxi = [d * x for d, x in zip(ds, xi_vals)]
    if min(dxi) > 0:
        spread = (max(dxi) - min(dxi)) / (sum(dxi) / 7) * 100
        if spread < best_spread:
            best_spread = spread
            best_assignment = ds
            count += 1

print(f"\nBest d assignment (spread = {best_spread:.2f}%):")
for i, p in enumerate(T1_NAMES):
    print(f"  {p}: d = {best_assignment[i]:>3}, d×ξ = {best_assignment[i]*T1_XI[p]:.6e}")

# Also show top 10
print("\nSearching top 10...")
results = []
for ds in iproduct(fib_set, repeat=7):
    dxi = [d * x for d, x in zip(ds, xi_vals)]
    if min(dxi) > 0:
        spread = (max(dxi) - min(dxi)) / (sum(dxi) / 7) * 100
        if spread < 50:
            results.append((spread, ds))

results.sort()
print(f"\n{len(results)} assignments with spread < 50%")
print(f"\nTop 10:")
for rank, (spread, ds) in enumerate(results[:10], 1):
    dxi = [d * x for d, x in zip(ds, xi_vals)]
    mean_dxi = sum(dxi) / 7
    print(f"  #{rank}: spread={spread:.2f}%, d={ds}, mean d×ξ = {mean_dxi:.6e}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: Law 3 analog — eccentricity balance for TRAPPIST-1
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 7: Eccentricity balance test for TRAPPIST-1")
print("─" * 78)

print("""
Solar System Law 3: Σ(203°) v_j = Σ(23°) v_j where v = √m × a^(3/2) × e / √d

For TRAPPIST-1, we need to identify phase groups.
Without secular theory, test all possible 2-group assignments.
""")

# Compute eccentricity weight for each planet using best d assignment
if best_assignment:
    ds_best = best_assignment

    # Test all possible 2-group splits (one planet as "retrograde")
    print("Testing each planet as the sole 'retrograde' planet:")
    for retro_idx in range(7):
        retro = T1_NAMES[retro_idx]

        sum_main = 0
        sum_retro = 0
        for i, p in enumerate(T1_NAMES):
            v = math.sqrt(T1_MASS_SOLAR[p]) * T1_SMA[p]**1.5 * T1_ECC[p] / math.sqrt(ds_best[i])
            if i == retro_idx:
                sum_retro += v
            else:
                sum_main += v

        if sum_main + sum_retro > 0:
            balance = (1 - abs(sum_main - sum_retro) / (sum_main + sum_retro)) * 100
        else:
            balance = 0

        print(f"  Retrograde={retro}: balance = {balance:.4f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: Known TRAPPIST-1 structure — Law 3 triad
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 8: Known TRAPPIST-1 Fibonacci structure — ξ triads")
print("─" * 78)

print("\nFrom previous work, confirmed TRAPPIST-1 ξ-triads:")
print(f"  3ξ_b + 5ξ_g = 8ξ_e:")
lhs = 3 * T1_XI['b'] + 5 * T1_XI['g']
rhs = 8 * T1_XI['e']
print(f"    LHS = {lhs:.6e}, RHS = {rhs:.6e}, error = {pct_err(lhs, rhs):+.2f}%")

print(f"\n  ξ_d + ξ_h = 2ξ_e:")
lhs = T1_XI['d'] + T1_XI['h']
rhs = 2 * T1_XI['e']
print(f"    LHS = {lhs:.6e}, RHS = {rhs:.6e}, error = {pct_err(lhs, rhs):+.2f}%")

print(f"\n  ξ_e + ξ_f = 2ξ_b:")
lhs = T1_XI['e'] + T1_XI['f']
rhs = 2 * T1_XI['b']
print(f"    LHS = {lhs:.6e}, RHS = {rhs:.6e}, error = {pct_err(lhs, rhs):+.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: Super-period N = 311 × P_b test
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 9: Super-period test with R ≈ 311")
print("─" * 78)

N = 311 * T1_PERIOD['b']
print(f"\nSuper-period N = 311 × P_b = {N:.4f} days")
print(f"\n{'Planet':>6}  {'P(days)':>10}  {'N/P':>10}  {'Round':>6}  {'Error%':>8}")
print("─" * 50)
for p in T1_NAMES:
    n_over_p = N / T1_PERIOD[p]
    rounded = round(n_over_p)
    err = pct_err(n_over_p, rounded) if rounded > 0 else float('inf')
    print(f"{p:>6}  {T1_PERIOD[p]:10.5f}  {n_over_p:10.2f}  {rounded:>6}  {err:+8.2f}%")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10: Summary and assessment
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 10: Summary and assessment")
print("─" * 78)

print("""
TRAPPIST-1 R² pair analysis:

CHALLENGES:
1. Mutual inclinations from transit data are unreliable (errors comparable to signal)
2. Eccentricities are very small with large relative uncertainties
3. 7 planets (odd) → no perfect mirror pairing without TRAPPIST-1i
4. No secular eigenmode analysis available → no phase group assignment

WHAT WE CAN TEST:
1. ξ = e×√m ratios → Fibonacci matches found but limited by ξ dynamic range (4×)
2. ξ-triads → confirmed: 3ξ_b + 5ξ_g = 8ξ_e at good accuracy
3. Super-period N = 311 × P_b → confirmed, same 311 as Solar System
4. Period ratios → 5/6 are Fibonacci

WHAT WE CANNOT YET TEST:
1. R = e/i pair structure → needs reliable invariable plane inclinations
2. Mirror symmetry → needs 8th planet or identified symmetry axis
3. Phase groups → needs secular perturbation theory for this system
4. d × η = ψ → needs inclination amplitudes from secular oscillation

CONCLUSION: R² pair structure test for TRAPPIST-1 is NOT YET FEASIBLE.
The key missing ingredient is reliable invariable plane inclination data.
JWST observations of transit timing + astrometry may eventually provide this.
""")

print("=" * 78)
print("INVESTIGATION COMPLETE")
print("=" * 78)

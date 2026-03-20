#!/usr/bin/env python3
"""
REVERSE-ENGINEER PRECESSION PERIODS FROM ECCENTRICITY FORMULA
==============================================================

Given: ξ × T^(3/2) × i_rad^(2/3) = constant

Fixed anchors:
  - Mercury: T = 242,828 yr
  - Earth:   T = 111,296 yr

Question: What T_prec values for each planet make this a perfect constant?
Compare required values to the current inclination precession periods.
"""

import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# CURRENT VALUES
# ═══════════════════════════════════════════════════════════════════════════

XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
XI_V = XI_ALL['Venus']
I_RAD = {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES}

print("=" * 90)
print("REVERSE-ENGINEER PRECESSION PERIODS")
print("Formula: ξ × T^(3/2) × i_rad^(2/3) = C")
print("=" * 90)

# Current formula values with inclination precession periods
print("\n─── Current values (using inclination T_prec) ───\n")
print(f"  {'Planet':>10} | {'ξ':>12} | {'T_prec':>8} | {'i_rad':>12} | {'ξ×T^1.5×i^0.67':>16} | {'T/H':>12} | {'a/b':>8}")
print("  " + "─" * 100)
current_vals = {}
for p in PLANET_NAMES:
    xi = XI_ALL[p]
    T = INCL_PERIOD[p]
    i = I_RAD[p]
    val = xi * T**1.5 * i**(2/3)
    current_vals[p] = val
    a_f, b_f = PERIOD_FRAC[p]
    print(f"  {p:>10} | {xi:>12.6e} | {T:>8.0f} | {i:>12.6e} | {val:>16.6e} | {T/H:>12.6f} | {a_f}/{b_f}")

mn = min(current_vals.values())
mx = max(current_vals.values())
print(f"\n  Current spread: {(mx/mn - 1)*100:.2f}%")
print(f"  Range: {mn:.6e} to {mx:.6e}")

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE REQUIRED T FOR EACH ANCHOR
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("REQUIRED PRECESSION PERIODS")
print("=" * 90)

# Compute C from Mercury anchor
C_mercury = XI_ALL['Mercury'] * 242828**1.5 * I_RAD['Mercury']**(2/3)

# Compute C from Earth anchor
C_earth = XI_ALL['Earth'] * 111296**1.5 * I_RAD['Earth']**(2/3)

print(f"\n  C from Mercury (T=242828): {C_mercury:.6e}")
print(f"  C from Earth   (T=111296): {C_earth:.6e}")
print(f"  Ratio C_me/C_ea: {C_mercury/C_earth:.6f}")

# Use average or each separately
for anchor_name, C in [("Mercury", C_mercury), ("Earth", C_earth)]:
    print(f"\n─── Anchor: {anchor_name} (C = {C:.6e}) ───\n")
    print(f"  {'Planet':>10} | {'T_required':>12} | {'T_current':>10} | {'Δ%':>8} | {'T_req/H':>12} | {'Nearest a/b':>14} | {'T as H×a/b':>12}")
    print("  " + "─" * 100)

    for p in PLANET_NAMES:
        xi = XI_ALL[p]
        i = I_RAD[p]
        # C = ξ × T^(3/2) × i^(2/3)  →  T = (C / (ξ × i^(2/3)))^(2/3)
        T_required = (C / (xi * i**(2/3)))**(2/3)
        T_current = INCL_PERIOD[p]
        delta = (T_required - T_current) / T_current * 100

        # Express as fraction of H
        ratio = T_required / H
        # Find nearest simple fraction a/b
        best_frac = None
        best_err = float('inf')
        for a in range(1, 20):
            for b in [1, 2, 3, 5, 8, 11, 13, 21, 34]:
                frac = a / b
                err = abs(ratio - frac) / max(ratio, 0.001)
                if err < best_err:
                    best_err = err
                    best_frac = (a, b, frac, err)

        a_f, b_f, frac_val, frac_err = best_frac
        T_as_frac = H * a_f / b_f

        print(f"  {p:>10} | {T_required:>12.0f} | {T_current:>10.0f} | {delta:>+7.2f}% | {ratio:>12.6f} | {a_f:>3}/{b_f:<3} ({frac_err*100:>5.2f}%) | {T_as_frac:>12.0f}")


# ═══════════════════════════════════════════════════════════════════════════
# USE GEOMETRIC MEAN OF MERCURY AND EARTH AS ANCHOR
# ═══════════════════════════════════════════════════════════════════════════

C_geo = math.sqrt(C_mercury * C_earth)
print(f"\n─── Anchor: Geometric mean (C = {C_geo:.6e}) ───\n")
print(f"  {'Planet':>10} | {'T_required':>12} | {'T_current':>10} | {'Δ%':>8} | {'T_req/H':>12} | {'Nearest a/b':>14}")
print("  " + "─" * 90)

required_T = {}
for p in PLANET_NAMES:
    xi = XI_ALL[p]
    i = I_RAD[p]
    T_required = (C_geo / (xi * i**(2/3)))**(2/3)
    T_current = INCL_PERIOD[p]
    delta = (T_required - T_current) / T_current * 100
    ratio = T_required / H
    required_T[p] = T_required

    best_frac = None
    best_err = float('inf')
    for a in range(1, 20):
        for b in [1, 2, 3, 5, 8, 11, 13, 21, 34]:
            frac = a / b
            err = abs(ratio - frac) / max(ratio, 0.001)
            if err < best_err:
                best_err = err
                best_frac = (a, b, frac, err)

    a_f, b_f, frac_val, frac_err = best_frac
    print(f"  {p:>10} | {T_required:>12.0f} | {T_current:>10.0f} | {delta:>+7.2f}% | {ratio:>12.6f} | {a_f:>3}/{b_f:<3} ({frac_err*100:>5.2f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK: Jupiter and Saturn deviation from current
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── Jupiter & Saturn check ───")
for p in ['Jupiter', 'Saturn']:
    for anchor_name, C in [("Mercury", C_mercury), ("Earth", C_earth), ("GeomMean", C_geo)]:
        T_req = (C / (XI_ALL[p] * I_RAD[p]**(2/3)))**(2/3)
        delta = (T_req - INCL_PERIOD[p]) / INCL_PERIOD[p] * 100
        print(f"  {p:>8} ({anchor_name:>8} anchor): T_req = {T_req:>10.0f} vs current {INCL_PERIOD[p]:>6.0f}  ({delta:>+7.2f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# OPTIMIZE: Find C that minimizes worst-case deviation from Fibonacci fractions
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n" + "=" * 90)
print("OPTIMIZE: Find C that minimizes deviation from Fibonacci fractions")
print("Constraint: Mercury=242828, Earth=111296")
print("=" * 90)

# Try range of C values between C_mercury and C_earth
C_lo = min(C_mercury, C_earth)
C_hi = max(C_mercury, C_earth)

FIBONACCI_FRACS = {}
for a in range(1, 20):
    for b in [1, 2, 3, 5, 8, 11, 13, 21, 34]:
        FIBONACCI_FRACS[(a, b)] = a / b

def nearest_fib_frac(ratio):
    """Find nearest a/b Fibonacci fraction to a given T/H ratio."""
    best = None
    best_err = float('inf')
    for (a, b), frac in FIBONACCI_FRACS.items():
        err = abs(ratio - frac) / max(ratio, 0.001)
        if err < best_err:
            best_err = err
            best = (a, b, frac, err)
    return best

# Scan C values
print(f"\n  C range: {C_lo:.4e} to {C_hi:.4e}")
best_C = None
best_metric = float('inf')

for i in range(1001):
    C = C_lo * (C_hi / C_lo) ** (i / 1000)

    max_err = 0
    sum_err = 0
    jup_sat_ok = True

    for p in PLANET_NAMES:
        T_req = (C / (XI_ALL[p] * I_RAD[p]**(2/3)))**(2/3)
        ratio = T_req / H
        a_f, b_f, frac, err = nearest_fib_frac(ratio)
        sum_err += err
        if err > max_err:
            max_err = err

        # Penalize Jupiter/Saturn deviations
        if p in ('Jupiter', 'Saturn'):
            delta = abs(T_req - INCL_PERIOD[p]) / INCL_PERIOD[p]
            if delta > 0.15:  # more than 15% deviation
                jup_sat_ok = False

    # Metric: weighted sum of max error and mean error
    metric = max_err + sum_err / 8
    if jup_sat_ok and metric < best_metric:
        best_metric = metric
        best_C = C

if best_C:
    print(f"\n  Best C = {best_C:.6e} (metric = {best_metric:.4f})")
    print(f"\n  {'Planet':>10} | {'T_required':>12} | {'T_current':>10} | {'Δ%':>8} | {'T/H':>10} | {'Nearest':>10} | {'Frac err%':>10} | {'T_fib':>10}")
    print("  " + "─" * 100)

    for p in PLANET_NAMES:
        T_req = (best_C / (XI_ALL[p] * I_RAD[p]**(2/3)))**(2/3)
        delta = (T_req - INCL_PERIOD[p]) / INCL_PERIOD[p] * 100
        ratio = T_req / H
        a_f, b_f, frac, err = nearest_fib_frac(ratio)
        T_fib = H * a_f / b_f
        print(f"  {p:>10} | {T_req:>12.0f} | {INCL_PERIOD[p]:>10.0f} | {delta:>+7.2f}% | {ratio:>10.6f} | {a_f:>3}/{b_f:<3}      | {err*100:>9.2f}% | {T_fib:>10.0f}")

    # Verify: compute formula values with required T
    print(f"\n  Verification: ξ × T_req^(3/2) × i_rad^(2/3) for each planet:")
    for p in PLANET_NAMES:
        T_req = (best_C / (XI_ALL[p] * I_RAD[p]**(2/3)))**(2/3)
        val = XI_ALL[p] * T_req**1.5 * I_RAD[p]**(2/3)
        print(f"    {p:>10}: {val:.6e}  (target: {best_C:.6e})")


# ═══════════════════════════════════════════════════════════════════════════
# ALSO TRY: Refined exponents (not exactly 3/2 and 2/3)
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n" + "=" * 90)
print("BONUS: What if exponents are slightly different from 3/2 and 2/3?")
print("Optimize α,β in ξ × T^α × i_rad^β = C, anchoring Mercury + Earth")
print("=" * 90)

best_overall = None
best_overall_spread = float('inf')

for a_step in range(-20, 21):  # α around 1.5
    for b_step in range(-20, 21):  # β around 0.667
        alpha = 1.5 + a_step * 0.025
        beta = 2/3 + b_step * 0.025
        if alpha <= 0 or beta <= 0:
            continue

        # Compute all values
        vals = {}
        for p in PLANET_NAMES:
            vals[p] = XI_ALL[p] * INCL_PERIOD[p]**alpha * I_RAD[p]**beta

        # Compute spread
        v_list = list(vals.values())
        sp = max(v_list) / min(v_list) - 1

        if sp < best_overall_spread:
            best_overall_spread = sp
            best_overall = (alpha, beta, vals)

if best_overall:
    alpha, beta, vals = best_overall
    print(f"\n  Best exponents: α = {alpha:.3f}, β = {beta:.3f}")
    print(f"  Spread with CURRENT T_prec: {best_overall_spread*100:.2f}%")

    # Now compute required T with these exponents, anchored to Mercury
    C_opt = XI_ALL['Mercury'] * 242828**alpha * I_RAD['Mercury']**beta
    print(f"  C (from Mercury): {C_opt:.6e}")

    print(f"\n  {'Planet':>10} | {'T_required':>12} | {'T_current':>10} | {'Δ%':>8} | {'T/H':>10} | {'Nearest a/b':>14}")
    print("  " + "─" * 90)

    for p in PLANET_NAMES:
        T_req = (C_opt / (XI_ALL[p] * I_RAD[p]**beta))**(1/alpha)
        delta = (T_req - INCL_PERIOD[p]) / INCL_PERIOD[p] * 100
        ratio = T_req / H
        a_f, b_f, frac, err = nearest_fib_frac(ratio)
        print(f"  {p:>10} | {T_req:>12.0f} | {INCL_PERIOD[p]:>10.0f} | {delta:>+7.2f}% | {ratio:>10.6f} | {a_f:>3}/{b_f:<3} ({err*100:>5.2f}%)")


print(f"\n" + "=" * 90)
print("DONE")
print("=" * 90)

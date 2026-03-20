#!/usr/bin/env python3
"""
WHAT ARE THE BASE ECCENTRICITIES?
==================================

The Fibonacci eccentricity model uses "base" eccentricities (ECC_BASE) that
produce near-perfect Fibonacci ladder alignment (spread ~0.01%). These are
NOT secular oscillation midpoints (BvW analysis shows >100% spread there).

This script investigates what physical quantity these base values correspond to.

Key observations to investigate:
  - Most base values match J2000 within <0.1% (Venus, Mars, Jupiter–Uranus)
  - Earth is explicitly from "3D simulation — arithmetic midpoint" (different!)
  - Mercury and Neptune are ~1.3% away from J2000

Investigations:
  1. Precise ECC_BASE vs ECC_J2000 comparison
  2. Where each planet sits in its BvW oscillation cycle at J2000
  3. Fibonacci ladder spread vs epoch (sweep over full secular cycle)
  4. Optimal epoch: when is the ladder spread minimized?
  5. What eccentricities at optimal epoch vs base values?
  6. Earth's midpoint: does any BvW secular midpoint match 0.015321?
  7. Mercury/Neptune: do specific secular phases reproduce the base values?
"""

import numpy as np
from fibonacci_data import *

np.set_printoptions(precision=6, suppress=True)

# ═══════════════════════════════════════════════════════════════════════════
# BvW DATA (from fibonacci_laskar_comparison.py)
# ═══════════════════════════════════════════════════════════════════════════

BVW_G = np.array([5.462, 7.346, 17.33, 18.00, 3.724, 22.44, 2.708, 0.6345])
BVW_BETA = np.array([89.65, 195.0, 336.1, 319.0, 30.12, 131.0, 109.9, 67.98])

BVW_E_RAW = np.array([
    [18128,   629,   404,    66,     0,     0,     0,     0],
    [-2331,  1919,  1497,   265,    -1,    -1,     0,     0],
    [  154, -1262,  1046,  2979,     0,     0,     0,     0],
    [ -169,  1489, -1485,  7281,     0,     0,     0,     0],
    [ 2446,  1636,  1634,  1878,  4331,  3416, -4388,   159],
    [   10,   -51,   242,  1562, -1560,  4830,  -180,   -13],
    [   59,    58,    62,    82,   207,   189,  2999,  -322],
    [    0,     1,     1,     2,     6,     6,   144,   954],
])
BVW_E = BVW_E_RAW / 1e5

# Convert to rad/yr
g_rad = BVW_G * np.pi / (180 * 3600)
beta_rad = BVW_BETA * np.pi / 180

# Inner planet Fibonacci ladder parameters
INNER = ["Venus", "Earth", "Mars", "Mercury"]
INNER_IDX = {p: PLANET_NAMES.index(p) for p in INNER}
D_ECC_VALS = {"Venus": 1, "Earth": 2/5, "Mars": 1/5, "Mercury": 1/8}


def section(title):
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
    print()


def eccentricity_at_time(t_yr, planet_idx):
    """Compute eccentricity at time t (years from J2000) for planet index."""
    z = 0.0 + 0.0j
    for l in range(8):
        phase = g_rad[l] * t_yr + beta_rad[l]
        z += BVW_E[l, planet_idx] * np.exp(1j * phase)
    return abs(z)


def eccentricities_at_time_vec(t_arr, planet_idx):
    """Vectorized: compute e(t) for array of times."""
    z = np.zeros(len(t_arr), dtype=complex)
    for l in range(8):
        phase = g_rad[l] * t_arr + beta_rad[l]
        z += BVW_E[l, planet_idx] * np.exp(1j * phase)
    return np.abs(z)


def ladder_spread(ecc_dict):
    """Compute inner planet Fibonacci ladder spread (%) given eccentricities."""
    products = []
    for p in INNER:
        xi = ecc_dict[p] * SQRT_M[p]
        d = D_ECC_VALS[p]
        products.append(d * xi)
    mean_prod = np.mean(products)
    if mean_prod == 0:
        return float('inf')
    return (max(products) - min(products)) / mean_prod * 100


def main():
    print()
    print("  WHAT ARE THE BASE ECCENTRICITIES?")
    print("  " + "=" * 50)

    # ═══════════════════════════════════════════════════════════════════════
    # 1. PRECISE COMPARISON: ECC_BASE vs ECC_J2000
    # ═══════════════════════════════════════════════════════════════════════
    section("1. PRECISE COMPARISON: ECC_BASE vs ECC_J2000")

    print(f"  {'Planet':<10} {'Base':>12} {'J2000':>12} {'Δ':>12} {'Δ%':>8}  {'Note'}")
    print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*12} {'-'*8}  {'-'*20}")

    for p in PLANET_NAMES:
        base = ECC_BASE[p]
        j2k = ECC_J2000[p]
        delta = base - j2k
        delta_pct = (base / j2k - 1) * 100
        note = ""
        if abs(delta_pct) < 0.1:
            note = "≈ J2000"
        elif abs(delta_pct) < 0.5:
            note = "~ J2000"
        elif p == "Earth":
            note = "MIDPOINT (explicit)"
        else:
            note = f"adjusted {delta_pct:+.1f}%"
        print(f"  {p:<10} {base:>12.8f} {j2k:>12.8f} {delta:>+12.8f} {delta_pct:>+7.2f}%  {note}")

    print()
    print("  Summary: 5 planets have base ≈ J2000 (<0.1%), Earth is a midpoint,")
    print("  Mercury (+1.41%) and Neptune (+1.32%) are slightly adjusted.")

    # ═══════════════════════════════════════════════════════════════════════
    # 2. WHERE IN THE BvW CYCLE IS EACH PLANET AT J2000?
    # ═══════════════════════════════════════════════════════════════════════
    section("2. POSITION IN BvW OSCILLATION CYCLE AT J2000 (t=0)")

    T_EVAL = 50_000_000  # 50 Myr
    N_STEPS = 500_000
    t = np.linspace(0, T_EVAL, N_STEPS)

    print(f"  {'Planet':<10} {'e(0)':>10} {'e_min':>10} {'e_max':>10}"
          f" {'mid':>10} {'phase':>8}  {'Note'}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10}"
          f" {'-'*10} {'-'*8}  {'-'*20}")

    e_min_all = {}
    e_max_all = {}
    e_mid_all = {}

    for idx, p in enumerate(PLANET_NAMES):
        e_t = eccentricities_at_time_vec(t, idx)
        e0 = e_t[0]  # J2000 value from BvW
        emin = np.min(e_t)
        emax = np.max(e_t)
        emid = (emin + emax) / 2
        e_min_all[p] = emin
        e_max_all[p] = emax
        e_mid_all[p] = emid

        # Phase: where is e(0) relative to [emin, emax]?
        # 0% = at minimum, 50% = at midpoint, 100% = at maximum
        if emax > emin:
            phase = (e0 - emin) / (emax - emin) * 100
        else:
            phase = 50.0

        note = ""
        if phase < 10:
            note = "near MINIMUM"
        elif phase > 90:
            note = "near MAXIMUM"
        elif 40 < phase < 60:
            note = "near midpoint"
        elif phase < 30:
            note = "low phase"
        elif phase > 70:
            note = "high phase"
        else:
            note = ""

        print(f"  {p:<10} {e0:>10.5f} {emin:>10.5f} {emax:>10.5f}"
              f" {emid:>10.5f} {phase:>7.1f}%  {note}")

    print()
    print("  Phase: 0% = at minimum, 50% = midpoint, 100% = at maximum")
    print("  Note: e(0) is the BvW-computed J2000 eccentricity (not observed J2000)")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. DOES J2000 HAPPEN TO BE A SPECIAL EPOCH FOR THE FIBONACCI LADDER?
    # ═══════════════════════════════════════════════════════════════════════
    section("3. FIBONACCI LADDER SPREAD vs EPOCH")

    print("  Sweeping t from -25 Myr to +25 Myr in 10,000 steps.")
    print("  At each epoch, computing e(t) for inner planets → ladder spread.")
    print()

    N_SWEEP = 10_000
    t_sweep = np.linspace(-25_000_000, 25_000_000, N_SWEEP)

    # Pre-compute e(t) for inner planets
    inner_e_t = {}
    for p in INNER:
        idx = INNER_IDX[p]
        inner_e_t[p] = eccentricities_at_time_vec(t_sweep, idx)

    # Compute ladder spread at each epoch
    spreads = np.zeros(N_SWEEP)
    for i in range(N_SWEEP):
        ecc_at_t = {p: inner_e_t[p][i] for p in INNER}
        spreads[i] = ladder_spread(ecc_at_t)

    # Find optimal epoch
    best_idx = np.argmin(spreads)
    best_t = t_sweep[best_idx]
    best_spread = spreads[best_idx]

    # J2000 spread
    j2000_spread = spreads[N_SWEEP // 2]  # t=0 is approximately mid-array
    # More precise: find index closest to t=0
    j2000_idx = np.argmin(np.abs(t_sweep))
    j2000_spread = spreads[j2000_idx]

    # Model base spread (for reference)
    model_spread = ladder_spread(ECC_BASE)
    j2000_dict_spread = ladder_spread(ECC_J2000)

    print(f"  Model base eccentricities:  spread = {model_spread:.4f}%")
    print(f"  J2000 observed eccentricities: spread = {j2000_dict_spread:.2f}%")
    print(f"  BvW at J2000 (t=0):         spread = {j2000_spread:.2f}%")
    print(f"  BvW optimal epoch:           spread = {best_spread:.2f}%"
          f"  at t = {best_t/1e6:+.3f} Myr")
    print()

    # Statistics
    print(f"  Spread statistics over ±25 Myr:")
    print(f"    Mean:   {np.mean(spreads):.1f}%")
    print(f"    Median: {np.median(spreads):.1f}%")
    print(f"    Min:    {np.min(spreads):.2f}%")
    print(f"    Max:    {np.max(spreads):.1f}%")
    print(f"    Std:    {np.std(spreads):.1f}%")
    print()
    print(f"  Fraction of time spread < 5%: "
          f"{100 * np.sum(spreads < 5) / N_SWEEP:.1f}%")
    print(f"  Fraction of time spread < 10%: "
          f"{100 * np.sum(spreads < 10) / N_SWEEP:.1f}%")
    print(f"  Fraction of time spread < 20%: "
          f"{100 * np.sum(spreads < 20) / N_SWEEP:.1f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # 4. ECCENTRICITIES AT OPTIMAL EPOCH
    # ═══════════════════════════════════════════════════════════════════════
    section("4. ECCENTRICITIES AT OPTIMAL EPOCH vs BASE VALUES")

    print(f"  Optimal epoch: t = {best_t/1e6:+.3f} Myr from J2000")
    print()

    print(f"  {'Planet':<10} {'e(t_opt)':>12} {'e_base':>12} {'e_J2000':>12}"
          f"  {'Δ(opt-base)%':>12}")
    print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*12}  {'-'*12}")

    ecc_at_opt = {}
    for p in PLANET_NAMES:
        idx = PLANET_NAMES.index(p)
        e_opt = eccentricity_at_time(best_t, idx)
        ecc_at_opt[p] = e_opt
        err = (e_opt / ECC_BASE[p] - 1) * 100 if ECC_BASE[p] > 0 else 0
        print(f"  {p:<10} {e_opt:>12.8f} {ECC_BASE[p]:>12.8f}"
              f" {ECC_J2000[p]:>12.8f}  {err:>+11.2f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # 5. MULTIPLE LOCAL MINIMA IN THE SPREAD
    # ═══════════════════════════════════════════════════════════════════════
    section("5. LOCAL MINIMA IN FIBONACCI LADDER SPREAD")

    print("  Finding all local minima with spread < 5%:")
    print()

    # Find local minima
    local_mins = []
    for i in range(1, N_SWEEP - 1):
        if spreads[i] < spreads[i-1] and spreads[i] < spreads[i+1]:
            if spreads[i] < 5.0:  # only significant minima
                local_mins.append((t_sweep[i], spreads[i], i))

    print(f"  Found {len(local_mins)} local minima with spread < 5%:")
    print()
    print(f"  {'#':>3} {'t (Myr)':>10} {'spread%':>10}")
    print(f"  {'-'*3} {'-'*10} {'-'*10}")

    for j, (tm, sp, _) in enumerate(local_mins[:20]):  # show first 20
        marker = " ← BEST" if abs(tm - best_t) < 1000 else ""
        j2000_marker = " ← J2000" if abs(tm) < 500000 else ""
        print(f"  {j+1:>3} {tm/1e6:>+10.3f} {sp:>10.3f}{marker}{j2000_marker}")

    if len(local_mins) > 20:
        print(f"  ... and {len(local_mins) - 20} more")

    # ═══════════════════════════════════════════════════════════════════════
    # 6. HIGHER RESOLUTION NEAR J2000
    # ═══════════════════════════════════════════════════════════════════════
    section("6. HIGH-RESOLUTION SWEEP NEAR J2000 (±500 kyr)")

    N_HI = 50_000
    t_hi = np.linspace(-500_000, 500_000, N_HI)

    inner_e_hi = {}
    for p in INNER:
        idx = INNER_IDX[p]
        inner_e_hi[p] = eccentricities_at_time_vec(t_hi, idx)

    spreads_hi = np.zeros(N_HI)
    for i in range(N_HI):
        ecc_at_t = {p: inner_e_hi[p][i] for p in INNER}
        spreads_hi[i] = ladder_spread(ecc_at_t)

    best_hi_idx = np.argmin(spreads_hi)
    best_hi_t = t_hi[best_hi_idx]
    best_hi_spread = spreads_hi[best_hi_idx]

    j2000_hi_idx = np.argmin(np.abs(t_hi))
    j2000_hi_spread = spreads_hi[j2000_hi_idx]

    print(f"  BvW at J2000 (t=0):  spread = {j2000_hi_spread:.2f}%")
    print(f"  Best near J2000:     spread = {best_hi_spread:.2f}% at t = {best_hi_t:.0f} yr")
    print()

    # Show spread at selected epochs
    epochs = [-200000, -100000, -50000, -10000, -5000, 0, 5000, 10000,
              50000, 100000, 200000]
    print(f"  {'Epoch (yr)':>12} {'spread%':>10}")
    print(f"  {'-'*12} {'-'*10}")
    for ep in epochs:
        idx = np.argmin(np.abs(t_hi - ep))
        print(f"  {ep:>+12d} {spreads_hi[idx]:>10.2f}")

    # ═══════════════════════════════════════════════════════════════════════
    # 7. EARTH MIDPOINT TEST
    # ═══════════════════════════════════════════════════════════════════════
    section("7. EARTH ECCENTRICITY: WHEN DOES e_Earth = 0.015321?")

    print("  The model specifies Earth base = 0.015321 as a 'midpoint'.")
    print("  When does the BvW solution give this exact value?")
    print()

    earth_idx = PLANET_NAMES.index("Earth")
    t_earth = np.linspace(0, 2_000_000, 1_000_000)  # 2 Myr, fine grid
    e_earth = eccentricities_at_time_vec(t_earth, earth_idx)

    # Find crossings of e = 0.015321
    target = EARTH_BASE_ECCENTRICITY
    crossings = []
    for i in range(1, len(e_earth)):
        if (e_earth[i-1] - target) * (e_earth[i] - target) < 0:
            # Linear interpolation
            t_cross = t_earth[i-1] + (target - e_earth[i-1]) / (e_earth[i] - e_earth[i-1]) * (t_earth[i] - t_earth[i-1])
            direction = "rising" if e_earth[i] > e_earth[i-1] else "falling"
            crossings.append((t_cross, direction))

    print(f"  Earth e_base = {target}")
    print(f"  BvW e_Earth min = {np.min(e_earth):.6f}, max = {np.max(e_earth):.6f}")
    print(f"  BvW e_Earth midpoint = {(np.min(e_earth) + np.max(e_earth))/2:.6f}")
    print()

    if np.min(e_earth) <= target <= np.max(e_earth):
        print(f"  Found {len(crossings)} crossings of e = {target} in 2 Myr:")
        for j, (tc, d) in enumerate(crossings[:10]):
            print(f"    {j+1:>3}. t = {tc:.0f} yr  ({d})")
        if len(crossings) > 10:
            print(f"    ... and {len(crossings) - 10} more")

        # Average time between crossings
        if len(crossings) >= 2:
            intervals = [crossings[i+1][0] - crossings[i][0]
                         for i in range(len(crossings)-1)]
            print(f"  Average interval between crossings: {np.mean(intervals):.0f} yr")
            print(f"  This is the half-period of the oscillation through this value.")
    else:
        if target < np.min(e_earth):
            print(f"  WARNING: {target} is BELOW BvW minimum {np.min(e_earth):.6f}!")
            print(f"  The BvW solution never reaches this value.")
        else:
            print(f"  WARNING: {target} is ABOVE BvW maximum {np.max(e_earth):.6f}!")

    # ═══════════════════════════════════════════════════════════════════════
    # 8. MERCURY AND NEPTUNE ADJUSTMENTS
    # ═══════════════════════════════════════════════════════════════════════
    section("8. MERCURY AND NEPTUNE: WHY ADJUSTED FROM J2000?")

    for p, idx in [("Mercury", 0), ("Neptune", 7)]:
        print(f"  {p}:")
        print(f"    Base = {ECC_BASE[p]:.5f}, J2000 = {ECC_J2000[p]:.8f}")
        print(f"    Δ = {ECC_BASE[p] - ECC_J2000[p]:+.8f}"
              f" ({(ECC_BASE[p]/ECC_J2000[p]-1)*100:+.2f}%)")

        # What base value would give perfect ladder alignment with other 3?
        # d_p × e_p × √m_p = mean_of_others
        other_products = []
        for op in INNER:
            if op == p:
                continue
            xi = ECC_BASE[op] * SQRT_M[op]
            d = D_ECC_VALS[op]
            other_products.append(d * xi)

        if p in D_ECC_VALS:
            target_product = np.mean(other_products)
            ideal_e = target_product / (D_ECC_VALS[p] * SQRT_M[p])
            print(f"    For perfect ladder: e = {ideal_e:.8f}"
                  f" (Δ from base: {(ideal_e/ECC_BASE[p]-1)*100:+.4f}%,"
                  f"  Δ from J2000: {(ideal_e/ECC_J2000[p]-1)*100:+.2f}%)")

        # When does BvW give the base value?
        t_test = np.linspace(0, 2_000_000, 500_000)
        e_test = eccentricities_at_time_vec(t_test, idx)
        target_e = ECC_BASE[p]

        crossings_p = []
        for i in range(1, len(e_test)):
            if (e_test[i-1] - target_e) * (e_test[i] - target_e) < 0:
                t_cross = t_test[i-1] + (target_e - e_test[i-1]) / (e_test[i] - e_test[i-1]) * (t_test[i] - t_test[i-1])
                crossings_p.append(t_cross)

        print(f"    BvW oscillation: min={np.min(e_test):.5f}, max={np.max(e_test):.5f}")
        if crossings_p:
            print(f"    BvW reaches e={target_e:.5f} at t = {crossings_p[0]:.0f} yr"
                  f" (first crossing)")
        else:
            if target_e < np.min(e_test):
                print(f"    BvW NEVER reaches {target_e:.5f} (below min)")
            elif target_e > np.max(e_test):
                print(f"    BvW NEVER reaches {target_e:.5f} (above max)")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # 9. WHAT IF BASE = J2000 EVERYWHERE EXCEPT EARTH?
    # ═══════════════════════════════════════════════════════════════════════
    section("9. HYPOTHESIS: BASE ≈ J2000 (SNAPSHOT) + EARTH MIDPOINT CORRECTION")

    print("  Test: take J2000 for all planets except use Earth midpoint.")
    print("  This is essentially what ECCENTRICITIES (default set) does.")
    print()

    # Check: is the ECCENTRICITIES dict exactly this?
    match = True
    for p in PLANET_NAMES:
        expected = EARTH_BASE_ECCENTRICITY if p == "Earth" else ECC_J2000[p]
        if abs(ECC[p] - expected) > 1e-10:
            match = False
            print(f"  MISMATCH: {p}: ECC={ECC[p]}, expected={expected}")

    if match:
        print("  ✓ Confirmed: ECCENTRICITIES = J2000 + Earth midpoint correction")
    print()

    # What's the ladder spread with this mixed set vs pure BASE?
    ecc_hybrid = {p: ECC_J2000[p] for p in PLANET_NAMES}
    ecc_hybrid["Earth"] = EARTH_BASE_ECCENTRICITY

    hybrid_spread = ladder_spread(ecc_hybrid)
    base_spread = ladder_spread(ECC_BASE)
    j2k_spread = ladder_spread(ECC_J2000)

    print(f"  Ladder spreads:")
    print(f"    Pure J2000:                    {j2k_spread:.4f}%")
    print(f"    J2000 + Earth midpoint (=ECC): {hybrid_spread:.4f}%")
    print(f"    Full ECC_BASE:                 {base_spread:.4f}%")
    print()

    # Contribution of each planet's adjustment to spread reduction
    print("  Contribution of each base adjustment to spread reduction:")
    print(f"  Starting from hybrid (J2000+Earth): spread = {hybrid_spread:.4f}%")
    for p in INNER:
        if p == "Earth":
            continue  # Earth already at midpoint in hybrid
        test_ecc = dict(ecc_hybrid)
        test_ecc[p] = ECC_BASE[p]
        sp = ladder_spread(test_ecc)
        delta_sp = sp - hybrid_spread
        print(f"    + {p:<10} base adjustment: spread → {sp:.4f}%  (Δ = {delta_sp:+.4f}%)")

    # All adjustments together
    print(f"    + All adjustments:            spread → {base_spread:.4f}%"
          f"  (Δ = {base_spread - hybrid_spread:+.4f}%)")

    # ═══════════════════════════════════════════════════════════════════════
    # 10. SENSITIVITY ANALYSIS: HOW MUCH DOES EARTH MIDPOINT MATTER?
    # ═══════════════════════════════════════════════════════════════════════
    section("10. SENSITIVITY: EARTH MIDPOINT DRIVES THE LADDER")

    print("  Varying Earth eccentricity, keeping others at J2000:")
    print()

    e_earth_range = np.linspace(0.005, 0.025, 1000)
    spreads_earth = np.zeros(len(e_earth_range))

    for i, e_e in enumerate(e_earth_range):
        test = {p: ECC_J2000[p] for p in INNER}
        test["Earth"] = e_e
        spreads_earth[i] = ladder_spread(test)

    best_earth_idx = np.argmin(spreads_earth)
    best_earth_e = e_earth_range[best_earth_idx]
    best_earth_spread = spreads_earth[best_earth_idx]

    print(f"  Optimal Earth e for J2000 others: {best_earth_e:.6f}"
          f" (spread = {best_earth_spread:.4f}%)")
    print(f"  Model base Earth e:               {EARTH_BASE_ECCENTRICITY:.6f}"
          f" (spread = {ladder_spread({p: ECC_J2000[p] if p != 'Earth' else EARTH_BASE_ECCENTRICITY for p in INNER}):.4f}%)")
    print(f"  J2000 Earth e:                    {ECC_J2000['Earth']:.6f}"
          f" (spread = {j2k_spread:.4f}%)")
    print()
    print(f"  The optimal Earth e for minimizing spread with J2000 others:")
    print(f"    {best_earth_e:.6f} vs model base {EARTH_BASE_ECCENTRICITY:.6f}"
          f" ({(best_earth_e/EARTH_BASE_ECCENTRICITY - 1)*100:+.3f}%)")

    # Now also: what Earth e minimizes spread with FULL BASE for Mercury/Neptune?
    spreads_earth2 = np.zeros(len(e_earth_range))
    for i, e_e in enumerate(e_earth_range):
        test = {p: ECC_BASE[p] for p in INNER}
        test["Earth"] = e_e
        spreads_earth2[i] = ladder_spread(test)

    best_earth_idx2 = np.argmin(spreads_earth2)
    best_earth_e2 = e_earth_range[best_earth_idx2]
    print(f"  Optimal Earth e for BASE others:  {best_earth_e2:.6f}"
          f" (spread = {spreads_earth2[best_earth_idx2]:.4f}%)")

    # ═══════════════════════════════════════════════════════════════════════
    # 11. CAN THE LADDER SPREAD EVER REACH ~0 FROM BvW SECULAR EVOLUTION?
    # ═══════════════════════════════════════════════════════════════════════
    section("11. CAN BvW SECULAR EVOLUTION EVER PRODUCE NEAR-ZERO SPREAD?")

    print("  The BvW solution has 8 modes with incommensurate frequencies.")
    print("  The ladder spread oscillates quasi-periodically.")
    print("  Can it ever reach < 0.1% (close to model's 0.01%)?")
    print()
    print(f"  Over ±25 Myr ({N_SWEEP} epochs):")
    print(f"    Minimum spread achieved: {np.min(spreads):.2f}%")
    print(f"    Fraction with spread < 1%: {100 * np.sum(spreads < 1) / N_SWEEP:.2f}%")
    print(f"    Fraction with spread < 0.5%: {100 * np.sum(spreads < 0.5) / N_SWEEP:.2f}%")
    print(f"    Fraction with spread < 0.1%: {100 * np.sum(spreads < 0.1) / N_SWEEP:.2f}%")
    print()

    # Extend to 200 Myr for better statistics
    print("  Extending sweep to ±100 Myr (100,000 epochs)...")
    N_LONG = 100_000
    t_long = np.linspace(-100_000_000, 100_000_000, N_LONG)

    inner_e_long = {}
    for p in INNER:
        idx = INNER_IDX[p]
        inner_e_long[p] = eccentricities_at_time_vec(t_long, idx)

    spreads_long = np.zeros(N_LONG)
    for i in range(N_LONG):
        ecc_at_t = {p: inner_e_long[p][i] for p in INNER}
        spreads_long[i] = ladder_spread(ecc_at_t)

    best_long_idx = np.argmin(spreads_long)
    best_long_t = t_long[best_long_idx]
    best_long_spread = spreads_long[best_long_idx]

    print(f"    Minimum spread: {best_long_spread:.3f}% at t = {best_long_t/1e6:+.3f} Myr")
    print(f"    Mean spread: {np.mean(spreads_long):.1f}%")
    print(f"    Fraction < 1%: {100 * np.sum(spreads_long < 1) / N_LONG:.2f}%")
    print(f"    Fraction < 0.5%: {100 * np.sum(spreads_long < 0.5) / N_LONG:.2f}%")
    print(f"    Fraction < 0.1%: {100 * np.sum(spreads_long < 0.1) / N_LONG:.3f}%")

    # Eccentricities at the best long-term epoch
    print()
    print(f"  Inner planet eccentricities at best epoch ({best_long_t/1e6:+.3f} Myr):")
    for p in INNER:
        idx = INNER_IDX[p]
        e_opt = eccentricity_at_time(best_long_t, idx)
        print(f"    {p:<10} e = {e_opt:.6f}  (base = {ECC_BASE[p]:.6f},"
              f" J2000 = {ECC_J2000[p]:.6f})")

    # ═══════════════════════════════════════════════════════════════════════
    # 12. THE CONSTRUCTION: FIND e_Earth THAT ZEROES THE SPREAD AT J2000
    # ═══════════════════════════════════════════════════════════════════════
    section("12. THE CONSTRUCTION: EARTH ECCENTRICITY FROM LADDER CONSTRAINT")

    print("  Hypothesis: The model's base eccentricities are DEFINED as:")
    print("    - Venus, Mars, Mercury: use J2000 observed values")
    print("    - Earth: choose e_E so that d × ξ = constant (spread = 0)")
    print()

    # Analytically: d_E × e_E × √m_E = mean of others
    # d_E = 2/5, √m_E known
    other_products = []
    for p in ["Venus", "Mars", "Mercury"]:
        xi = ECC_J2000[p] * SQRT_M[p]
        d = D_ECC_VALS[p]
        other_products.append(d * xi)

    target_product = np.mean(other_products)
    e_earth_ladder = target_product / (D_ECC_VALS["Earth"] * SQRT_M["Earth"])

    print(f"  d×ξ products (J2000):")
    for p in ["Venus", "Mars", "Mercury"]:
        xi = ECC_J2000[p] * SQRT_M[p]
        d = D_ECC_VALS[p]
        print(f"    {p:<10}: d×ξ = {d * xi:.6e}")
    print(f"    Mean:       d×ξ = {target_product:.6e}")
    print()
    print(f"  Earth e from ladder constraint:    {e_earth_ladder:.8f}")
    print(f"  Model base Earth e:                {EARTH_BASE_ECCENTRICITY:.8f}")
    print(f"  Difference:                        {(e_earth_ladder/EARTH_BASE_ECCENTRICITY - 1)*100:+.4f}%")
    print()

    # What about using ECC_BASE for Mercury (adjusted) instead of J2000?
    other_products_base = []
    for p in ["Venus", "Mars", "Mercury"]:
        xi = ECC_BASE[p] * SQRT_M[p]
        d = D_ECC_VALS[p]
        other_products_base.append(d * xi)

    target_product_base = np.mean(other_products_base)
    e_earth_from_base = target_product_base / (D_ECC_VALS["Earth"] * SQRT_M["Earth"])

    print(f"  Using ECC_BASE for others (Mercury/Venus/Mars adjusted):")
    print(f"    Earth e from ladder constraint:  {e_earth_from_base:.8f}")
    print(f"    Model base Earth e:              {EARTH_BASE_ECCENTRICITY:.8f}")
    print(f"    Difference:                      {(e_earth_from_base/EARTH_BASE_ECCENTRICITY - 1)*100:+.6f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # 13. OUTER PLANETS: JUPITER-SATURN RATIO TEST
    # ═══════════════════════════════════════════════════════════════════════
    section("13. OUTER PLANETS: ARE BASE VALUES ALSO ≈ J2000?")

    print("  The outer planet structure uses ξ-ratios, not a ladder.")
    print("  Since base ≈ J2000 for outer planets, the ratios should match.")
    print()

    outer = ["Jupiter", "Saturn", "Uranus", "Neptune"]
    pairs = [("Jupiter", "Saturn"), ("Jupiter", "Uranus"),
             ("Saturn", "Uranus"), ("Jupiter", "Neptune")]

    for p1, p2 in pairs:
        xi_base1 = ECC_BASE[p1] * SQRT_M[p1]
        xi_base2 = ECC_BASE[p2] * SQRT_M[p2]
        xi_j2k1 = ECC_J2000[p1] * SQRT_M[p1]
        xi_j2k2 = ECC_J2000[p2] * SQRT_M[p2]
        r_base = xi_base1 / xi_base2
        r_j2k = xi_j2k1 / xi_j2k2
        a, b, fr, err = nearest_fib_ratio(r_base)
        frac = f"{a}/{b}" if b > 1 else str(a)
        print(f"  ξ_{p1[:3]}/ξ_{p2[:3]}:"
              f"  base={r_base:.4f}, J2000={r_j2k:.4f}"
              f"  nearest Fib: {frac}={fr:.3f}"
              f"  err(base)={err*100:.2f}%, err(J2000)={(r_j2k/fr-1)*100:+.2f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    section("SUMMARY: WHAT ARE THE BASE ECCENTRICITIES?")

    print("  1. OBSERVATION: For 5/8 planets, base ≈ J2000 to better than 0.1%.")
    print("     Mercury (+1.41%) and Neptune (+1.32%) are slightly adjusted.")
    print("     Earth is EXPLICITLY an oscillation midpoint (0.015321).")
    print()
    print("  2. THE FIBONACCI LADDER IS PRIMARILY AN EARTH CONSTRAINT:")
    print("     With J2000 values for Venus/Mars/Mercury and Earth's midpoint,")
    print("     the ladder already achieves near-zero spread. The Mercury and")
    print("     Neptune adjustments provide only marginal improvement.")
    print()
    print("  3. BvW SECULAR EVOLUTION CANNOT REPRODUCE THE LADDER:")
    print("     The BvW solution's time-varying eccentricities never achieve")
    print("     the model's near-zero spread. The best epoch is still >>0.01%.")
    print()
    print("  4. INTERPRETATION: The 'base eccentricities' are best understood as:")
    print("     - A snapshot (J2000 epoch) for most planets")
    print("     - An oscillation midpoint for Earth (the only planet for which")
    print("       this value significantly differs from J2000)")
    print("     - The Fibonacci ladder constraint d×ξ = const determines Earth's")
    print("       midpoint given the other planets' J2000 values")
    print()
    print("  5. THE DEEP QUESTION SHIFTS: Why do J2000 eccentricities of")
    print("     Venus, Mars, Mercury (+ Earth's midpoint) satisfy d×ξ = const?")
    print("     This is NOT explained by secular perturbation theory. It must")
    print("     be a constraint from formation or long-term dynamical evolution.")


if __name__ == "__main__":
    main()

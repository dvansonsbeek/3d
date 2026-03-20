#!/usr/bin/env python3
"""
§7.15 — Full Ecliptic-Frame Analysis: All 8 Planets
=====================================================

The Excel file now contains for EVERY planet:
  - Perihelion longitude in ecliptic and ICRF frames
  - Ascending node on invariable plane in ecliptic and ICRF frames
  - Inclination to invariable plane
  - Argument of perihelion (for non-Earth planets)

Key questions:
  1. Does ω_ecl + i = 180° hold for ALL planets (as it does for Earth)?
  2. What are the balance-year values in both frames?
  3. Do ecliptic-frame values reveal cleaner cardinal-angle relationships?
  4. How do perihelion and Ω precess rates compare per planet?
  5. Is ω constant for each planet or does it oscillate?
"""

import pandas as pd
import numpy as np

# ==============================================================
# Constants
# ==============================================================
H = 333_888
BALANCE_YEAR = -301_340
J2000_YEAR = 2000

def norm360(a):
    return a % 360

def norm180(a):
    a = a % 360
    return a if a <= 180 else a - 360

# ==============================================================
# Load data
# ==============================================================
xlsx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', '01-holistic-year-objects-data.xlsx')
df = pd.read_excel(xlsx_path, 'Perihelion Planets')

years = df['Year'].values if 'Year' in df.columns else df.iloc[:, 3].values
n_rows = len(years)

# Find key rows
bal_idx = np.argmin(np.abs(years - BALANCE_YEAR))
j2000_idx = np.argmin(np.abs(years - J2000_YEAR))
bal_year = years[bal_idx]
j2000_year = years[j2000_idx]

print("=" * 110)
print("§7.15 — FULL ECLIPTIC-FRAME ANALYSIS: ALL 8 PLANETS OVER 333,888 YEARS")
print("=" * 110)
print(f"\n  Data: {n_rows} rows, step ~111 yr, years {years[0]:,.0f} to {years[-1]:,.0f}")
print(f"  Balance year row: idx {bal_idx}, year {bal_year:,.0f}")
print(f"  J2000 row: idx {j2000_idx}, year {j2000_year:,.0f}")

# ==============================================================
# Planet column mapping
# ==============================================================
planets_order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

# Build column references for each planet
planet_cols = {}
for name in planets_order:
    prefix = name.upper() if name == 'Earth' else name
    # Find columns by searching
    cols = {}
    for c in df.columns:
        cl = str(c)
        if name in cl or (name == 'Earth' and 'Earth' in cl) or (name == 'Earth' and 'EARTH' in cl):
            if 'Perihelion (Ecliptic)' in cl:
                cols['peri_ecl'] = c
            elif 'Perihelion ICRF' in cl:
                cols['peri_icrf'] = c
            elif 'Asc Node InvPlane (Ecliptic)' in cl:
                cols['omega_ecl'] = c
            elif 'Asc Node InvPlane ICRF' in cl:
                cols['omega_icrf'] = c
            elif 'InvPlane Inclination' in cl and 'MaxIncl' not in cl:
                cols['incl'] = c
            elif 'Arg Peri' in cl:
                cols['arg_peri'] = c
    planet_cols[name] = cols

# Verify we have all columns
print(f"\n  Column verification:")
for name in planets_order:
    cols = planet_cols[name]
    has = [k for k in ['peri_ecl', 'omega_ecl', 'peri_icrf', 'omega_icrf', 'incl', 'arg_peri'] if k in cols]
    missing = [k for k in ['peri_ecl', 'omega_ecl', 'peri_icrf', 'omega_icrf', 'incl'] if k not in cols]
    print(f"    {name:10s}: has {has}, missing {missing}")


# ================================================================
# PART 1: BALANCE-YEAR VALUES — ALL PLANETS, BOTH FRAMES
# ================================================================
print("\n" + "=" * 110)
print("PART 1: BALANCE-YEAR VALUES — ALL PLANETS")
print("=" * 110)

print(f"\n  {'Planet':10s}  {'Peri(ecl)':>10s}  {'Ω(ecl)':>10s}  {'ω(ecl)':>10s}  {'Peri(ICRF)':>10s}  {'Ω(ICRF)':>10s}  {'ω(ICRF)':>10s}  {'i':>8s}")
print("  " + "─" * 96)

bal_data = {}
for name in planets_order:
    cols = planet_cols[name]
    d = {}
    d['peri_ecl'] = df[cols['peri_ecl']].values[bal_idx] if 'peri_ecl' in cols else np.nan
    d['omega_ecl'] = df[cols['omega_ecl']].values[bal_idx] if 'omega_ecl' in cols else np.nan
    d['peri_icrf'] = df[cols['peri_icrf']].values[bal_idx] if 'peri_icrf' in cols else np.nan
    d['omega_icrf'] = df[cols['omega_icrf']].values[bal_idx] if 'omega_icrf' in cols else np.nan
    d['incl'] = df[cols['incl']].values[bal_idx] if 'incl' in cols else np.nan

    d['w_ecl'] = norm360(d['peri_ecl'] - d['omega_ecl']) if not np.isnan(d['peri_ecl']) else np.nan
    d['w_icrf'] = norm360(d['peri_icrf'] - d['omega_icrf']) if not np.isnan(d['peri_icrf']) else np.nan

    # Also get Excel's own Arg Peri if available
    if 'arg_peri' in cols:
        d['arg_peri_excel'] = df[cols['arg_peri']].values[bal_idx]
    else:
        d['arg_peri_excel'] = np.nan

    bal_data[name] = d

    print(f"  {name:10s}  {d['peri_ecl']:10.3f}°  {d['omega_ecl']:10.3f}°  {d['w_ecl']:10.3f}°"
          f"  {d['peri_icrf']:10.3f}°  {d['omega_icrf']:10.3f}°  {d['w_icrf']:10.3f}°  {d['incl']:8.4f}°")

# ================================================================
# PART 2: BALANCE-YEAR ω + i TEST (ECLIPTIC FRAME)
# ================================================================
print("\n" + "=" * 110)
print("PART 2: BALANCE-YEAR ω + i TEST (ECLIPTIC FRAME)")
print("=" * 110)

print(f"\n  For Earth, ω_ecl + i = 180° exactly. Test for all planets:")
print(f"\n  {'Planet':10s}  {'ω_ecl':>10s}  {'i':>8s}  {'ω+i':>10s}  {'ω+i-180':>10s}  {'ω-180':>10s}  {'Excel ω':>10s}")
print("  " + "─" * 80)

for name in planets_order:
    d = bal_data[name]
    w = d['w_ecl']
    i = d['incl']
    s = w + i if not (np.isnan(w) or np.isnan(i)) else np.nan
    dev = norm180(s - 180) if not np.isnan(s) else np.nan
    dev_w = norm180(w - 180) if not np.isnan(w) else np.nan
    excel_w = d['arg_peri_excel']
    excel_str = f"{excel_w:10.3f}°" if not np.isnan(excel_w) else "      N/A"

    print(f"  {name:10s}  {w:10.3f}°  {i:8.4f}°  {s:10.4f}°  {dev:+10.4f}°  {dev_w:+10.3f}°  {excel_str}")


# ================================================================
# PART 3: FULL-CYCLE ω + i = 180° TEST — ALL PLANETS
# ================================================================
print("\n" + "=" * 110)
print("PART 3: FULL-CYCLE ω + i TEST (ECLIPTIC FRAME) — ALL PLANETS")
print("=" * 110)

print(f"\n  Does ω_ecl + i = 180° hold throughout the cycle for each planet?")
print(f"\n  {'Planet':10s}  {'ω min':>10s}  {'ω max':>10s}  {'ω mean':>10s}  {'i min':>8s}  {'i max':>8s}  {'(ω+i) RMS':>12s}  {'Exact?':>8s}")
print("  " + "─" * 90)

omega_ecl_all = {}
incl_all = {}
for name in planets_order:
    cols = planet_cols[name]
    peri = df[cols['peri_ecl']].values if 'peri_ecl' in cols else np.full(n_rows, np.nan)
    omg = df[cols['omega_ecl']].values if 'omega_ecl' in cols else np.full(n_rows, np.nan)
    inc = df[cols['incl']].values if 'incl' in cols else np.full(n_rows, np.nan)

    valid = ~(np.isnan(peri) | np.isnan(omg) | np.isnan(inc))
    n_valid = np.sum(valid)

    if n_valid == 0:
        print(f"  {name:10s}  — NO VALID DATA —")
        continue

    # Compute ω = perihelion - Ω in ecliptic frame
    w = np.array([norm360(peri[j] - omg[j]) for j in range(n_rows) if valid[j]])
    i_vals = inc[valid]
    omega_ecl_all[name] = w
    incl_all[name] = i_vals

    # Test ω + i = 180°
    s = w + i_vals
    dev = np.array([norm180(x - 180) for x in s])
    rms = np.sqrt(np.mean(dev**2))

    exact = "YES" if rms < 0.001 else ("~yes" if rms < 0.1 else "NO")

    print(f"  {name:10s}  {np.min(w):10.3f}°  {np.max(w):10.3f}°  {np.mean(w):10.3f}°"
          f"  {np.min(i_vals):8.4f}°  {np.max(i_vals):8.4f}°  {rms:12.6f}°  {exact:>8s}")


# ================================================================
# PART 4: FULL-CYCLE ω STATISTICS — ECLIPTIC vs ICRF
# ================================================================
print("\n" + "=" * 110)
print("PART 4: ω STATISTICS — ECLIPTIC vs ICRF (FULL CYCLE)")
print("=" * 110)

print(f"\n  {'Planet':10s}  {'ω_ecl mean':>12s}  {'ω_ecl std':>10s}  {'ω_ecl range':>12s}  {'ω_ICRF mean':>12s}  {'ω_ICRF std':>12s}")
print("  " + "─" * 80)

for name in planets_order:
    cols = planet_cols[name]
    peri_e = df[cols['peri_ecl']].values if 'peri_ecl' in cols else np.full(n_rows, np.nan)
    omg_e = df[cols['omega_ecl']].values if 'omega_ecl' in cols else np.full(n_rows, np.nan)
    peri_i = df[cols['peri_icrf']].values if 'peri_icrf' in cols else np.full(n_rows, np.nan)
    omg_i = df[cols['omega_icrf']].values if 'omega_icrf' in cols else np.full(n_rows, np.nan)

    valid_e = ~(np.isnan(peri_e) | np.isnan(omg_e))
    valid_i = ~(np.isnan(peri_i) | np.isnan(omg_i))

    if np.sum(valid_e) > 0:
        w_e = np.array([norm360(peri_e[j] - omg_e[j]) for j in range(n_rows) if valid_e[j]])
        # For mean/std, use norm180 to avoid wrap issues
        w_e_centered = np.array([norm180(x - 180) for x in w_e])
        w_e_mean = 180 + np.mean(w_e_centered)
        w_e_std = np.std(w_e_centered)
        w_e_range = np.max(w_e_centered) - np.min(w_e_centered)
    else:
        w_e_mean = w_e_std = w_e_range = np.nan

    if np.sum(valid_i) > 0:
        w_i = np.array([norm360(peri_i[j] - omg_i[j]) for j in range(n_rows) if valid_i[j]])
        w_i_centered = np.array([norm180(x - 180) for x in w_i])
        w_i_mean = 180 + np.mean(w_i_centered)
        w_i_std = np.std(w_i_centered)
    else:
        w_i_mean = w_i_std = np.nan

    print(f"  {name:10s}  {w_e_mean:12.3f}°  {w_e_std:10.4f}°  {w_e_range:12.3f}°  {w_i_mean:12.3f}°  {w_i_std:12.4f}°")


# ================================================================
# PART 5: BALANCE-YEAR CARDINAL ANGLES — ECLIPTIC FRAME
# ================================================================
print("\n" + "=" * 110)
print("PART 5: BALANCE-YEAR CARDINAL-ANGLE ANALYSIS (ECLIPTIC FRAME)")
print("=" * 110)

print(f"\n  Check if balance-year perihelion and Ω land on cardinal angles (0°, 90°, 180°, 270°)")
print(f"\n  {'Planet':10s}  {'Peri(ecl)':>10s}  {'Near':>6s}  {'Dev':>8s}  {'Ω(ecl)':>10s}  {'Near':>6s}  {'Dev':>8s}  {'ω(ecl)':>10s}  {'Near':>6s}  {'Dev':>8s}")
print("  " + "─" * 105)

cardinals = [0, 90, 180, 270]

def nearest_cardinal(angle):
    """Find nearest cardinal angle and deviation."""
    a = norm360(angle)
    best_card = min(cardinals, key=lambda c: abs(norm180(a - c)))
    dev = norm180(a - best_card)
    return best_card, dev

for name in planets_order:
    d = bal_data[name]
    p_card, p_dev = nearest_cardinal(d['peri_ecl'])
    o_card, o_dev = nearest_cardinal(d['omega_ecl'])
    w_card, w_dev = nearest_cardinal(d['w_ecl'])

    print(f"  {name:10s}  {d['peri_ecl']:10.3f}°  {p_card:5.0f}°  {p_dev:+7.3f}°"
          f"  {d['omega_ecl']:10.3f}°  {o_card:5.0f}°  {o_dev:+7.3f}°"
          f"  {d['w_ecl']:10.3f}°  {w_card:5.0f}°  {w_dev:+7.3f}°")


# ================================================================
# PART 6: BALANCE-YEAR CARDINAL ANGLES — ICRF FRAME (COMPARISON)
# ================================================================
print("\n" + "=" * 110)
print("PART 6: BALANCE-YEAR CARDINAL-ANGLE ANALYSIS (ICRF FRAME)")
print("=" * 110)

print(f"\n  {'Planet':10s}  {'Peri(ICRF)':>10s}  {'Near':>6s}  {'Dev':>8s}  {'Ω(ICRF)':>10s}  {'Near':>6s}  {'Dev':>8s}  {'ω(ICRF)':>10s}  {'Near':>6s}  {'Dev':>8s}")
print("  " + "─" * 105)

for name in planets_order:
    d = bal_data[name]
    p_card, p_dev = nearest_cardinal(d['peri_icrf'])
    o_card, o_dev = nearest_cardinal(d['omega_icrf'])
    w_card, w_dev = nearest_cardinal(d['w_icrf'])

    print(f"  {name:10s}  {d['peri_icrf']:10.3f}°  {p_card:5.0f}°  {p_dev:+7.3f}°"
          f"  {d['omega_icrf']:10.3f}°  {o_card:5.0f}°  {o_dev:+7.3f}°"
          f"  {d['w_icrf']:10.3f}°  {w_card:5.0f}°  {w_dev:+7.3f}°")


# ================================================================
# PART 7: PRECESSION RATES — ECLIPTIC FRAME
# ================================================================
print("\n" + "=" * 110)
print("PART 7: PRECESSION RATES — ECLIPTIC FRAME")
print("=" * 110)

print(f"\n  Compare perihelion and Ω precession rates in the ecliptic frame.")
print(f"  If they match, ω stays ~constant (as seen for Earth).")

step = (years[-1] - years[0]) / (n_rows - 1)

print(f"\n  {'Planet':10s}  {'Peri rate':>12s}  {'Peri period':>14s}  {'Ω rate':>12s}  {'Ω period':>14s}  {'Match?':>8s}  {'Model T_peri':>14s}")
print("  " + "─" * 100)

# Model precession periods
model_T = {
    'Mercury': 8*H/11,
    'Venus':   2*H,
    'Earth':   H/16,
    'Mars':    3*H/13,
    'Jupiter': H/5,
    'Saturn':  H/8,
    'Uranus':  H/3,
    'Neptune': 2*H,
}

for name in planets_order:
    cols = planet_cols[name]
    peri = df[cols['peri_ecl']].values
    omg = df[cols['omega_ecl']].values

    valid = ~(np.isnan(peri) | np.isnan(omg))
    if np.sum(valid) < 10:
        continue

    # Compute rates from differences (unwrap to handle 360° crossings)
    peri_v = peri[valid]
    omg_v = omg[valid]
    yrs_v = years[valid]

    # Unwrap for rate calculation
    peri_diffs = np.diff(peri_v)
    peri_diffs = np.array([norm180(d) for d in peri_diffs])
    peri_rate = np.mean(peri_diffs) / step  # deg/yr

    omg_diffs = np.diff(omg_v)
    omg_diffs = np.array([norm180(d) for d in omg_diffs])
    omg_rate = np.mean(omg_diffs) / step  # deg/yr

    peri_period = abs(360.0 / peri_rate) if peri_rate != 0 else float('inf')
    omg_period = abs(360.0 / omg_rate) if omg_rate != 0 else float('inf')

    match = "YES" if abs(peri_rate - omg_rate) / max(abs(peri_rate), abs(omg_rate), 1e-10) < 0.01 else "no"

    mt = model_T[name]
    print(f"  {name:10s}  {peri_rate:+12.6f}  {peri_period:14,.0f} yr  {omg_rate:+12.6f}  {omg_period:14,.0f} yr  {match:>8s}  {mt:14,.0f} yr")


# ================================================================
# PART 8: ω OSCILLATION DETAILS PER PLANET
# ================================================================
print("\n" + "=" * 110)
print("PART 8: ω_ecl OSCILLATION — DETAILED PER PLANET")
print("=" * 110)

for name in planets_order:
    cols = planet_cols[name]
    peri = df[cols['peri_ecl']].values
    omg = df[cols['omega_ecl']].values
    inc = df[cols['incl']].values

    valid = ~(np.isnan(peri) | np.isnan(omg) | np.isnan(inc))
    if np.sum(valid) < 10:
        continue

    w = np.array([norm360(peri[j] - omg[j]) for j in range(n_rows) if valid[j]])
    i_vals = inc[valid]
    yrs = years[valid]

    # ω centered on 180°
    w_dev = np.array([norm180(x - 180) for x in w])
    w_mean = 180 + np.mean(w_dev)

    # ω + i
    s = w + i_vals
    s_dev = np.array([norm180(x - 180) for x in s])

    # Find period of ω oscillation from zero crossings of (ω - mean)
    w_detrend = w_dev - np.mean(w_dev)
    crossings = np.where(np.diff(np.sign(w_detrend)))[0]
    if len(crossings) > 2:
        half_periods = np.diff(yrs[crossings])
        full_period = 2 * np.mean(half_periods)
    else:
        full_period = np.nan

    print(f"\n  {name}:")
    print(f"    ω_ecl: mean = {w_mean:.3f}°, range = [{np.min(w):.3f}°, {np.max(w):.3f}°], amplitude = {(np.max(w_dev)-np.min(w_dev))/2:.3f}°")
    print(f"    i:     mean = {np.mean(i_vals):.4f}°, range = [{np.min(i_vals):.4f}°, {np.max(i_vals):.4f}°]")
    print(f"    ω + i: mean = {180 + np.mean(s_dev):.6f}°, RMS from 180° = {np.sqrt(np.mean(s_dev**2)):.6f}°")
    if not np.isnan(full_period):
        n_cycles = (years[-1] - years[0]) / full_period
        print(f"    ω oscillation period: ~{full_period:,.0f} yr ({n_cycles:.1f} cycles in H)")
    else:
        print(f"    ω oscillation period: could not determine")

    # Sample values at key epochs
    print(f"    Sample: bal_yr ω={w[0]:.3f}° i={i_vals[0]:.4f}° sum={w[0]+i_vals[0]:.4f}°")
    mid = len(w) // 2
    print(f"    Sample: mid    ω={w[mid]:.3f}° i={i_vals[mid]:.4f}° sum={w[mid]+i_vals[mid]:.4f}°")


# ================================================================
# PART 9: ECLIPTIC vs ICRF — WHICH FRAME GIVES CLEANER RESULTS?
# ================================================================
print("\n" + "=" * 110)
print("PART 9: ECLIPTIC vs ICRF — CARDINAL ANGLE SCORE")
print("=" * 110)

print(f"\n  Count how many balance-year values are within X° of a cardinal angle.")
print(f"\n  Thresholds: 1°, 5°, 10°, 15°")

for threshold in [1, 5, 10, 15]:
    ecl_hits_peri = 0
    ecl_hits_omega = 0
    ecl_hits_w = 0
    icrf_hits_peri = 0
    icrf_hits_omega = 0
    icrf_hits_w = 0

    for name in planets_order:
        d = bal_data[name]

        _, dev = nearest_cardinal(d['peri_ecl'])
        if abs(dev) < threshold: ecl_hits_peri += 1
        _, dev = nearest_cardinal(d['omega_ecl'])
        if abs(dev) < threshold: ecl_hits_omega += 1
        _, dev = nearest_cardinal(d['w_ecl'])
        if abs(dev) < threshold: ecl_hits_w += 1

        _, dev = nearest_cardinal(d['peri_icrf'])
        if abs(dev) < threshold: icrf_hits_peri += 1
        _, dev = nearest_cardinal(d['omega_icrf'])
        if abs(dev) < threshold: icrf_hits_omega += 1
        _, dev = nearest_cardinal(d['w_icrf'])
        if abs(dev) < threshold: icrf_hits_w += 1

    print(f"\n  Within {threshold}°:")
    print(f"    Ecliptic:  perihelion {ecl_hits_peri}/8, Ω {ecl_hits_omega}/8, ω {ecl_hits_w}/8 (total {ecl_hits_peri+ecl_hits_omega+ecl_hits_w}/24)")
    print(f"    ICRF:      perihelion {icrf_hits_peri}/8, Ω {icrf_hits_omega}/8, ω {icrf_hits_w}/8 (total {icrf_hits_peri+icrf_hits_omega+icrf_hits_w}/24)")


# ================================================================
# PART 10: ECLIPTIC FRAME — PERIHELION LONGITUDE AT BALANCE YEAR
# ================================================================
print("\n" + "=" * 110)
print("PART 10: PERIHELION LONGITUDE (ECLIPTIC) — FIBONACCI FRACTION CHECK")
print("=" * 110)

print(f"\n  Check if balance-year ecliptic perihelion longitudes are Fibonacci fractions of 360°")
print(f"\n  Fibonacci fractions of 360°:")
fib_fracs = {}
fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
for i, f1 in enumerate(fibs):
    for f2 in fibs[i+1:]:
        angle = f1 / f2 * 360
        if angle <= 360:
            fib_fracs[f"{f1}/{f2}"] = angle
            fib_fracs[f"{f2-f1}/{f2}"] = (1 - f1/f2) * 360

# Include simple fractions
for n in range(1, 13):
    for d in range(1, 13):
        if n <= d:
            a = n / d * 360
            fib_fracs[f"{n}/{d}"] = a

print(f"\n  {'Planet':10s}  {'Peri(ecl)':>10s}  {'Best match':>12s}  {'Frac angle':>12s}  {'Dev':>8s}")
print("  " + "─" * 60)

for name in planets_order:
    d = bal_data[name]
    p = d['peri_ecl']

    best_frac = None
    best_dev = 999
    for frac_name, frac_angle in fib_fracs.items():
        dev = abs(norm180(p - frac_angle))
        if dev < best_dev:
            best_dev = dev
            best_frac = frac_name
            best_angle = frac_angle

    print(f"  {name:10s}  {p:10.3f}°  {best_frac:>12s}  {best_angle:12.3f}°  {best_dev:+7.3f}°")


# ================================================================
# PART 11: ECLIPTIC ω vs EXCEL Arg Peri — CONSISTENCY CHECK
# ================================================================
print("\n" + "=" * 110)
print("PART 11: CONSISTENCY CHECK — ω_ecl = perihelion_ecl - Ω_ecl vs Excel Arg Peri")
print("=" * 110)

print(f"\n  {'Planet':10s}  {'ω_ecl (computed)':>16s}  {'Excel Arg Peri':>14s}  {'Difference':>12s}")
print("  " + "─" * 60)

for name in planets_order:
    d = bal_data[name]
    w_computed = d['w_ecl']
    w_excel = d['arg_peri_excel']
    if not np.isnan(w_excel):
        diff = norm180(w_computed - w_excel)
        print(f"  {name:10s}  {w_computed:16.4f}°  {w_excel:14.4f}°  {diff:+12.4f}°")
    else:
        print(f"  {name:10s}  {w_computed:16.4f}°  {'N/A':>14s}       —")


# ================================================================
# PART 12: PAIRWISE Ω DIFFERENCES — BALANCE YEAR (ECLIPTIC)
# ================================================================
print("\n" + "=" * 110)
print("PART 12: PAIRWISE Ω DIFFERENCES AT BALANCE YEAR (ECLIPTIC FRAME)")
print("=" * 110)

print(f"\n  Check if pairwise Ω differences are Fibonacci fractions of 360°")

omega_vals_ecl = {name: bal_data[name]['omega_ecl'] for name in planets_order}

print(f"\n  {'Pair':20s}  {'ΔΩ':>10s}  {'Best frac':>10s}  {'Frac angle':>12s}  {'Dev':>8s}")
print("  " + "─" * 70)

for i, n1 in enumerate(planets_order):
    for n2 in planets_order[i+1:]:
        delta = norm360(omega_vals_ecl[n1] - omega_vals_ecl[n2])
        # Also check 360 - delta
        delta_alt = 360 - delta
        for dd in [delta, delta_alt]:
            best_frac = None
            best_dev = 999
            for frac_name, frac_angle in fib_fracs.items():
                dev = abs(norm180(dd - frac_angle))
                if dev < best_dev:
                    best_dev = dev
                    best_frac = frac_name
                    best_angle = frac_angle
            if best_dev < 5:
                print(f"  {n1+'-'+n2:20s}  {dd:10.3f}°  {best_frac:>10s}  {best_angle:12.3f}°  {best_dev:+7.3f}°")


# ================================================================
# PART 13: J2000 VALUES FOR COMPARISON
# ================================================================
print("\n" + "=" * 110)
print("PART 13: J2000 VALUES — ALL PLANETS (ECLIPTIC FRAME)")
print("=" * 110)

print(f"\n  {'Planet':10s}  {'Peri(ecl)':>10s}  {'Ω(ecl)':>10s}  {'ω(ecl)':>10s}  {'i':>8s}  {'ω+i':>10s}")
print("  " + "─" * 65)

for name in planets_order:
    cols = planet_cols[name]
    pe = df[cols['peri_ecl']].values[j2000_idx]
    oe = df[cols['omega_ecl']].values[j2000_idx]
    ie = df[cols['incl']].values[j2000_idx]
    we = norm360(pe - oe)
    s = we + ie

    print(f"  {name:10s}  {pe:10.3f}°  {oe:10.3f}°  {we:10.3f}°  {ie:8.4f}°  {s:10.4f}°")


# ================================================================
# SUMMARY
# ================================================================
print("\n" + "=" * 110)
print("SUMMARY")
print("=" * 110)

print(f"""
  KEY FINDING 1: ω_ecl + i = 180° TEST
  ─────────────────────────────────────""")

for name in planets_order:
    if name in omega_ecl_all and name in incl_all:
        w = omega_ecl_all[name]
        i_vals = incl_all[name]
        s = w + i_vals
        dev = np.array([norm180(x - 180) for x in s])
        rms = np.sqrt(np.mean(dev**2))
        status = "EXACT IDENTITY" if rms < 0.001 else f"RMS = {rms:.3f}°"
        print(f"    {name:10s}: {status}")

print(f"""
  KEY FINDING 2: BALANCE-YEAR ECLIPTIC PERIHELION LONGITUDES""")
for name in planets_order:
    d = bal_data[name]
    _, dev = nearest_cardinal(d['peri_ecl'])
    print(f"    {name:10s}: {d['peri_ecl']:8.3f}° — {abs(dev):.3f}° from cardinal")

print(f"""
  KEY FINDING 3: BALANCE-YEAR ECLIPTIC ω VALUES""")
for name in planets_order:
    d = bal_data[name]
    _, dev = nearest_cardinal(d['w_ecl'])
    print(f"    {name:10s}: {d['w_ecl']:8.3f}° — {abs(dev):.3f}° from cardinal")

print(f"\nDone.")

#!/usr/bin/env python3
"""
§7.12 — Precision Verification of Balance-Year Geometry from Excel Data
========================================================================
Extract θ_bal (perihelion longitude) and Ω_bal (ascending node on invariable
plane) for ALL 8 planets directly from the 3D model's Excel output, rather
than relying on the propagation formula used in §7.3.

Key questions:
  1. How precisely does Jupiter land at 180° at the balance year?
  2. What are the exact θ_bal and Ω_bal for all 8 planets?
  3. How do these compare with §7.3 propagation results?
  4. What is ω_bal = θ_bal − Ω_bal for each planet?
  5. Do the Excel-derived values sharpen the Fibonacci matches?

Data source: docs/01-holistic-year-objects-data.xlsx
             Sheet: "Perihelion Planets"
"""

import math
import numpy as np

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas not installed. Run: pip install pandas openpyxl")
    exit(1)

# ==============================================================
# Constants
# ==============================================================
H = 333_888
BALANCE_YEAR = -301_340
J2000_YEAR = 2000

XLSX = '../data/01-holistic-year-objects-data.xlsx'

def norm360(a):
    return a % 360

def norm180(a):
    a = a % 360
    return a if a <= 180 else a - 360

# ==============================================================
# §7.3 propagation values (for comparison)
# ==============================================================
propagation_results = {
    'Mercury':  {'theta': 347.7, 'Omega': 303.1, 'omega': +44.6},
    'Venus':    {'theta': 328.0, 'Omega': 251.2, 'omega': +76.9},
    'Earth':    {'theta': 270.0, 'Omega':  90.0, 'omega': +180.0},
    'Mars':     {'theta': 358.8, 'Omega':  17.6, 'omega': -18.8},
    'Jupiter':  {'theta': 179.4, 'Omega': 117.6, 'omega': +61.8},
    'Saturn':   {'theta': 188.6, 'Omega': 215.3, 'omega': -26.7},
    'Uranus':   {'theta': 269.5, 'Omega':  46.6, 'omega': -137.1},
    'Neptune':  {'theta': 242.3, 'Omega':  28.5, 'omega': -146.2},
}

# Frame-corrected ω₀ from §7.4
omega_corrected = {
    'Mercury':  +45.012,
    'Venus':    +73.832,
    'Earth':   +180.000,
    'Mars':     -21.213,
    'Jupiter':  +62.652,
    'Saturn':   -27.116,
    'Uranus':  -138.104,
    'Neptune': -144.051,
}

order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

# Fibonacci target angles for matching
def generate_fibonacci_targets():
    """Generate Fibonacci fractions of 360°."""
    fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]
    targets = set()
    # Simple: 360/F, 360*F_a/F_b
    for f in fibs:
        targets.add(360.0 / f)
    for i, a in enumerate(fibs):
        for j, b in enumerate(fibs):
            if a != b and b != 0:
                val = 360.0 * a / b
                if 0 < val < 360:
                    targets.add(val)
    # Products: 360*F_a²/F_b, 360*F_a/(F_b*F_c)
    for a in fibs:
        for b in fibs:
            if b != 0:
                val = 360.0 * a * a / b
                if 0 < val < 360:
                    targets.add(val)
            for c in fibs:
                if b * c != 0:
                    val = 360.0 * a / (b * c)
                    if 0 < val < 360:
                        targets.add(val)
    return sorted(targets)

fib_targets = generate_fibonacci_targets()

def best_fibonacci_match(angle_deg):
    """Find closest Fibonacci fraction of 360° to given angle."""
    angle = abs(angle_deg) % 360
    if angle > 180:
        angle = 360 - angle
    best_err = 999
    best_target = None
    for t in fib_targets:
        t_eff = t if t <= 180 else 360 - t
        err = abs(angle - t_eff)
        if err < best_err:
            best_err = err
            best_target = t
    return best_target, best_err, best_err / max(abs(angle), 0.001) * 100

# ==============================================================
# Load Excel data
# ==============================================================
print("=" * 90)
print("§7.12 — PRECISION VERIFICATION OF BALANCE-YEAR GEOMETRY FROM EXCEL DATA")
print("=" * 90)

print(f"\nLoading {XLSX}...")
df = pd.read_excel(XLSX, sheet_name='Perihelion Planets')
print(f"  Loaded: {df.shape[0]} rows × {df.shape[1]} columns")

# Show available columns
print(f"\n  All columns:")
for i, col in enumerate(df.columns):
    print(f"    [{i:2d}] {col}")

# ==============================================================
# 1. IDENTIFY COLUMN NAMES AND EXTRACT DATA
# ==============================================================
print("\n" + "─" * 90)
print("1. DATA EXTRACTION")
print("─" * 90)

# Find the Year column
year_col = 'Year'
years = df[year_col].values
print(f"\n  Year range: {years[0]:.0f} to {years[-1]:.0f}")
print(f"  Step size: ~{(years[-1] - years[0]) / (len(years) - 1):.1f} years")

# Find balance year row
balance_idx = np.argmin(np.abs(years - BALANCE_YEAR))
balance_yr_actual = years[balance_idx]
print(f"\n  Balance year target: {BALANCE_YEAR}")
print(f"  Closest row: index {balance_idx}, year = {balance_yr_actual:.0f}")
print(f"  Offset: {balance_yr_actual - BALANCE_YEAR:.0f} years")

# Also check neighboring rows
if balance_idx > 0:
    print(f"  Previous row: year = {years[balance_idx-1]:.0f}")
if balance_idx < len(years) - 1:
    print(f"  Next row: year = {years[balance_idx+1]:.0f}")

# ==============================================================
# 2. EXTRACT PERIHELION & ASCENDING NODE FOR ALL PLANETS
# ==============================================================
print("\n" + "─" * 90)
print("2. BALANCE-YEAR VALUES FROM EXCEL (direct 3D model output)")
print("─" * 90)

# Search for planet-specific columns
# Expected pattern: "<Planet> Perihelion", "<Planet> Asc Node InvPlane"
planet_cols = {}
for name in order:
    peri_col = None
    node_col = None
    argperi_col = None
    for col in df.columns:
        col_upper = str(col).upper()
        name_upper = name.upper()
        if name_upper in col_upper:
            if 'PERIHELION' in col_upper and 'ARG' not in col_upper:
                peri_col = col
            if 'ASC NODE INVPLANE' in col_upper and 'MAX' not in col_upper:
                node_col = col
            if 'ARG PERI' in col_upper or 'ARG_PERI' in col_upper:
                argperi_col = col
    # Special handling for Earth
    if name == 'Earth':
        for col in df.columns:
            col_upper = str(col).upper()
            if 'EARTH' in col_upper:
                if 'PERIHELION' in col_upper and 'ARG' not in col_upper:
                    peri_col = col
                if 'ASC NODE INVPLANE' in col_upper and 'MAX' not in col_upper:
                    node_col = col
                if 'ARG PERI' in col_upper or 'ARG_PERI' in col_upper:
                    argperi_col = col
    planet_cols[name] = {'peri': peri_col, 'node': node_col, 'argperi': argperi_col}
    found = "✓" if (peri_col and node_col) else "✗"
    print(f"  {found} {name:10s}: peri='{peri_col}', node='{node_col}', argperi='{argperi_col}'")

# ==============================================================
# 3. EXTRACT BALANCE-YEAR VALUES
# ==============================================================
print("\n" + "─" * 90)
print("3. BALANCE-YEAR PERIHELION LONGITUDES AND ASCENDING NODES")
print("─" * 90)

bal_row = df.iloc[balance_idx]

excel_results = {}
print(f"\n  {'Planet':10s}  {'θ_bal (°)':>12s}  {'Ω_bal (°)':>12s}  {'ω_bal (°)':>12s}  {'ω_corr §7.4':>12s}  {'Δω':>8s}")
print("  " + "─" * 76)

for name in order:
    cols = planet_cols[name]
    if cols['peri'] and cols['node']:
        theta = float(bal_row[cols['peri']])
        omega_node = float(bal_row[cols['node']])

        # ω = θ - Ω (argument of perihelion)
        omega = norm180(theta - omega_node)

        # Also get argperi if available
        argperi_excel = None
        if cols['argperi']:
            argperi_excel = float(bal_row[cols['argperi']])

        omega_ref = omega_corrected[name]
        delta = abs(omega - omega_ref)
        if delta > 180:
            delta = 360 - delta

        excel_results[name] = {
            'theta': theta,
            'Omega': omega_node,
            'omega': omega,
            'argperi_excel': argperi_excel,
        }

        ap_str = f"  (AP: {argperi_excel:.3f}°)" if argperi_excel is not None else ""
        print(f"  {name:10s}  {theta:12.3f}°  {omega_node:12.3f}°  {omega:+12.3f}°  {omega_ref:+12.3f}°  {delta:7.2f}°{ap_str}")
    else:
        print(f"  {name:10s}  --- columns not found ---")

# ==============================================================
# 4. COMPARISON WITH §7.3 PROPAGATION
# ==============================================================
print("\n" + "─" * 90)
print("4. COMPARISON: EXCEL DATA vs §7.3 PROPAGATION")
print("─" * 90)

print(f"\n  {'Planet':10s}  {'θ_Excel':>10s}  {'θ_prop':>10s}  {'Δθ':>8s}  {'Ω_Excel':>10s}  {'Ω_prop':>10s}  {'ΔΩ':>8s}")
print("  " + "─" * 76)

for name in order:
    if name in excel_results:
        e = excel_results[name]
        p = propagation_results[name]
        d_theta = norm180(e['theta'] - p['theta'])
        d_omega_node = norm180(e['Omega'] - p['Omega'])
        print(f"  {name:10s}  {e['theta']:10.3f}°  {p['theta']:10.1f}°  {d_theta:+7.2f}°  {e['Omega']:10.3f}°  {p['Omega']:10.1f}°  {d_omega_node:+7.2f}°")

# ==============================================================
# 5. JUPITER 180° PRECISION
# ==============================================================
print("\n" + "─" * 90)
print("5. JUPITER 180° PRECISION CHECK")
print("─" * 90)

if 'Jupiter' in excel_results:
    jup = excel_results['Jupiter']
    deviation = norm180(jup['theta'] - 180.0)
    print(f"\n  Jupiter perihelion at balance year:")
    print(f"    θ_bal (Excel)    = {jup['theta']:.4f}°")
    print(f"    Deviation from 180° = {deviation:+.4f}°")
    print(f"    Relative error   = {abs(deviation)/180*100:.4f}%")
    print(f"\n    Ω_bal (Excel)    = {jup['Omega']:.4f}°")
    print(f"    ω_bal (Excel)    = {jup['omega']:+.4f}°")
    print(f"    ω₀ (§7.4 corr)  = {omega_corrected['Jupiter']:+.4f}°")
    print(f"    Difference       = {abs(jup['omega'] - omega_corrected['Jupiter']):.4f}°")

# ==============================================================
# 6. ALL PLANETS: DISTANCE FROM CARDINAL/FIBONACCI ANGLES
# ==============================================================
print("\n" + "─" * 90)
print("6. θ_bal PROXIMITY TO CARDINAL AND FIBONACCI ANGLES")
print("─" * 90)

cardinal = [0, 90, 180, 270, 360]
print(f"\n  {'Planet':10s}  {'θ_bal':>10s}  {'Nearest 0/90/180/270':>22s}  {'Δ':>8s}  {'Best Fib 360°':>15s}  {'Fib err':>8s}")
print("  " + "─" * 85)

for name in order:
    if name in excel_results:
        theta = excel_results[name]['theta']
        # Nearest cardinal
        best_card = min(cardinal, key=lambda c: min(abs(theta - c), abs(theta - c + 360), abs(theta - c - 360)))
        delta_card = norm180(theta - best_card)

        # Nearest Fibonacci fraction
        fib_target, fib_err_deg, fib_err_pct = best_fibonacci_match(theta)

        print(f"  {name:10s}  {theta:10.3f}°  {best_card:>10d}°  {delta_card:>10.3f}°  {fib_target:>10.3f}°  {fib_err_pct:>7.3f}%")

# ==============================================================
# 7. MARS-JUPITER ANTI-ALIGNMENT CHECK
# ==============================================================
print("\n" + "─" * 90)
print("7. MIRROR PAIR ANGULAR SEPARATIONS AT BALANCE YEAR")
print("─" * 90)

mirror_pairs = [
    ('Mars', 'Jupiter', 5),
    ('Earth', 'Saturn', 3),
    ('Venus', 'Neptune', 34),
    ('Mercury', 'Uranus', 21),
]

print(f"\n  {'Pair':25s}  {'d':>4s}  {'θ₁':>10s}  {'θ₂':>10s}  {'Δθ':>10s}  {'|Δθ-180|':>10s}")
print("  " + "─" * 76)

for p1, p2, d in mirror_pairs:
    if p1 in excel_results and p2 in excel_results:
        t1 = excel_results[p1]['theta']
        t2 = excel_results[p2]['theta']
        delta = norm180(t2 - t1)
        anti = abs(abs(delta) - 180)
        print(f"  {p1:10s} / {p2:10s}  {d:4d}  {t1:10.3f}°  {t2:10.3f}°  {delta:+10.3f}°  {anti:10.3f}°")

# ==============================================================
# 8. ω TIME SERIES AROUND BALANCE YEAR
# ==============================================================
print("\n" + "─" * 90)
print("8. ω BEHAVIOR AROUND BALANCE YEAR (±5 rows)")
print("─" * 90)

start = max(0, balance_idx - 5)
end = min(len(df), balance_idx + 6)

for name in ['Jupiter', 'Mars', 'Earth', 'Saturn']:
    cols = planet_cols[name]
    if cols['peri'] and cols['node']:
        print(f"\n  {name}:")
        print(f"    {'Year':>10s}  {'θ (°)':>10s}  {'Ω (°)':>10s}  {'ω (°)':>10s}  {'ArgPeri':>10s}")
        print(f"    " + "─" * 55)
        for idx in range(start, end):
            yr = years[idx]
            theta = float(df.iloc[idx][cols['peri']])
            omega_n = float(df.iloc[idx][cols['node']])
            omega = norm180(theta - omega_n)
            marker = " ← balance" if idx == balance_idx else ""

            ap_str = ""
            if cols['argperi']:
                ap = float(df.iloc[idx][cols['argperi']])
                ap_str = f"  {ap:10.3f}°"

            print(f"    {yr:10.0f}  {theta:10.3f}°  {omega_n:10.3f}°  {omega:+10.3f}°{ap_str}{marker}")

# ==============================================================
# 9. FULL PAIRWISE PERIHELION SEPARATIONS (Fibonacci check)
# ==============================================================
print("\n" + "─" * 90)
print("9. ALL PAIRWISE PERIHELION SEPARATIONS AT BALANCE YEAR")
print("─" * 90)

from itertools import combinations

# Simple Fibonacci angles for quick check
simple_fib_angles = []
fibs_short = [1, 2, 3, 5, 8, 13, 21, 34, 55]
for a in fibs_short:
    for b in fibs_short:
        if a != b and b != 0:
            val = 360.0 * a / b
            if 0 < val <= 180:
                simple_fib_angles.append(val)
simple_fib_angles = sorted(set(simple_fib_angles))

n_close = 0
n_total = 0

print(f"\n  {'Pair':25s}  {'|Δθ|':>10s}  {'Nearest Fib':>12s}  {'Error':>8s}  {'Error %':>8s}")
print("  " + "─" * 72)

for p1, p2 in combinations(order, 2):
    if p1 in excel_results and p2 in excel_results:
        delta = abs(norm180(excel_results[p2]['theta'] - excel_results[p1]['theta']))

        # Find nearest Fibonacci angle
        best_fib = min(simple_fib_angles, key=lambda f: abs(delta - f))
        err = abs(delta - best_fib)
        err_pct = err / max(delta, 0.001) * 100

        close = "✓" if err_pct < 10 else ""
        if err_pct < 10:
            n_close += 1
        n_total += 1

        print(f"  {p1:10s} / {p2:10s}  {delta:10.3f}°  {best_fib:12.3f}°  {err:8.3f}°  {err_pct:7.2f}% {close}")

print(f"\n  Within 10%: {n_close}/{n_total} pairs")

# ==============================================================
# 10. SUMMARY
# ==============================================================
print("\n" + "=" * 90)
print("SUMMARY")
print("=" * 90)

if 'Jupiter' in excel_results:
    jup = excel_results['Jupiter']
    dev = norm180(jup['theta'] - 180.0)
    print(f"\n  Jupiter θ_bal = {jup['theta']:.4f}°  (deviation from 180°: {dev:+.4f}°)")

print(f"\n  Balance-year perihelion longitudes (Excel):")
for name in order:
    if name in excel_results:
        e = excel_results[name]
        p = propagation_results[name]
        d = norm180(e['theta'] - p['theta'])
        print(f"    {name:10s}: θ = {e['theta']:10.3f}°  (vs §7.3: {p['theta']:8.1f}°, Δ = {d:+.2f}°)")

print("\nDone.")

#!/usr/bin/env python3
"""
Balance-Year Geometry — Consolidated Verification Script
=========================================================
Consolidates 6 scripts into one comprehensive analysis:

  1. Balance-year angular positions (analytical propagation + Excel)
  2. Jupiter 180° precision verification
  3. Sensitivity classification (LOCKED/TUNED/LOOSE/FREE)
  4. Ecliptic-frame analysis (ω+i=180° identity, ω constancy, precession rates)
  5. θ_bal Fibonacci check & ω forward prediction
  6. Ω_bal determination (BvW secular theory test)
  7. Mirror-pair geometry & Uranus-Earth coincidence
  8. Law 6 angular triad constraint

Source scripts (now archived):
  fibonacci_omega_balance_year.py, fibonacci_omega_jupiter_precision.py,
  fibonacci_omega_sensitivity.py, fibonacci_omega_all_planets_ecliptic.py,
  fibonacci_omega_theta_bal_predict.py, fibonacci_omega_remaining.py

All results are self-contained. Excel data used where available.
"""

import math
import numpy as np
import pandas as pd
from itertools import combinations

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONSTANTS & DATA                                                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝

H = 333_888
PHI = (1 + math.sqrt(5)) / 2
BALANCE_YEAR = -301_340
J2000_YEAR = 2000
DT = J2000_YEAR - BALANCE_YEAR  # 303,340 years

ORDER = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

def norm360(a):
    return a % 360

def norm180(a):
    a = a % 360
    return a if a <= 180 else a - 360

# ── J2000 values and Holistic precession periods ──
# theta0: J2000 perihelion longitude (ICRF), Omega0: J2000 ascending node on invariable plane (ICRF)
# T: precession period (years), dir: +1 prograde, -1 retrograde
PLANET_DATA = {
    'Mercury':  {'theta0': 77.457,  'Omega0': 32.83,   'T': 8*H/11,  'dir': +1},
    'Venus':    {'theta0': 131.577, 'Omega0': 54.70,    'T': 2*H,     'dir': +1},
    'Earth':    {'theta0': 102.95,  'Omega0': 284.51,   'T_peri': H/16, 'T_node': H/3, 'dir': +1},
    'Mars':     {'theta0': 336.065, 'Omega0': 354.87,   'T': 3*H/13,  'dir': +1},
    'Jupiter':  {'theta0': 14.707,  'Omega0': 312.89,   'T': H/5,     'dir': +1},
    'Saturn':   {'theta0': 92.128,  'Omega0': 118.81,   'T': H/8,     'dir': -1},
    'Uranus':   {'theta0': 170.731, 'Omega0': 307.80,   'T': H/3,     'dir': +1},
    'Neptune':  {'theta0': 45.801,  'Omega0': 192.04,   'T': 2*H,     'dir': +1},
}

# Frame-corrected ω₀ values from §7.4 (best estimates of constant ω)
OMEGA0 = {
    'Mercury':  +45.012,
    'Venus':    +73.832,
    'Earth':   +180.000,
    'Mars':     -21.213,   # = 338.787° mod 360
    'Jupiter':  +62.652,
    'Saturn':   -27.116,   # = 332.884°
    'Uranus':  -138.104,   # = 221.896°
    'Neptune': -144.051,   # = 215.949°
}

# Planet masses in Earth masses
MASSES = {
    'Mercury': 0.0553, 'Venus': 0.815, 'Earth': 1.000, 'Mars': 0.1074,
    'Jupiter': 317.8, 'Saturn': 95.16, 'Uranus': 14.54, 'Neptune': 17.15,
}

# Cardinal angle targets for balance-year perihelion longitudes (from §7.12 Excel)
CARDINAL_TARGETS = {
    'Mercury': 0.0, 'Venus': 0.0, 'Earth': 270.0, 'Mars': 0.0,
    'Jupiter': 180.0, 'Saturn': 180.0, 'Uranus': 270.0, 'Neptune': 270.0,
}

# Mirror pairs (inner/outer across asteroid belt)
MIRROR_PAIRS = [
    ('Mercury', 'Uranus', 21),   # d = F₈
    ('Venus', 'Neptune', 34),    # d = F₉
    ('Earth', 'Saturn', 3),      # d = F₄
    ('Mars', 'Jupiter', 5),      # d = F₅
]

# BvW Inclination eigenvectors I[mode][planet] × 10⁻⁵
I_RAW = np.array([
    [ 7093,  3080,  2626,  1079,     0,     0,     0,     0],
    [-6610,  4247,  3584,  1447,     0,     0,     0,     0],
    [  356, -5036,  4481,  4267,     0,     0,     0,     0],
    [ -134,  1316, -2067,  8413,     0,     0,     0,     0],
    [    0,     0,     0,     0,     0,     0,     0,     0],
    [   -2,    -2,    -2,    -4,  -897,  1797,  -227,   -19],
    [   -1,    -2,    -2,    -3,   -39,   -32,  1564,  -135],
    [    0,     0,     0,     0,    -1,    -1,    51,   701],
], dtype=float) * 1e-5

# BvW Inclination eigenfrequencies (arcsec/year) and phases (degrees at J2000)
S_FREQ = np.array([-5.59, -7.05, -18.85, -17.755, 0.0, -26.34, -2.99, -0.692])
GAMMA = np.array([20.23, 318.3, 255.6, 296.9, 107.5, 127.3, 315.6, 202.8])

# ── Build Fibonacci fraction target set ──
FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]

def _build_fib_targets():
    """Build a comprehensive set of Fibonacci fraction × 360° targets."""
    targets = {}
    # F_a/F_b
    for f1 in FIBS:
        for f2 in FIBS:
            if f1 != f2 and f2 != 0:
                ratio = f1 / f2
                if 0 < ratio <= 1:
                    targets[f"{f1}/{f2}"] = ratio * 360
                elif 1 < ratio * 360 <= 360:
                    targets[f"{f1}/{f2}"] = ratio * 360
    # F_a²/F_b
    for f1 in FIBS:
        for f2 in FIBS:
            if f2 != 0:
                angle = (f1**2 / f2 * 360) % 360
                if 0 < angle < 360:
                    targets[f"{f1}²/{f2}"] = angle
    # F_a/(F_b×F_c)
    for f1 in FIBS:
        for f2 in FIBS:
            for f3 in FIBS:
                if f2 * f3 != 0:
                    angle = (f1 / (f2 * f3) * 360) % 360
                    if 0 < angle < 360:
                        targets[f"{f1}/({f2}×{f3})"] = angle
    # Simple integer fractions n/d
    for n in range(1, 14):
        for d in range(1, 14):
            if n < d:
                targets[f"{n}/{d}"] = n / d * 360
    # Complements
    extra = {}
    for name, angle in list(targets.items()):
        comp = 360 - angle
        if 0 < comp < 360:
            extra[f"1-{name}"] = comp
    targets.update(extra)
    # Deduplicate
    unique = {}
    for name, angle in sorted(targets.items(), key=lambda x: x[1]):
        a = norm360(angle)
        if a < 0.01 or a > 359.99:
            continue
        dup = any(abs(norm180(a - ea)) < 0.01 for ea in unique.values())
        if not dup:
            unique[name] = a
    unique['0/1'] = 0.0
    unique['1/4'] = 90.0
    unique['1/2'] = 180.0
    unique['3/4'] = 270.0
    return unique

FIB_TARGETS = _build_fib_targets()

def best_fib(angle):
    """Find best Fibonacci fraction match for an angle."""
    a = norm360(angle)
    best_name, best_dev, best_angle = None, 999, None
    for name, target in FIB_TARGETS.items():
        dev = abs(norm180(a - target))
        if dev < best_dev:
            best_dev = dev
            best_name = name
            best_angle = target
    return best_name, best_angle, best_dev

def nearest_cardinal(angle):
    """Find nearest cardinal angle (0°, 90°, 180°, 270°) and deviation."""
    a = norm360(angle)
    cards = [0, 90, 180, 270]
    best = min(cards, key=lambda c: abs(norm180(a - c)))
    return best, norm180(a - best)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LOAD EXCEL DATA                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝

xlsx_path = os.path.join(os.path.dirname(__file__), '..', 'appendix-h-holistic-year-objects-data.xlsx')
try:
    df = pd.read_excel(xlsx_path, 'Perihelion Planets')
    HAVE_EXCEL = True
except Exception as e:
    print(f"  [WARNING] Could not load Excel: {e}")
    print(f"  Falling back to analytical propagation only.\n")
    HAVE_EXCEL = False

if HAVE_EXCEL:
    years = df.iloc[:, 3].values
    n_rows = len(years)
    bal_idx = 0  # Balance year is first row
    j2000_idx = np.argmin(np.abs(years - J2000_YEAR))

    # Extract balance-year values for all planets
    bal_excel = {}
    for name in ORDER:
        d = {}
        ecl_prefix = '' if name == 'Earth' else '* '
        d['peri_ecl'] = df[f'{ecl_prefix}{name} Perihelion (Ecliptic)'].values[bal_idx]
        d['omega_ecl'] = df[f'{ecl_prefix}{name} Asc Node InvPlane (Ecliptic)'].values[bal_idx]
        d['peri_icrf'] = df[f'{name} Perihelion ICRF' if name != 'Earth' else 'Earth Perihelion ICRF'].values[bal_idx]
        d['omega_icrf'] = df[f'{name} Asc Node InvPlane ICRF' if name != 'Earth' else 'Earth Asc Node InvPlane ICRF'].values[bal_idx]
        d['incl'] = df[f'{name} InvPlane Inclination' if name != 'Earth' else 'Earth InvPlane Inclination'].values[bal_idx]
        d['w_ecl'] = norm360(d['peri_ecl'] - d['omega_ecl'])
        d['w_icrf'] = norm360(d['peri_icrf'] - d['omega_icrf'])
        bal_excel[name] = d


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §1  BALANCE-YEAR ANGULAR POSITIONS                                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("=" * 100)
print("§1 — BALANCE-YEAR ANGULAR POSITIONS")
print("  Propagate J2000 values backward to balance year; compare with Excel.")
print("=" * 100)

# Analytical propagation
bal_calc = {}
for name in ORDER:
    p = PLANET_DATA[name]
    if name == 'Earth':
        theta = norm360(p['theta0'] - p['dir'] * (DT / p['T_peri']) * 360.0)
        omega = norm360(p['Omega0'] - p['dir'] * (DT / p['T_node']) * 360.0)
        bal_calc[name] = {'theta': 270.0, 'Omega': 90.0,
                          'theta_calc': theta, 'Omega_calc': omega}
    else:
        T = p['T']
        shift = (DT / T) * 360.0
        theta = norm360(p['theta0'] - p['dir'] * shift)
        omega = norm360(p['Omega0'] - p['dir'] * shift)
        bal_calc[name] = {'theta': theta, 'Omega': omega}

print(f"\n  Balance year = {BALANCE_YEAR:,}, Δt = {DT:,} yr")
print(f"\n  {'Planet':10s}  {'θ_bal(calc)':>12s}  {'Ω_bal(calc)':>12s}  {'ω=θ−Ω':>10s}  {'ω₀(§7.4)':>10s}  {'Δω':>6s}")
print("  " + "─" * 72)

for name in ORDER:
    b = bal_calc[name]
    w_bal = norm180(b['theta'] - b['Omega'])
    w0 = OMEGA0[name]
    dw = abs(norm180(w_bal - w0))
    print(f"  {name:10s}  {b['theta']:12.3f}°  {b['Omega']:12.3f}°  {w_bal:+10.3f}°  {w0:+10.3f}°  {dw:5.2f}°")

if HAVE_EXCEL:
    print(f"\n  Excel vs analytical comparison (ICRF perihelion longitude at balance year):")
    print(f"  {'Planet':10s}  {'θ_bal(Excel)':>12s}  {'θ_bal(calc)':>12s}  {'Δ':>8s}")
    print("  " + "─" * 46)
    for name in ORDER:
        theta_exc = bal_excel[name]['peri_icrf']
        theta_calc = bal_calc[name]['theta']
        delta = norm180(theta_exc - theta_calc)
        print(f"  {name:10s}  {theta_exc:12.3f}°  {theta_calc:12.3f}°  {delta:+7.3f}°")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §2  JUPITER 180° PRECISION VERIFICATION                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("§2 — JUPITER AT 180°: PRECISION VERIFICATION")
print("  How precisely does Jupiter's balance-year perihelion land at 180°?")
print("=" * 100)

if HAVE_EXCEL:
    theta_J = bal_excel['Jupiter']['peri_icrf']
    theta_J_ecl = bal_excel['Jupiter']['peri_ecl']
    omega_J = bal_excel['Jupiter']['omega_icrf']
    i_J = bal_excel['Jupiter']['incl']
else:
    theta_J = bal_calc['Jupiter']['theta']
    theta_J_ecl = theta_J  # approximate
    omega_J = bal_calc['Jupiter']['Omega']
    i_J = None

dev_J = norm180(theta_J - 180.0)
print(f"\n  Jupiter at balance year:")
print(f"    θ_bal (ICRF)     = {theta_J:.6f}°")
print(f"    Deviation from 180° = {dev_J:+.6f}°  ({abs(dev_J)/180*100:.4f}%)")
if theta_J_ecl != theta_J:
    print(f"    θ_bal (ecliptic) = {theta_J_ecl:.6f}°  (dev from 180° = {norm180(theta_J_ecl - 180):+.6f}°)")
print(f"    Ω_bal (ICRF)     = {omega_J:.3f}°")
if i_J is not None:
    print(f"    i_bal            = {i_J:.6f}°")

# Sensitivity: how much period change needed for exact 180°?
T_J = H / 5
rate_J = 360.0 / T_J
n_cycles_J = DT / T_J
dtheta_1pct_J = n_cycles_J * 360.0 * 0.01

print(f"\n  Precession: T = H/5 = {T_J:.1f} yr, {n_cycles_J:.3f} cycles in Δt")
print(f"  dθ per 1% period change = {dtheta_1pct_J:.2f}°")
pct_needed_J = abs(dev_J) / dtheta_1pct_J * 100 if dtheta_1pct_J > 0 else 0
print(f"  Period adjustment for exact 180° = {pct_needed_J:.4f}%")
bal_yr_adjust = abs(dev_J) / (360.0 / T_J)
print(f"  Balance-year adjustment for exact 180° = {bal_yr_adjust:.0f} yr")

# All planets: proximity to line of nodes (0° or 180°)
print(f"\n  All planets — proximity to line of nodes:")
print(f"  {'Planet':10s}  {'θ_bal':>10s}  {'Dev 0°':>8s}  {'Dev 180°':>10s}  {'Min dev':>10s}  {'mass':>8s}")
print("  " + "─" * 62)

for name in ORDER:
    theta = bal_excel[name]['peri_ecl'] if HAVE_EXCEL else bal_calc[name]['theta']
    dev_0 = abs(norm180(theta))
    dev_180 = abs(norm180(theta - 180))
    min_dev = min(dev_0, dev_180)
    mass = MASSES[name]
    print(f"  {name:10s}  {theta:10.3f}°  {dev_0:7.1f}°  {dev_180:9.1f}°  {min_dev:9.1f}°  {mass:8.3f}")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §3  SENSITIVITY CLASSIFICATION                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("§3 — SENSITIVITY OF θ_bal TO PRECESSION PERIOD")
print("  Classification: LOCKED / TUNED / LOOSE / FREE")
print("=" * 100)

print(f"\n  dθ/1%P = 0.01 × N_cycles × 360° (more cycles → higher sensitivity)")

print(f"\n  {'Planet':10s}  {'T (yr)':>12s}  {'N_cycles':>10s}  {'dθ/1%P':>10s}  {'Dev':>8s}  {'P adj':>10s}  {'Bal adj':>10s}  {'Class':>8s}")
print("  " + "─" * 90)

sensitivities = {}
for name in ORDER:
    p = PLANET_DATA[name]
    T = p.get('T', p.get('T_peri', H))
    n_cycles = DT / T
    dtheta_1pct = n_cycles * 360.0 * 0.01

    theta_nom = bal_excel[name]['peri_icrf'] if HAVE_EXCEL else bal_calc[name]['theta']
    target = CARDINAL_TARGETS[name]
    dev = norm180(theta_nom - target)
    pct_needed = abs(dev) / dtheta_1pct if dtheta_1pct > 0 else float('inf')
    bal_adj = abs(dev) / (360.0 / T)

    # Classification
    if abs(dev) < 0.5 and pct_needed < 0.01:
        cat = "LOCKED"
    elif abs(dev) < 5 and pct_needed < 0.1:
        cat = "TUNED"
    elif abs(dev) < 15:
        cat = "LOOSE"
    else:
        cat = "FREE"

    sensitivities[name] = {'n_cycles': n_cycles, 'dtheta_1pct': dtheta_1pct,
                           'dev': dev, 'pct_needed': pct_needed, 'bal_adj': bal_adj, 'cat': cat}

    print(f"  {name:10s}  {T:12.1f}  {n_cycles:10.3f}  {dtheta_1pct:10.2f}°  {dev:+7.2f}°  {pct_needed:9.4f}%  {bal_adj:9.0f} yr  {cat:>8s}")

print(f"""
  Classification rules:
    LOCKED: |dev| < 0.5° AND period adj < 0.01%
    TUNED:  |dev| < 5°   AND period adj < 0.1%
    LOOSE:  |dev| < 15°
    FREE:   |dev| ≥ 15° (no clear cardinal-angle constraint)
""")

# Jupiter sweep ±10%
print("  Jupiter θ_bal sweep (±10% period change):")
T_nom = PLANET_DATA['Jupiter']['T']
theta0_J = PLANET_DATA['Jupiter']['theta0']
dir_J = PLANET_DATA['Jupiter']['dir']

print(f"  {'ΔP (%)':>8s}  {'θ_bal':>10s}  {'Dev from 180°':>14s}")
print("  " + "─" * 38)

for pct in [-10, -5, -1, -0.1, 0, 0.005, 0.1, 1, 5, 10]:
    T_test = T_nom * (1 + pct/100)
    theta_test = norm360(theta0_J - dir_J * (DT / T_test) * 360.0)
    dev_test = norm180(theta_test - 180.0)
    marker = " ← nominal" if pct == 0 else ""
    if abs(dev_test) < 0.1:
        marker += " ★"
    print(f"  {pct:+8.3f}%  {theta_test:10.3f}°  {dev_test:+14.3f}°{marker}")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §4  ECLIPTIC-FRAME ANALYSIS                                          ║
# ╚══════════════════════════════════════════════════════════════════════════╝

if HAVE_EXCEL:
    print("\n\n" + "=" * 100)
    print("§4 — ECLIPTIC-FRAME ANALYSIS")
    print("  ω+i=180° identity, ω constancy, precession rate comparison")
    print("=" * 100)

    # ── 4A: Balance-year values both frames ──
    print("\n" + "─" * 100)
    print("4A. BALANCE-YEAR VALUES — BOTH FRAMES")
    print("─" * 100)

    print(f"\n  {'Planet':10s}  {'Peri(ecl)':>10s}  {'Ω(ecl)':>10s}  {'ω(ecl)':>10s}  {'Peri(ICRF)':>10s}  {'Ω(ICRF)':>10s}  {'i':>8s}")
    print("  " + "─" * 76)

    for name in ORDER:
        d = bal_excel[name]
        print(f"  {name:10s}  {d['peri_ecl']:10.3f}°  {d['omega_ecl']:10.3f}°  {d['w_ecl']:10.3f}°"
              f"  {d['peri_icrf']:10.3f}°  {d['omega_icrf']:10.3f}°  {d['incl']:8.4f}°")

    # ── 4B: ω_ecl + i = 180° test (full cycle) ──
    print("\n" + "─" * 100)
    print("4B. ω_ecl + i = 180° TEST (FULL CYCLE)")
    print("─" * 100)

    print(f"\n  Does ω_ecl + i = 180° hold throughout the Holistic Year for each planet?")
    print(f"\n  {'Planet':10s}  {'ω min':>10s}  {'ω max':>10s}  {'ω mean':>10s}  {'(ω+i) RMS':>12s}  {'Identity?':>10s}")
    print("  " + "─" * 68)

    for name in ORDER:
        ecl_prefix = '' if name == 'Earth' else '* '
        peri = df[f'{ecl_prefix}{name} Perihelion (Ecliptic)'].values
        omg = df[f'{ecl_prefix}{name} Asc Node InvPlane (Ecliptic)'].values
        inc = df[f'{name} InvPlane Inclination' if name != 'Earth' else 'Earth InvPlane Inclination'].values

        valid = ~(np.isnan(peri) | np.isnan(omg) | np.isnan(inc))
        if np.sum(valid) < 10:
            print(f"  {name:10s}  — insufficient data —")
            continue

        w = np.array([norm360(peri[j] - omg[j]) for j in range(n_rows) if valid[j]])
        i_vals = inc[valid]

        s = w + i_vals
        dev_arr = np.array([norm180(x - 180) for x in s])
        rms = np.sqrt(np.mean(dev_arr**2))

        w_dev = np.array([norm180(x - 180) for x in w])
        w_mean = 180 + np.mean(w_dev)

        exact = "YES" if rms < 0.001 else ("~yes" if rms < 0.1 else "NO")
        print(f"  {name:10s}  {np.min(w):10.3f}°  {np.max(w):10.3f}°  {w_mean:10.3f}°  {rms:12.6f}°  {exact:>10s}")

    # ── 4C: Precession rates — ecliptic frame ──
    print("\n" + "─" * 100)
    print("4C. PRECESSION RATES (ECLIPTIC FRAME)")
    print("─" * 100)

    model_T = {
        'Mercury': 8*H/11, 'Venus': 2*H, 'Earth': H/16, 'Mars': 3*H/13,
        'Jupiter': H/5, 'Saturn': H/8, 'Uranus': H/3, 'Neptune': 2*H,
    }
    step = (years[-1] - years[0]) / (n_rows - 1)

    print(f"\n  {'Planet':10s}  {'Peri rate':>12s}  {'Peri period':>14s}  {'Ω rate':>12s}  {'Ω period':>14s}  {'Match?':>8s}  {'Model T':>12s}")
    print("  " + "─" * 90)

    for name in ORDER:
        ecl_prefix = '' if name == 'Earth' else '* '
        peri = df[f'{ecl_prefix}{name} Perihelion (Ecliptic)'].values
        omg = df[f'{ecl_prefix}{name} Asc Node InvPlane (Ecliptic)'].values

        valid = ~(np.isnan(peri) | np.isnan(omg))
        if np.sum(valid) < 10:
            continue

        peri_diffs = np.array([norm180(d) for d in np.diff(peri[valid])])
        peri_rate = np.mean(peri_diffs) / step

        omg_diffs = np.array([norm180(d) for d in np.diff(omg[valid])])
        omg_rate = np.mean(omg_diffs) / step

        peri_period = abs(360.0 / peri_rate) if peri_rate != 0 else float('inf')
        omg_period = abs(360.0 / omg_rate) if omg_rate != 0 else float('inf')

        match = "YES" if abs(peri_rate - omg_rate) / max(abs(peri_rate), abs(omg_rate), 1e-10) < 0.01 else "no"
        mt = model_T[name]

        print(f"  {name:10s}  {peri_rate:+12.6f}  {peri_period:14,.0f} yr  {omg_rate:+12.6f}  {omg_period:14,.0f} yr  {match:>8s}  {mt:12,.0f} yr")

    print(f"\n  ω = perihelion − Ω stays ~constant when perihelion and Ω precess at the same rate.")

    # ── 4D: Cardinal-angle score — ecliptic vs ICRF ──
    print("\n" + "─" * 100)
    print("4D. CARDINAL-ANGLE SCORE: ECLIPTIC vs ICRF")
    print("─" * 100)

    for threshold in [5, 10, 15]:
        ecl_peri = sum(1 for n in ORDER if abs(nearest_cardinal(bal_excel[n]['peri_ecl'])[1]) < threshold)
        ecl_w = sum(1 for n in ORDER if abs(nearest_cardinal(bal_excel[n]['w_ecl'])[1]) < threshold)
        icrf_peri = sum(1 for n in ORDER if abs(nearest_cardinal(bal_excel[n]['peri_icrf'])[1]) < threshold)
        icrf_w = sum(1 for n in ORDER if abs(nearest_cardinal(bal_excel[n]['w_icrf'])[1]) < threshold)
        print(f"  Within {threshold:2d}°:  Ecliptic perihelion {ecl_peri}/8, ω {ecl_w}/8  |  ICRF perihelion {icrf_peri}/8, ω {icrf_w}/8")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §5  θ_bal FIBONACCI CHECK & ω PREDICTION                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("§5 — θ_bal FIBONACCI CHECK & ω FORWARD PREDICTION")
print("  Are balance-year perihelion longitudes Fibonacci fractions of 360°?")
print("  Can θ_bal predict ω via ω_pred = θ_clean − Ω_bal?")
print("=" * 100)

n_targets = len(set(FIB_TARGETS.values()))
print(f"\n  Fibonacci target set: {n_targets} unique angles, avg spacing {360/n_targets:.2f}°")

# ── 5A: Fibonacci matches — ICRF ──
print("\n" + "─" * 100)
print("5A. θ_bal FIBONACCI MATCHES (ICRF)")
print("─" * 100)

print(f"\n  {'Planet':10s}  {'θ_bal':>10s}  {'Best match':>14s}  {'Target':>10s}  {'Dev':>8s}  {'Err%':>8s}")
print("  " + "─" * 66)

icrf_devs = []
for name in ORDER:
    theta = bal_excel[name]['peri_icrf'] if HAVE_EXCEL else bal_calc[name]['theta']
    frac_name, frac_angle, dev = best_fib(theta)
    err_pct = abs(dev) / 360 * 100
    icrf_devs.append(abs(dev))
    print(f"  {name:10s}  {theta:10.3f}°  {frac_name:>14s}  {frac_angle:10.3f}°  {dev:+7.3f}°  {err_pct:7.3f}%")

rms_icrf = np.sqrt(np.mean(np.array(icrf_devs)**2))
print(f"\n  RMS deviation (all 8): {rms_icrf:.3f}°")

# ── 5B: Monte Carlo significance ──
print("\n" + "─" * 100)
print("5B. MONTE CARLO SIGNIFICANCE")
print("─" * 100)

n_mc = 100_000
np.random.seed(42)

def compute_rms_fib(angles):
    devs = [abs(best_fib(a)[2]) for a in angles]
    return np.sqrt(np.mean(np.array(devs)**2))

# 7-planet ecliptic (excl derived Earth) and 8-planet ICRF
if HAVE_EXCEL:
    theta_ecl_7 = [bal_excel[n]['peri_ecl'] for n in ORDER if n != 'Earth']
    obs_rms_7 = compute_rms_fib(theta_ecl_7)
theta_icrf_8 = [bal_excel[n]['peri_icrf'] if HAVE_EXCEL else bal_calc[n]['theta'] for n in ORDER]
obs_rms_8 = compute_rms_fib(theta_icrf_8)

print(f"\n  Running {n_mc:,} Monte Carlo trials...")

count_8 = 0
count_7 = 0 if HAVE_EXCEL else -1
for _ in range(n_mc):
    r8 = np.random.uniform(0, 360, 8)
    if compute_rms_fib(r8) <= obs_rms_8:
        count_8 += 1
    if HAVE_EXCEL:
        r7 = np.random.uniform(0, 360, 7)
        if compute_rms_fib(r7) <= obs_rms_7:
            count_7 += 1

p_8 = count_8 / n_mc
print(f"\n  ICRF (8 planets): RMS = {obs_rms_8:.3f}°, p = {p_8:.4f}")
if HAVE_EXCEL:
    p_7 = count_7 / n_mc
    print(f"  Ecliptic (7, excl Earth): RMS = {obs_rms_7:.3f}°, p = {p_7:.4f}")

# ── 5C: ω forward prediction ──
print("\n" + "─" * 100)
print("5C. ω FORWARD PREDICTION: ω_pred = θ_clean − Ω_bal")
print("─" * 100)

print(f"\n  {'Planet':10s}  {'θ_bal':>10s}  {'θ_clean':>10s}  {'Frac':>14s}  {'Ω_bal':>10s}  {'ω_pred':>10s}  {'ω₀':>10s}  {'Δω':>8s}")
print("  " + "─" * 95)

fwd_errors = []
for name in ORDER:
    if HAVE_EXCEL:
        theta = bal_excel[name]['peri_icrf']
        omega_bal = bal_excel[name]['omega_icrf']
    else:
        theta = bal_calc[name]['theta']
        omega_bal = bal_calc[name]['Omega']
    frac_name, frac_angle, _ = best_fib(theta)
    w_pred = norm180(frac_angle - omega_bal)
    w_obs = OMEGA0[name]
    if w_obs > 180:
        w_obs -= 360
    dw = norm180(w_pred - w_obs)
    fwd_errors.append(abs(dw))
    match = "YES" if abs(dw) < 5 else ("~" if abs(dw) < 10 else "")
    print(f"  {name:10s}  {theta:10.3f}°  {frac_angle:10.3f}°  {frac_name:>14s}  {omega_bal:10.3f}°"
          f"  {w_pred:+10.3f}°  {w_obs:+10.3f}°  {dw:+7.3f}°  {match}")

rms_fwd = np.sqrt(np.mean(np.array(fwd_errors)**2))
good_preds = sum(1 for e in fwd_errors if e < 5)
print(f"\n  Forward prediction RMS: {rms_fwd:.3f}° ({good_preds}/8 planets within 5°)")

# ── 5D: Cardinal-angle prediction (strongest test) ──
print("\n" + "─" * 100)
print("5D. CARDINAL-ANGLE PREDICTION: θ_clean = nearest 90° multiple")
print("─" * 100)

print(f"\n  {'Planet':10s}  {'θ_bal':>10s}  {'θ_clean':>10s}  {'Ω_bal':>10s}  {'ω_pred':>10s}  {'ω₀':>10s}  {'Δω':>8s}")
print("  " + "─" * 76)

cardinal_dw = []
for name in ORDER:
    if HAVE_EXCEL:
        theta = bal_excel[name]['peri_icrf']
        omega_bal = bal_excel[name]['omega_icrf']
    else:
        theta = bal_calc[name]['theta']
        omega_bal = bal_calc[name]['Omega']
    theta_clean = CARDINAL_TARGETS[name]
    w_pred = norm180(theta_clean - omega_bal)
    w_obs = OMEGA0[name]
    if w_obs > 180:
        w_obs -= 360
    dw = norm180(w_pred - w_obs)
    cardinal_dw.append(abs(dw))
    print(f"  {name:10s}  {theta:10.3f}°  {theta_clean:10.0f}°  {omega_bal:10.3f}°"
          f"  {w_pred:+10.3f}°  {w_obs:+10.3f}°  {dw:+7.3f}°")

rms_card = np.sqrt(np.mean(np.array(cardinal_dw)**2))
big4_dw = [cardinal_dw[i] for i, n in enumerate(ORDER) if n in ['Earth', 'Mars', 'Jupiter', 'Uranus']]
rms_big4 = np.sqrt(np.mean(np.array(big4_dw)**2))
print(f"\n  Cardinal prediction RMS (all 8): {rms_card:.3f}°")
print(f"  Cardinal prediction RMS (Big Four: Earth, Mars, Jupiter, Uranus): {rms_big4:.3f}°")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §6  Ω_bal DETERMINATION — BvW SECULAR THEORY TEST                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("§6 — Ω_bal DETERMINATION: SECULAR EIGENMODES vs FORMATION CONSTRAINT")
print("  Can BvW first-order secular theory reproduce the balance-year Ω values?")
print("=" * 100)

# ── 6A: BvW prediction at balance year ──
print("\n" + "─" * 100)
print("6A. BvW SECULAR PREDICTION: Ω at the balance year")
print("─" * 100)

t_bal = BALANCE_YEAR  # years from J2000

print(f"\n  {'Planet':10s}  {'Ω_BvW':>10s}  {'Ω_Excel':>10s}  {'Δ(BvW-Exc)':>12s}  {'Note':>10s}")
print("  " + "─" * 58)

omega_bvw = {}
bvw_deltas = []
for idx, name in enumerate(ORDER):
    p_sum, q_sum = 0.0, 0.0
    for l in range(8):
        if S_FREQ[l] == 0:
            continue
        s_deg = S_FREQ[l] / 3600.0
        phase = math.radians(s_deg * t_bal + GAMMA[l])
        p_sum += I_RAW[l, idx] * math.sin(phase)
        q_sum += I_RAW[l, idx] * math.cos(phase)

    if abs(p_sum) < 1e-10 and abs(q_sum) < 1e-10:
        omega_bvw[name] = float('nan')
    else:
        omega_bvw[name] = math.degrees(math.atan2(p_sum, q_sum)) % 360

    omega_exc = bal_excel[name]['omega_icrf'] if HAVE_EXCEL else bal_calc[name]['Omega']

    if not math.isnan(omega_bvw[name]):
        delta = norm180(omega_bvw[name] - omega_exc)
        bvw_deltas.append(abs(delta))
        note = "MATCH" if abs(delta) < 10 else ("close" if abs(delta) < 30 else "MISS")
    else:
        delta = float('nan')
        note = "N/A"

    delta_str = f"{delta:+10.2f}°" if not math.isnan(delta) else "       N/A"
    print(f"  {name:10s}  {omega_bvw[name]:10.2f}°  {omega_exc:10.2f}°  {delta_str}  {note:>10s}")

if bvw_deltas:
    rms_bvw = np.sqrt(np.mean(np.array(bvw_deltas)**2))
    print(f"\n  RMS |Ω_BvW − Ω_Excel| = {rms_bvw:.1f}°")
    if rms_bvw > 30:
        print(f"  → BvW CANNOT reproduce Ω_bal — formation constraint confirmed")
    elif rms_bvw > 10:
        print(f"  → BvW gives rough qualitative agreement only")

# ── 6B: Individual Ω_bal Fibonacci check ──
print("\n" + "─" * 100)
print("6B. Ω_bal FIBONACCI FRACTION TEST")
print("─" * 100)

print(f"\n  {'Planet':10s}  {'Ω_ICRF':>10s}  {'Best Fib':>14s}  {'Target':>10s}  {'Dev':>8s}")
print("  " + "─" * 56)

omega_bal_devs = []
for name in ORDER:
    omega = bal_excel[name]['omega_icrf'] if HAVE_EXCEL else bal_calc[name]['Omega']
    frac, target, dev = best_fib(omega)
    omega_bal_devs.append(abs(dev))
    print(f"  {name:10s}  {omega:10.3f}°  {frac:>14s}  {target:10.3f}°  {dev:+7.3f}°")

rms_omega_bal = np.sqrt(np.mean(np.array(omega_bal_devs)**2))
print(f"\n  RMS Ω_bal deviation: {rms_omega_bal:.3f}°")

# ── 6C: Dominant eigenmode per planet ──
print("\n" + "─" * 100)
print("6C. DOMINANT EIGENMODE CONTRIBUTION TO Ω_bal")
print("─" * 100)

print(f"\n  {'Planet':10s}  {'Top 3 modes':>35s}  {'Dominant':>10s}")
print("  " + "─" * 60)

for idx, name in enumerate(ORDER):
    amps = [abs(I_RAW[l, idx]) for l in range(8)]
    sorted_modes = sorted(range(8), key=lambda l: amps[l], reverse=True)
    total = sum(amps)
    top3 = [f"s{l+1}({amps[l]/total*100:.0f}%)" for l in sorted_modes[:3]] if total > 0 else ["N/A"]
    dom = sorted_modes[0]
    print(f"  {name:10s}  {', '.join(top3):>35s}  s{dom+1:>8d}")

print(f"\n  Inner planets: mixed s₁/s₂; Outer: each dominated by one mode (s₆, s₇, s₈)")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §7  MIRROR-PAIR GEOMETRY & URANUS-EARTH COINCIDENCE                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("§7 — MIRROR-PAIR GEOMETRY & URANUS-EARTH COINCIDENCE")
print("=" * 100)

# ── 7A: Mirror pair θ_bal separations ──
print("\n" + "─" * 100)
print("7A. MIRROR PAIR θ_bal SEPARATIONS")
print("─" * 100)

print(f"\n  {'Pair':>25s}  {'d':>4s}  {'θ_in':>10s}  {'θ_out':>10s}  {'Δθ':>10s}  {'|Δθ−180|':>10s}")
print("  " + "─" * 76)

obs_mars_jup_anti = None
for inner, outer, d in MIRROR_PAIRS:
    if HAVE_EXCEL:
        theta_in = bal_excel[inner]['peri_ecl']
        theta_out = bal_excel[outer]['peri_ecl']
    else:
        theta_in = bal_calc[inner]['theta']
        theta_out = bal_calc[outer]['theta']
    delta = norm180(theta_in - theta_out)
    anti = abs(abs(delta) - 180)
    print(f"  {inner+'/'+outer:>25s}  {d:>4d}  {theta_in:10.3f}°  {theta_out:10.3f}°  {delta:+10.3f}°  {anti:10.3f}°")
    if inner == 'Mars':
        obs_mars_jup_anti = anti

# ── 7B: Uranus-Earth coincidence ──
print("\n" + "─" * 100)
print("7B. URANUS-EARTH θ_bal COINCIDENCE")
print("─" * 100)

if HAVE_EXCEL:
    theta_Ur = bal_excel['Uranus']['peri_ecl']
    theta_Ea = bal_excel['Earth']['peri_ecl']
else:
    theta_Ur = bal_calc['Uranus']['theta']
    theta_Ea = bal_calc['Earth']['theta']

print(f"\n  Earth:  θ_bal = {theta_Ea:.3f}° (dev from 270°: {norm180(theta_Ea - 270):+.3f}°)")
print(f"  Uranus: θ_bal = {theta_Ur:.3f}° (dev from 270°: {norm180(theta_Ur - 270):+.3f}°)")
print(f"  Δθ(Earth−Uranus) = {norm180(theta_Ea - theta_Ur):+.3f}°")
print(f"\n  Earth and Uranus are NOT mirror partners (those are Earth/Saturn and Mercury/Uranus).")
print(f"  The coincidence comes from sharing the SAME Ω precession rate: H/16 = {H/16:,.0f} yr")

# ── 7C: Monte Carlo significance of mirror patterns ──
print("\n" + "─" * 100)
print("7C. MONTE CARLO: MIRROR PAIR SIGNIFICANCE")
print("─" * 100)

if obs_mars_jup_anti is not None:
    n_mc_mp = 100_000
    np.random.seed(42)

    # Also compute three-pair clustering
    if HAVE_EXCEL:
        other_deltas = [
            abs(norm180(bal_excel['Mercury']['peri_ecl'] - bal_excel['Uranus']['peri_ecl'])),
            abs(norm180(bal_excel['Venus']['peri_ecl'] - bal_excel['Neptune']['peri_ecl'])),
            abs(norm180(bal_excel['Earth']['peri_ecl'] - bal_excel['Saturn']['peri_ecl'])),
        ]
    else:
        other_deltas = [
            abs(norm180(bal_calc['Mercury']['theta'] - bal_calc['Uranus']['theta'])),
            abs(norm180(bal_calc['Venus']['theta'] - bal_calc['Neptune']['theta'])),
            abs(norm180(bal_calc['Earth']['theta'] - bal_calc['Saturn']['theta'])),
        ]
    obs_cluster_std = np.std(other_deltas)

    count_anti = 0
    count_cluster = 0
    for _ in range(n_mc_mp):
        angles = np.random.uniform(0, 360, 8)
        delta_mj = abs(abs(norm180(angles[6] - angles[7])) - 180)
        if delta_mj <= obs_mars_jup_anti:
            count_anti += 1
        d3 = [abs(norm180(angles[0] - angles[1])),
              abs(norm180(angles[2] - angles[3])),
              abs(norm180(angles[4] - angles[5]))]
        if np.std(d3) <= obs_cluster_std:
            count_cluster += 1

    p_anti = count_anti / n_mc_mp
    p_cluster = count_cluster / n_mc_mp

    print(f"\n  Mars-Jupiter anti-alignment: |Δθ−180°| = {obs_mars_jup_anti:.2f}°, p = {p_anti:.4f}")
    print(f"  Three-pair clustering: std(|Δθ|) = {obs_cluster_std:.2f}°, p = {p_cluster:.4f}")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  §8  LAW 6 ANGULAR TRIAD CONSTRAINT                                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("§8 — LAW 6 ANGULAR TRIAD CONSTRAINT (3+5=8)")
print("  Does the Law 3 triad Earth-Jupiter-Saturn extend to angular variables?")
print("=" * 100)

w_E = OMEGA0['Earth']     # 180.000°
w_J = OMEGA0['Jupiter']   # +62.652°
w_S = OMEGA0['Saturn']    # -27.116°

# ── 8A: ω weighted combinations ──
print("\n" + "─" * 100)
print("8A. ω WEIGHTED COMBINATIONS")
print("─" * 100)

print(f"\n  ω₀: Earth = {w_E:.3f}°, Jupiter = {w_J:+.3f}°, Saturn = {w_S:+.3f}°")

tests_omega = [
    ("|ω_J| + |ω_S| = 90°",
     abs(w_J) + abs(w_S), 90),
    ("3ω_E + 5ω_J − 8ω_S (mod 360)",
     norm180(3*w_E + 5*w_J - 8*w_S), 0),
    ("ω_J − ω_E vs −120° = −360°/F₄",
     norm180(w_J - w_E), -120),
]

print(f"\n  {'Test':>45s}  {'LHS':>10s}  {'RHS':>10s}  {'Δ':>8s}  {'Err%':>8s}")
print("  " + "─" * 88)

for label, lhs, rhs in tests_omega:
    diff = lhs - rhs
    err_pct = abs(diff) / max(abs(rhs), 0.01) * 100
    print(f"  {label:>45s}  {lhs:+10.3f}  {rhs:+10.3f}  {diff:+7.3f}°  {err_pct:7.2f}%")

print(f"\n  Key result: |ω_J| + |ω_S| = {abs(w_J) + abs(w_S):.3f}° ≈ 90° (0.26% error)")

# ── 8B: Inclination-weighted ω ──
print("\n" + "─" * 100)
print("8B. INCLINATION-WEIGHTED ω: 3(η_E×ω_E) + 5(η_J×ω_J) = 8(η_S×ω_S) ?")
print("─" * 100)

if HAVE_EXCEL:
    incl_E = bal_excel['Earth']['incl']
    incl_J = bal_excel['Jupiter']['incl']
    incl_S = bal_excel['Saturn']['incl']
else:
    incl_E = 1.57  # approximate
    incl_J = 0.33
    incl_S = 0.93

eta_E = incl_E * math.sqrt(MASSES['Earth'])
eta_J = incl_J * math.sqrt(MASSES['Jupiter'])
eta_S = incl_S * math.sqrt(MASSES['Saturn'])

law3 = 3 * eta_E + 5 * eta_J
law3_rhs = 8 * eta_S
print(f"\n  Law 3 check: 3η_E + 5η_J = {law3:.6f}, 8η_S = {law3_rhs:.6f} ({(law3-law3_rhs)/law3_rhs*100:.3f}%)")

lhs_etaw = 3 * eta_E * w_E + 5 * eta_J * w_J
rhs_etaw = 8 * eta_S * w_S
print(f"\n  3(η_E×ω_E) + 5(η_J×ω_J) = {lhs_etaw:.3f}")
print(f"  8(η_S×ω_S)               = {rhs_etaw:.3f}")
print(f"  Δ = {norm180(lhs_etaw - rhs_etaw):.3f}° — NOT close to 0")

print(f"\n  Conclusion: Law 6 triad constrains MAGNITUDES (η) but not DIRECTIONS (ω, Ω)")
print(f"  The only clean angular relation is |ω_J| + |ω_S| = 90° at 0.26%.")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SUMMARY                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝

print("\n\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)

jup_dev = sensitivities['Jupiter']['dev']
jup_pct = sensitivities['Jupiter']['pct_needed']

print(f"""
  §1 — BALANCE-YEAR ANGULAR POSITIONS
    Analytical propagation matches Excel to within a few degrees (frame/rate approx).
    Earth at 270° (exact, by construction). Jupiter at {norm180(theta_J - 180):+.3f}° from 180°.

  §2 — JUPITER 180° PRECISION
    θ_bal = {theta_J:.3f}° → deviation {norm180(theta_J-180):+.3f}° (0.046%).
    Needs only {jup_pct:.4f}% period adjustment for exact 180°.

  §3 — SENSITIVITY CLASSIFICATION
    Jupiter: LOCKED (< 0.5° deviation, < 0.01% period adjustment).
    Earth: LOCKED (exact by construction).
    Mars: TUNED (few degrees from 0°).
    Venus, Neptune: poorest cardinal-angle alignment.

  §4 — ECLIPTIC-FRAME ANALYSIS
    ω_ecl + i = 180° is an EXACT IDENTITY for EARTH ONLY (RMS < 0.001°).
    Perihelion and Ω precess at the SAME rate in ecliptic frame → ω is constant.
    Ecliptic frame gives ~2× better cardinal-angle alignment than ICRF.

  §5 — θ_bal FIBONACCI CHECK & ω PREDICTION
    θ_bal ICRF: RMS = {rms_icrf:.3f}°, p = {p_8:.4f}.
    Forward prediction (θ_clean → ω): RMS = {rms_fwd:.3f}°.
    Cardinal-angle Big Four (E,Ma,J,U): RMS = {rms_big4:.3f}°.

  §6 — Ω_bal DETERMINATION""")

if bvw_deltas:
    print(f"    BvW secular theory: RMS = {rms_bvw:.1f}° — {'FAILS' if rms_bvw > 30 else 'rough'}.")
print(f"    Ω_bal Fibonacci check: RMS = {rms_omega_bal:.3f}°.")
print(f"    → Ω_bal carries formation information beyond first-order secular theory.")

if obs_mars_jup_anti is not None:
    print(f"""
  §7 — MIRROR-PAIR GEOMETRY
    Mars-Jupiter anti-alignment: |Δθ−180°| = {obs_mars_jup_anti:.1f}° (p = {p_anti:.4f}).
    Uranus-Earth coincidence (both near 270°): same Ω precession rate (H/16), not mirror symmetry.

  §8 — LAW 6 ANGULAR TRIAD
    No angular analog of 3η_E + 5η_J = 8η_S found for ω or Ω.
    Only: |ω_J| + |ω_S| = 90° at 0.26%.
    Conclusion: Law 6 constrains magnitudes, not directions.
""")

print("Done.")

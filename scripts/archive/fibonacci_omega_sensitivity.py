#!/usr/bin/env python3
"""
§7.13 — Sensitivity of Balance-Year Geometry to Precession Period
=================================================================
How sensitive is each planet's θ_bal to:
  1. The precession period (±1%, ±5%, ±10%)
  2. The balance year definition (±10,000 years)

Key question: Is Jupiter at 180° fine-tuned or robust?

Uses the Excel-verified J2000 values and Holistic precession periods.
"""

import math

# ==============================================================
# Constants
# ==============================================================
H = 333_888
BALANCE_YEAR = -301_340
J2000_YEAR = 2000
DT = J2000_YEAR - BALANCE_YEAR  # 303,340 years

def norm360(a):
    return a % 360

def norm180(a):
    a = a % 360
    return a if a <= 180 else a - 360

# ==============================================================
# Planet data — J2000 perihelion longitudes and precession periods
# ==============================================================
# theta0 = J2000 perihelion longitude (ICRF)
# T = precession period (years), positive = prograde
# For Earth: separate perihelion and node periods
planets = {
    'Mercury':  {'theta0': 77.457,  'T': 8*H/11,  'dir': +1},
    'Venus':    {'theta0': 131.577, 'T': 2*H,     'dir': +1},
    'Earth':    {'theta0': 102.95,  'T': H/16,    'dir': +1},  # perihelion rate
    'Mars':     {'theta0': 336.065, 'T': 3*H/13,  'dir': +1},
    'Jupiter':  {'theta0': 14.707,  'T': H/5,     'dir': +1},
    'Saturn':   {'theta0': 92.128,  'T': H/8,     'dir': -1},
    'Uranus':   {'theta0': 170.731, 'T': H/3,     'dir': +1},
    'Neptune':  {'theta0': 45.801,  'T': 2*H,     'dir': +1},
}

order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

# Nearest cardinal angle for each planet (from §7.12 Excel results)
cardinal_targets = {
    'Mercury':  0.0,
    'Venus':    0.0,    # or 270, but 0 is closer in the propagation sense
    'Earth':    270.0,
    'Mars':     0.0,
    'Jupiter':  180.0,
    'Saturn':   180.0,
    'Uranus':   270.0,
    'Neptune':  270.0,
}

def compute_theta_bal(theta0, T, direction, dt):
    """Compute balance-year perihelion longitude."""
    n_rev = dt / T
    angle_shift = n_rev * 360.0
    return norm360(theta0 - direction * angle_shift)


print("=" * 90)
print("§7.13 — SENSITIVITY OF BALANCE-YEAR GEOMETRY TO PRECESSION PERIOD")
print("=" * 90)

# ==============================================================
# 1. BASELINE: θ_bal at nominal precession periods
# ==============================================================
print("\n" + "─" * 90)
print("1. BASELINE θ_bal VALUES (nominal periods)")
print("─" * 90)

print(f"\n  Balance year = {BALANCE_YEAR:,}")
print(f"  Δt = {DT:,} years")

print(f"\n  {'Planet':10s}  {'T (yr)':>12s}  {'N_cycles':>10s}  {'θ_bal':>10s}  {'Target':>8s}  {'Deviation':>10s}")
print("  " + "─" * 68)

for name in order:
    p = planets[name]
    T = p['T']
    d = p['dir']
    theta_bal = compute_theta_bal(p['theta0'], T, d, DT)
    target = cardinal_targets[name]
    dev = norm180(theta_bal - target)
    n_cycles = DT / T
    print(f"  {name:10s}  {T:12.1f}  {n_cycles:10.3f}  {theta_bal:10.3f}°  {target:8.0f}°  {dev:+10.3f}°")

# ==============================================================
# 2. SENSITIVITY TO PRECESSION PERIOD
# ==============================================================
print("\n" + "─" * 90)
print("2. SENSITIVITY: dθ/dP (degrees per 1% period change)")
print("─" * 90)

print(f"\n  The sensitivity is: dθ/dP = Δt × 360 / P² × 0.01P = 0.01 × Δt × 360 / P")
print(f"  = 0.01 × N_cycles × 360°")
print(f"\n  More cycles between balance year and J2000 → higher sensitivity.")

print(f"\n  {'Planet':10s}  {'T (yr)':>12s}  {'N_cycles':>10s}  {'dθ/1%P':>10s}  {'1% = °':>10s}  {'θ_bal→180°':>12s}")
print("  " + "─" * 72)

sensitivities = {}
for name in order:
    p = planets[name]
    T = p['T']
    n_cycles = DT / T
    # dθ for 1% period change
    dtheta_1pct = n_cycles * 360.0 * 0.01
    # How much period change needed to hit target exactly?
    theta_nom = compute_theta_bal(p['theta0'], T, p['dir'], DT)
    target = cardinal_targets[name]
    dev = norm180(theta_nom - target)
    # Period change needed: dev / (dθ/1%) * 1%
    pct_needed = abs(dev) / dtheta_1pct * 1.0 if dtheta_1pct > 0 else float('inf')

    sensitivities[name] = {
        'n_cycles': n_cycles,
        'dtheta_1pct': dtheta_1pct,
        'dev': dev,
        'pct_needed': pct_needed,
    }

    print(f"  {name:10s}  {T:12.1f}  {n_cycles:10.3f}  {dtheta_1pct:10.2f}°  {pct_needed:9.4f}%  {dev:+10.3f}°")

# ==============================================================
# 3. DETAILED SWEEP: Jupiter
# ==============================================================
print("\n" + "─" * 90)
print("3. JUPITER: θ_bal vs PRECESSION PERIOD (sweep ±10%)")
print("─" * 90)

T_nom = planets['Jupiter']['T']
theta0 = planets['Jupiter']['theta0']
d = planets['Jupiter']['dir']

print(f"\n  Nominal: T = {T_nom:.1f} yr (H/5)")
print(f"  J2000 θ₀ = {theta0:.3f}°")
print(f"\n  {'ΔP (%)':>8s}  {'T (yr)':>12s}  {'θ_bal':>10s}  {'Dev from 180°':>14s}")
print("  " + "─" * 50)

for pct in [-10, -5, -2, -1, -0.5, -0.1, -0.05, 0, 0.005, 0.05, 0.1, 0.5, 1, 2, 5, 10]:
    T_test = T_nom * (1 + pct/100)
    theta_test = compute_theta_bal(theta0, T_test, d, DT)
    dev = norm180(theta_test - 180.0)
    marker = " ← nominal" if pct == 0 else ""
    if abs(dev) < 0.1:
        marker += " ★ EXACT"
    print(f"  {pct:+8.3f}%  {T_test:12.1f}  {theta_test:10.3f}°  {dev:+14.3f}°{marker}")

# Find exact period for θ_bal = 180°
# θ_bal = θ0 - (DT/T) * 360 mod 360 = 180
# θ0 - 180 = (DT/T) * 360 * k for integer k
# T = DT * 360 / ((θ0 - 180) + 360*k)
print(f"\n  Periods giving θ_bal = exactly 180°:")
theta_diff = theta0 - 180.0  # = -165.293°
for k in range(-10, 10):
    denom = theta_diff + 360 * k
    if denom != 0:
        T_exact = DT * 360.0 / denom
        if T_exact > 0 and abs(T_exact - T_nom) / T_nom < 0.2:  # within 20%
            pct_off = (T_exact - T_nom) / T_nom * 100
            print(f"    k = {k:+d}: T = {T_exact:.2f} yr ({pct_off:+.4f}% from H/5)")

# ==============================================================
# 4. SENSITIVITY TO BALANCE YEAR DEFINITION
# ==============================================================
print("\n" + "─" * 90)
print("4. JUPITER: θ_bal vs BALANCE YEAR (±50,000 years)")
print("─" * 90)

T_jup = planets['Jupiter']['T']
print(f"\n  {'Bal Year':>12s}  {'Δt (yr)':>12s}  {'θ_bal':>10s}  {'Dev from 180°':>14s}")
print("  " + "─" * 54)

for shift in [-50000, -20000, -10000, -5000, -1000, -100, 0, 100, 1000, 5000, 10000, 20000, 50000]:
    bal_test = BALANCE_YEAR + shift
    dt_test = J2000_YEAR - bal_test
    theta_test = compute_theta_bal(theta0, T_jup, d, dt_test)
    dev = norm180(theta_test - 180.0)
    marker = " ← nominal" if shift == 0 else ""
    print(f"  {bal_test:12,}  {dt_test:12,}  {theta_test:10.3f}°  {dev:+14.3f}°{marker}")

# Sensitivity: dθ/dt_bal = 360/T degrees per year
dtheta_per_year = 360.0 / T_jup
print(f"\n  Jupiter: dθ/dt = 360°/T = {dtheta_per_year:.6f}°/year")
print(f"  → 1 year shift in balance year → {dtheta_per_year:.4f}° shift in θ_bal")
print(f"  → To shift θ_bal by 0.083° (current deviation), need {0.083/dtheta_per_year:.1f} year shift")

# ==============================================================
# 5. ALL PLANETS: SENSITIVITY COMPARISON
# ==============================================================
print("\n" + "─" * 90)
print("5. ALL PLANETS: SENSITIVITY COMPARISON")
print("─" * 90)

print(f"\n  {'Planet':10s}  {'N_cycles':>10s}  {'dθ/1%P':>10s}  {'Dev':>8s}  {'P adj needed':>14s}  {'Bal adj (yr)':>14s}  {'Verdict':>12s}")
print("  " + "─" * 90)

for name in order:
    p = planets[name]
    T = p['T']
    n_cycles = DT / T
    s = sensitivities[name]

    # Balance year adjustment needed (years)
    dtheta_per_yr = 360.0 / T
    bal_adj = abs(s['dev']) / dtheta_per_yr

    # Verdict
    if abs(s['dev']) < 0.5:
        verdict = "EXCELLENT"
    elif abs(s['dev']) < 5:
        verdict = "Good"
    elif abs(s['dev']) < 15:
        verdict = "Moderate"
    else:
        verdict = "Poor"

    print(f"  {name:10s}  {n_cycles:10.3f}  {s['dtheta_1pct']:10.2f}°  {s['dev']:+7.2f}°  {s['pct_needed']:12.4f}%  {bal_adj:12.0f} yr  {verdict:>12s}")

# ==============================================================
# 6. WHICH PLANETS' θ_bal ARE ROBUST?
# ==============================================================
print("\n" + "─" * 90)
print("6. ROBUSTNESS CLASSIFICATION")
print("─" * 90)

print(f"""
  A planet's θ_bal is "robust" if small changes in precession period don't
  shift it far from a cardinal angle. This depends on:
    - N_cycles: more cycles → higher sensitivity → less robust
    - Current deviation: closer to target → needs less adjustment

  Classification:
    - LOCKED:  deviation < 0.5° and period adjustment < 0.01%
    - TUNED:   deviation < 5° and period adjustment < 0.1%
    - LOOSE:   deviation < 15°
    - FREE:    deviation > 15° (no cardinal angle constraint visible)
""")

for name in order:
    s = sensitivities[name]
    dev = abs(s['dev'])
    pct = s['pct_needed']

    if dev < 0.5 and pct < 0.01:
        cat = "LOCKED"
    elif dev < 5 and pct < 0.1:
        cat = "TUNED"
    elif dev < 15:
        cat = "LOOSE"
    else:
        cat = "FREE"

    print(f"  {name:10s}: {cat:8s} — {s['dev']:+.3f}° from {cardinal_targets[name]:.0f}° (needs {pct:.4f}% period change)")

# ==============================================================
# 7. SUMMARY
# ==============================================================
print("\n" + "=" * 90)
print("SUMMARY")
print("=" * 90)

print(f"""
  JUPITER at 180°:
    - θ_bal = 180.083° (Excel), deviation = +0.083°
    - Sensitivity: {sensitivities['Jupiter']['dtheta_1pct']:.1f}°/1% period change
    - Period adjustment to reach exact 180°: {sensitivities['Jupiter']['pct_needed']:.4f}%
    - Balance year adjustment: {0.083 * planets['Jupiter']['T'] / 360:.0f} years
    - Verdict: The 180° is moderately sensitive to the precession period.
      A {sensitivities['Jupiter']['pct_needed']:.4f}% change in H/5 would make it exact.
      This is well within any observational uncertainty on the precession period.

  EARTH at 270°:
    - θ_bal = 270.000° (exact by construction — Earth defines the balance year)

  MARS at 0°:
    - θ_bal = 356.2°, deviation = -3.8°
    - Sensitivity: {sensitivities['Mars']['dtheta_1pct']:.1f}°/1% → needs {sensitivities['Mars']['pct_needed']:.3f}% adjustment

  KEY INSIGHT: Jupiter's 0.083° deviation from 180° requires only a
  {sensitivities['Jupiter']['pct_needed']:.4f}% period adjustment — {0.083 * planets['Jupiter']['T'] / 360:.0f} years shift in balance year.
  This is remarkably fine-tuned: the precession period must be within
  ~{sensitivities['Jupiter']['pct_needed']:.3f}% of H/5 for θ_bal to land within 0.083° of 180°.
""")

print("Done.")

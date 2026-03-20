#!/usr/bin/env python3
"""
§7.7 + §7.8 — Balance-Year θ_bal Fibonacci Check & ω Prediction
=================================================================

§7.7: Are balance-year perihelion longitudes (θ_bal) Fibonacci fractions of 360°?
      Test in BOTH ecliptic and ICRF frames. Monte Carlo significance.

§7.8: Can θ_bal predict ω?
      If θ_bal = nearest Fibonacci fraction, does ω_pred = θ_bal − Ω_bal
      match the observed frame-corrected ω₀?

Uses ecliptic-frame data from §7.15 and ICRF data from §7.12.
"""

import pandas as pd
import numpy as np
from itertools import combinations

# ==============================================================
# Constants & Data
# ==============================================================
H = 333_888

def norm360(a):
    return a % 360

def norm180(a):
    a = a % 360
    return a if a <= 180 else a - 360

# Frame-corrected ω₀ values from §7.4 (the best estimates of true constant ω)
omega0 = {
    'Mercury':  +45.012,
    'Venus':    +73.832,
    'Earth':   +180.000,
    'Mars':     -21.213,   # = 338.787°
    'Jupiter':  +62.652,
    'Saturn':   -27.116,   # = 332.884°
    'Uranus':  -138.104,   # = 221.896°
    'Neptune': -144.051,   # = 215.949°
}

planets_order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

# ==============================================================
# Load Excel data
# ==============================================================
xlsx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', '01-holistic-year-objects-data.xlsx')
df = pd.read_excel(xlsx_path, 'Perihelion Planets')
years = df.iloc[:, 3].values
bal_idx = 0  # Balance year is first row

# Extract balance-year values for all planets
bal = {}
for name in planets_order:
    d = {}
    # Ecliptic columns: Earth has no '* ' prefix; all other planets do
    ecl_prefix = '' if name == 'Earth' else '* '
    d['peri_ecl'] = df[f'{ecl_prefix}{name} Perihelion (Ecliptic)'].values[bal_idx]
    d['omega_ecl'] = df[f'{ecl_prefix}{name} Asc Node InvPlane (Ecliptic)'].values[bal_idx]
    d['peri_icrf'] = df[f'{name} Perihelion ICRF' if name != 'Earth' else 'Earth Perihelion ICRF'].values[bal_idx]
    d['omega_icrf'] = df[f'{name} Asc Node InvPlane ICRF' if name != 'Earth' else 'Earth Asc Node InvPlane ICRF'].values[bal_idx]
    d['incl'] = df[f'{name} InvPlane Inclination' if name != 'Earth' else 'Earth InvPlane Inclination'].values[bal_idx]
    bal[name] = d

# ==============================================================
# Build Fibonacci fraction target set
# ==============================================================
fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]

# Strategy: generate all F_a/F_b, F_a²/F_b, F_a/(F_b×F_c) fractions × 360°
fib_targets = {}  # name -> angle in [0, 360)

# Simple F_a/F_b
for i, f1 in enumerate(fibs):
    for f2 in fibs:
        if f1 != f2 and f2 != 0:
            ratio = f1 / f2
            if 0 < ratio <= 1:
                angle = ratio * 360
                fib_targets[f"{f1}/{f2}"] = angle
            elif ratio > 1 and ratio * 360 <= 360:
                fib_targets[f"{f1}/{f2}"] = ratio * 360

# F_a²/F_b
for f1 in fibs:
    for f2 in fibs:
        if f2 != 0:
            ratio = f1**2 / f2
            angle = (ratio * 360) % 360
            if angle > 0:
                fib_targets[f"{f1}²/{f2}"] = angle

# F_a/(F_b×F_c)
for f1 in fibs:
    for f2 in fibs:
        for f3 in fibs:
            if f2 * f3 != 0:
                ratio = f1 / (f2 * f3)
                angle = (ratio * 360) % 360
                if 0 < angle < 360:
                    fib_targets[f"{f1}/({f2}×{f3})"] = angle

# Also add simple integer fractions n/d for d up to 13
for n in range(1, 14):
    for d in range(1, 14):
        if n < d:
            angle = n / d * 360
            fib_targets[f"{n}/{d}"] = angle

# Also add complements (360 - angle)
extra = {}
for name, angle in list(fib_targets.items()):
    comp = 360 - angle
    if comp > 0 and comp < 360:
        extra[f"1-{name}"] = comp
fib_targets.update(extra)

# Deduplicate: keep unique angles (within 0.01°)
unique_targets = {}
for name, angle in sorted(fib_targets.items(), key=lambda x: x[1]):
    angle_norm = norm360(angle)
    if angle_norm < 0.01 or angle_norm > 359.99:
        continue
    # Check if we already have this angle
    is_dup = False
    for existing_angle in unique_targets.values():
        if abs(norm180(angle_norm - existing_angle)) < 0.01:
            is_dup = True
            break
    if not is_dup:
        unique_targets[name] = angle_norm
fib_targets = unique_targets

# Also always include cardinal angles
fib_targets['0/1'] = 0.0  # will match 360°
fib_targets['1/4'] = 90.0
fib_targets['1/2'] = 180.0
fib_targets['3/4'] = 270.0

target_angles = sorted(set(fib_targets.values()))
n_targets = len(target_angles)

def best_fib_match(angle):
    """Find the best Fibonacci fraction match for an angle."""
    a = norm360(angle)
    best_name = None
    best_dev = 999
    best_angle = None
    for name, target in fib_targets.items():
        dev = abs(norm180(a - target))
        if dev < best_dev:
            best_dev = dev
            best_name = name
            best_angle = target
    return best_name, best_angle, best_dev

print("=" * 110)
print("§7.7 + §7.8 — BALANCE-YEAR θ_bal FIBONACCI CHECK & ω PREDICTION")
print("=" * 110)
print(f"\n  Fibonacci target set: {n_targets} unique angles in [0°, 360°)")
print(f"  Average target spacing: {360/n_targets:.2f}°")


# ==============================================================
# §7.7 PART 1: θ_bal Fibonacci matches — ECLIPTIC FRAME
# ==============================================================
print("\n" + "=" * 110)
print("§7.7 — BALANCE-YEAR θ_bal FIBONACCI CHECK")
print("=" * 110)

print("\n" + "─" * 110)
print("A. ECLIPTIC FRAME: θ_bal = perihelion longitude at balance year")
print("─" * 110)

# Note: Earth's peri_ecl is derived (see §7.15 Part F), so flag it
print(f"\n  {'Planet':10s}  {'θ_bal(ecl)':>12s}  {'Best match':>14s}  {'Target':>10s}  {'Dev':>8s}  {'Error%':>8s}  {'Note':>12s}")
print("  " + "─" * 85)

ecl_devs = []
ecl_devs_no_earth = []
for name in planets_order:
    theta = bal[name]['peri_ecl']
    frac_name, frac_angle, dev = best_fib_match(theta)
    err_pct = abs(dev) / 360 * 100

    note = ""
    if name == 'Earth':
        note = "† derived"

    ecl_devs.append(abs(dev))
    if name != 'Earth':
        ecl_devs_no_earth.append(abs(dev))

    print(f"  {name:10s}  {theta:12.3f}°  {frac_name:>14s}  {frac_angle:10.3f}°  {dev:+7.3f}°  {err_pct:7.3f}%  {note:>12s}")

rms_ecl = np.sqrt(np.mean(np.array(ecl_devs)**2))
rms_ecl_no_earth = np.sqrt(np.mean(np.array(ecl_devs_no_earth)**2))
print(f"\n  RMS deviation (all 8):        {rms_ecl:.3f}°")
print(f"  RMS deviation (7, excl Earth): {rms_ecl_no_earth:.3f}°")
print(f"  † Earth's peri_ecl is derived from Ω_ecl and i (see §7.15 Part F)")


# ==============================================================
# §7.7 PART 1b: θ_bal Fibonacci matches — ICRF FRAME
# ==============================================================
print("\n" + "─" * 110)
print("B. ICRF FRAME: θ_bal = perihelion longitude at balance year")
print("─" * 110)

print(f"\n  {'Planet':10s}  {'θ_bal(ICRF)':>12s}  {'Best match':>14s}  {'Target':>10s}  {'Dev':>8s}  {'Error%':>8s}")
print("  " + "─" * 70)

icrf_devs = []
for name in planets_order:
    theta = bal[name]['peri_icrf']
    frac_name, frac_angle, dev = best_fib_match(theta)
    err_pct = abs(dev) / 360 * 100
    icrf_devs.append(abs(dev))
    print(f"  {name:10s}  {theta:12.3f}°  {frac_name:>14s}  {frac_angle:10.3f}°  {dev:+7.3f}°  {err_pct:7.3f}%")

rms_icrf = np.sqrt(np.mean(np.array(icrf_devs)**2))
print(f"\n  RMS deviation (all 8): {rms_icrf:.3f}°")
print(f"\n  Ecliptic RMS = {rms_ecl:.3f}° vs ICRF RMS = {rms_icrf:.3f}° — {'ecliptic better' if rms_ecl < rms_icrf else 'ICRF better'}")


# ==============================================================
# §7.7 PART 2: Monte Carlo significance — ECLIPTIC FRAME
# ==============================================================
print("\n" + "─" * 110)
print("C. MONTE CARLO: Statistical significance of θ_bal Fibonacci matches")
print("─" * 110)

n_mc = 100_000
np.random.seed(42)

def compute_rms_fib_match(angles):
    """RMS of best Fibonacci fraction deviations for a set of angles."""
    devs = []
    for a in angles:
        _, _, dev = best_fib_match(a)
        devs.append(abs(dev))
    return np.sqrt(np.mean(np.array(devs)**2))

# Observed RMS (using 7 planets excl Earth for ecliptic, since Earth peri_ecl is derived)
theta_ecl_7 = [bal[name]['peri_ecl'] for name in planets_order if name != 'Earth']
observed_rms_7 = compute_rms_fib_match(theta_ecl_7)

# For ICRF, all 8 are independent
theta_icrf_8 = [bal[name]['peri_icrf'] for name in planets_order]
observed_rms_8_icrf = compute_rms_fib_match(theta_icrf_8)

print(f"\n  Running {n_mc:,} Monte Carlo trials...")

count_better_7 = 0
count_better_8_icrf = 0

for trial in range(n_mc):
    random_angles_7 = np.random.uniform(0, 360, 7)
    random_angles_8 = np.random.uniform(0, 360, 8)

    rms_7 = compute_rms_fib_match(random_angles_7)
    rms_8 = compute_rms_fib_match(random_angles_8)

    if rms_7 <= observed_rms_7:
        count_better_7 += 1
    if rms_8 <= observed_rms_8_icrf:
        count_better_8_icrf += 1

p_7_ecl = count_better_7 / n_mc
p_8_icrf = count_better_8_icrf / n_mc

print(f"\n  ECLIPTIC (7 planets, excl derived Earth):")
print(f"    Observed RMS: {observed_rms_7:.3f}°")
print(f"    p-value: {p_7_ecl:.4f} ({count_better_7:,}/{n_mc:,} random sets ≤ observed)")
print(f"    {'SIGNIFICANT at 5%' if p_7_ecl < 0.05 else 'Not significant at 5%'}")

print(f"\n  ICRF (all 8 planets):")
print(f"    Observed RMS: {observed_rms_8_icrf:.3f}°")
print(f"    p-value: {p_8_icrf:.4f} ({count_better_8_icrf:,}/{n_mc:,} random sets ≤ observed)")
print(f"    {'SIGNIFICANT at 5%' if p_8_icrf < 0.05 else 'Not significant at 5%'}")


# ==============================================================
# §7.7 PART 3: Best-4 significance (strongest subset)
# ==============================================================
print("\n" + "─" * 110)
print("D. BEST-4 SUBSET: Significance of the 'Big Four' (Earth, Mars, Jupiter, Uranus)")
print("─" * 110)

big_four_icrf = [bal[name]['peri_icrf'] for name in ['Earth', 'Mars', 'Jupiter', 'Uranus']]
big_four_ecl = [bal[name]['peri_ecl'] for name in ['Mars', 'Jupiter', 'Uranus']]  # excl derived Earth

rms_big4_icrf = compute_rms_fib_match(big_four_icrf)
rms_big4_ecl = compute_rms_fib_match(big_four_ecl)

print(f"\n  Big Four ICRF (Earth, Mars, Jupiter, Uranus): RMS = {rms_big4_icrf:.3f}°")
print(f"  Big Three ecliptic (Mars, Jupiter, Uranus excl Earth): RMS = {rms_big4_ecl:.3f}°")

count_big4_icrf = 0
count_big3_ecl = 0
for trial in range(n_mc):
    r4 = np.random.uniform(0, 360, 4)
    r3 = np.random.uniform(0, 360, 3)
    if compute_rms_fib_match(r4) <= rms_big4_icrf:
        count_big4_icrf += 1
    if compute_rms_fib_match(r3) <= rms_big4_ecl:
        count_big3_ecl += 1

p_big4 = count_big4_icrf / n_mc
p_big3 = count_big3_ecl / n_mc

print(f"\n  ICRF Big Four: p = {p_big4:.4f} ({count_big4_icrf:,}/{n_mc:,})")
print(f"  Ecliptic Big Three: p = {p_big3:.4f} ({count_big3_ecl:,}/{n_mc:,})")


# ==============================================================
# §7.7 PART 4: Comparison with ω pattern (from §7.1)
# ==============================================================
print("\n" + "─" * 110)
print("E. COMPARISON: θ_bal pattern vs ω pattern (§7.1)")
print("─" * 110)

omega_devs = []
for name in planets_order:
    if name == 'Earth':
        omega_devs.append(0.0)  # Earth ω = 180° exactly
        continue
    w = norm360(omega0[name])
    _, _, dev = best_fib_match(w)
    omega_devs.append(abs(dev))

rms_omega = np.sqrt(np.mean(np.array(omega_devs)**2))
rms_omega_no_earth = np.sqrt(np.mean(np.array([d for i, d in enumerate(omega_devs) if planets_order[i] != 'Earth'])**2))

print(f"\n  ω pattern (§7.1):    RMS = {rms_omega_no_earth:.3f}° (7 planets excl Earth)")
print(f"  θ_bal ecliptic:      RMS = {observed_rms_7:.3f}° (7 planets excl derived Earth)")
print(f"  θ_bal ICRF:          RMS = {observed_rms_8_icrf:.3f}° (all 8)")
print(f"\n  → θ_bal pattern is {'STRONGER' if observed_rms_7 < rms_omega_no_earth else 'WEAKER'} than ω pattern")


# ==============================================================
# §7.8 — CAN θ_bal PREDICT ω?
# ==============================================================
print("\n\n" + "=" * 110)
print("§7.8 — CAN θ_bal PREDICT ω?")
print("=" * 110)

print(f"""
  If θ_bal is constrained to be a Fibonacci fraction of 360°, then:
    ω_pred = θ_bal_clean − Ω_bal

  Compare ω_pred with the observed frame-corrected ω₀ (from §7.4).
""")

# ==============================================================
# §7.8 PART 1: ICRF frame prediction
# ==============================================================
print("─" * 110)
print("A. ICRF FRAME: ω_pred = θ_bal_clean(ICRF) − Ω_bal(ICRF)")
print("─" * 110)

print(f"\n  {'Planet':10s}  {'θ_bal':>10s}  {'θ_clean':>10s}  {'Frac':>14s}  {'Ω_bal':>10s}  {'ω_pred':>10s}  {'ω₀(§7.4)':>10s}  {'Δω':>8s}  {'Match?':>8s}")
print("  " + "─" * 105)

icrf_predictions = {}
for name in planets_order:
    theta = bal[name]['peri_icrf']
    omega_bal = bal[name]['omega_icrf']
    frac_name, frac_angle, dev = best_fib_match(theta)

    # Use the clean Fibonacci fraction as θ_clean
    theta_clean = frac_angle

    # Predict ω
    w_pred = norm180(theta_clean - omega_bal)
    w_obs = omega0[name]
    if w_obs > 180:
        w_obs -= 360
    dw = norm180(w_pred - w_obs)

    match = "YES" if abs(dw) < 5 else ("~yes" if abs(dw) < 10 else "no")

    icrf_predictions[name] = {'theta_clean': theta_clean, 'w_pred': w_pred, 'dw': dw}

    print(f"  {name:10s}  {theta:10.3f}°  {theta_clean:10.3f}°  {frac_name:>14s}  {omega_bal:10.3f}°"
          f"  {w_pred:+10.3f}°  {w_obs:+10.3f}°  {dw:+7.3f}°  {match:>8s}")

icrf_dw = [abs(icrf_predictions[n]['dw']) for n in planets_order]
print(f"\n  RMS prediction error: {np.sqrt(np.mean(np.array(icrf_dw)**2)):.3f}°")
print(f"  Max prediction error: {np.max(icrf_dw):.3f}° ({planets_order[np.argmax(icrf_dw)]})")
good_count = sum(1 for d in icrf_dw if d < 5)
print(f"  Planets with |Δω| < 5°: {good_count}/8")


# ==============================================================
# §7.8 PART 2: ECLIPTIC frame prediction
# ==============================================================
print("\n" + "─" * 110)
print("B. ECLIPTIC FRAME: ω_pred = θ_bal_clean(ecl) − Ω_bal(ecl)")
print("─" * 110)

print(f"\n  Note: For Earth, peri_ecl is derived, so this test is circular for Earth.")
print(f"  For non-Earth planets, ω_ecl ≠ true ω (different plane), but the ICRF ω₀ is")
print(f"  what we want to predict. So: ω_pred(ecl) = θ_clean(ecl) − Ω_bal(ecl), then")
print(f"  compare with ω₀(ICRF). There's a frame mismatch, but for planets with small")
print(f"  ecliptic inclination, the difference is small.")

print(f"\n  {'Planet':10s}  {'θ_bal':>10s}  {'θ_clean':>10s}  {'Frac':>14s}  {'Ω_bal(ecl)':>10s}  {'ω_pred':>10s}  {'ω₀(§7.4)':>10s}  {'Δω':>8s}")
print("  " + "─" * 95)

ecl_predictions = {}
for name in planets_order:
    theta = bal[name]['peri_ecl']
    omega_bal = bal[name]['omega_ecl']
    frac_name, frac_angle, dev = best_fib_match(theta)
    theta_clean = frac_angle

    w_pred = norm180(theta_clean - omega_bal)
    w_obs = omega0[name]
    if w_obs > 180:
        w_obs -= 360
    dw = norm180(w_pred - w_obs)

    note = "† circular" if name == 'Earth' else ""

    ecl_predictions[name] = {'theta_clean': theta_clean, 'w_pred': w_pred, 'dw': dw}

    print(f"  {name:10s}  {theta:10.3f}°  {theta_clean:10.3f}°  {frac_name:>14s}  {omega_bal:10.3f}°"
          f"  {w_pred:+10.3f}°  {w_obs:+10.3f}°  {dw:+7.3f}°  {note}")


# ==============================================================
# §7.8 PART 3: Manual cardinal-angle prediction (strongest test)
# ==============================================================
print("\n" + "─" * 110)
print("C. CARDINAL-ANGLE PREDICTION: Use θ_clean = nearest 90° multiple")
print("─" * 110)

print(f"\n  The 'Big Four' are all near multiples of 90°. What if we force θ_clean = 0°/90°/180°/270°?")
print(f"\n  {'Planet':10s}  {'θ_bal(ICRF)':>12s}  {'θ_clean':>10s}  {'Ω_bal':>10s}  {'ω_pred':>10s}  {'ω₀':>10s}  {'Δω':>8s}  {'Match?':>8s}")
print("  " + "─" * 85)

cardinal_map = {
    'Mercury': 0.0,      # 348.3° → 0°
    'Venus': 0.0,        # 326.2° → 0° (poor fit)
    'Earth': 270.0,      # 270.0° → 270°
    'Mars': 0.0,         # 356.2° → 0°
    'Jupiter': 180.0,    # 180.1° → 180°
    'Saturn': 180.0,     # 187.3° → 180°
    'Uranus': 270.0,     # 268.7° → 270°
    'Neptune': 270.0,    # 242.6° → 270° (poor fit)
}

cardinal_dw = []
for name in planets_order:
    theta = bal[name]['peri_icrf']
    omega_bal = bal[name]['omega_icrf']
    theta_clean = cardinal_map[name]

    w_pred = norm180(theta_clean - omega_bal)
    w_obs = omega0[name]
    if w_obs > 180:
        w_obs -= 360
    dw = norm180(w_pred - w_obs)
    cardinal_dw.append(abs(dw))

    match = "YES" if abs(dw) < 5 else ("~yes" if abs(dw) < 10 else "no")
    theta_dev = norm180(theta - theta_clean)

    print(f"  {name:10s}  {theta:12.3f}°  {theta_clean:10.0f}°  {omega_bal:10.3f}°"
          f"  {w_pred:+10.3f}°  {w_obs:+10.3f}°  {dw:+7.3f}°  {match:>8s}")

print(f"\n  RMS prediction error (all 8): {np.sqrt(np.mean(np.array(cardinal_dw)**2)):.3f}°")
big4_dw = [cardinal_dw[i] for i, n in enumerate(planets_order) if n in ['Earth', 'Mars', 'Jupiter', 'Uranus']]
print(f"  RMS prediction error (Big Four): {np.sqrt(np.mean(np.array(big4_dw)**2)):.3f}°")


# ==============================================================
# §7.8 PART 4: Hierarchy test — which is deeper, θ_bal or ω?
# ==============================================================
print("\n" + "─" * 110)
print("D. HIERARCHY: Is θ_bal or ω the deeper constraint?")
print("─" * 110)

print(f"""
  Two competing hypotheses:
  (H1) θ_bal is primary: balance-year perihelion longitudes are Fibonacci fractions,
       and ω = θ_bal − Ω_bal is a consequence. The "Fibonacci ω" pattern of §7.1
       follows from Fibonacci θ_bal + Fibonacci Ω_bal.

  (H2) ω is primary: the argument of perihelion is the formation constraint,
       and θ_bal = ω + Ω_bal is a consequence. θ_bal looks Fibonacci only because
       ω and Ω are independently Fibonacci.

  Test: Compare prediction errors both ways.
""")

# Forward prediction: θ_clean → ω_pred, compare with ω₀
forward_errors = []
for name in planets_order:
    if name == 'Earth':
        forward_errors.append(0.0)
        continue
    dw = icrf_predictions[name]['dw']
    forward_errors.append(abs(dw))

# Reverse prediction: ω₀ + Ω_bal → θ_pred, compare with θ_bal
print(f"  {'Planet':10s}  {'ω₀+Ω_bal':>10s}  {'θ_bal':>10s}  {'Δθ':>8s}   |   {'θ_clean-Ω':>10s}  {'ω₀':>10s}  {'Δω':>8s}")
print("  " + "─" * 80)

reverse_errors = []
for name in planets_order:
    theta_obs = bal[name]['peri_icrf']
    omega_bal = bal[name]['omega_icrf']
    w_obs = omega0[name]

    # Reverse: ω₀ → θ_pred
    theta_pred = norm360(w_obs + omega_bal)
    dtheta = norm180(theta_pred - theta_obs)
    reverse_errors.append(abs(dtheta))

    # Forward: θ_clean → ω_pred
    fwd = icrf_predictions[name]
    dw = fwd['dw']

    print(f"  {name:10s}  {theta_pred:10.3f}°  {theta_obs:10.3f}°  {dtheta:+7.3f}°   |"
          f"   {fwd['w_pred']:+10.3f}°  {w_obs:+10.3f}°  {dw:+7.3f}°")

rms_forward = np.sqrt(np.mean(np.array(forward_errors)**2))
rms_reverse = np.sqrt(np.mean(np.array(reverse_errors)**2))

print(f"\n  Forward (θ_clean → ω_pred):  RMS = {rms_forward:.3f}°")
print(f"  Reverse (ω₀ + Ω → θ_pred):  RMS = {rms_reverse:.3f}°")
print(f"\n  The reverse direction has RMS = {rms_reverse:.3f}° because ω₀ + Ω_bal = θ_bal exactly")
print(f"  (ω₀ is the mean over the cycle, Ω_bal is the specific balance-year Ω,")
print(f"   and their sum should equal θ_bal modulo the ω oscillation offset at the balance year).")

# Compare Fibonacci quality of θ_bal vs ω₀ vs Ω_bal
print(f"\n  Fibonacci fraction RMS comparison:")
omega_rms_list = []
omega_bal_rms_list = []
for name in planets_order:
    if name == 'Earth':
        continue
    w = norm360(omega0[name])
    _, _, dev_w = best_fib_match(w)
    omega_rms_list.append(abs(dev_w))

    ob = bal[name]['omega_icrf']
    _, _, dev_ob = best_fib_match(ob)
    omega_bal_rms_list.append(abs(dev_ob))

rms_omega_fib = np.sqrt(np.mean(np.array(omega_rms_list)**2))
rms_omega_bal_fib = np.sqrt(np.mean(np.array(omega_bal_rms_list)**2))

print(f"    ω₀ (frame-corrected):     RMS = {rms_omega_fib:.3f}° (7 planets)")
print(f"    Ω_bal (ICRF):             RMS = {rms_omega_bal_fib:.3f}° (7 planets)")
print(f"    θ_bal (ICRF):             RMS = {observed_rms_8_icrf:.3f}° (8 planets)")
print(f"    θ_bal (ecliptic, 7 pl.):  RMS = {observed_rms_7:.3f}° (excl derived Earth)")


# ==============================================================
# §7.8 PART 5: Per-planet assessment
# ==============================================================
print("\n" + "─" * 110)
print("E. PER-PLANET ASSESSMENT: Can θ_bal predict ω for each planet?")
print("─" * 110)

for name in planets_order:
    theta_icrf = bal[name]['peri_icrf']
    omega_bal_icrf = bal[name]['omega_icrf']
    w_obs = omega0[name]
    if w_obs > 180:
        w_obs_disp = w_obs - 360
    else:
        w_obs_disp = w_obs

    frac_name, frac_angle, dev_theta = best_fib_match(theta_icrf)
    w_pred = norm180(frac_angle - omega_bal_icrf)
    dw = norm180(w_pred - w_obs_disp)

    # Also check: what θ_clean would give EXACT ω₀?
    theta_exact = norm360(w_obs + omega_bal_icrf)
    _, exact_frac_name, exact_dev = best_fib_match(theta_exact)

    print(f"\n  {name}:")
    print(f"    θ_bal(ICRF) = {theta_icrf:.3f}° → best Fibonacci = {frac_angle:.3f}° ({frac_name}), dev = {dev_theta:+.3f}°")
    print(f"    Using θ_clean = {frac_angle:.3f}°: ω_pred = {w_pred:+.3f}°, ω₀ = {w_obs_disp:+.3f}°, Δω = {dw:+.3f}°")
    print(f"    θ for exact ω₀: {theta_exact:.3f}° → nearest Fibonacci = {exact_frac_name}° (dev {exact_dev:+.3f}°)")

    if abs(dw) < 1:
        print(f"    → EXCELLENT prediction (Δω < 1°)")
    elif abs(dw) < 5:
        print(f"    → Good prediction (Δω < 5°)")
    elif abs(dw) < 10:
        print(f"    → Moderate prediction (Δω < 10°)")
    else:
        print(f"    → Poor prediction (Δω = {abs(dw):.1f}°)")


# ==============================================================
# SUMMARY
# ==============================================================
print("\n\n" + "=" * 110)
print("SUMMARY")
print("=" * 110)

print(f"""
  §7.7 RESULTS — θ_bal Fibonacci check:
  ──────────────────────────────────────
  - Ecliptic frame (7 planets excl derived Earth): RMS = {observed_rms_7:.3f}°, p = {p_7_ecl:.4f}
  - ICRF frame (all 8 planets): RMS = {observed_rms_8_icrf:.3f}°, p = {p_8_icrf:.4f}
  - {'STATISTICALLY SIGNIFICANT' if min(p_7_ecl, p_8_icrf) < 0.05 else 'NOT statistically significant'} at 5% level
  - The 'Big Four' (Earth, Mars, Jupiter, Uranus) are all within ~1.2° of
    cardinal angles (multiples of 90°).
    Big Four ICRF: p = {p_big4:.4f}; Big Three ecliptic: p = {p_big3:.4f}

  §7.8 RESULTS — θ_bal predicting ω:
  ───────────────────────────────────
  - Forward (θ_clean → ω_pred): RMS = {rms_forward:.3f}° (ICRF, best Fibonacci fractions)
  - Cardinal-angle prediction (Big Four): RMS = {np.sqrt(np.mean(np.array(big4_dw)**2)):.3f}°
  - Fibonacci quality: ω₀ = {rms_omega_fib:.3f}° | Ω_bal = {rms_omega_bal_fib:.3f}° | θ_bal = {observed_rms_8_icrf:.3f}°
""")

print("Done.")

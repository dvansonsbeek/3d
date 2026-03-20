#!/usr/bin/env python3
"""
§7.15 — Earth's Ecliptic-Frame Perihelion & Ascending Node over 333,888 Years
==============================================================================

The Excel file now contains Earth's perihelion longitude and ascending node
on the invariable plane measured in the ECLIPTIC frame (not ICRF).

At the balance year (-301,340), the user reported:
  - Ω_ecliptic = 91.4939°  (ascending node on inv. plane)
  - ω_ecliptic = 178.5061° (argument of perihelion to inv. plane)

Key relationships at balance year:
  - ω + i_mean ≈ 180°  (where i_mean = 1.481592°)
  - Ω - i_mean ≈ 90°

This script investigates whether these relationships hold throughout the
full 333,888-year Holistic cycle.
"""

import pandas as pd
import numpy as np
import math

# ==============================================================
# Constants
# ==============================================================
H = 333_888
BALANCE_YEAR = -301_340
J2000_YEAR = 2000
I_MEAN = 1.481592  # Earth's mean inclination to invariable plane (degrees)

def norm360(a):
    """Normalize angle to [0, 360)."""
    return a % 360

def norm180(a):
    """Normalize angle to [-180, 180]."""
    a = a % 360
    return a if a <= 180 else a - 360

# ==============================================================
# Load data
# ==============================================================
xlsx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', '01-holistic-year-objects-data.xlsx')
df = pd.read_excel(xlsx_path, 'Perihelion Planets')

# Extract year column
# The 'Year' column (index 3) has the actual years
year_col = df.columns[3]
years = df[year_col].values

# Extract Earth ecliptic columns
peri_ecl = df['Earth Perihelion (Ecliptic)'].values  # perihelion longitude, ecliptic frame
omega_ecl = df['Earth Asc Node InvPlane (Ecliptic)'].values  # ascending node, ecliptic frame

# Extract Earth ICRF columns for comparison
peri_icrf = df['Earth Perihelion ICRF'].values
omega_icrf = df['Earth Asc Node InvPlane ICRF'].values

# Earth inclination to invariable plane
incl_invplane = df['Earth InvPlane Inclination'].values

# Earth eccentricity and obliquity
eccentricity = df['EARTH Eccentricity'].values
obliquity = df['EARTH OBLIQUITY (deg)'].values

print("=" * 100)
print("§7.15 — EARTH'S ECLIPTIC-FRAME GEOMETRY OVER 333,888 YEARS")
print("=" * 100)

# ==============================================================
# 1. IDENTIFY BALANCE YEAR ROW
# ==============================================================
print("\n" + "─" * 100)
print("1. DATA OVERVIEW & BALANCE YEAR VALUES")
print("─" * 100)

# Find balance year row (closest to -301,340)
bal_idx = np.argmin(np.abs(years - BALANCE_YEAR))
bal_year = years[bal_idx]

# Also find J2000 row
j2000_idx = np.argmin(np.abs(years - J2000_YEAR))
j2000_year = years[j2000_idx]

print(f"\n  Total data points: {len(years)}")
print(f"  Year range: {years[0]:,.0f} to {years[-1]:,.0f}")
print(f"  Step size: ~{(years[-1] - years[0]) / (len(years)-1):.0f} years")
print(f"\n  Balance year row: index {bal_idx}, year = {bal_year:,.0f}")
print(f"  J2000 row: index {j2000_idx}, year = {j2000_year:,.0f}")

print(f"\n  BALANCE YEAR VALUES (ecliptic frame):")
print(f"    Perihelion longitude:  {peri_ecl[bal_idx]:.4f}°")
print(f"    Asc Node InvPlane:     {omega_ecl[bal_idx]:.4f}°")

# Compute argument of perihelion
arg_peri_bal = norm360(peri_ecl[bal_idx] - omega_ecl[bal_idx])
print(f"    Argument of perihelion: {arg_peri_bal:.4f}° (= perihelion - Ω)")

print(f"\n  BALANCE YEAR VALUES (ICRF frame):")
print(f"    Perihelion longitude:  {peri_icrf[bal_idx]:.4f}°")
print(f"    Asc Node InvPlane:     {omega_icrf[bal_idx]:.4f}°")
arg_peri_icrf = norm360(peri_icrf[bal_idx] - omega_icrf[bal_idx])
print(f"    Argument of perihelion: {arg_peri_icrf:.4f}° (should match ecliptic)")

print(f"\n  Inclination at balance year: {incl_invplane[bal_idx]:.6f}°")
print(f"  Mean inclination (model):    {I_MEAN:.6f}°")

# Check the key relationships
print(f"\n  KEY RELATIONSHIPS AT BALANCE YEAR:")
print(f"    ω_ecl + i_mean = {arg_peri_bal:.4f} + {I_MEAN:.4f} = {arg_peri_bal + I_MEAN:.4f}° (target: 180°)")
print(f"    Ω_ecl - i_mean = {omega_ecl[bal_idx]:.4f} - {I_MEAN:.4f} = {omega_ecl[bal_idx] - I_MEAN:.4f}° (target: 90°)")
print(f"    ω_ecl deviation from 180°: {norm180(arg_peri_bal - 180):.4f}°")
print(f"    Ω_ecl deviation from 90°:  {omega_ecl[bal_idx] - 90:.4f}°")

# ==============================================================
# 2. J2000 VALUES
# ==============================================================
print("\n" + "─" * 100)
print("2. J2000 VALUES (ecliptic frame)")
print("─" * 100)

arg_peri_j2000 = norm360(peri_ecl[j2000_idx] - omega_ecl[j2000_idx])
print(f"\n  J2000 ecliptic frame:")
print(f"    Perihelion longitude:  {peri_ecl[j2000_idx]:.4f}°")
print(f"    Asc Node InvPlane:     {omega_ecl[j2000_idx]:.4f}°")
print(f"    Argument of perihelion: {arg_peri_j2000:.4f}°")
print(f"    Inclination:           {incl_invplane[j2000_idx]:.6f}°")

# ==============================================================
# 3. FULL CYCLE ANALYSIS: ω + i vs 180°
# ==============================================================
print("\n" + "─" * 100)
print("3. FULL CYCLE: ARGUMENT OF PERIHELION ω_ecl OVER 333,888 YEARS")
print("─" * 100)

# Compute ω = perihelion - Ω for all rows
arg_peri_all = np.array([norm360(peri_ecl[i] - omega_ecl[i]) for i in range(len(years))])

# Check for NaN values
valid = ~(np.isnan(peri_ecl) | np.isnan(omega_ecl))
n_valid = np.sum(valid)
print(f"\n  Valid data points: {n_valid} / {len(years)}")

if n_valid < len(years):
    print(f"  (Some NaN values found — will use only valid points)")

# Statistics
arg_valid = arg_peri_all[valid]
years_valid = years[valid]

print(f"\n  ω_ecl statistics (valid points):")
print(f"    Min:    {np.min(arg_valid):.4f}°")
print(f"    Max:    {np.max(arg_valid):.4f}°")
print(f"    Mean:   {np.mean(arg_valid):.4f}°")
print(f"    Median: {np.median(arg_valid):.4f}°")
print(f"    Std:    {np.std(arg_valid):.4f}°")

# ω oscillates with the precession cycle — check its range
# relative to 180°
dev_180 = np.array([norm180(a - 180) for a in arg_valid])
print(f"\n  ω deviation from 180°:")
print(f"    Min deviation:  {np.min(dev_180):+.4f}°")
print(f"    Max deviation:  {np.max(dev_180):+.4f}°")
print(f"    Mean deviation: {np.mean(dev_180):+.4f}°")
print(f"    RMS deviation:  {np.sqrt(np.mean(dev_180**2)):.4f}°")

# ==============================================================
# 4. FULL CYCLE: Ω_ecl vs 90°
# ==============================================================
print("\n" + "─" * 100)
print("4. FULL CYCLE: ASCENDING NODE Ω_ecl OVER 333,888 YEARS")
print("─" * 100)

omega_valid = omega_ecl[valid]

print(f"\n  Ω_ecl statistics:")
print(f"    Min:    {np.min(omega_valid):.4f}°")
print(f"    Max:    {np.max(omega_valid):.4f}°")
print(f"    Mean:   {np.mean(omega_valid):.4f}°")
print(f"    Std:    {np.std(omega_valid):.4f}°")

dev_90 = np.array([norm180(a - 90) for a in omega_valid])
print(f"\n  Ω deviation from 90°:")
print(f"    Min deviation:  {np.min(dev_90):+.4f}°")
print(f"    Max deviation:  {np.max(dev_90):+.4f}°")
print(f"    Mean deviation: {np.mean(dev_90):+.4f}°")
print(f"    RMS deviation:  {np.sqrt(np.mean(dev_90**2)):.4f}°")

# ==============================================================
# 5. RELATIONSHIP: ω + i = 180° OVER FULL CYCLE
# ==============================================================
print("\n" + "─" * 100)
print("5. KEY TEST: ω_ecl + inclination ≈ 180° OVER FULL CYCLE")
print("─" * 100)

incl_valid = incl_invplane[valid]
sum_omega_i = arg_valid + incl_valid
dev_sum = np.array([norm180(s - 180) for s in sum_omega_i])

print(f"\n  ω + i statistics:")
print(f"    Min:  {np.min(sum_omega_i):.4f}°")
print(f"    Max:  {np.max(sum_omega_i):.4f}°")
print(f"    Mean: {np.mean(sum_omega_i):.4f}°")

print(f"\n  (ω + i) - 180° statistics:")
print(f"    Min:  {np.min(dev_sum):+.4f}°")
print(f"    Max:  {np.max(dev_sum):+.4f}°")
print(f"    Mean: {np.mean(dev_sum):+.4f}°")
print(f"    RMS:  {np.sqrt(np.mean(dev_sum**2)):.4f}°")

# Is it exact everywhere or only at balance year?
close_to_180 = np.sum(np.abs(dev_sum) < 0.01)
within_1deg = np.sum(np.abs(dev_sum) < 1.0)
print(f"\n  Points where |ω + i - 180°| < 0.01°: {close_to_180} / {n_valid}")
print(f"  Points where |ω + i - 180°| < 1.0°:  {within_1deg} / {n_valid}")

# ==============================================================
# 6. RELATIONSHIP: Ω - i = 90° OVER FULL CYCLE
# ==============================================================
print("\n" + "─" * 100)
print("6. KEY TEST: Ω_ecl - inclination ≈ 90° OVER FULL CYCLE")
print("─" * 100)

diff_omega_i = omega_valid - incl_valid
dev_diff = np.array([norm180(d - 90) for d in diff_omega_i])

print(f"\n  Ω - i statistics:")
print(f"    Min:  {np.min(diff_omega_i):.4f}°")
print(f"    Max:  {np.max(diff_omega_i):.4f}°")
print(f"    Mean: {np.mean(diff_omega_i):.4f}°")

print(f"\n  (Ω - i) - 90° statistics:")
print(f"    Min:  {np.min(dev_diff):+.4f}°")
print(f"    Max:  {np.max(dev_diff):+.4f}°")
print(f"    Mean: {np.mean(dev_diff):+.4f}°")
print(f"    RMS:  {np.sqrt(np.mean(dev_diff**2)):.4f}°")

close_to_90 = np.sum(np.abs(dev_diff) < 0.01)
within_1deg_90 = np.sum(np.abs(dev_diff) < 1.0)
print(f"\n  Points where |Ω - i - 90°| < 0.01°: {close_to_90} / {n_valid}")
print(f"  Points where |Ω - i - 90°| < 1.0°:  {within_1deg_90} / {n_valid}")

# ==============================================================
# 7. TIME EVOLUTION: Sample points across the cycle
# ==============================================================
print("\n" + "─" * 100)
print("7. TIME EVOLUTION: SAMPLED POINTS ACROSS 333,888-YEAR CYCLE")
print("─" * 100)

# Sample at regular intervals
n_samples = 20
sample_indices = np.linspace(0, len(years)-1, n_samples, dtype=int)

print(f"\n  {'Year':>12s}  {'ω_ecl':>10s}  {'Ω_ecl':>10s}  {'i':>8s}  {'ω+i':>10s}  {'Ω-i':>10s}  {'ω+i-180':>10s}  {'Ω-i-90':>10s}")
print("  " + "─" * 90)

for idx in sample_indices:
    if valid[idx]:
        yr = years[idx]
        w = arg_peri_all[idx]
        O = omega_ecl[idx]
        i = incl_invplane[idx]
        s = w + i
        d = O - i
        ds = norm180(s - 180)
        dd = norm180(d - 90)
        marker = ""
        if abs(yr - bal_year) < 200:
            marker = " ← BALANCE"
        if abs(yr - j2000_year) < 200:
            marker = " ← J2000"
        print(f"  {yr:12,.0f}  {w:10.4f}°  {O:10.4f}°  {i:8.4f}°  {s:10.4f}°  {d:10.4f}°  {ds:+10.4f}°  {dd:+10.4f}°{marker}")

# ==============================================================
# 8. PERIHELION LONGITUDE EVOLUTION
# ==============================================================
print("\n" + "─" * 100)
print("8. PERIHELION LONGITUDE (ECLIPTIC) EVOLUTION")
print("─" * 100)

peri_valid = peri_ecl[valid]
print(f"\n  Perihelion longitude statistics:")
print(f"    Min:  {np.min(peri_valid):.4f}°")
print(f"    Max:  {np.max(peri_valid):.4f}°")
print(f"    Mean: {np.mean(peri_valid):.4f}°")
print(f"    Std:  {np.std(peri_valid):.4f}°")

# Does perihelion do full 360° cycles?
# Check if it crosses 0°/360° boundary
peri_diffs = np.diff(peri_valid)
wraps = np.sum(np.abs(peri_diffs) > 180)
print(f"    360° wraps detected: {wraps}")

# Perihelion precession rate
# T_peri = H/16 from model → rate = 360 / (H/16) = 5760/H deg/yr
expected_rate = 360.0 / (H / 16) * 100  # arcsec per century
actual_diffs = peri_diffs[np.abs(peri_diffs) < 180]
if len(actual_diffs) > 0:
    step = (years_valid[-1] - years_valid[0]) / (len(years_valid) - 1)
    actual_rate = np.mean(actual_diffs) / step * 100 * 3600  # arcsec per century... wait
    # rate in deg/yr
    rate_deg_yr = np.mean(actual_diffs) / step
    rate_arcsec_century = rate_deg_yr * 3600 * 100
    print(f"    Mean precession rate: {rate_deg_yr:.6f}°/yr = {rate_arcsec_century:.1f}\"/century")
    print(f"    Expected (H/16):      {360.0/(H/16):.6f}°/yr = {360.0/(H/16)*3600*100:.1f}\"/century")

# ==============================================================
# 9. ASCENDING NODE EVOLUTION
# ==============================================================
print("\n" + "─" * 100)
print("9. ASCENDING NODE Ω (ECLIPTIC) EVOLUTION")
print("─" * 100)

print(f"\n  Ω statistics:")
print(f"    Min:  {np.min(omega_valid):.4f}°")
print(f"    Max:  {np.max(omega_valid):.4f}°")

# Ω should circulate — check
omega_diffs = np.diff(omega_valid)
omega_wraps = np.sum(np.abs(omega_diffs) > 180)
print(f"    360° wraps: {omega_wraps}")

actual_omega_diffs = omega_diffs[np.abs(omega_diffs) < 180]
if len(actual_omega_diffs) > 0:
    step = (years_valid[-1] - years_valid[0]) / (len(years_valid) - 1)
    omega_rate = np.mean(actual_omega_diffs) / step
    print(f"    Mean Ω precession rate: {omega_rate:.6f}°/yr")
    print(f"    Ω period: {abs(360.0/omega_rate):,.0f} yr" if omega_rate != 0 else "    Ω period: infinite")

# ==============================================================
# 10. ECLIPTIC vs ICRF FRAME COMPARISON
# ==============================================================
print("\n" + "─" * 100)
print("10. ECLIPTIC vs ICRF FRAME: OFFSET ANALYSIS")
print("─" * 100)

# The difference between ecliptic and ICRF should be approximately the
# obliquity-related rotation
peri_diff_frames = np.array([norm180(peri_ecl[i] - peri_icrf[i]) for i in range(len(years)) if valid[i]])
omega_diff_frames = np.array([norm180(omega_ecl[i] - omega_icrf[i]) for i in range(len(years)) if valid[i]])

print(f"\n  Perihelion (ecliptic - ICRF):")
print(f"    Min:  {np.min(peri_diff_frames):+.4f}°")
print(f"    Max:  {np.max(peri_diff_frames):+.4f}°")
print(f"    Mean: {np.mean(peri_diff_frames):+.4f}°")
print(f"    Std:  {np.std(peri_diff_frames):.4f}°")

print(f"\n  Ω (ecliptic - ICRF):")
print(f"    Min:  {np.min(omega_diff_frames):+.4f}°")
print(f"    Max:  {np.max(omega_diff_frames):+.4f}°")
print(f"    Mean: {np.mean(omega_diff_frames):+.4f}°")
print(f"    Std:  {np.std(omega_diff_frames):.4f}°")

# Argument of perihelion should be the SAME in both frames (it's a relative angle)
arg_peri_icrf_all = np.array([norm360(peri_icrf[i] - omega_icrf[i]) for i in range(len(years)) if valid[i]])
arg_peri_ecl_valid = arg_valid
omega_diff_arg = np.array([norm180(arg_peri_ecl_valid[i] - arg_peri_icrf_all[i]) for i in range(len(arg_peri_ecl_valid))])

print(f"\n  ω consistency check (ecliptic ω - ICRF ω):")
print(f"    Min:  {np.min(omega_diff_arg):+.6f}°")
print(f"    Max:  {np.max(omega_diff_arg):+.6f}°")
print(f"    Mean: {np.mean(omega_diff_arg):+.6f}°")
if np.max(np.abs(omega_diff_arg)) < 0.001:
    print(f"    → ω is frame-invariant (as expected)")
else:
    print(f"    → ω differs between frames! Δω range = {np.max(np.abs(omega_diff_arg)):.4f}°")

# ==============================================================
# 11. INCLINATION EVOLUTION
# ==============================================================
print("\n" + "─" * 100)
print("11. EARTH'S INCLINATION TO INVARIABLE PLANE OVER FULL CYCLE")
print("─" * 100)

print(f"\n  Inclination statistics:")
print(f"    Min:    {np.min(incl_valid):.6f}°")
print(f"    Max:    {np.max(incl_valid):.6f}°")
print(f"    Mean:   {np.mean(incl_valid):.6f}°")
print(f"    Std:    {np.std(incl_valid):.6f}°")
print(f"    Model:  {I_MEAN:.6f}°")
print(f"    Range:  {np.max(incl_valid) - np.min(incl_valid):.6f}°")

# Is inclination roughly constant or does it oscillate significantly?
i_range_pct = (np.max(incl_valid) - np.min(incl_valid)) / np.mean(incl_valid) * 100
print(f"    Range/mean: {i_range_pct:.1f}%")

# ==============================================================
# 12. COMBINED IDENTITY: perihelion_ecl = Ω_ecl + 180° - i?
# ==============================================================
print("\n" + "─" * 100)
print("12. DERIVED IDENTITY: perihelion_ecl ≈ Ω_ecl + (180° - i)")
print("─" * 100)

# If ω + i ≈ 180°, then perihelion = Ω + ω ≈ Ω + 180° - i
predicted_peri = np.array([norm360(omega_ecl[idx] + 180.0 - incl_invplane[idx]) for idx in range(len(years)) if valid[idx]])
actual_peri = peri_ecl[valid]
residuals = np.array([norm180(predicted_peri[i] - actual_peri[i]) for i in range(len(predicted_peri))])

print(f"\n  If ω = 180° - i exactly, then perihelion = Ω + 180° - i")
print(f"  Residual (predicted - actual perihelion):")
print(f"    Min:  {np.min(residuals):+.4f}°")
print(f"    Max:  {np.max(residuals):+.4f}°")
print(f"    Mean: {np.mean(residuals):+.4f}°")
print(f"    RMS:  {np.sqrt(np.mean(residuals**2)):.4f}°")

# ==============================================================
# 13. ECCENTRICITY & OBLIQUITY CONTEXT
# ==============================================================
print("\n" + "─" * 100)
print("13. ECCENTRICITY & OBLIQUITY CONTEXT")
print("─" * 100)

ecc_valid = eccentricity[valid]
obl_valid = obliquity[valid]

print(f"\n  Eccentricity:")
print(f"    Min:  {np.min(ecc_valid):.6f}")
print(f"    Max:  {np.max(ecc_valid):.6f}")
print(f"    Mean: {np.mean(ecc_valid):.6f}")
print(f"    At balance year: {eccentricity[bal_idx]:.6f}")
print(f"    At J2000: {eccentricity[j2000_idx]:.6f}")

print(f"\n  Obliquity:")
print(f"    Min:  {np.min(obl_valid):.4f}°")
print(f"    Max:  {np.max(obl_valid):.4f}°")
print(f"    Mean: {np.mean(obl_valid):.4f}°")
print(f"    At balance year: {obliquity[bal_idx]:.4f}°")
print(f"    At J2000: {obliquity[j2000_idx]:.4f}°")

# ==============================================================
# 14. SUMMARY
# ==============================================================
print("\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)

rms_omega_i_180 = np.sqrt(np.mean(dev_sum**2))
rms_Omega_i_90 = np.sqrt(np.mean(dev_diff**2))

print(f"""
  BALANCE YEAR VALUES (ecliptic frame):
    ω_ecl = {arg_peri_bal:.4f}° (argument of perihelion)
    Ω_ecl = {omega_ecl[bal_idx]:.4f}° (ascending node on inv. plane)
    i     = {incl_invplane[bal_idx]:.6f}° (inclination to inv. plane)

  IDENTITY TEST: ω + i ≈ 180°
    At balance year: {arg_peri_bal:.4f} + {incl_invplane[bal_idx]:.4f} = {arg_peri_bal + incl_invplane[bal_idx]:.4f}°
    Over full cycle: RMS deviation = {rms_omega_i_180:.4f}°
    {'→ HOLDS THROUGHOUT THE CYCLE' if rms_omega_i_180 < 1.0 else '→ BALANCE-YEAR SPECIFIC ONLY' if rms_omega_i_180 > 10 else '→ APPROXIMATE RELATIONSHIP'}

  IDENTITY TEST: Ω - i ≈ 90°
    At balance year: {omega_ecl[bal_idx]:.4f} - {incl_invplane[bal_idx]:.4f} = {omega_ecl[bal_idx] - incl_invplane[bal_idx]:.4f}°
    Over full cycle: RMS deviation = {rms_Omega_i_90:.4f}°
    {'→ HOLDS THROUGHOUT THE CYCLE' if rms_Omega_i_90 < 1.0 else '→ BALANCE-YEAR SPECIFIC ONLY' if rms_Omega_i_90 > 10 else '→ APPROXIMATE RELATIONSHIP'}
""")

print("Done.")

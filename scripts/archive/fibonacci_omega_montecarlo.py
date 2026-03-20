#!/usr/bin/env python3
"""
Argument of Perihelion (ω) — Monte Carlo Statistical Significance
==================================================================
Tests the null hypothesis: "7 random angles match Fibonacci fractions
of 360° at the observed accuracy by chance."

Methodology follows the eccentricity ladder test (fibonacci_j2000_eccentricity.py):
- 100,000 random trials
- Each trial: 7 independent uniform random angles in [0°, 360°)
- For each angle: find best-matching Fibonacci fraction of 360°
- Metric: RMS percentage error across all 7 planets
- p-value: fraction of random trials achieving ≤ observed RMS error

Key design: Earth (ω = 180° = 360°/2) is excluded because it's exact
and arguably structurally forced by the model. The test covers the
7 remaining planets whose ω values are observational inputs.

Result: determines whether the Fibonacci pattern in ω is statistically
significant or could arise by chance.
"""

import math
import random
import time

# ==============================================================
# Fibonacci fraction set
# ==============================================================
# Generate ALL Fibonacci-based fractions a/b where:
#   a, b are products of at most 2 Fibonacci numbers
#   0 < 360°×a/b < 360°
#
# This gives a finite set of "target" angles.
# The set must be IDENTICAL for observed and random trials.

FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]

def generate_fibonacci_fractions():
    """Generate all unique Fibonacci-based fractions of 360°."""
    fractions = set()

    # Type 1: F_a / F_b (simple ratio)
    for a in FIBS:
        for b in FIBS:
            if b > 0:
                val = a / b
                if 0 < val < 1:  # 0° < angle < 360°
                    fractions.add(val)

    # Type 2: F_a² / F_b
    for a in FIBS[:9]:  # up to F₁₂=144, so a²≤144²
        for b in FIBS:
            if b > 0:
                val = (a * a) / b
                if 0 < val < 1:
                    fractions.add(val)

    # Type 3: F_a / (F_b × F_c)
    for a in FIBS[:9]:
        for b in FIBS[:9]:
            for c in FIBS[:9]:
                denom = b * c
                if denom > 0:
                    val = a / denom
                    if 0 < val < 1:
                        fractions.add(val)

    # Type 4: (F_a × F_b) / F_c
    for a in FIBS[:7]:
        for b in FIBS[:7]:
            for c in FIBS:
                if c > 0:
                    val = (a * b) / c
                    if 0 < val < 1:
                        fractions.add(val)

    # Convert to sorted list of angles
    angles = sorted(set(round(360.0 * f, 10) for f in fractions))

    return angles

FIB_ANGLES = generate_fibonacci_fractions()

# Also add supplementary angles (360° - angle) since ω can be negative
# When we test |ω|, we need both the angle and its supplement
FIB_TARGETS = sorted(set(FIB_ANGLES))

print("=" * 80)
print("ω FIBONACCI SIGNIFICANCE — MONTE CARLO TEST")
print("=" * 80)
print(f"\n  Fibonacci fraction set: {len(FIB_TARGETS)} unique target angles")
print(f"  Range: {min(FIB_TARGETS):.4f}° to {max(FIB_TARGETS):.4f}°")

# Show density of targets
bins = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
print(f"\n  Angular density of Fibonacci targets:")
for i in range(len(bins) - 1):
    count = sum(1 for a in FIB_TARGETS if bins[i] <= a < bins[i+1])
    bar = "█" * count
    print(f"    [{bins[i]:3d}°-{bins[i+1]:3d}°): {count:3d}  {bar}")

# ==============================================================
# Observed ω values (mean across Holistic Year)
# ==============================================================
# From fibonacci_omega_mean.py analysis
# Earth excluded (ω = 180° exact, structurally forced)

observed = {
    'Mercury':  45.086,
    'Venus':    73.834,
    'Mars':     21.282,   # |ω| (observed is −21.282°)
    'Jupiter':  62.653,
    'Saturn':   27.117,   # |ω| (observed is −27.117°)
    'Uranus':  138.104,   # |ω| (observed is −138.104°)
    'Neptune': 144.097,   # |ω| (observed is −144.097°)
}

planet_names = list(observed.keys())
N_PLANETS = len(planet_names)

# ==============================================================
# Best-match function
# ==============================================================
def best_fibonacci_match(angle):
    """Find the Fibonacci fraction of 360° closest to the given angle.
    Tests both the angle and its supplement (360° - angle).
    Returns (best_target, percentage_error)."""
    target = abs(angle) % 360
    if target > 180:
        target = 360 - target  # Use the acute version

    best_err = float('inf')
    best_target = None

    for fib_angle in FIB_TARGETS:
        err = abs(fib_angle - target) / target * 100 if target > 0 else float('inf')
        if err < best_err:
            best_err = err
            best_target = fib_angle

        # Also check against (360 - target) matching this fib_angle
        # This handles the case where ω is measured as 360° - angle
        anti = 360 - target
        if anti > 0:
            err2 = abs(fib_angle - anti) / anti * 100
            if err2 < best_err:
                best_err = err2
                best_target = fib_angle

    return best_target, best_err

# ==============================================================
# Compute observed metric
# ==============================================================
print("\n" + "─" * 80)
print("1. OBSERVED ω — FIBONACCI MATCH QUALITY")
print("─" * 80)

obs_errors = []
print(f"\n  {'Planet':10s}  {'|ω| (°)':>10s}  {'Best Fib':>10s}  {'Error (%)':>10s}")
print("  " + "─" * 46)

for name in planet_names:
    w = observed[name]
    target, err = best_fibonacci_match(w)
    obs_errors.append(err)
    print(f"  {name:10s}  {w:10.3f}°  {target:10.3f}°  {err:10.4f}%")

obs_rms = math.sqrt(sum(e**2 for e in obs_errors) / len(obs_errors))
obs_mean = sum(obs_errors) / len(obs_errors)
obs_max = max(obs_errors)

print(f"\n  RMS error:  {obs_rms:.4f}%")
print(f"  Mean error: {obs_mean:.4f}%")
print(f"  Max error:  {obs_max:.4f}%")
print(f"  Geometric mean: {math.exp(sum(math.log(max(e, 1e-10)) for e in obs_errors) / len(obs_errors)):.4f}%")

# ==============================================================
# Bias check: what's the EXPECTED best-match error for a random angle?
# ==============================================================
print("\n" + "─" * 80)
print("2. BIAS CHECK: Expected match quality for random angles")
print("─" * 80)

print(f"""
  With {len(FIB_TARGETS)} Fibonacci target angles in [0°, 360°), the average
  spacing is {360/len(FIB_TARGETS):.2f}°. A uniformly random angle will on
  average be ~{360/len(FIB_TARGETS)/4:.2f}° from the nearest target.

  But the targets are NOT uniformly distributed — they cluster near
  small Fibonacci ratios. We need the Monte Carlo to determine the
  actual null distribution.
""")

# Quick estimate: sample 10,000 random angles
quick_errors = []
rng = random.Random(42)
for _ in range(10000):
    angle = rng.uniform(0, 360)
    _, err = best_fibonacci_match(angle)
    quick_errors.append(err)

quick_mean = sum(quick_errors) / len(quick_errors)
quick_median = sorted(quick_errors)[len(quick_errors) // 2]
print(f"  Quick estimate (10,000 single random angles):")
print(f"    Mean best-match error: {quick_mean:.2f}%")
print(f"    Median: {quick_median:.2f}%")
print(f"    Min: {min(quick_errors):.4f}%")
print(f"    Max: {max(quick_errors):.2f}%")
print(f"    Fraction < 1%: {sum(1 for e in quick_errors if e < 1)/len(quick_errors)*100:.1f}%")
print(f"    Fraction < 0.5%: {sum(1 for e in quick_errors if e < 0.5)/len(quick_errors)*100:.1f}%")

# ==============================================================
# Monte Carlo simulation
# ==============================================================
print("\n" + "─" * 80)
print("3. MONTE CARLO SIMULATION")
print("─" * 80)

N_MC = 100_000
seed = 12345
rng = random.Random(seed)

print(f"\n  Trials: {N_MC:,}")
print(f"  Planets per trial: {N_PLANETS} (7 random angles)")
print(f"  Observed RMS error: {obs_rms:.4f}%")
print(f"  Observed mean error: {obs_mean:.4f}%")
print(f"  Observed max error: {obs_max:.4f}%")
print(f"\n  Running...", flush=True)

start_time = time.time()

mc_rms = []
mc_mean = []
mc_max = []
count_rms_better = 0
count_mean_better = 0
count_max_better = 0

for trial in range(N_MC):
    # Generate 7 random angles
    angles = [rng.uniform(0, 360) for _ in range(N_PLANETS)]

    # Find best Fibonacci match for each
    errors = []
    for angle in angles:
        _, err = best_fibonacci_match(angle)
        errors.append(err)

    trial_rms = math.sqrt(sum(e**2 for e in errors) / len(errors))
    trial_mean = sum(errors) / len(errors)
    trial_max = max(errors)

    mc_rms.append(trial_rms)
    mc_mean.append(trial_mean)
    mc_max.append(trial_max)

    if trial_rms <= obs_rms:
        count_rms_better += 1
    if trial_mean <= obs_mean:
        count_mean_better += 1
    if trial_max <= obs_max:
        count_max_better += 1

    if (trial + 1) % 25000 == 0:
        elapsed = time.time() - start_time
        print(f"    {trial+1:>7,} / {N_MC:,} ({elapsed:.1f}s)  "
              f"p_rms={count_rms_better/(trial+1):.6f}  "
              f"p_mean={count_mean_better/(trial+1):.6f}  "
              f"p_max={count_max_better/(trial+1):.6f}")

elapsed = time.time() - start_time
print(f"\n  Completed in {elapsed:.1f}s")

# ==============================================================
# Results
# ==============================================================
print("\n" + "─" * 80)
print("4. RESULTS")
print("─" * 80)

p_rms = count_rms_better / N_MC
p_mean = count_mean_better / N_MC
p_max = count_max_better / N_MC

print(f"\n  ┌─────────────────────────────────────────────────────────┐")
print(f"  │  METRIC          OBSERVED    RANDOM MEAN   p-VALUE      │")
print(f"  ├─────────────────────────────────────────────────────────┤")
print(f"  │  RMS error       {obs_rms:7.4f}%    {sum(mc_rms)/len(mc_rms):7.4f}%    {p_rms:.6f}    │")
print(f"  │  Mean error      {obs_mean:7.4f}%    {sum(mc_mean)/len(mc_mean):7.4f}%    {p_mean:.6f}    │")
print(f"  │  Max error       {obs_max:7.4f}%    {sum(mc_max)/len(mc_max):7.4f}%    {p_max:.6f}    │")
print(f"  └─────────────────────────────────────────────────────────┘")

# Detailed null distribution
mc_rms_sorted = sorted(mc_rms)
mc_mean_sorted = sorted(mc_mean)

print(f"\n  Null distribution (RMS error across 7 random angles):")
print(f"    Min:    {mc_rms_sorted[0]:.4f}%")
print(f"    1st %%:  {mc_rms_sorted[N_MC//100]:.4f}%")
print(f"    5th %%:  {mc_rms_sorted[N_MC//20]:.4f}%")
print(f"    25th %%: {mc_rms_sorted[N_MC//4]:.4f}%")
print(f"    Median: {mc_rms_sorted[N_MC//2]:.4f}%")
print(f"    75th %%: {mc_rms_sorted[3*N_MC//4]:.4f}%")
print(f"    95th %%: {mc_rms_sorted[19*N_MC//20]:.4f}%")
print(f"    Max:    {mc_rms_sorted[-1]:.4f}%")
print(f"    Observed: {obs_rms:.4f}% (SOLAR SYSTEM)")

# Threshold analysis
print(f"\n  Threshold analysis (fraction of random trials below each RMS):")
thresholds = [0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 5.0]
for thresh in thresholds:
    count = sum(1 for r in mc_rms if r <= thresh)
    pct = count / N_MC * 100
    marker = " ← OBSERVED" if abs(thresh - obs_rms) < 0.05 else ""
    print(f"    RMS < {thresh:5.2f}%:  {count:>7,} / {N_MC:,} = {pct:8.4f}%{marker}")

# ==============================================================
# 5. Sensitivity: how many planets needed?
# ==============================================================
print("\n" + "─" * 80)
print("5. SENSITIVITY: REMOVING WEAKEST MATCHES")
print("─" * 80)

# Sort planets by match quality
planet_errors = [(name, err) for name, err in zip(planet_names, obs_errors)]
planet_errors.sort(key=lambda x: x[1])

print(f"\n  Planets ranked by match quality:")
for name, err in planet_errors:
    print(f"    {name:10s}: {err:.4f}%")

# Test with best N planets
for n_keep in range(7, 3, -1):
    kept = planet_errors[:n_keep]
    kept_names = [name for name, _ in kept]
    kept_errors = [err for _, err in kept]
    kept_rms = math.sqrt(sum(e**2 for e in kept_errors) / len(kept_errors))

    # Re-run MC for this subset
    count_sub = 0
    for trial_rms_list in mc_rms:
        # We need to redo this properly — sample n_keep random angles
        pass

    print(f"\n  Best {n_keep} planets: {', '.join(kept_names)}")
    print(f"    RMS error: {kept_rms:.4f}%")

# Actually re-run MC for subsets
print(f"\n  Re-running MC for planet subsets...")
for n_keep in [7, 6, 5, 4]:
    kept = planet_errors[:n_keep]
    kept_rms_obs = math.sqrt(sum(e**2 for _, e in kept) / n_keep)

    count_sub = 0
    rng2 = random.Random(seed)
    for trial in range(N_MC):
        angles = [rng2.uniform(0, 360) for _ in range(n_keep)]
        errors = [best_fibonacci_match(a)[1] for a in angles]
        trial_rms = math.sqrt(sum(e**2 for e in errors) / len(errors))
        if trial_rms <= kept_rms_obs:
            count_sub += 1

    p_sub = count_sub / N_MC
    kept_names = [name for name, _ in kept]
    print(f"    Best {n_keep} ({', '.join(kept_names)}): "
          f"RMS = {kept_rms_obs:.4f}%, p = {p_sub:.6f} ({count_sub}/{N_MC:,})")

# ==============================================================
# 6. Conservative test: only simple fractions 360°/F
# ==============================================================
print("\n" + "─" * 80)
print("6. CONSERVATIVE TEST: ONLY SIMPLE 360°/F FRACTIONS")
print("─" * 80)

# Use only the simplest Fibonacci fractions: 360°/F_n
simple_targets = sorted(set(360.0 / f for f in FIBS if 0 < 360.0/f < 360))
print(f"\n  Simple target set: {len(simple_targets)} angles")
print(f"  Values: {', '.join(f'{a:.2f}°' for a in simple_targets)}")

def best_simple_match(angle):
    """Match against only 360°/F_n targets."""
    target = abs(angle) % 360
    if target > 180:
        target = 360 - target

    best_err = float('inf')
    best_target = None
    for t in simple_targets:
        # Match against target
        err = abs(t - target) / target * 100 if target > 0 else float('inf')
        if err < best_err:
            best_err = err
            best_target = t
        # Match against 360 - target
        anti = 360 - target
        if anti > 0:
            err2 = abs(t - anti) / anti * 100
            if err2 < best_err:
                best_err = err2
                best_target = t
    return best_target, best_err

# Observed with simple fractions
print(f"\n  Observed match quality (simple 360°/F only):")
simple_obs_errors = []
for name in planet_names:
    w = observed[name]
    target, err = best_simple_match(w)
    simple_obs_errors.append(err)
    print(f"    {name:10s}: |ω| = {w:.3f}° → 360°/? = {target:.3f}° (error {err:.3f}%)")

simple_obs_rms = math.sqrt(sum(e**2 for e in simple_obs_errors) / len(simple_obs_errors))
print(f"  RMS error: {simple_obs_rms:.4f}%")

# MC with simple fractions
count_simple = 0
rng3 = random.Random(seed)
for trial in range(N_MC):
    angles = [rng3.uniform(0, 360) for _ in range(N_PLANETS)]
    errors = [best_simple_match(a)[1] for a in angles]
    trial_rms = math.sqrt(sum(e**2 for e in errors) / len(errors))
    if trial_rms <= simple_obs_rms:
        count_simple += 1

p_simple = count_simple / N_MC
print(f"\n  Conservative p-value (360°/F only): {p_simple:.6f} ({count_simple}/{N_MC:,})")

# ==============================================================
# 7. Fisher's combined test
# ==============================================================
print("\n" + "─" * 80)
print("7. INDIVIDUAL PLANET p-VALUES (Fisher's method)")
print("─" * 80)

# For each planet, what fraction of single random angles match as well?
print(f"\n  {'Planet':10s}  {'|ω|':>8s}  {'Error':>8s}  {'p (single)':>12s}")
print("  " + "─" * 46)

individual_p = []
rng4 = random.Random(seed)
for name in planet_names:
    w = observed[name]
    _, obs_err = best_fibonacci_match(w)

    # Sample 1M random angles for individual p-value
    count = 0
    for _ in range(1_000_000):
        angle = rng4.uniform(0, 360)
        _, err = best_fibonacci_match(angle)
        if err <= obs_err:
            count += 1

    p_ind = count / 1_000_000
    individual_p.append(p_ind)
    print(f"  {name:10s}  {w:8.3f}°  {obs_err:7.4f}%  {p_ind:12.6f}")

# Fisher's combined statistic: -2 Σ ln(p_i)
import math
fisher_stat = -2 * sum(math.log(max(p, 1e-7)) for p in individual_p)
fisher_df = 2 * len(individual_p)

# Chi-squared CDF approximation (Wilson-Hilferty)
z = (fisher_stat / fisher_df) ** (1/3) - (1 - 2/(9*fisher_df))
z /= math.sqrt(2/(9*fisher_df))
# Normal CDF approximation
from math import erf
fisher_p = 0.5 * (1 - erf(z / math.sqrt(2)))

print(f"\n  Fisher's combined statistic: χ² = {fisher_stat:.2f} (df = {fisher_df})")
print(f"  Fisher's combined p-value: {fisher_p:.2e}")

# ==============================================================
# SUMMARY
# ==============================================================
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

print(f"""
  STATISTICAL SIGNIFICANCE OF ω FIBONACCI PATTERNS
  ─────────────────────────────────────────────────

  Null hypothesis: 7 random angles uniformly drawn from [0°, 360°)
  match Fibonacci fractions of 360° as well as the observed Solar System.

  Test 1 — Full Fibonacci fraction set ({len(FIB_TARGETS)} targets):
    Observed RMS error: {obs_rms:.4f}%
    Random mean RMS:    {sum(mc_rms)/len(mc_rms):.4f}%
    Random minimum RMS: {min(mc_rms):.4f}%
    p-value (RMS):      {p_rms:.6f}  ({count_rms_better}/{N_MC:,})

  Test 2 — Simple fractions only (360°/F, {len(simple_targets)} targets):
    Observed RMS error: {simple_obs_rms:.4f}%
    p-value:            {p_simple:.6f}  ({count_simple}/{N_MC:,})

  Test 3 — Fisher's combined (individual planet p-values):
    Combined p-value:   {fisher_p:.2e}

  INTERPRETATION:
""")

if p_rms < 0.001:
    print(f"    The Fibonacci pattern in ω is HIGHLY SIGNIFICANT (p < 0.001).")
    print(f"    The probability of 7 random angles matching Fibonacci fractions")
    print(f"    this closely is {p_rms*100:.4f}%.")
elif p_rms < 0.05:
    print(f"    The Fibonacci pattern in ω is SIGNIFICANT (p < 0.05).")
    print(f"    The probability of 7 random angles matching this closely is {p_rms*100:.2f}%.")
elif p_rms < 0.10:
    print(f"    The pattern is MARGINALLY SIGNIFICANT (p = {p_rms:.3f}).")
    print(f"    Suggestive but not conclusive.")
else:
    print(f"    The pattern is NOT STATISTICALLY SIGNIFICANT (p = {p_rms:.3f}).")
    print(f"    Random angles can match Fibonacci fractions at this level {p_rms*100:.1f}% of the time.")
    print(f"    The Fibonacci structure in ω may be a selection effect from")
    print(f"    the density of Fibonacci fractions, not a physical constraint.")

print(f"""
  NOTE: Unlike the eccentricity ladder (p < 10⁻⁵, where ALL 4 planets
  simultaneously satisfy d×ξ×√m = const), the ω test uses INDEPENDENT
  best-fit fractions per planet. The Fibonacci fraction set has high density
  near certain angles, making individual matches easier. The KEY question
  is whether ALL 7 planets matching simultaneously is rare.
""")

#!/usr/bin/env python3
"""
Does the framework's Fibonacci structure predict which L1 integers are
dynamically stable vs which drift in Laskar 2004?

Hypothesis
----------
Mainstream Laskar theory tells us WHICH eigenfrequencies exist (g_j, s_j)
but offers no clean rule for predicting WHICH combinations are dynamically
protected vs chaotic. Test C-50 measured the actual per-integer stability
of our 32 L1 lattice integers across LA2004's 51-Myr backward extension.

Our framework asserts a Fibonacci-based structure (H = 335,317; Earth's
precession cycles divide H by F_n = 3, 5, 8, 13, 16 ≈ Fibonacci numbers).
The natural test: do L1 integers that sit NEAR these Fibonacci divisors
of 8H (specifically 8H/24, 8H/40, 8H/64, 8H/104, 8H/128) show
systematically LOWER drift in LA2004 than integers that sit far from any
Fibonacci divisor?

If yes → the framework provides a structural prediction of stability
        that mainstream Laskar theory doesn't make on its own. That's
        a real contribution.
If no → the Fibonacci structure isn't predictive of stability; the
        framework correctly captures modern dynamics but doesn't
        illuminate stability patterns.

Method
------
1. Load LA2004 51-Myr backward Earth eccentricity AND obliquity.
2. For each of the 32 L1 integers:
   a. Decide its "natural" proxy: eccentricity-band integers (n≤53) use
      the ecc spectrum; obliquity-band (n≥65) use the obliq spectrum.
   b. Slide 5-Myr windows; in each, find the closest spectral peak to
      the integer's predicted period.
   c. Compute max |shift| as the integer's stability metric.
3. Classify each integer:
   a. Earth-Fibonacci distance: 8H/24, 8H/40, 8H/64, 8H/104, 8H/128
      represent H/3, H/5, H/8, H/13, H/16. Distance = min |1 - n/N_F|
      across these five Fibonacci N_F = {24, 40, 64, 104, 128}.
   b. Laskar attribution: from Test C-1 we know which simple Laskar beat
      (g_i±g_j, s_i±s_j, k+s_j) each integer matches.
   c. Inner-vs-outer planet involvement of that beat.
4. Spearman correlation between drift and Fibonacci-distance.
5. Compare drift distribution: "Fibonacci-near" vs "Fibonacci-far".

Output
------
- Per-integer table with drift, Fibonacci-distance, Laskar attribution
- Spearman correlation result
- Mann-Whitney U test: drift(near) vs drift(far)
- data/l1-fibonacci-stability.json
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import spearmanr, mannwhitneyu

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS
from l1_vs_laskar_eigenmodes import (
    enumerate_eigenmode_beats, mtm_spectrum, find_peaks,
)

LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/l1-fibonacci-stability.json")

WINDOW_MYR = 5.0
STEP_MYR = 5.0

# Earth Fibonacci divisors expressed as 8H/N
# H/3 = 8H/24, H/5 = 8H/40, H/8 = 8H/64, H/13 = 8H/104, H/16 = 8H/128
FIBONACCI_DIVISORS = {
    "H/3 inclination":  24,
    "H/5 ecliptic":     40,
    "H/8 obliquity":    64,
    "H/13 axial":      104,
    "H/16 perihelion": 128,
}

# Planet-eigenfrequency groups (for Laskar attribution classification)
INNER_G = {"g1", "g2", "g3", "g4"}
OUTER_G = {"g5", "g6", "g7", "g8"}
INNER_S = {"s1", "s2", "s3", "s4"}
OUTER_S = {"s5", "s6", "s7", "s8"}


def load_la2004():
    ages_kyr, ecc, obliq = [], [], []
    with open(LA2004_FILE) as f:
        for line in f:
            s = line.strip()
            if not s: continue
            parts = s.split()
            if len(parts) < 4: continue
            try:
                t = float(parts[0])
                e = float(parts[1].replace('D', 'E'))
                ob = float(parts[2].replace('D', 'E'))
            except ValueError: continue
            ages_kyr.append(t); ecc.append(e); obliq.append(ob)
    a = np.asarray(ages_kyr)
    return a, np.asarray(ecc), np.asarray(obliq)


def fibonacci_distance(n):
    """Fractional distance to nearest Fibonacci 8H divisor.

    Returns (min_dist_pct, nearest_fib_label, nearest_fib_N).
    Distance = |n - N_F| / N_F.
    """
    best_dist = float("inf")
    best_label = None
    best_N = None
    for label, N_F in FIBONACCI_DIVISORS.items():
        d = abs(n - N_F) / N_F
        if d < best_dist:
            best_dist = d
            best_label = label
            best_N = N_F
    return best_dist, best_label, best_N


def classify_laskar_beat(beat_label):
    """Classify a beat as inner-only, outer-only, mixed, or k-coupled."""
    if not beat_label:
        return "unknown"
    # Strip operators and find the components
    s = beat_label.replace("k+", "").replace("k-", "")
    parts = s.replace("+", " ").replace("-", " ").split()
    components = set(p.strip() for p in parts if p.strip())

    if "k" in beat_label or beat_label.startswith("k"):
        # Climatic precession or obliquity beat
        other = components - {"k"}
        if other.issubset(INNER_G | INNER_S):
            return "k+inner"
        elif other.issubset(OUTER_G | OUTER_S):
            return "k+outer"
        else:
            return "k+mixed"
    else:
        if components.issubset(OUTER_G | OUTER_S):
            return "outer-only"
        elif components.issubset(INNER_G | INNER_S):
            return "inner-only"
        else:
            return "inner-outer-mixed"


def measure_per_integer_drift(ages_yr, ecc, obliq, beats, dt_yr=1000.0):
    """For each of 32 L1 integers, measure max drift in its natural-band
    spectrum across all sliding windows.
    """
    starts = np.arange(ages_yr.min(),
                       ages_yr.max() - WINDOW_MYR * 1e6 + 1,
                       STEP_MYR * 1e6)

    result = {}
    for n in L1_LATTICE_INTEGERS:
        period_yr = EIGHT_H * 1000.0 / n
        # Use ecc or obliq spectrum based on band
        use_obliq = (n >= 60)  # rough heuristic: precession + obliquity in obliq spectrum
        sig_full = obliq if use_obliq else ecc
        proxy_label = "obliquity" if use_obliq else "eccentricity"

        shifts = []
        for s in starts:
            mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
            if mask.sum() < 1000: continue
            sig_w = sig_full[mask]
            freqs, psd = mtm_spectrum(sig_w, dt_yr, NW=3, K=5)
            max_p = min(500_000, period_yr * 3)
            min_p = max(15_000, period_yr / 3)
            peaks = find_peaks(freqs, psd, n_peaks=20,
                               min_P_yr=min_p, max_P_yr=max_p)
            if not peaks: continue
            # Find closest peak to predicted period
            closest = min(peaks, key=lambda p: abs(p[0] - period_yr))
            shift = (closest[0] - period_yr) / period_yr * 100
            shifts.append(shift)

        if not shifts:
            continue
        shifts_arr = np.asarray(shifts)

        # Classification
        fib_dist_pct, fib_label, fib_N = fibonacci_distance(n)
        best_beat = min(beats, key=lambda b: abs(b[1] - period_yr))
        beat_class = classify_laskar_beat(best_beat[0])

        result[int(n)] = {
            "n": int(n),
            "period_yr": float(period_yr),
            "proxy": proxy_label,
            "n_windows": len(shifts),
            "max_abs_shift_pct": float(np.max(np.abs(shifts_arr))),
            "median_abs_shift_pct": float(np.median(np.abs(shifts_arr))),
            "fibonacci_distance_pct": float(100 * fib_dist_pct),
            "nearest_fibonacci": fib_label,
            "nearest_fib_N": int(fib_N),
            "laskar_beat": best_beat[0],
            "laskar_beat_period_yr": float(best_beat[1]),
            "beat_class": beat_class,
        }
    return result


def main():
    print("=" * 92)
    print("  L1 Fibonacci-stability test — does framework structure predict drift?")
    print("=" * 92)

    print("\n  Loading LA2004 ...")
    ages_kyr, ecc, obliq = load_la2004()
    ages_yr = ages_kyr * 1000.0
    # sort ascending
    order = np.argsort(ages_yr)
    ages_yr = ages_yr[order]
    ecc = ecc[order]
    obliq = obliq[order]

    print(f"    n samples: {len(ages_yr)}, range {ages_yr.min()/1e6:+.1f} to "
          f"{ages_yr.max()/1e6:+.1f} Myr")

    beats = enumerate_eigenmode_beats()
    print(f"    Laskar beats enumerated: {len(beats)}")

    print("\n  Measuring per-integer drift across sliding windows ...", flush=True)
    drift_data = measure_per_integer_drift(ages_yr, ecc, obliq, beats)
    print(f"    Successful measurements: {len(drift_data)} / 32 L1 integers")

    # Print per-integer table sorted by Fibonacci distance
    print()
    print(f"  {'n':>4}{'Period':>10}{'proxy':<14}"
          f"{'max drift':>11}{'med drift':>11}"
          f"{'fib dist':>10}  nearest Fibonacci")
    rows = sorted(drift_data.values(), key=lambda r: r["fibonacci_distance_pct"])
    for r in rows:
        print(f"  {r['n']:>4}{r['period_yr']/1000:>9.1f}k"
              f"  {r['proxy']:<12}"
              f"{r['max_abs_shift_pct']:>9.1f}%"
              f"{r['median_abs_shift_pct']:>10.1f}%"
              f"{r['fibonacci_distance_pct']:>8.1f}%  {r['nearest_fibonacci']}")

    # Spearman correlation: drift vs Fibonacci-distance
    fib_dist_arr = np.array([r["fibonacci_distance_pct"] for r in rows])
    max_drift_arr = np.array([r["max_abs_shift_pct"] for r in rows])
    rho, p_spearman = spearmanr(fib_dist_arr, max_drift_arr)

    print()
    print("=" * 92)
    print("  TEST 1: Spearman correlation — drift vs Fibonacci-distance")
    print("=" * 92)
    print(f"    Spearman ρ = {rho:+.3f}")
    print(f"    p-value     = {p_spearman:.4f}")
    if p_spearman < 0.05 and rho > 0:
        sp_verdict = "✓ SIGNIFICANT positive correlation: more distant from Fibonacci → more drift."
    elif p_spearman < 0.05 and rho < 0:
        sp_verdict = "? SIGNIFICANT NEGATIVE correlation (opposite of hypothesis)."
    else:
        sp_verdict = "✗ No significant correlation — Fibonacci structure does NOT predict drift."
    print(f"    Verdict: {sp_verdict}")

    # Median-split test
    median_dist = float(np.median(fib_dist_arr))
    near_drift = [r["max_abs_shift_pct"] for r in rows
                  if r["fibonacci_distance_pct"] < median_dist]
    far_drift = [r["max_abs_shift_pct"] for r in rows
                 if r["fibonacci_distance_pct"] >= median_dist]
    mw_stat, mw_p = mannwhitneyu(near_drift, far_drift, alternative='less')

    print()
    print("  TEST 2: Mann-Whitney U — near-Fibonacci vs far-Fibonacci drift")
    print(f"    Near-Fibonacci (n={len(near_drift)}): "
          f"median drift = {np.median(near_drift):.1f}%, "
          f"mean = {np.mean(near_drift):.1f}%")
    print(f"    Far-Fibonacci  (n={len(far_drift)}): "
          f"median drift = {np.median(far_drift):.1f}%, "
          f"mean = {np.mean(far_drift):.1f}%")
    print(f"    U statistic = {mw_stat:.0f},  p-value = {mw_p:.4f}")
    if mw_p < 0.05:
        mw_verdict = "✓ Near-Fibonacci integers significantly more stable."
    else:
        mw_verdict = "✗ No significant difference between near-Fibonacci and far."
    print(f"    Verdict: {mw_verdict}")

    # By-nearest-Fibonacci summary
    print()
    print("  TEST 3: Stability grouped by nearest Earth Fibonacci divisor")
    by_fib = {}
    for r in rows:
        by_fib.setdefault(r["nearest_fibonacci"], []).append(r["max_abs_shift_pct"])
    print(f"    {'Fibonacci divisor':<25}{'n integers':>13}"
          f"{'median drift':>15}{'mean drift':>13}")
    for label, drifts in sorted(by_fib.items()):
        print(f"    {label:<25}{len(drifts):>13}"
              f"{np.median(drifts):>13.1f}%{np.mean(drifts):>11.1f}%")

    # By-Laskar-beat-class summary
    print()
    print("  TEST 4: Stability grouped by Laskar beat class")
    by_class = {}
    for r in rows:
        by_class.setdefault(r["beat_class"], []).append(r["max_abs_shift_pct"])
    print(f"    {'Beat class':<25}{'n integers':>13}"
          f"{'median drift':>15}{'mean drift':>13}")
    for label, drifts in sorted(by_class.items()):
        print(f"    {label:<25}{len(drifts):>13}"
              f"{np.median(drifts):>13.1f}%{np.mean(drifts):>11.1f}%")

    OUTPUT.write_text(json.dumps({
        "method": (
            "Per-integer drift measurement across LA2004 -50 to 0 Myr (5-Myr "
            "windows), correlated with framework-internal Fibonacci classification "
            "(distance to nearest Earth Fibonacci divisor 8H/24, 40, 64, 104, 128) "
            "and Laskar beat class (inner/outer/mixed eigenmode involvement)."
        ),
        "n_integers_measured": len(drift_data),
        "per_integer": rows,
        "spearman_drift_vs_fibonacci_distance": {
            "rho": float(rho),
            "p_value": float(p_spearman),
            "verdict": sp_verdict,
        },
        "mann_whitney_near_vs_far": {
            "median_drift_near_pct": float(np.median(near_drift)),
            "median_drift_far_pct": float(np.median(far_drift)),
            "U_stat": float(mw_stat),
            "p_value": float(mw_p),
            "verdict": mw_verdict,
        },
        "by_fibonacci": {label: {"n": len(d), "median_pct": float(np.median(d)),
                                  "mean_pct": float(np.mean(d))}
                          for label, d in by_fib.items()},
        "by_beat_class": {label: {"n": len(d), "median_pct": float(np.median(d)),
                                    "mean_pct": float(np.mean(d))}
                            for label, d in by_class.items()},
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

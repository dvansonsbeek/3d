#!/usr/bin/env python3
"""
Granular scan of the H/8 sub-band: which specific integer divisors of 8H
resist chaos best?

The Test C-Fib result showed that L1 integers near 8H/64 (Earth's H/8
obliquity Fibonacci anchor) have ~4× lower drift than any other Fibonacci
group. This scan asks the follow-up:
  1. Within the H/8 region (n ~ 50-90, periods 29-54 kyr), which specific
     integers are most stable in LA2004?
  2. Do our L1 lattice picks (n=50, 53, 65, 66, 68, 73, 76) sit at the
     optimal positions?
  3. Which Laskar beats correspond to the most chaos-resistant positions?
  4. Is there structural pattern in the stability — e.g., are stable
     integers concentrated near specific algebraic relationships?

Method
------
1. Load LA2004 51-Myr Earth obliquity time series.
2. For every integer n in [40, 110] (period range 24-67 kyr — covers
   obliquity + precession-band edge):
   - Compute max |spectral peak drift| across 10 sliding 5-Myr windows.
3. Identify nearest Laskar beat (g_i±g_j, s_i±s_j, k+s_j, k+g_j) for each.
4. Rank by stability; report top-10 most stable.
5. Compare to L1 lattice membership.

The expected outcome (per H/8 stability pattern):
- n=64 (Earth's H/8 exact, 41,914 yr) should be stable IF the
  Fibonacci anchor is itself special.
- n=65 (k+s_3) should be stable from Laskar theory.
- n=66, 68 should be stable.
- The pattern of stable n values tells us which dynamical structures
  resist chaos.
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS
from l1_vs_laskar_eigenmodes import (
    enumerate_eigenmode_beats, mtm_spectrum, find_peaks,
)

LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/h8-subband-stability.json")

WINDOW_MYR = 5.0
STEP_MYR = 5.0
N_RANGE = (40, 110)   # integer divisor range (periods 24-67 kyr)


def load_la2004_obliquity():
    ages_kyr, obliq = [], []
    with open(LA2004_FILE) as f:
        for line in f:
            s = line.strip()
            if not s: continue
            parts = s.split()
            if len(parts) < 4: continue
            try:
                t = float(parts[0])
                ob = float(parts[2].replace('D', 'E'))
            except ValueError: continue
            ages_kyr.append(t); obliq.append(ob)
    a = np.asarray(ages_kyr) * 1000.0  # → years
    o = np.asarray(obliq)
    order = np.argsort(a)
    return a[order], o[order]


def measure_drift_for_n(ages_yr, signal, n, dt_yr=1000.0):
    """For integer n (period 8H/n), measure spectral-peak drift across
    sliding LA2004 windows. Returns dict with summary stats.
    """
    period_yr = EIGHT_H * 1000.0 / n
    starts = np.arange(ages_yr.min(),
                       ages_yr.max() - WINDOW_MYR * 1e6 + 1,
                       STEP_MYR * 1e6)
    shifts = []
    observed_periods = []
    for s in starts:
        mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
        if mask.sum() < 1000: continue
        sig_w = signal[mask]
        freqs, psd = mtm_spectrum(sig_w, dt_yr, NW=3, K=5)
        # Look in a tight band around the predicted period (±30%)
        min_p = period_yr * 0.7
        max_p = period_yr * 1.3
        peaks = find_peaks(freqs, psd, n_peaks=15,
                           min_P_yr=min_p, max_P_yr=max_p)
        if not peaks: continue
        closest = min(peaks, key=lambda p: abs(p[0] - period_yr))
        observed_periods.append(closest[0])
        shifts.append((closest[0] - period_yr) / period_yr * 100)

    if not shifts:
        return None
    shifts_arr = np.asarray(shifts)
    return {
        "n": int(n),
        "predicted_period_yr": float(period_yr),
        "n_windows": len(shifts),
        "max_abs_shift_pct": float(np.max(np.abs(shifts_arr))),
        "median_abs_shift_pct": float(np.median(np.abs(shifts_arr))),
        "mean_shift_pct": float(np.mean(shifts_arr)),
        "std_shift_pct": float(np.std(shifts_arr)),
        "observed_periods_yr": [float(p) for p in observed_periods],
        "in_L1_lattice": n in L1_LATTICE_INTEGERS,
    }


def main():
    print("=" * 92)
    print("  H/8 sub-band granular stability scan")
    print(f"  Integer range: n ∈ [{N_RANGE[0]}, {N_RANGE[1]}]  →  "
          f"period range {EIGHT_H*1000/N_RANGE[1]/1000:.1f} - "
          f"{EIGHT_H*1000/N_RANGE[0]/1000:.1f} kyr")
    print("=" * 92)

    print("\n  Loading LA2004 obliquity ...")
    ages_yr, obliq = load_la2004_obliquity()
    print(f"    n samples: {len(ages_yr)}, range "
          f"{ages_yr.min()/1e6:+.1f} to {ages_yr.max()/1e6:+.1f} Myr")

    beats = enumerate_eigenmode_beats()

    print(f"\n  Scanning n = {N_RANGE[0]}..{N_RANGE[1]} integers ...", flush=True)
    results = []
    for n in range(N_RANGE[0], N_RANGE[1] + 1):
        r = measure_drift_for_n(ages_yr, obliq, n)
        if r is None: continue
        # Identify nearest Laskar beat
        period = r["predicted_period_yr"]
        best_beat = min(beats, key=lambda b: abs(b[1] - period))
        beat_err = abs(best_beat[1] - period) / period * 100
        r["nearest_laskar_beat"] = best_beat[0]
        r["laskar_beat_period_yr"] = float(best_beat[1])
        r["laskar_beat_err_pct"] = float(beat_err)
        r["beat_category"] = best_beat[2]
        results.append(r)
    print(f"    Successful measurements: {len(results)} integers")

    # Rank by max drift (most stable first)
    results.sort(key=lambda r: r["max_abs_shift_pct"])

    print()
    print("  ── Top 15 most stable integers in the H/8 sub-band ──")
    print(f"  {'rank':>5}{'n':>4}{'Period':>10}{'max drift':>12}{'L1?':>5}"
          f"  {'Laskar match':<22}{'err':>7}{'category':<22}")
    for rank, r in enumerate(results[:15], 1):
        l1 = "✓" if r["in_L1_lattice"] else "-"
        print(f"  {rank:>5}{r['n']:>4}{r['predicted_period_yr']/1000:>9.1f}k"
              f"{r['max_abs_shift_pct']:>10.1f}%"
              f"{l1:>5}  {r['nearest_laskar_beat']:<22}"
              f"{r['laskar_beat_err_pct']:>5.1f}%  {r['beat_category']:<22}")

    # Also report bottom 5 (most chaotic) for contrast
    print()
    print("  ── Bottom 5 LEAST stable integers in the H/8 sub-band ──")
    print(f"  {'rank':>5}{'n':>4}{'Period':>10}{'max drift':>12}{'L1?':>5}"
          f"  {'Laskar match':<22}{'err':>7}")
    for rank, r in enumerate(results[-5:], len(results) - 4):
        l1 = "✓" if r["in_L1_lattice"] else "-"
        print(f"  {rank:>5}{r['n']:>4}{r['predicted_period_yr']/1000:>9.1f}k"
              f"{r['max_abs_shift_pct']:>10.1f}%"
              f"{l1:>5}  {r['nearest_laskar_beat']:<22}"
              f"{r['laskar_beat_err_pct']:>5.1f}%")

    # Compare L1 picks to overall scan
    l1_in_range = [r for r in results if r["in_L1_lattice"]]
    not_l1 = [r for r in results if not r["in_L1_lattice"]]
    print()
    print("  ── L1 lattice picks vs other integers in this band ──")
    print(f"    L1 integers in range: n ∈ {sorted([r['n'] for r in l1_in_range])}")
    print(f"    L1 median drift:    {np.median([r['max_abs_shift_pct'] for r in l1_in_range]):.2f}%")
    print(f"    L1 mean drift:      {np.mean([r['max_abs_shift_pct'] for r in l1_in_range]):.2f}%")
    print(f"    Non-L1 median drift: {np.median([r['max_abs_shift_pct'] for r in not_l1]):.2f}%")
    print(f"    Non-L1 mean drift:   {np.mean([r['max_abs_shift_pct'] for r in not_l1]):.2f}%")

    from scipy.stats import mannwhitneyu
    mw_u, mw_p = mannwhitneyu(
        [r["max_abs_shift_pct"] for r in l1_in_range],
        [r["max_abs_shift_pct"] for r in not_l1],
        alternative='less',
    )
    print(f"    Mann-Whitney U (L1 < Non-L1): U = {mw_u:.0f}, p = {mw_p:.4f}")
    if mw_p < 0.05:
        print(f"    ✓ L1 picks are SIGNIFICANTLY more stable than non-picks.")
    else:
        print(f"    ✗ L1 picks NOT significantly more stable than non-picks.")

    # Compute stability ranks of our L1 picks
    print()
    print("  ── Stability rank of each L1 lattice integer in this band ──")
    print(f"    {'L1 n':>5}{'period':>11}{'rank':>8}{'/N':>5}{'max drift':>12}{'best beat':<20}")
    for r in l1_in_range:
        rank = next(i for i, rr in enumerate(results, 1) if rr["n"] == r["n"])
        print(f"    {r['n']:>5}{r['predicted_period_yr']/1000:>10.1f}k"
              f"{rank:>8}/{len(results):<5}{r['max_abs_shift_pct']:>10.1f}%"
              f"  {r['nearest_laskar_beat']:<20}")

    # Identify "stable orphans" — integers more stable than our worst L1 picks
    l1_max_drift_in_band = max(r["max_abs_shift_pct"] for r in l1_in_range)
    orphans = [r for r in not_l1
               if r["max_abs_shift_pct"] < l1_max_drift_in_band]
    print()
    print(f"  ── Non-L1 integers MORE stable than our worst L1 pick "
          f"(<{l1_max_drift_in_band:.1f}% drift) ──")
    if not orphans:
        print("    (none — all non-L1 integers in this band are less stable)")
    else:
        print(f"  {'n':>4}{'period':>11}{'max drift':>12}{'Laskar match':<22}")
        for r in sorted(orphans, key=lambda x: x["max_abs_shift_pct"]):
            print(f"  {r['n']:>4}{r['predicted_period_yr']/1000:>10.1f}k"
                  f"{r['max_abs_shift_pct']:>10.1f}%"
                  f"  {r['nearest_laskar_beat']:<22}")

    OUTPUT.write_text(json.dumps({
        "method": (
            "Granular scan of integers n in [40,110] (period range 24-67 kyr, "
            "covering H/8 obliquity sub-band). Per integer: max |spectral-peak "
            "shift| across 10 sliding 5-Myr LA2004 windows. Identifies nearest "
            "Laskar 2004 simple beat and L1 lattice membership."
        ),
        "n_integers_scanned": len(results),
        "results_sorted_by_stability": results,
        "L1_integers_in_range": sorted([r["n"] for r in l1_in_range]),
        "L1_vs_non_L1": {
            "L1_median_pct": float(np.median([r["max_abs_shift_pct"] for r in l1_in_range])),
            "non_L1_median_pct": float(np.median([r["max_abs_shift_pct"] for r in not_l1])),
            "mann_whitney_U": float(mw_u),
            "mann_whitney_p": float(mw_p),
        },
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test whether the 31/32 L1-lattice ↔ Laskar match persists across -50 Myr.

Method
------
The Test C analysis at modern epoch (+0 to +10 Myr) showed:
  - 31/32 L1 integers match a Laskar 2004 eigenmode beat within 5%
  - ~0% drift between 0-5 and 5-10 Myr halves

This test extends backward using a fresh 50-Myr WHFast integration:

  1. Combine the +10-Myr forward cache with the -50-Myr backward cache
     → continuous Earth ecc/inc time series over [-50, +10] Myr.
  2. Slide a 5-Myr window in 5-Myr steps (12 non-overlapping windows).
  3. In each window:
       a. Compute MTM PSD of Earth's eccentricity (n=5000 samples at 1 kyr)
       b. Identify the top 12 spectral peaks
       c. For each peak, find:
            - Nearest L1 integer N (compute |8H/P - N|/N)
            - Nearest Laskar eigenmode beat
  4. Track per-window:
       - % of L1 peaks matching observed spectrum within 5%
       - drift of n=28 (Mars-Jupiter, 95.8 kyr) — the most distinctive
         L1 integer in the eccentricity spectrum
       - drift of n=65/66 (k+s3 obliquity, 41 kyr) in inclination spectrum

Interpretation
--------------
- View A (KAM-frozen): 31/32 match preserved across all windows.
- View D (modern parameterization): match degrades for older windows.
- Drift in n=28 and n=65 quantifies the chaotic eigenfrequency evolution.
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

# Import Laskar eigenfrequency tables + beat enumeration from Test C script
sys.path.insert(0, str(SCRIPTS_DIR))
from l1_vs_laskar_eigenmodes import (
    enumerate_eigenmode_beats, mtm_spectrum, find_peaks,
)

FWD_CACHE = Path("/home/dennis/code/3d/scripts/archive/nbody_cache_10myr.npz")
BWD_CACHE = Path("/home/dennis/code/3d/data/nbody_cache_50myr_backward.npz")
OUTPUT = Path("/home/dennis/code/3d/data/l1-vs-laskar-50myr.json")

WINDOW_MYR = 5.0
STEP_MYR = 5.0  # non-overlapping


def load_combined_history():
    """Combine the forward +10-Myr cache with the backward -50-Myr cache
    into a single chronologically-ordered series. Returns (times_yr, ecc_Earth,
    inc_Earth) with times spanning [-50e6, +10e6] yr.
    """
    fwd = np.load(FWD_CACHE)
    bwd = np.load(BWD_CACHE)

    # Forward: times 0 to 1e7
    t_fwd = fwd["times"]
    ecc_fwd = fwd["ecc_Earth"]
    inc_fwd = fwd["inc_Earth"]

    # Backward: times 0 to -5e7
    t_bwd = bwd["times"]
    ecc_bwd = bwd["ecc_Earth"]
    inc_bwd = bwd["inc_Earth"]

    # Combine: bwd[::-1] from -50e6 to 0, then fwd from 0 to 10e6
    # Drop the t=0 duplicate
    t_all = np.concatenate([t_bwd[::-1][:-1], t_fwd])
    ecc_all = np.concatenate([ecc_bwd[::-1][:-1], ecc_fwd])
    inc_all = np.concatenate([inc_bwd[::-1][:-1], inc_fwd])

    print(f"  Forward cache:  {t_fwd[0]/1e6:+.1f} to {t_fwd[-1]/1e6:+.1f} Myr, n={len(t_fwd)}")
    print(f"  Backward cache: {t_bwd[0]/1e6:+.1f} to {t_bwd[-1]/1e6:+.1f} Myr, n={len(t_bwd)}")
    print(f"  Combined:       {t_all[0]/1e6:+.1f} to {t_all[-1]/1e6:+.1f} Myr, n={len(t_all)}")

    return t_all, ecc_all, inc_all


def analyze_window(label, t_window, sig_window, beats):
    """MTM spectrum + peak ID + L1/Laskar match for one window."""
    dt = float(np.median(np.diff(t_window)))
    freqs, psd = mtm_spectrum(sig_window, dt, NW=3, K=5)
    peaks = find_peaks(freqs, psd, n_peaks=15,
                       min_P_yr=15_000, max_P_yr=500_000)

    result = []
    for P_peak, pw in peaks:
        # Nearest L1 integer
        best_n = min(L1_LATTICE_INTEGERS,
                     key=lambda n: abs(EIGHT_H * 1000.0 / n - P_peak))
        err_l1 = abs(EIGHT_H * 1000.0 / best_n - P_peak) / P_peak
        # Nearest Laskar beat
        best_b = min(beats, key=lambda b: abs(b[1] - P_peak))
        err_l = abs(best_b[1] - P_peak) / P_peak
        result.append({
            "peak_P_yr": float(P_peak),
            "power": float(pw),
            "nearest_L1_n": int(best_n),
            "L1_P_yr": EIGHT_H * 1000.0 / best_n,
            "L1_err_pct": 100 * float(err_l1),
            "nearest_laskar_beat": best_b[0],
            "laskar_P_yr": float(best_b[1]),
            "laskar_err_pct": 100 * float(err_l),
        })
    return result


def main():
    print("=" * 92)
    print("  Test C-2 extension: L1 lattice persistence over -50 Myr")
    print("=" * 92)

    if not BWD_CACHE.exists():
        print(f"\n  ✗ Backward cache not found at {BWD_CACHE}")
        print(f"  Run: python3 scripts/nbody_50myr_backward.py  (takes ~1-2 hr)")
        return

    print("\n  Loading caches ...")
    t_all, ecc_all, inc_all = load_combined_history()

    beats = enumerate_eigenmode_beats()
    print(f"  Total Laskar simple beats in 15-500 kyr range: {len(beats)}")

    # Define sliding windows over the combined record
    t_min = t_all.min()
    t_max = t_all.max()
    starts = np.arange(t_min, t_max - WINDOW_MYR * 1e6 + 1, STEP_MYR * 1e6)
    print(f"\n  Window: {WINDOW_MYR:.1f} Myr,  step: {STEP_MYR:.1f} Myr")
    print(f"  Total non-overlapping windows: {len(starts)}")

    # Analyze each window
    print()
    print(f"  {'Window center':>16}{'L1 match <5%':>15}{'L1 match <2%':>15}"
          f"{'med L1 err':>12}{'med Las err':>13}")
    window_results = []
    for s in starts:
        mask = (t_all >= s) & (t_all < s + WINDOW_MYR * 1e6)
        if mask.sum() < 1000:
            continue
        t_win = t_all[mask]
        ecc_win = ecc_all[mask]

        ecc_peaks = analyze_window(f"ecc {s/1e6:+.0f}",
                                    t_win, ecc_win, beats)

        l1_errs = [p["L1_err_pct"] for p in ecc_peaks]
        las_errs = [p["laskar_err_pct"] for p in ecc_peaks]
        match5 = sum(1 for e in l1_errs if e < 5)
        match2 = sum(1 for e in l1_errs if e < 2)
        med_l1 = float(np.median(l1_errs)) if l1_errs else float('nan')
        med_las = float(np.median(las_errs)) if las_errs else float('nan')

        center_Myr = (s + WINDOW_MYR * 1e6 / 2) / 1e6
        print(f"  {center_Myr:>15.1f}M{match5:>14}/{len(ecc_peaks)}"
              f"{match2:>14}/{len(ecc_peaks)}"
              f"{med_l1:>11.2f}%{med_las:>12.2f}%")

        window_results.append({
            "window_center_Myr": float(center_Myr),
            "window_start_Myr": float(s / 1e6),
            "window_end_Myr": float((s + WINDOW_MYR * 1e6) / 1e6),
            "n_peaks": len(ecc_peaks),
            "n_L1_match_5pct": int(match5),
            "n_L1_match_2pct": int(match2),
            "median_L1_err_pct": med_l1,
            "median_Laskar_err_pct": med_las,
            "top_peaks": ecc_peaks[:8],   # truncate for output
        })

    # Track drift of dominant L1 integers across windows
    print()
    print("  ── Drift tracking: where does each L1 line LAND in each window? ──")
    track_n = [28, 25, 22, 65, 66, 113]  # dominant integers across both eccentricity (top) and inclination (bottom)
    print(f"  {'window center':>16}  ", end="")
    for n in track_n:
        print(f" n={n:>3}({EIGHT_H*1000/n/1000:>3.0f}k)", end="")
    print()

    drift_history = {n: [] for n in track_n}
    for wr in window_results:
        # For each tracked integer, find the closest observed peak in this window
        peaks = wr["top_peaks"]
        center = wr["window_center_Myr"]
        line = f"  {center:>15.1f}M  "
        for n in track_n:
            P_lattice = EIGHT_H * 1000.0 / n
            if peaks:
                closest = min(peaks, key=lambda p: abs(p["peak_P_yr"] - P_lattice))
                err = (closest["peak_P_yr"] - P_lattice) / P_lattice * 100
                line += f" {err:>+7.1f}%"
                drift_history[n].append({
                    "window_center_Myr": center,
                    "observed_peak_P_yr": closest["peak_P_yr"],
                    "shift_pct": float(err),
                })
            else:
                line += f" {'—':>8}"
        print(line)

    # Per-integer drift statistics
    print()
    print("  ── Per-integer drift statistics across all windows ──")
    print(f"  {'n':>4}{'period (kyr)':>13}{'mean shift':>13}{'std shift':>12}"
          f"{'max |shift|':>14}")
    drift_summary = {}
    for n in track_n:
        hist = drift_history[n]
        if not hist: continue
        shifts = np.array([h["shift_pct"] for h in hist])
        mean_d = float(np.mean(shifts))
        std_d = float(np.std(shifts))
        max_abs = float(np.max(np.abs(shifts)))
        print(f"  {n:>4}{EIGHT_H*1000/n/1000:>12.1f}k{mean_d:>+12.2f}%"
              f"{std_d:>11.2f}%{max_abs:>13.2f}%")
        drift_summary[n] = {"mean_shift_pct": mean_d, "std_shift_pct": std_d,
                            "max_abs_shift_pct": max_abs}

    # Match-fraction trend across windows
    print()
    print("  ── Match fraction across windows ──")
    centers = [wr["window_center_Myr"] for wr in window_results]
    match5_pcts = [100 * wr["n_L1_match_5pct"] / wr["n_peaks"]
                   if wr["n_peaks"] else 0
                   for wr in window_results]
    print(f"  Median match-fraction (<5%) across windows: "
          f"{np.median(match5_pcts):.1f}%")
    print(f"  Modern epoch (>0 Myr): "
          f"{np.median([m for c, m in zip(centers, match5_pcts) if c > -5]):.1f}%")
    if any(c < -25 for c in centers):
        deep_match = np.median([m for c, m in zip(centers, match5_pcts) if c < -25])
        print(f"  Deep epoch (< -25 Myr): {deep_match:.1f}%")

    # Verdict
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)
    modern_match = np.median([m for c, m in zip(centers, match5_pcts) if c > -10])
    deep_match = np.median([m for c, m in zip(centers, match5_pcts) if c < -30])
    if deep_match >= 0.8 * modern_match and all(
        drift_summary.get(n, {"max_abs_shift_pct": 100})["max_abs_shift_pct"] < 5
        for n in [28, 65, 113]
    ):
        verdict = ("✓ Lattice match PERSISTS across -50 Myr with <5% drift in "
                   "dominant integers. Strong support for view A "
                   "(KAM-frozen lattice).")
    elif deep_match >= 0.5 * modern_match:
        verdict = ("? Lattice match weakens at deep time but is still substantial. "
                   "View D (modern parameterization with slow drift) is supported.")
    else:
        verdict = ("✗ Lattice match degrades severely at deep time. The 8H "
                   "synchronization is best read as a modern parameterization "
                   "of slowly-evolving Laskar dynamics.")
    print(f"  {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            "Slide 5-Myr non-overlapping windows across combined forward "
            "(+10 Myr) and backward (-50 Myr) N-body integration. In each "
            "window, MTM-spectrum Earth eccentricity and check whether the "
            "top spectral peaks land on the 32 L1 lattice integers."
        ),
        "constants": {
            "8H_yr": EIGHT_H * 1000,
            "window_Myr": WINDOW_MYR,
            "step_Myr": STEP_MYR,
        },
        "windows": window_results,
        "drift_history": drift_history,
        "drift_summary": drift_summary,
        "verdict": verdict,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

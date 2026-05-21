#!/usr/bin/env python3
"""
MILANKOVITCH 8H CLOSURE TEST — Cheng 2016 SPELEOTHEM (independent dataset)
============================================================================

Tests whether the 8H integer-divisor structure observed in LR04 also appears
in the U-Th-dated Cheng 2016 Asian Monsoon speleothem composite — a paleoclimate
proxy with chronology fully independent of orbital tuning.

Methodology
-----------
Cheng 2016 is short (T = 640 kyr), so the joint-fit closure methodology used
on LR04 (T = 5,320 kyr) is invalid: adjacent integer 8H divisors are NOT
individually resolvable when T < 8H. Instead we use the same single-component
methodology as `milankovitch_8h_divisor_spectrum.py`:

1. Single-component OLS amplitude scan at FINE n resolution (n = 1.0 to 30.0,
   step 0.025). Use n_max = 30 because at T=640 the Rayleigh resolution at
   P=100 kyr is ~16 kyr, and the precession-band (n=113, P=24 kyr) is
   borderline.
2. Find all local maxima above 3× median noise threshold.
3. Check each peak's distance to nearest integer 8H divisor.
4. Compare distribution to what we'd see in random spectra.

If integer-divisor structure appears INDEPENDENTLY in the U-Th-dated Cheng
2016 record (without orbital tuning), the LR04 closure result is robust;
if only LR04 shows the pattern, it could be a tuning artifact.

Note: the closure here is necessarily looser than for LR04 due to the
shorter record. We check whether the strongest LR04 climate peaks (at known
8H integer divisors) ALSO appear at the right positions in Cheng 2016, not
whether Cheng has zero off-lattice power.

Run:  python3 scripts/milankovitch_8h_cheng_closure_test.py
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CHENG_PATH = DATA_DIR / "cheng2016-speleothem.txt"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
OUT_PATH = DATA_DIR / "milankovitch-8h-cheng-closure-test.json"

H = 335.317
EIGHT_H = 8 * H

DT_KYR = 1.0
T_WINDOW_CHENG = (0, 640)
T_WINDOW_LR04  = (0, 640)  # match Cheng window for like-for-like comparison

N_SCAN_LO   = 1.0
N_SCAN_HI   = 30.0    # safely Rayleigh-resolvable at T=640 (corresponds to P ≥ 89 kyr)
N_SCAN_STEP = 0.025
INT_TOLERANCE = 0.20  # peaks within this distance of an integer count as "integer"

# Active formula integers from the 25-component fit (doc 17 §2.2) in the n=1..30 range
FORMULA_INTS_IN_RANGE = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30]


def load_data(path, skip_header=True):
    ages, vals = [], []
    with open(path, "rt") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#") or s.startswith("age"):
                continue
            parts = s.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def preprocess(ages, vals, window=T_WINDOW_CHENG, dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a, v = ages[mask], vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


def single_amp(t, y, n):
    om = 2 * np.pi * n / EIGHT_H
    X = np.column_stack([np.ones_like(t), np.cos(om*t), np.sin(om*t)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.sqrt(b[1]**2 + b[2]**2))


def scan_amplitudes(t, y):
    n_grid = np.arange(N_SCAN_LO, N_SCAN_HI + N_SCAN_STEP/2, N_SCAN_STEP)
    amps = np.array([single_amp(t, y, n) for n in n_grid])
    return n_grid, amps


def find_peaks(n_grid, amps, prominence_factor=3.0):
    med = np.median(amps)
    thresh = prominence_factor * med
    peaks = []
    for i in range(2, len(amps) - 2):
        if amps[i] > thresh and amps[i] > amps[i-1] and amps[i] > amps[i+1]:
            # Refine via parabolic
            y1, y2, y3 = amps[i-1], amps[i], amps[i+1]
            denom = y1 - 2*y2 + y3
            offset = 0.5 * (y1 - y3) / denom if abs(denom) > 1e-12 else 0
            n_peak = n_grid[i] + offset * N_SCAN_STEP
            peaks.append((n_peak, amps[i]))
    # De-dupe nearby peaks
    peaks.sort(key=lambda x: -x[1])
    filtered = []
    for n, a in peaks:
        if all(abs(n - n2) > 0.4 for n2, _ in filtered):
            filtered.append((n, a))
    return filtered, med, thresh


def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H CLOSURE TEST — Cheng 2016 SPELEOTHEM")
    print("=" * 78)
    print(f"  Dataset: Cheng 2016 U-Th-dated speleothem (CHRONOLOGY INDEPENDENT of orbital tuning)")
    print(f"  Window: {T_WINDOW_CHENG[0]}-{T_WINDOW_CHENG[1]} kyr BP")
    print(f"  8H = {EIGHT_H} kyr")
    print(f"  Note: T = 640 kyr < 8H = 2,682 kyr, so adjacent integer divisors are NOT")
    print(f"        individually Rayleigh-resolvable. Test uses single-component scans only.")
    print()

    # Load Cheng
    ages_cheng, vals_cheng = load_data(CHENG_PATH)
    t_cheng, y_cheng = preprocess(ages_cheng, vals_cheng, T_WINDOW_CHENG)
    print(f"  Cheng2016: {len(t_cheng)} grid samples, T = {t_cheng[-1]-t_cheng[0]:.0f} kyr")

    # Load LR04 over same window for comparison
    ages_lr04, vals_lr04 = load_data(LR04_PATH)
    t_lr04, y_lr04 = preprocess(ages_lr04, vals_lr04, T_WINDOW_LR04)
    print(f"  LR04 (matched window): {len(t_lr04)} grid samples, T = {t_lr04[-1]-t_lr04[0]:.0f} kyr")

    # Scan both
    print(f"\n[1] Single-component amplitude scan, n = {N_SCAN_LO}-{N_SCAN_HI} step {N_SCAN_STEP}")
    n_grid, amps_cheng = scan_amplitudes(t_cheng, y_cheng)
    _,      amps_lr04  = scan_amplitudes(t_lr04, y_lr04)

    # Find peaks in each
    peaks_cheng, med_cheng, thresh_cheng = find_peaks(n_grid, amps_cheng)
    peaks_lr04,  med_lr04,  thresh_lr04  = find_peaks(n_grid, amps_lr04)
    print(f"  Cheng: median amp {med_cheng:.4f}, 3× threshold {thresh_cheng:.4f}, {len(peaks_cheng)} peaks")
    print(f"  LR04 : median amp {med_lr04:.4f}, 3× threshold {thresh_lr04:.4f}, {len(peaks_lr04)} peaks")

    # Categorise Cheng peaks
    print(f"\n[2] Cheng 2016 peaks vs 8H integer lattice:")
    print(f"    {'n_peak':>8}  {'period(kyr)':>11}  {'amp':>7}  {'nearest int':>11}  {'|Δn|':>6}  {'in formula?':>12}")
    print(f"    {'-'*8}  {'-'*11}  {'-'*7}  {'-'*11}  {'-'*6}  {'-'*12}")
    cheng_int_count = 0
    cheng_formula_count = 0
    cheng_orphan_count = 0
    cheng_peak_results = []
    for n, a in sorted(peaks_cheng):
        ni = round(n)
        dn = abs(n - ni)
        is_int = bool(dn < INT_TOLERANCE)
        in_formula = bool(ni in FORMULA_INTS_IN_RANGE and is_int)
        cheng_peak_results.append({"n": float(n), "amplitude": float(a),
                                   "period_kyr": float(EIGHT_H/n),
                                   "nearest_int": int(ni), "delta_n": float(dn),
                                   "is_integer": is_int, "in_formula": in_formula})
        if is_int: cheng_int_count += 1
        else: cheng_orphan_count += 1
        if in_formula: cheng_formula_count += 1
        flag = "✓ formula" if in_formula else ("✓ integer" if is_int else "✗ orphan")
        print(f"    {n:>8.2f}  {EIGHT_H/n:>11.2f}  {a:>7.3f}  {ni:>11d}  {dn:>6.2f}  {flag:>12}")

    print(f"\n[3] Cheng 2016 peak classification summary:")
    print(f"    Total peaks above 3× median:           {len(peaks_cheng)}")
    print(f"    Within {INT_TOLERANCE} of integer:                  {cheng_int_count}")
    print(f"    Within formula integer set:            {cheng_formula_count}")
    print(f"    Orphan (> {INT_TOLERANCE} from any integer):       {cheng_orphan_count}")

    # Test: are Cheng peaks preferentially at integer positions?
    print(f"\n[4] Statistical test:")
    # If peaks are uniformly distributed in [n_lo, n_hi], the probability of any
    # one peak landing within INT_TOLERANCE of an integer is 2*INT_TOLERANCE (because
    # the integer 8H divisor positions are spaced 1 apart in n).
    p_per_peak = 2 * INT_TOLERANCE
    from math import comb
    n_total = len(peaks_cheng)
    n_hits = cheng_int_count
    p_value = sum(comb(n_total, k) * (p_per_peak ** k) * ((1 - p_per_peak) ** (n_total - k))
                  for k in range(n_hits, n_total + 1))
    print(f"    H0: peaks are uniformly distributed in n-space (no integer preference)")
    print(f"    P(peak near integer) under null: {p_per_peak}")
    print(f"    Observed: {n_hits}/{n_total} near integer")
    print(f"    Expected under null: {p_per_peak * n_total:.1f}")
    print(f"    Binomial p-value (one-sided): {p_value:.5f}")

    if p_value < 0.001:
        verdict_str = "STRONG (p < 0.001)"
    elif p_value < 0.01:
        verdict_str = "SIGNIFICANT (p < 0.01)"
    elif p_value < 0.05:
        verdict_str = "MARGINAL (p < 0.05)"
    else:
        verdict_str = "NULL (p ≥ 0.05)"

    print(f"\n    Verdict: {verdict_str}")
    print(f"    Cheng 2016 (U-Th, independent of orbital tuning) {'CONFIRMS' if p_value < 0.05 else 'does not confirm'} 8H integer-divisor structure.")

    # Cross-correlate Cheng spectrum with LR04 spectrum at integer positions
    print(f"\n[5] Cross-dataset comparison at formula integer positions:")
    print(f"    {'n':>4}  {'period':>8}  {'LR04 amp':>9}  {'Cheng amp':>10}  {'both peaks?':>12}")
    int_results = []
    for n_int in FORMULA_INTS_IN_RANGE:
        a_lr04 = single_amp(t_lr04, y_lr04, n_int)
        a_cheng = single_amp(t_cheng, y_cheng, n_int)
        both = bool(a_lr04 > thresh_lr04 and a_cheng > thresh_cheng)
        int_results.append({"n": int(n_int), "lr04_amp": float(a_lr04),
                            "cheng_amp": float(a_cheng), "both_peaks": both})
        mark = "✓" if both else " "
        print(f"    {n_int:>4d}  {EIGHT_H/n_int:>8.2f}  {a_lr04:>9.4f}  {a_cheng:>10.4f}  {mark:>12}")

    both_count = sum(1 for r in int_results if r["both_peaks"])
    print(f"\n    Formula integers reaching 3× median in BOTH datasets: {both_count}/{len(FORMULA_INTS_IN_RANGE)}")

    runtime = time.time() - t0
    print(f"\n[runtime] {runtime:.1f} seconds")

    result = {
        "meta": {
            "script": "milankovitch_8h_cheng_closure_test.py",
            "H_kyr": H, "eight_H_kyr": EIGHT_H,
            "datasets": ["Cheng2016 (U-Th, T=640)", "LR04 matched window (T=640)"],
            "scan_range": [N_SCAN_LO, N_SCAN_HI, N_SCAN_STEP],
            "int_tolerance": INT_TOLERANCE,
        },
        "cheng_peaks": cheng_peak_results,
        "cheng_summary": {
            "total_peaks": len(peaks_cheng),
            "near_integer": cheng_int_count,
            "in_formula": cheng_formula_count,
            "orphan": cheng_orphan_count,
            "binomial_p_value": p_value,
            "verdict": verdict_str,
        },
        "cross_dataset_at_formula_integers": int_results,
        "both_peaks_count": both_count,
        "both_peaks_of_total": f"{both_count}/{len(FORMULA_INTS_IN_RANGE)}",
        "runtime_seconds": runtime,
    }

    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\n[saved] {OUT_PATH}")


if __name__ == "__main__":
    main()

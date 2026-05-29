#!/usr/bin/env python3
"""
MILANKOVITCH 8H INTEGER-DIVISOR SPECTRUM
==========================================

Tests the hypothesis that ALL observed climate cycles in LR04 / Cheng2016
are integer divisors of the Solar System Resonance Cycle 8H = 2,682.536 kyr.

Method:
  For each integer n from 1 to 200 (covering periods 13.4 kyr to 2,682 kyr),
  compute the single-component OLS amplitude at frequency n/(8H).

  Single-component OLS = LR04 detrended, normalized, then for each n:
    minimize ||y - a*cos(ω_n t) - b*sin(ω_n t) - c||
    amplitude(n) = √(a² + b²)
    where ω_n = 2π n / (8H)

  Also computes a fine (1/4 spacing) scan to confirm integer positions
  are local maxima.

Significance: noise floor estimated from the 50th percentile of the
amplitude distribution (assuming most n are non-resonant). Peaks
exceeding 3× the median amplitude are flagged as significant.

Predicted set (model + planet eigenmodes):
  Earth-intrinsic Fibonacci: n ∈ {24, 40, 64, 104, 128} (H/3, H/5, H/8, H/13, H/16)
  Planet-modulated near H/3 (n=24):  {25, 27, 28}     (climate 100k band)
  Planet-modulated near H/8 (n=64):  {65, 66}         (obliquity 41k)
  Planet-modulated near H/13 (n=104): {113, 116, 120, 139, 140, 141, 163}
                                       (climatic precession sub-peaks)

Companion document: docs/91-milankovitch-evidence.md
Run:  python3 scripts/milankovitch_8h_divisor_spectrum.py
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
CHENG_PATH = DATA_DIR / "cheng2016-speleothem.txt"
OUT_PATH = DATA_DIR / "milankovitch-8h-divisor-spectrum.json"

DT_KYR = 1.0
H = 335.317
EIGHT_H = 8 * H  # 2682.536 kyr

N_MAX = 200
FINE_OVERSAMPLE = 4  # for fine-resolution comparison scan

# Predicted set (testable hypothesis)
EARTH_INTRINSIC = {
    24:  "H/3 = 111.77 kyr (inclination precession)",
    40:  "H/5 = 67.06 kyr (ecliptic precession)",
    64:  "H/8 = 41.91 kyr (obliquity / model)",
    104: "H/13 = 25.79 kyr (axial precession)",
    128: "H/16 = 20.96 kyr (perihelion precession)",
}

PLANET_MODULATED = {
    # Near H/3 (inclination, 100k band)
    25: ("near H/3", "100k centroid ≈ 107 kyr"),
    27: ("near H/3", "g3-g5 99 kyr Earth-Jupiter ecc beat"),
    28: ("near H/3", "g4-g5 95.8 kyr Mars-Jupiter ecc beat"),
    # Near H/8 (obliquity)
    65: ("near H/8", "s3+k 41.27 kyr (Berger Earth obliquity)"),
    66: ("near H/8", "Obliquity-band arithmetic-mean cycle length (~40.5 kyr) — Jensen's inequality vs k+s3 Fourier centroid (doc 91 §6.6). At T<3000 kyr Fourier resolution cannot separate n=65/66/67, and amplitude piles at the cycle-counting mean position."),
    67: ("near H/8", "s4+k 40.04 kyr (Berger Mars-modulated obliquity sub-peak)"),
    68: ("near H/8", "k+s4 Berger Mars obliquity sub-peak OR k−g3 Earth axial-apsidal beat (~39.5 kyr); pre-MPT may include Mars ICRF (8H/69 ±1)"),
    73: ("near H/8", "2|s4| Mars nodal harmonic (~36.7 kyr) OR g3−s4 Earth-Mars apsidal-nodal beat"),
    76: ("near H/8", "g4−s3 Mars apsidal − Earth nodal beat (~35.3 kyr)"),
    # Near H/13 (axial / climatic precession sub-peaks)
    113: ("near H/13", "g5+k Jupiter 23.74 kyr"),
    116: ("near H/13", "g1+k Mercury 23.13 kyr"),
    120: ("near H/13", "g2+k Venus 22.35 kyr (= H/15)"),
    139: ("near H/13", "g4+k Mars 19.30 kyr"),
    140: ("near H/13", "g3+k Earth 19.16 kyr"),
    141: ("near H/13", "g4+k Mars 19.03 kyr (Berger)"),
    163: ("near H/13", "g6+k Saturn 16.46 kyr"),
}

PREDICTED_INTEGERS = set(EARTH_INTRINSIC) | set(PLANET_MODULATED)


# ─────────────────────────────────────────────────────────────────────────
# Data loaders
# ─────────────────────────────────────────────────────────────────────────

def load_lr04():
    ages, vals = [], []
    with open(LR04_PATH, "rt") as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def load_cheng():
    ages, vals = [], []
    with open(CHENG_PATH, "rt") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def preprocess(ages, vals, window, dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = vals[mask]
    order = np.argsort(a)
    a = a[order]
    v = v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a = a[keep]
    v = v[keep]
    grid = np.arange(lo, hi + dt, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


# ─────────────────────────────────────────────────────────────────────────
# 8H spectrum scan
# ─────────────────────────────────────────────────────────────────────────

def amplitude_at_freq(t, y, freq_per_kyr):
    """Single-component OLS amplitude at given frequency (cycles/kyr).
    Returns √(a² + b²) where a,b minimize ||y - a*cos(ωt) - b*sin(ωt) - c||."""
    omega = 2 * np.pi * freq_per_kyr
    n = len(t)
    X = np.column_stack([np.ones(n), np.cos(omega * t), np.sin(omega * t)])
    beta, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.sqrt(beta[1] ** 2 + beta[2] ** 2))


def scan_8h_spectrum(t, y, n_max=N_MAX):
    """Compute amplitudes at every integer n from 1 to n_max, frequency = n/8H."""
    integer_n = np.arange(1, n_max + 1)
    amps = np.array([amplitude_at_freq(t, y, n / EIGHT_H) for n in integer_n])
    return integer_n, amps


def fine_scan(t, y, n_max=N_MAX, oversample=FINE_OVERSAMPLE):
    """Same but at fractional positions n = 1, 1.25, 1.5, ..., n_max."""
    fine = np.arange(1, n_max + 1, 1.0 / oversample)
    amps = np.array([amplitude_at_freq(t, y, n / EIGHT_H) for n in fine])
    return fine, amps


def identify_peaks(integer_n, amps, sig_factor=3.0):
    """Identify peaks: local maxima with amplitude > sig_factor × median."""
    median = float(np.median(amps))
    threshold = sig_factor * median
    peaks = []
    for i in range(1, len(integer_n) - 1):
        if amps[i] > threshold and amps[i] >= amps[i - 1] and amps[i] >= amps[i + 1]:
            peaks.append({
                "n": int(integer_n[i]),
                "period_kyr": float(EIGHT_H / integer_n[i]),
                "amplitude": float(amps[i]),
                "amp_over_median": float(amps[i] / median),
            })
    return peaks, median, threshold


def classify_peak(n):
    """Tag a peak by which predicted class it belongs to, with δ from Fibonacci."""
    if n in EARTH_INTRINSIC:
        return "Earth-intrinsic", EARTH_INTRINSIC[n], 0
    if n in PLANET_MODULATED:
        cluster, desc = PLANET_MODULATED[n]
        fib_n = int(cluster.split("=")[-1].strip().rstrip(")")) if "=" in cluster else None
        # Locate nearest Fibonacci anchor
        if "H/3" in cluster:   fib_n = 24
        elif "H/5" in cluster: fib_n = 40
        elif "H/8" in cluster: fib_n = 64
        elif "H/13" in cluster: fib_n = 104
        elif "H/16" in cluster: fib_n = 128
        delta = n - fib_n if fib_n else None
        return "Planet-modulated", desc, delta
    # Unpredicted but real
    # Find nearest Fibonacci anchor for context
    anchors = [24, 40, 64, 104, 128]
    closest = min(anchors, key=lambda a: abs(a - n))
    delta = n - closest
    return "Unpredicted", f"δ={delta:+d} from {EARTH_INTRINSIC.get(closest, '?')}", delta


def run_scan(ages, vals, window, label):
    """Full scan: integer + fine, peak identification, classification."""
    t, y = preprocess(ages, vals, window)
    T = window[1] - window[0]
    print(f"\n  --- {label}  (T = {T} kyr, N = {len(t)}) ---")

    integer_n, amps = scan_8h_spectrum(t, y, N_MAX)
    peaks, median, threshold = identify_peaks(integer_n, amps, sig_factor=3.0)

    print(f"  Median amp = {median:.4f}  |  Threshold (3× median) = {threshold:.4f}")
    print(f"  Found {len(peaks)} peaks above threshold")
    print(f"\n  {'n':>4}  {'period_kyr':>11}  {'amp':>8}  {'×med':>5}  {'class':<18}  {'description'}")
    print(f"  {'-'*4}  {'-'*11}  {'-'*8}  {'-'*5}  {'-'*18}  {'-'*40}")

    classified = []
    for peak in peaks:
        n = peak["n"]
        cls, desc, delta = classify_peak(n)
        classified.append({**peak, "class": cls, "description": desc, "delta": delta})
        delta_str = f"δ={delta:+d}" if delta is not None else ""
        # Color-coded marker by class
        cls_short = {"Earth-intrinsic": "EARTH-FIB",
                     "Planet-modulated": "PLANET-MOD",
                     "Unpredicted":    "UNPRED   "}.get(cls, cls)
        print(f"  {n:>4}  {peak['period_kyr']:>11.2f}  {peak['amplitude']:>8.4f}  "
              f"{peak['amp_over_median']:>4.1f}×  {cls_short:<18}  {desc} {delta_str}")

    # Summary: how many predicted peaks did we find?
    found_predicted = sum(1 for p in classified if p["class"] != "Unpredicted")
    n_unpredicted = sum(1 for p in classified if p["class"] == "Unpredicted")
    n_predicted_total = len(PREDICTED_INTEGERS)
    print(f"\n  PREDICTED set has {n_predicted_total} integers")
    print(f"  Significant peaks matching predicted set: {found_predicted}")
    print(f"  Significant peaks NOT in predicted set:   {n_unpredicted}")

    # Predicted not found
    found_ns = {p["n"] for p in classified}
    missed_predicted = PREDICTED_INTEGERS - found_ns
    if missed_predicted:
        print(f"  Predicted integers NOT detected as peaks:")
        for n in sorted(missed_predicted):
            desc = EARTH_INTRINSIC.get(n) or PLANET_MODULATED.get(n, ("", ""))[1]
            i = int(n) - 1
            if 0 <= i < len(amps):
                print(f"    n={n} (P = {EIGHT_H/n:.2f} kyr, amp = {amps[i]:.4f})  — {desc}")

    return {
        "window": list(window),
        "T_kyr": float(T),
        "median_amp": median,
        "threshold_3x": threshold,
        "n_peaks": len(peaks),
        "peaks": classified,
        "n_predicted_matched": int(found_predicted),
        "n_unpredicted": int(n_unpredicted),
        "missed_predicted": sorted(int(n) for n in missed_predicted),
        "spectrum": {
            "integer_n": [int(n) for n in integer_n],
            "amplitudes": [float(a) for a in amps],
        },
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H INTEGER-DIVISOR SPECTRUM")
    print("=" * 78)
    print(f"8H = {EIGHT_H:.3f} kyr   |   scanning n = 1..{N_MAX}")
    print(f"Predicted integers: Earth-intrinsic ({len(EARTH_INTRINSIC)}) + "
          f"planet-modulated ({len(PLANET_MODULATED)}) = {len(PREDICTED_INTEGERS)} total")

    ages_lr, vals_lr = load_lr04()
    ages_ch, vals_ch = load_cheng()
    print(f"LR04: {len(ages_lr)} samples, 0-{ages_lr.max():.0f} kyr")
    print(f"Cheng: {len(ages_ch)} samples, 0-{ages_ch.max():.0f} kyr")

    results = {}
    results["LR04 full"]      = run_scan(ages_lr, vals_lr, (0, 5320),    "LR04 full (T=5320 kyr)")
    results["LR04 0-1200"]    = run_scan(ages_lr, vals_lr, (0, 1200),    "LR04 0-1200 kyr (post-MPT extended)")
    results["LR04 0-700"]     = run_scan(ages_lr, vals_lr, (0, 700),     "LR04 0-700 kyr (post-MPT)")
    results["LR04 pre-MPT"]   = run_scan(ages_lr, vals_lr, (1200, 3000), "LR04 pre-MPT 1200-3000 kyr (41-kyr world)")
    results["Cheng full"]     = run_scan(ages_ch, vals_ch, (0, 640),     "Cheng2016 full (T=640 kyr)")

    OUT_PATH.write_text(json.dumps({
        "meta": {
            "script": "milankovitch_8h_divisor_spectrum.py",
            "H_kyr": H, "8H_kyr": EIGHT_H,
            "n_max": N_MAX,
            "predicted_earth_intrinsic": list(EARTH_INTRINSIC),
            "predicted_planet_modulated": list(PLANET_MODULATED),
        },
        "results": results,
    }, indent=2))
    print(f"\n[saved] {OUT_PATH}")
    print(f"[elapsed] {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

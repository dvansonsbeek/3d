#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — CHENG 2016 INDEPENDENT-CHRONOLOGY VALIDATION
=========================================================================

Companion to milankovitch_8h_cheng_closure_test.py (doc 18 §5.2). The closure
test is blocked by Rayleigh resolution (T_Cheng = 640 kyr < 8H = 2682 kyr).
This script tests the SAME framework predictions on Cheng using methods that
do NOT require resolving adjacent integer divisors:

  B1 — Multi-band centroid agreement (LR04 vs Cheng across 100k/41k/23k bands).
       Extends the §7.1 single-band chronology-bias test from
       milankovitch_spectral_tests.py to multiple bands. If LR04 (orbitally-
       tuned) and Cheng (U-Th-dated absolute chronology) put the band
       centroids at the same period, the centroid is real (not a tuning
       artifact).

  B2 — Permutation test on formula-integer amplitudes. Mirror of Test C
       (doc 18 §5.3) but applied to Cheng instead of LR04. For each of the
       25 formula integers in n=1..30 (the n's resolvable on Cheng's 640
       kyr record), compute Cheng amplitude. Compare to 1000 random sets
       of equal-size non-formula integer positions. Tests whether the
       framework's predicted positions are systematically louder than
       arbitrary 8H lattice positions in the independent-chronology record.

  B3 — Cross-coherence LR04 ↔ Cheng. Magnitude-squared coherence across all
       resolvable frequencies. Predicted band centers should show high
       coherence; off-band positions should not. Tests phase-level agreement
       on the matched 0-640 kyr window.

Each sub-test is independent — together they provide a chronology-
independent validation of the framework's claims on the scales Cheng can
actually resolve.

Output: data/milankovitch-8h-cheng-chronology-validation.json
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend, coherence
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
CHENG_PATH = DATA_DIR / "cheng2016-speleothem.txt"
OUT_PATH = DATA_DIR / "milankovitch-8h-cheng-chronology-validation.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0

# Matched window so both records cover the same time interval
T_WINDOW = (0, 640)

# Predicted bands and framework centroid n's
BANDS = {
    "100k":     {"range": (80.0, 125.0),  "predicted_n": 25, "predicted_kyr": EIGHT_H / 25},
    "obliquity": {"range": (35.0, 50.0),  "predicted_n": 65, "predicted_kyr": EIGHT_H / 65},
    "precession": {"range": (18.0, 26.0), "predicted_n": 113, "predicted_kyr": EIGHT_H / 113},
}

# 25 active formula integers in the n=1..30 resolvable range on Cheng
FORMULA_INTEGERS_FULL = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                          38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]
# n=1..30 subset (periods 89..2682 kyr, all individually resolvable in 640 kyr)
FORMULA_INT_RESOLVABLE = [n for n in FORMULA_INTEGERS_FULL if 1 <= n <= 30]

N_PERMUTATIONS = 1000
RNG_SEED = 20260520


# ─────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────

def load_two_col(path):
    ages, vals = [], []
    with open(path, "rt") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#") or s.lower().startswith(("age", "time")):
                continue
            parts = s.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a); vals.append(v)
    return np.array(ages), np.array(vals)


def regrid_detrend(ages, vals, window, dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a, v = ages[mask], vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt / 2, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


# ─────────────────────────────────────────────────────────────────────────
# B1: Multi-band centroid agreement
# ─────────────────────────────────────────────────────────────────────────

def ls_peak_in_band(ages, vals, period_band, n_freq=4000):
    """Find Lomb-Scargle peak period in the given band on irregular timeseries."""
    lo, hi = period_band
    freqs = np.linspace(1.0 / hi, 1.0 / lo, n_freq)
    ls = LombScargle(ages, vals).power(freqs)
    i = int(np.argmax(ls))
    return float(1.0 / freqs[i]), float(ls[i])


def test_B1_band_centroid_agreement(ages_lr04, vals_lr04, ages_cheng, vals_cheng):
    print("\n" + "─" * 72)
    print("B1: Multi-band centroid agreement (LR04 vs Cheng on matched 0-640 kyr)")
    print("─" * 72)
    # Restrict both to matched window
    mask_lr04 = (ages_lr04 >= T_WINDOW[0]) & (ages_lr04 <= T_WINDOW[1])
    mask_cheng = (ages_cheng >= T_WINDOW[0]) & (ages_cheng <= T_WINDOW[1])
    a_lr04, v_lr04 = ages_lr04[mask_lr04], vals_lr04[mask_lr04]
    a_cheng, v_cheng = ages_cheng[mask_cheng], vals_cheng[mask_cheng]

    results = {}
    n_agree = 0
    for band_name, info in BANDS.items():
        band_range = info["range"]
        predicted = info["predicted_kyr"]
        rayleigh = (sum(band_range) / 2) ** 2 / (T_WINDOW[1] - T_WINDOW[0])
        p_lr04, _ = ls_peak_in_band(a_lr04, v_lr04, band_range)
        p_cheng, _ = ls_peak_in_band(a_cheng, v_cheng, band_range)
        diff = abs(p_lr04 - p_cheng)
        agree = diff < rayleigh
        if agree: n_agree += 1
        diff_vs_pred_lr04 = abs(p_lr04 - predicted)
        diff_vs_pred_cheng = abs(p_cheng - predicted)
        print(f"  {band_name:>10s}  predicted {predicted:6.2f} kyr  "
              f"LR04 peak {p_lr04:6.2f}  Cheng peak {p_cheng:6.2f}  "
              f"|diff| {diff:5.2f}  (Rayleigh {rayleigh:.2f})  "
              f"agree={agree}")
        results[band_name] = {
            "band_range_kyr": list(band_range),
            "predicted_centroid_kyr": predicted,
            "lr04_peak_kyr": p_lr04,
            "cheng_peak_kyr": p_cheng,
            "diff_kyr": diff,
            "rayleigh_resolution_kyr": rayleigh,
            "centroids_agree": bool(agree),
            "diff_lr04_vs_predicted_kyr": diff_vs_pred_lr04,
            "diff_cheng_vs_predicted_kyr": diff_vs_pred_cheng,
        }
    verdict = ("POSITIVE — chronology-independent centroid agreement"
               if n_agree == len(BANDS)
               else (f"PARTIAL — {n_agree}/{len(BANDS)} bands agree"
                     if n_agree > 0 else "NULL"))
    print(f"  VERDICT: {verdict}")
    return {"bands": results, "n_agree": int(n_agree), "n_bands": len(BANDS), "verdict": verdict}


# ─────────────────────────────────────────────────────────────────────────
# B2: Permutation test on formula-integer amplitudes (Cheng)
# ─────────────────────────────────────────────────────────────────────────

def single_amp(t, y, period_kyr):
    omega = 2 * np.pi / period_kyr
    X = np.column_stack([np.ones_like(t), np.cos(omega * t), np.sin(omega * t)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.hypot(b[1], b[2]))


def test_B2_permutation(t_cheng, y_cheng, rng):
    print("\n" + "─" * 72)
    print("B2: Permutation test — Cheng amplitudes at formula vs non-formula integers")
    print("─" * 72)
    print(f"  formula integers in resolvable range (n=1..30): {FORMULA_INT_RESOLVABLE}")
    print(f"  permutations: {N_PERMUTATIONS}")

    n_formula = len(FORMULA_INT_RESOLVABLE)
    formula_amps = np.array([single_amp(t_cheng, y_cheng, EIGHT_H / n)
                              for n in FORMULA_INT_RESOLVABLE])
    formula_mean = float(formula_amps.mean())

    # Non-formula candidates in same n=1..30 range
    candidates = [n for n in range(1, 31) if n not in FORMULA_INT_RESOLVABLE]
    if len(candidates) < n_formula:
        raise RuntimeError(f"only {len(candidates)} non-formula candidates, need {n_formula}")

    null_means = np.empty(N_PERMUTATIONS)
    for k in range(N_PERMUTATIONS):
        sample = rng.choice(candidates, size=n_formula, replace=False)
        amps = np.array([single_amp(t_cheng, y_cheng, EIGHT_H / n) for n in sample])
        null_means[k] = amps.mean()

    null_mean = float(null_means.mean())
    null_p95 = float(np.percentile(null_means, 95))
    p_value = float((null_means >= formula_mean).sum() / N_PERMUTATIONS)
    significant = bool(p_value < 0.05)
    print(f"  Cheng mean amp at formula integers:  {formula_mean:.4f}")
    print(f"  null mean amp (random non-formula):  {null_mean:.4f}")
    print(f"  null 95th percentile:                {null_p95:.4f}")
    print(f"  p-value (one-sided):                 {p_value:.4f}")
    verdict = "POSITIVE — formula integers louder than random in Cheng" if significant else "NULL"
    print(f"  VERDICT: {verdict}")
    return {
        "formula_integers_resolvable": FORMULA_INT_RESOLVABLE,
        "n_formula": n_formula,
        "n_candidates": len(candidates),
        "n_permutations": N_PERMUTATIONS,
        "formula_mean_amplitude": formula_mean,
        "null_mean_amplitude": null_mean,
        "null_p95_amplitude": null_p95,
        "p_value": p_value,
        "significant_at_05": significant,
        "verdict": verdict,
    }


# ─────────────────────────────────────────────────────────────────────────
# B3: Cross-coherence LR04 ↔ Cheng
# ─────────────────────────────────────────────────────────────────────────

def test_B3_coherence(t, y_lr04, y_cheng):
    print("\n" + "─" * 72)
    print("B3: Magnitude-squared coherence LR04 ↔ Cheng (matched 0-640 kyr window)")
    print("─" * 72)
    nperseg = min(256, len(y_lr04) // 2)
    f, cxy = coherence(y_lr04, y_cheng, fs=1.0 / DT_KYR, nperseg=nperseg)
    # Skip f=0
    mask = f > 0
    f_v, c_v = f[mask], cxy[mask]
    periods = 1.0 / f_v

    band_results = {}
    n_high = 0
    for name, info in BANDS.items():
        lo, hi = info["range"]
        idx = (periods >= lo) & (periods <= hi)
        if not idx.any():
            continue
        max_coh = float(c_v[idx].max())
        max_at_period = float(periods[idx][int(np.argmax(c_v[idx]))])
        # "High" coherence threshold: 95th percentile of off-band coherence
        offband_mask = ((periods < lo) | (periods > hi)) & (periods < 300)
        offband_p95 = float(np.percentile(c_v[offband_mask], 95)) if offband_mask.any() else 0.0
        high = max_coh > offband_p95
        if high: n_high += 1
        print(f"  {name:>10s} band: max coherence {max_coh:.3f} at P={max_at_period:.1f} kyr  "
              f"(offband 95th: {offband_p95:.3f})  high={high}")
        band_results[name] = {
            "band_range_kyr": [lo, hi],
            "max_coherence_in_band": max_coh,
            "max_at_period_kyr": max_at_period,
            "offband_p95_coherence": offband_p95,
            "coherence_high_vs_offband": bool(high),
        }
    verdict = ("POSITIVE — coherence elevated at predicted bands"
               if n_high == len(BANDS)
               else (f"PARTIAL — {n_high}/{len(BANDS)} bands show elevated coherence"
                     if n_high > 0 else "NULL"))
    print(f"  VERDICT: {verdict}")
    return {"nperseg": nperseg, "bands": band_results,
            "n_high_bands": int(n_high), "n_bands": len(BANDS), "verdict": verdict}


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("CHENG 2016 INDEPENDENT-CHRONOLOGY VALIDATION (3 sub-tests)")
    print("=" * 72)
    print(f"H = {H_KYR} kyr   |   8H = {EIGHT_H:.3f} kyr")
    print(f"Matched window: {T_WINDOW}")

    ages_lr04, vals_lr04 = load_two_col(LR04_PATH)
    ages_cheng, vals_cheng = load_two_col(CHENG_PATH)
    print(f"  LR04 records:  {len(ages_lr04)}  ({ages_lr04.min():.1f}..{ages_lr04.max():.1f} kyr)")
    print(f"  Cheng records: {len(ages_cheng)}  ({ages_cheng.min():.1f}..{ages_cheng.max():.1f} kyr)")

    t_lr04, y_lr04 = regrid_detrend(ages_lr04, vals_lr04, T_WINDOW)
    t_cheng, y_cheng = regrid_detrend(ages_cheng, vals_cheng, T_WINDOW)
    print(f"  matched-window samples: LR04 {len(t_lr04)}, Cheng {len(t_cheng)}")

    rng = np.random.default_rng(RNG_SEED)

    t0 = time.time()
    b1 = test_B1_band_centroid_agreement(ages_lr04, vals_lr04, ages_cheng, vals_cheng)
    b2 = test_B2_permutation(t_cheng, y_cheng, rng)
    b3 = test_B3_coherence(t_lr04, y_lr04, y_cheng)
    print(f"\n  total runtime: {time.time()-t0:.1f}s")

    result = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "matched_window_kyr": list(T_WINDOW),
            "bands": {k: {"range_kyr": list(v["range"]),
                          "predicted_n": v["predicted_n"],
                          "predicted_kyr": v["predicted_kyr"]}
                       for k, v in BANDS.items()},
        },
        "B1_band_centroid_agreement": b1,
        "B2_permutation_formula_amplitudes": b2,
        "B3_cross_coherence": b3,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

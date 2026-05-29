#!/usr/bin/env python3
"""
MILANKOVITCH 8H FORMULA — PHASE PREDICTION ACCURACY
====================================================

Test G (doc 91 §12.7 — phase prediction).

The R² goodness-of-fit metric is dominated by amplitude. Phase is independent
information: did the formula correctly time the glacial maxima, or does it
just get the average glacial-cycle amplitude right? This test detects the
canonical Pleistocene glacial maxima in LR04 (MIS 2/6/8/10/12/14/16/18/20/22)
and compares their timings to the corresponding model peaks.

Methodology:
  1. Compute the 25-component model reconstruction C_model(t) on full LR04.
  2. Find local maxima of LR04 δ¹⁸O (= glacial maxima) in the well-defined
     past-1000-kyr window.
  3. Find local maxima of C_model(t) in the same window.
  4. For each observed glacial maximum, identify the nearest model peak and
     compute the timing offset.
  5. Report: median |offset|, fraction within ±5 kyr, ±10 kyr.

A null distribution is constructed by shifting the model peaks randomly by
±20 kyr; the empirical p-value is the fraction of null trials with smaller
median |offset| than observed.

Output: data/milankovitch-8h-phase-prediction.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend, find_peaks

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
OUT_PATH = DATA_DIR / "milankovitch-8h-phase-prediction.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
WINDOW = (0, 1000)            # past 1 Myr — well-defined MIS chronology
MIN_PEAK_DISTANCE_KYR = 60.0  # at least 60 kyr between glacial maxima
PROMINENCE_SIGMA = 0.5        # peak must rise > 0.5σ above neighbors
N_NULL = 1000
RNG_SEED = 20260520


def load_lr04():
    ages, vals = [], []
    with LR04_PATH.open() as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a); vals.append(v)
    return np.array(ages), np.array(vals)


def preprocess(ages, d18o, window):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]; v = d18o[mask]
    a_uni = np.arange(a.min(), a.max() + DT_KYR / 2, DT_KYR)
    v_uni = np.interp(a_uni, a, v)
    v_det = detrend(v_uni)
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return a_uni, v_norm


def fit_formula(t, y, integers):
    n = len(t); k = len(integers)
    X = np.empty((n, 1 + 2 * k))
    X[:, 0] = 1.0
    for i, n_int in enumerate(integers):
        omega = 2 * np.pi * n_int / EIGHT_H
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    return X @ beta


def find_glacial_maxima(t, y, min_distance_kyr=MIN_PEAK_DISTANCE_KYR,
                        prominence=PROMINENCE_SIGMA):
    """Local maxima of detrended δ¹⁸O. Higher δ¹⁸O = colder = glacial."""
    distance_samples = int(min_distance_kyr / DT_KYR)
    idx, _ = find_peaks(y, distance=distance_samples, prominence=prominence)
    return t[idx], y[idx]


def load_integers():
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        return formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        return [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 96, 107, 110,
                113, 120, 134, 141, 152, 185]


def nearest_offset(observed_t, predicted_t):
    """For each observed time, find nearest predicted time and signed offset (pred − obs)."""
    offsets = []
    for ot in observed_t:
        i = int(np.argmin(np.abs(predicted_t - ot)))
        offsets.append(predicted_t[i] - ot)
    return np.array(offsets)


def main():
    print("=" * 72)
    print("8H FORMULA — PHASE PREDICTION ACCURACY (MIS glacial-maxima timing)")
    print("=" * 72)

    ages, d18o = load_lr04()
    # Fit the model on the FULL LR04 window (5320 kyr) for proper amplitudes,
    # then evaluate in the 0-1000 kyr phase-test window. This avoids
    # confounding amplitude vs phase across the MPT.
    t_full, y_full = preprocess(ages, d18o, (0, 5320))
    integers = load_integers()
    print(f"  fitting 25-component model on full LR04 (5320 kyr, {len(t_full)} samples)")
    y_hat_full = fit_formula(t_full, y_full, integers)

    # Restrict to 0-1000 kyr for phase test
    mask = (t_full >= WINDOW[0]) & (t_full <= WINDOW[1])
    t = t_full[mask]; y_obs = y_full[mask]; y_pred = y_hat_full[mask]

    print(f"  phase-test window: {WINDOW} ({len(t)} samples)\n")

    # Detect glacial maxima in observed and predicted
    obs_t, obs_v = find_glacial_maxima(t, y_obs)
    pred_t, pred_v = find_glacial_maxima(t, y_pred,
                                          prominence=0.3)  # model is smoother

    print(f"  observed glacial maxima (LR04): {len(obs_t)} peaks")
    print(f"    times (kyr BP): {[f'{x:.0f}' for x in obs_t]}")
    print(f"  model glacial maxima:           {len(pred_t)} peaks")
    print(f"    times (kyr BP): {[f'{x:.0f}' for x in pred_t]}\n")

    offsets = nearest_offset(obs_t, pred_t)
    abs_offsets = np.abs(offsets)
    med_abs = float(np.median(abs_offsets))
    mean_abs = float(np.mean(abs_offsets))
    within_5 = float((abs_offsets <= 5).sum() / len(abs_offsets))
    within_10 = float((abs_offsets <= 10).sum() / len(abs_offsets))
    print(f"  per-glacial-maximum offsets (model minus observed, kyr):")
    for ot, off in zip(obs_t, offsets):
        print(f"    {ot:5.0f} kyr BP : {off:+6.1f} kyr")
    print(f"\n  median |offset| = {med_abs:.2f} kyr")
    print(f"  mean   |offset| = {mean_abs:.2f} kyr")
    print(f"  within ±5  kyr  = {within_5:.1%}")
    print(f"  within ±10 kyr  = {within_10:.1%}")

    # Null: randomly shift each predicted peak by U(-20, 20) kyr and recompute
    rng = np.random.default_rng(RNG_SEED)
    null_meds = np.empty(N_NULL)
    for k in range(N_NULL):
        shift = rng.uniform(-20.0, 20.0, len(pred_t))
        pred_shuffled = pred_t + shift
        null_offsets = nearest_offset(obs_t, pred_shuffled)
        null_meds[k] = float(np.median(np.abs(null_offsets)))
    null_med_of_meds = float(np.median(null_meds))
    null_p05 = float(np.percentile(null_meds, 5))
    p_value = float((null_meds <= med_abs).sum() / N_NULL)
    print(f"\n  null (random ±20 kyr shift, {N_NULL} trials):")
    print(f"    median of null medians = {null_med_of_meds:.2f} kyr")
    print(f"    5th percentile of null  = {null_p05:.2f} kyr")
    print(f"    one-sided p (obs ≤ null): {p_value:.4f}")

    if p_value < 0.05 and within_5 >= 0.5:
        verdict = "POSITIVE — model peaks coincide with MIS glacial maxima better than random"
    elif p_value < 0.05:
        verdict = "POSITIVE (weak) — significantly better than null, but <50% within ±5 kyr"
    else:
        verdict = "NULL — phase agreement not significantly better than random"
    print(f"  VERDICT: {verdict}")

    result = {
        "meta": {
            "H_kyr": H_KYR,
            "8H_kyr": EIGHT_H,
            "fit_window_kyr": [0, 5320],
            "phase_test_window_kyr": list(WINDOW),
            "n_integers": len(integers),
            "min_peak_distance_kyr": MIN_PEAK_DISTANCE_KYR,
        },
        "observed_glacial_maxima_kyr_BP": obs_t.tolist(),
        "model_glacial_maxima_kyr_BP": pred_t.tolist(),
        "per_peak_offsets_kyr": offsets.tolist(),
        "median_abs_offset_kyr": med_abs,
        "mean_abs_offset_kyr": mean_abs,
        "fraction_within_5_kyr": within_5,
        "fraction_within_10_kyr": within_10,
        "null": {
            "n_trials": N_NULL,
            "shift_range_kyr": [-20.0, 20.0],
            "median_of_null_medians_kyr": null_med_of_meds,
            "p_value_obs_le_null": p_value,
        },
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

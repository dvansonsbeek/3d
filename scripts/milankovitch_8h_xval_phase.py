#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — CROSS-VALIDATED PHASE PREDICTION
==============================================================

Test M (doc 17 §12.13 — out-of-sample glacial timing).

Test G showed the formula correctly times glacial maxima within 5 kyr median
on the FULL-RECORD fit. Test F1/F2 showed amplitudes don't generalize across
the MPT. The honest combined question: do PHASE predictions generalize, even
when amplitudes don't?

Methodology:
  Two complementary cross-validation splits:
    M1 — Train on pre-MPT (1800–5320 kyr), predict OUT-OF-SAMPLE on post-MPT
         (0–1800 kyr). Detect glacial maxima in observed post-MPT and in
         the pre-MPT-trained model's reconstruction of post-MPT. Compute
         per-event timing offset.
    M2 — Train on post-MPT (0–1800 kyr), predict OUT-OF-SAMPLE on pre-MPT
         (1800–5320 kyr). Same metric.

If the framework captures genuine orbital phase (not just amplitude noise),
M1 and M2 should give phase prediction error similar to Test G's full-fit
median (~5 kyr). If they give error >20 kyr, the framework doesn't capture
phase robustly.

Output: data/milankovitch-8h-xval-phase.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend, find_peaks

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
OUT_PATH = DATA_DIR / "milankovitch-8h-xval-phase.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
WINDOW = (0, 5320)
SPLIT_KYR = 1800.0    # MPT boundary
MIN_PEAK_DISTANCE_KYR = 60.0
PROMINENCE_OBS = 0.5
PROMINENCE_PRED = 0.3


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


def preprocess_full(ages, d18o):
    lo, hi = WINDOW
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]; v = d18o[mask]
    a_uni = np.arange(a.min(), a.max() + DT_KYR / 2, DT_KYR)
    v_uni = np.interp(a_uni, a, v)
    v_det = detrend(v_uni)
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return a_uni, v_norm


def design_matrix(t, integers):
    n_obs = len(t); k = len(integers)
    X = np.empty((n_obs, 1 + 2 * k))
    X[:, 0] = 1.0
    for i, n_int in enumerate(integers):
        omega = 2 * np.pi * n_int / EIGHT_H
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    return X


def fit_predict(t_tr, y_tr, t_te, integers):
    X_tr = design_matrix(t_tr, integers)
    beta, *_ = np.linalg.lstsq(X_tr, y_tr, rcond=None)
    X_te = design_matrix(t_te, integers)
    return X_te @ beta


def detect_maxima(t, y, prominence):
    distance_samples = int(MIN_PEAK_DISTANCE_KYR / DT_KYR)
    idx, _ = find_peaks(y, distance=distance_samples, prominence=prominence)
    return t[idx]


def nearest_offsets(obs_t, pred_t):
    return np.array([(pred_t[int(np.argmin(np.abs(pred_t - ot)))] - ot)
                      for ot in obs_t])


def load_integers():
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        return formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        return [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]


def run_split(name, train_range, test_range, t, y, integers):
    print("\n  " + "─" * 70)
    print(f"  {name}:  train {train_range[0]/1000:.1f}–{train_range[1]/1000:.1f} Ma  →  predict {test_range[0]/1000:.1f}–{test_range[1]/1000:.1f} Ma")
    tr_mask = (t >= train_range[0]) & (t < train_range[1])
    te_mask = (t >= test_range[0]) & (t < test_range[1])
    t_tr, y_tr = t[tr_mask], y[tr_mask]
    t_te, y_te = t[te_mask], y[te_mask]

    y_pred = fit_predict(t_tr, y_tr, t_te, integers)
    obs_t = detect_maxima(t_te, y_te, PROMINENCE_OBS)
    pred_t = detect_maxima(t_te, y_pred, PROMINENCE_PRED)
    print(f"    observed maxima:  {len(obs_t)}, times: {[f'{x:.0f}' for x in obs_t]}")
    print(f"    predicted maxima: {len(pred_t)}, times: {[f'{x:.0f}' for x in pred_t]}")
    if len(pred_t) == 0:
        return {"name": name, "train_window_kyr": list(train_range),
                "test_window_kyr": list(test_range),
                "observed_count": int(len(obs_t)),
                "predicted_count": 0, "skipped": True}

    offsets = nearest_offsets(obs_t, pred_t)
    abs_off = np.abs(offsets)
    med = float(np.median(abs_off))
    mean = float(np.mean(abs_off))
    within_5 = float((abs_off <= 5).sum() / len(abs_off))
    within_10 = float((abs_off <= 10).sum() / len(abs_off))
    within_20 = float((abs_off <= 20).sum() / len(abs_off))
    print(f"    median |offset| = {med:.2f} kyr,  mean |offset| = {mean:.2f}")
    print(f"    within ±5 kyr = {within_5:.1%},  ±10 kyr = {within_10:.1%},  ±20 kyr = {within_20:.1%}")
    if med <= 10:
        verdict = "POSITIVE — phase generalizes out-of-sample"
    elif med <= 20:
        verdict = "PARTIAL — phase partially generalizes"
    else:
        verdict = "NULL — phase does not generalize out-of-sample"
    print(f"    VERDICT: {verdict}")
    return {
        "name": name,
        "train_window_kyr": list(train_range),
        "test_window_kyr": list(test_range),
        "observed_maxima_kyr_BP": obs_t.tolist(),
        "predicted_maxima_kyr_BP": pred_t.tolist(),
        "per_peak_offsets_kyr": offsets.tolist(),
        "median_abs_offset_kyr": med,
        "mean_abs_offset_kyr": mean,
        "fraction_within_5_kyr": within_5,
        "fraction_within_10_kyr": within_10,
        "fraction_within_20_kyr": within_20,
        "verdict": verdict,
    }


def main():
    print("=" * 72)
    print("CROSS-VALIDATED PHASE PREDICTION — DOES PHASE GENERALIZE ACROSS MPT?")
    print("=" * 72)
    print(f"  MPT split: {SPLIT_KYR} kyr BP")
    ages, d18o = load_lr04()
    t, y = preprocess_full(ages, d18o)
    integers = load_integers()
    print(f"  LR04: {len(t)} samples;  {len(integers)} formula integers")

    m1 = run_split("M1: pre-MPT → post-MPT (forward in time)",
                    (SPLIT_KYR, WINDOW[1]), (WINDOW[0], SPLIT_KYR),
                    t, y, integers)
    m2 = run_split("M2: post-MPT → pre-MPT (backward in time)",
                    (WINDOW[0], SPLIT_KYR), (SPLIT_KYR, WINDOW[1]),
                    t, y, integers)

    out = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "split_kyr_BP": SPLIT_KYR,
            "full_window_kyr": list(WINDOW),
            "n_integers": len(integers),
            "min_peak_distance_kyr": MIN_PEAK_DISTANCE_KYR,
        },
        "M1_preMPT_to_postMPT": m1,
        "M2_postMPT_to_preMPT": m2,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

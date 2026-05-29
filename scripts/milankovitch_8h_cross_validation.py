#!/usr/bin/env python3
"""
MILANKOVITCH 8H FORMULA — OUT-OF-SAMPLE CROSS-VALIDATION
=========================================================

Test F (doc 91 §12.6 — cross-validation).

The 25-component 8H Orbital Forcing Formula achieves R² = 0.232 on the full
LR04 record (T = 5320 kyr) using a joint amplitude+phase OLS fit. With 26 × 2
free parameters, in-sample R² can in principle reflect fitting freedom rather
than genuine predictive structure. The standard ML-hygiene check: fit
amplitudes+phases on a training window, then evaluate the SAME coefficients
on a held-out window without re-fitting. If R² collapses on the test set,
the model is overfitting; if it stays comparable, the structure is real.

This script runs three train/test splits:

  F1 — Temporal split (the headline). Train on 0–2000 kyr, test on 2000–5320
       kyr. The 3320-kyr test window has been completely unseen by the fit.

  F2 — Reverse temporal split. Train on 2000–5320 kyr (pre-MPT-heavy),
       test on 0–2000 kyr (post-MPT-heavy). Tests whether pre-MPT-trained
       coefficients capture post-MPT amplitudes.

  F3 — Even/odd halves. Train on samples with even index, test on samples
       with odd index. Different way of probing whether the formula
       captures something real beyond random.

Output: data/milankovitch-8h-cross-validation.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
OUT_PATH = DATA_DIR / "milankovitch-8h-cross-validation.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
WINDOW = (0, 5320)


# ─────────────────────────────────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────────────────────────────────

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


def design_matrix(t, integers):
    n_obs = len(t)
    k = len(integers)
    X = np.empty((n_obs, 1 + 2 * k))
    X[:, 0] = 1.0
    for i, n_int in enumerate(integers):
        omega = 2 * np.pi * n_int / EIGHT_H
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    return X


def fit_oos(t_tr, y_tr, t_te, y_te, integers):
    """OLS fit on (t_tr, y_tr), evaluate on (t_te, y_te). Returns train R², test R²."""
    X_tr = design_matrix(t_tr, integers)
    beta, *_ = np.linalg.lstsq(X_tr, y_tr, rcond=None)
    y_tr_hat = X_tr @ beta
    r2_tr = 1.0 - np.sum((y_tr - y_tr_hat) ** 2) / np.sum((y_tr - y_tr.mean()) ** 2)

    X_te = design_matrix(t_te, integers)
    y_te_hat = X_te @ beta
    # Test R²: use the SAME centering as test data has, but evaluate the
    # train-set model. Standard OOS R² formula.
    r2_te = 1.0 - np.sum((y_te - y_te_hat) ** 2) / np.sum((y_te - y_te.mean()) ** 2)
    return float(r2_tr), float(r2_te), beta


def load_integers():
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        return formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        return [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 96, 107, 110,
                113, 120, 134, 141, 152, 185]


def run_split(name, t, y, split_kyr, integers, reverse=False):
    """Temporal split at split_kyr. reverse=False: train on [0, split], test on [split, end]."""
    mask_lo = t < split_kyr
    if reverse:
        t_tr, y_tr = t[~mask_lo], y[~mask_lo]
        t_te, y_te = t[mask_lo], y[mask_lo]
        tr_desc = f"{split_kyr}–{int(t.max())} kyr"
        te_desc = f"0–{split_kyr} kyr"
    else:
        t_tr, y_tr = t[mask_lo], y[mask_lo]
        t_te, y_te = t[~mask_lo], y[~mask_lo]
        tr_desc = f"0–{split_kyr} kyr"
        te_desc = f"{split_kyr}–{int(t.max())} kyr"
    r2_tr, r2_te, _ = fit_oos(t_tr, y_tr, t_te, y_te, integers)
    print(f"  {name}:  train {tr_desc} R²={r2_tr:.4f}   test {te_desc} R²={r2_te:.4f}   ratio test/train={r2_te/r2_tr:.3f}")
    return {
        "name": name,
        "train_window": tr_desc,
        "test_window": te_desc,
        "train_samples": int(len(t_tr)),
        "test_samples": int(len(t_te)),
        "train_r2": r2_tr,
        "test_r2": r2_te,
        "test_over_train_ratio": float(r2_te / r2_tr) if r2_tr != 0 else float("nan"),
    }


def run_evenodd(t, y, integers):
    idx = np.arange(len(t))
    even = (idx % 2 == 0)
    t_tr, y_tr = t[even], y[even]
    t_te, y_te = t[~even], y[~even]
    r2_tr, r2_te, _ = fit_oos(t_tr, y_tr, t_te, y_te, integers)
    print(f"  F3 even/odd:  train (even) R²={r2_tr:.4f}   test (odd) R²={r2_te:.4f}   ratio={r2_te/r2_tr:.3f}")
    return {
        "name": "F3 even/odd",
        "train_window": "even-index samples",
        "test_window": "odd-index samples",
        "train_samples": int(len(t_tr)),
        "test_samples": int(len(t_te)),
        "train_r2": r2_tr,
        "test_r2": r2_te,
        "test_over_train_ratio": float(r2_te / r2_tr) if r2_tr != 0 else float("nan"),
    }


def main():
    print("=" * 72)
    print("8H FORMULA — OUT-OF-SAMPLE CROSS-VALIDATION")
    print("=" * 72)
    ages, d18o = load_lr04()
    t, y = preprocess(ages, d18o, WINDOW)
    integers = load_integers()
    print(f"  LR04 {WINDOW}: {len(y)} samples, {len(integers)} formula integers")

    # Full-record baseline R² (in-sample)
    X = design_matrix(t, integers)
    beta_full, *_ = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta_full
    r2_full = 1.0 - np.sum((y - y_hat) ** 2) / np.sum((y - y.mean()) ** 2)
    print(f"  full-record in-sample R² = {r2_full:.4f}\n")

    f1 = run_split("F1 0-2000 train / 2000-5320 test", t, y, 2000, integers, reverse=False)
    f2 = run_split("F2 2000-5320 train / 0-2000 test", t, y, 2000, integers, reverse=True)
    f3 = run_evenodd(t, y, integers)

    # Verdict: test R² should be > 0 and ideally > ~half of training R²
    def verdict(r):
        if r["test_r2"] > 0.10 and r["test_over_train_ratio"] > 0.4:
            return "POSITIVE (out-of-sample R² ≥ 0.10, retains ≥40% of training R²)"
        if r["test_r2"] > 0.05:
            return "MIXED (out-of-sample R² > 0.05 but degraded)"
        return "NULL (test R² collapses)"
    for r in (f1, f2, f3):
        r["verdict"] = verdict(r)
    print(f"\n  Verdicts:")
    for r in (f1, f2, f3):
        print(f"    {r['name']}: {r['verdict']}")

    result = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "n_integers": len(integers),
            "integers": integers,
            "full_record_in_sample_r2": float(r2_full),
        },
        "F1_temporal_split_0_2000": f1,
        "F2_temporal_split_2000_5320": f2,
        "F3_even_odd": f3,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

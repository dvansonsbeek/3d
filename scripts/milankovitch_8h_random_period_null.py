#!/usr/bin/env python3
"""
MILANKOVITCH 8H FORMULA — RANDOM-PERIOD NULL BASELINE
======================================================

Pre-registered Test C from doc 18 §5.3.

The 25-component 8H Orbital Forcing Formula achieves R² = 0.232 on LR04 with
amplitudes + phases fit at the 25 model-selected integer divisors of 8H. The
concern this test addresses: with 25 × 2 free parameters (cos and sin per
period), could *any* 25 periods do this well?

Three null distributions, each with 1000 random trials:
  Null A — 25 random periods uniform in [22, 400] kyr (covers Milankovitch band)
  Null B — 25 random integers from {1..200}, periods 8H/n (lattice positions,
           random subset)
  Null C — 25 half-integer offsets from the 8H lattice (n + 0.5; deliberately
           between adjacent integers)

For each trial, fit a 25-component sinusoidal model (cos+sin per period plus
intercept) by OLS to the full LR04 record and compute R². The empirical
p-value is the fraction of nulls reaching the model's R².

Output: data/milankovitch-random-period-null.json
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
OUT_PATH = DATA_DIR / "milankovitch-random-period-null.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
WINDOW = (0, 5320)
N_COMPONENTS = 25
N_TRIALS = 1000
PERIOD_BAND_KYR = (22.0, 400.0)
RNG_SEED = 20260520


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
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def preprocess(ages, d18o, window):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = d18o[mask]
    a_uni = np.arange(a.min(), a.max() + DT_KYR / 2, DT_KYR)
    v_uni = np.interp(a_uni, a, v)
    v_det = detrend(v_uni)
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return a_uni, v_norm


# ─────────────────────────────────────────────────────────────────────────
# Fit
# ─────────────────────────────────────────────────────────────────────────

def fit_r2(t, y, periods_kyr):
    """OLS fit of intercept + sum_k (a_k cos ω_k t + b_k sin ω_k t). Returns R²."""
    if any(p <= 0 for p in periods_kyr):
        return float("nan")
    n = len(t)
    k = len(periods_kyr)
    X = np.empty((n, 1 + 2 * k))
    X[:, 0] = 1.0
    for i, P in enumerate(periods_kyr):
        omega = 2 * np.pi / P
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    return 1.0 - ss_res / ss_tot


def model_r2(t, y):
    """Compute model R² at the 25 integer divisors used by the formula."""
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        integers = formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        # Fallback: hard-coded 26 from milankovitch_climate_formula.py
        integers = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                    38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]
    periods = [EIGHT_H / n for n in integers]
    return fit_r2(t, y, periods), integers


def main():
    print("=" * 72)
    print("8H FORMULA — RANDOM-PERIOD NULL BASELINE")
    print("=" * 72)

    ages, d18o = load_lr04()
    t, y = preprocess(ages, d18o, WINDOW)
    print(f"  LR04 window {WINDOW}: {len(y)} samples, dt = {DT_KYR} kyr")

    r2_obs, integers = model_r2(t, y)
    print(f"  model R² (25 components @ integer divisors) = {r2_obs:.4f}")
    print(f"  integers used: {integers}\n")

    rng = np.random.default_rng(RNG_SEED)

    def run_null(name, description, sampler):
        print(f"  {name}: {description}")
        t0 = time.time()
        r2s = np.empty(N_TRIALS)
        for k in range(N_TRIALS):
            periods = sampler()
            r2s[k] = fit_r2(t, y, periods)
        r2s = r2s[np.isfinite(r2s)]
        p_value = float((r2s >= r2_obs).sum() / len(r2s))
        out = {
            "description": description,
            "mean_r2": float(r2s.mean()),
            "p95_r2": float(np.percentile(r2s, 95)),
            "p_value": p_value,
        }
        dt = time.time() - t0
        print(f"    mean R² = {out['mean_r2']:.4f}, 95th = {out['p95_r2']:.4f}, p = {p_value:.4f}  ({dt:.1f}s)")
        return out

    # Null A: random periods in Milankovitch band
    null_a = run_null(
        "Null A",
        f"{N_COMPONENTS} random periods uniform in [{PERIOD_BAND_KYR[0]:.0f}, {PERIOD_BAND_KYR[1]:.0f}] kyr",
        lambda: rng.uniform(PERIOD_BAND_KYR[0], PERIOD_BAND_KYR[1], N_COMPONENTS),
    )

    # Null B: random integer 8H divisors
    null_b = run_null(
        "Null B",
        f"{N_COMPONENTS} random integers from {{1..200}}, periods 8H/n",
        lambda: EIGHT_H / rng.choice(np.arange(1, 201), size=N_COMPONENTS, replace=False),
    )

    # Null C: deliberately off-lattice half-integers
    null_c = run_null(
        "Null C",
        f"{N_COMPONENTS} random half-integer offsets (n + 0.5) from 8H lattice",
        lambda: EIGHT_H / (rng.choice(np.arange(1, 200), size=N_COMPONENTS, replace=False) + 0.5),
    )

    result = {
        "model_r2": float(r2_obs),
        "n_components": N_COMPONENTS,
        "n_trials": N_TRIALS,
        "null_A_random_periods": null_a,
        "null_B_random_integers": null_b,
        "null_C_half_integers": null_c,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

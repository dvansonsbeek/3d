#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — MTM F-TEST FOR LINE SIGNIFICANCE
=============================================================

Test J (doc 91 §12.10 — line significance).

The closure test and the random-period null both work on band-aggregate
statistics. The Thomson multi-taper (MTM) F-test gives a per-spectral-line
statistic: at each frequency, does the data contain a deterministic
sinusoidal component (vs. coloured-noise background)? Standard paleoclimate
methodology (Thomson 1982, Percival & Walden 1993).

Methodology:
  1. Compute MTM spectrum of LR04 (full 5320 kyr) with K = 5 DPSS tapers
     and time-bandwidth product NW = 3.
  2. For each of the 25 framework integers n, evaluate the Thomson F-statistic
     at f_n = n / 8H.
  3. F is distributed as F(2, 2K-2) under the null of no line; we use the
     standard p < 0.05 cutoff for "significant line".
  4. As a fairness check, also evaluate F at 25 random non-framework integer
     positions (matched-n range), and compare the rate of significance.

The test PASSES if formula integers carry significantly more significant
lines than random non-formula integers. It FAILS if formula integers don't
beat the baseline rate.

Output: data/milankovitch-8h-mtm-f-test.json
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import f as f_dist

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
OUT_PATH = DATA_DIR / "milankovitch-8h-mtm-f-test.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
WINDOW = (0, 5320)
NW = 3
K = 5  # number of DPSS tapers
ALPHA = 0.05

N_PERMUTATIONS = 1000
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


def thomson_f_at_freq(y, freq, NW=NW, K=K, dt=DT_KYR):
    """Thomson F-test statistic for a sinusoidal line at frequency `freq` (cycles/kyr).
    Returns F-stat distributed as F(2, 2K-2) under H0 of no line at freq.

    Formula (Percival & Walden 1993, §10.10):
        Y_k(f)         = sum_t v_k(t) y(t) exp(-i 2π f t)
        U_k            = sum_t v_k(t)            (= taper DC sum)
        μ̂(f)           = ( sum_k U_k Y_k(f) ) / ( sum_k |U_k|² )    (complex amplitude)
        F(f)           = (K-1) * |μ̂(f)|² * sum_k |U_k|² /
                          sum_k | Y_k(f) - μ̂(f) U_k |²
    """
    n = len(y)
    tapers = dpss(n, NW, K)
    times = np.arange(n) * dt
    Y = np.array([np.sum(taper * y * np.exp(-2j * np.pi * freq * times))
                  for taper in tapers])
    U = np.array([np.sum(taper) for taper in tapers])
    # Only even-symmetric DPSS tapers have non-zero U (DC sum); use those only.
    even_mask = np.array([k % 2 == 0 for k in range(K)])
    if not even_mask.any():
        return 0.0
    Y_even = Y[even_mask]
    U_even = U[even_mask]
    denom_U2 = float(np.sum(np.abs(U_even) ** 2))
    if denom_U2 < 1e-30:
        return 0.0
    mu_hat = np.sum(U_even * Y_even) / denom_U2
    numerator = (K - 1) * (np.abs(mu_hat) ** 2) * denom_U2
    # Residual energy across ALL K tapers
    residuals = Y - mu_hat * U
    denom = np.sum(np.abs(residuals) ** 2)
    if denom < 1e-30:
        return float("inf")
    return float(numerator / denom)


def f_critical(alpha=ALPHA, K=K):
    """Critical F at the (1-alpha) quantile of F(2, 2K-2)."""
    return float(f_dist.ppf(1 - alpha, 2, 2 * K - 2))


def load_integers():
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        return formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        return [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 96, 107, 110,
                113, 120, 134, 141, 152, 185]


def main():
    print("=" * 72)
    print("MTM F-TEST FOR LINE SIGNIFICANCE AT THE 26 FRAMEWORK INTEGERS")
    print("=" * 72)
    print(f"  NW = {NW}, K = {K} tapers, alpha = {ALPHA}")
    F_crit = f_critical(ALPHA, K)
    print(f"  F critical (1-α=0.95, dof=(2,{2*K-2})) = {F_crit:.3f}\n")

    ages, d18o = load_lr04()
    t, y = preprocess(ages, d18o, WINDOW)
    print(f"  LR04 window {WINDOW}: {len(y)} samples")

    integers = load_integers()
    print(f"  testing {len(integers)} framework integers\n")

    formula_results = []
    n_sig_formula = 0
    t0 = time.time()
    for n_int in integers:
        f_val = thomson_f_at_freq(y, n_int / EIGHT_H)
        p_val = 1.0 - f_dist.cdf(f_val, 2, 2 * K - 2) if np.isfinite(f_val) else 0.0
        sig = bool(f_val > F_crit)
        if sig: n_sig_formula += 1
        formula_results.append({
            "n": int(n_int),
            "period_kyr": EIGHT_H / n_int,
            "F_stat": f_val,
            "p_value": float(p_val),
            "significant": sig,
        })
        marker = "✓" if sig else " "
        print(f"  n={n_int:3d}  P={EIGHT_H/n_int:7.2f} kyr   F={f_val:8.3f}   p={p_val:.4f}  {marker}")
    print(f"\n  formula integers significant at α=0.05:  {n_sig_formula}/{len(integers)} = {n_sig_formula/len(integers):.1%}")
    print(f"  ({time.time()-t0:.1f}s)\n")

    # Permutation: random non-formula integers in {1..200}
    print(f"  permutation test ({N_PERMUTATIONS} trials, random non-formula n)...")
    rng = np.random.default_rng(RNG_SEED)
    candidates = [n for n in range(1, 201) if n not in set(integers)]
    null_sig_counts = np.empty(N_PERMUTATIONS, dtype=int)
    t0 = time.time()
    for trial in range(N_PERMUTATIONS):
        sample = rng.choice(candidates, size=len(integers), replace=False)
        n_sig_null = 0
        for n_int in sample:
            f_val = thomson_f_at_freq(y, n_int / EIGHT_H)
            if f_val > F_crit:
                n_sig_null += 1
        null_sig_counts[trial] = n_sig_null
    null_mean = float(null_sig_counts.mean())
    null_p95 = float(np.percentile(null_sig_counts, 95))
    p_value = float((null_sig_counts >= n_sig_formula).sum() / N_PERMUTATIONS)
    print(f"  null mean significant count:  {null_mean:.2f}")
    print(f"  null 95th percentile:         {null_p95:.2f}")
    print(f"  observed:                     {n_sig_formula}")
    print(f"  empirical p-value:            {p_value:.4f}")
    print(f"  ({time.time()-t0:.1f}s)")

    verdict = ("POSITIVE — framework integers carry significantly more lines than random"
                if p_value < 0.05
                else "NULL — framework integers do not beat random non-formula baseline")
    print(f"\n  VERDICT: {verdict}")

    result = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "window_kyr": list(WINDOW),
            "n_samples": int(len(y)),
            "NW": NW,
            "K_tapers": K,
            "alpha": ALPHA,
            "F_critical": F_crit,
        },
        "formula_integer_results": formula_results,
        "n_formula_significant": int(n_sig_formula),
        "n_formula_total": int(len(integers)),
        "fraction_formula_significant": float(n_sig_formula / len(integers)),
        "permutation_test": {
            "n_permutations": N_PERMUTATIONS,
            "null_mean_significant_count": null_mean,
            "null_p95_significant_count": null_p95,
            "p_value": p_value,
            "significant_at_05": bool(p_value < 0.05),
        },
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

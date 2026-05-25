#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — ALL-INTEGER MTM F-TEST SCAN
========================================================

Test L (doc 17 §12.12 — falsifying the integer-selection claim).

Test J (§5.10) showed that 7/25 framework integers carry F-test-significant
spectral lines in LR04 (vs 0.88 random null). The follow-up question for
falsification: of ALL 200 integer divisors of 8H in n∈{1..200}, which ones
carry significant lines? If most integers (≥50%) are significant, the
framework's choice of 25 was arbitrary. If only the framework integers light
up significantly (plus perhaps a few specific others), the 25-integer set
is empirically meaningful.

Methodology:
  1. Compute Thomson F-statistic at every integer-divisor position n=1..200
     (= 200 different periods between 13.4 kyr and 2682.5 kyr).
  2. At each position, test for significance at α = 0.05 (F > F_crit).
  3. Compare hit rate: framework set (26) vs non-framework set (174).
  4. Identify any non-framework integers that are significant — those would
     either be (a) genuine additional eigenmodes the framework should
     include, or (b) statistical noise.

Output: data/milankovitch-8h-all-integer-mtm.json
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
OUT_PATH = DATA_DIR / "milankovitch-8h-all-integer-mtm.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
WINDOW = (0, 5320)
NW = 3
K = 5
ALPHA = 0.05
N_MAX = 200


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


def thomson_f_at_freq(y, freq, tapers, U_even, even_idx, dt=DT_KYR):
    n = len(y)
    times = np.arange(n) * dt
    K_local = tapers.shape[0]
    Y = np.array([np.sum(taper * y * np.exp(-2j * np.pi * freq * times))
                  for taper in tapers])
    Y_even = Y[even_idx]
    denom_U2 = float(np.sum(np.abs(U_even) ** 2))
    if denom_U2 < 1e-30:
        return 0.0
    mu_hat = np.sum(U_even * Y_even) / denom_U2
    numerator = (K_local - 1) * (np.abs(mu_hat) ** 2) * denom_U2
    residuals = Y - mu_hat * np.array([np.sum(t) for t in tapers])
    denom = np.sum(np.abs(residuals) ** 2)
    if denom < 1e-30:
        return float("inf")
    return float(numerator / denom)


def load_integers():
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        return formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        return [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]


def main():
    print("=" * 72)
    print("ALL-INTEGER MTM F-TEST SCAN — DOES THE FRAMEWORK'S SELECTION HOLD UP?")
    print("=" * 72)

    ages, d18o = load_lr04()
    t, y = preprocess(ages, d18o, WINDOW)
    print(f"  LR04 {WINDOW}: {len(y)} samples, NW={NW}, K={K} tapers")

    formula_set = set(load_integers())
    F_crit = float(f_dist.ppf(1 - ALPHA, 2, 2 * K - 2))
    print(f"  F critical (α=0.05, dof=(2,{2*K-2})): {F_crit:.3f}")
    print(f"  framework integers: {sorted(formula_set)}\n")

    # Precompute DPSS tapers (depend only on N, NW, K)
    tapers = dpss(len(y), NW, K)
    U = np.array([np.sum(taper) for taper in tapers])
    even_idx = np.array([k % 2 == 0 for k in range(K)])
    U_even = U[even_idx]

    t0 = time.time()
    results = []
    for n in range(1, N_MAX + 1):
        f_val = thomson_f_at_freq(y, n / EIGHT_H, tapers, U_even, even_idx)
        p_val = 1.0 - f_dist.cdf(f_val, 2, 2 * K - 2) if np.isfinite(f_val) else 0.0
        sig = bool(f_val > F_crit)
        in_formula = bool(n in formula_set)
        results.append({
            "n": n,
            "period_kyr": EIGHT_H / n,
            "F_stat": f_val,
            "p_value": float(p_val),
            "significant": sig,
            "in_formula": in_formula,
        })
    dt = time.time() - t0
    print(f"  scanned n=1..{N_MAX} in {dt:.1f}s")

    sig_results = [r for r in results if r["significant"]]
    sig_in_formula = [r for r in sig_results if r["in_formula"]]
    sig_not_in_formula = [r for r in sig_results if not r["in_formula"]]
    n_formula = len(formula_set)
    n_non_formula = N_MAX - n_formula

    print(f"\n  Significant lines (F > {F_crit:.2f}):")
    print(f"    total significant:           {len(sig_results)} / {N_MAX}")
    print(f"    significant ∈ framework:     {len(sig_in_formula)} / {n_formula} = {len(sig_in_formula)/n_formula:.1%}")
    print(f"    significant ∉ framework:     {len(sig_not_in_formula)} / {n_non_formula} = {len(sig_not_in_formula)/n_non_formula:.1%}")

    if len(sig_in_formula) > 0:
        odds_formula = len(sig_in_formula) / n_formula
        odds_non = len(sig_not_in_formula) / n_non_formula
        enrichment = odds_formula / odds_non if odds_non > 0 else float("inf")
        print(f"    enrichment ratio: framework / non-framework = {enrichment:.2f}×")

    # Top 20 most significant lines
    sorted_by_F = sorted(results, key=lambda r: -r["F_stat"])
    print(f"\n  Top 20 most significant lines (any n):")
    print(f"    {'n':>4}  {'period':>8}  {'F':>8}  {'p':>9}  {'formula?':>10}")
    for r in sorted_by_F[:20]:
        flag = "✓ formula" if r["in_formula"] else "  non-fmla"
        print(f"    {r['n']:>4d}  {r['period_kyr']:>8.2f}  {r['F_stat']:>8.3f}  {r['p_value']:>9.4f}  {flag}")

    # Falsifiable verdict
    p_chance = (len(sig_in_formula)/n_formula) / (ALPHA + 1e-9)
    if len(sig_not_in_formula) / n_non_formula < 2 * ALPHA and len(sig_in_formula) / n_formula > 4 * ALPHA:
        verdict = "POSITIVE — framework integers strongly enriched in significant lines"
    elif len(sig_not_in_formula) / n_non_formula > 0.5:
        verdict = "FALSIFIED — non-framework integers ALSO frequently significant; framework choice arbitrary"
    else:
        verdict = "PARTIAL — some enrichment but not decisive"
    print(f"\n  VERDICT: {verdict}")

    out = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "window_kyr": list(WINDOW),
            "NW": NW, "K_tapers": K, "alpha": ALPHA,
            "F_critical": F_crit,
            "n_max": N_MAX,
            "n_formula_integers": n_formula,
        },
        "scan": results,
        "n_significant_total": len(sig_results),
        "n_significant_in_formula": len(sig_in_formula),
        "n_significant_not_in_formula": len(sig_not_in_formula),
        "rate_in_formula": float(len(sig_in_formula) / n_formula),
        "rate_not_in_formula": float(len(sig_not_in_formula) / n_non_formula),
        "enrichment_ratio": float((len(sig_in_formula)/n_formula) /
                                    (len(sig_not_in_formula)/n_non_formula))
                               if len(sig_not_in_formula) > 0 else float("inf"),
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

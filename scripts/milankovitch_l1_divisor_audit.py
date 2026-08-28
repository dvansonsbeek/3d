#!/usr/bin/env python3
"""
L1 divisor audit — every shipped divisor on the same footing, per regime.

Answers "do all L1 divisors still earn their place, and where does a candidate
rank among them?" with the doc-94 instrument applied to each divisor in turn:

  baseline  the canonical L1+L2+L3 fitted on the full regime WITHOUT divisor n
  pair      cos/sin(2π n t / 8H), ridge-fitted (λ = 0.01) on that residual
  pair_in   in-sample ΔR² of re-adding n           (the n = 24 test of doc 94 §10)
  pair_cv   split-half cross-validated ΔR² of re-adding n
  loo_in    in-sample R² loss when n is dropped from the full refit
  amp/med   |amplitude| / median |amplitude| in the shipped fit

A negative pair_cv does NOT mean a line is spurious: it means its amplitude is
non-stationary across the two halves (regime dependence — doc 91's thesis).
Read it as a stationarity test within the regime.

Output: data/l1-divisor-audit-results.json (deterministic, no seeds).
"""
import json
import sys
import time
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import milankovitch_climate_formula as mcf  # noqa: E402
from milankovitch_climate_formula import (  # noqa: E402
    ClimateFormula, REGIME_WINDOWS, load_lr04, preprocess, L1_LATTICE_INTEGERS, EIGHT_H,
)
from milankovitch_insolation_stability import in_sample_dr2, cv_dr2, RIDGE_LAMBDA  # noqa: E402

OUT_PATH = SCRIPT_DIR.parent / "data" / "l1-divisor-audit-results.json"
REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
SHIPPED = list(L1_LATTICE_INTEGERS)


def canon(divs, t, y, regime):
    mcf.L1_LATTICE_INTEGERS = sorted(divs)
    f = ClimateFormula(); s = f.fit(t, y, regime=regime)
    yn = (y - y.mean()) / max(y.std(), 1e-12)
    return yn - f.evaluate(t), yn, float(s.r2_l1_l2_l3), s


def pair(t, n):
    w = 2 * np.pi * n / EIGHT_H
    return np.column_stack([np.cos(w * t), np.sin(w * t)])


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    out = {"metadata": {"script": Path(__file__).name, "divisors": SHIPPED, "n_divisors": len(SHIPPED),
                        "ridge_lambda": RIDGE_LAMBDA,
                        "cv": "split-half, both directions, canonical baseline (without n) fitted on the full regime"},
           "regime_results": {}}
    for regime in REGIMES:
        t, y = preprocess(ages, vals, window=REGIME_WINDOWS[regime])
        _, _, r2_all, s_all = canon(SHIPPED, t, y, regime)
        amps = s_all.l1_amplitudes
        med = float(np.median([abs(v) for v in amps.values()]))
        rows = {}
        for n in SHIPPED:
            rest = [d for d in SHIPPED if d != n]
            res, yn, r2c, _ = canon(rest, t, y, regime)
            P = pair(t, n)
            rows[n] = {"amp_over_median": abs(amps[n]) / med, "loo_in": r2_all - r2c,
                       "pair_in": in_sample_dr2(res, yn, r2c, P), "pair_cv": cv_dr2(res, yn, P)[0]}
        order_cv = sorted(rows, key=lambda k: -rows[k]["pair_cv"])
        order_in = sorted(rows, key=lambda k: -rows[k]["loo_in"])
        for n in rows:
            rows[n]["rank_cv"] = order_cv.index(n) + 1
            rows[n]["rank_in"] = order_in.index(n) + 1
        out["regime_results"][regime] = {"window_kyr": list(REGIME_WINDOWS[regime]), "r2_l1_l2_l3": r2_all,
                                         "n_cv_positive": int(sum(1 for r in rows.values() if r["pair_cv"] > 0)),
                                         "rows": {str(k): v for k, v in rows.items()}}
        print(f"\n=== {regime} {REGIME_WINDOWS[regime]}  R2 = {r2_all:.4f}   sorted by pair CV ΔR²")
        print(f"  {'n':>4} {'kyr':>7} {'amp/med':>8} {'LOO in':>8} {'pair in':>8} {'pair CV':>8}")
        for n in order_cv:
            r = rows[n]
            print(f"  {n:>4} {EIGHT_H/n:7.1f} {r['amp_over_median']:8.2f} {r['loo_in']:+8.4f} {r['pair_in']:+8.4f} {r['pair_cv']:+8.4f}")
    mcf.L1_LATTICE_INTEGERS = SHIPPED
    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")


if __name__ == "__main__":
    main()

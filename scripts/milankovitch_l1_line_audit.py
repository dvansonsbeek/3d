#!/usr/bin/env python3
"""
L1 line audit — every shipped line on the same footing, per regime.

Answers "do all L1 lines still earn their place?" with the doc-94 instrument
applied to each shipped physical line (data/l1-physical-lines.json, read
through the climate module's L1_PERIODS_KYR) in turn:

  baseline  the canonical L1+L2+L3 fitted on the full regime WITHOUT the line
  pair      cos/sin(2π t / P), ridge-fitted (λ = 0.01) on that residual
  pair_in   in-sample ΔR² of re-adding the line
  pair_cv   split-half cross-validated ΔR² of re-adding the line
  loo_in    in-sample R² loss when the line is dropped from the full refit
  amp/med   |amplitude| / median |amplitude| in the shipped fit

A negative pair_cv does NOT mean a line is spurious: it means its amplitude is
non-stationary across the two halves (regime dependence). Read it as a
stationarity test within the regime.

The reduced line sets are fitted by monkeypatching the module global the
fitter reads (milankovitch_climate_formula.L1_PERIODS_KYR); it is restored
afterwards. Rows are keyed by the module's own coefficient key, the period
formatted to four decimals.

Output: data/l1-line-audit-results.json (deterministic, no seeds).
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
    ClimateFormula, REGIME_WINDOWS, L1_LABELS, L1_PERIODS_KYR, load_lr04, preprocess,
)
from milankovitch_insolation_stability import in_sample_dr2, cv_dr2, RIDGE_LAMBDA  # noqa: E402

OUT_PATH = SCRIPT_DIR.parent / "data" / "l1-line-audit-results.json"
REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
SHIPPED = list(L1_PERIODS_KYR)


def key(P):
    return f"{P:.4f}"


def canon(lines, t, y, regime):
    mcf.L1_PERIODS_KYR = sorted(lines)
    f = ClimateFormula(); s = f.fit(t, y, regime=regime)
    yn = (y - y.mean()) / max(y.std(), 1e-12)
    return yn - f.evaluate(t), yn, float(s.r2_l1_l2_l3), s


def pair(t, P):
    w = 2 * np.pi / P
    return np.column_stack([np.cos(w * t), np.sin(w * t)])


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    out = {"metadata": {"script": Path(__file__).name,
                        "lines": [{"period_kyr": P, "label": L1_LABELS[P]} for P in SHIPPED],
                        "n_lines": len(SHIPPED), "ridge_lambda": RIDGE_LAMBDA,
                        "cv": "split-half, both directions, canonical baseline (without the line) fitted on the full regime"},
           "regime_results": {}}
    try:
        for regime in REGIMES:
            t, y = preprocess(ages, vals, window=REGIME_WINDOWS[regime])
            _, _, r2_all, s_all = canon(SHIPPED, t, y, regime)
            amps = s_all.l1_amplitudes
            med = float(np.median([abs(v) for v in amps.values()]))
            rows = {}
            for P in SHIPPED:
                rest = [q for q in SHIPPED if q != P]
                res, yn, r2c, _ = canon(rest, t, y, regime)
                X = pair(t, P)
                rows[P] = {"label": L1_LABELS[P], "period_kyr": P,
                           "amp_over_median": abs(amps[P]) / med, "loo_in": r2_all - r2c,
                           "pair_in": in_sample_dr2(res, yn, r2c, X), "pair_cv": cv_dr2(res, yn, X)[0]}
            order_cv = sorted(rows, key=lambda k: -rows[k]["pair_cv"])
            order_in = sorted(rows, key=lambda k: -rows[k]["loo_in"])
            for P in rows:
                rows[P]["rank_cv"] = order_cv.index(P) + 1
                rows[P]["rank_in"] = order_in.index(P) + 1
            best_cv, best_loo = order_cv[0], order_in[0]
            out["regime_results"][regime] = {
                "window_kyr": list(REGIME_WINDOWS[regime]), "r2_l1_l2_l3": r2_all,
                "n_cv_positive": int(sum(1 for r in rows.values() if r["pair_cv"] > 0)),
                "n_loo_positive": int(sum(1 for r in rows.values() if r["loo_in"] > 0)),
                "best_cv_line": {"label": L1_LABELS[best_cv], "period_kyr": best_cv,
                                 "pair_cv": rows[best_cv]["pair_cv"]},
                "largest_loo_line": {"label": L1_LABELS[best_loo], "period_kyr": best_loo,
                                     "loo_in": rows[best_loo]["loo_in"]},
                "rows": {key(P): v for P, v in rows.items()},
            }
            print(f"\n=== {regime} {REGIME_WINDOWS[regime]}  R2 = {r2_all:.4f}   sorted by pair CV ΔR²")
            print(f"  {'line':<30} {'kyr':>8} {'amp/med':>8} {'LOO in':>8} {'pair in':>8} {'pair CV':>8}")
            for P in order_cv:
                r = rows[P]
                print(f"  {r['label']:<30} {P:8.2f} {r['amp_over_median']:8.2f} {r['loo_in']:+8.4f} "
                      f"{r['pair_in']:+8.4f} {r['pair_cv']:+8.4f}")
    finally:
        mcf.L1_PERIODS_KYR = SHIPPED
    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")


if __name__ == "__main__":
    main()

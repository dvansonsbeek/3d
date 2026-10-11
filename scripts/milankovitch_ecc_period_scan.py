#!/usr/bin/env python3
"""
Which period does the climate record prefer in the ~100-kyr (eccentricity) band?

Scan a free-phase pair cos/sin(2π t / P) over P = 79…149 kyr in 0.25-kyr steps
and ask where the in-sample and cross-validated gains peak, per LR04 regime,
against two baselines:

  raw     the normalized record itself (periodogram-like)
  open    the canonical L1+L2+L3 residual with the shipped band members —
          every L1 line with 75 ≤ P ≤ 130 kyr — REMOVED, so the band is open
          and the scan does not look into a hole where a shipped line sits

The cross-validated argmax is the stationary line (phase-coherent across the
two halves); the in-sample argmax follows the power. On the open baseline the
same pair is also evaluated AT each shipped band line's period, so "which of
the derived lines does the record carry out of sample" sits beside the free
scan. The nearest shipped line to each CV peak and its offset are recorded.

The reduced line set is fitted by monkeypatching the module global the fitter
reads (milankovitch_climate_formula.L1_PERIODS_KYR); it is restored afterwards.

Output: data/ecc-period-scan-results.json (deterministic, no seeds).
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
from milankovitch_insolation_stability import in_sample_dr2, cv_dr2  # noqa: E402

OUT_PATH = SCRIPT_DIR.parent / "data" / "ecc-period-scan-results.json"
REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
SHIPPED = list(L1_PERIODS_KYR)
BAND_KYR = (75.0, 130.0)
BAND_LINES = sorted(P for P in SHIPPED if BAND_KYR[0] <= P <= BAND_KYR[1])
PERIODS = np.round(np.arange(79.0, 149.0001, 0.25), 2)


def key(P):
    return f"{P:.4f}"


def canon(lines, t, y, regime):
    mcf.L1_PERIODS_KYR = sorted(lines)
    f = ClimateFormula(); s = f.fit(t, y, regime=regime)
    yn = (y - y.mean()) / max(y.std(), 1e-12)
    return yn - f.evaluate(t), yn, float(s.r2_l1_l2_l3)


def pair(t, P):
    w = 2 * np.pi / P
    return np.column_stack([np.cos(w * t), np.sin(w * t)])


def scan(res, yn, r2c, t):
    ins = np.array([in_sample_dr2(res, yn, r2c, pair(t, P)) for P in PERIODS])
    cvs = np.array([cv_dr2(res, yn, pair(t, P))[0] for P in PERIODS])
    return ins, cvs


def peak(arr, j):
    lo = j
    while lo > 0 and arr[lo - 1] >= 0.5 * arr[j]:
        lo -= 1
    hi = j
    while hi < len(PERIODS) - 1 and arr[hi + 1] >= 0.5 * arr[j]:
        hi += 1
    return float(PERIODS[lo]), float(PERIODS[hi])


def nearest_line(P):
    q = min(SHIPPED, key=lambda s: abs(s - P))
    return {"label": L1_LABELS[q], "period_kyr": q, "offset_pct": 100.0 * (P / q - 1.0)}


def summarize(ins, cvs, at_lines=None):
    i, j = int(np.argmax(ins)), int(np.argmax(cvs))
    lo, hi = peak(cvs, j)
    return {"argmax_in_kyr": float(PERIODS[i]), "max_in": float(ins[i]), "cv_at_in_peak": float(cvs[i]),
            "argmax_cv_kyr": float(PERIODS[j]), "max_cv": float(cvs[j]), "cv_halfmax_kyr": [lo, hi],
            "nearest_line_to_cv_peak": nearest_line(float(PERIODS[j])),
            "at_lines": at_lines}


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    out = {"metadata": {"script": Path(__file__).name,
                        "scan_kyr": [float(PERIODS[0]), float(PERIODS[-1]), 0.25],
                        "band_kyr": list(BAND_KYR),
                        "band_lines_removed_for_open": [{"period_kyr": P, "label": L1_LABELS[P]} for P in BAND_LINES],
                        "lines": [{"period_kyr": P, "label": L1_LABELS[P]} for P in SHIPPED]},
           "regime_results": {}}
    try:
        for regime in REGIMES:
            t, y = preprocess(ages, vals, window=REGIME_WINDOWS[regime])
            yn = (y - y.mean()) / max(y.std(), 1e-12)
            r = {"window_kyr": list(REGIME_WINDOWS[regime])}
            r["raw"] = summarize(*scan(yn, yn, 0.0, t))
            res, yn2, r2c = canon([q for q in SHIPPED if q not in BAND_LINES], t, y, regime)
            at_lines = {key(P): {"label": L1_LABELS[P], "period_kyr": P,
                                 "in_sample": in_sample_dr2(res, yn2, r2c, pair(t, P)),
                                 "cv": cv_dr2(res, yn2, pair(t, P))[0]} for P in BAND_LINES}
            r["open"] = summarize(*scan(res, yn2, r2c, t), at_lines)
            best = max(at_lines.values(), key=lambda v: v["cv"])
            r["open"]["best_cv_shipped_line"] = best
            out["regime_results"][regime] = r
            print(f"\n=== {regime} {REGIME_WINDOWS[regime]}")
            for name in ("raw", "open"):
                s = r[name]
                nl = s["nearest_line_to_cv_peak"]
                print(f"  {name:5} in-sample best {s['argmax_in_kyr']:.2f} kyr ({s['max_in']:+.4f}, CV there {s['cv_at_in_peak']:+.4f}) | "
                      f"CV best {s['argmax_cv_kyr']:.2f} kyr ({s['max_cv']:+.4f}; half-max {s['cv_halfmax_kyr'][0]:.2f}..{s['cv_halfmax_kyr'][1]:.2f}) | "
                      f"nearest line {nl['label']} {nl['period_kyr']:.2f} kyr ({nl['offset_pct']:+.1f}%)")
            print("  at shipped band lines (open baseline):")
            for v in at_lines.values():
                print(f"    {v['label']:<30} {v['period_kyr']:8.2f} kyr  in {v['in_sample']:+.4f}  CV {v['cv']:+.4f}")
    finally:
        mcf.L1_PERIODS_KYR = SHIPPED
    pre, post = out["regime_results"]["pre-inhg"], out["regime_results"]["post-mpt"]
    out["summary"] = {
        "pre_inhg_cv_best_kyr_raw": pre["raw"]["argmax_cv_kyr"],
        "pre_inhg_cv_best_kyr_open": pre["open"]["argmax_cv_kyr"],
        "pre_inhg_max_cv_open": pre["open"]["max_cv"],
        "pre_inhg_cv_halfmax_kyr_open": pre["open"]["cv_halfmax_kyr"],
        "pre_inhg_nearest_line_open": pre["open"]["nearest_line_to_cv_peak"],
        "pre_inhg_cv_at_nearest_line_open": pre["open"]["at_lines"][key(pre["open"]["nearest_line_to_cv_peak"]["period_kyr"])]["cv"]
            if key(pre["open"]["nearest_line_to_cv_peak"]["period_kyr"]) in pre["open"]["at_lines"] else None,
        "pre_inhg_in_best_kyr_open": pre["open"]["argmax_in_kyr"],
        "pre_inhg_in_best_cv_open": pre["open"]["cv_at_in_peak"],
        "pre_inhg_best_cv_shipped_line_open": pre["open"]["best_cv_shipped_line"],
        "post_mpt_cv_best_kyr_open": post["open"]["argmax_cv_kyr"],
        "post_mpt_nearest_line_open": post["open"]["nearest_line_to_cv_peak"],
        "post_mpt_best_cv_shipped_line_open": post["open"]["best_cv_shipped_line"],
    }
    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    s = out["summary"]
    nl = s["pre_inhg_nearest_line_open"]
    print(f"\nPRE-iNHG stationary line (band open): {s['pre_inhg_cv_best_kyr_open']:.2f} kyr, "
          f"half-max {s['pre_inhg_cv_halfmax_kyr_open'][0]:.2f}..{s['pre_inhg_cv_halfmax_kyr_open'][1]:.2f}; "
          f"nearest shipped line {nl['label']} {nl['period_kyr']:.2f} kyr ({nl['offset_pct']:+.1f}%)")
    print(f"Output: {OUT_PATH}")


if __name__ == "__main__":
    main()

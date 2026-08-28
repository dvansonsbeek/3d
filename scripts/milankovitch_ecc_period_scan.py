#!/usr/bin/env python3
"""
Which period does the climate record prefer for Earth's eccentricity line?

The model puts Earth's |e| on 8H/24 = H/3 (111.8 kyr). Turned around: scan a
free-phase pair cos/sin(2π n t / 8H) over n = 18..34 in 0.05 steps (≈149..79
kyr) and ask where the in-sample and cross-validated gains peak, against three
baselines per LR04 regime:

  raw     the normalized record itself (periodogram-like)
  open    canonical L1+L2+L3 residual with the 100-kyr band members 22/24/25/28
          REMOVED (so the band is open — no hole where a member line already sits;
          the candidate itself must be out, or the scan looks at its own hole)
  prior   canonical residual with the lattice minus the line under test (the
          pre-admission lattice: every other shipped divisor in place)

The cross-validated argmax is the stationary line (phase-coherent across the
two halves); the in-sample argmax follows the power. The pre-iNHG CV peak
width gives the bound on the line's period.

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
    ClimateFormula, REGIME_WINDOWS, load_lr04, preprocess, L1_LATTICE_INTEGERS, EIGHT_H,
)
from milankovitch_insolation_stability import in_sample_dr2, cv_dr2  # noqa: E402

OUT_PATH = SCRIPT_DIR.parent / "data" / "ecc-period-scan-results.json"
REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
SHIPPED = list(L1_LATTICE_INTEGERS)
MODEL_N = 24
BAND = (22, MODEL_N, 25, 28)
NS = np.round(np.arange(18.0, 34.0001, 0.05), 2)


def canon(divs, t, y, regime):
    mcf.L1_LATTICE_INTEGERS = sorted(divs)
    f = ClimateFormula(); s = f.fit(t, y, regime=regime)
    yn = (y - y.mean()) / max(y.std(), 1e-12)
    return yn - f.evaluate(t), yn, float(s.r2_l1_l2_l3)


def pair(t, n):
    w = 2 * np.pi * n / EIGHT_H
    return np.column_stack([np.cos(w * t), np.sin(w * t)])


def scan(res, yn, r2c, t):
    ins = np.array([in_sample_dr2(res, yn, r2c, pair(t, n)) for n in NS])
    cvs = np.array([cv_dr2(res, yn, pair(t, n))[0] for n in NS])
    return ins, cvs


def peak(arr, j):
    lo = j
    while lo > 0 and arr[lo - 1] >= 0.5 * arr[j]:
        lo -= 1
    hi = j
    while hi < len(NS) - 1 and arr[hi + 1] >= 0.5 * arr[j]:
        hi += 1
    return float(NS[lo]), float(NS[hi])


def summarize(ins, cvs):
    i, j = int(np.argmax(ins)), int(np.argmax(cvs))
    at = {str(int(n)): {"in_sample": float(ins[k]), "cv": float(cvs[k])} for k, n in enumerate(NS) if float(n).is_integer() and 20 <= n <= 30}
    lo, hi = peak(cvs, j)
    return {"argmax_in_n": float(NS[i]), "argmax_in_kyr": EIGHT_H / NS[i], "max_in": float(ins[i]),
            "argmax_cv_n": float(NS[j]), "argmax_cv_kyr": EIGHT_H / NS[j], "max_cv": float(cvs[j]),
            "cv_halfmax_n": [lo, hi], "cv_halfmax_kyr": [EIGHT_H / hi, EIGHT_H / lo],
            "at_integer_n": at}


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    out = {"metadata": {"script": Path(__file__).name, "scan_n": [float(NS[0]), float(NS[-1]), 0.05],
                        "band_removed_for_open": list(BAND), "model_n": MODEL_N,
                        "model_period_kyr": EIGHT_H / MODEL_N, "divisors": SHIPPED},
           "regime_results": {}}
    for regime in REGIMES:
        t, y = preprocess(ages, vals, window=REGIME_WINDOWS[regime])
        yn = (y - y.mean()) / max(y.std(), 1e-12)
        r = {"window_kyr": list(REGIME_WINDOWS[regime])}
        r["raw"] = summarize(*scan(yn, yn, 0.0, t))
        res, yn2, r2c = canon([d for d in SHIPPED if d not in BAND], t, y, regime)
        r["open"] = summarize(*scan(res, yn2, r2c, t))
        res, yn2, r2c = canon([d for d in SHIPPED if d != MODEL_N], t, y, regime)
        r["prior"] = summarize(*scan(res, yn2, r2c, t))
        out["regime_results"][regime] = r
        print(f"\n=== {regime} {REGIME_WINDOWS[regime]}")
        for name in ("raw", "open", "prior"):
            s = r[name]
            print(f"  {name:5} in-sample best n={s['argmax_in_n']:.2f} ({s['argmax_in_kyr']:.1f} kyr, {s['max_in']:+.4f}) | "
                  f"CV best n={s['argmax_cv_n']:.2f} ({s['argmax_cv_kyr']:.1f} kyr, {s['max_cv']:+.4f}; half-max n {s['cv_halfmax_n'][0]:.2f}..{s['cv_halfmax_n'][1]:.2f})")
    mcf.L1_LATTICE_INTEGERS = SHIPPED
    pre = out["regime_results"]["pre-inhg"]
    out["summary"] = {
        "pre_inhg_cv_best_n_raw": pre["raw"]["argmax_cv_n"], "pre_inhg_cv_best_kyr_raw": pre["raw"]["argmax_cv_kyr"],
        "pre_inhg_cv_best_n_open": pre["open"]["argmax_cv_n"], "pre_inhg_cv_best_kyr_open": pre["open"]["argmax_cv_kyr"],
        "pre_inhg_cv_halfmax_kyr_open": pre["open"]["cv_halfmax_kyr"],
        "offset_from_model_pct": 100.0 * (pre["open"]["argmax_cv_kyr"] / (EIGHT_H / MODEL_N) - 1.0),
        "pre_inhg_cv_at_23_open": pre["open"]["at_integer_n"]["23"]["cv"],
        "pre_inhg_cv_at_24_open": pre["open"]["at_integer_n"]["24"]["cv"],
        "pre_inhg_cv_at_25_open": pre["open"]["at_integer_n"]["25"]["cv"],
    }
    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    s = out["summary"]
    print(f"\nPRE-iNHG stationary line: {s['pre_inhg_cv_best_kyr_open']:.1f} kyr (n={s['pre_inhg_cv_best_n_open']:.2f}), "
          f"{s['offset_from_model_pct']:+.1f}% from 8H/{MODEL_N}; CV at 23/24/25: {s['pre_inhg_cv_at_23_open']:+.4f}/{s['pre_inhg_cv_at_24_open']:+.4f}/{s['pre_inhg_cv_at_25_open']:+.4f}")
    print(f"Output: {OUT_PATH}")


if __name__ == "__main__":
    main()

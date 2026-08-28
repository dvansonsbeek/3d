#!/usr/bin/env python3
"""
L1 attribution of the pre-iNHG e(t) gain — is it the lattice line n = 24?

Doc 94 §9 finds one cross-validated gain from adding the model's own
insolation features (e, e·sin ϖ, e·cos ϖ, ε) to the canonical L1+L2+L3
residual: pre-iNHG (2.7–5.3 Myr), model features only, not La2004's.
The model's e(t) is a single line on 8H/24 = H/3 = 111.8 kyr, and n = 24
is NOT one of L1's 32 lattice divisors (the list runs 22 → 25). This script
asks whether that gain is the missing lattice line or something specific to
e(t)'s shape and ϖ-products.

Built on milankovitch_insolation_stability.py — same LR04 loader, same
canonical residual per regime, same ridge (λ = 0.01) and split-half CV.

Per regime:
  A  decomposition of the model feature set: all four | e alone (fixed H/3
     phase, one parameter) | e·sin ϖ, e·cos ϖ pair | ε alone
  B  pure lattice pair cos/sin(2π n t / 8H) with free phase, n scanned
     20..30 (+ half-integers as a specificity control)
  C  R² of the standardized model e feature explained by the free-phase
     n = 24 pair (is the feature that line?)
  D  nesting: e on top of the n = 24 pair; the pair on top of all four
  E  phase: best-fit n = 24 phase in the residual vs the model's H/3 phase
  F  the direct L1 question: the canonical formula refitted with 24 ADDED
     to the lattice — R² change, and the n = 24 amplitude against the
     median L1 amplitude (the 3× median admission rule of doc 91)

Output: data/l1-n24-attribution-results.json (deterministic, no seeds).
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
    ClimateFormula, REGIME_WINDOWS, load_lr04, preprocess, EIGHT_H, L1_LATTICE_INTEGERS,
)
from milankovitch_insolation_extension import load_insolation_features, interp_features  # noqa: E402
from milankovitch_insolation_stability import (  # noqa: E402
    design, canonical_residual, ridge, in_sample_dr2, cv_dr2, REGIMES, RIDGE_LAMBDA,
)

OUT_PATH = SCRIPT_DIR.parent / "data" / "l1-n24-attribution-results.json"
LINE_N = 24
SCAN_N = [20, 21, 22, 23, 23.5, 24, 24.5, 25, 26, 27, 28, 29, 30]


def std(v):
    return (v - v.mean()) / max(v.std(), 1e-12)


def lattice_pair(t, n):
    w = 2 * np.pi * n / EIGHT_H
    return np.column_stack([np.cos(w * t), np.sin(w * t)])


def both(res, y_norm, r2c, X):
    return {"in_sample": in_sample_dr2(res, y_norm, r2c, X), "cv": cv_dr2(res, y_norm, X)[0]}


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    model = load_insolation_features()
    # The test is DEFINED against the pre-admission lattice (every shipped divisor
    # except the line under test); it must stay reproducible after n = 24 joined L1.
    base_list = [d for d in L1_LATTICE_INTEGERS if d != LINE_N]
    out = {"metadata": {"script": Path(__file__).name, "line_n": LINE_N,
                        "line_period_kyr": EIGHT_H / LINE_N,
                        "line_in_l1": LINE_N in list(L1_LATTICE_INTEGERS),
                        "baseline": "shipped lattice minus the line under test",
                        "l1_neighbours": [max(n for n in base_list if n < LINE_N), min(n for n in base_list if n > LINE_N)],
                        "ridge_lambda": RIDGE_LAMBDA,
                        "cv": "split-half, both directions, canonical baseline fitted on the full regime",
                        "scan_n": SCAN_N},
           "regime_results": {}}
    print(f"n = {LINE_N}: 8H/{LINE_N} = {EIGHT_H / LINE_N:.1f} kyr; in L1: {LINE_N in base_list}; neighbours {out['metadata']['l1_neighbours']}")
    for regime in REGIMES:
        t, y = preprocess(ages, vals, window=REGIME_WINDOWS[regime])
        mcf.L1_LATTICE_INTEGERS = base_list
        res, y_norm, r2c = canonical_residual(t, y, regime)
        f = interp_features(model, t)
        cols = {k: std(np.asarray(f[k])) for k in ["eps_anom", "ecc", "e_sin_peri", "e_cos_peri"]}
        X_all = design(t, model)
        P = lattice_pair(t, LINE_N)
        r = {"window_kyr": list(REGIME_WINDOWS[regime]), "n_samples": int(len(t)), "r2_l1_l2_l3": r2c}
        # A
        r["all4"] = both(res, y_norm, r2c, X_all)
        r["ecc_only"] = both(res, y_norm, r2c, cols["ecc"][:, None])
        r["peri_pair"] = both(res, y_norm, r2c, np.column_stack([cols["e_sin_peri"], cols["e_cos_peri"]]))
        r["eps_only"] = both(res, y_norm, r2c, cols["eps_anom"][:, None])
        # B
        r["scan_cv"] = {str(n): both(res, y_norm, r2c, lattice_pair(t, n))["cv"] for n in SCAN_N}
        r["line_pair"] = both(res, y_norm, r2c, P)
        # C
        c = np.linalg.lstsq(P, cols["ecc"], rcond=None)[0]
        r["r2_ecc_by_line_pair"] = 1.0 - float(np.sum((cols["ecc"] - P @ c) ** 2)) / float(np.sum(cols["ecc"] ** 2))
        # D
        d_pe = both(res, y_norm, r2c, np.column_stack([P, cols["ecc"]]))
        d_pa = both(res, y_norm, r2c, np.column_stack([P, X_all]))
        r["ecc_on_top_of_line"] = {k: d_pe[k] - r["line_pair"][k] for k in ("in_sample", "cv")}
        r["line_on_top_of_all4"] = {k: d_pa[k] - r["all4"][k] for k in ("in_sample", "cv")}
        # E
        a, b = ridge(P, res)
        phi_data = float(np.degrees(np.arctan2(b, a)))
        phi_model = float(np.degrees(np.arctan2(c[1], c[0])))
        dphi = float((phi_data - phi_model + 180.0) % 360.0 - 180.0)
        r["line_amp_in_residual"] = float(np.hypot(a, b))
        r["phase_data_deg"] = phi_data
        r["phase_model_deg"] = phi_model
        r["phase_diff_deg"] = dphi
        r["phase_diff_kyr"] = dphi / 360.0 * EIGHT_H / LINE_N
        # F
        mcf.L1_LATTICE_INTEGERS = sorted(base_list + [LINE_N])
        s33 = ClimateFormula().fit(t, y, regime=regime)
        amps = s33.l1_amplitudes
        mags = sorted((abs(v) for v in amps.values()), reverse=True)
        r["lattice_plus_line"] = {
            "r2_l1_l2_l3": float(s33.r2_l1_l2_l3),
            "delta_r2": float(s33.r2_l1_l2_l3) - r2c,
            "amp_line": float(amps[LINE_N]),
            "amp_line_over_median": float(abs(amps[LINE_N]) / np.median(mags)),
            "rank_of_line": int(mags.index(abs(amps[LINE_N])) + 1),
            "n_divisors": len(mags),
            "amp_neighbours": [float(amps[n]) for n in out["metadata"]["l1_neighbours"]],
        }
        mcf.L1_LATTICE_INTEGERS = base_list
        out["regime_results"][regime] = r
        print(f"\n{regime:10} {REGIME_WINDOWS[regime]} n={len(t)}  R2 canon={r2c:.4f}")
        for k in ("all4", "ecc_only", "peri_pair", "eps_only", "line_pair"):
            print(f"  {k:16} in-sample {r[k]['in_sample']:+.4f}  CV {r[k]['cv']:+.4f}")
        print("  scan CV: " + "  ".join(f"{n}:{v:+.4f}" for n, v in r["scan_cv"].items()))
        print(f"  R2(ecc | line pair) = {r['r2_ecc_by_line_pair']:.3f};  ecc on top of line CV {r['ecc_on_top_of_line']['cv']:+.4f}")
        print(f"  phase data {phi_data:+.1f}° model {phi_model:+.1f}° Δ {dphi:+.1f}° ({r['phase_diff_kyr']:+.1f} kyr); amp {r['line_amp_in_residual']:.4f}")
        lp = r["lattice_plus_line"]
        print(f"  lattice+{LINE_N}: R2 {lp['r2_l1_l2_l3']:.4f} (Δ {lp['delta_r2']:+.4f}); amp {lp['amp_line']:+.4f} = {lp['amp_line_over_median']:.2f}× median, rank {lp['rank_of_line']}/{lp['n_divisors']}")
    rr = out["regime_results"]
    pre = rr["pre-inhg"]
    out["summary"] = {
        "gain_regime": "pre-inhg",
        "ecc_cv_pre_inhg": pre["ecc_only"]["cv"],
        "line_cv_pre_inhg": pre["line_pair"]["cv"],
        "ecc_on_top_of_line_in_sample_pre_inhg": pre["ecc_on_top_of_line"]["in_sample"],
        "line_specific": all(v < pre["scan_cv"][str(LINE_N)] for n, v in pre["scan_cv"].items() if n != str(LINE_N)),
        "phase_diff_deg_pre_inhg": pre["phase_diff_deg"],
        "amp_over_median_pre_inhg": pre["lattice_plus_line"]["amp_line_over_median"],
        "amp_over_median_lr04_full": rr["lr04-full"]["lattice_plus_line"]["amp_line_over_median"],
        "admission_rule_x_median": 3.0,
        "passes_admission_rule_lr04_full": rr["lr04-full"]["lattice_plus_line"]["amp_line_over_median"] >= 3.0,
    }
    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    s = out["summary"]
    print(f"\nATTRIBUTION: pre-iNHG gain = the n={LINE_N} lattice line (e CV {s['ecc_cv_pre_inhg']:+.4f} vs line CV {s['line_cv_pre_inhg']:+.4f}; "
          f"line-specific {s['line_specific']}; phase Δ {s['phase_diff_deg_pre_inhg']:+.1f}°). "
          f"Admission (3× median, full LR04): {s['amp_over_median_lr04_full']:.2f}× → {'passes' if s['passes_admission_rule_lr04_full'] else 'does not pass'}")
    print(f"Output: {OUT_PATH}")


if __name__ == "__main__":
    main()

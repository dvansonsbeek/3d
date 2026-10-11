#!/usr/bin/env python3
"""
FIT METHODOLOGY DIAGNOSTICS — the L1 design matrix on the shipped lines
=========================================================================

Is the fitting methodology sound where the window cannot resolve neighbouring
lines? Measured per LR04 regime on the shipped physical lines
(data/l1-physical-lines.json through the climate module's L1_PERIODS_KYR):

  D1  L1 design-matrix conditioning per regime (singular-value spread)
  D2  Rayleigh-resolution check: which lines fall inside one Rayleigh
      element (1/T) of each other in each window?
  D3  Variance Inflation Factor (VIF) per L1 column, per regime
  D4  Forward-projection amplitude vs in-sample amplitude (per layer) for
      the shipped fitter (L1 ridge + L3; the 405-kyr family lives in L1)
  D5  Alternative-fit ladder on the L1 layer, post-MPT: OLS / ridge at three
      λ / Rayleigh-thinned line set — in-sample R², largest amplitude,
      forward-projection range (−250…0 kyr)
  D6  Cross-regime OLS vs ridge at the shipped λ (L1_RIDGE_LAMBDA)

The ladder fits normalized (zero-mean, unit-std) data with the module's own
ridge form (augmented least squares, intercept un-penalized).

Output: data/fit-methodology-diagnostics.json (deterministic, no seeds).
Run:    python3 scripts/fit_methodology_diagnostics.py
"""
import json
import sys
import time
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from milankovitch_climate_formula import (  # noqa: E402
    ClimateFormula, load_lr04, preprocess, L1_PERIODS_KYR, L1_LABELS, L1_RIDGE_LAMBDA, REGIME_WINDOWS,
)

OUT_PATH = SCRIPT_DIR.parent / "data" / "fit-methodology-diagnostics.json"
REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
FORWARD_GRID = np.arange(-250, 0.001, 0.5)      # the simulator's forward projection
LADDER_LAMBDAS = [0.1, 1.0, 10.0]


def key(P):
    return f"{P:.4f}"


def l1_design(t, periods, intercept=False):
    """cos/sin pair per line (periods in kyr); optional intercept column first."""
    cols, labels = ([np.ones(len(t))], ["intercept"]) if intercept else ([], [])
    for P in periods:
        omega = 2 * np.pi / P
        cols.append(np.cos(omega * t)); labels.append(f"cos {P:.1f}")
        cols.append(np.sin(omega * t)); labels.append(f"sin {P:.1f}")
    return np.column_stack(cols), labels


def diag_conditioning(t):
    X, _ = l1_design(t, L1_PERIODS_KYR)
    Xc = X - X.mean(axis=0, keepdims=True)
    s = np.linalg.svd(Xc, compute_uv=False)
    cond = float(s[0] / s[-1]) if s[-1] > 1e-15 else float("inf")
    return {"n_samples": int(len(t)), "n_cols": int(Xc.shape[1]),
            "rank_at_1e10_ratio": int(np.sum(s > s[0] * 1e-10)),
            "singular_max": float(s[0]), "singular_min": float(s[-1]), "condition_number": cond}


def diag_rayleigh(window):
    """Lines whose frequency spacing is below one Rayleigh element 1/T of the window."""
    lo, hi = window
    T = float(hi - lo)
    df = 1.0 / T
    by_freq = sorted(L1_PERIODS_KYR, key=lambda P: 1.0 / P)
    groups, current = [], [by_freq[0]]
    for prev, cur in zip(by_freq[:-1], by_freq[1:]):
        if (1.0 / cur - 1.0 / prev) < df:
            current.append(cur)
        else:
            groups.append(current); current = [cur]
    groups.append(current)
    multi = [sorted(g) for g in groups if len(g) > 1]
    return {"T_kyr": T, "rayleigh_df_per_kyr": df,
            "unresolved_groups": [[{"period_kyr": P, "label": L1_LABELS[P]} for P in g] for g in multi],
            "n_unresolved_groups": len(multi),
            "n_lines_in_unresolved_groups": int(sum(len(g) for g in multi))}


def diag_vif(t):
    X, labels = l1_design(t, L1_PERIODS_KYR)
    Xc = X - X.mean(axis=0, keepdims=True)
    vifs = {}
    for i in range(Xc.shape[1]):
        y_i = Xc[:, i]
        X_others = np.delete(Xc, i, axis=1)
        beta, *_ = np.linalg.lstsq(X_others, y_i, rcond=1e-10)
        ss_res = float(np.sum((y_i - X_others @ beta) ** 2))
        ss_tot = float(np.sum(y_i ** 2))
        vifs[labels[i]] = 1.0 / max(1.0 - (1.0 - ss_res / max(ss_tot, 1e-15)), 1e-12)
    worst = max(vifs, key=vifs.get)
    return {"max_vif": float(vifs[worst]), "max_vif_column": worst,
            "n_columns_vif_over_10": int(sum(v > 10 for v in vifs.values())),
            "n_columns_vif_over_100": int(sum(v > 100 for v in vifs.values()))}


def stat(v):
    return {"min": float(v.min()), "max": float(v.max()), "ptp": float(v.max() - v.min()), "std": float(v.std())}


def diag_forward_growth(t, y, regime):
    """The shipped fitter (L1 ridge + L3) in-sample vs on the forward grid, per layer."""
    f = ClimateFormula()
    f.fit(t, y, regime=regime)
    out = {"in_sample": {}, "forward": {}}
    for layer in ("all", "l1", "l3"):
        out["in_sample"][layer] = stat(f.evaluate(t, layer))
        out["forward"][layer] = stat(f.evaluate(FORWARD_GRID, layer))
    out["growth_ratio_total_ptp"] = out["forward"]["all"]["ptp"] / max(out["in_sample"]["all"]["ptp"], 1e-12)
    out["growth_ratio_l1_ptp"] = out["forward"]["l1"]["ptp"] / max(out["in_sample"]["l1"]["ptp"], 1e-12)
    return out


def fit_l1_ridge(t, y, lam, periods):
    """L1 layer alone on normalized y: intercept + pairs, ridge on the pairs via augmented lstsq."""
    yn = (y - y.mean()) / max(y.std(), 1e-12)
    X, _ = l1_design(t, periods, intercept=True)
    p = X.shape[1]
    if lam > 0:
        D = np.eye(p); D[0, 0] = 0.0
        beta, *_ = np.linalg.lstsq(np.vstack([X, np.sqrt(lam) * D]), np.concatenate([yn, np.zeros(p)]), rcond=1e-10)
    else:
        beta, *_ = np.linalg.lstsq(X, yn, rcond=1e-10)
    r2 = 1.0 - float(np.sum((yn - X @ beta) ** 2)) / max(float(np.sum((yn - yn.mean()) ** 2)), 1e-12)
    amps = {P: float(np.hypot(beta[1 + 2 * i], beta[2 + 2 * i])) for i, P in enumerate(periods)}
    return beta, r2, amps


def eval_l1(beta, t, periods):
    X, _ = l1_design(t, periods, intercept=True)
    return X @ beta


def ladder_row(method, t, y, lam, periods):
    beta, r2, amps = fit_l1_ridge(t, y, lam, periods)
    fwd = eval_l1(beta, FORWARD_GRID, periods)
    ins = eval_l1(beta, t, periods)
    worst = max(amps, key=amps.get)
    return {"method": method, "lambda": lam, "n_lines": len(periods), "r2_l1": r2,
            "max_amp": amps[worst], "max_amp_line": L1_LABELS[worst],
            "forward_min": float(fwd.min()), "forward_max": float(fwd.max()),
            "forward_ptp": float(fwd.max() - fwd.min()), "in_sample_ptp": float(ins.max() - ins.min())}


def rayleigh_thin(window):
    """Greedy: keep lines at least one Rayleigh element apart in frequency (ascending frequency)."""
    lo, hi = window
    df = 1.0 / float(hi - lo)
    by_freq = sorted(L1_PERIODS_KYR, key=lambda P: 1.0 / P)
    kept = [by_freq[0]]
    for P in by_freq[1:]:
        if (1.0 / P - 1.0 / kept[-1]) >= df:
            kept.append(P)
    return sorted(kept)


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    out = {"metadata": {"script": Path(__file__).name, "n_lines": len(L1_PERIODS_KYR),
                        "lines": [{"period_kyr": P, "label": L1_LABELS[P]} for P in L1_PERIODS_KYR],
                        "shipped_ridge_lambda": L1_RIDGE_LAMBDA, "ladder_lambdas": LADDER_LAMBDAS,
                        "forward_grid_kyr": [float(FORWARD_GRID[0]), float(FORWARD_GRID[-1]), 0.5]},
           "regimes": {}}

    print("=" * 96)
    print("D1/D2/D3: L1 DESIGN-MATRIX CONDITIONING, RAYLEIGH RESOLUTION, VIF — per regime")
    print("=" * 96)
    print(f"{'regime':10s} {'window':14s} {'n':>5s} {'rank':>7s} {'cond #':>10s} {'max VIF':>10s} {'VIF>10':>7s} "
          f"{'unresolved groups (lines)':>26s} {'OLS R²':>7s} {'ridge R²':>9s} {'OLS max|a|':>11s} {'ridge max|a|':>13s}")
    for regime in REGIMES:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        d1, d2, d3 = diag_conditioning(t), diag_rayleigh(window), diag_vif(t)
        ols = ladder_row("OLS", t, y, 0.0, list(L1_PERIODS_KYR))
        ridge = ladder_row(f"ridge λ={L1_RIDGE_LAMBDA}", t, y, L1_RIDGE_LAMBDA, list(L1_PERIODS_KYR))
        growth = diag_forward_growth(t, y, regime)
        out["regimes"][regime] = {"window_kyr": list(window), "conditioning": d1, "rayleigh": d2, "vif": d3,
                                  "ols": ols, "ridge_shipped": ridge, "shipped_fit_forward_growth": growth}
        print(f"{regime:10s} {str(window):14s} {d1['n_samples']:>5d} {d1['rank_at_1e10_ratio']:>3d}/{d1['n_cols']:<3d}"
              f" {d1['condition_number']:>10.3g} {d3['max_vif']:>10.3g} {d3['n_columns_vif_over_10']:>7d}"
              f" {d2['n_unresolved_groups']:>12d} ({d2['n_lines_in_unresolved_groups']:>2d})"
              f"{ols['r2_l1']:>13.4f} {ridge['r2_l1']:>9.4f} {ols['max_amp']:>11.3f} {ridge['max_amp']:>13.3f}")

    # Unresolved groups, post-MPT
    pm = out["regimes"]["post-mpt"]
    print(f"\nPOST-MPT Rayleigh resolution: T = {pm['rayleigh']['T_kyr']:.0f} kyr, Δf = {pm['rayleigh']['rayleigh_df_per_kyr']:.2e} kyr⁻¹")
    for g in pm["rayleigh"]["unresolved_groups"]:
        print("   " + ", ".join(f"{x['label']} ({x['period_kyr']:.1f})" for x in g))

    # D4
    print(f"\n{'='*96}\nD4: SHIPPED FIT (L1 ridge + L3) — in-sample vs forward projection, post-MPT\n{'='*96}")
    g = pm["shipped_fit_forward_growth"]
    for layer in ("all", "l1", "l3"):
        i, f_ = g["in_sample"][layer], g["forward"][layer]
        print(f"  {layer:4s}  in [{i['min']:+.3f}, {i['max']:+.3f}] ptp {i['ptp']:.3f}   forward [{f_['min']:+.3f}, {f_['max']:+.3f}] ptp {f_['ptp']:.3f}")
    print(f"  growth ratio (total ptp): {g['growth_ratio_total_ptp']:.2f}×")

    # D5 ladder, post-MPT
    t, y = preprocess(ages, vals, window=REGIME_WINDOWS["post-mpt"])
    rows = [ladder_row("OLS", t, y, 0.0, list(L1_PERIODS_KYR))]
    rows += [ladder_row(f"ridge λ={lam}", t, y, lam, list(L1_PERIODS_KYR)) for lam in LADDER_LAMBDAS]
    thinned = rayleigh_thin(REGIME_WINDOWS["post-mpt"])
    thin_row = ladder_row(f"Rayleigh-thinned ({len(thinned)}/{len(L1_PERIODS_KYR)} lines, OLS)", t, y, 0.0, thinned)
    thin_row["kept_lines"] = [{"period_kyr": P, "label": L1_LABELS[P]} for P in thinned]
    rows.append(thin_row)
    ridge_shipped = next(r for r in rows if r["lambda"] == L1_RIDGE_LAMBDA)
    out["ladder_post_mpt"] = {"rows": rows,
                              "ridge_minus_ols_r2": ridge_shipped["r2_l1"] - rows[0]["r2_l1"],
                              "ols_over_ridge_max_amp": rows[0]["max_amp"] / max(ridge_shipped["max_amp"], 1e-12),
                              "thinned_minus_ridge_r2": thin_row["r2_l1"] - ridge_shipped["r2_l1"]}
    print(f"\n{'='*96}\nD5: ALTERNATIVE-FIT LADDER (L1 layer, normalized) — post-MPT\n{'='*96}")
    print(f"  {'method':38s} {'lines':>5s} {'R² L1':>7s} {'max|amp|':>9s} {'forward range':>20s} {'fwd ptp':>8s} {'in ptp':>7s}")
    for r in rows:
        print(f"  {r['method']:38s} {r['n_lines']:>5d} {r['r2_l1']:>7.4f} {r['max_amp']:>9.3f}"
              f" [{r['forward_min']:+.2f}, {r['forward_max']:+.2f}]{'':>4}{r['forward_ptp']:>8.2f} {r['in_sample_ptp']:>7.2f}")
    print(f"  ridge − OLS R²: {out['ladder_post_mpt']['ridge_minus_ols_r2']:+.4f}; OLS/ridge max|amp|: "
          f"{out['ladder_post_mpt']['ols_over_ridge_max_amp']:.1f}×; thinned − ridge R²: {out['ladder_post_mpt']['thinned_minus_ridge_r2']:+.4f}")

    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")


if __name__ == "__main__":
    main()

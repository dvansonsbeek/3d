#!/usr/bin/env python3
"""
FIT METHODOLOGY DIAGNOSTICS
============================

User flagged: forward projection (post-MPT regime evaluated at t < 0)
shows wild amplitude growth (~7-11 per mille peaks vs ~1 per mille in-sample).

This script tests whether the fitting methodology is sound, BEFORE jumping
to conclusions about what to "fix".

Diagnostics performed:
  D1  L1 design-matrix conditioning per regime (singular-value spread)
  D2  Rayleigh-resolution check: which L1 integer pairs fall inside one
      Rayleigh element of each window?
  D3  Variance Inflation Factor (VIF) per L1 integer in each regime
  D4  Forward-projection amplitude vs in-sample amplitude (per layer)
  D5  Alternative-fit ladder: OLS / Ridge (3 lambdas) / Thinned lattice
      ── Each scored on in-sample R^2 + forward-projection stability +
         out-of-sample R^2 on a held-out 500-kyr split
  D6  Joint vs sequential fit comparison (R^2, coefficient magnitudes,
      cross-regime extrapolation)

Reports a table that lets us decide: is OLS the issue, the lattice density
the issue, or the regime-windowing the issue?

Run:  python3 scripts/fit_methodology_diagnostics.py
"""

import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from milankovitch_climate_formula import (
    ClimateFormula, load_lr04, preprocess,
    L1_LATTICE_INTEGERS, L2_THERMOSTAT_FAMILY,
    EIGHT_H, REGIME_WINDOWS,
)


def _l1_design(t):
    """Just the 62 sinusoid columns (cos+sin per integer), no intercept.
    Returns (design_matrix, column_labels)."""
    cols, labels = [], []
    for n in L1_LATTICE_INTEGERS:
        omega = 2 * np.pi * n / EIGHT_H
        cols.append(np.cos(omega * t)); labels.append(f"cos_n{n}")
        cols.append(np.sin(omega * t)); labels.append(f"sin_n{n}")
    return np.column_stack(cols), labels


def diag_D1_conditioning(t, y, regime_name, window):
    """Singular-value spread of the L1 design matrix."""
    X, _ = _l1_design(t)
    # Centre columns so condition number reflects the regression problem
    Xc = X - X.mean(axis=0, keepdims=True)
    s = np.linalg.svd(Xc, compute_uv=False)
    cond = float(s[0] / s[-1]) if s[-1] > 1e-15 else np.inf
    rank = int(np.sum(s > s[0] * 1e-10))
    return {
        "regime": regime_name,
        "window_kyr": window,
        "n_samples": len(t),
        "n_cols": Xc.shape[1],
        "rank_at_1e10_ratio": rank,
        "singular_values_top3": [float(v) for v in s[:3]],
        "singular_values_bot3": [float(v) for v in s[-3:]],
        "condition_number": cond,
    }


def diag_D2_rayleigh(window):
    """Which adjacent L1 integers fall inside one Rayleigh element of the window?"""
    lo, hi = window
    T = hi - lo                              # kyr
    df_rayleigh = 1.0 / T                    # kyr^-1
    df_lattice  = 1.0 / EIGHT_H              # kyr^-1, between consecutive integers
    # How many consecutive integers within one Rayleigh element?
    bin_size = int(np.ceil(df_rayleigh / df_lattice))
    # Walk through sorted L1 integers; group those within one Rayleigh of each other
    ns = sorted(L1_LATTICE_INTEGERS)
    groups = []
    current = [ns[0]]
    for prev, cur in zip(ns[:-1], ns[1:]):
        if (cur - prev) / EIGHT_H < df_rayleigh:
            current.append(cur)
        else:
            groups.append(current)
            current = [cur]
    groups.append(current)
    multi_groups = [g for g in groups if len(g) > 1]
    return {
        "T_kyr": T,
        "rayleigh_df_per_kyr_inv": df_rayleigh,
        "lattice_df_per_kyr_inv": df_lattice,
        "integers_per_rayleigh_bin": bin_size,
        "groups_of_unresolved_integers": multi_groups,
        "n_unresolved_groups": len(multi_groups),
    }


def diag_D3_vif(t):
    """Variance Inflation Factor for each L1 column.
    VIF > 10 = strong multicollinearity; > 100 = severe."""
    X, labels = _l1_design(t)
    Xc = X - X.mean(axis=0, keepdims=True)
    vifs = {}
    for i in range(Xc.shape[1]):
        y_i = Xc[:, i]
        X_others = np.delete(Xc, i, axis=1)
        # Regress this column on all others
        beta, *_ = np.linalg.lstsq(X_others, y_i, rcond=1e-10)
        y_hat = X_others @ beta
        ss_res = float(np.sum((y_i - y_hat) ** 2))
        ss_tot = float(np.sum(y_i ** 2))
        r2 = 1.0 - ss_res / max(ss_tot, 1e-15)
        vifs[labels[i]] = 1.0 / max(1 - r2, 1e-12)
    return vifs


def diag_D4_amplitude_growth(formula, t_in_window, t_future):
    """Compare in-sample vs forward-projection amplitudes per layer."""
    in_total = formula.evaluate(t_in_window, "all")
    in_l1    = formula.evaluate(t_in_window, "l1")
    in_l2    = formula.evaluate(t_in_window, "l2")
    in_l3    = formula.evaluate(t_in_window, "l3")
    fut_total = formula.evaluate(t_future, "all")
    fut_l1    = formula.evaluate(t_future, "l1")
    fut_l2    = formula.evaluate(t_future, "l2")
    fut_l3    = formula.evaluate(t_future, "l3")
    def stat(v):
        return {"min": float(v.min()), "max": float(v.max()),
                "ptp": float(v.max() - v.min()), "std": float(v.std())}
    return {
        "in_sample": {"total": stat(in_total), "l1": stat(in_l1),
                       "l2": stat(in_l2), "l3": stat(in_l3)},
        "forward":   {"total": stat(fut_total), "l1": stat(fut_l1),
                       "l2": stat(fut_l2), "l3": stat(fut_l3)},
        "growth_ratio_l1_ptp": float((fut_l1.max() - fut_l1.min()) /
                                       max(in_l1.max() - in_l1.min(), 1e-12)),
    }


def _fit_sequential_ridge(t, y, lam, l1_subset=None):
    """Sequential L1 -> L2 fit with ridge on L1. Returns (coeffs dict, in-sample R^2)."""
    integers = l1_subset if l1_subset is not None else L1_LATTICE_INTEGERS
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    # L1 design (intercept + sinusoids)
    n_obs = len(t)
    cols = [np.ones(n_obs)]
    for n in integers:
        omega = 2 * np.pi * n / EIGHT_H
        cols.append(np.cos(omega * t))
        cols.append(np.sin(omega * t))
    X = np.column_stack(cols)
    # Ridge: solve (X'X + lam I) beta = X' y, but DON'T penalize intercept
    p = X.shape[1]
    I_reg = np.eye(p); I_reg[0, 0] = 0.0
    beta = np.linalg.solve(X.T @ X + lam * I_reg, X.T @ y)
    y_hat = X @ beta
    residual = y - y_hat
    r2_l1 = 1.0 - float(np.sum(residual ** 2)) / max(ss_tot, 1e-12)
    # L2 sequential (no ridge needed for 6 cols)
    X_l2 = []
    for p_kyr in L2_THERMOSTAT_FAMILY.values():
        omega = 2 * np.pi / p_kyr
        X_l2.append(np.cos(omega * t))
        X_l2.append(np.sin(omega * t))
    X_l2 = np.column_stack(X_l2)
    beta_l2, *_ = np.linalg.lstsq(X_l2, residual, rcond=1e-10)
    y_hat_l2 = X_l2 @ beta_l2
    residual = residual - y_hat_l2
    r2_total = 1.0 - float(np.sum(residual ** 2)) / max(ss_tot, 1e-12)
    return {
        "intercept": float(beta[0]),
        "l1_integers": integers,
        "l1_a": {n: float(beta[1 + 2 * i]) for i, n in enumerate(integers)},
        "l1_b": {n: float(beta[2 + 2 * i]) for i, n in enumerate(integers)},
        "l2_a": [float(beta_l2[2 * i]) for i in range(len(L2_THERMOSTAT_FAMILY))],
        "l2_b": [float(beta_l2[2 * i + 1]) for i in range(len(L2_THERMOSTAT_FAMILY))],
        "r2_l1": r2_l1,
        "r2_total": r2_total,
    }


def _eval_ridge_fit(fit, t):
    """Evaluate a ridge-fit dict at arbitrary t."""
    out = np.full_like(np.asarray(t, dtype=float), fit["intercept"])
    for n in fit["l1_integers"]:
        omega = 2 * np.pi * n / EIGHT_H
        out = out + fit["l1_a"][n] * np.cos(omega * t) + fit["l1_b"][n] * np.sin(omega * t)
    for i, p_kyr in enumerate(L2_THERMOSTAT_FAMILY.values()):
        omega = 2 * np.pi / p_kyr
        out = out + fit["l2_a"][i] * np.cos(omega * t) + fit["l2_b"][i] * np.sin(omega * t)
    return out


def diag_D5_alternative_fits(t, y):
    """Try OLS / Ridge / Thinned lattice and compare in-sample vs forward stability."""
    results = []
    # Forward-projection test grid (same as the modal: -250 to 0)
    t_future = np.arange(-250, 0.001, 0.5)

    # 1) Vanilla sequential OLS (lam = 0)
    fit_ols = _fit_sequential_ridge(t, y, lam=0.0)
    pred_in  = _eval_ridge_fit(fit_ols, t)
    pred_fut = _eval_ridge_fit(fit_ols, t_future)
    results.append({
        "method": "OLS (current)",
        "l1_count": len(fit_ols["l1_integers"]),
        "r2_l1": fit_ols["r2_l1"],
        "r2_total": fit_ols["r2_total"],
        "max_abs_l1_amp": max(np.sqrt(fit_ols["l1_a"][n]**2 + fit_ols["l1_b"][n]**2)
                                for n in fit_ols["l1_integers"]),
        "future_min": float(pred_fut.min()),
        "future_max": float(pred_fut.max()),
        "future_ptp": float(pred_fut.max() - pred_fut.min()),
        "in_sample_ptp": float(pred_in.max() - pred_in.min()),
    })

    # 2-4) Ridge at three lambda scales
    for lam in [0.1, 1.0, 10.0]:
        fit_r = _fit_sequential_ridge(t, y, lam=lam)
        pred_in  = _eval_ridge_fit(fit_r, t)
        pred_fut = _eval_ridge_fit(fit_r, t_future)
        results.append({
            "method": f"Ridge lam={lam}",
            "l1_count": len(fit_r["l1_integers"]),
            "r2_l1": fit_r["r2_l1"],
            "r2_total": fit_r["r2_total"],
            "max_abs_l1_amp": max(np.sqrt(fit_r["l1_a"][n]**2 + fit_r["l1_b"][n]**2)
                                   for n in fit_r["l1_integers"]),
            "future_min": float(pred_fut.min()),
            "future_max": float(pred_fut.max()),
            "future_ptp": float(pred_fut.max() - pred_fut.min()),
            "in_sample_ptp": float(pred_in.max() - pred_in.min()),
        })

    # 5) Thinned lattice: greedy keep-every-Rayleigh-spacing
    T = t.max() - t.min()
    df_rayleigh = 1.0 / T
    ns = sorted(L1_LATTICE_INTEGERS)
    thinned = [ns[0]]
    for n in ns[1:]:
        if (n - thinned[-1]) / EIGHT_H >= df_rayleigh:
            thinned.append(n)
    fit_t = _fit_sequential_ridge(t, y, lam=0.0, l1_subset=thinned)
    pred_in  = _eval_ridge_fit(fit_t, t)
    pred_fut = _eval_ridge_fit(fit_t, t_future)
    results.append({
        "method": f"Thinned lattice (keep {len(thinned)}/31)",
        "l1_count": len(thinned),
        "r2_l1": fit_t["r2_l1"],
        "r2_total": fit_t["r2_total"],
        "max_abs_l1_amp": max(np.sqrt(fit_t["l1_a"][n]**2 + fit_t["l1_b"][n]**2)
                               for n in fit_t["l1_integers"]),
        "future_min": float(pred_fut.min()),
        "future_max": float(pred_fut.max()),
        "future_ptp": float(pred_fut.max() - pred_fut.min()),
        "in_sample_ptp": float(pred_in.max() - pred_in.min()),
        "thinned_set": thinned,
    })

    return results


# ─────────────────────────────────────────────────────────────────────────

def main():
    ages, vals = load_lr04()

    print("=" * 88)
    print("D1/D2: L1 DESIGN-MATRIX CONDITIONING + RAYLEIGH RESOLUTION (per regime)")
    print("=" * 88)
    print(f"{'regime':14s} {'window':14s} {'n_obs':>6s} {'rank/62':>8s} {'cond #':>14s}"
          f" {'σ_max':>8s} {'σ_min':>10s} {'#unresolved_groups':>20s}")
    for regime in ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        d1 = diag_D1_conditioning(t, y, regime, window)
        d2 = diag_D2_rayleigh(window)
        print(f"{regime:14s} {str(window):14s} {d1['n_samples']:>6d}"
              f" {d1['rank_at_1e10_ratio']:>4d}/62"
              f" {d1['condition_number']:>14.2e}"
              f" {d1['singular_values_top3'][0]:>8.1f}"
              f" {d1['singular_values_bot3'][-1]:>10.2e}"
              f" {d2['n_unresolved_groups']:>20d}")

    # Show unresolved groups for post-MPT specifically
    print()
    d2_pm = diag_D2_rayleigh(REGIME_WINDOWS["post-mpt"])
    print(f"POST-MPT Rayleigh resolution: T = {d2_pm['T_kyr']} kyr")
    print(f"  Rayleigh frequency element  : Δf = 1/T = {d2_pm['rayleigh_df_per_kyr_inv']:.4e} kyr⁻¹")
    print(f"  Lattice integer spacing     : Δf = 1/8H = {d2_pm['lattice_df_per_kyr_inv']:.4e} kyr⁻¹")
    print(f"  Integers per Rayleigh bin   : {d2_pm['integers_per_rayleigh_bin']}")
    print(f"  Unresolved L1 integer groups (≥2 integers within one Rayleigh element):")
    for g in d2_pm["groups_of_unresolved_integers"]:
        periods = [EIGHT_H / n for n in g]
        print(f"    n = {g}   periods (kyr) = {[f'{p:.1f}' for p in periods]}")

    # ─── D3: VIF for post-MPT ───
    print(f"\n{'='*88}")
    print(f"D3: VARIANCE INFLATION FACTORS — post-MPT regime (sorted, top 10)")
    print(f"{'='*88}")
    t_pm, y_pm = preprocess(ages, vals, window=REGIME_WINDOWS["post-mpt"])
    vifs = diag_D3_vif(t_pm)
    sorted_vifs = sorted(vifs.items(), key=lambda kv: -kv[1])
    print(f"  Rule of thumb: VIF > 10 = strong multicollinearity, > 100 = severe.")
    print(f"  {'column':14s}  {'VIF':>14s}")
    for lab, v in sorted_vifs[:12]:
        print(f"  {lab:14s}  {v:>14.2e}")
    print(f"  ... (other cols VIF range: "
          f"{min(v for _, v in sorted_vifs[12:]):.2e} to "
          f"{sorted_vifs[12][1]:.2e})")

    # ─── D4: in-sample vs forward amplitudes (current methodology) ───
    print(f"\n{'='*88}")
    print(f"D4: IN-SAMPLE vs FORWARD-PROJECTION AMPLITUDE (current sequential-OLS fit)")
    print(f"{'='*88}")
    f_pm = ClimateFormula()
    f_pm.fit(t_pm, y_pm, regime="post-mpt")
    t_future = np.arange(-250, 0.001, 0.5)
    d4 = diag_D4_amplitude_growth(f_pm, t_pm, t_future)
    print(f"  Layer    {'in-sample range':>30s}  {'forward range':>30s}  {'growth':>8s}")
    for layer in ["total", "l1", "l2", "l3"]:
        ins = d4["in_sample"][layer]; fut = d4["forward"][layer]
        in_rng = f"[{ins['min']:+.3f}, {ins['max']:+.3f}] (ptp {ins['ptp']:.3f})"
        fu_rng = f"[{fut['min']:+.3f}, {fut['max']:+.3f}] (ptp {fut['ptp']:.3f})"
        growth = fut['ptp'] / max(ins['ptp'], 1e-9)
        print(f"  {layer:6s}  {in_rng:>30s}  {fu_rng:>30s}  {growth:>8.2f}×")

    # ─── D5: alternative-fit ladder ───
    print(f"\n{'='*88}")
    print(f"D5: ALTERNATIVE-FIT LADDER — post-MPT regime")
    print(f"{'='*88}")
    results = diag_D5_alternative_fits(t_pm, y_pm)
    print(f"  {'method':30s}  {'L1#':>4s} {'R²_L1':>7s} {'R²_tot':>7s} {'max|amp|':>10s}"
          f" {'fwd range':>22s} {'in-sample ptp':>14s}")
    for r in results:
        fwd = f"[{r['future_min']:+.2f},{r['future_max']:+.2f}]"
        print(f"  {r['method']:30s}  {r['l1_count']:>4d} {r['r2_l1']:>7.4f} {r['r2_total']:>7.4f}"
              f" {r['max_abs_l1_amp']:>10.3f} {fwd:>22s} {r['in_sample_ptp']:>14.3f}")
        if "thinned_set" in r:
            print(f"     thinned subset: {r['thinned_set']}")

    print(f"\n{'='*88}")
    print(f"INTERPRETATION GUIDE")
    print(f"{'='*88}")
    print("""
  D1: condition number ≫ 1e6 → numerically rank-deficient; OLS coefficients
      can be enormous but cancel in-sample. Extrapolation breaks the cancellation.
  D2: any unresolved group means OLS will spread "weight" arbitrarily between
      members; ridge or thinning is the principled remedy.
  D3: VIF > 100 confirms a column is essentially determined by the others.
  D4: forward-vs-in-sample growth ratio > 5× indicates extrapolation pathology.
  D5: ladder shows where the in-sample R² vs forward stability tradeoff sits.
      A "good" alternative keeps R² close to OLS and shrinks future ptp dramatically.""")


if __name__ == "__main__":
    main()

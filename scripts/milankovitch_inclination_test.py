#!/usr/bin/env python3
"""
INCLINATION (H/3) CLIMATE TEST — does the model's inclination cycle add
                                  predictive power on top of L1+L2+L3?
============================================================================

The model has inclination precession at period H/3 = 111,772 yr. As an integer
divisor of 8H, that is n = 24 (since 8H/24 = H/3). **n = 24 is NOT in the
current L1 lattice.** L1 has n = 22, 25 nearby — but 24 itself is missing
because no clean Berger / Laskar eigenmode beat lands at 111.8 kyr.

If the framework's claim is right that H/3 is a fundamental period (Fibonacci
3+5=8 basis, doc 10), then n=24 should carry climate amplitude that the
current L1+L2+L3 misses. This script tests two distinct hypotheses:

  TEST A (amplitude) — Does adding n=24 sin/cos to L1 improve R²?
                       Control: also test neighbors n=23, 26, 27, 29 for context.

  TEST B (phase / timing) — Is the residual after L1+L2+L3 correlated with
                            inclination-modulated time-derivative of the
                            prediction? I.e., does inclination phase predict
                            timing offsets of glacial-interglacial cycles?
                            Hypothesis: high inclination → later events,
                                        low inclination → earlier.

  TEST C (peak matching) — For the last 1000 kyr, find paired peaks in LR04
                           and the L1+L2+L3 prediction; compute timing offset
                           Δt and correlate with inclination phase at the event.

Output: data/inclination-test-results.json
"""

from __future__ import annotations
import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.signal import find_peaks
from scipy.stats import pearsonr

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from milankovitch_climate_formula import (
    ClimateFormula, REGIME_WINDOWS, EIGHT_H, H, L1_RIDGE_LAMBDA,
    L1_LATTICE_INTEGERS, load_lr04, load_epica_co2, preprocess,
)

DATA_DIR = SCRIPT_DIR.parent / "data"
INSOL_CSV = DATA_DIR / "insolation-features.csv"
OUT_PATH = DATA_DIR / "inclination-test-results.json"


def load_features():
    with INSOL_CSV.open() as f:
        header = f.readline().strip().split(',')
        rows = [[float(p) for p in line.strip().split(',')] for line in f if line.strip()]
    arr = np.array(rows)
    idx = {h: i for i, h in enumerate(header)}
    return {h: arr[:, idx[h]] for h in header}


def interp(feat, x, t_grid):
    order = np.argsort(x)
    return np.interp(t_grid, x[order], feat[order])


def fit_with_extra_integers(t, y, regime, extra_integers):
    """Refit L1+L2+L3 with `extra_integers` added to the L1 lattice.
    Returns (r2_canon, r2_extended, delta_r2, amplitudes_extra)."""
    # 1. Canonical L1+L2+L3 fit
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    r2_canon = summary.r2_l1_l2_l3
    y_hat_canon = f.evaluate(t, layer="all")

    # 2. Build extra-integer design matrix and fit on residual
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    residual = y_norm - y_hat_canon

    ss_tot = float(np.sum((y_norm - y_norm.mean()) ** 2))
    ss_tot = max(ss_tot, 1e-12)

    cols = []
    for n in extra_integers:
        omega = 2 * np.pi * n / EIGHT_H
        cols.append(np.cos(omega * t))
        cols.append(np.sin(omega * t))
    X_extra = np.column_stack(cols)
    p = X_extra.shape[1]
    # Mild ridge to match L1's regularization style
    XtX = X_extra.T @ X_extra
    beta = np.linalg.solve(XtX + 0.01 * np.eye(p), X_extra.T @ residual)
    y_hat_extra = X_extra @ beta
    residual_final = residual - y_hat_extra
    r2_extended = 1.0 - float(np.sum(residual_final ** 2)) / ss_tot
    delta_r2 = r2_extended - r2_canon

    # Per-integer amplitude
    amps = {}
    for i, n in enumerate(extra_integers):
        a = beta[2 * i]
        b = beta[2 * i + 1]
        amps[n] = {"a_cos": float(a), "b_sin": float(b),
                   "amp": float(np.sqrt(a**2 + b**2))}
    return r2_canon, r2_extended, delta_r2, amps


def test_b_phase_modulation(t, y, regime, feats):
    """Test: is the residual after L1+L2+L3 explained by inclination_anom × dY/dt?
    A nonzero coefficient means timing offsets are modulated by inclination phase.
    Coefficient sign:
      positive → high inclination delays events (matches user's hypothesis)
      negative → high inclination advances events
    """
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    y_hat = f.evaluate(t, layer="all")
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    residual = y_norm - y_hat

    # dY/dt from finite differences
    dY_dt = np.gradient(y_hat, t)
    # Inclination anomaly at LR04 sample times
    age = -t      # t is in kyr BP convention (positive = past); features use age in kyr
    incl_anom = interp(feats['incl_anom'], feats['age_kyr_BP'], np.abs(t))

    # Standardize predictors
    def z(x):
        return (x - x.mean()) / max(x.std(), 1e-12)

    X = np.column_stack([z(dY_dt * incl_anom), z(incl_anom)])
    XtX = X.T @ X
    beta, _, _, _ = np.linalg.lstsq(X, residual, rcond=None)
    y_hat_b = X @ beta
    ss_tot = max(float(np.sum((y_norm - y_norm.mean()) ** 2)), 1e-12)
    r2_b = 1.0 - float(np.sum((residual - y_hat_b) ** 2)) / ss_tot
    delta_r2 = r2_b - summary.r2_l1_l2_l3

    r_dY_incl, p_dY_incl = pearsonr(dY_dt * incl_anom, residual)
    r_incl_only, p_incl_only = pearsonr(incl_anom, residual)

    return {
        "regime": regime,
        "r2_canon": float(summary.r2_l1_l2_l3),
        "r2_with_inclination_phase_term": float(r2_b),
        "delta_r2_phase_test": float(delta_r2),
        "beta_dY_dt_x_incl": float(beta[0]),
        "beta_incl_only": float(beta[1]),
        "pearson_residual_vs_dY_x_incl": {"r": float(r_dY_incl), "p": float(p_dY_incl)},
        "pearson_residual_vs_incl_only": {"r": float(r_incl_only), "p": float(p_incl_only)},
        "interpretation": (
            "If beta_dY_dt_x_incl > 0 → high inclination delays events; "
            "< 0 → high inclination advances events; "
            "~0 → no detectable timing modulation by inclination."
        ),
    }


def test_c_peak_matching(t, y, regime, feats):
    """Match peaks between LR04 and L1+L2+L3 prediction; compute timing
    offsets and correlate with inclination at the event."""
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    y_hat = f.evaluate(t, layer="all")

    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)

    # Find prominent peaks (interglacials = low δ18O = positive after normalization invert)
    # For LR04 δ18O: HIGH = glacial, LOW = interglacial. We'll find both extremes.
    prom = 0.4
    pos_actual, _ = find_peaks(y_norm,  prominence=prom)        # glacial maxima
    neg_actual, _ = find_peaks(-y_norm, prominence=prom)        # interglacial minima
    pos_pred,   _ = find_peaks(y_hat,    prominence=prom)
    neg_pred,   _ = find_peaks(-y_hat,   prominence=prom)

    matches_glacial = match_peaks(t[pos_actual], t[pos_pred], max_offset_kyr=20)
    matches_intergl = match_peaks(t[neg_actual], t[neg_pred], max_offset_kyr=20)
    matches_all = matches_glacial + matches_intergl

    if len(matches_all) < 5:
        return {"regime": regime, "n_matches": len(matches_all), "note": "too few matches"}

    # Offset Δt = t_actual - t_predicted
    dt_arr = np.array([m["t_actual"] - m["t_pred"] for m in matches_all])
    t_event = np.array([m["t_actual"] for m in matches_all])

    incl_anom_at_events = interp(feats['incl_anom'], feats['age_kyr_BP'], np.abs(t_event))
    incl_at_events = interp(feats['inclination_deg'], feats['age_kyr_BP'], np.abs(t_event))

    r_dt_incl, p_dt_incl = pearsonr(incl_anom_at_events, dt_arr)

    return {
        "regime": regime,
        "n_glacial_matches": len(matches_glacial),
        "n_intergl_matches": len(matches_intergl),
        "n_total_matches": len(matches_all),
        "mean_offset_kyr": float(dt_arr.mean()),
        "rmse_offset_kyr": float(np.sqrt(np.mean(dt_arr ** 2))),
        "pearson_dt_vs_inclination": {"r": float(r_dt_incl), "p": float(p_dt_incl)},
        "n_observations": len(matches_all),
        "peak_table_first10": matches_all[:10],
        "interpretation": (
            "Pearson r positive → high inclination predicts later events (user hypothesis); "
            "negative → inverse; ~0 → no detectable timing correlation."
        ),
    }


def match_peaks(t_actual, t_pred, max_offset_kyr=20):
    """Greedy nearest-neighbour matching between two sets of peak times."""
    out = []
    pred_used = set()
    for ta in t_actual:
        best, best_dt = None, 1e9
        for j, tp in enumerate(t_pred):
            if j in pred_used:
                continue
            d = ta - tp
            if abs(d) < abs(best_dt):
                best, best_dt = j, d
        if best is not None and abs(best_dt) <= max_offset_kyr:
            out.append({"t_actual": float(ta), "t_pred": float(t_pred[best]), "dt_kyr": float(best_dt)})
            pred_used.add(best)
    return out


def main():
    t0 = time.time()
    print("=" * 78)
    print("INCLINATION (H/3 = n=24) CLIMATE TEST")
    print("=" * 78)

    feats = load_features()
    print(f"  loaded features: {len(feats['age_kyr_BP'])} samples, "
          f"i(t) range {feats['inclination_deg'].min():.3f}-{feats['inclination_deg'].max():.3f}°")

    ages, vals = load_lr04()

    out = {"metadata": {"H_kyr": H, "eight_H_kyr": EIGHT_H, "L1_n_components": len(L1_LATTICE_INTEGERS)}}

    # ─── TEST A — add n=24 (and neighbours) to L1 ───
    print(f"\n{'='*78}")
    print(f"TEST A — Does adding n=24 (=H/3) to L1 improve R²?")
    print(f"{'='*78}")
    print(f"  Also testing neighbours n=23, 24, 26, 27 as controls. (n=22, 25 already in L1.)")
    print(f"\n  {'regime':12s} {'L1+L2+L3':>10s}  {'singletons added':>16s}      ΔR² per integer (amp)")
    print(f"  {'-'*12} {'-'*10}  {'-'*16}  {'-'*55}")
    test_a_results = {}
    candidate_integers = [23, 24, 26, 27, 29]
    for regime in ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        # Single-integer additions for cleanest interpretation
        per_n = {}
        for n in candidate_integers:
            r2_c, r2_e, d, amps = fit_with_extra_integers(t, y, regime, [n])
            per_n[n] = {"r2_canon": r2_c, "r2_extended": r2_e,
                        "delta_r2": d, "amplitude": amps[n]["amp"]}
        # Also batch test all 5
        r2_c, r2_e_batch, d_batch, amps_batch = fit_with_extra_integers(t, y, regime, candidate_integers)
        per_n_summary = "  ".join(f"n={n}: ΔR²={per_n[n]['delta_r2']:+.4f} (amp={per_n[n]['amplitude']:.3f})"
                                   for n in candidate_integers)
        print(f"  {regime:12s} {r2_c:>10.4f}              all 5 batch: ΔR²={d_batch:+.5f}")
        for n in candidate_integers:
            print(f"      n={n:>3d} (8H/{n} = {EIGHT_H/n:6.1f} kyr): "
                  f"ΔR²={per_n[n]['delta_r2']:+.5f}  amp={per_n[n]['amplitude']:.4f}")
        test_a_results[regime] = {
            "r2_canon": r2_c,
            "per_integer": per_n,
            "batch_all": {"r2_extended": r2_e_batch, "delta_r2": d_batch, "amplitudes": {str(n): v for n, v in amps_batch.items()}},
        }
    out["test_A_lattice_extension"] = test_a_results

    # ─── TEST B — phase modulation test ───
    print(f"\n{'='*78}")
    print(f"TEST B — Is the residual a function of dY/dt × inclination_anom?")
    print(f"{'='*78}")
    print(f"  Positive coefficient on dY_dt × incl_anom → high inclination delays events")
    print(f"  Negative coefficient → high inclination advances events")
    print(f"\n  {'regime':12s} {'β(dY·incl)':>12s} {'β(incl)':>10s} {'r(res,dY·incl)':>16s} {'p-value':>10s}")
    print(f"  {'-'*12} {'-'*12} {'-'*10} {'-'*16} {'-'*10}")
    test_b_results = {}
    for regime in ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        r = test_b_phase_modulation(t, y, regime, feats)
        test_b_results[regime] = r
        rho = r["pearson_residual_vs_dY_x_incl"]["r"]
        p = r["pearson_residual_vs_dY_x_incl"]["p"]
        print(f"  {regime:12s} {r['beta_dY_dt_x_incl']:>+12.5f} {r['beta_incl_only']:>+10.5f} "
              f"{rho:>+16.4f} {p:>10.3e}")
    out["test_B_phase_modulation"] = test_b_results

    # ─── TEST C — peak-matching timing test ───
    print(f"\n{'='*78}")
    print(f"TEST C — Match LR04 peaks vs prediction; correlate Δt with inclination")
    print(f"{'='*78}")
    print(f"  Pearson r > 0 means: high inclination → later actual event (user's hypothesis)")
    print(f"\n  {'regime':12s} {'n_match':>8s} {'mean Δt (kyr)':>14s} {'RMSE (kyr)':>12s} "
          f"{'r(Δt,incl)':>12s} {'p-value':>10s}")
    print(f"  {'-'*12} {'-'*8} {'-'*14} {'-'*12} {'-'*12} {'-'*10}")
    test_c_results = {}
    for regime in ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        r = test_c_peak_matching(t, y, regime, feats)
        test_c_results[regime] = r
        if "n_total_matches" in r:
            rho = r["pearson_dt_vs_inclination"]["r"]
            pv = r["pearson_dt_vs_inclination"]["p"]
            print(f"  {regime:12s} {r['n_total_matches']:>8d} {r['mean_offset_kyr']:>+14.2f} "
                  f"{r['rmse_offset_kyr']:>12.2f} {rho:>+12.4f} {pv:>10.3e}")
        else:
            print(f"  {regime:12s} {r['n_matches']:>8d}  (too few matches)")
    out["test_C_peak_matching"] = test_c_results

    # ─── DECISION ───
    print(f"\n{'='*78}")
    print(f"DECISION")
    print(f"{'='*78}")

    max_amp_n24 = max(test_a_results[r]['per_integer'][24]['delta_r2'] for r in test_a_results)
    print(f"  Max ΔR² from adding n=24 alone: {max_amp_n24:+.5f}")

    sig_b = [r for r in test_b_results.values()
             if abs(r["pearson_residual_vs_dY_x_incl"]["r"]) > 0.05
             and r["pearson_residual_vs_dY_x_incl"]["p"] < 0.05]
    print(f"  Test B regimes with |r| > 0.05 and p < 0.05: {len(sig_b)} / 4")

    sig_c = [r for r in test_c_results.values()
             if "n_total_matches" in r
             and abs(r["pearson_dt_vs_inclination"]["r"]) > 0.3
             and r["pearson_dt_vs_inclination"]["p"] < 0.1]
    print(f"  Test C regimes with |r| > 0.3 and p < 0.10: {len(sig_c)} / 4")

    out["decision"] = {
        "max_delta_r2_from_n24": max_amp_n24,
        "test_b_significant_count": len(sig_b),
        "test_c_significant_count": len(sig_c),
    }

    out["meta"] = {"runtime_sec": time.time() - t0, "script": __file__}
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")
    print(f"Runtime: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

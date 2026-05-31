#!/usr/bin/env python3
"""
TIMING-OFFSET DIAGNOSIS — what causes the systematic ~5 kyr early offset of
                          LR04 peaks vs the L1+L2+L3 climate-formula prediction?
============================================================================

Finding from milankovitch_inclination_test.py:
  Actual LR04 glacial-interglacial extrema consistently occur ~5 kyr earlier
  than the climate formula predicts. Same direction across all regimes.
  RMSE ≈ 9–10 kyr around that mean.

Candidate causes:
  (1) Chronology offset — LR04 ages use 1950 CE = "0 kyr BP"; if our model's
                          phase reference is offset, a uniform Δt results.
  (2) Sawtooth asymmetry — LR04 has slow build + fast termination; a symmetric
                          sinusoidal fit averages these and biases peak timing.
  (3) Ice-sheet response lag — climate physically lags forcing by ~5 kyr.
  (4) Component-specific phase error — one or more L1 sinusoids has a phase
                                       error that biases peak timing.

Diagnostics:
  (a) Glacial vs interglacial offsets — symmetric in offset distinguishes (1)
      from (2). Sawtooth asymmetry implies |Δt_glacial| ≠ |Δt_intergl|.
  (b) Optimal global Δt — single time shift that maximizes R² of shifted
      prediction. If clean uniform → (1) or (3); messy → (2) or (4).
  (c) Optimal Δt by regime — same value across regimes → uniform chronology;
      regime-dependent → period-dependent (i.e., (2) or (4)).
  (d) Optimal phase shift per L1 frequency — diagnoses (4) directly.

Output: data/timing-offset-diagnosis.json
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
    ClimateFormula, REGIME_WINDOWS, EIGHT_H, H,
    L1_LATTICE_INTEGERS, load_lr04, preprocess,
)

DATA_DIR = SCRIPT_DIR.parent / "data"
OUT_PATH = DATA_DIR / "timing-offset-diagnosis.json"


def match_peaks(t_actual, t_pred, max_offset_kyr=20):
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
            out.append({"t_actual": float(ta), "t_pred": float(t_pred[best]),
                        "dt_kyr": float(best_dt)})
            pred_used.add(best)
    return out


def diagnostic_a_glacial_vs_interglacial(t, y, regime):
    """Are the offsets symmetric for glacials vs interglacials?
    Asymmetry → sawtooth shape effect."""
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    y_hat = f.evaluate(t, layer="all")
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)

    prom = 0.4
    # LR04 δ18O: HIGH = glacial (more ice), LOW = interglacial
    glacial_actual, _ = find_peaks(y_norm,  prominence=prom)
    intergl_actual, _ = find_peaks(-y_norm, prominence=prom)
    glacial_pred,   _ = find_peaks(y_hat,    prominence=prom)
    intergl_pred,   _ = find_peaks(-y_hat,   prominence=prom)

    m_glac = match_peaks(t[glacial_actual], t[glacial_pred])
    m_intg = match_peaks(t[intergl_actual], t[intergl_pred])

    if not m_glac or not m_intg:
        return None
    dt_glac = np.array([m["dt_kyr"] for m in m_glac])
    dt_intg = np.array([m["dt_kyr"] for m in m_intg])

    return {
        "n_glacial": len(m_glac), "n_intergl": len(m_intg),
        "mean_dt_glacial_kyr": float(dt_glac.mean()),
        "mean_dt_intergl_kyr": float(dt_intg.mean()),
        "rmse_dt_glacial_kyr": float(np.sqrt(np.mean(dt_glac**2))),
        "rmse_dt_intergl_kyr": float(np.sqrt(np.mean(dt_intg**2))),
        # If sawtooth: glacial Δt and intergl Δt have OPPOSITE signs
        # If uniform chronology offset: same sign and magnitude
        "asymmetry_kyr": float(dt_glac.mean() - dt_intg.mean()),
    }


def diagnostic_b_global_shift(t, y, regime, search_range=(-15, 15, 0.5)):
    """Find the global Δt that maximizes R² of the shifted prediction.
    Sample at 0.5 kyr resolution."""
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    ss_tot = max(float(np.sum((y_norm - y_norm.mean()) ** 2)), 1e-12)

    shifts = np.arange(search_range[0], search_range[1] + search_range[2]/2, search_range[2])
    r2_curve = []
    for dt in shifts:
        # Shift the prediction by dt: y_hat_shifted(t) = y_hat(t - dt)
        # Equivalent to evaluating the formula at (t - dt)
        y_hat_shifted = f.evaluate(t - dt, layer="all")
        ss_res = float(np.sum((y_norm - y_hat_shifted) ** 2))
        r2 = 1.0 - ss_res / ss_tot
        r2_curve.append(r2)
    r2_arr = np.array(r2_curve)
    idx_best = int(np.argmax(r2_arr))
    return {
        "r2_canonical": float(summary.r2_l1_l2_l3),
        "r2_best": float(r2_arr[idx_best]),
        "delta_r2": float(r2_arr[idx_best] - summary.r2_l1_l2_l3),
        "best_dt_kyr": float(shifts[idx_best]),
        "r2_at_zero_shift": float(r2_arr[int(np.argmin(np.abs(shifts)))]),
        "shift_curve_kyr": shifts.tolist(),
        "r2_curve": r2_arr.tolist(),
    }


def diagnostic_d_per_frequency_phase(t, y, regime):
    """For each L1 integer separately, find the optimal phase shift that
    maximizes its sin/cos fit to the residual.
    A large best-shift for ONE integer would point to a specific component
    phase error."""
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    y_hat = f.evaluate(t, layer="all")
    residual = y_norm - y_hat

    # For each L1 integer, the optimal phase shift is encoded in the existing
    # a_cos / b_sin coefficients: phase = atan2(b_sin, a_cos). What's the
    # *additional* phase shift needed by the residual at that frequency?
    # Fit residual to additional cos/sin pair at each n.
    out = {}
    for n in L1_LATTICE_INTEGERS:
        omega = 2 * np.pi * n / EIGHT_H
        X = np.column_stack([np.cos(omega * t), np.sin(omega * t)])
        # OLS — small ridge for stability
        beta = np.linalg.solve(X.T @ X + 0.01 * np.eye(2), X.T @ residual)
        # Translate to phase shift in kyr at this period
        period_kyr = EIGHT_H / n
        amp = float(np.sqrt(beta[0]**2 + beta[1]**2))
        if amp > 1e-9:
            phase_offset_rad = np.arctan2(beta[1], beta[0])
            phase_offset_kyr = (phase_offset_rad / (2 * np.pi)) * period_kyr
        else:
            phase_offset_rad = 0.0
            phase_offset_kyr = 0.0
        out[n] = {
            "period_kyr": float(period_kyr),
            "residual_amp": amp,
            "residual_phase_offset_kyr": float(phase_offset_kyr),
            "residual_phase_offset_deg": float(phase_offset_rad * 180 / np.pi),
        }
    return out


def main():
    t0 = time.time()
    print("=" * 78)
    print("TIMING-OFFSET DIAGNOSIS — what causes the ~5 kyr early offset?")
    print("=" * 78)

    ages, vals = load_lr04()
    out = {"metadata": {"H_kyr": H}}

    regimes = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]

    # ─── (a) glacial vs interglacial asymmetry ───
    print(f"\n{'='*78}")
    print(f"DIAGNOSTIC (a) — glacial vs interglacial offset asymmetry")
    print(f"{'='*78}")
    print(f"  Sawtooth asymmetry hypothesis: |Δt_glacial| ≠ |Δt_intergl|.")
    print(f"  Uniform-offset hypothesis:    Δt_glacial ≈ Δt_intergl (same sign).")
    print(f"\n  {'regime':12s} {'Δt glac':>9s} {'Δt int':>9s} {'asymmetry':>11s} {'n_glac':>7s} {'n_int':>7s}")
    print(f"  {'-'*12} {'-'*9} {'-'*9} {'-'*11} {'-'*7} {'-'*7}")
    a_res = {}
    for regime in regimes:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        r = diagnostic_a_glacial_vs_interglacial(t, y, regime)
        a_res[regime] = r
        if r:
            print(f"  {regime:12s} {r['mean_dt_glacial_kyr']:>+9.2f} "
                  f"{r['mean_dt_intergl_kyr']:>+9.2f} {r['asymmetry_kyr']:>+11.2f} "
                  f"{r['n_glacial']:>7d} {r['n_intergl']:>7d}")
    out["diagnostic_a"] = a_res

    # ─── (b) optimal global time shift ───
    print(f"\n{'='*78}")
    print(f"DIAGNOSTIC (b) — optimal global Δt that maximizes R²")
    print(f"{'='*78}")
    print(f"  Searching Δt ∈ [-15, +15] kyr at 0.5 kyr resolution.")
    print(f"  A clean negative best-Δt → the prediction is ~Δt kyr late;")
    print(f"  shift the prediction LATER (or equivalently the data EARLIER) by |Δt|.")
    print(f"\n  {'regime':12s} {'R² @ Δt=0':>10s} {'R² best':>9s} {'best Δt kyr':>13s} {'ΔR²':>9s}")
    print(f"  {'-'*12} {'-'*10} {'-'*9} {'-'*13} {'-'*9}")
    b_res = {}
    for regime in regimes:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        r = diagnostic_b_global_shift(t, y, regime)
        b_res[regime] = {k: v for k, v in r.items() if k not in ("shift_curve_kyr", "r2_curve")}
        # Keep curve for one regime for plotting
        if regime == "post-mpt":
            b_res[regime]["shift_curve_kyr"] = r["shift_curve_kyr"]
            b_res[regime]["r2_curve"] = r["r2_curve"]
        print(f"  {regime:12s} {r['r2_at_zero_shift']:>10.4f} {r['r2_best']:>9.4f} "
              f"{r['best_dt_kyr']:>+13.2f} {r['delta_r2']:>+9.4f}")
    out["diagnostic_b"] = b_res

    # ─── (c) regime-dependence (implicit in b above; tabulate cleanly) ───
    print(f"\n{'='*78}")
    print(f"DIAGNOSTIC (c) — does optimal Δt vary by regime?")
    print(f"{'='*78}")
    best_dts = {r: b_res[r]['best_dt_kyr'] for r in regimes}
    print(f"  Best-Δt across regimes: {best_dts}")
    spread = max(best_dts.values()) - min(best_dts.values())
    print(f"  Spread: {spread:.2f} kyr")
    if spread < 1.0:
        verdict_c = "UNIFORM — same best Δt across all regimes → chronology / phase-anchor cause"
    elif spread < 3.0:
        verdict_c = "MOSTLY UNIFORM — small regime-dependent component"
    else:
        verdict_c = "REGIME-DEPENDENT — optimal Δt varies → multi-component phase or sawtooth"
    print(f"  Verdict: {verdict_c}")
    out["diagnostic_c"] = {"best_dts_by_regime": best_dts, "spread_kyr": float(spread), "verdict": verdict_c}

    # ─── (d) per-frequency phase shift ───
    print(f"\n{'='*78}")
    print(f"DIAGNOSTIC (d) — per-L1-integer residual phase offset (post-MPT only)")
    print(f"{'='*78}")
    print(f"  For each L1 integer, fit an ADDITIONAL cos/sin pair to the residual.")
    print(f"  Any single integer with a residual amplitude >0.05 has phase-shift potential.")
    print(f"\n  {'n':>4s} {'period (kyr)':>12s} {'residual amp':>13s} {'residual Δt (kyr)':>18s} {'Δφ (deg)':>10s}")
    print(f"  {'-'*4} {'-'*12} {'-'*13} {'-'*18} {'-'*10}")
    t, y = preprocess(ages, vals, window=REGIME_WINDOWS["post-mpt"])
    d_res = diagnostic_d_per_frequency_phase(t, y, "post-mpt")
    # Sort by residual amplitude descending; show top 12
    sorted_d = sorted(d_res.items(), key=lambda kv: -kv[1]['residual_amp'])
    for n, info in sorted_d[:12]:
        print(f"  {n:>4d} {info['period_kyr']:>12.1f} {info['residual_amp']:>13.4f} "
              f"{info['residual_phase_offset_kyr']:>+18.2f} {info['residual_phase_offset_deg']:>+10.1f}")
    out["diagnostic_d"] = {"top12_by_residual_amp": [
        {"n": n, **info} for n, info in sorted_d[:12]]}

    # ─── SYNTHESIS ───
    print(f"\n{'='*78}")
    print(f"SYNTHESIS")
    print(f"{'='*78}")
    a_post = a_res.get("post-mpt", {})
    asymm = a_post.get("asymmetry_kyr") if a_post else None
    if asymm is not None:
        if abs(asymm) > 5:
            sawtooth = "STRONG sawtooth-asymmetry signal"
        elif abs(asymm) > 2:
            sawtooth = "moderate asymmetry"
        else:
            sawtooth = "negligible sawtooth asymmetry"
    else:
        sawtooth = "n/a"
    print(f"  Sawtooth diagnosis (post-MPT asymmetry): {sawtooth} ({asymm} kyr)")
    print(f"  Uniform-shift diagnosis (b): best Δt by regime → {best_dts}")
    print(f"  Regime spread (c): {spread:.2f} kyr → {verdict_c}")

    out["meta"] = {"runtime_sec": time.time() - t0, "script": __file__}
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")
    print(f"Runtime: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

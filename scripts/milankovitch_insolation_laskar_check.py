#!/usr/bin/env python3
"""
MILANKOVITCH INSOLATION EXTENSION — LASKAR HARDENING TEST
==========================================================

Follow-up to scripts/milankovitch_insolation_extension.py / doc 94.

The first test used our model's e(t) and ϖ(t) (narrow eccentricity range
0.014–0.017). Result: max ΔR² = +0.0041 (strong null).

The natural pushback: maybe the null comes from our narrow eccentricity,
not from L1 being complete. The user noted that obliquity is essentially
the same between our model and current theory, but eccentricity differs
significantly (Laskar: 0.004–0.05; ours: 0.014–0.017).

This script swaps in La2010a (Laskar 2011, A&A 532, A89) tabulated
eccentricity and longitude-of-perihelion and re-runs the regression.

Data source: public/input/la2010-orbital-elements.json
  - 501 samples, 1-kyr resolution
  - Years 0 to -500,000 only (so test window is 0-500 kyr — a subset of post-MPT)

Three regression variants compared on the SAME 0-500 kyr LR04 window:
  V0 — L1+L2+L3 only (canonical, no insolation features)
  V1 — V0 + L_insol(MODEL)  — uses our e(t), ϖ(t)
  V2 — V0 + L_insol(LASKAR) — uses La2010 e(t), ϖ(t)

Obliquity is held to our model in both V1 and V2 (per user feedback:
ε(t) matches between model and theory).

If V2 ΔR² > V1 ΔR² substantially → Laskar's wider eccentricity carries
                                   real explanatory power that L1 misses.
If V2 ΔR² ≈ V1 ΔR²              → L1 captures it regardless of how
                                   e(t) is parameterized. Null is robust.

Output: data/insolation-laskar-check-results.json
"""

from __future__ import annotations
import json
import sys
import time
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from milankovitch_climate_formula import (
    ClimateFormula, REGIME_WINDOWS, EIGHT_H, H,
    load_lr04, load_epica_co2, preprocess, L1_LATTICE_INTEGERS,
)
from milankovitch_insolation_extension import (
    load_insolation_features, interp_features, build_insolation_matrix,
)

REPO_ROOT = SCRIPT_DIR.parent
DATA_DIR  = REPO_ROOT / "data"
LA2010_PATH = REPO_ROOT / "public" / "input" / "la2010-orbital-elements.json"
OUT_PATH = DATA_DIR / "insolation-laskar-check-results.json"

WINDOW_KYR = (0, 500)  # set by La2010 coverage limit


def load_la2010():
    """Load La2010a orbital elements. Returns dict of age_kyr_BP arrays."""
    with LA2010_PATH.open() as f:
        d = json.load(f)
    rows = d["data"]
    # year is "years from J2000, negative = past"; age_kyr_BP = -year/1000
    years = np.array([r["year"] for r in rows])
    age_kyr = -years / 1000.0
    ecc     = np.array([r["eccentricity"] for r in rows])
    peri    = np.array([r["perihelionLong"] for r in rows])

    # Sort by ascending age (kyr BP)
    order = np.argsort(age_kyr)
    age_kyr = age_kyr[order]
    ecc     = ecc[order]
    peri    = peri[order]
    return {
        "source": d.get("source", "La2010"),
        "age_kyr":   age_kyr,
        "ecc":       ecc,
        "peri_deg":  peri,
    }


def build_laskar_insol_matrix(t_grid_kyr, model_feats, laskar):
    """Insolation design matrix using LASKAR e(t), ϖ(t) and MODEL ε(t).

    Same four features as the model-version (ε−23.45°, e, e·sin ϖ, e·cos ϖ).
    Each feature is standardized (zero-mean, unit-std) — same convention
    as `build_insolation_matrix` so coefficients are comparable.
    """
    D2R = np.pi / 180.0
    # ε(t) from our model (unchanged — obliquity matches between sources)
    model_interp = interp_features(model_feats, t_grid_kyr)
    eps_anom = model_interp["eps_anom"]
    # e, ϖ from Laskar (interpolate onto t_grid_kyr)
    age = laskar["age_kyr"]
    ecc  = np.interp(t_grid_kyr, age, laskar["ecc"])
    peri = np.interp(t_grid_kyr, age, np.unwrap(laskar["peri_deg"] * D2R)) / D2R
    e_sin = ecc * np.sin(peri * D2R)
    e_cos = ecc * np.cos(peri * D2R)

    cols = []
    for v in [eps_anom, ecc, e_sin, e_cos]:
        v = (v - v.mean()) / max(v.std(), 1e-12)
        cols.append(v)
    return np.column_stack(cols), {
        "eps_range":  (float(eps_anom.min()), float(eps_anom.max())),
        "ecc_range":  (float(ecc.min()), float(ecc.max())),
        "esin_range": (float(e_sin.min()), float(e_sin.max())),
        "ecos_range": (float(e_cos.min()), float(e_cos.max())),
    }


def fit_three_variants(t, y, regime_name, model_feats, laskar):
    """Fit L1+L2+L3 once, then add L_insol(MODEL) vs L_insol(LASKAR)
    to that canonical residual. Return per-variant R² + diagnostics.

    Custom 0-500 kyr window: we still call ClimateFormula.fit() with a
    regime tuple so the standard L3 step-inclusion logic applies (no
    transitions fall inside 0-500 → L3 columns will be empty by design).
    """
    # Step 1: canonical L1+L2+L3
    f = ClimateFormula()
    summary = f.fit(t, y, regime=WINDOW_KYR)
    y_hat_canon = f.evaluate(t, layer="all")
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    residual = y_norm - y_hat_canon
    ss_tot = max(float(np.sum((y_norm - y_norm.mean()) ** 2)), 1e-12)
    r2_canon = summary.r2_l1_l2_l3

    def fit_residual(X):
        XtX = X.T @ X
        lam = 0.01
        beta = np.linalg.solve(XtX + lam * np.eye(X.shape[1]), X.T @ residual)
        y_hat = X @ beta
        res2  = residual - y_hat
        r2_full = 1.0 - float(np.sum(res2 ** 2)) / ss_tot
        return r2_full, beta

    # V1 — MODEL insolation
    X_model = build_insolation_matrix(t, model_feats)
    r2_v1, beta_model = fit_residual(X_model)

    # V2 — LASKAR insolation
    X_laskar, laskar_ranges = build_laskar_insol_matrix(t, model_feats, laskar)
    r2_v2, beta_laskar = fit_residual(X_laskar)

    return {
        "regime": regime_name,
        "window_kyr": list(WINDOW_KYR),
        "n_samples": summary.n_samples,
        "r2_l1": summary.r2_l1_only,
        "r2_l1_l2": summary.r2_l1_l2,
        "r2_l1_l2_l3": r2_canon,
        "v1_model_r2": r2_v1,
        "v1_delta_r2": r2_v1 - r2_canon,
        "v1_coefs": {
            "gamma_eps_anom":   float(beta_model[0]),
            "gamma_ecc":        float(beta_model[1]),
            "gamma_e_sin_peri": float(beta_model[2]),
            "gamma_e_cos_peri": float(beta_model[3]),
        },
        "v2_laskar_r2": r2_v2,
        "v2_delta_r2": r2_v2 - r2_canon,
        "v2_coefs": {
            "gamma_eps_anom":   float(beta_laskar[0]),
            "gamma_ecc":        float(beta_laskar[1]),
            "gamma_e_sin_peri": float(beta_laskar[2]),
            "gamma_e_cos_peri": float(beta_laskar[3]),
        },
        "laskar_feature_ranges": laskar_ranges,
    }


def fit_insol_only(t, y, model_feats, laskar):
    """L_insol-only regressions (no L1/L2/L3) — pure-insolation baseline."""
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    ss_tot = max(float(np.sum((y_norm - y_norm.mean()) ** 2)), 1e-12)

    def run(X):
        XtX = X.T @ X
        beta = np.linalg.solve(XtX + 0.01 * np.eye(X.shape[1]), X.T @ y_norm)
        y_hat = X @ beta
        return 1.0 - float(np.sum((y_norm - y_hat) ** 2)) / ss_tot, beta

    X_model = build_insolation_matrix(t, model_feats)
    r2_model, b_model = run(X_model)
    X_laskar, _ = build_laskar_insol_matrix(t, model_feats, laskar)
    r2_laskar, b_laskar = run(X_laskar)
    return {"model_only_r2": r2_model, "laskar_only_r2": r2_laskar}


def main():
    t0 = time.time()
    print("=" * 78)
    print("LASKAR HARDENING TEST — does wide-range e(t) revive insolation effect?")
    print("=" * 78)

    # Load datasets
    print(f"\nLoading model insolation features ...")
    model_feats = load_insolation_features()
    print(f"  {len(model_feats['age_kyr'])} samples (LR04 grid)")
    print(f"  model e(t) range: {model_feats['ecc'].min():.5f} to {model_feats['ecc'].max():.5f}")

    print(f"\nLoading La2010 (Laskar 2011) ...")
    laskar = load_la2010()
    print(f"  {len(laskar['age_kyr'])} samples, 0–{laskar['age_kyr'].max():.0f} kyr")
    print(f"  Laskar e(t) range: {laskar['ecc'].min():.5f} to {laskar['ecc'].max():.5f}")
    print(f"  Laskar e amplitude vs model: "
          f"{(laskar['ecc'].max()-laskar['ecc'].min()) / (model_feats['ecc'].max()-model_feats['ecc'].min()):.1f}× wider")

    print(f"\nLoading LR04 stack ...")
    ages, vals = load_lr04()
    t_lr, y_lr = preprocess(ages, vals, window=WINDOW_KYR)
    print(f"  Window: {WINDOW_KYR[0]}–{WINDOW_KYR[1]} kyr — {len(t_lr)} samples after gridding")

    # Run three variants on LR04
    print(f"\n{'='*78}")
    print(f"LR04 0–500 kyr — three-way comparison")
    print(f"{'='*78}")
    lr04_results = fit_three_variants(t_lr, y_lr, "lr04-0-500-kyr", model_feats, laskar)
    print(f"  V0 — L1+L2+L3 only:               R² = {lr04_results['r2_l1_l2_l3']:.4f}")
    print(f"  V1 — + L_insol(MODEL)  e=narrow:  R² = {lr04_results['v1_model_r2']:.4f}  ΔR² = {lr04_results['v1_delta_r2']:+.5f}")
    print(f"  V2 — + L_insol(LASKAR) e=wide:    R² = {lr04_results['v2_laskar_r2']:.4f}  ΔR² = {lr04_results['v2_delta_r2']:+.5f}")
    print(f"\n  Laskar feature ranges on this window (standardized inputs):")
    for k, (lo, hi) in lr04_results['laskar_feature_ranges'].items():
        print(f"    {k:12s} {lo:+.5f} to {hi:+.5f}")

    # Pure-insolation baselines on the same window
    print(f"\n{'='*78}")
    print(f"L_INSOL-ONLY (no L1/L2/L3) on LR04 0–500 kyr — pure Berger baseline")
    print(f"{'='*78}")
    lr04_only = fit_insol_only(t_lr, y_lr, model_feats, laskar)
    print(f"  MODEL  L_insol only:  R² = {lr04_only['model_only_r2']:.4f}")
    print(f"  LASKAR L_insol only:  R² = {lr04_only['laskar_only_r2']:.4f}")

    # EPICA CO₂ on the SAME 0-500 kyr window
    print(f"\n{'='*78}")
    print(f"EPICA CO₂ 0–500 kyr — three-way comparison")
    print(f"{'='*78}")
    ages_ep, co2_ep = load_epica_co2()
    t_ep, y_ep = preprocess(ages_ep, co2_ep, window=WINDOW_KYR, dt_kyr=1.0)
    print(f"  Window: {WINDOW_KYR[0]}–{WINDOW_KYR[1]} kyr — {len(t_ep)} samples after gridding")
    epica_results = fit_three_variants(t_ep, y_ep, "epica-0-500-kyr", model_feats, laskar)
    print(f"  V0 — L1+L2+L3 only:               R² = {epica_results['r2_l1_l2_l3']:.4f}")
    print(f"  V1 — + L_insol(MODEL):            R² = {epica_results['v1_model_r2']:.4f}  ΔR² = {epica_results['v1_delta_r2']:+.5f}")
    print(f"  V2 — + L_insol(LASKAR):           R² = {epica_results['v2_laskar_r2']:.4f}  ΔR² = {epica_results['v2_delta_r2']:+.5f}")

    epica_only = fit_insol_only(t_ep, y_ep, model_feats, laskar)
    print(f"\n  EPICA L_insol-only:  MODEL R² = {epica_only['model_only_r2']:.4f},  LASKAR R² = {epica_only['laskar_only_r2']:.4f}")

    # Verdict
    print(f"\n{'='*78}")
    print(f"VERDICT")
    print(f"{'='*78}")
    max_v1 = max(lr04_results['v1_delta_r2'],   epica_results['v1_delta_r2'])
    max_v2 = max(lr04_results['v2_delta_r2'],   epica_results['v2_delta_r2'])
    print(f"  Max ΔR² with MODEL insol:  {max_v1:+.5f}")
    print(f"  Max ΔR² with LASKAR insol: {max_v2:+.5f}")
    delta_of_deltas = max_v2 - max_v1
    print(f"  Laskar improvement over model: {delta_of_deltas:+.5f}")
    if max_v2 > 0.02:
        verdict = "POSITIVE — Laskar e(t) revives insolation signal; reconsider L_insol adoption"
    elif max_v2 > 0.005:
        verdict = "TENTATIVE — Laskar e(t) brings ΔR² into ambiguous range; further checks warranted"
    else:
        verdict = "NULL CONFIRMED — even with Laskar's full-range e(t), L1 already captures the variance"
    print(f"  Verdict: {verdict}")

    # Persist
    out = {
        "metadata": {
            "script": str(SCRIPT_DIR / "milankovitch_insolation_laskar_check.py"),
            "data_source": laskar["source"],
            "window_kyr": list(WINDOW_KYR),
            "runtime_sec": time.time() - t0,
            "obliquity_source": "model (computeObliquityEarth) — held identical in both variants",
            "eccentricity_perihelion_sources": {"V1": "model", "V2": "La2010a"},
        },
        "lr04_three_way":       lr04_results,
        "lr04_insol_only":      lr04_only,
        "epica_three_way":      epica_results,
        "epica_insol_only":     epica_only,
        "verdict":              verdict,
        "max_delta_r2_model":   max_v1,
        "max_delta_r2_laskar":  max_v2,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")
    print(f"Runtime: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

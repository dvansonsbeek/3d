#!/usr/bin/env python3
"""
MILANKOVITCH INSOLATION EXTENSION — does adding insolation features to
                                     L1+L2+L3 improve R²?
==========================================================================

Test design
-----------
Current canonical climate formula (doc 92):
    C(t) = c₀ + L1(t) + L2(t) + L3(t)

L1 = 32 integer-divisor sinusoids of 8H (orbital-coupling lattice)
L2 = 3 carbon-thermostat lines (405 / 202 / 135 kyr)
L3 = 6 Cenozoic step components

Insolation extension adds 4 features (the classical Berger 1978 basis):
    L_insol(t) = γ₁·ε(t) + γ₂·e(t) + γ₃·[e·sin ϖ](t) + γ₄·[e·cos ϖ](t)

where ε, e, ϖ are computed by our model (script.js → orbital-engine) at LR04
sample times. Data file: data/insolation-features.csv (built by
scripts/extract_insolation_features.js).

ΔR² = R²(L1+L2+L3+L_insol) − R²(L1+L2+L3)

Interpretation
--------------
ΔR² > 0.02   → insolation captures significant off-lattice variance L1 misses
                → adopt L_insol as canonical 4th layer
0.005 < ΔR² < 0.02 → tentative; verify cross-window stability
ΔR² < 0.005  → null result. L1's 32 integers already capture insolation-driven
                variance. Doc 94 documents this null finding (itself an
                important result that strengthens doc 95's thesis).

Output: data/insolation-extension-results.json
"""

from __future__ import annotations
import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

# Reuse the canonical ClimateFormula machinery
from milankovitch_climate_formula import (
    ClimateFormula, REGIME_WINDOWS, L3_TRANSITIONS_MA,
    L1_LATTICE_INTEGERS, L1_RIDGE_LAMBDA, EIGHT_H, H,
    load_lr04, preprocess,
)

DATA_DIR = SCRIPT_DIR.parent / "data"
INSOL_CSV = DATA_DIR / "insolation-features.csv"
OUT_PATH = DATA_DIR / "insolation-extension-results.json"


def load_insolation_features():
    """Return dict mapping age_kyr_BP → feature tuple
    (eps, ecc, peri_deg, e_sin_peri, e_cos_peri, eps_anom, e_squared)."""
    if not INSOL_CSV.exists():
        raise FileNotFoundError(
            f"{INSOL_CSV} not found. Run: node scripts/extract_insolation_features.js"
        )
    with INSOL_CSV.open() as f:
        header = f.readline().strip().split(',')
        rows = []
        for line in f:
            parts = line.strip().split(',')
            if len(parts) != len(header):
                continue
            rows.append([float(p) for p in parts])
    arr = np.array(rows)
    # Columns: year_ce, age_kyr_BP, ε, e, ϖ, e·sin, e·cos, ε−23.45, e²
    return {
        'age_kyr':    arr[:, 1],
        'eps_deg':    arr[:, 2],
        'ecc':        arr[:, 3],
        'peri_deg':   arr[:, 4],
        'e_sin_peri': arr[:, 5],
        'e_cos_peri': arr[:, 6],
        'eps_anom':   arr[:, 7],
        'e_squared':  arr[:, 8],
    }


def interp_features(feats, t_grid_kyr):
    """Interpolate the insolation features onto a regular t-grid (kyr BP)."""
    age = feats['age_kyr']
    # Sort by age (ascending) for interpolation safety
    order = np.argsort(age)
    age = age[order]
    return {
        'eps_anom':   np.interp(t_grid_kyr, age, feats['eps_anom'][order]),
        'ecc':        np.interp(t_grid_kyr, age, feats['ecc'][order]),
        'e_sin_peri': np.interp(t_grid_kyr, age, feats['e_sin_peri'][order]),
        'e_cos_peri': np.interp(t_grid_kyr, age, feats['e_cos_peri'][order]),
    }


def build_insolation_matrix(t_grid_kyr, feats_dict):
    """Build L_insol design matrix at t_grid_kyr."""
    interp = interp_features(feats_dict, t_grid_kyr)
    # Standardize each feature (zero-mean, unit-std) so regression coefficients
    # are interpretable as relative importance.
    cols = []
    for key in ['eps_anom', 'ecc', 'e_sin_peri', 'e_cos_peri']:
        v = interp[key]
        v = (v - v.mean()) / max(v.std(), 1e-12)
        cols.append(v)
    return np.column_stack(cols)  # n×4


def fit_with_insol(t, y, regime, feats_dict, include_l_insol=True):
    """Fit L1+L2+L3 first (canonical), then L_insol on residual.
    Returns dict with R² breakdown."""
    # Step 1: fit canonical L1+L2+L3
    f = ClimateFormula()
    summary = f.fit(t, y, regime=regime)
    y_hat_canon = f.evaluate(t, layer="all")

    # Normalize y the same way ClimateFormula did (zero-mean / unit-std)
    mu, sigma = float(y.mean()), float(y.std())
    y_norm = (y - mu) / max(sigma, 1e-12)
    residual = y_norm - y_hat_canon

    ss_tot = float(np.sum((y_norm - y_norm.mean()) ** 2))
    ss_tot = max(ss_tot, 1e-12)

    r2_canon = summary.r2_l1_l2_l3

    if not include_l_insol:
        return {
            'regime': regime,
            'window_kyr': list(summary.window_kyr),
            'n_samples': summary.n_samples,
            'r2_l1': summary.r2_l1_only,
            'r2_l1_l2': summary.r2_l1_l2,
            'r2_l1_l2_l3': r2_canon,
            'r2_l1_l2_l3_linsol': r2_canon,
            'delta_r2_linsol': 0.0,
            'linsol_coefs': None,
        }

    # Step 2: fit L_insol on residual
    X_insol = build_insolation_matrix(t, feats_dict)
    # Ridge-regularize lightly to avoid degeneracy if features colinearize
    p = X_insol.shape[1]
    XtX = X_insol.T @ X_insol
    lam = 0.01
    beta_insol = np.linalg.solve(XtX + lam * np.eye(p), X_insol.T @ residual)
    y_hat_insol = X_insol @ beta_insol
    residual_final = residual - y_hat_insol

    r2_full = 1.0 - float(np.sum(residual_final ** 2)) / ss_tot
    delta_r2 = r2_full - r2_canon

    return {
        'regime': regime,
        'window_kyr': list(summary.window_kyr),
        'n_samples': summary.n_samples,
        'r2_l1': summary.r2_l1_only,
        'r2_l1_l2': summary.r2_l1_l2,
        'r2_l1_l2_l3': r2_canon,
        'r2_l1_l2_l3_linsol': r2_full,
        'delta_r2_linsol': delta_r2,
        'linsol_coefs': {
            'gamma_eps_anom':   float(beta_insol[0]),
            'gamma_ecc':        float(beta_insol[1]),
            'gamma_e_sin_peri': float(beta_insol[2]),
            'gamma_e_cos_peri': float(beta_insol[3]),
        },
        # Diagnostic: how much of the residual variance is explained by L_insol alone
        'r2_insol_on_residual': float(1.0 - np.sum(residual_final**2) / max(np.sum(residual**2), 1e-12)),
    }


def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH INSOLATION EXTENSION — ΔR² test")
    print("=" * 78)

    print(f"\nLoading insolation features from {INSOL_CSV.name}...")
    feats = load_insolation_features()
    print(f"  {len(feats['age_kyr'])} samples")
    print(f"  ε(t) range:        {feats['eps_deg'].min():.3f}° to {feats['eps_deg'].max():.3f}°")
    print(f"  e(t) range:        {feats['ecc'].min():.5f} to {feats['ecc'].max():.5f}")
    print(f"  e·sin(ϖ) range:    {feats['e_sin_peri'].min():+.5f} to {feats['e_sin_peri'].max():+.5f}")
    print(f"  e·cos(ϖ) range:    {feats['e_cos_peri'].min():+.5f} to {feats['e_cos_peri'].max():+.5f}")

    print(f"\nLoading LR04 stack...")
    ages, vals = load_lr04()
    print(f"  {len(ages)} samples, 0-{ages.max():.0f} kyr")

    regimes = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]

    results = {}
    print(f"\n{'='*78}")
    print(f"PER-REGIME ΔR² (insolation features added to L1+L2+L3 residual)")
    print(f"{'='*78}")
    print(f"  {'regime':12s} {'window kyr':>12s} {'L1':>6s} {'L1+L2':>7s} {'L1+L2+L3':>10s} {'+ L_insol':>10s} {'ΔR²':>9s}")
    print(f"  {'-'*12} {'-'*12} {'-'*6} {'-'*7} {'-'*10} {'-'*10} {'-'*9}")

    for regime in regimes:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        r = fit_with_insol(t, y, regime, feats, include_l_insol=True)
        results[regime] = r
        window_str = f"{r['window_kyr'][0]:5.0f}-{r['window_kyr'][1]:5.0f}"
        print(f"  {regime:12s} {window_str:>12s} {r['r2_l1']:>6.3f} {r['r2_l1_l2']:>7.3f} "
              f"{r['r2_l1_l2_l3']:>10.4f} {r['r2_l1_l2_l3_linsol']:>10.4f} {r['delta_r2_linsol']:>+9.5f}")

    print(f"\n{'='*78}")
    print(f"L_INSOL COEFFICIENTS (post-MPT, normalized residual units)")
    print(f"{'='*78}")
    coefs = results['post-mpt']['linsol_coefs']
    if coefs:
        print(f"  γ ε(t)-23.45°    = {coefs['gamma_eps_anom']:+.5f}  (obliquity anomaly)")
        print(f"  γ e(t)           = {coefs['gamma_ecc']:+.5f}  (eccentricity)")
        print(f"  γ e·sin(ϖ)       = {coefs['gamma_e_sin_peri']:+.5f}  (climatic precession sin)")
        print(f"  γ e·cos(ϖ)       = {coefs['gamma_e_cos_peri']:+.5f}  (climatic precession cos)")

    print(f"\n{'='*78}")
    print(f"DECISION")
    print(f"{'='*78}")
    max_delta = max(r['delta_r2_linsol'] for r in results.values())
    print(f"  Max ΔR² across regimes: {max_delta:+.5f}")
    if max_delta > 0.02:
        verdict = "POSITIVE — adopt L_insol as canonical 4th layer"
    elif max_delta > 0.005:
        verdict = "TENTATIVE — investigate cross-window stability before adopting"
    else:
        verdict = "NULL — L1's 32 integers already capture insolation-driven variance"
    print(f"  Verdict: {verdict}")

    # ─── EPICA CO2 cross-proxy check ───
    print(f"\n{'='*78}")
    print(f"EPICA CO2 CROSS-PROXY CHECK (0-800 kyr)")
    print(f"{'='*78}")
    from milankovitch_climate_formula import load_epica_co2
    ages_ep, co2_ep = load_epica_co2()
    t_ep, y_ep = preprocess(ages_ep, co2_ep, window=REGIME_WINDOWS["epica-co2"], dt_kyr=1.0)
    r_ep = fit_with_insol(t_ep, y_ep, "epica-co2", feats, include_l_insol=True)
    results['epica-co2'] = r_ep
    print(f"  EPICA CO2: L1+L2+L3 R²={r_ep['r2_l1_l2_l3']:.4f}, "
          f"+L_insol R²={r_ep['r2_l1_l2_l3_linsol']:.4f}, "
          f"ΔR²={r_ep['delta_r2_linsol']:+.5f}")

    # ─── L_insol-only fit (no L1, L2, L3 ALONE for comparison) ───
    print(f"\n{'='*78}")
    print(f"L_INSOL-ONLY FIT (no L1, no L2, no L3 — pure Berger insolation baseline)")
    print(f"{'='*78}")
    print(f"  How much of LR04 does classical insolation alone explain?")
    print(f"  {'regime':12s} {'R²_insol_only':>16s}")
    print(f"  {'-'*12} {'-'*16}")
    insol_only_r2 = {}
    for regime in regimes:
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        mu, sigma = float(y.mean()), float(y.std())
        y_norm = (y - mu) / max(sigma, 1e-12)
        X_insol = build_insolation_matrix(t, feats)
        p = X_insol.shape[1]
        XtX = X_insol.T @ X_insol
        beta = np.linalg.solve(XtX + 0.01 * np.eye(p), X_insol.T @ y_norm)
        y_hat = X_insol @ beta
        ss_tot = float(np.sum((y_norm - y_norm.mean()) ** 2))
        ss_tot = max(ss_tot, 1e-12)
        r2 = 1.0 - float(np.sum((y_norm - y_hat) ** 2)) / ss_tot
        insol_only_r2[regime] = r2
        print(f"  {regime:12s} {r2:>16.4f}")
    results['_insol_only_r2'] = insol_only_r2

    # Save results
    out = {
        'metadata': {
            'script': __file__,
            'H_kyr': H,
            'eight_H_kyr': EIGHT_H,
            'L1_n_components': len(L1_LATTICE_INTEGERS),
            'insolation_features': ['eps_anom (ε−23.45°)', 'ecc (e)', 'e·sin(ϖ)', 'e·cos(ϖ)'],
            'runtime_sec': time.time() - t0,
        },
        'regime_results': results,
        'verdict': verdict,
        'max_delta_r2': max_delta,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nOutput: {OUT_PATH}")
    print(f"Runtime: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

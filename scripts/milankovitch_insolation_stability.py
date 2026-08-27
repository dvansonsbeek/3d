#!/usr/bin/env python3
"""
Cross-window stability check for the insolation extension test (doc 94).

The extension test (milankovitch_insolation_extension.py) reports the
in-sample dR2 of adding the four classical insolation features (eps anomaly,
e, e sin w, e cos w) on top of the canonical L1+L2+L3 formula, per LR04
regime. Its pre-registered rule adopts L_insol only above dR2 = 0.02, and the
0.005-0.02 band demands a cross-window stability check before adoption.
This script IS that check, applied per regime:

  (A) in-sample dR2 with the MODEL's insolation features
      (data/insolation-features.csv - the engine's e(t), w(t), eps(t));
  (B) in-sample dR2 with Laskar La2004 e(t), w(t) over the same window
      (data/la2004-earth-51myr-back.asc; obliquity held to the model, the
      doc-94 §8 convention) - does REAL orbital forcing produce the gain?
  (C) split-half cross-validation of the L_insol layer for both feature sets:
      the canonical L1+L2+L3 baseline is fitted on the full regime (as the
      extension test does), the L_insol coefficients are fitted on one half
      of the window and scored on the other half, both directions, mean
      reported. A gain that survives (C) is cross-window stable; a gain that
      appears in (A) but not (B) is a property of the model's own e(t), not
      of classical insolation.

Output: data/insolation-stability-results.json
"""
import json
import sys
import time
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from milankovitch_climate_formula import ClimateFormula, REGIME_WINDOWS, load_lr04, preprocess  # noqa: E402
from milankovitch_insolation_extension import load_insolation_features, interp_features  # noqa: E402

DATA_DIR = SCRIPT_DIR.parent / "data"
LA2004_PATH = DATA_DIR / "la2004-earth-51myr-back.asc"
OUT_PATH = DATA_DIR / "insolation-stability-results.json"
REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
RIDGE_LAMBDA = 0.01   # identical to the extension test


def _fortran_float(s):
    s = s.decode() if isinstance(s, bytes) else s
    return float(s.replace("D", "E"))


def load_la2004_feats(model_feats):
    """La2004 Earth e(t), w(t) (51 Myr back, 1-kyr steps); obliquity from the model."""
    arr = np.loadtxt(LA2004_PATH, converters={i: _fortran_float for i in range(4)})
    t_kyr = -arr[:, 0]          # file time is negative = past; age in kyr BP
    ecc, peri = arr[:, 1], arr[:, 3]   # eccentricity, longitude of perihelion (rad)
    order = np.argsort(t_kyr)
    t_kyr, ecc, peri = t_kyr[order], ecc[order], peri[order]
    m_age = np.asarray(model_feats["age_kyr"]); mo = np.argsort(m_age)
    eps_anom = np.interp(t_kyr, m_age[mo], np.asarray(model_feats["eps_anom"])[mo])
    return {"age_kyr": t_kyr, "eps_anom": eps_anom, "ecc": ecc,
            "e_sin_peri": ecc * np.sin(peri), "e_cos_peri": ecc * np.cos(peri)}


def design(t, feats):
    interp = interp_features(feats, t)
    cols = []
    for key in ["eps_anom", "ecc", "e_sin_peri", "e_cos_peri"]:
        v = interp[key]
        v = (v - v.mean()) / max(v.std(), 1e-12)
        cols.append(v)
    return np.column_stack(cols)


def canonical_residual(t, y, regime):
    f = ClimateFormula()
    s = f.fit(t, y, regime=regime)
    y_hat = f.evaluate(t, layer="all")
    y_norm = (y - y.mean()) / max(y.std(), 1e-12)
    return y_norm - y_hat, y_norm, float(s.r2_l1_l2_l3)


def ridge(X, r, lam=RIDGE_LAMBDA):
    p = X.shape[1]
    return np.linalg.solve(X.T @ X + lam * np.eye(p), X.T @ r)


def in_sample_dr2(res, y_norm, r2c, X):
    b = ridge(X, res)
    ss_tot = max(float(np.sum((y_norm - y_norm.mean()) ** 2)), 1e-12)
    return (1.0 - float(np.sum((res - X @ b) ** 2)) / ss_tot) - r2c


def cv_dr2(res, y_norm, X):
    n = len(res); h = n // 2
    splits = [(np.arange(0, h), np.arange(h, n)), (np.arange(h, n), np.arange(0, h))]
    halves = []
    for tr, te in splits:
        b = ridge(X[tr], res[tr])
        ss_tot_te = max(float(np.sum((y_norm[te] - y_norm[te].mean()) ** 2)), 1e-12)
        ss_before = float(np.sum(res[te] ** 2))
        ss_after = float(np.sum((res[te] - X[te] @ b) ** 2))
        halves.append((ss_before - ss_after) / ss_tot_te)
    return float(np.mean(halves)), [float(v) for v in halves]


def main():
    t0 = time.time()
    ages, vals = load_lr04()
    model = load_insolation_features()
    laskar = load_la2004_feats(model)
    out = {"metadata": {"script": Path(__file__).name,
                        "laskar_source": "La2004 (Laskar et al. 2004) Earth elements, data/la2004-earth-51myr-back.asc",
                        "obliquity_source": "model (computeObliquityEarth) - held identical in both feature sets",
                        "ridge_lambda": RIDGE_LAMBDA, "cv": "split-half, both directions, canonical baseline fitted on the full regime"},
           "regime_results": {}}
    print(f"{'regime':10} {'window':12} {'R2 canon':>8} | {'dR2 model':>9} {'dR2 Laskar':>10} | {'CV model':>9} {'CV Laskar':>10}")
    for regime in REGIMES:
        t, y = preprocess(ages, vals, window=REGIME_WINDOWS[regime])
        res, y_norm, r2c = canonical_residual(t, y, regime)
        Xm, Xl = design(t, model), design(t, laskar)
        dm, dl = in_sample_dr2(res, y_norm, r2c, Xm), in_sample_dr2(res, y_norm, r2c, Xl)
        cvm, hm = cv_dr2(res, y_norm, Xm)
        cvl, hl = cv_dr2(res, y_norm, Xl)
        out["regime_results"][regime] = {
            "window_kyr": list(REGIME_WINDOWS[regime]), "n_samples": int(len(t)), "r2_l1_l2_l3": r2c,
            "model_delta_r2": dm, "laskar_delta_r2": dl,
            "model_cv_delta_r2": cvm, "model_cv_halves": hm,
            "laskar_cv_delta_r2": cvl, "laskar_cv_halves": hl,
        }
        print(f"{regime:10} {str(REGIME_WINDOWS[regime]):12} {r2c:8.4f} | {dm:+9.5f} {dl:+10.5f} | {cvm:+9.5f} {cvl:+10.5f}")
    rr = out["regime_results"]
    stable = [r for r in REGIMES if rr[r]["model_cv_delta_r2"] > 0.02]
    out["max_model_cv_delta_r2"] = max(rr[r]["model_cv_delta_r2"] for r in REGIMES)
    out["max_laskar_cv_delta_r2"] = max(rr[r]["laskar_cv_delta_r2"] for r in REGIMES)
    out["stable_positive_regimes_model"] = stable
    out["stable_positive_regimes_laskar"] = [r for r in REGIMES if rr[r]["laskar_cv_delta_r2"] > 0.02]
    for name, f in [("model", model), ("laskar", laskar)]:
        m = (np.asarray(f["age_kyr"]) >= 0) & (np.asarray(f["age_kyr"]) <= 5320)
        e = np.asarray(f["ecc"])[m]
        out[f"ecc_range_{name}_0_5320kyr"] = [float(e.min()), float(e.max())]
    out["metadata"]["runtime_sec"] = time.time() - t0
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nstable POSITIVE regimes (CV dR2 > 0.02): model {stable} | Laskar {out['stable_positive_regimes_laskar']}")
    print(f"Output: {OUT_PATH}")


if __name__ == "__main__":
    main()

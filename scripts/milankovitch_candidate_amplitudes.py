#!/usr/bin/env python3
"""
MILANKOVITCH CANDIDATE AMPLITUDES — Standard vs Holistic H-divisor
====================================================================

Multi-component OLS amplitude fit comparing two candidate sets:

  STANDARD set — Berger 1978 climatic-precession sub-peaks + g_j-g_k
                 eccentricity beats + s_3+k obliquity.
  MODEL set    — Holistic H-divisor periods + matched-frame planet+Earth
                 beats (e.g., H/18 = Earth axial H/13 + Jupiter ecliptic H/5,
                 H/21 = Earth axial H/13 + Jupiter ICRF H/8, three-way
                 Earth-internal beats H/14 = 8+3+3, H/15 = 13+5-3).

Datasets:
  - LR04 (Lisiecki & Raymo 2005, marine δ¹⁸O, orbitally tuned for >400 ka)
  - Cheng2016 (U-Th-dated Asian monsoon δ¹⁸O, chronology independent of
    orbital assumptions)

Tests:
  1. Head-to-head AIC/R² comparison: STANDARD vs MODEL set on
     full LR04, post-MPT (0-700), pre-MPT (700-1200), Cheng full (0-640),
     Cheng halves (0-320, 320-640), LR04 0-400 (least-tuned), LR04 0-640.
  2. H/18 cross-window summary — replication of the non-tuned vs
     tuned finding (Cheng halves significant, LR04 not).
  3. MPT growth — pre vs post amplitude ratios for both candidate sets.

Companion document: docs/91-milankovitch-evidence.md
Run:  python3 scripts/milankovitch_candidate_amplitudes.py
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
CHENG_PATH = DATA_DIR / "cheng2016-speleothem.txt"
OUT_PATH = DATA_DIR / "milankovitch-candidate-amplitudes.json"

RNG_SEED = 20260519
DT_KYR = 1.0
BOOTSTRAP_ITERATIONS = 1000
H = 335.317


def hd(n):
    return H / n


# ─────────────────────────────────────────────────────────────────────────
# Candidate sets
# ─────────────────────────────────────────────────────────────────────────

STANDARD_MIN = [
    ("19.2 kyr (g3+k Earth)",     19.2),
    ("22.4 kyr (g2+k Venus)",     22.4),
    ("23.7 kyr (g5+k Jupiter)",   23.7),
    ("41.0 kyr (s3+k obliquity)", 41.0),
    ("111.77 kyr H/3",            111.77),
]

MODEL_MIN = [
    ("H/21 = 15.97 kyr (Earth+Jup ICRF)",     hd(21)),
    ("H/18 = 18.63 kyr (Earth+Jup ecliptic)", hd(18)),
    ("H/16 = 20.96 kyr (Earth perihelion)",   hd(16)),
    ("H/15 = 22.35 kyr (3-way 13+5-3)",       hd(15)),
    ("H/14 = 23.95 kyr (3-way 8+3+3)",        hd(14)),
    ("H/13 = 25.79 kyr (Earth axial)",        hd(13)),
    ("H/8  = 41.91 kyr (obliquity / Jup ICRF)", hd(8)),
    ("H/3  = 111.77 kyr (inclination)",       hd(3)),
]

# Focused set for sub-window replication — fewer candidates to manage
# collinearity at shorter T. Includes the H/18 candidate explicitly.
FOCUS = [
    ("H/21 = 15.97 kyr (Jup ICRF)",     hd(21)),
    ("H/18 = 18.63 kyr (Jup ecliptic)", hd(18)),
    ("19.2 kyr (Berger g3+k)",          19.2),
    ("H/16 = 20.96 kyr",                hd(16)),
    ("H/15 = 22.35 kyr",                hd(15)),
    ("22.4 kyr (Berger g2+k)",          22.4),
    ("23.7 kyr (Berger g5+k)",          23.7),
    ("H/14 = 23.95 kyr",                hd(14)),
]
H18_LABEL = "H/18 = 18.63 kyr (Jup ecliptic)"

WIN_FULL_LR04    = (0, 5320)
WIN_POST_MPT     = (0, 700)
WIN_PRE_MPT      = (700, 1200)
WIN_CHENG_FULL   = (0, 640)
WIN_CHENG_LOW    = (0, 320)
WIN_CHENG_HIGH   = (320, 640)
WIN_LR04_YOUNG   = (0, 400)
WIN_LR04_MATCHED = (0, 640)


# ─────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────

def load_lr04():
    ages, vals = [], []
    with open(LR04_PATH, "rt") as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def load_cheng():
    ages, vals = [], []
    with open(CHENG_PATH, "rt") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def preprocess(ages, vals, window, dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = vals[mask]
    order = np.argsort(a)
    a = a[order]
    v = v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a = a[keep]
    v = v[keep]
    grid = np.arange(lo, hi + dt, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


def build_X(t, periods):
    n = len(t)
    p = len(periods)
    X = np.zeros((n, 1 + 2 * p))
    X[:, 0] = 1.0
    for i, P in enumerate(periods):
        omega = 2 * np.pi / P
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    return X


def fit_amplitudes(X, y):
    beta, _, _, svals = np.linalg.lstsq(X, y, rcond=None)
    p = (len(beta) - 1) // 2
    amps = np.array([
        np.sqrt(beta[1 + 2 * i] ** 2 + beta[2 + 2 * i] ** 2) for i in range(p)
    ])
    y_hat = X @ beta
    n = len(y)
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    cond = float(svals[0] / svals[-1]) if len(svals) > 0 else float("nan")
    k_params = 1 + 2 * p
    aic = 2 * k_params + n * np.log(ss_res / n) if ss_res > 0 else float("nan")
    return amps, r2, cond, aic


def bootstrap_amps(t, y, periods, n_iters, rng):
    p = len(periods)
    boot = np.zeros((n_iters, p))
    n = len(t)
    for k in range(n_iters):
        idx = rng.integers(0, n, size=n)
        X_b = build_X(t[idx], periods)
        try:
            amps, _, _, _ = fit_amplitudes(X_b, y[idx])
            boot[k] = amps
        except Exception:
            boot[k] = np.nan
    return boot


def run_fit(t, y, labels_periods, label, rng, n_boot=BOOTSTRAP_ITERATIONS):
    periods = [p for _, p in labels_periods]
    X = build_X(t, periods)
    amps, r2, cond, aic = fit_amplitudes(X, y)
    boot = bootstrap_amps(t, y, periods, n_boot, rng)
    cond_warning = " ⚠ HIGH COLLINEARITY" if cond > 100 else ""
    print(f"\n  --- {label} ---")
    print(f"  R² = {r2:.4f}  |  AIC = {aic:.2f}  |  cond = {cond:.1f}{cond_warning}")
    out = {}
    print(f"  {'Period':<42}  {'amp':>9}  {'95% CI':>20}")
    for i, (lbl, P) in enumerate(labels_periods):
        col = boot[:, i]
        col_clean = col[~np.isnan(col)]
        ci_lo = float(np.percentile(col_clean, 2.5))
        ci_hi = float(np.percentile(col_clean, 97.5))
        out[lbl] = {"period_kyr": P, "amp": float(amps[i]),
                    "ci_lo": ci_lo, "ci_hi": ci_hi}
        marker = " *" if ci_lo > 0.05 else ""
        # Suppress display of obviously-collinear-blown-up amplitudes
        if cond > 100 and amps[i] > 10:
            marker = " (⚠ collinear blow-up)"
        print(f"  {lbl:<42}  {amps[i]:>9.4f}  [{ci_lo:>6.4f}, {ci_hi:>6.4f}]{marker}")
    return {"r2": r2, "aic": aic, "condition": cond, "results": out}


def head_to_head(t, y, label, rng):
    """Run STANDARD vs MODEL and report ΔAIC verdict."""
    std = run_fit(t, y, STANDARD_MIN, f"STANDARD on {label}", rng)
    mod = run_fit(t, y, MODEL_MIN,    f"MODEL on {label}", rng)
    daic = mod["aic"] - std["aic"]
    if daic < 0:
        verdict = f"MODEL preferred (ΔAIC = {daic:.2f})"
    else:
        verdict = f"STANDARD preferred (ΔAIC = {-daic:.2f})"
    print(f"\n  >> {label}: {verdict}")
    return {"standard": std, "model": mod, "verdict": verdict}


def compute_growth(pre_res, post_res, candidate_set):
    rows = []
    for lbl, P in candidate_set:
        pre = pre_res["results"][lbl]
        post = post_res["results"][lbl]
        ratio = post["amp"] / pre["amp"] if pre["amp"] > 0 else float("nan")
        noise_floor = 0.05
        reliable = pre["ci_lo"] > noise_floor and post["ci_lo"] > noise_floor
        rows.append({"label": lbl, "period_kyr": P,
                     "pre_amp": pre["amp"], "post_amp": post["amp"],
                     "ratio": ratio, "reliable": reliable})
    return rows


def print_growth_table(rows, title):
    print(f"\n  --- {title} ---")
    print(f"  {'Period':<42}  {'pre':>7}  {'post':>7}  {'ratio':>7}  {'reliable':>9}")
    for r in rows:
        rel = "yes" if r["reliable"] else "no"
        print(f"  {r['label']:<42}  {r['pre_amp']:>7.4f}  {r['post_amp']:>7.4f}  "
              f"{r['ratio']:>7.2f}  {rel:>9}")


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    rng = np.random.default_rng(RNG_SEED)
    ages_lr, vals_lr = load_lr04()
    ages_ch, vals_ch = load_cheng()

    print("=" * 75)
    print("MILANKOVITCH CANDIDATE AMPLITUDES — STANDARD vs HOLISTIC H-DIVISOR")
    print("=" * 75)
    print(f"H = {H:.3f} kyr;  H/8 = {hd(8):.3f};  H/14 = {hd(14):.3f};  H/15 = {hd(15):.3f};  H/18 = {hd(18):.3f};  H/21 = {hd(21):.3f}")
    print(f"LR04:      {len(ages_lr)} samples, range {ages_lr.min():.1f}-{ages_lr.max():.1f} kyr")
    print(f"Cheng2016: {len(ages_ch)} samples, range {ages_ch.min():.1f}-{ages_ch.max():.1f} kyr")

    results = {}

    # ─────────────────────────────────────────────────────────────────────
    # 1. Head-to-head comparisons
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 75)
    print("1. HEAD-TO-HEAD: STANDARD vs MODEL set across windows")
    print("=" * 75)

    head_to_head_jobs = [
        ("LR04 full (T=5320)",  ages_lr, vals_lr, WIN_FULL_LR04),
        ("LR04 post-MPT (0-700)", ages_lr, vals_lr, WIN_POST_MPT),
        ("LR04 pre-MPT (700-1200)", ages_lr, vals_lr, WIN_PRE_MPT),
        ("LR04 0-400 (least-tuned)", ages_lr, vals_lr, WIN_LR04_YOUNG),
        ("LR04 0-640 (matched to Cheng)", ages_lr, vals_lr, WIN_LR04_MATCHED),
        ("Cheng2016 full (T=640)", ages_ch, vals_ch, WIN_CHENG_FULL),
        ("Cheng 0-320",  ages_ch, vals_ch, WIN_CHENG_LOW),
        ("Cheng 320-640", ages_ch, vals_ch, WIN_CHENG_HIGH),
    ]
    for label, ages, vals, win in head_to_head_jobs:
        t, y = preprocess(ages, vals, win)
        results[label] = head_to_head(t, y, label, rng)

    # ─────────────────────────────────────────────────────────────────────
    # 2. H/18 cross-window replication summary
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 75)
    print("2. H/18 CROSS-WINDOW REPLICATION (focus set)")
    print("=" * 75)

    h18_jobs = [
        ("Cheng 0-320 kyr",   ages_ch, vals_ch, WIN_CHENG_LOW),
        ("Cheng 320-640 kyr", ages_ch, vals_ch, WIN_CHENG_HIGH),
        ("Cheng full 0-640",  ages_ch, vals_ch, WIN_CHENG_FULL),
        ("LR04 0-400 kyr",    ages_lr, vals_lr, WIN_LR04_YOUNG),
        ("LR04 0-640 kyr",    ages_lr, vals_lr, WIN_LR04_MATCHED),
        ("LR04 post-MPT (0-700)", ages_lr, vals_lr, WIN_POST_MPT),
    ]
    focus_fits = {}
    for label, ages, vals, win in h18_jobs:
        t, y = preprocess(ages, vals, win)
        focus_fits[label] = run_fit(t, y, FOCUS, f"Focus set — {label}", rng)

    print("\n  --- H/18 cross-window summary ---")
    print(f"  {'Sub-window':<30}  {'H/18 amp':>10}  {'95% CI':>20}  {'cond':>6}  {'sig?':>5}")
    h18_summary = []
    for label, res in focus_fits.items():
        cond = res["condition"]
        h18 = res["results"].get(H18_LABEL, {})
        amp = h18.get("amp", float("nan"))
        ci_lo = h18.get("ci_lo", float("nan"))
        ci_hi = h18.get("ci_hi", float("nan"))
        # Sig only if condition reasonable AND CI clearly above noise floor
        if cond > 100:
            sig = "n/a (collinear)"
        elif ci_lo > 0.05:
            sig = "yes"
        else:
            sig = "no"
        h18_summary.append({"window": label, "amp": amp, "ci_lo": ci_lo,
                             "ci_hi": ci_hi, "condition": cond, "significant": sig})
        print(f"  {label:<30}  {amp:>10.4f}  [{ci_lo:>6.4f}, {ci_hi:>6.4f}]  "
              f"{cond:>6.1f}  {sig:>15}")

    results["focus_fits"] = focus_fits
    results["h18_summary"] = h18_summary

    # ─────────────────────────────────────────────────────────────────────
    # 3. MPT growth — pre vs post amplitude ratios for both candidate sets
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 75)
    print("3. MPT GROWTH — pre-MPT (700-1200) vs post-MPT (0-700)")
    print("=" * 75)

    growth_std = compute_growth(
        results["LR04 pre-MPT (700-1200)"]["standard"],
        results["LR04 post-MPT (0-700)"]["standard"],
        STANDARD_MIN,
    )
    growth_mod = compute_growth(
        results["LR04 pre-MPT (700-1200)"]["model"],
        results["LR04 post-MPT (0-700)"]["model"],
        MODEL_MIN,
    )
    print_growth_table(growth_std, "STANDARD set MPT growth")
    print_growth_table(growth_mod, "MODEL set MPT growth")

    results["mpt_growth"] = {"standard": growth_std, "model": growth_mod}

    # ─────────────────────────────────────────────────────────────────────
    OUT_PATH.write_text(json.dumps({
        "meta": {
            "script": "milankovitch_candidate_amplitudes.py",
            "H_kyr": H,
            "rng_seed": RNG_SEED,
            "dt_kyr": DT_KYR,
            "bootstrap_iter": BOOTSTRAP_ITERATIONS,
        },
        "results": results,
    }, indent=2))
    print(f"\n[saved] {OUT_PATH}")
    print(f"[elapsed] {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

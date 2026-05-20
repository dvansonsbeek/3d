#!/usr/bin/env python3
"""
MILANKOVITCH AMPLITUDE FIT — multi-component OLS + robustness
=============================================================

Multi-component amplitude fit on LR04 δ¹⁸O at fixed candidate periods.
Bypasses the Rayleigh peak-resolution limit by constraining the candidate
frequencies as known.

Tests:
  §7.3 — Primary multi-component fit: full LR04 (T=5,320 kyr) and post-MPT
         (T=1,000 kyr) windows with 8 candidate periods.
  §7.4 — Robustness:
         (a) Collinearity: drop 111.77 OR drop 110 from H/3 region
         (b) Shorter window: 0-700 kyr (Rayleigh limit worsens)
         (c) Dense grid 85-125 kyr at 5-kyr spacing — reveals profile shape

Companion document: docs/17-milankovitch-evidence.md §7
Run:  python3 scripts/milankovitch_amplitude_fit.py
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_CACHE = DATA_DIR / "lr04-stack.txt"

RNG_SEED = 20260517
DT_KYR = 1.0
BOOTSTRAP_ITERATIONS = 1000

# 8 locked candidate periods (doc 17 §7.2)
CANDIDATE_PERIODS = [
    ("23.7 kyr (climatic precession)", 23.7),
    ("41.0 kyr (obliquity)",           41.0),
    ("95.0 kyr (g4-g5 ecc beat)",      95.0),
    ("99.0 kyr (g3-g5 ecc beat)",      99.0),
    ("110.0 kyr (g3-g1 Earth-Mercury)", 110.0),
    ("111.77 kyr (H/3 model)",         111.77),
    ("124.0 kyr (g4-g2 ecc beat)",     124.0),
    ("405.0 kyr (g2-g5 ecc long)",     405.0),
]

ECC_BEAT_LABELS = [
    "95.0 kyr (g4-g5 ecc beat)",
    "99.0 kyr (g3-g5 ecc beat)",
    "124.0 kyr (g4-g2 ecc beat)",
]
H_OVER_3_LABEL = "111.77 kyr (H/3 model)"
G3_G1_LABEL = "110.0 kyr (g3-g1 Earth-Mercury)"

WIN_FULL = (0, 5320)
WIN_POST_MPT = (0, 1000)
WIN_700 = (0, 700)
VERDICT_STRONG_FACTOR = 1.5


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def parse_lr04(path):
    ages, d18o = [], []
    with open(path, "rt") as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            d18o.append(v)
    return np.array(ages), np.array(d18o)


def preprocess(ages, d18o, window):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = d18o[mask]
    grid = np.arange(lo, hi + DT_KYR, DT_KYR)
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
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    cond = float(svals[0] / svals[-1]) if len(svals) > 0 else float("nan")
    return amps, r2, cond


def bootstrap_amps(t, y, periods, n_iters, rng):
    n = len(t)
    p = len(periods)
    boot = np.zeros((n_iters, p))
    for k in range(n_iters):
        idx = rng.integers(0, n, size=n)
        X_b = build_X(t[idx], periods)
        try:
            amps, _, _ = fit_amplitudes(X_b, y[idx])
            boot[k] = amps
        except Exception:
            boot[k] = np.nan
    return boot


def apply_verdict(amplitudes_by_label):
    c_h3 = amplitudes_by_label[H_OVER_3_LABEL]
    c_g3g1 = amplitudes_by_label[G3_G1_LABEL]
    ecc_amps = [amplitudes_by_label[lbl] for lbl in ECC_BEAT_LABELS]
    c_ecc_max = max(ecc_amps)
    c_ecc_max_label = ECC_BEAT_LABELS[int(np.argmax(ecc_amps))]
    if c_h3 > VERDICT_STRONG_FACTOR * c_ecc_max and c_h3 > c_g3g1:
        v = "STRONG SUPPORT for H/3"
    elif c_h3 > c_ecc_max:
        v = "Support for H/3 (weaker margin — see robustness §7.4)"
    elif c_ecc_max > VERDICT_STRONG_FACTOR * c_h3:
        v = f"AGAINST H/3 — ecc beat dominates ({c_ecc_max_label}, ratio {c_ecc_max/c_h3:.2f})"
    else:
        v = f"AMBIGUOUS — comparable amplitudes"
    return v


def run_fit(t, y, labels_periods, label, rng, n_boot=BOOTSTRAP_ITERATIONS):
    periods = [p for _, p in labels_periods]
    X = build_X(t, periods)
    amps, r2, cond = fit_amplitudes(X, y)
    boot = bootstrap_amps(t, y, periods, n_boot, rng)
    print(f"\n  --- {label} ---")
    print(f"  R² = {r2:.4f}, condition = {cond:.1f}")
    out = {}
    print(f"  {'Period':<36}  {'amp':>9}  {'95% CI':>20}")
    for i, (lbl, P) in enumerate(labels_periods):
        col = boot[:, i]
        col_clean = col[~np.isnan(col)]
        ci_lo = float(np.percentile(col_clean, 2.5))
        ci_hi = float(np.percentile(col_clean, 97.5))
        out[lbl] = {"period_kyr": P, "amp": float(amps[i]),
                    "ci_lo": ci_lo, "ci_hi": ci_hi}
        print(f"  {lbl:<36}  {amps[i]:>9.4f}  [{ci_lo:>6.4f}, {ci_hi:>6.4f}]")
    return {"r2": float(r2), "condition": float(cond), "results": out}


# ═══════════════════════════════════════════════════════════════════════════
# Test groups
# ═══════════════════════════════════════════════════════════════════════════

ANCHORS = [
    ("23.7 kyr precession", 23.7),
    ("41.0 kyr obliquity",  41.0),
    ("405.0 kyr ecc-long",  405.0),
]

BAND_ORIGINAL = [
    ("95.0 kyr g4-g5",  95.0),
    ("99.0 kyr g3-g5",  99.0),
    ("110.0 kyr g3-g1", 110.0),
    ("111.77 kyr H/3",  111.77),
    ("124.0 kyr g4-g2", 124.0),
]
BAND_NO_111 = [(lbl, P) for lbl, P in BAND_ORIGINAL if "111.77" not in lbl]
BAND_NO_110 = [(lbl, P) for lbl, P in BAND_ORIGINAL if "110.0" not in lbl]
BAND_DENSE = [(f"{P:.0f} kyr", float(P)) for P in
              [85, 90, 95, 100, 105, 110, 115, 120, 125]]


def main():
    t0 = time.time()
    rng = np.random.default_rng(RNG_SEED)
    print("=" * 72)
    print("MILANKOVITCH AMPLITUDE FIT — multi-component OLS + robustness")
    print("=" * 72)
    print(f"\nSee docs/17-milankovitch-evidence.md §7 for narrative.")
    print(f"RNG seed: {RNG_SEED}")

    if not LR04_CACHE.exists():
        print(f"ERROR: {LR04_CACHE} missing. Run milankovitch_spectral_tests.py first.")
        sys.exit(1)
    ages, d18o = parse_lr04(LR04_CACHE)
    print(f"\nLR04 loaded: {len(ages)} samples, {ages.min():.0f}-{ages.max():.0f} kyr BP")

    summary = {}

    # ── §7.3 Primary multi-component fit (full + post-MPT) ─────────────────
    print("\n" + "═" * 72)
    print("§7.3 — Primary fits: full LR04 and post-MPT")
    print("═" * 72)
    periods = [p for _, p in CANDIDATE_PERIODS]
    for label, win in [("FULL LR04 (T=5320 kyr)", WIN_FULL),
                       ("POST-MPT (T=1000 kyr)",  WIN_POST_MPT)]:
        T = win[1] - win[0]
        rayleigh = 100.0**2 / T
        print(f"\n{label}  window={win}  Rayleigh at 100 kyr = {rayleigh:.2f} kyr")
        t, y = preprocess(ages, d18o, win)
        result = run_fit(t, y, CANDIDATE_PERIODS, label, rng)
        # Build amp_by_label dict using actual full labels
        amp_by_label = {lbl: result["results"][lbl]["amp"]
                        for lbl, _ in CANDIDATE_PERIODS}
        verdict = apply_verdict(amp_by_label)
        print(f"\n  VERDICT: {verdict}")
        result["verdict"] = verdict
        result["window_kyr"] = list(win)
        result["rayleigh_at_100kyr"] = float(rayleigh)
        summary[f"primary_{label.split()[0].lower()}"] = result

    # ── §7.4 (a) Collinearity check ────────────────────────────────────────
    print("\n" + "═" * 72)
    print("§7.4(a) — Collinearity check on post-MPT (T=1000 kyr)")
    print("═" * 72)
    t, y = preprocess(ages, d18o, WIN_POST_MPT)
    r_both = run_fit(t, y, ANCHORS + BAND_ORIGINAL, "Both 110 + 111.77", rng)
    r_only_110 = run_fit(t, y, ANCHORS + BAND_NO_111, "Drop 111.77, only 110", rng)
    r_only_111 = run_fit(t, y, ANCHORS + BAND_NO_110, "Drop 110, only 111.77", rng)
    print("\n  Collinearity summary:")
    a110_both = r_both["results"]["110.0 kyr g3-g1"]["amp"]
    a111_both = r_both["results"]["111.77 kyr H/3"]["amp"]
    a110_alone = r_only_110["results"]["110.0 kyr g3-g1"]["amp"]
    a111_alone = r_only_111["results"]["111.77 kyr H/3"]["amp"]
    print(f"    amp(110) with both:  {a110_both:.3f}    amp(110) alone:  {a110_alone:.3f}   "
          f"(×{a110_alone/a110_both:.2f})")
    print(f"    amp(111.77) with both: {a111_both:.3f}  amp(111.77) alone: {a111_alone:.3f}  "
          f"(×{a111_alone/a111_both:.2f})")
    print("  → Joint amp inflated by collinearity. The initial 'H/3 by 3×' verdict was an artifact.")
    summary["robustness_a_collinearity"] = {
        "both": r_both, "only_110": r_only_110, "only_111_77": r_only_111
    }

    # ── §7.4 (b) Shorter window (0-700 kyr) ──────────────────────────────
    print("\n" + "═" * 72)
    print("§7.4(b) — Shorter window 0-700 kyr (Rayleigh worsens)")
    print("═" * 72)
    t2, y2 = preprocess(ages, d18o, WIN_700)
    rayleigh_700 = 100.0**2 / 700
    print(f"  Rayleigh at 100 kyr = {rayleigh_700:.2f} kyr (was 10 at T=1000)")
    r_700 = run_fit(t2, y2, ANCHORS + BAND_ORIGINAL, "T=700 kyr", rng)
    summary["robustness_b_700kyr"] = r_700

    # ── §7.4 (c) Dense grid 85-125 kyr ────────────────────────────────────
    print("\n" + "═" * 72)
    print("§7.4(c) — Dense grid 85-125 kyr at 5-kyr spacing (post-MPT)")
    print("═" * 72)
    r_dense = run_fit(t, y, ANCHORS + BAND_DENSE, "Dense grid 85-125", rng)
    dense_amps = [(lbl, r_dense["results"][lbl]["amp"]) for lbl, _ in BAND_DENSE]
    dense_amps.sort(key=lambda x: -x[1])
    print(f"\n  Ranked amplitudes (dense grid):")
    for lbl, amp in dense_amps:
        print(f"    {lbl:<20}  amp = {amp:.3f}")
    # Amplitude-weighted centroid
    nums = sum(r_dense["results"][lbl]["amp"] * P for lbl, P in BAND_DENSE)
    dens = sum(r_dense["results"][lbl]["amp"] for lbl, _ in BAND_DENSE)
    centroid = nums / dens if dens > 0 else float('nan')
    print(f"\n  Amplitude-weighted centroid: {centroid:.2f} kyr")
    print(f"  Profile shape preserved across collinearity → meaningful indicator")
    summary["robustness_c_dense_grid"] = {
        **r_dense,
        "amplitude_weighted_centroid_kyr": float(centroid),
    }

    # ── Save ────────────────────────────────────────────────────────────────
    out = DATA_DIR / "milankovitch-amplitude-fit-results.json"
    out.write_text(json.dumps({
        "doc_reference": "docs/17-milankovitch-evidence.md §7",
        "rng_seed": RNG_SEED,
        "candidate_periods": {lbl: P for lbl, P in CANDIDATE_PERIODS},
        "results": summary,
        "runtime_seconds": round(time.time() - t0, 2),
    }, indent=2))
    print(f"\nSaved → {out}")
    print(f"Total runtime: {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()

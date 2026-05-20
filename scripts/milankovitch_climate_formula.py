#!/usr/bin/env python3
"""
MILANKOVITCH 8H CLIMATE FORMULA — fit + forward projection
============================================================

Builds an explicit climate-prediction formula from the 8H integer-divisor
analysis (§2 of doc 17):

    C(t) = Σ_n A_n cos(2π n t / 8H + φ_n)

where:
  • t = age in kyr BP (t<0 = future)
  • 8H = 2,682.536 kyr (Solar System Resonance Cycle)
  • Each integer n is a climate-active divisor identified in §2.2
  • A_n and φ_n are fitted jointly against LR04 by OLS

Pipeline:
  1. Refit LR04 with the 26 significant integer divisors (§2.2), capturing
     amplitude AND phase per component.
  2. Validate: compute reconstruction, R², residual statistics.
  3. Extrapolate forward 250 kyr (t = 0 → -250).
  4. Identify next glacial maxima (local C(t) maxima) and interglacial peaks
     (local C(t) minima).
  5. Sanity check: compare against actual past 200 kyr of LR04.

Limitation: this is a purely orbital-forcing prediction. It does not capture
ice-sheet hysteresis, carbon feedbacks, or anthropogenic effects.

Run:  python3 scripts/milankovitch_climate_formula.py
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend, find_peaks

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
OUT_PATH = DATA_DIR / "milankovitch-climate-formula.json"

H = 335.317
EIGHT_H = 8 * H  # 2682.536 kyr
DT_KYR = 1.0

# 26 significant integer divisors of 8H. 20 from §2.2 of doc 17
# (LR04 full T=5320 kyr, amp > 3× median) + 6 added from §3.3 (pre-MPT
# 1200–3000 kyr) to capture outer-planet and Mars-direct cycles.
CLIMATE_INTEGERS = [7, 9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                    38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]

# Eigenmode-beat labels (mirror §2.2 table + §6.6 n=66 interpretation)
LABELS = {
    7:   "g₂−g₅ Venus-Jupiter (~405 kyr long ecc)",
    9:   "g₂−g₇ Venus-Uranus ecc / Mercury Axial = AscNode = 8H/9 (doc 55, Cassini-locked)",
    12:  "s₅−s₁ Jupiter-Mercury nodal / Uranus AscNode = 8H/12 (doc 55)",
    14:  "g₂−g₈ Venus-Neptune ecc (pre-MPT, ~192 kyr)",
    16:  "Mars Axial = 8H/16 (model direct, ~168 kyr)",
    18:  "s₄−s₆ Mars-Saturn nodal",
    20:  "g₃−g₂ Earth-Venus ecc",
    21:  "Mars Obliq / Jupiter Axial = 8H/21 (model direct, ~128 kyr)",
    22:  "s₂−s₄ Venus-Mars nodal / g₄−g₂",
    25:  "s₁−s₄ Mercury-Mars nodal (100-kyr centroid)",
    28:  "g₄−g₅ Mars-Jupiter ecc (Berger 95k)",
    30:  "g₃−g₇ Earth-Uranus ecc (pre-MPT, ~89 kyr)",
    31:  "g₄−g₇ Mars-Uranus",
    35:  "Mars apsidal = 8H/35 (model)",
    38:  "s₈−s₃ Neptune-Earth nodal (pre-MPT, ~71 kyr)",
    39:  "s₅−s₃ Earth nodal",
    48:  "s₇−s₆ Uranus-Saturn nodal",
    50:  "g₆−g₅ Saturn-Jupiter ecc",
    53:  "s₈−s₆ / Mars Ecc cycle = 8H/53 (model)",
    65:  "k+s₃ Earth obliquity (Berger 41k)",
    66:  "obliquity-band arithmetic-mean cycle length (~40.5 kyr; Jensen's inequality vs k+s₃ — see doc 17 §6.6)",
    68:  "k+s₄ Berger Mars obliquity sub-peak / k−g₃ Earth axial-apsidal beat",
    73:  "2|s₄| Mars nodal harmonic / g₃−s₄",
    76:  "g₄−s₃ Mars apsidal − Earth nodal beat",
    113: "k+g₅ Jupiter climatic precession (Berger 23.7k)",
    120: "k+g₂ Venus climatic precession = H/15",
}


# ─────────────────────────────────────────────────────────────────────────
# Load + preprocess LR04
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


def preprocess(ages, vals, window=(0, 5320), dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    mean_orig = float(v_det.mean())
    std_orig  = float(v_det.std())
    v_norm = (v_det - mean_orig) / std_orig
    return grid, v_norm, mean_orig, std_orig


# ─────────────────────────────────────────────────────────────────────────
# Joint multi-component OLS — captures amplitude AND phase
# ─────────────────────────────────────────────────────────────────────────

def fit_8h_formula(t, y, n_values):
    """Jointly fit y(t) = c + Σ_n [a_n cos(ω_n t) + b_n sin(ω_n t)].
    Returns: list of dicts {n, period_kyr, amp, phase_rad, a, b}."""
    omegas = [2 * np.pi * n / EIGHT_H for n in n_values]
    n_obs  = len(t)
    n_comp = len(n_values)
    X = np.zeros((n_obs, 1 + 2 * n_comp))
    X[:, 0] = 1.0
    for i, omega in enumerate(omegas):
        X[:, 1 + 2*i] = np.cos(omega * t)
        X[:, 2 + 2*i] = np.sin(omega * t)
    beta, _, _, svals = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((y - y_hat)**2))
    ss_tot = float(np.sum((y - y.mean())**2))
    r2 = 1.0 - ss_res/ss_tot
    cond = float(svals[0] / svals[-1])
    intercept = float(beta[0])
    components = []
    for i, n in enumerate(n_values):
        a = float(beta[1 + 2*i])
        b = float(beta[2 + 2*i])
        amp   = float(np.sqrt(a**2 + b**2))
        phase = float(np.arctan2(b, a))   # radians; C(t) = amp cos(ωt - phase)
        # NOTE: the standard convention "cos(ωt + φ)" matches phase = -arctan2(b, a).
        # We use the explicit form (a cos + b sin) for unambiguous reconstruction.
        components.append({
            "n": int(n),
            "period_kyr": EIGHT_H / n,
            "a_cos": a,
            "b_sin": b,
            "amp": amp,
            "phase_atan2_rad": phase,
            "label": LABELS.get(n, "unidentified"),
        })
    return {"intercept": intercept, "components": components,
            "r2": r2, "ss_res": ss_res, "ss_tot": ss_tot, "condition": cond,
            "y_hat": y_hat}


def evaluate_formula(t_eval, intercept, components):
    """Reconstruct C(t) from fitted intercept + components at arbitrary t."""
    C = np.full_like(t_eval, intercept, dtype=float)
    for c in components:
        omega = 2 * np.pi * c["n"] / EIGHT_H
        C += c["a_cos"] * np.cos(omega * t_eval) + c["b_sin"] * np.sin(omega * t_eval)
    return C


# ─────────────────────────────────────────────────────────────────────────
# Forward-projection + climate-event identification
# ─────────────────────────────────────────────────────────────────────────

def find_climate_events(t, C, top_n=5):
    """Find local maxima (glacial maxima) and minima (interglacial peaks) in C(t).
    Returns lists of (t, C) tuples sorted by amplitude (most prominent first)."""
    glacial_idx, _ = find_peaks(C, prominence=0.3)
    intergl_idx, _ = find_peaks(-C, prominence=0.3)

    glacial = [(float(t[i]), float(C[i])) for i in glacial_idx]
    intergl = [(float(t[i]), float(C[i])) for i in intergl_idx]
    # Sort by time (oldest=most-positive-t first, or for future we want soonest)
    glacial.sort(key=lambda x: x[0])
    intergl.sort(key=lambda x: x[0])
    return glacial, intergl


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H CLIMATE FORMULA — FIT + FORWARD PROJECTION")
    print("=" * 78)
    print(f"H = {H} kyr;  8H = {EIGHT_H} kyr")
    print(f"Components: {len(CLIMATE_INTEGERS)} integer divisors of 8H (doc 17 §2.2 + pre-MPT additions from §3.3)")

    ages, vals = load_lr04()
    t, y, mean_orig, std_orig = preprocess(ages, vals)
    print(f"\nLR04: {len(t)} samples, age 0-{t.max():.0f} kyr BP")
    print(f"Detrend + normalize: original detrended mean={mean_orig:.4f}, std={std_orig:.4f}")

    # ─────────────────────────────────────────────────────────────────────
    # 1. Joint fit
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 78)
    print(f"1. JOINT {len(CLIMATE_INTEGERS)}-COMPONENT OLS FIT ON LR04 (T = 5320 kyr)")
    print("=" * 78)
    fit = fit_8h_formula(t, y, CLIMATE_INTEGERS)
    print(f"\n  R² = {fit['r2']:.4f}  |  condition number = {fit['condition']:.1f}")
    print(f"  Intercept = {fit['intercept']:.4f}")
    print(f"\n  {'n':>4}  {'period':>8}  {'amp':>7}  {'phase':>7}  label")
    print(f"  {'-'*4}  {'-'*8}  {'-'*7}  {'-'*7}  {'-'*60}")
    for c in fit["components"]:
        phase_deg = np.degrees(c["phase_atan2_rad"])
        print(f"  {c['n']:>4}  {c['period_kyr']:>6.2f}  {c['amp']:>7.4f}  {phase_deg:>6.1f}°  {c['label']}")

    # ─────────────────────────────────────────────────────────────────────
    # 2. Validation against LR04
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 78)
    print("2. VALIDATION — formula reconstruction vs actual LR04")
    print("=" * 78)
    residual = y - fit["y_hat"]
    print(f"  Residual std       = {residual.std():.4f}  (signal std = 1.000 by normalization)")
    print(f"  Variance explained = {100*fit['r2']:.1f}%")
    print(f"  Max |residual|     = {np.abs(residual).max():.3f}")

    # ─────────────────────────────────────────────────────────────────────
    # 3. Forward projection — next 250 kyr
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 78)
    print("3. FORWARD PROJECTION — climate prediction for the next 250 kyr")
    print("=" * 78)
    print(f"  Convention: t = age in kyr BP. t < 0 = future. t = 0 ≈ today (1950 CE).")
    print(f"  C(t) is normalized δ¹⁸O proxy. POSITIVE = colder/more ice (glacial).")
    print(f"  NEGATIVE = warmer/less ice (interglacial).")

    t_future = np.arange(-250, 0.001, 0.5)  # 0.5 kyr resolution
    C_future = evaluate_formula(t_future, fit["intercept"], fit["components"])

    # Convert normalized back to δ¹⁸O units for interpretability (informational)
    C_future_d18o = C_future * std_orig + mean_orig

    # Find peaks (glacial maxima) and troughs (interglacial peaks)
    glacial, intergl = find_climate_events(t_future, C_future)

    # Sort by time (most recent first, i.e., closest to t=0)
    glacial_future = sorted([(t_v, C_v) for t_v, C_v in glacial if t_v < 0], key=lambda x: -x[0])
    intergl_future = sorted([(t_v, C_v) for t_v, C_v in intergl if t_v < 0], key=lambda x: -x[0])

    print(f"\n  Found {len(glacial_future)} predicted glacial maxima and {len(intergl_future)} predicted interglacial peaks in the next 250 kyr.")

    print(f"\n  --- NEXT GLACIAL MAXIMA (predicted local maxima of C(t)) ---")
    print(f"  {'kyr from now':>14}  {'date (CE)':>14}  {'C(t)':>7}  {'δ¹⁸O':>7}")
    print(f"  {'-'*14}  {'-'*14}  {'-'*7}  {'-'*7}")
    for t_v, C_v in glacial_future[:6]:
        kyr_ahead = -t_v
        year_ce = 1950 + kyr_ahead * 1000
        d18o = C_v * std_orig + mean_orig
        print(f"  {kyr_ahead:>13.1f}  {year_ce:>13.0f}   {C_v:>+7.3f}  {d18o:>+7.3f}")

    print(f"\n  --- NEXT INTERGLACIAL PEAKS (predicted local minima of C(t)) ---")
    print(f"  {'kyr from now':>14}  {'date (CE)':>14}  {'C(t)':>7}  {'δ¹⁸O':>7}")
    print(f"  {'-'*14}  {'-'*14}  {'-'*7}  {'-'*7}")
    for t_v, C_v in intergl_future[:6]:
        kyr_ahead = -t_v
        year_ce = 1950 + kyr_ahead * 1000
        d18o = C_v * std_orig + mean_orig
        print(f"  {kyr_ahead:>13.1f}  {year_ce:>13.0f}   {C_v:>+7.3f}  {d18o:>+7.3f}")

    # Current value at t = 0
    C_now = evaluate_formula(np.array([0.0]), fit["intercept"], fit["components"])[0]
    d18o_now = C_now * std_orig + mean_orig
    print(f"\n  C(t=0) = {C_now:+.3f}  (Holocene; normalized)  →  δ¹⁸O = {d18o_now:+.3f}")
    if C_now < 0:
        print(f"  Status: INTERGLACIAL  (formula consistent with Holocene warmth)")
    else:
        print(f"  Status: glacial  (would be inconsistent with Holocene — flag for review)")

    # ─────────────────────────────────────────────────────────────────────
    # 4. Sanity check: reconstruct last 200 kyr and compare to actual LR04
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 78)
    print("4. SANITY CHECK — reconstruct past 200 kyr and compare to actual LR04")
    print("=" * 78)
    t_past = np.arange(0, 200.5, 1.0)
    C_past = evaluate_formula(t_past, fit["intercept"], fit["components"])
    # Get actual LR04 values at these ages (using interpolation onto regular grid we already have)
    mask = (t >= 0) & (t <= 200)
    t_actual = t[mask]
    y_actual = y[mask]
    # Sample reconstruction at the same ages
    C_at_actual = evaluate_formula(t_actual, fit["intercept"], fit["components"])
    past_r2 = 1.0 - np.sum((y_actual - C_at_actual)**2) / np.sum((y_actual - y_actual.mean())**2)
    print(f"  Past-200-kyr local R² = {past_r2:.4f}")

    glacial_past, intergl_past = find_climate_events(t_past, C_past)
    print(f"\n  --- PREDICTED PAST glacial maxima (last 200 kyr, sorted oldest first) ---")
    for t_v, C_v in glacial_past:
        print(f"    {t_v:>5.1f} kyr BP   C(t) = {C_v:+.3f}")
    print(f"\n  Comparison reference: actual recent glacial maxima in LR04 record:")
    print(f"    Last Glacial Maximum (LGM) ≈ 20 kyr BP")
    print(f"    Penultimate glacial (MIS 6) ≈ 140 kyr BP")
    print(f"    MIS 8 glacial ≈ 250 kyr BP (outside this 200-kyr window)")

    # ─────────────────────────────────────────────────────────────────────
    # Save
    # ─────────────────────────────────────────────────────────────────────
    out = {
        "meta": {
            "script": "milankovitch_climate_formula.py",
            "H_kyr": H, "8H_kyr": EIGHT_H,
            "n_components": len(CLIMATE_INTEGERS),
            "integers": CLIMATE_INTEGERS,
            "convention": "t = age in kyr BP; t<0 = future; C(t) normalized δ¹⁸O (positive=colder)",
            "normalization": {"original_mean": mean_orig, "original_std": std_orig},
        },
        "fit": {
            "r2": fit["r2"],
            "condition": fit["condition"],
            "intercept": fit["intercept"],
            "components": fit["components"],
            "residual_std": float(residual.std()),
            "max_residual": float(np.abs(residual).max()),
        },
        "validation_past_200kyr_r2": float(past_r2),
        "forward_projection": {
            "C_at_t_0_normalized": float(C_now),
            "C_at_t_0_d18o": float(d18o_now),
            "glacial_maxima_future_kyrBP": [{"t_kyr_BP": float(t_v),
                                              "kyr_from_now": float(-t_v),
                                              "year_CE": int(1950 + (-t_v)*1000),
                                              "C_normalized": float(C_v)}
                                             for t_v, C_v in glacial_future],
            "interglacial_peaks_future_kyrBP": [{"t_kyr_BP": float(t_v),
                                                  "kyr_from_now": float(-t_v),
                                                  "year_CE": int(1950 + (-t_v)*1000),
                                                  "C_normalized": float(C_v)}
                                                 for t_v, C_v in intergl_future],
        },
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\n[saved] {OUT_PATH}")
    print(f"[elapsed] {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

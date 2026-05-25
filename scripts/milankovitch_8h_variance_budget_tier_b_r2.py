#!/usr/bin/env python3
"""
MILANKOVITCH 8H VARIANCE BUDGET — TIER B ROUND 2 (doc 18)
============================================================

Round 2 follow-up to milankovitch_8h_variance_budget_tier_b.py. Five
remaining open tests:

  • B5 — Step components at named Cenozoic transitions. Adds Heaviside
         H(t - t_i) covariates at PETM (56 Ma), EOT (34 Ma), Mi-1 (23
         Ma), MMCT (14 Ma), iNHG (2.7 Ma), MPT (1 Ma) jointly with
         periodic components. Tests whether explicit amplitude-step
         modelling captures variance beyond piecewise detrend.

  • C2 — Cross-record phase coherence. For each L2 line (405-kyr, 202,
         135, 13H, 9-Myr), fit phase independently on LR04 (0-5320 kyr)
         and CENOGRID restricted to the same 0-5320 kyr overlap window.
         Real L2 lines should show |Δφ| < 36° between proxies. Spurious
         lines should show random phase.

  • C10 — EPICA CO₂ pipeline. CO₂ is a direct carbon-cycle probe; the
          L2 framework predicts L2 lines should appear with stronger
          carbon-amplification than CENOGRID δ¹³C. EPICA covers 0-805
          kyr only — tests L2 lines that fit in this window (405-kyr,
          202, 135 kyr; not 13H or 9-Myr).

  • C5 — Forward-prediction validation. Train the 25-component fit on
         pre-MPT LR04 (1.2-3.0 Ma); apply the fitted formula to
         post-MPT (0-1.0 Ma); measure prediction R² vs actual. Tests
         generalization (training R² minus held-out R²).

  • D1 — Proxy-aware component separation. From the Round-1 C8
         classification (ratio > 1.3 = L2, < 0.7 = L1, mixed
         in-between), fit only the L1-classified components on
         CENOGRID δ¹⁸O and only the L2-classified on δ¹³C. Compares
         to the "all components on both proxies" baseline.

Output: data/milankovitch-8h-tier-b-round2.json
Run:    python3 scripts/milankovitch_8h_variance_budget_tier_b_r2.py
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
EPICA_PATH = DATA_DIR / "epica-co2-bereiter2015.txt"
OUT_PATH = DATA_DIR / "milankovitch-8h-tier-b-round2.json"

H = 335.317
EIGHT_H = 8 * H

BASE_25 = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
           38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]
SIDEBANDS_6 = [96, 107, 110, 134, 152, 185]
EXTENDED_31 = sorted(BASE_25 + SIDEBANDS_6)

PERIOD_405K = 404.5
PERIOD_13H = 13.0 * H
PERIOD_9M = 9000.0

# 405-kyr harmonics confirmed in Round 1
HARMONICS_405K_KEEP = {
    "n2_202": PERIOD_405K / 2,
    "n3_135": PERIOD_405K / 3,
}

# Cenozoic transitions for step / piecewise (Ma)
CENOZOIC_TRANSITIONS_MA = [56.0, 34.0, 23.0, 14.0, 2.7, 1.0]
TRANSITION_LABELS = ["PETM", "EOT", "Mi-1", "MMCT", "iNHG", "MPT"]

# Round-1 C8 classification thresholds (per the joint-fit ratio)
L1_RATIO_MAX = 0.7   # ratio < 0.7  → L1 (direct insolation)
L2_RATIO_MIN = 1.3   # ratio > 1.3  → L2 (carbon-amplified)
# 0.7 <= ratio <= 1.3 → "mixed"


# ─────────────────────────────────────────────────────────────────────────
# Loaders
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


def load_cenogrid():
    ages_ma, d13c, d18o = [], [], []
    with CENOGRID_PATH.open() as f:
        in_data = False
        for line in f:
            s = line.rstrip("\n")
            if not in_data:
                if s.startswith("Tuned time"):
                    in_data = True
                continue
            if not s.strip():
                continue
            parts = s.split("\t")
            if len(parts) < 9:
                continue
            try:
                t_ma = float(parts[0])
                v_c = float(parts[7])
                v_o = float(parts[8])
            except ValueError:
                continue
            ages_ma.append(t_ma)
            d13c.append(v_c)
            d18o.append(v_o)
    return np.array(ages_ma) * 1000.0, np.array(d13c), np.array(d18o)


def load_epica_co2():
    """EPICA CO₂ Bereiter2015. Returns (ages_kyr, co2_ppm).
    File format: age(yr) co2(ppm) sigma_co2(ppm), comments start with '#'."""
    ages_yr, co2 = [], []
    with EPICA_PATH.open() as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            parts = s.split()
            if len(parts) < 2:
                continue
            try:
                a = float(parts[0])
                v = float(parts[1])
            except ValueError:
                continue
            ages_yr.append(a)
            co2.append(v)
    return np.array(ages_yr) / 1000.0, np.array(co2)


# ─────────────────────────────────────────────────────────────────────────
# Preprocessing
# ─────────────────────────────────────────────────────────────────────────

def detrend_linear(t, y):
    return detrend(y, type="linear")


def detrend_piecewise_linear(t, y, breakpoints_kyr):
    edges = sorted(set([float(t[0])] + list(breakpoints_kyr) + [float(t[-1])]))
    y_resid = np.copy(y)
    for i in range(len(edges) - 1):
        lo, hi = edges[i], edges[i + 1]
        mask = (t >= lo) & (t <= hi)
        if mask.sum() < 2:
            continue
        t_seg, y_seg = t[mask], y[mask]
        coeffs = np.polyfit(t_seg, y_seg, 1)
        y_resid[mask] = y_seg - np.polyval(coeffs, t_seg)
    return y_resid


def normalize(y):
    return (y - y.mean()) / y.std()


def preprocess(ages_kyr, vals, window, dt_kyr, detrend_fn):
    lo, hi = window
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a = ages_kyr[mask]
    v = vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt_kyr / 2, dt_kyr)
    v_grid = np.interp(grid, a, v)
    v_det = detrend_fn(grid, v_grid)
    return grid, normalize(v_det)


# ─────────────────────────────────────────────────────────────────────────
# Fit machinery
# ─────────────────────────────────────────────────────────────────────────

def build_X(t, periods_kyr, step_breakpoints_kyr=None):
    """Design matrix: constant + (cos,sin) per period + step terms.
    Step terms = Heaviside H(t - t_i) for each breakpoint (1 column each)."""
    n_obs = len(t)
    n_comp = len(periods_kyr)
    n_steps = len(step_breakpoints_kyr) if step_breakpoints_kyr else 0
    X = np.zeros((n_obs, 1 + 2 * n_comp + n_steps))
    X[:, 0] = 1.0
    for i, p in enumerate(periods_kyr):
        omega = 2 * np.pi / p
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    if step_breakpoints_kyr:
        for i, tp in enumerate(step_breakpoints_kyr):
            X[:, 1 + 2 * n_comp + i] = (t >= tp).astype(float)
    return X


def fit_components(t, y, periods_kyr, step_breakpoints_kyr=None):
    n_comp = len(periods_kyr)
    X = build_X(t, periods_kyr, step_breakpoints_kyr)
    beta, _, _, svals = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot
    cond = float(svals[0] / svals[-1]) if len(svals) > 1 else 1.0
    comps = []
    for i, p in enumerate(periods_kyr):
        a = float(beta[1 + 2 * i])
        b = float(beta[2 + 2 * i])
        phase = float(np.arctan2(b, a))  # radians
        comps.append({
            "period_kyr": float(p),
            "amp": float(np.sqrt(a * a + b * b)),
            "phase_rad": phase,
            "phase_deg": float(np.degrees(phase)),
            "a_cos": a,
            "b_sin": b,
        })
    step_betas = []
    if step_breakpoints_kyr:
        for i in range(len(step_breakpoints_kyr)):
            step_betas.append(float(beta[1 + 2 * n_comp + i]))
    return {"r2": r2, "condition": cond, "n_components": n_comp,
            "n_steps": len(step_breakpoints_kyr) if step_breakpoints_kyr else 0,
            "components": comps, "step_betas": step_betas,
            "intercept": float(beta[0]), "y_hat": y_hat,
            "beta": beta.tolist()}


def integers_to_periods(integers):
    return [EIGHT_H / n for n in integers]


# ─────────────────────────────────────────────────────────────────────────
# B5 — Step components at Cenozoic transitions
# ─────────────────────────────────────────────────────────────────────────

def stage_b5_step_components(ages_cgd, d13c, d18o):
    print("\n" + "=" * 78)
    print("B5 — STEP COMPONENTS AT CENOZOIC TRANSITIONS")
    print("=" * 78)
    print(f"  Transitions: {dict(zip(TRANSITION_LABELS, CENOZOIC_TRANSITIONS_MA))}")
    print(f"  Detrend: LINEAR ONLY (step components handle the level changes)")

    bp_kyr = [t * 1000 for t in CENOZOIC_TRANSITIONS_MA]
    window = (0, 67000)
    dt = 5.0
    periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_13H, PERIOD_9M] + \
              list(HARMONICS_405K_KEEP.values())

    out = {}
    for proxy_name, vals in [("d18o", d18o), ("d13c", d13c)]:
        t, y = preprocess(ages_cgd, vals, window, dt, detrend_linear)
        # Baseline: just periodic (linear detrend, no step)
        fit_base = fit_components(t, y, periods)
        # + step components
        fit_step = fit_components(t, y, periods, step_breakpoints_kyr=bp_kyr)
        delta = fit_step["r2"] - fit_base["r2"]
        print(f"\n  Proxy: δ¹{'⁸O' if proxy_name == 'd18o' else '³C'}")
        print(f"    Periodic only (linear detrend)            R² = {fit_base['r2']:.4f}")
        print(f"    Periodic + 6 step components              R² = {fit_step['r2']:.4f}  Δ = {delta:+.4f}")
        print(f"    Step amplitudes per transition:")
        for label, b in zip(TRANSITION_LABELS, fit_step["step_betas"]):
            print(f"      {label:6s}  β = {b:+.4f}")
        out[proxy_name] = {
            "r2_baseline": fit_base["r2"],
            "r2_with_steps": fit_step["r2"],
            "delta_r2": delta,
            "step_betas": dict(zip(TRANSITION_LABELS, fit_step["step_betas"])),
        }
    return out


# ─────────────────────────────────────────────────────────────────────────
# C2 — Cross-record phase coherence
# ─────────────────────────────────────────────────────────────────────────

def stage_c2_phase_coherence(ages_lr04, vals_lr04, ages_cgd, d13c, d18o):
    print("\n" + "=" * 78)
    print("C2 — CROSS-RECORD PHASE COHERENCE (LR04 vs CENOGRID overlap)")
    print("=" * 78)
    print("  For each L2 line, fit phase on LR04 (0-5320 kyr) and CENOGRID (0-5320 kyr).")
    print("  Real L2 lines should show |Δφ| < 36° (0.6 rad); spurious lines random.")

    window = (0, 5320)
    bp_kyr = [t * 1000 for t in CENOZOIC_TRANSITIONS_MA if t * 1000 < window[1]]

    # LR04: 1 kyr binning, linear detrend
    t_lr, y_lr = preprocess(ages_lr04, vals_lr04, window, 1.0, detrend_linear)
    # CENOGRID restricted to overlap window: 5 kyr binning, piecewise detrend
    t_c, y_d13c = preprocess(ages_cgd, d13c, window, 5.0,
                              lambda t, y: detrend_piecewise_linear(t, y, bp_kyr) if bp_kyr else detrend_linear(t, y))
    _, y_d18o = preprocess(ages_cgd, d18o, window, 5.0,
                            lambda t, y: detrend_piecewise_linear(t, y, bp_kyr) if bp_kyr else detrend_linear(t, y))

    # Test L2 lines that fit in this 5320-kyr window
    test_lines = [
        ("405-kyr", PERIOD_405K),
        ("202-kyr (2nd harmonic)", HARMONICS_405K_KEEP["n2_202"]),
        ("135-kyr (3rd harmonic)", HARMONICS_405K_KEEP["n3_135"]),
        ("13H 4.36 Myr", PERIOD_13H),  # only 1.22 cycles — under-resolved
        ("9-Myr", PERIOD_9M),           # only 0.59 cycles — under-resolved
    ]
    # Also test a few selected lattice lines from C8 (the strongly-L2 ones)
    lattice_strong_l2 = [(f"8H/22 (122 kyr)", EIGHT_H / 22),
                         (f"8H/9 (298 kyr)", EIGHT_H / 9),
                         (f"8H/38 (71 kyr)", EIGHT_H / 38),
                         (f"8H/65 (41 kyr — obliquity)", EIGHT_H / 65)]
    all_lines = test_lines + lattice_strong_l2

    print(f"\n  {'label':32s} {'period':>8s} {'φ_LR04':>9s} {'φ_d18o':>9s} {'φ_d13c':>9s} {'|Δ(LR04-d18o)|':>16s} {'|Δ(LR04-d13c)|':>16s} {'coherent?':>11s}")
    rows = []
    for label, p in all_lines:
        # Single-component fits (just constant + this cos/sin pair)
        f_lr = fit_components(t_lr, y_lr, [p])
        f_o = fit_components(t_c, y_d18o, [p])
        f_c = fit_components(t_c, y_d13c, [p])
        ph_lr = f_lr["components"][0]["phase_rad"]
        ph_o = f_o["components"][0]["phase_rad"]
        ph_c = f_c["components"][0]["phase_rad"]

        def angle_diff(a, b):
            d = abs(a - b)
            return min(d, 2 * np.pi - d)

        d_lr_o = float(angle_diff(ph_lr, ph_o))
        d_lr_c = float(angle_diff(ph_lr, ph_c))
        d_o_c = float(angle_diff(ph_o, ph_c))
        threshold = np.radians(36)  # 36° threshold
        coherent_lr_o = d_lr_o < threshold
        coherent_lr_c = d_lr_c < threshold
        coherent = coherent_lr_o and coherent_lr_c

        print(f"  {label:32s} {p:>8.1f} {np.degrees(ph_lr):>8.1f}° {np.degrees(ph_o):>8.1f}° {np.degrees(ph_c):>8.1f}° {np.degrees(d_lr_o):>15.1f}° {np.degrees(d_lr_c):>15.1f}° {'✓' if coherent else '✗':>11s}")
        rows.append({
            "label": label,
            "period_kyr": float(p),
            "phase_lr04_deg": float(np.degrees(ph_lr)),
            "phase_cenogrid_d18o_deg": float(np.degrees(ph_o)),
            "phase_cenogrid_d13c_deg": float(np.degrees(ph_c)),
            "abs_dphi_lr04_to_d18o_deg": float(np.degrees(d_lr_o)),
            "abs_dphi_lr04_to_d13c_deg": float(np.degrees(d_lr_c)),
            "abs_dphi_d18o_to_d13c_deg": float(np.degrees(d_o_c)),
            "coherent_lr04_d18o": bool(coherent_lr_o),
            "coherent_lr04_d13c": bool(coherent_lr_c),
        })
    return {"lines": rows, "threshold_deg": 36}


# ─────────────────────────────────────────────────────────────────────────
# C10 — EPICA CO₂ pipeline
# ─────────────────────────────────────────────────────────────────────────

def stage_c10_epica(ages_lr04, vals_lr04):
    print("\n" + "=" * 78)
    print("C10 — EPICA CO₂ PIPELINE (independent carbon-cycle proxy, 0-800 kyr)")
    print("=" * 78)
    ages_ep, co2 = load_epica_co2()
    print(f"  EPICA samples: {len(ages_ep)}, range {ages_ep.min():.1f}-{ages_ep.max():.1f} kyr BP")

    # Match LR04 to the EPICA window for joint analysis
    window = (0, 805)  # EPICA covers 0-805 kyr
    dt = 1.0

    # EPICA: linear detrend (no major transitions in this window except MPT at 1 Ma, just outside)
    t_ep, y_ep = preprocess(ages_ep, co2, window, dt, detrend_linear)
    t_lr, y_lr = preprocess(ages_lr04, vals_lr04, window, dt, detrend_linear)

    # Filter periods that fit in 805 kyr: skip 13H, 9-Myr (too long); keep 31 + 405-kyr + 202 + 135
    periods_test = integers_to_periods(EXTENDED_31) + [PERIOD_405K] + list(HARMONICS_405K_KEEP.values())
    labels = []
    for n in EXTENDED_31:
        labels.append(f"8H/{n}")
    labels += ["405-kyr", "202-kyr (2nd h)", "135-kyr (3rd h)"]

    fit_ep = fit_components(t_ep, y_ep, periods_test)
    fit_lr = fit_components(t_lr, y_lr, periods_test)
    print(f"  R² EPICA CO₂      = {fit_ep['r2']:.4f}")
    print(f"  R² LR04 (0-805)   = {fit_lr['r2']:.4f}  (same window, for comparison)")

    # Compute per-component amp ratio: CO₂_amp / LR04_amp
    # CO₂ is a direct carbon-cycle probe; if a component is L2 (carbon-amplified)
    # we expect the CO₂ amplitude to be relatively larger than LR04 (δ¹⁸O).
    rows = []
    for label, c_ep, c_lr in zip(labels, fit_ep["components"], fit_lr["components"]):
        amp_co2 = c_ep["amp"]
        amp_lr = c_lr["amp"]
        ratio = amp_co2 / amp_lr if amp_lr > 1e-6 else None
        rows.append({
            "label": label,
            "period_kyr": c_ep["period_kyr"],
            "amp_epica_co2": amp_co2,
            "amp_lr04": amp_lr,
            "co2_over_lr04_amp_ratio": ratio,
        })

    # Sort by ratio (highest CO₂ amplification first)
    rows_sorted = sorted([r for r in rows if r["co2_over_lr04_amp_ratio"] is not None],
                         key=lambda r: -r["co2_over_lr04_amp_ratio"])
    print(f"\n  Top 12 components by CO₂/LR04 amp ratio (L2 carbon-amplification on CO₂):")
    print(f"  {'label':18s} {'period(kyr)':>12s} {'amp_CO₂':>10s} {'amp_LR04':>10s} {'ratio':>8s}")
    for r in rows_sorted[:12]:
        print(f"  {r['label']:18s} {r['period_kyr']:>12.2f} {r['amp_epica_co2']:>10.4f} {r['amp_lr04']:>10.4f} {r['co2_over_lr04_amp_ratio']:>8.2f}")

    return {
        "epica_samples": int(len(ages_ep)),
        "window_kyr": list(window),
        "r2_epica": fit_ep["r2"],
        "r2_lr04_same_window": fit_lr["r2"],
        "components_sorted_by_ratio": rows_sorted,
    }


# ─────────────────────────────────────────────────────────────────────────
# C5 — Forward-prediction validation
# ─────────────────────────────────────────────────────────────────────────

def stage_c5_forward_prediction(ages_lr04, vals_lr04):
    print("\n" + "=" * 78)
    print("C5 — FORWARD PREDICTION (train pre-MPT, predict post-MPT)")
    print("=" * 78)

    # Train on pre-MPT 1200-3000 kyr
    t_pre, y_pre = preprocess(ages_lr04, vals_lr04, (1200, 3000), 1.0, detrend_linear)
    # Test on post-MPT 0-1000 kyr — apply the SAME detrending pipeline
    t_post, y_post = preprocess(ages_lr04, vals_lr04, (0, 1000), 1.0, detrend_linear)

    periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K] + list(HARMONICS_405K_KEEP.values())

    # Fit on pre-MPT
    fit_pre = fit_components(t_pre, y_pre, periods)
    print(f"  Training (pre-MPT 1.2-3.0 Ma, 31 ints + 3 L2 lines)")
    print(f"    Training R² = {fit_pre['r2']:.4f}")

    # Predict at post-MPT timestamps using pre-MPT fit
    X_post = build_X(t_post, periods)
    y_pred = X_post @ fit_pre["beta"]
    ss_res_pred = np.sum((y_post - y_pred) ** 2)
    ss_tot_post = np.sum((y_post - y_post.mean()) ** 2)
    r2_pred = 1 - ss_res_pred / ss_tot_post
    print(f"  Prediction R² on post-MPT (held-out) = {r2_pred:.4f}")

    # Compare to in-sample post-MPT R² for reference
    fit_post = fit_components(t_post, y_post, periods)
    print(f"  In-sample post-MPT R² (re-fit on post)  = {fit_post['r2']:.4f}")
    print(f"  Generalization gap (in-sample − pred)   = {fit_post['r2'] - r2_pred:+.4f}")

    # Also test the reverse: train on post-MPT, predict pre-MPT
    fit_post_train = fit_components(t_post, y_post, periods)
    X_pre = build_X(t_pre, periods)
    y_pred_pre = X_pre @ fit_post_train["beta"]
    ss_res_pred_pre = np.sum((y_pre - y_pred_pre) ** 2)
    ss_tot_pre = np.sum((y_pre - y_pre.mean()) ** 2)
    r2_pred_pre = 1 - ss_res_pred_pre / ss_tot_pre
    print(f"\n  Reverse: train post-MPT, predict pre-MPT")
    print(f"    Training R² (post) = {fit_post_train['r2']:.4f}")
    print(f"    Prediction R² (pre, held-out) = {r2_pred_pre:.4f}")
    print(f"    In-sample pre-MPT R² = {fit_pre['r2']:.4f}")
    print(f"    Generalization gap = {fit_pre['r2'] - r2_pred_pre:+.4f}")

    return {
        "train_pre_predict_post": {
            "r2_train_pre": fit_pre["r2"],
            "r2_predict_post": float(r2_pred),
            "r2_insample_post": fit_post["r2"],
            "generalization_gap": float(fit_post["r2"] - r2_pred),
        },
        "train_post_predict_pre": {
            "r2_train_post": fit_post_train["r2"],
            "r2_predict_pre": float(r2_pred_pre),
            "r2_insample_pre": fit_pre["r2"],
            "generalization_gap": float(fit_pre["r2"] - r2_pred_pre),
        },
    }


# ─────────────────────────────────────────────────────────────────────────
# D1 — Proxy-aware component separation
# ─────────────────────────────────────────────────────────────────────────

def stage_d1_proxy_aware(ages_cgd, d13c, d18o):
    """Use Round-1 C8 classification (ratio thresholds) to partition components
    into L1 (ratio < 0.7), L2 (ratio > 1.3), mixed (in between). Then fit:
      - L1-only on δ¹⁸O
      - L2-only on δ¹³C
    Compare to "all components on both" baseline."""
    print("\n" + "=" * 78)
    print("D1 — PROXY-AWARE COMPONENT SEPARATION")
    print("=" * 78)
    print(f"  Thresholds: L1 ratio < {L1_RATIO_MAX}, L2 ratio > {L2_RATIO_MIN}, else 'mixed'.")

    # Re-run C8 quickly to get per-component ratios
    breakpoints = [t * 1000 for t in CENOZOIC_TRANSITIONS_MA]
    window = (0, 67000)
    dt = 5.0
    t_o, y_o = preprocess(ages_cgd, d18o, window, dt,
                          lambda t, y: detrend_piecewise_linear(t, y, breakpoints))
    t_c, y_c = preprocess(ages_cgd, d13c, window, dt,
                          lambda t, y: detrend_piecewise_linear(t, y, breakpoints))

    periods_all = []
    labels_all = []
    for n in EXTENDED_31:
        periods_all.append(EIGHT_H / n)
        labels_all.append(f"8H/{n}")
    periods_all += [PERIOD_405K, PERIOD_13H, PERIOD_9M]
    labels_all += ["405-kyr", "13H", "9-Myr"]
    for hname, p in HARMONICS_405K_KEEP.items():
        periods_all.append(p)
        labels_all.append(f"405k_{hname}")

    # Joint fit to get per-component amp ratio
    fit_o = fit_components(t_o, y_o, periods_all)
    fit_c = fit_components(t_c, y_c, periods_all)

    classification = []
    l1_periods, l2_periods, mixed_periods = [], [], []
    for label, p, c_o, c_c in zip(labels_all, periods_all, fit_o["components"], fit_c["components"]):
        ratio = c_c["amp"] / c_o["amp"] if c_o["amp"] > 1e-6 else None
        if ratio is None:
            cls = "—"
        elif ratio > L2_RATIO_MIN:
            cls = "L2"
            l2_periods.append(p)
        elif ratio < L1_RATIO_MAX:
            cls = "L1"
            l1_periods.append(p)
        else:
            cls = "mixed"
            mixed_periods.append(p)
        classification.append({
            "label": label, "period_kyr": float(p),
            "amp_d18o": c_o["amp"], "amp_d13c": c_c["amp"],
            "ratio": float(ratio) if ratio is not None else None,
            "classification": cls,
        })

    n_l1 = len(l1_periods)
    n_l2 = len(l2_periods)
    n_mx = len(mixed_periods)
    print(f"\n  Component classification: L1={n_l1}, mixed={n_mx}, L2={n_l2}")

    # Proxy-aware fits
    print(f"\n  Proxy-aware fits:")
    print(f"  Configuration                              R² δ¹⁸O   R² δ¹³C")
    print(f"  {'-'*70}")
    # All on both
    print(f"  All {len(periods_all):3d} components on both proxies (R1 C8)  "
          f"{fit_o['r2']:>7.4f}   {fit_c['r2']:>7.4f}")
    # L1 only on each
    fit_o_l1 = fit_components(t_o, y_o, l1_periods + mixed_periods) if (l1_periods or mixed_periods) else None
    fit_c_l1 = fit_components(t_c, y_c, l1_periods + mixed_periods) if (l1_periods or mixed_periods) else None
    print(f"  L1+mixed only ({n_l1+n_mx} comp)                       "
          f"{fit_o_l1['r2']:>7.4f}   {fit_c_l1['r2']:>7.4f}")
    # L2 only on each
    fit_o_l2 = fit_components(t_o, y_o, l2_periods + mixed_periods) if (l2_periods or mixed_periods) else None
    fit_c_l2 = fit_components(t_c, y_c, l2_periods + mixed_periods) if (l2_periods or mixed_periods) else None
    print(f"  L2+mixed only ({n_l2+n_mx} comp)                       "
          f"{fit_o_l2['r2']:>7.4f}   {fit_c_l2['r2']:>7.4f}")
    # Strict L1 only
    if l1_periods:
        fit_o_strict = fit_components(t_o, y_o, l1_periods)
        fit_c_strict = fit_components(t_c, y_c, l1_periods)
        print(f"  L1 strict only ({n_l1} comp)                           "
              f"{fit_o_strict['r2']:>7.4f}   {fit_c_strict['r2']:>7.4f}")
    # Strict L2 only
    if l2_periods:
        fit_o_strict2 = fit_components(t_o, y_o, l2_periods)
        fit_c_strict2 = fit_components(t_c, y_c, l2_periods)
        print(f"  L2 strict only ({n_l2} comp)                           "
              f"{fit_o_strict2['r2']:>7.4f}   {fit_c_strict2['r2']:>7.4f}")

    return {
        "classification": classification,
        "n_l1": n_l1, "n_l2": n_l2, "n_mixed": n_mx,
        "all_components": {"r2_d18o": fit_o["r2"], "r2_d13c": fit_c["r2"]},
        "l1_plus_mixed": {"r2_d18o": fit_o_l1["r2"] if fit_o_l1 else None,
                          "r2_d13c": fit_c_l1["r2"] if fit_c_l1 else None},
        "l2_plus_mixed": {"r2_d18o": fit_o_l2["r2"] if fit_o_l2 else None,
                          "r2_d13c": fit_c_l2["r2"] if fit_c_l2 else None},
        "l1_strict": ({"r2_d18o": fit_o_strict["r2"], "r2_d13c": fit_c_strict["r2"]}
                      if l1_periods else None),
        "l2_strict": ({"r2_d18o": fit_o_strict2["r2"], "r2_d13c": fit_c_strict2["r2"]}
                      if l2_periods else None),
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H VARIANCE BUDGET — TIER B ROUND 2 (doc 18)")
    print("=" * 78)
    print(f"H = {H} kyr;  8H = {EIGHT_H:.3f} kyr")
    print(f"Round 2 stages: B5 + C2 + C10 + C5 + D1")

    ages_lr04, vals_lr04 = load_lr04()
    ages_cgd, d13c, d18o = load_cenogrid()
    print(f"  LR04:     {len(ages_lr04)} samples (0-{ages_lr04.max():.0f} kyr)")
    print(f"  CENOGRID: {len(ages_cgd)} samples (0-{ages_cgd.max()/1000:.1f} Ma)")

    out = {
        "config": {
            "H_kyr": H,
            "eight_H_kyr": EIGHT_H,
            "extended_integers": EXTENDED_31,
            "harmonics_kept_kyr": HARMONICS_405K_KEEP,
            "cenozoic_transitions_ma": CENOZOIC_TRANSITIONS_MA,
            "L1_ratio_max": L1_RATIO_MAX,
            "L2_ratio_min": L2_RATIO_MIN,
        }
    }

    out["b5_step_components"] = stage_b5_step_components(ages_cgd, d13c, d18o)
    out["c2_phase_coherence"] = stage_c2_phase_coherence(ages_lr04, vals_lr04, ages_cgd, d13c, d18o)
    out["c10_epica_co2"] = stage_c10_epica(ages_lr04, vals_lr04)
    out["c5_forward_prediction"] = stage_c5_forward_prediction(ages_lr04, vals_lr04)
    out["d1_proxy_aware"] = stage_d1_proxy_aware(ages_cgd, d13c, d18o)

    out["meta"] = {
        "script": str(SCRIPT_DIR / "milankovitch_8h_variance_budget_tier_b_r2.py"),
        "doc": "docs/18-climate-formula.md",
        "runtime_sec": time.time() - t0,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump(out, f, indent=2)
    print(f"\n  Total runtime: {time.time() - t0:.1f}s")
    print(f"  Output: {OUT_PATH}")


if __name__ == "__main__":
    main()

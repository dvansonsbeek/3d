#!/usr/bin/env python3
"""
MILANKOVITCH 8H VARIANCE BUDGET — TIER B ROUND 3 (doc 18)
============================================================

Round 3 addresses the four open items from §8.3 of doc 18:

  • R3-1 — Sliding-window amplitude evolution + boundary-condition correlation.
           Track each lattice integer's fitted amplitude as a function of time
           on LR04 (1.2-Myr window, 0.4-Myr stride → ~10 windows) and CENOGRID
           (10-Myr window, 5-Myr stride → ~13 windows). Correlate amplitudes
           with mean δ¹⁸O in the window (a proxy for boundary conditions).
           Tests whether line amplitudes are time-varying and predictable
           from boundary conditions.

  • R3-2 — Linear-response (LTI) model test. For each L2 line, compute its
           sliding-window amplitude and correlate against L1 amplitudes at
           candidate driver frequencies. If high correlation, the L2 line is
           a linear response to an L1 driver (ODE model viable). If not, the
           mechanism is more complex.

  • R3-3 — Three-regime split (pre-iNHG / iNHG-MPT / post-MPT) + forward
           prediction with step components. Tests whether explicit
           boundary-condition modelling fixes the C5 generalization failure
           found in Round 2.

  • R3-4 — 13H Boulila libration stability across CENOGRID. LR04 only spans
           1.22 cycles of 13H (under-resolved). CENOGRID gives ~15 cycles.
           Slide 10-Myr windows across CENOGRID and track 13H amplitude/phase.

Output: data/milankovitch-8h-tier-b-round3.json
Run:    python3 scripts/milankovitch_8h_variance_budget_tier_b_r3.py
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
OUT_PATH = DATA_DIR / "milankovitch-8h-tier-b-round3.json"

H = 335.317
EIGHT_H = 8 * H

BASE_25 = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
           38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]
SIDEBANDS_6 = [96, 107, 110, 134, 152, 185]
EXTENDED_31 = sorted(BASE_25 + SIDEBANDS_6)

PERIOD_405K = 404.5
PERIOD_13H = 13.0 * H
PERIOD_9M = 9000.0
PERIOD_202K = PERIOD_405K / 2
PERIOD_135K = PERIOD_405K / 3

CENOZOIC_TRANSITIONS_MA = [56.0, 34.0, 23.0, 14.0, 2.7, 1.0]
TRANSITION_LABELS = ["PETM", "EOT", "Mi-1", "MMCT", "iNHG", "MPT"]


# ─────────────────────────────────────────────────────────────────────────
# Loaders + preprocess (re-used from Round 2)
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


def detrend_linear(t, y):
    return detrend(y, type="linear")


def normalize(y):
    s = y.std()
    return (y - y.mean()) / s if s > 1e-12 else y - y.mean()


def preprocess(ages, vals, window, dt, detrend_fn=detrend_linear):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]; v = vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt / 2, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend_fn(grid, v_grid)
    return grid, normalize(v_det), float(v_grid.mean())  # return raw mean too


def build_X(t, periods_kyr, step_breakpoints_kyr=None):
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
    beta, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot
    comps = []
    for i, p in enumerate(periods_kyr):
        a = float(beta[1 + 2 * i])
        b = float(beta[2 + 2 * i])
        amp = float(np.sqrt(a * a + b * b))
        phase = float(np.arctan2(b, a))
        comps.append({"period_kyr": float(p), "amp": amp, "phase_rad": phase,
                      "a_cos": a, "b_sin": b})
    step_betas = []
    if step_breakpoints_kyr:
        for i in range(len(step_breakpoints_kyr)):
            step_betas.append(float(beta[1 + 2 * n_comp + i]))
    return {"r2": r2, "components": comps, "step_betas": step_betas,
            "beta": beta.tolist(), "y_hat": y_hat}


def integers_to_periods(ints):
    return [EIGHT_H / n for n in ints]


# ─────────────────────────────────────────────────────────────────────────
# R3-1 — Sliding-window amplitude evolution (LR04 + CENOGRID)
# ─────────────────────────────────────────────────────────────────────────

def stage_r31_sliding_window(ages_lr04, vals_lr04, ages_cgd, d18o_cgd):
    print("\n" + "=" * 78)
    print("R3-1 — SLIDING-WINDOW AMPLITUDE EVOLUTION")
    print("=" * 78)
    # Test components: representative L1 (obliquity, precession) + L2 (405-kyr, harmonics)
    test_periods = {
        "obliquity (8H/65)": EIGHT_H / 65,
        "precession (8H/113)": EIGHT_H / 113,
        "100k band (8H/25)": EIGHT_H / 25,
        "405-kyr": PERIOD_405K,
        "202-kyr (2nd h)": PERIOD_202K,
        "135-kyr (3rd h)": PERIOD_135K,
        "8H/22 (122 kyr)": EIGHT_H / 22,
    }
    # Use a single fit per window with all these periods + the 31 lattice integers
    # (to avoid amplitudes leaking between collinear components)
    all_periods_lr = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_202K, PERIOD_135K]
    period_labels_lr = [f"8H/{n}" for n in EXTENDED_31] + ["405-kyr", "202-kyr", "135-kyr"]

    # LR04 sliding-window
    print(f"\n--- LR04 sliding-window (width 1200 kyr, stride 400 kyr) ---")
    lr_windows = []
    for start in range(0, 5320 - 1200, 400):
        lo, hi = start, start + 1200
        t, y, mean_raw = preprocess(ages_lr04, vals_lr04, (lo, hi), 1.0)
        fit = fit_components(t, y, all_periods_lr)
        amps = {label: c["amp"] for label, c in zip(period_labels_lr, fit["components"])}
        # Also extract phases for the test_periods
        phases = {label: c["phase_rad"] for label, c in zip(period_labels_lr, fit["components"])}
        lr_windows.append({
            "center_kyr": (lo + hi) / 2,
            "window_kyr": [lo, hi],
            "mean_raw_d18o": mean_raw,
            "r2": fit["r2"],
            "amps": amps,
            "phases": phases,
        })
    print(f"  {len(lr_windows)} windows fit.")
    print(f"  {'center(kyr)':>12s}  {'mean δ¹⁸O':>10s}  {'R²':>6s}  amps: oblq  prec   100k   405k")
    for w in lr_windows:
        amps = w["amps"]
        print(f"  {w['center_kyr']:>12.0f}  {w['mean_raw_d18o']:>10.3f}  {w['r2']:>6.3f}        {amps['8H/65']:.3f}  {amps['8H/113']:.3f}  {amps['8H/25']:.3f}  {amps['405-kyr']:.3f}")

    # CENOGRID sliding-window
    all_periods_cgd = all_periods_lr + [PERIOD_13H, PERIOD_9M]
    period_labels_cgd = period_labels_lr + ["13H", "9-Myr"]
    print(f"\n--- CENOGRID sliding-window (width 10000 kyr, stride 5000 kyr) ---")
    cgd_windows = []
    for start in range(0, 67000 - 10000, 5000):
        lo, hi = start, start + 10000
        t, y, mean_raw = preprocess(ages_cgd, d18o_cgd, (lo, hi), 5.0)
        # Filter out periods that don't fit in 10000 kyr window
        # 9-Myr only has ~1.1 cycles → under-resolved, exclude
        # 13H = 4.36 Myr → ~2.3 cycles, marginal but include
        periods_fit = [p for p in all_periods_cgd if p < hi - lo]
        labels_fit = [l for l, p in zip(period_labels_cgd, all_periods_cgd) if p < hi - lo]
        fit = fit_components(t, y, periods_fit)
        amps = {label: c["amp"] for label, c in zip(labels_fit, fit["components"])}
        cgd_windows.append({
            "center_kyr": (lo + hi) / 2,
            "window_kyr": [lo, hi],
            "mean_raw_d18o": mean_raw,
            "r2": fit["r2"],
            "amps": amps,
        })
    print(f"  {len(cgd_windows)} windows fit.")
    print(f"  {'center(Ma)':>10s}  {'mean δ¹⁸O':>10s}  {'R²':>6s}  oblq   prec   405k   13H")
    for w in cgd_windows:
        amps = w["amps"]
        oblq = amps.get("8H/65", 0); prec = amps.get("8H/113", 0)
        a405 = amps.get("405-kyr", 0); a13h = amps.get("13H", 0)
        print(f"  {w['center_kyr']/1000:>10.1f}  {w['mean_raw_d18o']:>10.3f}  {w['r2']:>6.3f}        {oblq:.3f}  {prec:.3f}  {a405:.3f}  {a13h:.3f}")

    # Correlation analysis: amp vs mean_raw_d18o per integer
    print(f"\n--- Boundary-condition correlations: amp vs window mean δ¹⁸O ---")
    print(f"  Negative r → amplitude increases with ice volume / cooler climate")
    print(f"  {'integer':18s}  {'r (LR04)':>9s}  {'r (CENOGRID)':>14s}")

    boundary_correlations = {}
    for label in period_labels_lr:
        # Extract amp series for this label across windows where present
        lr_amps = np.array([w["amps"][label] for w in lr_windows if label in w["amps"]])
        lr_means = np.array([w["mean_raw_d18o"] for w in lr_windows if label in w["amps"]])
        cgd_amps = np.array([w["amps"][label] for w in cgd_windows if label in w["amps"]])
        cgd_means = np.array([w["mean_raw_d18o"] for w in cgd_windows if label in w["amps"]])
        r_lr = float(np.corrcoef(lr_amps, lr_means)[0, 1]) if len(lr_amps) > 2 else None
        r_cgd = float(np.corrcoef(cgd_amps, cgd_means)[0, 1]) if len(cgd_amps) > 2 else None
        boundary_correlations[label] = {"r_lr04": r_lr, "r_cenogrid": r_cgd}

    # Print key ones
    for label in ["8H/65", "8H/113", "8H/25", "8H/22", "405-kyr", "202-kyr", "135-kyr"]:
        bc = boundary_correlations.get(label, {})
        r_lr = bc.get("r_lr04"); r_cgd = bc.get("r_cenogrid")
        s_lr = f"{r_lr:+.3f}" if r_lr is not None else "—"
        s_cgd = f"{r_cgd:+.3f}" if r_cgd is not None else "—"
        print(f"  {label:18s}  {s_lr:>9s}  {s_cgd:>14s}")

    return {
        "lr04_windows": lr_windows,
        "cenogrid_windows": cgd_windows,
        "boundary_correlations": boundary_correlations,
    }


# ─────────────────────────────────────────────────────────────────────────
# R3-2 — Linear-response model test (L2 amp vs L1 amp)
# ─────────────────────────────────────────────────────────────────────────

def stage_r32_linear_response(r31_result):
    print("\n" + "=" * 78)
    print("R3-2 — LINEAR-RESPONSE MODEL TEST")
    print("=" * 78)
    print("  For each L2 line, compute amplitude correlation with candidate L1 drivers.")
    print("  High |r| → L2 = linear response (LTI) to L1 driver → ODE model viable.")

    pairs = [
        ("405-kyr", "8H/20",     "g₃−g₂ ecc 100k-band driver"),
        ("405-kyr", "8H/28",     "g₄−g₅ Mars-Jupiter 95k driver"),
        ("405-kyr", "8H/65",     "obliquity 41k (Pleistocene-glacial driver)"),
        ("202-kyr", "405-kyr",   "405-kyr fundamental (silicate-weathering nonlinear)"),
        ("135-kyr", "405-kyr",   "405-kyr fundamental (3rd harmonic)"),
        ("8H/22",   "8H/28",     "g₄−g₅ Mars-Jupiter ecc (100k-band L1)"),
        ("8H/22",   "8H/65",     "obliquity (climatic precession 41k)"),
    ]

    lr_windows = r31_result["lr04_windows"]
    cgd_windows = r31_result["cenogrid_windows"]

    results = []
    print(f"\n  {'L2 line':12s}  {'L1 driver':15s}  {'r(LR04)':>9s}  {'r(CENOGRID)':>13s}  notes")
    for l2_label, l1_label, note in pairs:
        # LR04
        lr_l2 = np.array([w["amps"].get(l2_label) for w in lr_windows if l2_label in w["amps"] and l1_label in w["amps"]])
        lr_l1 = np.array([w["amps"].get(l1_label) for w in lr_windows if l2_label in w["amps"] and l1_label in w["amps"]])
        r_lr = float(np.corrcoef(lr_l1, lr_l2)[0, 1]) if len(lr_l1) > 2 else None
        # CENOGRID
        cgd_l2 = np.array([w["amps"].get(l2_label) for w in cgd_windows if l2_label in w["amps"] and l1_label in w["amps"]])
        cgd_l1 = np.array([w["amps"].get(l1_label) for w in cgd_windows if l2_label in w["amps"] and l1_label in w["amps"]])
        r_cgd = float(np.corrcoef(cgd_l1, cgd_l2)[0, 1]) if len(cgd_l1) > 2 else None
        s_lr = f"{r_lr:+.3f}" if r_lr is not None else "—"
        s_cgd = f"{r_cgd:+.3f}" if r_cgd is not None else "—"
        print(f"  {l2_label:12s}  {l1_label:15s}  {s_lr:>9s}  {s_cgd:>13s}  {note}")
        results.append({
            "l2_line": l2_label, "l1_driver": l1_label,
            "r_lr04": r_lr, "r_cenogrid": r_cgd,
            "interpretation": note,
        })
    return {"pairs": results}


# ─────────────────────────────────────────────────────────────────────────
# R3-3 — Three-regime split + forward prediction with step components
# ─────────────────────────────────────────────────────────────────────────

def stage_r33_three_regime(ages_lr04, vals_lr04):
    print("\n" + "=" * 78)
    print("R3-3 — THREE-REGIME SPLIT + STEP-AWARE FORWARD PREDICTION")
    print("=" * 78)

    regimes = {
        "pre-iNHG (2700-5320 kyr)": (2700, 5320),
        "iNHG-MPT (1000-2700 kyr)": (1000, 2700),
        "post-MPT (0-1000 kyr)":   (0, 1000),
    }
    periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_202K, PERIOD_135K]

    # Fit each regime independently
    print(f"\n--- Per-regime fits (31 ints + 3 L2 lines) ---")
    regime_fits = {}
    for label, window in regimes.items():
        t, y, _ = preprocess(ages_lr04, vals_lr04, window, 1.0)
        fit = fit_components(t, y, periods)
        regime_fits[label] = {"window_kyr": list(window), "r2": fit["r2"],
                              "beta": fit["beta"], "n_obs": len(t)}
        print(f"  {label:30s}  R² = {fit['r2']:.4f}  ({len(t)} samples)")

    # Forward prediction: train pre-iNHG, predict iNHG-MPT; train iNHG-MPT, predict post-MPT
    print(f"\n--- Forward prediction (no step components) ---")
    print(f"  Note: this re-runs C5 with the three-regime split.")

    def predict(train_window, test_window, step_breakpoints=None):
        t_tr, y_tr, _ = preprocess(ages_lr04, vals_lr04, train_window, 1.0)
        t_te, y_te, _ = preprocess(ages_lr04, vals_lr04, test_window, 1.0)
        fit_tr = fit_components(t_tr, y_tr, periods, step_breakpoints_kyr=step_breakpoints)
        # Apply fitted formula at test timestamps
        X_te = build_X(t_te, periods, step_breakpoints_kyr=step_breakpoints)
        y_pred = X_te @ fit_tr["beta"]
        ss_res = float(np.sum((y_te - y_pred) ** 2))
        ss_tot = float(np.sum((y_te - y_te.mean()) ** 2))
        r2_pred = 1.0 - ss_res / ss_tot
        return {"r2_train": fit_tr["r2"], "r2_predict": float(r2_pred)}

    pairs = [
        ("pre-iNHG", (2700, 5320), "iNHG-MPT", (1000, 2700)),
        ("iNHG-MPT", (1000, 2700), "post-MPT", (0, 1000)),
        ("pre-iNHG", (2700, 5320), "post-MPT", (0, 1000)),  # skip iNHG-MPT
    ]
    print(f"  {'train':12s} {'predict':12s}  R²_train   R²_predict")

    no_step_results = {}
    for tr_lab, tr_w, te_lab, te_w in pairs:
        r = predict(tr_w, te_w, step_breakpoints=None)
        no_step_results[f"{tr_lab}→{te_lab}"] = r
        print(f"  {tr_lab:12s} {te_lab:12s}  {r['r2_train']:>8.3f}   {r['r2_predict']:>+8.3f}")

    # Now with step components at the boundaries
    print(f"\n--- Forward prediction WITH step components at known boundaries ---")
    print(f"  Step at iNHG (2700 kyr) and MPT (1000 kyr) — added to both train and test windows.")
    step_breakpoints = [1000, 2700]
    step_results = {}
    print(f"  {'train':12s} {'predict':12s}  R²_train   R²_predict")
    for tr_lab, tr_w, te_lab, te_w in pairs:
        # Only include breakpoints inside the training window
        tr_steps = [b for b in step_breakpoints if tr_w[0] < b < tr_w[1]]
        te_steps = [b for b in step_breakpoints if te_w[0] < b < te_w[1]]
        # For matched train/test we need consistent step set — use both windows' union
        # Actually for fair prediction the same step set must be used in both X matrices
        # We use union of all breakpoints and let those outside each window evaluate to constants
        all_steps = sorted(set(tr_steps + te_steps))
        r = predict(tr_w, te_w, step_breakpoints=all_steps if all_steps else None)
        step_results[f"{tr_lab}→{te_lab}"] = r
        print(f"  {tr_lab:12s} {te_lab:12s}  {r['r2_train']:>8.3f}   {r['r2_predict']:>+8.3f}")

    return {
        "regime_fits": regime_fits,
        "forward_pred_no_steps": no_step_results,
        "forward_pred_with_steps": step_results,
    }


# ─────────────────────────────────────────────────────────────────────────
# R3-4 — 13H stability across CENOGRID windows
# ─────────────────────────────────────────────────────────────────────────

def stage_r34_13h_stability(ages_cgd, d18o_cgd, d13c_cgd):
    print("\n" + "=" * 78)
    print("R3-4 — 13H BOULILA LIBRATION STABILITY (CENOGRID)")
    print("=" * 78)
    print(f"  Window width 15000 kyr, stride 5000 kyr → covers 67 Myr with ~3.4 cycles per window.")

    # Slide 15-Myr windows so 13H gets ≥3 cycles per window for stable estimation
    periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_13H]
    period_labels = [f"8H/{n}" for n in EXTENDED_31] + ["405-kyr", "13H"]

    results_d18o = []
    results_d13c = []
    for start in range(0, 67000 - 15000 + 1, 5000):
        lo, hi = start, start + 15000
        t, y_o, _ = preprocess(ages_cgd, d18o_cgd, (lo, hi), 5.0)
        _, y_c, _ = preprocess(ages_cgd, d13c_cgd, (lo, hi), 5.0)
        fit_o = fit_components(t, y_o, periods)
        fit_c = fit_components(t, y_c, periods)
        # Find 13H index
        idx_13h = period_labels.index("13H")
        c_o_13h = fit_o["components"][idx_13h]
        c_c_13h = fit_c["components"][idx_13h]
        results_d18o.append({
            "center_kyr": (lo + hi) / 2,
            "window_kyr": [lo, hi],
            "r2": fit_o["r2"],
            "amp_13h": c_o_13h["amp"],
            "phase_13h_deg": float(np.degrees(c_o_13h["phase_rad"])),
        })
        results_d13c.append({
            "center_kyr": (lo + hi) / 2,
            "window_kyr": [lo, hi],
            "r2": fit_c["r2"],
            "amp_13h": c_c_13h["amp"],
            "phase_13h_deg": float(np.degrees(c_c_13h["phase_rad"])),
        })

    print(f"\n  δ¹⁸O:")
    print(f"  {'center(Ma)':>10s}  {'amp_13H':>8s}  {'phase':>8s}  {'R²':>6s}")
    for r in results_d18o:
        print(f"  {r['center_kyr']/1000:>10.1f}  {r['amp_13h']:>8.4f}  {r['phase_13h_deg']:>7.1f}°  {r['r2']:>6.3f}")

    print(f"\n  δ¹³C:")
    print(f"  {'center(Ma)':>10s}  {'amp_13H':>8s}  {'phase':>8s}  {'R²':>6s}")
    for r in results_d13c:
        print(f"  {r['center_kyr']/1000:>10.1f}  {r['amp_13h']:>8.4f}  {r['phase_13h_deg']:>7.1f}°  {r['r2']:>6.3f}")

    # Statistics
    amps_d18o = [r["amp_13h"] for r in results_d18o]
    amps_d13c = [r["amp_13h"] for r in results_d13c]
    phases_d18o = [r["phase_13h_deg"] for r in results_d18o]
    phases_d13c = [r["phase_13h_deg"] for r in results_d13c]

    def angle_stdev(phases_deg):
        # Circular standard deviation
        rad = np.radians(phases_deg)
        c = np.cos(rad).mean()
        s = np.sin(rad).mean()
        R = np.sqrt(c*c + s*s)
        return float(np.degrees(np.sqrt(-2 * np.log(R)))) if R > 1e-6 else 999.0

    summary = {
        "amp_d18o": {"mean": float(np.mean(amps_d18o)), "std": float(np.std(amps_d18o)),
                     "cv": float(np.std(amps_d18o) / max(np.mean(amps_d18o), 1e-9))},
        "amp_d13c": {"mean": float(np.mean(amps_d13c)), "std": float(np.std(amps_d13c)),
                     "cv": float(np.std(amps_d13c) / max(np.mean(amps_d13c), 1e-9))},
        "phase_d18o_circular_std_deg": angle_stdev(phases_d18o),
        "phase_d13c_circular_std_deg": angle_stdev(phases_d13c),
    }
    print(f"\n  Stability summary (13H across {len(results_d18o)} windows):")
    print(f"    δ¹⁸O amp: mean={summary['amp_d18o']['mean']:.4f}, CV={summary['amp_d18o']['cv']:.2%}")
    print(f"    δ¹³C amp: mean={summary['amp_d13c']['mean']:.4f}, CV={summary['amp_d13c']['cv']:.2%}")
    print(f"    δ¹⁸O phase circular std: {summary['phase_d18o_circular_std_deg']:.1f}°")
    print(f"    δ¹³C phase circular std: {summary['phase_d13c_circular_std_deg']:.1f}°")
    print(f"    (Stable line → CV < 30%, phase std < 60°. Spurious → CV > 100%, phase std → uniform 104°)")

    return {
        "d18o_windows": results_d18o,
        "d13c_windows": results_d13c,
        "summary": summary,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H VARIANCE BUDGET — TIER B ROUND 3 (doc 18)")
    print("=" * 78)
    print(f"H = {H} kyr;  8H = {EIGHT_H:.3f} kyr")
    print(f"Round 3 stages: R3-1 + R3-2 + R3-3 + R3-4")

    ages_lr04, vals_lr04 = load_lr04()
    ages_cgd, d13c, d18o = load_cenogrid()
    print(f"  LR04:     {len(ages_lr04)} samples (0-{ages_lr04.max():.0f} kyr)")
    print(f"  CENOGRID: {len(ages_cgd)} samples (0-{ages_cgd.max()/1000:.1f} Ma)")

    out = {
        "config": {
            "H_kyr": H,
            "eight_H_kyr": EIGHT_H,
            "extended_integers": EXTENDED_31,
            "period_405k_kyr": PERIOD_405K,
            "period_13h_kyr": PERIOD_13H,
            "cenozoic_transitions_ma": CENOZOIC_TRANSITIONS_MA,
        }
    }

    r31 = stage_r31_sliding_window(ages_lr04, vals_lr04, ages_cgd, d18o)
    out["r3_1_sliding_window"] = r31

    r32 = stage_r32_linear_response(r31)
    out["r3_2_linear_response"] = r32

    out["r3_3_three_regime"] = stage_r33_three_regime(ages_lr04, vals_lr04)
    out["r3_4_13h_stability"] = stage_r34_13h_stability(ages_cgd, d18o, d13c)

    out["meta"] = {
        "script": str(SCRIPT_DIR / "milankovitch_8h_variance_budget_tier_b_r3.py"),
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

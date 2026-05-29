#!/usr/bin/env python3
"""
MILANKOVITCH 8H VARIANCE BUDGET — TIER A DECOMPOSITION
========================================================

Companion script for doc 92: pushes the LR04 / CENOGRID variance
decomposition beyond the canonical 25-component R² = 0.232 baseline by:

  • A1 — adding 6 sub-dominant precession sidebands (n=96, 107, 110, 134,
         152, 185) to make a 31-integer Layer-1 set
  • A2 — adding the 405-kyr off-lattice silicate-weathering line
         (Layer-2 carbon-cycle thermostat)
  • A3 — adding the 13H = 4,359,121-yr Boulila libration line (Layer-2
         carbon-amplified eigenmode beat)
  • A4 — adding a candidate 9-Myr Layer-2 line (CENOGRID only)
  • A5 — regime-split LR04 fits (pre-MPT 1.2-3.0 Ma vs post-MPT 0-1.0 Ma)
         to expose Layer-3 boundary-condition variance

All ΔR² values are reported for:
  • LR04 (5,320-kyr benthic δ¹⁸O stack)
  • CENOGRID δ¹⁸O (LOESS-smoothed, 67-Myr)
  • CENOGRID δ¹³C (LOESS-smoothed, 67-Myr) — for the Layer-2 carbon-cycle
    diagnostic per doc 92 §6 (high δ¹³C/δ¹⁸O ratio = carbon-amplified)

Output: data/milankovitch-8h-variance-budget.json
Run:    python3 scripts/milankovitch_8h_variance_budget.py
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
OUT_PATH = DATA_DIR / "milankovitch-8h-variance-budget.json"

H = 335.317              # kyr (Earth Fundamental Cycle)
EIGHT_H = 8 * H          # kyr (Solar System Resonance Cycle = 2682.536 kyr)

# Canonical 25-integer set (used in milankovitch_climate_formula.py)
BASE_25 = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
           38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]

# Tier A1 — 6 sub-dominant precession sidebands (MTM-significant integers
# not in the canonical 25-set; from doc 91 §12.12 Test L)
SIDEBANDS_6 = [96, 107, 110, 134, 152, 185]

# Berger-quintet completion (k+g₃ Earth at ~19 kyr) added 2026-05-28.
# Subthreshold in LR04 (amp/median 2.03×), 3σ in Cheng monsoon (3.60×).
BERGER_QUINTET_141 = [141]

EXTENDED_32 = sorted(BASE_25 + SIDEBANDS_6 + BERGER_QUINTET_141)
EXTENDED_31 = EXTENDED_32  # backward-compat alias (former name)

# Layer-2 explicit line periods (in kyr)
PERIOD_405K = 404.5             # silicate-weathering thermostat, off lattice
PERIOD_13H = 13.0 * H           # Boulila libration = 4,359.121 kyr
PERIOD_9M = 9000.0              # 9-Myr carbon-cycle candidate (doc 92 §6.10)


# ─────────────────────────────────────────────────────────────────────────
# Data loaders
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
    """CENOGRID TableS34: col 0 = tuned time (Ma), col 7 = δ¹³C LOESS,
    col 8 = δ¹⁸O LOESS. Returns (ages_kyr, d13c, d18o)."""
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


# ─────────────────────────────────────────────────────────────────────────
# Preprocessing
# ─────────────────────────────────────────────────────────────────────────

def preprocess(ages_kyr, vals, window, dt_kyr):
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
    v_det = detrend(v_grid, type="linear")
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return grid, v_norm


# ─────────────────────────────────────────────────────────────────────────
# Fit machinery
# ─────────────────────────────────────────────────────────────────────────

def fit_components(t, y, periods_kyr):
    """Jointly fit y(t) = c + Σ_p [a_p cos(2π·t/p) + b_p sin(2π·t/p)].
    Returns dict with r2, condition number, and per-component amp/phase."""
    n_obs = len(t)
    n_comp = len(periods_kyr)
    X = np.zeros((n_obs, 1 + 2 * n_comp))
    X[:, 0] = 1.0
    for i, p in enumerate(periods_kyr):
        omega = 2 * np.pi / p
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    beta, _, _, svals = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot
    cond = float(svals[0] / svals[-1])
    comps = []
    for i, p in enumerate(periods_kyr):
        a = float(beta[1 + 2 * i])
        b = float(beta[2 + 2 * i])
        comps.append({
            "period_kyr": float(p),
            "amp": float(np.sqrt(a * a + b * b)),
            "a_cos": a,
            "b_sin": b,
        })
    return {
        "r2": r2,
        "condition": cond,
        "n_components": n_comp,
        "components": comps,
    }


def integers_to_periods(integers):
    return [EIGHT_H / n for n in integers]


# ─────────────────────────────────────────────────────────────────────────
# Tier-A driver
# ─────────────────────────────────────────────────────────────────────────

def run_tier_a(label, t, y):
    """Run the full Tier-A stack on one (t, y) time series.
    Returns nested dict {a0, a1, a2, a3, a4} of fit results."""
    out = {}

    # A0 — baseline 25 integers
    periods_25 = integers_to_periods(BASE_25)
    fit0 = fit_components(t, y, periods_25)
    out["a0_baseline_25"] = {
        "integers": BASE_25,
        "r2": fit0["r2"],
        "condition": fit0["condition"],
        "n_components": fit0["n_components"],
    }

    # A1 — 31 integers (sidebands added)
    periods_31 = integers_to_periods(EXTENDED_31)
    fit1 = fit_components(t, y, periods_31)
    out["a1_extended_31"] = {
        "integers": EXTENDED_31,
        "added_sidebands": SIDEBANDS_6,
        "r2": fit1["r2"],
        "delta_r2_vs_a0": fit1["r2"] - fit0["r2"],
        "condition": fit1["condition"],
        "n_components": fit1["n_components"],
    }

    # A2 — A1 + explicit 405-kyr line
    periods_a2 = periods_31 + [PERIOD_405K]
    fit2 = fit_components(t, y, periods_a2)
    out["a2_plus_405k"] = {
        "added_period_kyr": PERIOD_405K,
        "r2": fit2["r2"],
        "delta_r2_vs_a1": fit2["r2"] - fit1["r2"],
        "amp_405k": fit2["components"][-1]["amp"],
        "condition": fit2["condition"],
        "n_components": fit2["n_components"],
    }

    # A3 — A2 + explicit 13H line
    periods_a3 = periods_a2 + [PERIOD_13H]
    fit3 = fit_components(t, y, periods_a3)
    out["a3_plus_13h"] = {
        "added_period_kyr": PERIOD_13H,
        "n_cycles_in_window": float((t.max() - t.min()) / PERIOD_13H),
        "r2": fit3["r2"],
        "delta_r2_vs_a2": fit3["r2"] - fit2["r2"],
        "amp_13h": fit3["components"][-1]["amp"],
        "condition": fit3["condition"],
        "n_components": fit3["n_components"],
    }

    # A4 — A3 + explicit 9-Myr line
    periods_a4 = periods_a3 + [PERIOD_9M]
    fit4 = fit_components(t, y, periods_a4)
    out["a4_plus_9m"] = {
        "added_period_kyr": PERIOD_9M,
        "n_cycles_in_window": float((t.max() - t.min()) / PERIOD_9M),
        "r2": fit4["r2"],
        "delta_r2_vs_a3": fit4["r2"] - fit3["r2"],
        "amp_9m": fit4["components"][-1]["amp"],
        "condition": fit4["condition"],
        "n_components": fit4["n_components"],
    }

    # Summary
    out["summary"] = {
        "label": label,
        "n_samples": int(len(t)),
        "window_kyr": [float(t.min()), float(t.max())],
        "duration_kyr": float(t.max() - t.min()),
        "ceiling_r2": fit4["r2"],
        "total_delta_vs_baseline": fit4["r2"] - fit0["r2"],
    }
    return out


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H VARIANCE BUDGET — TIER A DECOMPOSITION (doc 92)")
    print("=" * 78)
    print(f"H = {H} kyr;  8H = {EIGHT_H:.3f} kyr")
    print(f"Base set     : {len(BASE_25)} integers (canonical, doc 91 §2.2 + §3.3)")
    print(f"Sidebands    : {len(SIDEBANDS_6)} integers ({SIDEBANDS_6})")
    print(f"Extended set : {len(EXTENDED_31)} integers")
    print(f"L2 lines     : 405-kyr ({PERIOD_405K} kyr), 13H ({PERIOD_13H:.1f} kyr), 9-Myr ({PERIOD_9M:.0f} kyr)")
    print()

    out = {
        "config": {
            "H_kyr": H,
            "eight_H_kyr": EIGHT_H,
            "base_integers": BASE_25,
            "sideband_integers": SIDEBANDS_6,
            "extended_integers": EXTENDED_31,
            "period_405k_kyr": PERIOD_405K,
            "period_13h_kyr": PERIOD_13H,
            "period_9m_kyr": PERIOD_9M,
        }
    }

    # ─────────── LR04 — full 5320 kyr ───────────
    print("LR04 — full window 0–5320 kyr (1-kyr bins)")
    print("-" * 78)
    ages_lr04, vals_lr04 = load_lr04()
    t_lr, y_lr = preprocess(ages_lr04, vals_lr04, window=(0, 5320), dt_kyr=1.0)
    lr04_full = run_tier_a("LR04 full 0-5320 kyr", t_lr, y_lr)
    out["lr04_full"] = lr04_full
    for k in ["a0_baseline_25", "a1_extended_31", "a2_plus_405k", "a3_plus_13h", "a4_plus_9m"]:
        r2 = lr04_full[k]["r2"]
        delta_keys = [kk for kk in lr04_full[k] if kk.startswith("delta_r2")]
        delta = lr04_full[k].get(delta_keys[0]) if delta_keys else 0.0
        print(f"  {k:25s}  R² = {r2:.4f}  Δ = {delta:+.4f}  cond = {lr04_full[k].get('condition', 0):.1f}")
    print()

    # ─────────── LR04 regime splits — Tier A5 ───────────
    print("LR04 — REGIME SPLITS (Tier A5)")
    print("-" * 78)
    print("Pre-MPT  window 1200-3000 kyr (1.8 Myr)")
    t_pre, y_pre = preprocess(ages_lr04, vals_lr04, window=(1200, 3000), dt_kyr=1.0)
    lr04_pre = run_tier_a("LR04 pre-MPT 1200-3000 kyr", t_pre, y_pre)
    out["lr04_pre_mpt"] = lr04_pre
    print(f"  baseline 25  : R² = {lr04_pre['a0_baseline_25']['r2']:.4f}")
    print(f"  extended 31  : R² = {lr04_pre['a1_extended_31']['r2']:.4f}  Δ = {lr04_pre['a1_extended_31']['delta_r2_vs_a0']:+.4f}")
    print()
    print("Post-MPT window 0-1000 kyr (1.0 Myr)")
    t_post, y_post = preprocess(ages_lr04, vals_lr04, window=(0, 1000), dt_kyr=1.0)
    lr04_post = run_tier_a("LR04 post-MPT 0-1000 kyr", t_post, y_post)
    out["lr04_post_mpt"] = lr04_post
    print(f"  baseline 25  : R² = {lr04_post['a0_baseline_25']['r2']:.4f}")
    print(f"  extended 31  : R² = {lr04_post['a1_extended_31']['r2']:.4f}  Δ = {lr04_post['a1_extended_31']['delta_r2_vs_a0']:+.4f}")
    print()

    # ─────────── CENOGRID — 67 Myr ───────────
    print("CENOGRID — 67 Myr (5-kyr bins, LOESS-smoothed)")
    print("-" * 78)
    ages_cgd, d13c_cgd, d18o_cgd = load_cenogrid()
    t_cgd_o, y_cgd_o = preprocess(ages_cgd, d18o_cgd, window=(0, 67000), dt_kyr=5.0)
    cenogrid_d18o = run_tier_a("CENOGRID δ¹⁸O 0-67 Myr", t_cgd_o, y_cgd_o)
    out["cenogrid_d18o"] = cenogrid_d18o
    print("δ¹⁸O")
    for k in ["a0_baseline_25", "a1_extended_31", "a2_plus_405k", "a3_plus_13h", "a4_plus_9m"]:
        r2 = cenogrid_d18o[k]["r2"]
        delta_keys = [kk for kk in cenogrid_d18o[k] if kk.startswith("delta_r2")]
        delta = cenogrid_d18o[k].get(delta_keys[0]) if delta_keys else 0.0
        print(f"  {k:25s}  R² = {r2:.4f}  Δ = {delta:+.4f}")
    print()

    t_cgd_c, y_cgd_c = preprocess(ages_cgd, d13c_cgd, window=(0, 67000), dt_kyr=5.0)
    cenogrid_d13c = run_tier_a("CENOGRID δ¹³C 0-67 Myr", t_cgd_c, y_cgd_c)
    out["cenogrid_d13c"] = cenogrid_d13c
    print("δ¹³C (carbon-cycle proxy)")
    for k in ["a0_baseline_25", "a1_extended_31", "a2_plus_405k", "a3_plus_13h", "a4_plus_9m"]:
        r2 = cenogrid_d13c[k]["r2"]
        delta_keys = [kk for kk in cenogrid_d13c[k] if kk.startswith("delta_r2")]
        delta = cenogrid_d13c[k].get(delta_keys[0]) if delta_keys else 0.0
        print(f"  {k:25s}  R² = {r2:.4f}  Δ = {delta:+.4f}")
    print()

    # ─────────── Summary table ───────────
    print("=" * 78)
    print("VARIANCE BUDGET SUMMARY")
    print("=" * 78)
    print()
    print(f"  {'record':22}  {'a0 R²':>7}  {'a1 R²':>7}  {'a2 R²':>7}  {'a3 R²':>7}  {'a4 R²':>7}")
    print(f"  {'-'*22}  {'-'*7}  {'-'*7}  {'-'*7}  {'-'*7}  {'-'*7}")
    for name, blk in [
        ("LR04 full",       lr04_full),
        ("LR04 pre-MPT",    lr04_pre),
        ("LR04 post-MPT",   lr04_post),
        ("CENOGRID δ¹⁸O",  cenogrid_d18o),
        ("CENOGRID δ¹³C",  cenogrid_d13c),
    ]:
        r2s = [blk[k]["r2"] for k in ["a0_baseline_25", "a1_extended_31",
                                       "a2_plus_405k", "a3_plus_13h", "a4_plus_9m"]]
        print(f"  {name:22}  {r2s[0]:>7.4f}  {r2s[1]:>7.4f}  {r2s[2]:>7.4f}  {r2s[3]:>7.4f}  {r2s[4]:>7.4f}")
    print()
    print(f"  Total runtime: {time.time() - t0:.1f}s")

    # Add tier-A label & metadata
    out["meta"] = {
        "script": str(SCRIPT_DIR / "milankovitch_8h_variance_budget.py"),
        "doc": "docs/92-climate-formula.md",
        "runtime_sec": time.time() - t0,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump(out, f, indent=2)
    print(f"  Output: {OUT_PATH}")


if __name__ == "__main__":
    main()

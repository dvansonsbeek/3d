#!/usr/bin/env python3
"""
MILANKOVITCH 8H VARIANCE BUDGET — TIER B ROUND 1 (doc 18)
============================================================

Companion to milankovitch_8h_variance_budget.py (Tier A). Tier B Round 1
runs four exploratory tests in one comprehensive pass:

  • B4 — CENOGRID L3-detrend comparison: piecewise-linear at 6 known
         transitions (PETM 56 Ma, EOT 34 Ma, Mi-1 23 Ma, MMCT 14 Ma,
         iNHG 2.7 Ma, MPT 1 Ma) vs polynomial degree-6 smooth detrend.
         Then re-runs the 31-integer + 3-L2-line fit on the cleaned
         residuals. Measures how much L3 boundary-condition modelling
         buys for the L1 lattice on the 67-Myr record.

  • B1 — 405-kyr harmonics (Layer-2 nonlinearity test): add periods
         202.25, 134.83, 101.13, 80.9 kyr (2nd–5th harmonics of the
         silicate-weathering thermostat) on top of the Tier-A baseline.
         If the thermostat is nonlinear, harmonics should appear with
         δ¹³C/δ¹⁸O > 1.0.

  • C8 — Joint δ¹⁸O / δ¹³C multivariate fit on CENOGRID. Force shared
         frequencies between the two proxies, fit per-proxy amplitudes,
         measure δ¹³C/δ¹⁸O amplitude ratio per component as the L2
         carbon-amplification diagnostic. This is the cleanest direct
         test of the framework's L1=direct-insolation, L2=carbon-amplified
         hypothesis.

  • B2 — Laskar eigenmode-beat enumeration: scan all |g_i ± g_j| and
         |s_i ± s_j| Laskar 2004 secular-eigenmode combinations for
         off-lattice periods in the 100-10,000 kyr range. For each
         off-lattice candidate, fit it on top of the Tier-A baseline
         and report ΔR² + δ¹³C/δ¹⁸O ratio. Promote any line with
         ΔR² > 0.01 + ratio > 1.5 to confirmed L2 candidate.

Output: data/milankovitch-8h-tier-b-round1.json
Run:    python3 scripts/milankovitch_8h_variance_budget_tier_b.py
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
OUT_PATH = DATA_DIR / "milankovitch-8h-tier-b-round1.json"

H = 335.317
EIGHT_H = 8 * H  # 2682.536 kyr

BASE_25 = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
           38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]
SIDEBANDS_6 = [96, 107, 110, 134, 152, 185]
EXTENDED_31 = sorted(BASE_25 + SIDEBANDS_6)

PERIOD_405K = 404.5
PERIOD_13H = 13.0 * H              # 4359.121 kyr
PERIOD_9M = 9000.0

# B1 — 405-kyr harmonics (n=2, 3, 4, 5)
HARMONICS_405K = {
    "n2_202": PERIOD_405K / 2,    # 202.25 kyr
    "n3_135": PERIOD_405K / 3,    # 134.83 kyr
    "n4_101": PERIOD_405K / 4,    # 101.125 kyr
    "n5_81":  PERIOD_405K / 5,    # 80.9 kyr
}

# Laskar 2004 secular eigenmode frequencies (arcsec/yr).
# Reference: Laskar et al. 2004, A&A 428, 261 — Table 2 (J2000.5 epoch).
# g_5 = Jupiter, g_6 = Saturn, g_7 = Uranus, g_8 = Neptune
# s_5 = 0 (Jupiter — invariable-plane reference). s_3 = Earth.
LASKAR_G = {
    "g1": 5.59,
    "g2": 7.4559,
    "g3": 17.366,
    "g4": 17.916,
    "g5": 4.2573,
    "g6": 28.2455,
    "g7": 3.0878,
    "g8": 0.6733,
}
LASKAR_S = {
    "s1": -5.625,
    "s2": -7.062,
    "s3": -18.851,
    "s4": -17.748,
    "s5":  0.0,
    "s6": -26.348,
    "s7": -2.985,
    "s8": -0.692,
}
ARCSEC_PER_YR_TO_KYR = lambda f: 1296000.0 / f / 1000.0 if abs(f) > 1e-6 else None

# B4 — known Cenozoic transitions (Ma → kyr)
CENOZOIC_TRANSITIONS_MA = [56.0, 34.0, 23.0, 14.0, 2.7, 1.0]


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
# Detrending strategies (B4)
# ─────────────────────────────────────────────────────────────────────────

def detrend_linear(t, y):
    """Single linear detrend across the whole record."""
    return detrend(y, type="linear")


def detrend_piecewise_linear(t, y, breakpoints_kyr):
    """Piecewise-linear detrend with linear segments between breakpoints.
    breakpoints in kyr (sorted ascending). Anchors: t[0] and t[-1] are
    implicit endpoints."""
    edges = sorted(set([float(t[0])] + list(breakpoints_kyr) + [float(t[-1])]))
    y_resid = np.copy(y)
    for i in range(len(edges) - 1):
        lo, hi = edges[i], edges[i + 1]
        mask = (t >= lo) & (t <= hi)
        if mask.sum() < 2:
            continue
        t_seg, y_seg = t[mask], y[mask]
        # Linear fit on segment
        coeffs = np.polyfit(t_seg, y_seg, 1)
        y_resid[mask] = y_seg - np.polyval(coeffs, t_seg)
    return y_resid


def detrend_polynomial(t, y, degree=6):
    """Polynomial detrend (smooth secular drift removal)."""
    coeffs = np.polyfit(t, y, degree)
    return y - np.polyval(coeffs, t)


def normalize(y):
    """Zero-mean, unit-std normalization."""
    return (y - y.mean()) / y.std()


def preprocess_with_detrend(ages_kyr, vals, window, dt_kyr, detrend_fn):
    """Generic preprocessor: bin to dt, then apply specified detrend_fn(t, y)."""
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

def fit_components(t, y, periods_kyr):
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
    return {"r2": r2, "condition": cond, "n_components": n_comp,
            "components": comps, "y_hat": y_hat}


def fit_joint_two_proxies(t, y1, y2, periods_kyr):
    """Joint fit: shared design matrix X for both proxies, separate β coefficients
    (i.e. separate amplitude+phase per proxy, same frequencies).
    Returns dict with per-proxy r2 + per-component amp ratio (y2/y1)."""
    n_obs = len(t)
    n_comp = len(periods_kyr)
    X = np.zeros((n_obs, 1 + 2 * n_comp))
    X[:, 0] = 1.0
    for i, p in enumerate(periods_kyr):
        omega = 2 * np.pi / p
        X[:, 1 + 2 * i] = np.cos(omega * t)
        X[:, 2 + 2 * i] = np.sin(omega * t)
    beta1, _, _, _ = np.linalg.lstsq(X, y1, rcond=None)
    beta2, _, _, _ = np.linalg.lstsq(X, y2, rcond=None)
    y1_hat = X @ beta1
    y2_hat = X @ beta2
    r2_1 = 1 - np.sum((y1 - y1_hat)**2) / np.sum((y1 - y1.mean())**2)
    r2_2 = 1 - np.sum((y2 - y2_hat)**2) / np.sum((y2 - y2.mean())**2)
    comps = []
    for i, p in enumerate(periods_kyr):
        a1, b1 = float(beta1[1 + 2*i]), float(beta1[2 + 2*i])
        a2, b2 = float(beta2[1 + 2*i]), float(beta2[2 + 2*i])
        amp1 = float(np.sqrt(a1*a1 + b1*b1))
        amp2 = float(np.sqrt(a2*a2 + b2*b2))
        ratio = float(amp2 / amp1) if amp1 > 1e-12 else None
        comps.append({
            "period_kyr": float(p),
            "amp_proxy1": amp1,
            "amp_proxy2": amp2,
            "amp_ratio_2_over_1": ratio,
        })
    return {"r2_proxy1": float(r2_1), "r2_proxy2": float(r2_2),
            "n_components": n_comp, "components": comps}


def integers_to_periods(integers):
    return [EIGHT_H / n for n in integers]


# ─────────────────────────────────────────────────────────────────────────
# B4 — CENOGRID detrend comparison
# ─────────────────────────────────────────────────────────────────────────

def stage_b4_cenogrid_detrend(ages_cgd, d13c_cgd, d18o_cgd):
    print("\n" + "=" * 78)
    print("B4 — CENOGRID L3-DETREND COMPARISON")
    print("=" * 78)

    breakpoints_kyr = [t_ma * 1000 for t_ma in CENOZOIC_TRANSITIONS_MA]
    window = (0, 67000)
    dt = 5.0

    # Build the period set: 31 integers + 405k + 13H + 9-Myr
    periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_13H, PERIOD_9M]

    results = {}
    for proxy_name, proxy_vals in [("d18o", d18o_cgd), ("d13c", d13c_cgd)]:
        print(f"\n--- Proxy: δ¹{'⁸' if proxy_name == 'd18o' else '³'}{'O' if proxy_name == 'd18o' else 'C'} ---")
        proxy_results = {}
        for det_label, det_fn in [
            ("linear",     lambda t, y: detrend_linear(t, y)),
            ("piecewise6", lambda t, y: detrend_piecewise_linear(t, y, breakpoints_kyr)),
            ("poly6",      lambda t, y: detrend_polynomial(t, y, degree=6)),
            ("poly10",     lambda t, y: detrend_polynomial(t, y, degree=10)),
        ]:
            t, y = preprocess_with_detrend(ages_cgd, proxy_vals, window, dt, det_fn)
            fit = fit_components(t, y, periods)
            proxy_results[det_label] = {
                "n_samples": len(t),
                "r2_full_pipeline": fit["r2"],
                "condition": fit["condition"],
                "n_components": fit["n_components"],
            }
            print(f"  {det_label:12s}  R² = {fit['r2']:.4f}  cond = {fit['condition']:.1f}")
        results[proxy_name] = proxy_results

    results["breakpoints_kyr"] = breakpoints_kyr
    results["breakpoints_ma"] = CENOZOIC_TRANSITIONS_MA
    results["transition_labels"] = ["PETM", "EOT", "Mi-1", "MMCT", "iNHG", "MPT"]
    return results


# ─────────────────────────────────────────────────────────────────────────
# B1 — 405-kyr harmonics test
# ─────────────────────────────────────────────────────────────────────────

def stage_b1_harmonics(ages_lr04, vals_lr04, ages_cgd, d13c_cgd, d18o_cgd):
    print("\n" + "=" * 78)
    print("B1 — 405-KYR HARMONICS TEST")
    print("=" * 78)
    print(f"  Harmonics: {list(HARMONICS_405K.items())}")

    # Baseline: 31 integers + 405-kyr + 13H + 9-Myr
    base_periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_13H, PERIOD_9M]

    out = {}

    # --- LR04 full record ---
    print("\n--- LR04 (0-5320 kyr, linear detrend) ---")
    t_lr, y_lr = preprocess_with_detrend(ages_lr04, vals_lr04, (0, 5320), 1.0,
                                          lambda t, y: detrend_linear(t, y))
    fit_base = fit_components(t_lr, y_lr, base_periods)
    print(f"  Baseline (no harmonics)         R² = {fit_base['r2']:.4f}")
    out["lr04_baseline"] = {"r2": fit_base["r2"]}

    for hname, p in HARMONICS_405K.items():
        fit_add = fit_components(t_lr, y_lr, base_periods + [p])
        delta = fit_add["r2"] - fit_base["r2"]
        amp = fit_add["components"][-1]["amp"]
        print(f"  + {hname:8s} ({p:7.2f} kyr)  R² = {fit_add['r2']:.4f}  Δ = {delta:+.4f}  amp = {amp:.4f}")
        out[f"lr04_{hname}"] = {
            "period_kyr": p,
            "r2": fit_add["r2"],
            "delta_r2": delta,
            "amp": amp,
            "condition": fit_add["condition"],
        }

    # Add ALL four harmonics jointly
    fit_all = fit_components(t_lr, y_lr, base_periods + list(HARMONICS_405K.values()))
    print(f"  + ALL 4 harmonics jointly        R² = {fit_all['r2']:.4f}  Δ = {fit_all['r2'] - fit_base['r2']:+.4f}  cond = {fit_all['condition']:.1f}")
    out["lr04_all4_jointly"] = {
        "r2": fit_all["r2"],
        "delta_r2": fit_all["r2"] - fit_base["r2"],
        "condition": fit_all["condition"],
    }

    # --- CENOGRID δ¹³C (the carbon-cycle proxy where harmonics should appear strongest) ---
    print("\n--- CENOGRID δ¹³C (0-67 Myr, piecewise-6 detrend) ---")
    breakpoints = [t * 1000 for t in CENOZOIC_TRANSITIONS_MA]
    t_cgd, y_cgd_c = preprocess_with_detrend(ages_cgd, d13c_cgd, (0, 67000), 5.0,
                                              lambda t, y: detrend_piecewise_linear(t, y, breakpoints))
    fit_base_c = fit_components(t_cgd, y_cgd_c, base_periods)
    print(f"  Baseline (no harmonics)         R² = {fit_base_c['r2']:.4f}")
    out["cenogrid_d13c_baseline"] = {"r2": fit_base_c["r2"]}

    for hname, p in HARMONICS_405K.items():
        fit_add = fit_components(t_cgd, y_cgd_c, base_periods + [p])
        delta = fit_add["r2"] - fit_base_c["r2"]
        amp = fit_add["components"][-1]["amp"]
        print(f"  + {hname:8s} ({p:7.2f} kyr)  R² = {fit_add['r2']:.4f}  Δ = {delta:+.4f}  amp = {amp:.4f}")
        out[f"cenogrid_d13c_{hname}"] = {
            "period_kyr": p,
            "r2": fit_add["r2"],
            "delta_r2": delta,
            "amp": amp,
        }

    fit_all_c = fit_components(t_cgd, y_cgd_c, base_periods + list(HARMONICS_405K.values()))
    print(f"  + ALL 4 harmonics jointly        R² = {fit_all_c['r2']:.4f}  Δ = {fit_all_c['r2'] - fit_base_c['r2']:+.4f}  cond = {fit_all_c['condition']:.1f}")
    out["cenogrid_d13c_all4_jointly"] = {
        "r2": fit_all_c["r2"],
        "delta_r2": fit_all_c["r2"] - fit_base_c["r2"],
        "condition": fit_all_c["condition"],
    }

    # --- CENOGRID δ¹⁸O for ratio check ---
    print("\n--- CENOGRID δ¹⁸O (0-67 Myr, piecewise-6 detrend) — for δ¹³C/δ¹⁸O ratio ---")
    t_cgd_o, y_cgd_o = preprocess_with_detrend(ages_cgd, d18o_cgd, (0, 67000), 5.0,
                                                lambda t, y: detrend_piecewise_linear(t, y, breakpoints))
    fit_base_o = fit_components(t_cgd_o, y_cgd_o, base_periods)
    out["cenogrid_d18o_baseline"] = {"r2": fit_base_o["r2"]}

    for hname, p in HARMONICS_405K.items():
        fit_add = fit_components(t_cgd_o, y_cgd_o, base_periods + [p])
        delta = fit_add["r2"] - fit_base_o["r2"]
        amp = fit_add["components"][-1]["amp"]
        # δ¹³C/δ¹⁸O ratio
        delta_c = out[f"cenogrid_d13c_{hname}"]["delta_r2"]
        ratio = delta_c / delta if delta > 1e-6 else None
        print(f"  + {hname:8s} d18o Δ={delta:+.4f}  d13c Δ={delta_c:+.4f}  ratio = {ratio:.2f}" if ratio else f"  + {hname:8s} d18o Δ={delta:+.4f}  d13c Δ={delta_c:+.4f}  ratio = N/A")
        out[f"cenogrid_d18o_{hname}"] = {
            "period_kyr": p,
            "r2": fit_add["r2"],
            "delta_r2": delta,
            "amp": amp,
            "d13c_over_d18o_variance_ratio": ratio,
        }

    return out


# ─────────────────────────────────────────────────────────────────────────
# C8 — Joint δ¹⁸O / δ¹³C multivariate fit
# ─────────────────────────────────────────────────────────────────────────

def stage_c8_joint_proxy(ages_cgd, d13c_cgd, d18o_cgd):
    print("\n" + "=" * 78)
    print("C8 — JOINT δ¹⁸O / δ¹³C MULTIVARIATE FIT (CENOGRID, piecewise-6 detrend)")
    print("=" * 78)

    breakpoints = [t * 1000 for t in CENOZOIC_TRANSITIONS_MA]
    window = (0, 67000)
    dt = 5.0

    t_o, y_o = preprocess_with_detrend(ages_cgd, d18o_cgd, window, dt,
                                        lambda t, y: detrend_piecewise_linear(t, y, breakpoints))
    t_c, y_c = preprocess_with_detrend(ages_cgd, d13c_cgd, window, dt,
                                        lambda t, y: detrend_piecewise_linear(t, y, breakpoints))
    assert np.allclose(t_o, t_c)

    # Frequency set: 31 integers + 4 L2 lines + 4 harmonics
    period_labels = []
    for n in EXTENDED_31:
        period_labels.append((f"8H/{n}", EIGHT_H / n))
    period_labels.append(("405-kyr", PERIOD_405K))
    period_labels.append(("13H", PERIOD_13H))
    period_labels.append(("9-Myr", PERIOD_9M))
    for hname, p in HARMONICS_405K.items():
        period_labels.append((f"405k_{hname}", p))

    labels = [l for l, _ in period_labels]
    periods = [p for _, p in period_labels]

    fit = fit_joint_two_proxies(t_o, y_o, y_c, periods)
    print(f"  R² δ¹⁸O = {fit['r2_proxy1']:.4f}")
    print(f"  R² δ¹³C = {fit['r2_proxy2']:.4f}")
    print()
    print("  Per-component amp_d13c / amp_d18o ratio (L2 diagnostic: >1.0 = carbon-amplified):")
    print(f"  {'label':12s}  {'period(kyr)':>12s}  {'amp_d18o':>10s}  {'amp_d13c':>10s}  {'ratio':>7s}  {'class':>8s}")

    rows = []
    for label, c in zip(labels, fit["components"]):
        r = c["amp_ratio_2_over_1"]
        if r is None:
            cls = "—"
        elif r > 1.5:
            cls = "L2++"
        elif r > 1.0:
            cls = "L2"
        elif r > 0.5:
            cls = "mixed"
        else:
            cls = "L1"
        rows.append({
            "label": label,
            "period_kyr": c["period_kyr"],
            "amp_d18o": c["amp_proxy1"],
            "amp_d13c": c["amp_proxy2"],
            "ratio_d13c_over_d18o": r,
            "classification": cls,
        })

    # Print sorted by ratio descending (highest L2 first)
    rows_sorted = sorted(rows, key=lambda r: -(r["ratio_d13c_over_d18o"] or 0))
    print("  (sorted by ratio descending — strongest L2 signals first)")
    for r in rows_sorted[:15]:
        rr = f"{r['ratio_d13c_over_d18o']:.2f}" if r['ratio_d13c_over_d18o'] is not None else "—"
        print(f"  {r['label']:12s}  {r['period_kyr']:>12.2f}  {r['amp_d18o']:>10.5f}  {r['amp_d13c']:>10.5f}  {rr:>7s}  {r['classification']:>8s}")

    return {
        "r2_d18o": fit["r2_proxy1"],
        "r2_d13c": fit["r2_proxy2"],
        "n_components": fit["n_components"],
        "components_sorted_by_ratio": rows_sorted,
    }


# ─────────────────────────────────────────────────────────────────────────
# B2 — Laskar eigenmode-beat enumeration
# ─────────────────────────────────────────────────────────────────────────

def enumerate_eigenmode_beats():
    """All |g_i ± g_j|, |s_i ± s_j|, |g_i ± s_j| pairs.
    Return list of (label, period_kyr) for periods in [100, 10000] kyr."""
    beats = []
    names_g = list(LASKAR_G.keys())
    names_s = list(LASKAR_S.keys())

    # g-g
    for i, ni in enumerate(names_g):
        for nj in names_g[i + 1:]:
            for sign in [+1, -1]:
                f = LASKAR_G[ni] + sign * LASKAR_G[nj]
                if abs(f) < 1e-6:
                    continue
                p = ARCSEC_PER_YR_TO_KYR(abs(f))
                if 100 <= p <= 10000:
                    beats.append((f"{ni}{'+' if sign>0 else '-'}{nj}", p))

    # s-s
    for i, ni in enumerate(names_s):
        for nj in names_s[i + 1:]:
            for sign in [+1, -1]:
                f = LASKAR_S[ni] + sign * LASKAR_S[nj]
                if abs(f) < 1e-6:
                    continue
                p = ARCSEC_PER_YR_TO_KYR(abs(f))
                if 100 <= p <= 10000:
                    beats.append((f"{ni}{'+' if sign>0 else '-'}{nj}", p))

    # g-s (mixed — these include climatic precession k+g etc., but we exclude
    # k itself since axial precession isn't in the g/s set; only pure g-s combos)
    for ni in names_g:
        for nj in names_s:
            for sign in [+1, -1]:
                f = LASKAR_G[ni] + sign * LASKAR_S[nj]
                if abs(f) < 1e-6:
                    continue
                p = ARCSEC_PER_YR_TO_KYR(abs(f))
                if 100 <= p <= 10000:
                    beats.append((f"{ni}{'+' if sign>0 else '-'}{nj}", p))

    # Deduplicate by period (keep label of first)
    seen_periods = {}
    for label, p in beats:
        rounded = round(p, 1)
        if rounded not in seen_periods:
            seen_periods[rounded] = (label, p)
    return list(seen_periods.values())


def is_off_lattice(period_kyr, threshold_pct=5.0):
    """Test whether period sits off the 8H lattice (not within threshold % of any 8H/N integer)."""
    for n in range(1, 200):
        p_int = EIGHT_H / n
        if abs(period_kyr - p_int) / p_int * 100 < threshold_pct:
            return False, n, p_int
    return True, None, None


def stage_b2_eigenmode_enumeration(ages_cgd, d13c_cgd, d18o_cgd):
    print("\n" + "=" * 78)
    print("B2 — LASKAR EIGENMODE-BEAT ENUMERATION (off-lattice scan)")
    print("=" * 78)

    breakpoints = [t * 1000 for t in CENOZOIC_TRANSITIONS_MA]
    window = (0, 67000)
    dt = 5.0
    t_o, y_o = preprocess_with_detrend(ages_cgd, d18o_cgd, window, dt,
                                        lambda t, y: detrend_piecewise_linear(t, y, breakpoints))
    t_c, y_c = preprocess_with_detrend(ages_cgd, d13c_cgd, window, dt,
                                        lambda t, y: detrend_piecewise_linear(t, y, breakpoints))

    base_periods = integers_to_periods(EXTENDED_31) + [PERIOD_405K, PERIOD_13H, PERIOD_9M]
    fit_base_o = fit_components(t_o, y_o, base_periods)
    fit_base_c = fit_components(t_c, y_c, base_periods)
    r2_base_o = fit_base_o["r2"]
    r2_base_c = fit_base_c["r2"]
    print(f"  Baseline (31 ints + 4 L2 lines)  R² δ¹⁸O = {r2_base_o:.4f}  R² δ¹³C = {r2_base_c:.4f}")

    all_beats = enumerate_eigenmode_beats()
    off_lattice = [(lab, p) for lab, p in all_beats
                   if is_off_lattice(p, threshold_pct=5.0)[0]]
    print(f"  Total candidate beats (100-10000 kyr): {len(all_beats)}")
    print(f"  Off-lattice (>5% from any 8H/N): {len(off_lattice)}")
    print()
    print(f"  Scanning each off-lattice candidate as +1 fit on top of baseline:")
    print(f"  {'label':12s}  {'period(kyr)':>12s}  {'ΔR²(d18o)':>11s}  {'ΔR²(d13c)':>11s}  {'ratio':>7s}  promote?")

    rows = []
    for label, p in sorted(off_lattice, key=lambda x: x[1]):
        fit_o = fit_components(t_o, y_o, base_periods + [p])
        fit_c = fit_components(t_c, y_c, base_periods + [p])
        delta_o = fit_o["r2"] - r2_base_o
        delta_c = fit_c["r2"] - r2_base_c
        ratio = delta_c / delta_o if delta_o > 1e-6 else None
        # Promotion criteria: ΔR² > 0.005 on either proxy, ratio > 1.5 carbon-amplified or > 0.5 mixed
        promote = ((delta_o > 0.005 or delta_c > 0.005) and
                   (ratio is None or ratio > 0.5))
        rr = f"{ratio:.2f}" if ratio is not None else "—"
        flag = "★" if promote else " "
        print(f"  {label:12s}  {p:>12.1f}  {delta_o:>+11.4f}  {delta_c:>+11.4f}  {rr:>7s}  {flag}")
        rows.append({
            "label": label,
            "period_kyr": p,
            "delta_r2_d18o": delta_o,
            "delta_r2_d13c": delta_c,
            "d13c_over_d18o_variance_ratio": ratio,
            "promoted": bool(promote),
        })

    promoted = [r for r in rows if r["promoted"]]
    print(f"\n  Promoted candidates (★): {len(promoted)}")
    for r in promoted:
        print(f"    {r['label']:12s}  {r['period_kyr']:.1f} kyr  ΔR²(d13c) = {r['delta_r2_d13c']:+.4f}  ratio = {r['d13c_over_d18o_variance_ratio'] if r['d13c_over_d18o_variance_ratio'] else 'N/A'}")

    return {
        "baseline_r2_d18o": r2_base_o,
        "baseline_r2_d13c": r2_base_c,
        "n_candidates_total": len(all_beats),
        "n_off_lattice": len(off_lattice),
        "n_promoted": len(promoted),
        "candidates": rows,
        "promoted": promoted,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H VARIANCE BUDGET — TIER B ROUND 1 (doc 18)")
    print("=" * 78)
    print(f"H = {H} kyr;  8H = {EIGHT_H:.3f} kyr")
    print(f"Round 1 stages: B4 + B1 + C8 + B2")

    ages_lr04, vals_lr04 = load_lr04()
    ages_cgd, d13c_cgd, d18o_cgd = load_cenogrid()
    print(f"  LR04:     {len(ages_lr04)} samples (0-{ages_lr04.max():.0f} kyr)")
    print(f"  CENOGRID: {len(ages_cgd)} samples (0-{ages_cgd.max()/1000:.1f} Ma)")

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
            "harmonics_405k_kyr": HARMONICS_405K,
            "cenozoic_transitions_ma": CENOZOIC_TRANSITIONS_MA,
        }
    }

    out["b4_cenogrid_detrend"] = stage_b4_cenogrid_detrend(ages_cgd, d13c_cgd, d18o_cgd)
    out["b1_harmonics"] = stage_b1_harmonics(ages_lr04, vals_lr04, ages_cgd, d13c_cgd, d18o_cgd)
    out["c8_joint_proxy"] = stage_c8_joint_proxy(ages_cgd, d13c_cgd, d18o_cgd)
    out["b2_eigenmode_enum"] = stage_b2_eigenmode_enumeration(ages_cgd, d13c_cgd, d18o_cgd)

    out["meta"] = {
        "script": str(SCRIPT_DIR / "milankovitch_8h_variance_budget_tier_b.py"),
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

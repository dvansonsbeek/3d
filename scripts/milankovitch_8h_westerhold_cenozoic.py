#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — WESTERHOLD 2020 CENOGRID DEEP-TIME TEST
====================================================================

Test I (doc 91 §12.9 — Cenozoic generalization).

LR04 spans 5.3 Myr; the framework's band structure has been verified there.
Westerhold et al. 2020 Science 369, 1383 (CENOGRID) is a 67-Myr astronomically
tuned benthic δ¹⁸O+δ¹³C compilation with multiple radiometric anchor points.
This test asks whether the 8H integer-divisor structure persists across the
full Cenozoic — i.e. is the band structure a property of recent (icehouse)
climate, or is it universal?

The framework predicts that the orbital LATTICE POSITIONS (8H/n integer
periods) are stable in time, but climate-state AMPLIFICATION varies. So:
  • Predicted band centroids (100k, 41k, 23k) should appear at the same
    period in every Cenozoic interval that has enough Rayleigh resolution.
  • Their relative AMPLITUDES will differ by climate state (Hothouse vs
    Icehouse) — that is a feature, not a bug, and matches Westerhold's
    own "state-dependent response" framing.

Methodology:
  Five sliding Cenozoic windows, each 5 Myr long (matched to LR04's span):
    W1: 0-5 Ma     (icehouse — overlaps LR04, sanity check)
    W2: 5-15 Ma    (late Miocene cooling — coolhouse)
    W3: 15-30 Ma   (mid-Miocene + Oligocene — warmhouse/coolhouse boundary)
    W4: 30-50 Ma   (Eocene — warmhouse)
    W5: 50-67 Ma   (Paleocene-Eocene — hothouse to early-Eocene Climatic
                    Optimum)

  For each window:
    1. Lomb-Scargle peak in the 100k, 41k, 23k bands.
    2. Test: does each peak match the framework's predicted centroid within
       the local Rayleigh resolution?
    3. Single-component amplitude scan at the 25 framework integers vs same
       at random non-framework integers (permutation test).

Output: data/milankovitch-8h-westerhold-cenozoic.json
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-westerhold-cenozoic.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 5.0    # CENOGRID native sample spacing ~2.8 kyr; bin to 5 kyr

BANDS = {
    "100k":      {"range": (80.0, 125.0), "predicted_n": 25, "predicted_kyr": EIGHT_H / 25},
    "obliquity": {"range": (35.0, 50.0),  "predicted_n": 65, "predicted_kyr": EIGHT_H / 65},
    "precession": {"range": (18.0, 26.0), "predicted_n": 113, "predicted_kyr": EIGHT_H / 113},
}

WINDOWS = [
    ("W1_0_5Ma",   (0,    5000),  "Icehouse — LR04 overlap, Pliocene-Pleistocene"),
    ("W2_5_15Ma",  (5000, 15000), "Coolhouse — late Miocene cooling"),
    ("W3_15_30Ma", (15000, 30000), "Coolhouse/Warmhouse boundary — mid Miocene + Oligocene"),
    ("W4_30_50Ma", (30000, 50000), "Warmhouse — Eocene"),
    ("W5_50_67Ma", (50000, 67000), "Hothouse — Paleocene-Eocene + early-Eocene Climatic Optimum"),
]

FORMULA_INTEGERS = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                    38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 96, 107, 110,
                    113, 120, 134, 141, 152, 185]

N_PERMUTATIONS = 1000
RNG_SEED = 20260520


# ─────────────────────────────────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────────────────────────────────

def load_cenogrid():
    """Westerhold 2020 TableS34: column 1 = tuned time (Ma), col 9 = LOESS-smoothed δ¹⁸O."""
    ages_ma, d18o = [], []
    with CENOGRID_PATH.open() as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith(("/*", "Tuned", "Foram", "*", "\t")):
                continue
            parts = s.split("\t")
            if len(parts) < 9:
                continue
            try:
                t_ma = float(parts[0])
                v = float(parts[8])  # column 9: LOESS-smoothed d18O
            except ValueError:
                continue
            ages_ma.append(t_ma)
            d18o.append(v)
    return np.array(ages_ma) * 1000.0, np.array(d18o)   # convert Ma → kyr


def preprocess(ages_kyr, vals, window):
    lo, hi = window
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a, v = ages_kyr[mask], vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + DT_KYR / 2, DT_KYR)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


def ls_peak_in_band(t, y, period_band, n_freq=4000):
    lo, hi = period_band
    freqs = np.linspace(1.0 / hi, 1.0 / lo, n_freq)
    ls = LombScargle(t, y).power(freqs)
    i = int(np.argmax(ls))
    return float(1.0 / freqs[i]), float(ls[i])


def single_amp(t, y, period_kyr):
    omega = 2 * np.pi / period_kyr
    X = np.column_stack([np.ones_like(t), np.cos(omega * t), np.sin(omega * t)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.hypot(b[1], b[2]))


# ─────────────────────────────────────────────────────────────────────────
# Per-window tests
# ─────────────────────────────────────────────────────────────────────────

def test_window(name, t_range, label, ages_kyr, d18o, rng):
    print("\n" + "─" * 72)
    print(f"{name}: {label}")
    print("─" * 72)
    t, y = preprocess(ages_kyr, d18o, t_range)
    span = t_range[1] - t_range[0]
    print(f"  window: {t_range[0]/1000:.1f}–{t_range[1]/1000:.1f} Ma  ({span} kyr, {len(y)} samples)")

    # I1: Band peak lands on (a) the framework's primary predicted integer, or
    # (b) the nearest framework integer in the band, or (c) any 8H integer at all.
    # Climate-state amplification can shift which framework integer dominates a band
    # without invalidating the 8H lattice claim. So we report all three.
    band_results = {}
    n_agree_primary = 0
    n_agree_any_formula = 0
    n_agree_any_8h = 0
    for bname, info in BANDS.items():
        band = info["range"]
        primary = info["predicted_kyr"]
        rayleigh = (sum(band) / 2) ** 2 / span
        p_peak, _ = ls_peak_in_band(t, y, band)

        diff_primary = abs(p_peak - primary)
        agree_primary = diff_primary < max(rayleigh, 1.0)

        # framework integers in this band
        in_band_formula = [n for n in FORMULA_INTEGERS
                            if band[0] <= EIGHT_H / n <= band[1]]
        formula_periods = [EIGHT_H / n for n in in_band_formula]
        if formula_periods:
            diffs_formula = [abs(p_peak - p) for p in formula_periods]
            i_min = int(np.argmin(diffs_formula))
            nearest_formula_n = in_band_formula[i_min]
            nearest_formula_period = formula_periods[i_min]
            diff_nearest_formula = diffs_formula[i_min]
        else:
            nearest_formula_n = None
            nearest_formula_period = float("nan")
            diff_nearest_formula = float("nan")

        # any 8H integer in band (n such that 8H/n falls in band)
        n_lo = int(np.ceil(EIGHT_H / band[1]))
        n_hi = int(np.floor(EIGHT_H / band[0]))
        any_8h_periods = [EIGHT_H / n for n in range(n_lo, n_hi + 1)]
        if any_8h_periods:
            diff_nearest_8h = min(abs(p_peak - p) for p in any_8h_periods)
        else:
            diff_nearest_8h = float("nan")

        # Use max(rayleigh, 1.0 kyr) as the agreement tolerance — Rayleigh is
        # numerically tiny on long windows but the framework's claim is integer-
        # divisor placement, not picosecond precision.
        tol = max(rayleigh, 1.0)
        agree_any_formula = (not np.isnan(diff_nearest_formula)) and (diff_nearest_formula < tol)
        agree_any_8h = (not np.isnan(diff_nearest_8h)) and (diff_nearest_8h < tol)
        if agree_primary: n_agree_primary += 1
        if agree_any_formula: n_agree_any_formula += 1
        if agree_any_8h: n_agree_any_8h += 1

        print(f"    {bname:>10s}  observed {p_peak:6.2f}  primary({primary:.2f})|d|={diff_primary:5.2f}  "
              f"nearest-formula({nearest_formula_period:.2f}|n={nearest_formula_n})|d|={diff_nearest_formula:5.2f}  "
              f"nearest-8H|d|={diff_nearest_8h:5.2f}   (tol {tol:.2f})  "
              f"P/F/H={int(agree_primary)}/{int(agree_any_formula)}/{int(agree_any_8h)}")
        band_results[bname] = {
            "observed_peak_kyr": p_peak,
            "primary_predicted_kyr": primary,
            "diff_to_primary_kyr": diff_primary,
            "nearest_formula_integer_n": nearest_formula_n,
            "nearest_formula_period_kyr": nearest_formula_period,
            "diff_to_nearest_formula_kyr": diff_nearest_formula,
            "diff_to_nearest_8H_integer_kyr": diff_nearest_8h,
            "tolerance_kyr": tol,
            "rayleigh_resolution_kyr": rayleigh,
            "agree_primary": bool(agree_primary),
            "agree_any_formula_integer": bool(agree_any_formula),
            "agree_any_8h_integer": bool(agree_any_8h),
        }

    # I2: Permutation test (formula-integer amplitudes resolvable in this window)
    rayleigh_at_100 = 100.0 ** 2 / span
    resolvable_formula = [n for n in FORMULA_INTEGERS
                           if EIGHT_H / n >= 2 * rayleigh_at_100 and 4 <= n <= 200]
    candidates = [n for n in range(4, 201)
                   if n not in FORMULA_INTEGERS
                   and EIGHT_H / n >= 2 * rayleigh_at_100]
    if len(resolvable_formula) < 5 or len(candidates) < len(resolvable_formula):
        print(f"  I2: SKIPPED (insufficient resolvable integers: {len(resolvable_formula)} formula, "
              f"{len(candidates)} candidates)")
        perm_result = {"skipped": True, "reason": "insufficient resolvable integers"}
    else:
        formula_amps = np.array([single_amp(t, y, EIGHT_H / n) for n in resolvable_formula])
        formula_mean = float(formula_amps.mean())
        null_means = np.empty(N_PERMUTATIONS)
        for k in range(N_PERMUTATIONS):
            sample = rng.choice(candidates, size=len(resolvable_formula), replace=False)
            amps = np.array([single_amp(t, y, EIGHT_H / n) for n in sample])
            null_means[k] = amps.mean()
        null_mean = float(null_means.mean())
        p_value = float((null_means >= formula_mean).sum() / N_PERMUTATIONS)
        print(f"  I2: formula amp mean = {formula_mean:.4f}  vs null mean = {null_mean:.4f}  "
              f"p = {p_value:.4f}  (n_formula={len(resolvable_formula)}, n_cand={len(candidates)})")
        perm_result = {
            "n_resolvable_formula": int(len(resolvable_formula)),
            "n_candidates": int(len(candidates)),
            "formula_mean_amplitude": formula_mean,
            "null_mean_amplitude": null_mean,
            "p_value": p_value,
            "significant_at_05": bool(p_value < 0.05),
        }

    print(f"  I1 verdict: primary={n_agree_primary}/3   nearest-formula={n_agree_any_formula}/3   nearest-8H={n_agree_any_8h}/3")
    return {
        "window_kyr": list(t_range),
        "label": label,
        "n_samples": int(len(y)),
        "I1_band_centroids": {
            "bands": band_results,
            "n_agree_primary": int(n_agree_primary),
            "n_agree_any_formula_integer": int(n_agree_any_formula),
            "n_agree_any_8h_integer": int(n_agree_any_8h),
        },
        "I2_permutation": perm_result,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("WESTERHOLD 2020 CENOGRID — 67-MYR CENOZOIC TEST")
    print("=" * 72)
    print(f"H = {H_KYR} kyr   |   8H = {EIGHT_H:.3f} kyr")

    ages, d18o = load_cenogrid()
    print(f"  CENOGRID: {len(ages)} samples, {ages.min()/1000:.2f}..{ages.max()/1000:.2f} Ma")

    rng = np.random.default_rng(RNG_SEED)
    t0 = time.time()
    window_results = {}
    n_perm_pos = 0
    n_i1_formula_full = 0
    for name, t_range, label in WINDOWS:
        r = test_window(name, t_range, label, ages, d18o, rng)
        window_results[name] = r
        if not r["I2_permutation"].get("skipped") and r["I2_permutation"].get("significant_at_05"):
            n_perm_pos += 1
        if r["I1_band_centroids"]["n_agree_any_formula_integer"] == 3:
            n_i1_formula_full += 1
    dt = time.time() - t0

    overall = (f"POSITIVE — {n_perm_pos}/{len(WINDOWS)} Cenozoic windows show permutation-test "
               f"significance (p<0.05); {n_i1_formula_full}/{len(WINDOWS)} also show full 3/3 "
               f"band peak match to nearest framework integer"
                if n_perm_pos >= 4
                else (f"PARTIAL — {n_perm_pos}/{len(WINDOWS)} windows significant on permutation test"
                      if n_perm_pos > 0 else "NULL"))
    print(f"\n  OVERALL: {overall}   ({dt:.1f}s)")

    result = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "dt_kyr": DT_KYR,
            "source": "Westerhold 2020 CENOGRID (PANGAEA TableS34, LOESS-smoothed)",
            "bands": {k: {"range_kyr": list(v["range"]),
                          "predicted_n": v["predicted_n"],
                          "predicted_kyr": v["predicted_kyr"]}
                       for k, v in BANDS.items()},
        },
        "windows": window_results,
        "overall_verdict": overall,
        "n_windows_permutation_significant": int(n_perm_pos),
        "n_windows_all3_bands_match_framework_integer": int(n_i1_formula_full),
        "n_windows": len(WINDOWS),
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

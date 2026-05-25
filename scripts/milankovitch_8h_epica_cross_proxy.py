#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — EPICA CO₂ CROSS-PROXY VALIDATION
=============================================================

Test H (doc 17 §12.8 — cross-proxy).

The 8H framework explains LR04 benthic δ¹⁸O (marine sediment ice-volume
proxy) and Cheng 2016 speleothem δ¹⁸O (continental monsoon proxy). The
proper test of "orbital forcing structure" is whether the SAME band
structure appears in a third independent proxy with a different climate-
recording mechanism.

Dataset: Bereiter et al. (2015, GRL 42, 542) revised EPICA Dome C composite
atmospheric CO₂ record, 0–800 kyr BP, from Antarctic ice cores. This is:
  • Independent chronology (ice-flow age model, gas-age dated)
  • Independent climate signal (atmospheric CO₂ vs ice-volume δ¹⁸O)
  • Same time interval covers ~3 full glacial cycles
  • Different physical recording mechanism (atmospheric trapped gas)

Source: NOAA/NCEI Paleoclimatology Database
URL: https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite.txt
Local cache: data/epica-co2-bereiter2015.txt

Sub-tests:
  H1 — Band centroid agreement: same Lomb-Scargle peak periods in
       100k/41k/23k bands in EPICA CO₂ as in LR04 (matched 0-800 kyr).
  H2 — Formula-integer amplitude pattern: are EPICA amplitudes louder at
       8H formula integers than at random non-formula positions?
  H3 — Glacial-termination timing: do CO₂-defined deglaciation events
       align with model peaks in the same way as δ¹⁸O glacial maxima do
       (Test G companion)?

Output: data/milankovitch-8h-epica-cross-proxy.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend, find_peaks
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
EPICA_PATH = DATA_DIR / "epica-co2-bereiter2015.txt"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
OUT_PATH = DATA_DIR / "milankovitch-8h-epica-cross-proxy.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
DT_KYR = 1.0
T_WINDOW = (0, 800)   # EPICA covers 0-800 kyr BP

BANDS = {
    "100k":      {"range": (80.0, 125.0), "predicted_n": 25, "predicted_kyr": EIGHT_H / 25},
    "obliquity": {"range": (35.0, 50.0),  "predicted_n": 65, "predicted_kyr": EIGHT_H / 65},
    "precession": {"range": (18.0, 26.0), "predicted_n": 113, "predicted_kyr": EIGHT_H / 113},
}

FORMULA_INTEGERS_FULL = [9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
                          38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120]
# Resolvable on 800-kyr record: n ≥ 4 (i.e. P ≤ 670 kyr). Cap n ≤ 30 to mirror Cheng test.
FORMULA_INT_RESOLVABLE = [n for n in FORMULA_INTEGERS_FULL if 4 <= n <= 30]

N_PERMUTATIONS = 1000
RNG_SEED = 20260520


# ─────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────

def load_lr04():
    ages, vals = [], []
    with LR04_PATH.open() as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a); vals.append(v)
    return np.array(ages), np.array(vals)


def load_epica():
    """Bereiter 2015 EPICA composite. Header: age_gas_calBP, co2_ppm, co2_1s_ppm.
    Ages in yr BP (negative = future of 1950)."""
    ages, vals = [], []
    with EPICA_PATH.open() as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#") or s.startswith("age"):
                continue
            parts = s.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            if a < 0:
                continue
            ages.append(a / 1000.0)  # → kyr BP
            vals.append(v)
    return np.array(ages), np.array(vals)


def regrid_detrend(ages, vals, window, dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a, v = ages[mask], vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt / 2, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


# ─────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────

def single_amp(t, y, period_kyr):
    omega = 2 * np.pi / period_kyr
    X = np.column_stack([np.ones_like(t), np.cos(omega * t), np.sin(omega * t)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.hypot(b[1], b[2]))


def ls_peak_in_band(ages, vals, period_band, n_freq=4000):
    lo, hi = period_band
    freqs = np.linspace(1.0 / hi, 1.0 / lo, n_freq)
    ls = LombScargle(ages, vals).power(freqs)
    i = int(np.argmax(ls))
    return float(1.0 / freqs[i]), float(ls[i])


def load_integers():
    try:
        formula = json.loads(FORMULA_JSON.read_text())
        return formula["meta"]["integers"]
    except (FileNotFoundError, KeyError):
        return FORMULA_INTEGERS_FULL


# ─────────────────────────────────────────────────────────────────────────
# H1: Band centroid agreement EPICA vs LR04
# ─────────────────────────────────────────────────────────────────────────

def test_H1_centroids(ages_lr04, vals_lr04, ages_epica, vals_epica):
    print("\n" + "─" * 72)
    print("H1: Band centroid agreement (EPICA CO₂ vs LR04 δ¹⁸O on 0-800 kyr)")
    print("─" * 72)
    mask_lr04 = (ages_lr04 >= T_WINDOW[0]) & (ages_lr04 <= T_WINDOW[1])
    mask_ep = (ages_epica >= T_WINDOW[0]) & (ages_epica <= T_WINDOW[1])
    a_l, v_l = ages_lr04[mask_lr04], vals_lr04[mask_lr04]
    a_e, v_e = ages_epica[mask_ep], vals_epica[mask_ep]

    band_results = {}
    n_agree = 0
    for name, info in BANDS.items():
        band = info["range"]
        predicted = info["predicted_kyr"]
        rayleigh = (sum(band) / 2) ** 2 / (T_WINDOW[1] - T_WINDOW[0])
        p_l, _ = ls_peak_in_band(a_l, v_l, band)
        p_e, _ = ls_peak_in_band(a_e, v_e, band)
        diff = abs(p_l - p_e)
        agree = diff < rayleigh
        if agree: n_agree += 1
        print(f"  {name:>10s}  predicted {predicted:6.2f}  LR04 {p_l:6.2f}  EPICA {p_e:6.2f}  "
              f"|diff| {diff:5.2f}  (Rayleigh {rayleigh:.2f})  agree={agree}")
        band_results[name] = {
            "band_range_kyr": list(band),
            "predicted_centroid_kyr": predicted,
            "lr04_peak_kyr": p_l,
            "epica_peak_kyr": p_e,
            "diff_kyr": diff,
            "rayleigh_resolution_kyr": rayleigh,
            "centroids_agree": bool(agree),
        }
    verdict = ("POSITIVE — chronology-and-proxy-independent agreement"
               if n_agree == len(BANDS)
               else (f"PARTIAL — {n_agree}/{len(BANDS)} bands agree"
                     if n_agree > 0 else "NULL"))
    print(f"  VERDICT: {verdict}")
    return {"bands": band_results, "n_agree": int(n_agree),
             "n_bands": len(BANDS), "verdict": verdict}


# ─────────────────────────────────────────────────────────────────────────
# H2: Formula-integer amplitude pattern on EPICA
# ─────────────────────────────────────────────────────────────────────────

def test_H2_permutation(t, y, rng):
    print("\n" + "─" * 72)
    print("H2: Permutation test — EPICA amplitudes at formula vs non-formula integers")
    print("─" * 72)
    print(f"  resolvable formula integers (4 ≤ n ≤ 30): {FORMULA_INT_RESOLVABLE}")
    n_formula = len(FORMULA_INT_RESOLVABLE)
    formula_amps = np.array([single_amp(t, y, EIGHT_H / n) for n in FORMULA_INT_RESOLVABLE])
    formula_mean = float(formula_amps.mean())

    candidates = [n for n in range(4, 31) if n not in FORMULA_INT_RESOLVABLE]
    null_means = np.empty(N_PERMUTATIONS)
    for k in range(N_PERMUTATIONS):
        sample = rng.choice(candidates, size=n_formula, replace=False)
        amps = np.array([single_amp(t, y, EIGHT_H / n) for n in sample])
        null_means[k] = amps.mean()

    null_mean = float(null_means.mean())
    null_p95 = float(np.percentile(null_means, 95))
    p_value = float((null_means >= formula_mean).sum() / N_PERMUTATIONS)
    significant = bool(p_value < 0.05)
    print(f"  EPICA mean amp at formula integers:  {formula_mean:.4f}")
    print(f"  null mean amp (random non-formula):  {null_mean:.4f}")
    print(f"  null 95th percentile:                {null_p95:.4f}")
    print(f"  p-value (one-sided):                 {p_value:.4f}")
    verdict = "POSITIVE" if significant else "NULL"
    print(f"  VERDICT: {verdict}")
    return {
        "formula_integers": FORMULA_INT_RESOLVABLE,
        "n_permutations": N_PERMUTATIONS,
        "epica_mean_amp_at_formula": formula_mean,
        "null_mean_amp": null_mean,
        "null_p95_amp": null_p95,
        "p_value": p_value,
        "significant_at_05": significant,
        "verdict": verdict,
    }


# ─────────────────────────────────────────────────────────────────────────
# H3: Glacial termination timing
# ─────────────────────────────────────────────────────────────────────────

def test_H3_terminations(t_epica, y_epica, integers):
    """Detect CO2 rises (deglaciations) in EPICA, compare to model's
    interglacial-warming events (model minima of C, the model's δ¹⁸O proxy).
    Lower δ¹⁸O = warmer = interglacial; CO2 high = interglacial.
    So EPICA peaks (max CO2) ↔ model minima (min δ¹⁸O)."""
    print("\n" + "─" * 72)
    print("H3: Interglacial-warming timing (EPICA CO₂ maxima vs model minima)")
    print("─" * 72)
    # Fit model on full LR04
    ages_lr04, vals_lr04 = load_lr04()
    t_full, y_full = regrid_detrend(ages_lr04, vals_lr04, (0, 5320))
    n = len(t_full); k = len(integers)
    X = np.empty((n, 1 + 2 * k))
    X[:, 0] = 1.0
    for i, n_int in enumerate(integers):
        omega = 2 * np.pi * n_int / EIGHT_H
        X[:, 1 + 2 * i] = np.cos(omega * t_full)
        X[:, 2 + 2 * i] = np.sin(omega * t_full)
    beta, *_ = np.linalg.lstsq(X, y_full, rcond=None)
    y_model_full = X @ beta

    mask = (t_full >= T_WINDOW[0]) & (t_full <= T_WINDOW[1])
    t_m = t_full[mask]; y_m = y_model_full[mask]

    # Detect EPICA CO2 maxima (interglacials)
    epica_peaks_idx, _ = find_peaks(y_epica, distance=50, prominence=0.5)
    epica_t = t_epica[epica_peaks_idx]

    # Detect model minima (= peaks of -y_m)
    model_min_idx, _ = find_peaks(-y_m, distance=50, prominence=0.3)
    model_t = t_m[model_min_idx]

    print(f"  EPICA interglacial CO₂ maxima: {len(epica_t)} events, times: {[f'{x:.0f}' for x in epica_t]}")
    print(f"  Model interglacial minima:     {len(model_t)} events, times: {[f'{x:.0f}' for x in model_t]}")

    offsets = []
    for et in epica_t:
        i = int(np.argmin(np.abs(model_t - et)))
        offsets.append(model_t[i] - et)
    offsets = np.array(offsets)
    abs_off = np.abs(offsets)
    med = float(np.median(abs_off))
    within_5 = float((abs_off <= 5).sum() / len(abs_off))
    within_10 = float((abs_off <= 10).sum() / len(abs_off))
    print(f"  median |offset| = {med:.2f} kyr")
    print(f"  within ±5 kyr  = {within_5:.1%}   within ±10 kyr = {within_10:.1%}")
    if med <= 5.0 and within_5 >= 0.5:
        verdict = "POSITIVE — model interglacials align with EPICA CO₂ maxima"
    elif med <= 10.0:
        verdict = "WEAK POSITIVE — offsets > Rayleigh element but < typical cycle half-period"
    else:
        verdict = "NULL"
    print(f"  VERDICT: {verdict}")
    return {
        "epica_co2_maxima_kyr_BP": epica_t.tolist(),
        "model_minima_kyr_BP": model_t.tolist(),
        "per_event_offsets_kyr": offsets.tolist(),
        "median_abs_offset_kyr": med,
        "fraction_within_5_kyr": within_5,
        "fraction_within_10_kyr": within_10,
        "verdict": verdict,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("EPICA Dome C CO₂ CROSS-PROXY VALIDATION")
    print("=" * 72)
    print(f"H = {H_KYR} kyr   |   8H = {EIGHT_H:.3f} kyr")
    print(f"Matched window: {T_WINDOW}")

    ages_lr04, vals_lr04 = load_lr04()
    ages_epica, vals_epica = load_epica()
    print(f"  LR04:  {len(ages_lr04)} samples")
    print(f"  EPICA: {len(ages_epica)} samples, {ages_epica.min():.1f}..{ages_epica.max():.1f} kyr BP")

    t_epica, y_epica = regrid_detrend(ages_epica, vals_epica, T_WINDOW)
    integers = load_integers()

    rng = np.random.default_rng(RNG_SEED)
    h1 = test_H1_centroids(ages_lr04, vals_lr04, ages_epica, vals_epica)
    h2 = test_H2_permutation(t_epica, y_epica, rng)
    h3 = test_H3_terminations(t_epica, y_epica, integers)

    result = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "epica_source": "Bereiter et al. 2015 GRL 42, 542 — NOAA paleo composite",
            "matched_window_kyr": list(T_WINDOW),
            "bands": {k: {"range_kyr": list(v["range"]),
                          "predicted_n": v["predicted_n"],
                          "predicted_kyr": v["predicted_kyr"]}
                       for k, v in BANDS.items()},
        },
        "H1_band_centroid_agreement": h1,
        "H2_permutation_formula_amplitudes": h2,
        "H3_termination_timing": h3,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

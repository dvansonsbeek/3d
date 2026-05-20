#!/usr/bin/env python3
"""
MILANKOVITCH SPECTRAL TESTS
============================

Consolidated spectral-evidence pipeline for the Holistic model's Milankovitch
predictions. Runs four tests on paleoclimate data:

  §7.1 — 405-kyr eccentricity absence (MTM on full LR04)
  §7.2 — Bispectral phase coupling on LR04 (Muller-MacDonald 1997 replication)
  §4   — 100-kyr peak position (MTM and Lomb-Scargle on LR04 + Cheng 2016)
  §5   — Pre-MPT regime-change sanity check

Test §3.6 (cross-planet obliquity) is a documentation-level comparison; no
computation needed. See docs/17-milankovitch-evidence.md §3.6.

Companion document: docs/17-milankovitch-evidence.md
Run:  python3 scripts/milankovitch_spectral_tests.py
"""

import json
import sys
import time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError

import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from astropy.timeseries import LombScargle

# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_CACHE = DATA_DIR / "lr04-stack.txt"
CHENG_CACHE = DATA_DIR / "cheng2016-speleothem.txt"
LR04_URL = "https://www.lorraine-lisiecki.com/LR04stack.txt"
CHENG_URL = "https://www.ncei.noaa.gov/pub/data/paleo/speleothem/asia/china/cheng2016composite.txt"

RNG_SEED = 20260517
DT_KYR = 1.0

# MTM parameters
MTM_NW = 3
MTM_K = 5

# Spectral bands (kyr)
BANDS_KYR = {
    "precession":    (18, 26),
    "obliquity":     (30, 50),
    "100-kyr peak":  (80, 125),
    "405-kyr ecc":   (380, 440),
}

# Bispectrum parameters
BISPEC_SEGMENT_LEN = 1500
BISPEC_OVERLAP = 0.75
ECC_TRIPLET_PERIOD_RANGE = (90, 130)
NULL_SHUFFLES = 50

# Peak-position search band
SEARCH_BAND_KYR = (80, 125)

# Lomb-Scargle config
LS_PERIOD_MIN = 50.0
LS_PERIOD_MAX = 200.0
LS_N_FREQ = 2000

# Test windows
WIN_FULL_LR04 = (0, 5320)
WIN_POST_MPT = (0, 700)
WIN_PRE_MPT = (1700, 2400)
WIN_641 = (0, 641)   # used for LR04↔Cheng comparison


# ═══════════════════════════════════════════════════════════════════════════
# Data loading
# ═══════════════════════════════════════════════════════════════════════════

def _fetch(url, cache_path, label):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if cache_path.exists():
        print(f"  using cached {label}: {cache_path} "
              f"({cache_path.stat().st_size/1e3:.1f} KB)")
        return cache_path
    try:
        with urlopen(url, timeout=120) as r:
            cache_path.write_bytes(r.read())
        print(f"  cached {label} to {cache_path}")
        return cache_path
    except URLError as e:
        print(f"  ERROR: {e}")
        sys.exit(1)


def fetch_lr04():
    return _fetch(LR04_URL, LR04_CACHE, "LR04")


def fetch_cheng():
    return _fetch(CHENG_URL, CHENG_CACHE, "Cheng 2016")


def parse_two_col(path):
    """Parse comment-skipped two-column (age, value) ASCII."""
    ages, v = [], []
    with open(path, "rt") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, x = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            v.append(x)
    return np.array(ages), np.array(v)


def preprocess_window(ages, vals, window):
    """Window + detrend + normalize on uniform grid."""
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    x = vals[mask]
    # If irregular, resample to 1-kyr grid; if uniform 1-kyr, no-op
    grid = np.arange(lo, hi + DT_KYR, DT_KYR)
    v_grid = np.interp(grid, a, x)
    v_det = detrend(v_grid, type="linear")
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return grid, v_norm


def preprocess_raw(ages, vals, window):
    """Window + detrend + normalize on native irregular grid (no interpolation)."""
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    x = vals[mask]
    coeffs = np.polyfit(a, x, 1)
    trend = np.polyval(coeffs, a)
    x_det = x - trend
    x_norm = (x_det - x_det.mean()) / x_det.std()
    return a, x_norm


# ═══════════════════════════════════════════════════════════════════════════
# Spectral methods
# ═══════════════════════════════════════════════════════════════════════════

def mtm_spectrum(x, dt, nw=MTM_NW, k=MTM_K):
    n = len(x)
    tapers = dpss(n, NW=nw, Kmax=k)
    spectra = np.zeros((k, n // 2 + 1))
    for i in range(k):
        X = np.fft.rfft(x * tapers[i], n=n)
        spectra[i] = np.abs(X) ** 2
    return np.fft.rfftfreq(n, d=dt), spectra.mean(axis=0)


def band_peak(freqs, spec, band_kyr):
    f_lo, f_hi = 1.0 / band_kyr[1], 1.0 / band_kyr[0]
    mask = (freqs >= f_lo) & (freqs <= f_hi) & (freqs > 0)
    if not mask.any():
        return None, None
    idx = np.where(mask)[0]
    i_peak = idx[np.argmax(spec[idx])]
    return 1.0 / freqs[i_peak], float(spec[i_peak])


def ls_spectrum(t, y, periods_kyr):
    freqs = 1.0 / periods_kyr
    ls = LombScargle(t, y, center_data=True, fit_mean=True)
    return ls.power(freqs, normalization="standard", method="fast")


def ls_peak(t, y, periods, band_kyr):
    power = ls_spectrum(t, y, periods)
    mask = (periods >= band_kyr[0]) & (periods <= band_kyr[1])
    if not mask.any():
        return None, None
    idx = np.where(mask)[0]
    i_peak = idx[np.argmax(power[idx])]
    return float(periods[i_peak]), float(power[i_peak])


# ═══════════════════════════════════════════════════════════════════════════
# §7.1 — 405-kyr absence test (MTM on full LR04)
# ═══════════════════════════════════════════════════════════════════════════

def test_405_absence(lr04_ages, lr04_d18o):
    print("\n" + "═" * 72)
    print("§7.1 — 405-kyr eccentricity absence test (full LR04, MTM)")
    print("═" * 72)
    t, y = preprocess_window(lr04_ages, lr04_d18o, WIN_FULL_LR04)
    freqs, spec = mtm_spectrum(y, DT_KYR)
    results = {}
    print(f"  {'Band':>16}  {'range (kyr)':>12}  {'peak (kyr)':>11}  {'amplitude':>12}")
    for name, band in BANDS_KYR.items():
        p, a = band_peak(freqs, spec, band)
        results[name] = {"band_kyr": list(band),
                          "peak_period_kyr": p,
                          "peak_amplitude": a}
        print(f"  {name:>16}  {band[0]:>4}-{band[1]:<4}      "
              f"{p:>11.2f}  {a:>12.3e}")
    a_405 = results["405-kyr ecc"]["peak_amplitude"]
    a_100 = results["100-kyr peak"]["peak_amplitude"]
    ratio = a_405 / a_100
    results["ratio_405_over_100"] = float(ratio)
    if ratio > 1.0:
        verdict = "Eccentricity-attribution supported (405 dominates)"
    elif ratio > 0.5:
        verdict = "Ambiguous"
    elif ratio > 0.2:
        verdict = "405-kyr absence quantified"
    else:
        verdict = "405-kyr ESSENTIALLY ABSENT — against eccentricity attribution"
    results["verdict"] = verdict
    print(f"\n  Ratio amp(405-kyr) / amp(100-kyr) = {ratio:.3f}")
    print(f"  VERDICT: {verdict}")
    return results


# ═══════════════════════════════════════════════════════════════════════════
# §7.2 — Bispectral test (Hinich) on full LR04
# ═══════════════════════════════════════════════════════════════════════════

def segmented_bispectrum(x, segment_len, overlap):
    n = len(x)
    step = max(1, int(segment_len * (1 - overlap)))
    n_segments = (n - segment_len) // step + 1
    if n_segments < 3:
        raise ValueError(f"too few segments ({n_segments}) for bispectrum")
    window = np.hanning(segment_len)
    win_norm = np.sqrt(np.mean(window ** 2))
    n_half = segment_len // 2 + 1
    triple = np.zeros((n_half, n_half), dtype=complex)
    denom_top = np.zeros((n_half, n_half), dtype=float)
    denom_bot = np.zeros(n_half, dtype=float)
    for s in range(n_segments):
        start = s * step
        seg = x[start:start + segment_len] * window / win_norm
        X = np.fft.rfft(seg)
        for i in range(n_half):
            for j in range(n_half):
                k = i + j
                if k < n_half:
                    triple[i, j] += X[i] * X[j] * np.conj(X[k])
                    denom_top[i, j] += np.abs(X[i] * X[j]) ** 2
        denom_bot += np.abs(X) ** 2
    triple /= n_segments
    denom_top /= n_segments
    denom_bot /= n_segments
    bicoh = np.zeros_like(denom_top)
    for i in range(n_half):
        for j in range(n_half):
            k = i + j
            if k < n_half:
                d = denom_top[i, j] * denom_bot[k]
                if d > 1e-30:
                    bicoh[i, j] = np.abs(triple[i, j]) ** 2 / d
    freqs = np.fft.rfftfreq(segment_len, d=DT_KYR)
    return freqs, bicoh, n_segments


def max_bicoh_in_triplet(freqs, bicoh, period_range_kyr):
    p_lo, p_hi = period_range_kyr
    f_lo, f_hi = 1.0 / p_hi, 1.0 / p_lo
    mask = (freqs >= f_lo) & (freqs <= f_hi)
    idx = np.where(mask)[0]
    if len(idx) < 2:
        return None, None, None
    sub = bicoh[np.ix_(idx, idx)]
    i_max, j_max = np.unravel_index(np.argmax(sub), sub.shape)
    i_glob, j_glob = idx[i_max], idx[j_max]
    return (float(bicoh[i_glob, j_glob]),
            float(1.0 / freqs[i_glob]),
            float(1.0 / freqs[j_glob]))


def test_bispectrum(lr04_ages, lr04_d18o, rng):
    print("\n" + "═" * 72)
    print("§7.2 — Bispectral phase coupling (LR04, Muller-MacDonald 1997 replication)")
    print("═" * 72)
    t, y = preprocess_window(lr04_ages, lr04_d18o, WIN_FULL_LR04)
    freqs, bicoh, n_seg = segmented_bispectrum(y, BISPEC_SEGMENT_LEN, BISPEC_OVERLAP)
    print(f"  segments averaged: {n_seg}")
    b2_obs, p1, p2 = max_bicoh_in_triplet(freqs, bicoh, ECC_TRIPLET_PERIOD_RANGE)
    print(f"  observed max b² in ecc triplet: {b2_obs:.4f}  at (f1→{p1:.1f}, f2→{p2:.1f}) kyr")

    print(f"  null shuffles ({NULL_SHUFFLES})...")
    null_b2 = []
    for _ in range(NULL_SHUFFLES):
        y_sh = y.copy()
        rng.shuffle(y_sh)
        try:
            _, bicoh_sh, _ = segmented_bispectrum(y_sh, BISPEC_SEGMENT_LEN, BISPEC_OVERLAP)
            b2_sh, _, _ = max_bicoh_in_triplet(freqs, bicoh_sh, ECC_TRIPLET_PERIOD_RANGE)
            null_b2.append(b2_sh)
        except Exception:
            continue
    null_arr = np.array(null_b2)
    null_p95 = float(np.percentile(null_arr, 95))
    null_med = float(np.median(null_arr))
    print(f"  null median b² = {null_med:.4f},  null 95th p. = {null_p95:.4f}")
    print(f"  observed / null95 = {b2_obs / null_p95:.2f}")

    # Honest descriptive verdict
    if b2_obs > null_p95:
        verdict = (f"Observed b² exceeds null 95th percentile — "
                   f"coupling above noise baseline")
    else:
        verdict = (f"Observed b² below null 95th percentile — "
                   f"NO statistically significant coupling (consistent with M-M 1997)")
    print(f"  VERDICT: {verdict}")
    return {
        "n_segments": n_seg,
        "observed_max_bicoherence": b2_obs,
        "observed_at_periods_kyr": [p1, p2],
        "null_shuffles": NULL_SHUFFLES,
        "null_median_b2": null_med,
        "null_p95_b2": null_p95,
        "ratio_observed_over_null_p95": float(b2_obs / null_p95),
        "verdict": verdict,
    }


# ═══════════════════════════════════════════════════════════════════════════
# §4 — Peak-position diagnostic: MTM vs Lomb-Scargle
# §5 — Pre-MPT regime-change sanity check
# ═══════════════════════════════════════════════════════════════════════════

def test_peak_position(lr04_ages, lr04_d18o, cheng_ages, cheng_d18o):
    print("\n" + "═" * 72)
    print("§4 — Peak position diagnostic (window + method dependence)")
    print("═" * 72)

    # MTM on three LR04 windows — demonstrates window-dependent FFT bin pinning
    print("\n  MTM peaks on LR04 by window:")
    mtm_windows = {}
    for label, win in [
        ("0-700 kyr (post-MPT)", WIN_POST_MPT),
        ("0-641 kyr (Cheng window)", WIN_641),
        ("0-5320 kyr (full)", WIN_FULL_LR04),
    ]:
        t, y = preprocess_window(lr04_ages, lr04_d18o, win)
        freqs, spec = mtm_spectrum(y, DT_KYR)
        p, a = band_peak(freqs, spec, SEARCH_BAND_KYR)
        T = win[1] - win[0]
        rayleigh_at_100 = 100.0 ** 2 / T
        mtm_windows[label] = {
            "window_kyr": list(win),
            "T_kyr": T,
            "peak_period_kyr": p,
            "peak_amplitude": a,
            "rayleigh_resolution_at_100kyr": float(rayleigh_at_100),
        }
        print(f"    {label:<30}  T={T:>4}  peak={p:.2f} kyr  "
              f"(Rayleigh at 100 kyr = {rayleigh_at_100:.1f} kyr)")

    # Same-window MTM on Cheng to verify chronology effect (LR04 orbital-tuned
    # vs Cheng U-Th radiometric should yield same FFT bin → no large tuning bias)
    print("\n  MTM on Cheng 2016 at 0-641 kyr (LR04 vs U-Th chronology check):")
    t_c, y_c = preprocess_window(cheng_ages, cheng_d18o, WIN_641)
    freqs_c, spec_c = mtm_spectrum(y_c, DT_KYR)
    p_cheng_641, a_cheng_641 = band_peak(freqs_c, spec_c, SEARCH_BAND_KYR)
    p_lr_641 = mtm_windows["0-641 kyr (Cheng window)"]["peak_period_kyr"]
    print(f"    Cheng MTM peak:  {p_cheng_641:.2f} kyr")
    print(f"    LR04 MTM peak:   {p_lr_641:.2f} kyr")
    if abs(p_cheng_641 - p_lr_641) < 1.0:
        print(f"    Same FFT bin → rules out large (>~15 kyr) chronology bias")
    mtm_windows["0-641 kyr Cheng (U-Th)"] = {
        "window_kyr": list(WIN_641),
        "T_kyr": 641,
        "peak_period_kyr": p_cheng_641,
        "peak_amplitude": a_cheng_641,
        "vs_lr04_same_bin": bool(abs(p_cheng_641 - p_lr_641) < 1.0),
    }

    # Lomb-Scargle on Cheng + LR04 at 641 kyr window (sub-bin freq grid)
    print("\n  Lomb-Scargle peaks on 0-641 kyr window:")
    f_min = 1.0 / LS_PERIOD_MAX
    f_max = 1.0 / LS_PERIOD_MIN
    freqs_grid = np.linspace(f_min, f_max, LS_N_FREQ)
    periods_ls = 1.0 / freqs_grid

    t_l, y_l = preprocess_raw(lr04_ages, lr04_d18o, WIN_641)
    p_lr, pw_lr = ls_peak(t_l, y_l, periods_ls, SEARCH_BAND_KYR)
    print(f"    LR04 (1-kyr grid, N={len(t_l)}):    peak {p_lr:.2f} kyr  power {pw_lr:.4f}")
    t_c, y_c = preprocess_raw(cheng_ages, cheng_d18o, WIN_641)
    p_ch, pw_ch = ls_peak(t_c, y_c, periods_ls, SEARCH_BAND_KYR)
    print(f"    Cheng 2016 (raw irregular, N={len(t_c)}): peak {p_ch:.2f} kyr  power {pw_ch:.4f}")

    print("\n  Rayleigh limit at T=641 kyr ≈ 15 kyr — 99 vs 111.77 not separable")

    # Pre-MPT regime-change sanity check (§5)
    print("\n  §5 — Pre-MPT regime-change sanity check (LR04):")
    t_post, y_post = preprocess_window(lr04_ages, lr04_d18o, WIN_POST_MPT)
    freqs_post, spec_post = mtm_spectrum(y_post, DT_KYR)
    _, a_post = band_peak(freqs_post, spec_post, SEARCH_BAND_KYR)
    t_pre, y_pre = preprocess_window(lr04_ages, lr04_d18o, WIN_PRE_MPT)
    freqs_pre, spec_pre = mtm_spectrum(y_pre, DT_KYR)
    _, a_pre = band_peak(freqs_pre, spec_pre, SEARCH_BAND_KYR)
    ratio = a_post / a_pre if a_pre > 0 else float('inf')
    print(f"    100-kyr-band amplitude in post-MPT (0-700): {a_post:.2f}")
    print(f"    100-kyr-band amplitude in pre-MPT (1700-2400): {a_pre:.2f}")
    print(f"    Ratio post/pre: {ratio:.2f}  (well-known MPT regime change in LR04)")

    return {
        "mtm_window_diagnostic": mtm_windows,
        "lombscargle_lr04_641kyr": {"peak_period_kyr": p_lr, "peak_power": pw_lr,
                                      "n_samples": int(len(t_l))},
        "lombscargle_cheng_641kyr": {"peak_period_kyr": p_ch, "peak_power": pw_ch,
                                      "n_samples": int(len(t_c))},
        "regime_change_check": {
            "post_mpt_amplitude": float(a_post),
            "pre_mpt_amplitude": float(a_pre),
            "ratio_post_over_pre": float(ratio),
        },
        "rayleigh_limit_at_641kyr_kyr": 100.0 ** 2 / 641,
        "rayleigh_note": ("At T=641 kyr the Rayleigh limit is ~15 kyr at the "
                          "100-kyr period scale. 99 kyr and 111.77 kyr are NOT "
                          "separately resolvable."),
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    t0 = time.time()
    rng = np.random.default_rng(RNG_SEED)
    print("=" * 72)
    print("MILANKOVITCH SPECTRAL TESTS")
    print("=" * 72)
    print(f"\nSee docs/17-milankovitch-evidence.md for narrative and synthesis.")
    print(f"RNG seed: {RNG_SEED}")

    print("\nLoading data...")
    fetch_lr04()
    fetch_cheng()
    lr04_ages, lr04_d18o = parse_two_col(LR04_CACHE)
    cheng_ages, cheng_d18o = parse_two_col(CHENG_CACHE)
    print(f"  LR04:        {len(lr04_ages)} samples, {lr04_ages.min():.0f}-{lr04_ages.max():.0f} kyr BP")
    print(f"  Cheng 2016:  {len(cheng_ages)} samples, {cheng_ages.min():.2f}-{cheng_ages.max():.1f} kyr BP")

    r3 = test_405_absence(lr04_ages, lr04_d18o)
    r4 = test_bispectrum(lr04_ages, lr04_d18o, rng)
    r6 = test_peak_position(lr04_ages, lr04_d18o, cheng_ages, cheng_d18o)

    out = DATA_DIR / "milankovitch-spectral-results.json"
    out.write_text(json.dumps({
        "doc_reference": "docs/17-milankovitch-evidence.md",
        "rng_seed": RNG_SEED,
        "test_3_405kyr_absence":       r3,
        "test_4_bispectrum":            r4,
        "test_6_peak_position":         r6,
        "runtime_seconds":              round(time.time() - t0, 2),
    }, indent=2))
    print(f"\nSaved → {out}")
    print(f"Total runtime: {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()

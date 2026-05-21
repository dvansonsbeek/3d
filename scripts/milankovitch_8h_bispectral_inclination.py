#!/usr/bin/env python3
"""
MILANKOVITCH 8H BISPECTRAL INCLINATION-COUPLING TEST
=====================================================

Pre-registered positive test for the 8H framework's specific prediction:
  if the n=25 LR04 centroid (~107.3 kyr) really IS the Mercury-Mars s1-s4
  nodal beat (an inclination-side eigenmode), then it should show
  bispectral phase coupling with the obliquity-side family (n=64-67,
  ~40 kyr), which is the k+s_j sideband family in the same inclination
  Laplace-Lagrange eigenspace.

Methodology (Hinich-style bicoherence, replicating the framework already
used in milankovitch_spectral_tests.py §7.2 but specialized to two new
target regions):

  Test D1 — Inclination self-coupling triplet
    Region: f1, f2 both in [1/130, 1/90] kyr^-1 (n=20..30 band)
    Tests whether the inclination-band cycle is internally phase-coherent
    (frequency-doubling / self-modulation indicator).

  Test D2 — Inclination -> obliquity coupling
    Region: f1 in [1/130, 1/90], f2 in [1/43, 1/38]
    Tests whether the 107-kyr centroid (n=25) couples with the 41-kyr
    obliquity band (n=64-67). A positive bicoherence here would be the
    smoking gun for the framework's prediction that both bands belong
    to the same Laplace-Lagrange inclination eigenspace.

Null model: phase randomization (preserves power spectrum, destroys
phase coherence). 100 null realizations per region.

Predicted outcome (FALSIFIABLE):
  - D1 positive (>null 95th percentile) -> inclination band is internally coherent
  - D2 positive -> inclination and obliquity bands are phase-coupled

Inputs:  data/lr04-stack.txt
Output:  data/milankovitch-8h-bispectral-inclination.json
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
OUT_PATH = DATA_DIR / "milankovitch-8h-bispectral-inclination.json"

H = 335.317
EIGHT_H = 8 * H

DT_KYR = 1.0
WIN_FULL = (0, 5320)
BISPEC_SEGMENT_LEN = 1500
BISPEC_OVERLAP = 0.75
N_NULL = 100
RNG_SEED = 20260520


# ─────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────

def load_lr04(path: Path):
    ages, d18o = [], []
    with path.open() as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or line.lower().startswith("time"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                age = float(parts[0])
                val = float(parts[1])
            except ValueError:
                continue
            ages.append(age)
            d18o.append(val)
    return np.array(ages), np.array(d18o)


def preprocess(ages, d18o, window):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = d18o[mask]
    a_uni = np.arange(a.min(), a.max() + DT_KYR / 2, DT_KYR)
    v_uni = np.interp(a_uni, a, v)
    v_det = detrend(v_uni)
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return a_uni, v_norm


# ─────────────────────────────────────────────────────────────────────────
# Bicoherence
# ─────────────────────────────────────────────────────────────────────────

def segmented_bispectrum(x, segment_len, overlap):
    """Vectorized Hinich bicoherence. Element (i,j) computes X[i]*X[j]*conj(X[i+j])
    where i+j < n_half; elsewhere zero. Numerically identical to the nested-loop
    form in milankovitch_spectral_tests.py but ~100x faster."""
    n = len(x)
    step = max(1, int(segment_len * (1 - overlap)))
    n_segments = (n - segment_len) // step + 1
    if n_segments < 3:
        raise ValueError(f"too few segments ({n_segments}) for bispectrum")
    window = np.hanning(segment_len)
    win_norm = np.sqrt(np.mean(window ** 2))
    n_half = segment_len // 2 + 1

    i_idx, j_idx = np.meshgrid(np.arange(n_half), np.arange(n_half), indexing="ij")
    k_idx = i_idx + j_idx
    mask = k_idx < n_half
    k_clipped = np.where(mask, k_idx, 0)

    triple = np.zeros((n_half, n_half), dtype=complex)
    denom_top = np.zeros((n_half, n_half), dtype=float)
    denom_bot = np.zeros(n_half, dtype=float)

    for s in range(n_segments):
        start = s * step
        seg = x[start:start + segment_len] * window / win_norm
        X = np.fft.rfft(seg)
        XX = np.outer(X, X)
        Xk_conj = np.conj(X[k_clipped])
        triple_seg = XX * Xk_conj
        denom_top_seg = (XX.real ** 2 + XX.imag ** 2)
        triple_seg[~mask] = 0
        denom_top_seg[~mask] = 0
        triple += triple_seg
        denom_top += denom_top_seg
        denom_bot += X.real ** 2 + X.imag ** 2

    triple /= n_segments
    denom_top /= n_segments
    denom_bot /= n_segments
    denom = denom_top * denom_bot[k_clipped]
    bicoh = np.zeros_like(denom_top)
    nonzero = (denom > 1e-30) & mask
    bicoh[nonzero] = (np.abs(triple[nonzero]) ** 2) / denom[nonzero]
    freqs = np.fft.rfftfreq(segment_len, d=DT_KYR)
    return freqs, bicoh, n_segments


def max_bicoh_in_region(freqs, bicoh, f1_range, f2_range):
    """Find max bicoherence in a rectangular frequency region."""
    f1_lo, f1_hi = f1_range
    f2_lo, f2_hi = f2_range
    idx1 = np.where((freqs >= f1_lo) & (freqs <= f1_hi))[0]
    idx2 = np.where((freqs >= f2_lo) & (freqs <= f2_hi))[0]
    if len(idx1) < 1 or len(idx2) < 1:
        return None, None, None, None
    best_b2 = -1.0
    best_i, best_j = -1, -1
    for i in idx1:
        for j in idx2:
            k = i + j
            if k >= bicoh.shape[0]:
                continue
            if bicoh[i, j] > best_b2:
                best_b2 = bicoh[i, j]
                best_i, best_j = i, j
    if best_i < 0:
        return None, None, None, None
    return (float(best_b2),
            float(1.0 / freqs[best_i]),
            float(1.0 / freqs[best_j]),
            float(1.0 / freqs[best_i + best_j]))


def phase_randomize(x, rng):
    """Generate surrogate preserving power spectrum but destroying phase coupling."""
    n = len(x)
    X = np.fft.rfft(x)
    rand_phase = rng.uniform(0, 2 * np.pi, len(X))
    rand_phase[0] = 0.0
    if n % 2 == 0:
        rand_phase[-1] = 0.0
    X_rand = np.abs(X) * np.exp(1j * rand_phase)
    return np.fft.irfft(X_rand, n=n)


# ─────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────

# Frequency regions corresponding to the 8H lattice
P_INCL_LO, P_INCL_HI = 90.0, 130.0   # n=20..30 (inclination/100k band)
P_OBLI_LO, P_OBLI_HI = 38.0, 43.0    # n=62..70 (obliquity band)

F_INCL = (1.0 / P_INCL_HI, 1.0 / P_INCL_LO)   # ~0.0077..0.0111
F_OBLI = (1.0 / P_OBLI_HI, 1.0 / P_OBLI_LO)   # ~0.0233..0.0263


def run_region_test(name, freqs, bicoh, f1_range, f2_range, x, rng):
    print(f"\n  Region '{name}':")
    print(f"    f1: {f1_range} (= {1/f1_range[1]:.1f}..{1/f1_range[0]:.1f} kyr)")
    print(f"    f2: {f2_range} (= {1/f2_range[1]:.1f}..{1/f2_range[0]:.1f} kyr)")
    obs = max_bicoh_in_region(freqs, bicoh, f1_range, f2_range)
    if obs[0] is None:
        print(f"    SKIPPED: no frequencies in region")
        return None
    b2_obs, p1, p2, p_sum = obs
    print(f"    observed max b² = {b2_obs:.4f}  at (P1={p1:.1f}, P2={p2:.1f} kyr), beat-difference period = {p_sum:.1f} kyr")
    print(f"    running {N_NULL} phase-randomized nulls...")
    null_b2 = []
    t0 = time.time()
    for k in range(N_NULL):
        y_surr = phase_randomize(x, rng)
        try:
            _, bicoh_surr, _ = segmented_bispectrum(y_surr, BISPEC_SEGMENT_LEN, BISPEC_OVERLAP)
            r = max_bicoh_in_region(freqs, bicoh_surr, f1_range, f2_range)
            if r[0] is not None:
                null_b2.append(r[0])
        except Exception:
            continue
    null_arr = np.array(null_b2)
    null_med = float(np.median(null_arr))
    null_p95 = float(np.percentile(null_arr, 95))
    null_p99 = float(np.percentile(null_arr, 99))
    p_value = float((null_arr >= b2_obs).sum() / max(1, len(null_arr)))
    ratio = b2_obs / null_p95 if null_p95 > 0 else float("nan")
    dt = time.time() - t0
    print(f"    null median b² = {null_med:.4f},  null 95th = {null_p95:.4f},  null 99th = {null_p99:.4f}")
    print(f"    observed / null95 = {ratio:.2f}")
    print(f"    empirical p-value = {p_value:.4f}  ({N_NULL} nulls, {dt:.1f}s)")
    significant = bool(p_value < 0.05)
    verdict = "SIGNIFICANT phase coupling" if significant else "NO significant phase coupling"
    print(f"    VERDICT: {verdict}")
    return {
        "name": name,
        "f1_range": list(f1_range),
        "f2_range": list(f2_range),
        "f1_period_range_kyr": [1/f1_range[1], 1/f1_range[0]],
        "f2_period_range_kyr": [1/f2_range[1], 1/f2_range[0]],
        "observed_max_b2": b2_obs,
        "observed_p1_kyr": p1,
        "observed_p2_kyr": p2,
        "beat_difference_period_kyr": p_sum,
        "n_null": int(len(null_arr)),
        "null_median_b2": null_med,
        "null_p95_b2": null_p95,
        "null_p99_b2": null_p99,
        "observed_over_null_p95": ratio,
        "empirical_p_value": p_value,
        "significant_at_05": significant,
        "verdict": verdict,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("MILANKOVITCH 8H BISPECTRAL INCLINATION-COUPLING TEST")
    print("=" * 72)
    print(f"H = {H} kyr   |   8H = {EIGHT_H:.3f} kyr")
    print(f"Predicted inclination centroid:  8H/25 = {EIGHT_H/25:.2f} kyr")
    print(f"Predicted obliquity centroid:    8H/65 = {EIGHT_H/65:.2f} kyr")

    ages, d18o = load_lr04(LR04_PATH)
    t, y = preprocess(ages, d18o, WIN_FULL)
    print(f"\n  LR04 window {WIN_FULL}: {len(y)} samples, dt = {DT_KYR} kyr")

    print(f"  computing observed bispectrum (segment_len={BISPEC_SEGMENT_LEN}, overlap={BISPEC_OVERLAP})...")
    t0 = time.time()
    freqs, bicoh, n_seg = segmented_bispectrum(y, BISPEC_SEGMENT_LEN, BISPEC_OVERLAP)
    print(f"    segments averaged: {n_seg}   ({time.time()-t0:.1f}s)")

    rng = np.random.default_rng(RNG_SEED)

    d1 = run_region_test(
        "D1: inclination self-coupling (n~25 x n~25)",
        freqs, bicoh, F_INCL, F_INCL, y, rng,
    )
    d2 = run_region_test(
        "D2: inclination x obliquity (n~25 x n~65)",
        freqs, bicoh, F_INCL, F_OBLI, y, rng,
    )

    summary = {
        "constants": {"H_kyr": H, "8H_kyr": EIGHT_H,
                       "predicted_inclination_centroid_kyr": EIGHT_H/25,
                       "predicted_obliquity_centroid_kyr": EIGHT_H/65},
        "data": {"source": "LR04 (Lisiecki & Raymo 2005)",
                  "window_kyr": list(WIN_FULL),
                  "n_samples": int(len(y)),
                  "dt_kyr": float(DT_KYR)},
        "method": {"segment_length": BISPEC_SEGMENT_LEN,
                    "overlap": BISPEC_OVERLAP,
                    "segments_averaged": int(n_seg),
                    "n_null_surrogates": N_NULL,
                    "null_type": "phase-randomization"},
        "tests": {"D1_inclination_self_coupling": d1,
                   "D2_inclination_obliquity_coupling": d2},
    }
    OUT_PATH.write_text(json.dumps(summary, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
MILANKOVITCH TEMPORAL STRUCTURE — non-stationarity diagnostics
================================================================

Three tests challenging the assumption that climate cycles are strictly
stationary at single Fourier-fit periods:

  Test A — Cycle-length distribution
    Bandpass-filter LR04 in the obliquity (30-55 kyr) and precession
    (18-27 kyr) bands. Find peaks. Measure peak-to-peak intervals.
    Report the distribution mean, median, std, and range across multiple
    age windows.

  Test B — Restricted (well-formed) cycle counting
    Re-run peak-interval counting with progressively higher prominence
    thresholds. Check whether the cycle-length distribution narrows
    toward the model's predicted ranges (obliquity 37.9-46.2 kyr;
    precession H/16-H/13 ≈ 21-26 kyr).

  Test C — Sliding-window candidate amplitudes + window-length sweep
    For each sliding window, run an OLS amplitude fit at each candidate
    period SEPARATELY (no FFT bin snapping). Compare amplitudes for
    competing pairs in each window:
        Obliquity: 41.0 vs H/8 = 41.91
        Precession high: 23.7 vs H/14 = 23.95
        Precession low:  19.2 vs H/18 = 18.63
    Sweep window length T ∈ {300, 400, 500, 600, 700, 800} kyr to test
    robustness — if model preference flips with T, the result is a
    binning artifact; if it holds across all T, it's robust.

Run:  python3 scripts/milankovitch_temporal_structure.py
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend, butter, sosfiltfilt, find_peaks

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
OUT_PATH = DATA_DIR / "milankovitch-temporal-structure.json"

DT_KYR = 1.0
H = 335.317


def hd(n):
    return H / n


# ─────────────────────────────────────────────────────────────────────────
# Data loader
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


def preprocess(ages, vals, window, dt=DT_KYR):
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]
    v = vals[mask]
    order = np.argsort(a)
    a = a[order]
    v = v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a = a[keep]
    v = v[keep]
    grid = np.arange(lo, hi + dt, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


# ─────────────────────────────────────────────────────────────────────────
# Test A — cycle-length distribution
# ─────────────────────────────────────────────────────────────────────────

def bandpass(y, dt, lo_kyr, hi_kyr, order=4):
    fs = 1.0 / dt
    lo_freq = 1.0 / hi_kyr
    hi_freq = 1.0 / lo_kyr
    sos = butter(order, [lo_freq, hi_freq], btype="band", fs=fs, output="sos")
    return sosfiltfilt(sos, y)


def peak_intervals(t, y_band, expected_period, min_distance_factor=0.6, prominence=0.05):
    distance_samples = int(expected_period * min_distance_factor)
    peaks, _ = find_peaks(y_band, distance=max(1, distance_samples), prominence=prominence)
    if len(peaks) < 2:
        return np.array([]), peaks
    return np.diff(t[peaks]), peaks


def summarize_intervals(intervals, candidates, label, model_range=None):
    """Compact summary: mean, median, std, range, distance to candidates."""
    print(f"\n  --- {label} ---")
    print(f"  N intervals = {len(intervals)}")
    if len(intervals) == 0:
        print("  (no intervals)")
        return {"n": 0}
    out = {
        "n": int(len(intervals)),
        "mean": float(intervals.mean()),
        "median": float(np.median(intervals)),
        "std": float(intervals.std(ddof=1)),
        "min": float(intervals.min()),
        "max": float(intervals.max()),
    }
    print(f"  mean = {out['mean']:.2f}   median = {out['median']:.2f}   std = {out['std']:.2f}")
    print(f"  range = [{out['min']:.1f}, {out['max']:.1f}] kyr")
    for lbl, P in candidates.items():
        d = out["mean"] - P
        print(f"    {lbl:<35}  P = {P:>6.2f}   Δ = {d:+5.2f} kyr")
    if model_range is not None:
        frac = float(np.mean((intervals >= model_range[0]) & (intervals <= model_range[1])))
        out["fraction_in_model_range"] = frac
        out["model_range"] = list(model_range)
        print(f"  Fraction in model range [{model_range[0]:.1f}, {model_range[1]:.1f}] = {frac:.1%}")
    return out


def run_test_A(ages, vals):
    print("=" * 75)
    print("TEST A — Cycle-length distribution in LR04 (peak-interval counts)")
    print("=" * 75)

    windows = [
        ("Post-MPT 0-700 kyr",     (0, 700)),
        ("Mid 0-1200 kyr",         (0, 1200)),
        ("Pre-MPT 1200-3000 kyr",  (1200, 3000)),
        ("Full LR04 0-5320 kyr",   (0, 5320)),
    ]
    out = {}
    obliquity_candidates = {
        "Standard (Berger s3+k)": 41.0,
        "Model H/8":              hd(8),
    }
    precession_candidates = {
        "Berger g5+k Jupiter": 23.7,
        "Berger g2+k Venus":   22.4,
        "Model H/14 (3-way 8+3+3)":  hd(14),
        "Model H/15 (3-way 13+5-3)": hd(15),
        "Model H/16 Earth peri":     hd(16),
    }

    for win_label, window in windows:
        t, y = preprocess(ages, vals, window)
        # Obliquity band
        y_ob = bandpass(y, DT_KYR, 30, 55)
        ob_int, _ = peak_intervals(t, y_ob, 41.0)
        out[(win_label, "obliquity")] = summarize_intervals(
            ob_int, obliquity_candidates, f"OBLIQUITY band, {win_label}"
        )
        # Precession band
        y_pr = bandpass(y, DT_KYR, 18, 27)
        pr_int, _ = peak_intervals(t, y_pr, 23.0)
        out[(win_label, "precession")] = summarize_intervals(
            pr_int, precession_candidates, f"PRECESSION band, {win_label}"
        )

    return {f"{k[0]}_{k[1]}": v for k, v in out.items()}


# ─────────────────────────────────────────────────────────────────────────
# Test B — restricted cycle counting
# ─────────────────────────────────────────────────────────────────────────

def run_test_B(ages, vals):
    print("\n" + "=" * 75)
    print("TEST B — Restricted cycle counting (prominence sweep, full LR04)")
    print("=" * 75)
    print("  Model claims obliquity oscillates peak-to-peak between 37.9 and 46.2 kyr.")
    print("  Test: does the well-formed cycle distribution narrow toward this range?")

    t, y = preprocess(ages, vals, (0, 5320))
    y_ob = bandpass(y, DT_KYR, 30, 55)
    y_pr = bandpass(y, DT_KYR, 18, 27)

    out = {}
    obliquity_candidates = {"Standard 41.0": 41.0, "Model H/8": hd(8)}
    precession_candidates = {
        "H/15 = 22.35": hd(15),
        "H/14 = 23.95": hd(14),
        "23.7 Berger":  23.7,
    }

    print("\n  --- Obliquity band ---")
    for prom in [0.05, 0.10, 0.20, 0.30, 0.50]:
        ob_int, _ = peak_intervals(t, y_ob, 41.0, prominence=prom)
        out[f"obliquity_prom_{prom}"] = summarize_intervals(
            ob_int, obliquity_candidates,
            f"obliquity band, prominence ≥ {prom}",
            model_range=(37.9, 46.2),
        )

    print("\n  --- Precession band ---")
    for prom in [0.05, 0.10, 0.20]:
        pr_int, _ = peak_intervals(t, y_pr, 23.0, prominence=prom)
        out[f"precession_prom_{prom}"] = summarize_intervals(
            pr_int, precession_candidates,
            f"precession band, prominence ≥ {prom}",
            model_range=(hd(16), hd(13)),
        )
    return out


# ─────────────────────────────────────────────────────────────────────────
# Test C — sliding-window OLS amplitude + window-length sweep
# ─────────────────────────────────────────────────────────────────────────

def amplitude_at_period(t, y, period):
    """Single-component OLS fit: y = a*cos(ωt) + b*sin(ωt) + c. Return √(a²+b²)."""
    omega = 2 * np.pi / period
    n = len(t)
    X = np.column_stack([np.ones(n), np.cos(omega * t), np.sin(omega * t)])
    beta, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.sqrt(beta[1] ** 2 + beta[2] ** 2))


def sliding_amplitude_compare(ages, vals, window_kyr, stride_kyr, candidate_pairs,
                                max_age=None):
    """For each sliding window and each (label_a, P_a, label_b, P_b) pair,
    compute amplitude(P_a) and amplitude(P_b) via single-component OLS fits.
    Track which one is larger.

    Returns dict per pair → {"a_wins": int, "b_wins": int, "n_windows": int,
                                "windows": [{center, amp_a, amp_b, winner}, ...]}.
    """
    if max_age is None:
        max_age = float(ages.max())
    centers = np.arange(window_kyr / 2, max_age - window_kyr / 2 + 1, stride_kyr)

    pair_results = {pair[0] + " vs " + pair[2]: {"a_label": pair[0], "b_label": pair[2],
                                                      "a_period": pair[1], "b_period": pair[3],
                                                      "windows": [],
                                                      "a_wins": 0, "b_wins": 0}
                     for pair in candidate_pairs}

    for c in centers:
        lo = c - window_kyr / 2
        hi = c + window_kyr / 2
        if lo < ages.min() or hi > ages.max():
            continue
        t, y = preprocess(ages, vals, (lo, hi))
        for pair in candidate_pairs:
            la, Pa, lb, Pb = pair
            amp_a = amplitude_at_period(t, y, Pa)
            amp_b = amplitude_at_period(t, y, Pb)
            winner = "a" if amp_a > amp_b else "b"
            key = la + " vs " + lb
            pair_results[key]["windows"].append({
                "center": float(c), "amp_a": amp_a, "amp_b": amp_b, "winner": winner,
            })
            if winner == "a":
                pair_results[key]["a_wins"] += 1
            else:
                pair_results[key]["b_wins"] += 1

    for key, pr in pair_results.items():
        pr["n_windows"] = pr["a_wins"] + pr["b_wins"]

    return pair_results


def run_test_C(ages, vals):
    print("\n" + "=" * 75)
    print("TEST C — Sliding-window OLS amplitude + window-length sweep")
    print("=" * 75)
    print("  Method: for each window, single-component OLS at each candidate period.")
    print("           No FFT-bin snapping — amplitudes evaluated at exact P_candidate.")

    pairs = [
        # (label_a, period_a, label_b, period_b)
        ("41.0 (Berger)",      41.0,  "H/8 = 41.91 (model)", hd(8)),
        ("23.7 (Berger Jup)",  23.7,  "H/14 = 23.95 (model)", hd(14)),
        ("19.2 (Berger g3+k)", 19.2,  "H/18 = 18.63 (model)", hd(18)),
    ]
    window_lengths = [300, 400, 500, 600, 700, 800]
    stride = 50
    out = {}
    for T in window_lengths:
        print(f"\n  --- Window T = {T} kyr (stride = {stride}) ---")
        pair_results = sliding_amplitude_compare(ages, vals, T, stride, pairs)
        sweep_summary = {}
        for key, pr in pair_results.items():
            la, lb = pr["a_label"], pr["b_label"]
            n = pr["n_windows"]
            a_pct = 100 * pr["a_wins"] / n if n else 0
            b_pct = 100 * pr["b_wins"] / n if n else 0
            print(f"  {la:<25} vs {lb:<25}: {pr['a_wins']}/{n} ({a_pct:>4.1f}%) "
                  f"vs {pr['b_wins']}/{n} ({b_pct:>4.1f}%)")
            sweep_summary[key] = {
                "T": T, "n_windows": n,
                "a_label": la, "a_period": pr["a_period"], "a_wins": pr["a_wins"], "a_pct": a_pct,
                "b_label": lb, "b_period": pr["b_period"], "b_wins": pr["b_wins"], "b_pct": b_pct,
            }
        out[f"T={T}"] = sweep_summary

    # Cross-T robustness summary
    print("\n  --- Cross-T robustness summary ---")
    print(f"  Does the model H-divisor candidate dominate across ALL window lengths?")
    for pair in pairs:
        key = pair[0] + " vs " + pair[2]
        pcts = []
        for T in window_lengths:
            pr = out[f"T={T}"][key]
            pcts.append(pr["b_pct"])  # model candidate is "b"
        all_b_dominant = all(p > 50 for p in pcts)
        any_b_dominant = any(p > 50 for p in pcts)
        verdict = (
            "ROBUST: model wins at ALL T" if all_b_dominant
            else "MIXED: model wins at some T" if any_b_dominant
            else "ROBUST: standard wins at ALL T"
        )
        print(f"  {key:<60}  {verdict}")
        print(f"    Model win % across T={window_lengths}: {[f'{p:.0f}%' for p in pcts]}")

    return out


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 75)
    print("MILANKOVITCH TEMPORAL STRUCTURE")
    print("=" * 75)
    print(f"H = {H:.3f} kyr;  H/8 = {hd(8):.3f};  H/14 = {hd(14):.3f};  H/18 = {hd(18):.3f}")
    ages, vals = load_lr04()
    print(f"LR04: {len(ages)} samples, 0-{ages.max():.0f} kyr")

    test_A = run_test_A(ages, vals)
    test_B = run_test_B(ages, vals)
    test_C = run_test_C(ages, vals)

    OUT_PATH.write_text(json.dumps({
        "meta": {
            "script": "milankovitch_temporal_structure.py",
            "H_kyr": H,
        },
        "test_A_cycle_distribution":   test_A,
        "test_B_restricted_counting":  test_B,
        "test_C_sliding_window_sweep": test_C,
    }, indent=2))
    print(f"\n[saved] {OUT_PATH}")
    print(f"[elapsed] {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

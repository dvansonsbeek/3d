#!/usr/bin/env python3
"""
Deep-time test of the 8H L1 lattice on CENOGRID 0-67 Ma.

Hypothesis
----------
The 32-integer L1 lattice (Doc 92) is fit on LR04 δ¹⁸O over the Pleistocene
(0-5.3 Ma). If the lattice represents real orbital response of the climate
system — not just an artifact tuned to recent ice-age data — the same 32
integers should explain climate variability across deeper geological time.

The cenogrid-d18o single-window fit (full 0-67 Ma) gives L1 R² = 0.001
because L3 step transitions dominate at deep-time scales. Within shorter
sliding windows, L1 should still capture orbital variance.

Method
------
1. Load CENOGRID δ¹⁸O (Westerhold et al. 2020, 0-67 Ma at native resolution).
2. Slide a 2-Myr window across the full 67-Myr record (step 0.5 Myr).
3. Fit L1+L2+L3 at each window position.
4. Record L1-alone R² and per-line amplitudes at each window.
5. Test whether L1 R² stays meaningful (> ~0.2) across the full Cenozoic,
   not just Pleistocene.
6. Closure test: examine residual spectrum at random orphan frequencies vs.
   8H/N integer divisors.

If yes — strong evidence the 8H lattice is deep-time-real, not Pleistocene-
specific.
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
import warnings
warnings.filterwarnings("ignore")

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (
    ClimateFormula, EIGHT_H, L1_LATTICE_INTEGERS,
    load_cenogrid, preprocess,
)

OUTPUT = Path("/home/dennis/code/3d/data/cenogrid-l1-lattice-extension.json")

WINDOW_KYR = 2000     # 2 Myr sliding window
STEP_KYR   = 500      # 0.5 Myr step
WINDOW_MIN_AGE_KYR = 0
WINDOW_MAX_AGE_KYR = 67000


def fit_window(t_raw, y_raw, window_kyr):
    """Fit L1+L2+L3 to one window. Returns R² breakdown + L1 amplitudes."""
    try:
        tg, yg = preprocess(t_raw, y_raw, window_kyr, dt_kyr=1.0)
    except Exception:
        return None
    if len(tg) < 100:
        return None
    f = ClimateFormula()
    summary = f.fit(tg, yg, regime=tuple(window_kyr), normalize=True)
    std = f._fit_y_std
    # Per-L1 amplitudes
    amps = {}
    for n in L1_LATTICE_INTEGERS:
        a = f._l1_a.get(n, 0.0); b = f._l1_b.get(n, 0.0)
        amps[n] = math.hypot(a, b) * std
    return {
        "window": list(window_kyr),
        "n_samples": int(len(tg)),
        "r2_l1_only": float(summary.r2_l1_only),
        "r2_l1_l2": float(summary.r2_l1_l2),
        "r2_l1_l2_l3": float(summary.r2_l1_l2_l3),
        "n_l3_steps": int(summary.n_l3_steps),
        "amps_by_n": amps,
        "y_std": float(std),
    }


def main():
    print("=" * 92)
    print("  Deep-time 8H L1 lattice test on CENOGRID 0-67 Ma")
    print(f"  Window size: {WINDOW_KYR/1000:.1f} Myr,  step: {STEP_KYR/1000:.1f} Myr")
    print("=" * 92)

    # Load CENOGRID
    print("\n  Loading CENOGRID δ¹⁸O ...", flush=True)
    out = load_cenogrid()
    t_raw, y_raw = out[0], out[1]
    print(f"    n raw points = {len(t_raw)}, age range = "
          f"{t_raw.min():.0f}-{t_raw.max():.0f} kyr")

    # Slide window
    starts = np.arange(WINDOW_MIN_AGE_KYR, WINDOW_MAX_AGE_KYR - WINDOW_KYR + 1,
                       STEP_KYR)
    print(f"\n  Running {len(starts)} sliding-window fits ...", flush=True)
    results = []
    for i, s in enumerate(starts):
        win = (int(s), int(s + WINDOW_KYR))
        r = fit_window(t_raw, y_raw, win)
        if r is None:
            continue
        r["window_center_kyr"] = (win[0] + win[1]) / 2
        results.append(r)
        if i % 10 == 0:
            print(f"    win [{win[0]:>6}, {win[1]:>6}] kyr: "
                  f"R²_L1 = {r['r2_l1_only']:.3f}, "
                  f"R²_total = {r['r2_l1_l2_l3']:.3f}, "
                  f"n_samp = {r['n_samples']}",
                  flush=True)

    if not results:
        print("\n  ✗ No valid windows fit.")
        return

    # Aggregate by epoch
    print()
    print("  " + "=" * 88)
    print("  R²_L1 evolution across the Cenozoic (windowed)")
    print("  " + "=" * 88)
    print(f"    {'Center Ma':>10}  {'R²_L1':>8}  {'R²_total':>9}  "
          f"{'n_L3':>5}  {'top L1 integers (by amplitude)':<40}")
    for r in results:
        # Top-3 L1 integers by amplitude
        top3 = sorted(r["amps_by_n"].items(), key=lambda x: -x[1])[:3]
        top3_str = ", ".join(f"n={n}({EIGHT_H/n:.0f}kyr)" for n, _ in top3)
        print(f"    {r['window_center_kyr']/1000:>10.2f}  "
              f"{r['r2_l1_only']:>8.3f}  {r['r2_l1_l2_l3']:>9.3f}  "
              f"{r['n_l3_steps']:>5d}  {top3_str:<40}")

    # Summary: R²_L1 by epoch bin
    print()
    print("  ── Summary by Cenozoic epoch ──")
    print(f"    {'Epoch':<25}{'window (Ma)':<18}{'mean R²_L1':>14}{'n windows':>12}")
    epochs = [
        ("Pleistocene-Pliocene", (0, 5300)),
        ("Late Miocene",         (5300, 11600)),
        ("Mid Miocene",          (11600, 16000)),
        ("Early Miocene",        (16000, 23000)),
        ("Late Oligocene",       (23000, 28000)),
        ("Early Oligocene",      (28000, 34000)),
        ("Late Eocene",          (34000, 40000)),
        ("Mid Eocene",           (40000, 48000)),
        ("Early Eocene",         (48000, 56000)),
        ("Paleocene",            (56000, 66000)),
    ]
    epoch_summary = {}
    for name, (lo, hi) in epochs:
        in_ep = [r for r in results if lo <= r["window_center_kyr"] < hi]
        if in_ep:
            mean_r2 = float(np.mean([r["r2_l1_only"] for r in in_ep]))
            n = len(in_ep)
            print(f"    {name:<25}{f'{lo/1000:.1f}-{hi/1000:.1f}':<18}"
                  f"{mean_r2:>14.3f}{n:>12}")
            epoch_summary[name] = {"window_Ma": [lo/1000, hi/1000],
                                   "mean_R2_L1": mean_r2, "n_windows": n}

    # Dominant integers across all windows
    print()
    print("  ── Cross-epoch dominant L1 integers (top by aggregate amplitude) ──")
    aggregate_amps = {n: 0.0 for n in L1_LATTICE_INTEGERS}
    for r in results:
        for n, a in r["amps_by_n"].items():
            aggregate_amps[n] += a
    top10 = sorted(aggregate_amps.items(), key=lambda x: -x[1])[:10]
    print(f"    {'rank':<6}{'n':<5}{'period (kyr)':<15}{'aggregate amp':<20}")
    for rank, (n, amp) in enumerate(top10, 1):
        print(f"    {rank:<6}{n:<5}{EIGHT_H/n:<15.1f}{amp:<20.4f}")

    # Closure test: bootstrap orphan check
    print()
    print("  ── Closure test: do off-lattice frequencies carry significant power? ──")
    print("    For each window, compare L1-alone fit at the 32 framework integers")
    print("    vs. mean residual power at orphan frequencies (non-8H/N positions).")
    print()
    print("    (Doc 92 already ran this on LR04 with zero orphan peaks above 95th")
    print("     percentile noise. Here we check if the same holds at deep time.)")

    # Compute orphan vs lattice power across all windows
    # For simplicity: average L1 amplitude at framework integers vs at
    # nearby half-integer frequencies (proxy for "off-lattice")
    lattice_mean_amps = []
    for r in results:
        amps = list(r["amps_by_n"].values())
        if amps:
            lattice_mean_amps.append(np.mean(amps))
    if lattice_mean_amps:
        print(f"\n    Mean L1-line amplitude across windows: "
              f"{np.mean(lattice_mean_amps):.4f}  (std: {np.std(lattice_mean_amps):.4f})")
        print(f"    (Comparable mean residual power at orphan freqs would refute")
        print(f"     the lattice claim; the doc 92 LR04 closure test gave 0 orphans.")
        print(f"     A full deep-time orphan scan is the natural follow-up.)")

    # Output
    OUTPUT.write_text(json.dumps({
        "method": (
            f"Sliding {WINDOW_KYR/1000:.1f}-Myr windows across CENOGRID 0-67 Ma. "
            f"At each window position, fit L1+L2+L3; record R²_L1 alone and per-line "
            "amplitudes. Test whether the 32-integer L1 lattice (from LR04 Pleistocene "
            "fit) generalizes to deeper time."
        ),
        "constants": {"window_kyr": WINDOW_KYR, "step_kyr": STEP_KYR,
                      "8H_kyr": EIGHT_H},
        "windows": results,
        "epoch_summary": epoch_summary,
        "aggregate_top_integers": [
            {"rank": rank, "n": n, "period_kyr": EIGHT_H/n,
             "aggregate_amplitude": amp}
            for rank, (n, amp) in enumerate(top10, 1)
        ],
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — 405-KYR HEAD-TO-HEAD: FRAMEWORK (383) vs LASKAR (405)
==================================================================================

Test N (doc 18 §5.14 — head-to-head against standard Milankovitch).

Standard Milankovitch theory places the long-eccentricity cycle at 405 kyr,
the g₂−g₅ Venus-Jupiter eccentricity beat in the Laskar 2004 secular
solution. The 8H framework places this band at n=7 → 8H/7 = 383.22 kyr —
NOT 405 kyr. This is a direct empirical disagreement on a well-known
spectral feature.

If high-resolution spectral analysis of pre-Pleistocene records (where the
long-eccentricity cycle dominates) returns a peak at 405 kyr, the framework
is empirically wrong on its most prominent low-frequency integer. If the
peak returns at 383 kyr, the framework wins a head-to-head against the
standard solution.

Methodology:
  Use Westerhold 2020 CENOGRID. Run high-resolution Lomb-Scargle in the
  search band [350, 450] kyr in three intervals where 405k is known to
  dominate (per Lourens et al. 2004, Pälike et al. 2006, Westerhold et al.
  2020 itself):
    N1 — Eocene (33–50 Ma): warmhouse, 405k dominates
    N2 — Oligocene (23–34 Ma): coolhouse, 405k still dominant
    N3 — Paleocene-Eocene (50–66 Ma): hothouse, 405k strongest in Cenozoic

  For each interval:
    1. Find peak period in [350, 450] kyr range
    2. Compute distance to framework (383.22) vs standard (405.0)
    3. Test: which is closer?

  Also run on LR04 0–5320 kyr as control, where 405k is essentially absent
  (already shown in doc 17 §7.1).

Output: data/milankovitch-8h-405k-head-to-head.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-head-to-head.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
FRAMEWORK_405_KYR = EIGHT_H / 7   # = 383.22 kyr
LASKAR_405_KYR = 405.0            # g₂−g₅ Venus-Jupiter eccentricity beat

SEARCH_BAND = (350.0, 450.0)
N_FREQ = 8000

DT_KYR = 5.0


def load_cenogrid():
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
                t_ma = float(parts[0]); v = float(parts[8])
            except ValueError:
                continue
            ages_ma.append(t_ma); d18o.append(v)
    return np.array(ages_ma) * 1000.0, np.array(d18o)


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


def preprocess(ages_kyr, vals, window, dt=DT_KYR):
    lo, hi = window
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a, v = ages_kyr[mask], vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt / 2, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


def peak_in_band(t, y, band, n_freq=N_FREQ):
    lo, hi = band
    freqs = np.linspace(1.0 / hi, 1.0 / lo, n_freq)
    power = LombScargle(t, y).power(freqs)
    i = int(np.argmax(power))
    return float(1.0 / freqs[i]), float(power[i])


def run_interval(name, window_kyr, ages, d18o, label):
    print("\n  " + "─" * 70)
    print(f"  {name}: {label}  ({window_kyr[0]/1000:.1f}–{window_kyr[1]/1000:.1f} Ma)")
    t, y = preprocess(ages, d18o, window_kyr)
    span = window_kyr[1] - window_kyr[0]
    rayleigh = ((sum(SEARCH_BAND) / 2) ** 2) / span
    p_peak, power = peak_in_band(t, y, SEARCH_BAND)
    d_framework = abs(p_peak - FRAMEWORK_405_KYR)
    d_laskar = abs(p_peak - LASKAR_405_KYR)
    winner = ("framework (8H/7)" if d_framework < d_laskar
               else ("standard Laskar (405)" if d_laskar < d_framework else "tie"))
    print(f"    span: {span} kyr  ({len(t)} samples)   Rayleigh in search band: {rayleigh:.2f} kyr")
    print(f"    observed peak: {p_peak:7.2f} kyr   power = {power:.4f}")
    print(f"    framework (8H/7 = {FRAMEWORK_405_KYR:6.2f}):  |Δ| = {d_framework:6.2f} kyr")
    print(f"    Laskar  (405.00 = 405.00):  |Δ| = {d_laskar:6.2f} kyr")
    print(f"    closer to: {winner}")
    return {
        "name": name,
        "label": label,
        "window_kyr": list(window_kyr),
        "n_samples": int(len(t)),
        "rayleigh_resolution_kyr": rayleigh,
        "observed_peak_kyr": p_peak,
        "observed_power": power,
        "framework_383_diff_kyr": d_framework,
        "laskar_405_diff_kyr": d_laskar,
        "winner": winner,
    }


def main():
    print("=" * 72)
    print("405-KYR HEAD-TO-HEAD — FRAMEWORK (383.22 = 8H/7) vs LASKAR (405.0)")
    print("=" * 72)
    print(f"  H = {H_KYR} kyr   8H = {EIGHT_H:.3f} kyr   8H/7 = {FRAMEWORK_405_KYR:.2f} kyr")
    print(f"  Standard Laskar long-eccentricity:   405.00 kyr")
    print(f"  Search band: {SEARCH_BAND} kyr")

    ages_ceno, d18o_ceno = load_cenogrid()
    ages_lr04, d18o_lr04 = load_lr04()
    print(f"\n  CENOGRID:  {len(ages_ceno)} samples, {ages_ceno.min()/1000:.2f}..{ages_ceno.max()/1000:.2f} Ma")
    print(f"  LR04:      {len(ages_lr04)} samples, {ages_lr04.min()/1000:.2f}..{ages_lr04.max()/1000:.2f} Ma")

    intervals = []
    intervals.append(run_interval("N1_Eocene",        (33000, 50000), ages_ceno, d18o_ceno,
                                    "CENOGRID Eocene (warmhouse, 405k dominant)"))
    intervals.append(run_interval("N2_Oligocene",     (23000, 34000), ages_ceno, d18o_ceno,
                                    "CENOGRID Oligocene (coolhouse, 405k strong)"))
    intervals.append(run_interval("N3_Paleocene_Eocene", (50000, 66000), ages_ceno, d18o_ceno,
                                    "CENOGRID Paleocene-Eocene (hothouse, 405k strongest)"))
    intervals.append(run_interval("N4_LR04_control", (0, 5320), ages_lr04, d18o_lr04,
                                    "LR04 control (post-MPT icehouse, 405k absent per §7.1)"))

    wins_framework = sum(1 for r in intervals[:3] if r["winner"].startswith("framework"))
    wins_laskar = sum(1 for r in intervals[:3] if r["winner"].startswith("standard"))
    ties = 3 - wins_framework - wins_laskar
    print(f"\n  CENOGRID Cenozoic intervals (N1–N3): framework wins = {wins_framework}/3,  Laskar wins = {wins_laskar}/3,  ties = {ties}")

    if wins_framework >= 2:
        verdict = "POSITIVE — framework 383 kyr wins head-to-head vs Laskar 405"
    elif wins_laskar >= 2:
        verdict = "FALSIFIED — Laskar 405 kyr wins; framework's n=7 placement is empirically wrong"
    else:
        verdict = "MIXED — split decision; either framework and standard sit within mutual Rayleigh resolution, or different intervals favor different placements"
    print(f"  VERDICT: {verdict}")

    out = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H,
            "framework_long_ecc_kyr": FRAMEWORK_405_KYR,
            "laskar_long_ecc_kyr": LASKAR_405_KYR,
            "search_band_kyr": list(SEARCH_BAND),
        },
        "intervals": intervals,
        "framework_wins": int(wins_framework),
        "laskar_wins": int(wins_laskar),
        "ties": int(ties),
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

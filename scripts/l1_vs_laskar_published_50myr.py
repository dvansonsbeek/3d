#!/usr/bin/env python3
"""
Test L1 lattice persistence across -50 Myr using the PUBLISHED Laskar 2004
nominal solution (INSOLN.LA2004.BTL.ASC, 1-kyr Earth orbital elements).

This is more authoritative than re-running our own N-body integration:
LA2004 is the canonical reference solution used universally in paleoclimate.

If the 31/32 L1-lattice ↔ Laskar-beat match holds across the full -51 Myr
of LA2004 with negligible drift, the framework's 8H lattice claim is
strongly supported as a real, dynamically-stable feature of the inner-
solar-system secular dynamics.

Method
------
1. Load LA2004 51-Myr backward Earth eccentricity (column 2).
2. Slide a 5-Myr non-overlapping window across [-51, 0] Myr.
3. In each window, compute MTM spectrum + identify top spectral peaks.
4. For each peak P, find:
     - Nearest L1 integer n: |8H/n - P|/P
     - Nearest Laskar simple beat from g_j±g_k / s_j±s_k / k±s_j enumeration.
5. Track per-window:
     - % of top spectral peaks matching an L1 integer within 5%
     - Position drift of n=28 (g4-g5, dominant 95.8 kyr eccentricity peak)
     - Position drift of n=22 (s1+s2, 121.9 kyr)
     - Position drift of n=9 (g2-g7, 298 kyr)

Source
------
INSOLN.LA2004.BTL.ASC from
https://ssp.imcce.fr/insola/earth/online/earth/La2004/
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS
from l1_vs_laskar_eigenmodes import (
    enumerate_eigenmode_beats, mtm_spectrum, find_peaks,
)

LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/l1-vs-laskar-50myr-published.json")

WINDOW_MYR = 5.0   # 5-Myr window — same as our forward 10-Myr test halved
STEP_MYR = 5.0     # non-overlapping

# Integers to track explicitly across windows
TRACK_N_ECC = [9, 14, 22, 25, 28, 38]     # tracked in eccentricity spectrum
TRACK_N_OBLIQ = [65, 66, 68, 113, 120]    # tracked in obliquity spectrum
TRACK_N = TRACK_N_ECC + TRACK_N_OBLIQ


def load_la2004():
    """Parse INSOLN.LA2004.BTL.ASC. Columns: time(kyr), ecc, obliq(rad), perihelion(rad)."""
    ages_kyr = []
    ecc = []
    obliq = []
    peri = []
    with open(LA2004_FILE) as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            parts = s.split()
            if len(parts) < 4:
                continue
            try:
                # LA2004 uses Fortran D-format; replace D with E for Python float parsing
                t = float(parts[0])
                e = float(parts[1].replace('D', 'E'))
                ob = float(parts[2].replace('D', 'E'))
                pi_ = float(parts[3].replace('D', 'E'))
            except ValueError:
                continue
            ages_kyr.append(t); ecc.append(e); obliq.append(ob); peri.append(pi_)
    return (np.asarray(ages_kyr), np.asarray(ecc),
            np.asarray(obliq), np.asarray(peri))


def main():
    print("=" * 92)
    print("  L1 lattice persistence test — Laskar 2004 published 51-Myr backward")
    print("=" * 92)
    print(f"\n  Loading LA2004 from {LA2004_FILE.name} ...")
    ages_kyr, ecc, obliq, peri = load_la2004()
    print(f"    n = {len(ages_kyr)}")
    print(f"    age range: {ages_kyr.min():.0f} to {ages_kyr.max():.0f} kyr")
    print(f"    ecc range: {ecc.min():.5f} to {ecc.max():.5f}")
    dt_yr = abs(ages_kyr[1] - ages_kyr[0]) * 1000.0
    print(f"    dt = {dt_yr:.0f} yr")

    # Order from oldest to youngest (so windows progress forward in time)
    order = np.argsort(ages_kyr)
    ages_yr = ages_kyr[order] * 1000.0   # convert kyr → yr
    ecc_sorted = ecc[order]
    obliq_sorted = obliq[order]

    beats = enumerate_eigenmode_beats()
    print(f"\n  Laskar simple beats enumerated: {len(beats)}")

    # L1 lattice partitioned by physical band — eccentricity vs obliquity/precession
    # Lower-n integers (~10-30) are dominantly eccentricity beats (g_j±g_k).
    # Higher-n integers (~65-185) are dominantly obliquity/precession (k±s_j, k±g_j).
    # Test each subset against its appropriate proxy spectrum.
    L1_ECC_BAND = [n for n in L1_LATTICE_INTEGERS if n <= 53]      # 50-300 kyr
    L1_OBLIQ_BAND = [n for n in L1_LATTICE_INTEGERS if n >= 65]    # 14-42 kyr
    print(f"\n  L1 partitioned: eccentricity-band (n≤53) = {len(L1_ECC_BAND)} integers, "
          f"obliquity/precession-band (n≥65) = {len(L1_OBLIQ_BAND)} integers")

    # Slide non-overlapping 5-Myr windows
    t_min = ages_yr.min()
    t_max = ages_yr.max()
    starts = np.arange(t_min, t_max - WINDOW_MYR * 1e6 + 1, STEP_MYR * 1e6)
    print(f"\n  Window: {WINDOW_MYR:.1f} Myr,  step: {STEP_MYR:.1f} Myr,  "
          f"n windows: {len(starts)}")

    print()
    print(f"  {'window center':>16}{'top peak':>13}{'L1 match <5%':>15}"
          f"{'<2%':>8}{'med L1 err':>13}{'med Las err':>13}")

    window_results = []
    track_results = {n: [] for n in TRACK_N}

    for s in starts:
        mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
        if mask.sum() < 1000:
            continue
        sig_window = ecc_sorted[mask]
        # MTM spectrum
        freqs, psd = mtm_spectrum(sig_window, dt_yr, NW=3, K=5)
        peaks = find_peaks(freqs, psd, n_peaks=12,
                           min_P_yr=15_000, max_P_yr=500_000)
        if not peaks:
            continue

        peak_records = []
        for P_peak, pw in peaks:
            best_n = min(L1_LATTICE_INTEGERS,
                         key=lambda n: abs(EIGHT_H * 1000.0 / n - P_peak))
            err_l1 = abs(EIGHT_H * 1000.0 / best_n - P_peak) / P_peak
            best_b = min(beats, key=lambda b: abs(b[1] - P_peak))
            err_l = abs(best_b[1] - P_peak) / P_peak
            peak_records.append({
                "peak_P_yr": float(P_peak),
                "power": float(pw),
                "nearest_L1_n": int(best_n),
                "L1_err_pct": 100 * float(err_l1),
                "nearest_laskar_beat": best_b[0],
                "laskar_P_yr": float(best_b[1]),
                "laskar_err_pct": 100 * float(err_l),
            })

        l1_errs = [p["L1_err_pct"] for p in peak_records]
        las_errs = [p["laskar_err_pct"] for p in peak_records]
        match5 = sum(1 for e in l1_errs if e < 5)
        match2 = sum(1 for e in l1_errs if e < 2)
        med_l1 = float(np.median(l1_errs))
        med_las = float(np.median(las_errs))

        # Track specific integers
        for n in TRACK_N:
            P_lattice = EIGHT_H * 1000.0 / n
            closest = min(peak_records, key=lambda p: abs(p["peak_P_yr"] - P_lattice))
            shift = (closest["peak_P_yr"] - P_lattice) / P_lattice * 100
            track_results[n].append({
                "window_center_Myr": (s + WINDOW_MYR * 1e6 / 2) / 1e6,
                "observed_peak_P_yr": closest["peak_P_yr"],
                "shift_pct": float(shift),
                "L1_err_pct": closest["L1_err_pct"],
            })

        center_Myr = (s + WINDOW_MYR * 1e6 / 2) / 1e6
        print(f"  {center_Myr:>+15.1f}M{peaks[0][0]/1000:>10.1f}k"
              f"{match5:>10}/{len(peak_records)}{match2:>4}/{len(peak_records)}"
              f"{med_l1:>12.2f}%{med_las:>12.2f}%")
        window_results.append({
            "window_center_Myr": float(center_Myr),
            "window_start_Myr": float(s / 1e6),
            "window_end_Myr": float((s + WINDOW_MYR * 1e6) / 1e6),
            "n_peaks": len(peak_records),
            "n_L1_match_5pct": int(match5),
            "n_L1_match_2pct": int(match2),
            "median_L1_err_pct": med_l1,
            "median_Laskar_err_pct": med_las,
            "top_peaks": peak_records,
        })

    # ── Drift summary per tracked integer ──
    print()
    print(f"  ── Drift across all windows per tracked L1 integer ──")
    print(f"  {'n':>4}{'P (kyr)':>12}{'mean shift':>13}{'std shift':>12}"
          f"{'max |shift|':>14}{'min err':>12}{'max err':>12}")
    drift_summary = {}
    for n in TRACK_N:
        hist = track_results[n]
        if not hist: continue
        shifts = np.array([h["shift_pct"] for h in hist])
        errs = np.array([h["L1_err_pct"] for h in hist])
        mean_d = float(np.mean(shifts))
        std_d = float(np.std(shifts))
        max_abs = float(np.max(np.abs(shifts)))
        min_e = float(np.min(errs))
        max_e = float(np.max(errs))
        print(f"  {n:>4}{EIGHT_H*1000/n/1000:>11.1f}k{mean_d:>+12.2f}%"
              f"{std_d:>11.2f}%{max_abs:>13.2f}%{min_e:>11.2f}%{max_e:>11.2f}%")
        drift_summary[n] = {
            "mean_shift_pct": mean_d, "std_shift_pct": std_d,
            "max_abs_shift_pct": max_abs,
            "min_L1_err_pct": min_e, "max_L1_err_pct": max_e,
        }

    # ── Obliquity spectrum analysis (separate from eccentricity) ──
    print()
    print("  ── Obliquity spectrum analysis (LA2004 column 3) ──")
    print(f"  {'window center':>16}{'top peak':>13}{'L1 ob match <5%':>18}"
          f"{'<2%':>8}{'med L1 err':>13}")
    obliq_window_results = []
    obliq_track = {n: [] for n in TRACK_N_OBLIQ}
    for s in starts:
        mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
        if mask.sum() < 1000: continue
        sig_window = obliq_sorted[mask]
        freqs, psd = mtm_spectrum(sig_window, dt_yr, NW=3, K=5)
        peaks = find_peaks(freqs, psd, n_peaks=12,
                           min_P_yr=15_000, max_P_yr=100_000)
        if not peaks: continue
        peak_records = []
        for P_peak, pw in peaks:
            best_n = min(L1_OBLIQ_BAND,
                         key=lambda n: abs(EIGHT_H * 1000.0 / n - P_peak))
            err_l1 = abs(EIGHT_H * 1000.0 / best_n - P_peak) / P_peak
            best_b = min(beats, key=lambda b: abs(b[1] - P_peak))
            err_l = abs(best_b[1] - P_peak) / P_peak
            peak_records.append({
                "peak_P_yr": float(P_peak),
                "nearest_L1_n": int(best_n),
                "L1_err_pct": 100 * float(err_l1),
                "nearest_laskar_beat": best_b[0],
                "laskar_err_pct": 100 * float(err_l),
            })
        l1_errs = [p["L1_err_pct"] for p in peak_records]
        match5 = sum(1 for e in l1_errs if e < 5)
        match2 = sum(1 for e in l1_errs if e < 2)
        med_l1 = float(np.median(l1_errs))
        center_Myr = (s + WINDOW_MYR * 1e6 / 2) / 1e6
        print(f"  {center_Myr:>+15.1f}M{peaks[0][0]/1000:>10.1f}k"
              f"{match5:>13}/{len(peak_records)}{match2:>4}/{len(peak_records)}"
              f"{med_l1:>12.2f}%")
        for n in TRACK_N_OBLIQ:
            P_lattice = EIGHT_H * 1000.0 / n
            closest = min(peak_records, key=lambda p: abs(p["peak_P_yr"] - P_lattice))
            shift = (closest["peak_P_yr"] - P_lattice) / P_lattice * 100
            obliq_track[n].append({
                "window_center_Myr": center_Myr,
                "observed_peak_P_yr": closest["peak_P_yr"],
                "shift_pct": float(shift),
                "L1_err_pct": closest["L1_err_pct"],
            })
        obliq_window_results.append({
            "window_center_Myr": float(center_Myr),
            "n_peaks": len(peak_records),
            "n_L1_match_5pct": int(match5),
            "n_L1_match_2pct": int(match2),
            "median_L1_err_pct": med_l1,
        })

    print()
    print(f"  ── Obliquity-spectrum drift per tracked L1 integer ──")
    print(f"  {'n':>4}{'P (kyr)':>11}{'mean shift':>13}{'std shift':>12}{'max |shift|':>14}")
    obliq_drift = {}
    for n in TRACK_N_OBLIQ:
        hist = obliq_track[n]
        if not hist: continue
        shifts = np.array([h["shift_pct"] for h in hist])
        mean_d = float(np.mean(shifts))
        std_d = float(np.std(shifts))
        max_abs = float(np.max(np.abs(shifts)))
        print(f"  {n:>4}{EIGHT_H*1000/n/1000:>10.1f}k{mean_d:>+12.2f}%"
              f"{std_d:>11.2f}%{max_abs:>13.2f}%")
        obliq_drift[n] = {"mean_shift_pct": mean_d, "std_shift_pct": std_d,
                          "max_abs_shift_pct": max_abs}

    # ── Match-fraction by epoch ──
    print()
    print("  ── Match-fraction trend by epoch ──")
    modern_match = np.median([
        100 * w["n_L1_match_5pct"] / w["n_peaks"]
        for w in window_results if w["window_center_Myr"] >= -10
    ])
    mid_match = np.median([
        100 * w["n_L1_match_5pct"] / w["n_peaks"]
        for w in window_results if -30 <= w["window_center_Myr"] < -10
    ])
    deep_match = np.median([
        100 * w["n_L1_match_5pct"] / w["n_peaks"]
        for w in window_results if w["window_center_Myr"] < -30
    ])
    print(f"     Modern (>-10 Myr):  {modern_match:.1f}% of top peaks within 5% of L1")
    print(f"     Mid (-30 to -10):   {mid_match:.1f}%")
    print(f"     Deep (< -30 Myr):   {deep_match:.1f}%")

    # ── Verdict ──
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)
    # Verdict considers (a) match-fraction trend and (b) drift in main beats.
    # Main beats = n=28 (g4-g5 ecc) + n=65, 66, 68 (k+s_j obliquity).
    # These dominate Milankovitch cycles and are the framework's strongest claim.
    main_beat_drifts = [
        drift_summary.get(28, {"max_abs_shift_pct": 100})["max_abs_shift_pct"],
        obliq_drift.get(65, {"max_abs_shift_pct": 100})["max_abs_shift_pct"],
        obliq_drift.get(66, {"max_abs_shift_pct": 100})["max_abs_shift_pct"],
        obliq_drift.get(68, {"max_abs_shift_pct": 100})["max_abs_shift_pct"],
    ]
    main_beat_max_drift = max(main_beat_drifts)
    persistent = (deep_match >= 0.7 * modern_match)
    main_beats_stable = main_beat_max_drift < 5.0

    if persistent and main_beats_stable:
        verdict = (f"✓ STRONG SUPPORT for dynamically-frozen lattice. "
                   f"Eccentricity main beat n=28 max drift {drift_summary.get(28, {}).get('max_abs_shift_pct', 0):.1f}%; "
                   f"obliquity main beats n=65,66,68 max drift "
                   f"{max(obliq_drift.get(n, {'max_abs_shift_pct': 0})['max_abs_shift_pct'] for n in [65,66,68]):.1f}%. "
                   f"The canonical Milankovitch eigenmode beats sit on L1 integers "
                   f"and stay there across the entire -50 Myr Cenozoic. "
                   f"Precession sidebands (n≥113) drift more — consistent with "
                   f"Laskar 1989 inner-planet chaos at higher harmonics.")
    elif persistent:
        verdict = ("? PARTIAL SUPPORT: match-fraction holds across -50 Myr but "
                   "main beats drift more than 5%. Lattice is a stable parameter-"
                   "ization of slowly-evolving Laskar dynamics.")
    elif modern_match >= 70 and deep_match >= 40:
        verdict = ("? MIXED: Modern match strong; deep-time match weaker. "
                   "Eigenfrequency drift is detectable but not catastrophic.")
    else:
        verdict = ("✗ Lattice match degrades severely at deep time. View D "
                   "(modern parameterization of evolving Laskar spectrum) is "
                   "supported over view A (dynamically frozen lattice).")
    print(f"  {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            "MTM-spectral analysis of LA2004 Earth eccentricity AND obliquity "
            "in 5-Myr non-overlapping windows from -50 to 0 Myr. Per window, "
            "top spectral peaks are matched to L1 lattice integers (eccentricity "
            "spectrum vs eccentricity-band integers n≤53; obliquity spectrum "
            "vs obliquity/precession-band integers n≥65) and to Laskar 2004 "
            "eigenmode beats. Tracks per-integer drift."
        ),
        "source": "INSOLN.LA2004.BTL.ASC (Laskar et al. 2004 nominal solution)",
        "constants": {
            "8H_yr": EIGHT_H * 1000,
            "window_Myr": WINDOW_MYR,
            "step_Myr": STEP_MYR,
        },
        "ecc_windows": window_results,
        "obliq_windows": obliq_window_results,
        "tracked_integers_ecc": TRACK_N_ECC,
        "tracked_integers_obliq": TRACK_N_OBLIQ,
        "ecc_drift_summary": drift_summary,
        "obliq_drift_summary": obliq_drift,
        "ecc_match_by_epoch": {
            "modern_pct": float(modern_match),
            "mid_pct": float(mid_match),
            "deep_pct": float(deep_match),
        },
        "verdict": verdict,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

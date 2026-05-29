#!/usr/bin/env python3
"""
LATE PLIOCENE 8H-AGO ANALOGUE TABLE
====================================

Recomputes the comparison table in the website's "Empirical analogue:
the late Pliocene (8H ago)" section under the canonical 32-component
multi-proxy ridge formula.

The window 2.43-2.68 Ma BC sits exactly 8H = 2.682 Myr before the next
250 kyr — so the L1 orbital component there is byte-identical to the
L1 component of the future window. The Pliocene LR04 record therefore
serves as an empirical analogue for "what an orbital-coupled climate
response to this exact orbital signal looks like".

Compares:
  Window A: Late Pliocene 2,432.5 - 2,682.5 kyr BP (= 8H ago from now / +250 kyr)
  Window B: Post-MPT 0 - 250 kyr BP (the modern window)

Reports per window:
  - n samples
  - LR04 std (normalized after detrending)
  - LR04 correlation r with canonical formula C(t)
  - Normalized LR04 range [min, max]
  - Amplification factor = LR04 std / orbital-std (L1-only)
  - Glacial-peak intervals from LR04 (formula-independent)
  - Dominant LR04 spectral period (formula-independent)

Run:  python3 scripts/milankovitch_late_pliocene_analogue.py
"""

import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import detrend, find_peaks

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from milankovitch_climate_formula import ClimateFormula, load_lr04, H, EIGHT_H  # noqa: E402

DT_KYR = 1.0


def get_window_arrays(ages_kyr, d18o, lo, hi):
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a = ages_kyr[mask]
    v = d18o[mask]
    a_uni = np.arange(a.min(), a.max() + DT_KYR / 2, DT_KYR)
    v_uni = np.interp(a_uni, a, v)
    v_det = detrend(v_uni)
    v_norm = (v_det - v_det.mean()) / v_det.std()
    return a_uni, v_norm


def dominant_period_kyr(v_norm, dt_kyr=DT_KYR):
    n = len(v_norm)
    spec = np.fft.rfft(v_norm)
    freqs = np.fft.rfftfreq(n, d=dt_kyr)
    power = np.abs(spec) ** 2
    # Search in 15-200 kyr band
    band = (freqs > 1.0 / 200) & (freqs < 1.0 / 15)
    if not band.any():
        return float("nan"), float("nan")
    band_f = freqs[band]
    band_p = power[band]
    i_max = int(np.argmax(band_p))
    P_kyr = 1.0 / band_f[i_max]
    amp = float(np.sqrt(band_p[i_max] / n))
    return float(P_kyr), amp


def find_glacial_peaks_intervals(a_kyr, v_norm):
    """Return peak-to-peak intervals between glacial maxima (max in normalized v)."""
    # Use scipy find_peaks with distance constraint of 20 kyr
    peaks, _ = find_peaks(v_norm, distance=20, prominence=0.3)
    if len(peaks) < 2:
        return [], peaks
    peak_ages = a_kyr[peaks]
    intervals = np.diff(peak_ages).tolist()
    return intervals, peak_ages


def main():
    print("=" * 80)
    print("LATE PLIOCENE 8H-AGO ANALOGUE — canonical 32-component formula")
    print("=" * 80)
    print(f"H = {H} kyr, 8H = {EIGHT_H} kyr")
    print()

    # Load LR04
    t_lr04, d18o_lr04 = load_lr04()
    print(f"LR04: {len(t_lr04)} samples over {t_lr04.min():.0f} to {t_lr04.max():.0f} kyr BP")
    print()

    # Window definitions
    today_kyr_BP = 0.0
    future_window_kyr = 250.0       # the 250-kyr-ahead forward-projection window
    pliocene_lo_kyr_BP = EIGHT_H - future_window_kyr  # = 2682.5 - 250 = 2432.5
    pliocene_hi_kyr_BP = EIGHT_H                       # = 2682.5
    print(f"Window A (Late Pliocene, 8H ago from [today, today+250 kyr future]):")
    print(f"  {pliocene_lo_kyr_BP:.1f} - {pliocene_hi_kyr_BP:.1f} kyr BP")
    print(f"Window B (Post-MPT modern):")
    print(f"  0 - 250 kyr BP")
    print()

    # Get LR04 arrays for each window (uniform 1-kyr grid, detrended, normalized)
    a_pliocene, v_pliocene = get_window_arrays(t_lr04, d18o_lr04, pliocene_lo_kyr_BP, pliocene_hi_kyr_BP)
    a_postmpt, v_postmpt   = get_window_arrays(t_lr04, d18o_lr04, 0.0, 250.0)

    print(f"  Window A samples: {len(v_pliocene)}, normalized range [{v_pliocene.min():+.2f}, {v_pliocene.max():+.2f}], std={v_pliocene.std():.3f}")
    print(f"  Window B samples: {len(v_postmpt)}, normalized range [{v_postmpt.min():+.2f}, {v_postmpt.max():+.2f}], std={v_postmpt.std():.3f}")

    # Raw detrended range (in per-mil units), for amplitude comparison
    mask_a_full = (t_lr04 >= pliocene_lo_kyr_BP) & (t_lr04 <= pliocene_hi_kyr_BP)
    mask_b_full = (t_lr04 >= 0.0) & (t_lr04 <= 250.0)
    v_a_raw_det = detrend(d18o_lr04[mask_a_full])
    v_b_raw_det = detrend(d18o_lr04[mask_b_full])
    print(f"  Window A raw detrended (per-mil): range [{v_a_raw_det.min():+.3f}, {v_a_raw_det.max():+.3f}], std={v_a_raw_det.std():.3f}")
    print(f"  Window B raw detrended (per-mil): range [{v_b_raw_det.min():+.3f}, {v_b_raw_det.max():+.3f}], std={v_b_raw_det.std():.3f}")
    print(f"  Amplitude ratio (window B / window A std): {v_b_raw_det.std() / v_a_raw_det.std():.2f}×")
    print()

    # ─── Canonical formula evaluation ───
    # Note: ClimateFormula.evaluate() returns NORMALIZED units (mean 0, std 1 in fit window).
    # To convert back to per-mil units, multiply by the fit's y_std.
    # The amplification factor compares LR04 raw std vs formula L1 raw std in the same units.
    f = ClimateFormula()
    # The Pliocene window 2432-2682 sits inside iNHG-MPT (1000-2700 kyr BP).
    summary_a = f.fit(t_lr04, d18o_lr04, regime="inhg-mpt")
    y_std_a = f._fit_y_std
    c_pliocene = np.array([f.evaluate(a, layer="all") for a in a_pliocene])
    c_pliocene_norm = (c_pliocene - c_pliocene.mean()) / c_pliocene.std()
    cL1_pliocene_norm_units = np.array([f.evaluate(a, layer="l1") for a in a_pliocene])
    # Translate L1 back to per-mil units by multiplying by the fit's y_std
    cL1_pliocene_raw = (cL1_pliocene_norm_units - cL1_pliocene_norm_units.mean()) * y_std_a
    r_pliocene = float(np.corrcoef(v_pliocene, c_pliocene_norm)[0, 1])

    mask_a = (t_lr04 >= pliocene_lo_kyr_BP) & (t_lr04 <= pliocene_hi_kyr_BP)
    v_p_raw_det = detrend(np.interp(a_pliocene, t_lr04[mask_a], d18o_lr04[mask_a]))
    amp_pliocene = float(v_p_raw_det.std() / cL1_pliocene_raw.std())

    # Post-MPT
    f_post = ClimateFormula()
    summary_b = f_post.fit(t_lr04, d18o_lr04, regime="post-mpt")
    y_std_b = f_post._fit_y_std
    c_postmpt = np.array([f_post.evaluate(a, layer="all") for a in a_postmpt])
    c_postmpt_norm = (c_postmpt - c_postmpt.mean()) / c_postmpt.std()
    cL1_postmpt_norm_units = np.array([f_post.evaluate(a, layer="l1") for a in a_postmpt])
    cL1_postmpt_raw = (cL1_postmpt_norm_units - cL1_postmpt_norm_units.mean()) * y_std_b
    r_postmpt = float(np.corrcoef(v_postmpt, c_postmpt_norm)[0, 1])
    mask_b = (t_lr04 >= 0.0) & (t_lr04 <= 250.0)
    v_b_raw_det = detrend(np.interp(a_postmpt, t_lr04[mask_b], d18o_lr04[mask_b]))
    amp_postmpt = float(v_b_raw_det.std() / cL1_postmpt_raw.std())

    # ─── Empirical (formula-independent) measurements ───
    # Glacial-peak intervals in LR04
    intervals_p, peaks_p_ages = find_glacial_peaks_intervals(a_pliocene, v_pliocene)
    intervals_b, peaks_b_ages = find_glacial_peaks_intervals(a_postmpt, v_postmpt)

    # Dominant spectral period
    P_p, amp_p = dominant_period_kyr(v_pliocene)
    P_b, amp_b = dominant_period_kyr(v_postmpt)

    # ─── Report ───
    print("=" * 80)
    print("RESULTS — Empirical Analogue Table (canonical 32-component formula)")
    print("=" * 80)
    print()
    print(f"{'Metric':<48} {'Late Pliocene':>16} {'Post-MPT (0-250 kyr BP)':>22}")
    print("-" * 88)
    print(f"{'Window (kyr BP)':<48} "
          f"{f'{pliocene_lo_kyr_BP:.0f}-{pliocene_hi_kyr_BP:.0f}':>16} "
          f"{'0-250':>22}")
    print(f"{'N samples (1-kyr grid)':<48} {len(v_pliocene):>16} {len(v_postmpt):>22}")
    print(f"{'LR04 correlation with formula C(t)  [r]':<48} "
          f"{r_pliocene:>16.3f} {r_postmpt:>22.3f}")
    print(f"{'LR04 normalized range  [min, max]':<48} "
          f"{f'[{v_pliocene.min():+.2f}, {v_pliocene.max():+.2f}]':>16} "
          f"{f'[{v_postmpt.min():+.2f}, {v_postmpt.max():+.2f}]':>22}")
    print(f"{'Amplification factor (LR04 std / L1 std)':<48} "
          f"{amp_pliocene:>16.2f}× {amp_postmpt:>21.2f}×")
    print(f"{'Glacial-peak intervals (kyr)':<48} "
          f"{', '.join(f'{x:.0f}' for x in intervals_p):>16} "
          f"{', '.join(f'{x:.0f}' for x in intervals_b):>22}")
    if intervals_p:
        print(f"{'  Mean interval (kyr)':<48} "
              f"{np.mean(intervals_p):>16.1f} {np.mean(intervals_b):>22.1f}")
    print(f"{'Dominant spectral period (kyr)':<48} "
          f"{P_p:>16.1f} {P_b:>22.1f}")
    print(f"{'  (peak amplitude)':<48} "
          f"{amp_p:>16.3f} {amp_b:>22.3f}")
    print()

    # ─── Save ───
    out = {
        "meta": {
            "script": "milankovitch_late_pliocene_analogue.py",
            "formula": "canonical 32-component L1 + 3-line L2 + 6-step L3, sequential ridge per regime",
            "H_kyr": H,
            "EIGHT_H_kyr": EIGHT_H,
            "windows": {
                "late_pliocene_kyr_BP": [pliocene_lo_kyr_BP, pliocene_hi_kyr_BP],
                "post_mpt_kyr_BP": [0.0, 250.0],
            },
        },
        "late_pliocene": {
            "n_samples": len(v_pliocene),
            "r_with_formula": r_pliocene,
            "normalized_range": [float(v_pliocene.min()), float(v_pliocene.max())],
            "amplification_factor": amp_pliocene,
            "glacial_peak_intervals_kyr": intervals_p,
            "mean_interval_kyr": float(np.mean(intervals_p)) if intervals_p else None,
            "dominant_period_kyr": P_p,
            "dominant_amplitude": amp_p,
        },
        "post_mpt": {
            "n_samples": len(v_postmpt),
            "r_with_formula": r_postmpt,
            "normalized_range": [float(v_postmpt.min()), float(v_postmpt.max())],
            "amplification_factor": amp_postmpt,
            "glacial_peak_intervals_kyr": intervals_b,
            "mean_interval_kyr": float(np.mean(intervals_b)) if intervals_b else None,
            "dominant_period_kyr": P_b,
            "dominant_amplitude": amp_b,
        },
    }
    out_path = SCRIPT_DIR.parent / "data" / "milankovitch-late-pliocene-analogue.json"
    out_path.write_text(json.dumps(out, indent=2))
    print(f"[saved] {out_path}")


if __name__ == "__main__":
    main()

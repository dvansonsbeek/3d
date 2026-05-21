#!/usr/bin/env python3
"""
405-KYR PHASE STABILITY TEST — ORBITAL LOCK vs CARBON-CYCLE CLOCK
==================================================================

Distinguishes two hypotheses for the 405-kyr cycle:

  H_orbital:  The 405-kyr signal is *directly driven* by the Laskar g₂−g₅
              eccentricity beat. Phase should track Laskar's deterministic
              prediction with high precision. Period should be constant
              across the entire Cenozoic.

  H_internal: The 405-kyr signal is a *carbon-cycle internal oscillation*
              that is entrained (synchronized) by orbital forcing. Phase
              should locally track orbital forcing but show small drifts
              relative to a strictly linear extrapolation, especially
              across climate-state transitions (MPT, Oi-1 glaciation onset).

Predictions:
  (i) If H_orbital: phase residual from a linear model φ(t) = ωt + φ₀
      should be small (< 1 kyr or so).
  (ii) If H_internal: phase residual should show larger drift (tens of
      kyr) coherent across long time intervals, with potential resets at
      climate transitions.
  (iii) δ¹³C is more diagnostic of the carbon cycle. If δ¹³C phase shows
      MORE drift than δ¹⁸O, that would be unusual under H_orbital (since
      both inherit phase from the same orbital forcing) but expected under
      H_internal (carbon cycle drives δ¹³C primarily).
  (iv) Period stability across Cenozoic windows: under H_orbital, Laskar
      gives 405.0 ± 0.5 in every window. Under H_internal, period can
      drift several kyr across climate states.

Methodology:
  A. Bandpass-filter CENOGRID δ¹³C and δ¹⁸O to 380-430 kyr band
  B. Compute analytic signal via Hilbert transform → instantaneous phase
  C. Unwrap phase and fit linear model: φ(t) = ωt + φ₀
  D. Compute residuals Δφ(t) = actual − linear; convert to "phase drift in kyr"
  E. Compare δ¹³C vs δ¹⁸O residual statistics
  F. Also: per-window peak period from Lomb-Scargle — does it drift across windows?

Output: data/milankovitch-8h-405k-phase-stability.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend, hilbert, butter, filtfilt
from scipy.stats import pearsonr
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-phase-stability.json"

DT_KYR = 5.0
WIN_FULL = (0, 67000)

# Bandpass for the 405-kyr cycle
BAND_LOW_PERIOD = 380.0
BAND_HIGH_PERIOD = 430.0

# Sliding window for period-drift analysis
WIN_LEN = 4000   # 4-Myr windows
WIN_STEP = 2000   # 2-Myr step (50% overlap)
SEARCH_BAND = (380, 430)
N_FREQ = 4000


# ─────────────────────────────────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────────────────────────────────

def load_cenogrid_both():
    ages_ma, d13c, d18o = [], [], []
    with CENOGRID_PATH.open() as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith(("/*", "Tuned", "Foram", "*", "\t")):
                continue
            parts = s.split("\t")
            if len(parts) < 9:
                continue
            try:
                t = float(parts[0]); c = float(parts[7]); o = float(parts[8])
            except ValueError:
                continue
            ages_ma.append(t); d13c.append(c); d18o.append(o)
    return np.array(ages_ma) * 1000.0, np.array(d13c), np.array(d18o)


def regrid_detrend(ages_kyr, vals, window, dt=DT_KYR):
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


# ─────────────────────────────────────────────────────────────────────────
# (A-E) Hilbert phase drift
# ─────────────────────────────────────────────────────────────────────────

def hilbert_phase_drift(t, y, label):
    """Extract 380-430 kyr band, get instantaneous phase, measure drift from linear model."""
    fs = 1.0 / DT_KYR
    nyq = fs / 2
    f_high = 1.0 / BAND_LOW_PERIOD
    f_low = 1.0 / BAND_HIGH_PERIOD
    b, a_filt = butter(4, [f_low / nyq, f_high / nyq], btype="band")
    y_filt = filtfilt(b, a_filt, y)
    analytic = hilbert(y_filt)
    inst_phase = np.unwrap(np.angle(analytic))   # radians, unwrapped
    inst_amp = np.abs(analytic)

    # Linear fit: φ(t) = ω₀ t + φ₀
    coeffs = np.polyfit(t, inst_phase, 1)
    omega0 = coeffs[0]   # rad/kyr
    phi0 = coeffs[1]
    period_fitted_kyr = 2 * np.pi / abs(omega0)

    # Residuals (drift from linear)
    phi_linear = omega0 * t + phi0
    residuals_rad = inst_phase - phi_linear
    # Convert to kyr-of-cycle: 1 cycle = 2π rad = 405 kyr (roughly)
    residuals_kyr = residuals_rad * (period_fitted_kyr / (2 * np.pi))

    rms_drift_kyr = float(np.sqrt(np.mean(residuals_kyr ** 2)))
    max_drift_kyr = float(np.max(np.abs(residuals_kyr)))
    mean_amp = float(np.mean(inst_amp))
    amp_cv = float(np.std(inst_amp) / np.mean(inst_amp)) if mean_amp > 0 else 0.0

    print(f"  {label}: fitted period {period_fitted_kyr:.3f} kyr  "
          f"RMS drift {rms_drift_kyr:.2f} kyr  max drift {max_drift_kyr:.2f} kyr  "
          f"amplitude CV {amp_cv:.3f}")
    return {
        "label": label,
        "fitted_period_kyr": float(period_fitted_kyr),
        "rms_drift_kyr": rms_drift_kyr,
        "max_drift_kyr": max_drift_kyr,
        "mean_amplitude": mean_amp,
        "amplitude_cv": amp_cv,
        "phase_residuals_kyr": residuals_kyr.tolist(),
        "t_kyr_BP": t.tolist(),
        "inst_amplitude": inst_amp.tolist(),
    }


# ─────────────────────────────────────────────────────────────────────────
# (F) Sliding-window peak period
# ─────────────────────────────────────────────────────────────────────────

def sliding_period_drift(ages, vals, label):
    print(f"\n  {label}: peak-period drift across sliding 4-Myr windows")
    centers = []
    start = 0
    while start + WIN_LEN <= ages.max():
        centers.append(start + WIN_LEN / 2)
        start += WIN_STEP
    centers = np.array(centers)
    peak_periods = []
    peak_powers = []
    for c in centers:
        lo, hi = c - WIN_LEN / 2, c + WIN_LEN / 2
        t, y = regrid_detrend(ages, vals, (lo, hi))
        if t is None or len(y) < 30:
            peak_periods.append(np.nan); peak_powers.append(np.nan); continue
        freqs = np.linspace(1 / SEARCH_BAND[1], 1 / SEARCH_BAND[0], N_FREQ)
        power = LombScargle(t, y).power(freqs)
        i_peak = int(np.argmax(power))
        peak_periods.append(float(1 / freqs[i_peak]))
        peak_powers.append(float(power[i_peak]))
    peak_periods = np.array(peak_periods)
    peak_powers = np.array(peak_powers)
    mask = np.isfinite(peak_periods)
    mean_p = float(np.nanmean(peak_periods))
    std_p = float(np.nanstd(peak_periods))
    range_p = float(np.nanmax(peak_periods) - np.nanmin(peak_periods))
    print(f"    {len(centers)} windows.  Mean peak period: {mean_p:.2f}  std: {std_p:.2f}  range: {range_p:.2f}")
    print(f"    peak periods across Cenozoic: min {np.nanmin(peak_periods):.2f}  max {np.nanmax(peak_periods):.2f}")
    return {
        "label": label,
        "n_windows": int(mask.sum()),
        "centers_kyr_BP": centers.tolist(),
        "peak_periods_kyr": peak_periods.tolist(),
        "peak_powers": peak_powers.tolist(),
        "mean_peak_period_kyr": mean_p,
        "std_peak_period_kyr": std_p,
        "range_peak_period_kyr": range_p,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("405-KYR PHASE STABILITY TEST — ORBITAL LOCK vs CARBON-CYCLE CLOCK")
    print("=" * 72)

    ages, d13c, d18o = load_cenogrid_both()
    t, y_c = regrid_detrend(ages, d13c, WIN_FULL)
    _, y_o = regrid_detrend(ages, d18o, WIN_FULL)
    print(f"  CENOGRID: {len(t)} samples, {WIN_FULL[0]/1000:.1f}..{WIN_FULL[1]/1000:.1f} Ma")
    print(f"  bandpass: {BAND_LOW_PERIOD}-{BAND_HIGH_PERIOD} kyr\n")

    print("(A-E) Hilbert phase drift (deviation of inst. phase from linear)")
    print("─" * 72)
    drift_d13c = hilbert_phase_drift(t, y_c, "δ¹³C")
    drift_d18o = hilbert_phase_drift(t, y_o, "δ¹⁸O")

    # Compare δ¹³C and δ¹⁸O phase residual variability
    res_c = np.array(drift_d13c["phase_residuals_kyr"])
    res_o = np.array(drift_d18o["phase_residuals_kyr"])
    r_corr, p_corr = pearsonr(res_c, res_o)
    print(f"\n  Correlation between δ¹³C phase residuals and δ¹⁸O phase residuals:")
    print(f"    r = {r_corr:.3f}, p = {p_corr:.2e}")
    print(f"  Under H_orbital: r ≈ 1 (both driven by same orbital phase)")
    print(f"  Under H_internal carbon clock: r could be << 1 (different drivers)")

    # Per-window period drift
    print("\n(F) Per-window peak-period drift across Cenozoic")
    print("─" * 72)
    p_drift_c = sliding_period_drift(ages, d13c, "δ¹³C")
    p_drift_o = sliding_period_drift(ages, d18o, "δ¹⁸O")

    # Verdict
    print("\n" + "═" * 72)
    print("  VERDICT")
    print("═" * 72)
    print(f"  δ¹³C fitted period: {drift_d13c['fitted_period_kyr']:.2f} kyr")
    print(f"  δ¹⁸O fitted period: {drift_d18o['fitted_period_kyr']:.2f} kyr")
    print(f"  δ¹³C RMS phase drift: {drift_d13c['rms_drift_kyr']:.2f} kyr  (max {drift_d13c['max_drift_kyr']:.2f})")
    print(f"  δ¹⁸O RMS phase drift: {drift_d18o['rms_drift_kyr']:.2f} kyr  (max {drift_d18o['max_drift_kyr']:.2f})")
    print(f"  δ¹³C peak-period range across Cenozoic: {p_drift_c['range_peak_period_kyr']:.2f} kyr")
    print(f"  δ¹⁸O peak-period range across Cenozoic: {p_drift_o['range_peak_period_kyr']:.2f} kyr")
    print(f"  δ¹³C-δ¹⁸O phase-residual correlation: r={r_corr:.3f}")

    # Verdict logic:
    #   If RMS drift < 5 kyr and r_corr > 0.7 → orbital lock
    #   If RMS drift > 30 kyr or r_corr < 0.3 → carbon-cycle clock
    if drift_d13c["rms_drift_kyr"] < 5 and drift_d18o["rms_drift_kyr"] < 5 and r_corr > 0.7:
        verdict = "ORBITAL LOCK — phase is stable; both proxies share orbital driver"
    elif drift_d13c["rms_drift_kyr"] > 30 or drift_d18o["rms_drift_kyr"] > 30:
        verdict = "CARBON-CYCLE CLOCK — significant phase drift, consistent with internal oscillator"
    elif r_corr < 0.3:
        verdict = "MIXED — proxies show partially independent phase behaviour"
    else:
        verdict = "INTERMEDIATE — phase locked to orbital forcing but with measurable drift; consistent with entrained internal oscillator"
    print(f"  VERDICT: {verdict}")

    out = {
        "meta": {
            "bandpass_kyr": [BAND_LOW_PERIOD, BAND_HIGH_PERIOD],
            "window_kyr": list(WIN_FULL),
            "sliding_window_len_kyr": WIN_LEN,
            "sliding_window_step_kyr": WIN_STEP,
        },
        "drift_d13c": {k: v for k, v in drift_d13c.items()
                        if k not in ("phase_residuals_kyr", "t_kyr_BP", "inst_amplitude")},
        "drift_d18o": {k: v for k, v in drift_d18o.items()
                        if k not in ("phase_residuals_kyr", "t_kyr_BP", "inst_amplitude")},
        "delta13c_delta18o_phase_residual_correlation": {
            "r": float(r_corr), "p": float(p_corr),
        },
        "period_drift_d13c": {k: v for k, v in p_drift_c.items()
                              if k not in ("centers_kyr_BP", "peak_periods_kyr", "peak_powers")},
        "period_drift_d18o": {k: v for k, v in p_drift_o.items()
                              if k not in ("centers_kyr_BP", "peak_periods_kyr", "peak_powers")},
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

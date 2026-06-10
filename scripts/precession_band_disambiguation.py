#!/usr/bin/env python3
"""
Disambiguate what drives the 'drift' in the obliquity precession band
across LA2004 50 Myr.

Three candidate mechanisms (from Test C-Libration follow-up):
  H1: Two nearby peaks (k+s₃ at ~41.0 kyr and g₆+g₇ at ~41.5 kyr) with
      stationary positions but AMPLITUDE SWAP — our previous test reads
      this as 'drift' because we tracked the largest peak per window.

  H2: g₆ (Saturn perihelion) drifts. Test by tracking the eccentricity
      g₂-g₅ band (95/124 kyr) — if g₆ evolves, related Saturn-involving
      beats should shift too.

  H3: Real k drift (LOD evolution) beyond what mainstream tidal predicts.
      If we rule out H1 and H2, only H3 remains.

Test design
-----------
Step A: For each 4-Myr sliding window of LA2004 obliquity, compute Welch
        PSD in the 35-50 kyr band. Find ALL local maxima (not just one).
Step B: Track each peak's position and amplitude over the 47 windows.
Step C: Classify the behavior:
        - "amplitude swap":   ≥2 peaks at stable positions, amplitudes
                              vary out of phase
        - "position drift":   single peak moving in position
        - "split/merge":      peaks appearing/disappearing
Step D: Cross-check with LA2004 eccentricity — does any g₆-involving
        beat (e.g. g₅+g₆ at ~70 kyr, g₆+g₇ at ~41 kyr in ecc) show
        drift consistent with g₆ itself drifting?
"""

import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend, welch, find_peaks
from scipy.stats import linregress

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H

H = 335317
LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")

WINDOW_MYR = 4.0
STEP_MYR = 1.0

# Precession band: 35-50 kyr, focused on the obliquity main beat
PRECESSION_BAND = (35e3, 50e3)
# Eccentricity g₅,g₆ cross-check bands
G5G6_ECC_BAND = (60e3, 80e3)        # g₅+g₆ around 70 kyr
G2_G5_BAND = (380e3, 420e3)         # the famous 405 kyr (g₂-g₅)


def load_la2004():
    ages, ecc, obliq = [], [], []
    with open(LA2004_FILE) as f:
        for line in f:
            s = line.strip()
            if not s: continue
            parts = s.split()
            if len(parts) < 4: continue
            try:
                t = float(parts[0])
                e = float(parts[1].replace('D', 'E'))
                ob = float(parts[2].replace('D', 'E'))
            except ValueError: continue
            ages.append(t); ecc.append(e); obliq.append(ob)
    a = np.asarray(ages) * 1000.0
    o = np.argsort(a)
    return a[o], np.asarray(ecc)[o], np.asarray(obliq)[o]


def hires_psd(signal, dt_yr=1000.0, nperseg=2048, zero_pad=8):
    s = detrend(signal)
    nfft = nperseg * zero_pad
    freqs, psd = welch(s, fs=1.0 / dt_yr, nperseg=nperseg, nfft=nfft,
                       detrend='linear', scaling='density')
    if freqs[0] == 0:
        freqs = freqs[1:]; psd = psd[1:]
    return freqs, psd


def all_peaks_in_band(freqs, psd, band_yr, prominence_rel=0.05):
    """Find ALL local maxima in the period band (low, high) in years."""
    periods = 1.0 / freqs
    band_mask = (periods >= band_yr[0]) & (periods <= band_yr[1])
    if band_mask.sum() < 5:
        return []
    f_band = freqs[band_mask]
    p_band = psd[band_mask]
    max_psd = p_band.max()
    peaks, props = find_peaks(p_band, prominence=max_psd * prominence_rel)
    out = []
    for i in peaks:
        out.append({"period_yr": float(1.0 / f_band[i]),
                    "psd": float(p_band[i])})
    return sorted(out, key=lambda r: r["psd"], reverse=True)


def window_iter(ages_yr):
    starts = np.arange(ages_yr.min(),
                       ages_yr.max() - WINDOW_MYR * 1e6 + 1,
                       STEP_MYR * 1e6)
    for s in starts:
        mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
        if mask.sum() >= 1000:
            yield s + WINDOW_MYR * 0.5 * 1e6, mask


def main():
    print("=" * 92)
    print("  Precession-band disambiguation — what drives the n=65 'drift'?")
    print("=" * 92)
    print(f"\n  Loading LA2004 ...", flush=True)
    ages_yr, ecc, obliq = load_la2004()
    print(f"    samples: {len(ages_yr)}")

    # ── Part 1: TOP-N peaks per window in obliquity precession band ──
    print(f"\n  ── Step A/B: TOP peaks per window in obliquity 35-50 kyr band ──")
    print(f"    {'center (Myr)':>12}  {'top peaks (period, psd)':<60}")
    rows = []
    for center, mask in window_iter(ages_yr):
        f, psd = hires_psd(obliq[mask])
        peaks = all_peaks_in_band(f, psd, PRECESSION_BAND, prominence_rel=0.10)
        rows.append({"center_yr": center, "peaks": peaks})

    # Show every 8th window for compactness
    for i, r in enumerate(rows):
        if i % 8 != 0: continue
        peak_str = "  ".join(f"({p['period_yr']/1000:.2f}k, {p['psd']:.2e})"
                              for p in r["peaks"][:3])
        print(f"    {r['center_yr']/1e6:>+11.1f}M  {peak_str}")

    # ── Classify behavior ──
    # Count windows where there are ≥2 distinct peaks
    n_2peak = sum(1 for r in rows if len(r["peaks"]) >= 2)
    print(f"\n    Windows with ≥2 distinct peaks in band: {n_2peak}/{len(rows)}")

    # Track the TOP peak's position across windows (current method)
    top_periods = [r["peaks"][0]["period_yr"] for r in rows if r["peaks"]]
    centers = [r["center_yr"] for r in rows if r["peaks"]]
    top_arr = np.asarray(top_periods)
    centers_arr = np.asarray(centers)
    slope_top, _, _, p_top, _ = linregress(centers_arr, top_arr)
    drift_top_pct = abs(slope_top * (centers_arr.max() - centers_arr.min()) /
                        np.mean(top_arr) * 100)
    print(f"\n    Tracking TOP peak only (Test C-Libration method):")
    print(f"      drift across 50 Myr: {drift_top_pct:.2f}%")

    # Now track BOTH the lowest-period and highest-period peak per window
    # (these correspond to physically distinct beats, e.g. k+s₃ and g₆+g₇)
    print(f"\n    Tracking the LOW-period and HIGH-period peaks separately:")
    low_periods, high_periods, centers_2 = [], [], []
    for r in rows:
        if len(r["peaks"]) >= 2:
            ps = sorted([p["period_yr"] for p in r["peaks"][:3]])
            low_periods.append(ps[0])
            high_periods.append(ps[-1])
            centers_2.append(r["center_yr"])
    if len(centers_2) >= 5:
        low_arr = np.asarray(low_periods)
        high_arr = np.asarray(high_periods)
        c2_arr = np.asarray(centers_2)
        slope_low, _, _, p_low, _ = linregress(c2_arr, low_arr)
        slope_high, _, _, p_high, _ = linregress(c2_arr, high_arr)
        drift_low_pct = abs(slope_low * (c2_arr.max() - c2_arr.min()) /
                            np.mean(low_arr) * 100)
        drift_high_pct = abs(slope_high * (c2_arr.max() - c2_arr.min()) /
                             np.mean(high_arr) * 100)
        print(f"      low-period peak (~k+s₃?):  mean {low_arr.mean()/1000:.2f}k, "
              f"drift {drift_low_pct:.2f}%, p={p_low:.3f}")
        print(f"      high-period peak (~g₆+g₇?): mean {high_arr.mean()/1000:.2f}k, "
              f"drift {drift_high_pct:.2f}%, p={p_high:.3f}")

        # Amplitude comparison
        low_amps = []
        high_amps = []
        for r in rows:
            if len(r["peaks"]) >= 2:
                ps = sorted(r["peaks"][:3], key=lambda x: x["period_yr"])
                low_amps.append(ps[0]["psd"])
                high_amps.append(ps[-1]["psd"])
        low_amps = np.asarray(low_amps)
        high_amps = np.asarray(high_amps)
        amp_ratio = low_amps / (low_amps + high_amps)
        slope_amp, _, _, p_amp, _ = linregress(c2_arr, amp_ratio)
        amp_shift_pct = abs(slope_amp * (c2_arr.max() - c2_arr.min()) * 100)
        print(f"\n    AMPLITUDE SHARE: low_peak / (low + high):")
        print(f"      mean: {amp_ratio.mean():.3f}, range "
              f"[{amp_ratio.min():.3f}, {amp_ratio.max():.3f}]")
        print(f"      time trend: {amp_shift_pct:+.2f} pp over 50 Myr, "
              f"p={p_amp:.3f}")
        if drift_low_pct < 1 and drift_high_pct < 1 and amp_shift_pct > 5:
            print(f"\n    ✓ H1 SUPPORTED: peaks stationary (<1% drift each), "
                  f"amplitude swap >5pp.")
            print(f"      The Test C-Libration 'drift' is amplitude reshuffling, "
                  f"NOT real position shift.")
        elif drift_low_pct > 2 or drift_high_pct > 2:
            print(f"\n    ✗ H1 REFUTED: at least one peak shows real position drift.")

    # ── Step D: Cross-check with eccentricity g₅+g₆ band ──
    print(f"\n  ── Step D: Cross-check g₆ via eccentricity 60-80 kyr band ──")
    ecc_g6_periods = []
    ecc_g6_centers = []
    for center, mask in window_iter(ages_yr):
        f, psd = hires_psd(ecc[mask])
        peaks = all_peaks_in_band(f, psd, G5G6_ECC_BAND, prominence_rel=0.10)
        if peaks:
            ecc_g6_periods.append(peaks[0]["period_yr"])
            ecc_g6_centers.append(center)
    if len(ecc_g6_periods) >= 5:
        arr = np.asarray(ecc_g6_periods)
        c = np.asarray(ecc_g6_centers)
        slope_e, _, _, p_e, _ = linregress(c, arr)
        drift_e = abs(slope_e * (c.max() - c.min()) / arr.mean() * 100)
        print(f"    Eccentricity peak in 60-80 kyr (g₅+g₆ region):")
        print(f"      mean period: {arr.mean()/1000:.2f} kyr, "
              f"drift over 50 Myr: {drift_e:.2f}%, p={p_e:.3f}")
        if drift_e > 1:
            print(f"      → consistent with g₆ evolution (H2)")
        else:
            print(f"      → g₅+g₆ stationary; g₆ probably not the source")

    # Also g₂-g₅ (405 kyr) — most stable known beat, sanity check
    print(f"\n    Sanity check: g₂-g₅ eccentricity 380-420 kyr (405-kyr cycle):")
    e_405_periods, e_405_centers = [], []
    for center, mask in window_iter(ages_yr):
        f, psd = hires_psd(ecc[mask])
        peaks = all_peaks_in_band(f, psd, G2_G5_BAND, prominence_rel=0.10)
        if peaks:
            e_405_periods.append(peaks[0]["period_yr"])
            e_405_centers.append(center)
    if len(e_405_periods) >= 5:
        arr = np.asarray(e_405_periods)
        c = np.asarray(e_405_centers)
        slope, _, _, p_v, _ = linregress(c, arr)
        drift = abs(slope * (c.max() - c.min()) / arr.mean() * 100)
        print(f"      mean: {arr.mean()/1000:.2f} kyr, "
              f"drift: {drift:.3f}%, p={p_v:.3f}")
        print(f"      (should be ~0% — g₂ and g₅ are the most stable g_j)")

    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)
    print(f"""
    What this test resolves:

    • Test C-Libration measured 3.78% 'drift' in n=65 by tracking the
      TOP peak per window. With multi-peak tracking now, we can see
      whether that's:
        - real position drift (H3: LOD/k or s₃ evolution)
        - amplitude reshuffling between two stationary peaks (H1)
        - g₆ orbital evolution (H2)

    • The eccentricity g₂-g₅ peak (405 kyr) is the most stable known
      Laskar beat. If LA2004's spectral methodology gives <0.5% drift
      there, our spectral tool is reliable. If it gives >1% drift there
      too, we have a methodology bias in Test C-Libration, not real
      physics.

    Look at the numbers above to draw the conclusion.
""")


if __name__ == "__main__":
    main()

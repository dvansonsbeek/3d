#!/usr/bin/env python3
"""
Test whether LA2004 carries the spectral signature of the framework's
bounded-LOD oscillation model — distinguishing it from mainstream
monotonic tidal recession.

Framework prediction (from src/script.js:48578):
  LOD(t) = mean_LOD + Σ_n A_n · sin(2π·t / (H/n))   for n ∈ {3, 5, 8, 16, 24, 32}

If LOD oscillates at these periods, then:
  (a) Precession constant k = 2π/LOD oscillates at the same periods
  (b) Obliquity (which depends on k) inherits direct power at H/n
  (c) The main k+g₆ beat (41.3 kyr) gets AM sidebands at offsets ±n/H

Mainstream tidal model: LOD monotonically increases — NO periodic
signature at H/n positions.

Two tests
---------
Test 1: Direct H/n power
  In LA2004 obliquity spectrum, is there elevated power at periods
  111.8 (H/3), 67.1 (H/5), 41.9 (H/8), 21.0 (H/16), 14.0 (H/24),
  10.5 (H/32) kyr? Compare each to neighbouring 'control' frequencies
  (off-by-3% on either side, NOT at any H/n nor L1 integer).

Test 2: AM sidebands around k+g₆
  Around the main obliquity beat at 41.3 kyr, do sidebands appear at
  the predicted modulation offsets? f_sideband = f_main ± n/H.
  Modulation amplitude scales with LOD oscillation amplitude.
"""

import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend, welch

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS

H = 335317
LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")

# Framework's predicted LOD oscillation periods (H/n)
LOD_HARMONICS = {
    "H/3":  H / 3,
    "H/5":  H / 5,
    "H/8":  H / 8,
    "H/16": H / 16,
    "H/24": H / 24,
    "H/32": H / 32,
}

# L1 integer set in years (8H/n) for comparison
L1_PERIODS_YR = {n: EIGHT_H * 1000.0 / n for n in L1_LATTICE_INTEGERS}


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


def hires_psd(signal, dt_yr=1000.0, nperseg=8192, zero_pad=4):
    """High-resolution Welch PSD with zero-padding for fine frequency res."""
    s = detrend(signal)
    nfft = nperseg * zero_pad
    freqs, psd = welch(s, fs=1.0 / dt_yr, nperseg=nperseg, nfft=nfft,
                       detrend='linear', scaling='density')
    if freqs[0] == 0:
        freqs = freqs[1:]; psd = psd[1:]
    return freqs, psd


def power_at_period(freqs, psd, period_yr, band_pct=2.0):
    """Sum PSD in ±band_pct around the target period."""
    f_target = 1.0 / period_yr
    band = (freqs >= f_target * (1 - band_pct/100)) & \
           (freqs <= f_target * (1 + band_pct/100))
    if band.sum() == 0:
        return None
    return float(np.sum(psd[band]))


def control_power(freqs, psd, period_yr, offset_pct=3.0, band_pct=2.0):
    """Power at offset frequencies on either side of the target, taken as a
    'no signal here' control."""
    p_lo = period_yr * (1 + offset_pct/100)
    p_hi = period_yr * (1 - offset_pct/100)
    pwr_lo = power_at_period(freqs, psd, p_lo, band_pct)
    pwr_hi = power_at_period(freqs, psd, p_hi, band_pct)
    if pwr_lo is None or pwr_hi is None:
        return None
    return 0.5 * (pwr_lo + pwr_hi)


def is_near_l1(period_yr, tolerance_pct=3.0):
    """Check if a candidate period is too close to a known L1 peak (would
    confound the test). Returns the closest L1 integer or None."""
    for n, p in L1_PERIODS_YR.items():
        if abs(period_yr - p) / p * 100 < tolerance_pct:
            return n
    return None


def main():
    print("=" * 92)
    print("  LOD oscillation signature test — framework's bounded-LOD vs")
    print("  mainstream monotonic tidal recession")
    print("=" * 92)

    print("\n  Loading LA2004 ...", flush=True)
    ages_yr, ecc, obliq = load_la2004()
    print(f"    {len(ages_yr)} samples, {ages_yr.min()/1e6:+.1f} to "
          f"{ages_yr.max()/1e6:+.1f} Myr")

    # ── Test 1: Direct H/n power ──
    print("\n  ── TEST 1: Direct H/n power in LA2004 obliquity & eccentricity ──")
    f_obl, psd_obl = hires_psd(obliq)
    f_ecc, psd_ecc = hires_psd(ecc)
    print(f"    Spectrum resolution: {f_obl[1]-f_obl[0]:.2e} cyc/yr")
    print(f"    (≈ {1/((f_obl[1]-f_obl[0])*(1/(0.1)))**0.5:.0f} kyr period")
    print(f"     resolution at 100 kyr period)")

    print(f"\n  {'Harmonic':<8}{'Period':>12}{'L1 nearby?':>14}"
          f"  {'Obl ratio':>11}{'Ecc ratio':>11}{'Verdict':>16}")
    results = []
    for label, period in LOD_HARMONICS.items():
        l1_near = is_near_l1(period)
        # Obliquity
        p_signal_obl = power_at_period(f_obl, psd_obl, period)
        p_ctrl_obl = control_power(f_obl, psd_obl, period)
        ratio_obl = p_signal_obl / p_ctrl_obl if p_ctrl_obl else None
        # Eccentricity
        p_signal_ecc = power_at_period(f_ecc, psd_ecc, period)
        p_ctrl_ecc = control_power(f_ecc, psd_ecc, period)
        ratio_ecc = p_signal_ecc / p_ctrl_ecc if p_ctrl_ecc else None

        l1_str = f"L1 n={l1_near} ({EIGHT_H*1000/l1_near/1000:.1f}k)" \
                 if l1_near else "no"
        if l1_near:
            verdict = "AMBIGUOUS"
        elif ratio_obl and ratio_obl > 3:
            verdict = "✓ ELEVATED (obl)"
        elif ratio_ecc and ratio_ecc > 3:
            verdict = "✓ ELEVATED (ecc)"
        elif (ratio_obl is None or ratio_obl < 2) and \
             (ratio_ecc is None or ratio_ecc < 2):
            verdict = "✗ no signal"
        else:
            verdict = "weak"

        print(f"    {label:<8}{period/1000:>10.1f}k {l1_str:>15}"
              f"  {ratio_obl:>10.2f}×{ratio_ecc:>10.2f}×{verdict:>16}")
        results.append({
            "harmonic": label, "period_yr": period,
            "L1_nearby_integer": l1_near,
            "obl_ratio": float(ratio_obl) if ratio_obl else None,
            "ecc_ratio": float(ratio_ecc) if ratio_ecc else None,
            "verdict": verdict,
        })

    # ── Test 2: AM sidebands around the obliquity main beat ──
    print("\n  ── TEST 2: AM sidebands around k+g₆ obliquity main (~41.3 kyr) ──")
    obl_main_period = EIGHT_H * 1000.0 / 65  # 8H/65 = 41.3 kyr
    f_main = 1.0 / obl_main_period

    print(f"    Main beat: 8H/65 = {obl_main_period/1000:.2f} kyr "
          f"(f = {f_main*1e6:.2f} μcyc/yr)")
    print(f"\n    Sideband search around the main beat:")
    print(f"    {'mod period':<12}{'f_mod':>12}{'side+ period':>16}"
          f"{'side- period':>16}{'side+ ratio':>14}{'side- ratio':>14}")
    for label, T_m in LOD_HARMONICS.items():
        f_m = 1.0 / T_m
        f_plus = f_main + f_m
        f_minus = f_main - f_m
        # Convert to periods
        p_plus = 1.0 / f_plus if f_plus > 0 else None
        p_minus = 1.0 / f_minus if f_minus > 0 else None

        ratio_plus = None
        ratio_minus = None
        if p_plus:
            ps = power_at_period(f_obl, psd_obl, p_plus, band_pct=1.5)
            pc = control_power(f_obl, psd_obl, p_plus, band_pct=1.5)
            if pc:
                ratio_plus = ps / pc
        if p_minus:
            ps = power_at_period(f_obl, psd_obl, p_minus, band_pct=1.5)
            pc = control_power(f_obl, psd_obl, p_minus, band_pct=1.5)
            if pc:
                ratio_minus = ps / pc

        p_plus_str = f"{p_plus/1000:.1f}k" if p_plus else "—"
        p_minus_str = f"{p_minus/1000:.1f}k" if p_minus and p_minus > 0 else "—"
        r_plus_str = f"{ratio_plus:.2f}×" if ratio_plus else "—"
        r_minus_str = f"{ratio_minus:.2f}×" if ratio_minus else "—"
        print(f"    {label:<12}{T_m/1000:>10.1f}k"
              f"{p_plus_str:>16}{p_minus_str:>16}"
              f"{r_plus_str:>14}{r_minus_str:>14}")

    # ── Synthesis ──
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)

    # Count clear-cut signatures (excluding L1-near ambiguous)
    clear_results = [r for r in results if r["L1_nearby_integer"] is None]
    elevated_obl = sum(1 for r in clear_results
                       if r["obl_ratio"] and r["obl_ratio"] > 3)
    elevated_ecc = sum(1 for r in clear_results
                       if r["ecc_ratio"] and r["ecc_ratio"] > 3)
    none_signal = sum(1 for r in clear_results if r["verdict"] == "✗ no signal")
    n_clear = len(clear_results)

    print(f"""
    Of {len(LOD_HARMONICS)} predicted LOD harmonics:
      • {len(LOD_HARMONICS) - n_clear} have an L1 peak within 3% (AMBIGUOUS)
      • {elevated_obl} show >3× elevated power in obliquity (FRAMEWORK ✓)
      • {elevated_ecc} show >3× elevated power in eccentricity (FRAMEWORK ✓)
      • {none_signal} show no elevation (CONSISTENT WITH MAINSTREAM)
    """)

    if elevated_obl + elevated_ecc >= 2:
        verdict = (
            "✓ FRAMEWORK BOUNDED-LOD SIGNATURE DETECTED. Multiple "
            "framework-predicted H/n harmonics show elevated power above "
            "off-lattice controls. Mainstream monotonic-tidal model would "
            "predict no such structure."
        )
    elif elevated_obl + elevated_ecc == 1:
        verdict = (
            "? WEAK SIGNAL. Only one clear-cut H/n shows elevated power. "
            "Could be coincidence; needs follow-up with longer time series "
            "or more careful peak isolation."
        )
    else:
        verdict = (
            "✗ NO DIRECT H/n SIGNATURE in clear-cut positions. The "
            "framework's specific LOD oscillation prediction is not "
            "supported by elevated power at these harmonic positions. "
            "Mainstream monotonic-LOD remains the simpler fit."
        )
    print(f"  {verdict}")


if __name__ == "__main__":
    main()

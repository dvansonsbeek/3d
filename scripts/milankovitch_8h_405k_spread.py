#!/usr/bin/env python3
"""
405-KYR LINE: FIXED BEAT OR SPREAD BAND?
==========================================

Follow-up to Test N + the 405-kyr evolution analysis. The empirical 405-kyr
line sits 22 kyr above 8H/7 = 383 kyr. A natural question: maybe the
supercycle is 16H, not 8H, in which case 16H/13 = 412.7 kyr — still not a
perfect 405 match but only 7.7 kyr off vs 22 kyr off for 8H/7.

But this only works if the empirical 405-kyr "line" is actually a **spread
band** wide enough to encompass 383, 405, and 413 all at once. If the line
is narrow (FWHM ≈ Rayleigh resolution), neither 8H/7 nor 16H/13 can rescue
the framework — there is a single sharp line at 405 that is genuinely off
the lattice.

Methodology:
  S1 — Peak shape in the strongest 405-kyr window (CENOGRID Eocene 33-50 Ma).
       Compute very-high-resolution Lomb-Scargle in [350, 450] kyr. Measure:
         - peak position
         - FWHM (full width at half maximum, in kyr)
         - is the peak unimodal, or are there sidebands?
       Compare FWHM to Rayleigh resolution.

  S2 — Same in Paleocene hothouse (58-66 Ma) and other windows.

  S3 — All-integer scan within 350-450 kyr from BOTH 8H and 16H lattices.
       Lists which integer positions COULD plausibly match the empirical
       spread.

  S4 — Direct evaluation: does the spectrum at 8H/7 (383) and at 16H/13
       (413) show a real signal, or are they zero compared to the 405 peak?

Output: data/milankovitch-8h-405k-spread.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import f as f_dist
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-spread.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
SIXTEEN_H = 16 * H_KYR
DT_KYR = 5.0

INTERVALS = [
    ("Eocene_33_50Ma",      (33000, 50000), "CENOGRID Eocene (warmhouse, 405k strongest at F=18.75)"),
    ("Paleocene_58_66Ma",   (58000, 66000), "CENOGRID Paleocene hothouse (per Test O highest amps)"),
    ("Oligocene_23_34Ma",   (23000, 34000), "CENOGRID Oligocene (coolhouse, 405k strong)"),
    ("Cenozoic_full_0_67Ma",(0, 67000),     "CENOGRID full (combined, F=10.66)"),
]

SEARCH_BAND = (350.0, 450.0)
N_FREQ_HIRES = 50000   # ~0.002 kyr resolution in target band

NW = 3
K_TAPERS = 5
ALPHA = 0.05
F_CRIT = float(f_dist.ppf(1 - ALPHA, 2, 2 * K_TAPERS - 2))


# ─────────────────────────────────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────────────────────────────────

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
                t = float(parts[0]); v = float(parts[8])
            except ValueError:
                continue
            ages_ma.append(t); d18o.append(v)
    return np.array(ages_ma) * 1000.0, np.array(d18o)


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
# Spectral
# ─────────────────────────────────────────────────────────────────────────

def hires_ls(t, y, band, n_freq=N_FREQ_HIRES):
    lo, hi = band
    freqs = np.linspace(1.0 / hi, 1.0 / lo, n_freq)
    power = LombScargle(t, y).power(freqs)
    periods = 1.0 / freqs
    return periods[::-1], power[::-1]   # sorted by period ascending


def measure_peak(periods, power, target_band=(390, 420)):
    """Find peak in target_band, measure position and FWHM."""
    mask = (periods >= target_band[0]) & (periods <= target_band[1])
    if not mask.any():
        return None
    sub_p = periods[mask]
    sub_pow = power[mask]
    i_peak = int(np.argmax(sub_pow))
    peak_period = float(sub_p[i_peak])
    peak_power = float(sub_pow[i_peak])
    half_max = peak_power / 2.0

    # Walk outward for FWHM
    i_lo = i_peak
    while i_lo > 0 and sub_pow[i_lo] > half_max:
        i_lo -= 1
    i_hi = i_peak
    while i_hi < len(sub_pow) - 1 and sub_pow[i_hi] > half_max:
        i_hi += 1
    fwhm_kyr = float(sub_p[i_hi] - sub_p[i_lo])
    return {
        "peak_period_kyr": peak_period,
        "peak_power": peak_power,
        "half_max_lower_kyr": float(sub_p[i_lo]),
        "half_max_upper_kyr": float(sub_p[i_hi]),
        "fwhm_kyr": fwhm_kyr,
    }


def thomson_f(y, freq, dt):
    n = len(y)
    if n < 30:
        return 0.0
    tapers = dpss(n, NW, K_TAPERS)
    times = np.arange(n) * dt
    Y = np.array([np.sum(taper * y * np.exp(-2j * np.pi * freq * times))
                  for taper in tapers])
    U = np.array([np.sum(taper) for taper in tapers])
    even = np.array([k % 2 == 0 for k in range(K_TAPERS)])
    U_e = U[even]; Y_e = Y[even]
    denom_U2 = float(np.sum(np.abs(U_e) ** 2))
    if denom_U2 < 1e-30: return 0.0
    mu_hat = np.sum(U_e * Y_e) / denom_U2
    num = (K_TAPERS - 1) * (np.abs(mu_hat) ** 2) * denom_U2
    den = np.sum(np.abs(Y - mu_hat * U) ** 2)
    if den < 1e-30: return float("inf")
    return float(num / den)


# ─────────────────────────────────────────────────────────────────────────
# Lattice candidates in 350-450 kyr
# ─────────────────────────────────────────────────────────────────────────

def lattice_candidates_in_band(band):
    """8H/n and 16H/n integer divisors in the target band."""
    lo, hi = band
    out = {"8H": [], "16H": []}
    for n in range(1, 100):
        p = EIGHT_H / n
        if lo <= p <= hi:
            out["8H"].append({"n": n, "period_kyr": p, "fraction_kyr_label": f"8H/{n}"})
    for n in range(1, 200):
        p = SIXTEEN_H / n
        if lo <= p <= hi:
            out["16H"].append({"n": n, "period_kyr": p, "fraction_kyr_label": f"16H/{n}"})
    return out


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("405-KYR LINE: FIXED BEAT OR SPREAD BAND?")
    print("=" * 72)
    print(f"  H = {H_KYR} kyr")
    print(f"  8H/7  = {EIGHT_H/7:7.3f} kyr   (nearest 8H integer below 405)")
    print(f"  16H/13 = {SIXTEEN_H/13:7.3f} kyr  (16H-supercycle proposal)")
    print(f"  Laskar:  405.0  kyr   (g₂−g₅ Venus-Jupiter)")

    cand = lattice_candidates_in_band((350, 450))
    print(f"\n  Integer divisors of 8H in [350, 450] kyr:")
    for c in cand["8H"]:
        print(f"    {c['fraction_kyr_label']:>8s}  = {c['period_kyr']:7.3f} kyr")
    print(f"  Integer divisors of 16H in [350, 450] kyr:")
    for c in cand["16H"]:
        print(f"    {c['fraction_kyr_label']:>8s}  = {c['period_kyr']:7.3f} kyr")

    ages, d18o = load_cenogrid()
    print()
    interval_results = []
    for name, win, label in INTERVALS:
        print("\n" + "─" * 72)
        print(f"{name}: {label}")
        print("─" * 72)
        t, y = regrid_detrend(ages, d18o, win)
        span = win[1] - win[0]
        rayleigh = (400.0 ** 2) / span
        print(f"  span = {span} kyr ({len(t)} samples)  Rayleigh at 400 kyr: {rayleigh:.2f} kyr")

        periods, power = hires_ls(t, y, SEARCH_BAND)
        peak = measure_peak(periods, power)
        if peak is None:
            continue
        # Spread test: FWHM vs Rayleigh
        spread_kyr = peak["fwhm_kyr"]
        spread_ratio = spread_kyr / rayleigh
        is_spread = spread_kyr > 2.0 * rayleigh
        print(f"  peak: {peak['peak_period_kyr']:.2f} kyr   power: {peak['peak_power']:.4f}")
        print(f"  FWHM: {spread_kyr:.2f} kyr  ({peak['half_max_lower_kyr']:.1f} - {peak['half_max_upper_kyr']:.1f})")
        print(f"  FWHM / Rayleigh = {spread_ratio:.2f}×  ({'SPREAD' if is_spread else 'NARROW'})")
        print(f"  encompasses 8H/7 (383.22)?  {peak['half_max_lower_kyr'] <= 383.22 <= peak['half_max_upper_kyr']}")
        print(f"  encompasses 16H/13 (412.70)? {peak['half_max_lower_kyr'] <= 412.70 <= peak['half_max_upper_kyr']}")

        # F-stats at three positions
        f_at_405 = thomson_f(y, 1.0 / 405.0, DT_KYR)
        f_at_383 = thomson_f(y, 1.0 / (EIGHT_H/7), DT_KYR)
        f_at_413 = thomson_f(y, 1.0 / (SIXTEEN_H/13), DT_KYR)
        print(f"  Thomson F-stat at Laskar 405.0:   F = {f_at_405:6.2f}  sig={'✓' if f_at_405>F_CRIT else '—'}")
        print(f"  Thomson F-stat at 8H/7 = 383.22:  F = {f_at_383:6.2f}  sig={'✓' if f_at_383>F_CRIT else '—'}")
        print(f"  Thomson F-stat at 16H/13 = 412.7: F = {f_at_413:6.2f}  sig={'✓' if f_at_413>F_CRIT else '—'}")

        # Search for sidebands (additional local maxima within band)
        sidebands = []
        target_band_idx = (periods >= 360) & (periods <= 440)
        sub_p = periods[target_band_idx]
        sub_pow = power[target_band_idx]
        for i in range(3, len(sub_p) - 3):
            if (sub_pow[i] > sub_pow[i-1] and sub_pow[i] > sub_pow[i+1]
                and sub_pow[i] > sub_pow[i-2] and sub_pow[i] > sub_pow[i+2]
                and sub_pow[i] > 0.3 * peak["peak_power"]
                and abs(sub_p[i] - peak["peak_period_kyr"]) > 2.0):
                sidebands.append({"period_kyr": float(sub_p[i]),
                                   "power": float(sub_pow[i])})
        if sidebands:
            print(f"  sidebands (local maxima > 30% of peak, |Δ|>2 kyr from main):")
            for sb in sidebands:
                print(f"    period {sb['period_kyr']:.2f} kyr  power {sb['power']:.4f}")
        interval_results.append({
            "name": name,
            "window_kyr": list(win),
            "label": label,
            "span_kyr": span,
            "rayleigh_kyr": rayleigh,
            "peak": peak,
            "fwhm_over_rayleigh": spread_ratio,
            "is_spread_fwhm_gt_2x_rayleigh": bool(is_spread),
            "encompasses_383": bool(peak["half_max_lower_kyr"] <= 383.22 <= peak["half_max_upper_kyr"]),
            "encompasses_413": bool(peak["half_max_lower_kyr"] <= 412.70 <= peak["half_max_upper_kyr"]),
            "F_at_405": f_at_405,
            "F_at_383": f_at_383,
            "F_at_413": f_at_413,
            "sidebands_above_30pct": sidebands,
        })

    out = {
        "meta": {
            "H_kyr": H_KYR, "8H_kyr": EIGHT_H, "16H_kyr": SIXTEEN_H,
            "framework_8H_over_7_kyr": EIGHT_H / 7,
            "proposed_16H_over_13_kyr": SIXTEEN_H / 13,
            "laskar_405_kyr": 405.0,
            "venus_g2_arcsec_per_yr": 7.453,
            "jupiter_g5_arcsec_per_yr": 4.257,
            "F_critical": F_CRIT,
        },
        "lattice_candidates_in_350_450_kyr": cand,
        "interval_results": interval_results,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
405-KYR AS 17× PRECESSION SUB-HARMONIC TEST
=============================================

User hypothesis: the empirical 405-kyr cycle is the 17th sub-harmonic of
climatic precession, i.e. 17 × (8H/113) = 17 × 23,739.26 = 403,567 yr,
only 0.24% off the empirical 404,520-yr peak in CENOGRID. If this is a
real physical sub-harmonic (not numerical coincidence), the climate
system "counts" precession cycles and produces a slow envelope at 17×.

Predictions if 17×precession is REAL:
  (i)   The empirical peak should sit closer to 17 × 8H/113 = 403.57 than
        to Laskar's 405.00 (this is testable — Rayleigh ≈ 2.4 kyr in full
        Cenozoic).
  (ii)  Precession amplitude and 405-kyr amplitude should CO-VARY over
        time (sub-harmonic genesis predicts a causal coupling).
  (iii) The Hilbert envelope of the precession signal should itself
        contain a 405-kyr modulation (the sub-harmonic envelope).
  (iv)  No other simple integer multiple should fit as well.

Predictions if 405-kyr is purely Laskar g₂−g₅:
  (i')  Peak should be at 405.0 exactly (not 403.57).
  (ii') Precession amplitude and 405-kyr amplitude should be independent
        (Laskar beat is set by Venus + Jupiter, not Earth's precession).
  (iii') Precession envelope SHOULD still contain 405 kyr — but for a
        DIFFERENT reason: eccentricity (Laskar g₂−g₅) modulates precession
        amplitude (standard Milankovitch).

Bottom line: prediction (iii) doesn't discriminate (both views predict 405
in the precession envelope). Predictions (i) and (ii) DO discriminate.

Methodology:
  A. Compute the precise Thomson F-stat at multiple candidate sub-harmonic
     positions: n × precession for n=15..19, m × obliquity for m=9..11,
     plus Laskar 405.00 and 8H/7 and 16H/13. Find which
     position best explains the empirical signal.
  B. Sliding-window correlation between precession-band amplitude and
     405-kyr-band amplitude in CENOGRID. Does precession amplitude predict
     405-kyr amplitude?
  C. Hilbert-envelope test: extract the 18-26 kyr precession signal,
     compute its instantaneous amplitude envelope, then spectral-analyze
     the envelope. Does the envelope contain a peak at 405 kyr?

Output: data/milankovitch-8h-405k-precession-subharmonic.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend, hilbert, butter, filtfilt
from scipy.signal.windows import dpss
from scipy.stats import f as f_dist, pearsonr
from astropy.timeseries import LombScargle

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-precession-subharmonic.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
SIXTEEN_H = 16 * H_KYR
DT_KYR = 5.0
NW = 3
K_TAPERS = 5
ALPHA = 0.05
F_CRIT = float(f_dist.ppf(1 - ALPHA, 2, 2 * K_TAPERS - 2))

PREC_PERIOD = EIGHT_H / 113   # framework climatic precession 8H/113 = 23.739 kyr
OBLI_PERIOD = EIGHT_H / 65    # framework obliquity 8H/65 = 41.27 kyr
LASKAR_405 = 405.0
EMPIRICAL_405 = 404.52   # CENOGRID full Cenozoic peak (from Test O)

WIN_FULL = (0, 67000)


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


def single_amp(t, y, period_kyr):
    omega = 2 * np.pi / period_kyr
    X = np.column_stack([np.ones_like(t), np.cos(omega * t), np.sin(omega * t)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.hypot(b[1], b[2]))


def thomson_f(y, freq, dt):
    n = len(y)
    if n < 30: return 0.0
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
# (A) F-test at candidate sub-harmonic positions
# ─────────────────────────────────────────────────────────────────────────

def test_candidates(t, y):
    print("\n" + "═" * 72)
    print("(A) Candidate periods near 405 kyr — Thomson F-test on full Cenozoic")
    print("═" * 72)
    rayleigh = (405 ** 2) / (t[-1] - t[0])
    print(f"  Rayleigh resolution at P=405: {rayleigh:.2f} kyr")
    print(f"  Empirical CENOGRID full Cenozoic peak: {EMPIRICAL_405} kyr")
    print(f"  {'candidate':38s}  {'period':>9s}  {'Δ_empirical':>11s}  {'F':>7s}  {'p':>8s}  sig")
    candidates = []
    # n × precession
    for n in (15, 16, 17, 18, 19):
        P = n * PREC_PERIOD
        candidates.append((f"{n} × precession (8H/113)", P))
    # m × obliquity
    for m in (9, 10, 11):
        P = m * OBLI_PERIOD
        candidates.append((f"{m} × obliquity (8H/65)", P))
    # nearest 8H/n lattice positions
    candidates.append(("8H/7 lattice position", EIGHT_H / 7))
    candidates.append(("8H/6", EIGHT_H / 6))
    candidates.append(("16H/13 (= 10× obliquity)", SIXTEEN_H / 13))
    candidates.append(("Laskar 405.0", LASKAR_405))
    candidates.append(("CENOGRID empirical (404.52)", EMPIRICAL_405))

    out = []
    for label, P in candidates:
        delta = P - EMPIRICAL_405
        f_val = thomson_f(y, 1.0 / P, DT_KYR)
        p_val = 1.0 - f_dist.cdf(f_val, 2, 2 * K_TAPERS - 2)
        sig = "✓" if f_val > F_CRIT else " "
        print(f"  {label:38s}  {P:9.3f}  {delta:+11.2f}  {f_val:7.2f}  {p_val:8.5f}   {sig}")
        out.append({"label": label, "period_kyr": P,
                     "delta_vs_empirical_kyr": float(delta),
                     "F_stat": float(f_val), "p_value": float(p_val),
                     "significant": bool(f_val > F_CRIT)})
    return out


# ─────────────────────────────────────────────────────────────────────────
# (B) Sliding-window amplitude correlation
# ─────────────────────────────────────────────────────────────────────────

def sliding_amp_correlation(ages, d18o):
    print("\n" + "═" * 72)
    print("(B) Sliding-window correlation: precession-band amp vs 405-band amp")
    print("═" * 72)
    win_len = 4000
    win_step = 1000
    centers = []
    start = 0
    while start + win_len <= ages.max():
        centers.append(start + win_len / 2)
        start += win_step
    centers = np.array(centers)
    amps_prec = []
    amps_405 = []
    for c in centers:
        lo, hi = c - win_len / 2, c + win_len / 2
        t, y = regrid_detrend(ages, d18o, (lo, hi))
        if t is None:
            amps_prec.append(np.nan); amps_405.append(np.nan); continue
        # Average over the 18-26 kyr precession band: use a few specific lines
        a_p = max(single_amp(t, y, PREC_PERIOD),
                   single_amp(t, y, EIGHT_H/110),
                   single_amp(t, y, EIGHT_H/116),
                   single_amp(t, y, EIGHT_H/120))
        a_4 = single_amp(t, y, 405.0)
        amps_prec.append(a_p)
        amps_405.append(a_4)
    amps_prec = np.array(amps_prec)
    amps_405 = np.array(amps_405)
    mask = np.isfinite(amps_prec) & np.isfinite(amps_405)
    r, p = pearsonr(amps_prec[mask], amps_405[mask])
    n_pts = int(mask.sum())
    print(f"  windows: {n_pts}")
    print(f"  Pearson correlation r(precession amp, 405-kyr amp): r = {r:.3f}, p = {p:.4f}")
    print(f"  If r > 0.5 and p < 0.05: precession and 405 amplitudes co-vary,")
    print(f"    consistent with 405 being a sub-harmonic of precession")
    print(f"  If r ≈ 0: amplitudes are independent — 405 is NOT a precession sub-harmonic")
    interpretation = ("CONSISTENT with sub-harmonic" if r > 0.5 and p < 0.05
                       else ("WEAK support" if r > 0.3 else "INDEPENDENT — sub-harmonic not supported"))
    print(f"  Interpretation: {interpretation}")
    return {"n_windows": n_pts,
             "centers_kyr_BP": centers.tolist(),
             "amp_precession": amps_prec.tolist(),
             "amp_405": amps_405.tolist(),
             "pearson_r": float(r),
             "pearson_p": float(p),
             "interpretation": interpretation}


# ─────────────────────────────────────────────────────────────────────────
# (C) Hilbert-envelope test
# ─────────────────────────────────────────────────────────────────────────

def hilbert_envelope_test(t, y):
    print("\n" + "═" * 72)
    print("(C) Hilbert-envelope test: does precession amplitude itself modulate at 405?")
    print("═" * 72)
    fs = 1.0 / DT_KYR
    # Bandpass 18-30 kyr precession band
    nyq = fs / 2
    low_period, high_period = 18, 30   # kyr
    f_high = 1.0 / low_period   # high frequency edge of bandpass
    f_low = 1.0 / high_period   # low frequency edge
    if f_high > nyq * 0.99 or f_low < 1e-6:
        print(f"  bandpass edges out of range, skipping")
        return None
    b, a = butter(4, [f_low / nyq, f_high / nyq], btype="band")
    y_prec = filtfilt(b, a, y)
    envelope = np.abs(hilbert(y_prec))
    # Detrend the envelope and find its spectrum
    env_det = detrend(envelope, type="linear")
    env_norm = (env_det - env_det.mean()) / env_det.std()
    # Lomb-Scargle in 200-800 kyr range
    freqs = np.linspace(1 / 800, 1 / 200, 5000)
    power = LombScargle(t, env_norm).power(freqs)
    periods = 1.0 / freqs
    i_max = int(np.argmax(power))
    P_max = float(periods[i_max])
    pow_max = float(power[i_max])
    # Power at 405 and at 17×precession
    i_405 = int(np.argmin(np.abs(periods - 405.0)))
    i_403 = int(np.argmin(np.abs(periods - 17 * PREC_PERIOD)))
    print(f"  precession band (18-30 kyr) extracted; envelope spectrum 200-800 kyr range")
    print(f"  envelope peak period: {P_max:.2f} kyr  (power {pow_max:.5f})")
    print(f"  envelope power at 405.0:                    {float(power[i_405]):.5f}")
    print(f"  envelope power at 17×prec = 403.57:         {float(power[i_403]):.5f}")
    print(f"  envelope power at 100 kyr (= eccentricity): {float(power[int(np.argmin(np.abs(periods-100)))]):.5f}")
    interpretation = ("Envelope HAS a 405 kyr peak — consistent with amplitude modulation"
                       if abs(P_max - 405) < 50 else
                       f"Envelope peak is at {P_max:.0f} kyr, NOT 405")
    print(f"  Interpretation: {interpretation}")
    return {"envelope_peak_period_kyr": P_max,
             "envelope_peak_power": pow_max,
             "envelope_power_at_405": float(power[i_405]),
             "envelope_power_at_17_x_precession": float(power[i_403]),
             "envelope_power_at_100k": float(power[int(np.argmin(np.abs(periods-100)))]),
             "interpretation": interpretation}


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("405-KYR AS 17× PRECESSION SUB-HARMONIC TEST")
    print("=" * 72)
    print(f"  Framework precession period (8H/113):  {PREC_PERIOD:.3f} kyr")
    print(f"  17 × precession                       = {17 * PREC_PERIOD:.3f} kyr")
    print(f"  10 × obliquity (= 16H/13)             = {10 * OBLI_PERIOD:.3f} kyr")
    print(f"  Laskar 405.0")
    print(f"  CENOGRID empirical peak (Test O)      = {EMPIRICAL_405} kyr")

    ages, d18o = load_cenogrid()
    t, y = regrid_detrend(ages, d18o, WIN_FULL)
    print(f"\n  CENOGRID full Cenozoic: {len(y)} samples")

    a = test_candidates(t, y)
    b = sliding_amp_correlation(ages, d18o)
    c = hilbert_envelope_test(t, y)

    out = {
        "meta": {
            "H_kyr": H_KYR,
            "8H_kyr": EIGHT_H,
            "precession_period_kyr_8H_over_113": PREC_PERIOD,
            "obliquity_period_kyr_8H_over_65": OBLI_PERIOD,
            "candidate_17_x_precession_kyr": 17 * PREC_PERIOD,
            "laskar_405_kyr": LASKAR_405,
            "cenogrid_empirical_kyr": EMPIRICAL_405,
        },
        "A_candidate_F_tests": a,
        "B_sliding_amp_correlation": b,
        "C_hilbert_envelope": c,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

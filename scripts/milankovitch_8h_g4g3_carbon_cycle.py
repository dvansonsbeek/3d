#!/usr/bin/env python3
"""
2.4-MYR g₄−g₃ TEST — DOES CARBON CYCLE AMPLIFY HERE TOO?
==========================================================

Critical falsifier for the carbon-cycle entrained internal-oscillator
interpretation of the 405-kyr cycle. If the carbon cycle resonates at
~400 kyr because of silicate-weathering time constant, then organic-carbon
burial (~1-10 Myr time constant) should produce a SIMILAR amplification
at longer periods. The clearest candidate is the Mars-Earth g₄−g₃
secular apsidal beat:

  g₄ (Mars apsidal)  = 17.916 arcsec/yr
  g₃ (Earth apsidal) = 17.368 arcsec/yr
  g₄−g₃              =  0.548 arcsec/yr → period = 2.365 Myr

Other Laskar secular beats and proposed long-period climate cycles tested
as well, for a complete picture:

  • 405 kyr (g₂−g₅) — known carbon-amplified (control / sanity)
  • 1.2 Myr  (Pälike-Norris obliquity modulation candidate)
  • 2.4 Myr  (g₄−g₃ direct beat — the headline test)
  • 4.5 Myr  (Boulila 2020 libration — already matches 13H)
  • 9 Myr   (Boulila 2018 grand cycle — orbital chaos OR internal feedback)
  • 41 kyr  (obliquity — control: direct insolation, expect ratio ~1)
  • 23.7 kyr (precession — control: direct insolation, expect ratio ~1)
  • 100 kyr (eccentricity / ice-sheet — control: ice-sheet, expect δ¹⁸O dominant)

For each: compute amplitude in δ¹³C and δ¹⁸O, Thomson F-test, and the
δ¹³C/δ¹⁸O ratio. If the carbon-cycle interpretation is right, ratios at
405 kyr AND at 2.4 Myr should be elevated; controls should not be.

Output: data/milankovitch-8h-g4g3-carbon-cycle.json
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
OUT_PATH = DATA_DIR / "milankovitch-8h-g4g3-carbon-cycle.json"

DT_KYR = 5.0
WIN_FULL = (0, 67000)
NW = 3
K_TAPERS = 5
ALPHA = 0.05
F_CRIT = float(f_dist.ppf(1 - ALPHA, 2, 2 * K_TAPERS - 2))

# Candidate cycles to test
CANDIDATES = [
    # ── short-period controls (direct insolation) ────────────────────
    {"name": "precession",       "period_kyr":    23.74,
     "hypothesis": "control: direct insolation; expect ratio ~1"},
    {"name": "obliquity",        "period_kyr":    41.27,
     "hypothesis": "control: direct insolation, δ¹⁸O slight win expected"},
    {"name": "100_kyr_ecc",      "period_kyr":   100.0,
     "hypothesis": "control: ice-sheet hysteresis post-MPT, δ¹⁸O expected to win"},
    # ── known carbon-amplified ───────────────────────────────────────
    {"name": "405_g2_g5",        "period_kyr":   405.0,
     "hypothesis": "known carbon-amplified (Pälike 2006), δ¹³C should win"},
    # ── the new tests ────────────────────────────────────────────────
    {"name": "1200_Palike_Norris","period_kyr":  1200.0,
     "hypothesis": "Pälike-Norris obliquity modulation — predicted carbon-related"},
    {"name": "2365_g4_g3",       "period_kyr":  2365.0,
     "hypothesis": "g₄−g₃ Mars-Earth secular beat — HEADLINE TEST"},
    {"name": "4500_Boulila_lib", "period_kyr":  4500.0,
     "hypothesis": "Boulila 2020 libration — matches 13H in framework"},
    {"name": "9000_grand_cycle", "period_kyr":  9000.0,
     "hypothesis": "Boulila 2018 grand cycle — orbital chaos or internal?"},
]


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


def search_peak_in_band(t, y, band_kyr, n_freq=4000):
    """Lomb-Scargle peak search in a target period band."""
    lo, hi = band_kyr
    freqs = np.linspace(1.0 / hi, 1.0 / lo, n_freq)
    power = LombScargle(t, y).power(freqs)
    i = int(np.argmax(power))
    return float(1.0 / freqs[i]), float(power[i])


def main():
    print("=" * 72)
    print("2.4-MYR g₄−g₃ TEST — CARBON-CYCLE AMPLIFICATION AT LONGER PERIODS?")
    print("=" * 72)
    print(f"  F critical (α=0.05): {F_CRIT:.3f}")
    print(f"  data: Westerhold 2020 CENOGRID full Cenozoic, LOESS-smoothed")

    ages, d13c, d18o = load_cenogrid_both()
    t, y_c = regrid_detrend(ages, d13c, WIN_FULL)
    _, y_o = regrid_detrend(ages, d18o, WIN_FULL)
    print(f"  samples: {len(t)}  span: {WIN_FULL[1]/1000:.1f} Myr\n")

    # First, find empirical peak in 2.0-3.0 Myr band for both proxies
    print("─" * 72)
    print("  (A) Lomb-Scargle peak search in 2.0-3.0 Myr band")
    print("─" * 72)
    band = (2000, 3000)
    p_c, pow_c = search_peak_in_band(t, y_c, band)
    p_o, pow_o = search_peak_in_band(t, y_o, band)
    print(f"    δ¹³C peak in [2.0, 3.0] Myr: {p_c:7.1f} kyr  (power {pow_c:.4f})")
    print(f"    δ¹⁸O peak in [2.0, 3.0] Myr: {p_o:7.1f} kyr  (power {pow_o:.4f})")
    print(f"    Laskar g₄−g₃ predicts:       2365.0 kyr  (g₄−g₃ = 0.548 arcsec/yr)")
    print(f"    |empirical-predicted| δ¹³C: {abs(p_c-2365):.1f} kyr  δ¹⁸O: {abs(p_o-2365):.1f} kyr")

    # Run full test across all candidates
    print("\n" + "─" * 72)
    print("  (B) Per-cycle: amplitude & F-stat in δ¹³C vs δ¹⁸O, with ratio")
    print("─" * 72)
    print(f"    {'cycle':25s} {'P_kyr':>7s}  {'amp δ¹³C':>9s} {'F δ¹³C':>7s}  {'amp δ¹⁸O':>9s} {'F δ¹⁸O':>7s}  {'ratio':>7s}")
    print(f"    {'-'*25} {'-'*7}  {'-'*9} {'-'*7}  {'-'*9} {'-'*7}  {'-'*7}")
    results = []
    for cand in CANDIDATES:
        name = cand["name"]; P = cand["period_kyr"]
        amp_c = single_amp(t, y_c, P)
        amp_o = single_amp(t, y_o, P)
        f_c = thomson_f(y_c, 1.0 / P, DT_KYR)
        f_o = thomson_f(y_o, 1.0 / P, DT_KYR)
        ratio = amp_c / amp_o if amp_o > 1e-9 else float("inf")
        sig_c = "✓" if f_c > F_CRIT else " "
        sig_o = "✓" if f_o > F_CRIT else " "
        print(f"    {name:25s} {P:7.1f}  {amp_c:9.4f}{sig_c} {f_c:7.2f}  {amp_o:9.4f}{sig_o} {f_o:7.2f}  {ratio:7.3f}")
        results.append({
            "name": name,
            "period_kyr": P,
            "hypothesis": cand["hypothesis"],
            "amp_d13c": amp_c, "F_d13c": f_c, "sig_d13c": bool(f_c > F_CRIT),
            "amp_d18o": amp_o, "F_d18o": f_o, "sig_d18o": bool(f_o > F_CRIT),
            "amp_ratio_d13c_over_d18o": ratio,
        })

    # Verdict on headline test
    print("\n" + "═" * 72)
    print("  VERDICT — does g₄−g₃ at 2.4 Myr show carbon-cycle amplification?")
    print("═" * 72)
    r405 = next(r for r in results if r["name"] == "405_g2_g5")
    r24 = next(r for r in results if r["name"] == "2365_g4_g3")
    rprec = next(r for r in results if r["name"] == "precession")
    robli = next(r for r in results if r["name"] == "obliquity")
    r100 = next(r for r in results if r["name"] == "100_kyr_ecc")
    print(f"  δ¹³C/δ¹⁸O ratios at key cycles:")
    print(f"    405 kyr (known carbon-amplified):  {r405['amp_ratio_d13c_over_d18o']:6.3f}")
    print(f"    2.4 Myr g₄−g₃ (the test):          {r24['amp_ratio_d13c_over_d18o']:6.3f}")
    print(f"    Obliquity (insolation control):    {robli['amp_ratio_d13c_over_d18o']:6.3f}")
    print(f"    Precession (insolation control):   {rprec['amp_ratio_d13c_over_d18o']:6.3f}")
    print(f"    100 kyr (ice-sheet expected):      {r100['amp_ratio_d13c_over_d18o']:6.3f}")

    # Decision logic
    r24_value = r24["amp_ratio_d13c_over_d18o"]
    control_max = max(rprec["amp_ratio_d13c_over_d18o"], robli["amp_ratio_d13c_over_d18o"])
    if r24_value > 1.5 and r24_value > 1.5 * control_max:
        verdict = "POSITIVE — 2.4 Myr g₄−g₃ IS carbon-amplified, consistent with hypothesis"
    elif r24_value > 1.2 and r24_value > control_max:
        verdict = "WEAK POSITIVE — modest 2.4 Myr carbon-cycle excess over controls"
    elif r24_value < 1.0:
        verdict = "NEGATIVE — 2.4 Myr g₄−g₃ NOT carbon-amplified; carbon-cycle interpretation does NOT generalize"
    else:
        verdict = "INCONCLUSIVE — ratios in transition zone"
    print(f"\n  VERDICT: {verdict}")

    out = {
        "meta": {
            "F_critical": F_CRIT,
            "data_source": "Westerhold 2020 CENOGRID TableS34 LOESS-smoothed δ¹³C + δ¹⁸O",
            "test_window_kyr": list(WIN_FULL),
            "laskar_g4_minus_g3_arcsec_per_yr": 0.548,
            "laskar_g4_minus_g3_period_kyr": 2365.0,
        },
        "A_empirical_peak_search_2_3_Myr_band": {
            "delta13c_peak_kyr": p_c,
            "delta13c_peak_power": pow_c,
            "delta18o_peak_kyr": p_o,
            "delta18o_peak_power": pow_o,
            "laskar_prediction_kyr": 2365.0,
        },
        "B_cycle_results": results,
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Experiment 1 (doc 98, follow-up after Experiment A) — derive 8H from
the Laskar eigenfrequency / LA2004 spectral data.

Hypothesis
----------
8H = 2,682,536 yr should be the period that makes the secular
eigenfrequencies maximally commensurate. If we sweep candidate periods
T over a wide range and compute the commensurability metric

  J(T) = Σ_i ( f_i × T − round(f_i × T) )² × weight_i

where f_i are the observed top spectral peak frequencies and weight_i
is the peak amplitude, then J(T) should have a global (or near-global)
minimum at T = 8H = 2,682,536 yr.

If 8H wins, the framework's choice of 8H as the fundamental period is
empirically derivable from the data — it IS the period that makes the
solar system's eigenfrequencies maximally lattice-commensurate.

Two parallel tests
------------------
(a) **LA2004-based**: Use observed top spectral peaks in obliquity +
    eccentricity. No theoretical assumption about which eigenmodes the
    peaks correspond to.

(b) **Laskar-eigenfrequency-based**: Use the published Laskar 2004
    g_j and s_j values + k (Earth precession constant). Compute all
    simple beats. Find optimal T.

If both give T_optimal ≈ 8H, the derivation is robust.

Output
------
- J(T) curve over a wide range
- Global minimum, local minima
- 8H optimality verdict
- Comparison to other "natural" candidate periods (1 Myr, 2 Myr, etc.)
"""

import json
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend, welch, find_peaks

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H

H = 335317
EIGHT_H_YR = 8 * H              # 2,682,536 yr
LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/eight-h-derivation.json")


# Standard Laskar 2004 secular eigenfrequencies, in arcseconds per year
# (canonical values; see Laskar 2004, A&A)
ARCSEC_PER_CYCLE = 360 * 3600   # 1,296,000

LASKAR_G = {  # eccentricity-precession eigenfrequencies
    "g1": 5.59,    "g2": 7.45,    "g3": 17.37,   "g4": 17.91,
    "g5": 4.257,   "g6": 28.246,  "g7": 3.087,   "g8": 0.673,
}
LASKAR_S = {  # inclination-node eigenfrequencies (negative = retrograde)
    "s1": -5.61,   "s2": -7.06,   "s3": -18.85,  "s4": -17.75,
    "s5": 0.0,     "s6": -26.347, "s7": -2.99,   "s8": -0.692,
}
# Earth precession constant (modern)
K_EARTH = 50.475  # "/yr

# Convert to cycles per year
LASKAR_G_FREQ = {k: v / ARCSEC_PER_CYCLE for k, v in LASKAR_G.items()}
LASKAR_S_FREQ = {k: v / ARCSEC_PER_CYCLE for k, v in LASKAR_S.items()}
K_FREQ = K_EARTH / ARCSEC_PER_CYCLE


def enumerate_simple_beats():
    """Generate all simple Laskar beats: g_i ± g_j, s_i ± s_j, k + s_j,
    k + g_j (the ones observed in climate spectra)."""
    beats = {}
    # k + s_j (obliquity main and sidebands)
    for j_name, s_j in LASKAR_S_FREQ.items():
        f = K_FREQ + s_j
        if 1/(500e3) < f < 1/(10e3):
            beats[f"k+{j_name}"] = f
        f = K_FREQ - s_j
        if 1/(500e3) < f < 1/(10e3):
            beats[f"k-{j_name}"] = f
    # k + g_j (climatic precession sidebands)
    for j_name, g_j in LASKAR_G_FREQ.items():
        f = K_FREQ + g_j
        if 1/(500e3) < f < 1/(10e3):
            beats[f"k+{j_name}"] = f
        f = K_FREQ - g_j
        if 1/(500e3) < f < 1/(10e3):
            beats[f"k-{j_name}"] = f
    # g_i ± g_j (eccentricity beats)
    g_items = list(LASKAR_G_FREQ.items())
    for i, (ni, gi) in enumerate(g_items):
        for nj, gj in g_items[i+1:]:
            for sign, op in [(1, "+"), (-1, "-")]:
                f = gi + sign * gj
                if 1/(500e3) < abs(f) < 1/(10e3):
                    beats[f"{ni}{op}{nj}"] = abs(f)
    # s_i ± s_j (nodal beats)
    s_items = list(LASKAR_S_FREQ.items())
    for i, (ni, si) in enumerate(s_items):
        for nj, sj in s_items[i+1:]:
            for sign, op in [(1, "+"), (-1, "-")]:
                f = si + sign * sj
                if 1/(500e3) < abs(f) < 1/(10e3):
                    beats[f"{ni}{op}{nj}"] = abs(f)
    return beats


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


def extract_top_peaks(signal, n_top=20, dt_yr=1000.0):
    s = detrend(signal)
    nperseg = min(len(s), 8192)
    nfft = nperseg * 4
    freqs, psd = welch(s, fs=1.0/dt_yr, nperseg=nperseg, nfft=nfft,
                       detrend='linear', scaling='density')
    freqs, psd = freqs[1:], psd[1:]
    band_mask = (freqs > 1/(500e3)) & (freqs < 1/(10e3))
    f_band, p_band = freqs[band_mask], psd[band_mask]
    peaks, _ = find_peaks(p_band, prominence=p_band.max() * 0.001)
    peak_list = [(float(f_band[i]), float(p_band[i])) for i in peaks]
    peak_list.sort(key=lambda x: -x[1])
    return peak_list[:n_top]


def commensurability_J(T, freqs, weights=None):
    """Sum-of-weighted-squared-distance from integers of f_i × T."""
    products = np.asarray(freqs) * T
    nearest_int = np.round(products)
    diffs = products - nearest_int
    if weights is None:
        return float(np.mean(diffs ** 2))
    w = np.asarray(weights) / np.sum(weights)
    return float(np.sum(w * diffs ** 2))


def sweep_periods(freqs, T_range_yr, n_T=10000, weights=None):
    """Sweep T over given range, return J(T)."""
    Ts = np.linspace(T_range_yr[0], T_range_yr[1], n_T)
    J = np.array([commensurability_J(T, freqs, weights) for T in Ts])
    return Ts, J


def main():
    print("=" * 92)
    print("  Where does 8H come from? — derivation of 2,682,536 yr from data")
    print("=" * 92)
    print(f"\n  Target period: 8H = {EIGHT_H_YR:,} yr = {EIGHT_H_YR/1e6:.6f} Myr")

    # ── Path A: LA2004 spectral peaks ──
    print(f"\n  ── Path A: LA2004-based test ──")
    ages_yr, ecc, obliq = load_la2004()
    obl_peaks = extract_top_peaks(obliq, n_top=20)
    ecc_peaks = extract_top_peaks(ecc, n_top=20)
    print(f"    obliquity peaks: {len(obl_peaks)}, "
          f"eccentricity peaks: {len(ecc_peaks)}")

    # Use obliquity-only for clean test (Test A showed obl is 100% closed)
    obl_freqs = [p[0] for p in obl_peaks]
    obl_weights = [p[1] for p in obl_peaks]

    print(f"\n  Sweeping T ∈ [0.5, 10] Myr to find optimal commensurability ...",
          flush=True)
    T_sweep, J_sweep = sweep_periods(obl_freqs, (0.5e6, 10e6),
                                     n_T=20000, weights=obl_weights)
    T_optimal = T_sweep[np.argmin(J_sweep)]
    J_optimal = J_sweep.min()
    J_at_8H = commensurability_J(EIGHT_H_YR, obl_freqs, obl_weights)
    print(f"\n    Global minimum: T = {T_optimal:.0f} yr "
          f"({T_optimal/1e6:.4f} Myr), J = {J_optimal:.4f}")
    print(f"    J at 8H = {EIGHT_H_YR:,} yr: J = {J_at_8H:.4f}")
    ratio_8H = T_optimal / EIGHT_H_YR
    print(f"    T_optimal / 8H = {ratio_8H:.4f}")

    # Find all local minima of J(T)
    inv_minima, _ = find_peaks(-J_sweep, prominence=0.01 * np.ptp(J_sweep))
    print(f"\n  Top 10 local minima of J(T):")
    print(f"    {'T (Myr)':>11}{'J':>10}{'T/8H':>9}{'frac':>15}")
    minima_list = [(float(T_sweep[i]), float(J_sweep[i])) for i in inv_minima]
    minima_list.sort(key=lambda x: x[1])  # by J value (best first)
    for T_min, J_min in minima_list[:10]:
        ratio = T_min / EIGHT_H_YR
        # Express T_min as fraction of 8H
        for num in range(1, 12):
            for den in range(1, 12):
                if abs(ratio - num/den) < 0.005:
                    frac = f"≈ {num}/{den} × 8H"
                    break
            else: continue
            break
        else:
            frac = ""
        print(f"    {T_min/1e6:>10.4f}M{J_min:>10.4f}{ratio:>8.3f}×{frac:>15}")

    # Where does 8H rank?
    rank_8H = sum(1 for _, J_min in minima_list if J_min < J_at_8H) + 1
    print(f"\n    8H rank among local minima: {rank_8H} / {len(minima_list)}")
    pct_better = float(np.mean(J_sweep < J_at_8H) * 100)
    print(f"    Fraction of T values with LOWER J than 8H: {pct_better:.2f}%")

    # ── Path B: Laskar published eigenfrequencies ──
    print(f"\n  ── Path B: Laskar published eigenfrequencies ──")
    beats = enumerate_simple_beats()
    beat_freqs = list(beats.values())
    print(f"    enumerated {len(beats)} simple beats from Laskar values")
    # Equal weights (we don't know amplitudes a priori)
    print(f"    Sweeping T ∈ [0.5, 10] Myr ...", flush=True)
    T_sweep_B, J_sweep_B = sweep_periods(beat_freqs, (0.5e6, 10e6), n_T=20000)
    T_optimal_B = T_sweep_B[np.argmin(J_sweep_B)]
    J_optimal_B = J_sweep_B.min()
    J_at_8H_B = commensurability_J(EIGHT_H_YR, beat_freqs)
    print(f"\n    Global minimum: T = {T_optimal_B:.0f} yr "
          f"({T_optimal_B/1e6:.4f} Myr), J = {J_optimal_B:.4f}")
    print(f"    J at 8H: {J_at_8H_B:.4f}")
    print(f"    T_optimal / 8H = {T_optimal_B/EIGHT_H_YR:.4f}")

    inv_minima_B, _ = find_peaks(-J_sweep_B, prominence=0.01 * np.ptp(J_sweep_B))
    minima_B = sorted([(float(T_sweep_B[i]), float(J_sweep_B[i]))
                       for i in inv_minima_B], key=lambda x: x[1])
    print(f"\n  Top 10 local minima (Laskar beats):")
    print(f"    {'T (Myr)':>11}{'J':>10}{'T/8H':>9}{'frac':>15}")
    for T_min, J_min in minima_B[:10]:
        ratio = T_min / EIGHT_H_YR
        for num in range(1, 12):
            for den in range(1, 12):
                if abs(ratio - num/den) < 0.005:
                    frac = f"≈ {num}/{den} × 8H"
                    break
            else: continue
            break
        else:
            frac = ""
        print(f"    {T_min/1e6:>10.4f}M{J_min:>10.4f}{ratio:>8.3f}×{frac:>15}")
    rank_8H_B = sum(1 for _, J_min in minima_B if J_min < J_at_8H_B) + 1
    pct_better_B = float(np.mean(J_sweep_B < J_at_8H_B) * 100)
    print(f"\n    8H rank: {rank_8H_B} / {len(minima_B)}")
    print(f"    Fraction with lower J: {pct_better_B:.2f}%")

    # ── Compare 8H to "natural" candidates ──
    print(f"\n  ── Candidate period comparison ──")
    candidates = {
        "8H = 2.683 Myr (framework)": EIGHT_H_YR,
        "1 Myr (round number)": 1e6,
        "2 Myr (round number)": 2e6,
        "405 kyr × 6 = 2.43 Myr": 405e3 * 6,
        "405 kyr × 7 = 2.84 Myr": 405e3 * 7,
        "100 kyr × 27 = 2.70 Myr": 100e3 * 27,
        "41 kyr × 65 = 2.665 Myr": 41e3 * 65,
        "Global optimum (LA2004)": T_optimal,
        "Global optimum (Laskar)": T_optimal_B,
    }
    print(f"\n    {'Candidate':<40}{'T (yr)':>12}{'J (LA2004)':>14}{'J (Laskar)':>14}")
    for name, T in candidates.items():
        J_la = commensurability_J(T, obl_freqs, obl_weights)
        J_lk = commensurability_J(T, beat_freqs)
        print(f"    {name:<40}{T:>12,.0f}{J_la:>13.4f}{J_lk:>13.4f}")

    # ── Verdict ──
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)
    if pct_better < 5 and pct_better_B < 5:
        verdict = (
            f"✓ 8H IS NEAR-OPTIMAL in both LA2004 and Laskar tests. "
            f"In LA2004, {pct_better:.2f}% of T values beat 8H's J; "
            f"in Laskar-beat data, {pct_better_B:.2f}% beat 8H. This "
            f"is strong evidence that 8H is empirically derivable as "
            f"the period that makes the secular eigenfrequencies "
            f"maximally commensurate."
        )
    elif pct_better < 25 or pct_better_B < 25:
        verdict = (
            f"? PARTIAL. 8H is better than median ({pct_better:.1f}% "
            f"LA2004, {pct_better_B:.1f}% Laskar) but other periods "
            f"also give competitive commensurability. 8H may be ONE OF "
            f"several near-optimal closed periods, not the unique one."
        )
    else:
        verdict = (
            f"✗ 8H IS NOT GLOBALLY OPTIMAL. Other periods give "
            f"substantially lower J ({pct_better:.1f}% / {pct_better_B:.1f}% "
            f"beat it). The framework's choice of 8H may be approximate or "
            f"motivated by something other than pure commensurability."
        )
    print(f"  {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            "Find period T that minimizes commensurability metric "
            "J(T) = Σ wᵢ(fᵢT − round(fᵢT))². Tested with (A) top-20 LA2004 "
            "obliquity spectral peaks weighted by amplitude and (B) all "
            "Laskar 2004 simple beats with equal weights. Compared global "
            "minimum to 8H = 2,682,536 yr."
        ),
        "EIGHT_H_yr": EIGHT_H_YR,
        "path_A_LA2004": {
            "T_optimal_yr": float(T_optimal),
            "J_optimal": float(J_optimal),
            "J_at_8H": float(J_at_8H),
            "T_optimal_over_8H": float(ratio_8H),
            "pct_T_better_than_8H": float(pct_better),
            "rank_of_8H": int(rank_8H),
        },
        "path_B_Laskar": {
            "T_optimal_yr": float(T_optimal_B),
            "J_optimal": float(J_optimal_B),
            "J_at_8H": float(J_at_8H_B),
            "T_optimal_over_8H": float(T_optimal_B / EIGHT_H_YR),
            "pct_T_better_than_8H": float(pct_better_B),
            "rank_of_8H": int(rank_8H_B),
        },
        "verdict": verdict,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

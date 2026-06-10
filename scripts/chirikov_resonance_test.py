#!/usr/bin/env python3
"""
Experiment B (doc 98) — Chirikov resonance overlap test on the L1 lattice.

Hypothesis
----------
If the 8H lattice marks the surviving stable spectral structure of the
secular system (KAM tori protected from resonance overlap), then L1
integers should sit in GAPS between neighboring resonance widths.

Chirikov's criterion: each resonance has a width δω; neighboring
resonances overlap (→ chaos) when δω₁ + δω₂ > |ω₁ - ω₂|, and remain
separated (→ KAM stability) when δω₁ + δω₂ < |ω₁ - ω₂|.

The local overlap parameter at a frequency f is:
    K(f) = Σ(widths in neighborhood) / Σ(separations in neighborhood)

  K < 1  → gap region → KAM-protected
  K > 1  → overlap region → chaotic

The framework's prediction: K at L1 integer positions should be
systematically LOWER than at random non-L1 positions in the same range.

Method
------
1. Load LA2004 obliquity spectrum (high-res Welch, full 51 Myr).
2. Find all significant spectral peaks (top N local maxima).
3. For each peak, estimate FWHM as resonance width.
4. Sweep a fine grid of candidate frequencies; at each, compute K.
5. Compute K at each L1 integer position; compare to K at random
   non-L1 positions in the same frequency range.

Outputs
-------
- Per-L1-integer K values + verdict (gap vs overlap)
- Mann-Whitney comparison: L1 K vs non-L1 K
- Bottom-quartile concentration test
- Saved to data/chirikov-resonance.json
"""

import json
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend, welch, find_peaks, peak_widths
from scipy.stats import mannwhitneyu

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS

LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/chirikov-resonance.json")

PERIOD_RANGE_KYR = (14.0, 500.0)  # extended to cover ecc 405-kyr
N_TOP_PEAKS = 200                 # how many resonances to include
NEIGHBORHOOD_PCT = 15.0           # ±% around each candidate for K computation
N_RANDOM_CONTROLS = 1000          # non-L1 random positions for null
PROMINENCE_REL = 0.001            # lower threshold to get more peaks


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


def hires_spectrum(signal, dt_yr=1000.0, nperseg=8192, zero_pad=4):
    s = detrend(signal)
    nfft = nperseg * zero_pad
    freqs, psd = welch(s, fs=1.0 / dt_yr, nperseg=nperseg, nfft=nfft,
                       detrend='linear', scaling='density')
    if freqs[0] == 0:
        freqs = freqs[1:]; psd = psd[1:]
    return freqs, psd


def extract_resonances(freqs, psd, n_top=N_TOP_PEAKS, label=""):
    """Find top N spectral peaks + estimate their widths (FWHM in cyc/yr)."""
    f_min = 1.0 / (PERIOD_RANGE_KYR[1] * 1000)
    f_max = 1.0 / (PERIOD_RANGE_KYR[0] * 1000)
    band = (freqs >= f_min) & (freqs <= f_max)
    f_band = freqs[band]; p_band = psd[band]

    prom_thresh = PROMINENCE_REL * p_band.max()
    peak_idx, _ = find_peaks(p_band, prominence=prom_thresh)
    if len(peak_idx) == 0:
        return []

    widths_bins, _, _, _ = peak_widths(p_band, peak_idx, rel_height=0.5)
    df = f_band[1] - f_band[0]
    widths_freq = widths_bins * df

    cands = [
        {"freq": float(f_band[i]),
         "period_yr": float(1.0 / f_band[i]),
         "amplitude": float(p_band[i]),
         "width_freq": float(w),
         "source": label}
        for i, w in zip(peak_idx, widths_freq)
    ]
    cands.sort(key=lambda r: r["amplitude"], reverse=True)
    return cands[:n_top]


def merge_resonances(ecc_res, obl_res):
    """Combine ecc + obl resonances, normalizing amplitudes within each
    spectrum so they're comparable, then deduplicating very close peaks."""
    if not ecc_res or not obl_res:
        return ecc_res + obl_res

    # Normalize amplitudes within each spectrum to [0, 1]
    ecc_max = max(r["amplitude"] for r in ecc_res)
    obl_max = max(r["amplitude"] for r in obl_res)
    for r in ecc_res:
        r["amplitude_norm"] = r["amplitude"] / ecc_max
    for r in obl_res:
        r["amplitude_norm"] = r["amplitude"] / obl_max

    combined = ecc_res + obl_res
    combined.sort(key=lambda r: r["freq"])

    # Deduplicate near-coincident peaks (within 1% in frequency)
    merged = []
    for r in combined:
        if merged and abs(r["freq"] - merged[-1]["freq"]) / r["freq"] < 0.01:
            # Same peak in both spectra — keep wider width, max amplitude
            prev = merged[-1]
            prev["width_freq"] = max(prev["width_freq"], r["width_freq"])
            prev["amplitude_norm"] = max(prev["amplitude_norm"],
                                          r["amplitude_norm"])
            prev["source"] = prev["source"] + "+" + r["source"]
        else:
            merged.append(r)
    return merged


def K_at_frequency(target_freq, resonances, neighborhood_pct=NEIGHBORHOOD_PCT):
    """Compute Chirikov overlap parameter K in the neighborhood around
    target_freq. K = sum(widths) / sum(separations) within a window
    spanning ±neighborhood_pct of target_freq."""
    f_lo = target_freq * (1 - neighborhood_pct / 100)
    f_hi = target_freq * (1 + neighborhood_pct / 100)
    in_nbhd = [r for r in resonances if f_lo <= r["freq"] <= f_hi]
    if len(in_nbhd) < 2:
        return None  # Need at least 2 resonances for K to be defined
    # Sort by frequency
    in_nbhd.sort(key=lambda r: r["freq"])
    width_sum = sum(r["width_freq"] for r in in_nbhd)
    sep_sum = sum(
        in_nbhd[i + 1]["freq"] - in_nbhd[i]["freq"]
        for i in range(len(in_nbhd) - 1)
    )
    if sep_sum == 0:
        return None
    return float(width_sum / sep_sum)


def main():
    print("=" * 92)
    print("  Chirikov resonance overlap test — KAM mechanism for L1 lattice?")
    print("=" * 92)

    print("\n  Loading LA2004 ...", flush=True)
    ages_yr, ecc, obliq = load_la2004()
    print(f"    samples: {len(ages_yr)}")

    print(f"\n  Computing high-resolution spectra (ecc + obl) ...", flush=True)
    f_ecc, psd_ecc = hires_spectrum(ecc)
    f_obl, psd_obl = hires_spectrum(obliq)
    print(f"    resolution: {f_ecc[1] - f_ecc[0]:.2e} cyc/yr")

    print(f"\n  Extracting resonances ...", flush=True)
    ecc_res = extract_resonances(f_ecc, psd_ecc, N_TOP_PEAKS, label="ecc")
    obl_res = extract_resonances(f_obl, psd_obl, N_TOP_PEAKS, label="obl")
    print(f"    ecc: {len(ecc_res)} resonances; obl: {len(obl_res)} resonances")
    resonances = merge_resonances(ecc_res, obl_res)
    print(f"    merged (dedup): {len(resonances)} resonances")
    print(f"\n  Top 10 by amplitude:")
    print(f"  {'rank':>5}{'period kyr':>13}{'width kyr':>13}{'PSD':>11}")
    for i, r in enumerate(resonances[:10], 1):
        # Convert width from freq to equivalent period spread
        width_p = r["width_freq"] / r["freq"]**2  # |dP/df| × df
        print(f"  {i:>5}{r['period_yr']/1000:>12.2f}k"
              f"{width_p/1000:>12.2f}k{r['amplitude']:>11.2e}")

    # ── Compute K at every detected peak, then split L1-aligned vs not ──
    print(f"\n  Computing K at each detected resonance peak ...", flush=True)
    print(f"  (Reformulated test: compare KAM stability of L1-aligned peaks")
    print(f"  to non-L1 peaks. Test C-Invariant showed L1 sits AT peaks, not")
    print(f"  between them, so the proper test is peak-vs-peak.)")

    L1_periods = [EIGHT_H * 1000.0 / n for n in L1_LATTICE_INTEGERS]

    def nearest_L1(period_yr, tol_pct=3.0):
        best_n, best_err = None, 100
        for n, p in zip(L1_LATTICE_INTEGERS, L1_periods):
            err = abs(period_yr - p) / p * 100
            if err < best_err:
                best_n, best_err = n, err
        return (best_n, best_err) if best_err < tol_pct else (None, best_err)

    peak_results = []
    for r in resonances:
        K = K_at_frequency(r["freq"], resonances)
        if K is None:
            continue
        n_match, err = nearest_L1(r["period_yr"])
        peak_results.append({
            "period_yr": r["period_yr"],
            "K": K,
            "L1_match_n": n_match,
            "L1_err_pct": err,
            "amplitude_norm": r.get("amplitude_norm", 1.0),
            "source": r["source"],
        })

    l1_aligned = [p for p in peak_results if p["L1_match_n"] is not None]
    not_l1 = [p for p in peak_results if p["L1_match_n"] is None]
    print(f"\n    Total peaks: {len(peak_results)}")
    print(f"    L1-aligned (within 3% of an L1 integer): {len(l1_aligned)}")
    print(f"    Non-L1: {len(not_l1)}")

    print(f"\n  ── L1-aligned peaks ──")
    print(f"  {'n':>4}{'period kyr':>12}{'K':>10}{'err':>7}{'source':>10}")
    for p in sorted(l1_aligned, key=lambda x: x["period_yr"]):
        print(f"  {p['L1_match_n']:>4}{p['period_yr']/1000:>11.1f}k"
              f"{p['K']:>10.3f}{p['L1_err_pct']:>6.1f}%{p['source']:>10}")

    print(f"\n  ── Non-L1 peaks ──")
    print(f"  {'period kyr':>12}{'K':>10}{'nearest L1 err':>17}{'source':>10}")
    for p in sorted(not_l1, key=lambda x: x["period_yr"]):
        print(f"  {p['period_yr']/1000:>11.1f}k{p['K']:>10.3f}"
              f"{p['L1_err_pct']:>15.1f}%{p['source']:>10}")

    valid_l1_K = [p["K"] for p in l1_aligned]
    control_K = [p["K"] for p in not_l1]

    if not valid_l1_K or not control_K:
        print("\n  Insufficient peaks for comparison.")
        return

    control_arr = np.asarray(control_K)
    n_gap = sum(1 for k in valid_l1_K if k < 1)
    n_overlap = sum(1 for k in valid_l1_K if k >= 1)
    print(f"\n  L1-peak K stats: median={np.median(valid_l1_K):.3f}, "
          f"mean={np.mean(valid_l1_K):.3f}, n={len(valid_l1_K)}")
    print(f"  L1 verdict: {n_gap} stable (K<1), {n_overlap} chaotic (K≥1)")
    print(f"\n  Non-L1 peak K stats: median={np.median(control_arr):.3f}, "
          f"mean={np.mean(control_arr):.3f}, n={len(control_arr)}")

    # ── Statistical tests ──
    print(f"\n  ── STATISTICAL TESTS ──")
    # Mann-Whitney: L1-aligned peak K < non-L1 peak K?
    mw_u, mw_p = mannwhitneyu(valid_l1_K, control_K, alternative='less')
    print(f"\n  Mann-Whitney (L1 K < control K, one-sided):")
    print(f"    U = {mw_u:.0f}, p = {mw_p:.4f}")
    if mw_p < 0.05:
        print(f"    ✓ L1 K is SIGNIFICANTLY lower than control")
    else:
        print(f"    ✗ L1 K NOT significantly different from control")

    # Quartile concentration: what % of L1 fall in the bottom quartile of all?
    bottom_q = np.percentile(control_arr, 25)
    l1_in_bottom = sum(1 for k in valid_l1_K if k < bottom_q)
    expected_random = len(valid_l1_K) * 0.25
    print(f"\n  Bottom-quartile concentration:")
    print(f"    Control 25th percentile K = {bottom_q:.3f}")
    print(f"    L1 in bottom quartile: {l1_in_bottom}/{len(valid_l1_K)} = "
          f"{100*l1_in_bottom/len(valid_l1_K):.1f}% (expected ~25%)")
    if l1_in_bottom / len(valid_l1_K) > 0.4:
        print(f"    ✓ L1 over-concentrated in bottom quartile")
    else:
        print(f"    ✗ L1 not over-concentrated in bottom quartile")

    # Stability-fraction comparison (peaks with K<1 are KAM-stable)
    control_stable_frac = float(np.mean(control_arr < 1.0))
    l1_stable_frac = n_gap / len(valid_l1_K)
    print(f"\n  Stable-peak fraction (% K < 1):")
    print(f"    L1-aligned: {100*l1_stable_frac:.1f}% ({n_gap}/{len(valid_l1_K)})")
    print(f"    Non-L1:     {100*control_stable_frac:.1f}% "
          f"({int(control_stable_frac*len(control_arr))}/{len(control_arr)})")

    # ── Synthesis ──
    print()
    print("=" * 92)
    print("  SYNTHESIS — does the KAM-protected stable manifold hypothesis hold?")
    print("=" * 92)
    # All Hamiltonian-system spectral peaks are by construction KAM-stable
    # (chaotic regions produce broadband noise, not sharp peaks). The
    # question this test answers: are L1 peaks more stable than non-L1 peaks?
    if l1_stable_frac > 0.9 and control_stable_frac > 0.9:
        verdict = (
            f"NULL BUT INFORMATIVE — ALL spectral peaks are KAM-stable: "
            f"L1-aligned {100*l1_stable_frac:.0f}% stable, non-L1 "
            f"{100*control_stable_frac:.0f}% stable, Mann-Whitney p="
            f"{mw_p:.3g}. This says KAM theory is the GENERAL property "
            f"of LA2004's spectrum (which is what we'd expect for a "
            f"quasi-periodic Hamiltonian solution), but it does NOT "
            f"single out L1 from the broader set of stable peaks. "
            f"L1 captures {len(l1_aligned)}/{len(peak_results)}={100*len(l1_aligned)/len(peak_results):.0f}% "
            f"of the stable spectral peaks, but the remaining "
            f"{len(not_l1)} non-L1 peaks are ALSO KAM-stable. The "
            f"mechanism that singles out L1 must be more specific than "
            f"KAM stability — likely the 8H quantization itself "
            f"(periodicity in action-angle space) rather than "
            f"resonance-overlap protection."
        )
    elif mw_p < 0.05:
        verdict = (
            f"L1 peaks are SIGNIFICANTLY more stable than non-L1 peaks "
            f"(p={mw_p:.3g}). KAM resonance-overlap is a candidate "
            f"mechanism — L1 marks the most-protected stable manifold."
        )
    else:
        verdict = (
            f"L1 vs non-L1 K distributions indistinguishable "
            f"(p={mw_p:.3g}). KAM mechanism unsupported by this test."
        )
    print(f"  {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            f"Chirikov resonance overlap test (peak-vs-peak reformulation). "
            f"Extracted spectral peaks from LA2004 eccentricity and obliquity "
            f"(Welch PSD, full 51 Myr, period range {PERIOD_RANGE_KYR[0]}-"
            f"{PERIOD_RANGE_KYR[1]} kyr) with FWHM widths. Computed local "
            f"Chirikov K = Σ(widths)/Σ(separations) in ±{NEIGHBORHOOD_PCT}% "
            f"around each peak. Tagged peaks as L1-aligned (within 3% of "
            f"any L1 integer) vs non-L1. Compared K distributions."
        ),
        "n_resonances_used": len(resonances),
        "n_L1_aligned_peaks": len(l1_aligned),
        "n_non_L1_peaks": len(not_l1),
        "L1_median_K": float(np.median(valid_l1_K)),
        "L1_stable_fraction": float(l1_stable_frac),
        "control_median_K": float(np.median(control_arr)),
        "control_stable_fraction": float(control_stable_frac),
        "mann_whitney_U": float(mw_u),
        "mann_whitney_p": float(mw_p),
        "L1_in_control_bottom_quartile": int(l1_in_bottom),
        "verdict": verdict,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

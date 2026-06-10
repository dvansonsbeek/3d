#!/usr/bin/env python3
"""
Test the J2000-off-balance / libration hypothesis.

The user's insight
------------------
LA2004 (and every N-body integrator) initializes from J2000 — an
arbitrary snapshot of planetary positions. J2000 is NOT a special
configuration; the planets are not at their balanced equilibrium values
at that moment. So when Laskar integrates outward, the system *librates*
(oscillates) around the framework's balanced equilibrium rather than
genuinely drifting.

What looks like "spectral peak drift" in our C-tests may actually be
*libration*: peaks swinging back and forth across their equilibrium
positions, with J2000 happening to be at some random phase of the swing.

This script tests that hypothesis with two diagnostics.

Diagnostic A — time-mean test
-----------------------------
If the system librates symmetrically around the framework's predicted
period 8H/n, then averaging over the full 50 Myr should give
mean(observed) ≈ predicted. Systematic bias from predicted would mean
the equilibrium is shifted, not at 8H/n.

Diagnostic B — libration vs drift
---------------------------------
For each L1 integer's per-window observed periods, decompose into:
  - linear trend (drift slope) — should be ~0 if libration only
  - residual oscillation (libration amplitude)
Compare trend |slope| to oscillation std. If |slope| << std, libration
dominates; if comparable, true drift is present.

Aggregate diagnostic
--------------------
- L1 integers where mean(observed) ≈ predicted AND |slope| ≪ std →
  libration confirmed
- L1 integers where mean(observed) ≠ predicted OR |slope| ~ std →
  real drift / equilibrium shift / chaos

For drifted precession sidebands (16-24% drift in Test C-50), this
distinguishes:
  • libration around 8H/n with J2000 at extremal phase (user's
    hypothesis: framework correct, Laskar oscillates around it)
  • equilibrium shifted from 8H/n (framework imperfect / lattice
    positions are approximate equilibria)
  • genuine secular drift (real chaos, Laskar reflects reality)
"""

import json
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend, welch
from scipy.stats import linregress

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS

LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/l1-libration-test.json")

WINDOW_MYR = 4.0
STEP_MYR = 1.0
BAND_HALF_PCT = 15.0   # search ±15% around predicted period


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


def window_psd(signal_w, dt_yr=1000.0, zero_pad=8):
    """Welch PSD with frequency zero-padding for finer peak localization."""
    sig = detrend(signal_w)
    N = len(sig)
    nperseg = min(N, 1024)
    nfft = nperseg * zero_pad
    freqs, psd = welch(sig, fs=1.0 / dt_yr, nperseg=nperseg, nfft=nfft,
                       detrend='linear', scaling='density')
    if freqs[0] == 0:
        freqs = freqs[1:]; psd = psd[1:]
    return freqs, psd


def find_local_peak_period(freqs, psd, predicted_period_yr,
                            band_pct=BAND_HALF_PCT):
    """Find nearest local maximum to predicted period; return observed period."""
    f_pred = 1.0 / predicted_period_yr
    band = (freqs >= f_pred * (1 - band_pct/100)) & \
           (freqs <= f_pred * (1 + band_pct/100))
    if band.sum() < 3:
        return None
    f_band = freqs[band]; p_band = psd[band]
    # Find local maxima in band
    if len(p_band) < 3:
        return None
    peak_mask = np.zeros_like(p_band, dtype=bool)
    peak_mask[1:-1] = (p_band[1:-1] > p_band[:-2]) & (p_band[1:-1] > p_band[2:])
    if not peak_mask.any():
        # No local max in band — return position of global max in band
        return float(1.0 / f_band[np.argmax(p_band)])
    peak_freqs = f_band[peak_mask]
    peak_psds = p_band[peak_mask]
    # Pick the largest peak in the band
    best = peak_freqs[np.argmax(peak_psds)]
    return float(1.0 / best)


def per_window_peaks(ages_yr, signal, integers):
    """Return dict integer → list of observed periods, one per window.
    Also returns the list of window centers (in years before present).
    """
    starts = np.arange(ages_yr.min(),
                       ages_yr.max() - WINDOW_MYR * 1e6 + 1,
                       STEP_MYR * 1e6)
    window_centers = []
    per_int = {n: [] for n in integers}
    for s in starts:
        mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
        if mask.sum() < 1000: continue
        freqs, psd = window_psd(signal[mask])
        center = s + WINDOW_MYR * 0.5 * 1e6
        window_centers.append(center)
        for n in integers:
            p_pred = EIGHT_H * 1000.0 / n
            obs = find_local_peak_period(freqs, psd, p_pred)
            per_int[n].append(obs)
    return per_int, window_centers


def classify(integer_periods, window_centers, predicted_yr):
    """For one integer's per-window peak periods, classify as libration vs
    drift vs equilibrium-shifted. Returns dict with metrics + classification.
    """
    arr = np.asarray([p for p in integer_periods if p is not None])
    if len(arr) < 5:
        return None
    valid_centers = np.asarray([
        c for c, p in zip(window_centers, integer_periods) if p is not None
    ])
    bias_pct = (np.mean(arr) - predicted_yr) / predicted_yr * 100
    std_pct = np.std(arr) / predicted_yr * 100
    # Linear trend through period over time
    slope, intercept, r, p, _ = linregress(valid_centers, arr)
    # Slope in pct-per-Myr
    slope_pct_per_Myr = slope * 1e6 / predicted_yr * 100
    # Total trend across observed range
    trend_range_pct = abs(slope * (valid_centers.max() - valid_centers.min())) \
                       / predicted_yr * 100
    # Residual std after detrending
    residuals = arr - (slope * valid_centers + intercept)
    residual_std_pct = np.std(residuals) / predicted_yr * 100

    # Classify
    libration_dominates = trend_range_pct < residual_std_pct
    bias_significant = abs(bias_pct) > 2.0
    if libration_dominates and not bias_significant:
        cls = "libration"
    elif bias_significant and trend_range_pct < residual_std_pct:
        cls = "equilibrium_shifted"
    elif trend_range_pct > 2 * residual_std_pct:
        cls = "real_drift"
    else:
        cls = "mixed"

    return {
        "n_observations": len(arr),
        "predicted_yr": float(predicted_yr),
        "mean_observed_yr": float(np.mean(arr)),
        "bias_pct": float(bias_pct),
        "std_pct": float(std_pct),
        "linear_slope_pct_per_Myr": float(slope_pct_per_Myr),
        "trend_range_pct": float(trend_range_pct),
        "residual_std_pct": float(residual_std_pct),
        "trend_p_value": float(p),
        "classification": cls,
    }


def main():
    print("=" * 92)
    print("  Equilibrium libration test — does Laskar oscillate around the lattice?")
    print("=" * 92)

    print("\n  Loading LA2004 ...", flush=True)
    ages_yr, ecc, obliq = load_la2004()
    print(f"    n samples: {len(ages_yr)}, range "
          f"{ages_yr.min()/1e6:+.1f} to {ages_yr.max()/1e6:+.1f} Myr")
    print(f"    Window: {WINDOW_MYR} Myr, step: {STEP_MYR} Myr → "
          f"{int((50 - WINDOW_MYR) / STEP_MYR) + 1} sliding windows")

    print("\n  Tracking peak positions per window for L1 integers ...", flush=True)
    per_int_ecc, centers_ecc = per_window_peaks(ages_yr, ecc, L1_LATTICE_INTEGERS)
    per_int_obl, centers_obl = per_window_peaks(ages_yr, obliq, L1_LATTICE_INTEGERS)
    print(f"    ecc windows: {len(centers_ecc)}, obl windows: {len(centers_obl)}")

    # Classify each L1 integer in the proxy where its predicted period is
    # most-naturally expressed (use whichever has lower std)
    rows = []
    for n in L1_LATTICE_INTEGERS:
        pred = EIGHT_H * 1000.0 / n
        ecc_cls = classify(per_int_ecc[n], centers_ecc, pred)
        obl_cls = classify(per_int_obl[n], centers_obl, pred)
        # Choose the proxy with tighter residuals (more reliable measurement)
        if ecc_cls is None and obl_cls is None: continue
        if ecc_cls is None:
            chosen = obl_cls; proxy = "obl"
        elif obl_cls is None:
            chosen = ecc_cls; proxy = "ecc"
        else:
            if ecc_cls["residual_std_pct"] <= obl_cls["residual_std_pct"]:
                chosen = ecc_cls; proxy = "ecc"
            else:
                chosen = obl_cls; proxy = "obl"
        chosen["n"] = int(n)
        chosen["predicted_period_kyr"] = float(pred / 1000)
        chosen["proxy"] = proxy
        rows.append(chosen)

    rows.sort(key=lambda r: r["n"])

    print()
    print("  ── Per-integer classification ──")
    print(f"  {'n':>4}{'P_pred':>9}{'proxy':>6}{'bias%':>8}{'std%':>7}"
          f"{'trend%':>9}{'resid%':>9}{'class':>22}")
    counts = {"libration": 0, "real_drift": 0,
              "equilibrium_shifted": 0, "mixed": 0}
    for r in rows:
        counts[r["classification"]] += 1
        print(f"  {r['n']:>4}{r['predicted_period_kyr']:>8.1f}k"
              f"{r['proxy']:>6}{r['bias_pct']:>+7.2f}%"
              f"{r['std_pct']:>6.2f}%"
              f"{r['trend_range_pct']:>8.2f}%"
              f"{r['residual_std_pct']:>8.2f}%"
              f"  {r['classification']:>20}")

    print()
    print("  ── Classification summary ──")
    total = len(rows)
    for cls, count in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"    {cls:<22}: {count:>3}/{total} ({100*count/total:.0f}%)")

    # Aggregate bias test: is bias centered on 0?
    biases = np.asarray([r["bias_pct"] for r in rows])
    print(f"\n  ── Aggregate bias test (is the lattice the equilibrium?) ──")
    print(f"    Mean bias across all L1 integers: {np.mean(biases):+.3f}%")
    print(f"    Median bias:                      {np.median(biases):+.3f}%")
    print(f"    Std of biases:                    {np.std(biases):.3f}%")
    print(f"    # |bias| < 1%:  {np.sum(np.abs(biases) < 1)}/{len(biases)}")
    print(f"    # |bias| < 2%:  {np.sum(np.abs(biases) < 2)}/{len(biases)}")
    print(f"    # |bias| < 5%:  {np.sum(np.abs(biases) < 5)}/{len(biases)}")

    # Single-sample t-test: is mean bias different from 0?
    from scipy.stats import ttest_1samp
    t_stat, t_p = ttest_1samp(biases, 0)
    print(f"\n    Two-sided t-test (bias vs 0): t = {t_stat:.2f}, p = {t_p:.3f}")
    if t_p > 0.1 and abs(np.mean(biases)) < 1:
        print(f"    ✓ Mean bias indistinguishable from 0 — system librates "
              f"symmetrically around the framework's lattice positions.")
    elif t_p < 0.05:
        print(f"    ✗ Mean bias is significantly nonzero — equilibrium is "
              f"systematically shifted from 8H/n.")
    else:
        print(f"    ? Weak evidence either way.")

    # ── Verdict ──
    print()
    print("=" * 92)
    print("  SYNTHESIS — does Laskar librate around the framework's lattice?")
    print("=" * 92)
    libration_pct = counts["libration"] / total * 100
    drift_pct = counts["real_drift"] / total * 100
    mean_bias = np.mean(biases)
    if libration_pct > 50 and abs(mean_bias) < 1 and drift_pct < 25:
        verdict = (
            f"✓ J2000-OFF-EQUILIBRIUM HYPOTHESIS SUPPORTED. "
            f"{libration_pct:.0f}% of L1 integers librate around the predicted "
            f"period (no monotonic trend); only {drift_pct:.0f}% show real "
            f"drift. Aggregate bias is {mean_bias:+.2f}% — statistically "
            f"indistinguishable from 0 — meaning the framework's 8H/n IS "
            f"the equilibrium and Laskar's 'drift' is libration around it. "
            f"J2000 is just a random phase of the swing."
        )
    elif drift_pct > 50:
        verdict = (
            f"✗ HYPOTHESIS REFUTED. {drift_pct:.0f}% of L1 integers show real "
            f"monotonic drift > residual noise. Lattice is not a libration "
            f"equilibrium for most integers."
        )
    else:
        verdict = (
            f"? MIXED. {libration_pct:.0f}% libration, {drift_pct:.0f}% drift, "
            f"{counts['equilibrium_shifted']/total*100:.0f}% equilibrium-"
            f"shifted. The 8H lattice is partially the equilibrium but not "
            f"universally. Some integers behave as libration centers; others "
            f"show systematic shift."
        )
    print(f"  {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            f"For each of 32 L1 integers, tracked spectral peak position "
            f"across {len(centers_ecc)} sliding {WINDOW_MYR}-Myr windows "
            f"(step {STEP_MYR} Myr) of LA2004 eccentricity and obliquity. "
            f"Classified each integer's time-series of observed periods as "
            f"libration (mean = predicted, no trend), equilibrium-shifted "
            f"(mean ≠ predicted, no trend), real drift (trend >> noise), or "
            f"mixed."
        ),
        "window_myr": WINDOW_MYR,
        "step_myr": STEP_MYR,
        "n_windows_ecc": len(centers_ecc),
        "n_windows_obl": len(centers_obl),
        "per_integer_results": rows,
        "classification_counts": counts,
        "aggregate_bias": {
            "mean_pct": float(np.mean(biases)),
            "median_pct": float(np.median(biases)),
            "std_pct": float(np.std(biases)),
            "t_statistic_vs_zero": float(t_stat),
            "t_pvalue": float(t_p),
        },
        "verdict": verdict,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

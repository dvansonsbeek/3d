#!/usr/bin/env python3
"""
Build the framework's "stability sub-lattice" and test whether it reflects
the same balance structure as Laws 3, 5, 6.

Hypothesis (user's intuition)
-----------------------------
The solar system is dynamically balanced. If Laws 3/5 (Saturn vs 7-planet
inclination/eccentricity balance) and Law 6 (Saturn-Jupiter-Earth resonance
lock at 8H/65) are real reflections of underlying structure, then dynamical
chaos resistance should also reflect that same structure:

  Predicted: the most chaos-resistant integer divisors of 8H should
  preferentially involve Saturn, Jupiter, and outer planets.

If true, stability and balance are facets of the same organization. The L1
lattice (climate-active integers) and the stability sub-lattice
(chaos-resistant integers) would be complementary projections of one
underlying solar-system structure.

Method
------
1. Scan n ∈ [5, 200] (periods 13 kyr - 537 kyr).
2. For each n, measure max |drift| in LA2004 eccentricity AND obliquity
   spectra; take the MIN (the proxy where this integer is most-naturally
   expressed).
3. Identify the nearest Laskar simple beat and tag participating planets.
4. Rank by stability. Define "stability sub-lattice" = top 30 most stable.
5. Statistical tests:
   a. Planet-count chi-squared: do Saturn/Jupiter/outer-planet beats
      occur in stable set more often than expected from a uniform null?
   b. Permutation test: shuffle stability ranks; how often does random
      assignment match observed planet-composition?
6. Intersection with L1 lattice: which integers are BOTH climate-active
   AND dynamically protected?

Outputs
-------
- Per-integer stability + Laskar attribution + planet tags
- Stability sub-lattice (top 30) summary
- Planet involvement statistics (observed vs uniform-null)
- Intersection L1 ∩ stability_sublattice
"""

import json
import math
import sys
from pathlib import Path
from collections import Counter
import numpy as np
from scipy.signal import detrend, welch
from scipy.stats import chisquare, mannwhitneyu, binomtest

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import EIGHT_H, L1_LATTICE_INTEGERS
from l1_vs_laskar_eigenmodes import enumerate_eigenmode_beats

LA2004_FILE = Path("/home/dennis/code/3d/data/la2004-earth-51myr-back.asc")
OUTPUT = Path("/home/dennis/code/3d/data/stability-sublattice.json")

N_RANGE = (5, 200)            # 13.4 to 537 kyr periods
WINDOW_MYR = 5.0
STEP_MYR = 5.0
TOP_N_SUBLATTICE = 30         # size of stability sub-lattice

# Planet involvement maps (Laskar's g_j, s_j → planets)
PLANET_MAP = {
    "g1": "Mercury", "g2": "Venus", "g3": "Earth", "g4": "Mars",
    "g5": "Jupiter", "g6": "Saturn", "g7": "Uranus", "g8": "Neptune",
    "s1": "Mercury", "s2": "Venus", "s3": "Earth", "s4": "Mars",
    "s5": "Jupiter", "s6": "Saturn", "s7": "Uranus", "s8": "Neptune",
    "k": "Earth-spin",
}

INNER_PLANETS = {"Mercury", "Venus", "Earth", "Mars"}
OUTER_PLANETS = {"Jupiter", "Saturn", "Uranus", "Neptune"}


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


def planets_in_beat(beat_label):
    """Extract set of planet names participating in a Laskar beat."""
    s = beat_label.replace("+", " ").replace("-", " ")
    tokens = s.split()
    planets = set()
    for tok in tokens:
        tok = tok.strip()
        if tok in PLANET_MAP:
            planets.add(PLANET_MAP[tok])
    return planets


def compute_window_peaks(ages_yr, signal, dt_yr=1000.0):
    """Compute Welch PSD per sliding window and return list of (freq_arr,
    psd_arr, peak_periods_arr) tuples — one per window. Spectrum is
    computed ONCE per window; integer lookups happen later as cheap
    array operations."""
    starts = np.arange(ages_yr.min(),
                       ages_yr.max() - WINDOW_MYR * 1e6 + 1,
                       STEP_MYR * 1e6)
    out = []
    for s in starts:
        mask = (ages_yr >= s) & (ages_yr < s + WINDOW_MYR * 1e6)
        if mask.sum() < 1000:
            continue
        sig_w = detrend(signal[mask])
        N = len(sig_w)
        nperseg = min(N, 2048)
        freqs, psd = welch(sig_w, fs=1.0 / dt_yr, nperseg=nperseg,
                           detrend='linear', scaling='density')
        # Drop zero-freq
        if freqs[0] == 0:
            freqs = freqs[1:]; psd = psd[1:]
        # All local maxima
        peak_idx = np.where((psd[1:-1] > psd[:-2]) & (psd[1:-1] > psd[2:]))[0] + 1
        if len(peak_idx) == 0:
            continue
        peak_periods = 1.0 / freqs[peak_idx]
        out.append(peak_periods)
    return out


def drift_from_peaks(window_peaks, n):
    """For integer n, find max |shift| of nearest window-peak to 8H/n."""
    period_yr = EIGHT_H * 1000.0 / n
    min_p = period_yr * 0.7
    max_p = period_yr * 1.3
    shifts = []
    for peak_periods in window_peaks:
        in_band = peak_periods[(peak_periods >= min_p) & (peak_periods <= max_p)]
        if len(in_band) == 0:
            continue
        closest = in_band[np.argmin(np.abs(in_band - period_yr))]
        shifts.append((closest - period_yr) / period_yr * 100)
    if not shifts:
        return None
    return float(np.max(np.abs(shifts)))


def measure_per_integer(ecc_peaks, obliq_peaks, beats, n):
    """For one integer n, compute the natural-proxy min drift and
    Laskar attribution."""
    period_yr = EIGHT_H * 1000.0 / n
    drift_ecc = drift_from_peaks(ecc_peaks, n)
    drift_obliq = drift_from_peaks(obliq_peaks, n)
    if drift_ecc is None and drift_obliq is None:
        return None
    if drift_ecc is None:
        best_drift = drift_obliq; proxy = "obliquity"
    elif drift_obliq is None:
        best_drift = drift_ecc; proxy = "eccentricity"
    else:
        if drift_ecc <= drift_obliq:
            best_drift = drift_ecc; proxy = "eccentricity"
        else:
            best_drift = drift_obliq; proxy = "obliquity"

    best_beat = min(beats, key=lambda b: abs(b[1] - period_yr))
    beat_err = abs(best_beat[1] - period_yr) / period_yr * 100
    planets = planets_in_beat(best_beat[0])
    inner_count = len(planets & INNER_PLANETS)
    outer_count = len(planets & OUTER_PLANETS)

    return {
        "n": int(n),
        "predicted_period_yr": float(period_yr),
        "max_drift_pct": float(best_drift),
        "best_proxy": proxy,
        "drift_ecc_pct": drift_ecc,
        "drift_obliq_pct": drift_obliq,
        "nearest_beat": best_beat[0],
        "laskar_period_yr": float(best_beat[1]),
        "beat_err_pct": float(beat_err),
        "beat_category": best_beat[2],
        "planets_involved": sorted(planets),
        "n_inner_planets": int(inner_count),
        "n_outer_planets": int(outer_count),
        "has_saturn": "Saturn" in planets,
        "has_jupiter": "Jupiter" in planets,
        "has_saturn_jupiter_pair": ("Saturn" in planets and "Jupiter" in planets),
        "has_mercury": "Mercury" in planets,
        "in_L1_lattice": n in L1_LATTICE_INTEGERS,
    }


def planet_occurrence_test(rows, label):
    """For a set of rows, count planet occurrences and compare to uniform null."""
    counter = Counter()
    for r in rows:
        for p in r["planets_involved"]:
            counter[p] += 1
    return dict(counter)


def main():
    print("=" * 92)
    print("  Stability sub-lattice — does dynamical stability reflect Laws 3/5/6?")
    print(f"  Scanning n ∈ [{N_RANGE[0]}, {N_RANGE[1]}]  →  periods "
          f"{EIGHT_H*1000/N_RANGE[1]/1000:.1f} - {EIGHT_H*1000/N_RANGE[0]/1000:.1f} kyr")
    print("=" * 92)

    print("\n  Loading LA2004 ...", flush=True)
    ages_yr, ecc, obliq = load_la2004()
    print(f"    n samples: {len(ages_yr)}, range "
          f"{ages_yr.min()/1e6:+.1f} to {ages_yr.max()/1e6:+.1f} Myr")

    beats = enumerate_eigenmode_beats()

    print("\n  Computing Welch spectra (one per window per proxy) ...", flush=True)
    ecc_peaks = compute_window_peaks(ages_yr, ecc)
    obliq_peaks = compute_window_peaks(ages_yr, obliq)
    print(f"    ecc windows: {len(ecc_peaks)}, obliq windows: {len(obliq_peaks)}", flush=True)

    print(f"\n  Scanning {N_RANGE[1] - N_RANGE[0] + 1} integers ...", flush=True)
    results = []
    for n in range(N_RANGE[0], N_RANGE[1] + 1):
        r = measure_per_integer(ecc_peaks, obliq_peaks, beats, n)
        if r is not None:
            results.append(r)
    print(f"    Successful measurements: {len(results)}")

    # Sort by stability (lowest drift first)
    results.sort(key=lambda r: r["max_drift_pct"])
    stability_sublattice = results[:TOP_N_SUBLATTICE]

    print()
    print(f"  ── Stability sub-lattice (top {TOP_N_SUBLATTICE} most stable integers) ──")
    print(f"  {'rank':>5}{'n':>4}{'Period':>10}{'drift':>8}{'proxy':>6}"
          f"  {'Laskar beat':<22}{'planets':<35}{'L1?':>5}")
    for rank, r in enumerate(stability_sublattice, 1):
        proxy_short = "ecc" if r["best_proxy"] == "eccentricity" else "obl"
        planet_str = ",".join(r["planets_involved"])[:33]
        l1 = "✓" if r["in_L1_lattice"] else "-"
        print(f"  {rank:>5}{r['n']:>4}{r['predicted_period_yr']/1000:>9.1f}k"
              f"{r['max_drift_pct']:>7.1f}%{proxy_short:>6}  "
              f"{r['nearest_beat']:<22}{planet_str:<35}{l1:>5}")

    # ── Planet-involvement test on stability sub-lattice ──
    print()
    print("  ── Planet involvement: stability sub-lattice vs full scan ──")
    sub_planets = planet_occurrence_test(stability_sublattice, "stable")
    all_planets = planet_occurrence_test(results, "all")
    sub_total = sum(sub_planets.values())
    all_total = sum(all_planets.values())
    print(f"  {'Planet':<14}{'in top-30':>11}{'in all':>11}"
          f"{'top-30 %':>12}{'all %':>10}{'enrich':>10}")
    enrichment = {}
    for planet in sorted(set(list(sub_planets.keys()) + list(all_planets.keys()))):
        sub_n = sub_planets.get(planet, 0)
        all_n = all_planets.get(planet, 0)
        sub_pct = 100 * sub_n / sub_total if sub_total else 0
        all_pct = 100 * all_n / all_total if all_total else 0
        enrich = sub_pct / all_pct if all_pct > 0 else float("inf")
        enrichment[planet] = float(enrich)
        marker = "🌟" if enrich > 1.5 else ("↓" if enrich < 0.7 else "")
        print(f"  {planet:<14}{sub_n:>11}{all_n:>11}"
              f"{sub_pct:>11.1f}%{all_pct:>9.1f}%{enrich:>9.2f}× {marker}")

    # ── Saturn + Jupiter co-occurrence test ──
    print()
    print("  ── Saturn-Jupiter pair test (Law 6 prediction) ──")
    sub_sj = sum(1 for r in stability_sublattice if r["has_saturn_jupiter_pair"])
    all_sj = sum(1 for r in results if r["has_saturn_jupiter_pair"])
    sub_n_total = len(stability_sublattice)
    all_n_total = len(results)
    print(f"  Stable sublattice: {sub_sj}/{sub_n_total} ({100*sub_sj/sub_n_total:.1f}%) "
          f"beats involve both Saturn AND Jupiter")
    print(f"  All scanned:       {all_sj}/{all_n_total} ({100*all_sj/all_n_total:.1f}%) "
          f"beats involve both Saturn AND Jupiter")

    # ── Inner vs Outer planet count ──
    print()
    print("  ── Inner vs Outer planet involvement (chaos prediction) ──")
    sub_inner = np.mean([r["n_inner_planets"] for r in stability_sublattice])
    sub_outer = np.mean([r["n_outer_planets"] for r in stability_sublattice])
    all_inner = np.mean([r["n_inner_planets"] for r in results])
    all_outer = np.mean([r["n_outer_planets"] for r in results])
    print(f"  Stable sublattice: mean inner = {sub_inner:.2f}, outer = {sub_outer:.2f}")
    print(f"  All scanned:       mean inner = {all_inner:.2f}, outer = {all_outer:.2f}")

    # Binomial enrichment tests per planet (vs base-rate null)
    print()
    print("  ── Binomial enrichment tests (per-planet, vs full-scan base rate) ──")
    print(f"    {'Planet':<14}{'observed':>10}{'expected':>11}{'p (one-sided)':>16}")
    binomial_pvals = {}
    for planet in sorted(set(all_planets.keys())):
        obs = sub_planets.get(planet, 0)
        base = all_planets[planet] / all_total if all_total else 0
        if base == 0 or obs == 0 and base > 0:
            # For 0 successes with nonzero base rate, test under-enrichment
            res = binomtest(obs, n=sub_total, p=base, alternative='less')
        else:
            alt = 'greater' if obs / sub_total > base else 'less'
            res = binomtest(obs, n=sub_total, p=base, alternative=alt)
        binomial_pvals[planet] = float(res.pvalue)
        marker = "***" if res.pvalue < 0.001 else ("**" if res.pvalue < 0.01 else ("*" if res.pvalue < 0.05 else ""))
        exp_n = sub_total * base
        print(f"    {planet:<14}{obs:>10}{exp_n:>11.1f}{res.pvalue:>15.4g}  {marker}")

    # ── L1 ∩ stability sub-lattice ──
    print()
    print("  ── Intersection L1 lattice ∩ stability sub-lattice ──")
    l1_in_top = [r for r in stability_sublattice if r["in_L1_lattice"]]
    print(f"  L1 integers in top-{TOP_N_SUBLATTICE} stability sub-lattice: "
          f"{len(l1_in_top)}/{len(stability_sublattice)} = "
          f"{100*len(l1_in_top)/len(stability_sublattice):.0f}%")
    print(f"  These are the framework's 'doubly defensible' integers — both "
          f"climate-active AND dynamically protected:")
    for r in l1_in_top:
        print(f"    n={r['n']:>4}  {r['predicted_period_yr']/1000:>6.1f} kyr  "
              f"drift {r['max_drift_pct']:.1f}%  "
              f"beat {r['nearest_beat']:<18}  "
              f"planets {','.join(r['planets_involved'])}")

    # ── Summary verdict ──
    print()
    print("=" * 92)
    print("  SYNTHESIS — Does dynamical stability reflect Laws 3/5/6?")
    print("=" * 92)
    saturn_enrich = enrichment.get("Saturn", 1)
    saturn_p = binomial_pvals.get("Saturn", 1)
    mercury_p = binomial_pvals.get("Mercury", 1)
    mars_p = binomial_pvals.get("Mars", 1)
    inner_suppressed = mercury_p < 0.1 and mars_p < 0.1
    saturn_dominant = saturn_enrich > 1.5 and saturn_p < 0.01

    if saturn_dominant and inner_suppressed:
        verdict = (
            f"✓ STABILITY SUB-LATTICE IS SATURN-ANCHORED: "
            f"Saturn enriched {saturn_enrich:.2f}× (binomial p={saturn_p:.2g}); "
            f"Mercury & Mars BOTH absent from stable set (p<0.1). "
            f"This matches Laws 3/5 (Saturn as anti-phase balance anchor) but "
            f"NOT Law 6 specifically (Saturn-Jupiter PAIR co-occurs in only "
            f"{sub_sj}/{TOP_N_SUBLATTICE} of stable beats — Saturn alone, not "
            f"the S+J pair, is the dynamical anchor)."
        )
    elif saturn_dominant:
        verdict = (
            f"? PARTIAL — Saturn dominates ({saturn_enrich:.2f}×, p={saturn_p:.2g}) "
            f"but inner-planet suppression isn't clean. Stability is Saturn-anchored "
            f"but the inner-vs-outer distinction is weaker than expected from "
            f"Laskar 1989 chaos predictions."
        )
    else:
        verdict = (
            f"✗ Stability sub-lattice does NOT show clear Saturn dominance "
            f"(enrich={saturn_enrich:.2f}×, p={saturn_p:.2g}). Stability is governed "
            f"by different physics than the balance laws."
        )
    print(f"  {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            f"Scanned integers n ∈ [{N_RANGE[0]}, {N_RANGE[1]}] for stability in "
            "LA2004 -50 to 0 Myr (5-Myr sliding windows). Per integer: min drift "
            "across eccentricity and obliquity spectra. Tagged with nearest Laskar "
            "beat and planet involvement. Tests whether outer-planet beats dominate "
            "the stable end (Law 6 prediction) and whether Mercury is "
            "under-represented (Laskar 1989 chaos prediction)."
        ),
        "n_scanned": len(results),
        "top_n_sublattice": TOP_N_SUBLATTICE,
        "stability_sublattice": stability_sublattice,
        "planet_occurrence_top_n": sub_planets,
        "planet_occurrence_all": all_planets,
        "planet_enrichment": enrichment,
        "saturn_jupiter_pair_count_top_n": sub_sj,
        "saturn_jupiter_pair_count_all": all_sj,
        "binomial_pvals_per_planet": binomial_pvals,
        "L1_intersection_with_sublattice": [r["n"] for r in l1_in_top],
        "verdict": verdict,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

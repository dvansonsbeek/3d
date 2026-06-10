#!/usr/bin/env python3
"""
Follow-up: scan integer and rational multiples of H = 335,317 yr to find
which gives the strongest commensurability. The user noticed that the
empirical commensurability optimum at 7.51 Myr is ≈ 22.4 × H. Is there
a clean integer or simple rational multiple of H that's stronger than 8H?

Specifically test:
  - Integer multiples T = nH for n = 1..50
  - Half-integer multiples T = (n + 0.5)H
  - Small rational multiples T = (m/n)H for small m, n
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
OUTPUT = Path("/home/dennis/code/3d/data/h-multiple-scan.json")


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
    products = np.asarray(freqs) * T
    nearest_int = np.round(products)
    diffs = products - nearest_int
    if weights is None:
        return float(np.mean(diffs ** 2))
    w = np.asarray(weights) / np.sum(weights)
    return float(np.sum(w * diffs ** 2))


def diophantine_J(T, freqs, weights=None):
    """Diophantine-like measure: error normalized by integer size.
    Smaller integers naturally penalized less; larger integers must
    achieve very small absolute errors to be 'natural'."""
    products = np.asarray(freqs) * T
    nearest_int = np.maximum(1, np.round(products))
    diffs = (products - nearest_int) / nearest_int
    if weights is None:
        return float(np.mean(diffs ** 2))
    w = np.asarray(weights) / np.sum(weights)
    return float(np.sum(w * diffs ** 2))


def main():
    print("=" * 92)
    print("  H-multiple scan — is there a cleaner closure period than 8H?")
    print("=" * 92)
    print(f"\n  H = {H:,} yr (Earth Fundamental Cycle)")
    print(f"  8H = {EIGHT_H_YR:,} yr (Solar System Resonance Cycle)")

    ages_yr, ecc, obliq = load_la2004()
    obl_peaks = extract_top_peaks(obliq, n_top=20)
    obl_freqs = [p[0] for p in obl_peaks]
    obl_weights = [p[1] for p in obl_peaks]

    print(f"\n  Using top-20 LA2004 obliquity peaks (amplitude-weighted)")

    # ── Integer multiples of H ──
    print(f"\n  ── Integer multiples T = n × H ──")
    print(f"  {'n':>5}{'T (Myr)':>12}{'J (unwgt)':>14}{'J (Dioph)':>14}{'note':>15}")
    int_results = []
    for n in range(1, 51):
        T = n * H
        J = commensurability_J(T, obl_freqs, obl_weights)
        J_d = diophantine_J(T, obl_freqs, obl_weights)
        note = ""
        if n == 8: note = "←framework"
        int_results.append({"n": n, "T_yr": T, "J": J, "J_d": J_d})
    # Sort by J for printing
    sorted_J = sorted(int_results, key=lambda r: r["J"])
    print(f"  Top 10 integer multiples by J (unweighted):")
    for r in sorted_J[:10]:
        note = "←framework" if r["n"] == 8 else ""
        print(f"  {r['n']:>5}{r['T_yr']/1e6:>11.4f}M{r['J']:>13.4f}"
              f"{r['J_d']:>13.6f}{note:>15}")

    sorted_d = sorted(int_results, key=lambda r: r["J_d"])
    print(f"\n  Top 10 integer multiples by Diophantine J (low-integer-friendly):")
    for r in sorted_d[:10]:
        note = "←framework" if r["n"] == 8 else ""
        print(f"  {r['n']:>5}{r['T_yr']/1e6:>11.4f}M{r['J']:>13.4f}"
              f"{r['J_d']:>13.6f}{note:>15}")

    # Find 8H's rank in each metric
    rank_8H_J = next(i+1 for i, r in enumerate(sorted_J) if r["n"] == 8)
    rank_8H_d = next(i+1 for i, r in enumerate(sorted_d) if r["n"] == 8)
    print(f"\n  Rank of 8H: {rank_8H_J}/50 by J,  {rank_8H_d}/50 by Diophantine J")

    # ── Half-integer multiples ──
    print(f"\n  ── Half-integer multiples T = (n + 0.5) × H ──")
    print(f"  Top 10 half-integer multiples by J:")
    half_results = []
    for n in range(0, 50):
        T = (n + 0.5) * H
        J = commensurability_J(T, obl_freqs, obl_weights)
        J_d = diophantine_J(T, obl_freqs, obl_weights)
        half_results.append({"n": n + 0.5, "T_yr": T, "J": J, "J_d": J_d})
    sorted_half = sorted(half_results, key=lambda r: r["J"])
    print(f"  {'n':>5}{'T (Myr)':>12}{'J (unwgt)':>14}{'J (Dioph)':>14}")
    for r in sorted_half[:10]:
        print(f"  {r['n']:>5}{r['T_yr']/1e6:>11.4f}M{r['J']:>13.4f}"
              f"{r['J_d']:>13.6f}")

    # ── Small rational multiples T = (m/n) × H ──
    print(f"\n  ── Small rational multiples T = (m/n) × H, restricted to "
          f"[2, 12] Myr ──")
    rat_results = []
    for m in range(1, 60):
        for n in range(1, 12):
            if m / n < 6 or m / n > 36:
                continue
            T = (m / n) * H
            if T < 2e6 or T > 12e6:
                continue
            J = commensurability_J(T, obl_freqs, obl_weights)
            J_d = diophantine_J(T, obl_freqs, obl_weights)
            rat_results.append({"m": m, "n": n, "ratio": m/n,
                                "T_yr": T, "J": J, "J_d": J_d})
    sorted_rat = sorted(rat_results, key=lambda r: r["J"])
    print(f"  Top 15 by J:")
    print(f"  {'m/n':>8}{'value':>9}{'T (Myr)':>12}{'J (unwgt)':>14}{'J (Dioph)':>14}")
    seen_T = set()
    shown = 0
    for r in sorted_rat:
        # Avoid duplicates (e.g., 16/2 = 8, 24/3 = 8)
        T_round = round(r["T_yr"])
        if T_round in seen_T:
            continue
        seen_T.add(T_round)
        print(f"  {r['m']:>3}/{r['n']:<3}{r['ratio']:>9.4f}"
              f"{r['T_yr']/1e6:>11.4f}M{r['J']:>13.4f}"
              f"{r['J_d']:>13.6f}")
        shown += 1
        if shown >= 15: break

    # ── Direct test of user's hypothesis: 22.5 H vs neighbors ──
    print(f"\n  ── User's specific hypothesis: 22.5 × H ──")
    print(f"  {'T':<22}{'value':>16}{'J':>10}{'J_d':>12}")
    for label, T in [
        ("22 × H", 22 * H),
        ("22.4 × H", 22.4 * H),
        ("22.5 × H", 22.5 * H),
        ("23 × H", 23 * H),
        ("7.511 Myr (empirical opt)", 7511826),
        ("8 × H (framework)", 8 * H),
    ]:
        J = commensurability_J(T, obl_freqs, obl_weights)
        J_d = diophantine_J(T, obl_freqs, obl_weights)
        print(f"  {label:<22}{T/1e6:>15.4f}M{J:>10.4f}{J_d:>11.6f}")

    # ── Synthesis ──
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)

    best_int = sorted_J[0]
    best_d = sorted_d[0]
    if best_int["n"] == 8:
        print(f"\n  ✓ 8H is the BEST integer multiple of H by both metrics.")
    else:
        print(f"\n  Best integer multiple by J (unweighted): {best_int['n']}H "
              f"= {best_int['T_yr']/1e6:.4f} Myr")
        print(f"  Best integer multiple by Diophantine J: {best_d['n']}H "
              f"= {best_d['T_yr']/1e6:.4f} Myr")
        # Is 8H competitive at all?
        if best_int["J"] / next(r["J"] for r in int_results if r["n"] == 8) < 0.5:
            print(f"\n  ⚠ {best_int['n']}H wins by 2× margin over 8H — significantly stronger.")
        else:
            print(f"\n  8H and {best_int['n']}H are comparable; both are local minima.")

    OUTPUT.write_text(json.dumps({
        "method": (
            "Scanned integer multiples T = n × H (n=1..50), half-integer "
            "multiples T = (n+0.5) × H, and small rational multiples T = "
            "(m/n) × H. Computed commensurability metrics J (unweighted "
            "sum of squared distance from integer) and J_d (Diophantine, "
            "error normalized by integer size) against top-20 LA2004 "
            "obliquity peaks weighted by amplitude."
        ),
        "best_integer_multiple_J": best_int,
        "best_integer_multiple_Diophantine": best_d,
        "rank_of_8H": {"J": rank_8H_J, "Diophantine": rank_8H_d},
        "top_10_integer_multiples_by_J": sorted_J[:10],
        "top_10_integer_multiples_by_Diophantine": sorted_d[:10],
        "top_10_half_integer_multiples": sorted_half[:10],
        "user_hypothesis_22_5H": {
            "T_yr": 22.5 * H,
            "J": commensurability_J(22.5 * H, obl_freqs, obl_weights),
            "J_d": diophantine_J(22.5 * H, obl_freqs, obl_weights),
        },
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

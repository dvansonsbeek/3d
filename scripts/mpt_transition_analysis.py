#!/usr/bin/env python3
"""
MPT TRANSITION ANALYSIS — comparative amplitude fit pre-MPT vs post-MPT
=========================================================================

EXPLORATORY analysis — NOT YET documented in doc 17.

Tests the visibility-mechanism hypothesis: did each spectral component's
amplitude actually change at the Mid-Pleistocene Transition, and if so, how?

For each of the 8 fixed candidate periods (same as main amplitude fit),
run the multi-component OLS fit on:
  - Pre-MPT window:  1,500 - 2,500 kyr BP (1,000 kyr, deep pre-MPT)
  - Post-MPT window: 0 - 1,000 kyr BP   (same as main fit)

Both windows have T = 1,000 kyr → same Rayleigh limit → fair comparison.

Key questions:
  Q1: Did 41-kyr amplitude DECREASE at MPT?
      → Predicted by Willeit ice-sheet saturation hypothesis
  Q2: Did the H/3 region (110 + 111.77 kyr) GROW at MPT?
      → Predicted by visibility-mechanism story (signal always present orbitally,
        emerges climatically when 41-kyr saturates)
  Q3: Did eccentricity beats (95, 99, 124) also change?
      → Discriminates inclination-specific change vs general amplification

Run:  python3 scripts/mpt_transition_analysis.py
"""

import json
import sys
import time
from pathlib import Path

import numpy as np

# Re-use helpers from the consolidated amplitude fit script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from milankovitch_amplitude_fit import (
    parse_lr04, preprocess, build_X, fit_amplitudes, bootstrap_amps,
    CANDIDATE_PERIODS, LR04_CACHE, RNG_SEED, DATA_DIR,
)

WIN_PRE_MPT = (1500, 2500)
WIN_POST_MPT = (0, 1000)
BOOTSTRAP_ITERATIONS = 1000


def fit_window(ages, d18o, win, label, rng, candidates=None):
    """Multi-component OLS fit on a window. Defaults to CANDIDATE_PERIODS."""
    if candidates is None:
        candidates = CANDIDATE_PERIODS
    T = win[1] - win[0]
    rayleigh = 100.0 ** 2 / T
    print(f"\n--- {label} window {win} (T={T} kyr, Rayleigh at 100={rayleigh:.2f}) ---")
    t, y = preprocess(ages, d18o, win)
    periods = [p for _, p in candidates]
    X = build_X(t, periods)
    amps, r2, cond = fit_amplitudes(X, y)
    boot = bootstrap_amps(t, y, periods, BOOTSTRAP_ITERATIONS, rng)
    print(f"  R² = {r2:.4f}, condition number = {cond:.1f}")
    print(f"  {'Candidate':<36}  {'amp':>9}  {'95% CI':>20}")
    out = {}
    for i, (lbl, P) in enumerate(candidates):
        col = boot[:, i]
        col_clean = col[~np.isnan(col)]
        ci_lo = float(np.percentile(col_clean, 2.5))
        ci_hi = float(np.percentile(col_clean, 97.5))
        out[lbl] = {
            "period_kyr": P,
            "amp": float(amps[i]),
            "ci_lo": ci_lo, "ci_hi": ci_hi,
        }
        print(f"  {lbl:<36}  {amps[i]:>9.4f}  [{ci_lo:>6.4f}, {ci_hi:>6.4f}]")
    return {"r2": float(r2), "condition": float(cond),
            "window_kyr": list(win), "T_kyr": T, "amps": out}


# ═══════════════════════════════════════════════════════════════════════════
# Berger climatic-precession triplet — Jupiter-specific test
# ═══════════════════════════════════════════════════════════════════════════

# Berger 1978 climatic-precession sub-peaks (g_j + k beats). All three
# Rayleigh-separable at T=1000 (pairwise Δf > 1/T = 0.001 cy/kyr).
BERGER_TRIPLET = [
    ("19.2 kyr (g3+k Earth, Berger)",  19.2),
    ("22.4 kyr (g2+k Venus, Berger)",  22.4),
    ("23.7 kyr (g5+k Jupiter, Berger)", 23.7),
    ("41.0 kyr (obliquity, anchor)",   41.0),     # for context
    ("110.0 kyr (100-kyr-band anchor)", 110.0),  # for context
]


def analyze_berger_triplet(ages, d18o, rng):
    """
    Did all three Berger climatic-precession sub-peaks grow at MPT, or only
    the Jupiter g5+k peak (23.7 kyr)?
    """
    print("\n" + "═" * 72)
    print("BERGER PRECESSION TRIPLET TEST")
    print("═" * 72)
    print("  Tests whether the 23.7-kyr growth in the main 8-period fit is one")
    print("  specific Berger sub-peak (Jupiter g5+k) or a general precession-band")
    print("  amplification. All three sub-peaks are Rayleigh-resolvable at T=1000.")

    r_pre = fit_window(ages, d18o, WIN_PRE_MPT, "PRE-MPT (Berger triplet)",
                       rng, BERGER_TRIPLET)
    r_post = fit_window(ages, d18o, WIN_POST_MPT, "POST-MPT (Berger triplet)",
                        rng, BERGER_TRIPLET)

    print("\n  Growth ratios (post/pre):")
    print(f"  {'Sub-peak':<36}  {'pre':>8}  {'post':>8}  {'ratio':>7}")
    print("  " + "-" * 70)
    comparison = {}
    for lbl, P in BERGER_TRIPLET:
        a_pre = r_pre["amps"][lbl]["amp"]
        a_post = r_post["amps"][lbl]["amp"]
        ratio = a_post / a_pre if a_pre > 1e-10 else float("inf")
        comparison[lbl] = {"period_kyr": P, "pre": a_pre, "post": a_post,
                           "ratio": float(ratio)}
        arrow = "↑" if ratio > 1.2 else ("↓" if ratio < 0.83 else "≈")
        print(f"  {lbl:<36}  {a_pre:>8.3f}  {a_post:>8.3f}  {ratio:>6.2f} {arrow}")

    # Specifically compare the three precession sub-peaks
    r_earth = comparison["19.2 kyr (g3+k Earth, Berger)"]["ratio"]
    r_venus = comparison["22.4 kyr (g2+k Venus, Berger)"]["ratio"]
    r_jup = comparison["23.7 kyr (g5+k Jupiter, Berger)"]["ratio"]

    print("\n  Pattern within the climatic-precession triplet:")
    print(f"    Earth  (g3+k, 19.2 kyr): {r_earth:.2f}×")
    print(f"    Venus  (g2+k, 22.4 kyr): {r_venus:.2f}×")
    print(f"    Jupiter (g5+k, 23.7 kyr): {r_jup:.2f}×")

    # Diagnostic interpretation
    if r_jup > 1.5 and r_earth < 1.2 and r_venus < 1.2:
        verdict = ("Jupiter-SPECIFIC growth — only g5+k (23.7 kyr) grew. "
                   "The 23.7-kyr growth in the main fit is NOT general "
                   "precession-band amplification.")
    elif r_jup > 1.5 and r_earth > 1.5 and r_venus > 1.5:
        verdict = ("ALL THREE Berger sub-peaks grew — general precession-band "
                   "amplification at MPT.")
    elif r_jup < 1.2 and r_earth < 1.2 and r_venus < 1.2:
        verdict = "NONE of the Berger sub-peaks grew."
    else:
        verdict = f"MIXED — see individual ratios"
    print(f"\n  VERDICT: {verdict}")

    return {
        "candidates": [lbl for lbl, _ in BERGER_TRIPLET],
        "pre_mpt": r_pre,
        "post_mpt": r_post,
        "growth_ratios": comparison,
        "verdict": verdict,
        "sub_peak_ratios": {
            "Earth_g3_k_19.2": r_earth,
            "Venus_g2_k_22.4": r_venus,
            "Jupiter_g5_k_23.7": r_jup,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# δ-ordering test — does growth ratio decline monotonically with δ?
# ═══════════════════════════════════════════════════════════════════════════

# Extended set: 6 climatic-precession sub-peaks (Mars skipped — collinear with
# Earth at 140-141 integer adjacency) + pure axial precession k as δ=0 anchor.
#
# Hypothesis: growth_ratio(post/pre) declines monotonically with δ. The
# smallest-δ sub-peak (Jupiter, closest to pure axial precession on the
# H-divisor lattice) is most amplified at MPT; larger-δ sub-peaks less so.
BERGER_DELTA_SET = [
    ("25.794 kyr (k pure axial, delta=0)",      25.794),  # 8H/104, reference
    ("23.739 kyr (g5+k Jupiter, delta=9)",      23.739),  # 8H/113
    ("23.125 kyr (g1+k Mercury, delta=12)",     23.125),  # 8H/116
    ("22.354 kyr (g2+k Venus, delta=16)",       22.354),  # 8H/120
    ("19.161 kyr (g3+k Earth, delta=36)",       19.161),  # 8H/140
    ("16.457 kyr (g6+k Saturn, delta=59)",      16.457),  # 8H/163
    ("41.0 kyr (obliquity anchor)",             41.0),
    ("110.0 kyr (100-kyr-band anchor)",         110.0),
]


def analyze_delta_ordering(ages, d18o, rng):
    """
    Test the H-divisor framework's δ-ordering hypothesis: among climatic-
    precession sub-peaks, the closer the integer δ is to 0 (pure axial
    precession at 8H/104), the more the sub-peak's amplitude amplified at MPT.

    Mars (g₄+k at 8H/141, δ=+37) is excluded because its frequency separation
    from Earth's g₃+k (8H/140, δ=+36) is below the Rayleigh limit at T=1000.
    """
    print("\n" + "═" * 72)
    print("δ-ORDERING TEST")
    print("═" * 72)
    print("  H-divisor framework: every Berger climatic-precession sub-peak has")
    print("  integer n = 104 + δ_j (where 104 = pure axial precession integer).")
    print("  Smaller δ → slower modulation → closer to ice-sheet response band.")
    print("  Hypothesis: post/pre growth ratio declines monotonically with δ.")
    print("  Mars (δ=37) excluded: collinear with Earth (δ=36) at T=1000.")

    r_pre = fit_window(ages, d18o, WIN_PRE_MPT, "PRE-MPT (δ-set)",
                       rng, BERGER_DELTA_SET)
    r_post = fit_window(ages, d18o, WIN_POST_MPT, "POST-MPT (δ-set)",
                        rng, BERGER_DELTA_SET)

    # δ values for ordering
    delta_map = {
        "25.794 kyr (k pure axial, delta=0)":     0,
        "23.739 kyr (g5+k Jupiter, delta=9)":     9,
        "23.125 kyr (g1+k Mercury, delta=12)":    12,
        "22.354 kyr (g2+k Venus, delta=16)":      16,
        "19.161 kyr (g3+k Earth, delta=36)":      36,
        "16.457 kyr (g6+k Saturn, delta=59)":     59,
    }

    print("\n  Growth ratios ordered by δ (the H-divisor prediction):")
    print(f"  {'δ':>4}  {'Sub-peak':<40}  {'pre':>8}  {'post':>8}  {'ratio':>7}")
    print("  " + "-" * 75)
    delta_results = []
    for lbl, _ in BERGER_DELTA_SET:
        if lbl not in delta_map:
            continue  # skip anchors
        delta = delta_map[lbl]
        a_pre = r_pre["amps"][lbl]["amp"]
        a_post = r_post["amps"][lbl]["amp"]
        ratio = a_post / a_pre if a_pre > 1e-10 else float("inf")
        delta_results.append((delta, lbl, a_pre, a_post, ratio))
        arrow = "↑" if ratio > 1.2 else ("↓" if ratio < 0.83 else "≈")
        print(f"  {delta:>4d}  {lbl:<40}  {a_pre:>8.3f}  {a_post:>8.3f}  {ratio:>6.2f} {arrow}")

    # Check monotonicity
    delta_results_sorted = sorted(delta_results, key=lambda x: x[0])
    ratios_by_delta = [(d, r) for d, _, _, _, r in delta_results_sorted]
    monotonic = all(
        ratios_by_delta[i][1] >= ratios_by_delta[i + 1][1]
        for i in range(len(ratios_by_delta) - 1)
    )
    print(f"\n  Strictly monotonic decline with δ?  "
          f"{'YES — supports H-divisor framework' if monotonic else 'NO'}")

    # Show as Spearman-ish rank
    n = len(ratios_by_delta)
    # Rank correlation: do δ-rank and ratio-rank anti-correlate?
    delta_ranks = list(range(n))  # already sorted by δ
    ratio_sorted = sorted(ratios_by_delta, key=lambda x: -x[1])
    ratio_rank = {ratios_by_delta[i][0]: i for i in range(n)}
    # Spearman rank correlation
    d_list = [d for d, _ in ratios_by_delta]
    r_list = [r for _, r in ratios_by_delta]
    rank_d = np.argsort(np.argsort(d_list))
    rank_r = np.argsort(np.argsort([-x for x in r_list]))  # rank by descending ratio
    # Spearman ρ between δ-rank and (-ratio)-rank: should be +1 if perfect monotonic decline
    cov = np.mean((rank_d - rank_d.mean()) * (rank_r - rank_r.mean()))
    var_d = np.var(rank_d)
    var_r = np.var(rank_r)
    spearman = float(cov / np.sqrt(var_d * var_r)) if var_d * var_r > 0 else float("nan")
    print(f"  Spearman rank correlation(δ, -ratio) = {spearman:+.3f}  "
          f"(+1 = perfect H-divisor prediction)")

    # Verdict
    if monotonic:
        verdict = ("δ-ordering hypothesis SUPPORTED — growth ratio declines "
                   "strictly monotonically as δ increases, consistent with the "
                   "H-divisor framework predicting that the closest-to-axial "
                   "sub-peak amplifies most at MPT.")
    elif spearman > 0.7:
        verdict = (f"δ-ordering partially supported — Spearman ρ = {spearman:.2f} "
                   f"shows strong ranked correlation, but not strictly monotonic. "
                   f"Suggests δ is a real ordering variable but other factors "
                   f"contribute (e.g., absolute amplitude).")
    else:
        verdict = (f"δ-ordering hypothesis NOT supported — Spearman ρ = {spearman:.2f}. "
                   f"The H-divisor δ does not cleanly predict growth ratio.")
    print(f"\n  VERDICT: {verdict}")

    return {
        "candidates_with_delta": [
            {"label": lbl, "period_kyr": p, "delta": delta_map.get(lbl)}
            for lbl, p in BERGER_DELTA_SET
        ],
        "pre_mpt": r_pre,
        "post_mpt": r_post,
        "delta_ordered_results": [
            {"delta": d, "label": lbl, "pre": pre, "post": post, "ratio": r}
            for d, lbl, pre, post, r in delta_results_sorted
        ],
        "monotonic_decline": bool(monotonic),
        "spearman_rho": spearman,
        "verdict": verdict,
    }


def main():
    t0 = time.time()
    rng = np.random.default_rng(RNG_SEED)
    print("=" * 72)
    print("MPT TRANSITION ANALYSIS — Pre-MPT vs Post-MPT amplitude comparison")
    print("=" * 72)
    print(f"\nExploratory analysis (not yet documented).")
    print(f"RNG seed: {RNG_SEED}")

    if not LR04_CACHE.exists():
        print(f"ERROR: {LR04_CACHE} missing")
        sys.exit(1)
    ages, d18o = parse_lr04(LR04_CACHE)
    print(f"\nLR04 loaded: {len(ages)} samples, {ages.min():.0f}-{ages.max():.0f} kyr BP")

    # Both windows fit identically with the main 8-candidate set
    r_pre = fit_window(ages, d18o, WIN_PRE_MPT, "PRE-MPT", rng)
    r_post = fit_window(ages, d18o, WIN_POST_MPT, "POST-MPT", rng)

    # Follow-up: Berger climatic-precession triplet test
    berger_result = analyze_berger_triplet(ages, d18o, rng)

    # Follow-up: δ-ordering test (extended Berger set with Mercury + Saturn)
    delta_result = analyze_delta_ordering(ages, d18o, rng)

    # Comparison
    print("\n" + "═" * 72)
    print("COMPARISON: amplitude ratio post-MPT / pre-MPT")
    print("═" * 72)
    print(f"  {'Candidate':<36}  {'pre':>8}  {'post':>8}  {'ratio':>7}")
    print("  " + "-" * 70)
    comparison = {}
    for lbl, P in CANDIDATE_PERIODS:
        a_pre = r_pre["amps"][lbl]["amp"]
        a_post = r_post["amps"][lbl]["amp"]
        ratio = a_post / a_pre if a_pre > 1e-10 else float("inf")
        comparison[lbl] = {
            "period_kyr": P,
            "pre_mpt_amp": a_pre,
            "post_mpt_amp": a_post,
            "ratio_post_over_pre": float(ratio) if np.isfinite(ratio) else None,
        }
        arrow = "↑" if ratio > 1.2 else ("↓" if ratio < 0.83 else "≈")
        print(f"  {lbl:<36}  {a_pre:>8.3f}  {a_post:>8.3f}  {ratio:>6.2f} {arrow}")

    # Diagnostic questions
    print("\n" + "═" * 72)
    print("DIAGNOSTIC QUESTIONS")
    print("═" * 72)

    r41 = comparison["41.0 kyr (obliquity)"]["ratio_post_over_pre"]
    print(f"\nQ1 — Did 41-kyr obliquity SHRINK at MPT? (Willeit saturation)")
    print(f"     amp(41-kyr) post/pre = {r41:.2f}")
    if r41 < 0.8:
        q1 = "YES — 41-kyr shrank, consistent with saturation"
    elif r41 > 1.2:
        q1 = "NO — 41-kyr grew (general amplification, not saturation)"
    else:
        q1 = "NO clear change in 41-kyr"
    print(f"     → {q1}")

    r110 = comparison["110.0 kyr (g3-g1 Earth-Mercury)"]["ratio_post_over_pre"]
    r111 = comparison["111.77 kyr (H/3 model)"]["ratio_post_over_pre"]
    print(f"\nQ2 — Did the H/3 region (110 + 111.77 kyr) GROW at MPT? (visibility)")
    print(f"     amp(110)    post/pre = {r110:.2f}")
    print(f"     amp(111.77) post/pre = {r111:.2f}")
    h3_avg = (r110 + r111) / 2
    if h3_avg > 1.5:
        q2 = (f"H/3 region grew ({h3_avg:.2f}×) — consistent with visibility-mechanism "
              f"but see Q3 for whether this is H/3-specific")
    elif h3_avg < 0.83:
        q2 = "H/3 region SHRANK (contradicts visibility-mechanism)"
    else:
        q2 = f"AMBIGUOUS — H/3 region ratio {h3_avg:.2f}"
    print(f"     → {q2}")

    r95 = comparison["95.0 kyr (g4-g5 ecc beat)"]["ratio_post_over_pre"]
    r99 = comparison["99.0 kyr (g3-g5 ecc beat)"]["ratio_post_over_pre"]
    r124 = comparison["124.0 kyr (g4-g2 ecc beat)"]["ratio_post_over_pre"]
    print(f"\nQ3 — Did eccentricity beats change? (CAVEAT: 95, 99, 110, 111.77 are")
    print(f"     pairwise within the T=1000 Rayleigh limit; individual ratios are")
    print(f"     collinearly coupled and should NOT be read as independent.)")
    print(f"     amp(95)  post/pre = {r95:.2f}")
    print(f"     amp(99)  post/pre = {r99:.2f}")
    print(f"     amp(124) post/pre = {r124:.2f}   (124 IS separable from the rest)")
    q3 = ("Individual candidates inside 80-125 kyr cannot be resolved separately at "
          "T=1000 (Rayleigh ~10 kyr at 100-kyr period); see band-aggregate below")
    print(f"     → {q3}")

    # ── Band-aggregate analysis (honest about Rayleigh-coupled candidates) ──
    print(f"\n{'─' * 72}")
    print(f"BAND-AGGREGATED ANALYSIS (the Rayleigh-honest framing)")
    print(f"{'─' * 72}")
    # 100-kyr band: all 5 candidates inside 80-125 kyr (RMS = sqrt(sum of squares))
    band_100kyr_pre = np.sqrt(
        r_pre["amps"]["95.0 kyr (g4-g5 ecc beat)"]["amp"]**2 +
        r_pre["amps"]["99.0 kyr (g3-g5 ecc beat)"]["amp"]**2 +
        r_pre["amps"]["110.0 kyr (g3-g1 Earth-Mercury)"]["amp"]**2 +
        r_pre["amps"]["111.77 kyr (H/3 model)"]["amp"]**2 +
        r_pre["amps"]["124.0 kyr (g4-g2 ecc beat)"]["amp"]**2
    )
    band_100kyr_post = np.sqrt(
        r_post["amps"]["95.0 kyr (g4-g5 ecc beat)"]["amp"]**2 +
        r_post["amps"]["99.0 kyr (g3-g5 ecc beat)"]["amp"]**2 +
        r_post["amps"]["110.0 kyr (g3-g1 Earth-Mercury)"]["amp"]**2 +
        r_post["amps"]["111.77 kyr (H/3 model)"]["amp"]**2 +
        r_post["amps"]["124.0 kyr (g4-g2 ecc beat)"]["amp"]**2
    )
    band_100kyr_ratio = float(band_100kyr_post / band_100kyr_pre)

    print(f"  100-kyr-band RMS amplitude (sqrt-sum-of-squares of 95+99+110+111.77+124):")
    print(f"    pre-MPT:  {band_100kyr_pre:.3f}")
    print(f"    post-MPT: {band_100kyr_post:.3f}")
    print(f"    ratio:    {band_100kyr_ratio:.2f}×")
    print()
    print(f"  Independent (Rayleigh-separable) measurements:")
    print(f"    41-kyr obliquity ratio:    {r41:.2f}×   (well-separated)")
    print(f"    405-kyr long-ecc ratio:   {comparison['405.0 kyr (g2-g5 ecc long)']['ratio_post_over_pre']:.2f}×   (well-separated)")
    print(f"    23.7-kyr precession ratio: {comparison['23.7 kyr (climatic precession)']['ratio_post_over_pre']:.2f}×   (well-separated)")

    # Net interpretation — band-honest
    print(f"\n{'═' * 72}")
    print(f"NET INTERPRETATION (Rayleigh-honest)")
    print(f"{'═' * 72}")
    if band_100kyr_ratio > 1.5 and r41 < 0.85:
        net = (f"100-kyr BAND AS A WHOLE grew {band_100kyr_ratio:.2f}× at MPT, while "
               f"41-kyr obliquity shrank to {r41:.2f}×. Consistent with the visibility-"
               f"mechanism story — but the data CANNOT separately attribute the band's "
               f"growth to specific sub-periods (H/3 vs eccentricity beats are "
               f"Rayleigh-coupled at T=1000).")
    elif band_100kyr_ratio < 1.2:
        net = ("100-kyr band did not grow substantially — visibility-mechanism story "
               "needs revision")
    else:
        net = f"100-kyr band ratio {band_100kyr_ratio:.2f}× — see individual numbers"
    print(f"  {net}")

    # Save
    out_path = DATA_DIR / "mpt-transition-analysis.json"
    out_path.write_text(json.dumps({
        "exploratory": True,
        "doc_reference": "(not yet documented)",
        "rng_seed": RNG_SEED,
        "pre_mpt_window_kyr": list(WIN_PRE_MPT),
        "post_mpt_window_kyr": list(WIN_POST_MPT),
        "pre_mpt_results": r_pre,
        "post_mpt_results": r_post,
        "comparison": comparison,
        "diagnostic": {
            "q1_41kyr_ratio": r41,
            "q1_interpretation": q1,
            "q2_h3_region_mean_ratio": float(h3_avg),
            "q2_interpretation": q2,
            "q3_interpretation": q3,
            "q3_individual_ratios_collinear_warning": (
                "95, 99, 110, 111.77 are pairwise within the T=1000 Rayleigh "
                "limit; the individual ratios are NOT independent measurements."
            ),
            "q3_individual_ratios": {"95": r95, "99": r99,
                                      "110": r110, "111.77": r111, "124": r124},
            "band_100kyr_rms_pre": float(band_100kyr_pre),
            "band_100kyr_rms_post": float(band_100kyr_post),
            "band_100kyr_ratio": float(band_100kyr_ratio),
            "net_interpretation": net,
        },
        "berger_triplet_test": berger_result,
        "delta_ordering_test": delta_result,
        "runtime_seconds": round(time.time() - t0, 2),
    }, indent=2))
    print(f"\nSaved → {out_path}")
    print(f"Total runtime: {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()

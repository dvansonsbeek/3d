#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — CENOGRID SUPER-CYCLE SPECTRAL TEST
================================================================

Doc 18 §4 complement.

§4 tested whether 20 discrete geological event boundaries cluster at integer
multiples of 8H = 2,682,536 years (NULL: p=0.233 for 8H, p=0.504 for H).
That test addressed event clustering. This test asks the complementary
question: does CENOGRID's continuous 67-Myr climate record show enhanced
spectral power at each of the 8 integer multiples of H from 1H (the Earth
Fundamental Cycle = 335,317 yr) to 8H (the Solar System Resonance Cycle /
orbital-forcing period = 2,682,536 yr)?

These are two distinct questions:
  • §4 — does 8H pace discrete geological events?
  • this test — do the H, 2H, ..., 8H periods appear as spectral lines in
    continuous climate data?

A positive result at any nH here would be a bonus discovery (climate
imprinting directly at that multiple of H). A null is consistent with the
framework's structure — climate forcing operates at the individual 8H/n
*divisors* (precession at n = 113/120, obliquity at n = 65/66/68,
eccentricity at n = 21–31, etc.), not at the integer *multiples* of H.

This test is uniquely enabled by CENOGRID's 67-Myr length: at LR04's
5.3-Myr length, 8H = 2.68 Myr fits only ~2 cycles (Rayleigh-unresolved).
CENOGRID fits 25 cycles of 8H — properly resolved spectrally.

Pre-registration
----------------

HYPOTHESIS (H1, one-sided):
  For each n ∈ {1..8}, the Thomson MTM F-statistic at f = 1/(n·H) in
  CENOGRID δ¹⁸O (and δ¹³C) exceeds the F-statistic at randomly-chosen
  control periods in [100, 10000] kyr.

NULL (H0):
  F at each nH is consistent with random period selection.

TEST STATISTIC:
  Thomson MTM F-test (K=5 DPSS tapers, NW=3) at f = 1/(n·H) for n=1..8,
  on CENOGRID δ¹⁸O / δ¹³C LOESS-smoothed (Westerhold 2020 cols 8, 9),
  0–67 Ma, binned to 5-kyr uniform grid.

NULL DISTRIBUTION:
  1000 random periods drawn uniformly in [100, 10000] kyr.
  For each, compute MTM F-stat at that period.
  Empirical p-value: fraction of random periods with F >= F_framework.

VERDICT RULES (per nH, one-sided, pre-registered):
  F < F_critical(α=0.05, K=5)  →  NULL (no climate imprint at this nH)
  F >= F_critical AND p_random < 0.05  →  POSITIVE (bonus discovery)
  F >= F_critical AND p_random >= 0.05 →  AMBIGUOUS (significant line but
                                          random periods also reach it —
                                          power is generic, not framework-
                                          specific)

Run:    python3 scripts/milankovitch_8h_cenogrid_spectral.py
Output: data/milankovitch-8h-cenogrid-spectral.json
"""

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import f as f_dist

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-cenogrid-spectral.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR  # 2682.536 kyr

DT_KYR = 5.0
WINDOW = (0, 67000)  # full Cenozoic, 67 Myr
NW = 3
K = 5
ALPHA = 0.05

FRAMEWORK_PERIODS_KYR = {
    "1H":  1 * H_KYR,  # Earth Fundamental Cycle
    "2H":  2 * H_KYR,
    "3H":  3 * H_KYR,
    "4H":  4 * H_KYR,
    "5H":  5 * H_KYR,
    "6H":  6 * H_KYR,
    "7H":  7 * H_KYR,
    "8H":  8 * H_KYR,  # Solar System Resonance Cycle / orbital-forcing period
}

# Non-framework reference periods (for context)
REFERENCE_PERIODS_KYR = {
    "405":   404.5,    # empirical 405-kyr climate line (off 8H lattice; Layer-2)
    "2400":  2400.0,   # Laskar g₄-g₃ "Mars-Earth" — already tested negative for carbon-cycle (§6.7)
    "3000":  3000.0,   # non-framework long period
    "5000":  5000.0,   # non-framework very long period
    "200":   200.0,    # non-framework intermediate
}

N_RANDOM = 1000
RANDOM_PERIOD_MIN_KYR = 100.0
RANDOM_PERIOD_MAX_KYR = 10000.0

RNG_SEED = 20260521


def load_cenogrid():
    """Westerhold 2020 TableS34: col 1 = tuned time (Ma), col 8 = LOESS d13C, col 9 = LOESS d18O."""
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
                t_ma = float(parts[0])
                c = float(parts[7])
                o = float(parts[8])
            except ValueError:
                continue
            ages_ma.append(t_ma)
            d13c.append(c)
            d18o.append(o)
    return np.array(ages_ma) * 1000.0, np.array(d13c), np.array(d18o)


def preprocess(ages_kyr, vals, window):
    lo, hi = window
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a, v = ages_kyr[mask], vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + DT_KYR / 2, DT_KYR)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


def setup_mtm(n_samples):
    """Precompute DPSS tapers and even-symmetric DC sums."""
    tapers = dpss(n_samples, NW, K)
    times = np.arange(n_samples) * DT_KYR
    U = np.array([np.sum(taper) for taper in tapers])
    even_mask = np.array([k % 2 == 0 for k in range(K)])
    U_even = U[even_mask]
    denom_U2 = float(np.sum(np.abs(U_even) ** 2))
    return tapers, times, U, U_even, even_mask, denom_U2


def mtm_F(y, freq, tapers, times, U, U_even, even_mask, denom_U2):
    """Thomson F-statistic at frequency freq (cycles/kyr)."""
    Y = np.array([np.sum(taper * y * np.exp(-2j * np.pi * freq * times))
                  for taper in tapers])
    Y_even = Y[even_mask]
    if denom_U2 < 1e-30:
        return 0.0
    mu_hat = np.sum(U_even * Y_even) / denom_U2
    numerator = (K - 1) * (np.abs(mu_hat) ** 2) * denom_U2
    residuals = Y - mu_hat * U
    denom = float(np.sum(np.abs(residuals) ** 2))
    if denom < 1e-30:
        return float("inf")
    return float(numerator / denom)


def main():
    t0 = time.time()
    f_crit = float(f_dist.ppf(1 - ALPHA, 2, 2 * K - 2))
    print("=" * 72)
    print("CENOGRID SUPER-CYCLE SPECTRAL TEST (DOC 18 §4 COMPLEMENT)")
    print("=" * 72)
    print(f"  8H = {EIGHT_H:.3f} kyr,  H = {H_KYR:.3f} kyr")
    print(f"  window: {WINDOW[0]/1000:.0f}–{WINDOW[1]/1000:.0f} Ma  ({WINDOW[1]-WINDOW[0]} kyr)")
    print(f"  MTM: K={K} tapers, NW={NW}, dt={DT_KYR} kyr")
    print(f"  F-critical (α={ALPHA}, K={K}): {f_crit:.3f}  (F-dist 2, {2*K-2})")
    print(f"  random null: {N_RANDOM} trials, periods uniform in "
          f"[{RANDOM_PERIOD_MIN_KYR:.0f}, {RANDOM_PERIOD_MAX_KYR:.0f}] kyr")

    ages_kyr, d13c_full, d18o_full = load_cenogrid()
    print(f"\n  loaded {len(ages_kyr)} CENOGRID records "
          f"({ages_kyr.min()/1000:.1f}–{ages_kyr.max()/1000:.1f} Ma)")

    results = {}
    for proxy_name, vals in [("d18O", d18o_full), ("d13C", d13c_full)]:
        print(f"\n──── PROXY: {proxy_name} ────")
        t, y = preprocess(ages_kyr, vals, WINDOW)
        print(f"  preprocessed: {len(y)} samples on {DT_KYR}-kyr grid")

        tapers, times, U, U_even, even_mask, denom_U2 = setup_mtm(len(y))

        framework_results = {}
        for name, P in FRAMEWORK_PERIODS_KYR.items():
            f = mtm_F(y, 1.0 / P, tapers, times, U, U_even, even_mask, denom_U2)
            p_F = float(1 - f_dist.cdf(f, 2, 2 * K - 2))
            sig = f >= f_crit
            framework_results[name] = {
                "period_kyr": float(P),
                "F": float(f),
                "F_critical": f_crit,
                "significant_alpha_0p05": bool(sig),
                "p_F_dist": p_F,
            }
            tag = "✓ SIG" if sig else "  (ns)"
            print(f"    {name:>4} = {P:>8.1f} kyr  F = {f:6.2f}  {tag}  "
                  f"p(F-dist) = {p_F:.4f}")

        reference_results = {}
        for name, P in REFERENCE_PERIODS_KYR.items():
            f = mtm_F(y, 1.0 / P, tapers, times, U, U_even, even_mask, denom_U2)
            sig = f >= f_crit
            reference_results[name] = {
                "period_kyr": float(P),
                "F": float(f),
                "significant_alpha_0p05": bool(sig),
            }
            tag = "✓ sig" if sig else "  (ns)"
            print(f"    ref {name:>5} = {P:>8.1f} kyr  F = {f:6.2f}  {tag}")

        # Random null
        rng = np.random.default_rng(RNG_SEED)
        rand_periods = rng.uniform(RANDOM_PERIOD_MIN_KYR, RANDOM_PERIOD_MAX_KYR, size=N_RANDOM)
        print(f"  random null ({N_RANDOM} trials)...")
        rand_F = np.empty(N_RANDOM)
        for i, P in enumerate(rand_periods):
            rand_F[i] = mtm_F(y, 1.0 / P, tapers, times, U, U_even, even_mask, denom_U2)
        print(f"    null F: mean={rand_F.mean():.2f}, median={np.median(rand_F):.2f}, "
              f"p95={np.percentile(rand_F, 95):.2f}, max={rand_F.max():.2f}")
        null_sig_rate = float((rand_F >= f_crit).mean())
        print(f"    null significant rate: {null_sig_rate*100:.1f}%  "
              f"(expected: {ALPHA*100:.0f}% under F-dist null)")

        for name in framework_results:
            F_f = framework_results[name]["F"]
            p_emp = float((rand_F >= F_f).mean())
            framework_results[name]["p_random_period_null"] = p_emp
            framework_results[name]["random_null_sig_rate"] = null_sig_rate
            sig_f = framework_results[name]["significant_alpha_0p05"]
            if sig_f and p_emp < 0.05:
                verdict = "POSITIVE"
            elif not sig_f:
                verdict = "NULL"
            else:
                verdict = "AMBIGUOUS"
            print(f"    {name:>4} vs null:  empirical p = {p_emp:.3f}  → {verdict}")

        results[proxy_name] = {
            "n_samples": int(len(y)),
            "framework_periods": framework_results,
            "reference_periods": reference_results,
            "random_null": {
                "n_trials": N_RANDOM,
                "period_range_kyr": [RANDOM_PERIOD_MIN_KYR, RANDOM_PERIOD_MAX_KYR],
                "mean_F": float(rand_F.mean()),
                "median_F": float(np.median(rand_F)),
                "p95_F": float(np.percentile(rand_F, 95)),
                "max_F": float(rand_F.max()),
                "significant_rate": null_sig_rate,
            },
        }

    print("\n" + "=" * 72)
    print("VERDICT")
    print("=" * 72)
    for proxy_name in results:
        print(f"  {proxy_name}:")
        for name in FRAMEWORK_PERIODS_KYR:
            r = results[proxy_name]["framework_periods"][name]
            sig_f = r["significant_alpha_0p05"]
            p_emp = r["p_random_period_null"]
            if sig_f and p_emp < 0.05:
                v = f"POSITIVE — {name} imprints climate spectrally (bonus discovery)"
            elif not sig_f:
                v = f"NULL — no climate imprint at {name}"
            else:
                v = "AMBIGUOUS — significant line but random periods reach it"
            print(f"    {name}: F={r['F']:.2f}  p_random={p_emp:.3f}  →  {v}")

    print(f"\n  elapsed: {time.time() - t0:.1f}s")

    OUT_PATH.write_text(json.dumps({
        "framework": "8H super-cycle spectral test on CENOGRID continuous record",
        "doc_reference": "doc 18 §4 complement",
        "data_source": "Westerhold 2020 CENOGRID (PANGAEA TableS34, LOESS-smoothed)",
        "window_ma": [WINDOW[0]/1000, WINDOW[1]/1000],
        "test_periods_kyr": FRAMEWORK_PERIODS_KYR,
        "reference_periods_kyr": REFERENCE_PERIODS_KYR,
        "mtm_config": {"NW": NW, "K": K, "dt_kyr": DT_KYR, "alpha": ALPHA},
        "F_critical": f_crit,
        "n_random_trials": N_RANDOM,
        "random_period_range_kyr": [RANDOM_PERIOD_MIN_KYR, RANDOM_PERIOD_MAX_KYR],
        "rng_seed": RNG_SEED,
        "results": results,
    }, indent=2))
    print(f"\n  output: {OUT_PATH}")


if __name__ == "__main__":
    main()

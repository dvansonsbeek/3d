#!/usr/bin/env python3
"""
Per-L1-integer Thomson Multitaper F-test across CENOGRID 0-67 Ma.

Stronger statistical test than R²-only
--------------------------------------
The §4.9 Test B sliding-window R² analysis shows the L1 lattice retains
17-40% explanatory power across the Cenozoic, but R² is amplitude-based
and doesn't directly test statistical significance against a noise null.

The Thomson 1982 multitaper F-test asks a sharper question: "is the spectral
content at frequency f significantly periodic against a smoothly-varying
noise background?" Under the null hypothesis (no sinusoid at f, only red/
white noise), F ~ F(2, 2K-2) for K Slepian tapers. F > F_critical at a
chosen significance level rejects the null.

This script runs the MTM F-test at each of the 32 L1 lattice frequencies
across sliding windows in CENOGRID 0-67 Ma. Per-integer significance fraction
quantifies how robustly each lattice integer is detected across deep time.

Method
------
1. Load CENOGRID δ¹⁸O, preprocess to 1-kyr uniform grid.
2. Slide a 4-Myr window in 1-Myr steps across 0-67 Ma.
3. At each window position:
   a. Detrend the δ¹⁸O series within the window.
   b. Compute K=5 DPSS (Slepian) tapers with time-bandwidth NW=3.
   c. For each of the 32 L1 frequencies f_n = n/8H:
      - Compute eigencoefficients Y_k(f_n).
      - Estimate the sinusoidal-component amplitude μ(f_n).
      - Compute F-statistic and corresponding p-value.
4. Aggregate per L1 integer:
   - Fraction of windows where F > F_crit (at p<0.01, Bonferroni-corrected
     for 32 simultaneous tests within window: p<0.01/32 = 3.1e-4)
   - Geometric mean F across windows
5. Cross-check on LR04 0-5.3 Ma for comparison.

References
----------
Thomson (1982). Spectrum estimation and harmonic analysis. Proc IEEE 70, 1055.
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import f as f_distribution
import warnings
warnings.filterwarnings("ignore")

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (
    EIGHT_H, L1_LATTICE_INTEGERS,
    load_cenogrid, load_lr04, preprocess,
)

OUTPUT = Path("/home/dennis/code/3d/data/cenogrid-mtm-ftest.json")

NW = 3                # Time-bandwidth product (standard choice)
K = 5                 # Number of tapers (= 2*NW - 1)
WINDOW_KYR = 4000     # 4 Myr — enough to resolve n=9 (period 298 kyr)
STEP_KYR   = 1000     # 1 Myr step
DT_KYR     = 1.0      # uniform grid spacing

# Critical F-values
F_CRIT_PLAIN_05  = f_distribution.ppf(0.95,  dfn=2, dfd=2*K-2)        # ≈ 4.46
F_CRIT_PLAIN_01  = f_distribution.ppf(0.99,  dfn=2, dfd=2*K-2)        # ≈ 8.65
F_CRIT_BONF_32   = f_distribution.ppf(1 - 0.01/32, dfn=2, dfd=2*K-2)  # p<0.01 / 32 tests


def mtm_F(signal, freqs_per_kyr, dt_kyr=1.0, NW=NW, K=K):
    """Per-frequency Thomson MTM F-statistic.

    signal: 1D ndarray, detrended uniform-grid time series
    freqs_per_kyr: array of test frequencies (cycles per kyr)
    Returns: F (same length as freqs), p (p-values under F(2, 2K-2))
    """
    N = len(signal)
    tapers = dpss(N, NW, K)                       # (K, N)
    U_dc = tapers.sum(axis=1)                     # (K,) — taper DC values
    sum_U_sq = float(np.sum(U_dc * U_dc))

    t = np.arange(N) * dt_kyr                     # time in kyr
    F_out = np.zeros(len(freqs_per_kyr))
    for i, f in enumerate(freqs_per_kyr):
        e = np.exp(-2j * np.pi * f * t)
        # Eigencoefficients (complex)
        Y = tapers @ (signal * e)                 # (K,) complex
        # Complex line-amplitude estimate (Thomson 1982 eq. for harmonic test)
        # μ(f) = Σ_k U_k(0) Y_k(f) / Σ_k U_k(0)²
        if sum_U_sq < 1e-20:
            F_out[i] = 0.0
            continue
        mu = np.sum(U_dc * Y) / sum_U_sq           # complex
        mu_sq = float(np.real(mu * np.conj(mu)))   # |μ|²
        residual = Y - mu * U_dc
        sum_res_sq = float(np.sum(np.abs(residual) ** 2))
        if sum_res_sq < 1e-20:
            F_out[i] = 1e6
        else:
            F_out[i] = (K - 1) * mu_sq * sum_U_sq / sum_res_sq

    p_out = 1.0 - f_distribution.cdf(F_out, dfn=2, dfd=2 * K - 2)
    return F_out, p_out


def lattice_vs_offlattice_test(t_raw, y_raw, window_kyr, step_kyr,
                                age_min, age_max, rng):
    """Control test: do L1 lattice frequencies have systematically higher
    F-statistics than random non-lattice frequencies?

    Generates 100 random off-lattice frequencies in the same range as the
    L1 lattice, computes F across all sliding windows, and compares the
    distribution of "lattice F" vs "off-lattice F".

    Output: Kolmogorov-Smirnov test result + summary stats.
    """
    from scipy.stats import ks_2samp

    eight_H_kyr = EIGHT_H
    lattice_freqs = np.asarray([n / eight_H_kyr for n in L1_LATTICE_INTEGERS])

    # Off-lattice frequencies: random in the same range, avoiding ±5% of any
    # lattice integer's frequency. 100 control frequencies.
    f_min = min(lattice_freqs)
    f_max = max(lattice_freqs)
    off_lattice_freqs = []
    while len(off_lattice_freqs) < 100:
        f_try = rng.uniform(f_min, f_max)
        # Check it's not within 5% of any lattice frequency
        rel_dist = np.min(np.abs(lattice_freqs - f_try) / lattice_freqs)
        if rel_dist > 0.05:
            off_lattice_freqs.append(f_try)
    off_lattice_freqs = np.asarray(off_lattice_freqs)

    all_freqs = np.concatenate([lattice_freqs, off_lattice_freqs])
    n_l = len(lattice_freqs)

    starts = np.arange(age_min, age_max - window_kyr + 1, step_kyr)
    F_table = np.zeros((len(starts), len(all_freqs)))

    for w_idx, s in enumerate(starts):
        win = (int(s), int(s + window_kyr))
        try:
            tg, yg = preprocess(t_raw, y_raw, win, dt_kyr=DT_KYR)
        except Exception:
            continue
        if len(yg) < 100: continue
        y_dt = detrend(yg)
        F_vals, _ = mtm_F(y_dt, all_freqs, dt_kyr=DT_KYR)
        F_table[w_idx, :] = F_vals

    F_lattice = F_table[:, :n_l].ravel()
    F_offlattice = F_table[:, n_l:].ravel()
    F_lattice = F_lattice[F_lattice > 0]
    F_offlattice = F_offlattice[F_offlattice > 0]

    ks_stat, ks_p = ks_2samp(F_lattice, F_offlattice, alternative='less')
    # alternative='less': H1 is F_offlattice stochastically smaller than F_lattice
    # (i.e., lattice has HIGHER values). p small → lattice significantly higher.

    return {
        "n_lattice_F_samples": int(len(F_lattice)),
        "n_offlattice_F_samples": int(len(F_offlattice)),
        "lattice_F_median": float(np.median(F_lattice)),
        "lattice_F_mean": float(np.mean(F_lattice)),
        "lattice_F_p95": float(np.percentile(F_lattice, 95)),
        "offlattice_F_median": float(np.median(F_offlattice)),
        "offlattice_F_mean": float(np.mean(F_offlattice)),
        "offlattice_F_p95": float(np.percentile(F_offlattice, 95)),
        "KS_statistic": float(ks_stat),
        "KS_p_value": float(ks_p),
        "verdict": (
            "LATTICE significantly higher than off-lattice" if ks_p < 0.001
            else "Lattice marginally higher" if ks_p < 0.05
            else "No significant lattice vs off-lattice difference"
        ),
    }


def analyze_record(label, t_raw, y_raw, window_kyr, step_kyr,
                    age_min, age_max):
    """Sliding-window MTM F-test per L1 integer across a record."""
    print(f"\n  ── {label} ──")
    print(f"     Window = {window_kyr/1000:.1f} Myr,  step = {step_kyr/1000:.1f} Myr,  "
          f"K = {K} tapers, NW = {NW}")
    print(f"     F_critical (plain p<0.05): {F_CRIT_PLAIN_05:.2f}")
    print(f"     F_critical (plain p<0.01): {F_CRIT_PLAIN_01:.2f}")
    print(f"     F_critical (Bonferroni p<0.01 over 32 tests): {F_CRIT_BONF_32:.2f}")

    starts = np.arange(age_min, age_max - window_kyr + 1, step_kyr)

    # L1 frequencies in cycles per kyr (8H = 2682.536 kyr in our units)
    eight_H_kyr = EIGHT_H  # already in kyr from milankovitch module
    freqs = np.asarray([n / eight_H_kyr for n in L1_LATTICE_INTEGERS])
    n_lattice = len(L1_LATTICE_INTEGERS)

    # Storage: F values per window per integer
    F_table = np.zeros((len(starts), n_lattice))

    for w_idx, s in enumerate(starts):
        win = (int(s), int(s + window_kyr))
        try:
            tg, yg = preprocess(t_raw, y_raw, win, dt_kyr=DT_KYR)
        except Exception:
            continue
        if len(yg) < 100:
            continue
        # Detrend (remove linear trend within window)
        y_dt = detrend(yg)
        F_vals, _ = mtm_F(y_dt, freqs, dt_kyr=DT_KYR)
        F_table[w_idx, :] = F_vals

    # Per-integer significance summary
    print()
    print(f"     {'n':>4}{'P (kyr)':>9}{'Fmedian':>10}{'Fmax':>9}"
          f"{'sig5%':>9}{'sig1%':>9}{'Bonf01':>9}")
    integer_summary = []
    for j, n in enumerate(L1_LATTICE_INTEGERS):
        F_col = F_table[:, j]
        F_col = F_col[F_col > 0]
        if len(F_col) == 0:
            continue
        sig05 = float(np.mean(F_col > F_CRIT_PLAIN_05))
        sig01 = float(np.mean(F_col > F_CRIT_PLAIN_01))
        sig_bonf = float(np.mean(F_col > F_CRIT_BONF_32))
        F_median = float(np.median(F_col))
        F_max = float(np.max(F_col))
        period_kyr = eight_H_kyr / n
        integer_summary.append({
            "n": int(n), "period_kyr": float(period_kyr),
            "F_median": F_median, "F_max": F_max,
            "frac_sig_plain_05": sig05,
            "frac_sig_plain_01": sig01,
            "frac_sig_bonf_01": sig_bonf,
        })

    # Print top 15 by Bonferroni-significance fraction
    integer_summary.sort(key=lambda x: -x["frac_sig_bonf_01"])
    for s in integer_summary[:15]:
        print(f"     {s['n']:>4}{s['period_kyr']:>9.1f}"
              f"{s['F_median']:>10.2f}{s['F_max']:>9.1f}"
              f"{100*s['frac_sig_plain_05']:>7.0f}%"
              f"{100*s['frac_sig_plain_01']:>8.0f}%"
              f"{100*s['frac_sig_bonf_01']:>8.0f}%")

    # Overall lattice-level significance: fraction of (window × integer)
    # combinations that survive Bonferroni
    n_total = (F_table > 0).sum()
    n_sig_bonf = (F_table > F_CRIT_BONF_32).sum()
    overall_bonf = float(n_sig_bonf) / n_total if n_total else 0.0
    print(f"\n     Aggregate: {n_sig_bonf} of {n_total} (window × integer) "
          f"combinations significant under Bonferroni p<0.01")
    print(f"     = {100*overall_bonf:.1f}% of lattice positions across the entire window")

    # By-epoch summary
    epochs = [
        ("Pleistocene-Pliocene", (0,     5300)),
        ("Late Miocene",         (5300,  11600)),
        ("Mid Miocene",          (11600, 16000)),
        ("Early Miocene",        (16000, 23000)),
        ("Late Oligocene",       (23000, 28000)),
        ("Early Oligocene",      (28000, 34000)),
        ("Late Eocene",          (34000, 40000)),
        ("Mid Eocene",           (40000, 48000)),
        ("Early Eocene",         (48000, 56000)),
        ("Paleocene",            (56000, 66000)),
    ]
    print()
    print(f"     ── By Cenozoic epoch ──")
    print(f"     {'Epoch':<25}{'window (Ma)':<15}{'n win':>6}"
          f"{'mean F sig %':>15}")
    epoch_summary = {}
    for name, (lo, hi) in epochs:
        in_ep_idx = [i for i, s in enumerate(starts)
                     if lo <= (s + window_kyr/2) < hi]
        if not in_ep_idx:
            continue
        F_sub = F_table[in_ep_idx, :]
        sig_in_ep = float(np.mean(F_sub > F_CRIT_BONF_32))
        epoch_summary[name] = {
            "window_Ma": [lo/1000, hi/1000],
            "n_windows": len(in_ep_idx),
            "fraction_sig_bonf_01": sig_in_ep,
        }
        print(f"     {name:<25}{f'{lo/1000:.1f}-{hi/1000:.1f}':<15}"
              f"{len(in_ep_idx):>6}{100*sig_in_ep:>13.1f}%")

    return {
        "label": label,
        "window_kyr": window_kyr,
        "step_kyr": step_kyr,
        "K_tapers": K, "NW": NW,
        "F_crit_plain_05": F_CRIT_PLAIN_05,
        "F_crit_plain_01": F_CRIT_PLAIN_01,
        "F_crit_bonferroni_01": F_CRIT_BONF_32,
        "per_integer": integer_summary,
        "aggregate_fraction_sig_bonf_01": overall_bonf,
        "by_epoch": epoch_summary,
    }


def main():
    print("=" * 92)
    print("  Thomson MTM F-test: per-L1-integer significance across deep time")
    print(f"  L1 lattice = 32 integers, periods 14.5-298 kyr")
    print("=" * 92)

    rng = np.random.default_rng(20260606)

    # ── CENOGRID ──
    out = load_cenogrid()
    t_raw, y_raw = out[0], out[1]
    print(f"\n  CENOGRID raw: n = {len(t_raw)}, age range = "
          f"{t_raw.min():.0f}-{t_raw.max():.0f} kyr")
    cenogrid_result = analyze_record(
        "CENOGRID δ¹⁸O 0-67 Ma",
        t_raw, y_raw, WINDOW_KYR, STEP_KYR,
        age_min=0, age_max=67000,
    )
    print("\n  ── CENOGRID lattice-vs-off-lattice KS test ──")
    cg_ctrl = lattice_vs_offlattice_test(
        t_raw, y_raw, WINDOW_KYR, STEP_KYR, 0, 67000, rng,
    )
    print(f"     Lattice F:  median={cg_ctrl['lattice_F_median']:.3f},"
          f" mean={cg_ctrl['lattice_F_mean']:.3f},"
          f" p95={cg_ctrl['lattice_F_p95']:.2f}")
    print(f"     Off-latt F: median={cg_ctrl['offlattice_F_median']:.3f},"
          f" mean={cg_ctrl['offlattice_F_mean']:.3f},"
          f" p95={cg_ctrl['offlattice_F_p95']:.2f}")
    print(f"     KS test (alternative=less): D = {cg_ctrl['KS_statistic']:.4f},"
          f" p = {cg_ctrl['KS_p_value']:.2e}")
    print(f"     Verdict: {cg_ctrl['verdict']}")
    cenogrid_result["control_test"] = cg_ctrl

    # ── LR04 cross-check (validate against doc 92's existing claims) ──
    t_lr, y_lr = load_lr04()
    print(f"\n  LR04 raw: n = {len(t_lr)}, age range = "
          f"{t_lr.min():.0f}-{t_lr.max():.0f} kyr")
    lr04_result = analyze_record(
        "LR04 δ¹⁸O 0-5.3 Ma (cross-check vs doc 92)",
        t_lr, y_lr, window_kyr=1000, step_kyr=500,
        age_min=0, age_max=5300,
    )
    print("\n  ── LR04 lattice-vs-off-lattice KS test ──")
    lr_ctrl = lattice_vs_offlattice_test(
        t_lr, y_lr, 1000, 500, 0, 5300, rng,
    )
    print(f"     Lattice F:  median={lr_ctrl['lattice_F_median']:.3f},"
          f" mean={lr_ctrl['lattice_F_mean']:.3f},"
          f" p95={lr_ctrl['lattice_F_p95']:.2f}")
    print(f"     Off-latt F: median={lr_ctrl['offlattice_F_median']:.3f},"
          f" mean={lr_ctrl['offlattice_F_mean']:.3f},"
          f" p95={lr_ctrl['offlattice_F_p95']:.2f}")
    print(f"     KS test (alternative=less): D = {lr_ctrl['KS_statistic']:.4f},"
          f" p = {lr_ctrl['KS_p_value']:.2e}")
    print(f"     Verdict: {lr_ctrl['verdict']}")
    lr04_result["control_test"] = lr_ctrl

    # ── Cross-record consistency: which integers are universally significant? ──
    print()
    print("=" * 92)
    print("  Universal significance: integers significant in both CENOGRID + LR04")
    print("=" * 92)
    cg_dict = {s["n"]: s for s in cenogrid_result["per_integer"]}
    lr_dict = {s["n"]: s for s in lr04_result["per_integer"]}
    print(f"  {'n':>4}{'P(kyr)':>9}{'CENOGRID Bonf%':>17}{'LR04 Bonf%':>13}"
          f"{'common physical':<30}")
    for n in L1_LATTICE_INTEGERS:
        cg = cg_dict.get(n, {})
        lr = lr_dict.get(n, {})
        cg_pct = 100 * cg.get("frac_sig_bonf_01", 0)
        lr_pct = 100 * lr.get("frac_sig_bonf_01", 0)
        if cg_pct >= 30 and lr_pct >= 30:
            verdict = "✓ universal"
        elif cg_pct >= 30:
            verdict = "→ deep-time only"
        elif lr_pct >= 30:
            verdict = "→ Pleistocene only"
        else:
            verdict = ""
        if verdict:
            print(f"  {n:>4}{EIGHT_H/n:>9.1f}"
                  f"{cg_pct:>15.1f}%{lr_pct:>11.1f}%   {verdict}")

    OUTPUT.write_text(json.dumps({
        "method": (
            f"Thomson MTM F-test per L1 lattice integer, sliding "
            f"{WINDOW_KYR/1000:.1f}-Myr windows. K={K} DPSS tapers (NW={NW}). "
            "F-stat ~ F(2, 2K-2) under no-sinusoid null. Bonferroni correction "
            "for 32 simultaneous tests per window: p<0.01 → F_crit = "
            f"{F_CRIT_BONF_32:.2f}."
        ),
        "constants": {
            "8H_kyr": EIGHT_H, "window_kyr": WINDOW_KYR,
            "step_kyr": STEP_KYR, "K": K, "NW": NW,
            "F_crit_plain_05": F_CRIT_PLAIN_05,
            "F_crit_plain_01": F_CRIT_PLAIN_01,
            "F_crit_bonferroni_01": F_CRIT_BONF_32,
        },
        "cenogrid": cenogrid_result,
        "lr04": lr04_result,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

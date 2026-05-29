#!/usr/bin/env python3
"""
MILANKOVITCH 8H FRAMEWORK — CENOGRID SLIDING-WINDOW H-MULTIPLE SPECTRAL TEST
=============================================================================

Doc 92 §4.6 — pre-registered windowed complement to §4.5.

§4.5 found that the *global* 0–67 Myr CENOGRID MTM F-test gives NULL at all
H-multiples (1H..8H) in both δ¹⁸O and δ¹³C. The objection: a global
spectral test averages over the whole record, and any time-localised power
at H-multiples (e.g. amplification specifically during the Plio-Pleistocene)
would be diluted in a global test. The Plio-Pleistocene observation (doc 92
§1) is that each of those epochs aligns with one 8H cycle — if 8H imprints
climate at all, it should be most visible there.

This script repeats the §4.5 test in non-overlapping sliding windows of
length 2×8H = 5.365 Myr (one Plio-Pleistocene combined unit). Twelve such
windows tile 0–64.4 Ma. In each window we evaluate, for each of the H
multiples 1H..8H:
  • Thomson MTM F-statistic (K=5 DPSS tapers, NW=3)
  • Single-component OLS amplitude (less spectral-resolution-sensitive)
For positive-control purposes, the 405-kyr empirical climate line is also
evaluated in each window.

Pre-registration
----------------

HYPOTHESIS (H1, one-sided):
  In the Plio-Pleistocene window (W1, 0–5.365 Ma), at least one of nH
  (n ∈ {1..8}) shows MTM F-statistic ≥ F_critical(α=0.05, K=5) = 4.46,
  AND the OLS amplitude at that nH is greater than the median amplitude
  at that same nH across the eleven control windows (W2..W12).

NULL (H0):
  No nH shows a significantly elevated F or amplitude in W1 relative to
  W2..W12 — i.e. the Plio-Pleistocene window is spectrally indistinguishable
  from the control windows in the H-multiple band.

VERDICT RULES (one-sided, pre-registered):
  POSITIVE — at least one nH in W1 has F ≥ F_critical AND amplitude in W1
             ranks #1 among the 12 windows for that nH.
  AMBIGUOUS — F ≥ F_critical in W1 for some nH but amplitude isn't max,
              OR amplitude max in W1 but F not significant.
  NULL — neither F-significance nor amplitude-ranking favours W1.

RESOLUTION CAVEAT (declared up front, not after the fact):
  At T = 5.365 Myr, Rayleigh Δf = 1/T = 0.187 cycles/Myr. Period
  resolutions:
    1H = 335 kyr   →  16 cycles/window     well-resolved
    2H = 671 kyr   →  8 cycles/window      well-resolved
    3H = 1006 kyr  →  5.3 cycles/window    well-resolved
    4H = 1341 kyr  →  4 cycles/window      adequate
    5H = 1677 kyr  →  3.2 cycles/window    adequate
    6H = 2012 kyr  →  2.7 cycles/window    borderline
    7H = 2347 kyr  →  2.3 cycles/window    borderline
    8H = 2683 kyr  →  2.0 cycles/window    Rayleigh-limit
  Where the predicted signal sits at the Rayleigh limit, the test is
  weakest at 8H itself, but 1H–5H are robustly testable.

Run:    python3 scripts/milankovitch_8h_cenogrid_windowed.py
Output: data/milankovitch-8h-cenogrid-windowed.json
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
OUT_PATH = DATA_DIR / "milankovitch-8h-cenogrid-windowed.json"

H_KYR = 335.317
EIGHT_H = 8 * H_KYR
WINDOW_KYR = 2 * EIGHT_H   # one Plio-Pleistocene combined unit = 2*8H = 5364.7 kyr
N_WINDOWS = 12
DT_KYR = 5.0
NW = 3
K = 5
ALPHA = 0.05

H_MULTIPLES = {f"{n}H": n * H_KYR for n in range(1, 9)}
POSITIVE_CONTROL_KYR = 404.5   # empirical 405-kyr line — must show in every window


def load_cenogrid():
    """CENOGRID col 8 = LOESS d13C, col 9 = LOESS d18O."""
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
    tapers = dpss(n_samples, NW, K)
    times = np.arange(n_samples) * DT_KYR
    U = np.array([np.sum(taper) for taper in tapers])
    even_mask = np.array([k % 2 == 0 for k in range(K)])
    U_even = U[even_mask]
    denom_U2 = float(np.sum(np.abs(U_even) ** 2))
    return tapers, times, U, U_even, even_mask, denom_U2


def mtm_F(y, freq, tapers, times, U, U_even, even_mask, denom_U2):
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


def ols_amplitude(t, y, period_kyr):
    omega = 2 * np.pi / period_kyr
    X = np.column_stack([np.ones_like(t), np.cos(omega * t), np.sin(omega * t)])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    return float(np.hypot(b[1], b[2]))


def main():
    t0 = time.time()
    f_crit = float(f_dist.ppf(1 - ALPHA, 2, 2 * K - 2))
    windows = [(i, (i * WINDOW_KYR, (i + 1) * WINDOW_KYR)) for i in range(N_WINDOWS)]

    print("=" * 78)
    print("CENOGRID WINDOWED H-MULTIPLE SPECTRAL TEST (DOC 92 §4.6)")
    print("=" * 78)
    print(f"  window length: 2×8H = {WINDOW_KYR:.0f} kyr  ({WINDOW_KYR/1000:.2f} Myr)")
    print(f"  tiling: {N_WINDOWS} non-overlapping windows, "
          f"0 to {N_WINDOWS * WINDOW_KYR/1000:.1f} Ma")
    print(f"  W1 = Plio-Pleistocene = 0–{WINDOW_KYR/1000:.2f} Ma (test window)")
    print(f"  F-critical (α={ALPHA}, K={K}): {f_crit:.3f}")
    print(f"  positive control: 405 kyr  (must be significant in every window)")

    ages_kyr, d13c_full, d18o_full = load_cenogrid()
    print(f"\n  loaded {len(ages_kyr)} CENOGRID records "
          f"({ages_kyr.min()/1000:.1f}–{ages_kyr.max()/1000:.1f} Ma)")

    all_results = {}
    for proxy_name, vals in [("d18O", d18o_full), ("d13C", d13c_full)]:
        print(f"\n──── PROXY: {proxy_name} ────")

        # Header
        cols = ["window (Ma)"] + list(H_MULTIPLES.keys()) + ["405kyr"]
        print(f"\n  F-statistics ({proxy_name}):")
        print(f"  {'window (Ma)':<13}  " + "  ".join(f"{c:>6s}" for c in cols[1:]))

        proxy_rows = []
        for i, (lo, hi) in windows:
            t, y = preprocess(ages_kyr, vals, (lo, hi))
            tapers, times, U, U_even, even_mask, denom_U2 = setup_mtm(len(y))

            F_vals = {}
            A_vals = {}
            for name, P in H_MULTIPLES.items():
                F_vals[name] = mtm_F(y, 1.0/P, tapers, times, U, U_even, even_mask, denom_U2)
                A_vals[name] = ols_amplitude(times, y, P)
            F_vals["405kyr"] = mtm_F(y, 1.0/POSITIVE_CONTROL_KYR,
                                     tapers, times, U, U_even, even_mask, denom_U2)
            A_vals["405kyr"] = ols_amplitude(times, y, POSITIVE_CONTROL_KYR)

            cells = []
            for name in list(H_MULTIPLES.keys()) + ["405kyr"]:
                F = F_vals[name]
                sig = F >= f_crit
                cells.append(f"{F:>6.2f}{'*' if sig else ' '}")
            print(f"  W{i+1:<2} {lo/1000:>4.1f}–{hi/1000:<4.1f}  " + " ".join(cells))

            proxy_rows.append({
                "window": f"W{i+1}",
                "range_ma": [lo/1000, hi/1000],
                "n_samples": int(len(y)),
                "F": F_vals,
                "amplitude_ols": A_vals,
            })

        # Cross-window comparison: rank W1 vs others for each nH
        print(f"\n  Amplitude ranking ({proxy_name}, rank 1 = highest, 12 = lowest):")
        print(f"  {'metric':<8}  " + "  ".join(f"{n:>4s}" for n in list(H_MULTIPLES.keys())+["405kyr"]))
        for label in ["W1 F-rank", "W1 amp-rank"]:
            row = []
            metric = "F" if "F" in label else "amplitude_ols"
            for name in list(H_MULTIPLES.keys()) + ["405kyr"]:
                vals_across = np.array([w[metric][name] for w in proxy_rows])
                # Rank descending (1 = highest)
                rank_W1 = int(np.sum(vals_across > vals_across[0]) + 1)
                row.append(rank_W1)
            print(f"  {label:<12}  " + "  ".join(f"{r:>4d}" for r in row))

        # Verdict on W1
        verdict_per_nH = {}
        for name in H_MULTIPLES:
            W1_F = proxy_rows[0]["F"][name]
            W1_A = proxy_rows[0]["amplitude_ols"][name]
            sig_F = W1_F >= f_crit
            amps = np.array([w["amplitude_ols"][name] for w in proxy_rows])
            amp_rank_W1 = int(np.sum(amps > W1_A) + 1)
            amp_max_W1 = (amp_rank_W1 == 1)
            if sig_F and amp_max_W1:
                v = "POSITIVE"
            elif sig_F or amp_max_W1:
                v = "AMBIGUOUS"
            else:
                v = "NULL"
            verdict_per_nH[name] = {
                "W1_F": W1_F,
                "W1_F_significant": bool(sig_F),
                "W1_amplitude": W1_A,
                "W1_amp_rank": amp_rank_W1,
                "verdict": v,
            }

        # 405-kyr positive control summary
        ctrl_F_per_window = [w["F"]["405kyr"] for w in proxy_rows]
        ctrl_sig_count = int(sum(F >= f_crit for F in ctrl_F_per_window))
        print(f"\n  405-kyr positive control: {ctrl_sig_count}/{N_WINDOWS} windows F≥{f_crit:.2f}")
        for i, F in enumerate(ctrl_F_per_window):
            tag = "✓" if F >= f_crit else " "
            print(f"    W{i+1}: F = {F:6.2f}  {tag}")

        all_results[proxy_name] = {
            "windows": proxy_rows,
            "W1_verdict_per_nH": verdict_per_nH,
            "positive_control_405kyr": {
                "F_per_window": ctrl_F_per_window,
                "significant_windows": ctrl_sig_count,
                "total_windows": N_WINDOWS,
            },
        }

    # Final per-proxy verdict
    print("\n" + "=" * 78)
    print("VERDICT — does the Plio-Pleistocene window (W1) show H-multiple power?")
    print("=" * 78)
    for proxy_name in all_results:
        print(f"\n  {proxy_name}:")
        any_positive = False
        any_amb = False
        for name in H_MULTIPLES:
            v = all_results[proxy_name]["W1_verdict_per_nH"][name]
            tag = "✓" if v["verdict"] == "POSITIVE" else (
                  "?" if v["verdict"] == "AMBIGUOUS" else " ")
            print(f"    {name:>4}: F={v['W1_F']:6.2f}  amp={v['W1_amplitude']:.3f}  "
                  f"amp-rank in W1={v['W1_amp_rank']}/12  {tag} {v['verdict']}")
            if v["verdict"] == "POSITIVE":
                any_positive = True
            if v["verdict"] == "AMBIGUOUS":
                any_amb = True
        if any_positive:
            summary = "POSITIVE — at least one nH shows Plio-Pleistocene amplification"
        elif any_amb:
            summary = "AMBIGUOUS — partial signature, not full confirmation"
        else:
            summary = "NULL — no nH shows W1-specific amplification"
        print(f"    → overall: {summary}")

    print(f"\n  elapsed: {time.time() - t0:.1f}s")

    OUT_PATH.write_text(json.dumps({
        "framework": "8H windowed H-multiple spectral test on CENOGRID",
        "doc_reference": "doc 91 §11.6 — Plio-Pleistocene windowed complement to §4.5",
        "data_source": "Westerhold 2020 CENOGRID (PANGAEA TableS34, LOESS-smoothed)",
        "window_length_kyr": WINDOW_KYR,
        "n_windows": N_WINDOWS,
        "h_kyr": H_KYR,
        "h_multiples_kyr": H_MULTIPLES,
        "positive_control_kyr": POSITIVE_CONTROL_KYR,
        "mtm_config": {"NW": NW, "K": K, "dt_kyr": DT_KYR, "alpha": ALPHA},
        "F_critical": f_crit,
        "results": all_results,
    }, indent=2))
    print(f"\n  output: {OUT_PATH}")


if __name__ == "__main__":
    main()

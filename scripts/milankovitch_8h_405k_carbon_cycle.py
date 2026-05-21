#!/usr/bin/env python3
"""
405-KYR CARBON-CYCLE AMPLIFICATION TEST
=========================================

Hypothesis: the 405-kyr signal in pre-Pleistocene climate records is
primarily a CARBON-CYCLE internal resonance (silicate-weathering thermostat
at ~400 kyr), loosely entrained by long-period orbital eccentricity forcing
— not a direct orbital insolation cycle. Standard Milankovitch instead
labels this signal the "g₂−g₅ Venus-Jupiter eigenbeat", but that uses
Laskar's secular eigenfrequencies which this framework's planet motions
(doc 55) do not reproduce. If the carbon-cycle hypothesis is correct:

  • δ¹³C (carbon-cycle proxy) should show STRONGER 405-kyr signal
  • δ¹⁸O (ice-volume/temperature proxy) should show WEAKER 405-kyr signal
  • The ratio should be LARGER for 405 kyr than for obliquity (41 kyr)
    or precession (23 kyr), which are not carbon-cycle-amplified

Westerhold 2020 CENOGRID provides BOTH δ¹⁸O and δ¹³C LOESS-smoothed
timeseries on the SAME chronology (TableS34 columns 7 and 8).

Methodology:
  For each test interval (Eocene 33-50 Ma, Oligocene 23-34 Ma,
  Paleocene-Eocene 50-66 Ma, full Cenozoic):
    1. Compute MTM F-stat at 405 kyr in both δ¹³C and δ¹⁸O
    2. Compute single-component amplitude at 405 kyr in both
    3. Compute ratio δ¹³C/δ¹⁸O amp at 405 kyr
    4. Repeat at obliquity (41 kyr) and precession (23 kyr) as controls
    5. Test: is the amplification ratio at 405 specifically larger than
       at the control bands?

Output: data/milankovitch-8h-405k-carbon-cycle.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import f as f_dist

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-carbon-cycle.json"

DT_KYR = 5.0
NW = 3
K_TAPERS = 5
ALPHA = 0.05
F_CRIT = float(f_dist.ppf(1 - ALPHA, 2, 2 * K_TAPERS - 2))

# Test cycles
TEST_PERIODS = {
    "405k_g2_g5_carbon":   {"period_kyr": 405.0, "hypothesis": "carbon-cycle amplified — δ¹³C should be stronger"},
    "obliquity_control":   {"period_kyr": 41.0,  "hypothesis": "direct insolation — should be SIMILAR in both"},
    "precession_control":  {"period_kyr": 23.74, "hypothesis": "direct insolation — should be SIMILAR in both"},
    "100k_eccentricity":   {"period_kyr": 100.0, "hypothesis": "mixed: eccentricity envelope + ice-sheet response"},
}

INTERVALS = [
    ("Cenozoic_full",  (0, 67000),    "full record"),
    ("Eocene",         (33000, 50000), "warmhouse"),
    ("Oligocene",      (23000, 34000), "coolhouse"),
    ("Paleocene",      (58000, 66000), "hothouse"),
    ("Miocene",        (5000, 23000),  "coolhouse"),
    ("post_MPT",       (0, 1000),      "icehouse"),
]


# ─────────────────────────────────────────────────────────────────────────
# Load both δ¹³C and δ¹⁸O LOESS-smoothed columns
# ─────────────────────────────────────────────────────────────────────────

def load_cenogrid_both():
    """CENOGRID TableS34: col 0 = time (Ma), col 7 = d13C LOESS, col 8 = d18O LOESS."""
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
                t = float(parts[0])
                c = float(parts[7])
                o = float(parts[8])
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
    if n < 30:
        return 0.0
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


def analyze_interval(name, window, label, ages, d13c, d18o):
    print("\n" + "─" * 72)
    print(f"  {name}: {label}  ({window[0]/1000:.1f}–{window[1]/1000:.1f} Ma)")
    print("─" * 72)
    t_c, y_c = regrid_detrend(ages, d13c, window)
    t_o, y_o = regrid_detrend(ages, d18o, window)
    if t_c is None or t_o is None or len(t_c) < 30:
        return {"name": name, "skipped": True}

    print(f"    samples (δ¹³C): {len(y_c)},  samples (δ¹⁸O): {len(y_o)}")
    print(f"    {'cycle':>22s}  {'P_kyr':>7s}  {'amp δ¹³C':>9s}  {'F δ¹³C':>7s}  {'amp δ¹⁸O':>9s}  {'F δ¹⁸O':>7s}  {'¹³C/¹⁸O':>8s}")

    results = {}
    for cycle_name, info in TEST_PERIODS.items():
        P = info["period_kyr"]
        amp_c = single_amp(t_c, y_c, P)
        amp_o = single_amp(t_o, y_o, P)
        f_c = thomson_f(y_c, 1.0 / P, DT_KYR)
        f_o = thomson_f(y_o, 1.0 / P, DT_KYR)
        ratio = amp_c / amp_o if amp_o > 1e-9 else float("inf")
        sig_c = "✓" if f_c > F_CRIT else " "
        sig_o = "✓" if f_o > F_CRIT else " "
        print(f"    {cycle_name:>22s}  {P:7.2f}  {amp_c:9.4f}{sig_c}  {f_c:7.2f}  {amp_o:9.4f}{sig_o}  {f_o:7.2f}  {ratio:8.3f}")
        results[cycle_name] = {
            "period_kyr": P,
            "amp_d13c": amp_c, "F_d13c": f_c, "sig_d13c": bool(f_c > F_CRIT),
            "amp_d18o": amp_o, "F_d18o": f_o, "sig_d18o": bool(f_o > F_CRIT),
            "amp_ratio_d13c_over_d18o": ratio,
        }
    return {"name": name, "label": label, "window_kyr": list(window),
            "n_samples": int(min(len(y_c), len(y_o))),
            "cycle_results": results}


def main():
    print("=" * 72)
    print("405-KYR CARBON-CYCLE AMPLIFICATION TEST")
    print("=" * 72)
    print(f"  Hypothesis: 405-kyr is carbon-cycle-amplified → expect δ¹³C/δ¹⁸O ratio > 1")
    print(f"  Controls: obliquity (41) and precession (23) — expect ratio ≈ 1 (direct insolation)")
    print(f"  Bonus: 100k cycle — eccentricity + ice-sheet mixed response")
    print(f"  F critical (α=0.05): {F_CRIT:.3f}")

    ages, d13c, d18o = load_cenogrid_both()
    print(f"\n  CENOGRID: {len(ages)} samples  ({ages.min()/1000:.2f}..{ages.max()/1000:.2f} Ma)")

    interval_results = []
    for name, window, label in INTERVALS:
        r = analyze_interval(name, window, label, ages, d13c, d18o)
        interval_results.append(r)

    # Summary: 405-kyr amplification ratio vs control bands
    print("\n" + "═" * 72)
    print("  SUMMARY: amp ratio δ¹³C / δ¹⁸O at 405 kyr vs control bands")
    print("═" * 72)
    print(f"  {'interval':22s}  {'405 ratio':>10s}  {'obl ratio':>10s}  {'prec ratio':>10s}  {'100k ratio':>10s}  Verdict")
    print(f"  {'-'*22}  {'-'*10}  {'-'*10}  {'-'*10}  {'-'*10}  {'-'*40}")
    summary = []
    for r in interval_results:
        if r.get("skipped"):
            continue
        rc = r["cycle_results"]
        r405 = rc["405k_g2_g5_carbon"]["amp_ratio_d13c_over_d18o"]
        rob = rc["obliquity_control"]["amp_ratio_d13c_over_d18o"]
        rpr = rc["precession_control"]["amp_ratio_d13c_over_d18o"]
        r100 = rc["100k_eccentricity"]["amp_ratio_d13c_over_d18o"]
        # Headline test: is 405 ratio higher than both insolation controls?
        carbon_amplified = r405 > 1.5 * max(rob, rpr)
        verdict = "POSITIVE — 405 carbon-amplified" if carbon_amplified else (
            "PARTIAL" if r405 > max(rob, rpr) else "no carbon-cycle excess")
        print(f"  {r['name']:22s}  {r405:10.3f}  {rob:10.3f}  {rpr:10.3f}  {r100:10.3f}  {verdict}")
        summary.append({"interval": r["name"], "ratio_405": r405,
                         "ratio_obliquity": rob, "ratio_precession": rpr,
                         "ratio_100k": r100,
                         "carbon_amplified_at_405": bool(carbon_amplified),
                         "verdict": verdict})

    out = {
        "meta": {
            "test_periods_kyr": {k: v["period_kyr"] for k, v in TEST_PERIODS.items()},
            "hypotheses": {k: v["hypothesis"] for k, v in TEST_PERIODS.items()},
            "NW": NW, "K_tapers": K_TAPERS, "F_critical": F_CRIT,
            "data_source": "Westerhold 2020 CENOGRID TableS34 LOESS-smoothed δ¹³C + δ¹⁸O",
        },
        "interval_results": interval_results,
        "summary": summary,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

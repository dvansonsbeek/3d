#!/usr/bin/env python3
"""
405-KYR CYCLE EVOLUTION ACROSS THE CENOZOIC
=============================================

Follow-up to Test N (doc 18 §5.14). Asks three quantitative questions:

  (a) Does CENOGRID (Westerhold 2020) show a STATISTICALLY SIGNIFICANT
      beat at 405 kyr?  Specifically: Thomson MTM F-test at f = 1/405
      in 4-Myr sliding windows, report which are significant at α = 0.05.

  (b) Does LR04 (and the Cheng matched window) show comparable amplitude
      at 405 kyr? Match the 405-kyr amplitude using the same single-
      component OLS method in:
        • LR04 full record (0-5320 kyr)
        • LR04 post-MPT (0-1000 kyr)
        • LR04 pre-MPT (1200-5320 kyr)
        • Cheng matched window (0-640 kyr)
        • CENOGRID Eocene (33-50 Ma)
        • CENOGRID Oligocene (23-34 Ma)

  (c) Has the 405-kyr amplitude WEAKENED through the Cenozoic? Sliding-
      window amplitude scan with 4-Myr windows stepping every 1 Myr across
      the full 67-Myr CENOGRID record. Report amplitude vs age.

Output: data/milankovitch-8h-405k-evolution.json
"""

import json
from pathlib import Path

import numpy as np
from scipy.signal import detrend
from scipy.signal.windows import dpss
from scipy.stats import f as f_dist

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
CHENG_PATH = DATA_DIR / "cheng2016-speleothem.txt"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-evolution.json"

PERIOD_405 = 405.0
PERIOD_383 = 383.22   # nearest 8H integer divisor below the empirical 405-kyr line (8H/7)
DT_KYR = 5.0          # CENOGRID native ~2.8 kyr; bin to 5
DT_LR04 = 1.0
DT_CHENG = 1.0

NW = 3
K_TAPERS = 5
ALPHA = 0.05
F_CRIT = float(f_dist.ppf(1 - ALPHA, 2, 2 * K_TAPERS - 2))

WIN_LEN_CENO_KYR = 4000
WIN_STEP_CENO_KYR = 1000


# ─────────────────────────────────────────────────────────────────────────
# Data loaders
# ─────────────────────────────────────────────────────────────────────────

def load_two_col(path, skip_prefixes=("#", "/*", "Tuned", "Foram", "age", "time", "*"), col_idx=1):
    ages, vals = [], []
    with open(path) as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            if any(s.startswith(p) for p in skip_prefixes):
                continue
            if s.startswith("\t"):
                continue
            parts = s.split("\t") if "\t" in s else s.split()
            if len(parts) <= col_idx:
                continue
            try:
                a = float(parts[0]); v = float(parts[col_idx])
            except ValueError:
                continue
            ages.append(a); vals.append(v)
    return np.array(ages), np.array(vals)


def load_cenogrid():
    """CENOGRID: column 0 = time (Ma), column 8 = ISOBENd18oLOESSsmooth."""
    ages_ma, d18o = load_two_col(CENOGRID_PATH, col_idx=8)
    return ages_ma * 1000.0, d18o   # → kyr


def regrid_detrend(ages_kyr, vals, window, dt):
    lo, hi = window
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a, v = ages_kyr[mask], vals[mask]
    if len(a) < 10:
        return None, None
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt / 2, dt)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, (v_det - v_det.mean()) / v_det.std()


# ─────────────────────────────────────────────────────────────────────────
# Spectral tools
# ─────────────────────────────────────────────────────────────────────────

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
    U_e = U[even]
    Y_e = Y[even]
    denom_U2 = float(np.sum(np.abs(U_e) ** 2))
    if denom_U2 < 1e-30:
        return 0.0
    mu_hat = np.sum(U_e * Y_e) / denom_U2
    num = (K_TAPERS - 1) * (np.abs(mu_hat) ** 2) * denom_U2
    res = Y - mu_hat * U
    den = np.sum(np.abs(res) ** 2)
    if den < 1e-30:
        return float("inf")
    return float(num / den)


def p_from_f(f_val, K=K_TAPERS):
    if not np.isfinite(f_val):
        return 0.0
    return float(1.0 - f_dist.cdf(f_val, 2, 2 * K - 2))


# ─────────────────────────────────────────────────────────────────────────
# (a) MTM F-test for 405 in CENOGRID + LR04 + Cheng matched windows
# ─────────────────────────────────────────────────────────────────────────

def per_record_405_significance():
    print("\n" + "═" * 72)
    print("(a) MTM F-test for 405 kyr line in each record / interval")
    print("═" * 72)
    records = []

    # CENOGRID full
    ages_c, d18o_c = load_cenogrid()
    for name, win, dt in [
        ("CENOGRID full (0-67 Ma)",     (0, 67000),  DT_KYR),
        ("CENOGRID Icehouse (0-3 Ma)",  (0, 3000),   DT_KYR),
        ("CENOGRID Coolhouse (5-15 Ma)",(5000, 15000), DT_KYR),
        ("CENOGRID Warmhouse (33-50 Ma)",(33000, 50000), DT_KYR),
        ("CENOGRID Hothouse (50-66 Ma)",(50000, 66000), DT_KYR),
    ]:
        t, y = regrid_detrend(ages_c, d18o_c, win, dt)
        if t is None:
            continue
        f_405 = thomson_f(y, 1.0 / 405.0, dt)
        f_383 = thomson_f(y, 1.0 / 383.22, dt)
        amp_405 = single_amp(t, y, 405.0)
        amp_383 = single_amp(t, y, 383.22)
        records.append({"name": name, "n_samples": int(len(y)),
                         "F_at_405": f_405, "p_at_405": p_from_f(f_405),
                         "amp_at_405": amp_405,
                         "F_at_383": f_383, "p_at_383": p_from_f(f_383),
                         "amp_at_383": amp_383,
                         "significant_405": bool(f_405 > F_CRIT),
                         "significant_383": bool(f_383 > F_CRIT)})

    # LR04
    ages_l, d18o_l = load_two_col(LR04_PATH, skip_prefixes=("#",), col_idx=1)
    for name, win in [
        ("LR04 full (0-5320 kyr)", (0, 5320)),
        ("LR04 post-MPT (0-1000)",  (0, 1000)),
        ("LR04 pre-MPT (1200-5320)",(1200, 5320)),
    ]:
        t, y = regrid_detrend(ages_l, d18o_l, win, DT_LR04)
        f_405 = thomson_f(y, 1.0 / 405.0, DT_LR04)
        f_383 = thomson_f(y, 1.0 / 383.22, DT_LR04)
        amp_405 = single_amp(t, y, 405.0)
        amp_383 = single_amp(t, y, 383.22)
        records.append({"name": name, "n_samples": int(len(y)),
                         "F_at_405": f_405, "p_at_405": p_from_f(f_405),
                         "amp_at_405": amp_405,
                         "F_at_383": f_383, "p_at_383": p_from_f(f_383),
                         "amp_at_383": amp_383,
                         "significant_405": bool(f_405 > F_CRIT),
                         "significant_383": bool(f_383 > F_CRIT)})

    # Cheng matched window
    ages_ch, d18o_ch = load_two_col(CHENG_PATH, skip_prefixes=("#", "age"), col_idx=1)
    t, y = regrid_detrend(ages_ch, d18o_ch, (0, 640), DT_CHENG)
    f_405 = thomson_f(y, 1.0 / 405.0, DT_CHENG)
    f_383 = thomson_f(y, 1.0 / 383.22, DT_CHENG)
    records.append({"name": "Cheng2016 (0-640 kyr)", "n_samples": int(len(y)),
                     "F_at_405": f_405, "p_at_405": p_from_f(f_405),
                     "amp_at_405": single_amp(t, y, 405.0),
                     "F_at_383": f_383, "p_at_383": p_from_f(f_383),
                     "amp_at_383": single_amp(t, y, 383.22),
                     "significant_405": bool(f_405 > F_CRIT),
                     "significant_383": bool(f_383 > F_CRIT),
                     "note": "T=640 < 405×2, Rayleigh insufficient to resolve a single 405-kyr line"})

    print(f"  {'record':35s} {'samp':>5s} {'F@405':>7s} {'p@405':>7s} {'amp@405':>8s} {'sig?':>5s} {'amp@383':>8s} {'F@383':>7s}")
    print(f"  {'-'*35} {'-'*5} {'-'*7} {'-'*7} {'-'*8} {'-'*5} {'-'*8} {'-'*7}")
    for r in records:
        sig = "✓" if r["significant_405"] else " "
        print(f"  {r['name']:35s} {r['n_samples']:5d} {r['F_at_405']:7.2f} {r['p_at_405']:7.4f} "
              f"{r['amp_at_405']:8.4f} {sig:>5s} {r['amp_at_383']:8.4f} {r['F_at_383']:7.2f}")
    return records


# ─────────────────────────────────────────────────────────────────────────
# (c) 405-kyr amplitude evolution across the 67-Myr Cenozoic
# ─────────────────────────────────────────────────────────────────────────

def amplitude_evolution_cenogrid():
    print("\n" + "═" * 72)
    print("(c) 405-kyr amplitude evolution across CENOGRID (4-Myr sliding window)")
    print("═" * 72)
    ages, d18o = load_cenogrid()
    centers = []
    win = WIN_LEN_CENO_KYR
    step = WIN_STEP_CENO_KYR
    start = 0
    while start + win <= ages.max():
        centers.append(start + win / 2)
        start += step
    centers = np.array(centers)
    amps_405 = []
    amps_383 = []
    f_405 = []
    p_405 = []
    for c in centers:
        lo, hi = c - win / 2, c + win / 2
        t, y = regrid_detrend(ages, d18o, (lo, hi), DT_KYR)
        if t is None:
            amps_405.append(float("nan")); amps_383.append(float("nan"))
            f_405.append(float("nan")); p_405.append(float("nan")); continue
        amps_405.append(single_amp(t, y, 405.0))
        amps_383.append(single_amp(t, y, 383.22))
        fv = thomson_f(y, 1.0 / 405.0, DT_KYR)
        f_405.append(fv)
        p_405.append(p_from_f(fv))
    amps_405 = np.array(amps_405)
    amps_383 = np.array(amps_383)
    f_405 = np.array(f_405)
    p_405 = np.array(p_405)
    n_sig = int(np.sum(f_405 > F_CRIT))
    print(f"  {'center (Ma)':>11s} {'amp@405':>9s} {'amp@383':>9s} {'F@405':>7s} {'p@405':>7s} {'sig?':>5s}")
    for c, a, b, fv, pv in zip(centers, amps_405, amps_383, f_405, p_405):
        sig = "✓" if (np.isfinite(fv) and fv > F_CRIT) else " "
        print(f"  {c/1000:11.1f} {a:9.4f} {b:9.4f} {fv:7.2f} {pv:7.4f} {sig:>5s}")
    print(f"\n  windows with F@405 > {F_CRIT:.2f} (α=0.05 sig): {n_sig} / {len(centers)} = {n_sig/len(centers):.1%}")

    # compare icehouse (last 2 windows) vs hothouse (oldest 5)
    mean_recent = float(np.nanmean(amps_405[:5]))   # 0-5 Ma = post-MPT-ish
    mean_oldest = float(np.nanmean(amps_405[-5:]))  # 60+ Ma = hothouse
    mean_eocene = float(np.nanmean(amps_405[(centers >= 33000) & (centers <= 50000)]))
    print(f"\n  mean amp@405 in recent 5 windows (post-MPT-ish):  {mean_recent:.4f}")
    print(f"  mean amp@405 in oldest 5 windows (hothouse):       {mean_oldest:.4f}")
    print(f"  mean amp@405 in Eocene (33-50 Ma):                 {mean_eocene:.4f}")
    print(f"  ratio Eocene/recent:                                {mean_eocene/mean_recent if mean_recent>0 else float('inf'):.2f}×")

    return {
        "window_len_kyr": WIN_LEN_CENO_KYR,
        "window_step_kyr": WIN_STEP_CENO_KYR,
        "centers_kyr_BP": centers.tolist(),
        "amp_at_405": amps_405.tolist(),
        "amp_at_383": amps_383.tolist(),
        "F_at_405": f_405.tolist(),
        "p_at_405": p_405.tolist(),
        "n_significant_windows": n_sig,
        "n_total_windows": int(len(centers)),
        "mean_amp_recent_5": mean_recent,
        "mean_amp_oldest_5": mean_oldest,
        "mean_amp_eocene": mean_eocene,
        "ratio_eocene_over_recent": float(mean_eocene / mean_recent) if mean_recent > 0 else None,
    }


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("405-KYR CYCLE: SIGNIFICANCE + EVOLUTION ACROSS THE CENOZOIC")
    print("=" * 72)
    print(f"  Standard 405-kyr period: 405.0 kyr (Laskar g₂−g₅ Venus-Jupiter beat)")
    print(f"  Nearest 8H integer below: {PERIOD_383} kyr (8H/7)")
    print(f"  F critical (α=0.05, dof=(2,{2*K_TAPERS-2})): {F_CRIT:.3f}")

    a_results = per_record_405_significance()
    c_results = amplitude_evolution_cenogrid()

    out = {
        "meta": {
            "standard_405k_kyr": 405.0,
            "framework_383k_kyr": PERIOD_383,
            "physics": ("g₂ − g₅ Venus-Jupiter eccentricity precession beat. "
                         "g₂ = 7.453 arcsec/yr (Venus apsidal); "
                         "g₅ = 4.257 arcsec/yr (Jupiter apsidal); "
                         "g₂−g₅ = 3.196 arcsec/yr → 1,296,000/3.196 ≈ 405,506 yr"),
            "NW": NW, "K_tapers": K_TAPERS, "alpha": ALPHA, "F_critical": F_CRIT,
        },
        "a_per_record_significance": a_results,
        "c_amplitude_evolution_cenogrid": c_results,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()

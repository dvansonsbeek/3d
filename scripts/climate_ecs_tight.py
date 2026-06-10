#!/usr/bin/env python3
"""
Tightened ECS analysis — three improvements over climate_ecs_per_regime.py:

  (i)  FREQUENCY-DEPENDENT ICE FRACTION.  Replace constant f_ice=0.6 with
       per-L1-line ice fraction derived from Spratt & Lisiecki 2016 sea-level
       reconstruction divided by LR04 amplitude at each lattice integer.

  (iii) BOOTSTRAP per-regime.  Block-bootstrap each regime's fits → per-band
       ECS with confidence intervals (the original per-regime script was
       point-estimates only).

  (iv)  THREE REGIMES.  Add pre-iNHG (2.7-5.3 Ma) using LR04 × κ for T (Snyder
       GAST only covers to 2003 kyr).

Inputs
------
- LR04 δ¹⁸O stack (Lisiecki & Raymo 2005)
- Snyder 2016 GAST reconstruction
- EPICA CO₂ (Bereiter 2015), for post-MPT only
- CenCO2PIP CO₂ (Consortium 2023), for iNHG-MPT and pre-iNHG (100-kyr smoothed)
- Spratt & Lisiecki 2016 sea-level stack (NEW — for frequency-resolved ice fraction)

What this does NOT fix
----------------------
- (ii) less-smoothed deep-time CO₂ requires the Hönisch boron-isotope record
       which is not in-repo. iNHG-MPT and pre-iNHG ECS values are still biased
       HIGH by CenCO2PIP smoothing; the ice-share CONTRAST across regimes is
       robust but absolute ECS is not.
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (
    ClimateFormula, EIGHT_H, L1_LATTICE_INTEGERS,
    load_lr04, load_epica_co2, load_cenco2pip, preprocess,
)

# ── Constants ────────────────────────────────────────────────────────────────
ALPHA = 5.35
F_2X = ALPHA * math.log(2)

GHG_MULT = 0.5
SL_PER_PERMIL = 120.0       # m sea level per ‰ ice contribution
F_PER_M_SL = 0.04           # W/m²/m sea level
T_PER_PERMIL_LR04 = 2.5     # κ for pre-iNHG only (when Snyder not available)

N_BOOT = 200
BLOCK_KYR = 30
RNG_SEED = 20260605

SNYDER_FILE = Path("/home/dennis/code/3d/data/Snyder_Data_Figures/Source Data - Figure 1.xlsx")
SPRATT_FILE = Path("/home/dennis/code/3d/data/spratt-lisiecki-2016-sea-level.txt")
OUTPUT = Path("/home/dennis/code/3d/data/climate-ecs-tight.json")

BANDS = {
    "obliquity (35-50)":     [(35, 50)],
    "100-kyr band (75-130)": [(75, 130)],
    "precession (18-26)":    [(18, 26)],
}


# ── Loaders ──────────────────────────────────────────────────────────────────
def load_snyder():
    import openpyxl
    wb = openpyxl.load_workbook(SNYDER_FILE, data_only=True)
    ws = wb["1a-GAST reconstruction"]
    ages, t = [], []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < 2: continue
        if row[0] is None or row[2] is None: continue
        try:
            ages.append(float(row[0])); t.append(float(row[2]))
        except (TypeError, ValueError):
            continue
    wb.close()
    return np.asarray(ages), np.asarray(t)


def load_spratt_lisiecki():
    """Spratt & Lisiecki 2016 long PC1 (0-798 kyr, in meters above present).

    Returns (ages_kyr, sea_level_m).
    """
    ages, sl = [], []
    with open(SPRATT_FILE) as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"): continue
            parts = s.split()
            if len(parts) < 6: continue
            try:
                a = float(parts[0])
                v = parts[5]  # SeaLev_longPC1
                if v == "NaN": continue
                ages.append(a)
                sl.append(float(v))
            except ValueError:
                continue
    return np.asarray(ages), np.asarray(sl)


# ── Helpers ──────────────────────────────────────────────────────────────────
def fit_amps(t, y, regime):
    f = ClimateFormula()
    f.fit(t, y, regime=regime, normalize=True)
    std = f._fit_y_std
    return {n: {
        "amp": math.hypot(f._l1_a.get(n, 0.0), f._l1_b.get(n, 0.0)) * std,
        "phase": math.atan2(f._l1_b.get(n, 0.0), f._l1_a.get(n, 0.0)),
    } for n in L1_LATTICE_INTEGERS}


def block_idx(n, block_n, rng):
    if block_n >= n: block_n = n
    nb = (n + block_n - 1) // block_n
    starts = rng.integers(0, n - block_n + 1, size=nb)
    return np.concatenate([np.arange(s, s + block_n) for s in starts])[:n]


def boot_amps(t, y, regime, block_kyr, n_boot, rng):
    """Block bootstrap → per-L1 amplitude/phase distributions."""
    dt = float(np.median(np.diff(t)))
    block_n = max(1, int(round(block_kyr / dt)))
    out = {n: {"amp": [], "phase": []} for n in L1_LATTICE_INTEGERS}
    for _ in range(n_boot):
        idx = block_idx(len(t), block_n, rng)
        try:
            f = ClimateFormula()
            f.fit(t, y[idx], regime=regime, normalize=True)
            std = f._fit_y_std
            for n in L1_LATTICE_INTEGERS:
                a = f._l1_a.get(n, 0.0); b = f._l1_b.get(n, 0.0)
                out[n]["amp"].append(math.hypot(a, b) * std)
                out[n]["phase"].append(math.atan2(b, a))
        except Exception:
            continue
    return out


def wrap_pi(a):
    while a > math.pi: a -= 2 * math.pi
    while a <= -math.pi: a += 2 * math.pi
    return a


def pct(arr, q):
    return float(np.percentile(np.asarray(arr), q)) if len(arr) else float("nan")


def co2_forcing(d_co2, co2_ref):
    return ALPHA * math.log(1 + d_co2 / co2_ref) if co2_ref > 0 and (1 + d_co2/co2_ref) > 0 else 0.0


# ── Step 1: Frequency-dependent ice fraction ────────────────────────────────
def compute_freq_ice_fraction(t_lr, y_lr, t_sl, y_sl, win):
    """f_ice(n) = (sea_level_amp_n / SL_PER_PERMIL) / LR04_amp_n.

    Computed over the post-MPT window where Spratt & Lisiecki data exists.
    Assumed to apply across regimes (extrapolation).
    """
    tg_l, yg_l = preprocess(t_lr, y_lr, win, dt_kyr=1.0)
    tg_s, yg_s = preprocess(t_sl, y_sl, win, dt_kyr=1.0)

    amps_lr = fit_amps(tg_l, yg_l, win)
    amps_sl = fit_amps(tg_s, yg_s, win)

    f_ice = {}
    for n in L1_LATTICE_INTEGERS:
        a_lr = amps_lr[n]["amp"]      # ‰
        a_sl = amps_sl[n]["amp"]      # m
        if a_lr <= 1e-6:
            f_ice[n] = 0.5             # fallback
            continue
        # Convert SL amplitude to "δ¹⁸O ice-equivalent" using SL_PER_PERMIL
        a_sl_in_permil = a_sl / SL_PER_PERMIL
        f = a_sl_in_permil / a_lr
        # Clamp: f physically in [0, 1]; small > 1 likely from low-SNR LR04 line
        f_ice[n] = float(max(0.0, min(1.5, f)))
    return f_ice, amps_lr, amps_sl


# ── Step 2 + 3: Per-regime full-forcing ECS with bootstrap and freq-dep f_ice ──
def analyze_regime(label, snyder_t, snyder_y, lr_t, lr_y, co2_t, co2_y, win,
                   f_ice_per_line, use_snyder_T, rng, caveat=""):
    """One regime: full-forcing ECS with bootstrap + freq-dep ice fraction.

    use_snyder_T=True: use Snyder GAST directly as ΔT (in K)
    use_snyder_T=False: use LR04 × T_PER_PERMIL_LR04 (κ=2.5)
                       (for regimes where Snyder doesn't cover the window)
    """
    # Preprocess
    tg_l, yg_l = preprocess(lr_t, lr_y, win, dt_kyr=1.0)
    tg_c, yg_c = preprocess(co2_t, co2_y, win, dt_kyr=1.0)
    co2_ref = float(np.mean(co2_y[(co2_t >= win[0]) & (co2_t <= win[1])]))

    if use_snyder_T:
        # Snyder window may not fully cover regime — restrict accordingly
        mask = (snyder_t >= win[0]) & (snyder_t <= win[1])
        if mask.sum() < 50:
            print(f"     ✗ Snyder coverage insufficient for {label}; falling back to LR04 × κ")
            use_snyder_T = False
        else:
            sub_win = (max(win[0], float(snyder_t.min())),
                       min(win[1], float(snyder_t.max())))
            tg_s, yg_s = preprocess(snyder_t, snyder_y, sub_win, dt_kyr=1.0)

    # Baseline fits
    base_L = fit_amps(tg_l, yg_l, win)
    base_C = fit_amps(tg_c, yg_c, win)
    if use_snyder_T:
        base_S = fit_amps(tg_s, yg_s, sub_win)
    else:
        # Use LR04 amplitude × κ as ΔT proxy
        base_S = {n: {"amp": base_L[n]["amp"] * T_PER_PERMIL_LR04,
                      "phase": base_L[n]["phase"] + math.pi}  # invert: δ¹⁸O↑ → T↓
                   for n in L1_LATTICE_INTEGERS}

    # Bootstrap each fit
    boot_L = boot_amps(tg_l, yg_l, win, BLOCK_KYR, N_BOOT, rng)
    boot_C = boot_amps(tg_c, yg_c, win, BLOCK_KYR, N_BOOT, rng)
    if use_snyder_T:
        boot_S = boot_amps(tg_s, yg_s, sub_win, BLOCK_KYR, N_BOOT, rng)
    else:
        # Derive T bootstrap from LR04 bootstrap
        boot_S = {n: {
            "amp": [a * T_PER_PERMIL_LR04 for a in boot_L[n]["amp"]],
            "phase": [p + math.pi for p in boot_L[n]["phase"]],
        } for n in L1_LATTICE_INTEGERS}

    # Per-line ECS with bootstrap CI
    spectrum = []
    for n in L1_LATTICE_INTEGERS:
        aS = base_S[n]["amp"]; pS = base_S[n]["phase"]
        aL = base_L[n]["amp"]
        aC = base_C[n]["amp"]; pC = base_C[n]["phase"]
        if aS <= 0 or aL <= 0 or aC <= 0: continue
        # Phase concordance — Snyder/CO₂ both rise together
        # For LR04-derived T: it's already been inverted (φ + π), so check same way
        sep = math.degrees(min(abs(wrap_pi(pC - pS)), math.pi))
        if sep > 90: continue

        f_ice = f_ice_per_line.get(n, 0.5)
        dF_co2 = co2_forcing(aC, co2_ref)
        dF_ghg = GHG_MULT * dF_co2
        dF_ice = aL * f_ice * SL_PER_PERMIL * F_PER_M_SL
        dF_tot = dF_co2 + dF_ghg + dF_ice
        if dF_tot < 1e-9: continue
        ecs = aS * F_2X / dF_tot

        # Bootstrap ECS
        boot_ecs = []
        for at, al, ac in zip(boot_S[n]["amp"], boot_L[n]["amp"], boot_C[n]["amp"]):
            if at <= 0 or al <= 0 or ac <= 0: continue
            dFc = co2_forcing(ac, co2_ref)
            dFi = al * f_ice * SL_PER_PERMIL * F_PER_M_SL
            dFt = dFc * (1 + GHG_MULT) + dFi
            if dFt < 1e-9: continue
            v = at * F_2X / dFt
            if 0 < v < 50: boot_ecs.append(v)

        spectrum.append({
            "n": n,
            "period_kyr": EIGHT_H / n,
            "amp_T_K": aS,
            "amp_LR04_permil": aL,
            "amp_CO2_ppm": aC,
            "f_ice": f_ice,
            "dF_co2": dF_co2,
            "dF_ice": dF_ice,
            "dF_total": dF_tot,
            "ice_share": dF_ice / dF_tot,
            "ecs_K": ecs,
            "ecs_p5_K": pct(boot_ecs, 5),
            "ecs_p95_K": pct(boot_ecs, 95),
            "ecs_p25_K": pct(boot_ecs, 25),
            "ecs_p75_K": pct(boot_ecs, 75),
        })

    # Per-band stats
    band_stats = {}
    for bname, ranges in BANDS.items():
        rows = [r for r in spectrum
                if any(lo <= r["period_kyr"] <= hi for lo, hi in ranges)]
        if not rows:
            band_stats[bname] = None
            continue
        w = np.array([r["amp_T_K"] for r in rows])
        ecs_v = np.array([r["ecs_K"] for r in rows])
        ice_v = np.array([r["ice_share"] for r in rows])
        # Aggregate bootstrap: weighted mean of bootstrap CIs
        ecs_p5_v = np.array([r["ecs_p5_K"] for r in rows])
        ecs_p95_v = np.array([r["ecs_p95_K"] for r in rows])
        band_stats[bname] = {
            "n_lines": len(rows),
            "ecs_weighted_K": float(np.average(ecs_v, weights=w)),
            "ecs_median_K": float(np.median(ecs_v)),
            "ecs_p5_K": float(np.average(ecs_p5_v, weights=w)),
            "ecs_p95_K": float(np.average(ecs_p95_v, weights=w)),
            "ice_share_weighted": float(np.average(ice_v, weights=w)),
            "amp_T_weighted_K": float(np.average(w, weights=w)),
        }

    print(f"\n  ── {label} ──{caveat}")
    print(f"     {'Band':<25}{'n':>4}{'ECS':>20}{'ice%':>8}{'ΔT-amp':>10}")
    for bname, s in band_stats.items():
        if s:
            ci = f"[{s['ecs_p5_K']:.2f}-{s['ecs_p95_K']:.2f}]"
            print(f"     {bname:<25}{s['n_lines']:>4}"
                  f"  {s['ecs_weighted_K']:>5.2f} {ci:<14}"
                  f"{100*s['ice_share_weighted']:>7.0f}%"
                  f"{s['amp_T_weighted_K']:>10.3f}")

    return spectrum, band_stats


def main():
    rng = np.random.default_rng(RNG_SEED)
    print("=" * 100)
    print("  Tightened ECS analysis: freq-dep ice fraction + bootstrap per-regime + 3 regimes")
    print(f"  Bootstrap N = {N_BOOT}, block = {BLOCK_KYR} kyr")
    print("=" * 100)

    # Load proxies
    print("\n  Loading proxies ...")
    ages_s, t_s = load_snyder()
    t_lr, y_lr = load_lr04()
    t_e, y_e = load_epica_co2()
    t_cc, y_cc = load_cenco2pip()
    t_sl, y_sl = load_spratt_lisiecki()
    print(f"    LR04:          {t_lr.min():.0f}-{t_lr.max():.0f} kyr (n={len(t_lr)})")
    print(f"    Snyder GAST:   {ages_s.min():.0f}-{ages_s.max():.0f} kyr (n={len(ages_s)})")
    print(f"    EPICA CO₂:     {t_e.min():.0f}-{t_e.max():.0f} kyr (n={len(t_e)})")
    print(f"    CenCO2PIP CO₂: {t_cc.min():.0f}-{t_cc.max():.0f} kyr (n={len(t_cc)})")
    print(f"    Spratt-Lisiecki sea-level: {t_sl.min():.0f}-{t_sl.max():.0f} kyr (n={len(t_sl)})")

    # ── Step 1: Frequency-dependent ice fraction ──
    print("\n  Computing frequency-dependent ice fraction from Spratt-Lisiecki 2016 ...")
    f_ice_per_line, amps_lr_sl, amps_sl_sl = compute_freq_ice_fraction(
        t_lr, y_lr, t_sl, y_sl, (0, 798)
    )
    print(f"   {'n':>4}{'P (kyr)':>9}"
          f"{'LR04 (‰)':>11}{'SL (m)':>10}{'f_ice':>8}")
    # Print most relevant lines: top by LR04 amplitude in obliquity/100k/precession bands
    band_lines_show = sorted(
        [(n, amps_lr_sl[n]["amp"]) for n in L1_LATTICE_INTEGERS
         if 18 <= EIGHT_H/n <= 130],
        key=lambda x: -x[1]
    )[:10]
    for n, _ in band_lines_show:
        aL = amps_lr_sl[n]["amp"]
        aS = amps_sl_sl[n]["amp"]
        fi = f_ice_per_line[n]
        print(f"   {n:>4}{EIGHT_H/n:>9.1f}{aL:>11.4f}{aS:>10.3f}{fi:>8.2f}")

    # Show per-band mean f_ice
    print()
    for bname, ranges in BANDS.items():
        in_band = [(n, f_ice_per_line[n], amps_lr_sl[n]["amp"])
                   for n in L1_LATTICE_INTEGERS
                   if any(lo <= EIGHT_H/n <= hi for lo, hi in ranges)
                   and amps_lr_sl[n]["amp"] > 0.01]   # threshold low-SNR lines
        if in_band:
            fs = [x[1] for x in in_band]
            ws = [x[2] for x in in_band]
            mean_f = float(np.average(fs, weights=ws))
            print(f"   Band {bname:<25}: mean f_ice = {mean_f:.2f}  (n_lines = {len(in_band)})")

    # ── Step 2 + 3: Per-regime analysis with bootstrap ──
    print("\n" + "=" * 100)
    print("  Per-regime full-forcing ECS (freq-dep f_ice, bootstrap CIs)")
    print("=" * 100)

    # Post-MPT
    spec_post, bands_post = analyze_regime(
        "Post-MPT (0-800 kyr, Snyder T + EPICA CO₂)",
        ages_s, t_s, t_lr, y_lr, t_e, y_e, (0, 800),
        f_ice_per_line, use_snyder_T=True, rng=rng,
    )

    # iNHG-MPT
    spec_inhg, bands_inhg = analyze_regime(
        "iNHG-MPT (1000-2000 kyr, Snyder T + CenCO2PIP CO₂ ⚠SMOOTHED)",
        ages_s, t_s, t_lr, y_lr, t_cc, y_cc, (1000, 2000),
        f_ice_per_line, use_snyder_T=True, rng=rng,
        caveat="  ⚠ CenCO2PIP 100-kyr smoothing biases ECS HIGH at short bands",
    )

    # Pre-iNHG
    spec_pre, bands_pre = analyze_regime(
        "Pre-iNHG (2700-5300 kyr, LR04 × κ=2.5 + CenCO2PIP CO₂ ⚠SMOOTHED + κ)",
        ages_s, t_s, t_lr, y_lr, t_cc, y_cc, (2700, 5300),
        f_ice_per_line, use_snyder_T=False, rng=rng,
        caveat="  ⚠ No Snyder; ΔT from LR04 × κ=2.5 K/‰",
    )

    # ── Cross-regime comparison ──
    print("\n" + "=" * 100)
    print("  CROSS-REGIME COMPARISON")
    print("=" * 100)
    print()
    print(f"  {'Band':<25}{'post-MPT':>25}{'iNHG-MPT':>25}{'pre-iNHG':>25}")
    print(f"  {'':<25}{'ECS / ice% / ΔT':>25}{'ECS / ice% / ΔT':>25}{'ECS / ice% / ΔT':>25}")
    for bname in BANDS:
        cells = []
        for bands in [bands_post, bands_inhg, bands_pre]:
            s = bands.get(bname)
            if s:
                cells.append(f"{s['ecs_weighted_K']:.1f}K {100*s['ice_share_weighted']:.0f}% {s['amp_T_weighted_K']:.2f}K")
            else:
                cells.append("—")
        print(f"  {bname:<25}{cells[0]:>25}{cells[1]:>25}{cells[2]:>25}")

    print()
    print("  ── Ice-share contrast across MPT and across iNHG ──")
    print(f"     {'Band':<25}{'post-MPT':>10}{'iNHG-MPT':>12}{'pre-iNHG':>12}"
          f"{'Δ(iNHG-post)':>16}{'Δ(pre-iNHG)':>16}")
    for bname in BANDS:
        p = bands_post.get(bname); i = bands_inhg.get(bname); pre = bands_pre.get(bname)
        if not (p and i and pre): continue
        pp = 100*p["ice_share_weighted"]
        ii = 100*i["ice_share_weighted"]
        prep = 100*pre["ice_share_weighted"]
        d_i = ii - pp
        d_pre = prep - ii
        print(f"     {bname:<25}"
              f"{pp:>9.0f}%{ii:>11.0f}%{prep:>11.0f}%"
              f"{d_i:>+15.0f}pp{d_pre:>+15.0f}pp")

    # Output
    OUTPUT.write_text(json.dumps({
        "method": (
            f"Tightened analysis: freq-dep f_ice from Spratt&Lisiecki 2016, "
            f"bootstrap N={N_BOOT}, 3 regimes. "
            "Pre-iNHG uses LR04 × κ=2.5 (no Snyder coverage) and CenCO2PIP CO₂ (smoothed)."
        ),
        "constants": {
            "ghg_multiplier": GHG_MULT,
            "sl_per_permil_m": SL_PER_PERMIL,
            "forcing_per_m_sl_Wm2_per_m": F_PER_M_SL,
            "t_per_permil_lr04_K": T_PER_PERMIL_LR04,
        },
        "freq_dep_ice_fraction": {str(n): f_ice_per_line[n] for n in L1_LATTICE_INTEGERS},
        "regimes": {
            "post_mpt": {"window_kyr": [0, 800], "by_band": bands_post, "spectrum": spec_post},
            "inhg_mpt": {
                "window_kyr": [1000, 2000],
                "caveat": "CenCO2PIP smoothed → ECS biased HIGH at short bands",
                "by_band": bands_inhg, "spectrum": spec_inhg,
            },
            "pre_inhg": {
                "window_kyr": [2700, 5300],
                "caveat": "LR04 × κ=2.5 (Snyder unavailable); CenCO2PIP smoothed",
                "by_band": bands_pre, "spectrum": spec_pre,
            },
        },
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

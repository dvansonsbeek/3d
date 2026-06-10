#!/usr/bin/env python3
"""
Per-regime full-forcing ECS: post-MPT vs iNHG-MPT.

Hypothesis
----------
The MPT (~1 Ma) shifted climate from the 41-kyr-dominated "obliquity world" to
the 100-kyr-dominated "ice-sheet hysteresis world." If our framework's
ice-albedo decomposition is meaningful, we should see:

  Post-MPT  (0-1 Ma):    HIGH ice-share at 100-kyr band, moderate at obliquity
  iNHG-MPT  (1-2 Ma):    HIGH ice-share at OBLIQUITY band, lower at 100-kyr

This is the Willeit-2019 "ice-sheet saturation silences the obliquity pacemaker"
prediction, but quantified frequency-by-frequency from independent proxy data.

Data caveats
------------
For post-MPT we use Snyder + LR04 + EPICA (high-quality high-resolution).
For iNHG-MPT we need:
  - T: Snyder GAST (covers to 2003 kyr — limits us to 1000-2000)
  - Ice: LR04 (covers all)
  - CO₂: CenCO2PIP (covers all, but 100-kyr-smoothed → CO₂ amplitudes
    are attenuated at short periods, biasing ECS HIGH at obliquity/precession
    bands. Use with caveat.)

We restrict iNHG-MPT to 1000-2000 kyr for matched Snyder coverage.
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

ALPHA = 5.35
F_2X = ALPHA * math.log(2)

# Default forcing constants (Monte Carlo-validated)
ICE_FRACTION = 0.6
SL_PER_PERMIL = 120.0
F_PER_M_SL = 0.04
GHG_MULT = 0.5

SNYDER_FILE = Path("/home/dennis/code/3d/data/Snyder_Data_Figures/Source Data - Figure 1.xlsx")
OUTPUT = Path("/home/dennis/code/3d/data/climate-ecs-per-regime.json")

BANDS = {
    "obliquity (35-50)":     [(35, 50)],
    "100-kyr band (75-130)": [(75, 130)],
    "precession (18-26)":    [(18, 26)],
}


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


def fit_amps(t, y, regime):
    f = ClimateFormula()
    f.fit(t, y, regime=regime, normalize=True)
    std = f._fit_y_std
    out = {}
    for n in L1_LATTICE_INTEGERS:
        a = f._l1_a.get(n, 0.0); b = f._l1_b.get(n, 0.0)
        out[n] = {
            "amp": math.hypot(a, b) * std,
            "phase": math.atan2(b, a),
        }
    return out


def wrap_pi(a):
    while a > math.pi: a -= 2 * math.pi
    while a <= -math.pi: a += 2 * math.pi
    return a


def analyze_regime(label, t_snyder, y_snyder, t_lr, y_lr, t_co2, y_co2, win, co2_caveat=""):
    """Full-forcing ECS analysis on one regime window."""
    tg_s, yg_s = preprocess(t_snyder, y_snyder, win, dt_kyr=1.0)
    tg_l, yg_l = preprocess(t_lr, y_lr, win, dt_kyr=1.0)
    tg_c, yg_c = preprocess(t_co2, y_co2, win, dt_kyr=1.0)
    co2_ref = float(np.mean(y_co2[(t_co2 >= win[0]) & (t_co2 <= win[1])]))

    amps_S = fit_amps(tg_s, yg_s, win)
    amps_L = fit_amps(tg_l, yg_l, win)
    # CO₂ regime: pass as tuple
    amps_E = fit_amps(tg_c, yg_c, win)

    print(f"\n  ── {label} ─────────────────────────────────────────────────")
    print(f"     window: {win} kyr,  CO₂_ref: {co2_ref:.1f} ppm{co2_caveat}")
    spectrum = []
    for n in L1_LATTICE_INTEGERS:
        aS = amps_S[n]["amp"]; pS = amps_S[n]["phase"]
        aL = amps_L[n]["amp"]
        aE = amps_E[n]["amp"]; pE = amps_E[n]["phase"]
        if aS <= 0 or aE <= 0 or aL <= 0: continue
        sep = math.degrees(min(abs(wrap_pi(pE - pS)), math.pi))
        if sep > 90: continue  # require concordance

        dF_co2 = ALPHA * math.log(1 + aE / co2_ref)
        dF_ghg = GHG_MULT * dF_co2
        dF_ice = aL * ICE_FRACTION * SL_PER_PERMIL * F_PER_M_SL
        dF_tot = dF_co2 + dF_ghg + dF_ice
        if dF_tot < 1e-9: continue

        ecs_full = aS * F_2X / dF_tot
        ice_share = dF_ice / dF_tot
        spectrum.append({
            "n": n, "period_kyr": EIGHT_H / n,
            "amp_T_K": aS, "amp_LR04": aL, "amp_CO2": aE,
            "dF_co2": dF_co2, "dF_ice": dF_ice, "dF_total": dF_tot,
            "ice_share": ice_share, "ecs_full_K": ecs_full,
        })

    # Per-band stats
    band_stats = {}
    for bname, ranges in BANDS.items():
        rows = [r for r in spectrum
                if any(lo <= r["period_kyr"] <= hi for lo, hi in ranges)]
        if not rows:
            band_stats[bname] = None
            continue
        ecs_v = np.array([r["ecs_full_K"] for r in rows])
        ice_v = np.array([r["ice_share"] for r in rows])
        w = np.array([r["amp_T_K"] for r in rows])
        band_stats[bname] = {
            "n_lines": len(rows),
            "ecs_weighted_K": float(np.average(ecs_v, weights=w)),
            "ecs_median_K": float(np.median(ecs_v)),
            "ice_share_weighted": float(np.average(ice_v, weights=w)),
            "ice_share_median": float(np.median(ice_v)),
            "amp_T_weighted_K": float(np.average(w, weights=w)),
        }

    # Print band summary
    print(f"     {'Band':<25}{'n':>4}{'ECS':>9}{'ice%':>9}{'ΔT-amp':>10}")
    for bname, s in band_stats.items():
        if s:
            print(f"     {bname:<25}{s['n_lines']:>4}"
                  f"{s['ecs_weighted_K']:>9.2f}"
                  f"{100*s['ice_share_weighted']:>8.0f}%"
                  f"{s['amp_T_weighted_K']:>10.3f}")

    return spectrum, band_stats


def main():
    print("=" * 92)
    print("  Per-regime full-forcing ECS:  post-MPT  vs  iNHG-MPT  (0-1 Ma vs 1-2 Ma)")
    print(f"  Calibration:  ICE_FRACTION={ICE_FRACTION}, SL/‰={SL_PER_PERMIL}, "
          f"F/m_SL={F_PER_M_SL}, GHG_mult={GHG_MULT}")
    print("=" * 92)

    print("\n  Loading proxies ...")
    ages_s, t_s = load_snyder()
    t_lr, y_lr = load_lr04()
    t_e, y_e = load_epica_co2()
    t_cc, y_cc = load_cenco2pip()
    print(f"    Snyder GAST: {ages_s.min():.0f}-{ages_s.max():.0f} kyr (n={len(ages_s)})")
    print(f"    LR04:        {t_lr.min():.0f}-{t_lr.max():.0f} kyr (n={len(t_lr)})")
    print(f"    EPICA CO₂:   {t_e.min():.0f}-{t_e.max():.0f} kyr (n={len(t_e)})")
    print(f"    CenCO2PIP:   {t_cc.min():.0f}-{t_cc.max():.0f} kyr (n={len(t_cc)})")

    # Analyze post-MPT (0-800 kyr — EPICA coverage)
    spec_post, bands_post = analyze_regime(
        "Post-MPT  (0-800 kyr, EPICA CO₂)",
        ages_s, t_s, t_lr, y_lr, t_e, y_e,
        (0, 800),
    )

    # Analyze iNHG-MPT (1000-2000 kyr — Snyder coverage)
    spec_inhg, bands_inhg = analyze_regime(
        "iNHG-MPT  (1000-2000 kyr, CenCO2PIP — SMOOTHED)",
        ages_s, t_s, t_lr, y_lr, t_cc, y_cc,
        (1000, 2000),
        co2_caveat="  ⚠ CenCO2PIP is 100-kyr-smoothed: short-period CO₂ amps underestimated → ECS biased HIGH at obliquity/precession bands.",
    )

    # ── Compare ──
    print()
    print("=" * 92)
    print("  POST-MPT vs iNHG-MPT  comparison")
    print("=" * 92)
    print()
    print(f"  {'Band':<25}"
          f"{'post-MPT':>23}{'iNHG-MPT':>23}{'ice-share Δ':>16}")
    print(f"  {'':<25}"
          f"{'ECS / ice% / ΔT':>23}{'ECS / ice% / ΔT':>23}")
    for bname in BANDS:
        p = bands_post.get(bname); i = bands_inhg.get(bname)
        if not (p and i): continue
        ps = f"{p['ecs_weighted_K']:.2f}K {100*p['ice_share_weighted']:.0f}% {p['amp_T_weighted_K']:.2f}K"
        is_ = f"{i['ecs_weighted_K']:.2f}K {100*i['ice_share_weighted']:.0f}% {i['amp_T_weighted_K']:.2f}K"
        di = (i['ice_share_weighted'] - p['ice_share_weighted']) * 100
        di_str = f"{di:+.0f} pp"
        print(f"  {bname:<25}{ps:>23}{is_:>23}{di_str:>16}")

    # ── Test the Willeit-2019 prediction explicitly ──
    print()
    print("  ── Willeit-2019 hypothesis test ──")
    print()
    print("    Prediction: ice-share at 100-kyr LARGER post-MPT (ice-sheet hysteresis on)")
    print("                ice-share at obliquity LARGER iNHG-MPT (obliquity pacemaker dominant)")
    p_100 = bands_post["100-kyr band (75-130)"]["ice_share_weighted"] if bands_post.get("100-kyr band (75-130)") else None
    i_100 = bands_inhg["100-kyr band (75-130)"]["ice_share_weighted"] if bands_inhg.get("100-kyr band (75-130)") else None
    p_ob = bands_post["obliquity (35-50)"]["ice_share_weighted"] if bands_post.get("obliquity (35-50)") else None
    i_ob = bands_inhg["obliquity (35-50)"]["ice_share_weighted"] if bands_inhg.get("obliquity (35-50)") else None

    if p_100 is not None and i_100 is not None:
        d100 = (p_100 - i_100) * 100
        v100 = "✓ confirmed" if d100 > 0 else "✗ refuted (or no effect)"
        print(f"    100-kyr ice-share: post-MPT {100*p_100:.0f}% vs iNHG-MPT {100*i_100:.0f}%  "
              f"(post − iNHG = {d100:+.0f} pp)  {v100}")
    if p_ob is not None and i_ob is not None:
        dob = (i_ob - p_ob) * 100
        vob = "✓ confirmed" if dob > 0 else "✗ refuted (or no effect)"
        print(f"    Obliquity ice-share: post-MPT {100*p_ob:.0f}% vs iNHG-MPT {100*i_ob:.0f}%  "
              f"(iNHG − post = {dob:+.0f} pp)  {vob}")

    # ── MPT amplitude shift (separate from forcing shift) ──
    p_ob_amp = bands_post["obliquity (35-50)"]["amp_T_weighted_K"] if bands_post.get("obliquity (35-50)") else None
    i_ob_amp = bands_inhg["obliquity (35-50)"]["amp_T_weighted_K"] if bands_inhg.get("obliquity (35-50)") else None
    p_100_amp = bands_post["100-kyr band (75-130)"]["amp_T_weighted_K"] if bands_post.get("100-kyr band (75-130)") else None
    i_100_amp = bands_inhg["100-kyr band (75-130)"]["amp_T_weighted_K"] if bands_inhg.get("100-kyr band (75-130)") else None

    print()
    print("  ── ΔT amplitude shift across MPT ──")
    if p_ob_amp and i_ob_amp:
        ratio_ob = p_ob_amp / i_ob_amp
        print(f"    Obliquity ΔT: post-MPT {p_ob_amp:.3f} K / iNHG-MPT {i_ob_amp:.3f} K  "
              f"(ratio {ratio_ob:.2f}×)")
    if p_100_amp and i_100_amp:
        ratio_100 = p_100_amp / i_100_amp
        print(f"    100-kyr ΔT:   post-MPT {p_100_amp:.3f} K / iNHG-MPT {i_100_amp:.3f} K  "
              f"(ratio {ratio_100:.2f}×)")
    # Doc 92 published ratios: 41-kyr 0.72×, 100-kyr 1.64×

    # Output
    OUTPUT.write_text(json.dumps({
        "method": "Per-regime full-forcing ECS using Snyder GAST + LR04 + (EPICA or CenCO2PIP)",
        "constants": {
            "ice_fraction": ICE_FRACTION,
            "sl_per_permil_m": SL_PER_PERMIL,
            "forcing_per_m_sl_Wm2_per_m": F_PER_M_SL,
            "ghg_multiplier": GHG_MULT,
        },
        "post_mpt": {"window_kyr": [0, 800], "by_band": bands_post, "spectrum": spec_post},
        "inhg_mpt": {
            "window_kyr": [1000, 2000],
            "co2_proxy_caveat": "CenCO2PIP is 100-kyr-smoothed; ECS biased HIGH at obliquity/precession bands",
            "by_band": bands_inhg,
            "spectrum": spec_inhg,
        },
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

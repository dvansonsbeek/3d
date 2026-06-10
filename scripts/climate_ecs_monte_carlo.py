#!/usr/bin/env python3
"""
Monte Carlo over forcing-calibration constants → marginalized ECS distribution.

Four calibration constants with literature-justified uncertainty ranges:
  - ICE_FRACTION_OF_LR04 : 0.5-0.7   (Bintanja & van de Wal 2008)
  - SEA_LEVEL_PER_PERMIL : 100-140   (Waelbroeck 2002, Spratt & Lisiecki 2016)
  - FORCING_PER_M_SL     : 0.030-0.050  (Hansen 2013)
  - OTHER_GHG_MULTIPLIER : 0.4-0.6   (Hansen 2013 ratio CH4+N2O+H2O / CO2)

We sample each uniformly within its range (N=5000), compute ECS for each draw,
report marginalized distributions per band.

This addresses the dominant systematic in climate_ecs_full_forcing.py: the
4.13 K at 100-kyr band relies on specific choices of these four constants.

The aim is to produce defensible CIs that account for both bootstrap (already
done) AND calibration uncertainty.
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
    ClimateFormula, EIGHT_H, L1_LATTICE_INTEGERS, REGIME_WINDOWS,
    load_lr04, load_epica_co2, preprocess,
)

ALPHA = 5.35
F_2X = ALPHA * math.log(2)

# Calibration uncertainty bounds (uniform priors)
RANGES = {
    "ice_fraction":      (0.5, 0.7),
    "sl_per_permil_m":   (100.0, 140.0),
    "forcing_per_m_sl":  (0.030, 0.050),
    "other_ghg_mult":    (0.4, 0.6),
}

N_MC = 5000
SNYDER_FILE = Path("/home/dennis/code/3d/data/Snyder_Data_Figures/Source Data - Figure 1.xlsx")
OUTPUT = Path("/home/dennis/code/3d/data/climate-ecs-monte-carlo.json")

BANDS = {
    "obliquity (35-50)":     [(35, 50)],
    "100-kyr band (75-130)": [(75, 130)],
    "precession (18-26)":    [(18, 26)],
    "long (>130)":           [(130, 999)],
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


def main():
    rng = np.random.default_rng(20260605)

    print("=" * 96)
    print("  Monte Carlo over forcing-calibration constants")
    print(f"  N = {N_MC} draws, uniform priors on:")
    for k, (lo, hi) in RANGES.items():
        print(f"     {k:<22}: [{lo}, {hi}]")
    print("=" * 96)

    # Load and fit each proxy (baseline only — MC is over calibration, not fit)
    print("\n  Loading & fitting baselines ...")
    ages_s, t_s = load_snyder()
    t_lr, y_lr = load_lr04()
    t_e,  y_e  = load_epica_co2()
    win = (0, 800)
    tg_s, yg_s = preprocess(ages_s, t_s, win, dt_kyr=1.0)
    tg_l, yg_l = preprocess(t_lr,  y_lr, win, dt_kyr=1.0)
    tg_e, yg_e = preprocess(t_e,   y_e,  win, dt_kyr=1.0)
    co2_ref = float(np.mean(y_e[(t_e >= 0) & (t_e <= 800)]))

    amps_S = fit_amps(tg_s, yg_s, win)
    amps_L = fit_amps(tg_l, yg_l, win)
    amps_E = fit_amps(tg_e, yg_e, "epica-co2")
    print(f"    CO₂_ref = {co2_ref:.2f} ppm")

    # Pre-compute per-line phase concordance (independent of calibration)
    line_meta = {}
    for n in L1_LATTICE_INTEGERS:
        aS = amps_S[n]["amp"]; aL = amps_L[n]["amp"]; aE = amps_E[n]["amp"]
        if aS <= 0 or aE <= 0 or aL <= 0: continue
        pS = amps_S[n]["phase"]; pE = amps_E[n]["phase"]
        sep = math.degrees(min(abs(wrap_pi(pE - pS)), math.pi))
        line_meta[n] = {
            "period_kyr": EIGHT_H / n,
            "amp_T_K": aS,
            "amp_LR04": aL,
            "amp_CO2": aE,
            "phase_concordant": sep <= 90,
        }

    # Run MC
    print(f"\n  Running {N_MC} Monte Carlo draws ...", flush=True)
    # Pre-sample all draws
    draws = {
        k: rng.uniform(lo, hi, size=N_MC) for k, (lo, hi) in RANGES.items()
    }

    # For each draw, compute ECS per line and per-band aggregates
    band_ecs = {bname: [] for bname in BANDS}      # per-band ΔT-weighted ECS
    overall_ecs = []                                # overall ΔT-weighted ECS

    for draw_i in range(N_MC):
        ice_f = draws["ice_fraction"][draw_i]
        sl_pp = draws["sl_per_permil_m"][draw_i]
        f_msl = draws["forcing_per_m_sl"][draw_i]
        ghg_m = draws["other_ghg_mult"][draw_i]

        # Per-line ECS for this draw
        line_ecs = {}    # n -> ecs
        for n, m in line_meta.items():
            if not m["phase_concordant"]: continue
            dF_co2 = ALPHA * math.log(1 + m["amp_CO2"] / co2_ref)
            dF_ghg = ghg_m * dF_co2
            dF_ice = m["amp_LR04"] * ice_f * sl_pp * f_msl
            dF_tot = dF_co2 + dF_ghg + dF_ice
            if dF_tot < 1e-9: continue
            ecs = m["amp_T_K"] * F_2X / dF_tot
            if not (0 < ecs < 50): continue
            line_ecs[n] = ecs

        # Aggregate per band (ΔT-weighted)
        for bname, ranges in BANDS.items():
            rows_in_band = [(line_meta[n]["amp_T_K"], ecs)
                            for n, ecs in line_ecs.items()
                            if any(lo <= line_meta[n]["period_kyr"] <= hi
                                   for lo, hi in ranges)]
            if rows_in_band:
                ws = np.array([w for w, _ in rows_in_band])
                es = np.array([e for _, e in rows_in_band])
                band_ecs[bname].append(float(np.average(es, weights=ws)))

        # Overall (all concordant lines)
        if line_ecs:
            ws = np.array([line_meta[n]["amp_T_K"] for n in line_ecs])
            es = np.array(list(line_ecs.values()))
            overall_ecs.append(float(np.average(es, weights=ws)))

    print(f"  Done ({len(overall_ecs)} valid draws).\n")

    # Report
    def summarize(arr, label):
        if not arr:
            return None
        a = np.asarray(arr)
        return {
            "label": label,
            "n_draws": int(len(a)),
            "mean": float(np.mean(a)),
            "median": float(np.median(a)),
            "p5": float(np.percentile(a, 5)),
            "p95": float(np.percentile(a, 95)),
            "p25": float(np.percentile(a, 25)),
            "p75": float(np.percentile(a, 75)),
            "std": float(np.std(a)),
        }

    summaries = {bname: summarize(arr, bname) for bname, arr in band_ecs.items()}
    overall_summary = summarize(overall_ecs, "overall")

    print("  ── ECS marginalized over calibration constants ──")
    print(f"  {'Band':<25}{'median':>9}{'mean':>8}{'90% CI':>20}{'50% CI':>20}")
    for bname, s in summaries.items():
        if s:
            ci90 = f"[{s['p5']:.2f}, {s['p95']:.2f}]"
            ci50 = f"[{s['p25']:.2f}, {s['p75']:.2f}]"
            print(f"  {bname:<25}{s['median']:>9.2f}{s['mean']:>8.2f}{ci90:>20}{ci50:>20}")
    if overall_summary:
        s = overall_summary
        ci90 = f"[{s['p5']:.2f}, {s['p95']:.2f}]"
        ci50 = f"[{s['p25']:.2f}, {s['p75']:.2f}]"
        print(f"  {'OVERALL (ΔT-weighted)':<25}{s['median']:>9.2f}{s['mean']:>8.2f}{ci90:>20}{ci50:>20}")

    print()
    print("  Reference values:")
    print("    IPCC AR6 Charney      : 2.5 – 4.0 K (best 3.0)")
    print("    Hansen 2013 Charney   : 3.0 ± 0.5 K")
    print("    PALAEOSENS            : 3.0 – 4.5 K")
    print("    Sherwood et al. 2020  : 2.6 – 3.9 K (66% CI), best 3.1")

    # Output
    OUTPUT.write_text(json.dumps({
        "method": (
            f"Monte Carlo (N={N_MC}) over 4 forcing-calibration constants "
            "with uniform priors. Per draw: full-forcing ECS at each L1 line, "
            "then ΔT-weighted aggregation per band."
        ),
        "n_draws": N_MC,
        "calibration_priors": {k: list(v) for k, v in RANGES.items()},
        "co2_ref_ppm": co2_ref,
        "by_band": summaries,
        "overall": overall_summary,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()

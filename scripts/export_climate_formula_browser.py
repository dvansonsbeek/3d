#!/usr/bin/env python3
"""
EXPORT CLIMATE FORMULA COEFFICIENTS FOR BROWSER MODAL
======================================================

Generates `public/input/climate-formula-coefficients.json`, a compact
browser-ready coefficient dump for the "Climate Formula Explorer" modal
in src/script.js.

For each regime the modal needs, this script:
  1. Loads the source record (LR04 or CENOGRID)
  2. Computes the per-window linear trend (for de-normalization)
  3. Fits the L1+L2+L3 climate formula via ClimateFormula.fit()
  4. Packs intercept + L1/L2/L3 coefficients + normalization + R² breakdown

The modal can then call:
    y_normalized = intercept + Σ L1 + Σ L2 + Σ L3
    y_predicted_raw = y_normalized * y_std + y_mean
                    + trend_slope * t_kyr + trend_intercept

Regimes exported:
  • lr04-post-mpt  — for tabs: Last 200k / Post-MPT / Post-MPT ext / Forward
  • lr04-inhg-mpt  — for stitched Full LR04 between iNHG and MPT (1.0–2.7 Ma)
  • lr04-pre-inhg  — for stitched Full LR04 before iNHG (2.7–5.3 Ma)
  • lr04-full      — joint fit reference (kept for comparison; not used for
                      the stitched curve)
  • cenogrid-d18o  — for tab: CENOGRID δ¹⁸O (67M)
  • cenogrid-d13c  — for tab: CENOGRID δ¹³C (67M, proxy subtoggle)

The Full LR04 tab uses a stitched curve that routes through the matching
regime block (post-mpt / inhg-mpt / pre-inhg) per time t, so amplitudes
match each regime instead of being diluted by a 5.3-Myr joint fit.

Output: public/input/climate-formula-coefficients.json
Run:    python3 scripts/export_climate_formula_browser.py
"""

import json
from pathlib import Path

import numpy as np

# Re-use loaders + ClimateFormula + L1/L2 constants from the canonical formula
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from milankovitch_climate_formula import (  # noqa: E402
    ClimateFormula,
    load_lr04,
    load_cenogrid,
    load_epica_co2,
    load_cenco2pip,
    L1_LATTICE_INTEGERS,
    L1_LABELS,
    L2_THERMOSTAT_FAMILY,
    L3_TRANSITIONS_MA,
    EIGHT_H,
    H as H_KYR,
)

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_PATH = SCRIPT_DIR.parent / "public" / "input" / "climate-formula-coefficients.json"


def preprocess_with_trend(ages, vals, window, dt_kyr):
    """Like preprocess() in the canonical formula, but also returns the
    linear-trend slope/intercept used so they can be stored for de-normalization."""
    lo, hi = window
    mask = (ages >= lo) & (ages <= hi)
    a = ages[mask]; v = vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt_kyr / 2, dt_kyr)
    v_grid = np.interp(grid, a, v)
    # Linear trend on the gridded data (this is what scipy.signal.detrend would remove)
    slope, intercept = np.polyfit(grid, v_grid, 1)
    v_det = v_grid - (slope * grid + intercept)
    return grid, v_det, float(slope), float(intercept)


def fit_and_pack(t_grid, y_detrended, regime_name):
    """Fit a ClimateFormula on (t, y_detrended) and pack browser-ready coefficient block."""
    f = ClimateFormula()
    summary = f.fit(t_grid, y_detrended, regime=regime_name)
    # NOTE: fit() does its own normalization internally; we read _fit_y_mean / _fit_y_std
    return f, summary


def pack_block(f, summary, slope_raw, intercept_raw, label):
    """Return browser-ready dict for one regime."""
    return {
        "label": label,
        "regime": summary.regime,
        "window_kyr": list(summary.window_kyr),
        "n_samples": summary.n_samples,
        "intercept": f._intercept,
        "L1": [
            {"n": int(n), "a": f._l1_a[n], "b": f._l1_b[n]}
            for n in L1_LATTICE_INTEGERS
        ],
        "L2": [
            {"p_kyr": L2_THERMOSTAT_FAMILY[lab], "label": lab,
             "a": f._l2_a[lab], "b": f._l2_b[lab]}
            for lab in f.l2_labels
        ],
        "L3": [
            {"label": lab,
             "t_kyr": f._l3_transitions_kyr[lab],
             "beta": beta}
            for lab, beta in f._l3_betas.items()
        ],
        "denormalization": {
            "y_mean": f._fit_y_mean,
            "y_std": f._fit_y_std,
            "trend_slope": slope_raw,
            "trend_intercept": intercept_raw,
        },
        "r2": {
            "l1_only": summary.r2_l1_only,
            "l1_l2": summary.r2_l1_l2,
            "l1_l2_l3": summary.r2_l1_l2_l3,
            "delta_l2": summary.delta_r2_l2,
            "delta_l3": summary.delta_r2_l3,
        },
    }


def main():
    print("=" * 78)
    print("EXPORTING CLIMATE-FORMULA COEFFICIENTS FOR BROWSER MODAL")
    print("=" * 78)

    # ─── LR04 fits ───
    print("\nLR04 source data...")
    ages_lr, vals_lr = load_lr04()
    print(f"  {len(ages_lr)} samples")

    print("\n[1/6] Fitting LR04 post-MPT (0-1000 kyr)...")
    t1, y1, s1, i1 = preprocess_with_trend(ages_lr, vals_lr, (0, 1000), 1.0)
    f1, sum1 = fit_and_pack(t1, y1, "post-mpt")
    block_post_mpt = pack_block(f1, sum1, s1, i1, "LR04 post-MPT")
    print(f"  R² L1_only={sum1.r2_l1_only:.4f}, +L2={sum1.delta_r2_l2:+.4f}, "
          f"+L3={sum1.delta_r2_l3:+.4f}, total={sum1.r2_l1_l2_l3:.4f}")

    print("\n[2/6] Fitting LR04 inhg-MPT (1000-2700 kyr)...")
    t1b, y1b, s1b, i1b = preprocess_with_trend(ages_lr, vals_lr, (1000, 2700), 1.0)
    f1b, sum1b = fit_and_pack(t1b, y1b, "inhg-mpt")
    block_inhg_mpt = pack_block(f1b, sum1b, s1b, i1b, "LR04 inhg-MPT")
    print(f"  R² L1_only={sum1b.r2_l1_only:.4f}, +L2={sum1b.delta_r2_l2:+.4f}, "
          f"+L3={sum1b.delta_r2_l3:+.4f}, total={sum1b.r2_l1_l2_l3:.4f}")

    print("\n[3/6] Fitting LR04 pre-iNHG (2700-5320 kyr)...")
    t1c, y1c, s1c, i1c = preprocess_with_trend(ages_lr, vals_lr, (2700, 5320), 1.0)
    f1c, sum1c = fit_and_pack(t1c, y1c, "pre-inhg")
    block_pre_inhg = pack_block(f1c, sum1c, s1c, i1c, "LR04 pre-iNHG")
    print(f"  R² L1_only={sum1c.r2_l1_only:.4f}, +L2={sum1c.delta_r2_l2:+.4f}, "
          f"+L3={sum1c.delta_r2_l3:+.4f}, total={sum1c.r2_l1_l2_l3:.4f}")

    print("\n[4/6] Fitting LR04 full (0-5320 kyr)...")
    t2, y2, s2, i2 = preprocess_with_trend(ages_lr, vals_lr, (0, 5320), 1.0)
    f2, sum2 = fit_and_pack(t2, y2, "lr04-full")
    block_full = pack_block(f2, sum2, s2, i2, "LR04 full")
    print(f"  R² L1_only={sum2.r2_l1_only:.4f}, +L2={sum2.delta_r2_l2:+.4f}, "
          f"+L3={sum2.delta_r2_l3:+.4f}, total={sum2.r2_l1_l2_l3:.4f}")

    # ─── CENOGRID fits ───
    print("\nCENOGRID source data...")
    ages_cgd, d13c, d18o = load_cenogrid()
    print(f"  {len(ages_cgd)} samples (0-{ages_cgd.max()/1000:.1f} Ma)")

    print("\n[5/6] Fitting CENOGRID δ¹⁸O (0-67 Myr)...")
    t3, y3, s3, i3 = preprocess_with_trend(ages_cgd, d18o, (0, 67000), 5.0)
    f3, sum3 = fit_and_pack(t3, y3, "cenogrid")
    block_cgd_o = pack_block(f3, sum3, s3, i3, "CENOGRID δ¹⁸O")
    print(f"  R² L1_only={sum3.r2_l1_only:.4f}, +L2={sum3.delta_r2_l2:+.4f}, "
          f"+L3={sum3.delta_r2_l3:+.4f}, total={sum3.r2_l1_l2_l3:.4f}")

    print("\n[6/6] Fitting CENOGRID δ¹³C (0-67 Myr)...")
    t4, y4, s4, i4 = preprocess_with_trend(ages_cgd, d13c, (0, 67000), 5.0)
    f4, sum4 = fit_and_pack(t4, y4, "cenogrid")
    block_cgd_c = pack_block(f4, sum4, s4, i4, "CENOGRID δ¹³C")
    print(f"  R² L1_only={sum4.r2_l1_only:.4f}, +L2={sum4.delta_r2_l2:+.4f}, "
          f"+L3={sum4.delta_r2_l3:+.4f}, total={sum4.r2_l1_l2_l3:.4f}")

    # ─── EPICA CO2 fit (cross-proxy validation) ───
    print("\nEPICA CO2 source data...")
    ages_epi, co2_epi = load_epica_co2()
    print(f"  {len(ages_epi)} samples (0-{ages_epi.max():.0f} kyr), "
          f"CO2 range {co2_epi.min():.1f}-{co2_epi.max():.1f} ppm")

    print("\n[7/7] Fitting EPICA CO2 (0-800 kyr)...")
    t5, y5, s5, i5 = preprocess_with_trend(ages_epi, co2_epi, (0, 800), 1.0)
    f5, sum5 = fit_and_pack(t5, y5, "epica-co2")
    block_epica = pack_block(f5, sum5, s5, i5, "EPICA CO₂")
    print(f"  R² L1_only={sum5.r2_l1_only:.4f}, +L2={sum5.delta_r2_l2:+.4f}, "
          f"+L3={sum5.delta_r2_l3:+.4f}, total={sum5.r2_l1_l2_l3:.4f}")

    # Carbon-amplification ratios: EPICA L1 amp / LR04-post-MPT L1 amp per line.
    # Higher = the line manifests primarily through carbon-cycle dynamics.
    amp_ratios = {}
    for n in L1_LATTICE_INTEGERS:
        lr_amp = float(np.sqrt(f1._l1_a.get(n, 0)**2 + f1._l1_b.get(n, 0)**2))
        ep_amp = float(np.sqrt(f5._l1_a.get(n, 0)**2 + f5._l1_b.get(n, 0)**2))
        amp_ratios[str(n)] = {
            "n": n,
            "period_kyr": EIGHT_H / n,
            "lr04_post_mpt_amp": lr_amp,
            "epica_amp": ep_amp,
            "ratio": ep_amp / max(lr_amp, 1e-12),
            "label": L1_LABELS.get(n, ""),
        }
    block_epica["carbon_amplification_ratios"] = amp_ratios

    # ─── CenCO2PIP deep-time CO2 fit (0–66 Ma) ───
    print("\nCenCO2PIP source data...")
    ages_pip, co2_pip = load_cenco2pip()
    print(f"  {len(ages_pip)} samples (0-{ages_pip.max()/1000:.1f} Ma), "
          f"CO2 range {co2_pip.min():.1f}-{co2_pip.max():.1f} ppm")

    print("\n[8/8] Fitting CenCO2PIP CO2 (0-66 Myr)...")
    t6, y6, s6, i6 = preprocess_with_trend(ages_pip, co2_pip, (0, 66000), 100.0)
    f6, sum6 = fit_and_pack(t6, y6, "cenco2pip")
    block_cenco2pip = pack_block(f6, sum6, s6, i6, "CenCO2PIP CO₂ (deep-time)")
    print(f"  R² L1_only={sum6.r2_l1_only:.4f}, +L2={sum6.delta_r2_l2:+.4f}, "
          f"+L3={sum6.delta_r2_l3:+.4f}, total={sum6.r2_l1_l2_l3:.4f}")

    # ─── Assemble ───
    out = {
        "config": {
            "H_kyr": H_KYR,
            "eight_H_kyr": EIGHT_H,
            "L1_integers": L1_LATTICE_INTEGERS,
            "L2_periods_kyr": dict(L2_THERMOSTAT_FAMILY),
            "L3_transitions_ma": dict(L3_TRANSITIONS_MA),
            "description": (
                "Climate formula = intercept + L1 + L2 + L3 (in normalized units). "
                "De-normalize: y_raw = y_norm * y_std + y_mean + (trend_slope*t_kyr + trend_intercept)."
            ),
        },
        "regimes": {
            "lr04-post-mpt": block_post_mpt,
            "lr04-inhg-mpt": block_inhg_mpt,
            "lr04-pre-inhg": block_pre_inhg,
            "lr04-full":     block_full,
            "cenogrid-d18o": block_cgd_o,
            "cenogrid-d13c": block_cgd_c,
            "epica-co2":     block_epica,
            "cenco2pip":     block_cenco2pip,
        },
        "meta": {
            "script": str(SCRIPT_DIR / "export_climate_formula_browser.py"),
            "consumer": "src/script.js — Climate Formula Explorer modal",
        },
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as fh:
        json.dump(out, fh, indent=2)
    print(f"\nOutput: {OUT_PATH}")
    print(f"  Size: {OUT_PATH.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()

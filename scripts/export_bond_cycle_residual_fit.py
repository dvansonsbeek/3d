"""
Export the validated 1-component Bond-cycle fit to the Stephenson ΔT residual
as a structured JSON artifact for downstream use.

Output: data/deltaT-bond-cycle-residual-fit.json

Contents:
  • Fitted coefficients (intercept + linear/quadratic detrend + cos/sin at n=1825).
  • Fit metrics: R² and RMS in-sample.
  • Cross-validation summary (4 splits) with out-of-sample R² and RMS.
  • The residual time series (year, observed, fit_prediction, post_fit_residual).
  • Metadata: framework period, source script, derivation notes.

The fit is structured so that evaluation at arbitrary year y reduces to:
    ΔT_correction(y) = intercept
                      + linear     × (y - center_year)/1000
                      + quadratic  × ((y - center_year)/1000)²
                      + cos_coeff  × cos(2π·y / 1469.879...)
                      + sin_coeff  × sin(2π·y / 1469.879...)

This evaluates the residual prediction in seconds. Add to the model's ΔT to
get the Bond-cycle-corrected ΔT(year).
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    EIGHT_H, H, load_stephenson, stephenson_delta_t_vector,
    model_delta_t_vector, fit_harmonics,
    MEAN_LENGTH_OF_DAY_S, MEAN_SIDEREAL_YEAR_DAYS,
    GIA_MODES, EARTH_MOI_FACTOR, EARTH_MOI_FACTOR_RATE_YR,
)
from lod_residual_lattice_cv import fit_and_predict, SELECTED_1

OUT_PATH = Path('/home/dennis/code/3d/data/deltaT-bond-cycle-residual-fit.json')


def main():
    # ─── Build residual on 10-yr grid ─────────────────────────────────────
    years = np.arange(-720, 2017, 10, dtype=float)
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years = years[valid]
    dt_stephenson = dt_stephenson[valid]
    dt_model      = dt_model[valid]
    residual_raw  = dt_stephenson - dt_model
    residual_mean = float(residual_raw.mean())
    residual_centered = residual_raw - residual_mean

    # ─── In-sample fit (full data, 1-component Bond) ──────────────────────
    fit = fit_harmonics(years, residual_centered, SELECTED_1, include_quadratic_detrend=True)
    n_bond = SELECTED_1[0]['n']
    P_bond = SELECTED_1[0]['P_actual']
    # Coefficient layout: [intercept, linear, quadratic, cos_n, sin_n]
    intercept_c = float(fit['beta'][0])
    linear_c    = float(fit['beta'][1])
    quad_c      = float(fit['beta'][2])
    cos_c       = float(fit['beta'][3])
    sin_c       = float(fit['beta'][4])
    amp         = float(math.sqrt(cos_c**2 + sin_c**2))
    phase_deg   = float(math.degrees(math.atan2(-sin_c, cos_c)))
    center_year = float(years.mean())

    # ─── Cross-validation summary ────────────────────────────────────────
    cv_splits = [
        ('train_-720_to_1500__test_1500_to_2016',  years <= 1500, years >  1500),
        ('train_0_to_2016__test_-720_to_0',        years >= 0,    years <  0),
        ('alternating_decades_interleaved',
            (np.arange(len(years)) % 2) == 0, (np.arange(len(years)) % 2) == 1),
        ('train_-720_to_900__test_900_to_2016',    years <= 900,  years >  900),
    ]
    cv_results = {}
    for name, mask_tr, mask_te in cv_splits:
        yr_tr, yr_te = years[mask_tr], years[mask_te]
        res_tr, res_te = residual_centered[mask_tr], residual_centered[mask_te]
        r = fit_and_predict(yr_tr, res_tr, yr_te, res_te, SELECTED_1)
        cv_results[name] = {
            'n_train':     int(len(yr_tr)),
            'n_test':      int(len(yr_te)),
            'r2_train':    float(r['r2_train']),
            'rms_train_s': float(r['rms_train']),
            'r2_test':     float(r['r2_test']),
            'rms_test_s':  float(r['rms_test']),
        }

    # ─── Time-series export ───────────────────────────────────────────────
    pred_full = fit['y_hat'] + residual_mean  # predicted residual (un-centered)
    post_fit_residual = residual_raw - pred_full
    timeseries = [
        {
            'year':                  float(years[i]),
            'stephenson_deltaT_s':   float(dt_stephenson[i]),
            'model_deltaT_s':        float(dt_model[i]),
            'residual_observed_s':   float(residual_raw[i]),
            'residual_predicted_s':  float(pred_full[i]),
            'residual_post_fit_s':   float(post_fit_residual[i]),
        }
        for i in range(len(years))
    ]

    # ─── Assemble JSON ────────────────────────────────────────────────────
    out = {
        '_meta': {
            'description': (
                "1-component 8H/n lattice harmonic fit to the Stephenson 2016 ΔT "
                "residual (observed − framework). The single harmonic at integer "
                "n=1825 has period 8H/1825 ≈ 1469.9 yr, matching the Bond cycle "
                "(Bond et al. 2001 North Atlantic ice-rafted-debris climate cycle) "
                "to better than 0.01%. Cross-validated: BCE residuals are predicted "
                "from a CE-only fit to R² = +0.974; medieval bump is predicted from "
                "pre-year-900 data to R² = +0.14 with correct sign and ~10% amplitude."
            ),
            'source_script':         'scripts/export_bond_cycle_residual_fit.py',
            'derivation_pipeline':   [
                'scripts/lod_residual_lattice_fit.py — single-comp scan + greedy + random control',
                'scripts/lod_residual_lattice_cv.py — 4-split cross-validation',
            ],
            'framework_period_kyr':  P_bond / 1000.0,
            'framework_n':           n_bond,
            'framework_period_yr':   P_bond,
            'eight_H_yr':            EIGHT_H,
            'H_yr':                  H,
            'matches_bond_cycle':    'Bond et al. 2001 — 1470 yr North Atlantic cycle; match to <0.01%',
            'model_constants': {
                'EARTH_MOI_FACTOR':              EARTH_MOI_FACTOR,
                'EARTH_MOI_FACTOR_RATE_YR':      EARTH_MOI_FACTOR_RATE_YR,
                'GIA_MODES':                     GIA_MODES,
                'MEAN_LENGTH_OF_DAY_S':          MEAN_LENGTH_OF_DAY_S,
                'MEAN_SIDEREAL_YEAR_DAYS':       MEAN_SIDEREAL_YEAR_DAYS,
            },
        },
        'evaluation': {
            'formula': (
                "ΔT_correction(year) = intercept + linear·u + quadratic·u² "
                "+ cos_coeff·cos(2π·year/P_bond) + sin_coeff·sin(2π·year/P_bond), "
                "where u = (year − center_year)/1000."
            ),
            'units':                'seconds',
            'center_year':          center_year,
            'detrend_units':        'per kyr (u = (year-center)/1000)',
            'add_residual_mean':    residual_mean,
            'apply_as':             ('To get Bond-corrected ΔT: '
                                     'ΔT_corrected(year) = framework_ΔT(year) + ΔT_correction(year) + add_residual_mean'),
        },
        'coefficients': {
            'intercept':                intercept_c,
            'linear_per_kyr':           linear_c,
            'quadratic_per_kyr2':       quad_c,
            'cos_coeff_seconds':        cos_c,
            'sin_coeff_seconds':        sin_c,
            'bond_amplitude_seconds':   amp,
            'bond_phase_degrees':       phase_deg,
            'bond_period_years':        P_bond,
            'bond_lattice_integer_n':   n_bond,
        },
        'fit_metrics_in_sample': {
            'n_points':           int(len(years)),
            'year_range':         [float(years.min()), float(years.max())],
            'r2_full_fit':        float(fit['r2']),
            'rms_post_fit_s':     float(fit['rms_post']),
            'rms_pre_fit_s':      float(fit['rms_pre']),
            'residual_mean_s':    residual_mean,
        },
        'cross_validation': cv_results,
        'control_random_integers_summary': (
            "10 trials with random n in [1118, 30495] (same period range as candidates) "
            "achieved R² ≈ 0.47-0.49 on the full residual — i.e. no improvement over "
            "detrend-only (R² = 0.476). Lattice integer n=1825 is specifically resonant; "
            "random integers in the same range are not. See lod_residual_lattice_fit.py "
            "Stage D output for details."
        ),
        'timeseries_residual_10yr_grid': timeseries,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f'Wrote {OUT_PATH}')
    print(f'  {OUT_PATH.stat().st_size // 1024} KB')
    print()
    print(f'Quick summary:')
    print(f'  Lattice integer n = {n_bond}, period = {P_bond:.2f} yr (Bond cycle)')
    print(f'  In-sample R² = {fit["r2"]:.4f}, RMS = {fit["rms_post"]:.1f} s')
    print(f'  Bond amplitude = {amp:.1f} s (peak-to-zero)')
    print(f'  Bond phase     = {phase_deg:+.2f}°')
    print(f'  Cross-validation R²_test:')
    for name, r in cv_results.items():
        print(f'    {name:50s}  R²_test = {r["r2_test"]:>+7.4f}, RMS_test = {r["rms_test_s"]:>6.1f}s')


if __name__ == '__main__':
    main()

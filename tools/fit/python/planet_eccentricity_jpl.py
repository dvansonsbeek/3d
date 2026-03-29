"""
Planet Eccentricity Analysis from JPL Horizons
Fetches osculating orbital elements for all 7 planets at regular intervals,
then analyzes the eccentricity time series to look for oscillation at each
planet's H-derived perihelion period.
"""

import numpy as np
import json
import os
from astroquery.jplhorizons import Horizons
from load_constants import C

# ─── Model constants (from JSON via bridge) ───────────────────────────────
H = int(C['H'])
ANCHOR_YEAR = C['balancedYear']

PLANETS = {
    'Mercury': {'id': '199', 'period': H * 8 / 11, 'e_model': 0.20563593, 'e_j2000': 0.20563593, 'range': (-9000, 9000)},
    'Venus':   {'id': '299', 'period': H * 2,      'e_model': 0.00619052, 'e_j2000': 0.00677672, 'range': (-9000, 9000)},
    'Mars':    {'id': '499', 'period': H * 3 / 13,  'e_model': 0.09297543, 'e_j2000': 0.09339410, 'range': (1700, 2500)},
    'Jupiter': {'id': '599', 'period': H / 5,       'e_model': 0.04821478, 'e_j2000': 0.04838624, 'range': (1700, 2100)},
    'Saturn':  {'id': '699', 'period': H / 8,       'e_model': 0.05374486, 'e_j2000': 0.05386179, 'range': (1800, 2200)},
    'Uranus':  {'id': '799', 'period': H / 3,       'e_model': 0.04734421, 'e_j2000': 0.04725744, 'range': (1700, 2300)},
    'Neptune': {'id': '899', 'period': H * 2,       'e_model': 0.00868571, 'e_j2000': 0.00859048, 'range': (1700, 2300)},
}

# ─── Step 1: Fetch data from JPL Horizons ──────────────────────────────────
# DE440 covers roughly -13000 to +17000 AD
# We sample every 100 years from -9000 to +9000 (safe DE440 range)
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'planet_eccentricity_cache.json')

def fetch_eccentricities():
    """Fetch osculating elements from JPL Horizons."""

    # Check cache first
    if os.path.exists(CACHE_FILE):
        print(f"Loading cached data from {CACHE_FILE}")
        with open(CACHE_FILE) as f:
            return json.load(f)

    results = {}

    for name, info in PLANETS.items():
        start_year, end_year = info['range']
        step_years = 100 if (end_year - start_year) > 2000 else 10
        epochs_years = list(range(start_year, end_year + 1, step_years))
        print(f"Fetching {name} ({len(epochs_years)} epochs, {start_year} to {end_year})...")

        years = []
        eccs = []
        incls = []

        # Query in batches (Horizons has limits)
        batch_size = 50
        for i in range(0, len(epochs_years), batch_size):
            batch_years = epochs_years[i:i + batch_size]

            # Convert years to JD for Horizons
            # JD = 2451545.0 + (year - 2000) * 365.25
            batch_jds = [2451545.0 + (y - 2000) * 365.25 for y in batch_years]

            try:
                obj = Horizons(
                    id=info['id'],
                    location='500@10',  # Sun-centered (heliocentric)
                    epochs=batch_jds,
                )
                el = obj.elements()

                for j, yr in enumerate(batch_years):
                    years.append(yr)
                    eccs.append(float(el['e'][j]))
                    incls.append(float(el['incl'][j]))

            except Exception as e:
                print(f"  Warning: batch starting {batch_years[0]} failed: {e}")
                continue

        if len(years) == 0:
            print(f"  WARNING: No data retrieved for {name}")
            continue

        results[name] = {
            'years': years,
            'eccentricities': eccs,
            'inclinations': incls,
        }
        print(f"  Got {len(years)} data points, e range: {min(eccs):.8f} to {max(eccs):.8f}")

    # Cache results
    with open(CACHE_FILE, 'w') as f:
        json.dump(results, f)
    print(f"\nCached to {CACHE_FILE}")

    return results


# ─── Step 2: Analyze eccentricity time series ──────────────────────────────

def analyze_eccentricity(name, data, planet_info):
    """Analyze eccentricity time series for one planet."""
    years = np.array(data['years'])
    ecc = np.array(data['eccentricities'])

    period = abs(planet_info['period'])
    e_model = planet_info['e_model']
    e_j2000 = planet_info['e_j2000']

    # Basic statistics
    e_mean_obs = np.mean(ecc)
    e_std = np.std(ecc)
    e_min = np.min(ecc)
    e_max = np.max(ecc)
    e_range = e_max - e_min

    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    print(f"  Data points:        {len(years)}")
    print(f"  Time span:          {years[0]} to {years[-1]} ({years[-1]-years[0]} yr)")
    print(f"  Perihelion period:  {period:,.0f} yr")
    print(f"  Cycles covered:     {(years[-1]-years[0])/period:.2f}")
    print(f"")
    print(f"  Observed e range:   {e_min:.8f} to {e_max:.8f}")
    print(f"  Observed e mean:    {e_mean_obs:.8f}")
    print(f"  Observed e std:     {e_std:.8f}")
    print(f"  Observed e range:   {e_range:.8f} ({e_range/e_mean_obs*100:.3f}%)")
    print(f"  Model e_mean:       {e_model:.8f}")
    print(f"  J2000 e:            {e_j2000:.8f}")
    print(f"  Model vs obs mean:  {e_model - e_mean_obs:+.8f} ({(e_model-e_mean_obs)/e_mean_obs*100:+.4f}%)")

    # Fit a single cosine at the model's predicted period
    t = years - ANCHOR_YEAR
    omega = 2 * np.pi / period

    # Linear regression: e(t) = a0 + a1*cos(wt) + a2*sin(wt)
    X = np.column_stack([
        np.ones_like(t),
        np.cos(omega * t),
        np.sin(omega * t),
    ])
    coeffs, residuals, _, _ = np.linalg.lstsq(X, ecc, rcond=None)
    a0, a1, a2 = coeffs
    amp_model_period = np.sqrt(a1**2 + a2**2)
    phase_model = np.degrees(np.arctan2(a2, a1)) % 360

    e_fit = X @ coeffs
    rmse_model = np.sqrt(np.mean((ecc - e_fit)**2))
    ss_res = np.sum((ecc - e_fit)**2)
    ss_tot = np.sum((ecc - np.mean(ecc))**2)
    r2_model = 1 - ss_res / ss_tot if ss_tot > 0 else 0

    print(f"\n  --- Fit at model period ({period:,.0f} yr) ---")
    print(f"  Fitted mean:        {a0:.8f}")
    print(f"  Amplitude:          {amp_model_period:.8f} ({amp_model_period/a0*100:.4f}%)")
    print(f"  Phase:              {phase_model:.1f}°")
    print(f"  R²:                 {r2_model:.6f}")
    print(f"  RMSE:               {rmse_model:.8f}")

    # FFT to find dominant periods
    if len(ecc) > 10:
        dt = years[1] - years[0]  # sampling interval
        ecc_detrended = ecc - np.mean(ecc)

        freqs = np.fft.rfftfreq(len(ecc_detrended), d=dt)
        fft_vals = np.abs(np.fft.rfft(ecc_detrended))

        # Skip DC component
        freqs = freqs[1:]
        fft_vals = fft_vals[1:]

        # Top 5 periods
        top_idx = np.argsort(fft_vals)[-5:][::-1]

        print(f"\n  --- FFT dominant periods ---")
        for idx in top_idx:
            if freqs[idx] > 0:
                p = 1 / freqs[idx]
                print(f"    Period: {p:>12,.0f} yr  (H/{H/p:>8.1f})  Amplitude: {fft_vals[idx]/len(ecc)*2:.8f}")

    # Multi-harmonic fit: model period + H/3 + H/8 + linear trend
    periods_to_try = [period, H/3, H/8, H/16]
    X_multi = [np.ones_like(t), t / 1e6]  # constant + linear trend
    labels = ['const', 'trend']
    for p in periods_to_try:
        w = 2 * np.pi / p
        X_multi.append(np.cos(w * t))
        X_multi.append(np.sin(w * t))
        labels.extend([f'cos(H/{H/p:.0f})', f'sin(H/{H/p:.0f})'])

    X_multi = np.column_stack(X_multi)
    coeffs_multi, _, _, _ = np.linalg.lstsq(X_multi, ecc, rcond=None)
    e_fit_multi = X_multi @ coeffs_multi
    ss_res_multi = np.sum((ecc - e_fit_multi)**2)
    r2_multi = 1 - ss_res_multi / ss_tot if ss_tot > 0 else 0
    rmse_multi = np.sqrt(np.mean((ecc - e_fit_multi)**2))

    print(f"\n  --- Multi-harmonic fit (period + H/3 + H/8 + H/16 + trend) ---")
    print(f"  R²:                 {r2_multi:.6f}")
    print(f"  RMSE:               {rmse_multi:.8f}")
    print(f"  Amplitudes:")
    for i in range(2, len(coeffs_multi), 2):
        cos_c = coeffs_multi[i]
        sin_c = coeffs_multi[i+1]
        amp = np.sqrt(cos_c**2 + sin_c**2)
        p_label = labels[i].replace('cos(', '').replace(')', '')
        print(f"    {p_label:>10}: {amp:.8f} ({amp/a0*100:.4f}%)")

    return {
        'e_mean_obs': e_mean_obs,
        'e_model': e_model,
        'amplitude': amp_model_period,
        'r2_single': r2_model,
        'r2_multi': r2_multi,
    }


# ─── Main ──────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    data = fetch_eccentricities()

    print("\n" + "="*60)
    print("  PLANET ECCENTRICITY ANALYSIS — JPL Horizons Data")
    print("="*60)

    results = {}
    for name, info in PLANETS.items():
        if name in data:
            results[name] = analyze_eccentricity(name, data[name], info)

    # Summary table
    print(f"\n{'='*80}")
    print(f"  SUMMARY")
    print(f"{'='*80}")
    print(f"{'Planet':>10} {'e_obs_mean':>12} {'e_model':>12} {'diff%':>8} {'Amplitude':>12} {'amp/mean%':>10} {'R²(single)':>10} {'R²(multi)':>10}")
    print("-" * 90)
    for name in PLANETS:
        if name in results:
            r = results[name]
            diff_pct = (r['e_model'] - r['e_mean_obs']) / r['e_mean_obs'] * 100
            amp_pct = r['amplitude'] / r['e_mean_obs'] * 100
            print(f"{name:>10} {r['e_mean_obs']:12.8f} {r['e_model']:12.8f} {diff_pct:+8.4f} {r['amplitude']:12.8f} {amp_pct:10.4f}% {r['r2_single']:10.6f} {r['r2_multi']:10.6f}")

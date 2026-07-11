"""
Extended Hallstatt cycle test on Cheng et al. 2016 speleothem δ¹⁸O composite
(640,000 years, 8353 data points, ~76-yr resolution).

Purpose:
  Extend the Steinhilber 2012 test (9.4 kyr, ~4 Hallstatt cycles) to a long
  paleoclimate record (~270 Hallstatt cycles) to see if the empirical peak
  location narrows and to definitively test whether the framework's
  H-lattice candidates for Hallstatt (8H/1104 via H/138, or 8H/1150) match
  the actual signal.

Method:
  1. Load Cheng speleothem δ¹⁸O and convert kyr BP to absolute years.
  2. Detrend the Milankovitch bands: fit and remove sin/cos at obliquity
     (41 kyr) + main precession (23 kyr + 19 kyr) + eccentricity (100 kyr,
     405 kyr) so the residual carries sub-orbital variability only.
  3. Fit our two H-lattice candidates + canonical Hallstatt to the residual:
     - 8H/1104 = 2430 yr  (framework H/138, gcd = 23 with H)
     - 8H/1150 = 2333 yr  (framework 8H-lattice, gcd = 23 via 1150 = 2·5²·23)
     - 8H/1166 = 2301 yr  (numerically canonical Hallstatt, gcd = 1 — reference)
  4. Fine-grained scan of 8H/1000..1300 to find the empirical peak in this
     dataset and compare with Steinhilber's empirical peak at 8H/1170.
  5. Also try a moving-window analysis (100 kyr windows, 50 kyr steps)
     to see whether the Hallstatt signal is stable through time or
     modulated by glacial/interglacial state.

Output: console report + JSON at data/hallstatt-cheng-fit.json
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

CHENG_PATH = Path('/home/dennis/code/3d/data/cheng2016-speleothem.txt')
OUT_PATH   = Path('/home/dennis/code/3d/data/hallstatt-cheng-fit.json')

H = 335317
EIGHT_H = 8 * H

# Candidates
N_FRAMEWORK_H138 = 1104  # 8H/1104 = H/138 = 2429.83 yr
N_FRAMEWORK_1150 = 1150  # 8H/1150 = 2332.63 yr (empirical peak in Steinhilber, also gcd=23)
N_CANONICAL_1166 = 1166  # 8H/1166 = 2300.63 yr (numerically canonical, not gcd-compliant)

# Milankovitch bands to detrend (approximate periods in yr)
MILANKOVITCH_PERIODS = {
    'eccentricity_405k': 405000,
    'eccentricity_100k': 100000,
    'obliquity_41k':      41000,
    'precession_23k':     23000,
    'precession_19k':     19000,
}

def load_cheng():
    """Return (years_ad, d18o) — sorted ascending in year."""
    with open(CHENG_PATH) as f:
        lines = f.readlines()
    data_start = None
    for i, ln in enumerate(lines):
        if 'age_calkaBP' in ln:
            data_start = i + 1
            break
    if data_start is None:
        raise RuntimeError('Cheng data header not found')

    ages_kyr, d18o = [], []
    for ln in lines[data_start:]:
        s = ln.strip()
        if not s or s.startswith('#'):
            continue
        parts = s.split()
        if len(parts) < 2:
            continue
        try:
            ages_kyr.append(float(parts[0]))
            d18o.append(float(parts[1]))
        except ValueError:
            continue

    ages_yr = np.array(ages_kyr) * 1000.0
    d18o    = np.array(d18o)
    # BP=0 corresponds to 1950 AD by convention
    years_ad = 1950.0 - ages_yr
    idx = np.argsort(years_ad)
    return years_ad[idx], d18o[idx]

def build_design_matrix(t_centered, periods_yr, include_polytrend=True):
    """t_centered: time in yr from center. periods_yr: dict of {label: period_yr}
    or list of period_yr values. Returns (X, col_labels).
    """
    if isinstance(periods_yr, dict):
        items = list(periods_yr.items())
    else:
        items = [(f'P={p:.0f}', p) for p in periods_yr]
    cols = [np.ones_like(t_centered)]
    labels = ['intercept']
    if include_polytrend:
        cols.append(t_centered / 1e5); labels.append('linear /100kyr')
        cols.append((t_centered / 1e5)**2); labels.append('quadratic /100kyr²')
    for label, P in items:
        omega = 2.0 * math.pi / P
        cols.append(np.cos(omega * t_centered))
        cols.append(np.sin(omega * t_centered))
        labels.append(f'cos({label})')
        labels.append(f'sin({label})')
    return np.column_stack(cols), labels

def fit_and_report(name, t_centered, y, periods, include_polytrend=True, verbose=True):
    X, labels = build_design_matrix(t_centered, periods, include_polytrend=include_polytrend)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / max(ss_tot, 1e-12)
    resid = y - y_hat
    if verbose:
        print(f'  {name}: R² = {r2:.4f}, RMS pre/post = {y.std():.3f} / {resid.std():.3f}')
    # Extract amplitudes for the periodic terms only
    if isinstance(periods, dict):
        items = list(periods.items())
    else:
        items = [(f'P={p:.0f}', p) for p in periods]
    n_polynomial = 3 if include_polytrend else 1
    amp_phase = {}
    for i, (label, P) in enumerate(items):
        ci = float(beta[n_polynomial + 2*i])
        si = float(beta[n_polynomial + 2*i + 1])
        amp = math.hypot(ci, si)
        phase_deg = math.degrees(math.atan2(si, ci))
        amp_phase[label] = {'period_yr': P, 'cos': ci, 'sin': si, 'amplitude': amp, 'phase_deg': phase_deg}
    return {'r2': r2, 'resid': resid, 'y_hat': y_hat, 'beta': beta, 'labels': labels, 'amp_phase': amp_phase}

def main():
    print('=' * 85)
    print('HALLSTATT EXTENDED TEST — Cheng 2016 speleothem δ¹⁸O (640 kyr)')
    print('=' * 85)
    print()

    years_ad, d18o = load_cheng()
    print(f'  Loaded: n = {len(years_ad)} points')
    print(f'  Range:  {years_ad.min():.0f} to {years_ad.max():.0f} AD (span = {(years_ad.max()-years_ad.min())/1000:.1f} kyr)')
    print(f'  Median sample spacing: {np.median(np.diff(np.sort(years_ad))):.1f} yr')
    print(f'  Signal: mean = {d18o.mean():.3f}, std = {d18o.std():.3f} ‰ (per mil)')
    span = years_ad.max() - years_ad.min()
    print(f'  Hallstatt cycles per record: 8H/1104 → {span/(EIGHT_H/N_FRAMEWORK_H138):.1f}, '
          f'8H/1150 → {span/(EIGHT_H/N_FRAMEWORK_1150):.1f}')
    print()

    t0 = years_ad.mean()
    t  = years_ad - t0

    # ─── Step 1: Detrend Milankovitch bands ──────────────────────────
    print('── STEP 1: Fit Milankovitch bands (extract sub-orbital residual) ──')
    fit_milanko = fit_and_report('Milankovitch full', t, d18o, MILANKOVITCH_PERIODS,
                                  include_polytrend=True)
    for label, ap in fit_milanko['amp_phase'].items():
        print(f'      {label:22s} P={ap["period_yr"]:>7.0f} yr  amp={ap["amplitude"]:.3f}‰  phase={ap["phase_deg"]:+.1f}°')
    residual = fit_milanko['resid']
    print(f'  Sub-orbital residual: RMS = {residual.std():.3f}‰')
    print()

    # ─── Step 2: Test our three Hallstatt candidates on the residual ──
    print('── STEP 2: Test H-lattice Hallstatt candidates on the sub-orbital residual ──')
    for n in [N_FRAMEWORK_H138, N_FRAMEWORK_1150, N_CANONICAL_1166]:
        P = EIGHT_H / n
        marker = ''
        if n == N_FRAMEWORK_H138: marker = ' ← framework H/138 (gcd=23)'
        if n == N_FRAMEWORK_1150: marker = ' ← 8H-lattice 8H/1150 (gcd=23)'
        if n == N_CANONICAL_1166: marker = ' ← canonical Hallstatt (gcd=1, reference)'
        r = fit_and_report(f'  8H/{n} alone (P={P:.1f} yr){marker}',
                           t, residual, [P], include_polytrend=False, verbose=True)
        ap = r['amp_phase'][f'P={P:.0f}']
        print(f'      Amplitude = {ap["amplitude"]:.4f} ‰  phase = {ap["phase_deg"]:+.1f}°')
    print()

    # ─── Step 3: Fine-grained scan for empirical peak location ────────
    print('── STEP 3: Fine-grained scan of 8H/1000..1300 in sub-orbital residual ──')
    print('  (peak location tells us where Hallstatt-band signal actually sits)')
    scan_results = []
    peak_R2 = -1
    peak_n  = None
    for n in range(1000, 1301, 2):
        P = EIGHT_H / n
        omega = 2*math.pi/P
        X = np.column_stack([np.cos(omega*years_ad), np.sin(omega*years_ad)])
        beta_h, *_ = np.linalg.lstsq(X, residual, rcond=None)
        y_hat_h = X @ beta_h
        ss_res = float(np.sum((residual - y_hat_h)**2))
        ss_tot = float(np.sum((residual - residual.mean())**2))
        r2 = 1.0 - ss_res/max(ss_tot, 1e-12)
        amp = math.hypot(beta_h[0], beta_h[1])
        scan_results.append({'n': n, 'period_yr': P, 'r2': r2, 'amplitude': amp})
        if r2 > peak_R2:
            peak_R2 = r2
            peak_n = n
            peak_P = P
            peak_amp = amp
    # Report a sparse table (every 20th entry) + peak
    print(f'  Scan: {len(scan_results)} divisors sampled')
    print(f'  Empirical peak: 8H/{peak_n} = {peak_P:.1f} yr, R² = {peak_R2:.4f}, amp = {peak_amp:.4f}‰')
    print()
    print('  Sparse table (every 20th n) — for context:')
    print(f'  {"n":>5} | {"period":>7} | {"R²":>7} | {"amp (‰)":>8} | note')
    for entry in scan_results[::20]:
        note = ''
        if entry['n'] == 1104: note = '← framework H/138'
        if entry['n'] == 1150: note = '← 8H/1150 (also gcd=23)'
        if entry['n'] == 1166: note = '← canonical'
        if entry['n'] == peak_n: note = '← empirical peak'
        print(f'  {entry["n"]:>5} | {entry["period_yr"]:>7.1f} | {entry["r2"]:>7.4f} | {entry["amplitude"]:>8.4f} | {note}')
    print()

    # ─── Step 4: Compare with Steinhilber empirical peak ──────────────
    print('── STEP 4: Cross-record consistency check ──')
    print(f'  Steinhilber (9.4 kyr) empirical peak: 8H/1170 = 2293 yr, R² = 0.077')
    print(f'  Cheng      (640 kyr) empirical peak: 8H/{peak_n} = {peak_P:.1f} yr, R² = {peak_R2:.4f}')
    print(f'  Framework 8H/1104 (H/138) in Cheng: R² = {[s["r2"] for s in scan_results if s["n"]==1104][0]:.4f}')
    print(f'  Framework 8H/1150 in Cheng: R² = {[s["r2"] for s in scan_results if s["n"]==1150][0]:.4f}')
    print()

    # ─── Step 5: Windowed analysis (is Hallstatt stable through glacial cycles?) ──
    print('── STEP 5: Windowed analysis — 100 kyr windows, 50 kyr steps ──')
    print('  Test whether Hallstatt amplitude is stable across climate regimes')
    windows = []
    for center_kyr in range(-590, 40, 50):
        center_yr = 1950 - center_kyr * 1000
        half_span = 50000
        mask = (years_ad >= center_yr - half_span) & (years_ad <= center_yr + half_span)
        if mask.sum() < 100:
            continue
        y_w = residual[mask]
        yr_w = years_ad[mask]
        # Fit both candidates + peak divisor in this window
        row = {'center_kyr_BP': center_kyr, 'n_points': int(mask.sum())}
        for label, n in [('framework_1104', N_FRAMEWORK_H138),
                          ('framework_1150', N_FRAMEWORK_1150),
                          ('empirical_peak', peak_n)]:
            P = EIGHT_H / n
            omega = 2*math.pi/P
            X = np.column_stack([np.cos(omega*yr_w), np.sin(omega*yr_w)])
            beta_w, *_ = np.linalg.lstsq(X, y_w, rcond=None)
            amp = math.hypot(beta_w[0], beta_w[1])
            row[f'{label}_amp'] = amp
        windows.append(row)

    # Print the windowed table
    print(f'  {"center kyr BP":>13} | {"1104 amp":>8} | {"1150 amp":>8} | {"peak amp":>8}')
    for w in windows:
        print(f'  {w["center_kyr_BP"]:>13} | {w["framework_1104_amp"]:>8.4f} | '
              f'{w["framework_1150_amp"]:>8.4f} | {w["empirical_peak_amp"]:>8.4f}')

    # ─── Persist ──────────────────────────────────────────────────────
    output = {
        '_meta': {
            'description': ('Extended Hallstatt cycle test using Cheng 2016 speleothem δ¹⁸O '
                            '(640 kyr, ~76 yr resolution). Detrends Milankovitch bands (405k, '
                            '100k, 41k, 23k, 19k yr) then fits sub-orbital residual for Hallstatt-'
                            'band candidates. Compares framework H-lattice candidates 8H/1104 '
                            '(H/138, gcd=23) and 8H/1150 (gcd=23) with canonical 8H/1166 and '
                            'the empirical peak found by fine-grained scan.'),
            'source_script': 'scripts/hallstatt_cheng_speleothem.py',
            'source_data': str(CHENG_PATH),
            'H_yr': H, 'eight_H_yr': EIGHT_H,
        },
        'series_summary': {
            'n_points': int(len(years_ad)),
            'year_range_ad': [float(years_ad.min()), float(years_ad.max())],
            'span_kyr': float((years_ad.max() - years_ad.min()) / 1000),
            'median_spacing_yr': float(np.median(np.diff(np.sort(years_ad)))),
        },
        'milankovitch_fit': {
            'r2': fit_milanko['r2'],
            'residual_rms': float(residual.std()),
            'components': {k: v for k, v in fit_milanko['amp_phase'].items()},
        },
        'hallstatt_candidates_on_residual': {
            '8H/1104_framework_H138':  {'r2': [s['r2'] for s in scan_results if s['n']==1104][0],
                                        'amplitude': [s['amplitude'] for s in scan_results if s['n']==1104][0],
                                        'period_yr': EIGHT_H / 1104},
            '8H/1150_framework':       {'r2': [s['r2'] for s in scan_results if s['n']==1150][0],
                                        'amplitude': [s['amplitude'] for s in scan_results if s['n']==1150][0],
                                        'period_yr': EIGHT_H / 1150},
            '8H/1166_canonical':       {'r2': [s['r2'] for s in scan_results if s['n']==1166][0],
                                        'amplitude': [s['amplitude'] for s in scan_results if s['n']==1166][0],
                                        'period_yr': EIGHT_H / 1166},
        },
        'empirical_peak': {
            'n':          int(peak_n),
            'period_yr':  float(peak_P),
            'r2':         float(peak_R2),
            'amplitude':  float(peak_amp),
        },
        'cross_record_consistency': {
            'steinhilber_peak_n': 1170,
            'steinhilber_peak_period_yr': EIGHT_H / 1170,
            'steinhilber_peak_r2': 0.077,
            'cheng_peak_n':       int(peak_n),
            'cheng_peak_period_yr': float(peak_P),
            'cheng_peak_r2':      float(peak_R2),
        },
        'windowed_amplitudes': windows,
        'divisor_scan': scan_results,
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print()
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

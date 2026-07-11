"""
Third Hallstatt test on EPICA 800 kyr CO₂ composite (Bereiter et al. 2015).

Purpose: after Steinhilber (9.4 kyr solar Φ, weak Hallstatt signal) and Cheng
(640 kyr speleothem δ¹⁸O, no Hallstatt signal), test EPICA CO₂ as the third
proxy. This is a completely different physical archive — atmospheric CO₂ over
glacial cycles — with 420-yr median resolution. Hallstatt (2400 yr) is 5.7×
above Nyquist; marginally resolvable but should still show if present.

If EPICA also shows R² ≤ 0.005 at Hallstatt-band divisors, the verdict is
definitive: Hallstatt is a Holocene-solar-only signal, not a persistent
long-term cycle.

Method: same as hallstatt_cheng_speleothem.py.
  1. Load EPICA CO₂
  2. Detrend Milankovitch bands
  3. Test candidates 8H/1104, 8H/1150, 8H/1166
  4. Fine-grained scan for empirical peak
  5. Cross-record comparison

Output: console + data/hallstatt-epica-fit.json
"""

import json
import math
from pathlib import Path
import numpy as np

EPICA_PATH = Path('/home/dennis/code/3d/data/epica-co2-bereiter2015.txt')
OUT_PATH   = Path('/home/dennis/code/3d/data/hallstatt-epica-fit.json')

H = 335317
EIGHT_H = 8 * H
N_FRAMEWORK_H138 = 1104
N_FRAMEWORK_1150 = 1150
N_CANONICAL_1166 = 1166

MILANKOVITCH_PERIODS = {
    'eccentricity_405k': 405000,
    'eccentricity_100k': 100000,
    'obliquity_41k':      41000,
    'precession_23k':     23000,
    'precession_19k':     19000,
}

def load_epica():
    with open(EPICA_PATH) as f:
        lines = f.readlines()
    data_start = None
    for i, ln in enumerate(lines):
        if 'age_gas_calBP' in ln:
            data_start = i + 1
            break
    if data_start is None:
        raise RuntimeError('EPICA data header not found')
    ages_bp, co2 = [], []
    for ln in lines[data_start:]:
        s = ln.strip()
        if not s or s.startswith('#'):
            continue
        parts = s.split()
        if len(parts) < 2:
            continue
        try:
            ages_bp.append(float(parts[0]))
            co2.append(float(parts[1]))
        except ValueError:
            continue
    years_ad = 1950.0 - np.array(ages_bp)
    co2 = np.array(co2)
    idx = np.argsort(years_ad)
    return years_ad[idx], co2[idx]

def fit_at_divisor(years_ad, series, n):
    P = EIGHT_H / n
    omega = 2*math.pi/P
    X = np.column_stack([np.cos(omega*years_ad), np.sin(omega*years_ad)])
    beta, *_ = np.linalg.lstsq(X, series, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((series - y_hat)**2))
    ss_tot = float(np.sum((series - series.mean())**2))
    r2 = 1 - ss_res/max(ss_tot, 1e-12)
    amp = math.hypot(beta[0], beta[1])
    return {'n': n, 'period_yr': P, 'r2': r2, 'amplitude': amp}

def main():
    print('=' * 85)
    print('HALLSTATT TEST — EPICA 800 kyr CO₂ (Bereiter 2015)')
    print('=' * 85)
    print()

    years_ad, co2 = load_epica()
    span = years_ad.max() - years_ad.min()
    med_spacing = float(np.median(np.diff(np.sort(years_ad))))
    print(f'  Loaded: n = {len(years_ad)} points')
    print(f'  Range:  {years_ad.min():.0f} to {years_ad.max():.0f} AD (span = {span/1000:.1f} kyr)')
    print(f'  Median sample spacing: {med_spacing:.1f} yr — Nyquist = {med_spacing*2:.0f} yr')
    print(f'  Signal: mean = {co2.mean():.1f} ppm, std = {co2.std():.1f} ppm')
    print(f'  Hallstatt cycles per record: 8H/1104 → {span/(EIGHT_H/N_FRAMEWORK_H138):.1f}, '
          f'8H/1150 → {span/(EIGHT_H/N_FRAMEWORK_1150):.1f}')
    print()

    t0 = years_ad.mean()
    t = years_ad - t0

    # ─── Milankovitch detrend ────────────────────────────────────────
    print('── STEP 1: Milankovitch fit + residual ──')
    cols = [np.ones_like(t), t/1e5, (t/1e5)**2]
    labels = ['intercept', 'linear', 'quadratic']
    for k, P in MILANKOVITCH_PERIODS.items():
        omega = 2*math.pi/P
        cols.append(np.cos(omega*years_ad))
        cols.append(np.sin(omega*years_ad))
        labels.extend([f'cos({k})', f'sin({k})'])
    X = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(X, co2, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((co2 - y_hat)**2))
    ss_tot = float(np.sum((co2 - co2.mean())**2))
    r2_milanko = 1 - ss_res/max(ss_tot, 1e-12)
    residual = co2 - y_hat
    print(f'  Milankovitch fit R² = {r2_milanko:.4f}')
    print(f'  Sub-orbital residual RMS = {residual.std():.2f} ppm')
    milanko_amps = {}
    for i, (name, _) in enumerate(MILANKOVITCH_PERIODS.items()):
        ci = float(beta[3 + 2*i]); si = float(beta[3 + 2*i + 1])
        amp = math.hypot(ci, si)
        milanko_amps[name] = amp
        print(f'      {name:22s} amp = {amp:.2f} ppm')
    print()

    # ─── Test our three Hallstatt candidates ─────────────────────────
    print('── STEP 2: Test candidates on the sub-orbital residual ──')
    for n, note in [(N_FRAMEWORK_H138, '← framework H/138 (gcd=23)'),
                    (N_FRAMEWORK_1150, '← 8H-lattice 8H/1150 (gcd=23)'),
                    (N_CANONICAL_1166, '← canonical Hallstatt (gcd=1)')]:
        r = fit_at_divisor(years_ad, residual, n)
        print(f'  8H/{n} (P={r["period_yr"]:.1f} yr) {note}')
        print(f'      R² = {r["r2"]:.5f}, amp = {r["amplitude"]:.3f} ppm')
    print()

    # ─── Fine-grained scan ───────────────────────────────────────────
    print('── STEP 3: Scan 8H/1000..1300 for empirical peak ──')
    scan = []
    peak_R2 = -1
    peak_n = None
    for n in range(1000, 1301, 2):
        r = fit_at_divisor(years_ad, residual, n)
        scan.append(r)
        if r['r2'] > peak_R2:
            peak_R2 = r['r2']; peak_n = n
            peak_P = r['period_yr']; peak_amp = r['amplitude']
    print(f'  Empirical peak: 8H/{peak_n} = {peak_P:.1f} yr, R² = {peak_R2:.5f}, amp = {peak_amp:.3f} ppm')
    print()
    print('  Sparse table (every 20th n):')
    print(f'  {"n":>5} | {"period":>7} | {"R²":>8} | {"amp (ppm)":>10} | note')
    for entry in scan[::20]:
        note = ''
        if entry['n'] == 1104: note = '← framework H/138'
        if entry['n'] == 1150: note = '← 8H/1150'
        if entry['n'] == 1166: note = '← canonical'
        if entry['n'] == peak_n: note = '← empirical peak'
        print(f'  {entry["n"]:>5} | {entry["period_yr"]:>7.1f} | {entry["r2"]:>8.5f} | {entry["amplitude"]:>10.4f} | {note}')
    print()

    # ─── Wider scan to see if EPICA has any prominent sub-orbital peak ───
    print('── STEP 4: Wider scan 8H/500..3000 — is there any sub-orbital peak? ──')
    wide_scan = []
    for n in range(500, 3001, 10):
        r = fit_at_divisor(years_ad, residual, n)
        wide_scan.append(r)
    # Report top 10
    top10 = sorted(wide_scan, key=lambda x: -x['r2'])[:10]
    print(f'  Top 10 divisors in the sub-orbital band by R²:')
    print(f'  {"rank":>4} | {"n":>5} | {"period":>7} | {"R²":>8} | {"amp":>8}')
    for i, entry in enumerate(top10, 1):
        print(f'  {i:>4} | {entry["n"]:>5} | {entry["period_yr"]:>7.1f} | {entry["r2"]:>8.5f} | {entry["amplitude"]:>8.4f}')
    print()

    # ─── Cross-record summary ────────────────────────────────────────
    print('── CROSS-RECORD SUMMARY ──')
    print(f'  Steinhilber (9.4 kyr solar Φ):  peak 8H/1170 (2293 yr), R² = 0.077')
    print(f'  Cheng      (640 kyr speleothem): peak 8H/1006 (2666 yr), R² = 0.0023')
    print(f'  EPICA      (800 kyr CO₂):        peak 8H/{peak_n} ({peak_P:.0f} yr), R² = {peak_R2:.5f}')
    print()

    output = {
        '_meta': {
            'description': ('Third Hallstatt proxy test using EPICA 800 kyr CO₂ (Bereiter 2015). '
                            'Median 420-yr resolution: Hallstatt (~2400 yr) is 5.7× above Nyquist. '
                            'Following weak Steinhilber solar Φ signal and null Cheng speleothem, '
                            'this test provides a third independent look at whether a Hallstatt-band '
                            'cycle is a persistent long-term feature or a Holocene-solar artifact.'),
            'source_script': 'scripts/hallstatt_epica_co2.py',
            'source_data': str(EPICA_PATH),
            'H_yr': H, 'eight_H_yr': EIGHT_H,
        },
        'series_summary': {
            'n_points': int(len(years_ad)),
            'year_range_ad': [float(years_ad.min()), float(years_ad.max())],
            'span_kyr': float(span/1000),
            'median_spacing_yr': med_spacing,
        },
        'milankovitch_fit': {
            'r2': r2_milanko,
            'residual_rms_ppm': float(residual.std()),
            'amplitudes': milanko_amps,
        },
        'hallstatt_candidates': {
            f'8H/{n}': fit_at_divisor(years_ad, residual, n)
            for n in [N_FRAMEWORK_H138, N_FRAMEWORK_1150, N_CANONICAL_1166]
        },
        'empirical_peak_in_hallstatt_band': {
            'n': int(peak_n), 'period_yr': float(peak_P),
            'r2': float(peak_R2), 'amplitude': float(peak_amp),
        },
        'top_10_wider_sub_orbital': [
            {'n': int(t['n']), 'period_yr': float(t['period_yr']),
             'r2': float(t['r2']), 'amplitude': float(t['amplitude'])}
            for t in top10
        ],
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

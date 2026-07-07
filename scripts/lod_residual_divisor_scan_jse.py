"""
Full 8H integer-divisor scan against the Stephenson ΔT residual, with
Jupiter-Saturn-Earth (J-S-E) resonance interpretation for each top divisor.

Analogous to milankovitch_8h_divisor_spectrum.py (which scans against
LR04 paleoclimate), but scans against the L-5b eclipse-timing residual
instead. Reports the top divisors that reduce the medieval bump, and
cross-references each with the closest J-S-E orbital/synodic count.

Motivation:
  Single-Bond (8H/1825 = 1470 yr) reduces the medieval bump only ~50%.
  This scan asks: are there OTHER 8H integer divisors that also carry
  signal in the ΔT residual? If so, do they form a coherent J-S-E
  resonance family?

Method:
  1. Build residual = Stephenson polynomial − our framework's ΔT on a
     10-yr grid across [-720, 2016].
  2. For each integer n from 500 to 5000 (covering periods ~500 to
     ~5000 yr — the sub-Milankovitch band the paper's L1 layer does
     not currently reach):
       fit: residual ≈ intercept + linear·u + quadratic·u² + a·cos(ω_n·y) + b·sin(ω_n·y)
       where ω_n = 2π·n / 8H
     Report amplitude = √(a² + b²), phase, R² over polynomial-only baseline.
  3. Rank divisors by ΔR² (single-component R² gain over polynomial-only fit).
  4. For the top 20, compute:
     - Nearest integer counts of Jupiter orbit (11.86 yr), Saturn orbit
       (29.46 yr), J-S synodic (19.85 yr), Great Conjunction 60-yr trigon,
       de Vries (210 yr), Gleissberg (88 yr), Jose (179 yr)
     - Ratio error (%) for each interpretation
     - Framework structural period matches
  5. Verdict: coherent J-S-E family present, or scattered non-resonant.

Output: JSON artifact at data/deltaT-divisor-scan-jse.json for downstream
        analysis, plus a human-readable console report.
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    H, EIGHT_H, load_stephenson, stephenson_delta_t_vector,
    model_delta_t_vector, fit_harmonics, harmonic_amp_phase,
)

OUT_PATH = Path('/home/dennis/code/3d/data/deltaT-divisor-scan-jse.json')

# ═══════════════════════════════════════════════════════════════════════
# J-S-E interpretation dictionary
# ═══════════════════════════════════════════════════════════════════════

# Base periods (yr) for reference. Uses framework-consistent values —
# Jupiter and Saturn orbital periods derived from the framework's H
# quantization, J-S synodic derived from those.
JUPITER_PERIOD_YR       = 11.8598   # H / round(H × solar_days / 4332.6 days)
SATURN_PERIOD_YR        = 29.4570   # H / round(H × solar_days / 10759.2 days)
J_S_SYNODIC_YR          = 1.0 / (1.0/JUPITER_PERIOD_YR - 1.0/SATURN_PERIOD_YR)
                          # ≈ 19.85 yr
GREAT_CONJUNCTION_TRIGON_YR = 3 * J_S_SYNODIC_YR  # 59.55 yr
DE_VRIES_YR             = 210.0
GLEISSBERG_YR           = 88.0
JOSE_YR                 = 179.0
BOND_YR                 = 1470.0

# Framework structural periods (from paper Law 6 and elsewhere)
EARTH_PERIH_ICRF_YR     = H / 16.0              # 20,957 yr (Earth ICRF perihelion)
EARTH_PERIH_ECLIPTIC_YR = EIGHT_H / 11.0        # 243,867 yr (Earth ecliptic perihelion)
JUPITER_PERIH_ECLIPTIC_YR = EIGHT_H / 39.0      # 68,782 yr
SATURN_PERIH_ECLIPTIC_YR  = EIGHT_H / 65.0      # 329,282 yr (retrograde)
AXIAL_PRECESSION_YR     = H / 13.0              # 25,793 yr (Earth axial precession)

# Interpretation candidates: (label, base_period, "integer count" vs "1/integer subharmonic")
INTERPRETATIONS = [
    ('Jupiter orbit',        JUPITER_PERIOD_YR,       'integer'),
    ('Saturn orbit',         SATURN_PERIOD_YR,        'integer'),
    ('J-S synodic',          J_S_SYNODIC_YR,          'integer'),
    ('Great Conjunction trigon (3×J-S)', GREAT_CONJUNCTION_TRIGON_YR, 'integer'),
    ('Gleissberg 88',        GLEISSBERG_YR,           'either'),
    ('Jose 179',             JOSE_YR,                 'either'),
    ('de Vries 210',         DE_VRIES_YR,             'either'),
    ('Bond 1470',            BOND_YR,                 'either'),
    ('Earth ICRF perihelion (H/16)',    EARTH_PERIH_ICRF_YR,    'either'),
    ('Earth axial precession (H/13)',   AXIAL_PRECESSION_YR,    'either'),
    ('Earth ecliptic perihelion (8H/11)', EARTH_PERIH_ECLIPTIC_YR, 'either'),
    ('Jupiter ecliptic perihelion (8H/39)', JUPITER_PERIH_ECLIPTIC_YR, 'either'),
    ('Saturn ecliptic perihelion (8H/65)', SATURN_PERIH_ECLIPTIC_YR, 'either'),
]

def interpret_period(P_yr, tol_pct=1.0):
    """For a period P_yr, find the closest interpretation from INTERPRETATIONS.

    Returns list of (label, ratio, ratio_type, error_pct) sorted by error.
    Only entries with error < tol_pct are returned.
    """
    matches = []
    for label, base, kind in INTERPRETATIONS:
        candidates = []
        if kind in ('integer', 'either'):
            # M × base ≈ P: is P/base near an integer?
            M = P_yr / base
            M_int = round(M)
            if M_int >= 1:
                err_pct = abs(M - M_int) / M * 100
                candidates.append(('×', M_int, err_pct))
        if kind in ('subharmonic', 'either'):
            # base / M ≈ P: is base/P near an integer?
            M = base / P_yr
            M_int = round(M)
            if M_int >= 1:
                err_pct = abs(M - M_int) / M * 100
                candidates.append(('÷', M_int, err_pct))
        # Take the best-matching candidate for this base
        if candidates:
            candidates.sort(key=lambda x: x[2])
            op, m, err = candidates[0]
            if err <= tol_pct:
                matches.append({
                    'label':      label,
                    'op':         op,
                    'multiplier': m,
                    'base_yr':    base,
                    'error_pct':  err,
                })
    matches.sort(key=lambda r: r['error_pct'])
    return matches

# ═══════════════════════════════════════════════════════════════════════
# Main analysis
# ═══════════════════════════════════════════════════════════════════════

def main():
    print('=' * 90)
    print('8H INTEGER-DIVISOR SCAN AGAINST STEPHENSON ΔT RESIDUAL')
    print('with Jupiter-Saturn-Earth interpretation of top divisors')
    print('=' * 90)

    # ─── Build residual on 10-yr grid ─────────────────────────────────
    print()
    print('Computing residual (Stephenson − our model) on year grid -720 to 2016...')
    years = np.arange(-720, 2017, 10, dtype=float)
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)
    valid = ~np.isnan(dt_stephenson)
    years         = years[valid]
    dt_stephenson = dt_stephenson[valid]
    dt_model      = dt_model[valid]
    residual      = dt_stephenson - dt_model
    residual_centered = residual - residual.mean()
    print(f'  n_points: {len(years)}, RMS(residual) = {np.sqrt((residual_centered**2).mean()):.1f} s')

    # ─── Baseline: polynomial-only fit (intercept + linear + quadratic) ──
    fit_baseline = fit_harmonics(years, residual_centered, [], include_quadratic_detrend=True)
    r2_baseline = fit_baseline['r2']
    rms_baseline = fit_baseline['rms_post']
    print(f'  Baseline (poly-only) R² = {r2_baseline:.4f}, RMS = {rms_baseline:.1f} s')

    # ─── Scan range: n ∈ [500, 5000], covering P ∈ [~536, ~5365] yr ──
    n_lo, n_hi = 500, 5000
    print()
    print(f'Scanning 8H/n for n ∈ [{n_lo}, {n_hi}]:')
    print(f'  → periods in range [{EIGHT_H/n_hi:.1f}, {EIGHT_H/n_lo:.1f}] yr')
    print(f'  → single-component fit ΔR² over baseline, per divisor')
    print()

    scan_results = []
    for n in range(n_lo, n_hi + 1):
        P_actual = EIGHT_H / n
        candidate = [{'label': f'n={n}', 'P_target': P_actual, 'n': n, 'P_actual': P_actual}]
        fit = fit_harmonics(years, residual_centered, candidate, include_quadratic_detrend=True)
        ap = harmonic_amp_phase(fit, candidate)[0]
        scan_results.append({
            'n':          n,
            'P_yr':       P_actual,
            'amp_s':      ap['amplitude_s'],
            'phase_deg':  ap['phase_deg'],
            'r2':         fit['r2'],
            'delta_r2':   fit['r2'] - r2_baseline,
            'rms_s':      fit['rms_post'],
        })

    scan_results.sort(key=lambda r: -r['delta_r2'])

    # ─── Report top 20 divisors ──────────────────────────────────────
    print('=' * 90)
    print('TOP 20 8H DIVISORS (ranked by ΔR² over polynomial-only baseline)')
    print('=' * 90)
    print(f'  {"rank":>4} {"n":>5} {"P (yr)":>8} {"amp (s)":>9} {"phase":>7} {"ΔR²":>7} {"RMS (s)":>8}  J-S-E interpretation')
    print(f'  {"----":>4} {"-----":>5} {"--------":>8} {"---------":>9} {"-------":>7} {"-------":>7} {"--------":>8}  ---------------------')

    top_n = 20
    for i, r in enumerate(scan_results[:top_n]):
        matches = interpret_period(r['P_yr'], tol_pct=1.5)
        interp = ''
        if matches:
            best = matches[0]
            interp = f'{best["multiplier"]}{best["op"]}{best["label"]} ({best["error_pct"]:.2f}%)'
        print(f'  {i+1:>4} {r["n"]:>5} {r["P_yr"]:>8.1f} {r["amp_s"]:>9.1f} {r["phase_deg"]:>+7.1f} '
              f'{r["delta_r2"]:>+7.4f} {r["rms_s"]:>8.1f}  {interp}')

    # ─── Detailed J-S-E interpretation for top 10 ────────────────────
    print()
    print('=' * 90)
    print('DETAILED J-S-E RESONANCE INTERPRETATION for top 10 divisors')
    print('=' * 90)
    for i, r in enumerate(scan_results[:10]):
        print()
        print(f'  #{i+1}  n={r["n"]}  P = {r["P_yr"]:.3f} yr  amp = {r["amp_s"]:.1f} s  ΔR² = {r["delta_r2"]:+.4f}')
        matches = interpret_period(r['P_yr'], tol_pct=2.0)
        if not matches:
            print('    → no J-S-E interpretation within 2% error')
        else:
            for m in matches[:5]:  # top 5 interpretations
                print(f'    → {m["multiplier"]:>4} {m["op"]} {m["label"]:<45} '
                      f'({m["multiplier"]*m["base_yr"] if m["op"]=="×" else m["base_yr"]/m["multiplier"]:>7.2f} yr, {m["error_pct"]:.2f}% error)')

    # ─── Overall verdict ─────────────────────────────────────────────
    print()
    print('=' * 90)
    print('VERDICT')
    print('=' * 90)

    # Are the top divisors dominated by a coherent family?
    top10 = scan_results[:10]
    families_present = {}
    for r in top10:
        matches = interpret_period(r['P_yr'], tol_pct=1.5)
        if matches:
            fam = matches[0]['label']
            families_present.setdefault(fam, []).append(r['n'])

    print(f'\n  J-S-E families represented in top 10 divisors (1.5% tolerance):')
    if not families_present:
        print('    ⚠ No J-S-E interpretation found for any top divisor.')
        print('    → Residual structure is not compatible with J-S-E-based lattice.')
    else:
        for fam, ns in sorted(families_present.items(), key=lambda x: -len(x[1])):
            print(f'    {fam:<50} n = {ns}')

    # Cumulative ΔR² if all top-K divisors are used together (approximate)
    print(f'\n  Bond 8H/1825 rank in this scan: ', end='')
    bond_rank = next((i+1 for i, r in enumerate(scan_results) if r['n'] == 1825), None)
    if bond_rank:
        bond_data = next(r for r in scan_results if r['n'] == 1825)
        print(f'#{bond_rank}, ΔR² = {bond_data["delta_r2"]:+.4f}, amp = {bond_data["amp_s"]:.1f} s')
    else:
        print('not found in scan range')

    # Save full output
    output = {
        '_meta': {
            'description': '8H divisor scan against Stephenson ΔT residual with J-S-E interpretation',
            'source_script': 'scripts/lod_residual_divisor_scan_jse.py',
            'n_range':       [n_lo, n_hi],
            'period_range':  [EIGHT_H/n_hi, EIGHT_H/n_lo],
            'H_yr':          H,
            'eight_H_yr':    EIGHT_H,
            'jupiter_period_yr': JUPITER_PERIOD_YR,
            'saturn_period_yr':  SATURN_PERIOD_YR,
            'j_s_synodic_yr':    J_S_SYNODIC_YR,
        },
        'baseline': {
            'r2_polynomial_only':  r2_baseline,
            'rms_polynomial_only': rms_baseline,
        },
        'top_20': [
            {
                'rank':          i+1,
                'n':             r['n'],
                'period_yr':     r['P_yr'],
                'amplitude_s':   r['amp_s'],
                'phase_deg':     r['phase_deg'],
                'delta_r2':      r['delta_r2'],
                'rms_post_s':    r['rms_s'],
                'jse_interpretations': interpret_period(r['P_yr'], tol_pct=2.0),
            }
            for i, r in enumerate(scan_results[:top_n])
        ],
        'families_in_top10': families_present,
        'bond_rank':     bond_rank,
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'\n  Wrote scan results: {OUT_PATH}')
    print(f'  ({len(scan_results)} divisors scanned; top {top_n} details persisted)')

if __name__ == '__main__':
    main()

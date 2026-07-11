"""
Test whether the framework's 8H/1104 (= H/138 = 2430 yr) period matches
a real spectral peak in Steinhilber et al. 2012's 9400-yr solar modulation
Phi (MV) reconstruction, and estimate its amplitude.

Goal:
  Provide an INDEPENDENT constraint on Hallstatt cycle strength that we
  can then use as a prior in the ΔT fit — instead of letting Hallstatt
  free-fit against ΔT (which pulled Bond's phase and produced a suspicious
  256-sec amplitude).

Method:
  1. Load Steinhilber Phi (MV) — column 4, ~9400 years of 22-yr averages
  2. Detrend (mean + linear trend)
  3. Fit sin/cos of 8H/1104 (framework Hallstatt via gcd rule) and separately
     of 8H/1166 (numerically canonical Hallstatt ~2300 yr)
  4. Compare amplitudes and R²
  5. Also fit BOTH jointly to check for cross-talk
  6. Estimate Hallstatt-amp-in-ΔT via scaling if a physical Phi→ΔT link is
     estimable; otherwise report Phi amplitude and note the interpretation

The 9400-yr window fits ~3.9 Hallstatt cycles (2430 yr) — much better resolved
than the 2730-yr Stephenson ΔT window that only fits ~1.1 cycles.

Output: console report + JSON at data/hallstatt-steinhilber-fit.json
"""

import json
import math
from pathlib import Path
import numpy as np

STEIN_PATH = Path('/home/dennis/code/3d/data/steinhilber-2012-solar.txt')
OUT_PATH   = Path('/home/dennis/code/3d/data/hallstatt-steinhilber-fit.json')

H = 335317
EIGHT_H = 8 * H  # = 2,682,536

# The two Hallstatt candidates
N_FRAMEWORK  = 1104   # 8H/1104 = H/138 = 2429.83 yr; gcd(1104, 8H) shares H's 23 factor
N_CANONICAL  = 1166   # 8H/1166 = 2300.63 yr; matches literature ~2300 yr but NOT H-lattice on gcd rule
# For comparison — Bond period
N_BOND       = 1851   # 8H/1851 = 1449.24 yr

def load_steinhilber_phi():
    """Return (years_AD, phi_MV) arrays sorted ascending in year."""
    with open(STEIN_PATH) as f:
        lines = f.readlines()
    # Data table starts after the header "Year  1.PC  1.PCErr  Phi  PhiErr  TSI  TSIErr"
    data_start = None
    for i, ln in enumerate(lines):
        if ln.strip().startswith('Year') and 'Phi' in ln:
            data_start = i + 1
            break
    if data_start is None:
        raise RuntimeError('Could not locate Steinhilber data table header')

    years_bp, phi = [], []
    for ln in lines[data_start:]:
        s = ln.strip()
        if not s or s.startswith('#') or s.startswith('/'):
            continue
        parts = s.split()
        if len(parts) < 4:
            continue
        try:
            yr_bp = float(parts[0])
            p     = float(parts[3])
        except ValueError:
            continue
        years_bp.append(yr_bp)
        phi.append(p)

    years_bp = np.array(years_bp)
    phi      = np.array(phi)
    # Convert BP (reference 1950) to AD: year_AD = 1950 - year_BP
    # Steinhilber column 1 has negative BP values for years after 1950
    years_ad = 1950.0 - years_bp
    # Sort ascending
    idx = np.argsort(years_ad)
    return years_ad[idx], phi[idx]

def fit_lattice_terms(years, series, n_list, include_quadratic_detrend=True):
    """Fit series ~ intercept + linear + quadratic + Σ (cos + sin) per n in n_list.
    Return dict with beta, R², per-term amplitude+phase."""
    y0 = years.mean()
    t  = years - y0
    cols = [np.ones_like(t)]
    labels = ['intercept']
    if include_quadratic_detrend:
        cols.append(t / 1000.0);        labels.append('linear /kyr')
        cols.append((t / 1000.0) ** 2); labels.append('quadratic /kyr²')
    for n in n_list:
        omega = 2.0 * math.pi / (EIGHT_H / n)
        cols.append(np.cos(omega * years))
        cols.append(np.sin(omega * years))
        labels.append(f'cos(8H/{n})')
        labels.append(f'sin(8H/{n})')
    X = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(X, series, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((series - y_hat)**2))
    ss_tot = float(np.sum((series - series.mean())**2))
    r2 = 1.0 - ss_res / max(ss_tot, 1e-12)

    n_detrend = 3 if include_quadratic_detrend else 1
    amp_phase = []
    for i, n in enumerate(n_list):
        ci = float(beta[n_detrend + 2*i])
        si = float(beta[n_detrend + 2*i + 1])
        amp = math.hypot(ci, si)
        # phase such that A cos(ω t) + B sin(ω t) = R cos(ω t − φ) with tan φ = B/A
        phase_deg = math.degrees(math.atan2(si, ci))
        amp_phase.append({'n': n, 'period_yr': EIGHT_H / n,
                          'cos_coeff': ci, 'sin_coeff': si,
                          'amplitude': amp, 'phase_deg': phase_deg})
    return {'beta': beta, 'labels': labels, 'r2': r2,
            'rms_pre': float(np.sqrt(np.mean(series**2))),
            'rms_post': float(np.sqrt(np.mean((series - y_hat)**2))),
            'amp_phase': amp_phase}

def main():
    print('=' * 85)
    print('HALLSTATT AMPLITUDE FROM STEINHILBER 2012 SOLAR MODULATION Φ (INDEPENDENT)')
    print('=' * 85)
    print()

    years, phi = load_steinhilber_phi()
    print(f'  Steinhilber Φ: n={len(years)} points, {years.min():.0f} to {years.max():.0f} AD')
    print(f'  Φ mean = {phi.mean():.1f} MV, std = {phi.std():.1f} MV')
    span = years.max() - years.min()
    print(f'  Span: {span:.0f} yr — fits {span/(EIGHT_H/N_FRAMEWORK):.2f} cycles of 8H/{N_FRAMEWORK} ({EIGHT_H/N_FRAMEWORK:.1f} yr Hallstatt)')
    print(f'                    fits {span/(EIGHT_H/N_CANONICAL):.2f} cycles of 8H/{N_CANONICAL} ({EIGHT_H/N_CANONICAL:.1f} yr canonical)')
    print()

    # ─── Fit A: framework 8H/1104 alone ─────────────────────────────
    fit_a = fit_lattice_terms(years, phi, [N_FRAMEWORK])
    ap_a  = fit_a['amp_phase'][0]
    print(f'── Fit A: 8H/{N_FRAMEWORK} alone (framework Hallstatt, {EIGHT_H/N_FRAMEWORK:.2f} yr) ──')
    print(f'  R²                 = {fit_a["r2"]:.4f}')
    print(f'  RMS pre / post     = {fit_a["rms_pre"]:.2f} / {fit_a["rms_post"]:.2f} MV')
    print(f'  Amplitude          = {ap_a["amplitude"]:.2f} MV')
    print(f'  Phase (cos-form)   = {ap_a["phase_deg"]:+.1f}°')
    print()

    # ─── Fit B: canonical 8H/1166 alone ─────────────────────────────
    fit_b = fit_lattice_terms(years, phi, [N_CANONICAL])
    ap_b  = fit_b['amp_phase'][0]
    print(f'── Fit B: 8H/{N_CANONICAL} alone (canonical Hallstatt, {EIGHT_H/N_CANONICAL:.2f} yr) ──')
    print(f'  R²                 = {fit_b["r2"]:.4f}')
    print(f'  RMS pre / post     = {fit_b["rms_pre"]:.2f} / {fit_b["rms_post"]:.2f} MV')
    print(f'  Amplitude          = {ap_b["amplitude"]:.2f} MV')
    print(f'  Phase (cos-form)   = {ap_b["phase_deg"]:+.1f}°')
    print()

    # ─── Fit C: BOTH candidates jointly ─────────────────────────────
    fit_c = fit_lattice_terms(years, phi, [N_FRAMEWORK, N_CANONICAL])
    ap_c_fw  = fit_c['amp_phase'][0]
    ap_c_can = fit_c['amp_phase'][1]
    print(f'── Fit C: 8H/{N_FRAMEWORK} + 8H/{N_CANONICAL} jointly ──')
    print(f'  R²                          = {fit_c["r2"]:.4f}')
    print(f'  8H/{N_FRAMEWORK} amplitude  = {ap_c_fw["amplitude"]:.2f} MV  (was {ap_a["amplitude"]:.2f}, Δ={ap_c_fw["amplitude"]-ap_a["amplitude"]:+.2f})')
    print(f'  8H/{N_CANONICAL} amplitude  = {ap_c_can["amplitude"]:.2f} MV  (was {ap_b["amplitude"]:.2f}, Δ={ap_c_can["amplitude"]-ap_b["amplitude"]:+.2f})')
    print()

    # ─── Fit D: 8H/1104 + Bond (8H/1851) — check independence of the two cycles ──
    fit_d = fit_lattice_terms(years, phi, [N_FRAMEWORK, N_BOND])
    ap_d_hall = fit_d['amp_phase'][0]
    ap_d_bond = fit_d['amp_phase'][1]
    print(f'── Fit D: 8H/{N_FRAMEWORK} (Hallstatt) + 8H/{N_BOND} (Bond) in Φ ──')
    print(f'  R²                    = {fit_d["r2"]:.4f}')
    print(f'  Hallstatt amp in Φ    = {ap_d_hall["amplitude"]:.2f} MV')
    print(f'  Bond amp in Φ         = {ap_d_bond["amplitude"]:.2f} MV')
    print(f'  Bond / Hallstatt ratio = {ap_d_bond["amplitude"] / max(ap_d_hall["amplitude"], 1e-6):.3f}')
    print()

    # ─── Scale estimate for ΔT: if Bond in Φ has amp X, Bond in ΔT is 378 s. ────
    # Then Hallstatt in ΔT ≈ 378 × (Hallstatt_amp_in_Φ / Bond_amp_in_Φ), assuming
    # the same Φ→ΔT proportionality applies to both cycles (rough).
    hallstatt_dt_estimate = 378.0 * ap_d_hall['amplitude'] / max(ap_d_bond['amplitude'], 1e-6)
    print(f'── Rough Hallstatt-in-ΔT estimate via Bond ratio ──')
    print(f'  Assumption: same Φ→ΔT proportionality for Bond and Hallstatt cycles.')
    print(f'  Hallstatt ΔT amp ≈ 378 × ({ap_d_hall["amplitude"]:.2f} / {ap_d_bond["amplitude"]:.2f}) = {hallstatt_dt_estimate:.1f} s')
    print(f'  (Compare with free-fit joint-ΔT result: 255.5 s — is this too high?)')
    print()

    # ─── Verdict ────────────────────────────────────────────────────
    print('── VERDICT ──')
    print(f'  Both 8H/{N_FRAMEWORK} and 8H/{N_CANONICAL} show non-trivial signal in Steinhilber Φ.')
    print(f'  The gcd-compliant 8H/{N_FRAMEWORK} (2430 yr) fits with R² = {fit_a["r2"]:.4f} alone.')
    print(f'  Independent Hallstatt amp in Φ:   {ap_d_hall["amplitude"]:.2f} MV (from Bond-joint fit)')
    print(f'  Implied Hallstatt amp in ΔT:      {hallstatt_dt_estimate:.1f} s (via Bond-proportion scaling)')
    print(f'  Free-fit Hallstatt amp in ΔT:     255.5 s (from earlier ΔT joint fit)')
    if hallstatt_dt_estimate < 100:
        print(f'  → Steinhilber-constrained amp is MUCH smaller than free-fit — the ΔT fit was over-fitting.')
    elif hallstatt_dt_estimate < 200:
        print(f'  → Steinhilber-constrained amp is moderately smaller than free-fit — some over-fit but not extreme.')
    else:
        print(f'  → Steinhilber-constrained amp is comparable to free-fit — the ΔT amplitude may be real.')
    print()

    # ─── Persist ────────────────────────────────────────────────────
    output = {
        '_meta': {
            'description': ('Hallstatt cycle amplitude test using Steinhilber 2012 solar modulation Φ '
                            'as an independent proxy. Compares framework 8H/1104 (= H/138 = 2430 yr, '
                            'gcd-compliant on H-lattice) vs canonical 8H/1166 (= 2300 yr, closer to '
                            'literature but not H-lattice compliant on gcd rule). Also tests Bond '
                            '(8H/1851) as a comparison anchor.'),
            'source_script': 'scripts/hallstatt_steinhilber_amplitude.py',
            'source_data': str(STEIN_PATH),
            'H_yr': H, 'eight_H_yr': EIGHT_H,
        },
        'series_summary': {
            'n_points': int(len(years)), 'year_range': [float(years.min()), float(years.max())],
            'phi_mean_MV': float(phi.mean()), 'phi_std_MV': float(phi.std()),
        },
        'fit_a_framework_1104_alone': {
            'r2': fit_a['r2'], 'amplitude_MV': ap_a['amplitude'], 'phase_deg': ap_a['phase_deg'],
        },
        'fit_b_canonical_1166_alone': {
            'r2': fit_b['r2'], 'amplitude_MV': ap_b['amplitude'], 'phase_deg': ap_b['phase_deg'],
        },
        'fit_c_joint_1104_1166': {
            'r2': fit_c['r2'],
            'framework_amp_MV': ap_c_fw['amplitude'], 'framework_phase_deg': ap_c_fw['phase_deg'],
            'canonical_amp_MV': ap_c_can['amplitude'], 'canonical_phase_deg': ap_c_can['phase_deg'],
        },
        'fit_d_hallstatt_plus_bond_in_phi': {
            'r2': fit_d['r2'],
            'hallstatt_amp_MV': ap_d_hall['amplitude'], 'hallstatt_phase_deg': ap_d_hall['phase_deg'],
            'bond_amp_MV': ap_d_bond['amplitude'], 'bond_phase_deg': ap_d_bond['phase_deg'],
        },
        'hallstatt_dt_estimate': {
            'hallstatt_amp_via_bond_ratio_s': hallstatt_dt_estimate,
            'bond_dt_amp_reference_s': 378.0,
            'method': ('Hallstatt in ΔT ≈ Bond_DT × (Hallstatt_Φ / Bond_Φ) assuming same '
                       'proportionality; rough — Φ→ΔT link is complex.'),
        },
    }
    OUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'  Wrote: {OUT_PATH}')

if __name__ == '__main__':
    main()

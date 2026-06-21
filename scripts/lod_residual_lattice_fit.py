"""
OPTION 1: Sub-kyr 8H/n lattice harmonic fit to the Stephenson ΔT residual.

Hypothesis: The model residual (Stephenson polynomial − our framework's ΔT)
peaks at year ~960 with FWHM ~700 yr. We test whether this residual can be
explained by a SMALL set of 8H/n lattice harmonics whose periods coincide
with known sub-Milankovitch solar/climate cycles — Bond (~1470 yr), de Vries
(~210 yr), Gleissberg (~88 yr), Hallstatt (~2200 yr), Eddy (~1000 yr).

A clean fit (≤ 5 components, R² > 0.7) with periods near known external
cycles → real result: the framework's 8H lattice extends naturally to
sub-kyr timescales and absorbs the medieval bump.

A messy fit (many components, no alignment with known cycles, R² climbs
with arbitrary n) → overfitting, abandon.

PIPELINE:
  1. Port LOD function from src/script.js (self-contained Python).
  2. Compute model ΔT(year) by integrating (LOD(t)-86400) on a year grid.
  3. Compute Stephenson ΔT(year) from the polynomial spline JSON.
  4. Form residual = Stephenson − our model. Detrend with year + year².
  5. Fit candidate 8H/n harmonics (cosine + sine pair per integer).
  6. Report per-integer amplitudes, R², test for overfitting via subset fits.
"""

import json
import math
from pathlib import Path
import numpy as np

# ============================================================================
# FRAMEWORK CONSTANTS (verbatim from src/script.js)
# ============================================================================

# Foundational
H                            = 335317
SOLAR_YEAR_INPUT_DAYS        = 365.2422
SIDEREAL_YEAR_J2000_DAYS     = 365.25636301
SECS_PER_DAY_TAI             = 86400.0

# Moon
MOON_SID_MONTH_INPUT_DAYS    = 27.32166156
MOON_DISTANCE_KM             = 384399.07
MOON_ECC_BASE                = 0.054900489

# Physics
G_CONSTANT_KM3_KG_S2         = 6.6743e-20
MASS_RATIO_EARTH_MOON        = 81.30056816

# Earth
EARTH_DIAMETER_KM            = 12756.27
EARTH_MOI_FACTOR             = 0.3306947
EARTH_MOI_FACTOR_RATE_YR     = -1.8e-11

# Multi-mode α(t) (Peltier ICE-5G(VM2) decomposition)
GIA_MODES = [
    {'tau': 1500,  'frac': 0.15},
    {'tau': 5000,  'frac': 0.55},
    {'tau': 14000, 'frac': 0.30},
]

# Farhat 2022 Moon distance polynomial coefficients (t in Ma)
ALPHA_1 = -8.8658188951e-05
ALPHA_3 = -6.4186463489e-12
ALPHA_4 = +1.3619800519e-16

# ============================================================================
# DERIVED CONSTANTS — same chain as script.js
# ============================================================================

# Sidereal year length in TAI seconds (from siderealYearJ2000 × 86400)
MEAN_SIDEREAL_YEAR_S = SIDEREAL_YEAR_J2000_DAYS * SECS_PER_DAY_TAI  # 31,558,149.864

# Quantize mean solar year to H/8 grid
H_OVER_8 = H / 8.0  # = 41914.625 (not integer; but script.js does this anyway)
MEAN_SOLAR_YEAR_DAYS = round(SOLAR_YEAR_INPUT_DAYS * H_OVER_8) / H_OVER_8

# Sidereal year in days via H/13 precession ratio
H_OVER_13 = H / 13.0
MEAN_SIDEREAL_YEAR_DAYS = MEAN_SOLAR_YEAR_DAYS * H_OVER_13 / (H_OVER_13 - 1.0)

# Mean length of day (this is "LOD_NOW", anchor for Earth rotation rate at J2000)
MEAN_LENGTH_OF_DAY_S = MEAN_SIDEREAL_YEAR_S / MEAN_SIDEREAL_YEAR_DAYS

# Moon sidereal month — quantized to integer rotations per H solar years
HX_DAYS = H * MEAN_SOLAR_YEAR_DAYS
MOON_SIDEREAL_MONTH_DAYS = HX_DAYS / round(HX_DAYS / MOON_SID_MONTH_INPUT_DAYS)

# Moon orbital correction (barycentric offset)
MOON_ORBITAL_SHIFT_KM = (MOON_DISTANCE_KM
                         * (1.0 / (MASS_RATIO_EARTH_MOON + 1.0))
                         * MOON_SIDEREAL_MONTH_DAYS / MEAN_SIDEREAL_YEAR_DAYS)
MOON_DISTANCE_CORR_KM = MOON_DISTANCE_KM + MOON_ORBITAL_SHIFT_KM

# GM_EARTH_MOON_SYSTEM (Kepler's 3rd law on corrected orbit)
T_MOON_S = MOON_SIDEREAL_MONTH_DAYS * MEAN_LENGTH_OF_DAY_S
GM_EARTH_MOON_KM3_S2 = (4.0 * math.pi**2 * MOON_DISTANCE_CORR_KM**3) / (T_MOON_S**2)
GM_EARTH_MOON_M3_S2  = GM_EARTH_MOON_KM3_S2 * 1e9

# Mass partition
GM_EARTH_ALONE = GM_EARTH_MOON_KM3_S2 * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1.0))
GM_MOON_ALONE  = GM_EARTH_MOON_KM3_S2 / (MASS_RATIO_EARTH_MOON + 1.0)
M_EARTH_ALONE  = GM_EARTH_ALONE / G_CONSTANT_KM3_KG_S2
M_MOON_ALONE   = GM_MOON_ALONE / G_CONSTANT_KM3_KG_S2

# Earth radius
R_EARTH_M = (EARTH_DIAMETER_KM / 2.0) * 1000.0

# Total Earth-Moon angular momentum (conserved anchor at J2000)
I_EARTH_J2000  = EARTH_MOI_FACTOR * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M
A_MOON_NOW_M   = MOON_DISTANCE_KM * 1000.0
E_FACTOR_MOON  = math.sqrt(1.0 - MOON_ECC_BASE**2)
L_TOTAL_EM = (I_EARTH_J2000 * 2.0 * math.pi / MEAN_LENGTH_OF_DAY_S
              + M_MOON_ALONE * math.sqrt(GM_EARTH_MOON_M3_S2 * A_MOON_NOW_M) * E_FACTOR_MOON)

# GIA mode amplitudes (Δαᵢ = frac × |dα/dt| × τ)
GIA_MODE_AMPLITUDES = [(-EARTH_MOI_FACTOR_RATE_YR) * m['frac'] * m['tau'] for m in GIA_MODES]

# ============================================================================
# MODEL FUNCTIONS (ported from src/script.js)
# ============================================================================

def earth_moi_factor_at_age(t_Ma):
    """α(t) — polar moment coefficient at age t_Ma (millions of years before J2000)."""
    t_age_yr = t_Ma * 1e6
    if t_age_yr >= 0:
        alpha_excess = 0.0
        for amp, mode in zip(GIA_MODE_AMPLITUDES, GIA_MODES):
            alpha_excess += amp * (1.0 - math.exp(-t_age_yr / mode['tau']))
        return EARTH_MOI_FACTOR + alpha_excess
    return EARTH_MOI_FACTOR - EARTH_MOI_FACTOR_RATE_YR * t_age_yr

def i_earth_at_age(t_Ma):
    return earth_moi_factor_at_age(t_Ma) * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M

def mean_moon_distance_metres_at_age(t_Ma):
    t = t_Ma
    return A_MOON_NOW_M * (1.0 + ALPHA_1*t + ALPHA_3*t*t*t + ALPHA_4*t*t*t*t)

def mean_lod_seconds_at_age(t_Ma):
    a = mean_moon_distance_metres_at_age(t_Ma)
    return ((2.0 * math.pi * i_earth_at_age(t_Ma)) /
            (L_TOTAL_EM - M_MOON_ALONE * math.sqrt(GM_EARTH_MOON_M3_S2 * a) * E_FACTOR_MOON))

def model_delta_t_at_year(year, year_anchor=1820.0):
    """Our model's ΔT(year) in seconds, integrated from year_anchor.

    ΔT(t) − ΔT(ref) = ∫ (LOD(t') − 86400) × n_days dt'
                    ≈ Σ_{y=ref+1}^{t} (LOD(y) − 86400) × 365.25
    """
    if year == year_anchor:
        return 0.0
    sign = 1 if year > year_anchor else -1
    y_lo = min(year, year_anchor)
    y_hi = max(year, year_anchor)
    total = 0.0
    # Trapezoidal sum with 1-year step
    n_steps = int(round(y_hi - y_lo))
    for k in range(n_steps + 1):
        y_eval = y_lo + k
        t_Ma = (2000.0 - y_eval) / 1e6  # J2000 is year 2000 to first order
        lod = mean_lod_seconds_at_age(t_Ma)
        weight = 0.5 if (k == 0 or k == n_steps) else 1.0
        total += weight * (lod - SECS_PER_DAY_TAI) * 365.25
    return sign * total

# Vectorized version (much faster for many years)
def model_delta_t_vector(years, year_anchor=1820.0):
    """Compute ΔT(year) for a numpy array of years in one pass."""
    years = np.asarray(years, dtype=float)
    y_min, y_max = float(years.min()), float(years.max())
    y_grid = np.arange(min(y_min, year_anchor), max(y_max, year_anchor) + 1.0, 1.0)
    t_Ma_grid = (2000.0 - y_grid) / 1e6
    lod_grid = np.array([mean_lod_seconds_at_age(t) for t in t_Ma_grid])
    lod_anom = (lod_grid - SECS_PER_DAY_TAI) * 365.25  # seconds per year of "lag"
    # Cumulative ΔT from year_anchor: integrate (trapezoidal) forwards & backwards
    # Trick: cumulative sum with anchor at year_anchor
    idx_anchor = int(round(year_anchor - y_grid[0]))
    # Forward integration from anchor
    cumul = np.cumsum(lod_anom) - lod_anom  # = sum up to (not including) current; offset by 0.5
    # Use the proper trapezoidal cumulative integral
    cumul = np.zeros_like(lod_anom)
    cumul[1:] = np.cumsum(0.5 * (lod_anom[:-1] + lod_anom[1:]))
    # ΔT(year) = cumul[year] - cumul[anchor]
    deltaT_grid = cumul - cumul[idx_anchor]
    # Look up values at requested years
    deltaT_at_years = np.interp(years, y_grid, deltaT_grid)
    return deltaT_at_years

# ============================================================================
# STEPHENSON POLYNOMIAL EVALUATION
# ============================================================================

STEPHENSON_JSON = Path('/home/dennis/code/3d/public/input/stephenson-2016-deltaT-polynomial.json')

def load_stephenson():
    return json.loads(STEPHENSON_JSON.read_text())['segments']

def stephenson_delta_t(year, segments):
    """ΔT(year) in seconds from Stephenson Table-S15 polynomial spline."""
    for seg in segments:
        if seg['y0'] <= year <= seg['y1']:
            t = (year - seg['y0']) / (seg['y1'] - seg['y0'])
            a = seg['a']
            return a[0] + a[1]*t + a[2]*t*t + a[3]*t*t*t
    return None

def stephenson_delta_t_vector(years, segments):
    out = np.zeros_like(np.asarray(years, dtype=float))
    for i, y in enumerate(years):
        v = stephenson_delta_t(float(y), segments)
        out[i] = v if v is not None else np.nan
    return out

# ============================================================================
# CANDIDATE 8H/n LATTICE HARMONICS
# ============================================================================

EIGHT_H = 8 * H  # 2,682,536 years

# Candidate integers whose period 8H/n matches known sub-Milankovitch cycles.
# Each entry: (label, target_period_yr, n_integer, actual_period_yr)
def n_for_period(P_yr):
    return round(EIGHT_H / P_yr)

CANDIDATES = []
for label, P_target in [
    ('Hallstatt ~2200-2400 yr',  2300),
    ('Eddy/2200 alt',            1800),
    ('Bond ~1470 yr',            1470),
    ('"Suess-Hallstatt" ~1200',  1200),
    ('Eddy/Eddy-Bond ~1000 yr',  1000),
    ('MWP-FWHM-fit ~800 yr',      800),
    ('MWP-FWHM-tight ~700 yr',    700),
    ('500 yr',                    500),
    ('400 yr',                    400),
    ('de Vries/Suess ~210 yr',    210),
    ('Gleissberg ~88 yr',          88),
]:
    n = n_for_period(P_target)
    actual_P = EIGHT_H / n
    CANDIDATES.append({
        'label':       label,
        'P_target':    P_target,
        'n':           n,
        'P_actual':    actual_P,
    })

# ============================================================================
# MAIN ANALYSIS
# ============================================================================

def fit_harmonics(years, residual, candidates, include_quadratic_detrend=True):
    """Fit residual ~ linear/quadratic detrend + Σ cos/sin pairs per candidate.

    Returns: dict with fitted coefficients, R², per-component amplitude/phase.
    """
    years = np.asarray(years, dtype=float)
    residual = np.asarray(residual, dtype=float)

    # Center years for numerical stability
    y0 = years.mean()
    t = years - y0

    cols = [np.ones_like(t)]
    col_labels = ['intercept']
    if include_quadratic_detrend:
        cols.append(t / 1000.0)
        col_labels.append('linear (per kyr)')
        cols.append((t / 1000.0) ** 2)
        col_labels.append('quadratic (per kyr²)')
    # Harmonic pairs
    for c in candidates:
        omega = 2.0 * math.pi / c['P_actual']
        cols.append(np.cos(omega * years))
        cols.append(np.sin(omega * years))
        col_labels.append(f'cos(n={c["n"]})')
        col_labels.append(f'sin(n={c["n"]})')

    X = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(X, residual, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((residual - y_hat) ** 2))
    ss_tot = float(np.sum((residual - residual.mean()) ** 2))
    r2 = 1.0 - ss_res / max(ss_tot, 1e-12)

    return {
        'beta':       beta,
        'col_labels': col_labels,
        'y_hat':      y_hat,
        'residual':   residual - y_hat,
        'r2':         r2,
        'rms_pre':    float(np.sqrt(np.mean(residual**2))),
        'rms_post':   float(np.sqrt(np.mean((residual - y_hat)**2))),
    }

def harmonic_amp_phase(fit, candidates):
    """Extract per-candidate amplitude/phase from cos/sin coefficients."""
    n_detrend = sum(1 for L in fit['col_labels'] if not L.startswith('cos') and not L.startswith('sin'))
    out = []
    for i, c in enumerate(candidates):
        cos_idx = n_detrend + 2*i
        sin_idx = cos_idx + 1
        a = fit['beta'][cos_idx]
        b = fit['beta'][sin_idx]
        amp = float(math.sqrt(a*a + b*b))
        phase = float(math.degrees(math.atan2(-b, a)))  # cos-form phase
        out.append({'label': c['label'], 'n': c['n'], 'P_actual': c['P_actual'],
                    'amplitude_s': amp, 'phase_deg': phase})
    return out

def main():
    print('=' * 80)
    print('OPTION 1: Sub-kyr 8H/n LATTICE FIT TO STEPHENSON ΔT RESIDUAL')
    print('=' * 80)

    # ─── Sanity-check derived constants ─────────────────────────────────
    print()
    print('Derived constants (should match script.js):')
    print(f'  MEAN_LENGTH_OF_DAY_S        = {MEAN_LENGTH_OF_DAY_S:.6f} s  (script.js LOD_NOW_H13_S)')
    print(f'  MEAN_SIDEREAL_YEAR_DAYS     = {MEAN_SIDEREAL_YEAR_DAYS:.6f}')
    print(f'  GM_EARTH_MOON_KM3_S2        = {GM_EARTH_MOON_KM3_S2:.4f} km³/s²')
    print(f'  M_EARTH_ALONE               = {M_EARTH_ALONE:.4e} kg')
    print(f'  I_EARTH_J2000               = {I_EARTH_J2000:.4e} kg·m²')
    print(f'  L_TOTAL_EM                  = {L_TOTAL_EM:.4e} kg·m²/s')
    print(f'  LOD at t_Ma=0               = {mean_lod_seconds_at_age(0.0):.9f} s')
    print(f'  α at t_Ma=0                 = {earth_moi_factor_at_age(0.0):.9f}')
    print(f'  α at year 1000 CE (t_age=1000): {earth_moi_factor_at_age(1.0/1000):.9f}')
    print(f'  α at 380 Ma (deep paleo)    = {earth_moi_factor_at_age(380.0):.9f}')

    # ─── Build residual time series ─────────────────────────────────────
    print()
    print('Computing residual (Stephenson − our model) on year grid -720 to 2016...')
    years = np.arange(-720, 2017, 10, dtype=float)  # 10-yr resolution
    stephenson_segments = load_stephenson()
    dt_stephenson = stephenson_delta_t_vector(years, stephenson_segments)
    dt_model      = model_delta_t_vector(years, year_anchor=1820.0)

    valid = ~np.isnan(dt_stephenson)
    years = years[valid]
    dt_stephenson = dt_stephenson[valid]
    dt_model      = dt_model[valid]

    residual = dt_stephenson - dt_model
    # Center residual: remove mean (the anchor-year choice introduces a constant offset)
    residual_centered = residual - residual.mean()

    print(f'  n_points: {len(years)}, year range [{years.min():.0f}, {years.max():.0f}]')
    print(f'  Stephenson ΔT range: {dt_stephenson.min():.0f} to {dt_stephenson.max():.0f} s')
    print(f'  Our model ΔT range:  {dt_model.min():.0f} to {dt_model.max():.0f} s')
    print(f'  Residual range:      {residual.min():.0f} to {residual.max():.0f} s')
    print(f'  Residual RMS (pre-detrend): {np.sqrt(np.mean(residual_centered**2)):.1f} s')

    # Spot-check at year 960 (the known peak of the medieval bump)
    idx_960 = int(np.argmin(np.abs(years - 960)))
    print(f'  At year {years[idx_960]:.0f}: Stephenson ΔT = {dt_stephenson[idx_960]:.1f} s, '
          f'model ΔT = {dt_model[idx_960]:.1f} s, residual = {residual[idx_960]:.1f} s')

    # ─── PRINT THE RESIDUAL SHAPE (for visual reference) ────────────────
    print()
    print('Residual shape (centered, 100-yr spacing):')
    print(f'  {"Year":>5} {"Residual (s)":>14}  Bar')
    show_years = np.arange(-700, 2017, 100, dtype=float)
    for sy in show_years:
        idx = int(np.argmin(np.abs(years - sy)))
        rv = residual_centered[idx]
        bar_len = int(40 * (rv - residual_centered.min()) / max(residual_centered.max() - residual_centered.min(), 1e-9))
        bar = '#' * bar_len
        marker = ' <-- MWP peak' if abs(sy - 1000) < 50 else ''
        print(f'  {sy:>5.0f} {rv:>+14.1f}  {bar}{marker}')

    # ─── STAGE A: Fit one harmonic at a time (single-component scan) ────
    print()
    print('=' * 80)
    print('STAGE A: SINGLE-COMPONENT scan — fit residual ≈ detrend + ONE harmonic')
    print('=' * 80)
    print(f'  Reports R² gain over detrend-only fit, per candidate cycle.')
    print()
    fit_detrend_only = fit_harmonics(years, residual_centered, [], include_quadratic_detrend=True)
    print(f'  Detrend-only baseline R² = {fit_detrend_only["r2"]:.4f}')
    print(f'  Detrend-only RMS         = {fit_detrend_only["rms_post"]:.1f} s')
    print()
    print(f'  {"Label":<28} {"P_target":>10} {"n":>7} {"P_actual":>10} {"amp (s)":>10} {"phase":>7} {"R²":>7} {"ΔR²":>7}')
    print(f'  {"-"*28} {"-"*10} {"-"*7} {"-"*10} {"-"*10} {"-"*7} {"-"*7} {"-"*7}')

    single_fits = []
    for c in CANDIDATES:
        fit1 = fit_harmonics(years, residual_centered, [c], include_quadratic_detrend=True)
        ampphase = harmonic_amp_phase(fit1, [c])[0]
        delta_r2 = fit1['r2'] - fit_detrend_only['r2']
        single_fits.append({
            'label': c['label'], 'n': c['n'], 'P_actual': c['P_actual'],
            'amp': ampphase['amplitude_s'], 'phase': ampphase['phase_deg'],
            'r2': fit1['r2'], 'delta_r2': delta_r2,
        })
        print(f'  {c["label"]:<28} {c["P_target"]:>10} {c["n"]:>7d} {c["P_actual"]:>10.1f} '
              f'{ampphase["amplitude_s"]:>10.1f} {ampphase["phase_deg"]:>+7.1f} '
              f'{fit1["r2"]:>7.4f} {delta_r2:>+7.4f}')

    # ─── STAGE B: Fit all candidates simultaneously ─────────────────────
    print()
    print('=' * 80)
    print('STAGE B: ALL candidates simultaneously')
    print('=' * 80)
    fit_all = fit_harmonics(years, residual_centered, CANDIDATES, include_quadratic_detrend=True)
    ampphase_all = harmonic_amp_phase(fit_all, CANDIDATES)
    print(f'  Combined R² = {fit_all["r2"]:.4f}')
    print(f'  Combined RMS after fit = {fit_all["rms_post"]:.1f} s')
    print(f'  Number of harmonic components: {len(CANDIDATES)}  ({2*len(CANDIDATES)} sin/cos terms)')
    print()
    print(f'  {"Label":<28} {"n":>7} {"P":>8} {"amp (s)":>10} {"phase":>7}')
    print(f'  {"-"*28} {"-"*7} {"-"*8} {"-"*10} {"-"*7}')
    for ap in ampphase_all:
        print(f'  {ap["label"]:<28} {ap["n"]:>7d} {ap["P_actual"]:>8.1f} {ap["amplitude_s"]:>10.1f} {ap["phase_deg"]:>+7.1f}')

    # ─── STAGE C: Greedy subset selection ───────────────────────────────
    print()
    print('=' * 80)
    print('STAGE C: GREEDY subset selection — best k components')
    print('=' * 80)
    print(f'  Start with no harmonics. At each step add the candidate that')
    print(f'  produces the largest ΔR². Stop when ΔR² < 0.01 or all candidates used.')
    print()

    selected = []
    remaining = list(CANDIDATES)
    current_r2 = fit_detrend_only['r2']
    print(f'  Step 0: baseline (detrend only) R² = {current_r2:.4f}, RMS = {fit_detrend_only["rms_post"]:.1f} s')

    step = 0
    while remaining:
        step += 1
        best_delta = -1.0
        best_c = None
        best_fit = None
        for c in remaining:
            trial_set = selected + [c]
            f = fit_harmonics(years, residual_centered, trial_set, include_quadratic_detrend=True)
            delta = f['r2'] - current_r2
            if delta > best_delta:
                best_delta = delta
                best_c = c
                best_fit = f
        if best_delta < 0.01:
            print(f'\n  No further ΔR² ≥ 0.01 — stopping at {len(selected)} components.')
            break
        selected.append(best_c)
        remaining = [c for c in remaining if c is not best_c]
        current_r2 = best_fit['r2']
        ap = harmonic_amp_phase(best_fit, selected)[-1]
        print(f'  Step {step}: +{best_c["label"]:<28} (n={best_c["n"]}, P={best_c["P_actual"]:.0f} yr): '
              f'R²={current_r2:.4f}, ΔR²={best_delta:+.4f}, amp={ap["amplitude_s"]:.1f} s, '
              f'RMS={best_fit["rms_post"]:.1f} s')

    # ─── STAGE D: Sanity check — random integers vs lattice integers ────
    print()
    print('=' * 80)
    print('STAGE D: OVERFITTING control — random 8H/n with same period range')
    print('=' * 80)
    print(f'  If lattice integers are special, the selected set should outperform')
    print(f'  random n values in the same period range (88-2400 yr → n ∈ [1118, 30495]).')
    print()
    rng = np.random.default_rng(seed=42)
    n_random_trials = 10
    print(f'  Per trial: pick {len(selected) if selected else 5} random integers in n∈[1118, 30495], fit, report R².')
    print()
    for trial in range(n_random_trials):
        random_ns = rng.integers(1118, 30495, size=max(len(selected), 5))
        random_set = [{'label': f'rand_{n}', 'P_target': EIGHT_H/n, 'n': int(n), 'P_actual': EIGHT_H/int(n)}
                      for n in random_ns]
        f = fit_harmonics(years, residual_centered, random_set, include_quadratic_detrend=True)
        ns_str = ','.join(str(n) for n in random_ns)
        print(f'  trial {trial+1:>2}: n={ns_str:<60s}  R²={f["r2"]:.4f}, RMS={f["rms_post"]:.1f} s')

    print()
    print('=' * 80)
    print('SUMMARY')
    print('=' * 80)
    if not selected:
        print(f'  Greedy selection found no candidate with ΔR² ≥ 0.01.')
        print(f'  → No 8H/n lattice harmonic with period 88-2400 yr fits the residual.')
        print(f'  → MWP residual cannot be absorbed by sub-kyr lattice extensions.')
        print(f'  → Recommend path 3: document as open problem.')
    else:
        labels_selected = [c["label"] for c in selected]
        ns_selected = [c["n"] for c in selected]
        ps_selected = [c["P_actual"] for c in selected]
        print(f'  Greedy selected {len(selected)} components:')
        for c in selected:
            print(f'    n = {c["n"]:>5d}, P = {c["P_actual"]:>7.1f} yr — {c["label"]}')
        print(f'  Combined R² = {current_r2:.4f}')
        print()
        print(f'  Compare against random control: if your selected R² is comparable')
        print(f'  to the random-n trials above, lattice integers are NOT special and')
        print(f'  the fit is just overfitting to {len(selected)} free parameters per component.')

if __name__ == '__main__':
    main()

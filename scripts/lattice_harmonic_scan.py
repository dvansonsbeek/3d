#!/usr/bin/env python3
"""
Universal 8H-lattice harmonic scan — test multiple candidate divisors against
multiple paleoclimate / solar / ΔT datasets in a single pass.

Purpose: after shipping Bond (8H/1830), Hallstatt (8H/1104), and Jose5 (8H/2989)
as the 3-flag ΔT correction stack, we want to systematically search for
additional gcd-compliant lattice harmonics that show coherent signal across
multiple independent archives. A pattern that appears in Steinhilber solar Φ
AND Stephenson ΔT residual AND (say) Cheng speleothem is far stronger evidence
for a real physical cycle than a signal in any single record.

Usage:
  # All gcd-compliant divisors in a period band across chosen datasets
  python3 scripts/lattice_harmonic_scan.py \\
      --band 600 800 --datasets steinhilber,stephenson,cheng --top 20

  # Explicit candidate list
  python3 scripts/lattice_harmonic_scan.py \\
      --candidates 3749,3782,3824,4209 --datasets all

  # Named preset
  python3 scripts/lattice_harmonic_scan.py \\
      --preset jose-family --datasets steinhilber,stephenson

Presets:
  jose-family      — n where 8H/n ≈ k×Jose (k=2..8), gcd-compliant
  bond-harmonics   — n where 8H/n ≈ Bond×k (k=1..3), gcd-compliant
  mwp-band         — 600 ≤ 8H/n ≤ 800, gcd-compliant (4th-flag candidates)
  shipped          — the three currently-shipped divisors [1830, 1104, 2989]
  shipped-plus-4j  — shipped + 8H/3749 (4×Jose candidate)

Datasets:
  steinhilber — 9.4 kyr solar modulation Φ (22-yr resolution) — ideal for
                sub-millennial solar cycles like 4×Jose (715 yr)
  stephenson  — Stephenson 2016 ΔT polynomial sampled at 1-yr cadence over
                [-720, 2016]; polynomial-detrended so we're fitting the
                millennial residual directly (the MWP-band target)
  cheng       — Cheng 2016 speleothem δ18O 640 kyr (variable resolution)
  epica       — EPICA Dome C CO2 800 kyr (~420-yr median resolution)
  lr04        — LR04 benthic δ18O stack 5 Myr (~1000-yr steps)
  all         — every registered dataset

Output:
  - Console table sorted by cross-dataset consistency
  - JSON to data/lattice-scan-<timestamp-or-tag>.json
  - Nyquist warnings when a proxy can't resolve the candidate period
"""

import argparse
import json
import math
import sys
from pathlib import Path
from datetime import datetime, timezone

import numpy as np

# ═════════════════════════════════════════════════════════════════════════════
# Constants — Earth Fundamental Cycle and its prime factors
# ═════════════════════════════════════════════════════════════════════════════

H = 335317                   # = 23 × 61 × 239
EIGHT_H = 8 * H              # = 2,682,536
H_PRIMES = (23, 61, 239)     # gcd-compliance criterion: gcd(n, H) > 1

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / 'data'
PUBLIC_INPUT_DIR = REPO_ROOT / 'public' / 'input'

# ─── Known physical anchors — for interpretation of hits ────────────────────
JOSE = 178.735    # yr — Jose cycle (Sun-barycenter orbit period, Charvátová 1965)
BOND = 1466.0     # yr — Bond IRD cycle / 74 × J-S synodic
HALLSTATT = 2430.0  # yr — Bray-Hallstatt solar/climate cycle
JS_SYNODIC = 19.86  # yr

KNOWN_CYCLES = {
    'Jose':          JOSE,
    '2×Jose':        2 * JOSE,     # 357 yr
    '3×Jose':        3 * JOSE,     # 536 yr — Suess/Wolf sub-harmonic candidate
    '4×Jose':        4 * JOSE,     # 715 yr — Damon-Sonett / Wagner10Be band
    '5×Jose (Jose5)': 5 * JOSE,    # 894 yr — shipped
    '6×Jose':        6 * JOSE,     # 1072 yr — Eddy band
    '7×Jose':        7 * JOSE,     # 1251 yr
    '8×Jose':        8 * JOSE,     # 1430 yr — near Bond
    'Suess/de Vries': 210.0,
    'Eddy':          1000.0,
    'Bond':          BOND,
    'Hallstatt':     HALLSTATT,
    'Damon-Sonett-700': 700.0,
    'Bray-Hallstatt-2400': 2400.0,
    'J-S synodic':   JS_SYNODIC,
    '74×J-S (Bond)': 74 * JS_SYNODIC,
}

# Milankovitch bands for climate-proxy detrending
MILANKOVITCH_PERIODS = {
    'ecc_405k':      405000,
    'ecc_125k':      125000,
    'ecc_95k':       95000,
    'obliquity_41k': 41000,
    'precession_23k': 23000,
    'precession_19k': 19000,
}

# ═════════════════════════════════════════════════════════════════════════════
# Utilities — gcd, candidate enumeration, physical-anchor lookup
# ═════════════════════════════════════════════════════════════════════════════

def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a

def is_compliant(n: int) -> bool:
    """gcd(n, H) > 1 — n shares at least one prime factor with H."""
    return gcd(n, H) > 1

def n_gcd(n: int) -> int:
    return gcd(n, H)

def n_factorization(n: int) -> str:
    """Human-readable prime-factor structure of n and its shared factors with H."""
    shared = []
    for p in H_PRIMES:
        if n % p == 0:
            shared.append(str(p))
    if not shared:
        return 'no H-prime factor'
    return '·'.join(shared)

def enumerate_band_candidates(period_min: float, period_max: float) -> list:
    """All gcd-compliant divisors n where period_min ≤ 8H/n ≤ period_max."""
    n_min = max(1, math.floor(EIGHT_H / period_max))
    n_max = math.ceil(EIGHT_H / period_min)
    return [n for n in range(n_min, n_max + 1) if is_compliant(n)]

def nearest_known_cycle(period_yr: float, tol_pct: float = 3.0):
    """Return (name, anchor_period, delta_pct) for the nearest KNOWN_CYCLES entry
    within tolerance, else None."""
    best = None
    for name, anchor in KNOWN_CYCLES.items():
        d_pct = abs(period_yr - anchor) / anchor * 100
        if d_pct <= tol_pct and (best is None or d_pct < best[2]):
            best = (name, anchor, d_pct)
    return best

# ─── Presets ─────────────────────────────────────────────────────────────────

def preset_jose_family() -> list:
    """Divisors where 8H/n ≈ k×Jose for k in [2, 8]. Returns closest gcd-compliant
    divisor to each anchor. Skips k values where no compliant n exists within 2%."""
    out = []
    for k in range(2, 9):
        target = k * JOSE
        # Search nearest gcd-compliant n
        n_ideal = round(EIGHT_H / target)
        best_n, best_delta = None, float('inf')
        for n in range(max(1, n_ideal - 30), n_ideal + 31):
            if not is_compliant(n):
                continue
            period = EIGHT_H / n
            d = abs(period - target)
            if d < best_delta:
                best_delta, best_n = d, n
        if best_n and best_delta / target < 0.02:  # within 2%
            out.append(best_n)
    return sorted(set(out))

def preset_bond_harmonics() -> list:
    """Divisors near k × Bond period for k in [1, 3]."""
    out = []
    for k in [1, 2, 3]:
        target = BOND / k    # 1466, 733, 489 — k=1 is Bond itself
        n_ideal = round(EIGHT_H / target)
        for n in range(max(1, n_ideal - 30), n_ideal + 31):
            if is_compliant(n) and abs(EIGHT_H / n - target) / target < 0.03:
                out.append(n)
    return sorted(set(out))

def preset_mwp_band() -> list:
    """All gcd-compliant divisors in 600-800 yr (4th-flag candidates)."""
    return enumerate_band_candidates(600, 800)

PRESETS = {
    'jose-family':      preset_jose_family,
    'bond-harmonics':   preset_bond_harmonics,
    'mwp-band':         preset_mwp_band,
    'shipped':          lambda: [1830, 1104, 2989],
    'shipped-plus-4j':  lambda: [1830, 1104, 2989, 3749],
}

# ═════════════════════════════════════════════════════════════════════════════
# Dataset loaders — each returns (years_ad_ascending, series, meta_dict)
# ═════════════════════════════════════════════════════════════════════════════

def load_steinhilber():
    """9,400-yr solar modulation Φ (MV) from Steinhilber 2012, ~22-yr resolution.
    Column layout: Year_BP  1.PC  1.PCErr  Phi  PhiErr  TSI  TSIErr"""
    path = DATA_DIR / 'steinhilber-2012-solar.txt'
    with open(path) as f:
        lines = f.readlines()
    start = None
    for i, ln in enumerate(lines):
        if ln.strip().startswith('Year') and 'Phi' in ln:
            start = i + 1
            break
    if start is None:
        raise RuntimeError(f'{path}: header row not found')
    ys_bp, phi = [], []
    for ln in lines[start:]:
        s = ln.strip()
        if not s or s.startswith(('#', '/')):
            continue
        parts = s.split()
        if len(parts) < 4:
            continue
        try:
            ys_bp.append(float(parts[0]))
            phi.append(float(parts[3]))
        except ValueError:
            continue
    ys_bp = np.array(ys_bp)
    phi = np.array(phi)
    ys_ad = 1950.0 - ys_bp
    idx = np.argsort(ys_ad)
    return ys_ad[idx], phi[idx], {
        'name': 'steinhilber',
        'label': 'Steinhilber 2012 solar Φ (MV)',
        'kind': 'solar',
        'unit': 'MV',
        'span_yr': float(ys_ad.max() - ys_ad.min()),
        'median_dt': float(np.median(np.diff(ys_ad[idx]))),
    }

def load_stephenson():
    """Stephenson 2016 ΔT polynomial evaluated at 1-yr cadence over [-720, 2016].
    Returned as ΔT residual after cubic polynomial detrend — this exposes the
    millennial band where our MWP mismatch lives."""
    path = PUBLIC_INPUT_DIR / 'stephenson-2016-deltaT-polynomial.json'
    with open(path) as f:
        raw = json.load(f)
    segments = raw['segments']
    def eval_at(y):
        for s in segments:
            if s['y0'] <= y <= s['y1']:
                t = (y - s['y0']) / (s['y1'] - s['y0'])
                a = s['a']
                return a[0] + a[1] * t + a[2] * t * t + a[3] * t * t * t
        return float('nan')
    ys = np.arange(-720, 2017, dtype=float)
    dt_s = np.array([eval_at(y) for y in ys])
    keep = np.isfinite(dt_s)
    return ys[keep], dt_s[keep], {
        'name': 'stephenson',
        'label': 'Stephenson 2016 ΔT (raw values, s)',
        'kind': 'deltaT',
        'unit': 's',
        'span_yr': float(ys[keep].max() - ys[keep].min()),
        'median_dt': 1.0,
        'note': 'Cubic detrend applied at fit time to expose millennial residual',
    }

def load_cheng():
    """Cheng 2016 China speleothem δ18O composite, up to ~640 kyr BP.
    Column layout (data rows start after a marker line):
        Age_ka_BP  δ18O_permil"""
    path = DATA_DIR / 'cheng2016-speleothem.txt'
    with open(path) as f:
        lines = f.readlines()
    # Data start: first line whose first token parses as a positive age
    ys_bp, d18o = [], []
    for ln in lines:
        s = ln.strip()
        if not s or s.startswith('#'):
            continue
        parts = s.split()
        try:
            age_ka = float(parts[0])
            v = float(parts[1])
        except (ValueError, IndexError):
            continue
        if age_ka < 0 or age_ka > 1000:
            continue
        ys_bp.append(age_ka * 1000.0)
        d18o.append(v)
    ys_bp = np.array(ys_bp)
    d18o = np.array(d18o)
    ys_ad = 1950.0 - ys_bp
    idx = np.argsort(ys_ad)
    return ys_ad[idx], d18o[idx], {
        'name': 'cheng',
        'label': 'Cheng 2016 speleothem δ18O (‰)',
        'kind': 'climate',
        'unit': '‰',
        'span_yr': float(ys_ad.max() - ys_ad.min()),
        'median_dt': float(np.median(np.diff(ys_ad[idx]))),
    }

def load_epica():
    """EPICA Dome C revised 800 kyr CO2 (Bereiter et al. 2015).
    Column layout: age_gas_calBP  CO2_ppm  σ_ppm"""
    path = DATA_DIR / 'epica-co2-bereiter2015.txt'
    with open(path) as f:
        lines = f.readlines()
    start = None
    for i, ln in enumerate(lines):
        if 'age_gas_calBP' in ln:
            start = i + 1
            break
    if start is None:
        raise RuntimeError(f'{path}: header row not found')
    ys_bp, co2 = [], []
    for ln in lines[start:]:
        s = ln.strip()
        if not s or s.startswith('#'):
            continue
        parts = s.split()
        if len(parts) < 2:
            continue
        try:
            ys_bp.append(float(parts[0]))
            co2.append(float(parts[1]))
        except ValueError:
            continue
    ys_bp = np.array(ys_bp)
    co2 = np.array(co2)
    ys_ad = 1950.0 - ys_bp
    idx = np.argsort(ys_ad)
    return ys_ad[idx], co2[idx], {
        'name': 'epica',
        'label': 'EPICA Dome C CO2 (ppm)',
        'kind': 'climate',
        'unit': 'ppm',
        'span_yr': float(ys_ad.max() - ys_ad.min()),
        'median_dt': float(np.median(np.diff(ys_ad[idx]))),
    }

def load_lr04():
    """LR04 benthic δ18O stack (Lisiecki & Raymo 2005), 5 Myr.
    Column layout: Time_ka  Benthic_d18O  σ"""
    path = DATA_DIR / 'lr04-stack.txt'
    with open(path) as f:
        lines = f.readlines()
    # Data rows begin after the "Time (ka)" header line
    ys_bp, d18o = [], []
    seen_header = False
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        if 'Time' in s and 'ka' in s:
            seen_header = True
            continue
        if not seen_header:
            continue
        parts = s.split()
        if len(parts) < 2:
            continue
        try:
            ys_bp.append(float(parts[0]) * 1000.0)
            d18o.append(float(parts[1]))
        except ValueError:
            continue
    ys_bp = np.array(ys_bp)
    d18o = np.array(d18o)
    ys_ad = 1950.0 - ys_bp
    idx = np.argsort(ys_ad)
    return ys_ad[idx], d18o[idx], {
        'name': 'lr04',
        'label': 'LR04 benthic δ18O stack (‰)',
        'kind': 'climate',
        'unit': '‰',
        'span_yr': float(ys_ad.max() - ys_ad.min()),
        'median_dt': float(np.median(np.diff(ys_ad[idx]))),
    }

DATASETS = {
    'steinhilber': load_steinhilber,
    'stephenson':  load_stephenson,
    'cheng':       load_cheng,
    'epica':       load_epica,
    'lr04':        load_lr04,
}

# ═════════════════════════════════════════════════════════════════════════════
# Fit engine — LSQ with configurable detrending
# ═════════════════════════════════════════════════════════════════════════════

def build_detrend_cols(t: np.ndarray, kind: str) -> tuple:
    """Return (list of column arrays, list of labels) for the detrend basis."""
    cols = [np.ones_like(t)]
    labels = ['intercept']
    if kind in ('linear', 'quadratic', 'cubic', 'milankovitch'):
        cols.append(t / 1000.0)
        labels.append('linear /kyr')
    if kind in ('quadratic', 'cubic', 'milankovitch'):
        cols.append((t / 1000.0) ** 2)
        labels.append('quadratic /kyr²')
    if kind in ('cubic',):
        cols.append((t / 1000.0) ** 3)
        labels.append('cubic /kyr³')
    if kind == 'milankovitch':
        for name, P in MILANKOVITCH_PERIODS.items():
            omega = 2 * math.pi / P
            cols.append(np.cos(omega * t))
            cols.append(np.sin(omega * t))
            labels.append(f'cos({name})')
            labels.append(f'sin({name})')
    return cols, labels

def fit_candidates(years: np.ndarray, series: np.ndarray, n_list: list,
                   detrend_kind: str = 'quadratic') -> dict:
    """LSQ fit series ~ detrend basis + Σ (cos + sin at 8H/n_i).
    Returns per-n amplitude, phase, cos/sin, and overall R²."""
    if len(years) < 10:
        return None
    y0 = float(years.mean())
    t = years - y0
    cols, labels = build_detrend_cols(t, detrend_kind)
    n_detrend = len(cols)
    for n in n_list:
        omega = 2 * math.pi / (EIGHT_H / n)
        cols.append(np.cos(omega * years))
        cols.append(np.sin(omega * years))
        labels.extend([f'cos(8H/{n})', f'sin(8H/{n})'])
    X = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(X, series, rcond=None)
    y_hat = X @ beta
    ss_res = float(np.sum((series - y_hat) ** 2))
    ss_tot = float(np.sum((series - series.mean()) ** 2))
    r2 = 1.0 - ss_res / max(ss_tot, 1e-30)

    # Detrend-only baseline to isolate the harmonic contribution
    Xd = X[:, :n_detrend]
    beta_d, *_ = np.linalg.lstsq(Xd, series, rcond=None)
    y_d = Xd @ beta_d
    ss_res_d = float(np.sum((series - y_d) ** 2))
    r2_harmonic = (ss_res_d - ss_res) / max(ss_tot, 1e-30)

    amp_phase = []
    for i, n in enumerate(n_list):
        ci = float(beta[n_detrend + 2 * i])
        si = float(beta[n_detrend + 2 * i + 1])
        amp_phase.append({
            'n': n,
            'period_yr': EIGHT_H / n,
            'cos_coeff': ci,
            'sin_coeff': si,
            'amplitude': math.hypot(ci, si),
            'phase_deg': math.degrees(math.atan2(si, ci)),
        })
    return {
        'r2_total': r2,
        'r2_harmonic_only': r2_harmonic,
        'rms_pre': float(np.sqrt(np.mean(series ** 2))),
        'rms_post': float(np.sqrt(ss_res / len(series))),
        'amp_phase': amp_phase,
        'n_points': int(len(series)),
    }

def permutation_amp_threshold(years: np.ndarray, series: np.ndarray, n: int,
                              detrend_kind: str, n_perm: int = 200,
                              percentile: float = 95.0) -> float:
    """Empirical p-value threshold: shuffle series in blocks and refit; return
    the given percentile of the null amplitude distribution. If observed
    amplitude exceeds this, signal is above background."""
    rng = np.random.default_rng(42)
    null_amps = []
    for _ in range(n_perm):
        perm = rng.permutation(len(series))
        fit = fit_candidates(years, series[perm], [n], detrend_kind)
        if fit is None:
            continue
        null_amps.append(fit['amp_phase'][0]['amplitude'])
    if not null_amps:
        return float('nan')
    return float(np.percentile(null_amps, percentile))

# ═════════════════════════════════════════════════════════════════════════════
# Cross-dataset synthesis
# ═════════════════════════════════════════════════════════════════════════════

def resolvable(dataset_meta: dict, period_yr: float) -> bool:
    """True if candidate period exceeds 2 × median sampling interval (Nyquist)."""
    dt = dataset_meta.get('median_dt', 1e-6)
    return period_yr > 2 * dt and period_yr < 0.9 * dataset_meta['span_yr']

def rank_candidates(results_by_dataset: dict, candidates: list) -> list:
    """Aggregate cross-dataset scoring — count datasets where each candidate is:
      (a) resolvable, and (b) shows amplitude > permutation-95% threshold.
    Also compute mean R²_harmonic across resolvable datasets."""
    ranked = []
    for n in candidates:
        resolvable_count = 0
        significant_count = 0
        r2_harm_sum = 0.0
        r2_harm_n = 0
        per_dataset = {}
        for ds_name, ds_res in results_by_dataset.items():
            entry = ds_res['per_candidate'].get(n)
            if entry is None:
                per_dataset[ds_name] = None
                continue
            per_dataset[ds_name] = entry
            if entry['resolvable']:
                resolvable_count += 1
                r2_harm_sum += entry['r2_harmonic_only']
                r2_harm_n += 1
                if entry['amplitude'] > entry['perm_95_threshold']:
                    significant_count += 1
        ranked.append({
            'n': n,
            'period_yr': EIGHT_H / n,
            'gcd_H': n_gcd(n),
            'shared_H_factors': n_factorization(n),
            'nearest_known': (lambda hit: {'name': hit[0], 'anchor_yr': hit[1],
                                            'delta_pct': hit[2]} if hit else None)(
                nearest_known_cycle(EIGHT_H / n)),
            'resolvable_datasets': resolvable_count,
            'significant_datasets': significant_count,
            'mean_r2_harmonic': r2_harm_sum / max(r2_harm_n, 1),
            'per_dataset': per_dataset,
        })
    # Rank by (significant_datasets DESC, mean_r2_harmonic DESC)
    ranked.sort(key=lambda r: (-r['significant_datasets'], -r['mean_r2_harmonic']))
    return ranked

# ═════════════════════════════════════════════════════════════════════════════
# CLI + main
# ═════════════════════════════════════════════════════════════════════════════

def parse_args():
    ap = argparse.ArgumentParser(
        description='Universal 8H-lattice harmonic scan across multiple datasets.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument('--band', nargs=2, type=float, metavar=('MIN_YR', 'MAX_YR'),
                     help='Period band (yr). All gcd-compliant divisors in range.')
    src.add_argument('--candidates', type=str,
                     help='Explicit divisor list, comma-separated (e.g. 3749,3782,4209).')
    src.add_argument('--preset', choices=list(PRESETS.keys()),
                     help='Named candidate preset.')
    ap.add_argument('--datasets', type=str, default='all',
                    help='Comma-separated dataset names, or "all" (default). '
                         f'Registered: {", ".join(DATASETS.keys())}')
    ap.add_argument('--detrend', choices=['linear', 'quadratic', 'cubic',
                                          'milankovitch'], default='quadratic',
                    help='Detrend basis (default: quadratic; use milankovitch for '
                         'long climate proxies).')
    ap.add_argument('--top', type=int, default=15,
                    help='Show top-N candidates in console table (default: 15).')
    ap.add_argument('--n-perm', type=int, default=200,
                    help='Permutation-test iterations for significance (default: 200).')
    ap.add_argument('--output', type=str, default=None,
                    help='Output JSON path (default: data/lattice-scan-<timestamp>.json)')
    ap.add_argument('--no-permutation', action='store_true',
                    help='Skip permutation-test significance step (fast mode).')
    return ap.parse_args()

def resolve_candidates(args) -> list:
    if args.candidates:
        raw = [int(x.strip()) for x in args.candidates.split(',') if x.strip()]
        return sorted(set(raw))
    if args.preset:
        return sorted(set(PRESETS[args.preset]()))
    lo, hi = args.band
    return enumerate_band_candidates(lo, hi)

def resolve_datasets(spec: str) -> list:
    if spec.strip().lower() == 'all':
        return list(DATASETS.keys())
    return [name.strip() for name in spec.split(',') if name.strip()]

def main():
    args = parse_args()

    candidates = resolve_candidates(args)
    dataset_names = resolve_datasets(args.datasets)
    detrend_kind = args.detrend

    print('═' * 90)
    print('  8H-LATTICE HARMONIC SCAN')
    print('═' * 90)
    print(f'  H = {H:,}    8H = {EIGHT_H:,}    factors: {" × ".join(map(str, H_PRIMES))}')
    print(f'  Candidates: {len(candidates)}  ({args.preset or ("band " + str(args.band)) or "explicit list"})')
    print(f'  Datasets  : {", ".join(dataset_names)}')
    print(f'  Detrend   : {detrend_kind}')
    print(f'  Perm test : {"OFF (fast mode)" if args.no_permutation else f"{args.n_perm} iterations, 95% threshold"}')
    print()

    if not candidates:
        print('✗ No candidates to test. Exiting.')
        return 1

    # ─── Per-dataset scan ────────────────────────────────────────────────
    results_by_dataset = {}
    for ds_name in dataset_names:
        if ds_name not in DATASETS:
            print(f'  ⚠ Unknown dataset: {ds_name} — skipping.')
            continue
        print(f'── {ds_name} ──')
        try:
            years, series, meta = DATASETS[ds_name]()
        except Exception as e:
            print(f'  ✗ Load failed: {e}')
            continue
        print(f'  {meta["label"]}: n={len(years)} pts, span {meta["span_yr"]:.0f} yr, '
              f'median Δt = {meta["median_dt"]:.1f} yr')
        # Choose auto-detrend for very long records unless user specified explicitly
        this_detrend = detrend_kind
        if meta['kind'] == 'climate' and meta['span_yr'] > 200000 and detrend_kind == 'quadratic':
            this_detrend = 'milankovitch'
            print(f'  (auto-upgraded detrend to milankovitch for long climate record)')
        per_candidate = {}
        for n in candidates:
            period = EIGHT_H / n
            fit = fit_candidates(years, series, [n], this_detrend)
            if fit is None:
                per_candidate[n] = None
                continue
            entry = fit['amp_phase'][0]
            entry['r2_total'] = fit['r2_total']
            entry['r2_harmonic_only'] = fit['r2_harmonic_only']
            entry['resolvable'] = resolvable(meta, period)
            if args.no_permutation:
                entry['perm_95_threshold'] = float('nan')
            else:
                entry['perm_95_threshold'] = permutation_amp_threshold(
                    years, series, n, this_detrend, args.n_perm)
            per_candidate[n] = entry
        results_by_dataset[ds_name] = {
            'meta': meta,
            'detrend_applied': this_detrend,
            'per_candidate': per_candidate,
        }
        print()

    if not results_by_dataset:
        print('✗ No datasets loaded. Exiting.')
        return 1

    # ─── Cross-dataset ranking ───────────────────────────────────────────
    ranked = rank_candidates(results_by_dataset, candidates)

    # ─── Console report ──────────────────────────────────────────────────
    top = args.top
    print('═' * 90)
    print(f'  RANKED CANDIDATES (top {top} by significant-dataset count, then mean R²ₕ)')
    print('═' * 90)
    print(f'  {"n":>5}  {"P (yr)":>9}  {"gcd(n,H)":>9}  {"nearest known":<22}  {"resolv":>6}  {"signif":>6}  {"mean R²ₕ":>9}')
    print(f'  {"-" * 5}  {"-" * 9}  {"-" * 9}  {"-" * 22}  {"-" * 6}  {"-" * 6}  {"-" * 9}')
    for r in ranked[:top]:
        anchor = ''
        if r['nearest_known']:
            hit = r['nearest_known']
            anchor = f"{hit['name']} ({hit['delta_pct']:.2f}%)"
        print(f"  {r['n']:>5}  {r['period_yr']:>9.2f}  {r['gcd_H']:>9d}  {anchor:<22}  "
              f"{r['resolvable_datasets']:>6d}  {r['significant_datasets']:>6d}  "
              f"{r['mean_r2_harmonic']:>9.4f}")
    print()

    # ─── Per-candidate detail for the very top hits ──────────────────────
    print('─' * 90)
    print('  PER-DATASET DETAIL — top 5 candidates:')
    print('─' * 90)
    for r in ranked[:5]:
        print(f'  n = {r["n"]}  (P = {r["period_yr"]:.2f} yr, gcd = {r["gcd_H"]}, factors: {r["shared_H_factors"]})')
        if r['nearest_known']:
            hit = r['nearest_known']
            print(f'    ≈ {hit["name"]} ({hit["anchor_yr"]:.1f} yr, Δ = {hit["delta_pct"]:.3f}%)')
        for ds_name, entry in r['per_dataset'].items():
            if entry is None:
                print(f'    {ds_name:12}: (no fit)')
                continue
            flag_resolvable = '✓' if entry['resolvable'] else '⚠'
            if not args.no_permutation:
                sig = '✓' if entry['amplitude'] > entry['perm_95_threshold'] else '·'
                sig_str = f'p95={entry["perm_95_threshold"]:.4f} [{sig}]'
            else:
                sig_str = ''
            print(f'    {ds_name:12}: {flag_resolvable} amp={entry["amplitude"]:.4f} '
                  f'phase={entry["phase_deg"]:+.1f}° R²ₕ={entry["r2_harmonic_only"]:.4f} {sig_str}')
        print()

    # ─── Save JSON ───────────────────────────────────────────────────────
    if args.output:
        out_path = Path(args.output)
    else:
        tag = args.preset or (f'band-{int(args.band[0])}-{int(args.band[1])}' if args.band
                              else 'custom')
        out_path = DATA_DIR / f'lattice-scan-{tag}.json'
    payload = {
        '_meta': {
            'generator': 'scripts/lattice_harmonic_scan.py',
            'H': H, 'eight_H': EIGHT_H, 'H_primes': list(H_PRIMES),
            'candidates_source': args.preset or 'band' if args.band else 'custom',
            'detrend_kind': detrend_kind,
            'n_perm_iterations': None if args.no_permutation else args.n_perm,
        },
        'candidates': candidates,
        'datasets': {name: {'meta': r['meta'], 'detrend_applied': r['detrend_applied']}
                     for name, r in results_by_dataset.items()},
        'ranked': ranked,
    }
    with open(out_path, 'w') as f:
        json.dump(payload, f, indent=2, default=lambda o: None)
    print(f'  ✓ Written to {out_path}')
    return 0

if __name__ == '__main__':
    sys.exit(main())

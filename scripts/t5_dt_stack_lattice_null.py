#!/usr/bin/env python3
"""
T5 — the ΔT-stack "structural" cycles against a random-comb null of the same
density (holisticuniverse plan 06 §4, pre-registered).

    python3 scripts/t5_dt_stack_lattice_null.py            print the verdict
    python3 scripts/t5_dt_stack_lattice_null.py --write    write data/t5-dt-stack-lattice-null.json (inputs-stamped)

The shipped ΔT correction stack carries four millennial cycles labeled as
8H/n lattice harmonics (Bond 8H/1830, Hallstatt 8H/1104, Jose5 8H/2989,
Jose4 8H/3749) with a "zero-fit structural prediction" wording resting on
two arguments: the period is an integer divisor of 8H, and the divisor
shares a prime factor with H (gcd(n, H) ∈ {23, 61}). This script measures
what those two arguments are worth:

  A. DENSITY — how far ANY period in the millennial band can be from the
     nearest 8H/n (the lattice spacing 8H/n² is < 0.2 % of the period), and
     what fraction of integers n in the band satisfy the gcd rule (H =
     23 · 61 · 239, so ≈ 1/23 + 1/61 + 1/239 of them). The Rayleigh
     resolution of the fit window in n units (Δn = 8H / T_window) says how
     many integers the data cannot tell apart.
  B. PLATEAUS — the banked divisor scans (Bond: data/deltaT-divisor-scan-jse
     .json; h253: data/deltaT-h253-fifth-cycle-scan.json) record flat R²
     plateaus; the chance that a plateau of the measured width contains at
     least one gcd-compliant integer.
  C. DATA NULL — the Stephenson − model residual (data/deltaT-bond-cycle-
     residual-fit.json, 10-yr grid, −720…2010) fitted by intercept +
     quadratic trend + k cos/sin pairs: the shipped 4 periods vs N random
     4-period combs log-uniform in the band (same solver), and the Bond
     line alone vs random single lines.
  D. NEIGHBOURS — the shipped n against its non-compliant neighbours n ± 1,
     n ± 2 in the same fit: the R² information the gcd rule carries.

Pre-registered expectation: chance-level — the periods are FITTED periods
with a comb label; the wording is dropped, the numerics untouched (P3).
"""
import json
import math
import platform
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools' / 'fit' / 'python'))
from artifact_inputs import build_inputs_block  # noqa: E402

SELF_REL = 'scripts/t5_dt_stack_lattice_null.py'
OUT_REL = 'data/t5-dt-stack-lattice-null.json'
SERIES_REL = 'data/deltaT-bond-cycle-residual-fit.json'
STACK_REL = 'data/deltaT-4flag-fit.json'
SCAN_BOND_REL = 'data/deltaT-divisor-scan-jse.json'
SCAN_H253_REL = 'data/deltaT-h253-fifth-cycle-scan.json'
PARAMS_REL = 'public/input/model-parameters.json'
INPUT_FILES = [SERIES_REL, STACK_REL, SCAN_BOND_REL, SCAN_H253_REL, PARAMS_REL, SELF_REL]

H = json.loads((ROOT / PARAMS_REL).read_text())['foundational']['holisticyearLength']
EIGHT_H = 8 * H
BAND_YR = (500.0, 5000.0)          # the divisor scan's band (n 537…5365)
N_NULL = 2000
RNG = np.random.default_rng(20260920)


def factorize(n):
    f, d = [], 2
    while d * d <= n:
        while n % d == 0:
            f.append(d); n //= d
        d += 1
    if n > 1:
        f.append(n)
    return f


def compliant(n):
    return math.gcd(n, H) > 1


# ── A. density ─────────────────────────────────────────────────────────────
n_lo, n_hi = math.ceil(EIGHT_H / BAND_YR[1]), math.floor(EIGHT_H / BAND_YR[0])
ns = np.arange(n_lo, n_hi + 1)
comp_mask = np.array([compliant(int(n)) for n in ns])
q_compliant = float(comp_mask.mean())
mean_spacing_compliant = float(np.mean(np.diff(ns[comp_mask])))
stack = json.loads((ROOT / STACK_REL).read_text())
shipped = [(c['name'], c['lattice_n']) for c in stack['config']['cycles']]
series_art = json.loads((ROOT / SERIES_REL).read_text())
ts = series_art['timeseries_residual_10yr_grid']
years = np.array([r['year'] for r in ts], dtype=float)
resid = np.array([r['residual_observed_s'] for r in ts], dtype=float)
T_window = float(years.max() - years.min())
rayleigh_dn = EIGHT_H / T_window                 # integers the window cannot resolve

density_rows = []
for name, n in shipped:
    P = EIGHT_H / n
    spacing = EIGHT_H / n - EIGHT_H / (n + 1)
    density_rows.append(dict(name=name, n=n, period_yr=P, gcd_H=math.gcd(n, H), factors=factorize(n),
                             lattice_spacing_yr=spacing, max_distance_to_lattice_pct=100 * spacing / 2 / P,
                             rayleigh_period_halfwidth_yr=P * P / T_window / 2))

# ── B. plateaus ────────────────────────────────────────────────────────────
scan_b = json.loads((ROOT / SCAN_BOND_REL).read_text())
top = scan_b['top_20']
bond_plateau = (min(r['n'] for r in top), max(r['n'] for r in top))
bond_plateau_dr2 = (min(r['delta_r2'] for r in top), max(r['delta_r2'] for r in top))
scan_h = json.loads((ROOT / SCAN_H253_REL).read_text())
h_plateau = (min(r['n'] for r in scan_h['scan']), max(r['n'] for r in scan_h['scan']))
h_plateau_dr2 = (min(r['delta_r2'] for r in scan_h['scan']), max(r['delta_r2'] for r in scan_h['scan']))


def p_at_least_one_compliant(width):
    return 1.0 - (1.0 - q_compliant) ** width


plateaus = dict(
    bond_top20=dict(n_range=bond_plateau, width=bond_plateau[1] - bond_plateau[0] + 1, delta_r2_range=bond_plateau_dr2,
                    compliant_inside=[int(n) for n in range(bond_plateau[0], bond_plateau[1] + 1) if compliant(n)],
                    shipped_rank_in_scan=scan_b.get('bond_rank'),
                    p_at_least_one_compliant=p_at_least_one_compliant(bond_plateau[1] - bond_plateau[0] + 1)),
    bond_doc102_flat_band=dict(n_range=(1817, 1863), width=47, note='doc 102: "fit quality essentially indistinguishable across n=1817..1863"',
                               compliant_inside=[n for n in range(1817, 1864) if compliant(n)],
                               p_at_least_one_compliant=p_at_least_one_compliant(47)),
    h253_scan=dict(n_range=h_plateau, width=h_plateau[1] - h_plateau[0] + 1, delta_r2_range=h_plateau_dr2,
                   compliant_inside=[int(n) for n in range(h_plateau[0], h_plateau[1] + 1) if compliant(n)],
                   chosen=scan_h['candidate']['n'], best_delta_r2_n=max(scan_h['scan'], key=lambda r: r['delta_r2'])['n'],
                   p_at_least_one_compliant=p_at_least_one_compliant(h_plateau[1] - h_plateau[0] + 1)),
    rayleigh_window=dict(T_window_yr=T_window, delta_n_unresolved=rayleigh_dn,
                         p_at_least_one_compliant=p_at_least_one_compliant(int(rayleigh_dn))),
)

# ── C. data null ───────────────────────────────────────────────────────────
u = (years - years.mean()) / 1000.0


def design(periods):
    cols = [np.ones_like(u), u, u * u]
    for P in periods:
        w = 2 * np.pi * years / P
        cols += [np.cos(w), np.sin(w)]
    return np.column_stack(cols)


def r2_for(periods):
    X = design(periods)
    beta, *_ = np.linalg.lstsq(X, resid, rcond=None)
    res = resid - X @ beta
    return 1.0 - float(np.sum(res ** 2)) / float(np.sum((resid - resid.mean()) ** 2))


shipped_periods = [EIGHT_H / n for _, n in shipped]
r2_shipped4 = r2_for(shipped_periods)
r2_trend_only = r2_for([])
r2_bond1 = r2_for([EIGHT_H / 1830])
null4 = np.array([r2_for(list(np.exp(RNG.uniform(np.log(BAND_YR[0]), np.log(BAND_YR[1]), 4)))) for _ in range(N_NULL)])
null1 = np.array([r2_for([float(np.exp(RNG.uniform(np.log(BAND_YR[0]), np.log(BAND_YR[1]))))]) for _ in range(N_NULL)])
# the "canonical external periods" alternative — Bond 1470, Hallstatt 2400, Jose 5×178.7, Jose 4×178.7 — no lattice at all
canonical = [1470.0, 2400.0, 5 * 178.7, 4 * 178.7]
r2_canonical4 = r2_for(canonical)
data_null = dict(
    n_points=int(len(years)), window=(float(years.min()), float(years.max())), trend='intercept + linear + quadratic in (year − mean)/1000',
    r2_trend_only=r2_trend_only, r2_shipped_4=r2_shipped4, r2_canonical_external_4=r2_canonical4, r2_bond_alone=r2_bond1,
    null4=dict(n=N_NULL, band_yr=BAND_YR, mean=float(null4.mean()), sd=float(null4.std()), p95=float(np.percentile(null4, 95)), max=float(null4.max()),
               p_value_shipped=float(np.mean(null4 >= r2_shipped4)), p_value_canonical=float(np.mean(null4 >= r2_canonical4))),
    null1=dict(n=N_NULL, mean=float(null1.mean()), sd=float(null1.std()), p95=float(np.percentile(null1, 95)), max=float(null1.max()),
               p_value_bond=float(np.mean(null1 >= r2_bond1))),
)

# ── D. neighbours ──────────────────────────────────────────────────────────
neighbours = []
for name, n in shipped:
    row = dict(name=name, n=n, r2_shipped_n=r2_for([EIGHT_H / m if m != n else EIGHT_H / n for _, m in shipped]))
    for dn in (-2, -1, 1, 2):
        alt = [EIGHT_H / (m + dn) if m == n else EIGHT_H / m for _, m in shipped]
        row[f'r2_n{dn:+d}'] = r2_for(alt)
        row[f'gcd_n{dn:+d}'] = math.gcd(n + dn, H)
    neighbours.append(row)
max_neighbour_delta = max(abs(r[f'r2_n{dn:+d}'] - r['r2_shipped_n']) for r in neighbours for dn in (-2, -1, 1, 2))

verdict = dict(
    density=(f'Any period in {BAND_YR[0]:.0f}–{BAND_YR[1]:.0f} yr lies within {max(r["max_distance_to_lattice_pct"] for r in density_rows):.3f} % of an 8H/n; '
             f'{100 * q_compliant:.1f} % of the integers in the band satisfy gcd(n, H) > 1 (H = {"·".join(map(str, factorize(H)))}), mean spacing {mean_spacing_compliant:.1f}; '
             f'the {T_window:.0f}-yr window cannot resolve Δn < {rayleigh_dn:.0f}.'),
    plateaus=(f'The Bond scan\'s flat band n = 1817…1863 holds {len(plateaus["bond_doc102_flat_band"]["compliant_inside"])} compliant integers '
              f'(P ≥ 1 = {100 * plateaus["bond_doc102_flat_band"]["p_at_least_one_compliant"]:.0f} %); the h253 plateau n = {h_plateau[0]}…{h_plateau[1]} holds '
              f'{len(plateaus["h253_scan"]["compliant_inside"])} (its best ΔR² sits at n = {plateaus["h253_scan"]["best_delta_r2_n"]}, also compliant; n = {scan_h["candidate"]["n"]} was chosen). '
              'A gcd-compliant n is available inside every fitted plateau by density alone.'),
    data_null=(f'Shipped 4 periods R² = {r2_shipped4:.4f}; random 4-period combs mean {null4.mean():.4f}, p95 {np.percentile(null4, 95):.4f}, '
               f'p(shipped) = {np.mean(null4 >= r2_shipped4):.3f}; the canonical external periods (1470/2400/5×178.7/4×178.7, no lattice) give {r2_canonical4:.4f}.'),
    neighbours=f'Moving any shipped n to a non-compliant neighbour (n ± 1, ± 2) changes R² by at most {max_neighbour_delta:.2e} — the gcd rule carries no fit information.',
    bond_alone=(f'A SINGLE line at the Bond period does beat random single lines (R² {r2_bond1:.4f} vs null p95 {np.percentile(null1, 95):.4f}, '
                f'p = {np.mean(null1 >= r2_bond1):.3f}): the residual carries a real ~1.5-kyr oscillation. Its period comes from the record and the canonical Bond value, '
                'not from the lattice — the same line at any non-lattice period within the Rayleigh width fits the same.'),
    statement=('The 8H/n label is satisfied by every period in the band; the gcd rule is satisfied inside every fitted plateau; the shipped 4-period stack does not beat '
               'random 4-period millennial combs beyond the null spread (the statistic is near saturation for 11 parameters on 274 smooth points), and non-compliant '
               'neighbours fit identically. The periods are FITTED periods (selected on external canonical values plus the gcd rule inside unresolved plateaus), '
               'stated in years; the divisor is an implementation detail of the fitter. The "zero-fit structural prediction" wording is not earned; the numerics stand as the certified fit, and the Bond-scale oscillation itself is real.'),
    caveat=('The residual series is the banked export of data/deltaT-bond-cycle-residual-fit.json (Stephenson 2016 − the framework model of that export, 10-yr grid); '
            'the shipped stack was fitted against the current model residual with the Holocene taper and the USNO closure. The null compares PERIODS on one series, '
            'so the comparison is internally consistent; the absolute R² values are those of this series.'),
)


def main():
    t0 = time.time()
    print(f'T5 — ΔT-stack lattice labels vs a random-comb null   (H = {H} = {"·".join(map(str, factorize(H)))}, 8H = {EIGHT_H:.0f} yr, band {BAND_YR[0]:.0f}–{BAND_YR[1]:.0f} yr)')
    print('\nA. density')
    for r in density_rows:
        print(f"  {r['name']:9s} 8H/{r['n']:<5d} = {r['period_yr']:8.2f} yr  gcd {r['gcd_H']:>2d}  n = {'·'.join(map(str, r['factors'])):14s} lattice spacing {r['lattice_spacing_yr']:.3f} yr → any period within {r['max_distance_to_lattice_pct']:.3f} %;  Rayleigh ± {r['rayleigh_period_halfwidth_yr']:.0f} yr")
    print(f'  compliant fraction of n in [{n_lo}, {n_hi}]: {100 * q_compliant:.2f} %  (mean spacing {mean_spacing_compliant:.1f});  unresolved Δn in a {T_window:.0f}-yr window: {rayleigh_dn:.0f}')
    print('\nB. plateaus')
    for k, v in plateaus.items():
        print(f'  {k:22s} {json.dumps({kk: vv for kk, vv in v.items() if kk != "note"})}')
    print('\nC. data null')
    print(f'  trend only {r2_trend_only:.4f} · shipped 4 {r2_shipped4:.4f} · canonical external 4 {r2_canonical4:.4f} · Bond alone {r2_bond1:.4f}')
    print(f"  random 4-combs: mean {null4.mean():.4f} sd {null4.std():.4f} p95 {np.percentile(null4, 95):.4f} max {null4.max():.4f} → p(shipped) {data_null['null4']['p_value_shipped']:.3f}, p(canonical) {data_null['null4']['p_value_canonical']:.3f}")
    print(f"  random 1-line:  mean {null1.mean():.4f} p95 {np.percentile(null1, 95):.4f} → p(Bond) {data_null['null1']['p_value_bond']:.3f}")
    print('\nD. neighbours')
    for r in neighbours:
        print(f"  {r['name']:9s} n={r['n']} R² {r['r2_shipped_n']:.5f} | " + ' '.join(f"n{dn:+d} (gcd {r[f'gcd_n{dn:+d}']}) {r[f'r2_n{dn:+d}']:.5f}" for dn in (-2, -1, 1, 2)))
    print(f'\n{verdict["statement"]}')
    print(f'elapsed {time.time() - t0:.1f} s')
    if '--write' in sys.argv:
        out = dict(_description=__doc__.strip(), config=dict(H=H, eight_H=EIGHT_H, band_yr=BAND_YR, n_null=N_NULL, rng_seed=20260920, shipped=shipped),
                   density=dict(rows=density_rows, compliant_fraction=q_compliant, mean_spacing_compliant=mean_spacing_compliant, rayleigh_delta_n=rayleigh_dn, n_range=(int(n_lo), int(n_hi))),
                   plateaus=plateaus, data_null=data_null, neighbours=neighbours, verdict=verdict,
                   meta=dict(script=SELF_REL, doc='docs/102-gia-alpha-lunar-validation.md / docs/104 (T5, plan 06)', runtime_sec=time.time() - t0,
                             environment=dict(python=platform.python_version(), numpy=np.__version__)),
                   inputs=build_inputs_block(f'python3 {SELF_REL} --write', INPUT_FILES))
        (ROOT / OUT_REL).write_text(json.dumps(out, indent=1, default=float) + '\n')
        print(f'wrote {OUT_REL}')


if __name__ == '__main__':
    main()

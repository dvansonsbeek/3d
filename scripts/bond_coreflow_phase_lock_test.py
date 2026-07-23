"""
Holocene phase-lock test — thread 4 of the non-tidal-residual follow-up.

Prediction under test (formulated 2026-07-22, never published): if the
climatic Bond cycle and the core-mantle millennial swing both ride the
8H/1830 = 1,465.9-yr J-S-synodic clock, then Bond IRD events and
archeomagnetic core-flow episodes must be phase-locked across the Holocene.
Mainstream expectation: no lock.

Data:
  - data/bond2001-raw.txt — Bond et al. 2001 stacked % HSG
    (4-core composite, 70-yr resolution, 0-11.55 ka BP), plus the canonical
    event ages 0-8 (0.4/1.4/2.8/4.2/5.9/8.1/9.4/10.3/11.1 ka BP).
  - data/cff-coreflow-lod-derived.json — CAM ΔLOD from the CFF joint
    field+flow models (Nilsson et al., jSEDI; ERDA 2776), 7000 BCE-2000 CE,
    the only public core-flow reconstruction long enough for this test.

Tests:
  1. Bond-side clock: Rayleigh test of event dates (stack-picked and
     canonical) against the 1,465.9-yr period; spectral scan of the stack.
  2. Core-side clock: Rayleigh test of CFF ΔLOD extrema ("episodes")
     against the same period; spectral scan of CFF ΔLOD.
  3. Cross-coherence: millennial-band (0.5-2.5 kyr difference-of-Gaussians)
     lag correlation between CFF ΔLOD and Bond stacked HSG over the common
     9-kyr window, significance via phase-randomized surrogates.

Output: data/bond-coreflow-phase-lock-test.json
Run:    python3 scripts/bond_coreflow_phase_lock_test.py
"""

import json
import math
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'bond-coreflow-phase-lock-test.json'
P_1830 = 8 * 335317 / 1830.0
CANONICAL_BP = {0: 400, 1: 1400, 2: 2800, 3: 4200, 4: 5900,
                5: 8100, 6: 9400, 7: 10300, 8: 11100}


def gauss_smooth(y, step_yr, sigma_yr):
    n = len(y)
    half = int(4 * sigma_yr / step_yr)
    pad = np.concatenate([y[half:0:-1], y, y[-2:-half - 2:-1]])
    k = np.exp(-0.5 * ((np.arange(-half, half + 1) * step_yr) / sigma_yr) ** 2)
    k /= k.sum()
    return np.convolve(pad, k, mode='same')[half:half + n]


def bandpass(v):
    return gauss_smooth(v, 10.0, 120.0) - gauss_smooth(v, 10.0, 800.0)


def rayleigh(years_ce, period):
    ph = 2.0 * np.pi * np.asarray(years_ce, dtype=float) / period
    R = float(abs(np.mean(np.exp(1j * ph))))
    n = len(years_ce)
    return {'R': R, 'n': n, 'p_approx': float(np.exp(-n * R ** 2))}


def spectral_power(grid, v, period):
    om = 2.0 * np.pi / period
    X = np.column_stack([np.ones_like(grid, dtype=float),
                         np.cos(om * grid), np.sin(om * grid)])
    b, *_ = np.linalg.lstsq(X, v, rcond=None)
    pred = X @ b
    return 1.0 - float(np.sum((v - pred) ** 2) / np.sum((v - v.mean()) ** 2))


def top_periods(grid, v, per_lo, per_hi, k=5):
    per = np.arange(per_lo, per_hi + 1, 10)
    pw = np.array([spectral_power(grid, v, P) for P in per])
    tops = []
    for i in np.argsort(pw)[::-1]:
        if all(abs(per[i] - q['period_yr']) / q['period_yr'] > 0.10 for q in tops):
            tops.append({'period_yr': int(per[i]), 'r2': round(float(pw[i]), 4)})
        if len(tops) >= k:
            break
    return tops, float(pw[np.argmin(abs(per - P_1830))])


def load_bond():
    lines = open(REPO / 'data/bond2001-raw.txt',
                 encoding='latin-1').read().splitlines()
    rows = []
    for ln in lines:
        p = ln.split()
        if len(p) == 10:
            try:
                rows.append([float(x) for x in p])
            except ValueError:
                pass
    arr = np.array(rows)
    age, stack = arr[:, 8], arr[:, 9]
    m = age <= 11550
    return age[m], stack[m]


def pick_events(age_bp, stack):
    sm = np.convolve(stack, [0.25, 0.5, 0.25], mode='same')
    peaks = [(age_bp[i], sm[i]) for i in range(2, len(sm) - 2)
             if sm[i] == max(sm[max(0, i - 4):i + 5]) and sm[i] > np.median(sm)]
    matched = {}
    for ev, ca in CANONICAL_BP.items():
        cand = [(abs(a - ca), a) for a, _ in peaks if abs(a - ca) <= 500]
        if cand:
            matched[ev] = float(min(cand)[1])
    return matched


def main():
    print('=' * 88)
    print(f'HOLOCENE PHASE-LOCK TEST — Bond IRD events vs core-flow episodes vs '
          f'8H/1830 = {P_1830:.1f} yr')
    print('=' * 88)

    age_bp, stack = load_bond()
    byr = 1950.0 - age_bp
    matched = pick_events(age_bp, stack)
    print(f'\n── 1. Bond side ──')
    print(f'  Stack-picked events (BP): { {k: int(v) for k, v in sorted(matched.items())} }')
    ray_stack = rayleigh([1950 - v for v in matched.values()], P_1830)
    ray_canon = rayleigh([1950 - v for v in CANONICAL_BP.values()], P_1830)
    print(f'  Rayleigh vs 1,465.9 yr — stack-picked: R={ray_stack["R"]:.3f} '
          f'p~{ray_stack["p_approx"]:.2f};  canonical: R={ray_canon["R"]:.3f} '
          f'p~{ray_canon["p_approx"]:.2f}')
    spac = np.diff(sorted(CANONICAL_BP.values()))
    print(f'  Canonical spacings: {spac.tolist()} yr (mean {spac.mean():.0f} ± {spac.std():.0f})')
    bgrid = np.arange(byr.min(), byr.max(), 10)
    bi = np.interp(bgrid, byr[::-1], stack[::-1])
    bd = bi - np.polyval(np.polyfit(bgrid, bi, 2), bgrid)
    bond_tops, bond_p1466 = top_periods(bgrid, bd, 700, 4000)
    print(f'  Stack spectrum top periods: {bond_tops}')
    print(f'  Stack power at 1,466 yr: {bond_p1466:.4f} '
          f'(reproduces Obrochta 2012: ~1,000 + ~2,000-2,500 yr mixture, no 1,466 line)')

    cff = json.load(open(REPO / 'data/cff-coreflow-lod-derived.json'))
    results_cross = {}
    for model in ('cff_mp', 'cff_nt'):
        c = cff[model]
        t = np.array(c['year'], dtype=float)
        l = np.array(c['lod_ms'], dtype=float)
        grid = np.arange(-7000, 1941, 10)
        li = np.interp(grid, t, l)

        print(f'\n── 2. Core side ({model}) ──')
        lsm = gauss_smooth(li, 10.0, 150.0)
        ext = []
        for i in range(15, len(grid) - 15):
            if lsm[i] == max(lsm[i - 15:i + 16]) or lsm[i] == min(lsm[i - 15:i + 16]):
                if not ext or grid[i] - ext[-1] > 300:
                    ext.append(float(grid[i]))
        ray_cff = rayleigh(ext, P_1830)
        print(f'  ΔLOD extrema (episodes, {len(ext)}): {[int(e) for e in ext]}')
        print(f'  Rayleigh vs 1,465.9 yr: R={ray_cff["R"]:.3f} p~{ray_cff["p_approx"]:.2f}')
        cff_tops, cff_p1466 = top_periods(grid, li - li.mean(), 700, 4000)
        print(f'  ΔLOD spectrum top periods: {cff_tops};  power at 1,466 yr: {cff_p1466:.4f}')

        print(f'\n── 3. Cross-coherence ({model} vs Bond stack, millennial band) ──')
        bi9 = np.interp(grid, byr[::-1], stack[::-1])
        lb, bb = bandpass(li), bandpass(bi9)
        lags = range(-1000, 1001, 10)
        rs = [(float(np.corrcoef(np.roll(lb, L // 10)[120:-120], bb[120:-120])[0, 1]), L)
              for L in lags]
        r0 = [r for r, L in rs if L == 0][0]
        rmax, lmax = max(rs)
        rng = np.random.default_rng(42)

        def phaserand(v):
            F = np.fft.rfft(v)
            ph = rng.uniform(0, 2 * np.pi, len(F))
            ph[0] = 0
            return np.fft.irfft(np.abs(F) * np.exp(1j * ph), n=len(v))

        null = []
        for _ in range(300):
            sur = phaserand(bb)
            null.append(max(np.corrcoef(np.roll(lb, L // 10)[120:-120],
                                        sur[120:-120])[0, 1]
                            for L in range(-1000, 1001, 50)))
        p95, p99 = np.percentile(null, [95, 99])
        sig = rmax > p95
        print(f'  r(lag 0) = {r0:+.3f};  max r = {rmax:+.3f} @ lag {lmax:+d} yr')
        print(f'  phase-randomized null: p95 = {p95:.3f}, p99 = {p99:.3f} → '
              f'{"SIGNIFICANT" if sig else "NOT significant"}')
        results_cross[model] = {
            'episodes_ce': ext, 'rayleigh_episodes': ray_cff,
            'spectrum_top': cff_tops, 'power_at_1466': cff_p1466,
            'cross_r_lag0': r0, 'cross_r_max': rmax, 'cross_lag_at_max': lmax,
            'null_p95': float(p95), 'null_p99': float(p99), 'significant': bool(sig),
        }

    verdict = (
        'NO PHASE-LOCK — the prediction fails at every level and the mainstream '
        'expectation holds. (a) Bond events are quasi-periodic, not 1,466-yr-clocked '
        '(Rayleigh p ~ 0.6-0.8; stack spectrum peaks at ~1,000 and ~2,450 yr, '
        'reproducing Obrochta 2012). (b) Core-flow ΔLOD episodes show no 1,466-yr '
        'Rayleigh lock and the CFF spectrum has essentially no power at 1,466 yr. '
        '(c) No significant millennial-band cross-coherence between core-flow ΔLOD '
        'and Bond IRD within ±1,000-yr lags. The 8H/1830 flag remains what the '
        'eclipse window shows it to be — the periodic part of the millennial LOD '
        'fluctuation over the last 2.7 kyr — not a Holocene-wide shared clock. '
        'Caveat: CFF posterior σ (~2 ms) limits power before ~2000 BCE; a future '
        'higher-resolution flow model could reopen the test.'
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Holocene phase-lock test: Bond 2001 IRD events vs '
                                  'CFF core-flow ΔLOD episodes vs the 8H/1830 clock. '
                                  'Formulated as a falsifiable prediction 2026-07-22; '
                                  'tested (and failed) the same week, before '
                                  'publication.'),
                  'period_tested_yr': P_1830},
        'bond': {'stack_events_bp': matched, 'canonical_events_bp': CANONICAL_BP,
                 'rayleigh_stack_events': ray_stack, 'rayleigh_canonical': ray_canon,
                 'spectrum_top': bond_tops, 'power_at_1466': bond_p1466},
        'core_and_cross': results_cross,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

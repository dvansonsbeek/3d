"""
Wild-idea test: Does our 8H climate formula coincidentally predict a peak
at the Medieval Warm Period (year 960 CE, FWHM ~700 yr)?

Background:
  Our climate formula has 31 L1 lattice cycles + 3 L2 carbon-thermostat lines.
  Shortest L1 period: 8H/185 = 14.5 kyr
  Shortest L2 period: 134.83 kyr
  MWP timescale:      0.7 kyr (FWHM)

Naive expectation: the formula CAN'T resolve sub-kyr features because every
component varies on multi-kyr timescales. But — could the SUM of 34 components
constructively interfere around year 960 in a way that creates a smooth bump
matching the medieval LOD residual?

Test:
  1. Fit the formula to LR04 (post-MPT regime).
  2. Evaluate it at year -1000 to +1950 CE (= t from 2.95 kyr BP to 0 kyr BP).
  3. Check if there's any peak or upward excursion around year 960.
  4. Compare structure to the missing-signal shape we characterized earlier
     (smooth bump peaking at year 960, FWHM ~700 yr, peak Δ = -1322 s).
"""

import sys, json
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from milankovitch_climate_formula import (
    ClimateFormula, REGIME_WINDOWS, EIGHT_H, L1_LATTICE_INTEGERS,
    L2_THERMOSTAT_FAMILY, load_lr04, preprocess, L1_LABELS,
)

def main():
    print('=' * 78)
    print('MEDIEVAL WARM PERIOD vs 8H CLIMATE FORMULA — coincidence check')
    print('=' * 78)
    print()
    print('Formula structure:')
    print(f'  L1: {len(L1_LATTICE_INTEGERS)} lattice cycles, periods = 8H/n')
    print(f'      Shortest: 8H/{max(L1_LATTICE_INTEGERS)} = {EIGHT_H/max(L1_LATTICE_INTEGERS):.2f} kyr')
    print(f'      Longest:  8H/{min(L1_LATTICE_INTEGERS)} = {EIGHT_H/min(L1_LATTICE_INTEGERS):.2f} kyr')
    print(f'  L2: 3 carbon-thermostat lines, periods = {list(L2_THERMOSTAT_FAMILY.values())} kyr')
    print(f'  MWP feature: peak at year 960, FWHM ~700 yr (= 0.7 kyr)')
    print()
    print('Theoretical limit: the formula cannot RESOLVE sub-kyr features')
    print('because its shortest period component is 14.5 kyr.')
    print('But could 34 components SUM to create a coincidental bump?')
    print()

    # Fit to LR04 post-MPT
    print('=' * 78)
    print('Fitting climate formula to LR04 (post-MPT regime: 0-1000 kyr)...')
    print('=' * 78)
    ages, vals = load_lr04()
    t, y = preprocess(ages, vals, window=REGIME_WINDOWS["post-mpt"])
    f = ClimateFormula()
    summary = f.fit(t, y, regime='post-mpt')
    print(f'  R² (L1 only)    = {summary.r2_l1_only:.4f}')
    print(f'  R² (L1+L2)      = {summary.r2_l1_l2:.4f}')
    print(f'  R² (L1+L2+L3)   = {summary.r2_l1_l2_l3:.4f}')
    print()

    # Evaluate at Common Era timestamps (year -1000 CE to +1950 CE)
    # In LR04 convention, t = kyr before 1950 CE
    # year 960 CE → t = (1950-960)/1000 = 0.990 kyr BP
    # year -500 CE → t = 2.450 kyr BP
    # year 1950 CE → t = 0 kyr BP
    print('=' * 78)
    print('Climate formula evaluated over the Common Era')
    print('=' * 78)
    print(f'  (LR04 convention: t = kyr before 1950 CE; t=0 is "now")')
    print()
    print(f'  {"Year":>8} {"t (kyr BP)":>12} {"C(t) norm":>12} {"L1":>10} {"L2":>10} {"L3":>10}')
    print(f'  {"-"*8} {"-"*12} {"-"*12} {"-"*10} {"-"*10} {"-"*10}')
    years_to_check = [-1000, -500, 0, 500, 700, 800, 900, 960, 1000, 1100, 1200, 1300, 1500, 1700, 1900, 1950]
    for year in years_to_check:
        t_kyr = (1950 - year) / 1000.0
        t_pt = np.array([t_kyr])
        d = f.decompose(t_pt)
        marker = ''
        if year == 960:
            marker = ' <-- MWP peak'
        elif 800 <= year <= 1300:
            marker = ' <-- MWP window'
        print(f'  {year:>8} {t_kyr:>12.3f} {d["total"][0]:>+12.4f} {d["l1"][0]:>+10.4f} {d["l2"][0]:>+10.4f} {d["l3"][0]:>+10.4f}{marker}')

    # Fine-grained scan across the medieval bump
    print()
    print('=' * 78)
    print('Fine-grained scan: year 0 to 1950 CE, 50-yr steps')
    print('=' * 78)
    years = np.arange(0, 1951, 50)
    t_kyr = (1950 - years) / 1000.0
    C = f.evaluate(t_kyr, layer='all')
    L1 = f.evaluate(t_kyr, layer='l1') - f._intercept
    L2 = f.evaluate(t_kyr, layer='l2')
    print(f'  {"Year":>5} {"C(t)":>10} {"L1":>10} {"L2":>10}  Bar')
    for i, yr in enumerate(years):
        bar_pos = '#' * max(0, int(20 * (C[i] - C.min()) / max(C.max() - C.min(), 1e-9)))
        marker = ''
        if 850 <= yr <= 1100:
            marker = ' MWP'
        print(f'  {yr:>5} {C[i]:>+10.4f} {L1[i]:>+10.4f} {L2[i]:>+10.4f}  {bar_pos}{marker}')

    # Find local extrema in the Common Era window
    print()
    print('=' * 78)
    print('Local extrema in C(t) across Common Era (year 0 to 1950)')
    print('=' * 78)
    years_fine = np.arange(0, 1950, 5)
    t_fine = (1950 - years_fine) / 1000.0
    C_fine = f.evaluate(t_fine, layer='all')

    # Local max / min via discrete derivative sign change
    dC = np.diff(C_fine)
    maxima_idx = []
    minima_idx = []
    for i in range(1, len(dC)):
        if dC[i-1] > 0 and dC[i] <= 0:
            maxima_idx.append(i)
        elif dC[i-1] < 0 and dC[i] >= 0:
            minima_idx.append(i)

    print(f'  Maxima:')
    if not maxima_idx:
        print(f'    (none — C(t) is monotonic over the Common Era)')
    else:
        for i in maxima_idx:
            print(f'    year {years_fine[i]:>5}: C = {C_fine[i]:+.4f}')
    print(f'  Minima:')
    if not minima_idx:
        print(f'    (none — C(t) is monotonic over the Common Era)')
    else:
        for i in minima_idx:
            print(f'    year {years_fine[i]:>5}: C = {C_fine[i]:+.4f}')

    print()
    print('=' * 78)
    print('CONCLUSION')
    print('=' * 78)
    # Compare to MWP signal shape: peak at 960, FWHM 700 yr, peak Δ = -1322 s
    t_mwp = (1950 - 960) / 1000.0
    t_baseline_pre  = (1950 - 200) / 1000.0   # before MWP
    t_baseline_post = (1950 - 1700) / 1000.0  # after MWP
    C_mwp = f.evaluate(np.array([t_mwp]), layer='all')[0]
    C_pre = f.evaluate(np.array([t_baseline_pre]), layer='all')[0]
    C_post = f.evaluate(np.array([t_baseline_post]), layer='all')[0]
    C_bump_norm = C_mwp - 0.5 * (C_pre + C_post)
    print(f'  Climate formula at year 960:  C = {C_mwp:+.4f}')
    print(f'  Average at year 200 + 1700:   C = {0.5*(C_pre+C_post):+.4f}')
    print(f'  Bump excess at year 960:      ΔC = {C_bump_norm:+.4f} (normalized δ¹⁸O units)')
    print()
    print(f'  Convert to °C: δ¹⁸O 1‰ ≈ 4°C (Shackleton scale).')
    print(f'  LR04 normalization std ≈ {f._fit_y_std:.3f} ‰.')
    print(f'  → Climate formula predicts MWP excess of {C_bump_norm * f._fit_y_std:+.4f} ‰')
    print(f'    ≈ {C_bump_norm * f._fit_y_std * -4:+.3f} °C (negative because δ¹⁸O decreases with warming)')
    print()
    if abs(C_bump_norm) < 0.05:
        print(f'  → No appreciable bump from climate formula at MWP timeframe.')
        print(f'  → Formula structure (shortest period 14.5 kyr) cannot resolve')
        print(f'    the sub-kyr MWP feature (FWHM 0.7 kyr). EXPECTED.')
    else:
        print(f'  → Non-trivial structure in formula at MWP timeframe.')
        print(f'    Worth investigating further.')

    # ─── Bonus: any L1 or L2 component within ~3 cy of the MWP timescale? ───
    print()
    print('=' * 78)
    print('Are any formula components NEAR the MWP timescale?')
    print('=' * 78)
    print(f'  MWP FWHM ~700 yr → looking for components with period < 5 kyr')
    print()
    found = False
    for n in L1_LATTICE_INTEGERS:
        period = EIGHT_H / n
        if period < 5.0:
            print(f'  L1 n={n}: period = {period:.3f} kyr ({L1_LABELS.get(n, "")})')
            found = True
    if not found:
        print(f'  None. Shortest L1 component = 14.5 kyr.')
    print(f'  L2: shortest = {min(L2_THERMOSTAT_FAMILY.values()):.2f} kyr.')
    print()
    print(f'  → CONFIRMED: no component in the formula can produce sub-kyr structure.')
    print(f'  → MWP is fundamentally below the formula\'s resolution.')

if __name__ == '__main__':
    main()

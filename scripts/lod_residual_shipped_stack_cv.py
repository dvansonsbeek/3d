"""
Out-of-sample cross-validation for the SHIPPED 4-flag ΔT stack.

scripts/lod_residual_lattice_cv.py ran this test against the exploration-era
set (Bond 8H/1825 + 800 yr + 1000 yr). That set is not what ships. The shipped
stack is the cascade fitted by tools/fit/dt-corrections-fit.js:

    Bond      8H/1830 = 1465.9 yr
    Hallstatt 8H/1104 = 2429.8 yr
    Jose5     8H/2989 =  897.5 yr
    Jose4     8H/3749 =  715.5 yr

data/deltaT-4flag-fit.json records only IN-SAMPLE metrics for those four
stages (r2, rms_post). This script supplies the missing out-of-sample half,
using the same splits and the same pass criteria as the original CV so the
two are directly comparable.

Hypothesis test:
  H1: the lattice harmonics capture real structure → a fit on one era should
      PREDICT another era it never saw.
  H0: they are absorbing local residual → out-of-sample R² collapses to ~0
      or goes negative.

Pass criteria (inherited verbatim from lod_residual_lattice_cv.py):
  • Out-of-sample R² > 0.5 on at least 2 of 3 extrapolation splits.
  • The 1-component (Bond-only) fit should ALSO survive — if all four flags
    are needed to predict, that is a warning sign for overfitting.

Run:  python3 scripts/lod_residual_shipped_stack_cv.py
"""

import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path('/home/dennis/code/3d/scripts')))
from lod_residual_lattice_fit import (
    EIGHT_H, load_stephenson, stephenson_delta_t_vector, model_delta_t_vector,
)

# ── The shipped cascade, in the order dt-corrections-fit.js adds them ────────
BOND      = {'label': 'Bond',      'n': 1830, 'P_actual': EIGHT_H / 1830}
HALLSTATT = {'label': 'Hallstatt', 'n': 1104, 'P_actual': EIGHT_H / 1104}
JOSE5     = {'label': 'Jose5',     'n': 2989, 'P_actual': EIGHT_H / 2989}
JOSE4     = {'label': 'Jose4',     'n': 3749, 'P_actual': EIGHT_H / 3749}

MODELS = [
    ('Detrend only (baseline)',        []),
    ('Stage A: Bond solo',             [BOND]),
    ('Stage B: + Hallstatt',           [BOND, HALLSTATT]),
    ('Stage C: + Jose5',               [BOND, HALLSTATT, JOSE5]),
    ('Stage D: + Jose4  (SHIPPED)',    [BOND, HALLSTATT, JOSE5, JOSE4]),
]

SPLITS = [
    ('SPLIT 1: TRAIN -720..1500, TEST 1500..2016',
     'Fit dominated by medieval-bump data; does it extrapolate forward?',
     lambda y: y <= 1500),
    ('SPLIT 2: TRAIN 0..2016, TEST -720..0',
     'Reverse direction: predict the Babylonian era from post-CE data.',
     lambda y: y >= 0),
    ('SPLIT 3: ALTERNATING decades (interleaved)',
     'Gentlest test - interpolation only, checks smoothness not physics.',
     lambda y: int(round(y / 10.0)) % 2 == 0),
    ('SPLIT 4: TRAIN -720..900 (PRE-MWP), TEST 900..2016',
     'Toughest test: train data contains no information about the MWP bump.',
     lambda y: y <= 900),
]


def design(years, candidates, y0):
    """Design matrix identical in train and test: detrend centred on the
    TRAINING mean y0, harmonics on absolute year (phase is absolute)."""
    years = np.asarray(years, dtype=float)
    t = (years - y0) / 1000.0
    cols = [np.ones_like(t), t, t ** 2]
    for c in candidates:
        w = 2.0 * math.pi / c['P_actual']
        cols.append(np.cos(w * years))
        cols.append(np.sin(w * years))
    return np.column_stack(cols)


def r2_of(actual, pred):
    ss_res = float(np.sum((actual - pred) ** 2))
    ss_tot = float(np.sum((actual - actual.mean()) ** 2))
    return 1.0 - ss_res / max(ss_tot, 1e-12)


def main():
    segments = load_stephenson()
    years = np.arange(-720, 2017, 10, dtype=float)
    steph = stephenson_delta_t_vector(years, segments)
    model = model_delta_t_vector(years)
    ok = np.isfinite(steph) & np.isfinite(model)
    years, resid = years[ok], (steph - model)[ok]

    print('=' * 78)
    print('CROSS-VALIDATION OF THE SHIPPED 4-FLAG STACK')
    print('  Bond 8H/1830  Hallstatt 8H/1104  Jose5 8H/2989  Jose4 8H/3749')
    print('=' * 78)
    print(f'Full residual: n={len(years)} points, year [{years[0]:.0f}, {years[-1]:.0f}]')
    print(f'Full residual: RMS = {np.sqrt(np.mean(resid**2)):.1f} s')

    summary = {}
    for title, blurb, in_train in SPLITS:
        mask = np.array([in_train(y) for y in years])
        ytr, rtr = years[mask], resid[mask]
        yte, rte = years[~mask], resid[~mask]
        if len(yte) < 10:
            continue
        y0 = float(ytr.mean())
        print('\n' + '=' * 78)
        print(title)
        print('  ' + blurb)
        print('=' * 78)
        print(f'  Train: n={len(ytr)} ({ytr[0]:.0f} to {ytr[-1]:.0f})')
        print(f'  Test:  n={len(yte)} ({yte[0]:.0f} to {yte[-1]:.0f}), RMS={np.sqrt(np.mean(rte**2)):.1f}s')
        print()
        print(f'  {"Model":<32}{"R2_train":>10}{"RMS_tr":>10}{"R2_test":>11}{"RMS_te":>10}')
        print('  ' + '-' * 71)
        for name, cands in MODELS:
            Xtr = design(ytr, cands, y0)
            beta, *_ = np.linalg.lstsq(Xtr, rtr, rcond=None)
            ptr = Xtr @ beta
            pte = design(yte, cands, y0) @ beta
            r2tr, r2te = r2_of(rtr, ptr), r2_of(rte, pte)
            rmstr = float(np.sqrt(np.mean((rtr - ptr) ** 2)))
            rmste = float(np.sqrt(np.mean((rte - pte) ** 2)))
            print(f'  {name:<32}{r2tr:>+10.4f}{rmstr:>9.1f}s{r2te:>+11.4f}{rmste:>9.1f}s')
            summary.setdefault(name, []).append((title.split(':')[0], r2te))

    print('\n' + '=' * 78)
    print('VERDICT against the inherited pass criteria')
    print('=' * 78)
    extrap = {'SPLIT 1', 'SPLIT 2', 'SPLIT 4'}   # SPLIT 3 is interpolation
    for name, rows in summary.items():
        ex = [r2 for tag, r2 in rows if tag in extrap]
        n_pass = sum(1 for r2 in ex if r2 > 0.5)
        n_neg = sum(1 for r2 in ex if r2 < 0)
        print(f'  {name:<32} extrapolation R2 > 0.5 on {n_pass}/3 splits'
              f'   ({n_neg}/3 negative)')
    print('\n  Criterion: >0.5 on at least 2 of 3 extrapolation splits,')
    print('  and the Bond-solo model should survive with R2_test > 0 throughout.')


if __name__ == '__main__':
    main()

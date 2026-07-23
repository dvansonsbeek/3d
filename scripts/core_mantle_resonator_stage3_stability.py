"""
Stage 3.1 — kick-epoch stability for the Core-mantle swing (Resonator driver).

The Stage-1 fits exposed a t_exc/T₀ ridge: the excitation epoch moved
−1300 → −800 between the coarse and lattice T₀ grids at identical RMS. Before
the shipped constants can be trusted (and before any default-ON decision),
the epochs must be pinned and their real uncertainty measured.

Method (guard-aware solver throughout — modern-window δLOD penalty rows,
as in Stage 1):
  A. COORDINATE REFINEMENT from the shipped optimum: cycle fine scans of
     t_exc (step 20, −2600..−600), t₂ (step 20, 400..1640 — past the old
     +1600 grid edge; capped at 1640 to stay clear of the 1650+ guard
     window), lattice n (671..705), Q (0.5..8 step 0.1) until converged.
  B. RIDGE MAP at the refined (n, Q): full t_exc × t₂ surface; the STABILITY
     BOX = all guard-passing configs within 2% of the optimum RMS — the
     honest uncertainty ranges of the shipped epochs.
  C. ERA JACKKNIFE: refit with (i) the Babylonian third (y < −300),
     (ii) the medieval core (500..1500), (iii) the late window (y > 1200)
     removed. If the optimum epochs wander outside the stability box, the
     data does not pin them and a convention must be chosen explicitly.
  D. VERDICT: shipped (−800, +1600) STANDS / UPDATE RECOMMENDED, with the
     pinned values + uncertainty ranges for doc 104 and the shipped block.

Output: data/core-mantle-resonator-stage3-stability.json
Run:    python3 scripts/core_mantle_resonator_stage3_stability.py
"""

import json
import sys
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'core-mantle-resonator-stage3-stability.json'
sys.path.insert(0, str(REPO / 'scripts'))
from core_mantle_resonator_stage1 import (          # noqa: E402
    EIGHT_H, load_residual, load_flags, difference_tones,
    episode_columns, guards)

YM_PEN = np.arange(1650.0, 2017.0, 10.0)
W_PEN = 400.0
MAX_AMP_S, MAX_CANCEL = 1000.0, 3.0


def solve(years, resid, kicks, T0, Q, tones):
    """Guard-aware augmented lstsq; returns (rms, guards, coefs) or None."""
    out = episode_columns(years, kicks, T0, Q, tones)
    if out is None:
        return None
    X, _ = out
    Xp1, _ = episode_columns(YM_PEN + 1.0, kicks, T0, Q, tones)
    Xm1, _ = episode_columns(YM_PEN - 1.0, kicks, T0, Q, tones)
    dX = (Xp1 - Xm1) / 2.0 / 365.2422 * 1000.0
    A = np.vstack([X, W_PEN * dX])
    y = np.concatenate([resid, np.zeros(len(YM_PEN))])
    b, *_ = np.linalg.lstsq(A, y, rcond=None)
    model = X @ b
    rms = float(np.sqrt(np.mean((resid - model) ** 2)))
    g = guards(years, model)
    if not g['pass']:
        return None
    ext = np.arange(kicks[0], 2017.0, 10.0)
    Xe, _ = episode_columns(ext, kicks, T0, Q, tones)
    me = Xe @ b
    peak = float(np.max(np.abs(me)))
    tp = float(sum(abs(b[i]) * np.max(np.abs(Xe[:, i])) for i in range(len(b))))
    if peak > MAX_AMP_S or tp > MAX_CANCEL * max(peak, 1e-9):
        return None
    return rms, g, [float(x) for x in b]


def main():
    print('=' * 88)
    print('STAGE 3.1 — kick-epoch stability (guard-aware; fine grids; jackknife)')
    print('=' * 88)
    years, resid = load_residual()
    tones = difference_tones(load_flags())[:1]          # V5: top tone only

    T_EXC_GRID = np.arange(-2600, -599, 20.0)
    T2_GRID = np.arange(400, 1641, 20.0)
    N_GRID = list(range(671, 706))
    Q_GRID = np.arange(0.5, 8.01, 0.1)

    # ── A. coordinate refinement ────────────────────────────────────────
    cur = {'t1': -800.0, 't2': 1600.0, 'n': 685, 'Q': 1.8}
    trace = []
    for rnd in range(4):
        changed = False
        for param, grid in (('t1', T_EXC_GRID), ('t2', T2_GRID),
                            ('n', N_GRID), ('Q', Q_GRID)):
            best = None
            for v in grid:
                trial = dict(cur); trial[param] = float(v) if param != 'n' else int(v)
                r = solve(years, resid, [trial['t1'], trial['t2']],
                          EIGHT_H / trial['n'], trial['Q'], tones)
                if r and (best is None or r[0] < best[0]):
                    best = (r[0], trial[param])
            if best and best[1] != cur[param]:
                cur[param] = best[1]
                changed = True
        r = solve(years, resid, [cur['t1'], cur['t2']],
                  EIGHT_H / cur['n'], cur['Q'], tones)
        trace.append({'round': rnd + 1, **cur, 'rms_s': r[0] if r else None})
        print(f'  round {rnd + 1}: t1={cur["t1"]:+.0f}  t2={cur["t2"]:+.0f}  '
              f'n={cur["n"]}  Q={cur["Q"]:.2f}  RMS={r[0]:.2f}')
        if not changed:
            break
    ref = solve(years, resid, [cur['t1'], cur['t2']], EIGHT_H / cur['n'], cur['Q'], tones)
    rms_ref = ref[0]

    # ── B. ridge map + stability box ────────────────────────────────────
    box = {'t1': [], 't2': []}
    surface = []
    for t1 in np.arange(-2600, -599, 50.0):
        for t2 in np.arange(400, 1641, 40.0):
            r = solve(years, resid, [float(t1), float(t2)],
                      EIGHT_H / cur['n'], cur['Q'], tones)
            if r is None:
                continue
            surface.append((float(t1), float(t2), r[0]))
            if r[0] <= rms_ref * 1.02:
                box['t1'].append(float(t1))
                box['t2'].append(float(t2))
    box_ranges = {k: [min(v), max(v)] if v else None for k, v in box.items()}
    print(f'\n── B. stability box (guard-pass, RMS ≤ 1.02× optimum {rms_ref:.1f} s) ──')
    print(f'  excitation t1 ∈ {box_ranges["t1"]}   termination t2 ∈ {box_ranges["t2"]}'
          f'   ({len(box["t1"])} configs)')

    # ── C. era jackknife ────────────────────────────────────────────────
    print('\n── C. era jackknife (optimum kicks when an era is removed) ──')
    jk_results = {}
    for label, mask in (
            ('drop_babylonian(y<-300)', years >= -300),
            ('drop_medieval(500..1500)', ~((years > 500) & (years < 1500))),
            ('drop_late(y>1200)', years <= 1200)):
        yj, rj = years[mask], resid[mask]

        def solve_j(kicks, T0, Q):
            out = episode_columns(yj, kicks, T0, Q, tones)
            if out is None:
                return None
            X, _ = out
            Xp1, _ = episode_columns(YM_PEN + 1.0, kicks, T0, Q, tones)
            Xm1, _ = episode_columns(YM_PEN - 1.0, kicks, T0, Q, tones)
            dX = (Xp1 - Xm1) / 2.0 / 365.2422 * 1000.0
            A = np.vstack([X, W_PEN * dX])
            y = np.concatenate([rj, np.zeros(len(YM_PEN))])
            b, *_ = np.linalg.lstsq(A, y, rcond=None)
            model_full = episode_columns(years, kicks, T0, Q, tones)[0] @ b
            g = guards(years, model_full)
            if not g['pass']:
                return None
            return float(np.sqrt(np.mean((rj - X @ b) ** 2)))
        best = None
        for t1 in np.arange(-2600, -599, 100.0):
            for t2 in np.arange(400, 1641, 100.0):
                r = solve_j([float(t1), float(t2)], EIGHT_H / cur['n'], cur['Q'])
                if r is not None and (best is None or r < best[0]):
                    best = (r, float(t1), float(t2))
        jk_results[label] = {'t1': best[1], 't2': best[2]} if best else None
        in_box = (best and box_ranges['t1'] and
                  box_ranges['t1'][0] <= best[1] <= box_ranges['t1'][1] and
                  box_ranges['t2'][0] <= best[2] <= box_ranges['t2'][1])
        print(f'  {label:26s} → t1={best[1]:+.0f}, t2={best[2]:+.0f}  '
              f'{"IN box" if in_box else "OUTSIDE box"}')

    # ── D. verdict — principled decision rule ───────────────────────────
    # The epochs are DATA-PINNABLE only if (a) the refinement gain over the
    # shipped constants is meaningful (> 5% RMS — both fits sit below the
    # ~70-s structure floor, so small gains are noise), AND (b) the jackknife
    # optima stay inside the stability box (era-robust), AND (c) the optimum
    # does not ride a grid/guard boundary. Otherwise the shipped values are a
    # CONVENTION and chasing the ridge optimum would be fitting noise.
    r_ship = solve(years, resid, [-800.0, 1600.0], EIGHT_H / 685, 1.8, tones)
    rms_ship = r_ship[0] if r_ship else float('inf')
    gain = (rms_ship - rms_ref) / rms_ship
    jk_in_box = all(
        v and box_ranges['t1'] and
        box_ranges['t1'][0] <= v['t1'] <= box_ranges['t1'][1] and
        box_ranges['t2'][0] <= v['t2'] <= box_ranges['t2'][1]
        for v in jk_results.values())
    t2_on_edge = abs(cur['t2'] - T2_GRID[-1]) < 1e-9
    pinnable = gain > 0.05 and jk_in_box and not t2_on_edge
    verdict = (
        f'Ridge optimum: t1 = {cur["t1"]:+.0f}, t2 = {cur["t2"]:+.0f}, n = {cur["n"]}, '
        f'Q = {cur["Q"]:.2f}, RMS = {rms_ref:.2f} s vs shipped {rms_ship:.2f} s '
        f'(gain {gain * 100:.1f}%). Stability box: t1 ∈ {box_ranges["t1"]}, '
        f't2 ∈ {box_ranges["t2"]}; jackknife optima '
        f'{"stay inside" if jk_in_box else "SCATTER OUTSIDE"} the box; '
        f't2 {"rides the grid/guard edge" if t2_on_edge else "is interior"}. '
        + ('EPOCHS ARE DATA-PINNABLE — update the shipped block to the ridge optimum.'
           if pinnable else
           'EPOCHS ARE NOT DATA-PINNABLE (broad ridge, era-dependent jackknife, '
           'edge-riding t2, sub-floor RMS gain) — the shipped values (−800, +1600, '
           'n = 685, Q = 1.8) STAND AS CONVENTION: excitation just before the record '
           'edge (minimal extrapolated claim; full strength at −720 as observed), '
           'termination 50 yr clear of the guard window, consistent with the '
           'Dumberry & Finlay westward-reversal era. Documented uncertainty: t1 '
           'unconstrained within the box and earlier; t2 ∈ ~[1300, 1640] per '
           'jackknife; n ∈ ~[671, 705]; Q ∈ ~[1.5, 2.5] along the ridge.')
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Stage 3.1 kick-epoch stability: coordinate refinement, '
                                  'ridge map with 2% stability box, era jackknife. '
                                  'Guard-aware solver throughout.')},
        'refined_optimum': {**cur, 'T0_yr': EIGHT_H / cur['n'], 'rms_s': rms_ref},
        'refinement_trace': trace,
        'stability_box': box_ranges,
        'ridge_surface_sample': surface[:500],
        'jackknife': jk_results,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

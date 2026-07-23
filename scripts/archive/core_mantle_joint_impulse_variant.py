"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

Impulse-consistent joint-fit variant: displacement-continuous episode.

The shipped joint world (--joint) allows kick columns with both cos and sin
at the kick epoch — the fit exploited the unphysical cos freedom to put a
~700-s ΔT STEP at the excitation epoch (visible as a notch at −800 in the ΔT
chart; 80 yr before the first data point, so unconstrained by observations).
ΔT is accumulated rotation ANGLE: an impulsive torque may step the RATE
(slope kink) but never the angle itself.

This variant enforces displacement continuity everywhere:
  - kicks are SIN-ONLY unit shapes  env·sin(w_d·(y−t_k))  (value 0 at the
    kick, slope jump — the true impulse response of the damped oscillator);
  - the drive tone is SWITCH-ON COMPENSATED:
        env·[cos(w·y − φ) − cos(w·t₁ − φ)·cos(w_d·(y−t₁))]
    i.e. the eigenmode transient that cancels the drive response's initial
    displacement (physical switched-on drive; slope discontinuity allowed);
  - the excitation epoch t₁ is scanned earlier (−2600..−800 — the Stage-3
    stability box showed t₁ unconstrained back to ~−2350), giving the sine
    room to grow to Babylonian amplitude by −720.

Everything else mirrors the shipped joint fit: hard USNO closure, caps,
locked tone phase, free intercept, TRUE Espenak scoring. GO if quality is
close to the shipped world (Espenak 12.54 s / full 32.4 s) — then the
runtime episode forms get re-shipped continuous.

Output: data/core-mantle-joint-impulse-variant.json
Run:    python3 scripts/core_mantle_joint_impulse_variant.py
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'core-mantle-joint-impulse-variant.json'
sys.path.insert(0, str(Path(__file__).resolve().parent))  # archive-local imports
sys.path.insert(1, str(REPO / 'scripts'))
from core_mantle_joint_fit_stage4 import (          # noqa: E402
    EIGHT_H, MEAN_TROP_S, ESPENAK_REFERENCE, FLAGS, TONE_DN,
    load_raw, tone_phase_locked, constrained_lsq)

# resonator convention (T0/Q lattice-labeled; kick2 kept at +1600)
_res = json.load(open(REPO / 'data/core-mantle-resonator-stage1.json'))
_rb = _res['proposed_shipped_coefficients']['resonator']
RES_N, RES_Q = _rb['T0_lattice_n'], _rb['Q']
RES_T0 = EIGHT_H / RES_N
RES_W0 = 2 * math.pi / RES_T0
RES_LAM = RES_W0 / (2 * RES_Q)
RES_WD = RES_W0 * math.sqrt(1 - 1 / (4 * RES_Q * RES_Q))
T2 = 1600.0
CAPS = {'hallstatt': 80.0, 'jose5': 50.0, 'jose4': 50.0,
        'res_kick1': 773.335, 'res_kick2': 179.324, 'res_tone': 186.140}
COMP = {'bond': [0, 1], 'hallstatt': [2, 3], 'jose5': [4, 5], 'jose4': [6, 7],
        'res_kick1': [8], 'res_kick2': [9], 'res_tone': [10]}
N_COLS = 12                                    # 8 flags + 3 resonator + intercept
INTERCEPT = 11


def col_fns(t1, phi_tone):
    fns = []
    for nm, n in FLAGS.items():
        w = 2 * math.pi * n / EIGHT_H
        fns.append(lambda y, w=w: np.cos(w * y))
        fns.append(lambda y, w=w: np.sin(w * y))

    def env(y, tk):
        dt = np.asarray(y, dtype=float) - tk
        return (dt >= 0) * np.exp(-RES_LAM * np.clip(dt, 0, None))

    def kick_sin(y, tk):
        dt = np.asarray(y, dtype=float) - tk
        return env(y, tk) * np.sin(RES_WD * np.clip(dt, 0, None))
    fns.append(lambda y: kick_sin(y, t1))
    fns.append(lambda y: kick_sin(y, T2))

    w_t = 2 * math.pi * TONE_DN / EIGHT_H
    c0 = math.cos(w_t * t1 - phi_tone)          # drive value at switch-on

    def tone_cont(y):
        dt = np.asarray(y, dtype=float) - t1
        e = env(y, t1)
        return e * (np.cos(w_t * np.asarray(y, dtype=float) - phi_tone)
                    - c0 * np.cos(RES_WD * np.clip(dt, 0, None)))
    fns.append(tone_cont)
    return fns


def build(years, t1, phi_tone):
    fns = col_fns(t1, phi_tone)
    cols, lod_rows = [], []
    for fn in fns:
        v = fn(years)
        v2000 = float(fn(np.array([2000.0]))[0])
        cols.append(v - v2000)
        d = (float(fn(np.array([2000.5]))[0]) - float(fn(np.array([1999.5]))[0]))
        lod_rows.append(86400.0 * d / MEAN_TROP_S)
    cols.append(np.ones_like(years, dtype=float))
    lod_rows.append(0.0)
    return np.column_stack(cols), np.array(lod_rows), fns


def cascade(A, b, lodrow, d):
    fixed = {}
    for _ in range(10):
        free = [i for i in range(A.shape[1]) if i not in fixed]
        b_eff = b - (A[:, list(fixed)] @ np.array([fixed[i] for i in fixed])
                     if fixed else 0)
        d_eff = d - (sum(lodrow[i] * fixed[i] for i in fixed) if fixed else 0)
        x_free = constrained_lsq(A[:, free], b_eff, lodrow[free], d_eff)
        x = np.zeros(A.shape[1])
        for k, i in enumerate(free):
            x[i] = x_free[k]
        for i, v in fixed.items():
            x[i] = v
        hit = None
        for comp, idx in COMP.items():
            if comp == 'bond' or all(i in fixed for i in idx):
                continue
            amp = (math.hypot(*[x[i] for i in idx]) if len(idx) == 2
                   else abs(x[idx[0]]))
            cap = CAPS.get(comp)
            if cap and amp > cap * (1 + 1e-9):
                s = cap / amp
                for i in idx:
                    fixed[i] = x[i] * s
                hit = comp
                break
        if hit is None:
            return x
    return x


def main():
    print('=' * 88)
    print('IMPULSE-CONSISTENT JOINT VARIANT — sin-only kicks, switch-on-compensated tone')
    print('=' * 88)
    years, steph, pure = load_raw()
    phi_tone = tone_phase_locked()
    b0 = steph - pure
    f4 = json.load(open(REPO / 'data/deltaT-4flag-fit.json'))
    der = f4['usno_anchor']['derivation']
    esp_years = np.array(sorted(ESPENAK_REFERENCE), dtype=float)
    esp_vals = np.array([ESPENAK_REFERENCE[int(y)] for y in esp_years])
    pure_esp = np.interp(esp_years, years, pure)

    best = None
    print('\n   t1      USNO        dts    EspRMS  fullRMS   Bond    k1     k2    tone')
    for t1 in np.arange(-2600, -799, 100.0):
        A, lodrow, fns = build(years, float(t1), phi_tone)
        A_esp, _, _ = build(esp_years, float(t1), phi_tone)
        row_best = None
        for usno in np.arange(86400.0014, 86400.00301, 0.0001):
            target = usno - der['lod_kinematic_at_j2000_s'] - der['h5_correction_s']
            x = cascade(A, b0, lodrow, target)
            corr = A_esp[:, :-1] @ x[:-1]
            diffs = esp_vals - (pure_esp + corr)
            dts = float(np.mean(diffs))
            rms_esp = float(np.sqrt(np.mean((diffs - dts) ** 2)))
            rms_full = float(np.sqrt(np.mean((b0 - A @ x) ** 2)))
            cand = {'t1': float(t1), 'usno': float(usno), 'dts': dts,
                    'rms_esp': rms_esp, 'rms_full': rms_full,
                    'x': [float(v) for v in x]}
            # composite: best Espenak SUBJECT TO full-window quality (the
            # Espenak-only score degenerates toward late-t1 solutions whose
            # sine cannot reach Babylonian amplitude — full RMS ~400 s)
            if (rms_full <= 40.0
                    and (row_best is None or rms_esp < row_best['rms_esp'])):
                row_best = cand
            if row_best is None and (rms_full, rms_esp):
                pass
        if row_best is None:
            # no budget-passing point at this t1 — report unconstrained best
            for usno in [86400.0015]:
                target = usno - der['lod_kinematic_at_j2000_s'] - der['h5_correction_s']
                x = cascade(A, b0, lodrow, target)
                corr = A_esp[:, :-1] @ x[:-1]
                diffs = esp_vals - (pure_esp + corr)
                dts = float(np.mean(diffs))
                row_best = {'t1': float(t1), 'usno': float(usno), 'dts': dts,
                            'rms_esp': float(np.sqrt(np.mean((diffs - dts) ** 2))),
                            'rms_full': float(np.sqrt(np.mean((b0 - A @ x) ** 2))),
                            'x': [float(v) for v in x], 'over_budget': True}
        x = np.array(row_best['x'])
        print(f'  {row_best["t1"]:+6.0f}  {row_best["usno"]:.4f}  {row_best["dts"]:7.2f}  '
              f'{row_best["rms_esp"]:7.2f}  {row_best["rms_full"]:7.2f}  '
              f'{math.hypot(x[0], x[1]):6.1f}  {abs(x[8]):5.1f}  {abs(x[9]):5.1f}  {abs(x[10]):6.1f}')
        if (not row_best.get('over_budget')
                and (best is None or row_best['rms_esp'] < best['rms_esp'])):
            best = row_best

    x = np.array(best['x'])
    # continuity check at the kick epochs
    _, _, fns = build(years, best['t1'], phi_tone)
    def total_at(y):
        return sum(x[j] * float(fns[j](np.array([y]))[0]) for j in range(11))
    eps = 0.01
    step_t1 = abs(total_at(best['t1'] + eps) - total_at(best['t1'] - eps))
    step_t2 = abs(total_at(T2 + eps) - total_at(T2 - eps))
    print(f'\n  BEST: t1 = {best["t1"]:+.0f}, USNO {best["usno"]:.4f}, '
          f'deltaTStart {best["dts"]:.2f}, Espenak {best["rms_esp"]:.2f} s, '
          f'full {best["rms_full"]:.2f} s')
    print(f'  continuity: |step| at t1 = {step_t1:.4f} s, at t2 = {step_t2:.4f} s '
          f'(both must be ~0 — vs ~700 s in the shipped cos-kick world)')
    print(f'  shipped joint world for comparison: Espenak 12.54 s, full 32.4 s')

    go = best['rms_esp'] <= 14.0 and best['rms_full'] <= 40.0
    verdict = (
        f'Impulse-consistent optimum: t1 = {best["t1"]:+.0f}, USNO {best["usno"]:.4f}, '
        f'deltaTStart {best["dts"]:.2f}, Espenak {best["rms_esp"]:.2f} s, full '
        f'{best["rms_full"]:.2f} s; displacement-continuous everywhere '
        f'(steps {step_t1:.1e}/{step_t2:.1e} s). '
        + ('GO — quality within tolerance of the shipped world; re-ship the '
           'continuous episode forms (runtime evaluators change: sin-only kicks + '
           'compensated tone).' if go else
           'NO-GO — continuity costs too much accuracy; document the −800 step as a '
           'pre-record model boundary instead.')
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Impulse-consistent joint-fit variant: sin-only kicks '
                                  '(displacement-continuous) + switch-on-compensated drive '
                                  'tone, excitation epoch scanned −2600..−800. Same closure/'
                                  'caps/scoring as the shipped joint world.'),
                  'T0_lattice_n': RES_N, 'Q': RES_Q, 't2': T2},
        'best': best,
        'continuity_steps_s': {'t1': step_t1, 't2': step_t2},
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

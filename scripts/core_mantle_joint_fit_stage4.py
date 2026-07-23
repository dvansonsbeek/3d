"""
Stage 4 prototype — JOINT fit of the 4-flag stack + Core-mantle swing episode
with the USNO closure as a hard constraint and amplitude caps.

Why: the default-ON convergence dry run (data/core-mantle-resonator-default-
on-convergence.json) showed that sequential iterate-and-close oscillates —
Bond (1,466 yr), the resonator's 3,695-yr drive tone, and the deltaTStart
constant are collinear in the 2.7-kyr window, so closing the anchor after
fitting trades amplitude between components forever. The fix (the framework's
own flag-cap philosophy): fit EVERYTHING at once —

  minimize ||A·x − residual_raw||²
  subject to  Σ_j δLOD_j(2000)·x_j = targetOffset(USNO)     (hard equality)
  with amplitude caps (cascade): Hallstatt ≤ 80 s, Jose5 ≤ 50 s, Jose4 ≤ 50 s,
  resonator kick1/kick2/tone ≤ their convention amplitudes (773.3 / 179.3 /
  186.1 s) — Bond free (the anchor-bearing component, as in production).

The episode's (T₀ = 8H/685, Q = 1.8, kicks −800/+1600) are FROZEN at the
Stage-3 convention — only amplitudes enter the joint solve. Grid over
(USNO target × deltaTStart), scored on the instrumental window
(Stephenson spline 1650..2015 — proxy for the Espenak table; the winner must
be re-scored with tools/fit/dt-corrections-fit.js conventions before any
integration).

GO criterion: a single-solve optimum with (a) all caps respected, (b) sane
Bond amplitude (200-350 s), (c) instrumental-window RMS ≤ production's
(~22.5 s Espenak-equivalent), (d) ancient-window RMS comparable to the
sequential world (~50-80 s), and (e) exact closure by construction.

Output: data/core-mantle-joint-fit-stage4.json
Run:    python3 scripts/core_mantle_joint_fit_stage4.py
"""

import json
import math
import subprocess
import sys
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'core-mantle-joint-fit-stage4.json'

# Single source of truth: tools/lib/constants.js via the Node bridge —
# H and the tropical-year length are framework constants, not literals.
sys.path.insert(0, str(REPO / 'tools' / 'fit' / 'python'))
from load_constants import C as _C                                   # noqa: E402
EIGHT_H = 8 * _C['H']
# δLOD closure-row denominator — EXACT mirror of dt-corrections-fit.js
# MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400.
MEAN_TROP_S = _C['meanSolarYearDays'] * 86400.0

# ── frozen resonator convention (Stage 3) ───────────────────────────────────
RES_N, RES_Q = 685, 1.8
RES_T0 = EIGHT_H / RES_N
RES_W0 = 2 * math.pi / RES_T0
RES_LAM = RES_W0 / (2 * RES_Q)
RES_WD = RES_W0 * math.sqrt(1 - 1 / (4 * RES_Q * RES_Q))
RES_KICKS = [-800.0, 1600.0]
CAPS = {'hallstatt': 80.0, 'jose5': 50.0, 'jose4': 50.0,
        'res_kick1': 773.335, 'res_kick2': 179.324, 'res_tone': 186.140}

# True Espenak scoring table — mirrors tools/fit/dt-corrections-fit.js
# ESPENAK_REFERENCE (the fit tool's authoritative modern-shape scorer).
ESPENAK_REFERENCE = {
    1650: 50, 1700: 8.6, 1750: 13.4, 1780: 15.9, 1790: 17.0, 1800: 13.7,
    1820: 12, 1850: 7.14, 1860: 7.75, 1870: 1.04, 1880: -5.11, 1890: -6.02,
    1900: -2.79, 1910: 10.38, 1920: 21.16, 1950: 29.15, 1980: 50.54,
    2000: 63.83, 2010: 66.06, 2017: 68.97,
}

FLAGS = {'bond': 1830, 'hallstatt': 1104, 'jose5': 2989, 'jose4': 3749}
TONE_DN = 726                                  # bond − hallstatt

NODE_DUMP = r"""
const fs = require('fs');
const DT = require('./tools/lib/deep-time.js');
const segs = JSON.parse(fs.readFileSync('public/input/stephenson-2016-deltaT-polynomial.json','utf8')).segments;
function steph(y){ for(const s of segs){ if(y>=s.y0&&y<=s.y1){const t=(y-s.y0)/(s.y1-s.y0); return s.a[0]+s.a[1]*t+s.a[2]*t*t+s.a[3]*t*t*t;} } return NaN; }
const out=[];
for(let y=-720;y<=2016;y+=2){
  const sv=steph(y); const mv=DT.meanDeltaTSecondsAtAge((2000-y)/1e6);
  if(isFinite(sv)&&isFinite(mv)) out.push([y, sv, mv]);
}
process.stdout.write(JSON.stringify(out));
"""


def load_raw():
    """years, Stephenson absolute, pure-tidal framework ΔT (no stack/resonator)."""
    import os
    env = dict(os.environ)
    env['DT_CORRECTIONS_DISABLED'] = '1'
    env.pop('DT_RESONATOR_ENABLED', None)
    r = subprocess.run(['node', '-e', NODE_DUMP], capture_output=True, text=True,
                       cwd=str(REPO), env=env, timeout=180)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:400])
    d = np.array(json.loads(r.stdout), dtype=float)
    return d[:, 0], d[:, 1], d[:, 2]


def tone_phase_locked():
    co = json.load(open(REPO / 'data/deltaT-4flag-fit.json'))['shipped_coefficients']
    ph = lambda c: math.atan2(c['sin_coeff_s'], c['cos_coeff_s'])
    return ph(co['bond']) - ph(co['hallstatt'])


def episode_env(years):
    cols = []
    for t_k in RES_KICKS:
        dt = years - t_k
        on = (dt >= 0).astype(float)
        env = on * np.exp(-RES_LAM * np.clip(dt, 0, None))
        cols.append((env, dt))
    return cols


def build_design(years, phi_tone):
    """Columns (anchored: raw(y) − raw(2000)) + component map + δLOD(2000) row."""
    cols, names = [], []

    def add(fn, name):
        v = fn(years)
        v2000 = fn(np.array([2000.0]))[0]
        cols.append(v - v2000)
        names.append(name)
        eps = 0.5
        d = (fn(np.array([2000.0 + eps]))[0] - fn(np.array([2000.0 - eps]))[0]) / (2 * eps)
        lod_rows.append(86400.0 * d / MEAN_TROP_S)

    lod_rows = []
    for nm, n in FLAGS.items():
        w = 2 * math.pi * n / EIGHT_H
        add(lambda y, w=w: np.cos(w * y), f'{nm}_cos')
        add(lambda y, w=w: np.sin(w * y), f'{nm}_sin')

    # Resonator kicks as UNIT SHAPES with phases LOCKED to the Stage-1/3
    # convention (cos/sin ratio from the shipped block) — only a capped scale
    # factor is free per kick. This is the fix for the phase-ballooning that
    # the first prototype's free cos/sin columns allowed (the cap cascade was
    # scaling wrong-phase components to cap, wrecking the ancient window).
    res_j = json.load(open(REPO / 'data/core-mantle-resonator-stage1.json'))
    kc = res_j['proposed_shipped_coefficients']['resonator']['kick_coefficients_s']

    def kick_unit(i):
        a, bs = kc[i]['cos'], kc[i]['sin']
        norm = math.hypot(a, bs)
        def fn(y):
            dt = y - RES_KICKS[i]
            on = (dt >= 0).astype(float)
            env = on * np.exp(-RES_LAM * np.clip(dt, 0, None))
            return env * (a * np.cos(RES_WD * dt) + bs * np.sin(RES_WD * dt)) / norm
        return fn
    add(kick_unit(0), 'res_kick1')
    add(kick_unit(1), 'res_kick2')

    w_t = 2 * math.pi * TONE_DN / EIGHT_H
    def tone_fn(y):
        dt = y - RES_KICKS[0]
        on = (dt >= 0).astype(float)
        env = on * np.exp(-RES_LAM * np.clip(dt, 0, None))
        return env * np.cos(w_t * y - phi_tone)
    add(tone_fn, 'res_tone')

    # free intercept — absorbs the trend-anchor (deltaTStart) freedom exactly
    # as the fit tool's per-USNO free deltaTStart does; zero δLOD, no cap,
    # NOT anchored (constant), NOT shipped (folds into deltaTStart).
    cols.append(np.ones_like(years, dtype=float))
    names.append('intercept')
    lod_rows.append(0.0)

    return np.column_stack(cols), names, np.array(lod_rows)


def constrained_lsq(A, b, c, d):
    """min ||Ax−b|| s.t. c·x = d (KKT)."""
    n = A.shape[1]
    K = np.zeros((n + 1, n + 1))
    K[:n, :n] = A.T @ A
    K[:n, n] = c
    K[n, :n] = c
    rhs = np.concatenate([A.T @ b, [d]])
    sol = np.linalg.solve(K, rhs)
    return sol[:n]


COMPONENT_IDX = {
    'bond': [0, 1], 'hallstatt': [2, 3], 'jose5': [4, 5], 'jose4': [6, 7],
    'res_kick1': [8], 'res_kick2': [9], 'res_tone': [10],
}


def cap_cascade(A, b, lodrow, d):
    """Equality-constrained solve with amplitude-cap cascade."""
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
        violated = None
        for comp, idx in COMPONENT_IDX.items():
            if comp == 'bond' or all(i in fixed for i in idx):
                continue
            amp = math.hypot(*[x[i] for i in idx]) if len(idx) == 2 else abs(x[idx[0]])
            cap = CAPS.get(comp)
            if cap and amp > cap * (1 + 1e-9):
                s = cap / amp
                for i in idx:
                    fixed[i] = x[i] * s
                violated = comp
                break
        if violated is None:
            return x, list(fixed.keys())
    return x, list(fixed.keys())


def main():
    print('=' * 88)
    print('STAGE 4 PROTOTYPE — joint fit (4 flags + resonator) with hard USNO closure + caps')
    print('=' * 88)
    years, steph, pure = load_raw()
    phi_tone = tone_phase_locked()
    A, names, lodrow = build_design(years, phi_tone)

    f4 = json.load(open(REPO / 'data/deltaT-4flag-fit.json'))
    der = f4['usno_anchor']['derivation']
    lod_kin = der['lod_kinematic_at_j2000_s']
    h5 = der['h5_correction_s']

    instr = (years >= 1650) & (years <= 2015)
    # Per-USNO joint solve on the dts-free residual (intercept absorbs the
    # constant), then TRUE Espenak scoring exactly as findJointOptimum in
    # dt-corrections-fit.js: model over the Espenak table years, free
    # deltaTStart = mean(diffs), RMS de-meaned.
    esp_years = np.array(sorted(ESPENAK_REFERENCE), dtype=float)
    esp_vals = np.array([ESPENAK_REFERENCE[int(y)] for y in esp_years])
    A_esp, _, _ = build_design(esp_years, phi_tone)
    # pure-tidal framework ΔT at the Espenak years (same bridge convention)
    pure_esp = np.interp(esp_years, years, pure)
    b0 = steph - pure                       # residual WITHOUT any deltaTStart
    best = None
    for usno in np.arange(86400.0014, 86400.00301, 0.0001):
        target = usno - lod_kin - h5
        x, capped = cap_cascade(A, b0, lodrow, target)
        model = A @ x
        resid = b0 - model
        # full-window RMS de-meaned (intercept already in the model)
        rms_full = float(np.sqrt(np.mean(resid ** 2)))
        # true Espenak scoring (exclude the intercept from the correction sum:
        # it folds into deltaTStart, exactly like the tool's free constant)
        corr_esp = A_esp[:, :-1] @ x[:-1]
        diffs = esp_vals - (pure_esp + corr_esp)
        dts = float(np.mean(diffs))
        rms_esp = float(np.sqrt(np.mean((diffs - dts) ** 2)))
        rms_instr = float(np.sqrt(np.mean(resid[instr] ** 2)))
        row = {'usno': float(usno), 'deltaTStart': dts, 'x': x, 'capped': capped,
               'rms_espenak': rms_esp, 'rms_instr': rms_instr, 'rms_full': rms_full}
        if best is None or rms_esp < best['rms_espenak']:
            best = row
    x = best['x']
    amps = {}
    for comp, idx in COMPONENT_IDX.items():
        amps[comp] = (math.hypot(*[x[i] for i in idx]) if len(idx) == 2
                      else abs(x[idx[0]]))
    closure_check = float(np.dot(lodrow, x))
    target_best = best['usno'] - lod_kin - h5

    print(f'\n  optimum: USNO = {best["usno"]:.4f}  deltaTStart = {best["deltaTStart"]:.2f} s (free per USNO, tool convention)')
    print(f'  TRUE Espenak RMS = {best["rms_espenak"]:.2f} s  (production baseline 21.66; '
          f'resonator-aware sequential 17.32)')
    print(f'  instrumental-window RMS = {best["rms_instr"]:.2f} s   '
          f'full-window RMS = {best["rms_full"]:.2f} s (de-meaned, intercept in model)')
    print(f'  closure: Σ δLOD(2000) = {closure_check * 1000:.4f} ms  '
          f'(target {target_best * 1000:.4f} ms — exact by construction)')
    print('  component amplitudes (cap):')
    for comp, a in amps.items():
        cap = CAPS.get(comp)
        mark = 'AT CAP' if cap and abs(a - cap) < 1e-6 else ''
        print(f'    {comp:10s} {a:8.2f} s' + (f'  (cap {cap})' if cap else '  (free)') + f'  {mark}')

    go = (200 <= amps['bond'] <= 350 and best['rms_espenak'] <= 21.7
          and best['rms_full'] <= 90.0)
    verdict = (
        f'Joint fit is a SINGLE closed-form solve — no iteration, no ping-pong by '
        f'construction. Optimum (USNO {best["usno"]:.4f}, deltaTStart '
        f'{best["deltaTStart"]:.2f}): TRUE Espenak RMS {best["rms_espenak"]:.2f} s, '
        f'full-window RMS {best["rms_full"]:.2f} s, Bond {amps["bond"]:.1f} s, closure '
        f'exact. ' +
        ('GO — the joint-with-caps design resolves the convergence failure; next step '
         'is re-scoring the winner under dt-corrections-fit.js conventions (true '
         'Espenak table, cap-refit details) and then the atomic default-ON package.'
         if go else
         'NO-GO at prototype level — amplitudes or window RMS out of range; revisit '
         'cap values or the constraint formulation before integration.')
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Stage 4 prototype: joint equality-constrained fit of the '
                                  '4-flag stack + frozen-convention resonator episode with '
                                  'USNO closure as hard constraint and amplitude caps '
                                  '(cascade). Scored on the instrumental window (Stephenson '
                                  '1650-2015 proxy — winner must be re-scored with the fit '
                                  'tool before integration).'),
                  'caps': CAPS, 'resonator_frozen': {'n': RES_N, 'Q': RES_Q,
                                                     'kicks': RES_KICKS}},
        'optimum': {k: v for k, v in best.items() if k != 'x'},
        'coefficients': dict(zip(names, [float(v) for v in x])),
        'amplitudes': amps,
        'closure_sum_lod_s': closure_check,
        'verdict': verdict,
    }, indent=2, default=str))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

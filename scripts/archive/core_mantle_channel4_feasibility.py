"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

Channel-4 feasibility: model the millennial swing "as-if" driven by the
hallstatt×jose4 pair — as a 5th stack cycle vs as a 4th dLOD/dt force.

Route 5C — 5th CYCLE in the "all cycles" stack (constant amplitude, like the
shipped flags): a tone at the difference frequency 8H/2645 = 1,014 yr with
phase LOCKED to the quadratic-mixing prediction (φ_hall − φ_jose4, with the
resonator lag as an alternative). The stack architecture is constant-amplitude
by construction, so the modern-window guard puts a hard CEILING on the
amplitude — the route lives or dies on how much in-window residual an
amplitude-capped, phase-locked tone can absorb.

Route 4F — 4th FORCE (transient resonator channel): the physical composite
    y(t) = ring-down of the eigenmode (T0, Q; the ~3.7-3.9 kyr content)
         + steady response to the hallstatt×jose4 drive (1,014-yr tone,
           phase-locked, amplitude ≤ the same modern-window ceiling)
Decay is intrinsic (transient), so this route can in principle carry the
ancient amplitude AND be quiet today. Feasibility = best guard-PASSING fit.

Guards (H/46 discipline): modern-window mean |δLOD| ≤ 0.2 ms/day (1650-2017),
Espenak shape ≤ 5 s, |δLOD(2000)| ≤ 0.1 ms/day.

Output: data/core-mantle-channel4-feasibility.json
Run:    python3 scripts/core_mantle_channel4_feasibility.py
"""

import json
import math
import subprocess
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'core-mantle-channel4-feasibility.json'
EIGHT_H = 8 * 335317
DELTA_T_START = 65.92372934570098
N_DIFF = 2645                                  # hallstatt - jose4
W_DIFF = 2.0 * math.pi * N_DIFF / EIGHT_H      # 1,014.2 yr

NODE_DUMP = r"""
const fs = require('fs');
const DT = require('./tools/lib/deep-time.js');
const segs = JSON.parse(fs.readFileSync('public/input/stephenson-2016-deltaT-polynomial.json','utf8')).segments;
function steph(y){ for(const s of segs){ if(y>=s.y0&&y<=s.y1){const t=(y-s.y0)/(s.y1-s.y0); return s.a[0]+s.a[1]*t+s.a[2]*t*t+s.a[3]*t*t*t;} } return NaN; }
const out=[];
for(let y=-720;y<=2016;y+=10){
  const sv=steph(y); const mv=DT.meanDeltaTSecondsAtAge((2000-y)/1e6);
  if(isFinite(sv)&&isFinite(mv)) out.push([y, sv-(%DTS%+mv)]);
}
process.stdout.write(JSON.stringify(out));
""".replace('%DTS%', repr(DELTA_T_START))


def load_residual():
    r = subprocess.run(['node', '-e', NODE_DUMP], capture_output=True, text=True,
                       cwd=str(REPO), timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f'node bridge failed: {r.stderr[:400]}')
    d = np.array(json.loads(r.stdout), dtype=float)
    return d[:, 0], d[:, 1] - d[:, 1].mean()


def parent_phases():
    co = json.load(open(REPO / 'data/deltaT-4flag-fit.json'))['shipped_coefficients']
    ph = {}
    for nm in ('hallstatt', 'jose4'):
        c = co[nm]
        ph[nm] = math.atan2(c['sin_coeff_s'], c['cos_coeff_s'])
    return ph['hallstatt'] - ph['jose4']       # predicted difference-tone phase


def guards(years, model):
    ym = np.arange(1650, 2018, 5.0)
    mi = np.interp(ym, years, model)
    dlod = np.gradient(mi, ym) / 365.2422 * 1000.0
    dlod_mod = float(np.mean(np.abs(dlod)))
    dlod_2000 = float(abs(dlod[np.argmin(abs(ym - 2000))]))
    A = np.column_stack([np.ones_like(ym), ym])
    bl, *_ = np.linalg.lstsq(A, mi, rcond=None)
    shape = float(np.sqrt(np.mean((mi - A @ bl) ** 2)))
    return {'modern_dlod_ms_day': dlod_mod, 'espenak_shape_s': shape,
            'dlod_at_2000_ms_day': dlod_2000,
            'pass': bool(dlod_mod <= 0.2 and shape <= 5.0 and dlod_2000 <= 0.1)}


def main():
    print('=' * 88)
    print('CHANNEL-4 FEASIBILITY — hallstatt×jose4-driven swing as 5th cycle vs 4th force')
    print('=' * 88)
    years, resid = load_residual()
    rms0 = float(np.sqrt(np.mean(resid ** 2)))
    phi_pred = parent_phases()
    print(f'  target residual RMS {rms0:.1f} s; predicted 1,014-yr phase '
          f'(φ_hall − φ_jose4) = {math.degrees(phi_pred):+.1f}°')

    results = {}

    # ── Route 5C: amplitude-capped, phase-locked constant tone ──────────
    # modern-window ceiling: tone amp A gives mean |δLOD| = A·ω·(2/π)/365.2422·1000
    ceiling = 0.2 / (W_DIFF * (2 / math.pi) / 365.2422 * 1000.0)
    tone_locked = np.cos(W_DIFF * years - phi_pred)
    a_free = float(np.dot(tone_locked, resid) / np.dot(tone_locked, tone_locked))
    a_used = float(np.clip(a_free, -ceiling, ceiling))
    m5 = a_used * tone_locked
    rms5 = float(np.sqrt(np.mean((resid - m5) ** 2)))
    g5 = guards(years, m5)
    results['route_5C_stack_cycle'] = {
        'amp_ceiling_s': ceiling, 'amp_free_would_be_s': a_free, 'amp_used_s': a_used,
        'rms_s': rms5, 'delta_rms_s': rms0 - rms5, 'guards': g5}
    print(f'\n── Route 5C (5th cycle, constant amplitude, phase-locked) ──')
    print(f'  modern-window amplitude CEILING at 1,014 yr: {ceiling:.1f} s '
          f'(free fit wants {a_free:+.1f} s)')
    print(f'  capped tone: RMS {rms5:.1f} s (Δ = {rms0 - rms5:.1f} s from {rms0:.1f}) — '
          f'guards {"PASS" if g5["pass"] else "FAIL"}')

    # ── Route 4F: guard-constrained transient resonator variants ────────
    t_ref = -720.0

    def scan_4f(build_model, label):
        best = None
        for T0 in np.arange(2400, 6001, 100):
            for Q in np.arange(0.55, 8.01, 0.25):
                w0 = 2.0 * math.pi / T0
                lam = w0 / (2.0 * Q)
                disc = 1.0 - 1.0 / (4.0 * Q * Q)
                if disc <= 0:
                    continue
                wd = w0 * math.sqrt(disc)
                env = np.exp(-lam * (years - t_ref))
                out = build_model(env, wd)
                if out is None:
                    continue
                model, extra = out
                rms = float(np.sqrt(np.mean((resid - model) ** 2)))
                g = guards(years, model)
                if g['pass'] and (best is None or rms < best['rms_s']):
                    best = {'rms_s': rms, 'T0_yr': float(T0), 'Q': float(Q),
                            'decay_time_yr': float(Q * T0 / math.pi),
                            'guards': g, **extra}
        return best

    # 4F-a: ring-down + PERSISTENT drive tone, tone capped at HALF the budget
    half_cap = ceiling * 0.5
    def build_a(env, wd):
        X = np.column_stack([env * np.cos(wd * years), env * np.sin(wd * years),
                             tone_locked])
        b, *_ = np.linalg.lstsq(X, resid, rcond=None)
        c = float(np.clip(b[2], -half_cap, half_cap))
        r2 = resid - c * tone_locked
        b2, *_ = np.linalg.lstsq(X[:, :2], r2, rcond=None)
        model = X[:, :2] @ b2 + c * tone_locked
        return model, {'ringdown_amp_at_start_s': float(math.hypot(b2[0], b2[1])),
                       'drive_tone_amp_s': c, 'variant': 'persistent-tone(half-cap)'}
    best_a = scan_4f(build_a, '4F-a')

    # 4F-b: fully decaying composite — env × [eigenmode cos/sin + LOCKED drive tone]
    # (episodic coupling: the drive response lives and dies with the episode)
    def build_b(env, wd):
        X = np.column_stack([env * np.cos(wd * years), env * np.sin(wd * years),
                             env * np.cos(W_DIFF * years - phi_pred)])
        b, *_ = np.linalg.lstsq(X, resid, rcond=None)
        model = X @ b
        return model, {'ringdown_amp_at_start_s': float(math.hypot(b[0], b[1])),
                       'drive_tone_amp_at_start_s': float(b[2]),
                       'variant': 'fully-decaying(episodic coupling)'}
    best_b4 = scan_4f(build_b, '4F-b')

    results['route_4F_a_persistent_tone'] = best_a
    results['route_4F_b_fully_decaying'] = best_b4
    for label, best in [('4F-a (ring-down + persistent half-cap tone)', best_a),
                        ('4F-b (fully decaying composite, episodic coupling)', best_b4)]:
        print(f'\n── Route {label} ──')
        if best:
            print(f'  best guard-passing: RMS {best["rms_s"]:.1f} s at '
                  f'T₀ = {best["T0_yr"]:.0f} yr, Q = {best["Q"]:.2f} '
                  f'(decay ~{best["decay_time_yr"]:.0f} yr)')
            print(f'  guards: modern {best["guards"]["modern_dlod_ms_day"]:.3f} ms/day, '
                  f'shape {best["guards"]["espenak_shape_s"]:.2f} s, '
                  f'δLOD(2000) {best["guards"]["dlod_at_2000_ms_day"]:.3f} — ALL PASS')
        else:
            print('  NO guard-passing configuration found')
    best = best_b4 if (best_b4 and (not best_a or best_b4['rms_s'] <= best_a['rms_s'])) \
        else best_a

    print(f'\n  benchmarks: raw {rms0:.1f} | unconstrained ring-down 52.7 | '
          f'two-tone (guard-failing) 38.3 | Gaussian transient 181.7 s')

    # ── Verdict ─────────────────────────────────────────────────────────
    r4 = best['rms_s'] if best else None
    verdict = (
        f'Route 5C is architecturally dead: the modern window caps a constant 1,014-yr '
        f'tone at {ceiling:.0f} s (free fit wants {a_free:.0f} s), absorbing only '
        f'{rms0 - rms5:.0f} s of RMS — a 5th stack cycle cannot carry the swing. '
        + (f'Route 4F is FEASIBLE: a guard-passing transient resonator '
           f'(T₀ = {best["T0_yr"]:.0f} yr, Q = {best["Q"]:.2f}) + capped drive reaches '
           f'RMS {r4:.0f} s (vs 52.7 unconstrained, 269 raw) while staying quiet in the '
           f'modern window and at J2000. The 4th-force architecture (transient, decaying) '
           f'is the only viable implementation — as physics predicted. Shipping would '
           f'require: an envelope/ring-down formalism in the runtime (new architecture), '
           f'an agreed excitation epoch, and the anchor-closure design. Driving '
           f'attribution to hallstatt×jose4 remains marginal (n = 2) — hold as-if status.'
           if best else
           'Route 4F also fails: no guard-passing transient exists — the swing cannot '
           'currently be modeled under the framework guards at all.')
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Feasibility of modeling the millennial swing as a '
                                  'hallstatt×jose4-driven component: route 5C (5th '
                                  'constant-amplitude stack cycle, phase-locked, '
                                  'modern-window amplitude ceiling) vs route 4F (4th '
                                  'force: guard-constrained transient resonator + capped '
                                  'drive tone).'),
                  'n_diff': N_DIFF, 'period_yr': EIGHT_H / N_DIFF,
                  'predicted_phase_deg': math.degrees(phi_pred),
                  'residual_rms_s': rms0},
        'results': results,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

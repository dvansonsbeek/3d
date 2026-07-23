"""
Stage 1 of the Core-mantle swing (Resonator driver) integration: formalize the
shippable EPISODE component, refit with a free excitation epoch, design the
anchor closure, and emit a proposed shipped-coefficient block.

Component definition (the "episode" — the new functional class the runtime
would gain in Stage 2):

    for y <  t_exc:  swing(y) = 0                     (deep-time safe: exactly
                                                       zero before excitation)
    for y >= t_exc:  swing(y) = env(y) * [ a·cos(w_d·(y−t_exc))
                                         + b·sin(w_d·(y−t_exc))
                                         + Σ_k c_k·cos(w_k·y − φ_k) ]
    env(y) = exp(−λ·(y−t_exc)),  λ = ω₀/(2Q),  w_d = ω₀·sqrt(1 − 1/(4Q²))

  - (a, b): the eigenmode ringing (T₀, Q — the axiMC-range resonator).
  - c_k: drive-tone responses at the DIFFERENCE TONES of the active stack
    flags, with phases LOCKED to the quadratic-mixing prediction φ_i − φ_j.
    The tone list is DERIVED AT FIT TIME from whatever flags are enabled
    (Δn arithmetic) — the design is generic over 3-, 4-, or 5-cycle stacks;
    adding/removing a flag regenerates the tone menu with no structural
    change (per design requirement: future 5th cycle must be able to join
    the interaction, or a 3-cycle reduction must still work).

Shipping conventions (mirroring the 4-flag stack):
  - correction(y) = swing(y) − swing(2000)  ("raw_at_j2000" subtraction), so
    the ΔT correction vanishes at J2000; before t_exc this leaves a small
    documented constant −swing(2000).
  - implied δLOD(y) = d(swing)/dy · (1/365.2422), reported at 2000 for the
    USNO anchor-closure sum (must be included in the pre-adjust sum exactly
    as the flags are).

Fit: target = production ΔT residual after the shipped stack (node bridge).
Scan t_exc × T₀ × Q; linear solve (a, b, c_k). Variants (parsimony ladder):
  V1  eigenmode only
  V2  eigenmode + strongest single locked drive tone
  V3  eigenmode + ALL locked difference tones (amps free, envelope-shared)
Guards: modern-window mean |δLOD| ≤ 0.2 ms/day, Espenak shape ≤ 5 s,
|δLOD(2000)| ≤ 0.1 ms/day, exact zero before t_exc, decayed by deep future.
Selection (physical-consistency rule, user-confirmed): among guard-passing
PINNED-T₀ variants take minimum RMS — the shipped eigenperiod must be the
physically determined one (resonator fits + axiMC), not a free shape
parameter. Free-T₀ variants are retained as statistical references only.
Confirmed choice: V5 (two-kick pinned + top tone) on the LATTICE grid —
T₀ = 8H/685 = 3,916.1 yr, Q = 1.80, excitation −800, termination
counter-kick +1600 (the push-pull the excitation inversion recovered
independently). Kick-epoch note: the excitation epoch moved −1300 → −800
between the coarse and lattice grids (t_exc/T₀ ridge degeneracy) — Stage 3
stability check must pin it.

Output: data/core-mantle-resonator-stage1.json  (includes the proposed
        shipped block under 'proposed_shipped_coefficients.resonator')
Run:    python3 scripts/core_mantle_resonator_stage1.py
"""

import json
import math
import subprocess
from itertools import combinations
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'core-mantle-resonator-stage1.json'
EIGHT_H = 8 * 335317
# deltaTStart from the single source of truth (updated by dt-corrections-fit
# --write joint-optimum sweep) — required for the coupled default-ON refit
# loop, where deltaTStart moves with the resonator-aware closure.
DELTA_T_START = json.load(open(REPO / 'public/input/astro-reference.json'))['earthOrbital']['deltaTStart']

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


def load_flags():
    """Active stack flags — generic: works for any number of shipped cycles."""
    co = json.load(open(REPO / 'data/deltaT-4flag-fit.json'))['shipped_coefficients']
    flags = {}
    for nm, c in co.items():
        if not isinstance(c, dict) or 'lattice_n' not in c:
            continue
        if nm == 'h253':                      # diagnostic entry, never a driver
            continue
        flags[nm] = {'n': c['lattice_n'],
                     'A': math.hypot(c['cos_coeff_s'], c['sin_coeff_s']),
                     'phi': math.atan2(c['sin_coeff_s'], c['cos_coeff_s'])}
    return flags


def difference_tones(flags):
    """Δn arithmetic over the ACTIVE flag set — the future-proof tone menu."""
    tones = []
    for a, b in combinations(sorted(flags, key=lambda k: -flags[k]['n']), 2):
        fa, fb = flags[a], flags[b]
        hi, lo = (fa, fb) if fa['n'] > fb['n'] else (fb, fa)
        hi_nm, lo_nm = (a, b) if fa['n'] > fb['n'] else (b, a)
        dn = hi['n'] - lo['n']
        tones.append({'pair': f'{hi_nm}-{lo_nm}', 'dn': dn,
                      'period_yr': EIGHT_H / dn,
                      'w': 2.0 * math.pi * dn / EIGHT_H,
                      'phi_locked': hi['phi'] - lo['phi'],
                      'forcing_s2': hi['A'] * lo['A'] / 2.0})
    return sorted(tones, key=lambda t: -t['forcing_s2'])


def episode_columns(years, kick_epochs, T0, Q, drive_tones):
    """Columns for a 1- or 2-kick episode: per kick env_k*cos/sin(wd*(y-t_k));
    drive tones share the FIRST kick's envelope (the driving-response phase of
    the episode)."""
    w0 = 2.0 * math.pi / T0
    lam = w0 / (2.0 * Q)
    disc = 1.0 - 1.0 / (4.0 * Q * Q)
    if disc <= 0:
        return None
    wd = w0 * math.sqrt(disc)
    cols = []
    env1 = None
    for t_k in kick_epochs:
        dt = years - t_k
        on = (dt >= 0).astype(float)
        env = on * np.exp(-lam * np.clip(dt, 0, None))
        if env1 is None:
            env1 = env
        cols.append(env * np.cos(wd * dt))
        cols.append(env * np.sin(wd * dt))
    for t in drive_tones:
        cols.append(env1 * np.cos(t['w'] * years - t['phi_locked']))
    return np.column_stack(cols), env1


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


def eval_at(years_pt, kick_epochs, T0, Q, coefs, drive_tones):
    """Scalar episode evaluation for 1- or 2-kick form (closure/deep-time)."""
    w0 = 2.0 * math.pi / T0
    lam = w0 / (2.0 * Q)
    wd = w0 * math.sqrt(1.0 - 1.0 / (4.0 * Q * Q))
    nk = len(kick_epochs)
    out = []
    for y in np.atleast_1d(years_pt):
        v = 0.0
        for i, t_k in enumerate(kick_epochs):
            if y < t_k:
                continue
            dt = y - t_k
            e = math.exp(-lam * dt)
            v += e * (coefs[2 * i] * math.cos(wd * dt)
                      + coefs[2 * i + 1] * math.sin(wd * dt))
        if y >= kick_epochs[0]:
            e1 = math.exp(-lam * (y - kick_epochs[0]))
            for k, t in enumerate(drive_tones):
                v += e1 * coefs[2 * nk + k] * math.cos(t['w'] * y - t['phi_locked'])
        out.append(v)
    return np.array(out)


def main():
    print('=' * 88)
    print('STAGE 1 — Core-mantle swing (Resonator driver): episode formalization + refit')
    print('=' * 88)
    years, resid = load_residual()
    rms0 = float(np.sqrt(np.mean(resid ** 2)))
    flags = load_flags()
    tones = difference_tones(flags)
    print(f'  active flags ({len(flags)}): {list(flags)} → {len(tones)} difference tones '
          f'(generic Δn derivation; a 5th/3rd-cycle stack regenerates this menu)')
    print(f'  target residual RMS {rms0:.1f} s')

    # each variant: (drive tones, T0 grid). The *_pinnedT0 variants constrain the
    # eigenperiod to the physically determined range (3.8-4.0 kyr: resonator fits
    # + axiMC theory + CFF spectrum) so the shipped constant stays a physical
    # quantity rather than a free shape parameter.
    T0_FREE = np.arange(2400, 6001, 100.0)
    # Pinned grid is LATTICE-VALUED (user decision 2026-07-23): T0 = 8H/n for
    # integer n spanning the physically determined range 3.8-4.0 kyr
    # (n = 671..705). Rationale: the shipped resonator is the combined effect
    # of the lattice cycles — under H(t) evolution the episode must scale WITH
    # its drivers or the component dephases from the stack. (Physical caveat,
    # recorded once: the bare axiMC eigenmode is core-material physics; the
    # lattice label is the framework's clock-coherence convention for the
    # SHIPPED component, numerically ~1e-6 over the episode's life.)
    T0_PHYS = np.array([EIGHT_H / n for n in range(671, 706)])
    T2_GRID = np.arange(400, 1601, 100.0)      # counter-kick epoch (termination)
    variants = {
        'V1_eigen_only': ([], T0_FREE, 1),
        'V2_eigen_plus_top_tone': (tones[:1], T0_FREE, 1),
        'V3_eigen_plus_all_tones': (tones, T0_FREE, 1),
        'V2p_pinnedT0': (tones[:1], T0_PHYS, 1),
        'V3p_pinnedT0': (tones, T0_PHYS, 1),
        'V4_twokick_pinnedT0': ([], T0_PHYS, 2),
        'V5_twokick_tone_pinnedT0': (tones[:1], T0_PHYS, 2),
    }
    # physicality constraints (reject degenerate cancellation solutions):
    #   - |swing| never exceeds MAX_AMP_S anywhere in the episode (residual max ~500 s)
    #   - cancellation factor Σ|term peaks| / max|model| ≤ MAX_CANCEL
    MAX_AMP_S, MAX_CANCEL = 1000.0, 3.0
    # guard-aware solve: augment the lstsq with rows penalizing the model's
    # δLOD over the modern window (1650-2016), so the optimizer can find
    # guard-feasible solutions (e.g. near-exact tail cancellation after a
    # counter-kick) that pure in-window RMS minimization never visits.
    ym_pen = np.arange(1650.0, 2017.0, 10.0)
    W_PEN = 400.0            # s of residual-cost per (ms/day) of modern δLOD
    results = {}
    for vname, (vtones, t0_grid, n_kicks) in variants.items():
        best = None
        for t_exc in np.arange(-2500, -699, 100.0):
            ext_years = np.arange(t_exc, 2017.0, 10.0)
            t2_options = T2_GRID if n_kicks == 2 else [None]
            for t2 in t2_options:
                kicks = [float(t_exc)] if t2 is None else [float(t_exc), float(t2)]
                for T0 in t0_grid:
                    for Q in np.arange(0.55, 8.01, 0.25):
                        out = episode_columns(years, kicks, T0, Q, vtones)
                        if out is None:
                            continue
                        X, _ = out
                        Xp1, _ = episode_columns(ym_pen + 1.0, kicks, T0, Q, vtones)
                        Xm1, _ = episode_columns(ym_pen - 1.0, kicks, T0, Q, vtones)
                        dX = (Xp1 - Xm1) / 2.0 / 365.2422 * 1000.0   # ms/day per coef
                        A_aug = np.vstack([X, W_PEN * dX])
                        y_aug = np.concatenate([resid, np.zeros(len(ym_pen))])
                        b, *_ = np.linalg.lstsq(A_aug, y_aug, rcond=None)
                        model = X @ b
                        rms = float(np.sqrt(np.mean((resid - model) ** 2)))
                        if best is not None and rms >= best['rms_s']:
                            continue
                        g = guards(years, model)
                        if not g['pass']:
                            continue
                        X_ext, _ = episode_columns(ext_years, kicks, T0, Q, vtones)
                        model_ext = X_ext @ b
                        peak = float(np.max(np.abs(model_ext)))
                        term_peaks = float(sum(abs(b[i]) * np.max(np.abs(X_ext[:, i]))
                                               for i in range(len(b))))
                        if peak > MAX_AMP_S or term_peaks > MAX_CANCEL * max(peak, 1e-9):
                            continue
                        best = {'rms_s': rms, 'kicks': kicks, 't_exc': kicks[0],
                                'T0_yr': float(T0), 'Q': float(Q),
                                'coefs': [float(x) for x in b], 'guards': g,
                                'peak_amp_s': peak,
                                'cancellation_factor': term_peaks / max(peak, 1e-9)}
        results[vname] = best
        if best:
            kk = '/'.join(f'{k:+.0f}' for k in best['kicks'])
            print(f'  {vname:26s} RMS {best["rms_s"]:6.1f} s  kicks {kk:>13s}  '
                  f'T₀ {best["T0_yr"]:.0f}  Q {best["Q"]:.2f}  '
                  f'[modern {best["guards"]["modern_dlod_ms_day"]:.3f}, '
                  f'δLOD(2000) {best["guards"]["dlod_at_2000_ms_day"]:.3f}]')
        else:
            print(f'  {vname:26s} no guard-passing configuration')

    # selection: PHYSICAL-CONSISTENCY RULE — pinned-T₀ guard-passers first
    passing = {k: v for k, v in results.items() if v}
    pinned_order = ['V5_twokick_tone_pinnedT0', 'V4_twokick_pinnedT0',
                    'V2p_pinnedT0', 'V3p_pinnedT0']
    pinned_pass = [k for k in pinned_order if k in passing]
    if pinned_pass:
        chosen_name = min(pinned_pass, key=lambda k: passing[k]['rms_s'])
        rule = 'physical-consistency (pinned-T₀, min RMS)'
    else:
        best_rms = min(v['rms_s'] for v in passing.values())
        order = ['V1_eigen_only', 'V2_eigen_plus_top_tone', 'V3_eigen_plus_all_tones']
        chosen_name = next(k for k in order if k in passing
                           and passing[k]['rms_s'] <= best_rms * 1.05)
        rule = 'fallback parsimony (no pinned variant passed)'
    chosen = passing[chosen_name]
    ctones = variants[chosen_name][0]
    print(f'\n  SELECTED: {chosen_name}  [{rule}]')

    # ── closure + deep-time checks + shipped block, per variant ─────────
    def shipped_block(vres, vtones, status_note):
        kicks, T0, Q = vres['kicks'], vres['T0_yr'], vres['Q']
        coefs = vres['coefs']
        nk = len(kicks)
        raw_2000 = float(eval_at(2000.0, kicks, T0, Q, coefs, vtones)[0])
        eps = 1.0
        dlod_2000_s = float((eval_at(2000.0 + eps, kicks, T0, Q, coefs, vtones)[0]
                             - eval_at(2000.0 - eps, kicks, T0, Q, coefs, vtones)[0])
                            / (2 * eps) / 365.2422)
        deep = {str(int(y)): float(eval_at(y, kicks, T0, Q, coefs, vtones)[0])
                for y in (-100000, -5000, kicks[0] - 1, 900, 2000, 5000, 100000)}
        return {
            'display_name': 'Core-mantle swing',
            'driver': 'Resonator',
            'functional_class': (f'episode ({nk}-kick windowed damped oscillation — '
                                 'zero before first kick)'),
            'kick_epochs_year': kicks,
            'kick_coefficients_s': [{'cos': coefs[2 * i], 'sin': coefs[2 * i + 1]}
                                    for i in range(nk)],
            'T0_lattice_n': (int(round(EIGHT_H / T0))
                             if abs(EIGHT_H / T0 - round(EIGHT_H / T0)) < 1e-6 else None),
            'T0_yr': T0, 'Q': Q,
            'drive_tones': [
                {'pair': t['pair'], 'dn': t['dn'], 'period_yr': t['period_yr'],
                 'phi_locked_rad': t['phi_locked'], 'amp_s': coefs[2 * nk + k],
                 'phase_convention': 'cos(2π·dn/8H·y − φ_locked), kick-1-envelope-shared'}
                for k, t in enumerate(vtones)],
            'rms_s': vres['rms_s'],
            'raw_at_j2000_s': raw_2000,
            'lod_raw_at_j2000_s_per_day': dlod_2000_s,
            'deep_time_checks_s': deep,
            'regeneration_rule': ('drive-tone menu = Δn difference tones of the ACTIVE '
                                  'flag set (any count); refit this script after any '
                                  'stack change (3rd/5th cycle)'),
            'status': status_note,
        }, deep

    shipped, deep_checks = shipped_block(
        chosen, ctones,
        'STAGE 1 SELECTED (user-confirmed V5, physical-consistency rule) — episode = '
        'excitation + termination counter-kick of the physical eigenmode. Caveats: '
        'counter-kick epoch at scan-grid edge (+1600); RMS slightly below the ~70-s '
        'structure floor; kick-epoch stability across refits to be verified in Stage 3. '
        'Not integrated yet; default-off toggle planned')
    shipped_cons, _ = shipped_block(
        passing['V3_eigen_plus_all_tones'], variants['V3_eigen_plus_all_tones'][0],
        'FREE-T₀ STATISTICAL REFERENCE ONLY (not for shipping): best unpinned fit; '
        'T₀ is a shape parameter here, not the physical eigenperiod'
    ) if 'V3_eigen_plus_all_tones' in passing else (None, None)

    print(f'\n── Anchor closure & deep-time safety (selected: {chosen_name}) ──')
    print(f'  swing(2000) = {shipped["raw_at_j2000_s"]:+.2f} s → raw_at_j2000 subtraction '
          f'(correction ≡ 0 at J2000; constant documented before t_exc)')
    print(f'  implied δLOD(2000) = {shipped["lod_raw_at_j2000_s_per_day"] * 1000:+.4f} ms/day '
          f'→ joins USNO pre-adjust closure sum (h253-style)')
    print(f'  deep-time: swing(first-kick−1) = '
          f'{deep_checks[str(int(chosen["kicks"][0] - 1))]:.3f} (exact 0), '
          f'swing(+5000) = {deep_checks["5000"]:+.3f} s, '
          f'swing(±100 kyr) = {deep_checks["-100000"]:.3f}/{deep_checks["100000"]:.3f}')
    if shipped_cons:
        print(f'\n── Free-T₀ statistical reference (not for shipping): '
              f'T₀ {shipped_cons["T0_yr"]:.0f}, Q {shipped_cons["Q"]:.2f}, '
              f'kicks {shipped_cons["kick_epochs_year"]}, '
              f'RMS {shipped_cons["rms_s"]:.1f} s ──')

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Stage 1 of the Core-mantle swing (Resonator driver) '
                                  'integration: episode-form component fitted to the '
                                  'post-stack residual with free excitation epoch; '
                                  'variant ladder V1/V2/V3; guard results; anchor-closure '
                                  'values; proposed shipped-coefficient block. Design is '
                                  'generic over the active flag set (3/4/5 cycles).'),
                  'residual_rms_s': rms0,
                  'tone_menu': [{k: t[k] for k in ('pair', 'dn', 'period_yr', 'forcing_s2')}
                                for t in tones]},
        'variants': results,
        'selected_variant': chosen_name,
        'deep_time_checks': deep_checks,
        'proposed_shipped_coefficients': {
            'resonator': shipped,
            'resonator_free_reference': shipped_cons,
        },
    }, indent=2))
    print(f'\nWrote {OUT_PATH}')


if __name__ == '__main__':
    main()

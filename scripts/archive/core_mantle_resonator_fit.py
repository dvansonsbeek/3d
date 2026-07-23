"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

Core-mantle formula candidates: rectifier and driven-damped-resonator fits of
the millennial rotation swing.

Physical model chain (docs 104 §6): the shipped 4-flag stack F(t) forces the
core; the coupling is quadratic (low-pass rectification — difference tones
present at ~400 s, sum tones absent at the noise floor); the core's response
is shaped by a damped eigenmode (axisymmetric Magneto-Coriolis family:
Dumberry, Gerick & Gillet 2025, GJI 240:2076 — gravest period ~3,000 yr,
Q ~ 1-10). Candidate formulas, in increasing physical content:

  B0  RECTIFIER:            y = k · LP_tau[ F(t)^2 ]          (k, tau)
  A1  RECTIFIER->RESONATOR: y = k · H_(T0,Q)[ F(t)^2 ]        (k, T0, Q)
      steady state; H = second-order transfer function, DC gain 1
  A2  FREE RING-DOWN:       y = e^(-omega0 t / 2Q) (a cos + b sin)  (T0, Q, a, b)
      transient of the same oscillator, no steady drive — the only variant
      that can decay toward the present

Fit target: production ΔT residual after the shipped stack (node bridge),
−720..2016, 10-yr grid. Guards (H/46 discipline): modern-window mean |δLOD|
≤ 0.2 ms/day (1650-2017), Espenak shape cost ≤ 5 s, |δLOD(2000)| ≤ 0.1 ms/day
(J2000 anchor safety). External validation: does the best-fit (T0, Q) land in
the published axiMC range (T0 ~ 1,000-5,000 yr, Q 1-10) without being told to?

Zero-parameter structure check: the rectifier fixes the difference tones'
RELATIVE amplitudes (A_i A_j / 2): bond·hall : hall·jose4 = 5.97 : 1 — the
free two-tone fit of the swing found 395 : 77 = 5.13 : 1.

Output: data/core-mantle-resonator-fit.json
Run:    python3 scripts/core_mantle_resonator_fit.py
"""

import json
import math
import subprocess
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'core-mantle-resonator-fit.json'
EIGHT_H = 8 * 335317
DELTA_T_START = 65.92372934570098

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


def stack_components():
    """Shipped flags as (amplitude, omega, phase) with tone = A cos(omega*t - phi)."""
    co = json.load(open(REPO / 'data/deltaT-4flag-fit.json'))['shipped_coefficients']
    comps = []
    for name in ('bond', 'hallstatt', 'jose5', 'jose4'):
        c = co[name]
        A = math.hypot(c['cos_coeff_s'], c['sin_coeff_s'])
        phi = math.atan2(c['sin_coeff_s'], c['cos_coeff_s'])
        omega = 2.0 * math.pi * c['lattice_n'] / EIGHT_H
        comps.append((name, A, omega, phi))
    return comps


def f_squared_tones(comps):
    """All product tones of F^2: list of (A, omega, phi) with tone = A cos(omega t - phi).
    DC terms dropped (mean-removed target)."""
    tones = []
    n = len(comps)
    for i in range(n):
        _, Ai, wi, pi_ = comps[i]
        for j in range(i, n):
            _, Aj, wj, pj = comps[j]
            amp = Ai * Aj * (0.5 if i != j else 0.5)
            if i == j:
                tones.append((Ai * Ai / 2.0, 2 * wi, 2 * pi_))       # double-freq
            else:
                tones.append((amp, abs(wi - wj), pi_ - pj if wi > wj else pj - pi_))
                tones.append((amp, wi + wj, pi_ + pj))
    return tones


def h_gain(omega, T0, Q):
    """Second-order transfer function, DC gain 1: H = w0^2 / (w0^2 - w^2 + i w w0 / Q)."""
    w0 = 2.0 * math.pi / T0
    return (w0 * w0) / complex(w0 * w0 - omega * omega, omega * w0 / Q)


def model_from_tones(years, tones, gain=None):
    y = np.zeros_like(years)
    for A, w, ph in tones:
        if gain is not None:
            H = gain(w)
            y += A * abs(H) * np.cos(w * years - ph + np.angle(H))
        else:
            y += A * np.cos(w * years - ph)
    return y


def guards(years, model, label=''):
    """Modern-window and anchor guards on a ΔT-space model curve."""
    ym = np.arange(1650, 2018, 5.0)
    mi = np.interp(ym, years, model)
    ddt = np.gradient(mi, ym)
    dlod = ddt / 365.2422 * 1000.0
    dlod_mod = float(np.mean(np.abs(dlod)))
    dlod_2000 = float(abs(dlod[np.argmin(abs(ym - 2000))]))
    A = np.column_stack([np.ones_like(ym), ym])
    bl, *_ = np.linalg.lstsq(A, mi, rcond=None)
    shape = float(np.sqrt(np.mean((mi - A @ bl) ** 2)))
    ok = dlod_mod <= 0.2 and shape <= 5.0 and dlod_2000 <= 0.1
    return {'modern_dlod_ms_day': dlod_mod, 'espenak_shape_s': shape,
            'dlod_at_2000_ms_day': dlod_2000, 'pass': bool(ok)}


def main():
    print('=' * 88)
    print('CORE-MANTLE FORMULA CANDIDATES — rectifier / resonator / ring-down fits of the swing')
    print('=' * 88)
    years, resid = load_residual()
    rms0 = float(np.sqrt(np.mean(resid ** 2)))
    comps = stack_components()
    tones = f_squared_tones(comps)
    print(f'  target: post-stack residual, n={len(years)}, RMS = {rms0:.1f} s')
    print(f'  forcing: shipped stack, {len(tones)} product tones from F²')
    r_ratio = (comps[0][1] * comps[1][1]) / (comps[1][1] * comps[3][1])
    print(f'  zero-param amplitude-ratio check: rectifier predicts bond·hall/hall·jose4 = '
          f'{r_ratio:.2f}; free two-tone fit found 395/77 = {395 / 77:.2f}')

    results = {}

    # ── B0: rectifier with one-pole low-pass ────────────────────────────
    best_b = None
    for tau in np.arange(100, 3001, 50):
        def gain(w, tau=tau):
            return 1.0 / complex(1.0, w * tau / (2 * math.pi))
        m = model_from_tones(years, tones, gain)
        m -= m.mean()
        k = float(np.dot(m, resid) / np.dot(m, m))
        rms = float(np.sqrt(np.mean((resid - k * m) ** 2)))
        if best_b is None or rms < best_b[0]:
            best_b = (rms, float(tau), k, k * m)
    rms_b, tau_b, k_b, curve_b = best_b
    g_b = guards(years, curve_b)
    results['B0_rectifier'] = {'rms_s': rms_b, 'tau_yr': tau_b, 'k_per_s': k_b,
                               'guards': g_b}
    print(f'\n── B0 rectifier: RMS {rms_b:.1f} s (from {rms0:.1f}) at τ = {tau_b:.0f} yr — '
          f'guards {"PASS" if g_b["pass"] else "FAIL"} '
          f'(modern {g_b["modern_dlod_ms_day"]:.2f} ms/day, shape {g_b["espenak_shape_s"]:.1f} s)')

    # ── A1: rectifier -> resonator, steady state ────────────────────────
    best_a1 = None
    for T0 in np.arange(1200, 6001, 100):
        for Q in np.arange(0.5, 15.01, 0.25):
            m = model_from_tones(years, tones, lambda w: h_gain(w, T0, Q))
            m -= m.mean()
            denom = float(np.dot(m, m))
            if denom < 1e-12:
                continue
            k = float(np.dot(m, resid) / denom)
            rms = float(np.sqrt(np.mean((resid - k * m) ** 2)))
            if best_a1 is None or rms < best_a1[0]:
                best_a1 = (rms, float(T0), float(Q), k, k * m)
    rms_a1, T0_a1, Q_a1, k_a1, curve_a1 = best_a1
    g_a1 = guards(years, curve_a1)
    in_range_a1 = 1000 <= T0_a1 <= 5000 and 1 <= Q_a1 <= 10
    results['A1_rectifier_resonator'] = {
        'rms_s': rms_a1, 'T0_yr': T0_a1, 'Q': Q_a1, 'k_per_s': k_a1,
        'guards': g_a1, 'aximc_range': bool(in_range_a1)}
    print(f'── A1 rectifier→resonator (steady state): RMS {rms_a1:.1f} s at '
          f'T₀ = {T0_a1:.0f} yr, Q = {Q_a1:.2f} — '
          f'axiMC range (1-5 kyr, Q 1-10): {"YES" if in_range_a1 else "no"}; '
          f'guards {"PASS" if g_a1["pass"] else "FAIL"} '
          f'(modern {g_a1["modern_dlod_ms_day"]:.2f} ms/day, shape {g_a1["espenak_shape_s"]:.1f} s)')

    # ── A2: free ring-down (transient of the same oscillator) ───────────
    best_a2 = None
    t0_ref = -720.0
    for T0 in np.arange(1200, 6001, 100):
        for Q in np.arange(0.5, 15.01, 0.25):
            w0 = 2.0 * math.pi / T0
            lam = w0 / (2.0 * Q)
            disc = 1.0 - 1.0 / (4.0 * Q * Q)
            if disc <= 0:
                continue
            wd = w0 * math.sqrt(disc)
            env = np.exp(-lam * (years - t0_ref))
            X = np.column_stack([env * np.cos(wd * years), env * np.sin(wd * years)])
            b, *_ = np.linalg.lstsq(X, resid, rcond=None)
            pred = X @ b
            rms = float(np.sqrt(np.mean((resid - pred) ** 2)))
            if best_a2 is None or rms < best_a2[0]:
                best_a2 = (rms, float(T0), float(Q), [float(x) for x in b], pred)
    rms_a2, T0_a2, Q_a2, ab_a2, curve_a2 = best_a2
    g_a2 = guards(years, curve_a2)
    in_range_a2 = 1000 <= T0_a2 <= 5000 and 1 <= Q_a2 <= 10
    amp0 = math.hypot(*ab_a2)
    results['A2_ring_down'] = {
        'rms_s': rms_a2, 'T0_yr': T0_a2, 'Q': Q_a2,
        'amplitude_at_minus720_s': amp0 * math.exp(0), 'cos_sin': ab_a2,
        'guards': g_a2, 'aximc_range': bool(in_range_a2)}
    print(f'── A2 free ring-down (transient): RMS {rms_a2:.1f} s at '
          f'T₀ = {T0_a2:.0f} yr, Q = {Q_a2:.2f} — '
          f'axiMC range: {"YES" if in_range_a2 else "no"}; '
          f'guards {"PASS" if g_a2["pass"] else "FAIL"} '
          f'(modern {g_a2["modern_dlod_ms_day"]:.3f} ms/day, shape {g_a2["espenak_shape_s"]:.1f} s, '
          f'δLOD(2000) {g_a2["dlod_at_2000_ms_day"]:.3f})')

    # ── benchmarks ──────────────────────────────────────────────────────
    print(f'\n  benchmarks: raw {rms0:.1f} s | free two-tone (constant amp) 38.3 s '
          f'| Gaussian transient (σ800) 181.7 s')

    passing = [k for k, v in results.items() if v['guards']['pass']]
    verdict = (
        f'Best in-window fits: A1 {rms_a1:.0f} s (T0={T0_a1:.0f}, Q={Q_a1:.1f}), '
        f'A2 {rms_a2:.0f} s (T0={T0_a2:.0f}, Q={Q_a2:.1f}), B0 {rms_b:.0f} s. '
        f'Guard-passing: {passing if passing else "NONE"}. '
        + ('A guard-passing variant with axiMC-range parameters exists — a shippable '
           'three-parameter core-mantle formula is within reach; next step is anchor-closure '
           'integration design.' if passing else
           'No variant passes the modern-window guards — steady-state responses inherit '
           'the constant-amplitude veto, and the ring-down alone cannot both fit the '
           'ancient window and stay quiet today. The formula needs episodic re-excitation '
           '(time-varying forcing efficiency), which is beyond a 3-parameter law. '
           'The swing stays a documented research finding (doc 104 §8).')
    )
    print(f'\n── VERDICT ──\n  {verdict}')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': ('Core-mantle formula candidates fitted to the millennial '
                                  'swing: B0 rectifier (k, tau), A1 rectifier->resonator '
                                  'steady state (k, T0, Q), A2 free ring-down (T0, Q, a, b). '
                                  'Guards: modern-window dLOD <= 0.2 ms/day, Espenak shape '
                                  '<= 5 s, |dLOD(2000)| <= 0.1 ms/day. External validation: '
                                  'axiMC eigenmode range (Dumberry, Gerick & Gillet 2025).'),
                  'residual_rms_s': rms0,
                  'rectifier_amp_ratio_predicted': r_ratio,
                  'two_tone_amp_ratio_observed': 395 / 77},
        'results': results,
        'verdict': verdict,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

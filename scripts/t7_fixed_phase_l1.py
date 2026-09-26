#!/usr/bin/env python3
"""
T7 — the fixed-phase L1 (holisticuniverse plan 06 §4, pre-registered before
this script existed; outcomes written there first).

    python3 scripts/t7_fixed_phase_l1.py            print the verdict
    python3 scripts/t7_fixed_phase_l1.py --write    write data/t7-fixed-phase-l1.json (inputs-stamped)

WHAT L1 IS TODAY: 28 lines on the engine's own frequencies with per-regime
FITTED cos/sin pairs — a free amplitude AND a free phase per line, 56 free
numbers per regime, ridge-shrunk (scripts/milankovitch_climate_formula.py).
The GIA channel α(t) = α₀ − k·[L1 − ⟨L1⟩_τ] inherits those fitted phases.

THE TEST: the 56 numbers replaced by the MODEL'S OWN histories as regressors —
  (a) three families: e(t), ε(t), e·sin ϖ(t) from the banked ±10-Myr engine
      run (data/t7-model-orbital-histories.json — the one-source movement the
      scene renders, built at 1 kyr), one amplitude each + ONE common climate
      lag τ (the forcing at t + τ kyr BP drives the proxy at t): 4 free numbers
  (b) the single classic forcing, the model's own June-solstice insolation at
      65°N (Berger's daily form on the same e, ε, ϖ), one amplitude + one lag:
      2 free numbers
  free   the shipped L1: 28 lines, free cos/sin per line, the fitter's own
         ridge (L1 only — the 405-kyr family is inside L1 since T1; L3 steps
         fall outside every regime window by the fitter's strict rule)
Same LR04 preprocessing (1-kyr grid, linear detrend per window), same regimes.

PRE-REGISTERED OUTCOMES (plan 06 §4 T7):
  (1) in-window, per regime: fixed-phase R² < free R² (a constrained subset; a
      higher value would be a solver defect) AND fixed-phase R² > the 95th
      percentile of the same-size null — phase-randomised surrogates of the
      SAME regressors (same amplitude spectrum, random Fourier phases; the
      same 4 free numbers and the same lag scan). Failing the null = the
      model's phases are wrong over the window → doc 108 §6 first.
  (2) THE DISCRIMINATING PREDICTION — hold-out: fit on one half of the regime
      window, score the other, both orders. Expected: fixed-phase hold-out R²
      ≥ the free fit's hold-out R² in post-MPT AND pre-iNHG.
  (3) every number written by this script; La2004 (data/la2004-earth-51myr-
      back.asc) is a CONFIRMATION column only — the same models on Laskar's
      e, ε, ϖ̄.
  (c) variant, run as a diagnostic regardless of (2): the Imbrie & Imbrie
      (1980) ice-volume response to the model's −Q65N (asymmetric time
      constant), one amplitude + the two response parameters on a small grid.

LR04's age model is orbitally tuned (Lisiecki & Raymo 2005) — every model here
sees the same imprint; the hold-out compares models, not the record.
"""
import json
import platform
import sys
import time
from pathlib import Path

import numpy as np
import scipy

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'tools' / 'fit' / 'python'))
import milankovitch_climate_formula as mcf  # noqa: E402
from artifact_inputs import build_inputs_block  # noqa: E402

HIST_REL = 'data/t7-model-orbital-histories.json'
LA2004_REL = 'data/la2004-earth-51myr-back.asc'
OUT_REL = 'data/t7-fixed-phase-l1.json'
SELF_REL = 'scripts/t7_fixed_phase_l1.py'
INPUT_FILES = [HIST_REL, LA2004_REL, 'data/lr04-stack.txt', 'data/l1-physical-lines.json',
               'scripts/milankovitch_climate_formula.py', 'tools/explore/t7-export-orbital-histories.mjs', SELF_REL]

REGIMES = ['post-mpt', 'inhg-mpt', 'pre-inhg']
LAGS_KYR = np.arange(0.0, 20.01, 0.5)          # the climate lag scan (forcing leads the proxy)
N_NULL = 300
RNG = np.random.default_rng(20260926)
IMBRIE_TM_KYR = [10.0, 17.0, 25.0]
IMBRIE_B = [0.3, 0.6]

# ── the model's own histories (t in kyr BP on the LR04 axis) ────────────────
HIST = json.loads((ROOT / HIST_REL).read_text())
T_HIST = -np.array(HIST['t_yr_from_j2000'], dtype=float) / 1000.0      # kyr BP, ascending
ORDER = np.argsort(T_HIST)
T_HIST = T_HIST[ORDER]
MODEL = {k: np.array(HIST[k], dtype=float)[ORDER] for k in ('e', 'eps_deg', 'e_sin_peri', 'q65n_june_wm2')}


def load_la2004():
    t, e, eps, varpi = [], [], [], []
    with open(ROOT / LA2004_REL) as f:
        for line in f:
            p = line.replace('D', 'E').split()
            if len(p) < 4:
                continue
            t.append(-float(p[0])); e.append(float(p[1])); eps.append(float(p[2])); varpi.append(float(p[3]))
    t = np.array(t); o = np.argsort(t)
    e, eps, varpi = np.array(e)[o], np.degrees(np.array(eps))[o], np.array(varpi)[o]
    t = t[o]
    q = np.array([daily_insolation(e_, eps_, np.degrees(v_), 65.0, 90.0) for e_, eps_, v_ in zip(e, eps, varpi)])
    return t, {'e': e, 'eps_deg': eps, 'e_sin_peri': e * np.sin(varpi), 'q65n_june_wm2': q}


def daily_insolation(e, eps_deg, peri_deg, lat_deg, lam_deg, s0=1361.0):
    # the simulator's computeDailyInsolationWm2 — perigee = perihelion + 180°
    D = np.pi / 180
    eps, phi, lam, perigee = eps_deg * D, lat_deg * D, lam_deg * D, (peri_deg + 180) * D
    rho2 = (1 + e * np.cos(lam - perigee)) ** 2 / (1 - e * e) ** 2
    delta = np.arcsin(np.sin(eps) * np.sin(lam))
    x = -np.tan(phi) * np.tan(delta)
    h0 = np.pi if x <= -1 else 0.0 if x >= 1 else np.arccos(x)
    return (s0 / np.pi) * rho2 * (h0 * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(h0))


T_LA, LA2004 = load_la2004()
ages, vals = mcf.load_lr04()


# ── the fixed-phase models ──────────────────────────────────────────────────
def regressors(kind, t_hist, hist, t, lag):
    """Design columns at proxy times t (kyr BP) from the forcing at t + lag."""
    tt = t + lag
    if kind == 'a':
        cols = [np.interp(tt, t_hist, hist[k]) for k in ('e', 'eps_deg', 'e_sin_peri')]
    elif kind == 'b':
        cols = [np.interp(tt, t_hist, hist['q65n_june_wm2'])]
    else:
        raise ValueError(kind)
    return np.column_stack([np.ones(len(t))] + cols)


def ols(X, y):
    beta, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    return beta


def r2(y, yhat):
    return 1.0 - float(np.sum((y - yhat) ** 2)) / max(float(np.sum((y - y.mean()) ** 2)), 1e-12)


def fit_fixed(kind, t_hist, hist, t_fit, y_fit):
    """Scan the lag on the FIT data; return (lag, beta, r2_fit)."""
    best = None
    for lag in LAGS_KYR:
        X = regressors(kind, t_hist, hist, t_fit, lag)
        beta = ols(X, y_fit)
        rr = r2(y_fit, X @ beta)
        if best is None or rr > best[2]:
            best = (float(lag), beta, rr)
    return best


def score_fixed(kind, t_hist, hist, lag, beta, t_test, y_test):
    return r2(y_test, regressors(kind, t_hist, hist, t_test, lag) @ beta)


def imbrie_ice(t_hist, hist, tm_kyr, b):
    """Imbrie & Imbrie (1980): dy/dt = (x − y)/T, T = Tm(1 − b) when x > y (melting), Tm(1 + b) when x < y.
    x = −Q65N standardised (more insolation → less ice); integrated forward in time (old → young).
    Returns y on t_hist (kyr BP, ascending), y(t) driven by the forcing at t."""
    q = hist['q65n_june_wm2']
    x = -(q - q.mean()) / q.std()
    y = np.zeros_like(x)
    # forward in time = from the oldest sample (largest kyr BP) to the youngest
    y[-1] = x[-1]
    for i in range(len(x) - 2, -1, -1):
        dt = t_hist[i + 1] - t_hist[i]
        T = tm_kyr * (1 - b) if x[i] > y[i + 1] else tm_kyr * (1 + b)
        y[i] = y[i + 1] + dt * (x[i] - y[i + 1]) / T
    return y


def fit_imbrie(t_hist, hist, t_fit, y_fit):
    best = None
    for tm in IMBRIE_TM_KYR:
        for b in IMBRIE_B:
            ice = imbrie_ice(t_hist, hist, tm, b)
            X = np.column_stack([np.ones(len(t_fit)), np.interp(t_fit, t_hist, ice)])
            beta = ols(X, y_fit)
            rr = r2(y_fit, X @ beta)
            if best is None or rr > best[2]:
                best = ((tm, b), beta, rr, ice)
    return best


# ── the free-phase model (the shipped L1, the fitter's own ridge) ───────────
def fit_free(t_fit, y_fit, window):
    f = mcf.ClimateFormula()
    s = f.fit(t_fit, y_fit, regime=window, include_l2=False, normalize=True)
    return f, s.r2_l1_only, s.condition_number


def score_free(f, t_test, y_test):
    yn = (y_test - f._fit_y_mean) / f._fit_y_std
    yhat = np.full_like(t_test, f._intercept, dtype=float)
    for P in mcf.L1_PERIODS_KYR:
        w = 2 * np.pi / P
        yhat += f._l1_a[P] * np.cos(w * t_test) + f._l1_b[P] * np.sin(w * t_test)
    return r2(yn, yhat)


# ── the null: phase-randomised surrogates of the SAME regressors ───────────
def surrogate_hist(hist, t_hist, lo, hi):
    """Randomise the Fourier phases of each regressor over the regime window (+ the lag margin),
    keeping the amplitude spectrum; the mean is kept. Same spectral content, random phases."""
    m = (t_hist >= lo - 0.5) & (t_hist <= hi + LAGS_KYR[-1] + 0.5)
    out = {}
    for k in ('e', 'eps_deg', 'e_sin_peri', 'q65n_june_wm2'):
        x = hist[k][m]
        F = np.fft.rfft(x - x.mean())
        ph = RNG.uniform(0, 2 * np.pi, len(F))
        ph[0] = 0.0
        if len(x) % 2 == 0:
            ph[-1] = 0.0
        s = np.fft.irfft(np.abs(F) * np.exp(1j * ph), n=len(x)) + x.mean()
        out[k] = s
    return t_hist[m], out


def run_regime(rg):
    lo, hi = mcf.REGIME_WINDOWS[rg]
    t, y = mcf.preprocess(ages, vals, window=(lo, hi))
    mid = 0.5 * (lo + hi)
    halves = [((lo, mid), (mid, hi)), ((mid, hi), (lo, mid))]
    res = {'window_kyr': [lo, hi], 'n': int(len(t))}

    def in_window(kind, th, hs):
        lag, beta, rr = fit_fixed(kind, th, hs, t, y)
        return dict(r2=rr, lag_kyr=lag, coefficients=[float(b) for b in beta])

    def holdout(kind, th, hs):
        out = []
        for (flo, fhi), (slo, shi) in halves:
            fm = (t >= flo) & (t <= fhi); sm = (t >= slo) & (t <= shi)
            lag, beta, rfit = fit_fixed(kind, th, hs, t[fm], y[fm])
            out.append(dict(fit=[flo, fhi], score=[slo, shi], lag_kyr=lag, r2_fit=rfit, r2_holdout=score_fixed(kind, th, hs, lag, beta, t[sm], y[sm])))
        return dict(halves=out, r2_holdout_mean=float(np.mean([o['r2_holdout'] for o in out])))

    # free (shipped L1)
    f, r2f, cond = fit_free(t, y, (lo, hi))
    hold_free = []
    for (flo, fhi), (slo, shi) in halves:
        fm = (t >= flo) & (t <= fhi); sm = (t >= slo) & (t <= shi)
        ff, rfit, _ = fit_free(t[fm], y[fm], (flo, fhi))
        hold_free.append(dict(fit=[flo, fhi], score=[slo, shi], r2_fit=rfit, r2_holdout=score_free(ff, t[sm], y[sm])))
    res['free_28_lines'] = dict(r2=r2f, condition=cond, n_free=2 * len(mcf.L1_PERIODS_KYR),
                                holdout=dict(halves=hold_free, r2_holdout_mean=float(np.mean([o['r2_holdout'] for o in hold_free]))))
    # robustness (not pre-registered, added after the first run showed the shipped ridge's
    # hold-out deeply negative): the SAME free model at stronger ridge — does any λ rescue it?
    lam0 = mcf.L1_RIDGE_LAMBDA
    scan = {}
    try:
        for lam in (1.0, 10.0, 100.0, 1000.0):
            mcf.L1_RIDGE_LAMBDA = lam
            hh = []
            for (flo, fhi), (slo, shi) in halves:
                fm = (t >= flo) & (t <= fhi); sm = (t >= slo) & (t <= shi)
                ff, rfit, _ = fit_free(t[fm], y[fm], (flo, fhi))
                hh.append(score_free(ff, t[sm], y[sm]))
            _, rin, _ = fit_free(t, y, (lo, hi))
            scan[str(lam)] = dict(r2_in_window=rin, r2_holdout_mean=float(np.mean(hh)))
    finally:
        mcf.L1_RIDGE_LAMBDA = lam0
    res['free_28_lines']['ridge_scan'] = scan
    res['free_28_lines']['best_holdout_any_lambda'] = max(s['r2_holdout_mean'] for s in scan.values())
    # fixed (model)
    for kind, label in (('a', 'fixed_a_e_eps_esinw'), ('b', 'fixed_b_q65n')):
        res[label] = dict(in_window=in_window(kind, T_HIST, MODEL), holdout=holdout(kind, T_HIST, MODEL),
                          n_free=4 if kind == 'a' else 2)
        res[label + '_la2004'] = dict(in_window=in_window(kind, T_LA, LA2004), holdout=holdout(kind, T_LA, LA2004))
    # variant (c)
    (tm, b), beta, rc, _ice = fit_imbrie(T_HIST, MODEL, t, y)
    hold_c = []
    for (flo, fhi), (slo, shi) in halves:
        fm = (t >= flo) & (t <= fhi); sm = (t >= slo) & (t <= shi)
        (tm2, b2), beta2, rfit2, ice2 = fit_imbrie(T_HIST, MODEL, t[fm], y[fm])
        X = np.column_stack([np.ones(int(sm.sum())), np.interp(t[sm], T_HIST, ice2)])
        hold_c.append(dict(fit=[flo, fhi], score=[slo, shi], tm_kyr=tm2, b=b2, r2_fit=rfit2, r2_holdout=r2(y[sm], X @ beta2)))
    res['variant_c_imbrie'] = dict(in_window=dict(r2=rc, tm_kyr=tm, b=b), holdout=dict(halves=hold_c, r2_holdout_mean=float(np.mean([o['r2_holdout'] for o in hold_c]))))
    # null — the same regressors with random Fourier phases, per model kind
    for kind, label in (('a', 'fixed_a_e_eps_esinw'), ('b', 'fixed_b_q65n')):
        null_in, null_hold = [], []
        for _ in range(N_NULL):
            th, hs = surrogate_hist(MODEL, T_HIST, lo, hi)
            null_in.append(in_window(kind, th, hs)['r2'])
            null_hold.append(holdout(kind, th, hs)['r2_holdout_mean'])
        res['null_phase_randomised_' + kind] = dict(
            n=N_NULL, in_window=dict(mean=float(np.mean(null_in)), p95=float(np.percentile(null_in, 95)), max=float(np.max(null_in))),
            holdout=dict(mean=float(np.mean(null_hold)), p95=float(np.percentile(null_hold, 95)), max=float(np.max(null_hold))),
            p_in_window=float(np.mean(np.array(null_in) >= res[label]['in_window']['r2'])),
            p_holdout=float(np.mean(np.array(null_hold) >= res[label]['holdout']['r2_holdout_mean'])))
    return res


def main():
    t0 = time.time()
    results = {rg: run_regime(rg) for rg in REGIMES}

    def v(rg, *keys):
        x = results[rg]
        for k in keys:
            x = x[k]
        return x

    checks = {}
    for rg in REGIMES:
        a_in, b_in, free_in = v(rg, 'fixed_a_e_eps_esinw', 'in_window', 'r2'), v(rg, 'fixed_b_q65n', 'in_window', 'r2'), v(rg, 'free_28_lines', 'r2')
        p95a, p95b = v(rg, 'null_phase_randomised_a', 'in_window', 'p95'), v(rg, 'null_phase_randomised_b', 'in_window', 'p95')
        a_h, b_h, free_h = v(rg, 'fixed_a_e_eps_esinw', 'holdout', 'r2_holdout_mean'), v(rg, 'fixed_b_q65n', 'holdout', 'r2_holdout_mean'), v(rg, 'free_28_lines', 'holdout', 'r2_holdout_mean')
        free_best = v(rg, 'free_28_lines', 'best_holdout_any_lambda')
        checks[rg] = dict(
            outcome1_fixed_below_free={'a': a_in < free_in, 'b': b_in < free_in},
            outcome1_fixed_clears_own_null_p95={'a': a_in > p95a, 'b': b_in > p95b},
            outcome2_holdout_fixed_ge_free={'a': a_h >= free_h, 'b': b_h >= free_h},
            robustness_holdout_fixed_ge_free_at_best_lambda={'a': a_h >= free_best, 'b': b_h >= free_best},
        )
    prediction_holds = all(checks[rg]['outcome2_holdout_fixed_ge_free']['a'] or checks[rg]['outcome2_holdout_fixed_ge_free']['b'] for rg in ('post-mpt', 'pre-inhg'))
    verdict = dict(checks=checks, prediction2_holds_post_mpt_and_pre_inhg=prediction_holds)

    # ── report ──
    print(f'T7 — the fixed-phase L1 vs the shipped free-phase L1 (LR04; lag scan 0–{LAGS_KYR[-1]:.0f} kyr; null N = {N_NULL})')
    hdr = f"{'regime':10s} {'free R²':>8s} {'a R²':>7s} {'b R²':>7s} {'c R²':>7s} {'null p95':>9s} | {'free hold':>9s} {'a hold':>7s} {'b hold':>7s} {'c hold':>7s} {'null hold p95':>13s} | {'a lag':>5s} {'b lag':>5s} | {'La04 a':>7s} {'La04 a hold':>11s}"
    print(hdr)
    for rg in REGIMES:
        print(f"{rg:10s} {v(rg,'free_28_lines','r2'):8.4f} {v(rg,'fixed_a_e_eps_esinw','in_window','r2'):7.4f} {v(rg,'fixed_b_q65n','in_window','r2'):7.4f} "
              f"{v(rg,'variant_c_imbrie','in_window','r2'):7.4f} {v(rg,'null_phase_randomised_a','in_window','p95'):9.4f} | "
              f"{v(rg,'free_28_lines','holdout','r2_holdout_mean'):9.4f} {v(rg,'fixed_a_e_eps_esinw','holdout','r2_holdout_mean'):7.4f} {v(rg,'fixed_b_q65n','holdout','r2_holdout_mean'):7.4f} "
              f"{v(rg,'variant_c_imbrie','holdout','r2_holdout_mean'):7.4f} {v(rg,'null_phase_randomised_a','holdout','p95'):13.4f} | "
              f"{v(rg,'fixed_a_e_eps_esinw','in_window','lag_kyr'):5.1f} {v(rg,'fixed_b_q65n','in_window','lag_kyr'):5.1f} | "
              f"{v(rg,'fixed_a_e_eps_esinw_la2004','in_window','r2'):7.4f} {v(rg,'fixed_a_e_eps_esinw_la2004','holdout','r2_holdout_mean'):11.4f}")
    for rg in REGIMES:
        sc = v(rg, 'free_28_lines', 'ridge_scan')
        print(f"  {rg:9s} free ridge scan (λ: in-window / hold-out): " + '  '.join(f"{lam}: {s['r2_in_window']:.3f} / {s['r2_holdout_mean']:+.3f}" for lam, s in sc.items())
              + f"   · b null p95 in-window {v(rg,'null_phase_randomised_b','in_window','p95'):.4f}, hold {v(rg,'null_phase_randomised_b','holdout','p95'):.4f}")
    for rg in REGIMES:
        for h in v(rg, 'free_28_lines', 'holdout', 'halves'):
            print(f"  {rg:9s} free  fit {h['fit'][0]:5.0f}–{h['fit'][1]:5.0f}  R²fit {h['r2_fit']:7.4f}  hold {h['r2_holdout']:8.4f}")
        for h in v(rg, 'fixed_a_e_eps_esinw', 'holdout', 'halves'):
            print(f"  {rg:9s} a     fit {h['fit'][0]:5.0f}–{h['fit'][1]:5.0f}  R²fit {h['r2_fit']:7.4f}  hold {h['r2_holdout']:8.4f}  lag {h['lag_kyr']:4.1f}")
        for h in v(rg, 'fixed_b_q65n', 'holdout', 'halves'):
            print(f"  {rg:9s} b     fit {h['fit'][0]:5.0f}–{h['fit'][1]:5.0f}  R²fit {h['r2_fit']:7.4f}  hold {h['r2_holdout']:8.4f}  lag {h['lag_kyr']:4.1f}")
        c = v(rg, 'fixed_a_e_eps_esinw', 'in_window', 'coefficients')
        print(f"  {rg:9s} a coefficients (normalised δ¹⁸O per unit): e {c[1]:+.2f}  ε {c[2]:+.3f}/°  e·sin ϖ {c[3]:+.2f}   · variant c: Tm {v(rg,'variant_c_imbrie','in_window','tm_kyr')} kyr, b {v(rg,'variant_c_imbrie','in_window','b')}")
    print('\nchecks:', json.dumps(checks, indent=None))
    print('prediction (2) holds in post-MPT and pre-iNHG:', prediction_holds)
    print(f'elapsed {time.time() - t0:.1f} s')

    if '--write' in sys.argv:
        out = dict(
            _description=__doc__.strip(),
            config=dict(regimes=REGIMES, lags_kyr=[float(x) for x in LAGS_KYR], n_null=N_NULL, rng_seed=20260926,
                        imbrie_tm_kyr=IMBRIE_TM_KYR, imbrie_b=IMBRIE_B, ridge_lambda=mcf.L1_RIDGE_LAMBDA,
                        l1_lines=len(mcf.L1_PERIODS_KYR), lr04_dt_kyr=1.0, detrend='linear per window (the fitter\'s preprocess)',
                        holdout='each regime window split at its midpoint; fit one half (lag and coefficients chosen on it), score the other; both orders; mean reported'),
            results=results, verdict=verdict,
            meta=dict(script=SELF_REL, plan='holisticuniverse plan 06 §4 T7', doc='docs/92-climate-formula.md', runtime_sec=time.time() - t0,
                      environment=dict(python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__)),
            inputs=build_inputs_block(f'python3 {SELF_REL} --write', INPUT_FILES),
        )
        (ROOT / OUT_REL).write_text(json.dumps(out, indent=1) + '\n')
        print(f'wrote {OUT_REL}')


if __name__ == '__main__':
    main()

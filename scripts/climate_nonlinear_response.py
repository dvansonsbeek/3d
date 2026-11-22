#!/usr/bin/env python3
"""
The climate-state-dependent (nonlinear) 100-kyr response — phase 1, the cross-window measurement
(holisticuniverse plan 35; TODO B "The Climate Formula beyond one fixed line set"; plan 26 §2M.1 measured
that every L1 line set fitted in one LR04 window has no skill in the others — the post-MPT set scores
R² −26 outside its window — so a cross-window improvement needs a response whose amplitude depends on
the climate state, not another line set).

    python3 scripts/climate_nonlinear_response.py            print the table
    python3 scripts/climate_nonlinear_response.py --json     also dump the numbers as JSON on stdout

WHAT IS MEASURED. On the same LR04 preprocessing as T7 (1-kyr grid, linear detrend per regime window) and
the MODEL'S OWN orbital histories (data/t7-model-orbital-histories.json: e, ε, e·sin ϖ and the June-solstice
insolation at 65°N on the model's elements, 0–5.4 Ma at 1 kyr), four responses are fitted per regime window
and scored (a) in the window, (b) in every OTHER window with the fitted parameters frozen — the discriminator
the line set fails — and (c) at the record's extremes (the mean residual over the lowest and highest deciles
of the window: a linear sum compresses both; a state-dependent gain should not):

  L   the linear fixed-phase response (T7 variant a): y = a + Σ bᵢ·fᵢ(t − τ), fᵢ ∈ {e, ε, e·sin ϖ}, one lag τ
  N1  the same with a STATE-DEPENDENT GAIN: y = a + (1 + γ·s(t))·Σ bᵢ·fᵢ(t − τ), the state s the model-only
      Imbrie ice of N2's best (standardised; no proxy enters the state) — the "more ice, larger response" hypothesis
  N2  Imbrie & Imbrie (1980) on the model's insolation, FINE grid: dy/dt = (x − y)/T, T = Tm(1 − b) melting,
      Tm(1 + b) growing; Tm 5–40 kyr, b 0–0.9, one amplitude + offset (T7 ran 3 × 2 points of this grid)
  N3  Paillard (1998) three-state relay (i → g → G → i) on the model's insolation: ice relaxes to the state's
      level with the state's time constant; thresholds i0 (g→i impossible; i→g below i0), i1 (G→i above i1),
      v_max (g→G above); the paper's τ_i = 10, τ_g = 50, τ_G = 50 kyr kept, the thresholds scanned

The reading, set in this docstring before the first run (the TODO item's framing; holisticuniverse plan 35
records the outcome): a response with cross-window R² ≥ 0.4 on at least two of the three regime pairs, beating
L there, is the nonlinearity the formula lacks and goes to a plan of its own (adoption changes the GIA
channel's proxy and therefore α(t) — a cascade, not this script); none → these three forms close as measured
and the line set stays. Analysis only: the ice models here are models of the PROXY's response, not of the
solar system (test:py-physics).

Phase-1 outcome (2026-11-22, the first run): none of the three reaches the reading. L reproduces T7
(in-window 0.380 / 0.459 / 0.223) and is the one response with cross-window skill at all (0.30–0.45; the
28-line set scores −26 outside its window); N1 chooses γ ≈ 0 everywhere (+0.01 in-window, nothing out of it);
N2 chooses b = 0 at every window (no growth/decay asymmetry wanted) and sits below L (0.24 / 0.27 / 0.09);
N3 reaches 0.32 in the post-MPT window and 0.05 outside it. Every response compresses the record's extremes
alike (−0.5 ‰ at the floors, +0.4 ‰ at the maxima post-MPT) — the compression is not a gain on the orbital
forcing.

Phase-2 outcome (2026-11-22, the same day; --forward=<the one-source movement 0 … +50 kyr in these columns>):
N4 (Huybers' summer energy above a melting threshold, 250–400 W/m²) reads 0.15 / 0.16 / 0.06 in window and
0.15 across; N4b (the same through an ice relaxation) 0.25 / 0.28 / 0.10 — both below L. The forward test: every
response fitted on post-MPT LR04 advances toward a glacial state by +20 kyr (L +0.57 ‰, N1 +0.53, N3 +0.36,
N2 +0.29, N4b +0.30, N4 +0.14 — the relaxation forms damp the +10-kyr step from L's +0.44 to +0.15 ‰ but none
removes it); the long interglacial of Berger & Loutre 2002 / Ganopolski 2016 rides a CO₂-dependent threshold,
a state these inputs do not carry. The sea-level stack agrees with δ¹⁸O response for response (L 0.377 refit,
0.341 with the δ¹⁸O-fitted shape; the relay 0.385 in that one window, nothing across) — the nonlinearity is not
in the proxy. Reading: none of the canonical nonlinear forms of the ORBITAL forcing reaches the bar; the item
closes as measured on these forms (holisticuniverse plan 35 §5).
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import milankovitch_climate_formula as mcf  # noqa: E402  (LR04 loader, regime windows)

HIST_REL = 'data/t7-model-orbital-histories.json'
REGIMES = ['post-mpt', 'inhg-mpt', 'pre-inhg']
LAGS_KYR = np.arange(0.0, 20.01, 0.5)          # the climate lag scan (forcing leads the proxy), T7's
IMBRIE_TM = np.arange(5.0, 40.01, 2.5)
IMBRIE_B = np.arange(0.0, 0.91, 0.1)
GAMMAS = np.arange(-1.0, 3.01, 0.1)             # the state gain: G = 1 + γ·s, s standardised ice
PAILLARD_TAU = dict(i=10.0, g=50.0, G=50.0)     # kyr, Paillard 1998
PAILLARD_I0 = np.arange(-1.5, 0.01, 0.25)       # i → g when insolation < i0 (standardised, −x of the ice forcing)
PAILLARD_I1 = np.arange(-0.5, 1.01, 0.25)       # G → i when insolation > i1
PAILLARD_VMAX = np.arange(0.4, 1.21, 0.2)       # g → G when ice volume > v_max (ice in units of the G level)

# ── the model's histories, kyr BP ascending (plus the FORWARD rows of --forward=<json>, the same columns
#    beyond J2000, for the +10-kyr advance test — negative kyr BP) ─────────────────────────────────────────
HIST = json.loads((ROOT / HIST_REL).read_text())
_fwd = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--forward=')), None)
FWD = json.loads(Path(_fwd).read_text()) if _fwd else None
_cols = ('e', 'eps_deg', 'peri_of_date_deg', 'e_sin_peri', 'q65n_june_wm2')
_t = list(HIST['t_yr_from_j2000']) + ([t for t in FWD['t_yr_from_j2000'] if t > 0] if FWD else [])
_vals = {k: list(HIST[k]) + ([v for t, v in zip(FWD['t_yr_from_j2000'], FWD[k]) if t > 0] if FWD else []) for k in _cols}
T_HIST = -np.array(_t, dtype=float) / 1000.0
ORDER = np.argsort(T_HIST)
T_HIST = T_HIST[ORDER]
MODEL = {k: np.array(_vals[k], dtype=float)[ORDER] for k in _cols}
SEA_REL = 'data/spratt-lisiecki-2016-sea-level.txt'
HUYBERS_THRESHOLDS = [250.0, 275.0, 300.0, 325.0, 350.0, 400.0]   # W/m²; Huybers 2006 uses the melting threshold ~275
S0_WM2, LAT_DEG = 1361.0, 65.0
Q = MODEL['q65n_june_wm2']
X_ICE = -(Q - Q.mean()) / Q.std()               # the ice forcing: less insolation → more ice (T7's convention)

# ── LR04 on the 1-kyr grid, detrended per window (T7's preprocessing) ────────
AGES, VALS = mcf.load_lr04()


def window(rg):
    lo, hi = mcf.REGIME_WINDOWS[rg]
    t = np.arange(lo, hi + 1e-9, 1.0)
    y = np.interp(t, AGES, VALS)
    A = np.column_stack([np.ones_like(t), t])
    y = y - A @ np.linalg.lstsq(A, y, rcond=None)[0]
    return t, y


WIN = {rg: window(rg) for rg in REGIMES}


def ols(X, y):
    return np.linalg.lstsq(X, y, rcond=None)[0]


def r2(y, yhat):
    ss = float(np.sum((y - y.mean()) ** 2))
    return 1.0 - float(np.sum((y - yhat) ** 2)) / ss if ss > 0 else float('nan')


def at(series, t):
    return np.interp(t, T_HIST, series)


def extremes(y, yhat):
    """the mean residual (record − fit) over the window's lowest and highest deciles of the record"""
    lo, hi = np.quantile(y, [0.1, 0.9])
    r = y - yhat
    return float(r[y <= lo].mean()), float(r[y >= hi].mean())


# ── the responses: each returns (params, design(t, params) → X) with OLS amplitudes ─────────
def design_linear(t, lag):
    return np.column_stack([np.ones_like(t), at(MODEL['e'], t + lag), at(MODEL['eps_deg'], t + lag), at(MODEL['e_sin_peri'], t + lag)])


def imbrie_ice(tm, b):
    y = np.zeros_like(X_ICE)
    y[-1] = X_ICE[-1]
    for i in range(len(X_ICE) - 2, -1, -1):
        dt = T_HIST[i + 1] - T_HIST[i]
        T = tm * (1 - b) if X_ICE[i] > y[i + 1] else tm * (1 + b)
        y[i] = y[i + 1] + dt * (X_ICE[i] - y[i + 1]) / T
    return y


_ICE_CACHE = {}


def imbrie(tm, b):
    k = (round(float(tm), 3), round(float(b), 3))
    if k not in _ICE_CACHE:
        _ICE_CACHE[k] = imbrie_ice(tm, b)
    return _ICE_CACHE[k]


def paillard_ice(i0, i1, vmax):
    """Paillard 1998: states i (interglacial), g (mild glacial), G (full glacial); v relaxes to the state's level
    (i: 0, g: 1 − exp... simplified to the levels 0 / 1 / 1 with the full-glacial state's slower clock) — the
    relay rules: i→g when forcing (insolation, +x bright) < i0; g→G when v > vmax; G→i when forcing > i1."""
    ins = -X_ICE                                   # bright = positive
    v = np.zeros_like(ins)
    state = 'i'
    v[-1] = 0.0
    level = dict(i=0.0, g=1.0, G=1.0)
    for i in range(len(ins) - 2, -1, -1):
        dt = T_HIST[i + 1] - T_HIST[i]
        f = ins[i]
        if state == 'i' and f < i0:
            state = 'g'
        elif state == 'g' and v[i + 1] > vmax:
            state = 'G'
        elif state == 'G' and f > i1:
            state = 'i'
        tau = PAILLARD_TAU[state]
        v[i] = v[i + 1] + dt * (level[state] - v[i + 1]) / tau
    return v


def fit_L(t, y):
    best = None
    for lag in LAGS_KYR:
        X = design_linear(t, lag)
        beta = ols(X, y)
        rr = r2(y, X @ beta)
        if best is None or rr > best['r2']:
            best = dict(r2=rr, lag=float(lag), beta=beta)
    return best


def pred_L(p, t):
    return design_linear(t, p['lag']) @ p['beta']


def fit_N2(t, y):
    best = None
    for tm in IMBRIE_TM:
        for b in IMBRIE_B:
            ice = imbrie(tm, b)
            for lag in (0.0,):               # the model carries its own lag through Tm
                X = np.column_stack([np.ones_like(t), at(ice, t + lag)])
                beta = ols(X, y)
                rr = r2(y, X @ beta)
                if best is None or rr > best['r2']:
                    best = dict(r2=rr, tm=float(tm), b=float(b), lag=lag, beta=beta)
    return best


def pred_N2(p, t):
    return np.column_stack([np.ones_like(t), at(imbrie(p['tm'], p['b']), t + p['lag'])]) @ p['beta']


def fit_N1(t, y, ice):
    s_all = (ice - ice.mean()) / ice.std()
    best = None
    for gamma in GAMMAS:
        for lag in LAGS_KYR[::2]:
            F = design_linear(t, lag)[:, 1:]
            g = 1.0 + gamma * at(s_all, t)
            X = np.column_stack([np.ones_like(t), F * g[:, None]])
            beta = ols(X, y)
            rr = r2(y, X @ beta)
            if best is None or rr > best['r2']:
                best = dict(r2=rr, gamma=float(gamma), lag=float(lag), beta=beta, s=s_all)
    return best


def pred_N1(p, t):
    F = design_linear(t, p['lag'])[:, 1:]
    g = 1.0 + p['gamma'] * at(p['s'], t)
    return np.column_stack([np.ones_like(t), F * g[:, None]]) @ p['beta']


_PAIL_CACHE = {}


def paillard(i0, i1, vmax):
    k = (round(float(i0), 3), round(float(i1), 3), round(float(vmax), 3))
    if k not in _PAIL_CACHE:
        _PAIL_CACHE[k] = paillard_ice(i0, i1, vmax)
    return _PAIL_CACHE[k]


def fit_N3(t, y):
    best = None
    for i0 in PAILLARD_I0:
        for i1 in PAILLARD_I1:
            for vmax in PAILLARD_VMAX:
                v = paillard(i0, i1, vmax)
                X = np.column_stack([np.ones_like(t), at(v, t)])
                beta = ols(X, y)
                rr = r2(y, X @ beta)
                if best is None or rr > best['r2']:
                    best = dict(r2=rr, i0=float(i0), i1=float(i1), vmax=float(vmax), beta=beta)
    return best


def pred_N3(p, t):
    return np.column_stack([np.ones_like(t), at(paillard(p['i0'], p['i1'], p['vmax']), t)]) @ p['beta']


# ── N4: Huybers (2006) summer energy — the insolation INTEGRATED over the days above a melting threshold ──
def daily_insolation(e, eps_deg, peri_deg, lam_deg):
    """Berger's daily-mean insolation at LAT_DEG (W/m²) for solar longitude lam_deg — the exporter's form
    (perigee = ϖ + 180°), vectorised over the sample axis (e, eps, peri arrays) and the day axis (lam array)."""
    D = np.pi / 180.0
    eps = eps_deg[:, None] * D; lam = lam_deg[None, :] * D; perigee = (peri_deg[:, None] + 180.0) * D; phi = LAT_DEG * D
    e2 = e[:, None]
    rho2 = (1 + e2 * np.cos(lam - perigee)) ** 2 / (1 - e2 ** 2) ** 2
    delta = np.arcsin(np.sin(eps) * np.sin(lam))
    x = np.clip(-np.tan(phi) * np.tan(delta), -1.0, 1.0)
    H0 = np.arccos(x)
    return (S0_WM2 / np.pi) * rho2 * (H0 * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(H0))


_LAM = np.arange(0.0, 360.0, 1.0)                 # one degree of solar longitude ≈ one day
_DAILY = daily_insolation(MODEL['e'], MODEL['eps_deg'], MODEL['peri_of_date_deg'], _LAM)   # (samples, days)
_SUMMER = {th: (np.where(_DAILY > th, _DAILY, 0.0).sum(axis=1) * 86400.0 * (365.25 / 360.0)) / 1e9 for th in HUYBERS_THRESHOLDS}  # GJ/m²


def fit_N4(t, y):
    best = None
    for th in HUYBERS_THRESHOLDS:
        J = _SUMMER[th]
        for lag in LAGS_KYR[::2]:
            X = np.column_stack([np.ones_like(t), at(J, t + lag)])
            beta = ols(X, y)
            rr = r2(y, X @ beta)
            if best is None or rr > best['r2']:
                best = dict(r2=rr, threshold=float(th), lag=float(lag), beta=beta)
    return best


def pred_N4(p, t):
    return np.column_stack([np.ones_like(t), at(_SUMMER[p['threshold']], t + p['lag'])]) @ p['beta']


def relax(x, tm):
    """exponential relaxation of a forcing (ice follows −x with time constant tm), integrated old → young"""
    y = np.zeros_like(x); y[-1] = x[-1]
    for i in range(len(x) - 2, -1, -1):
        dt = T_HIST[i + 1] - T_HIST[i]
        y[i] = y[i + 1] + dt * (x[i] - y[i + 1]) / tm
    return y


_RELAX_CACHE = {}


def fit_N4b(t, y):
    """Huybers' summer energy through an ice relaxation (the N2 form that fitted best, b = 0) — threshold, Tm scanned"""
    best = None
    for th in HUYBERS_THRESHOLDS:
        J = _SUMMER[th]; x = -(J - J.mean()) / J.std()
        for tm in IMBRIE_TM:
            k = (th, float(tm))
            if k not in _RELAX_CACHE:
                _RELAX_CACHE[k] = relax(x, tm)
            X = np.column_stack([np.ones_like(t), at(_RELAX_CACHE[k], t)])
            beta = ols(X, y)
            rr = r2(y, X @ beta)
            if best is None or rr > best['r2']:
                best = dict(r2=rr, threshold=float(th), tm=float(tm), beta=beta)
    return best


def pred_N4b(p, t):
    return np.column_stack([np.ones_like(t), at(_RELAX_CACHE[(p['threshold'], p['tm'])], t)]) @ p['beta']


RESPONSES = {
    'L  linear fixed-phase (e, ε, e·sinϖ, one lag)': (lambda t, y, ctx: fit_L(t, y), pred_L),
    'N2 Imbrie & Imbrie, fine grid': (lambda t, y, ctx: fit_N2(t, y), pred_N2),
    'N1 state-dependent gain on L (state = N2 ice)': (lambda t, y, ctx: fit_N1(t, y, imbrie(ctx['N2']['tm'], ctx['N2']['b'])), pred_N1),
    'N3 Paillard relay (thresholds scanned)': (lambda t, y, ctx: fit_N3(t, y), pred_N3),
    'N4 Huybers summer energy, threshold + lag': (lambda t, y, ctx: fit_N4(t, y), pred_N4),
    'N4b summer energy through an ice relaxation': (lambda t, y, ctx: fit_N4b(t, y), pred_N4b),
}


def load_sea_level():
    """Spratt & Lisiecki 2016, the long PC1 (0–800 ka), on the 1-kyr grid, linearly detrended like the δ¹⁸O windows"""
    ages, vals = [], []
    for line in (ROOT / SEA_REL).read_text().splitlines():
        if line.startswith('#') or line.startswith('age_'):
            continue
        p = line.split()
        if len(p) < 6:
            continue
        try:
            ages.append(float(p[0])); vals.append(float(p[5]))
        except ValueError:
            continue
    ages, vals = np.array(ages), np.array(vals)
    t = np.arange(0.0, 800.0 + 1e-9, 1.0)
    y = -np.interp(t, ages, vals)                 # sign: LOWER sea level = more ice, like heavier δ¹⁸O
    A = np.column_stack([np.ones_like(t), t])
    return t, y - A @ np.linalg.lstsq(A, y, rcond=None)[0]


def main():
    out = {}
    for name, (fit, pred) in RESPONSES.items():
        row = {}
        for rg in REGIMES:
            t, y = WIN[rg]
            ctx = {'N2': out['N2 Imbrie & Imbrie, fine grid'][rg]['params']} if name.startswith('N1') else {}
            p = fit(t, y, ctx)
            cross = {}
            for other in REGIMES:
                if other == rg:
                    continue
                to, yo = WIN[other]
                # a cross-window score re-fits ONLY the offset and the overall amplitude of the frozen response
                yhat = pred(p, to)
                A = np.column_stack([np.ones_like(to), yhat - yhat.mean()])
                cross[other] = r2(yo, A @ ols(A, yo))
            lo_res, hi_res = extremes(y, pred(p, t))
            params = {k: (float(v) if np.isscalar(v) or isinstance(v, (int, float)) else None) for k, v in p.items() if k not in ('beta', 's')}
            row[rg] = dict(r2=p['r2'], cross=cross, extremes=dict(low_decile_residual=lo_res, high_decile_residual=hi_res), params=params)
            if rg == 'post-mpt':
                row[rg]['_p'] = p
        out[name] = row

    # ── the forward advance (needs --forward): the post-MPT-fitted response beyond J2000 ──
    if FWD is not None:
        print('The forward test — each response as fitted on post-MPT LR04, carried forward (‰ of the detrended proxy; the')
        print('record reads its Holocene value at 0; a threshold model expects no glacial advance before ~+50 kyr):')
        tf = np.arange(-50.0, 0.0 + 1e-9, 1.0)      # kyr BP, negative = future
        for name, (fit, pred) in RESPONSES.items():
            p = out[name]['post-mpt']['_p']
            yf = pred(p, tf)
            y0 = float(yf[tf == 0.0][0]); y10 = float(yf[tf == -10.0][0]); y20 = float(yf[tf == -20.0][0]); y50 = float(yf[tf == -50.0][0])
            imin = int(np.argmin(yf)); imax = int(np.argmax(yf))
            out[name]['forward'] = dict(y0=y0, d10=y10 - y0, d20=y20 - y0, d50=y50 - y0, min_at_kyr_ahead=float(-tf[imin]), max_at_kyr_ahead=float(-tf[imax]))
            print(f"  {name:52s} Δ(+10 kyr) {y10 - y0:+6.2f}  Δ(+20) {y20 - y0:+6.2f}  Δ(+50) {y50 - y0:+6.2f}   warmest at +{abs(tf[imin]):.0f} kyr, iciest at +{abs(tf[imax]):.0f} kyr")
        print()

    # ── the second record: sea level 0–800 ka (ice volume where the δ¹⁸O temperature share is absent) ──
    ts, ys = load_sea_level()
    print('The sea-level stack (Spratt & Lisiecki 2016, long PC1, 0–800 ka, sign = ice): in-window R² of each response')
    print('refitted on sea level, and the R² of the post-MPT δ¹⁸O-fitted SHAPE on sea level (offset and amplitude refitted):')
    for name, (fit, pred) in RESPONSES.items():
        ctx = {'N2': out['N2 Imbrie & Imbrie, fine grid']['post-mpt']['params']} if name.startswith('N1') else {}
        p_sea = fit(ts, ys, ctx)
        p_d18 = out[name]['post-mpt']['_p']
        yhat = pred(p_d18, ts); A = np.column_stack([np.ones_like(ts), yhat - yhat.mean()])
        cross = r2(ys, A @ ols(A, ys))
        lo_res, hi_res = extremes(ys, pred(p_sea, ts))
        out[name]['sea_level'] = dict(r2_refit=p_sea['r2'], r2_d18o_shape=cross, extremes_m=dict(low=lo_res, high=hi_res))
        print(f"  {name:52s} refit {p_sea['r2']:5.3f}   δ¹⁸O shape {cross:5.3f}   floor/max residual {lo_res:+6.1f} / {hi_res:+6.1f} m")
    print()
    for name in out:
        for rg in REGIMES:
            out[name][rg].pop('_p', None)

    # ── the table ──
    print(f"{'response':52s} {'regime':9s} {'in':>6s}  {'→post':>6s} {'→inhg':>6s} {'→pre':>6s}   {'floor':>6s} {'max':>6s}   params")
    for name, row in out.items():
        for rg in REGIMES:
            r = row[rg]
            c = r['cross']
            cells = [f"{c.get(o, float('nan')):6.2f}" if o != rg else '   —  ' for o in REGIMES]
            ex = r['extremes']
            ps = ' '.join(f"{k}={v:.3g}" for k, v in r['params'].items() if k != 'r2' and v is not None)
            print(f"{name:52s} {rg:9s} {r['r2']:6.3f}  {' '.join(cells)}   {ex['low_decile_residual']:+6.2f} {ex['high_decile_residual']:+6.2f}   {ps}")
        print()
    if '--json' in sys.argv:
        print(json.dumps(out, indent=1, default=float))


if __name__ == '__main__':
    main()

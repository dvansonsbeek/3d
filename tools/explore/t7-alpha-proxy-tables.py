#!/usr/bin/env python3
"""
T7 / WP2 — three α(t) histories for the ΔT joint fitter's report-mode comparison
(holisticuniverse plan 06 §9 item 12; the runner is tools/explore/t7-alpha-proxy-dt-fit.cjs).

    python3 tools/explore/t7-alpha-proxy-tables.py --write    write data/t7-alpha-proxy-tables.json

The GIA channel is α(t) = α₀ − k·[L(t) − ⟨L⟩_τ(t)] with L the ice-history proxy, ⟨·⟩_τ the causal
exponential mean over the past (τ = deepTime.alphaGiaRelaxationKyr) and k DERIVED so that dα/dt at J2000
equals the Cox–Chao rate (deepTime.alphaGiaRateJ2000PerYr). Three proxies, same τ, same k rule:
  shipped   the climate formula's post-MPT L1 (28 fitted lines) through the per-line analytic filter —
            the form the engines run; through the runner's hook it must reproduce the fitter's baseline
            (the hook's parity check; the 10-yr table costs ~0.1 s of RMS)
  fixed     the T7 fixed-phase forcing: c_e·e(t+lag) + c_ε·ε(t+lag) + c_p·e·sin ϖ(t+lag) from
            data/t7-fixed-phase-l1.json (post-MPT coefficients and lag) on the model's own histories
  lr04      the LR04 record itself (0–1000 kyr, the fitter's own preprocessing, unit std) — the proxy
            the fitted lines describe; its J2000 slope is NOT resolved at 1-kyr sampling, so k is
            anchored on a 0–3-kyr linear fit of the filtered proxy (stated limitation)
Tables on a 10-yr grid over 0 … 300 kyr BP; the runner holds α₀ beyond.
"""
import json
import platform
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'tools' / 'fit' / 'python'))
import t7_fixed_phase_l1 as t7  # noqa: E402  (loads the histories, LR04 and La2004 at import)
from artifact_inputs import build_inputs_block  # noqa: E402

OUT_REL = 'data/t7-alpha-proxy-tables.json'
SELF_REL = 'tools/explore/t7-alpha-proxy-tables.py'
CFC_REL = 'public/input/climate-formula-coefficients.json'
INPUT_FILES = [CFC_REL, 'public/input/model-parameters.json', 'public/input/astro-reference.json',
               'data/t7-fixed-phase-l1.json', 'data/t7-model-orbital-histories.json', 'data/lr04-stack.txt',
               'scripts/t7_fixed_phase_l1.py', SELF_REL]
DT_KYR, T_MAX_KYR, T_TABLE_KYR = 0.01, 400.0, 300.0

mcf = t7.mcf
reg = json.loads((ROOT / CFC_REL).read_text())['regimes']['lr04-post-mpt']
ystd = reg['denormalization']['y_std']
mp = json.loads((ROOT / 'public/input/model-parameters.json').read_text())['deepTime']
alpha0 = json.loads((ROOT / 'public/input/astro-reference.json').read_text())['physicalConstants']['earthMoiFactorJ2000']
rate, tau = mp['alphaGiaRateJ2000PerYr'], float(mp['alphaGiaRelaxationKyr'])
art = json.loads((ROOT / 'data/t7-fixed-phase-l1.json').read_text())
tk = np.arange(0.0, T_MAX_KYR, DT_KYR)


def causal_mean(F):
    a = np.exp(-DT_KYR / tau)
    m = np.zeros_like(F)
    m[-1] = F[-1]
    for i in range(len(F) - 2, -1, -1):
        m[i] = a * m[i + 1] + (1 - a) * F[i + 1]
    return m


def alpha_from(L, slope_per_yr):
    k = -rate / slope_per_yr
    return alpha0 - k * (L - L[0]), k


def j2000_slope(L):
    return -(L[1] - L[0]) / (DT_KYR * 1000)   # per year; t is kyr BP


def main():
    t0 = time.time()
    # shipped — the per-line causal filter (createAlphaGiaChannel's laggedL1Terms)
    Lsh = np.zeros_like(tk)
    for c in reg['L1']:
        wt = 2 * np.pi / c['period_kyr'] * tau
        d = 1 + wt * wt
        Hre, Him = wt * wt / d, wt / d
        a, b = c['a'] * Hre - c['b'] * Him, c['a'] * Him + c['b'] * Hre
        w = 2 * np.pi / c['period_kyr']
        Lsh += a * np.cos(w * tk) + b * np.sin(w * tk)
    Lsh *= ystd
    a_sh, k_sh = alpha_from(Lsh, j2000_slope(Lsh))
    # fixed — the T7 fixed-phase forcing on the model's own histories
    fa = art['results']['post-mpt']['fixed_a_e_eps_esinw']['in_window']
    co, lag = fa['coefficients'], fa['lag_kyr']
    tt = tk + lag
    F = (co[1] * np.interp(tt, t7.T_HIST, t7.MODEL['e']) + co[2] * np.interp(tt, t7.T_HIST, t7.MODEL['eps_deg'])
         + co[3] * np.interp(tt, t7.T_HIST, t7.MODEL['e_sin_peri']))
    Lfx = F - causal_mean(F)
    a_fx, k_fx = alpha_from(Lfx, j2000_slope(Lfx))
    # lr04 — the record itself
    t_lr, y_lr = mcf.preprocess(t7.ages, t7.vals, window=(0, 1000))
    R = np.interp(tk, t_lr, (y_lr - y_lr.mean()) / y_lr.std())
    Lr = R - causal_mean(R)
    m3 = tk <= 3.0
    slope_lr = -np.polyfit(tk[m3], Lr[m3], 1)[0] / 1000
    a_lr, k_lr = alpha_from(Lr, slope_lr)

    keep = tk <= T_TABLE_KYR
    tables = {}
    for name, arr, k in (('shipped', a_sh, k_sh), ('fixed', a_fx, k_fx), ('lr04', a_lr, k_lr)):
        n30 = int(30 / DT_KYR)
        tables[name] = dict(k=float(k), alpha_peak_kyr_bp=float(tk[:n30][arr[:n30].argmax()]),
                            alpha_minus_alpha0_at={str(T): float(arr[int(T / DT_KYR)] - alpha0) for T in (5, 10, 15, 21, 30, 50)},
                            t_kyr_bp=[round(float(x), 2) for x in tk[keep]], alpha=[float(x) for x in arr[keep]])
        print(f"{name:8s} k {k:.3e} · peak {tables[name]['alpha_peak_kyr_bp']:.1f} kyr BP · α−α₀ at 5/10/21 kyr "
              + ' '.join(f"{tables[name]['alpha_minus_alpha0_at'][s]:+.2e}" for s in ('5', '10', '21')))
    if '--write' in sys.argv:
        out = dict(_description=__doc__.strip(),
                   config=dict(alpha0=alpha0, rate_per_yr=rate, tau_kyr=tau, dt_kyr=DT_KYR, table_max_kyr=T_TABLE_KYR,
                               fixed_lag_kyr=lag, fixed_coefficients=co, lr04_slope_anchor='linear fit of the filtered proxy over 0–3 kyr BP'),
                   tables=tables,
                   meta=dict(script=SELF_REL, runtime_sec=time.time() - t0, environment=dict(python=platform.python_version(), numpy=np.__version__)),
                   inputs=build_inputs_block(f'python3 {SELF_REL} --write', INPUT_FILES))
        (ROOT / OUT_REL).write_text(json.dumps(out) + '\n')
        print(f'wrote {OUT_REL}')


if __name__ == '__main__':
    main()

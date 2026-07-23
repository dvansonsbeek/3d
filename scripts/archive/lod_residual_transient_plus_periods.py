"""
[ARCHIVED 2026-07-23 — pre-joint-world research script. Conclusions are
recorded in docs/104, TODO.md and the data/ JSON artifacts. Since the
joint-world flip (USNO 86400.0014, deltaTStart 56.05, resonator default-ON,
impulse-consistent episode −1600→+1600), reruns against current production
give DIFFERENT numbers: the shipped 4-flag coefficients changed and the
runtime includes the resonator (set DT_RESONATOR_DISABLED=1 for pre-flip
runtime semantics; exact reproduction needs the commit noted in git log).
See scripts/archive/README-resonator-2026-07.md]

Transient-first decomposition: model the millennial swing as a ONE-TIME empirical
component, subtract it, then scan the remainder for periodic lattice content.

Context (2026-07-22): the post-4-flag production residual is one full aperiodic
swing — Earth fast (day ~2–3.6 ms short of trend) through antiquity, turnaround
~600–1000 CE (centred ~900; the "990 bump" is its integral), slow overshoot
1000–1800, converged by the instrumental era. Constants, secular rates, and
single lattice harmonics (incl. H/46) are all excluded as its explanation;
identification: aperiodic remainder of the Stephenson-Morrison-Hohenkerk
~1,500-yr ±3–4 ms core-mantle fluctuation.

Method:
  1. Residual R(y) = Stephenson spline − (deltaTStart + production ΔT incl.
     4-flag stack), on a 10-yr grid −720..2016 — computed via a Node bridge so
     the H/5 kinematic term and the exact shipped stack are included (the
     python-family simplified ΔT lacks them).
  2. TRANSIENT model T(y) = Gaussian-smoothed R (σ = 800 yr, reflect-padded).
     Transfer function exp(−2π²σ²/P²): at Bond 1,466 yr attenuation ≈ 0.3 %,
     at 2,430 yr ≈ 12 %, at 7,300 yr ≈ 79 % retained — the smoother models
     ONLY the >3-kyr swing and cannot absorb sub-2-kyr periodic signal.
  3. Remainder R₂ = R − T: check the drift is gone (linear slope ≈ 0), then
     scan integer divisors n (periods ~0.9–5.4 kyr) with cos/sin fits, rank
     by ΔR² — what periodic content was the transient masking?
  4. Controls: the 8H/2024 ≈ 1,326-yr phantom (anchor shadow price) should
     SURVIVE transient removal (it is not transient-shaped); Bond-region
     content should stay near zero (already subtracted). σ ∈ {600, 800, 1000}
     robustness.

The transient here is EMPIRICAL (non-parametric) — a research decomposition,
not a shippable component. If a clean new period emerges, the follow-up is a
joint parametric transient + stack refit.

Output: data/deltaT-transient-plus-periods.json
Run:    python3 scripts/lod_residual_transient_plus_periods.py
"""

import json
import math
import subprocess
import sys
from pathlib import Path
import numpy as np

REPO = Path('/home/dennis/code/3d')
OUT_PATH = REPO / 'data' / 'deltaT-transient-plus-periods.json'
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


def load_production_residual():
    r = subprocess.run(['node', '-e', NODE_DUMP], capture_output=True, text=True,
                       cwd=str(REPO), timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f'node bridge failed: {r.stderr[:400]}')
    data = np.array(json.loads(r.stdout), dtype=float)
    return data[:, 0], data[:, 1]


def gauss_smooth(y, step_yr, sigma_yr):
    """Gaussian smoothing with reflect padding (edge-safe)."""
    n = len(y)
    half = int(4 * sigma_yr / step_yr)
    pad = np.concatenate([y[half:0:-1], y, y[-2:-half - 2:-1]])
    k = np.exp(-0.5 * ((np.arange(-half, half + 1) * step_yr) / sigma_yr) ** 2)
    k /= k.sum()
    sm = np.convolve(pad, k, mode='same')
    return sm[half:half + n]


def cyc_fit(years, resid, n_div):
    P = EIGHT_H / n_div
    om = 2.0 * math.pi / P
    X = np.column_stack([np.ones_like(years), np.cos(om * years), np.sin(om * years)])
    beta, *_ = np.linalg.lstsq(X, resid, rcond=None)
    pred = X @ beta
    ss_res = float(np.sum((resid - pred) ** 2))
    ss_tot = float(np.sum((resid - resid.mean()) ** 2))
    return {'n': n_div, 'period_yr': P,
            'amp_s': float(math.hypot(beta[1], beta[2])),
            'phase_deg': float(math.degrees(math.atan2(beta[2], beta[1]))),
            'r2': 1.0 - ss_res / max(ss_tot, 1e-12)}


def main():
    print('=' * 88)
    print('TRANSIENT-FIRST DECOMPOSITION — one-time swing modeled, remainder scanned for periods')
    print('=' * 88)
    years, resid = load_production_residual()
    step = float(years[1] - years[0])
    resid = resid - resid.mean()
    rms0 = float(np.sqrt(np.mean(resid ** 2)))
    print(f'  Production residual: n={len(years)}, RMS = {rms0:.1f} s')
    print()

    # NOTE (window-degeneracy, established 2026-07-22): periods > ~3 kyr are
    # mathematically indistinguishable from the transient itself over a 2.7-kyr
    # record, and the Gaussian smoother only PARTIALLY absorbs 3–6 kyr content
    # (transfer exp(−2π²σ²/P²): 31 % of a 4.7-kyr component leaks into the
    # remainder at σ=800). Any "peak" with P ≳ 2.5 kyr in the remainder is
    # therefore leak/arc-fitting, NOT periodic evidence. The scientifically
    # meaningful scan is the CLEAN band P ≤ 2.5 kyr (n ≥ 1073), reported first.
    results_by_sigma = {}
    for sigma in (600.0, 800.0, 1000.0):
        T = gauss_smooth(resid, step, sigma)
        R2 = resid - T
        slope = float(np.polyfit(years, R2, 1)[0])
        rms_T = float(np.sqrt(np.mean(R2 ** 2)))
        scan_clean = [cyc_fit(years, R2, n) for n in range(1073, 3001, 2)]   # P ≤ 2.5 kyr
        scan_clean.sort(key=lambda r: -r['r2'])
        scan_degen = [cyc_fit(years, R2, n) for n in range(500, 1073, 2)]    # degenerate zone
        scan_degen.sort(key=lambda r: -r['r2'])
        amps = sorted(x['amp_s'] for x in scan_clean)
        band_median = amps[len(amps) // 2]
        phantom = cyc_fit(years, R2, 2024)
        bond_region = cyc_fit(years, R2, 1830)
        results_by_sigma[sigma] = {
            'remainder_rms_s': rms_T, 'remainder_drift_s_per_yr': slope,
            'top10': scan_clean[:10], 'clean_band_median_amp_s': band_median,
            'degenerate_zone_top': scan_degen[:3],
            'phantom_2024': phantom, 'bond_1830': bond_region,
        }
        if sigma == 800.0:
            print(f'── σ = {sigma:.0f} yr (primary) ──')
            print(f'  Remainder RMS = {rms_T:.1f} s (was {rms0:.1f})   residual drift slope = {slope:+.4f} s/yr (target ≈ 0)')
            print(f'  CONTROL phantom 8H/2024 (1,325 yr): amp = {phantom["amp_s"]:.1f} s')
            print(f'  CONTROL Bond region 8H/1830:        amp = {bond_region["amp_s"]:.1f} s  (expect small — subtracted)')
            print()
            print('  CLEAN band (P ≤ 2.5 kyr) top 8 — the only band the record can resolve:')
            print('      n     P (yr)    amp (s)     R²')
            for r in scan_clean[:8]:
                print(f'   {r["n"]:>4}  {r["period_yr"]:8.1f}   {r["amp_s"]:7.1f}      {r["r2"]:.4f}')
            print(f'  Clean-band median amp: {band_median:.1f} s — a real line must clearly exceed this,')
            print('  away from the band edge (edge-hugging peaks = leak tail, not lines).')
            print()
            print('  Degenerate zone (P > 2.5 kyr) top entry — NOT evidence (window-degenerate with transient):')
            r = scan_degen[0]
            print(f'   {r["n"]:>4}  {r["period_yr"]:8.1f}   {r["amp_s"]:7.1f}      {r["r2"]:.4f}')
            print()

    # σ-robustness: which top-5 peaks appear at all three σ (within ±3 % period)?
    def top_periods(sig, k=5):
        return [r['period_yr'] for r in results_by_sigma[sig]['top10'][:k]]
    stable = []
    for p in top_periods(800.0):
        if any(abs(p - q) / p < 0.03 for q in top_periods(600.0)) and \
           any(abs(p - q) / p < 0.03 for q in top_periods(1000.0)):
            stable.append(round(p, 1))
    print(f'── σ-robust peaks (present in top-5 at σ=600/800/1000): {stable if stable else "none"} ──')
    print('=' * 88)

    OUT_PATH.write_text(json.dumps({
        '_meta': {'description': 'Empirical one-time transient (Gaussian-smoothed residual) subtracted; remainder scanned for lattice periods. Production-chain residual via node bridge.',
                  'sigma_primary_yr': 800, 'delta_t_start': DELTA_T_START},
        'residual_rms_s': rms0,
        'by_sigma': {str(int(k)): v for k, v in results_by_sigma.items()},
        'sigma_robust_peak_periods_yr': stable,
    }, indent=2))
    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()

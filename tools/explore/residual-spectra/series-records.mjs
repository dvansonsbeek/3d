// Plan 32 — the long records: series 4 (LR04 − the climate formula, per regime window) and
// series 7 (the model's Earth elements − La2004 over the hybrid's ±10 Myr).
// The residual sign is record − model throughout; the model is the shipped createModel().

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { model } from './series.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** LR04 (Lisiecki & Raymo 2005): {ageKa, d18O, se}[] */
export function loadLr04() {
  const rows = [];
  for (const line of readFileSync(join(ROOT, 'data', 'lr04-stack.txt'), 'utf8').split('\n')) {
    const tok = line.trim().split(/\s+/);
    if (tok.length < 2 || !/^\d/.test(tok[0])) continue;
    const ageKa = Number(tok[0]), d18O = Number(tok[1]), se = Number(tok[2]);
    if (Number.isFinite(ageKa) && Number.isFinite(d18O)) rows.push({ ageKa, d18O, se: Number.isFinite(se) ? se : NaN });
  }
  return rows;
}

/** The climate formula's prediction in ‰ at an age (kyr BP) for one regime block — the fitter's
 *  own composition (scripts/export_climate_formula_browser.py): (intercept + ΣL1 + ΣL2 + ΣL3) ×
 *  y_std + y_mean + trend_slope·t + trend_intercept. L3 steps are smoothstep-free here (a step at
 *  t_kyr with weight beta on the normalised scale, as fitted). */
export function climateFormulaPermil(regime, tKyr) {
  let s = regime.intercept;
  for (const c of regime.L1) { const w = 2 * Math.PI / c.period_kyr; s += c.a * Math.cos(w * tKyr) + c.b * Math.sin(w * tKyr); }
  for (const c of regime.L2 || []) { const w = 2 * Math.PI / c.period_kyr; s += c.a * Math.cos(w * tKyr) + c.b * Math.sin(w * tKyr); }
  for (const st of regime.L3 || []) if (tKyr >= st.t_kyr) s += st.beta;
  const d = regime.denormalization;
  return s * d.y_std + d.y_mean + d.trend_slope * tKyr + d.trend_intercept;
}

/** Series 4 — LR04 − the climate formula, one series per fitted regime window (post-MPT 0–1000 ka,
 *  iNHG–MPT 1000–2700, pre-iNHG 2700–5320) and the full-record fit; irregular (1–5 kyr), unit ‰,
 *  the time axis in kyr BP (negative ages = the past, so the harness's "t" increases with time). */
export function seriesLr04({ regimes = ['lr04-post-mpt', 'lr04-inhg-mpt', 'lr04-pre-inhg', 'lr04-full'] } = {}) {
  const coeffs = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'climate-formula-coefficients.json'), 'utf8'));
  const lr04 = loadLr04();
  return regimes.map((key) => {
    const r = coeffs.regimes[key];
    const [k0, k1] = r.window_kyr;
    const rows = lr04.filter((x) => x.ageKa >= k0 && x.ageKa <= k1);
    return {
      id: `lr04-${key.replace('lr04-', '')}`,
      t: rows.map((x) => -x.ageKa), y: rows.map((x) => x.d18O - climateFormulaPermil(r, x.ageKa)), w: rows.map(() => 1),
      meta: { record: 'LR04 benthic δ¹⁸O stack (Lisiecki & Raymo 2005), data/lr04-stack.txt', model: `the climate formula's regime "${key}" (28 L1 lines + trend${(r.L3 || []).length ? ' + L3 steps' : ''}), public/input/climate-formula-coefficients.json`, unit: '‰', cadence: '1–5 kyr (t in kyr, negative = the past)', windowKyr: r.window_kyr, r2Fit: r.r2 },
    };
  });
}

/** La2004 (Laskar et al. 2004, the 51-Myr-back INSOLA output on disk): {tKyr (≤ 0), e, epsRad, piRad}[] */
export function loadLa2004() {
  const rows = [];
  for (const line of readFileSync(join(ROOT, 'data', 'la2004-earth-51myr-back.asc'), 'utf8').split('\n')) {
    const tok = line.trim().replace(/D([+-]\d\d)/g, 'e$1').split(/\s+/);
    if (tok.length < 4) continue;
    const v = tok.map(Number);
    if (v.every(Number.isFinite)) rows.push({ tKyr: v[0], e: v[1], epsRad: v[2], piRad: v[3] });
  }
  return rows;
}

const wrap180 = (d) => ((d + 540) % 360 + 360) % 360 - 180;

/** Series 7 — the model's Earth elements − La2004 over the hybrid obliquity's own domain
 *  (±10 Myr; the past half here, where La2004 runs): the eccentricity (dimensionless, ×1e3 for
 *  readability: ‰), the obliquity (″) and the longitude of perihelion of date (″, wrapped), at
 *  `stepKyr` cadence. */
export function seriesLa2004({ fromKyr = -10000, toKyr = 0, stepKyr = 1 } = {}) {
  const m = model();
  const la = loadLa2004().filter((r) => r.tKyr >= fromKyr && r.tKyr <= toKyr && Math.round(r.tKyr) % stepKyr === 0);
  const dom = m.earth.obliquityHybridDomainYears;
  const t = [], de = [], deps = [], dpi = [];
  for (const r of la) {
    const year = 2000 + r.tKyr * 1000;
    if (dom && (year < dom[0] || year > dom[1])) continue;
    const e = m.earth.eccentricity(year), eps = m.earth.obliquityDeg(year), pi = m.earth.perihelionLongitudeDeg(year);
    if (![e, eps, pi].every(Number.isFinite)) continue;
    t.push(r.tKyr);
    de.push((r.e - e) * 1e3);
    deps.push((r.epsRad * 180 / Math.PI - eps) * 3600);
    dpi.push(wrap180(r.piRad * 180 / Math.PI - pi) * 3600);
  }
  const meta = (what, unit) => ({ record: 'La2004 (Laskar et al. 2004), data/la2004-earth-51myr-back.asc', model: what, unit, cadence: `${stepKyr} kyr (t in kyr, negative = the past)`, span: [t[0], t[t.length - 1]] });
  return [
    { id: 'la2004-eccentricity', t, y: de, w: t.map(() => 1), meta: meta('earth.eccentricity (the hybrid series)', '‰ of e (×1e3)') },
    { id: 'la2004-obliquity', t, y: deps, w: t.map(() => 1), meta: meta('earth.obliquityDeg (the hybrid integration)', '″') },
    { id: 'la2004-perihelion', t, y: dpi, w: t.map(() => 1), meta: meta('earth.perihelionLongitudeDeg (of date) vs La2004 ϖ from the moving equinox', '″') },
  ];
}

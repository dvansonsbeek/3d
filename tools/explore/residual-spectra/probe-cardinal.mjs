// Plan 32 — the cardinal instants' residual split between the two tiers it is made of: at each
// Horizons crossing instant, (i) how far the model's APPARENT Sun stands from the target longitude
// (the certified Sun's own error, series 5 sampled yearly, converted to minutes by the Sun's rate),
// and (ii) the rest — the cardinal tier's instant against the model's own apparent-Sun crossing.
// The 2.715-yr line (the barycentre term's yearly alias) and the 6.399 / 6.424-yr doublet are
// attributed to whichever tier carries them, by a direct cos/sin fit at those periods and at the
// other named aliases. The Sun moves 2.4645″ per minute of time at the mean rate (0.9856°/day).
//   node tools/explore/residual-spectra/probe-cardinal.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { lsFitAtOmega } from './spectrum.mjs';
import { model } from './series.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { J2000_JD } = require('@essrt/physics/constants/units');
const wrap180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const yearOf = (jd) => 2000 + (jd - J2000_JD) / 365.25;
const m = model();
const rows = JSON.parse(readFileSync(join(ROOT, 'data', 'jpl-sun-ecliptic-longitude-tt.json'), 'utf8')).rows;
const dTs = (jd) => m.eclipse.deltaTSecondsAtJD(jd);
const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
const BRIDGE_DAYS = m.eclipse.ttBridgeSeconds / 86400;
const ttOf = (jdUT) => { const jb = jdUT + BRIDGE_DAYS; return jb + dTs(jb) / 86400; };
const TARGETS = { VE: 0, SS: 90, AE: 180, WS: 270 };
function horizonsCrossingJD(i, target) {
  const P = [rows[i - 1], rows[i], rows[i + 1], rows[i + 2]];
  const t0 = P[0][0], x = P.map((p) => p[0] - t0), base = P[1][1];
  const yv = P.map((p) => base + wrap180(p[1] - base)), tgt = base + wrap180(target - base);
  const L = (t) => { let s = 0; for (let j = 0; j < 4; j++) { let l = yv[j]; for (let k = 0; k < 4; k++) if (k !== j) l *= (t - x[k]) / (x[j] - x[k]); s += l; } return s; };
  const dL = (t, h = 1e-3) => (L(t + h) - L(t - h)) / (2 * h);
  let t = x[1] + (tgt - yv[1]) / (yv[2] - yv[1]) * (x[2] - x[1]);
  for (let k = 0; k < 8; k++) { const f = L(t) - tgt; t -= f / dL(t); if (Math.abs(f) < 1e-10) break; }
  return t0 + t;
}
const RATE_ARCSEC_PER_MIN = 360 * 3600 / (365.2422 * 1440);
const per = Object.fromEntries(Object.keys(TARGETS).map((k) => [k, { t: [], total: [], app: [], tier: [] }]));
for (let i = 1; i < rows.length - 2; i++) {
  const a = rows[i][1], b = rows[i + 1][1];
  for (const [type, target] of Object.entries(TARGETS)) {
    const da = wrap180(a - target), db = wrap180(b - target);
    if (!(da < 0 && db >= 0 && (db - da) < 40)) continue;
    const jdH = horizonsCrossingJD(i, target), yH = yearOf(jdH);
    const year = Math.round(yH - 0.5 + (target / 360));
    let jdM = m.cardinal.jd(year, type), dMin = (ttOf(jdM) - jdH) * 1440;
    if (Math.abs(dMin) > 60 * 1440) { jdM = m.cardinal.jd(year + (dMin < 0 ? 1 : -1), type); dMin = (ttOf(jdM) - jdH) * 1440; }
    // the certified Sun at the Horizons instant: its longitude excess over the target, as minutes
    // of time (positive excess = the model's own crossing was EARLIER)
    const excessArcsec = wrap180(m.eclipse.sunApparentLonDegAtJD(utForTT(jdH)) - target) * 3600;
    const appMin = -excessArcsec / RATE_ARCSEC_PER_MIN;
    const total = -dMin;   // record − model, as the series carries it
    per[type].t.push(yH); per[type].total.push(total); per[type].app.push(-appMin); per[type].tier.push(total + appMin);
  }
}
const PERIODS = [['D alias (2.7154 yr)', 2.71536], ['doublet a (6.3988)', 6.3988], ['doublet b (6.4245)', 6.4245], ['2V − 3E alias (3.983)', 3.9834], ['3V − 5E (8.102)', 8.1020], ['D − M′ alias (8.847)', 8.8474], ['J (11.862)', 11.862], ['Ω (18.613)', 18.613]];
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
console.log('The cardinal residual (record − model, minutes) split into the certified Sun\'s part and the cardinal tier\'s part');
for (const [type, s] of Object.entries(per)) {
  console.log(`\n== ${type}  n ${s.t.length}  rms total ${rms(s.total).toFixed(3)} · apparent-Sun part ${rms(s.app).toFixed(3)} · tier part ${rms(s.tier).toFixed(3)} min`);
  console.log(`   ${'period'.padEnd(26)} total     Sun part   tier part   (amplitudes, minutes)`);
  const w = s.t.map(() => 1);
  for (const [label, P] of PERIODS) {
    const f = (y) => lsFitAtOmega(s.t, y, w, 2 * Math.PI / P).amplitude;
    console.log(`   ${label.padEnd(26)} ${f(s.total).toFixed(3).padStart(6)}    ${f(s.app).toFixed(3).padStart(6)}     ${f(s.tier).toFixed(3).padStart(6)}`);
  }
}

// Plan 32 — is the cardinal series' 2.715-yr line the swap gate's OWN interpolation error? The gate
// finds each Horizons crossing with a Lagrange cubic through four 10-day rows; Horizons' longitude
// carries the Earth–Moon barycentre wobble (6.44″, 29.53 d), which a cubic across 30 days follows
// to only ~1–3″, in step with the Moon's phase — and the Moon's phase at a cardinal instant advances
// 0.3683 cycles a year: the 2.715-yr alias. Test: the same crossings from a quintic through six rows
// and from a cubic on the longitude with the model's OWN barycentre term removed first (the wobble
// taken out before interpolating, put back analytically at the instant); the line must fall.
//   node tools/explore/residual-spectra/probe-cardinal-interp.mjs

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
const RATE = 360 * 3600 / (365.2422 * 1440);   // ″ per minute of time
const TARGETS = { VE: 0, SS: 90, AE: 180, WS: 270 };

/** A Lagrange interpolant through rows i−(n/2−1) … i+n/2 of (jd, value), with the longitude unwrapped. */
function crossing(i, target, n, valueOf) {
  const lo = i - (n / 2 - 1), P = [];
  for (let k = 0; k < n; k++) P.push([rows[lo + k][0], valueOf(lo + k)]);
  const t0 = P[0][0], x = P.map((p) => p[0] - t0), base = P[n / 2 - 1][1];
  const yv = P.map((p) => base + wrap180(p[1] - base)), tgt = base + wrap180(target - base);
  const L = (t) => { let s = 0; for (let j = 0; j < n; j++) { let l = yv[j]; for (let k = 0; k < n; k++) if (k !== j) l *= (t - x[k]) / (x[j] - x[k]); s += l; } return s; };
  const dL = (t, h = 1e-3) => (L(t + h) - L(t - h)) / (2 * h);
  const a = n / 2 - 1;
  let t = x[a] + (tgt - yv[a]) / (yv[a + 1] - yv[a]) * (x[a + 1] - x[a]);
  for (let k = 0; k < 12; k++) { const f = L(t) - tgt; t -= f / dL(t); if (Math.abs(f) < 1e-10) break; }
  return t0 + t;
}
// the model's own barycentre wobble at a row (the apparent Sun's lunar term is the difference
// between its geocentric and its barycentre-free longitude — read from the model as the wobble
// the certified Sun carries); here approximated by the classical term 6.44″ sin D with D the mean
// elongation (Meeus ch. 47), ample for taking a 6″ oscillation out of the interpolation
const meanD = (jdTT) => { const T = (jdTT - 2451545) / 36525; return (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * Math.PI / 180; };
const wobbleDeg = (jdTT) => 6.44 / 3600 * Math.sin(meanD(jdTT));
const lonRow = (k) => rows[k][1];
const lonRowNoWobble = (k) => rows[k][1] - wobbleDeg(rows[k][0]);

const methods = {
  'cubic, 4 rows (the gate)': (i, target) => crossing(i, target, 4, lonRow),
  'quintic, 6 rows': (i, target) => crossing(i, target, 6, lonRow),
  'cubic on the de-wobbled longitude': (i, target) => {
    // the crossing of (longitude − wobble) at (target − wobble(t)): iterate the target once
    let jd = crossing(i, target, 4, lonRowNoWobble);
    for (let k = 0; k < 3; k++) jd = crossing(i, target - wobbleDeg(jd), 4, lonRowNoWobble);
    return jd;
  },
};
const series = {};
for (const name of Object.keys(methods)) series[name] = { t: [], sunPart: [] };
for (let i = 2; i < rows.length - 3; i++) {
  const a = rows[i][1], b = rows[i + 1][1];
  for (const [type, target] of Object.entries(TARGETS)) {
    if (type !== 'VE') continue;   // one type suffices for the attribution
    const da = wrap180(a - target), db = wrap180(b - target);
    if (!(da < 0 && db >= 0 && (db - da) < 40)) continue;
    for (const [name, fn] of Object.entries(methods)) {
      const jdH = fn(i, target);
      const excess = wrap180(m.eclipse.sunApparentLonDegAtJD(utForTT(jdH)) - target) * 3600;
      series[name].t.push(yearOf(jdH)); series[name].sunPart.push(excess / RATE);   // minutes
    }
  }
}
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
console.log('VE: the model\'s apparent Sun at the Horizons crossing instant (minutes), by the crossing method');
console.log(`   ${'method'.padEnd(36)} n     rms      2.715 yr   6.3988   6.4245   3.983   8.847 yr`);
for (const [name, s] of Object.entries(series)) {
  const w = s.t.map(() => 1), A = (P) => lsFitAtOmega(s.t, s.sunPart, w, 2 * Math.PI / P).amplitude.toFixed(3);
  console.log(`   ${name.padEnd(36)} ${s.t.length}  ${rms(s.sunPart).toFixed(3)}   ${A(2.71536).padStart(6)}    ${A(6.3988).padStart(6)}   ${A(6.4245).padStart(6)}  ${A(3.9834).padStart(6)}  ${A(8.8474).padStart(6)}`);
}

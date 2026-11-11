// Plan 32 — series 5 (the certified Sun − JPL Horizons) and 8 (the cardinal instants − Horizons),
// built exactly as the swap gate builds them (tools/verify/sun-vs-horizons.js: the model's apparent
// longitude at the UT whose model-TT is the Horizons row's TT; the model's cardinal instant for the
// calendar year of the Horizons crossing, on the finder axis UT + bridge + curve). Record − model.
// Two bands for the Sun: the long periods on yearly means over the whole span, the short periods
// (0.3–5 yr: the planetary synodic terms) at the cache's own cadence in two disjoint 300-yr windows.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { model } from './series.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { J2000_JD } = require('@essrt/physics/constants/units');
const { horizonsCrossingJD: crossingOfRows } = require(join(ROOT, 'tools', 'lib', 'horizons-crossing.js'));
const wrap180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const yearOf = (jd) => 2000 + (jd - J2000_JD) / 365.25;

let _cache = null;
function cache() { if (_cache === null) _cache = JSON.parse(readFileSync(join(ROOT, 'data', 'jpl-sun-ecliptic-longitude-tt.json'), 'utf8')); return _cache; }

/** The Sun residual at every Horizons row: {t: year, y: arcsec (Horizons − model), jd}. */
export function sunResidualRows() {
  const m = model();
  const dTs = (jd) => m.eclipse.deltaTSecondsAtJD(jd);
  const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
  const out = [];
  for (const [jdTT, lonH] of cache().rows) {
    const d = wrap180(lonH - m.eclipse.sunApparentLonDegAtJD(utForTT(jdTT))) * 3600;
    out.push({ jd: jdTT, t: yearOf(jdTT), y: d });
  }
  return out;
}

/** Series 5a — the Sun residual as yearly means over the whole span (the long periods). */
export function seriesSunYearly(rows = sunResidualRows()) {
  const bins = new Map();
  for (const r of rows) { const y = Math.floor(r.t); if (!bins.has(y)) bins.set(y, []); bins.get(y).push(r.y); }
  const years = [...bins.keys()].sort((a, b) => a - b);
  const meta = cache().meta;
  return { id: 'sun-horizons-yearly', t: years.map((y) => y + 0.5), y: years.map((y) => { const a = bins.get(y); return a.reduce((s, v) => s + v, 0) / a.length; }), w: years.map((y) => bins.get(y).length), meta: { record: `JPL Horizons apparent geocentric ecliptic longitude of the Sun (TT), data/jpl-sun-ecliptic-longitude-tt.json (${meta.stepDays}-d steps, ${meta.yearFrom}…${meta.yearTo})`, model: 'eclipse.sunApparentLonDegAtJD at the UT whose model-TT is the row (the swap gate\'s recipe)', unit: '″ (yearly mean)', cadence: '1 yr', span: [years[0], years[years.length - 1]] } };
}

/** Series 5b — the Sun residual at the cache's own cadence inside a window (the short periods). */
export function seriesSunWindow(rows, yearFrom, yearTo) {
  const sel = rows.filter((r) => r.t >= yearFrom && r.t < yearTo);
  return { id: `sun-horizons-${yearFrom}..${yearTo}`, t: sel.map((r) => r.t), y: sel.map((r) => r.y), w: sel.map(() => 1), meta: { record: 'JPL Horizons apparent Sun (TT)', model: 'eclipse.sunApparentLonDegAtJD (the swap gate\'s recipe)', unit: '″', cadence: `${cache().meta.stepDays} d`, span: [yearFrom, yearTo] } };
}

/** Series 8 — the cardinal instants, Horizons crossing − the model's instant, minutes, one series
 *  per type (VE, SS, AE, WS), the gate's own crossing finder (a Lagrange cubic through four rows on
 *  the longitude with the barycentre wobble removed — ONE home tools/lib/horizons-crossing.js). */
export function seriesCardinal() {
  const m = model();
  const rows = cache().rows;
  const dTs = (jd) => m.eclipse.deltaTSecondsAtJD(jd);
  const BRIDGE_DAYS = m.eclipse.ttBridgeSeconds / 86400;
  const TARGETS = { VE: 0, SS: 90, AE: 180, WS: 270 };
  const horizonsCrossingJD = (i, target) => crossingOfRows(rows, i, target, 4);
  const ttOf = (jdUT) => { const jb = jdUT + BRIDGE_DAYS; return jb + dTs(jb) / 86400; };
  const per = Object.fromEntries(Object.keys(TARGETS).map((k) => [k, { t: [], y: [] }]));
  for (let i = 1; i < rows.length - 2; i++) {
    const a = rows[i][1], b = rows[i + 1][1];
    for (const [type, target] of Object.entries(TARGETS)) {
      const da = wrap180(a - target), db = wrap180(b - target);
      if (!(da < 0 && db >= 0 && (db - da) < 40)) continue;
      const jdH = horizonsCrossingJD(i, target), yH = yearOf(jdH);
      const year = Math.round(yH - 0.5 + (target / 360));
      let dMin = (ttOf(m.cardinal.jd(year, type)) - jdH) * 1440;
      if (Math.abs(dMin) > 60 * 1440) { const alt = m.cardinal.jd(year + (dMin < 0 ? 1 : -1), type); dMin = (ttOf(alt) - jdH) * 1440; }
      per[type].t.push(yH); per[type].y.push(-dMin);   // record − model
    }
  }
  return Object.entries(per).map(([type, s]) => ({ id: `cardinal-${type}-horizons`, t: s.t, y: s.y, w: s.t.map(() => 1), meta: { record: `Horizons ${type} crossings (the gate's cubic through the 10-d rows, the barycentre wobble removed first)`, model: 'cardinal.jd(year, type) on the finder axis UT + bridge + curve', unit: 'min', cadence: '1 yr', span: [s.t[0], s.t[s.t.length - 1]] } }));
}

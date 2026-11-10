// Plan 32 — series 6: the NASA Five Millennium Canon's lunar eclipses − the model's own finder
// (eclipse.findLunarInRange over −1999…+3000), matched as the recall generator matches them
// (tools/verify/lunar-canon-recall.js: the nearest unused canon event within 180 min on the UT
// axis); the residual is the canon's UT instant − the model's, in minutes. A line here would be a
// lunar-argument term (the evection/variation class) or a ΔT term.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { model } from './series.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function seriesLunarCanon({ startYear = -1999, endYear = 3000, matchMin = 180 } = {}) {
  const m = model();
  const canon = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'lunar-eclipses-nasa.json'), 'utf8'));
  const events = [];
  for (let yr = startYear; yr < endYear; yr += 100) {
    const a = m.time.jdFromYear(yr), b = m.time.jdFromYear(Math.min(yr + 100, endYear + 1));
    events.push(...m.eclipse.findLunarInRange(a, b));
  }
  events.sort((x, y) => x.jd - y.jd);
  const jdStart = m.time.jdFromYear(startYear), jdEnd = m.time.jdFromYear(endYear + 1);
  const nasa = canon.entries.filter((e) => e.jd >= jdStart && e.jd <= jdEnd);
  const used = new Uint8Array(nasa.length);
  const bsearch = (jd) => { let lo = 0, hi = nasa.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (nasa[mid].jd < jd) lo = mid + 1; else hi = mid; } return lo; };
  const t = [], y = [], types = [];
  for (const ev of events) {
    const i = bsearch(ev.jd);
    let best = -1, bestD = Infinity;
    for (let k = -1; k <= 1; k++) { const j = i + k; if (j < 0 || j >= nasa.length || used[j]) continue; const d = Math.abs(nasa[j].jd - ev.jd); if (d < bestD) { bestD = d; best = j; } }
    if (best >= 0 && bestD * 1440 <= matchMin) {
      used[best] = 1;
      t.push(2000 + (ev.jd - 2451545) / 365.25);
      y.push((nasa[best].jd - ev.jd) * 1440);
      types.push(nasa[best].type);
    }
  }
  return { id: 'lunar-canon-timing', t, y, w: t.map(() => 1), meta: { record: 'NASA Five Millennium Canon of lunar eclipses (public/input/lunar-eclipses-nasa.json), UT instants', model: 'eclipse.findLunarInRange (the model\'s own finder on the UT axis), matched within 180 min as the recall generator does', unit: 'min (canon − model)', cadence: 'irregular (~2.4 per year)', n: t.length, modelEvents: events.length, canonEvents: nasa.length, span: [startYear, endYear] } };
}

// Plan 32 — the lunar canon's 3.617-yr line read as what its frequency says it is: 8 cycles per
// 358 lunations = the 12th harmonic of F under full-moon sampling = the SAWTOOTH an eclipse's
// distance from the node traces from season to season. Test: the dynamical-time residual
// (canon's greatest eclipse − the model's instant) against u, the node distance of the mean argument
// of latitude at the canon's TD instant (u = F mod 180° in ±90°), and against sin 2F — the form of
// "opposition in longitude versus least distance from the shadow axis" (∝ β·β̇, the same sign at both
// nodes, which is why gamma, whose sign flips between the nodes, shows r = 0). Then the spectrum of
// what is left: the lunar theory's own difference.
//   node tools/explore/residual-spectra/probe-lunar-node.mjs [out.json]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { analyseSeries } from './spectrum.mjs';
import { model } from './series.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = process.argv[2] || null;
const m = model();
const canon = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'lunar-eclipses-nasa.json'), 'utf8'));
const events = [];
for (let yr = -1999; yr < 3000; yr += 100) events.push(...m.eclipse.findLunarInRange(m.time.jdFromYear(yr), m.time.jdFromYear(Math.min(yr + 100, 3001))));
events.sort((x, y) => x.jd - y.jd);
const jdStart = m.time.jdFromYear(-1999), jdEnd = m.time.jdFromYear(3001);
const nasa = canon.entries.filter((e) => e.jd >= jdStart && e.jd <= jdEnd);
const used = new Uint8Array(nasa.length);
const bsearch = (jd) => { let lo = 0, hi = nasa.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (nasa[mid].jd < jd) lo = mid + 1; else hi = mid; } return lo; };
const BRIDGE_DAYS = m.eclipse.ttBridgeSeconds / 86400;
const ttOf = (jdUT) => { const jb = jdUT + BRIDGE_DAYS; return jb + m.eclipse.deltaTSecondsAtJD(jb) / 86400; };
/** The Moon's mean argument of latitude, degrees (Meeus ch. 47; the canon's own class of argument). */
const meanF = (jdTD) => { const T = (jdTD - 2451545) / 36525; return 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000; };
const pairs = [];
for (const ev of events) {
  const i = bsearch(ev.jd); let best = -1, bestD = Infinity;
  for (let k = -1; k <= 1; k++) { const j = i + k; if (j < 0 || j >= nasa.length || used[j]) continue; const d = Math.abs(nasa[j].jd - ev.jd); if (d < bestD) { bestD = d; best = j; } }
  if (best >= 0 && bestD * 1440 <= 180) {
    used[best] = 1; const n = nasa[best];
    const F = meanF(n.jd_TD), u = ((((F + 90) % 180) + 180) % 180) - 90;
    pairs.push({ t: 2000 + (ev.jd - 2451545) / 365.25, dTD: (n.jd_TD - ttOf(ev.jd)) * 1440, u, sin2F: Math.sin(2 * F * Math.PI / 180), gamma: n.gamma, type: n.type });
  }
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => { const mu = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - mu) * (v - mu), 0) / a.length); };
const regress = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); } const slope = sxy / sxx; return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy) }; };
const d = pairs.map((p) => p.dTD), u = pairs.map((p) => p.u), s2 = pairs.map((p) => p.sin2F);
const ru = regress(u, d), rs = regress(s2, d);
console.log(`${pairs.length} matched eclipses; dynamical-time residual (canon − model) ${mean(d).toFixed(2)} ± ${sd(d).toFixed(2)} min; node distance u spans ${Math.min(...u).toFixed(1)}° … ${Math.max(...u).toFixed(1)}°`);
console.log(`against the node distance u: slope ${ru.slope.toFixed(4)} min/deg, r = ${ru.r.toFixed(4)}  →  residual after it ${sd(d.map((v, i) => v - (ru.intercept + ru.slope * u[i]))).toFixed(3)} min`);
console.log(`against sin 2F:              slope ${rs.slope.toFixed(3)} min, r = ${rs.r.toFixed(4)}  →  residual after it ${sd(d.map((v, i) => v - (rs.intercept + rs.slope * s2[i]))).toFixed(3)} min`);
// by eclipse type (the definition difference should not depend on it; a lunar-theory term would not either)
for (const ty of [...new Set(pairs.map((p) => p.type))]) { const sel = pairs.filter((p) => p.type === ty); const r = regress(sel.map((p) => p.u), sel.map((p) => p.dTD)); console.log(`   ${ty.padEnd(10)} n ${String(sel.length).padStart(5)}  slope ${r.slope.toFixed(4)} min/deg  r ${r.r.toFixed(4)}`); }
const corrected = d.map((v, i) => v - (rs.intercept + rs.slope * s2[i]));
const results = {};
for (const [id, y] of [['lunar-canon-TD-node-term-removed', corrected]]) {
  const a = analyseSeries({ t: pairs.map((p) => p.t), y, w: pairs.map(() => 1), surrogates: 1000, label: id, oversample: 4, fMaxFactor: Math.min(1, (1 / 1) / (0.5 / 0.41)) });
  results[id] = a;
  console.log(`\n== ${id}  n ${a.n}  rms ${a.rms.toFixed(3)} min  AR(1) ρ ${a.ar1.rho.toFixed(3)}; floor p99 ${a.floor.p99.toFixed(4)} (AR1) ${a.floorWhite.p99.toFixed(4)} (white); ${a.candidates.length} line(s) above the AR(1) floor`);
  for (const c of (a.candidates.length ? a.candidates : a.peaks).slice(0, 12)) console.log(`   ${c.period.toFixed(4).padStart(10)} yr  amp ${c.amplitude.toFixed(3)} min  power/AR1 ${(c.power / a.floor.p99).toFixed(2)}  halves ${c.amplitudeFirstHalf.toFixed(2)} / ${c.amplitudeSecondHalf.toFixed(2)}  ${c.standsInBothHalves && c.standsInInterior ? 'stands' : 'unstable'}`);
}
if (out) { writeFileSync(out, JSON.stringify({ n: pairs.length, sdTD: sd(d), regressionOnNodeDistance: ru, regressionOnSin2F: rs, sdAfterSin2F: sd(corrected), analyses: results })); console.log(`\nwritten ${out}`); }

// FQ-7 ANALYSIS — the Sun-side dust census (pre-publish sweep).
//
// QUESTION: after the E4/E5 framework Sun + the v3 70-term planetary
// completion, the modern-window Sun−JPL scatter is 0.95″. Is what
// remains capturable structure (deeper completion terms / EoC residual
// harmonics) or floor? The Sun drives elongation → centerlines/Babylon,
// so this is the one axis where the eclipse gates could still move.
//
// Shipped Sun (certified-chain convention, besselian line 128):
//   sunLonDegAtJD(jb) − sunPlanetaryCompletionDeg(T_TT)
// with the completion reconstructed exactly as model.js wires it
// (embWobbleArcsec + framework carrier rates — lines 968–987).
//
// Usage: node tools/explore/fq7-sun-dust-census.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');
const { createSunPlanetaryCompletion } = require('@essrt/physics/eclipse/sun-planetary-completion');

const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

// completion, wired exactly as model.js does
const H = C.foundational.holisticyearLength;
const meanSolarYearDays = Math.round(C.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
const moonDistanceKm = C.moonReference.moonDistance;
const MASS_RATIO_EARTH_MOON = C.physicalConstants.MASS_RATIO_EARTH_MOON;
const currentAUDistance = C.physicalConstants.currentAUDistance;
const embWobbleArcsec = (moonDistanceKm / (MASS_RATIO_EARTH_MOON + 1) / currentAUDistance) * (648000 / Math.PI);
const degPerCyOf = (cpd) => 360 * 36525 * cpd;
const meanSiderealYearDays = C.yearLengthRef.siderealYear;
const carrierRatesDegPerCy = {
  planets: [
    degPerCyOf(1 / C.planetOrbitalElements.mercury.solarYearInput),
    degPerCyOf(1 / C.planetOrbitalElements.venus.solarYearInput),
    degPerCyOf(1 / meanSolarYearDays),
    degPerCyOf(1 / C.planetOrbitalElements.mars.solarYearInput),
    degPerCyOf(1 / C.planetOrbitalElements.jupiter.solarYearInput),
    degPerCyOf(1 / C.planetOrbitalElements.saturn.solarYearInput),
  ],
  moonElongation: degPerCyOf(1 / C.moonReference.moonSiderealMonthInput - 1 / meanSiderealYearDays),
};
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy });

// sanity: reproduce the syzygy convention numbers? (control below)
const cache = JSON.parse(readFileSync(new URL('./d2-sun-jpl-cache.local.json', import.meta.url), 'utf8'));
const ts = [], y = [];
for (const [jd, jplLon] of cache.rows) {
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  const dTT = jb - J2000 + model.eclipse.deltaTSecondsAtJD(jb) / 86400 * 0;   // sunLonDegAtJD handles its own axis
  const ship = model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T);
  ts.push(T);
  y.push(wrap(ship - (jplLon - dPsiDeg)) * AS);
}
const n = ts.length;
// remove const+slope+T²
{
  const P = 3;
  const G = Array.from({ length: P }, () => new Float64Array(P));
  const b = new Float64Array(P);
  for (let i = 0; i < n; i++) {
    const r = [1, ts[i], ts[i] * ts[i]];
    for (let k = 0; k < P; k++) { b[k] += r[k] * y[i]; for (let j = k; j < P; j++) G[k][j] += r[k] * r[j]; }
  }
  for (let k = 0; k < P; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < P; c++) {
    for (let r = c + 1; r < P; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < P; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
  }
  const co = new Float64Array(P);
  for (let c = P - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < P; cc++) s -= Gm[c][cc] * co[cc]; co[c] = s / Gm[c][c]; }
  for (let i = 0; i < n; i++) y[i] -= co[0] + ts[i] * (co[1] + ts[i] * co[2]);
}
const sd0 = Math.sqrt(y.reduce((s, v) => s + v * v, 0) / n);
console.log(`shipped Sun − JPL: detrended sd ${sd0.toFixed(3)}″ (n ${n}, cache window)`);

// probe basis: solar-anomaly harmonics (EoC residual class), planetary
// synodic tones + first sidebands (completion-depth class), Moon terms
const PL0 = { Me: 252.250906, V: 181.979801, E: 100.466457, Ma: 355.433000, J: 34.351519, S: 50.077444 };
const PL1 = { Me: 149472.674636, V: 58517.815676, E: 36000.769780, Ma: 19141.696300, J: 3036.302389, S: 1223.511013 };
const ME = [357.5291092, 35999.0502909];
const DD = [297.8501921, 445267.1114034];
/** @type {Array<[string, number, number]>} */
const probes = [];
for (let k = 1; k <= 6; k++) probes.push([`${k}M`, k * ME[0], k * ME[1]]);
probes.push(['D', DD[0], DD[1]], ['2D', 2 * DD[0], 2 * DD[1]]);
const syn = (a, b2) => [PL0[a] - PL0[b2], PL1[a] - PL1[b2]];
for (const [nm, pair] of [['V-E', syn('V', 'E')], ['2(V-E)', [2 * syn('V', 'E')[0], 2 * syn('V', 'E')[1]]], ['3(V-E)', [3 * syn('V', 'E')[0], 3 * syn('V', 'E')[1]]], ['4(V-E)', [4 * syn('V', 'E')[0], 4 * syn('V', 'E')[1]]], ['5(V-E)', [5 * syn('V', 'E')[0], 5 * syn('V', 'E')[1]]], ['E-J', syn('E', 'J')], ['2(E-J)', [2 * syn('E', 'J')[0], 2 * syn('E', 'J')[1]]], ['3(E-J)', [3 * syn('E', 'J')[0], 3 * syn('E', 'J')[1]]], ['E-Ma', syn('E', 'Ma')], ['2(E-Ma)', [2 * syn('E', 'Ma')[0], 2 * syn('E', 'Ma')[1]]], ['3(E-Ma)', [3 * syn('E', 'Ma')[0], 3 * syn('E', 'Ma')[1]]], ['E-S', syn('E', 'S')], ['2(E-S)', [2 * syn('E', 'S')[0], 2 * syn('E', 'S')[1]]], ['Me-E', syn('Me', 'E')], ['2(Me-E)', [2 * syn('Me', 'E')[0], 2 * syn('Me', 'E')[1]]], ['3(Me-E)', [3 * syn('Me', 'E')[0], 3 * syn('Me', 'E')[1]]]]) {
  probes.push([nm, pair[0], pair[1]]);
  probes.push([`${nm}+M`, pair[0] + ME[0], pair[1] + ME[1]], [`${nm}-M`, pair[0] - ME[0], pair[1] - ME[1]]);
  probes.push([`${nm}+2M`, pair[0] + 2 * ME[0], pair[1] + 2 * ME[1]], [`${nm}-2M`, pair[0] - 2 * ME[0], pair[1] - 2 * ME[1]]);
}
const rows = [];
for (const [nm, p0, p1] of probes) {
  if (Math.abs(p1) < 400) continue;   // window floor for this cache span
  let sc = 0, ss = 0, scc = 0, sss = 0, scs = 0;
  for (let i = 0; i < n; i++) {
    const th = (p0 + p1 * ts[i]) * D2R;
    const co = Math.cos(th), si = Math.sin(th), yy = y[i];
    sc += co * yy; ss += si * yy; scc += co * co; sss += si * si; scs += co * si;
  }
  const det = scc * sss - scs * scs;
  rows.push({ nm, amp: Math.hypot((sc * sss - ss * scs) / det, (ss * scc - sc * scs) / det) });
}
rows.sort((a, b) => b.amp - a.amp);
console.log('probe leaders (independent scan, ″):');
for (const r of rows.slice(0, 15)) console.log(`  ${r.nm.padEnd(10)} ${r.amp.toFixed(3)}″`);
const content = Math.sqrt(rows.slice(0, 20).reduce((s, r) => s + r.amp * r.amp / 2, 0));
console.log(`capturable (top-20 sd-equiv): ${content.toFixed(3)}″ of ${sd0.toFixed(3)}″`);

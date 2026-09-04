#!/usr/bin/env node
// THE PAST 1 Myr OF EARTH'S FREE ECCENTRICITY (the lock-onset test; X3
// assessment §4b, plan 02 E-record): time-reversal of the conservative system
// (Newton + 1PN) — negate all velocities at J2000 and integrate forward = the
// past trajectory. If an H/3 lock had been ON at any recent epoch, Earth's e
// must have stayed inside the law's annulus [base'/2, 3base'/2] =
// [0.0077, 0.0231] since onset.
//
// RESULT (2026-09-04): Earth's e was ABOVE the law ceiling for 59.6 % of the
// last 1 Myr (max 0.0571 at ~971 ka, 0.0475 at ~200 ka) and below the floor
// 3.7 % (min 0.0029 at ~374 ka — the MIS 11 node; our engine matches the
// known solution curve and the dated climate modulation). No lock epoch
// exists in the last Myr. SIGN LESSON (recorded): time reversal leaves the
// e-VECTOR invariant ((−v)×(−h) = v×h) — scalar e needs no correction at
// all; perihelion ANGLES from a reversed run need no mirror either (a first
// analysis wrongly negated h and was caught against the known +1157 ″/cy
// J2000 forward rate).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const GM_S = TL.GM_SUN, DAY = 86400;
const YEARS = 1000000, DT = 2, SAMPLE = 200;
const gms = [GM_S, ...NAMES.map(gmOf)], n = gms.length;
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((k) => ({ r: HZ[k].slice(0, 3), v: HZ[k].slice(3, 6).map((x) => -x) }))];
const Mt = gms.reduce((s, x) => s + x, 0), rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mt), vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mt);
const Y0 = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces: [] });
const eOf = (r, v, mu) => { const rn = Math.hypot(...r), h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]; return Math.hypot((v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn, (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn, (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn); };
const LO = TL.eccentricityBase / 2, HI = 3 * TL.eccentricityBase / 2;
const steps = Math.round(YEARS * 365.25 / DT), every = Math.round(SAMPLE * 365.25 / DT);
let above = 0, below = 0, tot = 0, maxE = 0, maxT = 0, minE = 1, minT = 0;
const eEbins = [], eVbins = []; let binMaxE = 0, binMaxV = 0, binMinE = 1;
for (let s = 0; s <= steps; s++) {
  if (s % every === 0) {
    const tKa = s * DT / 365.25 / 1000;   // kyr BEFORE J2000
    const h = sim.helio(3), e = eOf(h.r, h.v, GM_S + gms[3]);
    const hv2 = sim.helio(2), eV = eOf(hv2.r, hv2.v, GM_S + gms[2]);
    tot++; if (e > HI) above++; if (e < LO) below++;
    if (e > maxE) { maxE = e; maxT = tKa; } if (e < minE) { minE = e; minT = tKa; }
    if (e > binMaxE) binMaxE = e; if (eV > binMaxV) binMaxV = eV; if (e < binMinE) binMinE = e;
    if (tot % 500 === 0) { eEbins.push([tKa, binMinE, binMaxE]); eVbins.push(binMaxV); binMaxE = 0; binMaxV = 0; binMinE = 1; }
  }
  sim.step();
}
console.log(`FREE dynamics, the PAST 1 Myr (time-reversed from J2000; annulus [${LO.toFixed(4)}, ${HI.toFixed(4)}]):`);
console.log(`Earth e: min ${minE.toFixed(4)} at ${minT.toFixed(0)} ka, max ${maxE.toFixed(4)} at ${maxT.toFixed(0)} ka`);
console.log(`fraction of the last 1 Myr with e ABOVE the law ceiling: ${(above / tot * 100).toFixed(1)} %; BELOW the floor: ${(below / tot * 100).toFixed(1)} %`);
console.log('\nper-100-kyr bins (ka before J2000): Earth e min–max | Venus e max');
for (const [i, [tKa, lo, hi]] of eEbins.entries()) console.log(`  ${String(Math.round(tKa)).padStart(5)} ka   ${lo.toFixed(4)}–${hi.toFixed(4)}   | V ${eVbins[i].toFixed(4)}`);

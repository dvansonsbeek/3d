#!/usr/bin/env node
// Backward 1-Myr run dumping every planet's eccentricity vector (k,h) at
// 200-yr cadence → ./backward-1myr-z.local.json (gitignored) — the input for
// snap-epoch-search.mjs and retro-episodes.mjs (X3 assessment §4b; plan 02).
// ~9 min at dt = 2 d.
//
// SIGN NOTE (the recorded lesson): time reversal (v → −v) leaves the
// e-vector INVARIANT — (−v)×(−h) = v×h — so the recorded (k,h) ARE the true
// past values, no mirror. A first analysis wrongly negated h; the check
// against Earth's known +1157 ″/cy forward rate at J2000 caught it.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const { writeFileSync } = require('node:fs');
const TL = require(ROOT + 'tools/lib/constants.js');
const GM_S = TL.GM_SUN, DAY = 86400;
const YEARS = 1000000, DT = 2, SAMPLE = 200;
const gms = [GM_S, ...NAMES.map(gmOf)], n = gms.length;
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((k) => ({ r: HZ[k].slice(0, 3), v: HZ[k].slice(3, 6).map((x) => -x) }))];
const Mt = gms.reduce((s, x) => s + x, 0), rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mt), vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mt);
const Y0 = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces: [] });
const zOf = (r, v, mu) => { const rn = Math.hypot(...r), h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]; return [(v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn, (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn]; };
const out = { note: 'time-reversed run; e-vector invariant under reversal — (k,h) are the true past, no mirror', sampleYears: SAMPLE, z: NAMES.map(() => ({ k: [], h: [] })) };
const steps = Math.round(YEARS * 365.25 / DT), every = Math.round(SAMPLE * 365.25 / DT);
for (let s = 0; s <= steps; s++) {
  if (s % every === 0) for (let i = 0; i < NAMES.length; i++) { const h = sim.helio(i + 1), z = zOf(h.r, h.v, GM_S + gms[i + 1]); out.z[i].k.push(+z[0].toFixed(6)); out.z[i].h.push(+z[1].toFixed(6)); }
  sim.step();
}
writeFileSync(new URL('./backward-1myr-z.local.json', import.meta.url), JSON.stringify(out));
console.log('dumped', out.z[0].k.length, 'samples per planet → tools/explore/backward-1myr-z.local.json');

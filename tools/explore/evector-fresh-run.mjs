#!/usr/bin/env node
// WHERE DOES THE SERIES' SECULAR e-VECTOR PART FROM DE441? A FRESH run of the model's own engine
// (the campaign seed, point-mass EMB, NO lunar-quadrupole proxy, NO asteroids — the i3
// configuration) over ±9000 yr: its 1-kyr-boxcar e-vector against (a) the banked series (the
// 20-Myr dump WITH the calibrated lunar-quadrupole proxy and Ceres/Vesta/Pallas) and (b) DE441's
// boxcar'd osculating EMB e-vector (fetch-emb-vectors-de441.mjs).
//
//   node tools/explore/evector-fresh-run.mjs            (~25 s)
//
// MEASURED: the fresh run matches DE441's secular e to 0.01–0.17·10⁻⁵ at every bin inside the run
// (the −7500 row of an 18-kyr run lies OUTSIDE it — dump t is years from J2000 — and is an edge
// artefact, not a boxcar edge), while the point-sampled series sat 0.2–1.2·10⁻⁵ below both with a
// bump near −3500. The cause was NOT the dump's extra ingredients (evector-ingredient-isolation.mjs:
// fresh runs with the lunar proxy and the asteroids match DE441 to 0.01·10⁻⁵): the 20-Myr dump's
// 20,000-d (54.76-yr) POINT sampling aliased ~1e-4 of Jupiter/Venus short-period content into the
// secular band, which the series' 19-sample boxcar cannot remove. The dump's mean=1 running-mean
// sampling closes it (0.49 → 0.078·10⁻⁵ rms, ϖ 56″ → 6″ through the same boxcar). In ϖ the
// point-mass fresh run drifts against DE441 by −0.066″/yr (the lunar quadrupole's share of Earth's
// apsidal motion, absent here); theory against theory throughout.
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, GM_SUN, gmOf } from './j2000-state.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const require = createRequire(join(ROOT, 'package.json'));
const DOH = require(join(ROOT, 'tools/lib/deep-orbital-history.js'));
const REF_FILE = join(HERE, 'emb-vectors-de441.local.json');
if (!existsSync(REF_FILE)) { console.error('missing emb-vectors-de441.local.json — run tools/explore/fetch-emb-vectors-de441.mjs first'); process.exit(2); }
const M = DOH.createOneSourceMovement();
const REF = JSON.parse(readFileSync(REF_FILE, 'utf8'));
const DAY = 86400, R2D = 180 / Math.PI, D2R = Math.PI / 180, J2000 = 2451545.0;
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const gms = [GM_SUN, ...NAMES.map(gmOf)];
function seedY0() { const N = NAMES.length, Y = new Float64Array(6 * (N + 1)); const Mt = gms.reduce((s, g) => s + g, 0); const rB = [0, 0, 0], vB = [0, 0, 0]; NAMES.forEach((p, i) => { for (let c = 0; c < 3; c++) { rB[c] += gms[i + 1] * HZ[p][c] / Mt; vB[c] += gms[i + 1] * HZ[p][3 + c] / Mt; } }); for (let c = 0; c < 3; c++) { Y[c] = -rB[c]; Y[3 * (N + 1) + c] = -vB[c]; } NAMES.forEach((p, i) => { for (let c = 0; c < 3; c++) { Y[3 * (i + 1) + c] = HZ[p][c] - rB[c]; Y[3 * (N + 1) + 3 * (i + 1) + c] = HZ[p][3 + c] - vB[c]; } }); return Y; }
const evec = ({ r, v }, mu) => { const [x, y, z] = r, [vx, vy, vz] = v; const rn = Math.hypot(x, y, z), hx = y * vz - z * vy, hy = z * vx - x * vz, hz = x * vy - y * vx; return [(vy * hz - vz * hy) / mu - x / rn, (vz * hx - vx * hz) / mu - y / rn]; };
function run(dtDays, years) { const sim = makeWH({ gms, Y0: seedY0(), dt: dtDays * DAY, gr: true, order: 2 }); const out = []; const steps = Math.round(10 / Math.abs(dtDays)), nS = Math.round(years * 365.25 / 10); for (let s = 0; s <= nS; s++) { out.push({ t: sim.t / DAY / 365.25, z: evec(sim.helio(3), GM_SUN + gms[3]) }); sim.step(steps); } return out; }
const samples = [...run(-2, 9000).slice(1).reverse(), ...run(2, 9000)];
const ym = new Map(); for (const s of samples) { const y = Math.floor(s.t); const o = ym.get(y) || { q: 0, p: 0, n: 0 }; o.q += s.z[0]; o.p += s.z[1]; o.n++; ym.set(y, o); }
const F = [...ym.entries()].filter(([, o]) => o.n >= 30).sort((a, b) => a[0] - b[0]).map(([y, o]) => ({ y: 2000 + y + 0.5, q: o.q / o.n, p: o.p / o.n }));
const boxcar = (arr) => arr.map((_, i) => { let q = 0, p = 0, n = 0; for (let j = Math.max(0, i - 500); j <= Math.min(arr.length - 1, i + 500); j++) { q += arr[j].q; p += arr[j].p; n++; } return { y: arr[i].y, q: q / n, p: p / n }; });
const FB = boxcar(F);
const GM = 2.9591220828411951e-4 * (1 + 1 / 328900.5596);
const dm = new Map(); for (const row of REF.rows) { const year = 2000 + (row[0] - J2000) / 365.25; const [x, y, z, vx, vy, vz] = row.slice(1); const r = Math.hypot(x, y, z), hx = y * vz - z * vy, hy = z * vx - x * vz, hz = x * vy - y * vx; const q = (vy * hz - vz * hy) / GM - x / r, p = (vz * hx - vx * hz) / GM - y / r; const yb = Math.floor(year); const o = dm.get(yb) || { q: 0, p: 0, n: 0 }; o.q += q; o.p += p; o.n++; dm.set(yb, o); }
const D = boxcar([...dm.entries()].filter(([, o]) => o.n >= 10).sort((a, b) => a[0] - b[0]).map(([yb, o]) => ({ y: yb + 0.5, q: o.q / o.n, p: o.p / o.n })));
const at = (arr, y) => arr.reduce((b, r) => (Math.abs(r.y - y) < Math.abs(b.y - y) ? r : b));
console.log('centre    fresh run e   series e    DE441 e   | Δe (1e-5): fresh−series  fresh−DE441  series−DE441 | Δϖ (″): fresh−series  fresh−DE441  series−DE441');
for (let c = -6500; c <= 7500; c += 1000) {
  const f = at(FB, c), d = at(D, c), s = M.sampleAt(c);
  const ang = s.generalPrecessionLonDeg * D2R, qs = s.eCosPeri * Math.cos(ang) - s.eSinPeri * Math.sin(ang), ps = s.eCosPeri * Math.sin(ang) + s.eSinPeri * Math.cos(ang);
  const eF = Math.hypot(f.q, f.p), eS = Math.hypot(qs, ps), eD = Math.hypot(d.q, d.p), wF = Math.atan2(f.p, f.q) * R2D, wS = Math.atan2(ps, qs) * R2D, wD = Math.atan2(d.p, d.q) * R2D;
  console.log(`${String(c).padStart(6)}    ${eF.toFixed(6)}    ${eS.toFixed(6)}   ${eD.toFixed(6)}  | ${((eF - eS) * 1e5).toFixed(2).padStart(12)}   ${((eF - eD) * 1e5).toFixed(2).padStart(11)}   ${((eS - eD) * 1e5).toFixed(2).padStart(12)}   | ${(w180(wF - wS) * 3600).toFixed(1).padStart(12)}   ${(w180(wF - wD) * 3600).toFixed(1).padStart(11)}   ${(w180(wS - wD) * 3600).toFixed(1).padStart(12)}`);
}

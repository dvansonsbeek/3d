#!/usr/bin/env node
// WHICH DUMP INGREDIENT MOVES EARTH'S SECULAR e-VECTOR? Four fresh ±9000-yr runs of the model's own
// engine from the campaign seed — none / lunar-quadrupole proxy only / asteroids only / both (the
// 20-Myr dump's configuration) — each compared, secular against secular (1-kyr boxcar of yearly
// means), with DE441's EMB e-vector (fetch-emb-vectors-de441.mjs) and with the banked series.
// The proxy and the asteroid bodies are built exactly as in lattice-long-window-test.mjs
// (LUNAR_QUAD_EFFECTIVE_FACTOR, force-only Ceres/Pallas/Vesta appended after the planets).
//
//   node tools/explore/evector-ingredient-isolation.mjs      (~2 min)
//
// Reading: evector-fresh-run.mjs showed the point-mass run matching DE441's secular e to
// 0.1·10⁻⁵ while the series sits up to 1.2·10⁻⁵ below — this names the ingredient.
//
// MEASURED 2026-10-01: NO ingredient is the cause. The dump's full configuration (lunar proxy +
// asteroids) run fresh matches DE441's secular e to 0.00–0.01·10⁻⁵ and ϖ to 1–2″ at every bin over
// ±6500 yr (the asteroids change nothing at this level; the proxy supplies the Moon's −0.066″/yr of
// apsidal motion exactly). The SERIES differs because of the dump's SAMPLING: the 20-Myr run is
// recorded every 20,000 d (54.757 yr) and the osculating e-vector carries ~10⁻⁴ of short-period
// content (the Jupiter 11.86-yr and Venus 8-yr lines, the synodic terms) that this cadence aliases
// into the secular band, where the series' 1-kyr boxcar cannot remove it — the same run decimated to
// the dump's instants and boxcar'd reproduces the series' deviation class (rms Δe 0.75·10⁻⁵ vs the
// series' 0.63, Δϖ 175″ vs 102″; the pattern differs with the sampling phase). Fix class: the dump
// generator (lattice-long-window-test.mjs) should record the osculating elements as running MEANS
// over each 20,000-d interval (or sample ≤ 0.5 yr and average) — a new 20-Myr run and the deep
// cascade; owner decision. Theory against theory, but the fresh run IS the model's own physics.
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, GM_SUN, gmOf, ASTEROIDS, LUNAR_QUAD_EFFECTIVE_FACTOR } from './j2000-state.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const require = createRequire(join(ROOT, 'package.json'));
const TL = require(join(ROOT, 'tools/lib/constants.js'));
const DOH = require(join(ROOT, 'tools/lib/deep-orbital-history.js'));
const REF_FILE = join(HERE, 'emb-vectors-de441.local.json');
if (!existsSync(REF_FILE)) { console.error('missing emb-vectors-de441.local.json — run tools/explore/fetch-emb-vectors-de441.mjs first'); process.exit(2); }
const M = DOH.createOneSourceMovement();
const REF = JSON.parse(readFileSync(REF_FILE, 'utf8'));
const DAY = 86400, R2D = 180 / Math.PI, D2R = Math.PI / 180, J2000 = 2451545.0, HALF = 9000;
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
// the lunar quadrupole on the Sun↔EMB interaction (Earth only; planet index 2, 0-based) — the lab's form
const Q_TILDE_EM = TL.MASS_RATIO_EARTH_MOON / ((TL.MASS_RATIO_EARTH_MOON + 1) ** 2);
const QUAD_K_EM = (3 / 4) * Q_TILDE_EM * TL.moonDistance * TL.moonDistance * LUNAR_QUAD_EFFECTIVE_FACTOR;
const lunarQuadForce = (r, _v, _t, GMS, i) => { if (i !== 2) return [0, 0, 0]; const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2]; const k = -GMS * QUAD_K_EM / (r2 * r2 * Math.sqrt(r2)); return [k * r[0], k * r[1], k * r[2]]; };
const evec = ({ r, v }, mu) => { const [x, y, z] = r, [vx, vy, vz] = v; const rn = Math.hypot(x, y, z), hx = y * vz - z * vy, hy = z * vx - x * vz, hz = x * vy - y * vx; return [(vy * hz - vz * hy) / mu - x / rn, (vz * hx - vx * hz) / mu - y / rn]; };
function setup(asteroids) {
  const names = asteroids ? [...NAMES, 'ceres', 'pallas', 'vesta'] : [...NAMES];
  const gms = [GM_SUN, ...names.map((k) => (ASTEROIDS[k] ? ASTEROIDS[k].gm : gmOf(k)))];
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => { const s = ASTEROIDS[k] ? ASTEROIDS[k].s : HZ[k]; return { r: s.slice(0, 3), v: s.slice(3, 6) }; })];
  const Mt = gms.reduce((s, g) => s + g, 0);
  const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mt), vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mt);
  const n = gms.length, Y0 = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gms, Y0 };
}
let lastSamples = null;   // the most recent run's 10-day samples (for the decimation test below)
function yearlyBoxcar(mode) {
  const { gms, Y0 } = setup(mode.asteroids);
  const run = (dtDays) => { const sim = makeWH({ gms, Y0: Y0.slice(), dt: dtDays * DAY, gr: true, order: 2, extraForces: mode.lunar ? [lunarQuadForce] : [] }); const out = []; const steps = Math.round(10 / Math.abs(dtDays)), nS = Math.round(HALF * 365.25 / 10); for (let s = 0; s <= nS; s++) { out.push({ t: sim.t / DAY / 365.25, z: evec(sim.helio(3), GM_SUN + gms[3]) }); sim.step(steps); } return out; };
  const samples = [...run(-2).slice(1).reverse(), ...run(2)];
  lastSamples = samples;
  const ym = new Map(); for (const s of samples) { const y = Math.floor(s.t); const o = ym.get(y) || { q: 0, p: 0, n: 0 }; o.q += s.z[0]; o.p += s.z[1]; o.n++; ym.set(y, o); }
  const F = [...ym.entries()].filter(([, o]) => o.n >= 30).sort((a, b) => a[0] - b[0]).map(([y, o]) => ({ y: 2000 + y + 0.5, q: o.q / o.n, p: o.p / o.n }));
  return boxcar(F);
}
// THE DUMP'S SAMPLING: the 20-Myr run is recorded every 20,000 d (54.757 yr) from t₀ = −10 Myr, and
// the series applies its 1-kyr boxcar to THOSE samples (≈18 per kyr). The osculating e-vector carries
// short-period terms (Jupiter 11.86 yr, Venus 8 yr, the synodic lines) of ~10⁻⁴; a 54.757-yr sampling
// aliases them into the secular band, where the boxcar cannot remove them. Test: decimate the fresh
// run to the dump's instants and boxcar those — does the series' deviation reappear?
function decimatedBoxcar(samples) {
  const rDt = 20000 / 365.25, t0 = -10000000;
  const byT = new Map(samples.map((s) => [Math.round(s.t * 36.525), s]));   // 10-day keys
  const dec = [];
  for (let k = Math.ceil((-HALF - t0) / rDt); t0 + k * rDt <= HALF; k++) { const t = t0 + k * rDt; const s = byT.get(Math.round(t * 36.525)); if (s) dec.push({ y: 2000 + t, q: s.z[0], p: s.z[1] }); }
  const half = Math.round(1000 / 2 / rDt);
  return dec.map((_, i) => { let q = 0, p = 0, n = 0; for (let j = Math.max(0, i - half); j <= Math.min(dec.length - 1, i + half); j++) { q += dec[j].q; p += dec[j].p; n++; } return { y: dec[i].y, q: q / n, p: p / n }; });
}
const boxcar = (arr) => arr.map((_, i) => { let q = 0, p = 0, n = 0; for (let j = Math.max(0, i - 500); j <= Math.min(arr.length - 1, i + 500); j++) { q += arr[j].q; p += arr[j].p; n++; } return { y: arr[i].y, q: q / n, p: p / n }; });
const GM = 2.9591220828411951e-4 * (1 + 1 / 328900.5596);
const dm = new Map(); for (const row of REF.rows) { const year = 2000 + (row[0] - J2000) / 365.25; const [x, y, z, vx, vy, vz] = row.slice(1); const r = Math.hypot(x, y, z), hx = y * vz - z * vy, hy = z * vx - x * vz, hz = x * vy - y * vx; const q = (vy * hz - vz * hy) / GM - x / r, p = (vz * hx - vx * hz) / GM - y / r; const yb = Math.floor(year); const o = dm.get(yb) || { q: 0, p: 0, n: 0 }; o.q += q; o.p += p; o.n++; dm.set(yb, o); }
const D = boxcar([...dm.entries()].filter(([, o]) => o.n >= 10).sort((a, b) => a[0] - b[0]).map(([yb, o]) => ({ y: yb + 0.5, q: o.q / o.n, p: o.p / o.n })));
const at = (arr, y) => arr.reduce((b, r) => (Math.abs(r.y - y) < Math.abs(b.y - y) ? r : b));
const seriesZ = (y) => { const s = M.sampleAt(y); const ang = s.generalPrecessionLonDeg * D2R; return [s.eCosPeri * Math.cos(ang) - s.eSinPeri * Math.sin(ang), s.eCosPeri * Math.sin(ang) + s.eSinPeri * Math.cos(ang)]; };
const MODES = [{ name: 'none', lunar: false, asteroids: false }, { name: 'lunar proxy', lunar: true, asteroids: false }, { name: 'asteroids', lunar: false, asteroids: true }, { name: 'both (the dump)', lunar: true, asteroids: true }];
const CENTRES = [-6500, -5500, -4500, -3500, -2500, -1500, -500, 500, 1500, 2500, 3500, 4500, 5500, 6500];
console.log('Δe = run − DE441 (10⁻⁵) and Δϖ = run − DE441 (″), secular vs secular, per 1000-yr bin; last column: rms over the bins');
console.log('mode              ' + CENTRES.map((c) => String(c).padStart(7)).join('') + '      rms');
const seriesRow = { e: [], w: [] };
for (const c of CENTRES) { const d = at(D, c), [qs, ps] = seriesZ(c); seriesRow.e.push((Math.hypot(qs, ps) - Math.hypot(d.q, d.p)) * 1e5); seriesRow.w.push(w180((Math.atan2(ps, qs) - Math.atan2(d.p, d.q)) * R2D) * 3600); }
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
const show = (label, e, w) => { console.log(`${label.padEnd(18)}Δe ` + e.map((x) => x.toFixed(2).padStart(7)).join('') + `   ${rms(e).toFixed(2).padStart(6)}`); console.log(`${''.padEnd(18)}Δϖ ` + w.map((x) => x.toFixed(0).padStart(7)).join('') + `   ${rms(w).toFixed(0).padStart(6)}`); };
show('series (dump)', seriesRow.e, seriesRow.w);
for (const mode of MODES) {
  const t0 = Date.now(); const FB = yearlyBoxcar(mode);
  const e = [], w = [];
  for (const c of CENTRES) { const f = at(FB, c), d = at(D, c); e.push((Math.hypot(f.q, f.p) - Math.hypot(d.q, d.p)) * 1e5); w.push(w180((Math.atan2(f.p, f.q) - Math.atan2(d.p, d.q)) * R2D) * 3600); }
  show(`${mode.name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`, e, w);
  if (mode.name.startsWith('both')) {
    const DB = decimatedBoxcar(lastSamples);
    const e2 = [], w2 = [];
    for (const c of CENTRES) { const f = at(DB, c), d = at(D, c); e2.push((Math.hypot(f.q, f.p) - Math.hypot(d.q, d.p)) * 1e5); w2.push(w180((Math.atan2(f.p, f.q) - Math.atan2(d.p, d.q)) * R2D) * 3600); }
    show('both, DUMP-SAMPLED', e2, w2);
    console.log('  (the same run through the dump\'s 54.757-yr sampling + the series\' 1-kyr boxcar on those samples — compare with the series row)');
  }
}

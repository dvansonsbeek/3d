#!/usr/bin/env node
// THE LATTICE AT ITS OWN QUANTITY TYPE — long-window mean apsidal and nodal
// rates from the model's own 9-body Newtonian integration, beside 8H/N.
//
// The 8H/N perihelion and node divisors are long-term-MEAN claims (quantity A
// in doc 13 §1.8); comparing them with 126-yr window trends (quantity C) tests
// nothing — the outer planets' window trends swing by thousands of ″/cy. This
// script integrates Sun + 8 planets (DE440 masses, no relativity, Horizons J2000
// seed) over ±YEARS/2 and takes the mean rate of the unwrapped osculating ϖ and Ω
// of every planet over the whole window — the quantity the lattice actually
// claims — and prints the nearest 8H/N integer to each integrated mean.
//
// Numerics: the RK4 step is a trade-off (Mercury's spurious apsidal drift is
// +85 ″/cy at 0.5 d, 2.2 at 0.2 d, 0.14 at 0.1 d — measured two-body). The
// script measures that drift for EVERY planet at the chosen step with a
// two-body run and subtracts it, and prints the correction so it is visible.
//
// Reading rule: a mean over 100 kyr is still not the ≥ 10⁵–10⁶-yr eigen-mean
// for the slow modes (Mercury's g1 beats over ~1 Myr); the convergence lines
// (mean over the first 10 / 30 / 100 kyr) show how settled each number is.
// No relativity: Mercury's integrated mean is the NEWTONIAN mean, so the
// lattice 8H/11 = 531.44 is compared with the Newtonian long-term mean, and
// the 43 is not part of this comparison at all.
//
// MEASURED, 1 Myr, Wisdom–Holman dt 2 d (13 min): ϖ̇ means identical to the RK4 run
// below to 0.3 ″/cy (Mercury 512.8, Mars 1,786.3, Saturn 2,824.3) — integrator-
// independent. With gr=1: Mercury mean 559.9 (1.054 × lattice). NODE means in the
// INVARIABLE plane (±500 kyr): Mercury −549 (s1 −562) · Venus −1,814 · Earth −1,842
// (lattice −8H/40 = −1,932: 0.95) · Mars −1,928 (−8H/64 = −3,092: 0.62) · Jupiter
// −2,635 and Saturn −2,635 (= s6 −2,634.8; lattice −8H/36 = −1,739: 1.51) · Uranus
// −299 (= s7; lattice −531) · Neptune −67 (= s8; lattice −145). Only Earth's node
// divisor is within 5 % of the mean. Frequencies proper: naff-frequencies.mjs.
//
// MEASURED, 1 Myr (±500 kyr, RK4 dt 0.2 d, 1000-d sampling, 73 min) — Newtonian means:
//   ϖ̇: Mercury 512.5 vs lattice 531.4 (0.964; instantaneous 529) · Mars 1,786 vs
//   1,739 (1.027; Laskar g4 = 1,792) · Jupiter 426 vs 1,884 (0.23; = g5 425.7) ·
//   Saturn +2,824 vs −3,140 (= g6 2,824.5, PROGRADE) · Uranus 697 vs 1,160 (0.60) ·
//   Earth 845 (mode-mixed; no lattice value here) · Venus/Neptune ill-conditioned.
//   So the 1-Myr Newtonian means ARE the secular eigenfrequencies (as they must
//   be), and the lattice perihelion column is not one quantity type: Mercury's
//   8H/11 sits on the PRESENT Newtonian rate (B), Mars's 8H/36 on the MEAN (A,
//   2.7 % under g4), and Jupiter's, Saturn's, Uranus's divisors are neither —
//   they are window values (Saturn's sign) with no long-term meaning.
//   Ω̇ (ecliptic-J2000 frame): Mercury −548 vs −435 (1.26; Laskar s1 = −561) ·
//   Mars −1,226 vs −3,092 (0.40) · Jupiter/Saturn/Uranus/Neptune ≈ 0: their
//   orbital planes precess about the INVARIABLE plane and, being inclined to it
//   by less than the ecliptic–invariable tilt (1.58°), their J2000-ecliptic nodes
//   LIBRATE — the lattice's node periods are defined on the invariable plane, so
//   this frame is not the right one for that comparison (refinement: recompute
//   Ω̇ in the invariable-plane frame before judging the node column).
//
// MEASURED, 100 kyr (±50 kyr; PRELIMINARY, superseded by the 1-Myr block above):
//   ϖ̇ means ±50 kyr vs lattice 8H/N:  Mercury 519 vs 531.4 (0.977, drifting
//   from 529 at ±5 kyr) · Mars 1,744 vs 1,739 (1.003 — the lattice matches the
//   MEAN, not the 1,599 of today) · Jupiter 415 vs 1,884 (0.22) · Saturn +2,834
//   vs −3,140 (sign: the mean is prograde ≈ g6; the lattice's retrograde value is
//   a window quantity) · Uranus 386 vs 1,160 (0.33) · Venus/Neptune ill-conditioned.
//   Ω̇ means: Mercury −524 vs −435 (1.20) · Mars −1,636 vs −3,092 (0.53) ·
//   Jupiter/Saturn near 0 vs −1,739 (their nodes precess about the invariable
//   plane; the ecliptic-J2000 mean is not the lattice's quantity either).
//
//   node tools/explore/lattice-long-window-test.mjs [years=100000] [integrator=wh|rk4] [dt=2|0.2] [order=2|4] [gr=1] [sample=1000] [frame=ecliptic|equatorial|invariable]
//   (the node column must be read in frame=invariable — see the 1-Myr block;
//    default integrator is Wisdom–Holman, nbody-wh.mjs: 1 Myr ≈ 13 min instead of 73)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const TL = require(ROOT + 'tools/lib/constants.js');

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const POS = process.argv.slice(2).filter((a) => !a.includes('='));
const YEARS = parseFloat(KV.years || POS[0] || '100000');
const INTEGRATOR = (KV.integrator || 'wh').toLowerCase();   // wh (Wisdom–Holman, default) | rk4
const DT = parseFloat(KV.dt || POS[1] || (INTEGRATOR === 'wh' ? '2' : '0.2'));
const WH_ORDER = parseInt(KV.order || '2', 10);
const GR_ON = KV.gr === '1' || KV.gr === 'true';
const FRAME = (KV.frame || 'ecliptic').toLowerCase();   // ecliptic | equatorial | invariable — readout frame for the elements
const D2R = Math.PI / 180, DAY = 86400;
const GM_S = TL.GM_SUN, GM_EM = P.GM_EM, H = TL.H;

const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const gmOf = (k) => (k === 'earth' ? GM_EM : GM_S / TL.massRatioDE440[k]);
// JPL Horizons, heliocentric ecliptic J2000, JD 2451545.0 TDB, km & km/s (see perihelion-observation-audit.mjs)
const HORIZONS_J2000 = {
  mercury: [-1.946172635585e+7, -6.691327526352e+7, -3.679854343750e+6, 3.699499185728e+1, -1.116441592562e+1, -4.307628118658e+0],
  venus:   [-1.074564940522e+8, -4.885014975873e+6, 6.135634299718e+6, 1.381906029263e+0, -3.514029517645e+1, -5.600423382821e-1],
  earth:   [-2.650257688971e+7, 1.446939556280e+8, -1.704331902042e+2, -2.978644078798e+1, -5.478176822344e+0, 4.197340759138e-5],
  mars:    [2.080481406418e+8, -2.007052628224e+6, -5.156288959273e+6, 1.162672436605e+0, 2.629606453968e+1, 5.222970066951e-1],
  jupiter: [5.985675835979e+8, 4.396047284920e+8, -1.522686065302e+7, -7.909837688567e+0, 1.115613309734e+1, 1.308626770728e-1],
  saturn:  [9.583851242197e+8, 9.828564572112e+8, -5.521304749180e+7, -7.432021997941e+0, 6.735913712660e+0, 1.782497576763e-1],
  uranus:  [2.158975019759e+9, -2.054625247237e+9, -3.562548941967e+7, 4.637024235952e+0, 4.627657581334e+0, -4.289175880417e-2],
  neptune: [2.515046428529e+9, -3.738714513276e+9, 1.903227194039e+7, 4.465902049825e+0, 3.076627073142e+0, -1.660633585828e-1],
};

const DIAG = [];   // conservation diagnostics per integration direction (B1)
const ROTS = {};   // readout rotations by frame name; set after the initial state is built (invariable plane needs it)
let ROT = null;
const rotBy = (R, a) => (R ? [R[0][0] * a[0] + R[0][1] * a[1] + R[0][2] * a[2], R[1][0] * a[0] + R[1][1] * a[1] + R[1][2] * a[2], R[2][0] * a[0] + R[2][1] * a[1] + R[2][2] * a[2]] : a);
const rot = (a) => rotBy(ROT, a);
function oscul(Y, i, n, gms, R = ROT) {
  const r = rotBy(R, [Y[3 * i] - Y[0], Y[3 * i + 1] - Y[1], Y[3 * i + 2] - Y[2]]);
  const v = rotBy(R, [Y[3 * n + 3 * i] - Y[3 * n], Y[3 * n + 3 * i + 1] - Y[3 * n + 1], Y[3 * n + 3 * i + 2] - Y[3 * n + 2]]);
  const mu = GM_S + gms[i];
  const hv = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const rn = Math.hypot(...r);
  const ev = [0, 1, 2].map((c) => (v[(c + 1) % 3] * hv[(c + 2) % 3] - v[(c + 2) % 3] * hv[(c + 1) % 3]) / mu - r[c] / rn);
  const hn = Math.hypot(...hv), inc = Math.acos(hv[2] / hn);
  const Om = Math.atan2(hv[0], -hv[1]);
  const en = Math.hypot(...ev);
  let om = Math.acos(Math.max(-1, Math.min(1, (Math.cos(Om) * ev[0] + Math.sin(Om) * ev[1]) / en)));
  if (ev[2] < 0) om = 2 * Math.PI - om;
  if (inc < 1e-6) om = Math.atan2(ev[1], ev[0]) - Om;
  return { w: (Om + om) / D2R, Om: Om / D2R, e: en, inc: inc / D2R };
}
function integrate(gms, Y, years, sampleDays, onSample) {
  const n = gms.length;
  if (INTEGRATOR === 'wh') {
    // Wisdom–Holman: exact Kepler drifts, perturbation kicks; onSample gets a
    // barycentric-layout state rebuilt from the heliocentric one so oscul() is unchanged
    const sim = makeWH({ gms, Y0: Y, dt: Math.sign(years) * DT * DAY, gr: GR_ON, order: WH_ORDER });
    const steps = Math.round(Math.abs(years) * 365.25 / DT), every = Math.max(1, Math.round(sampleDays / DT));
    const Ys = new Float64Array(6 * n);
    const snapshot = () => { Ys.fill(0); for (let i = 1; i < n; i++) { const h = sim.helio(i); for (let c = 0; c < 3; c++) { Ys[3 * i + c] = h.r[c]; Ys[3 * n + 3 * i + c] = h.v[c]; } } return Ys; };   // Sun at origin, heliocentric velocities: exactly what oscul() subtracts
    // conservation diagnostics (B1): energy and angular momentum at start / mid / end.
    // A symplectic run must show a BOUNDED, non-growing |ΔE/E| (10⁻⁸-class at dt 2 d);
    // secular growth means a numerical problem, not physics. |ΔL|/L should be ~1e-12.
    const E0 = sim.energy(), L0 = sim.angularMomentum(), Ln0 = Math.hypot(...L0);
    let maxDE = 0;
    for (let s = 0; s <= steps; s++) {
      if (s % every === 0) onSample(Math.sign(years) * s * DT / 365.25, snapshot());
      if (s % (every * 100) === 0) maxDE = Math.max(maxDE, Math.abs((sim.energy() - E0) / E0));
      sim.step();
    }
    const L1 = sim.angularMomentum();
    if (n > 2) DIAG.push({ years, maxDE, dE: Math.abs((sim.energy() - E0) / E0), dL: Math.hypot(L1[0] - L0[0], L1[1] - L0[1], L1[2] - L0[2]) / Ln0 });   // the two-body calibration runs are not reported
    return;
  }
  const deriv = P.makeDeriv(gms, n, false);
  const h = Math.sign(years) * DT * DAY, steps = Math.round(Math.abs(years) * 365.25 / DT), every = Math.max(1, Math.round(sampleDays / DT));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) onSample(Math.sign(years) * s * DT / 365.25, Y);
    deriv(Y, k1); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
    deriv(tmp, k2); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
    deriv(tmp, k3); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
    deriv(tmp, k4); for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
}
const unwrapDeg = (v) => { const o = [v[0]]; for (let i = 1; i < v.length; i++) { let d = v[i] - v[i - 1]; while (d > 180) d -= 360; while (d < -180) d += 360; o.push(o[i - 1] + d); } return o; };
const ols = (x, y) => { const nn = x.length, mx = x.reduce((s, q) => s + q, 0) / nn, my = y.reduce((s, q) => s + q, 0) / nn; let sxy = 0, sxx = 0; for (let i = 0; i < nn; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxy / sxx; };

// 1) two-body spurious drift per planet at this step (″/cy), 200 yr each
const spurious = {};
for (const k of names) {
  const gms = [GM_S, gmOf(k)], Y = new Float64Array(12); const s = HORIZONS_J2000[k];
  for (let c = 0; c < 3; c++) { Y[3 + c] = s[c]; Y[9 + c] = s[3 + c]; }
  const w0 = oscul(Y, 1, 2, gms).w, O0 = oscul(Y, 1, 2, gms).Om;
  integrate(gms, Y, 200, 1e9, () => {});
  const o = oscul(Y, 1, 2, gms);
  const dw = ((o.w - w0 + 540) % 360) - 180, dO = ((o.Om - O0 + 540) % 360) - 180;
  spurious[k] = { w: dw * 3600 / 2, Om: dO * 3600 / 2 };
}
console.log(`two-body spurious drift at dt ${DT} d (″/cy, subtracted below): ` + names.map((k) => `${k} ${spurious[k].w.toFixed(2)}`).join(' · '));

// 2) the 9-body run, ±YEARS/2, sampled every 100 d
const gms = [GM_S, ...names.map(gmOf)], n = gms.length, Mtot = gms.reduce((s, x) => s + x, 0);
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => ({ r: HORIZONS_J2000[k].slice(0, 3), v: HORIZONS_J2000[k].slice(3, 6) }))];
const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mtot), vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mtot);
const Y0 = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
// readout frames (the integration itself is frame-free). frame=both (B2) dumps the
// ecliptic AND the invariable-plane elements from ONE trajectory: z needs the
// ecliptic, ζ the invariable plane, and the two must come from the same run.
{
  const e = 23.4392911 * D2R, c = Math.cos(e), s = Math.sin(e); ROTS.equatorial = [[1, 0, 0], [0, c, -s], [0, s, c]];
  const L = [0, 0, 0];
  for (let i = 0; i < n; i++) { const r = [Y0[3 * i], Y0[3 * i + 1], Y0[3 * i + 2]], v = [Y0[3 * n + 3 * i], Y0[3 * n + 3 * i + 1], Y0[3 * n + 3 * i + 2]]; L[0] += gms[i] * (r[1] * v[2] - r[2] * v[1]); L[1] += gms[i] * (r[2] * v[0] - r[0] * v[2]); L[2] += gms[i] * (r[0] * v[1] - r[1] * v[0]); }
  const Ln = Math.hypot(...L), z = L.map((q) => q / Ln);
  let x = [1 - z[0] * z[0], -z[0] * z[1], -z[0] * z[2]]; const xn = Math.hypot(...x); x = x.map((q) => q / xn);
  ROTS.invariable = [x, [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]], z];
  ROTS.ecliptic = null;
  ROT = FRAME === 'both' ? null : (ROTS[FRAME] ?? null);
  console.log(`readout frame: ${FRAME}${FRAME === 'invariable' || FRAME === 'both' ? ` (invariable plane inclined ${(Math.acos(z[2]) / D2R).toFixed(4)}° to ECLIPJ2000)` : ''}`);
}
const FRAMES_OUT = FRAME === 'both' ? ['ecliptic', 'invariable'] : [FRAME];
// Samples are stored as compact typed arrays (a 1-Myr run at 100-d sampling with
// per-sample objects ran out of heap at 4 GB after the integration had finished —
// measured). Sampling every SAMPLE_DAYS keeps ϖ/Ω unwrapping safe (Mercury's ϖ
// moves ~0.4° per 1000 d) and the whole run under ~100 MB.
const SAMPLE_DAYS = parseFloat(KV.sample || POS[2] || '1000');
const t0 = Date.now();
const ELEMS = ['w', 'Om', 'e', 'inc'];
// one sample store per readout frame (frame=both keeps two, from the same trajectory)
const mk = () => Object.fromEntries(FRAMES_OUT.map((fr) => [fr, { t: [], ...Object.fromEntries(ELEMS.map((el) => [el, Object.fromEntries(names.map((k) => [k, []]))])) }]));
const fwd = mk(), bwd = mk();
const sampler = (S) => (t, Y) => { for (const fr of FRAMES_OUT) { S[fr].t.push(t); for (let i = 1; i < n; i++) { const o = oscul(Y, i, n, gms, ROTS[fr]); for (const el of ELEMS) S[fr][el][names[i - 1]].push(o[el]); } } };
integrate(gms, Float64Array.from(Y0), YEARS / 2, SAMPLE_DAYS, sampler(fwd));
integrate(gms, Float64Array.from(Y0), -YEARS / 2, SAMPLE_DAYS, sampler(bwd));
const primary = FRAMES_OUT[0];
const T = Float64Array.from([...bwd[primary].t.slice(1).reverse(), ...fwd[primary].t]);
const ELF = {};   // ELF[frame][el][planet]
for (const fr of FRAMES_OUT) { ELF[fr] = Object.fromEntries(ELEMS.map((el) => [el, {}])); for (const k of names) for (const el of ELEMS) ELF[fr][el][k] = Float64Array.from([...bwd[fr][el][k].slice(1).reverse(), ...fwd[fr][el][k]]); }
const EL = ELF[primary];   // the tables below read the primary frame (ecliptic when frame=both)
if (DIAG.length) console.log('conservation (B1): ' + DIAG.map((d) => `${d.years > 0 ? 'forward' : 'backward'} |ΔE/E| end ${d.dE.toExponential(1)}, max ${d.maxDE.toExponential(1)}, |ΔL|/L ${d.dL.toExponential(1)}`).join(' · '));
// dump the series for offline analysis (naff-frequencies.mjs) — untracked .local.json, one per frame
if (KV.dump !== '0') {
  const { writeFileSync } = await import('node:fs');
  for (const fr of FRAMES_OUT) {
    const out = { years: YEARS, integrator: INTEGRATOR, dt: DT, gr: GR_ON, frame: fr, sampleDays: SAMPLE_DAYS, conservation: DIAG, t: Array.from(T), elements: {} };
    for (const k of names) out.elements[k] = Object.fromEntries(ELEMS.map((el) => [el, Array.from(ELF[fr][el][k])]));
    const file = ROOT + `tools/explore/lattice-long-window-${fr}-${YEARS}${GR_ON ? '-gr' : ''}.local.json`;
    const txt = JSON.stringify(out); writeFileSync(file, txt);
    console.log(`wrote ${file} (${(txt.length / 1e6).toFixed(1)} MB)`);
  }
}
console.log(`9-body run ±${YEARS / 2} yr, ${INTEGRATOR === 'wh' ? `Wisdom–Holman order ${WH_ORDER}` : 'RK4'} at dt ${DT} d${GR_ON ? ', 1PN on' : ', Newton only'}: ${((Date.now() - t0) / 1000).toFixed(0)} s, ${T.length} samples (every ${SAMPLE_DAYS} d)\n`);

const meanRate = (k, el, y0, y1) => { const idx = []; for (let i = 0; i < T.length; i++) if (T[i] >= y0 && T[i] <= y1) idx.push(i); const x = idx.map((i) => T[i]); const y = unwrapDeg(idx.map((i) => EL[el][k][i])); return ols(x, y) * 3600 * 100 - spurious[k][el]; };
const latticeN = (rateAscy) => 129600000 / rateAscy / (8 * H);   // 8H/N ⇔ N = 8H·rate/(1296000·100)... written as N = 8H / period
const nearest = (rate) => { const N = 8 * H * rate / 129600000; return `${N < 0 ? '−' : ''}8H/${Math.abs(N).toFixed(2)}`; };
const f = (v, d = 1, w = 11) => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(d)).padStart(w);

console.log('PERIHELION ϖ̇ — long-window means (″/cy), Newton + masses, no relativity');
console.log(`planet     mean ±5 kyr  ±15 kyr  ±${(YEARS / 2000).toFixed(0)} kyr   nearest 8H/N    lattice 8H/N (″/cy)   lattice N   ratio mean/lattice`);
for (const k of names) {
  const m10 = meanRate(k, 'w', -5000, 5000), m30 = meanRate(k, 'w', -15000, 15000), mAll = meanRate(k, 'w', -YEARS / 2, YEARS / 2);
  const lat = k === 'earth' ? null : 1296000 / TL.planets[k].perihelionEclipticYears * 100;
  const latN = k === 'earth' ? null : 8 * H / TL.planets[k].perihelionEclipticYears;
  console.log(`${k.padEnd(9)}${f(m10)}${f(m30, 1, 9)}${f(mAll, 1, 9)}   ${nearest(mAll).padStart(12)}${f(lat, 1, 20)}${f(latN, 2, 12)}${f(lat === null ? null : mAll / lat, 3, 16)}`);
}
console.log('\nNODE Ω̇ — long-window means (″/cy)');
console.log(`planet     mean ±5 kyr  ±15 kyr  ±${(YEARS / 2000).toFixed(0)} kyr   nearest 8H/N    lattice −8H/N (″/cy)  lattice N   ratio`);
for (const k of names) {
  const m10 = meanRate(k, 'Om', -5000, 5000), m30 = meanRate(k, 'Om', -15000, 15000), mAll = meanRate(k, 'Om', -YEARS / 2, YEARS / 2);
  const per = k === 'earth' ? -H / 5 : (TL.planets[k].ascendingNodePeriod ?? null);
  const lat = per === null ? null : 1296000 / per * 100;
  const latN = per === null ? null : 8 * H / per;
  console.log(`${k.padEnd(9)}${f(m10)}${f(m30, 1, 9)}${f(mAll, 1, 9)}   ${nearest(mAll).padStart(12)}${f(lat, 1, 20)}${f(latN, 2, 12)}${f(lat === null ? null : mAll / lat, 3, 8)}${k === 'earth' ? '   (Ω of the ecliptic itself: ill-defined in this frame)' : ''}`);
}
console.log('\nreading: the lattice claims quantity A; these are the model\'s own Newtonian means over the window shown, with the convergence columns telling how settled each is. Mercury\'s row is the NEWTONIAN mean — the 43 is a separate, Mercury-preferential term (doc 13 §1.8).');

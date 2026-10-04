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
//   node tools/explore/lattice-long-window-test.mjs [years=100000] [integrator=wh|rk4] [dt=2|0.2] [order=2|4] [gr=1] [sample=1000] [frame=ecliptic|equatorial|invariable] [lunar=1] [asteroids=1] [mean=1 [acc=20]]
//   (the node column must be read in frame=invariable — see the 1-Myr block;
//    default integrator is Wisdom–Holman, nbody-wh.mjs: 1 Myr ≈ 13 min instead of 73)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, AU_KM, ASTEROIDS, LUNAR_QUAD_EFFECTIVE_FACTOR } from './j2000-state.mjs';
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
// lunar=1 — the LUNAR QUADRUPOLE on the Sun↔EMB interaction, at the
// effective coefficient CALIBRATED against the real-Moon ground-truth run
// (j2000-state LUNAR_QUAD_EFFECTIVE_FACTOR; the apsidal-fidelity sweep's
// method-matched RK4 triple: real Moon Δϖ̇ +0.0659 ″/yr, reproduced by the
// calibrated proxy digit-for-digit). Closes the measured 0.072 ″/yr Earth
// apsidal-rate deficit of the EMB-point-mass run (chain/canonical route
// convergence — plan 02 record).
// asteroids=1 — Ceres/Vesta/Pallas as FORCE-ONLY bodies (elements never
// dumped; 0.1–0.3 ″/cy class for Mars, measured null for Earth).
const LUNAR_ON = KV.lunar === '1';
const ASTEROIDS_ON = KV.asteroids === '1';
const FRAME = (KV.frame || 'ecliptic').toLowerCase();   // ecliptic | equatorial | invariable — readout frame for the elements
// mean=1 — RUNNING-MEAN sampling (2026-10): each dumped sample is the mean of
// the osculating elements over the interval of `sample` days CENTRED on the
// sample instant (accumulated every `acc` days, default 20 d), in VECTOR form —
// z = e·e^{iϖ}, ζ = sin(i/2)·e^{iΩ}, the unwrapped mean longitude L and a are
// averaged, and e/ϖ/i/Ω are read back from the mean vectors. WHY: a point
// sample every 20,000 d (54.757 yr) ALIASES the osculating elements'
// short-period content (Jupiter 11.86 yr, Venus 8 yr, the synodic lines,
// ~10⁻⁴ in Earth's e-vector) into the secular band, where the consumers'
// 1-kyr boxcar (≈18 samples) cannot remove it — measured as the banked
// series' Earth e sitting up to 1.2·10⁻⁵ below DE441's secular e with a
// Δϖ of −180″ over −3500…−1500 (the Sun's 5″ annual term there), while the
// same physics run fresh and averaged matched DE441 to 0.01·10⁻⁵
// (tools/explore/evector-ingredient-isolation.mjs). The t grid is unchanged
// (the sample instants, t = 0 included — the J2000 node the consumers need);
// the first/last half-intervals of each direction are merged (t = 0) or
// dropped (the run's ends). Point sampling (the default) stays for the
// window runs whose consumers read instantaneous elements (the chain anchors).
const MEAN_ON = KV.mean === '1';
const ACC_DAYS = parseFloat(KV.acc || '20');
if ((LUNAR_ON || ASTEROIDS_ON || MEAN_ON) && (KV.integrator || 'wh').toLowerCase() !== 'wh') {
  console.error('lunar=1 / asteroids=1 / mean=1 are wired for the WH integrator only'); process.exit(1);
}
const D2R = Math.PI / 180, DAY = 86400;
const GM_S = TL.GM_SUN, GM_EM = P.GM_EM, H = TL.H;

const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const gmOf = (k) => (k === 'earth' ? GM_EM : GM_S / TL.massRatioDE440[k]);
// JPL Horizons, heliocentric ecliptic J2000, JD 2451545.0 TDB, km & km/s (see perihelion-observation-audit.mjs)
const HORIZONS_J2000 = HZ;   // the one home: j2000-state.mjs

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
  // K2.1 (P5): mean longitude L and semi-major axis a join the dump — the
  // Keplerian chain's governed inputs (window mean motions; t=0 anchor).
  const aKm = 1 / (2 / rn - (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) / mu);
  let nu = Math.acos(Math.max(-1, Math.min(1, (ev[0] * r[0] + ev[1] * r[1] + ev[2] * r[2]) / (en * rn))));
  if (r[0] * v[0] + r[1] * v[1] + r[2] * v[2] < 0) nu = 2 * Math.PI - nu;
  const Ean = Math.atan2(Math.sqrt(1 - en * en) * Math.sin(nu), en + Math.cos(nu));
  const Man = Ean - en * Math.sin(Ean);
  const L = ((((Om + om + Man) / D2R) % 360) + 360) % 360;
  return { w: (Om + om) / D2R, Om: Om / D2R, e: en, inc: inc / D2R, L, a: aKm / AU_KM };
}
// The lunar-quadrupole extra force (Earth only; 0-based planet index 2 in
// the names order). Coefficient (3/4)·q̃·a_EM² × the CALIBRATED effective
// factor — q̃ and a_EM from the model's constants homes.
const Q_TILDE_EM = TL.MASS_RATIO_EARTH_MOON / ((TL.MASS_RATIO_EARTH_MOON + 1) ** 2);
const QUAD_K_EM = (3 / 4) * Q_TILDE_EM * TL.moonDistance * TL.moonDistance * LUNAR_QUAD_EFFECTIVE_FACTOR;
const EARTH_PLANET_I0 = 2;
const lunarQuadForce = (r, v, t, GMS, i) => {
  if (i !== EARTH_PLANET_I0) return [0, 0, 0];
  const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
  const k = -GMS * QUAD_K_EM / (r2 * r2 * Math.sqrt(r2));
  return [k * r[0], k * r[1], k * r[2]];
};
// Set for the MAIN run only (after the two-body calibration section —
// the spurious-drift runs must stay pure numerics, no physics terms).
let EXTRA_FORCES = [];

/**
 * A running-mean accumulator (mean=1): per interval, the planets' osculating
 * VECTOR sums in every readout frame — sum[frame][planet] = [Σ e cos ϖ,
 * Σ e sin ϖ, Σ sin(i/2) cos Ω, Σ sin(i/2) sin Ω, Σ L_unwrapped (deg), Σ a]
 * over n samples; lastL carries the unwrapping across the interval.
 */
function mkMeanAccumulator(frames, bodies) {
  return { n: 0, sum: frames.map(() => Array.from({ length: bodies }, () => new Float64Array(6))), lastL: frames.map(() => new Float64Array(bodies).fill(NaN)) };
}
/** the dump's `w, Om, e, inc, L, a` (degrees / AU) from an accumulator's sums */
function meanElements(sum, nSamples) {
  const zq = sum[0] / nSamples, zp = sum[1] / nSamples, hq = sum[2] / nSamples, hp = sum[3] / nSamples;
  return {
    w: ((Math.atan2(zp, zq) / D2R) % 360 + 360) % 360,
    Om: ((Math.atan2(hp, hq) / D2R) % 360 + 360) % 360,
    e: Math.hypot(zq, zp),
    inc: 2 * Math.asin(Math.min(1, Math.hypot(hq, hp))) / D2R,
    L: ((sum[4] / nSamples) % 360 + 360) % 360,
    a: sum[5] / nSamples,
  };
}

function integrate(gms, Y, years, sampleDays, onSample, meanSink = null) {
  const n = gms.length;
  if (INTEGRATOR === 'wh') {
    // Wisdom–Holman: exact Kepler drifts, perturbation kicks; onSample gets a
    // barycentric-layout state rebuilt from the heliocentric one so oscul() is unchanged
    const sim = makeWH({ gms, Y0: Y, dt: Math.sign(years) * DT * DAY, gr: GR_ON, order: WH_ORDER, extraForces: EXTRA_FORCES });
    const steps = Math.round(Math.abs(years) * 365.25 / DT), every = Math.max(1, Math.round(sampleDays / DT));
    const Ys = new Float64Array(6 * n);
    const snapshot = () => { Ys.fill(0); for (let i = 1; i < n; i++) { const h = sim.helio(i); for (let c = 0; c < 3; c++) { Ys[3 * i + c] = h.r[c]; Ys[3 * n + 3 * i + c] = h.v[c]; } } return Ys; };   // Sun at origin, heliocentric velocities: exactly what oscul() subtracts
    // conservation diagnostics (B1): energy and angular momentum at start / mid / end.
    // A symplectic run must show a BOUNDED, non-growing |ΔE/E| (10⁻⁸-class at dt 2 d);
    // secular growth means a numerical problem, not physics. |ΔL|/L should be ~1e-12.
    const E0 = sim.energy(), L0 = sim.angularMomentum(), Ln0 = Math.hypot(...L0);
    let maxDE = 0;
    if (meanSink) {
      // mean=1: running means over intervals CENTRED on the sample instants
      // k·every (step s belongs to interval k = round(s/every)); the planets'
      // osculating vectors accumulate every accEvery steps in every readout
      // frame. k = 0 is a half interval (merged with the other direction's by
      // the caller); the run's far-end partial interval is dropped.
      const accEvery = Math.max(1, Math.round(ACC_DAYS / DT)), bodies = names.length, frames = FRAMES_OUT;
      if (every % (2 * accEvery) !== 0) { console.error(`mean=1 needs sample/acc to be an even integer (sample ${sampleDays} d, acc ${ACC_DAYS} d)`); process.exit(1); }
      // Each interval is SYMMETRIC about its sample instant — offsets −every/2 …
      // +every/2 inclusive, the two boundary samples shared with the neighbours
      // — so the mean of the unwrapped mean longitude L is L at the centre
      // (a one-sided interval biases L by n̄·Δt/2: 10 d of Earth's motion is
      // 9.9°, measured on the first cut).
      const expected = every / accEvery + 1;
      let k = 0, acc = mkMeanAccumulator(frames, bodies);
      const addSample = (a, Yn) => {
        frames.forEach((fr, f) => {
          for (let i = 1; i <= bodies; i++) {
            const o = oscul(Yn, i, n, gms, ROTS[fr]), S = a.sum[f][i - 1], w = o.w * D2R, Om = o.Om * D2R, s2 = Math.sin(o.inc * D2R / 2);
            S[0] += o.e * Math.cos(w); S[1] += o.e * Math.sin(w); S[2] += s2 * Math.cos(Om); S[3] += s2 * Math.sin(Om);
            let L = o.L; const prev = a.lastL[f][i - 1];
            if (!Number.isNaN(prev)) { while (L - prev > 180) L -= 360; while (L - prev < -180) L += 360; }
            a.lastL[f][i - 1] = L; S[4] += L; S[5] += o.a;
          }
        });
        a.n++;
      };
      const flush = (kIdx, a) => { if (kIdx === 0 || a.n >= 0.9 * expected) meanSink.push(kIdx, Math.sign(years) * kIdx * every * DT / 365.25, a); };
      for (let s = 0; s <= steps; s++) {
        const kNow = Math.round(s / every);   // ties (the shared boundary) round UP into the next interval
        const isAcc = s % accEvery === 0;
        if (kNow !== k) {
          if (isAcc && s - kNow * every === -every / 2) addSample(acc, snapshot());   // the boundary sample closes the old interval too
          flush(k, acc); k = kNow; acc = mkMeanAccumulator(frames, bodies);
        }
        if (isAcc) addSample(acc, snapshot());
        if (s % (every * 100) === 0) maxDE = Math.max(maxDE, Math.abs((sim.energy() - E0) / E0));
        sim.step();
      }
      flush(k, acc);
    } else {
      for (let s = 0; s <= steps; s++) {
        if (s % every === 0) onSample(Math.sign(years) * s * DT / 365.25, snapshot());
        if (s % (every * 100) === 0) maxDE = Math.max(maxDE, Math.abs((sim.energy() - E0) / E0));
        sim.step();
      }
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

// 2) the main run, ±YEARS/2 — 9 bodies, +3 force-only asteroids under
// asteroids=1 (appended AFTER the planets so every planet index is
// unchanged; their elements are never sampled or dumped), + the lunar
// quadrupole under lunar=1 (main run only — the two-body calibration
// above stayed force-free).
if (LUNAR_ON) EXTRA_FORCES = [lunarQuadForce];
const intNames = ASTEROIDS_ON ? [...names, 'ceres', 'pallas', 'vesta'] : names;
const gms = [GM_S, ...intNames.map((k) => ASTEROIDS[k] ? ASTEROIDS[k].gm : gmOf(k))], n = gms.length, Mtot = gms.reduce((s, x) => s + x, 0);
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...intNames.map((k) => { const s = ASTEROIDS[k] ? ASTEROIDS[k].s : HORIZONS_J2000[k]; return { r: s.slice(0, 3), v: s.slice(3, 6) }; })];
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
const ELEMS = ['w', 'Om', 'e', 'inc', 'L', 'a'];
// one sample store per readout frame (frame=both keeps two, from the same trajectory)
const mk = () => Object.fromEntries(FRAMES_OUT.map((fr) => [fr, { t: [], ...Object.fromEntries(ELEMS.map((el) => [el, Object.fromEntries(names.map((k) => [k, []]))])) }]));
const fwd = mk(), bwd = mk();
const sampler = (S) => (t, Y) => { for (const fr of FRAMES_OUT) { S[fr].t.push(t); for (let i = 1; i <= names.length; i++) { const o = oscul(Y, i, n, gms, ROTS[fr]); for (const el of ELEMS) S[fr][el][names[i - 1]].push(o[el]); } } };   // planets only — the force-only asteroids are never sampled
if (MEAN_ON) {
  // mean=1: each direction's sink stores the completed intervals' mean
  // elements; the two half-intervals at t = 0 are merged afterwards and
  // written into BOTH stores, so the concatenation below (bwd.slice(1)) is
  // unchanged.
  const mkSink = (S) => { const zero = { acc: null }; return { zero, push: (k, t, acc) => { if (k === 0) { zero.acc = acc; return; } for (let f = 0; f < FRAMES_OUT.length; f++) { const fr = FRAMES_OUT[f]; S[fr].t.push(t); for (let i = 0; i < names.length; i++) { const o = meanElements(acc.sum[f][i], acc.n); for (const el of ELEMS) S[fr][el][names[i]].push(o[el]); } } } }; };
  const sinkF = mkSink(fwd), sinkB = mkSink(bwd);
  integrate(gms, Float64Array.from(Y0), YEARS / 2, SAMPLE_DAYS, null, sinkF);
  integrate(gms, Float64Array.from(Y0), -YEARS / 2, SAMPLE_DAYS, null, sinkB);
  const zf = sinkF.zero.acc, zb = sinkB.zero.acc;
  for (let f = 0; f < FRAMES_OUT.length; f++) {
    const fr = FRAMES_OUT[f];
    for (const S of [fwd, bwd]) S[fr].t.unshift(0);
    for (let i = 0; i < names.length; i++) {
      // both half-intervals start at the SAME s = 0 sample and unwrap L from it,
      // so their sums sit on one branch: the plain sum is the symmetric mean
      // (the s = 0 sample is counted in both halves — one sample in ~2000)
      const sum = new Float64Array(6); for (let c = 0; c < 6; c++) sum[c] = zf.sum[f][i][c] + zb.sum[f][i][c];
      const o = meanElements(sum, zf.n + zb.n);
      for (const S of [fwd, bwd]) for (const el of ELEMS) S[fr][el][names[i]].unshift(o[el]);
    }
  }
  console.log(`mean=1: ${fwd[FRAMES_OUT[0]].t.length + bwd[FRAMES_OUT[0]].t.length - 1} running-mean samples over ${SAMPLE_DAYS}-d intervals, accumulated every ${ACC_DAYS} d`);
} else {
  integrate(gms, Float64Array.from(Y0), YEARS / 2, SAMPLE_DAYS, sampler(fwd));
  integrate(gms, Float64Array.from(Y0), -YEARS / 2, SAMPLE_DAYS, sampler(bwd));
}
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
    // K5c — the engine's own invariable-plane orientation (unit total angular
    // momentum of the J2000 seed state, ecliptic-J2000 coords), banked with the
    // dump so the governed artifact can carry the s-frame definition. Node =
    // ascending node of the invariable plane on the ecliptic (λ of ẑ_ecl × ẑ_inv).
    const _zInv = ROTS.invariable[2];
    const out = { years: YEARS, integrator: INTEGRATOR, dt: DT, gr: GR_ON, frame: fr, sampleDays: SAMPLE_DAYS, conservation: DIAG,
      // the SAMPLING (2026-10): point samples alias the short-period content
      // of the osculating elements into the secular band at 54.76-yr
      // cadence; the running mean is alias-free by construction
      sampling: MEAN_ON
        ? { kind: 'running mean', windowDays: SAMPLE_DAYS, accumulateDays: ACC_DAYS, form: 'z = e·e^{iϖ}, ζ = sin(i/2)·e^{iΩ}, the unwrapped L and a averaged over the interval centred on each sample instant; e/ϖ/i/Ω read back from the mean vectors' }
        : { kind: 'point sample', note: 'instantaneous osculating elements at each sample instant — aliases sub-interval content' },
      // the apsidal-fidelity physics content (plan 02 record): the run's
      // provenance must say what forces/bodies produced it
      physics: {
        lunarQuadrupole: LUNAR_ON ? { qTilde: Q_TILDE_EM, aEmKm: TL.moonDistance, effectiveFactor: LUNAR_QUAD_EFFECTIVE_FACTOR, provenance: 'calibrated against the real-Moon RK4 triple (apsidal-fidelity-sweep RM/RQ)' } : null,
        asteroids: ASTEROIDS_ON ? Object.fromEntries(['ceres', 'pallas', 'vesta'].map((k) => [k, ASTEROIDS[k].gm])) : null,
      },
      invariablePlane: {
        inclEclipticDeg: Math.acos(_zInv[2]) / D2R,
        ascNodeEclipticDeg: ((Math.atan2(_zInv[0], -_zInv[1]) / D2R) % 360 + 360) % 360,
      },
      t: Array.from(T), elements: {} };
    for (const k of names) out.elements[k] = Object.fromEntries(ELEMS.map((el) => [el, Array.from(ELF[fr][el][k])]));
    const file = ROOT + `tools/explore/lattice-long-window-${fr}-${YEARS}${GR_ON ? '-gr' : ''}.local.json`;
    const txt = JSON.stringify(out); writeFileSync(file, txt);
    console.log(`wrote ${file} (${(txt.length / 1e6).toFixed(1)} MB)`);
  }
}
console.log(`${n - 1}-body run ±${YEARS / 2} yr, ${INTEGRATOR === 'wh' ? `Wisdom–Holman order ${WH_ORDER}` : 'RK4'} at dt ${DT} d${GR_ON ? ', 1PN on' : ', Newton only'}${LUNAR_ON ? `, lunar quadrupole (eff ${LUNAR_QUAD_EFFECTIVE_FACTOR})` : ''}${ASTEROIDS_ON ? ', +Ceres/Pallas/Vesta' : ''}: ${((Date.now() - t0) / 1000).toFixed(0)} s, ${T.length} samples (every ${SAMPLE_DAYS} d)\n`);

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

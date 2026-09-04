#!/usr/bin/env node
// THE STRATA TEST OF THE GATED ALL-PLANET BOUND (Route B falsifier, pre-registered
// 2026-08-31): if every planet's perihelion is held on its model line (pibound
// mode=all, gated — zero force in the observed era), the forcing frequencies in
// Earth's eccentricity vector move from the secular eigenfrequencies (g5 = 4.26,
// g6 = 28.25 ″/yr) to the imposed lattice rates (+17.465, −34.219 ″/yr). Earth's
// e-spectrum beats move with them: the free dynamics puts the strongest line at
// 405 kyr (g2−g5) with 124/95-kyr companions — the measured Mesozoic metronome.
// This run integrates control + bounded over the same span and prints both
// amplitude spectra: (1) DFT of e(t) in the 50–600-kyr band; (2) DFT of
// z = k+ih at the g-lines and at the imposed rates. Series dumped to
// pibound-strata.local.json (gitignored) for plotting.
//
// Both curves are THEORY — the geological record is the referee: if the bounded
// spectrum has no 405-kyr line, the gated bound predicts strata without the
// 405-kyr metronome, against La2004-class dynamics which predicts it.
//
//   node tools/explore/pibound-strata-run.mjs [years=800000] [tau=2] [dt=2] [gate=300] [sample=100]
//
// RESULT bound=z (4.3-Myr run, 2026-09-01, the pre-registered discriminator):
// S1 stable the FULL 4.3 Myr (Mars e 0.057–0.124; the rate bound had died at
// 462 kyr). THE METRONOME: joint 2-frequency LS on Earth's e(t) —
//   free:  1.04e-2 @ 405 kyr / 2.0e-3 @ 447   (our engine ≡ the Laskar metronome)
//   comb:  2.6e-4  @ 405 kyr / 1.35e-2 @ 447  (rings at 8H/6, nothing at 405)
// (the bounded DFT's 6.8e-3 at the 405 probe is leakage of the 447 line at
// finite resolution — the joint fit removes it). z-spectrum: the comb's g3/g4
// forced lines collapse (1.1e-2 → 4e-5) onto N34/N38. The measured Mesozoic
// 405.6 ± 2.4-kyr metronome therefore falsifies the comb universe as built.
//
// RESULT bound=pi (800-kyr run, 2026-08-31): (a) the bounded system SELF-DESTRUCTS at
// 462 kyr — Mars's resonantly pumped e reaches 0.99 (orbit-crossing scattering
// from ~445 kyr), integration goes non-finite. (b) Pre-breakdown 400-kyr
// spectra: free = the metronome (405 kyr dominant 1.20e-2; z: g5 2.6e-2,
// g2 2.4e-2); bounded = 405 collapsed 12× to 9.6e-4, power moved to a
// 105–129-kyr band, z dominated by Earth's imposed +11.595 ″/yr line, g5
// forced term erased. The measured Mesozoic 405-kyr record falsifies the
// bound as built. (JSON note: NaN serialises to null — scan dumps with
// x == null, not isFinite alone.)

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { FORCES, setPiboundTargets, setEboundTarget, setEboundLaw5, setZboundTargets, osculTheta } from './nbody-forces.mjs';
import { HZ, NAMES, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const YEARS = parseFloat(KV.years || '800000'), TAU = parseFloat(KV.tau || '2'), DT = parseFloat(KV.dt || '2');
const GATE = parseFloat(KV.gate || '300'), SAMPLE = parseFloat(KV.sample || '100');
// bound=z — the SHAPE bound (zbound, lattice-comb epicycle targets from the NAFF
// table) instead of the rate bound; pre-registered S1/S3 in zbound-experiment.mjs.
const BOUND = KV.bound || 'pi';
// earth=h3 — the HYBRID UNIVERSE: Earth on the model's e-law (exactly three comb
// lines N0+N24+N48, see zbound-experiment.mjs); pre-registered strata prediction:
// a single 111.8-kyr Earth-e line, no 405 and no 447.
const EARTH_H3 = KV.earth === 'h3';
// hold=earth[,…] — C2, THE MINIMAL-(ii) UNIVERSE (X3 assessment): with bound=z,
// steer only the listed planets (target matching is by osculating a, so the
// filtered list leaves the rest free). hold=earth earth=h3 = the X3 door test:
// Earth held on the H/3 law inside the otherwise-free system. Pre-registered:
// bounded Earth e-spectrum has NO 405-kyr line (joint LS 405 ≈ noise, the H/3
// 112-kyr line ≈ base′/2 = 7.7e-3); free Venus/Mars keep their g₂/g₅ structure
// (⇒ Mars polar strata discriminate reading (i) from (ii)); a 405-kyr leak
// into held-Earth would OPEN door (c) of the assessment.
// RESULT hold=earth earth=h3 (800 kyr): DOOR (c) STAYS CLOSED — held-Earth's
// 405-band collapses ~9× (1.29e-2 → 1.45e-3, a smooth declining tail with NO
// local peak at 405), the H/3 line reads 7.70e-3 = base′/2 EXACTLY as
// pre-registered, and the z-spectrum g-lines collapse 30–60× under the imposed
// +11.595 line (1.30e-2). CAUTION: the joint-LS numbers at 800 kyr are the
// documented ill-conditioning trap (405/447 = 0.19 and 405/383 = 0.11 Rayleigh
// elements — unresolvable); read the single-line DFT here, joint LS only at
// ≥ 4.3 Myr. NEW FINDING: the minimal-(ii) universe DESTABILISES VENUS —
// e_V pumped monotonically 0.028 → 0.165 in 500 kyr, plateau ~0.17 (3× the
// free max 0.06): holding Earth alone removes it from the V–E secular
// exchange and Venus absorbs the difference. Reading (ii) therefore needs at
// least Venus held too — the E16 cascade re-enters. Mars keeps its band
// structure (95-kyr 1.76e-2 vs free 1.90e-2) — the Mars-strata discriminator
// is measurable.
// RESULT 4.3 Myr (the configuration run; zAll recorded): the held-Earth
// universe is STABLE the full span and the cascade SATURATES at Venus —
// e_V plateau 0.173 for all 4.3 Myr (no growth after ~500 kyr), Mercury
// INSIDE its free envelope (max 0.2888 vs free 0.2882), Mars ≈ free
// (0.057–0.125), giants bit-identical (1e-4). The emergent configuration =
// the analytic 7-planet forced-response prediction (held_earth_config.mjs,
// scratchpad) certified line by line: forced epicycles at Earth's 11.595
// line Me 5.62e-2 (pred 5.45e-2), V 0.131 (pred 0.163, nonlinear shave),
// Ma 9.95e-3 (pred 1.08e-2); Venus's proper mode migrates 7.46 → ~12
// (free g2 content collapses 2.14e-2 → 2.5e-4) because without Earth's
// back-reaction g2′ = 12.18, 0.58 ″/yr from the imposed line — the C2 Venus
// pumping IS this near-resonance. METRONOME: at 4.3-Myr resolution the 405
// is erased from Earth (joint LS 1.0e-4 vs free 1.04e-2) AND Venus (4.8e-4
// vs 1.25e-2), replaced by H/3-locked beats (Earth 112 kyr = 7.64e-3 =
// base′/2; Venus/Mars ~173 kyr = E-line − g5). CORRECTION of the 800-kyr
// reading: Mars's apparent 3-4e-3 at the 405 probe was leakage — Mars's own
// free 405 content is only ~5e-4, so Mars strata do NOT discriminate the
// readings; the discriminator is EARTH's strata, where the free universe
// alone carries the 405.
const HOLD = KV.hold ? KV.hold.split(',') : null;
const ASPC = Math.PI / 180 / 3600 / 100;
const DAY = 86400, GM_S = TL.GM_SUN;
const names = NAMES;
function build() {
  const gms = [GM_S, ...names.map(gmOf)], n = gms.length;
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => ({ r: HZ[k].slice(0, 3), v: HZ[k].slice(3, 6) }))];
  const Mt = gms.reduce((s, x) => s + x, 0), rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mt), vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mt);
  const Y0 = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gms, Y0 };
}
function zOf(r, v, mu) {
  const rn = Math.hypot(...r);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  return { k: (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn, h: (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn };
}
const th0 = {};
for (const k of names) th0[k] = osculTheta(HZ[k].slice(0, 3), HZ[k].slice(3, 6), GM_S + gmOf(k));
const REF_A = { mercury: 0.387, venus: 0.723, earth: 1.0, mars: 1.524, jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07 };
const fixRaw = require(ROOT + 'packages/fixtures/regression/script-js.json');
const flat = {}; (function walk(o) { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v); else flat[k] = v; } })(fixRaw);
const RATES = {};
for (const p of names) RATES[p] = p === 'earth' ? 1296000 * 100 / (TL.H / 3) : flat['periFrames.' + p + '.projectedRa@2000'];

function run(bounded) {
  const { gms, Y0 } = build();
  setPiboundTargets(names.map((p) => ({ aRefAU: REF_A[p], theta0: th0[p], rateRadPerYr: RATES[p] * ASPC, gateYr: GATE })));
  // Earth's H/3 e-bound rides along (Law-5-distributed): measured necessary —
  // without it Earth's e dives at +26 kyr and its apse line is uncontrollable.
  setEboundTarget((year) => OE.computeEccentricityEarth(year));
  const dVal = { mercury: 21, venus: 34, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
  const wRaw = names.map((k) => (k === 'earth' ? 0 : Math.sqrt(TL.massFraction[k]) * Math.pow(TL.derived[k].orbitDistance, 1.5) / Math.sqrt(dVal[k])));
  const wSum = wRaw.reduce((s, x) => s + x, 0);
  setEboundLaw5(names.map(gmOf), wRaw.map((x) => x / wSum));
  if (BOUND === 'z') {
    const NAFF = require(ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json');
    const COMB_RAD = 2 * Math.PI / (8 * TL.H);
    const earthH3 = () => {
      const base = TL.eccentricityBase;
      const th0e = osculTheta(HZ.earth.slice(0, 3), HZ.earth.slice(3, 6), GM_S + gmOf('earth'));
      const psi0 = Math.acos(Math.max(-1, Math.min(1, 2 * (OE.computeEccentricityEarth(2000) / base - 1))));
      const mk = (N, amp, ang) => ({ w: N * COMB_RAD, re: amp * Math.cos(ang), im: amp * Math.sin(ang) });
      return [mk(24, base, th0e), mk(48, base / 4, th0e + psi0), mk(0, base / 4, th0e - psi0)];
    };
    setZboundTargets(names.filter((p) => !HOLD || HOLD.includes(p)).map((p) => ({
      aRefAU: REF_A[p], gm: gmOf(p), gateYr: GATE,
      modes: p === 'earth' && EARTH_H3 ? earthH3() : (NAFF.modes[p].z || []).filter((md) => Math.hypot(md.re, md.im) >= 3e-4).slice(0, 6)
        .map((md) => ({ w: Math.round(md.omegaRadPerYr / COMB_RAD) * COMB_RAD, re: md.re, im: md.im })),
    })));
  }
  const boundForces = BOUND === 'z' ? [FORCES.zbound(TAU)] : [FORCES.eboundlaw5(TAU), FORCES.pibound(TAU)];
  const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces: bounded ? boundForces : [] });
  const eE = [], kE = [], hE = [], eV = [], eMa = [];
  // hold mode: record EVERY planet's z — the emergent all-planet configuration
  // of the held-Earth universe is the measurement (NAFF-able per planet)
  const zAll = HOLD ? names.map(() => ({ k: [], h: [] })) : null;
  const steps = Math.round(YEARS * 365.25 / DT), every = Math.round(SAMPLE * 365.25 / DT);
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) {
      const hh = sim.helio(3), z = zOf(hh.r, hh.v, GM_S + gms[3]);
      eE.push(Math.hypot(z.k, z.h)); kE.push(z.k); hE.push(z.h);
      const v = sim.helio(2), m = sim.helio(4);
      const zv = zOf(v.r, v.v, GM_S + gms[2]), zm = zOf(m.r, m.v, GM_S + gms[4]);
      eV.push(Math.hypot(zv.k, zv.h)); eMa.push(Math.hypot(zm.k, zm.h));
      if (zAll) for (let i = 0; i < names.length; i++) { const hp = sim.helio(i + 1), zp = zOf(hp.r, hp.v, GM_S + gms[i + 1]); zAll[i].k.push(+zp.k.toFixed(6)); zAll[i].h.push(+zp.h.toFixed(6)); }
    }
    sim.step();
  }
  return { eE, kE, hE, eV, eMa, zAll };
}
// Hann-windowed DFT amplitude at period P (years)
function amp(series, dtYr, Pyr) {
  const n = series.length, w = 2 * Math.PI * dtYr / Pyr;
  let re = 0, im = 0, norm = 0;
  const mean = series.reduce((s, x) => s + x, 0) / n;
  for (let i = 0; i < n; i++) {
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
    re += (series[i] - mean) * hann * Math.cos(w * i); im += (series[i] - mean) * hann * Math.sin(w * i);
    norm += hann;
  }
  return 2 * Math.hypot(re, im) / norm;
}
// complex DFT of z at signed frequency f (″/yr); positive = prograde
function zAmp(kA, hA, dtYr, fArcsecYr) {
  const n = kA.length, w = 2 * Math.PI * dtYr * fArcsecYr / 1296000;
  let re = 0, im = 0, norm = 0;
  for (let i = 0; i < n; i++) {
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
    const c = Math.cos(w * i), s = Math.sin(w * i);
    re += hann * (kA[i] * c + hA[i] * s); im += hann * (hA[i] * c - kA[i] * s);
    norm += hann;
  }
  return Math.hypot(re, im) / norm;
}
console.log(`strata run: control + gated all-planet ${BOUND === 'z' ? 'SHAPE bound (zbound, comb targets)' : 'rate bound (pibound + ebound)'} (gate ${GATE} yr, τ ${TAU} kyr), ${YEARS / 1000} kyr, sampled every ${SAMPLE} yr…`);
const t0 = Date.now();
const ctl = run(false); console.log(`control done (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
const bnd = run(true); console.log(`bounded done (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
const outName = BOUND === 'z' ? (HOLD ? './zbound-strata-hold.local.json' : EARTH_H3 ? './zbound-strata-h3.local.json' : './zbound-strata.local.json') : './pibound-strata.local.json';
writeFileSync(new URL(outName, import.meta.url), JSON.stringify({ years: YEARS, gate: GATE, tauKyr: TAU, bound: BOUND, sampleYears: SAMPLE, control: ctl, bounded: bnd }));
console.log(`wrote tools/explore/${outName.slice(2)}\n`);
console.log('Earth e(t) amplitude spectrum (Hann DFT), the strata beats:');
console.log('  period kyr    free       bounded');
for (const P of [600, 447, 405, 383, 305, 240, 173, 129, 124, 112, 105, 95, 75, 55]) {   // 447 = 8H/6, 383 = 8H/7: the only comb lines flanking the measured 405; 112 = H/3, the hybrid's predicted line
  console.log(`  ${String(P).padStart(8)}    ${amp(ctl.eE, SAMPLE, P * 1000).toExponential(2)}   ${amp(bnd.eE, SAMPLE, P * 1000).toExponential(2)}`);
}
// Joint two-frequency LS at the KNOWN candidate periods — separates lines closer
// than the DFT resolution (at 4.3 Myr, 405 vs 447 kyr are ~1 Rayleigh element
// apart; the joint fit handles the ~0.2 cross-talk exactly).
function jointAmp(series, dtYr, P1yr, P2yr) {
  const n = series.length, mean = series.reduce((s, x) => s + x, 0) / n;
  const w1 = 2 * Math.PI * dtYr / P1yr, w2 = 2 * Math.PI * dtYr / P2yr;
  const B = [[], [], [], []];
  for (let i = 0; i < n; i++) { B[0].push(Math.cos(w1 * i)); B[1].push(Math.sin(w1 * i)); B[2].push(Math.cos(w2 * i)); B[3].push(Math.sin(w2 * i)); }
  const G = Array.from({ length: 4 }, (_, a) => Array.from({ length: 4 }, (_, b) => B[a].reduce((s, x, i) => s + x * B[b][i], 0)));
  const rhs = B.map((col) => col.reduce((s, x, i) => s + x * (series[i] - mean), 0));
  // solve 4×4
  const A = G.map((r, i) => [...r, rhs[i]]);
  for (let c = 0; c < 4; c++) {
    let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < 4; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc <= 4; cc++) A[r][cc] -= f * A[c][cc]; }
  }
  const x = [0, 0, 0, 0];
  for (let r = 3; r >= 0; r--) { let s = A[r][4]; for (let c = r + 1; c < 4; c++) s -= A[r][c] * x[c]; x[r] = s / A[r][r]; }
  return { a1: Math.hypot(x[0], x[1]), a2: Math.hypot(x[2], x[3]) };
}
for (const [Pa, Pb] of [[405, 447], [405, 383]]) {
  const jc = jointAmp(ctl.eE, SAMPLE, Pa * 1000, Pb * 1000), jb = jointAmp(bnd.eE, SAMPLE, Pa * 1000, Pb * 1000);
  console.log(`joint LS ${Pa}/${Pb} kyr — free: ${jc.a1.toExponential(2)} / ${jc.a2.toExponential(2)}   bounded: ${jb.a1.toExponential(2)} / ${jb.a2.toExponential(2)}`);
}
console.log('\nEarth z-spectrum |amplitude| at the forcing lines (″/yr; + prograde):');
console.log('  line                     free       bounded');
for (const [label, f] of [['g5  +4.257', 4.257], ['g2  +7.456', 7.456], ['g3  +17.37', 17.37], ['g4  +17.92', 17.92], ['g6  +28.25', 28.25], ['J line +17.465', 17.465], ['S line −34.219', -34.219], ['E line +11.595', 11.595]]) {
  console.log(`  ${label.padEnd(20)}   ${zAmp(ctl.kE, ctl.hE, SAMPLE, f).toExponential(2)}   ${zAmp(bnd.kE, bnd.hE, SAMPLE, f).toExponential(2)}`);
}
console.log('\nVenus / Mars e ranges: free V', Math.min(...ctl.eV).toFixed(4), '–', Math.max(...ctl.eV).toFixed(4),
  ' bnd V', Math.min(...bnd.eV).toFixed(4), '–', Math.max(...bnd.eV).toFixed(4),
  ' | free Ma', Math.min(...ctl.eMa).toFixed(4), '–', Math.max(...ctl.eMa).toFixed(4),
  ' bnd Ma', Math.min(...bnd.eMa).toFixed(4), '–', Math.max(...bnd.eMa).toFixed(4));
if (HOLD) {   // C2: do the FREE neighbours keep the metronome while held-Earth loses it?
  console.log('\nfree-neighbour e-spectra at the metronome probes (Hann DFT):');
  console.log('  period kyr    Venus free  Venus bnd   Mars free   Mars bnd');
  for (const P of [447, 405, 383, 173, 112, 95]) {
    console.log(`  ${String(P).padStart(8)}    ${amp(ctl.eV, SAMPLE, P * 1000).toExponential(2)}   ${amp(bnd.eV, SAMPLE, P * 1000).toExponential(2)}   ${amp(ctl.eMa, SAMPLE, P * 1000).toExponential(2)}   ${amp(bnd.eMa, SAMPLE, P * 1000).toExponential(2)}`);
  }
  const jv = jointAmp(bnd.eV, SAMPLE, 405000, 447000), jm = jointAmp(bnd.eMa, SAMPLE, 405000, 447000);
  console.log(`joint LS 405/447 (bounded universe): Venus ${jv.a1.toExponential(2)} / ${jv.a2.toExponential(2)}   Mars ${jm.a1.toExponential(2)} / ${jm.a2.toExponential(2)}`);
  console.log('\nper-planet e ranges — the emergent held-Earth configuration:');
  const mm = (a) => a.reduce((s, x) => [Math.min(s[0], x), Math.max(s[1], x)], [Infinity, -Infinity]);
  for (const [i, p] of names.entries()) {
    const eOf = (zc) => zc.k.map((k2, j2) => Math.hypot(k2, zc.h[j2]));
    const [cLo, cHi] = mm(eOf(ctl.zAll[i])), [bLo, bHi] = mm(eOf(bnd.zAll[i]));
    console.log(`  ${p.padEnd(8)} free ${cLo.toFixed(4)}–${cHi.toFixed(4)}   bnd ${bLo.toFixed(4)}–${bHi.toFixed(4)}`);
  }
}

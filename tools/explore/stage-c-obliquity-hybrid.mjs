#!/usr/bin/env node
// STAGE C LAB 1 — the obliquity/spin HYBRID (engine-switch record, plan 02 §8;
// K8b-3/D5 opening result).
//
// eps(t) from the single averaged precession equation with the orbit plane
// from ENGINE D (the deep ±10-Myr zeta modes, data/nbody-deep-secular-modes,
// anchored at the JPL J2000 seed) and the spin rate from ENGINE K (ONE
// anchor: p = H/13, the equinox precession rate at J2000). Zero fitted
// constants — no harmonic table, no amplitude solve.
//
//   ds/dt = alpha (s·n̂) (s × n̂)         s = spin axis (J2000 ecliptic frame)
//   n̂(t)  = orbit normal from ζ(t) = sin(i/2)·e^{iΩ}  (anchored mode sum)
//   alpha = (H/13 rate) / cos ε₀          ε(t) = angle(s, n̂)
//
// MEASURED (first run, RK4 dt 5 yr, 0 → −1 Myr; La2004 = THEORY reference):
//   dε/dt(J2000) = −46.96 ″/cy  vs IAU −46.84 (0.25%) — the value the
//     shipped scene A-solve TARGETS is here DERIVED (an input becomes an
//     output);
//   ε vs La2004:  0–13 kyr  51″ rms corr 0.999  (shipped fitted law: 711″)
//                 0–270 kyr 544″ corr 0.977      (fitted law: 2919″, 0.32)
//                 0–1 Myr   715″ corr 0.935      (fitted law: decorrelated)
//   the dominant obliquity beat emerges as p − |s₃| = 41.2 kyr — the H/8
//     identity the P6 record states, derived natively.
// CONVENTION CATCH (measured): the J2000 celestial pole sits at ecliptic
//   longitude +90° — s₀ = (0, +sin ε₀, cos ε₀); the −90° choice gives a
//   perfect ANTI-correlation (−0.998), the instant tell.
//
// Refinement queue (plan 02 Stage C): alpha's eccentricity modulation (the
// solar third scales (1−e²)^{−3/2} — the deep e supplies it), more ζ terms
// (the banked table carries 8), alpha riding H(t) at deep time (the
// falsification-leg statement), then the shipping design (Step 6b + the
// scene A-geometry are the replaced pair) and the planetary Cassini route.
import { readFileSync } from 'node:fs';
import * as phys from '@essrt/physics';

const model = phys.createModel();
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

// ── engine D side: anchored ζ(t) from the banked deep mode table ──────────
const MT = JSON.parse(readFileSync(new URL('../../data/nbody-deep-secular-modes.json', import.meta.url), 'utf8'));
const ZETA = MT.modes.earth.zeta;
const AE = /** @type {any} */ (phys.CHAIN_ARTIFACT).j2000AnchorElements.earth;
const s2 = Math.sin(AE.inclEclipticDeg / 2 * D2R);
const zetaA = [s2 * Math.cos(AE.ascNodeEclipticDeg * D2R), s2 * Math.sin(AE.ascNodeEclipticDeg * D2R)];
/** Anchored ζ(t) evaluator for a given mode subset (the anchored-remainder
 *  form pins the unresolved content at the JPL J2000 seed).
 *  @param {Array<{omegaRadPerYr:number,re:number,im:number}>} modes */
function mkAnchoredZeta(modes) {
  const sum = (t) => { let re = 0, im = 0; for (const m of modes) { const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t); re += m.re * c - m.im * s; im += m.re * s + m.im * c; } return [re, im]; };
  const s0 = sum(0), R = [zetaA[0] - s0[0], zetaA[1] - s0[1]];
  return (t) => { const [x, y] = sum(t); return [x + R[0], y + R[1]]; };
}
/** Orbit normal (J2000-ecliptic components) from an anchored ζ evaluator. */
function orbitNormalFrom(zAtV, t) {
  const [q, p] = zAtV(t);
  const sih = Math.hypot(q, p);
  const i = 2 * Math.asin(Math.min(1, sih));
  const Om = Math.atan2(p, q);
  return [Math.sin(i) * Math.sin(Om), -Math.sin(i) * Math.cos(Om), Math.cos(i)];
}

// ── engine K side: the single anchor — p = H/13 at J2000 ──────────────────
const psiDotJ2000 = (360 / model.epoch.axialPrecessionYearsAtYear(2000)) * D2R;   // rad/yr
const EPS0 = model.constants.earthOrbital.obliquityJ2000_deg * D2R;   // the one home (E20)
const ALPHA = psiDotJ2000 / Math.cos(EPS0);
console.log(`alpha = ${(ALPHA * R2D * 3600).toFixed(3)}"/yr  (H/13 rate ${(psiDotJ2000 * R2D * 3600).toFixed(3)}"/yr; literature precession constant ~54.9)`);

// ── integrate ds/dt = ALPHA (s·n)(s×n), RK4, 0 → −1 Myr (per variant) ─────
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// the J2000 celestial pole: ecliptic longitude +90° (the convention catch)
// Two ζ depths, the TWO-TIER verdict (measured tension, plan 02 Stage C):
// the top-8 slice owns the era window (~51″ class over 0–13 kyr), the full
// table owns deep time (flat ~0.1° across the megayear, no decorrelation).
const la = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8')
  .trim().split('\n').map(l => l.trim().split(/\s+/).map(x => Number(x.replace('D', 'E'))));
const laEps = new Map(la.map(r => [Math.round(-r[0]), r[2] * R2D]));
const epsK = (y) => model.earth.obliquityDeg(y);
const corr = (a, b) => { const m = (x) => x.reduce((p, c) => p + c) / x.length; const ma = m(a), mb = m(b); let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return ab / Math.sqrt(aa * bb); };

function runVariant(zetaSubset) {
  const zAtV = mkAnchoredZeta(zetaSubset);
  const nrm = (t) => orbitNormalFrom(zAtV, t);
  const derivV = (s, t) => { const n = nrm(t); const k = ALPHA * dot(s, n); const c = cross(s, n); return [k * c[0], k * c[1], k * c[2]]; };
  const rk4V = (s, t, h) => {
    const k1 = derivV(s, t);
    const k2 = derivV([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1], s[2] + h / 2 * k1[2]], t + h / 2);
    const k3 = derivV([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1], s[2] + h / 2 * k2[2]], t + h / 2);
    const k4 = derivV([s[0] + h * k3[0], s[1] + h * k3[1], s[2] + h * k3[2]], t + h);
    const o = [0, 1, 2].map(i => s[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    const r = Math.hypot(o[0], o[1], o[2]);
    return [o[0] / r, o[1] / r, o[2] / r];
  };
  let S = [0, Math.sin(EPS0), Math.cos(EPS0)], t = 0;
  const eps = new Map([[0, Math.acos(dot(S, nrm(0))) * R2D]]);
  while (t > -1_000_000) { S = rk4V(S, t, -5); t -= 5; if (Math.round(t) % 1000 === 0) eps.set(Math.round(-t / 1000), Math.acos(dot(S, nrm(t))) * R2D); }
  // J2000 rate (±100-yr central difference)
  let sf = [0, Math.sin(EPS0), Math.cos(EPS0)], tt = 0;
  while (tt < 100) { sf = rk4V(sf, tt, 5); tt += 5; }
  let sb = [0, Math.sin(EPS0), Math.cos(EPS0)]; tt = 0;
  while (tt > -100) { sb = rk4V(sb, tt, -5); tt -= 5; }
  const rate = ((Math.acos(dot(sf, nrm(100))) - Math.acos(dot(sb, nrm(-100)))) * R2D / 200) * 3600 * 100;
  const windows = {};
  for (const kyrMax of [13, 50, 130, 270, 600, 1000]) {
    let sh = 0, sk = 0, n = 0; const vh = [], vk = [], vl = [];
    for (let k = 0; k <= kyrMax; k++) {
      const l = laEps.get(k), h = eps.get(k);
      if (l === undefined || h === undefined) continue;
      const kk = epsK(2000 - k * 1000);
      sh += (h - l) ** 2; sk += (kk - l) ** 2; n++;
      vh.push(h); vk.push(kk); vl.push(l);
    }
    windows[kyrMax] = {
      hybridRmsArcsec: Math.sqrt(sh / n) * 3600, hybridCorr: corr(vh, vl),
      fittedLawRmsArcsec: Math.sqrt(sk / n) * 3600, fittedLawCorr: corr(vk, vl),
    };
  }
  return { rateArcsecPerCy: rate, windows };
}

const zetaAll = ZETA;
// The era tier is its OWN pure 8-term extraction (banked as earthZetaEra) —
// a top-8 slice of the deep table is NOT equivalent (Gram–Schmidt on the
// later multiplet terms reshapes the early amplitudes; measured 0.5″/cy on
// the J2000 rate). The slice is only the fallback for pre-era artifacts.
const zeta8 = MT.earthZetaEra ?? ZETA.slice(0, Math.min(8, ZETA.length));
const full = runVariant(zetaAll);
const era = runVariant(zeta8);
// dominant obliquity beat: the equinox and the node BOTH regress, so the
// relative rate is the DIFFERENCE |psi-dot| − |s₃| (the H/8 identity).
const sDom = ZETA.filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
  .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
const beatKyr = 2 * Math.PI / (psiDotJ2000 - Math.abs(sDom.omegaRadPerYr)) / 1000;

console.log(`d eps/dt at J2000 (hybrid, full ζ): ${full.rateArcsecPerCy.toFixed(2)} "/cy   (IAU −46.84 — the shipped A-solve's TARGET, here derived)`);
console.log(`dominant obliquity beat p − |s₃|: ${beatKyr.toFixed(1)} kyr (the H/8 identity, derived)`);
for (const [label, v] of [['full ζ table', full], [`top-${zeta8.length} ζ slice`, era]]) {
  console.log(`\n== eps(t) vs La2004 — ${label} — vs the shipped fitted law ==`);
  for (const kyrMax of [13, 50, 130, 270, 600, 1000]) {
    const w = v.windows[kyrMax];
    console.log(`  0-${String(kyrMax).padEnd(4)} kyr:  hybrid rms ${w.hybridRmsArcsec.toFixed(1).padStart(7)}"  corr ${w.hybridCorr.toFixed(3)}   |  fitted law rms ${w.fittedLawRmsArcsec.toFixed(1).padStart(7)}"  corr ${w.fittedLawCorr.toFixed(3)}`);
  }
}

if (process.argv.includes('--json')) {
  console.log('@@OBLIQUITY_HYBRID_JSON@@ ' + JSON.stringify({
    alphaArcsecPerYr: ALPHA * R2D * 3600,
    psiDotH13ArcsecPerYr: psiDotJ2000 * R2D * 3600,
    rateFullArcsecPerCy: full.rateArcsecPerCy,
    rateEraArcsecPerCy: era.rateArcsecPerCy,
    beatKyr,
    zetaTermsFull: zetaAll.length, zetaTermsEra: zeta8.length,
    windowsFull: full.windows, windowsEra: era.windows,
  }));
}

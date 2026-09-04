#!/usr/bin/env node
// T3 — THE BALANCE LAWS WITH DYNAMICAL INPUTS (plan IP-two-engine-model §4 T3,
// P2's read-only instrument; owner-directed 2026-09-05). The Fibonacci balance
// laws (Laws 3/5, Config #7) are engine-K claims about engine-D quantities:
// node integers (ascendingNodeCyclesIn8H), base eccentricities, inclination
// amplitudes. This instrument re-evaluates them with the engine's own values
// and prints the outcomes side by side. Read-only: touches nothing.
//
//   A. reproduction gate — shipped inputs must reproduce Law 5 = 99.8636 %
//      (base e) and the Saturn prediction 0.05371910 before anything is swapped
//   B. engine-D eccentricities — time-mean e over the 4.3-Myr free run
//      (zbound-strata-hold.local.json control) and the dominant-z-mode
//      amplitude (NAFF table), replacing the model's base e
//   C. node rates — shipped −8H/N vs the engine's s-frequencies (dominant
//      ζ mode, ecliptic NAFF): the Config-7 rate/direction filter re-scored
//   D. uniqueness null — the E5/E12-class control never run on Law 5:
//      random d-assignments (d ∈ {1,2,3,5,8,13,21,34}, Saturn antiphase
//      fixed) and all 24 mirror-pair permutations, ranked against the
//      shipped config under BOTH input sets
//
// Pre-registered expectations (plan T3): the scalar percentages move (they
// were optimised on the shipped inputs); whether mirror structure and
// uniqueness survive is unknown — that is the test. Three outcomes, all
// acceptable: stronger law / weaker typed law / retired with record kept.
//
// RESULT (2026-09-05): the MIDDLE outcome, with the rate half retired.
// A: reproduction exact (99.8636 / 0.05371910). B: under engine-D long-term
// mean e's the Law 5 balance reads 98.19 % (mode-amp e: 97.81) and the
// Saturn prediction misses Saturn's dynamical mean by 3.6 % (0.05159 vs
// 0.05349) — the headline 0.001 % was a property of the tuned inputs.
// C: the node-rate structure is DEAD under engine D — deviations Venus 97 %,
// Uranus 77 %, Mars 76 %, J/S 34 %, Mercury 22 %; only Earth (5 %) and
// Neptune (4.4 %) near; J and S share one dominant ζ line (s6), Venus rides
// s3-class — borrower physics again. D: the d-assignment stays better than
// random under engine inputs (top 2.4 % of 50k random d's; mirror rank 1/24
// with mean e) BUT this is expected survivorship, not confirmation: the d's
// were searched against base/J2000 inputs that correlate ~±30 % with the
// dynamical means, and under mode-amp inputs a DIFFERENT mirror permutation
// wins (rank 3/24, best 99.62) — uniqueness does not survive input choice.
// Law 3's static form is insensitive to dynamics by construction (e enters
// only via 1−e²) — its % is a mass-geometry identity given the d's.
// VERDICT: static Law 5 survives as an approximate, typed observation
// (~98 % under real long-term means); the exact-balance, Saturn-prediction
// and node/rate (Config #7) structural claims do not survive engine D.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const NAFF = require(ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json');
const DUMP = require(ROOT + 'tools/explore/zbound-strata-hold.local.json');

const P = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const mass = TL.massFraction;
const aAU = Object.fromEntries(P.map((p) => [p, p === 'earth' ? 1 : TL.derived[p].orbitDistance]));
const eBase = Object.fromEntries(P.map((p) => [p, p === 'earth' ? TL.eccentricityBase : TL.planets[p].orbitalEccentricityBase]));
const dOf = Object.fromEntries(P.map((p) => [p, p === 'earth' ? 3 : TL.planets[p].fibonacciD]));
const anti = Object.fromEntries(P.map((p) => [p, p === 'earth' ? false : !!TL.planets[p].antiPhase]));

// Law 5: v = √m · a^1.5 · e / √d ; balance = 1 − |Σanti − Σrest|/Σall
function law5(e, d = dOf, antiSet = anti) {
  let rest = 0, an = 0;
  for (const p of P) {
    const v = Math.sqrt(mass[p]) * Math.pow(aAU[p], 1.5) * e[p] / Math.sqrt(d[p]);
    if (antiSet[p]) an += v; else rest += v;
  }
  return (1 - Math.abs(an - rest) / (an + rest)) * 100;
}
// Law 5 Saturn prediction: e_S making the balance exact
function saturnPred(e, d = dOf) {
  let rest = 0;
  for (const p of P) { if (p === 'saturn') continue; rest += Math.sqrt(mass[p]) * Math.pow(aAU[p], 1.5) * e[p] / Math.sqrt(d[p]); }
  return rest * Math.sqrt(d.saturn) / (Math.sqrt(mass.saturn) * Math.pow(aAU.saturn, 1.5));
}
// Law 3 (static): w = √(m·a·(1−e²))/d
function law3(e, d = dOf) {
  let rest = 0, an = 0;
  for (const p of P) {
    const w = Math.sqrt(mass[p] * aAU[p] * (1 - e[p] * e[p])) / d[p];
    if (anti[p]) an += w; else rest += w;
  }
  return (1 - Math.abs(an - rest) / (an + rest)) * 100;
}

// engine-D eccentricity means from the 4.3-Myr FREE control (100-yr cadence)
const eMean = {}, eMeanSq = {};
for (const [i, p] of P.entries()) {
  const { k, h } = DUMP.control.zAll[i];
  let s = 0, s2 = 0;
  for (let j = 0; j < k.length; j++) { const e = Math.hypot(k[j], h[j]); s += e; s2 += e * e; }
  eMean[p] = s / k.length; eMeanSq[p] = s2 / k.length;
}
// dominant z-mode amplitude per planet (NAFF, 1-Myr free run)
const eModeAmp = Object.fromEntries(P.map((p) => {
  const amps = (NAFF.modes[p].z || []).map((m) => Math.hypot(m.re, m.im));
  return [p, Math.max(...amps)];
}));
// engine-D node rates: dominant ζ mode (″/cy), excluding the near-zero
// invariable-tilt line (|ω| < 3e-6 rad/yr)
const RAD2ASCY = 206264.806 * 100;
const sRate = Object.fromEntries(P.map((p) => {
  const zs = (NAFF.modes[p].zeta || []).filter((m) => Math.abs(m.omegaRadPerYr) > 3e-6);
  zs.sort((x, y) => Math.hypot(y.re, y.im) - Math.hypot(x.re, x.im));
  return [p, zs.length ? zs[0].omegaRadPerYr * RAD2ASCY : NaN];
}));

console.log('T3 — the balance laws with dynamical inputs (read-only)\n');
console.log('A. REPRODUCTION GATE (shipped inputs):');
console.log(`   Law 5 balance (base e) = ${law5(eBase).toFixed(4)} %   (reference 99.8636)`);
console.log(`   Saturn prediction      = ${saturnPred(eBase).toFixed(8)} (reference 0.05371910)`);
console.log(`   Law 3 balance (base e) = ${law3(eBase).toFixed(4)} %`);

console.log('\nB. ENGINE-D ECCENTRICITIES (free 4.3-Myr time-mean | dominant z-mode amp | shipped base):');
for (const p of P) console.log(`   ${p.padEnd(8)} ${eMean[p].toFixed(5)}   ${eModeAmp[p].toFixed(5)}   ${eBase[p].toFixed(5)}`);
console.log(`   Law 5 with time-mean e:     ${law5(eMean).toFixed(4)} %   Saturn pred ${saturnPred(eMean).toFixed(5)} vs dyn mean ${eMean.saturn.toFixed(5)}`);
console.log(`   Law 5 with mode-amp e:      ${law5(eModeAmp).toFixed(4)} %   Saturn pred ${saturnPred(eModeAmp).toFixed(5)}`);
console.log(`   Law 3 with time-mean e:     ${law3(eMean).toFixed(4)} %   (e enters only via 1−e² — insensitivity expected)`);

console.log('\nC. NODE RATES — shipped −8H/N vs engine-D s (dominant ζ mode, ″/cy):');
for (const p of P) {
  const N = p === 'earth' ? 40 : TL.planets[p].ascendingNodeCyclesIn8H;
  const shipped = -1296000 * 100 / (8 * TL.H / N);
  const dev = (shipped - sRate[p]) / Math.abs(sRate[p]) * 100;
  console.log(`   ${p.padEnd(8)} shipped ${shipped.toFixed(1).padStart(8)}   engine ${sRate[p].toFixed(1).padStart(8)}   dev ${dev.toFixed(1).padStart(7)} %`);
}

console.log('\nD. UNIQUENESS NULL on Law 5 (Saturn antiphase fixed):');
const DVALS = [1, 2, 3, 5, 8, 13, 21, 34];
function rankUnder(e, label) {
  const shipped = law5(e);
  let beat = 0;
  const M = 50000;
  for (let m = 0; m < M; m++) {
    const d = Object.fromEntries(P.map((p) => [p, DVALS[Math.floor(Math.random() * DVALS.length)]]));
    if (law5(e, d) > shipped) beat++;
  }
  // all 24 mirror permutations of {3,5,21,34} over the four pairs
  const pairs = [['earth', 'saturn'], ['mars', 'jupiter'], ['mercury', 'uranus'], ['venus', 'neptune']];
  const perms = [];
  const vals = [3, 5, 21, 34];
  const permute = (arr, pre = []) => { if (!arr.length) perms.push(pre); for (let i = 0; i < arr.length; i++) permute(arr.filter((_, j) => j !== i), [...pre, arr[i]]); };
  permute(vals);
  const mirrorScores = perms.map((pm) => {
    const d = {};
    pairs.forEach(([a, b], i) => { d[a] = pm[i]; d[b] = pm[i]; });
    return law5(e, d);
  }).sort((x, y) => y - x);
  const mirrorRank = mirrorScores.findIndex((x) => x <= shipped + 1e-12) + 1;
  console.log(`   ${label}: shipped ${shipped.toFixed(3)} %; random-d P(beat) = ${(beat / M).toFixed(3)}; mirror-perm rank ${mirrorRank}/24 (best ${mirrorScores[0].toFixed(3)} %)`);
}
rankUnder(eBase, 'shipped base e   ');
rankUnder(eMean, 'engine-D mean e  ');
rankUnder(eModeAmp, 'engine-D mode amp');

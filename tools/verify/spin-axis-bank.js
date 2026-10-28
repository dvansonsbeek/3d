#!/usr/bin/env node
/**
 * THE SPIN-AXIS CHECKPOINT BANK — the walk's exact state every 250 kyr (plan 24).
 *
 *   node tools/verify/spin-axis-bank.js            reproduce + compare against the record
 *   node tools/verify/spin-axis-bank.js --write    (re)write data/spin-axis-checkpoints.json (~25 min)
 *
 * WHAT IT IS. The one-source movement's obliquity and equinox of date come from
 * an RK4 walk of the spin axis ŝ from the J2000 state over the cited Earth–Moon
 * history (earth/deep-orbital-history.cjs). The walk is a pure function of (ŝ, t):
 * a node is computed from the state alone, nothing accumulates, and a walk
 * continued from any stored state takes the same steps as the continuous one.
 * So the bank is the continuous walk's state at every multiple of SPACING over
 * the model's domain — the cited history's span into the past, the chart's
 * +1 Gyr into the future — and a runtime query seats its walk on the nearest
 * checkpoint on its near side and walks at most one spacing (~5,000 steps,
 * ~50 ms) instead of from J2000 (−4.43 Gyr: ~90 million steps at the converged
 * step). Every node it yields is bit-identical to the full walk's: the purity
 * gate's bank row pins it on both Node twins.
 *
 * WHY THE STEP IS IN HERE TOO. Measured at the plan (2026-10): the former fixed
 * 250-yr step was outside RK4's asymptotic regime beyond a few Myr — against a
 * 50-yr walk the obliquity parted by 0.8″ at 5 Ma, 318″ at 100 Ma, 0.12° at
 * 500 Ma, 2° at 2.46 Ga, and at 4 Ga the axis had collapsed onto the orbit normal
 * (ε 0.07°); the equinox phase by 9° at 100 Ma. The 50-yr walk is converged
 * (0.10″ / 10″ at 100 Ma against a 10-yr walk). The schedule now lives in the
 * factory (5 yr in the era, then the largest divisor of 1000 up to 50 yr that
 * keeps ≥ 100 steps per torque period); the bank is what makes it affordable at
 * runtime, and this generator is where the converged claim is GATED (below).
 *
 * GATES under --write (REFUSE on any failure):
 *   1. seat-and-resume — for every 20th checkpoint k, a pure walk from the stored
 *      state k to t_{k+1} equals the stored state k+1 bit-exactly (the JSON
 *      round-trip and the step grid both hold);
 *   2. convergence — at 100 Ma, 500 Ma and 2.46 Ga, the stored walk over the last
 *      2 Myr from its preceding checkpoint against the same stretch at a fixed
 *      10-yr step: ε within 1″, the equinox within 60″ (the schedule's local
 *      accuracy on the real integrand, not a step-count argument);
 *   3. the J2000 state is the factory's own (the anchor identity).
 * Plain run: re-walks the first 5 Myr each way and compares every checkpoint
 * there bit-exactly with the record (seconds), and checks the record's meta
 * against the live factory's schedule.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const DOH = require('../lib/deep-orbital-history');

const OUT = path.join(ROOT, 'data', 'spin-axis-checkpoints.json');
const WRITE = process.argv.includes('--write');
const SPACING_YR = 250000;
const DOMAIN_PAST_YR = -4425000000;    // the last checkpoint inside the cited history (null beyond 4,429 Ma)
const DOMAIN_FUTURE_YR = 1000000000;   // the charts' full range
const INPUT_FILES = [
  'tools/verify/spin-axis-bank.js',
  'packages/physics/src/earth/deep-orbital-history.cjs',
  'tools/lib/deep-orbital-history.js',
  'tools/lib/deep-time.js',
  'tools/lib/constants.js',
  'data/nbody-secular-series.json',
  'data/nbody-deep-secular-modes.json',
  'packages/physics/src/planets/chain-artifact.js',
  'packages/physics/src/moon/deep-modes-artifact.cjs',
  'packages/physics/src/deltat/deep-time-chain.js',
  'packages/physics/src/deltat/deep-time.cjs',
  'packages/physics/src/deltat/moon-distance-history.cjs',
  'packages/physics/src/deltat/moon-distance-artifact.cjs',
  'packages/physics/src/climate/l1-orbital.cjs',
  'packages/physics/src/constants/generated.js',
  'packages/physics/src/constants/coefficients.js',
  'public/input/astro-reference.json',
  'public/input/climate-formula-coefficients.json',
];

const R2D = 180 / Math.PI;
const same3 = (/** @type {number[]} */ a, /** @type {number[]} */ b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const w180 = (/** @type {number} */ d) => ((d + 540) % 360 + 360) % 360 - 180;
const gate = (/** @type {boolean} */ ok, /** @type {string} */ msg) => { if (!ok) { console.error('REFUSING: ' + msg); process.exit(1); } };

function main() {
  const hist = DOH.createOneSourceTier({ bank: false });   // the CONTINUOUS walk — never seated on the record it writes
  if (!hist) { console.error('REFUSING: data/nbody-secular-series.json is absent.'); process.exit(1); }

  if (WRITE) {
    const t0 = Date.now();
    console.log(`walking the spin axis to ${DOMAIN_PAST_YR / 1e6} Myr and +${DOMAIN_FUTURE_YR / 1e6} Myr at the converged schedule …`);
    const past = hist.recordStates(DOMAIN_PAST_YR, SPACING_YR);
    console.log(`  past: ${past.length} checkpoints in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    const t1 = Date.now();
    const future = hist.recordStates(DOMAIN_FUTURE_YR, SPACING_YR);
    console.log(`  future: ${future.length} checkpoints in ${((Date.now() - t1) / 60000).toFixed(1)} min`);
    const checkpoints = [...past].reverse().concat(future);   // ascending t

    // gate 1 — seat-and-resume, every 20th checkpoint
    let resumed = 0;
    for (const arr of [past, future]) {
      for (let k = 0; k + 1 < arr.length; k += 20) {
        const r = hist.walkFrom(arr[k].s, arr[k].t, arr[k + 1].t);
        gate(same3(r.s, arr[k + 1].s), `seat-and-resume: the walk from the checkpoint at ${arr[k].t} does not reproduce the checkpoint at ${arr[k + 1].t} bit-exactly`);
        resumed++;
      }
    }
    // gate 2 — convergence at three ages: the schedule vs a fixed 10-yr step over the last 2 Myr
    const converge = [];
    for (const ageMa of [100, 500, 2460]) {
      const tEnd = -ageMa * 1e6, tStart = tEnd + 2e6;
      const cs = past.find((c) => c.t === tStart);
      gate(!!cs, `convergence: no checkpoint at ${tStart}`);
      const a = hist.walkFrom(/** @type {any} */ (cs).s, tStart, tEnd);
      const b = hist.walkFrom(/** @type {any} */ (cs).s, tStart, tEnd, 10);
      // compare as obliquity and equinox-node longitude from the two states at tEnd through the factory's own sampler form
      const epsA = Math.acos(a.s[2]) * R2D, epsB = Math.acos(b.s[2]) * R2D;   // ε against the J2000 ecliptic pole — the same frame for both
      const lonA = Math.atan2(a.s[1], a.s[0]) * R2D, lonB = Math.atan2(b.s[1], b.s[0]) * R2D;
      const dEps = (epsA - epsB) * 3600, dLon = w180(lonA - lonB) * 3600;
      converge.push({ ageMa, dEpsArcsec: Number(dEps.toFixed(4)), dLonArcsec: Number(dLon.toFixed(3)) });
      gate(Math.abs(dEps) <= 1 && Math.abs(dLon) <= 60, `convergence at ${ageMa} Ma: schedule vs 10-yr step over 2 Myr — Δε ${dEps.toFixed(3)}″, Δlon ${dLon.toFixed(2)}″ (gate 1″ / 60″)`);
      console.log(`  convergence at ${ageMa} Ma (last 2 Myr, schedule vs 10-yr): Δε ${dEps.toFixed(4)}″ · Δlon ${dLon.toFixed(3)}″`);
    }
    // gate 3 — the anchor identity
    gate(same3(hist.stateJ2000, hist.walkFrom(hist.stateJ2000, 0, 0).s), 'the J2000 state is not the factory\'s own');

    const art = {
      _description: 'The spin-axis checkpoint bank — GENERATED by tools/verify/spin-axis-bank.js --write (plan 24). The one-source movement\'s RK4 walk of the spin axis ŝ (earth/deep-orbital-history.cjs), its exact unit vector at every multiple of spacingYr from J2000 over the model\'s domain, written by the continuous walk at the factory\'s converged step schedule (5 yr inside ±50 kyr, then the largest divisor of 1000 up to 50 yr that keeps ≥ 100 steps per torque period). A runtime query seats its walk on the nearest checkpoint on its near side and walks at most one spacing; every node is bit-identical to the full walk\'s (the sampler-order-purity gate\'s bank row). The three gates the generator passed before writing are recorded in meta.gates.',
      meta: {
        spacingYr: SPACING_YR,
        domainYr: [DOMAIN_PAST_YR, DOMAIN_FUTURE_YR],
        fineZoneYr: 50000,
        stepRule: 'inside ±50 kyr: 5 yr; beyond: the largest of [50, 25, 20, 10, 5, 4, 2, 1] yr with 100·h ≤ T_p(cell start), constant per 1000-yr cell',
        stepYrAt: Object.fromEntries([-4400e6, -4000e6, -3500e6, -2460e6, -1000e6, -500e6, -1e6, -40000, 1e6, 500e6].map((t) => [t, hist.stepYearsAt(t)])),
        stateJ2000: hist.stateJ2000,
        gates: { seatAndResumeChecked: resumed, convergence: converge },
        generatedAtWalkSeconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
      },
      spacingYr: SPACING_YR,
      checkpoints,
      inputs: buildInputsBlock('node tools/verify/spin-axis-bank.js --write', INPUT_FILES),
    };
    fs.writeFileSync(OUT, JSON.stringify(art));
    console.log(`✓ wrote data/spin-axis-checkpoints.json — ${checkpoints.length} checkpoints, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    return;
  }

  // plain run: the first 5 Myr each way re-walked and compared bit-exactly; the meta's schedule against the live factory
  if (!fs.existsSync(OUT)) { console.error('FAIL — no recorded bank. First run: node tools/verify/spin-axis-bank.js --write'); process.exit(1); }
  const rec = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const byT = new Map(rec.checkpoints.map((/** @type {{t: number, s: number[]}} */ c) => [c.t, c.s]));
  let bad = 0, n = 0;
  for (const end of [-5e6, 5e6]) {
    for (const c of hist.recordStates(end, SPACING_YR)) { n++; const r = byT.get(c.t); if (!r || !same3(r, c.s)) { bad++; console.error(`  DIVERGED at t ${c.t}: recorded ${r ? r.join(',') : 'absent'} vs live ${c.s.join(',')}`); } }
  }
  for (const [t, h] of Object.entries(rec.meta.stepYrAt)) { if (hist.stepYearsAt(Number(t)) !== h) { bad++; console.error(`  SCHEDULE DIVERGED at t ${t}: recorded ${h} yr vs live ${hist.stepYearsAt(Number(t))} yr`); } }
  if (!same3(rec.meta.stateJ2000, hist.stateJ2000)) { bad++; console.error('  J2000 state DIVERGED'); }
  if (bad) { console.error(`FAIL — ${bad} divergence(s) from the recorded bank over ±5 Myr (${n} checkpoints compared). The walk\'s inputs moved: regenerate with --write.`); process.exit(1); }
  console.log(`PASS — the recorded bank is reproduced over ±5 Myr (${n} checkpoints bit-exact), the schedule and the J2000 state match; ${rec.checkpoints.length} checkpoints on record.`);
}

main();

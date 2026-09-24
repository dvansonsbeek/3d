/**
 * THE PLANETS' SPIN CHANNEL GATE (plan 06 Phase 7).
 *
 * The channel derives each planet's precession constant from its own torques
 * (astro-reference planetSpinPhysical) on the model's own orbit, and
 * integrates the spin on the planet's own ζ plane history from the IAU J2000
 * pole. This gate pins what that construction must reproduce:
 *
 *   1. the J2000 obliquity to the orbit is DERIVED (pole vs the chain's
 *      plane) and must land on the IAU tilt for every planet — the acute
 *      angle for the retrograde spinners (Venus, Uranus); Neptune against the
 *      MEAN-pole value (the 688-yr Triton nutation is not in the channel);
 *   2. the CLOSURES — where the source inferred C/MR² from the measured pole
 *      precession, the channel's J2000 rate must reproduce that measurement
 *      through the model's own a, e and n: Mars −7.606 ″/yr (Konopliv 2016)
 *      to 0.3 %, Venus 44.58 ± 3.3 ″/yr (Margot 2021) inside 1σ;
 *   3. Saturn's derived pole rate against the engine's OWN s8 line (the
 *      Ward–Hamilton capture) — inside 15 % at the gravity-constrained C/MR²
 *      (the WH04 libration band lands it within 7 %; measured in the lab);
 *   4. Mercury: α_free ≫ its node rate (the Cassini lock as a statement of
 *      the model's own numbers) — the channel reports the lock, no free rate;
 *   5. purity in `year`: a value read after a deep-time probe is bit-identical
 *      to the same value read fresh (the sampler-order lesson).
 *
 *   node packages/physics/test/spin-channel.test.mjs
 *   node packages/physics/test/spin-channel.test.mjs --plant
 *
 * --plant scales Mars's J₂ by 1 % through the injectable constants and
 * EXPECTS the Mars closure to fail — the proof this gate fails on a planted
 * violation (CLAUDE.md).
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createModel, DEFAULT_CONSTANTS, DEEP_MODES_ARTIFACT } from '../src/index.js';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const ASTRO = require(join(ROOT, 'public/input/astro-reference.json'));
const OBS = ASTRO.planetSpinObserved;   // a TARGET block: citations, never inputs
const plant = process.argv.includes('--plant');

/** @type {string[]} */
const failures = [];
/** @param {number|null} x */
const n = (x) => (x === null ? NaN : x);
/** @param {string} name @param {boolean} ok @param {string} detail */
const check = (name, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
  if (!ok) failures.push(name);
};

const constants = plant
  ? (() => {
    const c = JSON.parse(JSON.stringify(DEFAULT_CONSTANTS));
    c.planetSpinPhysical.mars.j2 *= 1.01;
    return c;
  })()
  : undefined;
const m = createModel(constants);

// 1. the derived J2000 obliquity against the IAU tilt (acute convention in the
//    reference block; Neptune's reference is the mean-pole value)
const IAU_TILT_TOL_DEG = 0.02;
/** @type {Record<string, number>} */
const tiltRef = {
  mercury: 0.034, venus: ASTRO.planetOrbitalElements.venus.axialTiltJ2000,
  mars: ASTRO.planetOrbitalElements.mars.axialTiltJ2000, jupiter: ASTRO.planetOrbitalElements.jupiter.axialTiltJ2000,
  saturn: ASTRO.planetOrbitalElements.saturn.axialTiltJ2000, uranus: ASTRO.planetOrbitalElements.uranus.axialTiltJ2000,
  neptune: 27.85,   // the mean-pole obliquity (IAU instantaneous 28.32 carries the Triton nutation)
};
console.log('1. J2000 obliquity DERIVED from the IAU pole vs the chain plane');
for (const k of m.planets.keys) {
  const s = m.planets.spin(k);
  const acute = Math.min(s.obliquityJ2000Deg, 180 - s.obliquityJ2000Deg);
  const d = acute - tiltRef[k];
  check(`${k} obliquity`, Math.abs(d) <= IAU_TILT_TOL_DEG, `${acute.toFixed(4)}° vs ${tiltRef[k]}° (Δ ${d.toFixed(4)}°)`);
}

// 2. the closures
console.log('2. closures of the spin-inferred moments through the model\'s own orbit');
{
  const marsRate = n(m.planets.spin('mars').spinPrecessionRateArcsecPerYrJ2000);
  const rel = marsRate / OBS.marsSpinPrecessionArcsecPerYr - 1;
  check('mars pole rate vs Konopliv 2016', Math.abs(rel) <= 0.003, `${marsRate.toFixed(4)} vs ${OBS.marsSpinPrecessionArcsecPerYr} ″/yr (${(rel * 100).toFixed(3)} %)`);
  const venusRate = Math.abs(n(m.planets.spin('venus').spinPrecessionRateArcsecPerYrJ2000));
  const vObs = 44.58, vSig = 3.3;   // Margot et al. 2021 (cited in the input block's _description)
  check('venus pole rate vs Margot 2021 (1σ)', Math.abs(venusRate - vObs) <= vSig, `${venusRate.toFixed(3)} vs ${vObs} ± ${vSig} ″/yr`);
}

// 3. Saturn against the engine's own s8
console.log('3. Saturn\'s derived pole rate against the engine\'s own s8 line');
{
  const s8 = DEEP_MODES_ARTIFACT.planetLeadingZetaArcsecPerYr.neptune;
  const satRate = n(m.planets.spin('saturn').spinPrecessionRateArcsecPerYrJ2000);
  const rel = satRate / s8 - 1;
  check('saturn pole rate vs own s8', Math.abs(rel) <= 0.15, `${satRate.toFixed(4)} vs s8 ${s8.toFixed(4)} ″/yr (${(rel * 100).toFixed(2)} %)`);
}

// 4. Mercury's lock
console.log('4. Mercury: the Cassini lock as a statement of the model\'s own numbers');
{
  const me = m.planets.spin('mercury');
  const s1 = Math.abs(DEEP_MODES_ARTIFACT.planetLeadingZetaArcsecPerYr.mercury);
  const ratio = me.alphaArcsecPerYr / s1;
  check('mercury α_free ≫ node rate', me.cassiniLocked && ratio > 50 && me.spinPrecessionRateArcsecPerYrJ2000 === null, `α_free/|s1| = ${ratio.toFixed(1)}`);
}

// 5. purity in year
console.log('5. purity: values are functions of year alone');
{
  const fresh = createModel(constants), dirty = createModel(constants);
  dirty.planets.spin('mars').obliquityDegAtYear(-3_000_000);   // a deep probe first
  for (const y of [-100000, -26000, 2000, 28832, 500000]) {
    const a = fresh.planets.spin('mars').obliquityDegAtYear(y);
    const b = dirty.planets.spin('mars').obliquityDegAtYear(y);
    check(`mars obliquity @ ${y} visit-order pure`, Object.is(a, b), `${a}`);
  }
}

if (plant) {
  const marsFailed = failures.includes('mars pole rate vs Konopliv 2016');
  console.log(marsFailed ? '\nPLANT DETECTED — the Mars closure failed on a 1 % J₂ change (the gate works).' : '\nPLANT NOT DETECTED — the gate is blind.');
  process.exit(marsFailed ? 0 : 1);
}
if (failures.length) {
  console.log(`\nFAIL — ${failures.length} check(s): ${failures.join('; ')}`);
  process.exit(1);
}
console.log('\nPASS — the planets\' spin channel reproduces its closures and the IAU tilts.');

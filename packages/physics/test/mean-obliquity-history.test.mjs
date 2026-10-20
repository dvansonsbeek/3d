/**
 * The cited mean obliquity of date (plan 12 §8 option (a)) — contract pins:
 *   - the column is read as the SHAPE cos ε̄(t)/cos ε̄(0): the factor is exactly 1 at J2000,
 *   - the table is reproduced at every sample (ε̄ exact at nodes),
 *   - monotone into the past at quarter-Myr sampling (the column is; the Hermite must not overshoot),
 *   - forward of J2000 the J2000 one-sided slope is held (a labelled extrapolation),
 *   - beyond the table's span the history REFUSES (null), never extrapolates,
 *   - the historical era is untouched at the 1e-7 class (|factor − 1| < 2.1e-7 at 10 kyr),
 *   - the composed precession: absent the history the rate ≡ the torque rate (bit-identical);
 *     with it, rate = torque × factor, and the deep-time chain's torque rate is the pre-§8 rate.
 *
 *   node packages/physics/test/mean-obliquity-history.test.mjs   (exit 1 on fail)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { createMeanObliquityHistory } = require(join(ROOT, 'packages/physics/src/earth/mean-obliquity-history.cjs'));
const { createComposedPrecession } = require(join(ROOT, 'packages/physics/src/earth/precession-composed.cjs'));
const { MOON_DISTANCE_ARTIFACT: T } = require(join(ROOT, 'packages/physics/src/deltat/moon-distance-artifact.cjs'));
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));

/** @type {string[]} */
const failures = [];
/** @param {string} name @param {boolean} ok @param {string} detail */
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${detail}`); };
const D2R = Math.PI / 180;

check('the embed carries the obliquity column', Array.isArray(T.obliquityDeg) && T.obliquityDeg.length === T.ageMa.length, 'regenerate the constants (node tools/constants/generate.mjs --write)');
const h = createMeanObliquityHistory({ table: T });

check('factor ≡ 1 at J2000', h.cosRatioAtAge(0) === 1, `${h.cosRatioAtAge(0)}`);
check('ε̄(0) is the column', h.meanObliquityDegAtAge(0) === T.obliquityDeg[0] && h.meanObliquityJ2000Deg === T.obliquityDeg[0], `${h.meanObliquityDegAtAge(0)}`);
for (const i of [1, 10, 380, 1000, 2460, 3200, T.ageMa.length - 1]) {
  const got = h.meanObliquityDegAtAge(T.ageMa[i]);
  check(`node ${T.ageMa[i]} Ma exact`, Math.abs(got - T.obliquityDeg[i]) < 1e-12, `${got} vs ${T.obliquityDeg[i]}`);
}
let prev = h.meanObliquityDegAtAge(0), mono = true;
for (let t = 0.25; t <= T.spanMa; t += 0.25) { const e = h.meanObliquityDegAtAge(t); if (e > prev + 1e-9) { mono = false; break; } prev = e; }
check('monotone into the past at quarter-Myr sampling', mono, 'ε̄(t) increased into the past (Hermite overshoot)');
const slope0 = (T.obliquityDeg[1] - T.obliquityDeg[0]) / (T.ageMa[1] - T.ageMa[0]);
check('forward: the J2000 slope held', Math.abs(h.meanObliquityDegAtAge(-100) - (T.obliquityDeg[0] + slope0 * -100)) < 1e-9, `${h.meanObliquityDegAtAge(-100)}`);
check('beyond the span: null', h.meanObliquityDegAtAge(T.spanMa + 0.5) === null && h.cosRatioAtAge(T.spanMa + 1) === null, 'extrapolated');
check('at the span: finite', Number.isFinite(h.meanObliquityDegAtAge(T.spanMa)), 'null at the last sample');
check('span is the input\'s end', h.spanMa === T.spanMa && T.spanMa === 4429, `${h.spanMa}`);
const f10kyr = h.cosRatioAtAge(0.01);
check('historical era untouched (10 kyr)', Math.abs(f10kyr - 1) < 2.1e-7 && f10kyr > 1, `${f10kyr}`);
const f2460 = h.cosRatioAtAge(2460);
check('the Lantink-age factor (measured 1.0245)', Math.abs(f2460 - Math.cos(T.obliquityDeg[2460] * D2R) / Math.cos(T.obliquityDeg[0] * D2R)) < 1e-15 && f2460 > 1.024 && f2460 < 1.025, `${f2460}`);

// The composed precession: the factor is optional and multiplicative.
const lod = (/** @type {number} */ t) => 86400 * (1 - 0.1 * t / 4429);
const aM = (/** @type {number} */ t) => 384399e3 * (1 - 0.6 * t / 4429);
const base = { p0ArcsecPerYr: 50.288, solarShare: 0.316, lodSecondsAtAge: lod, lodJ2000Seconds: 86400, moonDistanceMetresAtAge: aM, moonDistanceJ2000Metres: 384399e3, yearToTMa: (/** @type {number} */ y) => (2000 - y) / 1e6 };
const without = createComposedPrecession(base);
const withIt = createComposedPrecession({ ...base, meanObliquityCosRatioAtAge: h.cosRatioAtAge });
for (const t of [0, 0.01, 1, 380, 2460, -200]) {
  check(`absent history: rate ≡ torque at ${t} Ma`, without.composedRateArcsecPerYrAtAge(t) === without.torqueRateArcsecPerYrAtAge(t) && without.obliquityFactorAtAge(t) === 1, 'the optional dep changed the constant-only path');
  check(`with history: torque unchanged at ${t} Ma`, withIt.torqueRateArcsecPerYrAtAge(t) === without.torqueRateArcsecPerYrAtAge(t), 'the factor leaked into the torque rate');
  const r = withIt.composedRateArcsecPerYrAtAge(t), q = withIt.torqueRateArcsecPerYrAtAge(t) * h.cosRatioAtAge(t);
  check(`with history: rate = torque × factor at ${t} Ma`, r === q, `${r} vs ${q}`);
}
// The shipped chain: the torque rate is the pre-§8 published rate's formula, spelled from the pieces.
for (const t of [0, 10, 380, 2460]) {
  const w = DT.LOD_NOW_H13_S / DT.meanLodSecondsAtAge(t), lf = Math.pow(DT.A_MOON_NOW_M / DT.meanMoonDistanceMetresAtAge(t), 3);
  const fS = DT.PRECESSION_SOLAR_SHARE_J2000, p0 = DT.precessionRateJ2000ArcsecPerYr();
  const torque = DT.meanLunisolarTorqueRateArcsecPerYrAtAge(t), rate = DT.meanLunisolarPrecessionRateArcsecPerYrAtAge(t);
  check(`chain torque rate at ${t} Ma`, Math.abs(torque - w * p0 * (fS + (1 - fS) * lf)) < 1e-9, `${torque}`);
  check(`chain rate of date at ${t} Ma`, Math.abs(rate - torque * DT.precessionObliquityFactorAtAge(t)) < 1e-9, `${rate}`);
  check(`chain cited mean at ${t} Ma`, DT.meanObliquityCitedDegAtAge(t) === h.meanObliquityDegAtAge(t), 'the chain reads a different history');
}

if (failures.length) { console.error(`mean-obliquity-history: ${failures.length} FAILURE(S)\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`mean-obliquity-history: OK — factor 1 at J2000, ${T.ageMa.length} nodes exact, monotone, forward slope held, refusal beyond ${T.spanMa} Ma, 10-kyr factor ${(f10kyr - 1).toExponential(2)}, 2.46-Ga factor ${f2460.toFixed(5)}; composed: optional and multiplicative, the chain's torque rate is the constant's scaling`);

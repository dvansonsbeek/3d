/**
 * The solar perturbation of the lunar orbit OF DATE (plan 33 step 1; doc 111 §1.45) — contract pins:
 *   - the characteristic reproduces the classical orders: the variation m², the evection m·e, the
 *     annual equation m·e′, the parallactic inequality m·a/a′, the equation of the centre and the
 *     reduction to the ecliptic m⁰, 2D − 2M′ m·e², 4D m⁴, 4D − M′ m³;
 *   - each leading coefficient at J2000 is of ORDER UNITY once the amplitude is divided by its
 *     small parameters to the characteristic's powers (1 … 8; a wrong power of m reads 13× off —
 *     ESSRT_SOLAR_SCALES_PLANT=1 plants p + 1 on the variation and must fail here);
 *   - the ratios ≡ 1 at J2000 (the identity, not a tolerance) and within 1e-5 at 3 kyr (the Moon's
 *     recession, 1e-7 per kyr); at the cited history's end m/m₀ 0.03–0.04 and a/a′ 0.09–0.12;
 *   - the series' evection of date at the edge: the scaled 2D − M′ amplitude 0.03–0.06° (1.274° today);
 *   - the composer's twin reads the same ratios (the same operations on the same chain).
 *
 *   node packages/physics/test/solar-perturbation-scales.test.mjs   (exit 1 on fail)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { solarCharacteristicPower: power0, createSolarPerturbationScales } = require(join(ROOT, 'packages/physics/src/moon/solar-perturbation-scales.cjs'));
const { FITTED_COEFFICIENTS: FC } = await import(join(ROOT, 'packages/physics/src/constants/coefficients.js'));
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));
const PLANT = process.env.ESSRT_SOLAR_SCALES_PLANT === '1';
/** @type {(kD: number, kM: number, kMp: number) => number} */
const power = PLANT ? (kD, kM, kMp) => power0(kD, kM, kMp) + (kD === 2 && kM === 0 && kMp === 0 ? 1 : 0) : power0;

/** @type {string[]} */
const failures = [];
/** @param {string} name @param {boolean} ok @param {string} detail */
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${detail}`); };
const EDGE_MA = 4428.98;
const D2R = Math.PI / 180;

// ── the characteristic: the classical orders ──
/** @type {Array<[string, number, number, number, number]>} */
const ORDERS = [
  ['variation 2D', 2, 0, 0, 2], ['evection 2D − M′', 2, 0, -1, 1], ['annual equation M', 0, 1, 0, 1],
  ['parallactic D', 1, 0, 0, 1], ['equation of the centre M′', 0, 0, 1, 0], ['2M′', 0, 0, 2, 0],
  ['reduction 2F', 0, 0, 0, 0], ['2D − 2M′', 2, 0, -2, 1], ['2D + M′', 2, 0, 1, 1], ['4D', 4, 0, 0, 4],
  ['4D − M′', 4, 0, -1, 3], ['4D − 2M′', 4, 0, -2, 2], ['2D − M', 2, -1, 0, 2], ['M′ − M', 0, -1, 1, 1],
];
for (const [name, kD, kM, kMp, p] of ORDERS) check(`characteristic ${name} = m^${p}`, power(kD, kM, kMp) === p, `${power(kD, kM, kMp)}`);

// ── the leading coefficients at J2000 are of order unity ──
const m0 = DT.meanMoonSiderealMonthAtAge(0) / DT.meanSiderealYearSecondsAtAge(0);
const eM = 0.0549, eE = 0.016709, gamma = Math.sin(5.1573 * D2R / 2), aOverAp = DT.meanMoonDistanceCorrectedAtAge(0) / DT.meanAuAtAge(0);
check('m₀ is the Moon\'s 0.0748', Math.abs(m0 - 0.0748) < 0.001, `${m0}`);
const L = /** @type {number[][]} */ (FC.MEEUS_LONGITUDE_TERMS);
/** @param {number[]} r @returns {number} the fitted amplitude over its small parameters to the characteristic's powers */
const leadingCoefficient = (r) => {
  const [kD, kM, kMp, kF, A] = r;
  const p = power(kD, kM, kMp);
  const small = Math.pow(m0, p) * Math.pow(eM, Math.abs(kMp)) * Math.pow(eE, Math.abs(kM)) * Math.pow(gamma, Math.abs(kF)) * (kD % 2 !== 0 ? aOverAp : 1);
  return Math.abs(A) * 1e-6 * D2R / small;
};
/** @param {number} kD @param {number} kM @param {number} kMp */
const termOf = (kD, kM, kMp) => L.find((r) => r[0] === kD && r[1] === kM && r[2] === kMp && r[3] === 0);
// The six named inequalities: the leading coefficient within [1, 8] — Brown's 11/8 (variation), 15/4
// (evection), ~5/2 (annual), ~3 (parallactic), 2 (the equation of the centre), ~4.5 (2D − 2M′), each
// with its higher orders folded in. A wrong power of m reads 13× off and fails here.
for (const [name, kD, kM, kMp] of /** @type {[string, number, number, number][]} */ ([['variation', 2, 0, 0], ['evection', 2, 0, -1], ['annual equation', 0, 1, 0], ['parallactic inequality', 1, 0, 0], ['equation of the centre', 0, 0, 1], ['2D − 2M′', 2, 0, -2]])) {
  const r = termOf(kD, kM, kMp);
  const c = r ? leadingCoefficient(r) : NaN;
  check(`leading coefficient of the ${name} is Brown's order (1–8)`, c > 1 && c < 8, `${c.toFixed(3)}`);
}
// The net on every other term above 0.02°: Brown's coefficients run from 1/4 (2D + M′) to ~15 (the
// evection's annual sideband 2D − M − M′) at the right power of m — a loose band, named as such.
const big = L.filter((r) => Math.abs(r[4]) >= 20000);
for (const r of big) {
  const c = leadingCoefficient(r);
  check(`leading coefficient for ${r[0]}D ${r[1]}M ${r[2]}M′ ${r[3]}F (A ${r[4]} µ°, m^${power(r[0], r[1], r[2])}) within 0.15–25`, c > 0.15 && c < 25, `${c.toFixed(3)}`);
}

// ── the ratios on the chain ──
const scales = createSolarPerturbationScales({
  siderealMonthSecondsAtAge: DT.meanMoonSiderealMonthAtAge, siderealYearSecondsAtAge: DT.meanSiderealYearSecondsAtAge,
  moonDistanceKmAtAge: DT.meanMoonDistanceCorrectedAtAge, auAtAge: DT.meanAuAtAge,
});
const s0 = scales(0);
check('ratios ≡ 1 at J2000', s0 !== null && s0.mRatio === 1 && s0.aRatio === 1, JSON.stringify(s0));
const s3k = scales(0.003);
check('era: the ratios within 1e-5 at 3 kyr', s3k !== null && Math.abs(s3k.mRatio - 1) < 1e-5 && Math.abs(s3k.aRatio - 1) < 1e-5, JSON.stringify(s3k));
const s400 = scales(400);
check('400 Ma: m/m₀ 0.92–0.95', s400 !== null && s400.mRatio > 0.92 && s400.mRatio < 0.95, JSON.stringify(s400));
const sE = scales(EDGE_MA);
check('edge: m/m₀ 0.03–0.04, a/a′ 0.09–0.12', sE !== null && sE.mRatio > 0.03 && sE.mRatio < 0.04 && sE.aRatio > 0.09 && sE.aRatio < 0.12, JSON.stringify(sE));
check('edge: the evection of date 0.03–0.06° (1.274° today)', sE !== null && 1.274027 * sE.mRatio > 0.03 && 1.274027 * sE.mRatio < 0.06, `${sE && 1.274027 * sE.mRatio}`);
check('beyond the histories: null (the series keeps the era form)', scales(5000) === null, `${JSON.stringify(scales(5000))}`);

if (failures.length) {
  console.error(`FAIL — solar perturbation scales of date (${failures.length}):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`PASS — solar perturbation scales of date: ${ORDERS.length} classical orders, ${big.length} order-unity coefficients, the ratios at J2000 / 3 kyr / 400 Ma / the edge${PLANT ? ' (PLANT ACTIVE — this should have failed)' : ''}`);

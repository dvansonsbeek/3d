/**
 * The cited Earth–Moon distance history (plan 12 option A) — contract pins:
 *   - J2000 is the model's own anchor (a(0) = aMoonNowMetres exactly),
 *   - the J2000 slope is the LLR observation (α₁), not the table's first secant,
 *   - the table's shape is reproduced at every sample (ratio a(t)/a(0) exact at nodes),
 *   - monotone into the past between nodes (Fritsch–Carlson),
 *   - forward of J2000 the LLR rate is held constant,
 *   - beyond the table's span the history REFUSES (null), never extrapolates,
 *   - the analytic slope matches a central difference.
 *
 *   node packages/physics/test/moon-distance-history.test.mjs   (exit 1 on fail)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { createMoonDistanceHistory } = require(join(ROOT, 'packages/physics/src/deltat/moon-distance-history.cjs'));
const { MOON_DISTANCE_ARTIFACT } = require(join(ROOT, 'packages/physics/src/deltat/moon-distance-artifact.cjs'));

const A0 = 384399.07e3, ALPHA1 = -9.9376e-5;   // test anchors (the model's own come from the constants)
const h = createMoonDistanceHistory({ table: MOON_DISTANCE_ARTIFACT, aMoonNowMetres: A0, alpha1PerMa: ALPHA1 });
/** @type {string[]} */
const failures = [];
/** @param {string} name @param {boolean} ok @param {string} detail */
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${detail}`); };

check('a(0) is the anchor', h.distanceMetresAtAge(0) === A0, `${h.distanceMetresAtAge(0)} vs ${A0}`);
check('J2000 slope is α₁', Math.abs(h.slopeMetresPerMaAtAge(0) / A0 - ALPHA1) < 1e-15, `${h.slopeMetresPerMaAtAge(0) / A0}`);
const T = MOON_DISTANCE_ARTIFACT;
for (const i of [1, 10, 380, 1000, 2460, 3200, T.ageMa.length - 1]) {
  const want = T.aEarthRadii[i] / T.aEarthRadii[0];
  const got = h.ratioAtAge(T.ageMa[i]);
  check(`node ${T.ageMa[i]} Ma exact`, Math.abs(got - want) < 4e-16, `${got} vs ${want}`);
}
let prev = h.distanceMetresAtAge(0), mono = true;
for (let t = 0.25; t <= T.spanMa; t += 0.25) { const a = h.distanceMetresAtAge(t); if (a > prev + 1e-9) { mono = false; break; } prev = a; }
check('monotone into the past at quarter-Myr sampling', mono, 'a(t) increased into the past');
check('forward: LLR rate held', Math.abs(h.distanceMetresAtAge(-100) - A0 * (1 - 100 * ALPHA1)) < 1e-6, `${h.distanceMetresAtAge(-100)}`);
check('beyond the span: null', h.distanceMetresAtAge(T.spanMa + 0.5) === null && h.slopeMetresPerMaAtAge(T.spanMa + 1) === null, 'extrapolated');
check('at the span: finite', Number.isFinite(h.distanceMetresAtAge(T.spanMa)), 'null at the last sample');
for (const t of [0.5, 123.4, 1400, 2459.9, 4000]) {
  const an = h.slopeMetresPerMaAtAge(t);
  const num = (h.distanceMetresAtAge(t + 1e-4) - h.distanceMetresAtAge(t - 1e-4)) / 2e-4;
  check(`slope at ${t} Ma`, Math.abs(an - num) <= 1e-6 * Math.abs(num) + 1e-3, `analytic ${an} vs central ${num}`);
}
check('span is the input\'s end', h.spanMa === T.spanMa && T.spanMa === 4429, `${h.spanMa}`);

if (failures.length) { console.error(`moon-distance-history: ${failures.length} FAILURE(S)\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`moon-distance-history: OK — anchor, LLR slope, ${T.ageMa.length} nodes exact, monotone, forward LLR, refusal beyond ${T.spanMa} Ma, analytic slope ≡ central difference`);

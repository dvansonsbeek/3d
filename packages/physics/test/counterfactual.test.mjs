/**
 * THE PHASE 5 GATE — a counterfactual returns a changed, reproducible result
 * carrying a different constants hash (§2d).
 *
 * This is the capability the whole injection design exists to protect. DE440 is
 * a numerical fit and Laskar's solutions are integrations; neither can answer
 * "what would the model say if this constant were different". This model can,
 * but only while constants stay a parameter rather than an import.
 *
 * WHY THIS TEST CHECKS A NUMBER AND NOT JUST A HASH. A hash-only test passes
 * even if `createModel` ignores its argument completely — the hash is computed
 * from the argument, so it would move while nothing downstream ever read it.
 * The gate therefore asserts that a returned VALUE changes too.
 *
 *   exit 0 — injection works end to end
 *   exit 1 — a counterfactual is not expressible; §2d has regressed
 */
import { createModel, DEFAULT_CONSTANTS, CONSTANTS_HASH } from '../src/index.js';

let failed = 0;
/**
 * @param {string} name
 * @param {boolean} ok
 * @param {string} [detail]
 */
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failed += 1;
};

console.log('COUNTERFACTUAL — §2d injected constants');
console.log('='.repeat(74));

// ── the default path ─────────────────────────────────────────────────────────
const base = createModel();
const baseLattice = base.computeLatticePeriodsYears();
const H = /** @type {any} */ (DEFAULT_CONSTANTS).foundational.holisticyearLength;

check('default hash is the generated hash', base.hash === CONSTANTS_HASH, base.hash);
check('context is frozen', Object.isFrozen(base.constants));
check('lattice derives from the context',
  baseLattice.axialPrecessionPeriodYears === H / 13,
  `H/13 = ${baseLattice.axialPrecessionPeriodYears.toFixed(4)} yr`);

// ── the counterfactual ───────────────────────────────────────────────────────
// A different H is the sharpest probe: the entire lattice hangs off it.
const H_CF = 335000;
const mk = () => createModel({
  ...DEFAULT_CONSTANTS,
  foundational: { .../** @type {any} */ (DEFAULT_CONSTANTS).foundational, holisticyearLength: H_CF },
});

const cf = mk();
const cfLattice = cf.computeLatticePeriodsYears();

check('counterfactual hash differs from default', cf.hash !== base.hash, cf.hash);
check('counterfactual hash is marked as derived', cf.hash.startsWith('cf-'));
check('RESULT changed, not just the hash',
  cfLattice.axialPrecessionPeriodYears !== baseLattice.axialPrecessionPeriodYears,
  `${baseLattice.axialPrecessionPeriodYears.toFixed(4)} -> ${cfLattice.axialPrecessionPeriodYears.toFixed(4)} yr`);
check('changed result is the CORRECT value',
  cfLattice.axialPrecessionPeriodYears === H_CF / 13 &&
  cfLattice.inclinationPrecessionPeriodYears === H_CF / 3 &&
  cfLattice.perihelionPrecessionPeriodYears === H_CF / 16);

// ── reproducibility ──────────────────────────────────────────────────────────
const cf2 = mk();
check('same counterfactual reproduces the hash', cf2.hash === cf.hash);
check('same counterfactual reproduces the value',
  cf2.computeLatticePeriodsYears().axialPrecessionPeriodYears === cfLattice.axialPrecessionPeriodYears);

// Key order must not change identity: {...D, x} and {x, ...D} are the same set.
const reordered = createModel({
  foundational: { .../** @type {any} */ (DEFAULT_CONSTANTS).foundational, holisticyearLength: H_CF },
  ...Object.fromEntries(Object.entries(DEFAULT_CONSTANTS).filter(([k]) => k !== 'foundational')),
});
check('hash is independent of key order', reordered.hash === cf.hash);

// ── the default must not be reachable by accident ────────────────────────────
check('an explicit copy of the defaults is still the default',
  createModel({ ...DEFAULT_CONSTANTS }).hash === CONSTANTS_HASH);
check('mutating the returned context is impossible',
  (() => { try { /** @type {any} */ (base.constants).foundational = null; return false; } catch { return true; } })());

// ── validation targets must be absent (§2d) ──────────────────────────────────
// If one were injectable, a counterfactual could move the goalposts it is
// judged by. laplaceLagrangeBounds is the bound Saturn fails in verify-laws.
for (const t of ['laplaceLagrangeBounds', 'knownValues', 'ascendingNodesSouamiSouchay',
                 'jplEclipticInclinationTrends', 'eigenmodePhasesLaplaceLagrange']) {
  check(`validation target absent: ${t}`, !(t in DEFAULT_CONSTANTS));
}
check('presentation data absent: galaxyMotion', !('galaxyMotion' in DEFAULT_CONSTANTS));

console.log(`\n${'='.repeat(74)}`);
if (failed) {
  console.log(`FAIL — ${failed} check(s) failed. A counterfactual is not expressible; §2d has regressed.`);
  process.exit(1);
}
console.log('PASS — counterfactual returns a changed, reproducible result with a distinct hash.');

/**
 * createModel() PARITY GATE (§7a step 1).
 *
 * The canonical assembly must reproduce the Node engine (tools/lib) — the
 * arbiter every adapter is measured against — on a grid of epochs across the
 * validated domain. Both sides wire the same package factories, so agreement
 * is expected at near-bit level; the tolerance is relative 1e-9 to absorb
 * FP-association differences only.
 *
 *   node packages/physics/test/create-model-parity.test.mjs   (exit 1 on fail)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createModel } from '../src/index.js';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const dt = require(join(ROOT, 'tools', 'lib', 'deep-time.js'));

const model = createModel();

const YEARS = [2000, 2026, 1000, 0, -2000, -100000, -302635, 1e6, -1e6, 5e6, -5e6, 1e8, -1e8, 2e8, -2e8];
/** @param {number|null} a @param {number|null} b @returns {number} */
const relDiff = (a, b) => {
  if (a === null || b === null) return a === b ? 0 : Infinity;
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300);
};

const failures = [];
/** @param {string} label @param {number} year @param {number|null} got @param {number|null} want @param {number} [tol] */
const check = (label, year, got, want, tol = 1e-9) => {
  const d = relDiff(got, want);
  if (!(d <= tol)) failures.push(`${label} @ ${year}: model ${got} vs engine ${want} (rel ${d.toExponential(2)})`);
};

for (const year of YEARS) {
  const tMa = (2000 - year) / 1e6;
  check('H(t)', year, model.epoch.hAtYear(year), dt.meanHAtAge(tMa));
  check('LOD(t)', year, model.epoch.lodSecondsAtYear(year), dt.meanLodSecondsAtAge(tMa));
  check('alpha(t)', year, model.epoch.alphaAtYear(year), dt.earthMoiFactorAtAge(tMa));
  check('moonDistance(t)', year, model.epoch.moonDistanceKmAtYear(year), dt.meanMoonDistanceMetresAtAge(tMa) / 1000);
  check('siderealYearSeconds(t)', year, model.epoch.siderealYearSecondsAtYear(year), dt.meanSiderealYearSecondsAtAge(tMa));
}

// ΔT parity: engine meanDeltaTSecondsAtAge is the trend WITHOUT deltaTStart.
for (const year of YEARS) {
  const tMa = (2000 - year) / 1e6;
  const engineTrend = dt.meanDeltaTSecondsAtAge(tMa);
  const modelTrend = model.epoch.deltaTSecondsAtYear(year) - model.epoch.deltaTSecondsAtYear(2000);
  check('deltaTtrend(t)', year, modelTrend, engineTrend, 1e-6);
}

// Identity block sanity
if (model.identity.constantsHash === null || model.identity.coefficientsHash === null) {
  failures.push('identity: default assembly must carry both hashes');
}
if (model.identity.counterfactual !== false) failures.push('identity: default assembly flagged counterfactual');

// Counterfactual flow: a changed constant must change outputs, flag identity,
// and carry ITS OWN hash (§2d — a counterfactual is self-identifying).
{
  const { DEFAULT_CONSTANTS, CONSTANTS_HASH } = await import('../src/index.js');
  const altered = JSON.parse(JSON.stringify(DEFAULT_CONSTANTS));
  altered.foundational.holisticyearLength = DEFAULT_CONSTANTS.foundational.holisticyearLength + 1000;
  const cf = createModel(altered);
  if (cf.identity.counterfactual !== true) failures.push('counterfactual: not flagged');
  if (!cf.identity.constantsHash || cf.identity.constantsHash === CONSTANTS_HASH) {
    failures.push(`counterfactual: hash not distinct (${cf.identity.constantsHash})`);
  }
  const a = cf.epoch.hAtYear(2000) ?? 0;
  const b = model.epoch.hAtYear(2000) ?? 0;
  if (!(Math.abs(a - b) > 100)) failures.push(`counterfactual: H override did not flow (got ${a} vs ${b})`);
}

// Time axis: JD↔year must match the engine's _jdToSIyear exactly (the fit
// axis), and round-trip to double precision — including a high-precision JD.
{
  const JDS = [2451545.0, 2451716.575, 2058768.5385006, 990575.5, 3912880.9];
  for (const jd of JDS) {
    check('yearFromJD', jd, model.time.yearFromJD(jd), dt._jdToSIyear(jd), 1e-14);
    const rt = model.time.jdFromYear(model.time.yearFromJD(jd));
    if (!(Math.abs(rt - jd) < 1e-6)) failures.push(`JD round-trip @ ${jd}: ${rt}`);
  }
}

// Cardinal points: J2000 tropical year must sit at the IAU-class value.
{
  const trop = model.lengths.tropicalYearDays(2000);
  if (!(Math.abs(trop - 365.2422) < 0.001)) failures.push(`cardinal tropical year @2000: ${trop}`);
  const jdSS = model.cardinal.jd(2000, 'SS');
  if (!(Math.abs(jdSS - 2451716.575) < 0.1)) failures.push(`SS 2000 JD: ${jdSS}`);
}

if (failures.length) {
  console.error(`createModel parity — ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`createModel parity — ${YEARS.length} epochs x 5 epoch quantities + deltaT trend + identity + counterfactual + cardinal: PASS`);

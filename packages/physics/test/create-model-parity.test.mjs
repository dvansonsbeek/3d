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

// Lunar chain (slice-2b): the package assembly vs the engine's series probe
// and ΔT-on-JD convention. Same shared factories, same wiring — the expected
// agreement is BIT-EXACT (tolerance 0); any drift means the wiring diverged.
{
  const SG = require(join(ROOT, 'tools', 'lib', 'scene-graph.js'));
  const MS = SG._moonSeriesForProbe();
  // J2000 · 2024 Dallas totality · 1800 · JD0-era · Babylonian (−135 class)
  const JDS = [2451545.0, 2460409.26, 2378496.5, 1721057.5, 1257207.5];
  for (const jd of JDS) {
    check('moonLonDeg', jd, model.moon.lonDegAtJD(jd), MS.truncatedLonDeg(jd), 0);
    check('moonBetaDeg', jd, model.moon.betaDegAtJD(jd), MS.truncatedBetaDeg(jd), 0);
    check('moonDistanceKm', jd, model.moon.distanceKmAtJD(jd), MS.truncatedDistanceKm(jd), 0);
    check('frameworkDeltaT', jd, model.eclipse.deltaTSecondsAtJD(jd), dt.frameworkDeltaT(jd), 0);
  }
}

// Eclipse finders: the 2024 canon — 2 solar (Apr 8 Total, Oct 2 Annular) and
// 2 lunar (Mar 25 Penumbral, Sep 18 Partial) at their known greatest-eclipse
// JDs. Semantic anchors, not engine deltas: the finder is package code on the
// already-bit-exact series, so what needs pinning is the event list itself.
{
  const solar = model.eclipse.findSolarInRange(2460310.5, 2460676.5);
  const lunar = model.eclipse.findLunarInRange(2460310.5, 2460676.5);
  /** @type {Array<[number, string]>} */
  const expectSolar = [[2460409.263, 'Total'], [2460586.283, 'Annular']];
  /** @type {Array<[number, string]>} */
  const expectLunar = [[2460394.794, 'Penumbral'], [2460571.609, 'Partial']];
  if (solar.length !== 2) failures.push(`eclipse: ${solar.length} solar events in 2024, expected 2`);
  if (lunar.length !== 2) failures.push(`eclipse: ${lunar.length} lunar events in 2024, expected 2`);
  expectSolar.forEach(([jd, type], i) => {
    const e = solar[i];
    if (!e || e.type !== type || Math.abs(e.jd - jd) > 0.01) {
      failures.push(`eclipse solar[${i}]: got ${e && `${e.jd.toFixed(3)} ${e.type}`}, expected ${jd} ${type}`);
    }
  });
  expectLunar.forEach(([jd, type], i) => {
    const e = lunar[i];
    if (!e || e.type !== type || Math.abs(e.jd - jd) > 0.01) {
      failures.push(`eclipse lunar[${i}]: got ${e && `${e.jd.toFixed(3)} ${e.type}`}, expected ${jd} ${type}`);
    }
  });
}

// ── Matched-pair fingerprint: sun planetary completion ↔ SUN_HARMONICS ──
// The 20.3h completion table's amplitudes are the residual of the CURRENT
// finder Sun vs JPL; a Step-0 SUN_HARMONICS refit changes that residual and
// stales the table by a few arcseconds — under the api centerline gate's
// threshold, so it needs its own check. On mismatch: re-derive with
//   node tools/fit/sun-planetary-completion-fit.js
// then update the table's literals AND its PAIRED_SUN_HARMONICS_SHA256.
{
  const { createHash } = await import('node:crypto');
  const { FITTED_COEFFICIENTS } = await import('../src/constants/coefficients.js');
  const { PAIRED_SUN_HARMONICS_SHA256 } = require('../src/eclipse/sun-planetary-completion.cjs');
  const live = createHash('sha256')
    .update(JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS))
    .digest('hex').slice(0, 16);
  if (live !== PAIRED_SUN_HARMONICS_SHA256) {
    failures.push(`sun-completion matched pair: SUN_LONGITUDE_HARMONICS hash ${live} != paired ${PAIRED_SUN_HARMONICS_SHA256}`
      + ' — Step 0 was refit without re-deriving eclipse/sun-planetary-completion.cjs'
      + ' (run node tools/fit/sun-planetary-completion-fit.js, update the table + fingerprint)');
  }
}

if (failures.length) {
  console.error(`createModel parity — ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`createModel parity — ${YEARS.length} epochs x 5 epoch quantities + deltaT trend + identity + counterfactual + cardinal + lunar chain (bit-exact) + 2024 eclipse canon: PASS`);

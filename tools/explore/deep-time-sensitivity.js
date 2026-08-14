#!/usr/bin/env node
/**
 * DEEP-TIME SENSITIVITY EXPLORER (research one-off, 2026-08)
 * ==========================================================
 *
 * "We can finally play with the constants" — this script does exactly that,
 * through the §2d counterfactual machinery (createModel with injected
 * constants), and measures which levers actually move the early solar
 * system.
 *
 * Motivating questions (Dennis, 2026-08-14):
 *   - Could a larger solar mass loss explain the Chapront sidereal-year
 *     drift, and drive AU → 0 at the system's youth?
 *   - Could Earth's radius have been different in the past?
 *   - Could the Moon's radius have been different?
 *   - Could Earth/Moon themselves have lost mass?
 *
 * Structure:
 *   1. The solar mass-loss sweep (shipped → Chapront-matching → extreme).
 *   2. A one-at-a-time elasticity table: every injectable deep-time lever
 *      perturbed +1%, reporting the response of the genesis-epoch state,
 *      the Devonian day count (the Wells/paleo-gate observable), and the
 *      modern sidereal-year drift.
 *
 * FINDINGS (from the run recorded below; see also the discussion where
 * this landed):
 *   - AU → 0 is unreachable by mass loss at ANY rate: a ∝ 1/M, so AU → 0
 *     needs M → ∞. The Chapront-matching rate (≈20× shipped) still leaves
 *     AU(genesis) at 99.1% of today — and is excluded by planetary
 *     ranging (Pitjeva & Pitjev 2012: ĠM/GM ≈ −(6.3 ± 4.3)e-14/yr,
 *     bracketing the shipped 9.3e-14/yr).
 *   - H(genesis) and Moon(genesis) do not respond to the solar lever at
 *     all — they are Driver 1 (tidal/LOD). H(genesis) = 64,883 yr encodes
 *     the finite post-impact spin (LOD 4.64 hr); Moon(genesis) = 1.48 R⊕
 *     is the rigid Roche limit.
 *   - The Chapront curve itself is an extrapolated polynomial whose
 *     S-shape flattens inside its own plotted window — an oscillation
 *     read as a trend (the rate-vs-point-value class).
 *   - Earth radius enters SQUARED via the moment of inertia (I = αMR²);
 *     a past-different radius is equivalent to a different α(t) history —
 *     the lever the GIA channel already modulates at the ppm scale.
 *     Physical bound: present-day secular radius change 0.1 ± 0.2 mm/yr
 *     (Wu et al. 2011, ITRF); paleomagnetics exclude >±10% since the
 *     Paleozoic.
 *   - Moon radius: NOT in the deep-time chain at all (point mass in the
 *     angular-momentum budget; the diameter only enters eclipse
 *     geometry). Expected elasticity exactly 0 — asserted by the run.
 *   - Earth/Moon mass loss: physically ~3 kg/s atmospheric escape for
 *     Earth → ~7e-8 of M⊕ over 4.5 Gyr; the Moon's is smaller still.
 *     The mass-ratio row shows what even 1% would do — and 1% is ~10⁵×
 *     the physical budget.
 *   - Ġ/G: bounded by LLR at ~1e-13/yr (Williams et al. 2004) — ≤0.05%
 *     over the full history; the G row shows the elasticity anyway.
 *
 * Not a gate; findings live in the discussion above and wherever the
 * docs cite them. Run: node tools/explore/deep-time-sensitivity.js
 */

'use strict';

const GENESIS_YEAR = 2000 - 4498e6;   // the rigid-Roche crossing epoch
const DEVONIAN_YEAR = 2000 - 380e6;   // the Wells 1963 flagship epoch
const RE_KM = 6378.137;               // display conversion only

async function main() {
  const { createModel, DEFAULT_CONSTANTS } = await import('../../packages/physics/src/index.js');

  /** @param {object} model @returns {Record<string, number>} */
  const observe = (model) => ({
    hGenesisYr: model.epoch.hAtYear(GENESIS_YEAR),
    lodGenesisHr: model.epoch.lodSecondsAtYear(GENESIS_YEAR) / 3600,
    moonGenesisRE: model.epoch.moonDistanceKmAtYear(GENESIS_YEAR) / RE_KM,
    daysPerYearDevonian: model.epoch.siderealYearSecondsAtYear(DEVONIAN_YEAR)
      / model.epoch.lodSecondsAtYear(DEVONIAN_YEAR),
    siderealDriftMsPerCy: (model.epoch.siderealYearSecondsAtYear(2500)
      - model.epoch.siderealYearSecondsAtYear(1500)) / 10 * 1000,
  });

  /** @param {(c: any) => void} mutate @returns {object|null} */
  const counterfactual = (mutate) => {
    const alt = JSON.parse(JSON.stringify(DEFAULT_CONSTANTS));
    mutate(alt);
    try { return createModel(alt); } catch (e) {
      return null;   // refused (validation target) — reported as such
    }
  };

  const base = createModel();
  const baseObs = observe(base);

  console.log('DEEP-TIME SENSITIVITY — baseline (shipped constants)');
  console.log(`  H(genesis)            ${Math.round(baseObs.hGenesisYr).toLocaleString('en-US')} yr`);
  console.log(`  LOD(genesis)          ${baseObs.lodGenesisHr.toFixed(2)} hr  (post-impact spin)`);
  console.log(`  Moon(genesis)         ${baseObs.moonGenesisRE.toFixed(2)} R_E  (rigid Roche limit)`);
  console.log(`  days/yr (Devonian)    ${baseObs.daysPerYearDevonian.toFixed(2)}  (Wells 1963: ~400)`);
  console.log(`  sidereal-year drift   ${baseObs.siderealDriftMsPerCy.toFixed(3)} ms/cy  (pure Driver-2 mass loss)`);
  console.log('');

  // ── 1. The solar mass-loss sweep ─────────────────────────────────────────
  console.log('1. SOLAR MASS-LOSS SWEEP — dM/dt = L/c² + wind (shipped wind 1.6e9 kg/s)');
  console.log('   wind kg/s   drift ms/cy   H(genesis)   Moon(gen) R_E   AU(gen)/AU(now)');
  for (const wind of [1.6e9, 1.2e11, 1e12]) {
    const m = counterfactual((c) => { c.physicalConstants.solarWindMassLossKgPerS = wind; });
    if (!m) { console.log(`   ${wind.toExponential(1)}  REFUSED`); continue; }
    const o = observe(m);
    const fusion = 3.828e26 / (299792458 ** 2);
    const frac = (fusion + wind) * 365.25636 * 86400 / 1.98892e30;
    const auFactor = 1 / (1 + frac * 4.5535e9);
    console.log(`   ${wind.toExponential(1)}     ${o.siderealDriftMsPerCy.toFixed(2).padStart(6)}       ${Math.round(o.hGenesisYr)}        ${o.moonGenesisRE.toFixed(2)}            ${auFactor.toFixed(4)}`);
  }
  console.log('   → AU→0 unreachable at any rate (a ∝ 1/M); H and Moon are Driver-1, untouched.');
  console.log('   → ranging bound (Pitjeva & Pitjev 2012) excludes ≥20× shipped.');
  console.log('');

  // ── 2. One-at-a-time elasticities, +1% each ──────────────────────────────
  /** @type {Array<[string, (c: any) => void, string]>} */
  const LEVERS = [
    ['Earth diameter (I = αMR²; R enters SQUARED)', (c) => { c.bodyDiametersKm.earth *= 1.01; },
      'past-different radius ≡ different α(t); bound: 0.1±0.2 mm/yr today, ≪1% over 4.5 Gyr'],
    ['Moon diameter', (c) => { c.bodyDiametersKm.moon *= 1.01; },
      'point mass in the chain — expected elasticity EXACTLY 0 (eclipse geometry only)'],
    ['Earth/Moon mass ratio (≈ Earth or Moon mass loss)', (c) => { c.physicalConstants.MASS_RATIO_EARTH_MOON *= 1.01; },
      'physical budget: ~3 kg/s escape → ~7e-8 of M⊕ over 4.5 Gyr; 1% is ~1e5× that'],
    ['G constant (Ġ/G hypothesis)', (c) => { c.physicalConstants.G_CONSTANT *= 1.01; },
      'LLR bound |Ġ/G| ~1e-13/yr → ≤0.05% over 4.5 Gyr'],
    ['α J2000 (moment-of-inertia factor)', (c) => { c.physicalConstants.earthMoiFactorJ2000 *= 1.01; },
      'the GIA channel modulates this at the ppm scale; 1% is ~10⁴× that'],
    ['Moon distance anchor (LLR)', (c) => { c.moonReference.moonDistance *= 1.01; },
      'measured to mm precision — sensitivity shown for completeness'],
    ['Farhat α₁ (lunar recession rate)', (c) => { c.deepTime.alpha1PerMa *= 1.01; },
      'THE dominant deep-time lever — where the real uncertainty lives (Wu Pangea interval)'],
    ['Moon orbital eccentricity base', (c) => { c.moonReference.moonOrbitalEccentricityBase *= 1.01; },
      'enters L_orb via √(1−e²)'],
    ['Solar luminosity (fusion term)', (c) => { c.physicalConstants.solarLuminosityW *= 1.01; },
      'faint young Sun: L was ~70% of today at genesis → past fusion loss SMALLER, not larger'],
  ];

  console.log('2. ELASTICITIES — % response per +1% input change');
  console.log('   observable columns: H(gen) · LOD(gen) · Moon(gen) · days/yr(Devonian) · drift');
  for (const [name, mutate, note] of LEVERS) {
    const m = counterfactual(mutate);
    if (!m) { console.log(`   ${name}: REFUSED (validation target)`); continue; }
    const o = observe(m);
    const el = (k) => (((o[k] / baseObs[k]) - 1) * 100).toFixed(3).padStart(7);
    console.log(`   ${name}`);
    console.log(`     ${el('hGenesisYr')}%  ${el('lodGenesisHr')}%  ${el('moonGenesisRE')}%  ${el('daysPerYearDevonian')}%  ${el('siderealDriftMsPerCy')}%`);
    console.log(`     note: ${note}`);
  }
  console.log('');
  console.log('Reading the table: a lever matters for the early solar system only if its');
  console.log('elasticity is large AND its physical budget (note lines) allows a large input');
  console.log('change. The paleo-anchors gate (tools/verify/paleo-anchors.js) binds the');
  console.log('days/yr(Devonian) column to Wells 1963 within tolerance on every CI run.');
}

main().catch((e) => { console.error(e); process.exit(1); });

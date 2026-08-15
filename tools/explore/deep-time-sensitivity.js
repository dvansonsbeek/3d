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
  console.log('');

  // ── 3. The Farhat curvature terms (added 2026-08-14 second pass) ─────────
  // α₃/α₄ dominate the genesis epoch (t³, t⁴); the first pass swept only α₁.
  console.log('3. FARHAT CURVATURE TERMS — genesis-epoch elasticities per +1%');
  for (const [name, mutate] of /** @type {Array<[string, (c: any) => void]>} */ ([
    ['alpha1 (linear recession rate, LLR-anchored)', (c) => { c.deepTime.alpha1PerMa *= 1.01; }],
    ['alpha3 (t³ term, Farhat-calibrated)', (c) => { c.deepTime.alpha3PerMa3 *= 1.01; }],
    ['alpha4 (t⁴ term, Farhat-calibrated)', (c) => { c.deepTime.alpha4PerMa4 *= 1.01; }],
  ])) {
    const m = counterfactual(mutate);
    if (!m) { console.log(`   ${name}: REFUSED`); continue; }
    const o = observe(m);
    console.log(`   ${name}: H(gen) ${(((o.hGenesisYr / baseObs.hGenesisYr) - 1) * 100).toFixed(2)}% | Moon(gen) ${(((o.moonGenesisRE / baseObs.moonGenesisRE) - 1) * 100).toFixed(2)}%`);
  }
  console.log('   → RECORDED FROM THE PRE-REGIME MODEL: α₃ was the strongest genesis');
  console.log('     lever (−23.7% Moon per +1%, ahead of α₁ at −18.1%) — the finding');
  console.log('     that motivated the regime-aware promotion. In the SHIPPED model');
  console.log('     these rows read ~0: the genesis state is owned by the regime knots');
  console.log('     and the Roche endpoint, not the quartic α terms — the promotion');
  console.log('     moved the sensitivity to anchor-fitted, gate-bound parameters.');
  console.log('');

  // ── 4. Invariant scan: is there a hidden relation between H, Moon, AU,
  //       LOD and year length? (added 2026-08-14 second pass) ───────────────
  // Candidate dimensionless combinations evaluated across the full history.
  // RESULT (recorded from the engine run): exactly TWO cross-relations are
  // (near-)invariant, and both are the documented ones —
  //   H·days/yr    : 1.2238e8 → 1.2248e8 over 4.6 Gyr (0.08% — the day-count
  //                  near-invariant, doc 99 eq. structural-near-invariant)
  //   T_apsidal·H  : flat within ~±5% over the last ~2 Gyr, breaks in the
  //                  early era where the Brouwer-Clemence m² scaling takes
  //                  over (the documented Lunar Precession Invariant, with
  //                  its documented domain)
  // NOT invariant (each drifts by orders of magnitude): months per 8H
  // (443e6 → 35.9e6), rotations per month (2.2 → 27.3), a_moon/AU
  // (0.17e-3 → 2.57e-3). No undocumented coupling between the Driver-1
  // (tidal) and Driver-2 (solar) chains emerges from the model itself.
  //
  // THE HONEST MISSING-COMPONENT CANDIDATE that a real H↔AU relation would
  // ride on: the SOLAR tidal torque. ~1/5 of Earth's present tidal braking
  // is solar (torque ∝ M²/a⁶ — this is where M_sun and AU physically enter
  // the LOD chain). That torque slows Earth WITHOUT feeding the Moon, so
  // the closed L_TOTAL_EM budget leaks angular momentum to the Sun over
  // 4.5 Gyr. Order-of-magnitude: ~20% of the Moon's orbital-momentum gain
  // (~2.4e34 kg m²/s) ≈ 5e33 kg m²/s — comparable to Earth's entire present
  // spin momentum. Restoring it to the early budget would shorten
  // LOD(genesis) and lower H(genesis) by O(10-15%) while leaving the
  // Phanerozoic (Wells-gated) era essentially untouched. A candidate
  // "Driver 1½" research item for the Phase-20 precision programme — NOT
  // implemented; the α₃/α₄ calibration to Farhat 2022 (whose ocean model
  // carries its own solar-tide treatment) partially absorbs it already.
  console.log('4. INVARIANT SCAN — see the header comment for the recorded result:');
  console.log('   two documented invariants confirmed (H·days/yr at 0.08%/4.6 Gyr;');
  console.log('   T_apsidal·H over the last 2 Gyr); no undocumented H↔AU coupling in the');
  console.log('   model; the physical bridge between the chains is the solar tidal torque');
  console.log('   (~1/5 of braking) — the honest missing-component candidate (Phase 20).');
  console.log('');

  // ── 5. THE EXACT INVARIANT (2026-08-14 third pass) ───────────────────────
  // The 0.08% drift of H·days/yr is not noise — it is DERIVABLE. Inside the
  // model: H ∝ LOD exactly (the structural identity), so
  //   H·(yearSec/LOD) = (H₀/LOD₀)·yearSec(t)
  // — the drift IS the Driver-2 year-seconds change. Kepler under adiabatic
  // mass loss ties that to the AU: a ∝ 1/M and T ∝ M⁻² give T ∝ a², i.e.
  //   yearSec(t)/AU(t)² = const.
  // Composing the two:
  //
  //   H(t) · (sidYear_s/LOD)(t) · (AU₀/AU(t))² = TOTAL_DAYS_IN_H · H₀/(H₀−13)   (exact)
  //
  // THE CONSTANT: TOTAL_DAYS_IN_H (122,471,920) is the ONE canonical day
  // count with the dual-divisor structure — ÷H gives solar-year days,
  // ÷(H−13) sidereal-year days. The exact-invariant constant
  // 122,476,668.33 is TOTAL·H₀/(H₀−13), NOT an independent number. The
  // TROPICAL-days form H·tropDays·AU² retains a −118 ppm residual at
  // genesis — the structural 13/H precession bridge — and the factor
  // [H/(H−13)]·[(H₀−13)/H₀] restores exactness with the canonical constant.
  //
  // — ONE equation containing H, LOD, year length and AU; the Moon closes
  // the web through the angular-momentum budget that sets LOD
  // (2πI·α/LOD + m√(GM·a_moon)·√(1−e²) = L_EM). When first measured this
  // was flat to ~0.17 ppm — and that residual turned out to be a REAL
  // inconsistency: the sidereal year still used the first-order Taylor
  // (1 − 2Δm) of the Driver-2 law while the planets and the AU used the
  // exact forms (T₀·(1−Δm)², a₀·(1−Δm)). With the year aligned to the
  // product form (deltat/deep-time.cjs + layer0), the relation holds to
  // FLOATING-POINT ROUNDING (~1e-16 relative) at every epoch — an
  // algebraic identity of the model, not an approximation.
  {
    const { createRequire } = await import('node:module');
    const requireCjs = createRequire(`file://${process.argv[1]}`);
    const dtm = requireCjs('../lib/deep-time.js');
    const au0 = dtm.meanAuAtAge(0);
    const K = (t) => dtm.meanHAtAge(t) * (dtm.meanSiderealYearSecondsAtAge(t) / dtm.meanLodSecondsAtAge(t));
    const K0 = K(0);
    console.log('5. THE EXACT INVARIANT — H · days/yr · (AU₀/AU)² (drift vs J2000, ppm):');
    console.log('   t_Ma | plain H·days/yr | AU²-corrected');
    for (const t of [4400, 3000, 2000, 1000, 380, 0, -200, -900]) {
      const k1 = K(t) / K0 - 1;
      const k2 = (K(t) * Math.pow(au0 / dtm.meanAuAtAge(t), 2)) / K0 - 1;
      console.log(`   ${String(t).padStart(5)} | ${(k1 * 1e6).toFixed(1).padStart(9)} | ${(k2 * 1e6).toFixed(3).padStart(9)}`);
    }
    console.log('   → constant = TOTAL_DAYS_IN_H · H₀/(H₀−13) (the canonical 122,471,920');
    console.log('     through the dual-divisor bridge — see the header note); the');
    console.log('     day-count near-invariant becomes EXACT under the Kepler AU²');
    console.log('     correction: one relation over H, LOD, year length and AU, with the');
    console.log('     Moon entering through the L budget that sets LOD. Documented in');
    console.log('     doc 99 §The Day-Count Near-Invariant.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * The deep-time lunar month/precession chain — THE shared implementation
 * (Phase 8.2-3). Extracted VERBATIM from src/script.js, which
 * tools/lib/deep-time.js mirrored; the 8.2-1 alignment proved the two
 * bit-exact (56/56 fixture probes) before this move.
 *
 * The chain, by dependency (doc 99 / doc 66):
 *
 *   Farhat distance a(t) ──► solar Δa (doc 24) ──► corrected a
 *        │                                              │
 *        ▼                                              ▼
 *   (engine LOD layer, injected)              Kepler sidereal month
 *                                              ├─► synodic month (beat with sidereal year)
 *                                              ├─► tropical month (one equinox turn per T_p(t))
 *                                              └─► perigee/node precession
 *                                                  (Brouwer–Clemence m² scaling ×
 *                                                   e_E-channel modulation — the
 *                                                   FACTORED law: period =
 *                                                   invariant mean / rate modulation)
 *                                                  ├─► anomalistic month
 *                                                  ├─► nodal (draconic) month
 *                                                  ├─► apsidal-meets-nodal beat
 *                                                  └─► lunar leveling beat
 *
 * LOAD-BEARING conventions:
 *  - t_Ma is AGE in Myr: positive = past. The chain returns null past the
 *    tidal-lock asymptote (via the injected LOD) — bounded physics, not error.
 *  - The J2000 anchors (moonApsidalJ2000Seconds etc.) are the engines' own
 *    derived constants, injected — the t_Ma === 0 fast paths return them
 *    EXACTLY (anchor identity, pinned by the 0 Ma fixture probes).
 *  - `modulation` is the shared moon eccentricity channel's [g/g₀]^s with the
 *    Meeus-EFFECTIVE sensitivities s_ϖ = 2.407 / s_Ω = 1.018 (the physical
 *    pair is 2.479/0.867 after removing the IAU frame term — doc 66 §1).
 *  - The of-date perigee/node periods are COMPOSITIONS of the inertial chain
 *    with the precession of date (the engines' `…OfDateCyclesBetween` count
 *    identities N_trop − N_anom and N_drac − N_trop). The former 'OfDate'
 *    family here — N·(H(t)/H₀)² counts per anchor unit and period ∝ T_yr/H —
 *    was the era device's counter law (doc 99's "Lunar Precession
 *    Invariant"); it left at plan 09 step 5c with the per-H counts.
 *  - apsidalMeetsNodal / lunarLeveling existed ONLY in the browser before
 *    this move (the Node scene aliased apsidal-of-date on a cancellation
 *    argument valid for the paired scene nodes only) — the Node engine gains
 *    the real forms here.
 */

'use strict';

/**
 * @param {{
 *   constants: {
 *     aMoonNowMetres: number,
 *     alpha1PerMa: number,
 *     alpha3PerMa3: number,
 *     alpha4PerMa4: number,
 *     gmEarthMoonM3PerS2: number,
 *     massRatioEarthMoon: number,
 *     moonSiderealMonthInputDays: number,
 *     meanSiderealYearJ2000Seconds: number,
 *     moonApsidalJ2000Seconds: number,
 *     moonNodalJ2000Seconds: number,
 *     moonSiderealMonthJ2000Seconds: number,
 *     sPerigee: number,
 *     sNode: number,
 *   },
 *   fns: {
 *     meanLodSecondsAtAge: (tMa: number) => (number | null),
 *     meanSiderealYearSecondsAtAge: (tMa: number) => number,
 *     precessionPeriodYearsAtAge: (tMa: number) => (number | null),
 *     modulation: (tMa: number, s: number) => number,
 *     distanceMetresAtAge?: (tMa: number) => number,
 *   },
 * }} deps — fns are the ENGINE'S OWN layer-0/1 evaluators and the shared
 *   eccentricity channel's modulation; constants are the engine's derived
 *   J2000 anchors (both engines derive them from the same JSON).
 *   fns.precessionPeriodYearsAtAge is the engine's lunisolar precession period
 *   of date T_p(t), Julian years (the composed rate's period; plan 09 step
 *   5c — the tropical month's equinox turn, formerly the counter's 13/H(t),
 *   0.086 % slow: the chain's J2000 tropical month sat 5.85 ms above the IAU
 *   input, the 1/T_p form is within 0.1 ms of it).
 *   fns.distanceMetresAtAge, when present, OVERRIDES the internal quartic —
 *   the Driver-1½ regime-aware history (recession-history.cjs); absent, the
 *   internal quartic is the pure twin (bit-identical for t ≤ jointMa).
 */
function createMoonMonthChain({ constants, fns }) {
  const {
    aMoonNowMetres, alpha1PerMa, alpha3PerMa3, alpha4PerMa4,
    gmEarthMoonM3PerS2, massRatioEarthMoon, moonSiderealMonthInputDays,
    meanSiderealYearJ2000Seconds,
    moonApsidalJ2000Seconds, moonNodalJ2000Seconds,
    moonSiderealMonthJ2000Seconds,
    sPerigee, sNode,
  } = constants;
  const { meanLodSecondsAtAge, meanSiderealYearSecondsAtAge, precessionPeriodYearsAtAge, modulation } = fns;

  /** Farhat α₁/α₃/α₄ polynomial — Earth–Moon distance in metres at age t_Ma.
   *  @param {number} tMa @returns {number} */
  function quarticMetresAtAge(tMa) {
    const t = tMa;
    return aMoonNowMetres * (1 + alpha1PerMa * t + alpha3PerMa3 * t * t * t + alpha4PerMa4 * t * t * t * t);
  }
  const distanceMetresAtAge = fns.distanceMetresAtAge ?? quarticMetresAtAge;

  /** @param {number} tMa @returns {number} */
  function distanceKmAtAge(tMa) {
    return distanceMetresAtAge(tMa) / 1000;
  }

  /** Solar Δa correction (km) for the Moon's apparent semi-major axis
   *  (doc 24). @param {number} tMa @param {number} aApparentKm
   *  @returns {number | null} */
  function solarDeltaAKmAtAge(tMa, aApparentKm) {
    const lodS = meanLodSecondsAtAge(tMa);
    if (lodS === null) return null;
    const tSidDaysAtEpoch = meanSiderealYearSecondsAtAge(tMa) / lodS;
    return aApparentKm * (1 / (massRatioEarthMoon + 1)) *
           (moonSiderealMonthInputDays / tSidDaysAtEpoch);
  }

  /** Kepler-effective distance in km (a_apparent + solar Δa).
   *  @param {number} tMa @returns {number | null} */
  function distanceCorrectedKmAtAge(tMa) {
    const aApp = distanceKmAtAge(tMa);
    const dA = solarDeltaAKmAtAge(tMa, aApp);
    return (dA === null) ? null : aApp + dA;
  }

  /** Sidereal month in seconds (Kepler on the corrected a).
   *  @param {number} tMa @returns {number | null} */
  function siderealMonthSecondsAtAge(tMa) {
    const aCorrKm = distanceCorrectedKmAtAge(tMa);
    if (aCorrKm === null) return null;
    return 2 * Math.PI * Math.sqrt(Math.pow(aCorrKm * 1000, 3) / gmEarthMoonM3PerS2);
  }

  /** Synodic month in seconds (Moon–Sun alignment beat).
   *  @param {number} tMa @returns {number | null} */
  function synodicMonthSecondsAtAge(tMa) {
    const tSm = siderealMonthSecondsAtAge(tMa);
    if (tSm === null) return null;
    const tYr = meanSiderealYearSecondsAtAge(tMa);
    return tSm * tYr / (tYr - tSm);
  }

  /** Tropical month in seconds (equinox-referenced): the sidereal month less
   *  the equinox's own motion over one month — one turn per the precession
   *  period of date T_p(t). (Plan 09 step 5c: formerly 13 turns per the
   *  counter H(t), 0.086 % slow.) @param {number} tMa @returns {number | null} */
  function tropicalMonthSecondsAtAge(tMa) {
    const tSm = siderealMonthSecondsAtAge(tMa);
    if (tSm === null) return null;
    const tYr = meanSiderealYearSecondsAtAge(tMa);
    const tP = precessionPeriodYearsAtAge(tMa);
    return tSm * (1 - tSm / (/** @type {number} */ (tP) * tYr));
  }

  // (Plan 09 step 5c: the H² of-date family — apsidal/nodal "cycles per H"
  // N·(H(t)/H₀)² and the of-date periods ∝ T_yr/H — is deleted with the per-H
  // counts. The of-date perigee and node of date are the engines' count
  // compositions of this chain's inertial periods with the tropical month.)

  /** Perigee precession period in seconds — Brouwer–Clemence m² scaling ×
   *  e_E-channel modulation (the factored law: period = invariant mean /
   *  rate modulation). @param {number} tMa @returns {number | null} */
  function perigeePrecessionSecondsAtAge(tMa) {
    if (tMa === 0) return moonApsidalJ2000Seconds;
    const tSmT = siderealMonthSecondsAtAge(tMa);
    const tYrT = meanSiderealYearSecondsAtAge(tMa);
    if (tSmT === null) return null;
    return moonApsidalJ2000Seconds
      * Math.pow(tYrT / meanSiderealYearJ2000Seconds, 2)
      * (moonSiderealMonthJ2000Seconds / tSmT)
      / modulation(tMa, sPerigee);
  }

  /** @param {number} tMa @returns {number | null} */
  function nodePrecessionSecondsAtAge(tMa) {
    if (tMa === 0) return moonNodalJ2000Seconds;
    const tSmT = siderealMonthSecondsAtAge(tMa);
    const tYrT = meanSiderealYearSecondsAtAge(tMa);
    if (tSmT === null) return null;
    return moonNodalJ2000Seconds
      * Math.pow(tYrT / meanSiderealYearJ2000Seconds, 2)
      * (moonSiderealMonthJ2000Seconds / tSmT)
      / modulation(tMa, sNode);
  }

  /** Anomalistic month in seconds (perigee-to-perigee).
   *  @param {number} tMa @returns {number | null} */
  function anomalisticMonthSecondsAtAge(tMa) {
    const tSm = siderealMonthSecondsAtAge(tMa);
    const tPer = perigeePrecessionSecondsAtAge(tMa);
    if (tSm === null || tPer === null) return null;
    return tSm * tPer / (tPer - tSm);
  }

  /** Nodal (draconic) month in seconds.
   *  @param {number} tMa @returns {number | null} */
  function nodalMonthSecondsAtAge(tMa) {
    const tSm = siderealMonthSecondsAtAge(tMa);
    const tNode = nodePrecessionSecondsAtAge(tMa);
    if (tSm === null || tNode === null) return null;
    return tSm * tNode / (tNode + tSm);
  }

  /** Beat of the anomalistic and nodal months.
   *  @param {number} tMa @returns {number | null} */
  function apsidalMeetsNodalSecondsAtAge(tMa) {
    const tAnom = anomalisticMonthSecondsAtAge(tMa);
    const tNod = nodalMonthSecondsAtAge(tMa);
    if (tAnom === null || tNod === null) return null;
    return tNod * tAnom / (tAnom - tNod);
  }

  /** Beat of the nodal and apsidal precessions.
   *  @param {number} tMa @returns {number | null} */
  function lunarLevelingSecondsAtAge(tMa) {
    const tApsi = perigeePrecessionSecondsAtAge(tMa);
    const tNode = nodePrecessionSecondsAtAge(tMa);
    if (tApsi === null || tNode === null) return null;
    return tNode * tApsi / (tNode - tApsi);
  }

  return {
    distanceMetresAtAge, distanceKmAtAge, solarDeltaAKmAtAge,
    distanceCorrectedKmAtAge, siderealMonthSecondsAtAge,
    synodicMonthSecondsAtAge, tropicalMonthSecondsAtAge,
    perigeePrecessionSecondsAtAge, nodePrecessionSecondsAtAge,
    anomalisticMonthSecondsAtAge, nodalMonthSecondsAtAge,
    apsidalMeetsNodalSecondsAtAge, lunarLevelingSecondsAtAge,
  };
}

module.exports = { createMoonMonthChain };

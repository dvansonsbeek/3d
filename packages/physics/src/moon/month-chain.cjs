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
 *                                              ├─► tropical month (H/13 identity)
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
 *  - The 'OfDate' cycle/precession family carries the legacy-'ICRF' input
 *    names but holds OF-DATE observational anchors (Option C+); the
 *    star-referenced values differ by ∓13 counts per H.
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
 *     holisticYearJ2000: number,
 *     meanSiderealYearJ2000Seconds: number,
 *     nApsidalOfDateJ2000: number,
 *     nNodalOfDateJ2000: number,
 *     moonApsidalJ2000Seconds: number,
 *     moonNodalJ2000Seconds: number,
 *     moonSiderealMonthJ2000Seconds: number,
 *     sPerigee: number,
 *     sNode: number,
 *   },
 *   fns: {
 *     meanLodSecondsAtAge: (tMa: number) => (number | null),
 *     meanSiderealYearSecondsAtAge: (tMa: number) => number,
 *     meanHAtAge: (tMa: number) => (number | null),
 *     modulation: (tMa: number, s: number) => number,
 *   },
 * }} deps — fns are the ENGINE'S OWN layer-0/1 evaluators and the shared
 *   eccentricity channel's modulation; constants are the engine's derived
 *   J2000 anchors (both engines derive them from the same JSON).
 */
function createMoonMonthChain({ constants, fns }) {
  const {
    aMoonNowMetres, alpha1PerMa, alpha3PerMa3, alpha4PerMa4,
    gmEarthMoonM3PerS2, massRatioEarthMoon, moonSiderealMonthInputDays,
    holisticYearJ2000, meanSiderealYearJ2000Seconds,
    nApsidalOfDateJ2000, nNodalOfDateJ2000,
    moonApsidalJ2000Seconds, moonNodalJ2000Seconds, moonSiderealMonthJ2000Seconds,
    sPerigee, sNode,
  } = constants;
  const { meanLodSecondsAtAge, meanSiderealYearSecondsAtAge, meanHAtAge, modulation } = fns;

  /** Farhat α₁/α₃/α₄ polynomial — Earth–Moon distance in metres at age t_Ma.
   *  @param {number} tMa @returns {number} */
  function distanceMetresAtAge(tMa) {
    const t = tMa;
    return aMoonNowMetres * (1 + alpha1PerMa * t + alpha3PerMa3 * t * t * t + alpha4PerMa4 * t * t * t * t);
  }

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

  /** Tropical month in seconds (equinox-referenced, the H/13 identity).
   *  @param {number} tMa @returns {number | null} */
  function tropicalMonthSecondsAtAge(tMa) {
    const tSm = siderealMonthSecondsAtAge(tMa);
    if (tSm === null) return null;
    const tYr = meanSiderealYearSecondsAtAge(tMa);
    const hT = meanHAtAge(tMa);
    return tSm * (1 - 13 * tSm / (/** @type {number} */ (hT) * tYr));
  }

  /** Apsidal cycles per H (of-date convention; legacy-'ICRF' input name):
   *  N × (H/H₀)², real-valued. @param {number} tMa @returns {number | null} */
  function apsidalCyclesOfDateAtAge(tMa) {
    const hT = meanHAtAge(tMa);
    if (hT === null) return null;
    return nApsidalOfDateJ2000 * Math.pow(hT / holisticYearJ2000, 2);
  }

  /** @param {number} tMa @returns {number | null} */
  function nodalCyclesOfDateAtAge(tMa) {
    const hT = meanHAtAge(tMa);
    if (hT === null) return null;
    return nNodalOfDateJ2000 * Math.pow(hT / holisticYearJ2000, 2);
  }

  /** @param {number} tMa @returns {number | null} */
  function apsidalPrecessionSecondsOfDateAtAge(tMa) {
    const n = apsidalCyclesOfDateAtAge(tMa);
    const hT = meanHAtAge(tMa);
    const tYrS = meanSiderealYearSecondsAtAge(tMa);
    if (n === null || hT === null) return null;
    return hT * tYrS / n;     // H in years × seconds/year / N
  }

  /** @param {number} tMa @returns {number | null} */
  function nodalPrecessionSecondsOfDateAtAge(tMa) {
    const n = nodalCyclesOfDateAtAge(tMa);
    const hT = meanHAtAge(tMa);
    const tYrS = meanSiderealYearSecondsAtAge(tMa);
    if (n === null || hT === null) return null;
    return hT * tYrS / n;
  }

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
    apsidalCyclesOfDateAtAge, nodalCyclesOfDateAtAge,
    apsidalPrecessionSecondsOfDateAtAge, nodalPrecessionSecondsOfDateAtAge,
    perigeePrecessionSecondsAtAge, nodePrecessionSecondsAtAge,
    anomalisticMonthSecondsAtAge, nodalMonthSecondsAtAge,
    apsidalMeetsNodalSecondsAtAge, lunarLevelingSecondsAtAge,
  };
}

module.exports = { createMoonMonthChain };

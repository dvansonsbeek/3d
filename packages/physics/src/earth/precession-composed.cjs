/**
 * The composed lunisolar precession rate — ONE home (holisticuniverse plan 06,
 * D6: the physical ψ̇(t) of falsification leg 1).
 *
 * Earth's axial precession rate is the two tiers composed: the spin ω(t) from
 * the tidal chain (LOD history) carries BOTH torques, and the lunar torque
 * additionally grows with the recession history as (a₀/a_M(t))³:
 *
 *   ψ̇(t) = [ω(t)/ω₀] · p₀ · [ f_S + (1 − f_S) · (a₀/a_M(t))³ ]
 *
 * with p₀ the J2000 rate and f_S the solar fraction of the J2000 torque,
 * derived from the shared constants (two-body point-mass torques with the
 * (1 − e²)^(−3/2) eccentricity factors and the lunar-inclination factor
 * 1 − 3/2·sin² i_M; ≈ 0.316, the textbook value). At J2000 every factor is 1.
 * Plan 06 Phase 3: the unit H(t) IS 13 of these periods at every epoch
 * (deltat/deep-time.cjs hAtAge builds on this factory), so H(t)/13 and the
 * composed period are one quantity. The pre-Phase-3 structural clock
 * 13·1,296,000/H_era(t) (pure ω-scaling, H_era = H₀·LOD/LOD₀) survives only
 * as the FROZEN ERA CLOCK's named phase convention (eraClockHAtAge) and in
 * docs/retired-record.md, with its record: it read 70.9 ″/yr against
 * Lantink et al. 2022's 108.6 ± 8.5 at 2.46 Ga and 65.2 against Meyers &
 * Malinverno 2018's 85.79 ± 2.72 at 1.4 Ga, where the composed rate reads
 * 104.5 and 86.5.
 *
 * Pure factory: the tidal chain is injected (each runtime's own LOD and
 * moon-distance evaluators), no artifact reads, no globals.
 */

'use strict';

const D2R = Math.PI / 180;

/**
 * Solar fraction of the J2000 precession torque from the shared constants.
 * @param {{
 *   gmSunKm3S2: number, auKm: number, earthEccentricity: number,
 *   gmMoonKm3S2: number, moonDistanceKm: number, moonEccentricity: number, moonInclinationDeg: number,
 * }} c
 * @returns {number} f_S in [0, 1]
 */
function computeSolarTorqueShare(c) {
  const sol = (c.gmSunKm3S2 / c.auKm ** 3) * Math.pow(1 - c.earthEccentricity * c.earthEccentricity, -1.5);
  const lun = (c.gmMoonKm3S2 / c.moonDistanceKm ** 3) * Math.pow(1 - c.moonEccentricity * c.moonEccentricity, -1.5)
    * (1 - 1.5 * Math.sin(c.moonInclinationDeg * D2R) ** 2);
  return sol / (sol + lun);
}

/**
 * @param {{
 *   p0ArcsecPerYr: number,
 *   solarShare: number,
 *   lodSecondsAtAge: (tMa: number) => (number | null),
 *   lodJ2000Seconds: number,
 *   moonDistanceMetresAtAge: (tMa: number) => (number | null),
 *   moonDistanceJ2000Metres: number,
 *   yearToTMa: (year: number) => number,
 * }} deps - p0 = 1,296,000/(H/13) (the model's J2000 rate); lodJ2000Seconds
 *   the SAME day basis lodSecondsAtAge(0) returns.
 * @returns {{
 *   composedRateArcsecPerYrAtAge: (tMa: number) => (number | null),
 *   composedPeriodYearsAtAge: (tMa: number) => (number | null),
 *   composedRateArcsecPerYrAtYear: (year: number) => (number | null),
 *   composedPeriodYearsAtYear: (year: number) => (number | null),
 *   composedRateRatioAtAge: (tMa: number) => (number | null),
 *   torqueTermAtAge: (tMa: number) => (number | null),
 *   lunarTorqueFactorAtAge: (tMa: number) => (number | null),
 *   solarShare: number,
 *   p0ArcsecPerYr: number,
 * }}
 */
function createComposedPrecession(deps) {
  const { p0ArcsecPerYr: p0, solarShare: fS } = deps;
  /** @param {number} tMa */
  const lunarTorqueFactorAtAge = (tMa) => {
    const a = deps.moonDistanceMetresAtAge(tMa);
    return a === null || !(a > 0) ? null : Math.pow(deps.moonDistanceJ2000Metres / a, 3);
  };
  /** The torque term f_S + (1 − f_S)·(a₀/a_M)³ — the factor the unit H(t)
   * divides the spin-scaled H_era by (deltat/deep-time.cjs; layer0 spells the
   * SAME operations, the layer0 gate holds them bit-identical).
   * @param {number} tMa */
  const torqueTermAtAge = (tMa) => {
    const lf = lunarTorqueFactorAtAge(tMa);
    return lf === null ? null : fS + (1 - fS) * lf;
  };
  /** @param {number} tMa */
  const composedRateArcsecPerYrAtAge = (tMa) => {
    const lod = deps.lodSecondsAtAge(tMa);
    const term = torqueTermAtAge(tMa);
    if (lod === null || !(lod > 0) || term === null) return null;
    return (deps.lodJ2000Seconds / lod) * p0 * term;
  };
  /** @param {number} tMa */
  const composedPeriodYearsAtAge = (tMa) => {
    const r = composedRateArcsecPerYrAtAge(tMa);
    return r === null ? null : 1296000 / r;
  };
  /** ψ̇(t)/ψ̇₀ — the factor a consumer scales ITS OWN certified J2000
   * anchor by (the hybrids anchor on the of-date beat 25,771.4 yr, not on
   * p₀'s 25,793; the ratio is what D6 changes, the anchor stays theirs).
   * ≡ 1 at J2000; null out of the tidal chain's domain.
   * @param {number} tMa */
  const composedRateRatioAtAge = (tMa) => {
    const r = composedRateArcsecPerYrAtAge(tMa);
    return r === null ? null : r / p0;
  };
  return {
    composedRateArcsecPerYrAtAge,
    composedPeriodYearsAtAge,
    composedRateArcsecPerYrAtYear: (year) => composedRateArcsecPerYrAtAge(deps.yearToTMa(year)),
    composedPeriodYearsAtYear: (year) => composedPeriodYearsAtAge(deps.yearToTMa(year)),
    composedRateRatioAtAge,
    torqueTermAtAge,
    lunarTorqueFactorAtAge,
    solarShare: fS,
    p0ArcsecPerYr: p0,
  };
}

module.exports = { computeSolarTorqueShare, createComposedPrecession };

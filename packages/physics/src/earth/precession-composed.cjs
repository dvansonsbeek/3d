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
 * The STRUCTURAL clock 13·1,296,000/H(t) (pure ω-scaling) is the pre-D6
 * reading kept as a named diagnostic: the two agree wherever (a₀/a_M)³ ≈ 1
 * and split at depth (Wu et al. 2024 at 650 Ma: 67.64 ″/yr inferred —
 * composed 67.8, structural 58.6; Lantink et al. 2022 at 2.46 Ga:
 * 108.6 ± 8.5 ″/yr — composed 104.5, structural 70.9).
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
 *   hAtAge: (tMa: number) => (number | null),
 *   yearToTMa: (year: number) => number,
 * }} deps - p0 = 1,296,000/(H/13) (the model's J2000 rate); lodJ2000Seconds
 *   the SAME day basis lodSecondsAtAge(0) returns; hAtAge only for the
 *   structural diagnostic.
 * @returns {{
 *   composedRateArcsecPerYrAtAge: (tMa: number) => (number | null),
 *   composedPeriodYearsAtAge: (tMa: number) => (number | null),
 *   composedRateArcsecPerYrAtYear: (year: number) => (number | null),
 *   composedPeriodYearsAtYear: (year: number) => (number | null),
 *   composedRateRatioAtAge: (tMa: number) => (number | null),
 *   structuralRateArcsecPerYrAtAge: (tMa: number) => (number | null),
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
  /** @param {number} tMa */
  const composedRateArcsecPerYrAtAge = (tMa) => {
    const lod = deps.lodSecondsAtAge(tMa);
    const lf = lunarTorqueFactorAtAge(tMa);
    if (lod === null || !(lod > 0) || lf === null) return null;
    return (deps.lodJ2000Seconds / lod) * p0 * (fS + (1 - fS) * lf);
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
  /** @param {number} tMa */
  const structuralRateArcsecPerYrAtAge = (tMa) => {
    const H = deps.hAtAge(tMa);
    return H === null || !(H > 0) ? null : 1296000 / (H / 13);
  };
  return {
    composedRateArcsecPerYrAtAge,
    composedPeriodYearsAtAge,
    composedRateArcsecPerYrAtYear: (year) => composedRateArcsecPerYrAtAge(deps.yearToTMa(year)),
    composedPeriodYearsAtYear: (year) => composedPeriodYearsAtAge(deps.yearToTMa(year)),
    composedRateRatioAtAge,
    structuralRateArcsecPerYrAtAge,
    lunarTorqueFactorAtAge,
    solarShare: fS,
    p0ArcsecPerYr: p0,
  };
}

module.exports = { computeSolarTorqueShare, createComposedPrecession };

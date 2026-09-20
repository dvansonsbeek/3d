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
 *
 * THE ANCHOR p₀ (plan 06 S5 — one J2000 precession reading): p₀ is the
 * model's DERIVED J2000 rate, 1,296,000/axial0 with axial0 the certified
 * year-length laws' beat at 2000 (sid/(sid − trop) = 25,771.4 yr = 50.2883
 * ″/yr, IAU 50.2879 to 8×10⁻⁶) — the SAME anchor the hybrid obliquity
 * self-anchors on. It is NOT 1,296,000/(H/13): H₀ = 335,317 was fitted on
 * the 1246 AD perihelion–solstice alignment (the perihelion-of-date beat),
 * so H₀/13 = 25,793.6 yr is the fit anchor's reading, 0.086 % slow, and
 * is not a period of anything the model computes (nor a window mean: the
 * published period averages 25,598 yr over ±26 kyr). The unit H(t) =
 * H_era/[torque term] (deltat/deep-time.cjs hAtAge) scales WITH the
 * composed period — H(t)/T_p(t) = H₀/axial0 = 13.011 at every epoch — but
 * is not 13 of them; the 13 is a fit-era label that leaves the physics.
 * The pre-Phase-3 structural clock 13·1,296,000/H_era(t) (pure ω-scaling,
 * H_era = H₀·LOD/LOD₀) survives only as the FROZEN ERA CLOCK's named phase
 * convention (eraClockHAtAge) and in docs/retired-record.md, with its
 * record: it read 70.9 ″/yr against Lantink et al. 2022's 108.6 ± 8.5 at
 * 2.46 Ga and 65.2 against Meyers & Malinverno 2018's 85.79 ± 2.72 at
 * 1.4 Ga, where the composed rate reads 104.6 and 86.6.
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
 *   p0ArcsecPerYr: number | (() => number),
 *   solarShare: number,
 *   lodSecondsAtAge: (tMa: number) => (number | null),
 *   lodJ2000Seconds: number,
 *   moonDistanceMetresAtAge: (tMa: number) => (number | null),
 *   moonDistanceJ2000Metres: number,
 *   yearToTMa: (year: number) => number,
 * }} deps - p0 = the model's derived J2000 rate, 1,296,000/axial0 (S5; a
 *   number or a LAZY getter — the callers' certified year laws read the
 *   deep-time factory this is built inside, so the anchor is resolved on
 *   the first RATE use, never at construction; the torque term needs no
 *   anchor); lodJ2000Seconds the SAME day basis lodSecondsAtAge(0) returns.
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
  const { solarShare: fS } = deps;
  /** @type {number|undefined} */
  let p0Memo;
  /** The J2000 anchor, resolved once on first use (lazy getter allowed). */
  const p0 = () => {
    if (p0Memo === undefined) {
      const v = typeof deps.p0ArcsecPerYr === 'function' ? deps.p0ArcsecPerYr() : deps.p0ArcsecPerYr;
      if (!(v > 0)) throw new Error(`createComposedPrecession: p0ArcsecPerYr must resolve to a positive rate, got ${v}`);
      p0Memo = v;
    }
    return p0Memo;
  };
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
    return (deps.lodJ2000Seconds / lod) * p0() * term;
  };
  /** @param {number} tMa */
  const composedPeriodYearsAtAge = (tMa) => {
    const r = composedRateArcsecPerYrAtAge(tMa);
    return r === null ? null : 1296000 / r;
  };
  /** ψ̇(t)/ψ̇₀ — the factor a consumer scales ITS OWN certified J2000
   * anchor by (since S5 p₀ and the hybrids' anchor are the same derived
   * value, 25,771.4 yr; the ratio is what D6 changes). ≡ 1 at J2000; null
   * out of the tidal chain's domain.
   * @param {number} tMa */
  const composedRateRatioAtAge = (tMa) => {
    const r = composedRateArcsecPerYrAtAge(tMa);
    return r === null ? null : r / p0();
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
    get p0ArcsecPerYr() { return p0(); },
  };
}

module.exports = { computeSolarTorqueShare, createComposedPrecession };

/**
 * The solar perturbation of the lunar orbit OF DATE — the m-family's amplitude scales
 * (plan 33 step 1; doc 111 §1.45). ONE home for the characteristic and the two ratios.
 *
 * Every solar inequality of the Moon's motion is a power series in m = n_S/n_M, the Sun's mean
 * motion over the Moon's (Delaunay 1860–67, Hill 1878, Brown 1897–1908): the variation ∝ m²,
 * the evection ∝ m·e_M, the annual equation ∝ m·e_E, the parallactic inequality ∝ m·a_M/a_S,
 * every solar sideband at least m¹; the pure lunar terms (the equation of the centre ∝ e_M, the
 * reduction to the ecliptic ∝ tan²(i/2)) carry no m. Meeus Ch. 47's tables are those series
 * summed at J2000 (ELP behind them); the model's series already rides e_E of date (Meeus's E
 * factor on the eccentricity channel) and sin i_L of date (the F-class scales, plan 31 A2) — the
 * m-family sat at its J2000 amplitude, a frozen constant without its pure twin (§1.9, §1.15).
 *
 * MEASURED (plan 33 step 0, tools/explore/plan33-step0-amplitudes.mjs): m is 0.0748 today, ×0.938
 * at 400 Ma, ×0.764 at 2.46 Ga, ×0.0331 at the cited history's end (the month 21.8 h against a
 * 365-SI-day year); the J2000 m-family mis-places a syzygy by 8.8 min at 400 Ma, 26.5 min at
 * 2.46 Ga, 3.6 min at the edge (the elongation rate grows faster than the misfit), and the
 * latitude by 0.015 / 0.054 / 0.134°.
 *
 * THE CHARACTERISTIC — a term's lowest power of m from its argument k_D·D + k_M·M + k_M′·M′ + k_F·F:
 *   k_D = 0, k_M = 0 → m⁰ (lunar);  k_D = 0, k_M ≠ 0 → m¹ (the annual family);
 *   k_D ≠ 0 → max(1, |k_D| − |k_M′|): 2D m², 2D ∓ M′ m·e, 2D − 2M′ m·e², 4D m⁴, 4D − M′ m³, D m·a/a′
 * (each lunar eccentricity factor absorbs one power of m in the D-families — Brown's ordering).
 * The odd-k_D terms are the parallactic family and carry a_M/a_S of date beside m.
 *
 * THE SCALING is the leading order: A(t) = A₀ · (m/m₀)^p · (a/a′ ÷ (a/a′)₀)^[k_D odd]. Today's fitted
 * amplitudes include higher orders in m (the leading term, 11/8 m² for the variation and 15/4 m e
 * for the evection, is ~2/3 of the fitted value) which shrink faster than the leading one: the
 * ratio form overstates a deep amplitude by up to a third of the term's change — ~2 % of the
 * variation at 400 Ma (1.5 min of instant), ~7 % at 2.46 Ga (5 min), nothing at the edge where the
 * terms are 0.04°. The published Hill–Brown coefficient series is the refinement, if a referee asks.
 * Both ratios are normalised on the chain's OWN J2000 reads — exactly 1 at the anchor, the era
 * moved by 1e-7 per kyr (the Moon's recession); null beyond the histories (the series keeps the
 * era form there, the distance getter's rule).
 */

'use strict';

/**
 * The lowest power of m = n_S/n_M a Meeus-class term's amplitude carries (the Hill–Brown
 * characteristic), from the multiples of D, M and M′ in its argument.
 * @param {number} kD @param {number} kM @param {number} kMp @returns {number} 0, 1, 2, 3 or 4
 */
function solarCharacteristicPower(kD, kM, kMp) {
  if (kD === 0) return kM !== 0 ? 1 : 0;
  const d = kD < 0 ? -kD : kD, p = kMp < 0 ? -kMp : kMp;
  return d - p > 1 ? d - p : 1;
}

/**
 * The two ratios of date the m-family rides, on the chain's readers (the deep-time chain through
 * the composer; tools/lib's twin; the browser's `_dtc()`): m(t)/m(0) with m the sidereal month over
 * the sidereal year of date, and (a_M/a_S)(t)/(a_M/a_S)(0) on the corrected Moon distance and the AU
 * of date. Exactly 1 at J2000 (the same operations divided by themselves); null where a reader
 * refuses (beyond the histories).
 * @param {{
 *   siderealMonthSecondsAtAge: (tMa: number) => (number | null),
 *   siderealYearSecondsAtAge: (tMa: number) => (number | null),
 *   moonDistanceKmAtAge: (tMa: number) => (number | null),
 *   auAtAge: (tMa: number) => (number | null),
 * }} deps — meanMoonSiderealMonthAtAge, meanSiderealYearSecondsAtAge, meanMoonDistanceCorrectedAtAge, meanAuAtAge
 * @returns {(tMa: number) => ({mRatio: number, aRatio: number} | null)}
 */
function createSolarPerturbationScales({ siderealMonthSecondsAtAge, siderealYearSecondsAtAge, moonDistanceKmAtAge, auAtAge }) {
  /** @type {number | null | undefined} */
  let m0;
  /** @type {number | null | undefined} */
  let a0;
  /** @param {number} tMa @returns {number | null} */
  const mAt = (tMa) => { const pm = siderealMonthSecondsAtAge(tMa), py = siderealYearSecondsAtAge(tMa); return (pm === null || py === null || !(py > 0)) ? null : pm / py; };
  /** @param {number} tMa @returns {number | null} */
  const aAt = (tMa) => { const am = moonDistanceKmAtAge(tMa), as = auAtAge(tMa); return (am === null || as === null || !(as > 0)) ? null : am / as; };
  return function solarPerturbationScalesAtAge(tMa) {
    const m = mAt(tMa), a = aAt(tMa);
    if (m === null || a === null) return null;
    if (m0 === undefined) m0 = mAt(0);
    if (a0 === undefined) a0 = aAt(0);
    if (m0 === null || !(m0 > 0) || a0 === null || !(a0 > 0)) return null;
    return { mRatio: m / m0, aRatio: a / a0 };
  };
}

module.exports = { solarCharacteristicPower, createSolarPerturbationScales };

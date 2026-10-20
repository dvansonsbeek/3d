/**
 * The mean obliquity of date ε̄(t) — the SECOND column the model reads from the
 * cited Earth–Moon history (plan 12 §8, option (a)): Farhat, Auclair-Desrotour,
 * Boué & Laskar 2022's own mean obliquity, carried in
 * data/astrogeo22-earth-moon.json beside the distance.
 *
 * WHY AN INPUT. The composed lunisolar law (earth/precession-composed.cjs)
 * scales the precession CONSTANT of date — α(t)/α₀ on the spin history and the
 * lunar torque's (a₀/a_M)³. The precession RATE is α(t)·cos ε̄(t), and the chain
 * had held cos ε̄ at its J2000 value at every epoch — a purity freeze without
 * its twin. Standard theory since Goldreich 1966 (Touma & Wisdom 1994; Farhat
 * et al. 2022) has the mean obliquity lower in the deep past, evolved by the
 * lunar tidal torque through the Laplace-plane transition — the same
 * ocean-dissipation physics option A declined to model for the distance. The
 * published solution that computes ε̄(t) alongside a(t) is the input, as the
 * distance is. Measured (plan 12 §8.1): the factor cos ε̄(t)/cos ε̄(0) closes
 * the composed rate to Farhat's own precession column from −2.0 % to +0.4 % at
 * 2.46 Ga and moves every paleo precession referee toward its source.
 *
 * WHAT IS READ. The column's cosine RATIO cos ε̄(t)/cos ε̄(0) — the SHAPE, as
 * the distance is read as a(t)/a(0). The column's own value is published as the
 * cited mean: 23.2545° at age 0, a Myr-scale MEAN of a secular solution, not
 * the J2000 instant 23.4393° the hybrid obliquity integration starts from.
 *
 * INTERPOLATION. Cubic Hermite with central-difference tangents between the
 * 1-Myr samples (one-sided at the ends) — C1. The column is monotone (measured:
 * no sign change of its first difference across the 4,429 samples), so no
 * limiter is needed. Forward of J2000 (t < 0) the column's J2000 one-sided
 * slope is held — a labelled extrapolation, as the distance holds the LLR rate
 * (the input has no future). Beyond the table's last sample the history
 * REFUSES: null, never an extrapolation.
 *
 * HISTORICAL ERA. The slope at J2000 is −0.00264°/Myr: the factor is
 * 1 − 2.0e-7 at 10 kyr and 1 − 2.0e-6 at 100 kyr — the ΔT era is untouched at
 * the 1e-7 class; the deep-time clock T_p(t) shortens 0.75 % at the Devonian
 * and 2.5 % at 2.46 Ga.
 */

'use strict';

const D2R = Math.PI / 180;

/**
 * @typedef {Object} MeanObliquityTable
 * @property {ReadonlyArray<number>} ageMa - ascending, 0 first, uniform 1-Myr step
 * @property {ReadonlyArray<number>} obliquityDeg - the cited mean obliquity column, degrees
 */

/**
 * @param {{ table: MeanObliquityTable }} deps
 * @returns {{
 *   meanObliquityDegAtAge: (tMa: number) => number|null,
 *   cosRatioAtAge: (tMa: number) => number|null,
 *   meanObliquityJ2000Deg: number,
 *   spanMa: number,
 * }}
 */
function createMeanObliquityHistory(deps) {
  const ages = deps.table.ageMa, eps = deps.table.obliquityDeg;
  const n = ages ? ages.length : 0;
  if (!(n >= 2) || !eps || eps.length !== n || ages[0] !== 0) {
    throw new Error('mean-obliquity-history: the table must start at age 0 with ≥ 2 obliquity samples (a stale moon-distance embed lacks the obliquity column — regenerate the constants)');
  }
  const step = ages[1] - ages[0];
  for (let i = 1; i < n; i++) {
    if (ages[i] - ages[i - 1] !== step) throw new Error(`mean-obliquity-history: non-uniform age step at index ${i}`);
  }
  const spanMa = ages[n - 1];
  // Central-difference tangents, deg per Ma (one-sided at the ends).
  const m = new Float64Array(n);
  m[0] = (eps[1] - eps[0]) / step;
  for (let i = 1; i < n - 1; i++) m[i] = (eps[i + 1] - eps[i - 1]) / (2 * step);
  m[n - 1] = (eps[n - 1] - eps[n - 2]) / step;
  const cos0 = Math.cos(eps[0] * D2R);

  /** @param {number} tMa @returns {number|null} the cited mean obliquity, degrees */
  function meanObliquityDegAtAge(tMa) {
    if (tMa <= 0) return eps[0] + m[0] * tMa;   // forward: the J2000 slope held (labelled extrapolation)
    if (tMa > spanMa) return null;              // beyond the input: refused
    const i = Math.min(Math.floor(tMa / step), n - 2);
    const h = step, s = (tMa - ages[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * eps[i] + (s3 - 2 * s2 + s) * h * m[i]
      + (-2 * s3 + 3 * s2) * eps[i + 1] + (s3 - s2) * h * m[i + 1];
  }
  /** cos ε̄(t)/cos ε̄(0) — the factor the precession RATE of date carries on the precession constant. ≡ 1 at J2000.
   * @param {number} tMa @returns {number|null} */
  function cosRatioAtAge(tMa) {
    const e = meanObliquityDegAtAge(tMa);
    return e === null ? null : Math.cos(e * D2R) / cos0;
  }
  return { meanObliquityDegAtAge, cosRatioAtAge, meanObliquityJ2000Deg: eps[0], spanMa };
}

module.exports = { createMeanObliquityHistory };

'use strict';
// The sidereal year of date — the D6 one-source channel.
//
// T_sid(year) = massLossLaw(year) / lamDotRel(year)
//
// lamDotRel is the banked ratio of Earth's mean-longitude rate λ̇ to its
// J2000 value, extracted from the model's own ±10-Myr N-body run
// (nbody-secular-series.json, bodies.earth.lamDotRel). λ̇'s small secular
// drift — the epoch drift of the mean longitude under planetary
// perturbations + GR — is its OWN dynamical channel: it is NOT derivable
// from the banked ζ/z subsystem (measured: the naive 360/(n + ϖ̇) with
// the movement's apsidal rate errs ±50 s where the true drift is ~1 s per
// 12 kyr), and it reproduces the Chapront/Capitaine sidereal-year
// polynomial slope to ~0.1 s over ±12 kyr (the generator's banked gate).
// The run's GM is CONSTANT, so the channel carries no mass loss — the
// caller multiplies its own mass-loss law (the H-chain sidereal-year
// evaluator, IAU-anchored at J2000) and there is no double count. At the
// J2000 node lamDotRel ≡ 1 by construction, so the caller's anchor is
// preserved exactly.
//
// Scope: this channel feeds the model/chart surface for the sidereal year
// OF DATE. The scene's sidereal frame stays on the certified H/13
// identity — a 3e-8 relative frame change is invisible in the render and
// would disturb the certified frozen-clock pair.

const { SIDEREAL_CHANNEL_ARTIFACT } = require('./sidereal-channel-artifact.cjs');

/**
 * @param {{
 *   t0Yr?: number,
 *   stepYr?: number,
 *   lamDotRel?: number[],
 *   massLossSiderealSecondsAtYearFn: (year: number) => number,
 * }} opts
 *   t0Yr/stepYr/lamDotRel: the banked channel geometry (t in years from
 *   J2000: t_i = t0Yr + i·stepYr) — default: the embedded
 *   SIDEREAL_CHANNEL_ARTIFACT (generate.mjs-owned, pinned to the governed
 *   series artifact), so callers normally pass only the mass-loss law.
 *   massLossSiderealSecondsAtYearFn: the caller's secular mass-loss
 *   sidereal-year law, SI seconds (year = calendar year).
 */
function createSiderealYearChannel(opts) {
  const t0Yr = opts.t0Yr ?? SIDEREAL_CHANNEL_ARTIFACT.t0Yr;
  const stepYr = opts.stepYr ?? SIDEREAL_CHANNEL_ARTIFACT.stepYr;
  const lamDotRel = opts.lamDotRel ?? SIDEREAL_CHANNEL_ARTIFACT.lamDotRel;
  const { massLossSiderealSecondsAtYearFn } = opts;
  const nS = lamDotRel.length;

  // C1 cubic (Catmull-Rom node slopes), exact at nodes — the same
  // interpolation class as the movement's series (linear lerp kinks the
  // derivative at nodes; measured on the ζ/z series, D4g).
  const relAt = (/** @type {number} */ t) => {
    const x = (t - t0Yr) / stepYr;
    if (x <= 0 || x >= nS - 1) return 1;         // outside the span: planetary term unknown, mass-loss only
    const i = Math.floor(x), f = x - i;
    const y0 = lamDotRel[i], y1 = lamDotRel[i + 1];
    const m0 = i > 0 ? (y1 - lamDotRel[i - 1]) / 2 : y1 - y0;
    const m1 = i + 2 < nS ? (lamDotRel[i + 2] - y0) / 2 : y1 - y0;
    const f2 = f * f, f3 = f2 * f;
    return (2 * f3 - 3 * f2 + 1) * y0 + (f3 - 2 * f2 + f) * m0
      + (-2 * f3 + 3 * f2) * y1 + (f3 - f2) * m1;
  };

  return {
    /** The planetary λ̇ ratio to J2000 (1 outside the banked span). @param {number} year */
    planetaryRelAtYear: (year) => relAt(year - 2000),
    /** The sidereal year of date, SI seconds. @param {number} year */
    siderealYearSecondsAtYear: (year) =>
      massLossSiderealSecondsAtYearFn(year) / relAt(year - 2000),
    /**
     * Apply the λ̇ drift COHERENTLY to any year length (tropical,
     * anomalistic, …): every year is 360/(λ̇ + X) for some geometric rate
     * X (equinox p, apsidal −ϖ̇, 0 for sidereal), and the channel scales
     * λ̇ only — so the correction is on the RATE, not the period:
     *   1/T' = 1/T + (rel − 1)/T_sid_raw
     * (for the sidereal year itself this reduces exactly to T/rel).
     * Correcting periods by division instead would corrupt beat-derived
     * quantities (P = sid/(sid − trop) amplifies ~20×/s); this form
     * leaves every beat invariant to second order.
     * @param {number} year @param {number} yearSeconds
     */
    correctedYearSeconds: (year, yearSeconds) => {
      const rel = relAt(year - 2000);
      if (rel === 1) return yearSeconds;
      return 1 / (1 / yearSeconds + (rel - 1) / massLossSiderealSecondsAtYearFn(year));
    },
  };
}

module.exports = { createSiderealYearChannel };

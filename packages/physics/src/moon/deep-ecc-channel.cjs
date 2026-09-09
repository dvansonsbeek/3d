/**
 * The DEEP Earth-eccentricity channel — engine-switch Stage B, the T5d-(d)
 * decision (ii) (plan 02 §8, owner-approved MODEL CHANGE, pre-registered
 * acceptance in the same record).
 *
 * Evaluates Earth's e(t) from the engine's own ±10-Myr NAFF mode table
 * (data/nbody-deep-secular-modes.json, embedded verbatim by generate.mjs as
 * deep-modes-artifact.cjs) in the ANCHORED form the era chain also uses:
 *
 *     z(t) = Σ (re + i·im)·e^{iωt} + (z_J2000 − Σ(0)),   e = |z|
 *
 * — the constant remainder pins the unresolved short/ultra-long content at
 * the JPL J2000 seed anchor, so e(J2000) is exact by construction.
 *
 * DOMAIN (decision (ii), proper physics — no mixed device): the ENTIRE
 * lunar chain reads THIS channel — eccAt (the Δe² argument terms),
 * channelIntegral (perigee/node of-date rates), modulation (the
 * month/precession chain and its integrated cycle counts), eFactorAt (the
 * Meeus E-factor). The Sun/clock machinery (eclipse Sun equation of
 * centre, besselian Sun distance, cardinal braid) stays on the H/3 law
 * (moon/ecc-channel.cjs) — a CERTIFICATION split, not a physics one: the
 * two e's agree within 4.2e-5 wherever the domains overlap, and the H/3
 * line keeps its E18 role as the epoch-local tangent inside the fitted
 * clock stack.
 *
 * MEASURED at adoption (banked in the plan record): vs the H/3 law the
 * attractor-mean modulation shifts are +2,526 ppm (perigee channel,
 * s = 2.407) and +1,067 ppm (node, s = 1.018) — month/LOD shifts of
 * ~10–25 ppm class, all 41 paleo anchors in bands; the ancient eclipse
 * stack's cycle counts shift (χ² IMPROVES — recorded with its
 * explanation: this e is La2004-corroborated in-era, 3× closer than the
 * H/3 line; theory-corroborated, never tuned). Beyond ~5 Myr the table is
 * spectrum-class (phases decohere) — the quasi-periodic ATTRACTOR (mean e
 * and the 405-kyr-class beat structure) is the claim, never a pointwise
 * ephemeris.
 *
 * LOAD-BEARING conventions (carried VERBATIM from the era channel —
 * moon/ecc-channel.cjs — so the certified numerics match):
 *  - channelIntegral uses composite Simpson with step ≤ ~4,000 yr
 *    (N ≥ 2, even);
 *  - modulation(tMa, s) takes age in Myr, positive = past, ≡ 1 at J2000;
 *  - eFactorAt(tYr) = eccAt(tYr) / e0, ≡ 1 at J2000.
 */

'use strict';

/**
 * @param {{
 *   earthZ: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 * }} artifact — the embedded deep-modes artifact (earth z-modes + the J2000
 *   anchor pair joined from the chain artifact's one home).
 */
function createDeepEccChannel({ earthZ, anchorE, anchorPeriEclipticDeg }) {
  const D2R = Math.PI / 180;
  const zA = [anchorE * Math.cos(anchorPeriEclipticDeg * D2R), anchorE * Math.sin(anchorPeriEclipticDeg * D2R)];
  /** @param {number} tYr @returns {[number, number]} */
  const modeSum = (tYr) => {
    let re = 0, im = 0;
    for (const m of earthZ) {
      const c = Math.cos(m.omegaRadPerYr * tYr), s = Math.sin(m.omegaRadPerYr * tYr);
      re += m.re * c - m.im * s;
      im += m.re * s + m.im * c;
    }
    return [re, im];
  };
  const s0 = modeSum(0);
  const R = [zA[0] - s0[0], zA[1] - s0[1]];   // the constant remainder

  /** Earth's e at tYr years from J2000 (negative = past).
   *  @param {number} tYr @returns {number} */
  function eccAt(tYr) {
    const [x, y] = modeSum(tYr);
    return Math.hypot(x + R[0], y + R[1]);
  }

  /** de/dyear — analytic from the mode sum: d|z|/dt = (z·ż)/|z|.
   *  @param {number} tYr @returns {number} */
  function eccRateAt(tYr) {
    const [x0, y0] = modeSum(tYr);
    const x = x0 + R[0], y = y0 + R[1];
    let dx = 0, dy = 0;
    for (const m of earthZ) {
      const c = Math.cos(m.omegaRadPerYr * tYr), s = Math.sin(m.omegaRadPerYr * tYr);
      dx += m.omegaRadPerYr * (-m.re * s - m.im * c);
      dy += m.omegaRadPerYr * (m.re * c - m.im * s);
    }
    const r = Math.hypot(x, y);
    return r === 0 ? 0 : (x * dx + y * dy) / r;
  }

  const e0 = eccAt(0);                          // ≡ anchorE by construction
  const g0 = Math.pow(1 - e0 * e0, -1.5);

  /** [g(e(t))/g₀]^s — the perigee/node rate modulation, ≡ 1 at J2000.
   *  tMa is age in Myr (positive = past, the deep-time chain convention).
   *  @param {number} tMa @param {number} s @returns {number} */
  function modulation(tMa, s) {
    if (tMa === 0) return 1;
    const e = eccAt(-tMa * 1e6);
    return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s);
  }

  /** ∫₀ᵀ [(g(e(t′))/g₀)^s − 1] dt′ in Julian centuries — the phase-aware
   *  channel-rate integral. Composite Simpson, step ≤ ~4 kyr (the era
   *  channel's certified discretization, verbatim).
   *  @param {number} T @param {number} s @returns {number} */
  function channelIntegral(T, s) {
    if (T === 0) return 0;
    /** @param {number} t */
    const f = (t) => {
      const e = eccAt(t * 100);   // t in cy → years
      return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s) - 1;
    };
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
    const h = T / N;
    let sum = f(0) + f(T);
    for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
  }

  /** Bounded Meeus E-factor: E ≡ e(t)/e(J2000), ≡ 1 at J2000.
   *  @param {number} tYr @returns {number} */
  function eFactorAt(tYr) {
    return eccAt(tYr) / e0;
  }

  return { eccAt, eccRateAt, modulation, channelIntegral, eFactorAt, e0, g0 };
}

module.exports = { createDeepEccChannel };

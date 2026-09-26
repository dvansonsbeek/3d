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
 * THE SLOPE ANCHOR (owner-approved model change, after the Moon panels).
 * The 18-term table reproduces the attractor and the 405-kyr beat, but
 * nothing constrained its local DERIVATIVE at J2000: measured, its ė read
 * −5.00e-5/cy against the run's own −4.24e-5 (and the observed −4.20e-5),
 * a 19 % slope error that the lunar chain multiplied straight into the
 * perigee and node curvature (−44″/cy² against Meeus's −37″/cy² — the
 * "18 % split" the Moon precession panels showed). Against the ±10-Myr
 * series the table compresses, the error is a LINEAR vector drift of
 * 2.25e-4 per kyr out to ±20 kyr (an unresolved ultra-long mode), then
 * spectrum-class either way. So the anchored form gains a second,
 * BOUNDED term of the same class as the constant remainder:
 *
 *     z(t) = Σ … + (z_J2000 − Σ(0)) + (ż_J2000 − Σ̇(0))·I(t),
 *     I(t) = ∫₀ᵗ cos²(π τ / 2T_q) dτ  (the arguments' taper: linear near
 *            J2000, saturating at ±T_q/2 beyond |t| ≥ T_q)
 *
 * — ż_J2000 is the run's own z-rate at J2000 (script-written into the
 * artifact by generate.mjs from the banked series: "we are the source"),
 * T_q the H/12 taper the arguments' rate anchors ride. Inside the canon it
 * restores the run's slope exactly; beyond ±T_q it is a constant vector
 * offset of ~3e-3, the size of the table's own spectrum-class scatter
 * there, never a growing polynomial. Absent the two fields (an older
 * artifact), the channel is the value-anchored form above, unchanged.
 *
 * @param {{
 *   earthZ: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 *   anchorZDotPerYr?: ReadonlyArray<number>,
 *   slopeTaperYears?: number,
 * }} artifact — the embedded deep-modes artifact (earth z-modes + the J2000
 *   anchor pair joined from the chain artifact's one home, + the J2000
 *   z-rate pair and the taper from the series' one home).
 */
function createDeepEccChannel({ earthZ, anchorE, anchorPeriEclipticDeg, anchorZDotPerYr, slopeTaperYears }) {
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
  /** dΣ/dt (per year) — analytic. @param {number} tYr @returns {[number, number]} */
  const modeSumRate = (tYr) => {
    let dx = 0, dy = 0;
    for (const m of earthZ) {
      const c = Math.cos(m.omegaRadPerYr * tYr), s = Math.sin(m.omegaRadPerYr * tYr);
      dx += m.omegaRadPerYr * (-m.re * s - m.im * c);
      dy += m.omegaRadPerYr * (m.re * c - m.im * s);
    }
    return [dx, dy];
  };
  const s0 = modeSum(0);
  const R = [zA[0] - s0[0], zA[1] - s0[1]];   // the constant remainder
  // the slope anchor: the run's J2000 z-rate minus the table's, through the taper
  const Tq = (anchorZDotPerYr && typeof slopeTaperYears === 'number' && slopeTaperYears > 0) ? slopeTaperYears : 0;
  const sDot0 = modeSumRate(0);
  const DZ = Tq > 0 && anchorZDotPerYr ? [anchorZDotPerYr[0] - sDot0[0], anchorZDotPerYr[1] - sDot0[1]] : [0, 0];
  /** ∫₀ᵗ cos²(π τ / 2T_q) dτ, saturating at ±T_q/2. @param {number} t */
  const iEnv = (t) => {
    if (Tq <= 0) return 0;
    if (Math.abs(t) >= Tq) return Math.sign(t) * Tq / 2;
    return t / 2 + (Tq / (2 * Math.PI)) * Math.sin(Math.PI * t / Tq);
  };
  /** cos²(π t / 2T_q), 0 beyond |t| ≥ T_q — dI/dt. @param {number} t */
  const env = (t) => (Tq <= 0 || Math.abs(t) >= Tq) ? 0 : Math.cos(Math.PI * t / (2 * Tq)) ** 2;

  /** Earth's e at tYr years from J2000 (negative = past).
   *  @param {number} tYr @returns {number} */
  function eccAt(tYr) {
    const [x, y] = modeSum(tYr);
    const I = iEnv(tYr);
    return Math.hypot(x + R[0] + DZ[0] * I, y + R[1] + DZ[1] * I);
  }

  /** de/dyear — analytic: d|z|/dt = (z·ż)/|z|, the slope anchor's
   *  tapered rate included. @param {number} tYr @returns {number} */
  function eccRateAt(tYr) {
    const [x0, y0] = modeSum(tYr);
    const I = iEnv(tYr), E = env(tYr);
    const x = x0 + R[0] + DZ[0] * I, y = y0 + R[1] + DZ[1] * I;
    const [dx0, dy0] = modeSumRate(tYr);
    const dx = dx0 + DZ[0] * E, dy = dy0 + DZ[1] * E;
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

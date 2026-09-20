/**
 * Climate Formula L1 orbital layer — THE shared evaluator (Phase 8.4,
 * slice 4). The δ¹⁸O contribution from the L1 (orbital/Milankovitch)
 * harmonic layer only, in ‰ — excludes the intercept, L2 (405-kyr
 * carbon), L3 (regime steps), y_mean, and trend_slope: consumers want
 * the orbital FLUCTUATION around J2000, not the secular baseline.
 *
 * Primary consumer: the GIA α(t) chain — one physical mechanism, two
 * observables: the same L1 signal that fits δ¹⁸O also drives α via
 * Milankovitch forcing → ice sheets → GIA J₂/α → LOD (doc 99
 * §prediction-7). Both engines hand-mirrored this loop; it lives once
 * now.
 *
 * ENGINE-SIDE, by design: the regime selection (CLIMATE_FORMULA_COEFFS
 * lookup, the ALPHA_CLIMATE_REGIME_KEY choice), the α formula itself
 * (one subtraction around engine state), and the lattice-α pin machinery
 * (_withLatticeAlpha — mutable engine state with try/finally semantics
 * and, in the browser, a TDZ-history guard).
 */

'use strict';

/**
 * @typedef {Object} ClimateL1Regime
 * @property {Array<{period_kyr: number, a: number, b: number}>} l1Terms - the
 *   L1 lines: periods in kyr (the engine's own orbital lines + the 405-kyr
 *   family — data/l1-physical-lines.json, ONE home) with fitted cos/sin
 *   coefficients
 * @property {number} yStdDenormalization - the fit's y_std scale-back
 */

/**
 * @param {number} year - calendar year
 * @param {ClimateL1Regime} regime
 * @returns {number} L1 orbital δ¹⁸O contribution, ‰
 */
function evalClimateL1OrbitalPermil(year, regime) {
  const t_kyr_BP = (2000 - year) / 1000;
  let L1_sum = 0;
  for (const c of regime.l1Terms) {
    const omega = (2 * Math.PI) / c.period_kyr;
    L1_sum += c.a * Math.cos(omega * t_kyr_BP) + c.b * Math.sin(omega * t_kyr_BP);
  }
  return L1_sum * regime.yStdDenormalization;
}

/**
 * The GIA channel — the polar moment's LAGGED response to the ice history the
 * L1 layer proxies (holisticuniverse plan 06, D7). The solid Earth responds to
 * an ice load through the mantle's viscoelastic relaxation, so
 *
 *   α(t) = α₀ − k · [ L1(t) − ⟨L1⟩_τ(t) ]
 *
 * with ⟨L1⟩_τ the causal exponential average over the PAST (time constant τ).
 * Every L1 line passes that filter as a line, Ĉ' = Ĉ · iωτ/(1 + iωτ) with
 * Ĉ = a + ib in physical time, so the evaluator stays a sinusoid sum and each
 * runtime's lattice-α pin and memo are untouched. k > 0 is the direct-load
 * sign (an uncompensated ice load lowers α); after a rapid deglaciation
 * L1 − ⟨L1⟩ < 0, α sits above equilibrium and relaxes for ~τ — today's
 * −0.35 ms/cy non-tidal drift is that tail. k is DERIVED at construction so
 * that dα/dt(J2000) equals the satellite-gravimetry rate (Cox & Chao 2002
 * dJ₂/dt ÷ the Peltier J₂→α factor): no stored scale. τ was MEASURED against
 * the historical ΔT record through the joint fitter (optimum 5–6 kyr,
 * the degree-2 Maxwell estimate; plan 06 D7 record). Replaces the
 * instantaneous α ∝ L1 law, which had the deglacial transient's sign and
 * timing backwards and depended on fitted comb lines the T1 test retired.
 *
 * @param {Array<{period_kyr: number, a: number, b: number}>} l1Terms
 * @param {number} relaxationKyr - τ in kyr
 * @returns {Array<{period_kyr: number, a: number, b: number}>}
 */
function laggedL1Terms(l1Terms, relaxationKyr) {
  return l1Terms.map((c) => {
    const wt = ((2 * Math.PI) / c.period_kyr) * relaxationKyr;   // ωτ, dimensionless
    const d = 1 + wt * wt;
    const Hre = (wt * wt) / d, Him = wt / d;                     // H(ω) = iωτ / (1 + iωτ)
    return { period_kyr: c.period_kyr, a: c.a * Hre - c.b * Him, b: c.a * Him + c.b * Hre };
  });
}

/**
 * @param {{
 *   l1Terms: Array<{period_kyr: number, a: number, b: number}>,
 *   yStdDenormalization: number,
 *   relaxationKyr: number,
 *   alphaGiaRateJ2000PerYr: number,
 *   alphaJ2000: number,
 * }} cfg - relaxationKyr and alphaGiaRateJ2000PerYr are model-parameters
 *   deepTime constants; alphaJ2000 the IERS moment-of-inertia factor
 * @returns {{
 *   alphaAt: (year: number) => number,
 *   laggedL1PermilAt: (year: number) => number,
 *   kPerPermille: number,
 *   relaxationKyr: number,
 *   laggedL1Terms: Array<{period_kyr: number, a: number, b: number}>,
 * }}
 */
function createAlphaGiaChannel({ l1Terms, yStdDenormalization, relaxationKyr, alphaGiaRateJ2000PerYr, alphaJ2000 }) {
  const lagged = laggedL1Terms(l1Terms, relaxationKyr);
  const regime = { l1Terms: lagged, yStdDenormalization };
  // dL'/dyear at J2000 in closed form: with t = (2000 − year)/1000,
  // d/dyear Σ[a cos ωt + b sin ωt] = −(1/1000)·Σ ω(−a sin ωt + b cos ωt) → at t = 0: −(1/1000)·Σ ω b
  let sum = 0;
  for (const c of lagged) sum += ((2 * Math.PI) / c.period_kyr) * c.b;
  const slopeJ2000PermillePerYr = (-sum / 1000) * yStdDenormalization;
  const kPerPermille = -alphaGiaRateJ2000PerYr / slopeJ2000PermillePerYr;   // dα/dt = −k · dL'/dt
  const laggedJ2000 = evalClimateL1OrbitalPermil(2000, regime);
  return {
    alphaAt: (year) => alphaJ2000 - kPerPermille * (evalClimateL1OrbitalPermil(year, regime) - laggedJ2000),
    laggedL1PermilAt: (year) => evalClimateL1OrbitalPermil(year, regime),
    kPerPermille,
    relaxationKyr,
    laggedL1Terms: lagged,
  };
}

module.exports = { evalClimateL1OrbitalPermil, laggedL1Terms, createAlphaGiaChannel };

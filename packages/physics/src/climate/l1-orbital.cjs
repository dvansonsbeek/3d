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

/** C¹ smoothstep 0 → 1 over [0, 1]. @param {number} x @returns {number} */
const smoothstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * The GIA channel — the polar moment's LAGGED response to the ICE-VOLUME history
 * (holisticuniverse plans 06 and 26). The solid Earth responds to an ice load
 * through the mantle's viscoelastic relaxation, so
 *
 *   α(t) = α₀ − k · [ V(t) − V(2000) ],   J₂(t)/J₂₀ = 1 − k_J · [ V(t) − V(2000) ]
 *
 * with V(t) the ice-volume history in the channel's currency (‰ of the LR04-fitted
 * orbital response — the orbital part of benthic δ¹⁸O IS ice volume: the sea-level
 * stack and LR04 agree on one ratio, ~67 m/‰, across the precession, obliquity and
 * eccentricity bands; plan 26 §2M.2), and k, k_J DERIVED at construction so that
 * dα/dt(J2000) and dJ₂/dt(J2000) equal the observed rates (Peltier's ICE-6G LOD
 * coupling, Cox & Chao 2002 satellite gravimetry) — no stored scale, no J₂→α
 * factor. k > 0 is the direct-load sign (an uncompensated ice load lowers α); after
 * a rapid deglaciation V − ⟨V⟩ < 0, α sits above equilibrium and relaxes for ~τ —
 * today's −0.35 ms/cy non-tidal drift is that tail. τ was MEASURED against the
 * historical ΔT record through the joint fitter (optimum 5–6 kyr, the degree-2
 * Maxwell estimate; the plan 06 record).
 *
 * V(t) = Σ_r w_r(t)·L1′_r(t) + B(t)  (plan 26), where
 *   - L1′_r is regime r's fitted L1 line set (its own fit window of the LR04 record:
 *     post-MPT 0–1 Ma, iNHG–MPT 1–2.7 Ma, pre-iNHG 2.7–5.3 Ma), lagged by τ (each
 *     line Ĉ′ = Ĉ·iωτ/(1+iωτ), so the evaluator stays a sinusoid sum), with the
 *     405-kyr line left out of the ice proxy (not ice: the sea-level ratio there is
 *     24 m/‰); w_r is a C¹ window on the regime's fit window with smoothstep joins
 *     of ±joinHalfKyr at the regime boundaries — a fitted line set is NEVER
 *     extrapolated beyond its window (measured: the post-MPT set is a degenerate
 *     cluster outside it, R² −26, amplitude 3× the record, and the former channel
 *     oscillated at ±7e-4 at random phase for the whole deep past; plan 26 §2M.1).
 *     Beyond the last window the orbital part is zero (no proxy, no claim).
 *   - B(t) is the ice BASELINE relative to today, in metres of sea-level equivalent
 *     from the cited inventory (Greenland's 7.4 m absent before the NH glaciation,
 *     the whole 65 m absent before the Antarctic glaciation; astro-reference
 *     giaIceInventory), converted to ‰ by the LGM-to-present swing of the post-MPT
 *     lagged response (its range over the last 800 kyr ↔ the 120-m LGM drop) — the
 *     same response per unit of ice the J2000 rates normalise. Less ice → lighter
 *     δ¹⁸O → V < 0 → α and J₂ ABOVE their present values (polar mass moved into the
 *     oceans raises C and J₂): the ice-free Earth sits at +1.7·10⁻⁴ of J₂/J₂₀.
 *
 * The single-regime form (l1Terms + yStdDenormalization, no windows, no baseline)
 * is the pre-plan-26 channel and stays available (the research twins).
 *
 * @param {{
 *   l1Terms?: Array<{period_kyr: number, a: number, b: number}>,
 *   yStdDenormalization?: number,
 *   regimes?: Array<{ l1Terms: Array<{period_kyr: number, a: number, b: number}>, yStdDenormalization: number, windowKyr: [number, number] }>,
 *   joinHalfKyr?: number,
 *   excludePeriodsAboveKyr?: number,
 *   iceInventory?: { lgmSeaLevelDropM: number, presentIceSeaLevelM: number, greenlandSeaLevelM: number, nhGlaciationOnsetMa: number, nhGlaciationWidthMyr: number, eotMa: number, eotWidthMyr: number },
 *   relaxationKyr: number,
 *   alphaGiaRateJ2000PerYr: number,
 *   alphaJ2000: number,
 *   j2RateJ2000PerYr?: number,
 *   j2J2000?: number,
 * }} cfg - relaxationKyr, alphaGiaRateJ2000PerYr and j2RateJ2000PerYr are the
 *   assembled deepTime block (DEFAULT_CONSTANTS.deepTime: τ the banked record
 *   data/deep-time-fitted.json, the rates derived from astro-reference
 *   giaCoxChaoPeltier — plan 11 step 1); alphaJ2000 the IERS moment-of-inertia
 *   factor; j2J2000 Earth's J₂ (astro-reference). `regimes` ordered young → old
 *   (the first holds J2000 and sets the normalisation); `iceInventory` the
 *   deepTime.iceInventory block (astro-reference giaIceInventory).
 * @returns {{
 *   alphaAt: (year: number) => number,
 *   j2RatioAt: (year: number) => number,
 *   laggedL1PermilAt: (year: number) => number,
 *   iceBaselinePermilAt: (year: number) => number,
 *   kPerPermille: number,
 *   relaxationKyr: number,
 *   laggedL1Terms: Array<{period_kyr: number, a: number, b: number}>,
 *   glacialSwingPermil: number,
 * }}
 *
 * THE SAME REDISTRIBUTION, ITS SECOND OBSERVABLE — j2RatioAt(year) = J₂(t)/J₂₀.
 * The mass that changes the polar moment changes the oblateness, and the
 * luni-solar precession rate is proportional to it (ψ̇ ∝ (C − A)/C; the
 * consumer is the spin integration, earth/deep-orbital-history). The J₂ side
 * is scaled on its OWN observation, exactly as the α side is on its rate:
 *
 *   J₂(t) = J₂₀ − k_J · [ V(t) − V(2000) ],   k_J = −(dJ₂/dt)_obs / (dV/dt)₂₀₀₀
 *
 * so dJ₂/dt(J2000) IS the observed satellite rate (Cox & Chao 2002) by
 * construction. A constant dJ₂/dt would be a rate valid at a point used
 * across a span; this is the history. Inside the Quaternary the ratio is
 * bounded, ±3·10⁻⁴ over the glacial cycles; beyond the record it is the
 * baseline's constant. Without the two constants the ratio is 1 at every year.
 */
function createAlphaGiaChannel({ l1Terms, yStdDenormalization, regimes, joinHalfKyr = 50, excludePeriodsAboveKyr, iceInventory, relaxationKyr, alphaGiaRateJ2000PerYr, alphaJ2000, j2RateJ2000PerYr, j2J2000 }) {
  // ── the regimes: one (the pre-plan-26 form) or the windowed set ──
  const keep = (/** @type {{period_kyr: number}} */ c) => excludePeriodsAboveKyr === undefined || c.period_kyr <= excludePeriodsAboveKyr;
  const set = regimes && regimes.length
    ? regimes.map((r) => ({ l1Terms: laggedL1Terms(r.l1Terms.filter(keep), relaxationKyr), yStdDenormalization: r.yStdDenormalization, windowKyr: r.windowKyr }))
    : [{ l1Terms: laggedL1Terms(/** @type {Array<{period_kyr: number, a: number, b: number}>} */ (l1Terms).filter(keep), relaxationKyr), yStdDenormalization: /** @type {number} */ (yStdDenormalization), windowKyr: /** @type {[number, number] | null} */ (null) }];
  const first = set[0];
  // dV/dyear at J2000 in closed form on the J2000 regime: with t = (2000 − year)/1000,
  // d/dyear Σ[a cos ωt + b sin ωt] = −(1/1000)·Σ ω(−a sin ωt + b cos ωt) → at t = 0: −(1/1000)·Σ ω b
  let sum = 0;
  for (const c of first.l1Terms) sum += ((2 * Math.PI) / c.period_kyr) * c.b;
  const slopeJ2000PermillePerYr = (-sum / 1000) * first.yStdDenormalization;
  const kPerPermille = -alphaGiaRateJ2000PerYr / slopeJ2000PermillePerYr;   // dα/dt = −k · dV/dt
  const hasJ2 = j2RateJ2000PerYr !== undefined && j2J2000 !== undefined;
  // (k_J / J₂₀) per ‰ — the relative oblateness coupling, from the observed dJ₂/dt
  const j2RelPerPermille = hasJ2 ? (-j2RateJ2000PerYr / slopeJ2000PermillePerYr) / j2J2000 : 0;

  // ── the orbital part: each regime inside its own window, C¹ joins, zero beyond the last ──
  /** The window weight of regime i at an age (kyr BP): 1 inside, smoothstep over ±joinHalfKyr at a shared
   *  boundary (the neighbour's weight is the complement, so the two sum to 1), and 0 beyond the last window's far
   *  edge after a one-sided fade of joinHalfKyr·2. @param {number} i @param {number} ageKyr */
  const weight = (i, ageKyr) => {
    const w = set[i].windowKyr;
    if (!w) return 1;
    const [lo, hi] = w;
    let v = 1;
    if (i > 0) v *= smoothstep((ageKyr - lo + joinHalfKyr) / (2 * joinHalfKyr));            // fades in across the young boundary
    if (i < set.length - 1) v *= 1 - smoothstep((ageKyr - hi + joinHalfKyr) / (2 * joinHalfKyr));   // fades out across the old boundary
    else v *= 1 - smoothstep((ageKyr - hi) / (2 * joinHalfKyr));                                  // the last window: one-sided fade to zero beyond it
    return v;
  };
  // Each regime's line sum oscillates about ITS window's mean, and today sits near the glacial
  // minimum of the youngest one: where no regime applies (beyond the record, and in proportion
  // across the fades) the ice state is TODAY'S — the J2000 value of the youngest regime — so
  // that the deep baseline is "today's ice minus what was absent", not "the Quaternary mean
  // minus it" (the first draft read the Antarctic-only era as MORE ice than today).
  const todayPermil = evalClimateL1OrbitalPermil(2000, first);
  /** @param {number} year @returns {number} the orbital ice response in ‰ (today's level where no regime applies) */
  const orbitalPermilAt = (year) => {
    const ageKyr = (2000 - year) / 1000;
    let v = 0, wSum = 0;
    for (let i = 0; i < set.length; i++) { const w = weight(i, ageKyr); if (w > 0) { v += w * evalClimateL1OrbitalPermil(year, set[i]); wSum += w; } }
    return v + (1 - wSum) * todayPermil;
  };

  // ── the baseline: the inventory in metres → ‰ through the post-MPT glacial swing ──
  let glacialSwingPermil = 0;
  /** @type {(year: number) => number} */
  let iceBaselinePermilAt = () => 0;
  if (iceInventory) {
    let lo = Infinity, hi = -Infinity;
    for (let kyr = 0; kyr <= 800; kyr += 1) { const v = evalClimateL1OrbitalPermil(2000 - kyr * 1000, first); if (v < lo) lo = v; if (v > hi) hi = v; }
    glacialSwingPermil = hi - lo;   // ↔ the LGM-to-present sea-level drop
    const permilPerMetre = glacialSwingPermil / iceInventory.lgmSeaLevelDropM;
    const nhM = iceInventory.greenlandSeaLevelM, antM = iceInventory.presentIceSeaLevelM - iceInventory.greenlandSeaLevelM;
    const { nhGlaciationOnsetMa: nh0, nhGlaciationWidthMyr: nhW, eotMa: eot0, eotWidthMyr: eotW } = iceInventory;
    iceBaselinePermilAt = (year) => {
      const ageMa = (2000 - year) / 1e6;
      const sNh = smoothstep((ageMa - nh0) / nhW), sEot = smoothstep((ageMa - eot0) / eotW);
      return -permilPerMetre * (nhM * sNh + antM * sEot);   // less ice than today → lighter → negative
    };
  }

  const vAt = (/** @type {number} */ year) => orbitalPermilAt(year) + iceBaselinePermilAt(year);
  const vJ2000 = vAt(2000);
  return {
    alphaAt: (year) => alphaJ2000 - kPerPermille * (vAt(year) - vJ2000),
    j2RatioAt: hasJ2
      ? (year) => 1 - j2RelPerPermille * (vAt(year) - vJ2000)
      : () => 1,
    laggedL1PermilAt: orbitalPermilAt,
    iceBaselinePermilAt,
    kPerPermille,
    relaxationKyr,
    laggedL1Terms: first.l1Terms,
    glacialSwingPermil,
  };
}

module.exports = { evalClimateL1OrbitalPermil, laggedL1Terms, createAlphaGiaChannel };

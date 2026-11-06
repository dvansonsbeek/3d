/**
 * Deep-time LOD / ΔT core — THE shared implementation (Phase 8.4, slice 3).
 *
 * The angular-momentum-conservation LOD (Layer 1/2), the composed precession
 * rate, the mass-loss year chain, the Simpson ΔT integrator with the ecliptic
 * "missing motion" integrand, the corrected-LOD composite, and the dLOD/dt
 * driver decomposition (tidal / GIA / stack / resonator channels).
 *
 * INJECTED, by design:
 *  - moonDistanceMetresAtAge — the 8.2 moon month-chain (each engine's own
 *    factory wiring).
 *  - moiFactorAtAge — the L1-orbital-coupled GIA α(t). The α pin
 *    machinery (_withLatticeAlpha) is ENGINE STATE and stays there.
 *  - cycleLodSumAt / swingLodAt / swingLodRateAt — the engine-GATED
 *    cycle-stack sums (flags are engine dispatch).
 *
 * The ΔT CACHE and the post-integration correction adds stay engine-side:
 * both engines key the cache on their flag state (the browser's flags are
 * runtime-mutable UI toggles), and the corrections are added SEQUENTIALLY
 * onto the integral — pre-summing them here would change the FP
 * association, so deltaTRawSecondsAtAge returns the raw integral and each
 * engine keeps its exact add order.
 *
 * Year anchor: every year-of-age conversion here is 2000 − t_Ma·1e6 — the
 * convention of the ΔT integrand and the Node engine throughout. 8.4-1
 * S-D3/S-D5: the browser's WithCorrections and decomposition historically
 * used startmodelYear (2000.5), a half-year phase offset — aligned with
 * measured fixture re-records.
 */

'use strict';

const { createComposedPrecession } = require('../earth/precession-composed.cjs');
const { SECONDS_PER_JULIAN_YEAR } = require('../constants/units.cjs');

/**
 * @typedef {Object} DeepTimeLodConstants
 * @property {number} lTotalEmKgm2S - Earth–Moon total angular momentum
 * @property {number} mMoonAloneKg
 * @property {number} mEarthAloneKg
 * @property {number} rEarthMetres
 * @property {number} gmEmM3PerS2 - GM of the Earth–Moon system
 * @property {number} eFactorMoon - √(1−e²) factor of the lunar orbit
 * @property {number} aLockMetres - tidal-lock distance (LOD denominator → 0)
 * @property {number} aMoonNowMetres - Farhat polynomial anchor
 * @property {number} alpha1PerMa - the LLR recession rate (the J2000 slope of the cited history)
 * @property {number} lodNowH13Seconds - ω₀, the J2000 day length (the SI day; identifier kept)
 * @property {number} meanSiderealYearJ2000Seconds
 * @property {number} solarMassLossFracPerYear
 * @property {number} precessionSolarShareJ2000 - f_S, the solar fraction of the J2000
 *   precession torque (derive-params) — the composed precession rate needs it
 */

/**
 * @typedef {Object} DeepTimeLodDeps
 * @property {DeepTimeLodConstants} constants
 * @property {(tMa: number) => number|null} moonDistanceMetresAtAge - null beyond the cited history's span
 * @property {(tMa: number) => number} moiFactorAtAge - GIA α(t)
 * @property {(year: number) => number} cycleLodSumAt - gated δLOD sum (incl. swing)
 * @property {(year: number) => number} swingLodAt - gated swing δLOD alone
 * @property {(year: number) => number} swingLodRateAt - gated analytic swing rate
 * @property {() => number} precessionPeriodJ2000YearsFn - the model's J2000 axial
 *   precession period, 1,296,000/p_A = 25,771.575 yr (the IAU 2006 general
 *   precession; the same anchor the hybrid obliquity self-anchors on). Read
 *   LAZILY on the first composed-rate use, never at construction: every
 *   runtime's year laws read THIS factory's bases.
 * @property {() => number} nodalPeriodYearsFn - the period of Earth's orbit
 *   plane's nodal regression on the invariable plane, 1,296,000/|s₃| with s₃
 *   the dominant ζ mode of the banked deep secular modes (≈ 68,751 yr). An
 *   ORBITAL quantity (μ-tier: it does not follow Earth's spin), the reference
 *   the solar day's "ecliptic missing motion" term rides. Lazy, like the
 *   precession anchor.
 * @property {(tMa: number) => number} [lEmAtAgeKgm2S] - OPTIONAL time-dependent
 *   Earth-Moon angular momentum. Absent → the J2000 constant: conservation
 *   (measured: conservation on the cited history reproduces Farhat's own LOD
 *   to 0.01 h at 100 Ma, 0.14 h at 2.46 Ga).
 * @property {(tMa: number) => number|null} [moonDistanceSlopeMetresPerMaAtAge] -
 *   OPTIONAL analytic slope of the distance history (metres per Ma, positive
 *   into the past means a growing a... sign as da/dt_Ma); absent → a central
 *   difference on moonDistanceMetresAtAge (the LOD-rate decomposition's tidal term).
 * @property {(tMa: number) => number|null} [meanObliquityCosRatioAtAge] -
 *   OPTIONAL cos ε̄(t)/cos ε̄(0) of the cited mean obliquity (earth/mean-
 *   obliquity-history) — the factor the precession RATE of date carries on the
 *   constant; absent → 1, the constant alone, bit-identical.
 */

/** @param {DeepTimeLodDeps} deps */
function createDeepTimeLod(deps) {
  const K = deps.constants;
  const lEmAt = deps.lEmAtAgeKgm2S ?? (() => K.lTotalEmKgm2S);

  /** Layer 1/2 mean LOD: LOD = 2π·I(t) / (L_EM(t) − L_moon(t)).
   * @param {number} t_Ma @returns {number|null} seconds, null past tidal lock */
  function lodSecondsAtAge(t_Ma) {
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a === null || a <= 0 || a >= K.aLockMetres) return null;
    return (2 * Math.PI * (deps.moiFactorAtAge(t_Ma) * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres)) /
           (lEmAt(t_Ma) - K.mMoonAloneKg * Math.sqrt(K.gmEmM3PerS2 * a) * K.eFactorMoon);
  }

  /** Same LOD with an EXPLICIT α (the browser's "α at climate mean" curve).
   * @param {number} t_Ma @param {number} alpha @returns {number|null} */
  function lodSecondsAtAgeWithAlpha(t_Ma, alpha) {
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a === null || a <= 0 || a >= K.aLockMetres) return null;
    const iEarth = alpha * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres;
    return (2 * Math.PI * iEarth) /
           (lEmAt(t_Ma) - K.mMoonAloneKg * Math.sqrt(K.gmEmM3PerS2 * a) * K.eFactorMoon);
  }

  /** @param {number} t_Ma @returns {number|null} */
  function lodHoursAtAge(t_Ma) {
    const s = lodSecondsAtAge(t_Ma);
    return (s === null) ? null : s / 3600;
  }

  // The composed lunisolar precession: the CONSTANT's scaling
  // [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] and the RATE of date, that ×
  // cos ε̄(t)/cos ε̄(0) on the cited mean obliquity; p₀ the model's J2000 rate
  // 1,296,000/axial0 (the IAU 2006 general precession). ONE formula home:
  // earth/precession-composed, built here on this factory's own LOD, recession
  // and obliquity histories; the anchor resolves lazily on the first rate use.
  const composed = createComposedPrecession({
    p0ArcsecPerYr: () => 1296000 / deps.precessionPeriodJ2000YearsFn(),
    solarShare: K.precessionSolarShareJ2000,
    lodSecondsAtAge,
    lodJ2000Seconds: K.lodNowH13Seconds,
    moonDistanceMetresAtAge: deps.moonDistanceMetresAtAge,
    moonDistanceJ2000Metres: K.aMoonNowMetres,
    yearToTMa: /** @param {number} year */ (year) => (2000 - year) / 1e6,
    meanObliquityCosRatioAtAge: deps.meanObliquityCosRatioAtAge,
  });

  /** THE PRECESSION RATE OF DATE ψ̇(t), ″/yr — the constant's scaling
   * p₀·[ω/ω₀]·[f_S + (1 − f_S)(a₀/a_M)³] × cos ε̄(t)/cos ε̄(0), ε̄ the cited mean
   * obliquity (its factor is 2.5 % of the rate at 2.46 Ga, 2e-7 at 10 kyr);
   * p₀ the J2000 anchor.
   * @param {number} t_Ma @returns {number|null} */
  function lunisolarPrecessionRateArcsecPerYrAtAge(t_Ma) {
    return composed.composedRateArcsecPerYrAtAge(t_Ma);
  }

  /** The mean lunisolar precession period T_p(t), years — 1,296,000/ψ̇(t) on
   * the rate of date; 25,771.6 at J2000 (the model's one J2000 precession
   * reading, S5). THE published deep-time clock.
   * @param {number} t_Ma @returns {number|null} */
  function lunisolarPrecessionPeriodYearsAtAge(t_Ma) {
    return composed.composedPeriodYearsAtAge(t_Ma);
  }

  /** THE PRECESSION CONSTANT OF DATE as a rate on the J2000 obliquity, ″/yr —
   * the spin and torque scaling alone, α(t)·cos ε̄₀. The hybrid obliquity
   * integration takes this one: its own ŝ·n̂ carries the cosine.
   * @param {number} t_Ma @returns {number|null} */
  function lunisolarTorqueRateArcsecPerYrAtAge(t_Ma) {
    return composed.torqueRateArcsecPerYrAtAge(t_Ma);
  }
  /** 1,296,000/the torque rate, years. @param {number} t_Ma @returns {number|null} */
  function lunisolarTorquePeriodYearsAtAge(t_Ma) {
    return composed.torquePeriodYearsAtAge(t_Ma);
  }
  /** cos ε̄(t)/cos ε̄(0) — the rate's obliquity factor (1 at J2000; 1 when no
   * history is injected). @param {number} t_Ma @returns {number|null} */
  function precessionObliquityFactorAtAge(t_Ma) {
    return composed.obliquityFactorAtAge(t_Ma);
  }

  /** Sidereal year seconds (Kepler under linear mass loss, dT/T = −2 dM/M).
   * @param {number} t_Ma @returns {number} */
  function siderealYearSecondsAtAge(t_Ma) {
    if (t_Ma === 0) return K.meanSiderealYearJ2000Seconds;
    const mass_loss_fraction = K.solarMassLossFracPerYear * t_Ma * 1e6;
    // Exact Kepler under the model's mass-history convention (a·M = const,
    // a(t) = a₀·(1−Δm)): T ∝ M⁻² ⇒ T(t) = T₀·(1−Δm)² — the SAME Driver-2
    // law the planet chains use (orbit-chain driver2PeriodSecondsAtAge).
    // The previous (1 − 2Δm) was this law's first-order Taylor — the one
    // form in the model inconsistent with it.
    return K.meanSiderealYearJ2000Seconds * (1 - mass_loss_fraction) * (1 - mass_loss_fraction);
  }

  /** Tropical year of date, seconds — the sidereal year less the equinox's
   * own motion over one year: one turn per the composed lunisolar precession
   * period T_p(t), 1/T_trop = 1/T_sid + ψ̇(t)/(1,296,000″ · Julian-year s),
   * ψ̇(t) the RATE of date (with the cited mean obliquity's cosine). The deep
   * JD↔year calendar integrates THIS. The SAME operations as layer0's
   * tropicalYearSecondsCore (the layer0 gate holds the twins bit-identical).
   * Past the tidal chain's domain the J2000 rate stands in.
   * @param {number} t_Ma @returns {number} */
  function tropicalYearSecondsAtAge(t_Ma) {
    return tropicalYearSecondsFromLod(t_Ma, lodSecondsAtAge(t_Ma));
  }
  /** @param {number} t_Ma @param {number|null} LOD_s @returns {number} */
  function tropicalYearSecondsFromLod(t_Ma, LOD_s) {
    const sidSec = siderealYearSecondsAtAge(t_Ma);
    const term = composed.torqueTermAtAge(t_Ma);
    const p0 = composed.p0ArcsecPerYr;
    const f = composed.obliquityFactorAtAge(t_Ma);
    const rate = (LOD_s === null || !(LOD_s > 0) || term === null || f === null) ? p0 : (K.lodNowH13Seconds / LOD_s) * p0 * term * f;
    return 1 / (1 / sidSec + rate / (1296000 * 365.25 * 86400));
  }

  /** @param {number} t_Ma @returns {number|null} */
  function tropicalYearDaysAtAge(t_Ma) {
    const seconds = tropicalYearSecondsAtAge(t_Ma);
    return seconds === null ? null : seconds / 86400;
  }

  /** @param {number} t_Ma @returns {number|null} tropical seconds / LOD(t) */
  function yearInDaysAtAge(t_Ma) {
    // the SOLAR day of date (the kinematic mean LOD plus the ecliptic missing-motion term): the
    // day the UT clock counts — the same day the ΔT integral divides by (doc 111 §1.36)
    const day = solarDaySecondsAtAge(t_Ma);
    if (day === null) return null;
    return tropicalYearSecondsAtAge(t_Ma) / day;
  }

  /**
   * The mean SOLAR day of date, seconds: the kinematic mean LOD plus the ecliptic
   * missing-motion term below — the day the UT clock counts. ONE home: the days per
   * year of date (the position tables' integrand) and the ΔT integral both divide by
   * THIS day; the former ΔT integrand divided by 86,400 (SI days per year), 0.02 % low
   * at 1 Ma, 7 % at 400 Ma, 26 % at 2 Ga, 42 % at the Earth–Moon genesis (doc 111 §1.36).
   * @param {number} t_Ma @returns {number|null} seconds (null past tidal lock)
   */
  function solarDaySecondsAtAge(t_Ma) {
    const lodMean = lodSecondsAtAge(t_Ma);
    if (lodMean === null) return null;
    const corr = eclipticLodCorrectionSecondsAtAge(t_Ma);
    if (corr === null) return null;
    return lodMean + corr;
  }

  /**
   * The solar day's "ecliptic missing motion" correction, seconds: the mean
   * solar day is counted against the Sun on the ECLIPTIC, whose plane turns
   * on the invariable plane once per nodal period T_s₃, so Earth rotates
   * 1/(T_s₃·mSY) of a turn more per solar day — δLOD = LOD_mean/(T_s₃·mSY)
   * (≈ 3.44 ms at J2000). T_s₃ is an orbital quantity: constant at every
   * epoch (μ-tier), so the term rides only LOD_mean and the year length at
   * deep time. ONE home for the three runtimes' `h5Correction` twins (the
   * identifier keeps its historical name; the divisor is the nodal period).
   * @param {number} t_Ma @returns {number|null} seconds (null past tidal lock)
   */
  function eclipticLodCorrectionSecondsAtAge(t_Ma) {
    const lodMean = lodSecondsAtAge(t_Ma);
    if (lodMean === null) return null;
    const mSY_days = tropicalYearDaysAtAge(t_Ma);
    if (mSY_days === null) return null;
    return lodMean / (deps.nodalPeriodYearsFn() * mSY_days);
  }

  /**
   * The raw ΔT integrand at an age: seconds of ΔT per Myr of TT. ΔT grows by (86,400 − LOD)
   * per SOLAR day, and a Myr of the AGE AXIS holds 1e6 · (seconds per year of that axis)/LOD
   * solar days — the UT clock counts solar days, never SI days (a former /86,400 read 0.02 %
   * low at 1 Ma, 7 % at 400 Ma, 26 % at 2 Ga, 42 % at the genesis: doc 111 §1.36). The age
   * axis is the ENGINE's: Julian years of TT from J2000 (`year = 2000 − t_Ma·1e6`, the bridge's
   * own `(jdTT − J2000)/365.25`), so its year is the JULIAN year. The tropical year of date in
   * that place counted solar days per tropical year on an axis of Julian years — low by
   * T_trop(date)/365.25: 2.14e-5 in the era (0.6 s of raw ΔT at −1000, 1.7 s at −3000), 4.4e-5
   * of the UT day at 1 Ga, 8.3 % of it at the genesis, where the UT clock's day read 5.98 h
   * against the history's 5.51 h (measured, plan 27 §8 J1). The day is the solar day of date: the
   * kinematic mean LOD plus the ecliptic "missing motion" — the solar day is measured against
   * the Sun on the ECLIPTIC, whose plane turns on the invariable plane at the nodal rate s₃
   * (period ≈ 68,751 yr, an orbital quantity), not in the inclination frame; ~3.4 ms at
   * J2000; the fitted cycle stack closes Layer-4 LOD_real onto the USNO anchor. Spelled from
   * the node's own lodMean and yearS — the same operations as eclipticLodCorrectionSecondsAtAge.
   * @param {number} tau @returns {number} s/Myr (NaN past tidal lock)
   */
  function deltaTRawIntegrandAtAge(tau) {
    const lodMean = lodSecondsAtAge(tau);
    if (lodMean === null) return NaN;
    const yearS = tropicalYearSecondsFromLod(tau, lodMean);   // the missing-motion term's year of date
    const lodH5Raw = lodMean + lodMean / (deps.nodalPeriodYearsFn() * (yearS / 86400));
    return (86400 - lodH5Raw) * SECONDS_PER_JULIAN_YEAR * 1e6 / lodH5Raw;
  }

  /** Simpson over [a, b] on the integrand with a midpoint (exact for a quadratic). @param {number} a @param {number} b @returns {number} */
  const simpsonCell = (a, b) => {
    const f0 = deltaTRawIntegrandAtAge(a), fm = deltaTRawIntegrandAtAge((a + b) / 2), f1 = deltaTRawIntegrandAtAge(b);
    return (f0 + 4 * fm + f1) * (b - a) / 6;
  };
  // The cumulative table of the raw integral, two tiers grown lazily outward from J2000 per
  // direction: 100-yr cells to ±1 Myr (the era's precision — the GIA channel's 20-kyr lines
  // modulate the integrand, and one 10-kyr Simpson cell read 341 s at −10 kyr, 1e-3 of ΔT),
  // 10-kyr cells beyond — prefix sums of per-cell Simpson (quadratic in the integrand per
  // cell), read in O(1) with a Simpson over the partial cell. The former per-call Simpson with
  // ≤ 1,024 nodes read 4e-5 (two days) at −1 Myr on 31-kyr nodes and 3e-6 at the genesis on
  // 4.3-Myr nodes, and cost 26 ms per uncached call at the edge — the UT→TT bridge's Newton
  // solve (phase/deep-calendar) calls this a dozen times per read.
  const DELTAT_FINE_CELL_MA = 1e-4, DELTAT_FINE_LIMIT_MA = 1, DELTAT_COARSE_CELL_MA = 0.01, DELTAT_SEGMENT_CELLS = 1000;
  const DELTAT_FINE_CELLS = Math.round(DELTAT_FINE_LIMIT_MA / DELTAT_FINE_CELL_MA);
  /** @typedef {{ fine: number[], coarse: number[] }} DeltaTTier the prefix sums at cell edges (index k = k cells from the tier's origin) */
  /** @type {{ past: DeltaTTier, future: DeltaTTier }} */
  const deltaTPrefix = { past: { fine: [0], coarse: [] }, future: { fine: [0], coarse: [] } };
  /** @param {number[]} P @param {number} dir @param {number} originMa @param {number} cellMa @param {number} cells */
  const growDeltaTPrefix = (P, dir, originMa, cellMa, cells) => {
    const target = Math.ceil((cells + 1) / DELTAT_SEGMENT_CELLS) * DELTAT_SEGMENT_CELLS;
    // a cell's far edge is the next cell's near edge — the SAME double (the same expression in
    // k), so its integrand is evaluated once: two evaluations per cell where simpsonCell takes
    // three, the same sum to the bit (a third of the table's build, on the first deep landing)
    let fEdge = P.length <= target ? deltaTRawIntegrandAtAge(dir * (originMa + (P.length - 1) * cellMa)) : NaN;
    for (let k = P.length; k <= target; k++) {
      const a = dir * (originMa + (k - 1) * cellMa), b = dir * (originMa + k * cellMa);
      const prev = P[k - 1];
      const fm = deltaTRawIntegrandAtAge((a + b) / 2), f1 = deltaTRawIntegrandAtAge(b);
      P.push(Number.isNaN(prev) ? NaN : prev + (fEdge + 4 * fm + f1) * (b - a) / 6);
      fEdge = f1;
    }
  };
  /**
   * RAW ΔT integral relative to J2000 (0 at t = 0 by convention) — the cumulative table above
   * plus the partial cell, WITHOUT the cycle corrections. The engines wrap this: flag-keyed
   * cache + their exact sequential post-integration adds (see the module header).
   * @param {number} t_Ma @returns {number} seconds (NaN past tidal lock)
   */
  function deltaTRawSecondsAtAge(t_Ma) {
    if (t_Ma === 0) return 0;
    if (!Number.isFinite(t_Ma)) return NaN;
    const dir = t_Ma > 0 ? 1 : -1, tier = dir > 0 ? deltaTPrefix.past : deltaTPrefix.future;
    const absT = Math.abs(t_Ma);
    if (absT <= DELTAT_FINE_LIMIT_MA) {
      const k = Math.floor(absT / DELTAT_FINE_CELL_MA);
      if (tier.fine.length <= k) growDeltaTPrefix(tier.fine, dir, 0, DELTAT_FINE_CELL_MA, Math.min(k, DELTAT_FINE_CELLS));
      const base = tier.fine[k];
      if (base === undefined || Number.isNaN(base)) return NaN;
      const edge = dir * k * DELTAT_FINE_CELL_MA;
      return edge === t_Ma ? base : base + simpsonCell(edge, t_Ma);
    }
    if (tier.coarse.length === 0) {
      if (tier.fine.length <= DELTAT_FINE_CELLS) growDeltaTPrefix(tier.fine, dir, 0, DELTAT_FINE_CELL_MA, DELTAT_FINE_CELLS);
      tier.coarse.push(tier.fine[DELTAT_FINE_CELLS]);   // the coarse tier's origin: the fine tier's end
    }
    const k = Math.floor((absT - DELTAT_FINE_LIMIT_MA) / DELTAT_COARSE_CELL_MA);
    if (tier.coarse.length <= k) growDeltaTPrefix(tier.coarse, dir, DELTAT_FINE_LIMIT_MA, DELTAT_COARSE_CELL_MA, k);
    const base = tier.coarse[k];
    if (base === undefined || Number.isNaN(base)) return NaN;
    const edge = dir * (DELTAT_FINE_LIMIT_MA + k * DELTAT_COARSE_CELL_MA);
    return edge === t_Ma ? base : base + simpsonCell(edge, t_Ma);
  }

  /** Layer 3/4 LOD: tidal mean + the gated cycle δLOD sum.
   * @param {number} t_Ma @returns {number|null} */
  function lodSecondsWithCorrectionsAtAge(t_Ma) {
    const tidal = lodSecondsAtAge(t_Ma);
    if (tidal === null) return null;
    const year = 2000 - t_Ma * 1e6;
    return tidal + deps.cycleLodSumAt(year);
  }

  /**
   * dLOD/dt driver decomposition, ms/century per channel.
   * tidal: Moon-recession (Farhat da/dt, LLR-anchored) · gia: α(t) numeric
   * derivative · stack: 50-yr central difference on the FLAGS-ONLY δLOD sum
   * (smooth; shortest harmonic 716 yr) · resonator: the ANALYTIC rate (the
   * episode's δLOD steps at the kicks — a central difference smears them).
   * @param {number} t_Ma
   * @returns {{ tidal: number|null, gia: number|null, stack: number|null,
   *   resonator: number|null, net_L2: number|null, net_L3: number|null,
   *   net_L4: number|null }}
   */
  function dLodDtDecompositionAtAge(t_Ma) {
    const nullResult = { tidal: null, gia: null, stack: null, resonator: null,
                         net_L2: null, net_L3: null, net_L4: null };
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a === null || a <= 0 || a >= K.aLockMetres) return nullResult;
    const lod_s = lodSecondsAtAge(t_Ma);
    if (lod_s === null) return nullResult;
    const alpha = deps.moiFactorAtAge(t_Ma);
    const I_E = alpha * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres;
    const year = 2000 - t_Ma * 1e6;

    // The cited history's slope: the engine's moonDistanceSlopeMetresPerMaAtAge
    // when it provides one (the Hermite's analytic derivative — C1, smooth),
    // else a ±1-kyr central difference on the distance itself. t_Ma > 0 =
    // past; forward-time sign flip. At J2000 the slope IS the LLR observation
    // (the history's boundary condition): +3.82 cm/yr ✓
    let slopePerMa = deps.moonDistanceSlopeMetresPerMaAtAge ? deps.moonDistanceSlopeMetresPerMaAtAge(t_Ma) : null;
    if (slopePerMa === null || slopePerMa === undefined) {
      const H_MA = 1e-3;
      const aPlus = deps.moonDistanceMetresAtAge(t_Ma + H_MA), aMinus = deps.moonDistanceMetresAtAge(t_Ma - H_MA);
      if (aPlus === null || aMinus === null) return nullResult;
      slopePerMa = (aPlus - aMinus) / (2 * H_MA);
    }
    const da_dt_yr = -slopePerMa / 1e6;
    const SEC_PER_YR = 365.25 * 86400;
    const da_dt_s = da_dt_yr / SEC_PER_YR;

    // Tidal channel: dL_M/dt = m_M · ½ · √(GM/a) · da/dt · √(1−e²)
    const dLm_dt = K.mMoonAloneKg * 0.5 * Math.sqrt(K.gmEmM3PerS2 / a) * da_dt_s * K.eFactorMoon;
    const domega_dt_tidal = -dLm_dt / I_E;
    const dLod_dt_tidal_s_per_s = -(lod_s * lod_s) / (2 * Math.PI) * domega_dt_tidal;
    const dLod_dt_tidal_ms_per_cy = dLod_dt_tidal_s_per_s * SEC_PER_YR * 100 * 1000;

    // GIA channel: dLOD/dt = LOD·(dα/dt)/α, α differentiated numerically
    // (100-yr step — well below any L1 harmonic period).
    const EPS_MA = 1e-4;
    const alpha_plus = deps.moiFactorAtAge(t_Ma - EPS_MA);
    const alpha_minus = deps.moiFactorAtAge(t_Ma + EPS_MA);
    const dalpha_dyr = (alpha_plus - alpha_minus) / (2 * EPS_MA * 1e6);
    const dLod_dt_gia_s_per_yr = lod_s * dalpha_dyr / alpha;
    const dLod_dt_gia_ms_per_cy = dLod_dt_gia_s_per_yr * 100 * 1000;

    // Flags-only stack rate (sum minus the resonator term), 50-yr window.
    const DYR = 50;
    const dFlags_dyr = ((deps.cycleLodSumAt(year + DYR) - deps.swingLodAt(year + DYR))
                      - (deps.cycleLodSumAt(year - DYR) - deps.swingLodAt(year - DYR)))
                      / (2 * DYR);
    const dLod_dt_stack_only_ms_per_cy = dFlags_dyr * 100 * 1000;
    const dLod_dt_resonator_ms_per_cy = deps.swingLodRateAt(year) * 100 * 1000;

    const net_L2 = dLod_dt_tidal_ms_per_cy + dLod_dt_gia_ms_per_cy;
    const net_L3 = net_L2 + dLod_dt_stack_only_ms_per_cy;
    const net_L4 = net_L3 + dLod_dt_resonator_ms_per_cy;

    return {
      tidal: dLod_dt_tidal_ms_per_cy,
      gia: dLod_dt_gia_ms_per_cy,
      stack: dLod_dt_stack_only_ms_per_cy,
      resonator: dLod_dt_resonator_ms_per_cy,
      net_L2, net_L3, net_L4,
    };
  }

  return {
    lodSecondsAtAge, lodSecondsAtAgeWithAlpha, lodHoursAtAge,
    lunisolarPrecessionRateArcsecPerYrAtAge, lunisolarPrecessionPeriodYearsAtAge,
    // the constant's scaling alone (the hybrid's integrand) and the rate's obliquity factor
    lunisolarTorqueRateArcsecPerYrAtAge, lunisolarTorquePeriodYearsAtAge, precessionObliquityFactorAtAge,
    // the composition's terms (the lunisolar surface): (a₀/a_M)³ and f_S + (1 − f_S)(a₀/a_M)³
    lunarTorqueFactorAtAge: composed.lunarTorqueFactorAtAge,
    precessionTorqueTermAtAge: composed.torqueTermAtAge,
    siderealYearSecondsAtAge, tropicalYearSecondsAtAge, tropicalYearDaysAtAge,
    // the same law on a caller-supplied LOD (the browser's L1-α sensitivity sweep)
    tropicalYearSecondsFromLod,
    // the solar day's ecliptic missing-motion term on the nodal period (one home)
    eclipticLodCorrectionSecondsAtAge, solarDaySecondsAtAge,
    yearInDaysAtAge, deltaTRawSecondsAtAge, lodSecondsWithCorrectionsAtAge,
    dLodDtDecompositionAtAge,
  };
}

module.exports = { createDeepTimeLod };

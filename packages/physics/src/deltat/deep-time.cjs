/**
 * Deep-time LOD / ΔT core — THE shared implementation (Phase 8.4, slice 3).
 *
 * The angular-momentum-conservation LOD (Layer 1/2), the H(t) identity, the
 * mass-loss year chain, the Simpson ΔT integrator with the H/5 ecliptic
 * "missing motion" integrand, the corrected-LOD composite, the Actual-LOD
 * Fourier ripple, and the dLOD/dt driver decomposition (tidal / GIA /
 * stack / resonator channels).
 *
 * INJECTED, by design:
 *  - moonDistanceMetresAtAge — the 8.2 moon month-chain (each engine's own
 *    factory wiring).
 *  - moiFactorAtAge — the L1-orbital-coupled GIA α(t). The lattice-α pin
 *    machinery (_withLatticeAlpha) is ENGINE STATE and stays there.
 *  - siderealYearDaysFourierAt — the IAU-base integrated-phase Fourier
 *    evaluator (Phase D matched pair). 8.4-1 S-D2: the browser's old Actual
 *    divided by its epoch-aware f(Y) evaluator instead, double-counting the
 *    deep-time drift already in mean(t) — 12% wrong at −400 Ma. Both engines
 *    now inject the ripple-form evaluator.
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
 * @property {number} alpha1PerMa @property {number} alpha3PerMa3
 * @property {number} alpha4PerMa4
 * @property {number} holisticYearJ2000
 * @property {number} lodNowH13Seconds - the H/13-identity mean LOD at J2000
 * @property {number} meanSiderealYearJ2000Seconds
 * @property {number} solarMassLossFracPerYear
 * @property {number} siderealYearDaysKinematicJ2000 - Actual-LOD numerator
 */

/**
 * @typedef {Object} DeepTimeLodDeps
 * @property {DeepTimeLodConstants} constants
 * @property {(tMa: number) => number} moonDistanceMetresAtAge
 * @property {(tMa: number) => number} moiFactorAtAge - GIA α(t)
 * @property {(year: number) => number} siderealYearDaysFourierAt
 * @property {(year: number) => number} cycleLodSumAt - gated δLOD sum (incl. swing)
 * @property {(year: number) => number} swingLodAt - gated swing δLOD alone
 * @property {(year: number) => number} swingLodRateAt - gated analytic swing rate
 */

/** @param {DeepTimeLodDeps} deps */
function createDeepTimeLod(deps) {
  const K = deps.constants;

  /** Layer 1/2 mean LOD: LOD = 2π·I(t) / (L_total − L_moon(t)).
   * @param {number} t_Ma @returns {number|null} seconds, null past tidal lock */
  function lodSecondsAtAge(t_Ma) {
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a <= 0 || a >= K.aLockMetres) return null;
    return (2 * Math.PI * (deps.moiFactorAtAge(t_Ma) * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres)) /
           (K.lTotalEmKgm2S - K.mMoonAloneKg * Math.sqrt(K.gmEmM3PerS2 * a) * K.eFactorMoon);
  }

  /** Same LOD with an EXPLICIT α (the browser's "α at climate mean" curve).
   * @param {number} t_Ma @param {number} alpha @returns {number|null} */
  function lodSecondsAtAgeWithAlpha(t_Ma, alpha) {
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a <= 0 || a >= K.aLockMetres) return null;
    const iEarth = alpha * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres;
    return (2 * Math.PI * iEarth) /
           (K.lTotalEmKgm2S - K.mMoonAloneKg * Math.sqrt(K.gmEmM3PerS2 * a) * K.eFactorMoon);
  }

  /** @param {number} t_Ma @returns {number|null} */
  function lodHoursAtAge(t_Ma) {
    const s = lodSecondsAtAge(t_Ma);
    return (s === null) ? null : s / 3600;
  }

  /** H(t) via the H/13 identity: H(t) = H_J2000 · LOD(t)/LOD_J2000.
   * @param {number} t_Ma @returns {number|null} */
  function hAtAge(t_Ma) {
    const LOD_s = lodSecondsAtAge(t_Ma);
    if (LOD_s === null) return null;
    return K.holisticYearJ2000 * LOD_s / K.lodNowH13Seconds;
  }

  /** Sidereal year seconds (Kepler under linear mass loss, dT/T = −2 dM/M).
   * @param {number} t_Ma @returns {number} */
  function siderealYearSecondsAtAge(t_Ma) {
    if (t_Ma === 0) return K.meanSiderealYearJ2000Seconds;
    const mass_loss_fraction = K.solarMassLossFracPerYear * t_Ma * 1e6;
    return K.meanSiderealYearJ2000Seconds * (1 - 2 * mass_loss_fraction);
  }

  /** @param {number} t_Ma @returns {number} tropical = sidereal · (1 − 13/H(t)) */
  function tropicalYearSecondsAtAge(t_Ma) {
    const sidSec = siderealYearSecondsAtAge(t_Ma);
    const Ht = hAtAge(t_Ma);
    if (Ht === null) return sidSec * (1 - 13 / K.holisticYearJ2000);
    return sidSec * (1 - 13 / Ht);
  }

  /** @param {number} t_Ma @returns {number|null} */
  function tropicalYearDaysAtAge(t_Ma) {
    const seconds = tropicalYearSecondsAtAge(t_Ma);
    return seconds === null ? null : seconds / 86400;
  }

  /** @param {number} t_Ma @returns {number|null} tropical seconds / LOD(t) */
  function yearInDaysAtAge(t_Ma) {
    const LOD_s = lodSecondsAtAge(t_Ma);
    if (LOD_s === null) return null;
    return tropicalYearSecondsAtAge(t_Ma) / LOD_s;
  }

  /**
   * RAW ΔT integral relative to J2000 (0 at t=0 by convention) — Simpson
   * over the H/5-raw kinematic LOD, WITHOUT the cycle corrections and
   * WITHOUT a cache. The engines wrap this: flag-keyed cache + their exact
   * sequential post-integration adds (see the module header).
   * @param {number} t_Ma @returns {number} seconds (NaN past tidal lock)
   */
  function deltaTRawSecondsAtAge(t_Ma) {
    if (t_Ma === 0) return 0;
    const absSpan = Math.abs(t_Ma);
    let n = Math.max(32, Math.ceil(absSpan * 10));
    if (n > 1024) n = 1024;
    if (n % 2 === 1) n++;
    const h = t_Ma / n;

    let sum = 0;
    for (let i = 0; i <= n; i++) {
      const tau = i * h;
      const lodMean = lodSecondsAtAge(tau);
      if (lodMean === null) return NaN;
      const yearS = tropicalYearSecondsAtAge(tau);
      // H/5 ecliptic "missing motion" — the solar day is measured against
      // the Sun on the ECLIPTIC (precesses at H/5), not the inclination
      // frame (H/3). Adds ~3.5 ms at J2000 (raw kinematic 86400.003 s); the
      // fitted cycle stack closes Layer-4 LOD_real onto the USNO anchor.
      // Non-null: both can only be null when lodSecondsAtAge(tau) is null,
      // which already returned NaN above — the checker can't see the chain.
      const H_local = /** @type {number} */ (hAtAge(tau));
      const mSY_days = /** @type {number} */ (tropicalYearDaysAtAge(tau));
      const lodH5Raw = lodMean + lodMean / ((H_local / 5) * mSY_days);
      const integrand = (86400 - lodH5Raw) * yearS * 1e6 / 86400;
      const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
      sum += w * integrand;
    }
    return (sum * h) / 3;
  }

  /** Layer 3/4 LOD: tidal mean + the gated cycle δLOD sum.
   * @param {number} t_Ma @returns {number|null} */
  function lodSecondsWithCorrectionsAtAge(t_Ma) {
    const tidal = lodSecondsAtAge(t_Ma);
    if (tidal === null) return null;
    const year = 2000 - t_Ma * 1e6;
    return tidal + deps.cycleLodSumAt(year);
  }

  /** ACTUAL LOD: tidal mean × Fourier ripple —
   *  actual(t) = mean(t) × Y_days_kinematic_J2000 / Y_days_fourier(year).
   *  Fixed bases (the ripple isolates year-to-year variation; the deep-time
   *  drift is already in mean(t)). @param {number} t_Ma @returns {number|null} */
  function lodSecondsActualAtAge(t_Ma) {
    const mean_t = lodSecondsAtAge(t_Ma);
    if (mean_t === null) return null;
    const year_at_t = 2000 - t_Ma * 1e6;
    const Y_days_fourier = deps.siderealYearDaysFourierAt(year_at_t);
    return mean_t * K.siderealYearDaysKinematicJ2000 / Y_days_fourier;
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

    // Farhat polynomial derivative: da/dyear = −A_now·(α₁ + 3α₃t² + 4α₄t³)/1e6
    // (t_Ma > 0 = past; forward-time sign flip). At J2000: +3.82 cm/yr (LLR) ✓
    const da_dt_yr = -K.aMoonNowMetres * (K.alpha1PerMa + 3 * K.alpha3PerMa3 * t_Ma * t_Ma
                   + 4 * K.alpha4PerMa4 * t_Ma * t_Ma * t_Ma) / 1e6;
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
    lodSecondsAtAge, lodSecondsAtAgeWithAlpha, lodHoursAtAge, hAtAge,
    siderealYearSecondsAtAge, tropicalYearSecondsAtAge, tropicalYearDaysAtAge,
    yearInDaysAtAge, deltaTRawSecondsAtAge, lodSecondsWithCorrectionsAtAge,
    lodSecondsActualAtAge, dLodDtDecompositionAtAge,
  };
}

module.exports = { createDeepTimeLod };

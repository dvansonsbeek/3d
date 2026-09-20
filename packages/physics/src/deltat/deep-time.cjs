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

const { createComposedPrecession } = require('../earth/precession-composed.cjs');

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
 * @property {number} precessionSolarShareJ2000 - f_S, the solar fraction of the J2000
 *   precession torque (derive-params) — the unit H(t) = 13·T_p,composed needs it
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
 * @property {() => number} precessionPeriodJ2000YearsFn - the model's DERIVED
 *   J2000 axial precession period: the certified year-length laws' beat at
 *   2000, sid/(sid − trop) ≈ 25,771.4 yr (plan 06 S5 — one J2000 precession
 *   reading; the same anchor the hybrid obliquity self-anchors on). Read
 *   LAZILY on the first composed-rate use, never at construction: every
 *   runtime's year laws read THIS factory's bases.
 * @property {() => number} nodalPeriodYearsFn - the period of Earth's orbit
 *   plane's nodal regression on the invariable plane, 1,296,000/|s₃| with s₃
 *   the dominant ζ mode of the banked deep secular modes (≈ 68,751 yr). An
 *   ORBITAL quantity (μ-tier: it does not follow Earth's spin), the reference
 *   the solar day's "ecliptic missing motion" term rides (plan 06 T2 item —
 *   formerly the spin unit's H/5, 67,063 yr, 2.5 % off and scaling with the
 *   spin at deep time). Lazy, like the precession anchor.
 * @property {(tMa: number) => number} [lEmAtAgeKgm2S] - OPTIONAL time-dependent
 *   Earth-Moon angular momentum (the Driver-1½ solar channels,
 *   recession-history.cjs). Absent → the J2000 constant, which the budget
 *   module equals exactly for t ≤ jointMa — the pure-twin convention.
 */

/** @param {DeepTimeLodDeps} deps */
function createDeepTimeLod(deps) {
  const K = deps.constants;
  const lEmAt = deps.lEmAtAgeKgm2S ?? (() => K.lTotalEmKgm2S);

  /** Layer 1/2 mean LOD: LOD = 2π·I(t) / (L_EM(t) − L_moon(t)).
   * @param {number} t_Ma @returns {number|null} seconds, null past tidal lock */
  function lodSecondsAtAge(t_Ma) {
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a <= 0 || a >= K.aLockMetres) return null;
    return (2 * Math.PI * (deps.moiFactorAtAge(t_Ma) * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres)) /
           (lEmAt(t_Ma) - K.mMoonAloneKg * Math.sqrt(K.gmEmM3PerS2 * a) * K.eFactorMoon);
  }

  /** Same LOD with an EXPLICIT α (the browser's "α at climate mean" curve).
   * @param {number} t_Ma @param {number} alpha @returns {number|null} */
  function lodSecondsAtAgeWithAlpha(t_Ma, alpha) {
    const a = deps.moonDistanceMetresAtAge(t_Ma);
    if (a <= 0 || a >= K.aLockMetres) return null;
    const iEarth = alpha * K.mEarthAloneKg * K.rEarthMetres * K.rEarthMetres;
    return (2 * Math.PI * iEarth) /
           (lEmAt(t_Ma) - K.mMoonAloneKg * Math.sqrt(K.gmEmM3PerS2 * a) * K.eFactorMoon);
  }

  /** @param {number} t_Ma @returns {number|null} */
  function lodHoursAtAge(t_Ma) {
    const s = lodSecondsAtAge(t_Ma);
    return (s === null) ? null : s / 3600;
  }

  /** The FROZEN ERA CLOCK's phase convention: H_era(t) = H_J2000 · LOD(t)/LOD_J2000
   * (pure spin scaling — the pre-Phase-3 "H/13 identity"). The frozen devices
   * (the cardinal era clock, the year-length comb family, the ∫dt/H phase
   * table) were fitted against THIS counter; it ships with their coefficients
   * as a named device constant (plan 06 D8: two named counters). It is NOT
   * the unit H(t) below.
   * @param {number} t_Ma @returns {number|null} */
  function eraClockHAtAge(t_Ma) {
    const LOD_s = lodSecondsAtAge(t_Ma);
    if (LOD_s === null) return null;
    return K.holisticYearJ2000 * LOD_s / K.lodNowH13Seconds;
  }

  // The composed lunisolar precession rate (plan 06 D6 → Phase 3 → S5):
  // ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³], p₀ the model's
  // DERIVED J2000 rate 1,296,000/axial0 (the certified year-length laws'
  // beat at 2000 ≈ 25,771.4 yr — NOT 1,296,000/(H₀/13) = 50.245 ″/yr, the
  // fit anchor's reading, 0.086 % slow; S5). ONE formula home:
  // earth/precession-composed, built here on this factory's own LOD and
  // recession history; the anchor resolves lazily on the first rate use.
  const composed = createComposedPrecession({
    p0ArcsecPerYr: () => 1296000 / deps.precessionPeriodJ2000YearsFn(),
    solarShare: K.precessionSolarShareJ2000,
    lodSecondsAtAge,
    lodJ2000Seconds: K.lodNowH13Seconds,
    moonDistanceMetresAtAge: deps.moonDistanceMetresAtAge,
    moonDistanceJ2000Metres: K.aMoonNowMetres,
    yearToTMa: /** @param {number} year */ (year) => (2000 - year) / 1e6,
  });

  /** The unit H(t) = H_era / [f_S + (1 − f_S)(a₀/a_M)³] — the internal unit
   * scales WITH the composed lunisolar precession period (H(t)/T_p(t) =
   * H₀/axial0 = 13.011 at every epoch) but is NOT 13 of them: H₀ was fitted
   * on the perihelion-of-date beat, and the "H = 13·T_p" claim is retired
   * (plan 06 S5; docs/retired-record.md). Spelled in the SAME operations as
   * layer0's holisticHCore so the layer0 gate holds the twins bit-identical.
   * ≡ H_era wherever (a₀/a_M)³ ≈ 1. Identifier kept (plan 06 P4).
   * @param {number} t_Ma @returns {number|null} */
  function hAtAge(t_Ma) {
    const hEra = eraClockHAtAge(t_Ma);
    const term = composed.torqueTermAtAge(t_Ma);
    return hEra === null || term === null ? null : hEra / term;
  }

  /** The composed lunisolar precession rate, ″/yr — p₀·[ω/ω₀]·[f_S + (1 − f_S)
   * (a₀/a_M)³] on the derived J2000 anchor (S5). ≡ 1,296,000·(H₀/axial0)/H(t).
   * @param {number} t_Ma @returns {number|null} */
  function lunisolarPrecessionRateArcsecPerYrAtAge(t_Ma) {
    return composed.composedRateArcsecPerYrAtAge(t_Ma);
  }

  /** The mean lunisolar precession period T_p(t), years — 1,296,000/ψ̇(t);
   * 25,771.4 at J2000 (the model's one J2000 precession reading, S5).
   * @param {number} t_Ma @returns {number|null} */
  function lunisolarPrecessionPeriodYearsAtAge(t_Ma) {
    return composed.composedPeriodYearsAtAge(t_Ma);
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
    // form in the model inconsistent with it, and the entire source of the
    // day-count invariant's 0.17 ppm residual: with the product form,
    // H·(days/yr)·(AU₀/AU)² = TOTAL_DAYS_IN_H holds EXACTLY
    // (tools/explore/deep-time-sensitivity.js §5; docs/99 §near-invariant).
    return K.meanSiderealYearJ2000Seconds * (1 - mass_loss_fraction) * (1 - mass_loss_fraction);
  }

  /** @param {number} t_Ma @returns {number} tropical = sidereal · (1 − 13/H(t)).
   * The 13/H(t) here is the unit's CALENDAR convention (one turn per H₀/13
   * of the unit — the kinematic day/year identities on H/(H − 13) and the
   * deep JD↔year calendar ride it), NOT a precession claim: the published
   * precession period is the composed T_p (S5), 0.086 % apart. Kept
   * unchanged in S5 so nothing certified moves (calendar, goldens, CSV);
   * plan-06 D2 DECIDED: relabel, not re-base — the 0.086 % is the fit
   * anchor's convention (H₀/T_p = 13.011, constant at every epoch beyond
   * ±2 Myr, measured), and re-basing would move every comb coefficient
   * for a rounding-level gain. This tier stays a named device. */
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

  // ── The frozen era clock's twins (device tier) ──────────────────────────
  // The same forms on H_era — the bases the frozen cardinal clock (its drift
  // integrand and real-LOD convention) and the year-length comb family were
  // fitted against. Bit-identical to the pre-Phase-3 tropicalYearSecondsAtAge /
  // yearInDaysAtAge; the physical (unit) forms above are what the model
  // publishes.
  /** @param {number} t_Ma @returns {number} */
  function eraClockTropicalYearSecondsAtAge(t_Ma) {
    const sidSec = siderealYearSecondsAtAge(t_Ma);
    const Ht = eraClockHAtAge(t_Ma);
    if (Ht === null) return sidSec * (1 - 13 / K.holisticYearJ2000);
    return sidSec * (1 - 13 / Ht);
  }
  /** @param {number} t_Ma @returns {number|null} */
  function eraClockYearInDaysAtAge(t_Ma) {
    const LOD_s = lodSecondsAtAge(t_Ma);
    if (LOD_s === null) return null;
    return eraClockTropicalYearSecondsAtAge(t_Ma) / LOD_s;
  }

  /**
   * The solar day's "ecliptic missing motion" correction, seconds: the mean
   * solar day is counted against the Sun on the ECLIPTIC, whose plane turns
   * on the invariable plane once per nodal period T_s₃, so Earth rotates
   * 1/(T_s₃·mSY) of a turn more per solar day — δLOD = LOD_mean/(T_s₃·mSY)
   * (≈ 3.44 ms at J2000). T_s₃ is an orbital quantity: constant at every
   * epoch (μ-tier), so the term rides only LOD_mean and the year length at
   * deep time. ONE home for the three runtimes' `h5Correction` twins (the
   * identifier keeps its name; the divisor is the nodal period since the
   * plan 06 T2 restatement, formerly the spin unit's H/5).
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
   * RAW ΔT integral relative to J2000 (0 at t=0 by convention) — Simpson
   * over the kinematic LOD plus the ecliptic missing-motion term, WITHOUT the
   * cycle corrections and WITHOUT a cache. The engines wrap this: flag-keyed
   * cache + their exact sequential post-integration adds (see the module header).
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
      // Ecliptic "missing motion" — the solar day is measured against the
      // Sun on the ECLIPTIC, whose plane turns on the invariable plane at the
      // nodal rate s₃ (period ≈ 68,751 yr, an orbital quantity), not in the
      // inclination frame. Adds ~3.4 ms at J2000; the fitted cycle stack
      // closes Layer-4 LOD_real onto the USNO anchor. Non-null: the helper
      // can only be null when lodSecondsAtAge(tau) is null, which already
      // returned NaN above — the checker can't see the chain.
      const lodH5Raw = lodMean + /** @type {number} */ (eclipticLodCorrectionSecondsAtAge(tau));
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
    lunisolarPrecessionRateArcsecPerYrAtAge, lunisolarPrecessionPeriodYearsAtAge,
    // the composition's terms (plan 06 Phase 3 S3, the lunisolar surface): (a₀/a_M)³ and f_S + (1 − f_S)(a₀/a_M)³
    lunarTorqueFactorAtAge: composed.lunarTorqueFactorAtAge,
    precessionTorqueTermAtAge: composed.torqueTermAtAge,
    siderealYearSecondsAtAge, tropicalYearSecondsAtAge, tropicalYearDaysAtAge,
    // the solar day's ecliptic missing-motion term on the nodal period (plan 06 T2 item; one home)
    eclipticLodCorrectionSecondsAtAge,
    yearInDaysAtAge, deltaTRawSecondsAtAge, lodSecondsWithCorrectionsAtAge,
    lodSecondsActualAtAge, dLodDtDecompositionAtAge,
    // the frozen era clock's named counter and bases (device tier, plan 06 D8)
    eraClockHAtAge, eraClockTropicalYearSecondsAtAge, eraClockYearInDaysAtAge,
  };
}

module.exports = { createDeepTimeLod };

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
 * @property {number} alpha1PerMa - the LLR recession rate (the J2000 slope of the cited history)
 * @property {number} lodNowH13Seconds - ω₀, the J2000 day length (the SI day since plan 09; identifier kept)
 * @property {number} meanSiderealYearJ2000Seconds
 * @property {number} solarMassLossFracPerYear
 * @property {number} precessionSolarShareJ2000 - f_S, the solar fraction of the J2000
 *   precession torque (derive-params) — the unit H(t) = 13·T_p,composed needs it
 */

/**
 * @typedef {Object} DeepTimeLodDeps
 * @property {DeepTimeLodConstants} constants
 * @property {(tMa: number) => number|null} moonDistanceMetresAtAge - null beyond the cited history's span
 * @property {(tMa: number) => number} moiFactorAtAge - GIA α(t)
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
 *   Earth-Moon angular momentum. Absent → the J2000 constant: conservation
 *   (plan 12 option A — the Driver-1½ solar-channel budget is deleted;
 *   measured: conservation on the cited history reproduces Farhat's own LOD
 *   to 0.01 h at 100 Ma, 0.14 h at 2.46 Ga).
 * @property {(tMa: number) => number|null} [moonDistanceSlopeMetresPerMaAtAge] -
 *   OPTIONAL analytic slope of the distance history (metres per Ma, positive
 *   into the past means a growing a... sign as da/dt_Ma); absent → a central
 *   difference on moonDistanceMetresAtAge (the LOD-rate decomposition's tidal term).
 * @property {(tMa: number) => number|null} [meanObliquityCosRatioAtAge] -
 *   OPTIONAL cos ε̄(t)/cos ε̄(0) of the cited mean obliquity (earth/mean-
 *   obliquity-history) — the factor the precession RATE of date carries on the
 *   constant (plan 12 §8 option (a)); absent → 1, the constant alone, bit-identical.
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

  // (Plan 09 step 7a deleted the FROZEN ERA CLOCK's public counter
  // `eraClockHAtAge` — H_era(t) = H₀·LOD(t)/LOD₀, plan 06 D8's second named
  // counter — with its year twins; step 7b deleted the unit itself, `hAtAge`
  // = H_era/[f_S + (1 − f_S)(a₀/a_M)³] — H(t) was 13.011 composed precession
  // periods, a fit constant's multiple of T_p(t), never a period of anything
  // the model computes. The physics it scaled is the composed precession
  // below: ψ̇(t) and T_p(t) = 1,296,000/ψ̇ are the published quantities.)
  // The `…FromLod` twins take an ALREADY-COMPUTED LOD(t): the Simpson ΔT
  // integrand below evaluated the LOD four times and the tropical year twice
  // per node through these helpers (measured 8.8 → 4.8 ms per cardinal panel
  // year with the model's ΔT memo). Same operations, same inputs — every
  // value bit-identical (11,958-value sweep, 0 differences).

  // The composed lunisolar precession (plan 06 D6 → Phase 3 → S5; plan 12 §8):
  // the CONSTANT's scaling [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] and the
  // RATE of date, that × cos ε̄(t)/cos ε̄(0) on the cited mean obliquity; p₀ the
  // model's J2000 rate 1,296,000/axial0 (the IAU 2006 general precession since
  // plan 09). ONE formula home: earth/precession-composed, built here on this
  // factory's own LOD, recession and obliquity histories; the anchor resolves
  // lazily on the first rate use.
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
   * obliquity (plan 12 §8 option (a); the chain held cos ε̄ at J2000 before —
   * 2.5 % of rate at 2.46 Ga, 2e-7 at 10 kyr). p₀ the J2000 anchor (S5).
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
    // form in the model inconsistent with it (measured on the retired day-count
    // identity of the era counter: with the product form the counter's
    // H_era·(days/yr)·(AU₀/AU)² held exactly — a tautology of spin scaling ∘
    // Kepler, deleted with the counter and the unit at plan 09 steps 7a/7b).
    return K.meanSiderealYearJ2000Seconds * (1 - mass_loss_fraction) * (1 - mass_loss_fraction);
  }

  /** Tropical year of date, seconds — the sidereal year less the equinox's
   * own motion over one year: one turn per the composed lunisolar precession
   * period T_p(t), 1/T_trop = 1/T_sid + ψ̇(t)/(1,296,000″ · Julian-year s),
   * ψ̇(t) the RATE of date (with the cited mean obliquity's cosine, plan 12 §8).
   * Plan 09 step 5d: it was the unit's calendar convention sid·(1 − 13/H(t))
   * — plan 06 D2 had kept it as a named device — 0.086 % slow on the equinox
   * term (1.0 s of year at J2000), and the deep JD↔year calendar integrates
   * THIS. The SAME operations as layer0's tropicalYearSecondsCore (the
   * layer0 gate holds the twins bit-identical). Past the tidal chain's domain
   * the J2000 rate stands in. @param {number} t_Ma @returns {number} */
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
    const LOD_s = lodSecondsAtAge(t_Ma);
    if (LOD_s === null) return null;
    return tropicalYearSecondsAtAge(t_Ma) / LOD_s;
  }

  // (Plan 09 step 7a: the frozen era clock's year twins on H_era —
  // T_sid·(1 − 13/H_era) and its day count, the bases the deleted cardinal
  // record and year-length combs were fitted against — are deleted.)

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
      const yearS = tropicalYearSecondsFromLod(tau, lodMean);
      // Ecliptic "missing motion" — the solar day is measured against the
      // Sun on the ECLIPTIC, whose plane turns on the invariable plane at the
      // nodal rate s₃ (period ≈ 68,751 yr, an orbital quantity), not in the
      // inclination frame. Adds ~3.4 ms at J2000; the fitted cycle stack
      // closes Layer-4 LOD_real onto the USNO anchor. Non-null: the helper
      // can only be null when lodSecondsAtAge(tau) is null, which already
      // returned NaN above. Spelled inline from the node's own lodMean and
      // yearS — the same operations as eclipticLodCorrectionSecondsAtAge(tau).
      const lodH5Raw = lodMean + lodMean / (deps.nodalPeriodYearsFn() * (yearS / 86400));
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

  // (Plan 09: the "Actual LOD" — the tidal mean × the retired sidereal-year
  // comb's ripple — is deleted with the comb; the ripple was the sidereal
  // year's λ̇ variation misattributed to the day length.)

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

    // The cited history's slope (plan 12 option A): the engine's
    // moonDistanceSlopeMetresPerMaAtAge when it provides one (the Hermite's
    // analytic derivative — C1, smooth), else a ±1-kyr central difference on
    // the distance itself. t_Ma > 0 = past; forward-time sign flip. At J2000
    // the slope IS the LLR observation (the history's boundary condition):
    // +3.82 cm/yr ✓
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
    // the constant's scaling alone (the hybrid's integrand) and the rate's obliquity factor (plan 12 §8)
    lunisolarTorqueRateArcsecPerYrAtAge, lunisolarTorquePeriodYearsAtAge, precessionObliquityFactorAtAge,
    // the composition's terms (plan 06 Phase 3 S3, the lunisolar surface): (a₀/a_M)³ and f_S + (1 − f_S)(a₀/a_M)³
    lunarTorqueFactorAtAge: composed.lunarTorqueFactorAtAge,
    precessionTorqueTermAtAge: composed.torqueTermAtAge,
    siderealYearSecondsAtAge, tropicalYearSecondsAtAge, tropicalYearDaysAtAge,
    // the same law on a caller-supplied LOD (the browser's L1-α sensitivity sweep; plan 09 step 7c)
    tropicalYearSecondsFromLod,
    // the solar day's ecliptic missing-motion term on the nodal period (plan 06 T2 item; one home)
    eclipticLodCorrectionSecondsAtAge,
    yearInDaysAtAge, deltaTRawSecondsAtAge, lodSecondsWithCorrectionsAtAge,
    dLodDtDecompositionAtAge,
    // (plan 09 step 7a: the frozen era clock's counter and bases left with the last comb)
  };
}

module.exports = { createDeepTimeLod };

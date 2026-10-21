/**
 * The assembled surface — the frozen object createModel() returns.
 *
 * The last slice of `assembleModel` (../model.js): reads the bindings every earlier slice built and returns the published surface.
 */
import { ONE_FAMILY_WINDOW_YEARS } from '../earth/year-lengths.cjs';

/** @param {import('./cardinal-instants.js').Ctx} ctx @returns the published surface (frozen) */
export function assembleSurface(ctx) {
  const {
    C, F, EPOCH_PARAMS, GM_EARTH_ALONE, GM_EARTH_MOON_SYSTEM, GM_MOON_ALONE, GM_SUN, GM_SUN_PLUS_EARTH, G_CONSTANT,
    MASS_RATIO_EARTH_MOON, M_SUN, PLANET_KEYS, PUBLISHED_PLANET_RECORDS, anomalisticYearDays, ascendingNodeDeg,
    besselian, cardinalCrossingJdUT, cardinalCrossingNearJdUT, cardinalTargetDeg, certifiedAxialPrecessionJ2000Years,
    chain, dayLengthSeconds, deepLod, deltaTSeconds, earthMoiFactorAtAge, earthPerihelionDeg, eccentricityAt,
    eclipseFinders, evalClimateL1, frameworkDeltaTSecondsAtJD, inclinationDeg, j2000JD, jdFromYear, jdTTFromUT,
    julianCenturyDays, lodRealSeconds, meanLengthOfDay, meanSiderealYearDays, moonDistanceCorrected, moonDistanceKm,
    moonDistanceKmAtYearOrNaN, moonOrbitalShift, moonSeries, moonSiderealMonth, moonSiderealMonthDaysAt,
    moonSynodicMonthDays, oneSourceM, planetAscNodeDeg, planetEccentricity, planetInclinationDeg, planetPerihelionDeg,
    planetSpin, publishedAxialPrecessionYearsAtYear, publishedTropicalYearSecondsAtYear, s3ArcsecPerYr,
    siTropicalYearDays, siderealDaySeconds, siderealYearDays, spinAxisInertialRateMeanArcsecPerYr, stellarDaySeconds,
    sunApparentLonDegAtJdUT, sunEccentricityAt, sunL0Deg, sunMeanLongitudeDegAt, sunPerihelionDegAt,
    sunPlanetaryCompletionDeg, sunTropicalRateDegPerCy, tropicalYearDays, yearFromJD, yearLengthsM, yearToTMa,
  } = ctx;
  return Object.freeze({
    time: Object.freeze({
      yearFromJD,
      jdFromYear,
      siTropicalYearDays,
    }),
    // The Moon-Kepler mass chain — the J2000 derivation docs 24 / the website's
    // "mass from the Moon" page narrate, published from the one place that
    // computes it (physics 22.1.0; the pages used to carry its numbers as
    // hand-typed literals): Kepler III on the Moon's orbit with the
    // solar-tidal shift Δa = a·μ·m (μ the Moon's mass fraction, m the lunar
    // small parameter T_M/T_sidereal-year), the Earth/Moon split on the
    // DE440 mass ratio, and GM_Sun from Earth's heliocentric orbit minus
    // GM_Earth. Every value is the J2000 snapshot the rest of the model runs
    // on; the of-date Moon distance is the recession history (epoch.*).
    massChain: Object.freeze({
      moonDistanceKm,
      moonSiderealMonthDays: moonSiderealMonth,
      siderealYearDays: meanSiderealYearDays,
      dayLengthSeconds: meanLengthOfDay,
      massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
      lunarSmallParameter: moonSiderealMonth / meanSiderealYearDays,
      moonMassFraction: 1 / (MASS_RATIO_EARTH_MOON + 1),
      solarTidalShiftKm: moonOrbitalShift,
      moonDistanceCorrectedKm: moonDistanceCorrected,
      gmEarthMoonSystemKm3S2: GM_EARTH_MOON_SYSTEM,
      gmEarthKm3S2: GM_EARTH_ALONE,
      gmMoonKm3S2: GM_MOON_ALONE,
      gmSunPlusEarthKm3S2: GM_SUN_PLUS_EARTH,
      gmSunKm3S2: GM_SUN,
      sunMassKg: M_SUN,
      earthMassKg: GM_EARTH_ALONE / G_CONSTANT,
      gravitationalConstantKm3KgS2: G_CONSTANT,
    }),
    // The ONE certified Sun's mean elements of date — the lunar arguments of
    // every runtime build their Sun from these two (the Node scene twin and
    // the browser read them here).
    sun: Object.freeze({
      /** Mean longitude of date, degrees, unwrapped — L0 + 360·∫dt/T_trop (the one-family tropical year). @param {number} year @returns {number} */
      meanLongitudeDegAt: sunMeanLongitudeDegAt,
      /** The Sun's mean perihelion longitude of date (Earth's ϖ, mean elements), degrees, wrapped to [0, 360). @param {number} year @returns {number} */
      perihelionLongitudeDegAt: sunPerihelionDegAt,
    }),
    epoch: Object.freeze({
      yearToTMa,
      // The Layer-2 mean day of date — the tidal + GIA base the deep-time law
      // gives at any age (86,399.9997 s at J2000): the day the paleo anchors
      // and the ΔT integrand ride. NOT the observable solar day of date —
      // that is lodRealSecondsAtYear below (plan 08 storyline sweep).
      lodSecondsAtYear: /** @param {number} year @returns {number|null} */ (year) => deepLod.lodSecondsAtAge(yearToTMa(year)),
      // LOD_real of date — the Layer-4 observable (the simulator's Solar Day,
      // the registry's lodRealPhysical): the kinematic day + the ecliptic term
      // + the calibrated ΔT cycle stack. 86,400.001780 s at J2000.
      lodRealSecondsAtYear: /** @param {number} year @returns {number} */ (year) => lodRealSeconds(year),
      alphaAtYear: /** @param {number} year @returns {number} */ (year) => earthMoiFactorAtAge(yearToTMa(year)),
      moonDistanceKmAtYear: /** @param {number} year @returns {number} */ (year) => moonDistanceKmAtYearOrNaN(year),
      // D6: OF-DATE — mass-loss law / the banked planetary λ̇ ratio
      // (identical at J2000 where the ratio ≡ 1 by construction)
      siderealYearSecondsAtYear: /** @param {number} year @returns {number} */ (year) => yearLengthsM.siderealYearSecondsAtYear(year),
      deltaTSecondsAtYear: deltaTSeconds,
      // THE published of-date precession period is the one-family route: the
      // hybrid's own equinox regression against the λ̇-corrected sidereal year
      // (~25,771 yr at J2000 ≈ IAU), inside the banked tiers (|Δyear| ≤
      // ONE_FAMILY_WINDOW_YEARS); beyond, the composed lunisolar period on
      // the same J2000 anchor (the of-date wobble is unresolved there). The
      // lunar chain's (d′) rate completion (pDynDegPerYearAt) rides THIS
      // published period — a MATCHED TRIPLE with the eclipse gates (a
      // 3–15 min lunar-timing shift was measured when it moved).
      axialPrecessionYearsAtYear: publishedAxialPrecessionYearsAtYear,
      // The same publication rule for the mean tropical year of date (SI s):
      // one-family inside the window, the tidal-chain mean beyond.
      tropicalYearSecondsAtYear: publishedTropicalYearSecondsAtYear,
    }),
    // Plan 06 Phase 3 S3 → S5 — the lunisolar precession clock as a
    // first-class surface: Earth's spin clock, ONE home for its published
    // faces, spoken in PERIODS and their RATIOS — no unit, no integer.
    // ONE J2000 reading: every face reads 25,771.6 yr at J2000 — the
    // of-date period (the published family, seamed at ±2 Myr) and the
    // composed mean T_p(t) (the deep-time clock, anchored on the same
    // derived value). The composition's terms; the apsidal period from the
    // one family's own apsidal rate; the two ratios the owner found
    // wandering by hand — T_aps/T_p (4.33 at J2000, 0.84 … 9.9 across
    // ±26 kyr) and T_peri/T_p with T_peri = 1/(1/T_p + 1/T_aps) the
    // perihelion-of-date period (0.812 at J2000) — on the of-date T_p.
    lunisolar: Object.freeze({
      /** The mean lunisolar precession period T_p(t), years — 1,296,000/the precession RATE of date (25,771.6 at J2000): THE published deep-time clock. @param {number} year @returns {number} */
      meanPeriodYearsAtYear: (year) => { const p = deepLod.lunisolarPrecessionPeriodYearsAtAge(yearToTMa(year)); return p === null ? certifiedAxialPrecessionJ2000Years() : p; },
      /** THE PRECESSION RATE OF DATE ψ̇(t) = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³] × cos ε̄(t)/cos ε̄(0), ″/yr — the constant's scaling on the spin and the lunar torque times the cited mean obliquity's cosine (plan 12 §8 option (a); p₀ = 50.2880, the IAU 2006 input). @param {number} year @returns {number} */
      meanRateArcsecPerYrAtYear: (year) => { const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year)); return r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r; },
      /** THE PRECESSION CONSTANT OF DATE as a rate on the J2000 obliquity, ″/yr — the spin and torque scaling alone (the hybrid obliquity integration's integrand: its own ŝ·n̂ carries the cosine). @param {number} year @returns {number} */
      torqueRateArcsecPerYrAtYear: (year) => { const r = deepLod.lunisolarTorqueRateArcsecPerYrAtAge(yearToTMa(year)); return r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r; },
      /** 1,296,000/the torque rate, years. @param {number} year @returns {number} */
      torquePeriodYearsAtYear: (year) => { const p = deepLod.lunisolarTorquePeriodYearsAtAge(yearToTMa(year)); return p === null ? certifiedAxialPrecessionJ2000Years() : p; },
      /** cos ε̄(t)/cos ε̄(0) — the rate of date's obliquity factor on the constant (1 at J2000; 1.0075 at the Devonian, 1.0245 at 2.46 Ga). @param {number} year @returns {number} */
      precessionObliquityFactorAtYear: (year) => { const f = deepLod.precessionObliquityFactorAtAge(yearToTMa(year)); return f === null ? 1 : f; },
      /** THE CITED MEAN OBLIQUITY OF DATE ε̄(t), degrees — Farhat et al. 2022's own column of the Earth–Moon history (a Myr-scale MEAN: 23.25° at age 0 against the J2000 instant 23.44°; 22.23° Devonian, 19.73° at 2.46 Ga); read as the shape cos ε̄(t)/cos ε̄(0) on the precession rate. NaN beyond the input's span (4,429 Ma); forward of J2000 the J2000 slope is held. @param {number} year @returns {number} */
      meanObliquityCitedDegAtYear: (year) => { const e = chain.meanObliquityCitedDegAtAge(yearToTMa(year)); return e === null ? NaN : e; },
      /** The of-date period — the one-family beat inside ±2 Myr, the composed mean beyond. @param {number} year @returns {number} */
      ofDatePeriodYearsAtYear: publishedAxialPrecessionYearsAtYear,
      /** f_S, the solar fraction of the J2000 precession torque. */
      solarShareJ2000: EPOCH_PARAMS.precessionSolarShareJ2000,
      /** THE PRECESSION OF DATE — the solar-torque factor 1 + f_S·([(1 − e²)/(1 − e₀²)]^(−3/2) − 1) at the eccentricity of date (1 at J2000; +3.2·10⁻⁴ on the million-year mean). The spin integration multiplies it into the secular rate. @param {number} year @returns {number} */
      solarTorqueFactorOfDateAtYear: (year) => oneSourceM.precessionOfDateFactorsAt(year).solarTorque,
      /** THE PRECESSION OF DATE — J₂(t)/J₂₀, the oblateness of date from the GIA channel (ψ̇ ∝ J₂; 1 at J2000, bounded ±5·10⁻⁴; dJ₂/dt at J2000 = the observed satellite rate). @param {number} year @returns {number} */
      ellipticityRatioOfDateAtYear: (year) => oneSourceM.precessionOfDateFactorsAt(year).ellipticity,
      /** (a₀/a_M(t))³ — the lunar torque's growth on the recession history. @param {number} year @returns {number} */
      lunarTorqueFactorAtYear: (year) => { const f = deepLod.lunarTorqueFactorAtAge(yearToTMa(year)); return f === null ? 1 : f; },
      /** f_S + (1 − f_S)(a₀/a_M)³ — the torque term of the composed precession rate. @param {number} year @returns {number} */
      torqueTermAtYear: (year) => { const t = deepLod.precessionTorqueTermAtAge(yearToTMa(year)); return t === null ? 1 : t; },
      /** The hybrid's precession constant α = p₀ / cos ε₀, ″/yr (p₀ the derived J2000 rate, ε₀ the J2000 obliquity input; 54.81). */
      torqueConstantJ2000ArcsecPerYr: (1296000 / certifiedAxialPrecessionJ2000Years()) / Math.cos((C.earthOrbital.obliquityJ2000_deg * Math.PI) / 180),
      /** |s₃|, the dominant nodal mode of Earth's orbit — the largest-amplitude ζ mode of the banked deep secular modes, ″/yr (18.85; the obliquity beat's partner). ONE home for the registry, the browser and the API. */
      nodalModeS3ArcsecPerYr: s3ArcsecPerYr,
      /** The ecliptic (nodal) precession period 1,296,000/|s₃|, years (68,751) — an orbital quantity, fixed at every epoch at the two-body level. */
      nodalPeriodYears: 1296000 / s3ArcsecPerYr,
      /** THE SPIN AXIS'S INERTIAL PRECESSION RATE OF DATE, ″/yr — the composed rate scaled by the
       *  hybrid's self-anchor factor (the inertial-to-general ratio at J2000, the multiplicative form
       *  the obliquity integration itself applies): 50.385 at J2000 (series-driven). The obliquity beat and the
       *  obliquity lines ride THIS rate; the general precession (meanRateArcsecPerYrAtYear) is the
       *  equinox along the ecliptic of date. @param {number} year @returns {number} */
      spinAxisInertialRateArcsecPerYrAtYear: (year) => {
        const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year));
        const psiDot = r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r;
        return psiDot * (certifiedAxialPrecessionJ2000Years() / oneSourceM.axialPrecessionYearsLunisolarJ2000);
      },
      /** The obliquity beat 2π/(ψ̇ᵢₙ(t) − |s₃|), years — the SHIPPED deep-time obliquity period at an INSTANT
       *  (falsification leg 1; 41,098 at J2000). ψ̇ᵢₙ is the spin axis's INERTIAL rate (above): the equator
       *  against the ecliptic's nodal mode in the inertial frame, the rate the hybrid obliquity integration
       *  self-anchors on — not the general precession, which reads the beat 0.3 % long (41,224). v23.0: a
       *  dated record sees the beat of the pole rate's mean over its own window, with the pole's of-date
       *  factors (obliquityPeriodRealizedYears below: 40,927 over the LR04 record, the climate formula's p+s₀
       *  line; La2004's own series reads 40,900 on the same window — compare realized with realized, never
       *  this instant with Laskar's long-window precession frequency 50.476). @param {number} year @returns {number} */
      obliquityBeatYearsAtYear: (year) => {
        const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year));
        const psiDot = r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r;
        const psiDotInertial = psiDot * (certifiedAxialPrecessionJ2000Years() / oneSourceM.axialPrecessionYearsLunisolarJ2000);
        return 1296000 / (psiDotInertial - s3ArcsecPerYr);
      },
      /** THE REALIZED POLE RATE OVER A WINDOW, ″/yr — see the one home above (the mean of the inertial rate of
       *  date with its three of-date factors); the rate the obliquity lines of a record spanning the window carry. */
      spinAxisInertialRateMeanArcsecPerYr,
      /** THE REALIZED OBLIQUITY PERIOD OVER A WINDOW, years — 1,296,000/(⟨ψ̇ᵢₙ⟩_window − |s₃|): the period a record
       *  spanning [yearFrom, yearTo] sees (40,930 over the LR04 record 0–5.32 Ma, 41,018 over the last Myr); the
       *  J2000 beat (obliquityBeatYearsAtYear) is its instantaneous limit.
       *  @param {number} yearFrom @param {number} yearTo @returns {number} */
      obliquityPeriodRealizedYears: (yearFrom, yearTo) => 1296000 / (spinAxisInertialRateMeanArcsecPerYr(yearFrom, yearTo) - s3ArcsecPerYr),
      /** The apsidal (perihelion vs the stars) period of date, JULIAN years — the ONE movement's own apsidal rate (the scene's perihelion; anom/(anom − sid) of the one family, ≡ 360°/apsidalRateFixedArcsecPerJulianYr), inside the published window only; null beyond. Before 2026-09 this rode the planet chain's secular tangent, which parted from the scene's perihelion passages by seconds of anomalistic year within a few millennia (year-lengths.cjs). @param {number} year @returns {number|null} */
      apsidalPeriodYearsAtYear: (year) => (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS ? yearLengthsM.inclinationPrecessionYearsAtYear(year) : null),
      /** T_aps(t) / T_p(t) — the apsidal period in of-date precession periods (4.33 at J2000, a reading; 0.84 … 9.9 across ±26 kyr, measured); null beyond the published window. @param {number} year @returns {number|null} */
      apsidalPerPrecessionAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        return yearLengthsM.inclinationPrecessionYearsAtYear(year) / publishedAxialPrecessionYearsAtYear(year);
      },
      /** T_peri(t) = 1/(1/T_p + 1/T_aps) — the perihelion-of-date period (equinox precession + inertial perihelion motion, frame arithmetic at every epoch), JULIAN years, on the of-date T_p — ≡ the one family's anom/(anom − trop); null beyond the published window. @param {number} year @returns {number|null} */
      periOfDatePeriodYearsAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        const tp = publishedAxialPrecessionYearsAtYear(year), taps = yearLengthsM.inclinationPrecessionYearsAtYear(year);
        return 1 / (1 / tp + 1 / taps);
      },
      /** T_peri(t) / T_p(t) (0.812 at J2000 — the J2000 reading); null beyond the published window. @param {number} year @returns {number|null} */
      periOfDatePerPrecessionAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        const tp = publishedAxialPrecessionYearsAtYear(year), taps = yearLengthsM.inclinationPrecessionYearsAtYear(year);
        return (1 / (1 / tp + 1 / taps)) / tp;
      },
      /** The published of-date window, years from 2000. */
      publishedWindowYears: ONE_FAMILY_WINDOW_YEARS,
      /** THE SPIN AXIS'S INERTIAL PRECESSION PERIOD at J2000, years (25,722 in the shipped,
       *  series-driven configuration) — the rate the hybrid obliquity integration self-anchors
       *  ŝ on (earth/deep-orbital-history, D4e): the general-precession anchor p₀ PLUS the
       *  planetary mean the N-body ecliptic's own motion carries (+0.097 ″/yr ≡ IAU's planetary
       *  precession ψ_A − p_A; the bare 18-mode table anchors 0.18 — the g₂-gap trap: pass the
       *  secular series). Two rates, two uses — the obliquity line frequencies p + s_i (the
       *  spin axis against the ecliptic's nodal modes, in the inertial frame) carry THIS
       *  rate; the climatic-precession lines p + g_i (the perihelion from the equinox along
       *  the ecliptic of date) carry p₀. */
      spinAxisInertialPeriodYearsJ2000: oneSourceM.axialPrecessionYearsLunisolarJ2000,
      /** The same as a rate, ″/yr (50.385 at J2000 with the series; p₀ = 50.288 is the general precession). */
      spinAxisInertialRateArcsecPerYrJ2000: 1296000 / oneSourceM.axialPrecessionYearsLunisolarJ2000,
    }),
    earth: Object.freeze({
      perihelionLongitudeDeg: earthPerihelionDeg,
      // THE published obliquity is the hybrid — one torque law integrated on
      // the dynamical orbit plane of the N-body chain, zero fitted constants
      // (≡ La2004 to ≤ 4″ over ±50 kyr).
      // Beyond the ζ series' span (±10 Myr) the hybrid carries NO tidal evolution
      // of the mean obliquity (nothing in ds/dt = α(ŝ·n̂)(ŝ×n̂) moves ŝ·n̂'s mean):
      // its deep mean is the Quaternary mean on the tail's mean plane (plan 12
      // §8.3). The cited mean obliquity of date is `meanObliquityCitedDeg`.
      obliquityDeg: /** @param {number} year @returns {number} */ (year) => oneSourceM.epsAt(year),
      /** The hybrid's own domain, [yearFrom, yearTo] — the banked ζ series' span, ±10 Myr about J2000 (plan 12 §8.5: the published surfaces serve `obliquityDeg` inside it only; null without a series, i.e. a bare createModel()). */
      obliquityHybridDomainYears: oneSourceM.obliquityHybridDomainYears,
      /** The cited mean obliquity of date ε̄(t) (Farhat et al. 2022's column; plan 12 §8 option (a)), degrees — a Myr-scale mean; NaN beyond 4,429 Ma. @param {number} year @returns {number} */
      meanObliquityCitedDeg: /** @param {number} year @returns {number} */ (year) => { const e = chain.meanObliquityCitedDegAtAge(yearToTMa(year)); return e === null ? NaN : e; },
      eccentricity: eccentricityAt,
      inclinationDeg,
      ascendingNodeDeg,
    }),
    // The year lengths of date in DAYS OF THE EPOCH (the published SI years
    // over the kinematic day of date — year-day-lengths.js) and the day
    // lengths of date in SI seconds (one-source-movement.js). The published
    // SI year lengths themselves are `yearLengths` (the one-family route) and
    // the seamed `epoch.*AtYear` surfaces above.
    lengths: Object.freeze({
      tropicalYearDays,
      siderealYearDays,
      anomalisticYearDays,
      dayLengthSeconds,
      lodRealSeconds,
      siderealDaySeconds,
      stellarDaySeconds,
    }),
    // Plan 06 R1: the instants are the crossings of the ONE Sun (the
    // certified completed Sun the scene renders), UT model-JD; the RA at a
    // crossing is the target longitude by construction (λ = 0/90/180/270 ⇒
    // RA = 0/90/180/270, any obliquity); the per-type year length is the
    // interval between successive crossings (SI days).
    cardinal: Object.freeze({
      jd: /** @param {number} year @param {string} type @returns {number} */ (year, type) => cardinalCrossingJdUT(year, type),
      // R4c: the crossing nearest a UT instant (a JD seed — for callers whose
      // year coordinate is not the model year, e.g. a calendar year's midpoint).
      jdNearUT: /** @param {number} jdUT @param {string} type @returns {number} */ (jdUT, type) => cardinalCrossingNearJdUT(jdUT, type),
      raDeg: /** @param {number} year @param {string} type @returns {number} */ (year, type) => { void year; return cardinalTargetDeg(type); },
      yearLengthDays: /** @param {number} year @param {string} type @returns {number} */ (year, type) => cardinalCrossingJdUT(year + 1, type) - cardinalCrossingJdUT(year, type),
    }),
    // The one-source cardinal STRUCTURE — the EoC layer on the movement's own
    // e(t)/ϖ(t), valid at every epoch (mode tier). Absolute dates deliberately
    // absent; `cardinal` above serves the instants.
    cardinalStructure: Object.freeze({
      // D6: year LENGTHS gain the λ̇ drift coherently (rate-form
      // correction — beats stay invariant); offsets/spreads keep the raw
      // form (μs-class / second-order there).
      yearLengthSeconds: /** @param {number} year @param {'VE'|'SS'|'AE'|'WS'} type @returns {number} */ (year, type) => yearLengthsM.cardinal.yearLengthSeconds(year, type),
      eocOffsetSeconds: /** @param {number} year @param {'VE'|'SS'|'AE'|'WS'} type @returns {number} */ (year, type) => yearLengthsM.cardinal.eocOffsetSeconds(year, type),
      spreadSeconds: /** @param {number} year */ (year) => yearLengthsM.cardinal.spreadSeconds(year),
      anomalisticYearSeconds: /** @param {number} year @returns {number} */ (year) => yearLengthsM.anomalisticYearSecondsAtYear(year),
    }),
    // THE ONE of-date year-length family + its beats (S2; SI seconds) —
    // the single surface the panel, charts, API and website consume.
    yearLengths: yearLengthsM,
    moon: Object.freeze({
      distanceKmAtYear: /** @param {number} year @returns {number} */ (year) => moonDistanceKmAtYearOrNaN(year),
      siderealMonthDaysAtYear: moonSiderealMonthDaysAt,
      synodicMonthDays: moonSynodicMonthDays,
      // The apparent-position chain (truncated Meeus Ch. 47 series on
      // framework-native arguments). JD(UT) axis — UT→TT applied internally.
      lonDegAtJD: /** @param {number} jd @returns {number} */ (jd) => moonSeries.truncatedLonDeg(jd),
      betaDegAtJD: /** @param {number} jd @returns {number} */ (jd) => moonSeries.truncatedBetaDeg(jd),
      distanceKmAtJD: /** @param {number} jd @returns {number} */ (jd) => moonSeries.truncatedDistanceKm(jd),
    }),
    eclipse: Object.freeze({
      sunLonDegAtJD: /** @param {number} jd @returns {number} */ (jd) => eclipseFinders.sunLonDegAt(jd),
      // The COMPLETED tier Sun (K8b follow-up, owner-approved injection):
      // the bare finder Sun minus the DERIVED planetary-completion table —
      // 70 framework-carrier terms plus the 6.44″ Earth-around-EMB wobble
      // (the "lunar equation"; eclipse/sun-planetary-completion.cjs, zero
      // fitted constants). The finders themselves deliberately stay bare
      // (their certified canon statistics were produced on the bare form;
      // besselian.cjs applies the same subtraction internally). This
      // surface exists for the SCENE tier's E5 wheel-Sun bridge, so the
      // rendered Sun carries the model's own derived apparent-class terms.
      // Clock: the completion argument rides TT centuries from the same
      // framework ΔT the besselian composition uses.
      sunLonCompletedDegAtJD: /** @param {number} jd @returns {number} */ (jd) =>
        eclipseFinders.sunLonDegAt(jd)
        - sunPlanetaryCompletionDeg((jdTTFromUT(jd) - j2000JD) / julianCenturyDays),
      /** The APPARENT Sun (completed geometric − the derived aberration constant + the leading nutation terms on the model's own arguments) — the quantity Horizons' observer ecliptic longitude is; the cardinal instants are its crossings (plan 06 R1/I1). @param {number} jdUT @returns {number} */
      sunApparentLonDegAtJD: /** @param {number} jdUT @returns {number} */ (jdUT) => sunApparentLonDegAtJdUT(jdUT),
      findLunarInRange: /** @param {number} jdStart @param {number} jdEnd */ (jdStart, jdEnd) => eclipseFinders.findLunarEclipsesInRange(jdStart, jdEnd),
      findSolarInRange: /** @param {number} jdStart @param {number} jdEnd */ (jdStart, jdEnd) => eclipseFinders.findSolarEclipsesInRange(jdStart, jdEnd),
      deltaTSecondsAtJD: frameworkDeltaTSecondsAtJD,
      /** The ΔT trend anchor at J2000 (seconds): the TT − UT bridge every finder axis adds to a
       *  true-UT JD. The joint ΔT fit's output, shipped in its own artifact (FIT.DT_ANCHOR —
       *  plan 14: never a constants-file input), exposed here so no consumer reaches into the
       *  constants for it. */
      ttBridgeSeconds: F.DT_ANCHOR.deltaTStartSeconds,
      // E4 — the framework-native Sun deps, exported so the OTHER finder
      // construction sites (tools/verify/eclipse-audit.js, the browser
      // _eclipse twins) spread the SAME assembly into their own
      // createEclipseFinders call instead of triplicating it (the
      // three-runtimes rule — cf. moon-distance-history):
      frameworkSunDeps: Object.freeze({
        sunMeanLongitudeJ2000Deg: sunL0Deg,
        tropicalRateDegPerCy: sunTropicalRateDegPerCy,
        eccentricityAt: sunEccentricityAt,
        perihelionLongitudeDegAt: sunPerihelionDegAt,
        meanLongitudeDegAt: sunMeanLongitudeDegAt,
      }),
      // 20.3g location tier (see eclipse/besselian.cjs):
      umbraGroundAtJD: /** @param {number} jd @returns {{latDeg: number, lonDeg: number} | null} */ (jd) => besselian.umbraGroundAt(jd),
      solarLocalCircumstances: /** @param {number} jdGreatest @param {number} latDeg @param {number} lonDeg */ (jdGreatest, latDeg, lonDeg) => besselian.localCircumstances(jdGreatest, latDeg, lonDeg),
    }),
    climate: Object.freeze({
      l1OrbitalPermil: evalClimateL1,
    }),
    planets: Object.freeze({
      keys: Object.freeze([...PLANET_KEYS]),
      record: /** @param {string} k @returns {Record<string, any>|undefined} */ (k) => PUBLISHED_PLANET_RECORDS[k],
      perihelionLongitudeDeg: planetPerihelionDeg,
      ascendingNodeInvPlaneDeg: planetAscNodeDeg,
      invPlaneInclinationDeg: planetInclinationDeg,
      eccentricity: planetEccentricity,
      spin: planetSpin,
    }),
  });
}

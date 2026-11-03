/**
 * Lunar theory — the shared-chain assembly: the derived months, the chain-cycle counters, the arguments, UT→TT, the Meeus series.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { createChainCycleIntegrator } from '../chain-cycles/index.cjs';
import { J2000_JD, JULIAN_CENTURY_DAYS } from '../constants/units.cjs';
import { createMoonArguments, jdToDecimalYear } from '../moon/arguments.cjs';
import { createDeepCalendar } from '../phase/deep-calendar.cjs';
import { createMoonSeries } from '../moon/series.cjs';
import { driver2PeriodSecondsAtAge } from '../planets/orbit-chain.cjs';

/** @param {import('./time-axis.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleLunarTheory(ctx) {
  const {
    C, F, late, options, EPOCH_PARAMS, axialPrecessionJ2000Days, chain, deepEcc, deepLod, meanDeltaTSecondsAtAge,
    meanSiderealYearDays, meanTropicalYearJ2000Seconds, moonChain, moonDistanceKm,
    moonDistanceMetresAtAge, moonSiderealMonth, oneSourceM, siTropicalYearDays, startmodelJD, startmodelYear, sunPerihelionDegAt,
    yearFromJD,
  } = ctx;
  // PLAN 25 — the lunar cumulative bank (data/lunar-cumulative-checkpoints.json, parsed, or null): the
  // chain counts' and the carriers' coarse segment prefixes every 250 kyr. A seat, never a value — the
  // tables' association is the same with and without it (the purity gate's lunar rows).
  const lunarCheckpoints = options.lunarCheckpointsArtifact ?? null;
  // Wiring mirrors the engine call sites exactly — tools/lib/deep-time.js
  // (ecc channel, month chain, J2000 precession anchors),
  // tools/lib/scene-graph.js (chain-cycles, arguments, series) and
  // tools/verify/eclipse-audit.js (finders). Deep-time and framework-native
  // are hardwired ON here: they are the shipped defaults; the A/B env
  // toggles (SG_DEEP_TIME/MOON_ARGS_PURE_MEEUS) stay an engine concern.
  const j2000JD = J2000_JD;                       // ONE home: constants/units
  const julianCenturyDays = JULIAN_CENTURY_DAYS;

  // J2000 Moon precession anchors (the IAU inputs themselves). The
  // legacy-'ICRF'-named inputs hold the EQUINOX-OF-DATE observables (Meeus/
  // IERS 3231.50 d / 6798.38 d); the star-referenced (inertial) periods
  // follow by removing the equinox's own precession, 1/T_E = 1/T_I ∓ 1/T_p
  // (perigee advances, node regresses), T_p the J2000 precession anchor.
  const { moonApsidalJ2000Seconds } = chain;
  // (The of-date perigee/node are the chain's count compositions —
  // mcApsidalOfDate / mcNodalOfDate below.)

  // Derived months on the IAU inputs (constants.js §Moon derived months)
  const moonTropicalMonthDays = 1 / (1 / moonSiderealMonth + 1 / axialPrecessionJ2000Days);
  const moonAnomalisticMonthDays = 1 / (1 / moonSiderealMonth - 86400 / moonApsidalJ2000Seconds);
  const moonSynodicMonthDays = moonSiderealMonth * meanSiderealYearDays / (meanSiderealYearDays - moonSiderealMonth);

  // The Layer-2 month/precession chain (Brouwer-Clemence m² scaling × the
  // e_E-line modulation on the ONE deep e — decision (ii), plan 02 §8) is
  // the deep-time chain's `moonChain` (deep-time-chain.js).

  // Chain-cycle integrator. S5/S12 conventions: age anchor = startmodelYear
  // (the scene's t_Ma convention), grid anchor C(2000) = 0 — grid anchor ≠
  // age anchor, deliberately. One stable period fn per chain so the shared
  // Float64Array tables key correctly and persist.
  const chainCycles = createChainCycleIntegrator({
    ageAnchorYear: startmodelYear,
    tropicalYearJ2000Seconds: meanTropicalYearJ2000Seconds,   // the SI tick
    isDeepTime: () => true,
    checkpoints: lunarCheckpoints,
  });
  /** @param {number} tMa @returns {number|null} */
  const nodalMonthPeriodFn = (tMa) => moonChain.nodalMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const tropicalMonthPeriodFn = (tMa) => moonChain.tropicalMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const anomalisticMonthPeriodFn = (tMa) => moonChain.anomalisticMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const siderealMonthPeriodFn = (tMa) => moonChain.siderealMonthSecondsAtAge(tMa);
  const jupiterT0Seconds = C.planetOrbitalElements.jupiter.orbitalPeriodInputDays * 86400;
  /** @param {number} tMa @returns {number} */
  const jupiterPeriodFn = (tMa) => driver2PeriodSecondsAtAge(tMa, jupiterT0Seconds, EPOCH_PARAMS.solarMassLossFracPerYear);
  // The five chains the lunar bank keys (plan 25) — the SAME names in the Node scene twin and the browser.
  chainCycles.nameChain('draconic', nodalMonthPeriodFn);
  chainCycles.nameChain('tropical', tropicalMonthPeriodFn);
  chainCycles.nameChain('anomalistic', anomalisticMonthPeriodFn);
  chainCycles.nameChain('sidereal', siderealMonthPeriodFn);
  chainCycles.nameChain('jupiter', jupiterPeriodFn);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcDraconic = (a, b) => chainCycles.cyclesBetween(nodalMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcTropical = (a, b) => chainCycles.cyclesBetween(tropicalMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcAnomalistic = (a, b) => chainCycles.cyclesBetween(anomalisticMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcJupiter = (a, b) => chainCycles.cyclesBetween(jupiterPeriodFn, a, b);
  /** The Moon's sidereal (star-referenced) orbits — the series' A3 argument. @param {number} a @param {number} b @returns {number|null} */
  const mcSidereal = (a, b) => chainCycles.cyclesBetween(siderealMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcApsidalOfDate = (a, b) => {
    const t = mcTropical(a, b), n = mcAnomalistic(a, b);
    return (t === null || n === null) ? null : t - n;
  };
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcNodalOfDate = (a, b) => {
    const dr = mcDraconic(a, b), t = mcTropical(a, b);
    return (dr === null || t === null) ? null : dr - t;
  };

  // The argument skeleton (the _FW_MOON bundle; Sun secular deviations on
  // the CALENDAR year coordinate — S3)
  const moonArgs = createMoonArguments({
    constants: {
      j2000JD,
      julianCenturyDays,
      eccentricityJ2000: C.earthOrbital.earthEccentricityJ2000,
      eccentricityDotJ2000: C.earthOrbital.earthEccentricityDotJ2000,
      eccentricityDotDotJ2000: C.earthOrbital.earthEccentricityDotDotJ2000,
      elpEarthFigureJ2ArcsecPerCy2: C.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.earthFigureJ2,
      elpGeneralPrecessionPA_T2ArcsecPerCy2: C.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.generalPrecessionPA_T2_Lieske1976,
      // Decision (ii): the lunar chain reads ONE deep e end to end
      eccE0: deepEcc.e0,
      // plan 23: the perigee/node sensitivities — the chain's derived pair (ONE home)
      moonEccSensitivities: chain.moonEccSensitivities,
    },
    fns: {
      eccAt: /** @param {number} tYr */ (tYr) => deepEcc.eccAt(tYr),
      channelIntegral: /** @param {number} T @param {number} s */ (T, s) => deepEcc.channelIntegral(T, s),
      // The arguments' obliquity carrier reads the PUBLISHED ε (the one-source
      // hybrid) — one ε everywhere. Twins: script.js (_sceneEpsTargetDeg), scene-graph.js.
      computeObliquityEarth: /** @param {number} year @returns {number} */ (year) => oneSourceM.epsAt(year),
      // The arguments' Sun IS the one certified Sun — the mean longitude that
      // integrates the one-family tropical year (the eclipse finder's Sun,
      // sun-and-eclipses.js) and the series' mean perihelion of date
      // (unwrapped), both on the TT Julian-year axis. Twins: scene-graph.js,
      // script.js.
      sunMeanLonDegAtJdTT: /** @param {number} jdTT @returns {number} */ (jdTT) => late.sunMeanLongitudeDegAt(2000 + (jdTT - j2000JD) / 365.25),
      sunPerihelionLonDegAtJdTT: /** @param {number} jdTT @returns {number} */ (jdTT) => sunPerihelionDegAt(2000 + (jdTT - j2000JD) / 365.25),
      jdToSIyear: yearFromJD,
      tropicalOrbitsBetween: mcTropical,
      apsidalOfDateCyclesBetween: mcApsidalOfDate,
      nodalOfDateCyclesBetween: mcNodalOfDate,
      isDeepTime: () => true,
      isFrameworkNative: () => true,
      // (d′) of-date rate completion: the DYNAMICAL axial precession and the
      // KINEMATIC pair's beat the chains embed. MATCHED TRIPLE with the
      // tools-lib and browser wirings. The dynamical rate of date is the
      // published precession period's (the one-family beat inside its window,
      // the composed clock beyond — published-periods.js). Degrees per Julian year.
      pDynDegPerYearAt: /** @param {number} year */ (year) => 360 / late.publishedAxialPrecessionYearsAtYear(year),
      pKinDegPerYearAt: /** @param {number} year */ (year) => {
        // MODEL-START-anchored age, matching the tools-lib/browser wirings
        // bit-exactly — NOT yearToTMa's 2000.0 convention (the recorded
        // 0.4977-yr parity trap, same class as getMoonDistanceKm in the series wiring below).
        const t = (startmodelYear - year) / 1e6;
        const sid = deepLod.siderealYearSecondsAtAge(t);
        const trop = deepLod.tropicalYearSecondsAtAge(t);
        return (sid === null || trop === null) ? 0 : 360 * (sid - trop) / sid;
      },
    },
    checkpoints: lunarCheckpoints,   // plan 25: the carriers' coarse segment prefixes
  });
  /** THE GENERATOR'S HOOK (plan 25, tools/verify/lunar-cumulative-bank.js): the coarse segment
   *  prefixes of the five named chains and the two named carriers over ±limitYears from their
   *  edges — the payload of data/lunar-cumulative-checkpoints.json, computed by the tables' own
   *  recursion on THIS context (never seated on a bank: the generator builds without one).
   *  A number records ±limitYears; {past, future} records each direction to its own edge
   *  (the navigable domain is asymmetric: −4,425 / +1,000 Myr).
   *  @param {number | {past: number, future: number}} limitYears */
  const recordLunarCumulativeBank = (limitYears) => ({
    chains: {
      draconic: chainCycles.recordSegmentPrefixes(nodalMonthPeriodFn, limitYears),
      tropical: chainCycles.recordSegmentPrefixes(tropicalMonthPeriodFn, limitYears),
      anomalistic: chainCycles.recordSegmentPrefixes(anomalisticMonthPeriodFn, limitYears),
      sidereal: chainCycles.recordSegmentPrefixes(siderealMonthPeriodFn, limitYears),
      jupiter: chainCycles.recordSegmentPrefixes(jupiterPeriodFn, limitYears),
    },
    // the carriers count centuries; a per-direction limit ({past, future}) passes through per side
    carriers: moonArgs.recordCarrierPrefixes(typeof limitYears === 'number' ? limitYears / 100 : { past: limitYears.past / 100, future: limitYears.future / 100 }),
    segmentYears: chainCycles.coarseSegmentYears,
    chainLimitYears: chainCycles.coarseLimitYears,
  });

  // UT→TT on the CALENDAR decimal-year coordinate (script.js Phase 9.16 —
  // a linear-year approximation here once cost ~5–6 s of ΔT and ~1e-3° of
  // Moon longitude at the Babylonian epochs)
  // ONE ΔT on ONE age axis: the eclipse finders' Sun, the Moon, the besselian
  // tier and the scene bridge all read it (NOT deltaTSeconds of delta-t.js,
  // which adds the deltaTStart anchor). Until 2026-11 the finders' ΔT read its
  // age off a linear 365.2422-d year count from the model start — 2.14e-5 of
  // the span from the calendar axis before 1582: 1.2 s of TT at −3000, 108 s
  // at −25 kyr, 1.9 d at −1 Myr — so the certified Sun ran on a third clock
  // against the Moon and the planets, unseen by every gate on that axis
  // (doc 111 §1.31). Computed directly, never recovered from a JD difference
  // (two JDs near 2.4 million subtract to 1e-5 s of round-off).
  // PLAN 27 (doc 111 §1.36): the AGE the ΔT reads is the age of the TT instant the UT
  // count has reached — the UT Julian Day's solar-day count → the year of date (the
  // calendar's solar-day position table) → that year's TT instant (its SI-day table) →
  // the engine year (Julian from J2000). The former argument was the calendar year of the
  // UT count itself: a label ΔT short, which is 8 ms of bridge at −3000, 11 days at
  // −1 Myr and 340 Myr of age at the −2 Gyr label (the rendered Moon was the 1.66-Ga one).
  // Outside the tables' domain the calendar label stands in, as before.
  const deepCalendar = createDeepCalendar({
    meanYearInDaysAtAgeMa: chain.meanYearInDaysAtAge,
    meanTropicalYearDaysAtAgeMa: chain.meanTropicalYearDaysAtAge,
    withLatticeAlpha: chain.withLatticeAlpha,
    withShippedAlpha: chain.withShippedAlpha,
    deltaTSecondsAtAges: chain.meanDeltaTSecondsAtAges,
    startModelJD: startmodelJD,
    startModelYear: startmodelYear,
    startModelYearWithCorrection: startmodelYear,
    siTropicalYearDays,
  });
  // Two ages, named: the RAW integral of the LOD history is a function of the physical (TT)
  // age; the fitted era corrections the chain adds (the Bond/Hallstatt/Jose cycles, the
  // resonator) were fitted on the civil calendar year of the UT count (the ΔT records' own
  // axis) and keep it — the two agree to 8 ms at −3000 and part at depth (11 days at −1 Myr).
  /** @param {number} jd @returns {number} */
  const frameworkDeltaTSecondsAtJD = (jd) => {
    const dT = deepCalendar.deltaTSecondsAtJdUT(jd);
    if (dT !== null && Number.isFinite(dT)) return dT;
    const fallback = meanDeltaTSecondsAtAge((startmodelYear - jdToDecimalYear(jd)) / 1e6);   // the civil reading, outside the table
    return Number.isFinite(fallback) ? fallback : 0;
  };
  /** @param {number} jd @returns {number} */
  const jdTTFromUT = (jd) => jd + frameworkDeltaTSecondsAtJD(jd) / 86400;

  // Bounded Meeus E-factor from the ONE deep e (decision (ii); the
  // pure-Meeus polynomial A/B branch stays engine-local)
  /** @param {number} dDays @returns {number} */
  // (on the channel's Julian-year axis — the N-body series' time)
  const fwEFactor = (dDays) => deepEcc.eFactorAt(dDays / 365.25);

  // D2 derived additional-argument rates (deg/cy, from the J2000 month inputs —
  // docs/109 §22 for the derivation)
  const fwA2RateDegPerCy = 2 * ((360 * 36525) / moonTropicalMonthDays)
    - (360 * 36525) / moonAnomalisticMonthDays
    - 2 * ((360 * 36525) / C.planetOrbitalElements.jupiter.orbitalPeriodInputDays);
  const fwA3RateDegPerCy = (360 * 36525) / moonSiderealMonth;

  // Meeus Ch. 47 truncated series (framework-native arguments + E-factor)
  const moonSeries = createMoonSeries({
    constants: {
      moonL: F.MEEUS_LONGITUDE_TERMS,
      moonB: F.MEEUS_LATITUDE_TERMS,
      moonR: F.MEEUS_DISTANCE_TERMS.terms,
      moonRMeanKm: F.MEEUS_DISTANCE_TERMS.meanKm,
      moonDistanceJ2000Km: C.moonReference.moonDistance,
      j2000JD,
      julianCenturyDays,
      fwA2RateDegPerCy,
      fwA3RateDegPerCy,
    },
    fns: {
      argsAt: /** @param {number} jdTT */ (jdTT) => moonArgs.argsAt(jdTT),
      eFactorForD: fwEFactor,
      eFactorAtJdTT: /** @param {number} jdTT */ (jdTT) => fwEFactor(jdTT - j2000JD),
      // 20.3d(i): the Driver-1 ratio at the EVALUATED epoch (per-jd pure
      // evaluator). MATCHED TRIPLE with the tools-lib and browser getters:
      // identical age arithmetic — the SI-linear year (yearFromJD, never
      // the calendar year: the recorded linear-vs-calendar mirror trap)
      // against the MODEL-START anchor (startmodelYear, the browser's
      // J2000_CALENDAR_YEAR — NOT this model's 2000.0 yearToTMa convention:
      // the 0.5-yr difference is 4.95e-11 of distance and failed the
      // bit-exact parity gate). Falls back to the J2000 constant
      // without a jd (legacy call shape) or past the domain.
      getMoonDistanceKm: /** @param {number} [jdTT] */ (jdTT) => {
        if (jdTT === undefined) return moonDistanceKm;
        const d = moonDistanceMetresAtAge((startmodelYear - yearFromJD(jdTT)) / 1e6);
        return d === null ? moonDistanceKm : d / 1000;
      },
      getEccentricityBase: () => C.moonReference.moonOrbitalEccentricityBase,
      deltaTSeconds: /** @param {number} jd */ (jd) => (jdTTFromUT(jd) - jd) * 86400,
      jdToSIyear: yearFromJD,
      tropicalOrbitsBetween: mcTropical,
      apsidalOfDateCyclesBetween: mcApsidalOfDate,
      siderealOrbitsBetween: mcSidereal,
      jupiterOrbitsBetween: mcJupiter,
      isDeepTime: () => true,
      isFrameworkNative: () => true,
    },
  });

  /** THE SEAT DIAGNOSTIC (plan 25/26): every named lunar table's seat in this runtime. */
  const lunarSeatStatus = () => ({ chains: chainCycles.seatStatus(), carriers: moonArgs.carrierSeatStatus() });
  return { deepCalendar, frameworkDeltaTSecondsAtJD, j2000JD, jdTTFromUT, julianCenturyDays, moonArgs, moonSeries, moonSynodicMonthDays, recordLunarCumulativeBank, lunarSeatStatus };
}
/** @typedef {import('./time-axis.js').Ctx & ReturnType<typeof assembleLunarTheory>} Ctx */

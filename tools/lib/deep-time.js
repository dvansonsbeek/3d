// ═══════════════════════════════════════════════════════════════════════════
// DEEP-TIME CHAIN — the Node twin of the browser's mean*AtAge family
//
// The chain is assembled ONCE in
// @essrt/physics/deltat/deep-time-chain (the GIA α channel, the Layer-0
// bundle, the cited Moon-distance history, the ΔT cycle stack, |s₃|, the
// LOD/ΔT core and the lunar month chain, from the generated constants and
// fitted coefficients). This module destructures it and keeps only what is
// the Node engine's own: the two env gates on the ΔT stack, the deep-time
// calendar and the scene's pos↔JD grid, and the year lengths of date on the
// one-source movement. Every export name of the pre-B2 module is kept.
//
// Conventions: t_Ma is AGE in Myr (positive = past); every function returns
// its J2000 anchor bit-exactly at t_Ma = 0; the scene-anchored readers
// (h5Correction, frameworkDeltaT) convert from the scene epoch startmodelYear
// (2000.5), the Layer-0 axis from 2000 (the ONE place that conversion lives).
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
const _modCache = Object.create(null);
const _req = (p) => _modCache[p] || (_modCache[p] = require(p));

// ─── The env gates (the Node engine's own) ──────────────────────────────────
// DT_CORRECTIONS_DISABLED=1 bypasses the four cycle terms of the ΔT stack
// (tools/fit/dt-corrections-fit.js reads the raw pure-tidal residual that way);
// DT_RESONATOR_DISABLED=1 opts out of the Core-mantle swing. The swing's ΔT
// term needs both ON; its δLOD terms follow the resonator gate alone; the four
// cycles' δLOD terms are never gated (the browser twin sums them the same way).
const DT_CORRECTIONS_ENABLED = process.env.DT_CORRECTIONS_DISABLED !== '1';
const DT_RESONATOR_ENABLED = process.env.DT_RESONATOR_DISABLED !== '1';
const _flags = Object.freeze({
  bond: DT_CORRECTIONS_ENABLED, hallstatt: DT_CORRECTIONS_ENABLED, jose5: DT_CORRECTIONS_ENABLED, jose4: DT_CORRECTIONS_ENABLED,
  resonator: DT_RESONATOR_ENABLED, resonatorDeltaT: DT_CORRECTIONS_ENABLED && DT_RESONATOR_ENABLED,
});

// ─── The chain ──────────────────────────────────────────────────────────────
const P = _req('@essrt/physics');
const { DEEP_MODES_ARTIFACT } = _req('@essrt/physics/moon/deep-modes-artifact');
const { MOON_DISTANCE_ARTIFACT } = _req('@essrt/physics/deltat/moon-distance-artifact');
const _planetAuRatios = {};
for (const k of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) _planetAuRatios[k] = C.derived[k].orbitDistance;
const chain = P.createDeepTimeChain({
  constants: P.DEFAULT_CONSTANTS,
  fitted: P.FITTED_COEFFICIENTS,
  deepModes: DEEP_MODES_ARTIFACT,
  moonDistanceArtifact: MOON_DISTANCE_ARTIFACT,
  ageAnchorYear: C.startmodelYear,
  flagsAt: () => _flags,
  planetAuRatios: _planetAuRatios,
  stellarDayRaProjection: C.STELLAR_DAY_RA_PROJECTION,
});

const {
  EPOCH_PARAMS, earthMoiFactorAtAge, iEarthAtAge, withLatticeAlpha: _withLatticeAlpha, withShippedAlpha: _withShippedAlpha,
  certifiedAxialPrecessionJ2000Years, precessionRateJ2000ArcsecPerYr, j2RatioAtYear,
  meanMoonDistanceMetresAtAge, meanMoonDistanceAtAge, meanLodSecondsAtAge, meanLodHoursAtAge,
  meanLunisolarPrecessionRateArcsecPerYrAtAge, meanLunisolarPrecessionPeriodYearsAtAge,
  meanLunisolarTorqueRateArcsecPerYrAtAge, meanLunisolarTorquePeriodYearsAtAge, precessionObliquityFactorAtAge, meanObliquityCitedDegAtAge,
  meanAuAtAge, meanSiderealYearSecondsAtAge, meanTropicalYearSecondsAtAge, meanTropicalYearDaysAtAge, meanYearInDaysAtAge,
  meanDeltaTSecondsAtAge, meanDeltaTSecondsAtAges,
  bondCycleDeltaTCorrection, hallstattCycleDeltaTCorrection, jose5CycleDeltaTCorrection, jose4CycleDeltaTCorrection,
  bondCycleLodCorrection, hallstattCycleLodCorrection, jose5CycleLodCorrection, jose4CycleLodCorrection,
  dtCycleLodCorrectionSum, resonatorSwingDeltaTCorrection, resonatorSwingLodCorrection, resonatorSwingLodRate,
  dLodDtDecompositionAtAge, h5Correction, computeLodKinematicSecondsAtEpoch, computeLodRealSecondsAtEpoch,
  meanSolarDeltaAAtAge, meanMoonDistanceCorrectedAtAge, meanMoonSiderealMonthAtAge, meanSynodicMonthAtAge, meanTropicalMonthAtAge,
  meanLunarPerigeePrecessionAtAge, meanLunarNodePrecessionAtAge, meanAnomalisticMonthAtAge, meanNodalMonthAtAge,
  meanApsidalMeetsNodalAtAge, meanLunarLevelingCycleAtAge, meanSiderealDayAtAge, meanPlanetSemiMajorAxisAtAge,
} = chain;

// The Node twin's stellar day projects the precession offset onto the equator
// (the browser's does not) — the chain carries both; this engine keeps its own.
const meanStellarDayAtAge = chain.meanStellarDayProjectedAtAge;

/** LOD with the corrections stack applied; the pure-tidal LOD under DT_CORRECTIONS_DISABLED=1. */
function meanLodSecondsWithCorrectionsAtAge(t_Ma) {
  if (!DT_CORRECTIONS_ENABLED) return meanLodSecondsAtAge(t_Ma);
  return chain.meanLodSecondsWithCorrectionsAtAge(t_Ma);
}

/** ΔT in seconds at a JD (0 where the chain is undefined). */
function frameworkDeltaT(jd) {
  const t_Ma = (C.startmodelYear - C.jdToYear(jd)) / 1e6;
  const dT = meanDeltaTSecondsAtAge(t_Ma);
  return Number.isFinite(dT) ? dT : 0;
}

// Anchor constants under their pre-B2 names (the chain's scalars).
const MEAN_SIDEREAL_YEAR_J2000_S = chain.meanSiderealYearSeconds;
const MEAN_TROPICAL_YEAR_J2000_S = chain.meanTropicalYearJ2000Seconds;
const LOD_NOW_H13_S = chain.meanLengthOfDay;
const SI_TROPICAL_YEAR_DAYS = chain.siTropicalYearDays;
const A_MOON_NOW_M = EPOCH_PARAMS.moonDistanceNowM;
const A_LOCK_M = EPOCH_PARAMS.moonLockDistanceM;
const MOON_APSIDAL_J2000_S = chain.moonApsidalJ2000Seconds;
const MOON_NODAL_J2000_S = chain.moonNodalJ2000Seconds;
const MOON_SIDEREAL_MONTH_J2000_S = chain.moonSiderealMonthJ2000Seconds;
const SOLAR_MASS_LOSS_FRAC_PER_YR = EPOCH_PARAMS.solarMassLossFracPerYear;
const PRECESSION_SOLAR_SHARE_J2000 = EPOCH_PARAMS.precessionSolarShareJ2000;
const ALPHA_1 = EPOCH_PARAMS.alpha1PerMa;
const ALPHA_CLIMATE_SCALE = chain.alphaGia.kPerPermille;
const _deepEcc = () => chain.deepEcc;

const meanMercurySemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('mercury', t);
const meanVenusSemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('venus', t);
const meanEarthSemiMajorAxisAtAge = (t) => meanAuAtAge(t);
const meanMarsSemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('mars', t);
const meanJupiterSemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('jupiter', t);
const meanSaturnSemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('saturn', t);
const meanUranusSemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('uranus', t);
const meanNeptuneSemiMajorAxisAtAge = (t) => meanPlanetSemiMajorAxisAtAge('neptune', t);

// ─── The year lengths of date on the one-source movement ───────────────────
const ONE_FAMILY_WINDOW_YEARS_DT = _req('@essrt/physics/earth/year-lengths').ONE_FAMILY_WINDOW_YEARS;
let _oneSourceYearLengthsM = null;
/** The one-source movement's year-length family (lazy; null when the governed series is absent). */
function _oneSourceYearLengths() {
  if (_oneSourceYearLengthsM === null) {
    const M = require('./deep-orbital-history.js').createOneSourceMovement();
    _oneSourceYearLengthsM = M ? M.yearLengths : false;
  }
  return _oneSourceYearLengthsM || null;
}
/** Sidereal year of date in days of the epoch — the published SI sidereal year over the kinematic day of date. */
function siderealYearDaysOfDate(year) {
  const M = _oneSourceYearLengths();
  const s = M && Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS_DT ? M.siderealYearSecondsAtYear(year)
    : (chain.l0.siderealYearSeconds(year) ?? C.meanSiderealYearSeconds);
  return s / computeLodKinematicSecondsAtEpoch(year);
}
/** Tropical year of date in days of the epoch. */
function tropicalYearDaysOfDate(year) {
  const M = _oneSourceYearLengths();
  const s = M && Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS_DT ? M.tropicalYearSecondsAtYear(year)
    : meanTropicalYearSecondsAtAge((C.startmodelYear - year) / 1e6);
  return s / computeLodKinematicSecondsAtEpoch(year);
}
/** Anomalistic year of date in days of the epoch — NaN beyond the one-family window. */
function anomalisticYearDaysOfDate(year) {
  const M = _oneSourceYearLengths();
  const s = M && Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS_DT ? M.anomalisticYearSecondsAtYear(year) : NaN;
  return s / computeLodKinematicSecondsAtEpoch(year);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DEEP-TIME GRID — the pos table and the deep calendar (the browser's twin)
// ═══════════════════════════════════════════════════════════════════════════
// The grid spans THE NAVIGABLE DOMAIN (ONE home, @essrt/physics time/navigable-domain — the browser's
// pos table reads the same two numbers; beyond the former ±500 Myr edge the two directions
// extrapolated differently, doc 111 §1.33).
const { NAVIGABLE_PAST_YEARS: _NAV_PAST, NAVIGABLE_FUTURE_YEARS: _NAV_FUTURE } = _req('@essrt/physics/time/navigable-domain');
const _CUMUL_INTEGRAL_YEAR_MIN = -_NAV_PAST;
const _CUMUL_INTEGRAL_YEAR_MAX = _NAV_FUTURE;
const _CUMUL_INTEGRAL_STEP = 10000;

// Year↔JD under deep time: ONE implementation, @essrt/physics/phase/deep-calendar;
// each engine builds it from its own grid, days-per-year source and α pin.
const { createDeepCalendar } = _req('@essrt/physics/phase/deep-calendar');
let _deepCalM = null;
function _deepCal() {
  if (_deepCalM !== null) return _deepCalM;
  _deepCalM = createDeepCalendar({
    meanYearInDaysAtAgeMa: meanYearInDaysAtAge,
    meanTropicalYearDaysAtAgeMa: meanTropicalYearDaysAtAge,
    withLatticeAlpha: _withLatticeAlpha,
    withShippedAlpha: _withShippedAlpha,
    deltaTSecondsAtAges: meanDeltaTSecondsAtAges,
    startModelJD: C.startmodelJD,
    startModelYear: C.startmodelYear,
    startModelYearWithCorrection: C.startmodelYear,
    siTropicalYearDays: SI_TROPICAL_YEAR_DAYS,
    yearMin: _CUMUL_INTEGRAL_YEAR_MIN,
    yearMax: _CUMUL_INTEGRAL_YEAR_MAX,
    stepYears: _CUMUL_INTEGRAL_STEP,
  });
  return _deepCalM;
}
/** SI-tropical-year label for a JD, anchored at the scene epoch (NOT a calendar year). */
const _jdToSIyear = (jd) => _deepCal().jdToSIyear(jd);
/** The exact inverse. */
function siYearToJD(ySI) { return _deepCal().siYearToJD(ySI); }
/** Calendar year → JD, integrating days-per-year from startmodelYear; null outside the table domain.
 *  (constants.js exports a SNAPSHOT `yearToJD`, linear in meanSolarYearDays — the two disagree by −465 d at −100 kyr.) */
function yearToJDDeepTime(year) { return _deepCal().yearToJD(year); }

// Scene time coordinate ↔ JD (R4, plan 27 — doc 111 §1.36): `pos` counts TROPICAL YEARS OF DATE
// since startmodelJD; the Julian Day it maps to is the UT one — a count of SOLAR days of date,
// the day the UT clock counts — on the package calendar's position table (ONE home, shared with
// the browser twin and the model's own UT→TT bridge; the former local table integrated SI days
// per year, so beyond the era its label parted from the age the physics drew by ΔT itself:
// 123 yr at −1 Myr, 341 Myr at −2 Gyr). Out of domain → null, the caller falls back.

/** Scene time coordinate → the UT Julian Date (solar days of date); pos = 0 returns startmodelJD exactly; null out of domain. */
function jdFromPos(pos) {
  if (!Number.isFinite(pos)) return null;
  return _deepCal().yearToJDUT(C.startmodelYear + pos);
}

/** UT Julian Date → scene time coordinate; the exact inverse of jdFromPos; null out of domain. */
function posFromJD(jd) {
  if (!Number.isFinite(jd)) return null;
  const year = _deepCal().jdUTToYear(jd);
  return year === null ? null : year - C.startmodelYear;
}

/** The TT instant of a scene time coordinate (SI days of the same position); null out of domain. */
function jdTTFromPos(pos) {
  if (!Number.isFinite(pos)) return null;
  return _deepCal().yearToJDTT(C.startmodelYear + pos);
}

/** THE BRIDGE: ΔT (seconds, the curve without the J2000 anchor) at a UT Julian Date through the
 *  package calendar's implicit solve — the raw integral at the TT age the UT count has reached,
 *  the era corrections at the civil year; null out of the table's domain. */
function deltaTSecondsAtJdUT(jdUT) { return _deepCal().deltaTSecondsAtJdUT(jdUT); }

/** The navigable position range {posMin, posMax} — the calendar's position table's finite extent. */
function navigablePosRange() {
  const r = _deepCal().navigableYearRange();
  return { posMin: r.yearMin - C.startmodelYear, posMax: r.yearMax - C.startmodelYear };
}

// ─── Exports (every pre-B2 name kept) ──────────────────────────────────────
module.exports = {
  _deepEcc,
  EPOCH_PARAMS,
  _jdToSIyear, siYearToJD, yearToJDDeepTime, SI_TROPICAL_YEAR_DAYS,
  posFromJD, jdFromPos, jdTTFromPos, navigablePosRange, deltaTSecondsAtJdUT,
  MEAN_SIDEREAL_YEAR_J2000_S, MEAN_TROPICAL_YEAR_J2000_S, LOD_NOW_H13_S, A_MOON_NOW_M, A_LOCK_M,
  MOON_APSIDAL_J2000_S, MOON_NODAL_J2000_S, MOON_SIDEREAL_MONTH_J2000_S, SOLAR_MASS_LOSS_FRAC_PER_YR,
  earthMoiFactorAtAge, iEarthAtAge,
  meanMoonDistanceMetresAtAge, meanMoonDistanceAtAge,
  meanLodSecondsAtAge, meanLodHoursAtAge,
  meanLunisolarPrecessionRateArcsecPerYrAtAge, meanLunisolarPrecessionPeriodYearsAtAge,
  meanLunisolarTorqueRateArcsecPerYrAtAge, meanLunisolarTorquePeriodYearsAtAge, precessionObliquityFactorAtAge, meanObliquityCitedDegAtAge,
  PRECESSION_SOLAR_SHARE_J2000, precessionRateJ2000ArcsecPerYr, certifiedAxialPrecessionJ2000Years,
  j2RatioAtYear,
  meanAuAtAge, meanSiderealYearSecondsAtAge, meanTropicalYearSecondsAtAge,
  meanTropicalYearDaysAtAge, meanYearInDaysAtAge,
  meanDeltaTSecondsAtAge, frameworkDeltaT,
  bondCycleDeltaTCorrection, hallstattCycleDeltaTCorrection, jose5CycleDeltaTCorrection, jose4CycleDeltaTCorrection,
  bondCycleLodCorrection, hallstattCycleLodCorrection, jose5CycleLodCorrection, jose4CycleLodCorrection,
  dtCycleLodCorrectionSum,
  siderealYearDaysOfDate, tropicalYearDaysOfDate, anomalisticYearDaysOfDate,
  h5Correction, computeLodKinematicSecondsAtEpoch, computeLodRealSecondsAtEpoch,
  resonatorSwingDeltaTCorrection, resonatorSwingLodCorrection, resonatorSwingLodRate,
  DT_RESONATOR_ENABLED,
  meanLodSecondsWithCorrectionsAtAge,
  dLodDtDecompositionAtAge,
  ALPHA_CLIMATE_SCALE,
  ALPHA_1,
  meanSolarDeltaAAtAge, meanMoonDistanceCorrectedAtAge,
  meanMoonSiderealMonthAtAge, meanSynodicMonthAtAge, meanTropicalMonthAtAge,
  meanLunarPerigeePrecessionAtAge, meanLunarNodePrecessionAtAge,
  meanAnomalisticMonthAtAge, meanNodalMonthAtAge,
  meanApsidalMeetsNodalAtAge, meanLunarLevelingCycleAtAge,
  meanStellarDayAtAge, meanSiderealDayAtAge,
  meanPlanetSemiMajorAxisAtAge,
  meanMercurySemiMajorAxisAtAge, meanVenusSemiMajorAxisAtAge,
  meanEarthSemiMajorAxisAtAge, meanMarsSemiMajorAxisAtAge,
  meanJupiterSemiMajorAxisAtAge, meanSaturnSemiMajorAxisAtAge,
  meanUranusSemiMajorAxisAtAge, meanNeptuneSemiMajorAxisAtAge,
};

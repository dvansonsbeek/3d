/**
 * The certified Sun and the eclipse tier — the mean longitude of date, the finders, the planetary completion, the besselian location tier.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { DAYS_PER_JULIAN_YEAR, SECONDS_PER_DAY } from '../constants/units.cjs';
import { createBesselian } from '../eclipse/besselian.cjs';
import { createEclipseFinders } from '../eclipse/finders.cjs';
import { createEclipseFormula } from '../eclipse/formula.cjs';
import { composeEclipticInclinationDeg } from '../moon/plane-of-date.cjs';
import { computeCarrierRatesDegPerCy, createSunPlanetaryCompletion } from '../eclipse/sun-planetary-completion.cjs';

/** @param {import('./sun-mean-longitude.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleSunAndEclipses(ctx) {
  const {
    C, F, late, MASS_RATIO_EARTH_MOON, chain, currentAUDistance, deepCalendar, frameworkDeltaTSecondsAtJD, j2000JD,
    julianCenturyDays, meanSiderealYearDays, moonArgs, moonDistanceKm, moonSeries,
    moonSiderealMonthInput, moonSynodicMonthDays, sceneObliquityDeg, sunEccentricityAt,
    sunPerihelionDegAt, sunL0Deg, sunMeanLongitudeDegAt, sunTropicalRateDegPerCy,
  } = ctx;
  // The certified Sun's mean longitude of date (L0, the tropical rate and the banked integral of the
  // one-family tropical year) is its OWN slice, sun-mean-longitude.js — the lunar cumulative bank hashes
  // that slice and not this one (plan 33's close-out rider). The finders, the derived planetary
  // completion and the besselian location tier are wired on it here; e(t) and ϖ(t) are the eclipse
  // Sun's mean elements of date (earth-scalars.js: the one-source series plus the derived mean offset).
  // The lunar arguments' Sun perihelion of date is the eclipse Sun's mean
  // perihelion (`sunPerihelionDegAt`) read DIRECTLY, wrapped.
  // Every consumer wraps the argument it enters (M = Lsun − ϖ − 180) or
  // differences it over ±25 days (the rate anchors, wrapped to ±180°), so
  // no continuous angle is needed. MEASURED: a 100-yr unwrapping ladder
  // (two series reads per rung, 53,400 rungs at −5.34 Myr) cost the cold
  // deep jump 1,062 s — 343× the in-table jump against the perf gate's 8× —
  // for a value the consumers reduced mod 360 anyway.

  // Eclipse finders — wired like the engine probe (tools/verify/
  // eclipse-audit.js). The finder axis is JD(UT): the series wrapper applies
  // UT→TT internally. Ground-track/umbra paths deliberately absent: the
  // scene-umbra projection navigates the Tychosium-derived scaffold, which
  // never enters this package (§2h).
  const eclipseFinders = createEclipseFinders({
    moonLonDegAt: /** @param {number} jd */ (jd) => moonSeries.truncatedLonDeg(jd),
    moonBetaDegAt: /** @param {number} jd */ (jd) => moonSeries.truncatedBetaDeg(jd),
    moonDistanceKmAt: /** @param {number} jd */ (jd) => moonSeries.truncatedDistanceKm(jd),
    deltaTSecondsAt: frameworkDeltaTSecondsAtJD,
    getSynodicMonthDays: () => moonSynodicMonthDays,
    getSunDistanceKm: () => currentAUDistance,
    frameworkSun: {
      sunMeanLongitudeJ2000Deg: sunL0Deg,
      tropicalRateDegPerCy: sunTropicalRateDegPerCy,
      eccentricityAt: sunEccentricityAt,
      perihelionLongitudeDegAt: sunPerihelionDegAt,
      meanLongitudeDegAt: sunMeanLongitudeDegAt,
    },
    constants: {
      rEarthMetres: (C.bodyDiametersKm.earth / 2) * 1000,
      moonDiameterKm: C.bodyDiametersKm.moon,
      sunDiameterKm: C.bodyDiametersKm.sun,
      j2000JD,
      julianCenturyDays,
    },
  });

  // PLAN 33 — the eclipse formula of date: the finders' condition in closed form on the model's
  // arguments of date (eclipse/formula.cjs, the ONE home of the shadow geometry the finders
  // classify with). The same truncated series, the same Sun, the same ΔT bridge as the finders;
  // the mean elongation from the lunar arguments' cumulative counts; TT → UT through the deep
  // calendar's ΔT at a TT instant; the periods, the mean Moon distance and the orbit's inclination
  // of date from the chain (the Laplace-plane regime's composed inclination at the node of date).
  const DAYS_PER_YEAR = julianCenturyDays / 100;
  /** @param {number} jdTT @returns {number} the engine age in Myr before J2000 */
  const ageMaOfTT = (jdTT) => (j2000JD - jdTT) / DAYS_PER_YEAR / 1e6;
  const eclipseFormula = createEclipseFormula({
    moonLonDegAt: /** @param {number} jd */ (jd) => moonSeries.truncatedLonDeg(jd),
    moonBetaDegAt: /** @param {number} jd */ (jd) => moonSeries.truncatedBetaDeg(jd),
    moonDistanceKmAt: /** @param {number} jd */ (jd) => moonSeries.truncatedDistanceKm(jd),
    sunLonDegAt: /** @param {number} jd */ (jd) => eclipseFinders.sunLonDegAt(jd),
    deltaTSecondsAt: frameworkDeltaTSecondsAtJD,
    // the one bridge's inverse: ΔT at the TT instant (phase/deep-calendar); the era fallback where
    // the table is absent (a legacy engine) is one fixed-point step on the UT reading
    jdUTFromTT: /** @param {number} jdTT */ (jdTT) => {
      const dT = deepCalendar.deltaTSecondsAtJdTT(jdTT);
      return dT !== null && Number.isFinite(dT) ? jdTT - dT / SECONDS_PER_DAY : jdTT - frameworkDeltaTSecondsAtJD(jdTT) / SECONDS_PER_DAY;
    },
    // the engine year of a TT instant, the deep calendar's exact inverse of its TT table (ONE home) —
    // the formula's regime read; it falls back to the linear Julian form where the table is absent
    jdTTToYear: /** @param {number} jdTT */ (jdTT) => deepCalendar.jdTTToYear(jdTT),
    meanElongationUnwrappedDegAt: /** @param {number} jdTT */ (jdTT) => moonArgs.meanElongationUnwrappedDeg(jdTT),
    argsAt: /** @param {number} jdTT */ (jdTT) => moonArgs.argsAt(jdTT),
    getSunDistanceKm: () => currentAUDistance,
    periodsOfDateAt: /** @param {number} jdTT */ (jdTT) => {
      if (!chain) return null;
      const tMa = ageMaOfTT(jdTT);
      /** @param {number | null | undefined} v @returns {number} */
      const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
      const syn = num(chain.meanSynodicMonthAtAge(tMa)), drac = num(chain.meanNodalMonthAtAge(tMa)), anom = num(chain.meanAnomalisticMonthAtAge(tMa));
      const sid = num(chain.meanMoonSiderealMonthAtAge(tMa)), trop = num(chain.meanTropicalYearSecondsAtAge(tMa)), sidY = num(chain.meanSiderealYearSecondsAtAge(tMa));
      const lod = num(chain.meanSolarDaySecondsAtAge(tMa)), dist = num(chain.meanMoonDistanceCorrectedAtAge(tMa));
      const tilt = num(chain.meanLaplaceTiltFromEclipticDegAtAge(tMa)), free = num(chain.meanLunarFreeInclinationDegAtAge(tMa));
      if ([syn, drac, anom, sid, trop, sidY, lod, dist, tilt, free].some(Number.isNaN)) return null;
      const a = moonArgs.argsAt(jdTT);
      const nodeDeg = ((a.Lp - a.F) % 360 + 360) % 360;   // the node of date, Ω = L′ − F
      return {
        synodicDays: syn / SECONDS_PER_DAY, draconicDays: drac / SECONDS_PER_DAY, anomalisticDays: anom / SECONDS_PER_DAY, siderealMonthDays: sid / SECONDS_PER_DAY,
        tropicalYearDays: trop / SECONDS_PER_DAY, siderealYearDays: sidY / SECONDS_PER_DAY, solarDayDays: lod / SECONDS_PER_DAY,
        moonDistanceKm: dist, inclinationDeg: composeEclipticInclinationDeg(free, tilt, nodeDeg), laplaceTiltDeg: tilt,
      };
    },
    jdTTDomain: () => {
      const r = deepCalendar.navigableYearRange();
      const lo = Number.isFinite(r.yearMin) ? deepCalendar.yearToJDTT(r.yearMin) : null, hi = Number.isFinite(r.yearMax) ? deepCalendar.yearToJDTT(r.yearMax) : null;
      return { min: lo === null ? -Infinity : lo, max: hi === null ? Infinity : hi };
    },
    constants: {
      rEarthMetres: (C.bodyDiametersKm.earth / 2) * 1000,
      moonDiameterKm: C.bodyDiametersKm.moon,
      sunDiameterKm: C.bodyDiametersKm.sun,
      j2000JD,
      julianCenturyDays,
      synodicMonthDaysJ2000: moonSynodicMonthDays,   // the registry's synodic month: the mean rate's fallback where no period of date exists
    },
  });

  // 20.3g — the solar-eclipse LOCATION tier: shadow geometry on the FULL
  // series (sceneEvalAt — the truncated finder forms omit the fitted Lp
  // anchor and the −2235·sin(Lp) β family, deliberate for finder
  // statistics, required here) at the model's ABSOLUTE TT (deltaTStart +
  // curve, the same convention every other ΔT consumer reads). Both axis
  // conventions are measured against the NASA path-table centerlines —
  // see eclipse/besselian.cjs.
  // Derived Earth-around-EMB wobble for the Sun completion: a_M·μ/AU,
  // μ = 1/(1+M_E/M_M) — 6.4399″ at current constants, tracks them live.
  const embWobbleArcsec = (moonDistanceKm / (MASS_RATIO_EARTH_MOON + 1) / currentAUDistance)
    * (648000 / Math.PI);
  // FQ-5 N3 — the completion's carriers are FRAMEWORK-derived from the
  // model's own planet period records (the Moon-elongation rate from the
  // sidereal month/year identity). The carriers are SIDEREAL
  // (measured): the records' orbitalPeriodInputDays are OF-DATE periods (their
  // rates sit +1.39..1.62°/cy above the VSOP sidereal mean motions — the
  // framework precession plus input rounding), and a perturbation argument
  // is inertial (D'Alembert: only Σk = 0 arguments are frame-free), so on
  // of-date carriers every Σk ≠ 0 argument drifted by Σk·ψ(t) — 42..52° at
  // −3000 for the table's Σk = −1 terms (their ancient scatter against
  // Horizons 6.4 → 4.4″ on sidereal carriers), and 6 % of frequency for the
  // 1783-yr long inequality (1683 yr on the of-date carriers). Constant-free:
  // the record rate minus the model's own J2000 precession p₀ =
  // 360·36525·(1/T_trop − 1/T_sid) for the planets, the framework sidereal
  // year for Earth; identical to the N3 carriers at J2000 (same phase
  // anchors), ≤ 1.4°·|Σk| apart at the 200-yr extraction window's edges
  // (the composed table reproduces the N3 one there: JPL 1900–2100
  // all-phase sd unchanged to 0.01″). The parity gate's fingerprint mirrors
  // this arithmetic (test/create-model-parity.test.mjs).
  // PLAN 06 I3 — the carriers are the model's own banked J2000 sidereal mean
  // motions (the embedded sun-completion artifact; ONE home,
  // computeCarrierRatesDegPerCy — the former record-based arithmetic sat
  // 4.1″/yr off for Venus, 1.7″/yr for Jupiter: 83° of the Venus–Earth
  // argument at ±9000 yr), Earth the framework sidereal year, the Moon
  // elongation from the sidereal month/year identity. The long-period rows
  // ride the embedded e-vectors of date, and the lunar equation rides the
  // framework's own Moon elongation of date (ṅ included) — the constant-rate
  // carrier ran ~29° off it at ±9000 yr.
  const carrierRatesDegPerCy = computeCarrierRatesDegPerCy({ meanSiderealYearDays, moonSiderealMonthDays: moonSiderealMonthInput });
  // PLAN 32 FOLLOW-UP (doc 112 §5, TODO item 3) — the lunar equation as the EXACT geometry of the
  // model's own Moon, zero fitted constants: the Earth sits at EMB − μ·R_M (μ = 1/(1+M_E/M_M)), so
  // the geocentric Sun's longitude is the EMB-centric one turned by atan2(ρ·sin Δ, r_S + ρ·cos Δ)
  // with ρ = μ·r_M·cos β_M (the full lunar series of date) and Δ = λ_M − λ_S, λ_S the Sun's true
  // longitude on its own L(t), e(t), ϖ(t) (the Earth's perihelion + 180°; the equation of centre to
  // e³), r_S its distance of date on the same elements. The carrier form embWobbleArcsec·sin D
  // carried only the leading term: the sweep read its missing sidebands against Horizons in every
  // window — D − M′ 0.44″, D + M′ 0.18″ (the Moon's equation of centre and distance), D − M 0.19″,
  // D + M 0.07″ (the Sun's), the D line itself 0.03″; on the exact geometry all five read ≤ 0.04″
  // and the 1700–2000 window rms 1.627 → 1.586″ (tools/explore/residual-spectra, the sweep's §5).
  const MU_MOON = 1 / (1 + MASS_RATIO_EARTH_MOON), D2R = Math.PI / 180, ARCSEC_PER_RAD = 648000 / Math.PI;
  const embWobbleArcsecAtT = /** @param {number} T Julian centuries TT from J2000 @returns {number} arcsec */ (T) => {
    const year = 2000 + 100 * T;   // the engine year (Julian years from J2000 on the TT axis)
    const ev = moonSeries.sceneEvalAt(T * julianCenturyDays);
    const e = sunEccentricityAt(year), periSunDeg = sunPerihelionDegAt(year) + 180;
    const M = (sunMeanLongitudeDegAt(year) - periSunDeg) * D2R;
    const nu = M + (2 * e - e * e * e / 4) * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M) + (13 / 12) * e * e * e * Math.sin(3 * M);
    const rS = currentAUDistance * (1 - e * e) / (1 + e * Math.cos(nu));
    const rho = MU_MOON * ev.distKm * Math.cos(ev.latDeg * D2R), dl = (ev.lonDeg - periSunDeg) * D2R - nu;
    return Math.atan2(rho * Math.sin(dl), rS + rho * Math.cos(dl)) * ARCSEC_PER_RAD;
  };
  const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({
    embWobbleArcsec,
    carrierRatesDegPerCy,
    moonElongationDegAtT: /** @param {number} T */ (T) => moonArgs.argsAt(j2000JD + T * julianCenturyDays).D,
    embWobbleArcsecAtT,
  });
  const besselian = createBesselian({
    moonFullAtDaysTT: /** @param {number} dDaysTT */ (dDaysTT) => {
      const ev = moonSeries.sceneEvalAt(dDaysTT);
      return { lonDeg: ev.lonDeg, latDeg: ev.latDeg, distKm: ev.distKm };
    },
    sunLonDegAt: /** @param {number} jdUT */ (jdUT) => eclipseFinders.sunLonDegAt(jdUT),
    sunCompletionDeg: sunPlanetaryCompletionDeg,
    // The location tier on APPARENT places — the Sun's derived κ
    // (the same helper the cardinal instants use), the Moon's relative light-time
    // inside the besselian; the series-extension tail now lives in sceneEvalAt.
    sunAberrationDegAt: /** @param {number} year */ (year) => late.sunAberrationArcsecAt(year) / 3600,
    deltaTSecondsAt: frameworkDeltaTSecondsAtJD,   // the ONE ΔT (doc 111 §1.31), never a JD difference
    // the DRAWN-scene obliquity (plan 31 A2): the hybrid inside its domain, the cited mean with
    // the hybrid's wobble beyond — the ground point sits where the drawn axis puts it (§1.34's class)
    obliquityDegAt: sceneObliquityDeg,
    eccentricityAt: sunEccentricityAt,
    perihelionLongitudeDegAt: sunPerihelionDegAt,
    // THE ENGINE YEAR of the UT JD (the TT Julian year — doc 111 §1.31's one axis), never the
    // SI-linear count year `yearFromJD` the tier read before v27.16: flat of-date quantities hid
    // the split (1.3 Gyr at the genesis, where the cited obliquity is undefined on the label's
    // age — the ground point landed 11° from the drawn axis; doc 111 §1.44)
    yearFromJD: /** @param {number} jdUT */ (jdUT) => 2000 + (jdUT + frameworkDeltaTSecondsAtJD(jdUT) / SECONDS_PER_DAY - j2000JD) / DAYS_PER_JULIAN_YEAR,
    constants: {
      j2000JD,
      julianCenturyDays,
      earthDiameterKm: C.bodyDiametersKm.earth,
      moonDiameterKm: C.bodyDiametersKm.moon,
      sunDiameterKm: C.bodyDiametersKm.sun,
      sunDistanceKm: currentAUDistance,
      earthFlatteningInverse: C.physicalConstants.earthFlatteningInverseWGS84,
      ttBridgeSeconds: F.DT_ANCHOR.deltaTStartSeconds,
      gmstMeanSiderealT0Deg: C.physicalConstants.gmstMeanSiderealT0Deg,
      gmstMeanSiderealRateDegPerDay: C.physicalConstants.gmstMeanSiderealRateDegPerDay,
      gmstMeanSiderealT2Deg: C.physicalConstants.gmstMeanSiderealT2Deg,
      speedOfLightKmS: C.physicalConstants.speedOfLight,
    },
  });

  return { besselian, eclipseFinders, eclipseFormula, sunPlanetaryCompletionDeg };
}
/** @typedef {import('./sun-mean-longitude.js').Ctx & ReturnType<typeof assembleSunAndEclipses>} Ctx */

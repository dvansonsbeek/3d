/**
 * The certified Sun and the eclipse tier — the mean longitude of date, the finders, the planetary completion, the besselian location tier.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { ONE_FAMILY_WINDOW_YEARS } from '../earth/year-lengths.cjs';
import { createBesselian } from '../eclipse/besselian.cjs';
import { createEclipseFinders } from '../eclipse/finders.cjs';
import { computeCarrierRatesDegPerCy, createSunPlanetaryCompletion } from '../eclipse/sun-planetary-completion.cjs';

/** @param {import('./lunar-theory.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleSunAndEclipses(ctx) {
  const {
    C, F, late, MASS_RATIO_EARTH_MOON, currentAUDistance, frameworkDeltaTSecondsAtJD, j2000JD, jdTTFromUT,
    julianCenturyDays, meanSiderealYearDays, meanSolarYearDays, moonArgs, moonDistanceKm, moonSeries,
    moonSiderealMonthInput, moonSynodicMonthDays, obliquityDeg, oneFamilyTropicalYearSeconds, sunEccentricityAt,
    sunPerihelionDegAt, yearFromJD,
  } = ctx;
  // The certified Sun — assembled from the model's own laws, ZERO fitted Sun
  // constants: e(t) and ϖ(t) are the eclipse Sun's mean elements of date
  // (earth-scalars.js: the one-source series plus the derived mean offset);
  // L(t) is the integral of the one-family tropical year (below). The
  // finders, the derived planetary completion and the besselian location
  // tier are wired on it; the sun-vs-horizons gate banks its modern-window
  // residual, the eclipse audit the finders' canon statistics.
  const sunL0Deg = C.earthOrbital.sunMeanLongitudeJ2000_deg;
  const sunTropicalRateDegPerCy = 360 * julianCenturyDays / meanSolarYearDays;
  const sunMeanLongitudeDegAt = (() => {
    // The Sun's mean longitude of date is the INTEGRAL of the one-source
    // tropical year: L(t) = L0 + 360·∫_{2000}^{t} dt′/T_trop(t′), T_trop the
    // one-family tropical year of date in SI seconds (one-source-movement.js).
    // MEASURED: it equals the IAU/Laskar drift expression to 0.1 s over
    // −1000..+3000. The smooth year cannot carry the Earth–Mars–Jupiter long
    // inequality (1783 yr, 6.3″); derived on the model's own N-body and
    // shipped in the planetary completion, the JPL instrument reads 1.03″
    // all-phase sd (Horizons ±3000 yr: modern-window mean +0.8″).
    // NUMERICS (rate vs point value): a cumulative trapezoid table of
    // cycles, yearly inside ±20,000 yr and per century beyond, grown on
    // demand from 2000 in both directions and interpolated inside a cell —
    // never a rate multiplied by a span. Beyond the one-family window the
    // tidal-chain year continues the integrand (the scene overlay ends at
    // 20,000 yr; the finders refuse out-of-domain epochs upstream).
    const JULIAN_YEAR_S = 365.25 * 86400;
    const tropSec = oneFamilyTropicalYearSeconds;
    const FINE_SPAN = 20000, COARSE_STEP = 100;
    /** cycles from 2000 to 2000 ± i·step (fwd/bwd tiers) */
    /** @type {number[]} */ const fwdFine = [0];
    /** @type {number[]} */ const bwdFine = [0];
    /** @type {number[]} */ const fwdCoarse = [];
    /** @type {number[]} */ const bwdCoarse = [];
    /** UNSIGNED trapezoid cycles over the span between two years (Julian
     *  years → SI seconds over the one-family year); the caller applies the
     *  direction sign. @param {number} ya @param {number} yb @returns {number} */
    const segAbs = (ya, yb) => 0.5 * (Math.abs(yb - ya) * JULIAN_YEAR_S) * (1 / tropSec(ya) + 1 / tropSec(yb));
    /** signed cycles from 2000 to `year` @param {number} year @returns {number} */
    const cyclesTo = (year) => {
      const dy = year - 2000;
      const s = dy >= 0 ? 1 : -1, a = Math.abs(dy);
      // WARM THE SAMPLER TO THE TARGET FIRST (measured): the
      // table below grows outward in 1-yr / 100-yr steps, and every step
      // beyond ~1.6 Myr enlarged the one-family sampler's >2-Myr tier just
      // past its span, rebuilding the whole deep integration about every 32
      // steps — ~125 rebuilds and 22 s for the first deep-epoch call (the
      // scene's first jump to −5 Myr), 0.4 ms once built. One read at the
      // clamped target builds the tier at its final span; the grid stores
      // are endpoint-independent, so every value is bit-identical.
      tropSec(2000 + s * Math.min(a, ONE_FAMILY_WINDOW_YEARS));
      const fine = s > 0 ? fwdFine : bwdFine;
      const growFine = (/** @type {number} */ upto) => { while (fine.length <= upto) { const k = fine.length; fine.push(fine[k - 1] + s * segAbs(2000 + s * (k - 1), 2000 + s * k)); } };
      if (a <= FINE_SPAN) {
        const i = Math.floor(a), f = a - i;
        growFine(i + 1);
        return fine[i] + f * (fine[i + 1] - fine[i]);
      }
      growFine(FINE_SPAN);
      const coarse = s > 0 ? fwdCoarse : bwdCoarse;
      if (coarse.length === 0) coarse.push(fine[FINE_SPAN]);
      const c = (a - FINE_SPAN) / COARSE_STEP, ci = Math.floor(c), cf = c - ci;
      while (coarse.length <= ci + 1) { const k = coarse.length; const y0 = 2000 + s * (FINE_SPAN + (k - 1) * COARSE_STEP); coarse.push(coarse[k - 1] + s * segAbs(y0, y0 + s * COARSE_STEP)); }
      return coarse[ci] + cf * (coarse[ci + 1] - coarse[ci]);
    };
    return /** @param {number} year @returns {number} */ (year) => sunL0Deg + 360 * cyclesTo(year);
  })();
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
  const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({
    embWobbleArcsec,
    carrierRatesDegPerCy,
    moonElongationDegAtT: /** @param {number} T */ (T) => moonArgs.argsAt(j2000JD + T * julianCenturyDays).D,
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
    deltaTSecondsAt: /** @param {number} jd */ (jd) => (jdTTFromUT(jd) - jd) * 86400,
    obliquityDegAt: obliquityDeg,
    eccentricityAt: sunEccentricityAt,
    perihelionLongitudeDegAt: sunPerihelionDegAt,
    yearFromJD,
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

  return { besselian, eclipseFinders, sunL0Deg, sunMeanLongitudeDegAt, sunPlanetaryCompletionDeg, sunTropicalRateDegPerCy };
}
/** @typedef {import('./lunar-theory.js').Ctx & ReturnType<typeof assembleSunAndEclipses>} Ctx */

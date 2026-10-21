/**
 * Cardinal instants — the apparent Sun (completed, aberrated, nutated) and the Newton crossings.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */

/** @param {import('./published-periods.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleCardinalInstants(ctx) {
  const {
    C, F, currentAUDistance, eclipseFinders, j2000JD, jdTTFromUT, julianCenturyDays, moonArgs, sunEccentricityAt,
    sunPlanetaryCompletionDeg, yearLengthsM,
  } = ctx;
  /** The completed certified Sun (finder Sun − the derived planetary
   *  completion) at a UT model-JD — the same longitude the scene renders
   *  inside the overlay window; MEAN GEOMETRIC, mean equinox of date.
   *  @param {number} jdUT @returns {number} */
  const sunLonCompletedDegAtJdUT = (jdUT) => eclipseFinders.sunLonDegAt(jdUT)
    - sunPlanetaryCompletionDeg((jdTTFromUT(jdUT) - j2000JD) / julianCenturyDays);
  /** The APPARENT Sun the cardinal instants are defined on (an equinox is
   *  the apparent Sun crossing the equator — the USNO/Meeus instants are
   *  apparent): the completed geometric Sun minus the aberration constant,
   *  plus the nutation in longitude. Both derived, zero new constants —
   *  κ = 2π·a/(c·T_sid·√(1−e²)) from the AU, c, the one-family sidereal year
   *  and the Sun's e (20.50″ at J2000); Δψ from the four IAU 1980 leading
   *  terms on the model's OWN lunar node, mean Sun and mean Moon (the
   *  framework arguments), the same family the registry's JPL Sun
   *  instrument bridges with. @param {number} jdUT @returns {number} */
  /** The Sun's derived aberration constant of date, arcsec — κ = 2π·a/(c·T_sid·√(1−e²))
   *  from the AU, c, the one-family sidereal year and the Sun's e (20.50″ at
   *  J2000); ONE home for the cardinal instants and the eclipse location tier.
   *  @param {number} year @returns {number} */
  const sunAberrationArcsecAt = (year) => {
    const e = sunEccentricityAt(year);
    return (2 * Math.PI * currentAUDistance
      / (C.physicalConstants.speedOfLight * yearLengthsM.siderealYearSecondsAtYear(year) * Math.sqrt(1 - e * e)))
      * (648000 / Math.PI);
  };
  /** @param {number} jdUT @returns {number} */
  const sunApparentLonDegAtJdUT = (jdUT) => {
    const jdTT = jdTTFromUT(jdUT);
    const year = 2000 + (jdTT - j2000JD) / 365.25;
    const kappaArcsec = sunAberrationArcsecAt(year);
    const a = moonArgs.argsAt(jdTT);
    const d2r = Math.PI / 180;
    const Om = (a.Lp - a.F) * d2r, Ls = (a.Lp - a.D) * d2r, Lm = a.Lp * d2r;
    const NU = C.physicalConstants.nutationLeadingTermsArcsec;
    const dPsiArcsec = NU.psiOmega * Math.sin(Om) + NU.psi2Ls * Math.sin(2 * Ls)
      + NU.psi2Lm * Math.sin(2 * Lm) + NU.psi2Omega * Math.sin(2 * Om);
    return sunLonCompletedDegAtJdUT(jdUT) + (dPsiArcsec - kappaArcsec) / 3600;
  };
  /** @param {string} type @returns {number} */
  const cardinalTargetDeg = (type) => {
    const t = { VE: 0, SS: 90, AE: 180, WS: 270 }[type];
    if (t === undefined) throw new RangeError(`cardinal type must be VE|SS|AE|WS, got ${type}`);
    return t;
  };
  const CARDINAL_SI_YEAR_D = 365.2422;
  /** The crossing NEAREST a seed instant — the unique root within ±½ tropical
   *  year of the seed (the wrapped longitude difference is the Newton residual).
   *  Plan 06 R4c: the seed is a JD because the caller's year may live on a
   *  different axis than the model year — the simulator's cardinal panel
   *  labels its year with the displayed CALENDAR date (the Julian calendar
   *  before 1582, 365.25-d years) while `year` below is the model year (the SI
   *  axis, 365.2422-d count from J2000); the two part by 0.0078 d/yr, 114 yr at
   *  −5.34 Myr, where the panel showed the events of −5341772 for a date in
   *  −5341886 (owner). Seeding at the calendar year's midpoint returns that
   *  year's own events at every epoch. @param {number} jdSeedUT @param {string} type @returns {number} */
  const cardinalCrossingNearJdUT = (jdSeedUT, type) => {
    const target = cardinalTargetDeg(type);
    const RATE = 360 / CARDINAL_SI_YEAR_D;
    let jd = jdSeedUT;
    for (let i = 0; i < 20; i++) {
      const d = ((((sunApparentLonDegAtJdUT(jd) - target) + 540) % 360 + 360) % 360) - 180;
      jd -= d / RATE;
      if (Math.abs(d) < 1e-10) break;
    }
    return jd - F.DT_ANCHOR.deltaTStartSeconds / 86400;
  };
  /** The TRUE-UT JD at which the APPARENT Sun's longitude of date equals
   *  the cardinal target in the given year — Newton on the crossing (the
   *  Sun's rate 360°/tropical year; a handful of steps from the tropical-year
   *  seed). Replaces the fitted cardinal model's instants (R1). Plan 06 R3
   *  item 2: the Newton root lives on the FINDER axis (the curve-only ΔT the
   *  eclipse finders certify), and the returned instant is that root minus the
   *  deltaTStart bridge — true UT = TT − (deltaTStart + curve), the same
   *  bridge the besselian and the registry instruments apply. Before this the
   *  published instants were 54.55 s (0.9 min) late. Against Horizons over
   *  ±3000 yr the remaining offset is the Sun's (plan 06 I2 measured).
   *  `year` is the MODEL year (the SI axis) — see cardinalCrossingNearJdUT.
   *  @param {number} year @param {string} type @returns {number} */
  const cardinalCrossingJdUT = (year, type) => {
    const target = cardinalTargetDeg(type);
    // seed: Jan 1.5 of the year (J2000 = 2000 Jan 1.5) + the mean date of the
    // March equinox (day 79.3) + the quarter-turns to the target
    const seed = j2000JD + (year - 2000) * CARDINAL_SI_YEAR_D + 79.3 + (target / 360) * CARDINAL_SI_YEAR_D;
    return cardinalCrossingNearJdUT(seed, type);
  };

  return { cardinalCrossingJdUT, cardinalCrossingNearJdUT, cardinalTargetDeg, sunAberrationArcsecAt, sunApparentLonDegAtJdUT };
}
/** @typedef {import('./published-periods.js').Ctx & ReturnType<typeof assembleCardinalInstants>} Ctx */

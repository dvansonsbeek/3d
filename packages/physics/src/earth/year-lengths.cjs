'use strict';
// THE ONE HOME for the of-date year lengths and their precession beats
// (owner: "analyze how many implementations we have and move to 1").
//
// Before this factory the family lived in four-plus places (the frozen
// Fourier laws, the λ̇ channel, per-surface cardinal-structure wirings
// with two different mean chains, and scene measurements mixed into
// beats) — and the owner caught the cost: a panel beat of 25,760.8 where
// the report said 25,771.4, because a 0.5 s FAMILY mismatch between the
// pair's members is amplified ~20×/s by P = T_s/(T_s − T_t).
//
// The rules this factory owns:
//   • ONE FAMILY: sidereal = the D6 λ̇ channel; tropical = the sidereal
//     year minus the movement's own GENERAL-PRECESSION rate of date (the
//     broken-angle equinox longitude, wobble included), in RATE form with
//     the sampler's Julian-year unit named; anomalistic = the tropical
//     year minus the movement's own equinox-referenced apsidal rate of
//     date (the same year-over-year reading — the scene's perihelion
//     passages ARE this movement); every value λ̇-corrected coherently
//     (rate form — beats invariant to second order).
//   • ONE BASIS: SI seconds (days = seconds/86400 at the caller); periods
//     in JULIAN years (the beat's duration ÷ 365.25 d — the unit the
//     frame's precession rate is quoted in, so 360°/rate and the pair's
//     beat are the SAME number; measured 2026-09: the dimensionless
//     T_sid/(T_sid − T_trop) counts TROPICAL years, 2.1e-5 off — 0.55 yr
//     on the axial period, 26 ms on the tropical year against the frame).
//   • BEATS FROM THE PAIR: each precession period is computed from the
//     two years THIS factory returns — recomputing a beat from the
//     displayed/served values reproduces it exactly.
//   • THE SCENE IS THE REFERENCE (owner, 2026-09-30: "all calculations
//     should match what we measure in the scene"): the scene's Sun
//     integrates the tropical year below and turns with this movement's
//     frame and apsidal line, so its measured sidereal, tropical and
//     anomalistic years reproduce this family to the millisecond once the
//     planetary completion terms are removed per event (the scene-sampled
//     gate, tools/verify/scene-year-lengths.js). Before this restatement
//     the scene read the law's sidereal year 26 ms short at J2000 and up
//     to 1 s off at depth (the projected equinox rate), and the published
//     anomalistic year rode the planet chain's secular tangent — seconds
//     from the scene's own perihelion passages within a few millennia,
//     395 s at +25 kyr where e passes 0.0034.
//   • The frozen era clock stays the certified era device (opt-out /
//     era-certification record), not a member of this family.

const { createCardinalStructure } = require('../cardinal/one-source-structure.cjs');
const { createSiderealYearChannel } = require('./sidereal-year-channel.cjs');

/** SI seconds in one Julian year — the sampler's time unit (t = years from J2000 TT, 365.25 d). */
const JULIAN_YEAR_SECONDS = 365.25 * 86400;

/**
 * @param {{
 *   sampleAt: (year: number) => {e: number, periOfDateDeg: number, equinoxLonJ2000Deg: number, generalPrecessionLonDeg: number},
 *   massLossSiderealSecondsAtYearFn: (year: number) => number,
 * }} opts
 *   sampleAt: the one-source movement sampler, keyed in the sampler's own
 *   year (Julian years from J2000 TT, 2000 = J2000; createDeepOrbitalHistory
 *   build().at wrapped by the caller — series tier where the artifact is
 *   available, mode tail beyond).
 *   massLossSiderealSecondsAtYearFn: the caller's secular mass-loss
 *   sidereal-year law, SI seconds, IAU-anchored at J2000.
 */
function createYearLengths({ sampleAt, massLossSiderealSecondsAtYearFn }) {
  if (typeof sampleAt !== 'function' || typeof massLossSiderealSecondsAtYearFn !== 'function') {
    throw new Error('createYearLengths: sampleAt and massLossSiderealSecondsAtYearFn are required');
  }
  const w180 = (/** @type {number} */ d) => ((d + 540) % 360) - 180;
  const chan = createSiderealYearChannel({ massLossSiderealSecondsAtYearFn });
  /** A year length from a longer year and a retrograde angular rate of the
   *  reference point, RATE form: 1/T = 1/T_long + p/(360°·JY) — exact (the
   *  linear T_long·(1 − p/360) drops (p/360)², 47 ms on the tropical year),
   *  with p in degrees per JULIAN year (the sampler's unit; read as "per
   *  tropical year" it was 26 ms short). @param {number} tLong @param {number} pDegPerJulianYr */
  const shorterYear = (tLong, pDegPerJulianYr) => 1 / (1 / tLong + pDegPerJulianYr / (360 * JULIAN_YEAR_SECONDS));
  /** The movement's own general precession of date, degrees per Julian
   *  year, retrograde positive — the year-over-year advance of the
   *  broken-angle equinox longitude (wobble included). @param {number} year */
  const generalPrecessionDegPerJulianYr = (year) =>
    w180(sampleAt(year - 0.5).generalPrecessionLonDeg - sampleAt(year + 0.5).generalPrecessionLonDeg);
  /** The movement's own apsidal rate of date RELATIVE TO THE EQUINOX (the
   *  climatic-precession rate, ~0.017°/yr at J2000), degrees per Julian
   *  year, prograde positive. @param {number} year */
  const apsidalVsEquinoxDegPerJulianYr = (year) =>
    w180(sampleAt(year + 0.5).periOfDateDeg - sampleAt(year - 0.5).periOfDateDeg);
  // The mean tropical year OF DATE, raw (pre-λ̇): the movement's own
  // general-precession rate — carries the real precession-rate wobble,
  // unlike the smooth secular mean (a wobble-free mean under a wobbling
  // family was one of the duplicated implementations this factory retires).
  const tropicalRawSeconds = (/** @type {number} */ year) =>
    shorterYear(massLossSiderealSecondsAtYearFn(year), generalPrecessionDegPerJulianYr(year));
  const structure = createCardinalStructure({
    sampleAt,
    tropicalYearSecondsAtYearFn: tropicalRawSeconds,
  });
  const trop = (/** @type {number} */ year) => chan.correctedYearSeconds(year, tropicalRawSeconds(year));
  const sid = (/** @type {number} */ year) => chan.siderealYearSecondsAtYear(year);
  // The anomalistic year OF DATE: the tropical year lengthened by the
  // movement's own apsidal advance against the equinox (a perihelion
  // passage is a pure mean-anomaly event — no equation-of-centre term), in
  // rate form, then λ̇-corrected coherently. This IS the scene: its apsidal
  // wheel turns with periOfDateDeg, and the scene's perihelion-to-perihelion
  // intervals read this form to 0.03–0.13 s at every sampled epoch. The
  // former construction on the planet chain's secular apsidal tangent (the
  // same family as the Perihelion Longitudes Prec. cell) agreed at J2000
  // (+0.07 s) and parted from the scene by +3.3 s at 0 AD, −6.6 s at 6000,
  // −14 s at 10,000 and −395 s at +25,000 (e = 0.0034, the apsidal line
  // swings fast) — the chain tangent's dϖ̇/dt runs ~40 % steep against the
  // secular mean elements, the series' reads them to ~1 s over ±4 kyr. The
  // rate the beats and the Prec. cell quote is apsidalRateFixedDegPerJulianYr
  // below — ONE family, so 360°/rate and anom/(anom − sid) are the same
  // number. The year-over-year reading carries the banked series' own
  // century-scale ripple (±0.015″/yr ≈ ±0.35 s; the cadence is named in the
  // artifact) — it is the movement's, not smoothed away.
  const anom = (/** @type {number} */ year) =>
    chan.correctedYearSeconds(year, shorterYear(tropicalRawSeconds(year), -apsidalVsEquinoxDegPerJulianYr(year)));
  /** A beat period in JULIAN years from two year lengths (SI s): the time for
   *  the shorter year to gain one turn on the longer, ÷ 365.25 d. @param {number} tLong @param {number} tShort */
  const beatJulianYears = (tLong, tShort) => tLong * tShort / ((tLong - tShort) * JULIAN_YEAR_SECONDS);

  return Object.freeze({
    /** Mean tropical year of date, SI seconds. @param {number} year */
    tropicalYearSecondsAtYear: trop,
    /** Sidereal year of date, SI seconds. @param {number} year */
    siderealYearSecondsAtYear: sid,
    /** Anomalistic year of date, SI seconds. @param {number} year */
    anomalisticYearSecondsAtYear: anom,
    /** Axial precession period of date (equinox regression beat), JULIAN years. @param {number} y */
    axialPrecessionYearsAtYear: (y) => beatJulianYears(sid(y), trop(y)),
    /** Perihelion (apsidal-vs-equinox) precession period of date, JULIAN years. @param {number} y */
    perihelionPrecessionYearsAtYear: (y) => beatJulianYears(anom(y), trop(y)),
    /** Apsidal precession period of date vs the fixed stars, JULIAN years (hypersensitive: ±1 s ↔ ≈400 yr; the identifier keeps the historical "inclination" name). @param {number} y */
    inclinationPrecessionYearsAtYear: (y) => beatJulianYears(anom(y), sid(y)),
    /** The movement's own general precession of date, ″ per Julian year (retrograde positive) — 360°/this ≡ axialPrecessionYearsAtYear to second order. @param {number} y */
    generalPrecessionArcsecPerJulianYr: (y) => generalPrecessionDegPerJulianYr(y) * 3600,
    /** The movement's own apsidal rate of date against the FIXED frame, ″ per Julian year (prograde positive) — the rate the Perihelion Longitudes Prec. cell shows for Earth; 360°/this ≡ inclinationPrecessionYearsAtYear exactly. @param {number} y */
    apsidalRateFixedArcsecPerJulianYr: (y) => { const a = anom(y), s = sid(y); return 360 * JULIAN_YEAR_SECONDS * (1 / s - 1 / a) * 3600; },
    /** The per-cardinal layer (D6 rules: year lengths λ̇-corrected; offsets/spreads raw — μs-class/second-order there). */
    cardinal: Object.freeze({
      /** @param {number} y @param {'VE'|'SS'|'AE'|'WS'} type */
      yearLengthSeconds: (y, type) => chan.correctedYearSeconds(y, structure.yearLengthSeconds(y, type)),
      /** @param {number} y @param {'VE'|'SS'|'AE'|'WS'} type */
      eocOffsetSeconds: (y, type) => structure.eocOffsetSeconds(y, type),
      /** @param {number} y */
      spreadSeconds: (y) => structure.spreadSeconds(y),
    }),
    /** The planetary λ̇ ratio (diagnostic; ≡1 at J2000). */
    planetaryRelAtYear: chan.planetaryRelAtYear,
  });
}

/**
 * The published of-date window (plan 06 Phase 3 S2): inside |year − 2000| ≤
 * this span the one-family route is THE published year-length / precession
 * family (the banked tiers — 100-yr and 1000-yr grids, no unbounded sampler
 * growth); beyond it the published surfaces return the unit's SECULAR mean
 * (H(t)/13 for the precession period, the tidal-chain mean year), because the
 * of-date wobble is unresolved there and the deep sampler grows ~0.1 s per Myr
 * of span. A displayed rate must name its window — this is the window.
 */
const ONE_FAMILY_WINDOW_YEARS = 2000000;

module.exports = { createYearLengths, ONE_FAMILY_WINDOW_YEARS };

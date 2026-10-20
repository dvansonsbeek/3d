/**
 * Unit constants — ONE home (holisticuniverse plan 13 B3). Before B3 the
 * browser carried ~200 inline `86400`s and ~150 `365.25`s, with private copies
 * inside the package. These are definitions, not measurements: the SI day in
 * seconds, the Julian year and century in days, and the arcsecond scale (the
 * angle module exports ARCSEC_PER_TURN / ARCSEC_PER_RAD).
 */

'use strict';

/** The SI day, seconds. */
const SECONDS_PER_DAY = 86400;
/** The Julian year, days (IAU). */
const DAYS_PER_JULIAN_YEAR = 365.25;
/** The Julian century, days. */
const JULIAN_CENTURY_DAYS = 36525;
/** The Julian year, SI seconds. */
const SECONDS_PER_JULIAN_YEAR = DAYS_PER_JULIAN_YEAR * SECONDS_PER_DAY;

module.exports = { SECONDS_PER_DAY, DAYS_PER_JULIAN_YEAR, JULIAN_CENTURY_DAYS, SECONDS_PER_JULIAN_YEAR };

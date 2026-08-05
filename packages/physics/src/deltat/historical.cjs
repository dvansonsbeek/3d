/**
 * Historical ΔT — the Espenak/Meeus piecewise polynomial (Phase 8.4,
 * slice 4). THE SHIPPED RENDITION, verbatim from the browser (fixture-
 * pinned dtEspenak probes): note it merges the canonical 1986–2005
 * segment into the 2005–2050 one (single ≥1986 branch) and returns NaN
 * outside −1999..3000 rather than the far-future extension.
 *
 * KNOWN VARIANT RENDITIONS ELSEWHERE — deliberately NOT unified here
 * (recorded for the Phase 9 no-duplicated-formulas gate, where each
 * consumer picks its rendition consciously):
 *  - tools/verify/moon-deltat-comparison.js: the full canonical piecewise
 *    including the 1986–2005 segment and the >2050 extension.
 *  - tools/fit/sun-longitude-harmonics.js: a rescaled variant whose
 *    pre-1600 branches assign the polynomials to different eras.
 * Unifying either onto this form would change fitter/verify behaviour —
 * a measured decision, not an extraction.
 *
 * The engines own their anchoring conventions (the browser subtracts its
 * DELTA_T_ESPENAK_J2000_S display anchor separately).
 */

'use strict';

/**
 * Espenak/Meeus ΔT in seconds (TT − UT), raw polynomial convention.
 * @param {number} year - calendar year; NaN outside −1999..3000
 * @returns {number}
 */
function deltaTEspenakMeeusRawSeconds(year) {
  let u, t, dT;
  if (year < -1999 || year > 3000) return NaN;
  if (year < -500) {
    u = (year - 1820) / 100;
    dT = -20 + 32 * u * u;
  } else if (year < 500) {
    u = year / 100;
    dT = 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3
       - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (year < 1600) {
    u = (year - 1000) / 100;
    dT = 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3
       - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (year < 1700) {
    t = year - 1600; dT = 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129;
  } else if (year < 1800) {
    t = year - 1700; dT = 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (year < 1860) {
    t = year - 1800; dT = 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t ** 3
                        - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6
                        + 0.000000000875 * t ** 7;
  } else if (year < 1900) {
    t = year - 1860; dT = 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3
                        - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  } else if (year < 1920) {
    t = year - 1900; dT = -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (year < 1941) {
    t = year - 1920; dT = 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3;
  } else if (year < 1961) {
    t = year - 1950; dT = 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547;
  } else if (year < 1986) {
    t = year - 1975; dT = 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718;
  } else {
    t = year - 2000; dT = 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  return dT;
}

module.exports = { deltaTEspenakMeeusRawSeconds };

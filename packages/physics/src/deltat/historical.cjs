/**
 * Historical ΔT — the Espenak/Meeus piecewise polynomial (Phase 8.4,
 * slice 4; canon-only since 8.4-4c). EXACTLY the published NASA canon
 * (eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html): every era segment
 * including the separate 1986–2005 one, and the −20 + 32u² parabola
 * (with the −0.5628·(2150−y) correction above 2050) outside the
 * tabulated range — Espenak's own out-of-range guidance, not NaN.
 *
 * HISTORY: the browser shipped a simplification until 8.4-4c (1986–2005
 * merged into the 62.92-branch; NaN outside −1999..3000) with a matching
 * 62.92 display anchor. Both were replaced by the canon + its 63.86
 * anchor (astro-reference externalCurveAnchors.deltaTEspenakJ2000Seconds)
 * in one measured commit — curve and anchor are a matched pair.
 *
 * ONE VARIANT REMAINS OUTSIDE (recorded in plan §12g for Phase 9):
 * tools/fit/sun-longitude-harmonics.js — its ΔT timed the UT→TT
 * conversion when the SHIPPED sun-harmonic coefficients were fitted, so
 * it is half of a matched pair and swaps only with a deliberate refit.
 *
 * The engines own their anchoring conventions (the browser subtracts its
 * DELTA_T_ESPENAK_J2000_S display anchor separately).
 */

'use strict';

/**
 * Espenak/Meeus ΔT in seconds — the FULL published canon: separate
 * 1986–2005 segment, and the −20 + 32u² parabola (with the −0.5628
 * correction above 2050) outside the tabulated range instead of NaN.
 * @param {number} year - calendar year
 * @returns {number}
 */
function deltaTEspenakMeeusCanonSeconds(year) {
  let u, t;
  if (year < -500) {
    u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  } else if (year < 500) {
    u = year / 100;
    return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3 - 0.1798452 * u ** 4
      + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (year < 1600) {
    u = (year - 1000) / 100;
    return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3 - 0.8503463 * u ** 4
      - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (year < 1700) {
    t = year - 1600;
    return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
  } else if (year < 1800) {
    t = year - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (year < 1860) {
    t = year - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  } else if (year < 1900) {
    t = year - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  } else if (year < 1920) {
    t = year - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (year < 1941) {
    t = year - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3;
  } else if (year < 1961) {
    t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  } else if (year < 1986) {
    t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  } else if (year < 2005) {
    t = year - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4
      + 0.00002373599 * t ** 5;
  } else if (year < 2050) {
    t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  } else {
    u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }
}

module.exports = { deltaTEspenakMeeusCanonSeconds };

// ═══════════════════════════════════════════════════════════════════════════
// IAU PRECESSION — Convert J2000/ICRF coordinates to of-date equatorial
//
// Implements IAU 1976 precession (Lieske, 1979) via Meeus, Astronomical
// Algorithms. Valid for several centuries around J2000.
//
// Usage:
//   const { j2000ToOfDate } = require('./precession');
//   const ofDate = j2000ToOfDate(raJ2000_deg, decJ2000_deg, jd);
//   // → { ra: ra_ofDate_deg, dec: dec_ofDate_deg }
//
// Background:
//   JPL Horizons returns astrometric RA/Dec in the fixed ICRF/J2000 frame.
//   Our geocentric model computes positions in the of-date equatorial frame
//   (the equator precesses naturally in the model's scene graph).
//   The difference is ~50.3 arcsec/yr in RA for objects near the ecliptic,
//   accumulating to ~3° over 200 years.
//
//   Stellarium uses the Vondrák long-term precession model (valid ±200,000
//   years). For our 200-year range (2000-2200), the simpler IAU 1976 model
//   is more than adequate — the difference is negligible.
//
// Reference:
//   Lieske, J.H. (1979) "Precession matrix based on IAU (1976) system of
//     astronomical constants", Astronomy & Astrophysics, 73, 282-284
//   Meeus, J. (1998) "Astronomical Algorithms", 2nd ed., Chapter 21
//   Stellarium: src/core/planetsephems/precession.h (Vondrák model)
//   celestialprogramming.com/snippets/precessionMeeus.html
// ═══════════════════════════════════════════════════════════════════════════

const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;

// J2000.0 epoch in Julian Days
const J2000_JD = 2451545.0;

/**
 * Compute IAU 1976 precession angles from J2000.0 to a given epoch.
 *
 * @param {number} jd - Target Julian Day
 * @returns {{ zetaA: number, zA: number, thetaA: number }} angles in radians
 */
function precessionAngles(jd) {
  // t = Julian centuries from J2000.0
  const t = (jd - J2000_JD) / 36525.0;

  // IAU 1976 precession angles (arcseconds), precessing FROM J2000 (T=0)
  const zetaA  = (2306.2181 * t + 0.30188 * t*t + 0.017998 * t*t*t) * ARCSEC;
  const zA     = (2306.2181 * t + 1.09468 * t*t + 0.018203 * t*t*t) * ARCSEC;
  const thetaA = (2004.3109 * t - 0.42665 * t*t - 0.041833 * t*t*t) * ARCSEC;

  return { zetaA, zA, thetaA };
}

/**
 * Convert J2000/ICRF RA/Dec to of-date equatorial coordinates.
 *
 * Applies the IAU 1976 precession rotation matrix:
 *   P = R₃(-z_A) · R₂(+θ_A) · R₃(-ζ_A)
 *
 * @param {number} raJ2000 - Right ascension in J2000 frame (degrees)
 * @param {number} decJ2000 - Declination in J2000 frame (degrees)
 * @param {number} jd - Julian Day of the target epoch
 * @returns {{ ra: number, dec: number }} of-date RA/Dec in degrees
 */
function j2000ToOfDate(raJ2000, decJ2000, jd) {
  const { zetaA, zA, thetaA } = precessionAngles(jd);

  // Convert input to radians
  const ra0 = raJ2000 * DEG;
  const dec0 = decJ2000 * DEG;

  // Direction cosines of J2000 position
  const cosD = Math.cos(dec0);
  const x0 = cosD * Math.cos(ra0);
  const y0 = cosD * Math.sin(ra0);
  const z0 = Math.sin(dec0);

  // Precession matrix P = R₃(-z) · R₂(+θ) · R₃(-ζ)
  // Applied as: [x,y,z]_date = P · [x,y,z]_J2000
  const cosZeta = Math.cos(zetaA), sinZeta = Math.sin(zetaA);
  const cosZ = Math.cos(zA), sinZ = Math.sin(zA);
  const cosTheta = Math.cos(thetaA), sinTheta = Math.sin(thetaA);

  const xx =  cosZ * cosTheta * cosZeta - sinZ * sinZeta;
  const xy = -cosZ * cosTheta * sinZeta - sinZ * cosZeta;
  const xz =  cosZ * sinTheta; // note: R₂(+θ) not R₂(-θ)
  // Wait — Meeus uses R₂(+θ) which means the (1,3) element is -sinθ
  // Let me redo this properly.

  // Actually the standard form from Meeus Ch.21:
  // The matrix elements are:
  const P11 =  cosZ * cosTheta * cosZeta - sinZ * sinZeta;
  const P12 = -cosZ * cosTheta * sinZeta - sinZ * cosZeta;
  const P13 = -cosZ * sinTheta;
  const P21 =  sinZ * cosTheta * cosZeta + cosZ * sinZeta;
  const P22 = -sinZ * cosTheta * sinZeta + cosZ * cosZeta;
  const P23 = -sinZ * sinTheta;
  const P31 =  sinTheta * cosZeta;
  const P32 = -sinTheta * sinZeta;
  const P33 =  cosTheta;

  // Apply rotation
  const x1 = P11 * x0 + P12 * y0 + P13 * z0;
  const y1 = P21 * x0 + P22 * y0 + P23 * z0;
  const z1 = P31 * x0 + P32 * y0 + P33 * z0;

  // Convert back to RA/Dec (degrees)
  let ra = Math.atan2(y1, x1) / DEG;
  if (ra < 0) ra += 360;
  const dec = Math.asin(Math.max(-1, Math.min(1, z1))) / DEG;

  return { ra, dec };
}

/**
 * Convert of-date equatorial coordinates back to J2000/ICRF.
 * (Inverse of j2000ToOfDate — applies transpose of precession matrix)
 *
 * @param {number} raDate - Right ascension in of-date frame (degrees)
 * @param {number} decDate - Declination in of-date frame (degrees)
 * @param {number} jd - Julian Day of the source epoch
 * @returns {{ ra: number, dec: number }} J2000 RA/Dec in degrees
 */
function ofDateToJ2000(raDate, decDate, jd) {
  const { zetaA, zA, thetaA } = precessionAngles(jd);

  const ra0 = raDate * DEG;
  const dec0 = decDate * DEG;
  const cosD = Math.cos(dec0);
  const x0 = cosD * Math.cos(ra0);
  const y0 = cosD * Math.sin(ra0);
  const z0 = Math.sin(dec0);

  const cosZeta = Math.cos(zetaA), sinZeta = Math.sin(zetaA);
  const cosZ = Math.cos(zA), sinZ = Math.sin(zA);
  const cosTheta = Math.cos(thetaA), sinTheta = Math.sin(thetaA);

  // Transpose of precession matrix (P^T = P^-1 for rotation matrices)
  const P11 =  cosZ * cosTheta * cosZeta - sinZ * sinZeta;
  const P21 = -cosZ * cosTheta * sinZeta - sinZ * cosZeta;
  const P31 = -cosZ * sinTheta;
  const P12 =  sinZ * cosTheta * cosZeta + cosZ * sinZeta;
  const P22 = -sinZ * cosTheta * sinZeta + cosZ * cosZeta;
  const P32 = -sinZ * sinTheta;
  const P13 =  sinTheta * cosZeta;
  const P23 = -sinTheta * sinZeta;
  const P33 =  cosTheta;

  const x1 = P11 * x0 + P12 * y0 + P13 * z0;
  const y1 = P21 * x0 + P22 * y0 + P23 * z0;
  const z1 = P31 * x0 + P32 * y0 + P33 * z0;

  let ra = Math.atan2(y1, x1) / DEG;
  if (ra < 0) ra += 360;
  const dec = Math.asin(Math.max(-1, Math.min(1, z1))) / DEG;

  return { ra, dec };
}

module.exports = { j2000ToOfDate, ofDateToJ2000, precessionAngles };

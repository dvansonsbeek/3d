/**
 * Moon apparent position — THE shared implementation (Phase 8.2-7, the
 * final lunar layer). The D5 derived optics + the post-hoc RA/Dec override:
 *
 *  - sunGeoVecEqD5: framework-native geocentric Sun vector (equatorial km).
 *    e(T) from the anchored observed eccentricity + drift; EoC coefficients
 *    DERIVED from e via the Kepler series (2e − e³/4, (5/4)e², (13/12)e³ —
 *    the identity the D1 laboratory proved at 2 ppm); mean-longitude rate =
 *    framework tropical year; mean-anomaly rate = that minus the H/16
 *    perihelion rate; R from the AU distance; ε from the framework
 *    obliquity. One J2000 anchor: sunMeanLongitudeJ2000_deg.
 *  - moonAberrationRaDec: central-difference v_E/c annual aberration,
 *    SUBTRACTED (delta TO the aberration-removed direction u − v/c).
 *  - overrideRaDec: ecl→eq (Meeus eq. 13.3/13.4) on the series output,
 *    then framework-native analytic aberration + the small fitted residual
 *    (MOON_CORRECTION_RESIDUAL), or the legacy 3-argument fitted
 *    MOON_CORRECTION in pure-Meeus A/B mode.
 *
 * LOAD-BEARING: the correction patch's hard-coded linear arguments
 * (297.850 + 12.19074912·dJD, 134.963 + 13.06499295·dJD,
 * 357.529 + 0.98560028·dJD) are DELIBERATELY independent of the argument
 * skeleton — the fitted coefficients were produced against THIS form
 * (coefficients and runtime form are a matched pair). Do not "unify" them
 * with the args dispatcher.
 *
 * S8 (obliquity source) stays ENGINE-INJECTED per call: the browser passes
 * its live scene value (o.obliquityEarth, refreshed in updatePositions);
 * the Node engine recomputes for the scene year. Equal when both describe
 * the same year — a scene-state convention, not physics.
 */

'use strict';

/**
 * @typedef {{raSinD: number, raCosD: number, raSinMp: number, raCosMp: number,
 *            raSinMs: number, raCosMs: number, decSinD: number, decCosD: number,
 *            decSinMp: number, decCosMp: number, decSinMs: number, decCosMs: number}} MoonCorrectionTable
 */

/**
 * @param {{
 *   constants: {
 *     j2000JD: number,
 *     julianCenturyDays: number,
 *     sunMeanLongitudeJ2000Deg: number,
 *     perihelionLongitudeJ2000Deg: number,
 *     eccentricityJ2000: number,
 *     eccentricityDotJ2000: number,
 *     d5RateLDegPerDay: number,
 *     d5RatePeriDegPerDay: number,
 *     speedOfLight: number,
 *   },
 *   fns: {
 *     computeObliquityEarth: (year: number) => number,
 *     getAuDistanceKm: () => number,
 *     isFrameworkNative: () => boolean,
 *     getCorrectionResidual: () => (MoonCorrectionTable | null),
 *     getCorrectionLegacy: () => (MoonCorrectionTable | null),
 *   },
 * }} deps — the D5 rates are the engines' J2000-frozen values (the year
 *   globals are deep-time-mutable, same pattern as FW_A2_RATE); the AU
 *   distance is a GETTER (browser-mutable under deep time).
 */
function createMoonApparent({ constants, fns }) {
  const {
    j2000JD, julianCenturyDays, sunMeanLongitudeJ2000Deg,
    perihelionLongitudeJ2000Deg, eccentricityJ2000, eccentricityDotJ2000,
    d5RateLDegPerDay, d5RatePeriDegPerDay, speedOfLight,
  } = constants;
  const {
    computeObliquityEarth, getAuDistanceKm, isFrameworkNative,
    getCorrectionResidual, getCorrectionLegacy,
  } = fns;

  /** Framework-native geocentric Sun vector, equatorial km.
   *  @param {number} jd @returns {[number, number, number]} */
  function sunGeoVecEqD5(jd) {
    const T = (jd - j2000JD) / julianCenturyDays;
    const d = jd - j2000JD;
    const L0 = sunMeanLongitudeJ2000Deg + d5RateLDegPerDay * d;
    const M = ((L0 - (perihelionLongitudeJ2000Deg + d5RatePeriDegPerDay * d)) + 180) * Math.PI / 180;  // geocentric-perigee convention (Sun perigee = Earth perihelion + 180°)
    const e = eccentricityJ2000 + eccentricityDotJ2000 * T;
    const Ceq = ((2 * e - Math.pow(e, 3) / 4) * Math.sin(M)
              + 1.25 * e * e * Math.sin(2 * M)
              + (13 / 12) * Math.pow(e, 3) * Math.sin(3 * M)) * 180 / Math.PI;    // deg (Kepler EoC series)
    const lam = (L0 + Ceq) * Math.PI / 180;
    const v = M + Ceq * Math.PI / 180;
    const R = (1 - e * e) / (1 + e * Math.cos(v)) * getAuDistanceKm();
    const eps = computeObliquityEarth(2000 + d / 365.2425) * Math.PI / 180;
    return [R * Math.cos(lam), R * Math.sin(lam) * Math.cos(eps), R * Math.sin(lam) * Math.sin(eps)];
  }

  /** Annual-aberration delta (central difference, v_E/c SUBTRACTED).
   *  @param {number} jd @param {number} ra @param {number} dec
   *  @returns {{dRA: number, dDec: number}} */
  function moonAberrationRaDec(jd, ra, dec) {
    const h = 0.02;                                        // days (central difference)
    const a = sunGeoVecEqD5(jd - h), b = sunGeoVecEqD5(jd + h);
    const s = 1 / (2 * h * 86400 * speedOfLight);
    const kx = -(b[0] - a[0]) * s, ky = -(b[1] - a[1]) * s, kz = -(b[2] - a[2]) * s;   // v_E/c
    const cd = Math.cos(dec);
    const ux = cd * Math.cos(ra), uy = cd * Math.sin(ra), uz = Math.sin(dec);
    const wx = ux - kx, wy = uy - ky, wz = uz - kz;        // SUBTRACT the aberration content
    const wr = Math.sqrt(wx * wx + wy * wy + wz * wz);
    let dRA = Math.atan2(wy, wx) - ra;
    dRA = Math.atan2(Math.sin(dRA), Math.cos(dRA));
    return { dRA, dDec: Math.asin(Math.max(-1, Math.min(1, wz / wr))) - dec };
  }

  /** The post-hoc RA/Dec override on the series output. Returns EQUATORIAL
   *  radians — the engines own their scene storage conventions (the browser
   *  stores dec as π/2 − dec, phi form).
   *  @param {{lonDeg: number, betRad: number, meeusT: (number | undefined), obliquityDeg: number}} p
   *  @returns {{raRad: number, decRad: number}} */
  function overrideRaDec({ lonDeg, betRad, meeusT, obliquityDeg }) {
    const eps = obliquityDeg * (Math.PI / 180);
    const cosE = Math.cos(eps), sinE = Math.sin(eps);
    const lamR = lonDeg * (Math.PI / 180);
    const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
    const sinBet = Math.sin(betRad), cosBet = Math.cos(betRad);

    // Ecliptic → equatorial (Meeus eq. 13.3, 13.4)
    let newRA = Math.atan2(sinLam * cosE - Math.tan(betRad) * sinE, cosLam);
    if (newRA < 0) newRA += 2 * Math.PI;
    let newDec = Math.asin(sinBet * cosE + cosBet * sinE * sinLam);

    if (isFrameworkNative()) {
      const ab = moonAberrationRaDec(j2000JD + (meeusT || 0) * julianCenturyDays, newRA, newDec);
      newRA += ab.dRA;
      newDec += ab.dDec;
    }
    const mc = isFrameworkNative() ? getCorrectionResidual() : getCorrectionLegacy();
    if (mc) {
      const d2r = Math.PI / 180;
      const dJD = (meeusT || 0) * julianCenturyDays;
      // MATCHED-PAIR arguments — fitted against these exact linear forms.
      const Dc = (297.850 + 12.19074912 * dJD) * d2r;
      const Mpc = (134.963 + 13.06499295 * dJD) * d2r;
      const Msc = (357.529 + 0.98560028 * dJD) * d2r;
      newRA -= (mc.raSinD * Math.sin(Dc) + mc.raCosD * Math.cos(Dc)
              + mc.raSinMp * Math.sin(Mpc) + mc.raCosMp * Math.cos(Mpc)
              + mc.raSinMs * Math.sin(Msc) + mc.raCosMs * Math.cos(Msc)) * d2r;
      newDec -= (mc.decSinD * Math.sin(Dc) + mc.decCosD * Math.cos(Dc)
              + mc.decSinMp * Math.sin(Mpc) + mc.decCosMp * Math.cos(Mpc)
              + mc.decSinMs * Math.sin(Msc) + mc.decCosMs * Math.cos(Msc)) * d2r;
    }
    return { raRad: newRA, decRad: newDec };
  }

  return { sunGeoVecEqD5, moonAberrationRaDec, overrideRaDec };
}

module.exports = { createMoonApparent };

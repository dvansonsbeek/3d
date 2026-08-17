/**
 * Solar-eclipse shadow geometry — the location tier (20.3g).
 *
 * Instantaneous shadow-axis evaluation on the FULL shared series (no
 * precomputed polynomial elements): at any JD(UT) the geocentric Sun and
 * Moon are placed in the equatorial-of-date frame, the umbra axis is
 * intersected with the ellipsoid, and observer local circumstances follow
 * from the observer's perpendicular offset to the axis versus the
 * penumbra/umbra cone radii at the observer's axial plane.
 *
 * THE TWO AXIS CONVENTIONS (both measured against the 15 NASA path-table
 * centerline points, tools/verify/eclipse-audit.js `centerlines`; the raw
 * finder chain read ~61″ shadow-plane, this chain 6.3″ mean / 9.1″ max —
 * within every NASA path half-width):
 *
 *  1. TT bridge. The framework ΔT curve is ZEROED AT J2000 by construction
 *     (it integrates LOD excess from the epoch anchor); the model's
 *     absolute ΔT is deltaTStart + curve — exactly how every other
 *     consumer reads it (the browser accumulator, Meeus geometry, the ΔT
 *     charts; deltaTStart is the joint-world trend anchor, deliberately
 *     ~8 s below the IERS instantaneous 63.6 s — the industrial-era
 *     acceleration the cyclic model does not capture). The eclipse
 *     FINDERS deliberately stay on the zeroed convention — their fitted
 *     anchors (SUN_HARMONICS, canon statistics) were produced through it,
 *     and eclipse TIMING is elongation-class, where the convention
 *     cancels against the fitted phases. GROUND LOCATION is absolute: the
 *     Earth-fixed frame rides true UT rotation, so the bodies are
 *     evaluated at the model's absolute TT. ttBridgeSeconds = deltaTStart
 *     (no new constant; measured BETTER on the NASA reference points than
 *     the observed 63.8/64.2 s — mean 6.3″ vs 7.3″). ~34″ of the raw
 *     offset.
 *
 *  2. Full series, not the truncated finder forms. truncatedLonDeg omits
 *     the fitted moonMeeusLpCorrection anchor (+33.8″) and truncatedBetaDeg
 *     omits the −2235·sin(Lp) latitude family (~8″) — both deliberate for
 *     the certified finder statistics (knife-edge canon events), both
 *     required here. The injected moonFullAtDaysTT is the series'
 *     sceneEvalAt — the same evaluation the browser scene ships. Measured:
 *     ~27″ of the raw offset.
 *
 * Annual aberration is deliberately ABSENT: for ground location a
 * common-mode rotation of both bodies moves the ground point by the raw
 * angle (~0.6 km), and the elongation content cancels at syzygy (the
 * round-3 result). Both bodies here are geometric mean-of-date, matching
 * the MEAN sidereal time used for the Earth-fixed mapping.
 *
 * The scene-umbra conventions (THREE scaffold navigation) never enter this
 * package (§2h) — this is an independent construction on the shared
 * series, cross-checked against the scene twins through the same NASA
 * reference points.
 */

'use strict';

/**
 * @typedef {Object} BesselianDeps
 * @property {(dDaysTT: number) => {lonDeg: number, latDeg: number, distKm: number}} moonFullAtDaysTT
 *   full-series Moon: ecliptic-of-date longitude/latitude (deg) + distance (km), TT axis (days since J2000)
 * @property {(jdUT: number) => number} sunLonDegAt - geometric mean sun longitude (deg), JD(UT) axis with the finder's internal ΔT
 * @property {(jd: number) => number} deltaTSecondsAt - framework ΔT (J2000-zeroed convention)
 * @property {(year: number) => number} obliquityDegAt - framework obliquity (deg) at calendar year
 * @property {(year: number) => number} eccentricityAt - framework Earth-orbit eccentricity at calendar year
 * @property {(year: number) => number} perihelionLongitudeDegAt - framework perihelion longitude (deg) at calendar year
 * @property {(jd: number) => number} yearFromJD - the model's own JD → calendar-year conversion
 * @property {{ j2000JD: number, julianCenturyDays: number, earthDiameterKm: number,
 *   moonDiameterKm: number, sunDiameterKm: number, sunDistanceKm: number,
 *   earthFlatteningInverse: number, ttBridgeSeconds: number,
 *   gmstMeanSiderealT0Deg: number, gmstMeanSiderealRateDegPerDay: number,
 *   gmstMeanSiderealT2Deg: number }} constants
 */

/** @param {BesselianDeps} deps */
function createBesselian(deps) {
  const K = deps.constants;
  const D2R = Math.PI / 180;
  const R_E_KM = K.earthDiameterKm / 2;
  const R_SUN_KM = K.sunDiameterKm / 2;
  const R_MOON_KM = K.moonDiameterKm / 2;
  const F = 1 / K.earthFlatteningInverse;

  /** Mean sidereal time at Greenwich, degrees (mean equinox — pairs with the
   *  mean-of-date body longitudes; coefficients single-sourced from
   *  astro-reference.json physicalConstants). @param {number} jdUT @returns {number} */
  function gmstDeg(jdUT) {
    const T = (jdUT - K.j2000JD) / K.julianCenturyDays;
    return ((K.gmstMeanSiderealT0Deg + K.gmstMeanSiderealRateDegPerDay * (jdUT - K.j2000JD)
      + K.gmstMeanSiderealT2Deg * T * T) % 360 + 360) % 360;
  }

  /** Ecliptic-of-date → equatorial-of-date vector (km).
   *  @param {number} lonDeg @param {number} betDeg @param {number} distKm
   *  @param {number} epsRad @returns {[number, number, number]} */
  function eclToEq(lonDeg, betDeg, distKm, epsRad) {
    const lam = lonDeg * D2R, bet = betDeg * D2R;
    const x = Math.cos(bet) * Math.cos(lam);
    const y = Math.cos(bet) * Math.sin(lam) * Math.cos(epsRad) - Math.sin(bet) * Math.sin(epsRad);
    const z = Math.cos(bet) * Math.sin(lam) * Math.sin(epsRad) + Math.sin(bet) * Math.cos(epsRad);
    return [distKm * x, distKm * y, distKm * z];
  }

  /** Elliptical Sun distance — FRAMEWORK-NATIVE: the model's own
   *  eccentricity (Law-5-locked base + drift) and perihelion longitude
   *  (H/16 precession) close the ellipse, with the true anomaly from the
   *  already-computed sun longitude (v = λ − (ϖ + 180°), geocentric-perigee
   *  convention). Agrees with the Meeus Ch. 25 polynomial to ±0.001% over a
   *  year, with no fitted external coefficients, and stays honest at deep
   *  time (e and ϖ evolve with the model). The distance is LOAD-BEARING for
   *  the umbral cone radius — a small difference of large terms: the
   *  mean-AU approximation's ±1.7% seasonal error became tens of percent of
   *  umbra radius (measured: Carbondale 2017 central duration 95 s vs the
   *  real 158 s; elliptical gives 157 s).
   *  @param {number} year @param {number} sunLonDeg @returns {number} km */
  function sunDistanceKm(year, sunLonDeg) {
    const e = deps.eccentricityAt(year);
    const v = (sunLonDeg - (deps.perihelionLongitudeDegAt(year) + 180)) * D2R;
    return K.sunDistanceKm * (1 - e * e) / (1 + e * Math.cos(v));
  }

  /** Sun and Moon geocentric equatorial-of-date vectors at true TT.
   *  @param {number} jdUT @returns {{S: [number,number,number], M: [number,number,number]}} */
  function bodiesAt(jdUT) {
    const jb = jdUT + K.ttBridgeSeconds / 86400;          // finder-axis input → its internal ΔT lands on true TT
    const year = deps.yearFromJD(jb);
    const eps = deps.obliquityDegAt(year) * D2R;
    const sunLon = deps.sunLonDegAt(jb);
    const dTT = (jb - K.j2000JD) + deps.deltaTSecondsAt(jb) / 86400;
    const moon = deps.moonFullAtDaysTT(dTT);
    return {
      S: eclToEq(sunLon, 0, sunDistanceKm(year, sunLon), eps),
      M: eclToEq(moon.lonDeg, moon.latDeg, moon.distKm, eps),
    };
  }

  /** Umbra-axis ground intersection at JD(UT): geodetic latitude, east
   *  longitude — or null when the axis misses the ellipsoid.
   *  @param {number} jdUT @returns {{latDeg: number, lonDeg: number} | null} */
  function umbraGroundAt(jdUT) {
    const { S, M } = bodiesAt(jdUT);
    const dv = [M[0] - S[0], M[1] - S[1], M[2] - S[2]];
    const dl = Math.hypot(dv[0], dv[1], dv[2]);
    const d = [dv[0] / dl, dv[1] / dl, dv[2] / dl];
    const MdotD = M[0] * d[0] + M[1] * d[1] + M[2] * d[2];
    const MdotM = M[0] * M[0] + M[1] * M[1] + M[2] * M[2];
    const disc = MdotD * MdotD - (MdotM - R_E_KM * R_E_KM);
    if (disc < 0) return null;
    const s = -MdotD - Math.sqrt(disc);
    const hit = [M[0] + s * d[0], M[1] + s * d[1], M[2] + s * d[2]];
    const r = Math.hypot(hit[0], hit[1], hit[2]);
    const latGc = Math.asin(Math.max(-1, Math.min(1, hit[2] / r)));
    const latDeg = Math.atan(Math.tan(latGc) / ((1 - F) * (1 - F))) / D2R;
    let lonDeg = Math.atan2(hit[1], hit[0]) / D2R - gmstDeg(jdUT);
    lonDeg = ((lonDeg + 540) % 360) - 180;
    return { latDeg, lonDeg };
  }

  /** Observer geocentric position in the equatorial-of-date frame (km).
   *  Geodetic latitude on the ellipsoid (sea level).
   *  @param {number} jdUT @param {number} latDeg @param {number} lonDeg
   *  @returns {[number, number, number]} */
  function observerVec(jdUT, latDeg, lonDeg) {
    const u = Math.atan((1 - F) * Math.tan(latDeg * D2R));     // reduced latitude
    const rho = [Math.cos(u), (1 - F) * Math.sin(u)];          // [equatorial, polar] components / R_E
    const lst = (gmstDeg(jdUT) + lonDeg) * D2R;                // local mean sidereal angle
    return [
      R_E_KM * rho[0] * Math.cos(lst),
      R_E_KM * rho[0] * Math.sin(lst),
      R_E_KM * rho[1],
    ];
  }

  /**
   * Instantaneous shadow state at the observer: perpendicular offset from
   * the axis vs cone radii at the observer's axial plane.
   * @param {number} jdUT @param {number} latDeg @param {number} lonDeg
   * @returns {{offsetKm: number, penumbraKm: number, umbraKm: number, magnitude: number}}
   *   umbraKm is SIGNED: positive = annular (beyond the umbral vertex),
   *   negative = total; |umbraKm| is the central-zone radius either way.
   */
  function shadowStateAt(jdUT, latDeg, lonDeg) {
    const { S, M } = bodiesAt(jdUT);
    const O = observerVec(jdUT, latDeg, lonDeg);
    const dv = [M[0] - S[0], M[1] - S[1], M[2] - S[2]];
    const dl = Math.hypot(dv[0], dv[1], dv[2]);
    const d = [dv[0] / dl, dv[1] / dl, dv[2] / dl];            // Sun→Moon (toward Earth)
    const OM = [O[0] - M[0], O[1] - M[1], O[2] - M[2]];
    const along = OM[0] * d[0] + OM[1] * d[1] + OM[2] * d[2];  // axial distance Moon→observer plane
    const w = [OM[0] - along * d[0], OM[1] - along * d[1], OM[2] - along * d[2]];
    const offsetKm = Math.hypot(w[0], w[1], w[2]);
    const tanF1 = (R_SUN_KM + R_MOON_KM) / dl;                 // penumbral half-angle
    const tanF2 = (R_SUN_KM - R_MOON_KM) / dl;                 // umbral half-angle
    const penumbraKm = R_MOON_KM + along * tanF1;
    const umbraKm = along * tanF2 - R_MOON_KM;                 // signed: >0 annular, <0 total
    // Besselian magnitude convention: SIGNED umbral radius in the
    // denominator — total events read >1 at the centre, annular <1.
    const magnitude = (penumbraKm - offsetKm) / (penumbraKm + umbraKm);
    return { offsetKm, penumbraKm, umbraKm, magnitude };
  }

  /**
   * Local circumstances for an observer around one solar eclipse.
   * Scans ±4 h around jdGreatest at 30 s, bisects contacts to ~1 s.
   * @param {number} jdGreatest - the finder's greatest-eclipse JD(UT)
   * @param {number} latDeg @param {number} lonDeg
   * @returns {{kind: 'none'|'partial'|'annular'|'total',
   *   magnitude: number, maxJd: number,
   *   contacts: {c1: number|null, c2: number|null, c3: number|null, c4: number|null},
   *   centralDurationSeconds: number|null}}
   */
  function localCircumstances(jdGreatest, latDeg, lonDeg) {
    const HALF_WIN = 4 / 24, STEP = 30 / 86400;
    // maximum: minimize offset − nothing fancier than a fine scan + refine
    let best = { t: jdGreatest, magnitude: -Infinity };
    for (let t = jdGreatest - HALF_WIN; t <= jdGreatest + HALF_WIN; t += STEP) {
      const st = shadowStateAt(t, latDeg, lonDeg);
      if (st.magnitude > best.magnitude) best = { t, magnitude: st.magnitude };
    }
    // golden-section-ish refine on magnitude around the best sample
    let lo = best.t - STEP, hi = best.t + STEP;
    for (let i = 0; i < 30; i++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      if (shadowStateAt(m1, latDeg, lonDeg).magnitude
        < shadowStateAt(m2, latDeg, lonDeg).magnitude) lo = m1; else hi = m2;
    }
    const maxJd = (lo + hi) / 2;
    const atMax = shadowStateAt(maxJd, latDeg, lonDeg);

    /** Bisect a sign change of fn between a (negative) and b (positive).
     *  @param {(t: number) => number} fn @param {number} a @param {number} b
     *  @returns {number} */
    const bisect = (fn, a, b) => {
      for (let i = 0; i < 40; i++) {
        const m = (a + b) / 2;
        if (fn(m) < 0) a = m; else b = m;
      }
      return (a + b) / 2;
    };
    /** @param {number} t @returns {number} >0 inside the penumbra */
    const penEdge = (t) => {
      const st = shadowStateAt(t, latDeg, lonDeg);
      return st.penumbraKm - st.offsetKm;
    };
    /** @param {number} t @returns {number} >0 inside the central zone */
    const umbEdge = (t) => {
      const st = shadowStateAt(t, latDeg, lonDeg);
      return Math.abs(st.umbraKm) - st.offsetKm;
    };

    /** @type {{c1: number|null, c2: number|null, c3: number|null, c4: number|null}} */
    const contacts = { c1: null, c2: null, c3: null, c4: null };
    let kind = /** @type {'none'|'partial'|'annular'|'total'} */ ('none');
    if (penEdge(maxJd) > 0) {
      kind = 'partial';
      // outer contacts: walk out from max until outside, then bisect
      for (let t = maxJd; t >= maxJd - HALF_WIN; t -= STEP) {
        if (penEdge(t) < 0) { contacts.c1 = bisect(penEdge, t, t + STEP); break; }
      }
      for (let t = maxJd; t <= maxJd + HALF_WIN; t += STEP) {
        if (penEdge(t) < 0) { contacts.c4 = bisect(/** @param {number} x */ (x) => -penEdge(x), t - STEP, t); break; }
      }
      if (umbEdge(maxJd) > 0) {
        kind = atMax.umbraKm < 0 ? 'total' : 'annular';
        for (let t = maxJd; t >= maxJd - HALF_WIN; t -= STEP) {
          if (umbEdge(t) < 0) { contacts.c2 = bisect(umbEdge, t, t + STEP); break; }
        }
        for (let t = maxJd; t <= maxJd + HALF_WIN; t += STEP) {
          if (umbEdge(t) < 0) { contacts.c3 = bisect(/** @param {number} x */ (x) => -umbEdge(x), t - STEP, t); break; }
        }
      }
    }
    const centralDurationSeconds = (contacts.c2 !== null && contacts.c3 !== null)
      ? (contacts.c3 - contacts.c2) * 86400 : null;
    return { kind, magnitude: Math.max(0, atMax.magnitude), maxJd, contacts, centralDurationSeconds };
  }

  return { umbraGroundAt, shadowStateAt, localCircumstances };
}

module.exports = { createBesselian };

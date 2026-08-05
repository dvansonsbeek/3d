/**
 * Eclipse geometry — sun longitude + the predictive finders (Phase 8.5).
 *
 * Single-copy extraction from the browser (there was never a Node twin;
 * the moon series beneath is shared since 8.2 — the engines inject their
 * own truncated-series evaluators and ΔT convention).
 *
 * sunLonDegAt — Meeus Ch. 25 low-precision Sun geocentric ecliptic
 * longitude. Accepts JD_UT; converts internally to JD_TT via the injected
 * ΔT. Returns MEAN GEOMETRIC longitude, NOT apparent — LOAD-BEARING: the
 * framework's SUN_HARMONICS was fitted against observed eclipses that
 * already include aberration/nutation, so adding raw aberration here
 * double-counted the correction (measured 2026-07: 2024 Dallas 12→24 km
 * worse). Upgrading to apparent longitude requires refitting
 * SUN_HARMONICS with the correction active.
 *
 * findLunarEclipsesInRange — per-opposition shadow geometry (the Danjon
 * ~2% atmospheric enlargement, as used by the NASA Lunar Canon and Meeus
 * Ch. 54 — the pure geometric shadow under-classifies borderline events,
 * e.g. 2021-05-26), zero-crossing + 40-step bisection to ~1 s.
 *
 * findSolarEclipsesInRange — per-conjunction geometry (topocentric Moon
 * disk distinguishes total from annular), then refinement from
 * longitude-conjunction to MINIMUM γ — NASA's "greatest eclipse"
 * convention, typically 5–15 min apart.
 *
 * Sun distance and the synodic month arrive as GETTERS (both are
 * epoch-mutable engine globals). Sun-distance variation over the orbit
 * (~0.5%) is currently neglected — refinement recorded (Phase L-4).
 *
 * The scene-umbra conventions (piercing point / NASA radial projection)
 * are NOT here: they navigate the THREE scene through the Tychosium-
 * derived scaffold, which never enters this package (§2h).
 */

'use strict';

/**
 * @typedef {Object} EclipseFinderDeps
 * @property {(jd: number) => number} moonLonDegAt - truncated-series ecliptic longitude
 * @property {(jd: number) => number} moonBetaDegAt - truncated-series ecliptic latitude
 * @property {(jd: number) => number} moonDistanceKmAt - truncated-series distance
 * @property {(jd: number) => number} deltaTSecondsAt - the engine's ΔT convention
 * @property {() => number} getSynodicMonthDays - live (epoch-mutable)
 * @property {() => number} getSunDistanceKm - live (epoch-mutable)
 * @property {{ rEarthMetres: number, moonDiameterKm: number,
 *   sunDiameterKm: number, j2000JD: number, julianCenturyDays: number }} constants
 */

/** @param {EclipseFinderDeps} deps */
function createEclipseFinders(deps) {
  const K = deps.constants;

  /** Sun's geocentric ecliptic longitude in degrees (0–360) at given JD_UT.
   * MEAN GEOMETRIC — see the module header. @param {number} jd @returns {number} */
  function sunLonDegAt(jd) {
    const _d2r = Math.PI / 180;
    const T = (jd + deps.deltaTSecondsAt(jd) / 86400 - K.j2000JD) / K.julianCenturyDays;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * _d2r;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
            + 0.000289 * Math.sin(3 * M);
    return ((L0 + C) % 360 + 360) % 360;
  }

  /**
   * Find all lunar-eclipse-class oppositions in [jdStart, jdEnd].
   * @param {number} jdStart @param {number} jdEnd
   * @returns {Array<{jd: number, beta: number, moonDistance_km: number,
   *   type: string, magnitudeUmbral: number, magnitudePenumbral: number}>}
   */
  function findLunarEclipsesInRange(jdStart, jdEnd) {
    // Step size: small fraction of synodic month for reliable zero-crossing
    // detection (~6° diff change per step, well clear of the 30° wrap filter).
    const STEP_DAYS = deps.getSynodicMonthDays() / 60;

    // Per-event-distance geometry — the shadow angular radii are computed
    // PER OPPOSITION using each event's Moon distance (perigee vs apogee
    // varies the threshold by ~5.5%, which dominates type-classification
    // at boundary cases).
    const _rad2deg = 180 / Math.PI;
    const R_EARTH_KM = K.rEarthMetres / 1000;
    const R_MOON_KM = K.moonDiameterKm / 2;
    const R_SUN_KM = K.sunDiameterKm / 2;
    const D_SUN_KM = deps.getSunDistanceKm();
    const umbraApex_rad = Math.atan((R_SUN_KM - R_EARTH_KM) / D_SUN_KM);
    const penumbraApex_rad = Math.atan((R_SUN_KM + R_EARTH_KM) / D_SUN_KM);

    // Shadow radii carry the standard ~2% atmospheric enlargement (Danjon
    // rule / Chauvenet's 1/50, as used by the NASA Lunar Canon and Meeus
    // Ch. 54).
    const SHADOW_ENLARGEMENT = 1.02;
    /** @param {number} D_MOON_KM */
    const _shadowGeometry = (D_MOON_KM) => {
      const moonR = Math.atan(R_MOON_KM / D_MOON_KM) * _rad2deg;
      const umbraR = Math.atan((R_EARTH_KM - D_MOON_KM * Math.tan(umbraApex_rad)) / D_MOON_KM) * _rad2deg * SHADOW_ENLARGEMENT;
      const penumR = Math.atan((R_EARTH_KM + D_MOON_KM * Math.tan(penumbraApex_rad)) / D_MOON_KM) * _rad2deg * SHADOW_ENLARGEMENT;
      return {
        moonR, umbraR, penumR,
        totalMax: umbraR - moonR,
        partialMax: umbraR + moonR,
        penumMax: penumR + moonR,
      };
    };

    // Wrapped opposition diff: 0 means Moon at opposition (Sun + 180°)
    /** @param {number} jd */
    const oppDiff = (jd) => {
      let d = deps.moonLonDegAt(jd) - sunLonDegAt(jd) - 180;
      while (d > 180) d -= 360;
      while (d <= -180) d += 360;
      return d;
    };

    const results = [];
    let prevJD = jdStart;
    let prevDiff = oppDiff(prevJD);

    for (let jd = jdStart + STEP_DAYS; jd <= jdEnd; jd += STEP_DAYS) {
      const d = oppDiff(jd);
      // Zero-crossing: sign change from − to + with no wrap discontinuity
      if (prevDiff < 0 && d >= 0 && (d - prevDiff) < 30) {
        // Bisect to refine opposition to ~1-second precision
        let lo = prevJD, hi = jd;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          if (oppDiff(mid) < 0) lo = mid; else hi = mid;
          if (hi - lo < 1 / 86400) break;
        }
        const jdOpp = (lo + hi) / 2;
        const beta = deps.moonBetaDegAt(jdOpp);
        const absB = Math.abs(beta);

        // Per-event shadow geometry using the actual Moon distance at this
        // opposition — closes the ~5.5% perigee/apogee threshold variation.
        const D_moon_jd = deps.moonDistanceKmAt(jdOpp);
        const G = _shadowGeometry(D_moon_jd);

        let type = null;
        if (absB <= G.totalMax) type = 'Total';
        else if (absB <= G.partialMax) type = 'Partial';
        else if (absB <= G.penumMax) type = 'Penumbral';

        if (type) {
          const magUmbral = Math.max(0, (G.partialMax - absB) / (2 * G.moonR));
          const magPenumbral = Math.max(0, (G.penumMax - absB) / (2 * G.moonR));
          results.push({
            jd: jdOpp,
            beta: beta,
            moonDistance_km: D_moon_jd,
            type: type,
            magnitudeUmbral: magUmbral,    // 0 for Penumbral-only; (0,1) Partial; ≥1 Total
            magnitudePenumbral: magPenumbral,
          });
        }
      }
      prevDiff = d;
      prevJD = jd;
    }

    return results;
  }

  /**
   * Find all solar-eclipse-class conjunctions in [jdStart, jdEnd].
   * Events are timed at MINIMUM γ (NASA "greatest eclipse" convention).
   * @param {number} jdStart @param {number} jdEnd
   * @returns {Array<{jd: number, beta: number, moonDistance_km: number,
   *   type: string, moonAppR_topo: number, sunAppR: number, moonSunRatio: number}>}
   */
  function findSolarEclipsesInRange(jdStart, jdEnd) {
    const STEP_DAYS = deps.getSynodicMonthDays() / 60;
    const _rad2deg = 180 / Math.PI;
    const R_EARTH_KM = K.rEarthMetres / 1000;
    const R_MOON_KM = K.moonDiameterKm / 2;
    const R_SUN_KM = K.sunDiameterKm / 2;
    const D_SUN_KM = deps.getSunDistanceKm();
    const sunAppR = Math.atan(R_SUN_KM / D_SUN_KM) * _rad2deg;  // ~0.266°

    // Per-event geometry at conjunction (Meeus Ch. 54 simplified geocentric
    // form). "Topocentric" Moon size: at the sub-Moon point an observer is
    // 1 Earth-radius closer than the geocenter (ratio ≈ 1.017) — this is
    // what distinguishes total from annular when geocentric Moon ≈ Sun.
    /** @param {number} D_MOON_KM */
    const _solarGeometry = (D_MOON_KM) => {
      const moonAppR_geo = Math.atan(R_MOON_KM / D_MOON_KM) * _rad2deg;
      const moonAppR_topo = Math.atan(R_MOON_KM / (D_MOON_KM - R_EARTH_KM)) * _rad2deg;
      const parallax = Math.atan(R_EARTH_KM / D_MOON_KM) * _rad2deg;  // ~0.95°
      return {
        moonAppR_geo, moonAppR_topo, parallax, sunAppR,
        partialLim: sunAppR + moonAppR_geo + parallax,
        centralLim: parallax - Math.abs(moonAppR_topo - sunAppR),
        isTotal: moonAppR_topo > sunAppR,
      };
    };

    // Wrapped conjunction diff: 0 means Moon at conjunction with the Sun
    /** @param {number} jd */
    const conjDiff = (jd) => {
      let d = deps.moonLonDegAt(jd) - sunLonDegAt(jd);
      while (d > 180) d -= 360;
      while (d <= -180) d += 360;
      return d;
    };

    // Geocentric γ (Earth-radii): perpendicular distance from Earth's center
    // to the Sun–Moon line. NASA's "greatest eclipse" TD is the moment of
    // MINIMUM γ — typically 5–15 min from longitude conjunction, because at
    // conjunction the Moon may still be approaching in the β direction.
    const _d2r = Math.PI / 180;
    /** @param {number} jd */
    const gammaAtJd = (jd) => {
      const sunLonR = sunLonDegAt(jd) * _d2r;
      const moonLonR = deps.moonLonDegAt(jd) * _d2r;
      const moonBetR = deps.moonBetaDegAt(jd) * _d2r;
      const D_moon = deps.moonDistanceKmAt(jd);
      const D_sun = D_SUN_KM;
      const sX = D_sun * Math.cos(sunLonR), sY = D_sun * Math.sin(sunLonR);
      const cb = Math.cos(moonBetR);
      const mX = D_moon * cb * Math.cos(moonLonR);
      const mY = D_moon * cb * Math.sin(moonLonR);
      const mZ = D_moon * Math.sin(moonBetR);
      const dX = mX - sX, dY = mY - sY, dZ = mZ;
      const dLen = Math.sqrt(dX*dX + dY*dY + dZ*dZ);
      const ux = dX/dLen, uy = dY/dLen, uz = dZ/dLen;
      // Perpendicular distance from origin to the line through Moon along u
      const proj = mX*ux + mY*uy + mZ*uz;
      const perpX = mX - proj*ux, perpY = mY - proj*uy, perpZ = mZ - proj*uz;
      return Math.sqrt(perpX*perpX + perpY*perpY + perpZ*perpZ) / R_EARTH_KM;
    };

    // Refine conjunction-JD to true min-γ JD: coarse 1-min scan over ±20 min,
    // then parabolic interpolation on the 3 points around the minimum.
    /** @param {number} jdConj */
    const refineMinGamma = (jdConj) => {
      const stepMin = 1 / (24 * 60);
      let bestJD = jdConj, bestG = gammaAtJd(jdConj);
      for (let dt = -20; dt <= 20; dt++) {
        if (dt === 0) continue;
        const jd = jdConj + dt * stepMin;
        const g = gammaAtJd(jd);
        if (g < bestG) { bestG = g; bestJD = jd; }
      }
      const yL = gammaAtJd(bestJD - stepMin);
      const y0 = bestG;
      const yR = gammaAtJd(bestJD + stepMin);
      const denom = yL - 2*y0 + yR;
      if (Math.abs(denom) > 1e-15) {
        const delta = 0.5 * (yL - yR) / denom;  // fractional offset in [-1, +1]
        if (Math.abs(delta) < 1) {
          const refinedJD = bestJD + delta * stepMin;
          const refinedG = gammaAtJd(refinedJD);
          if (refinedG < bestG) return refinedJD;
        }
      }
      return bestJD;
    };

    const results = [];
    let prevJD = jdStart;
    let prevDiff = conjDiff(prevJD);

    for (let jd = jdStart + STEP_DAYS; jd <= jdEnd; jd += STEP_DAYS) {
      const d = conjDiff(jd);
      if (prevDiff < 0 && d >= 0 && (d - prevDiff) < 30) {
        // Bisect to ~1-second precision on conjunction
        let lo = prevJD, hi = jd;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          if (conjDiff(mid) < 0) lo = mid; else hi = mid;
          if (hi - lo < 1 / 86400) break;
        }
        const jdConj = (lo + hi) / 2;
        // Refine to NASA's "greatest eclipse" convention (minimum γ).
        const jdGreatest = refineMinGamma(jdConj);
        const beta = deps.moonBetaDegAt(jdGreatest);
        const absB = Math.abs(beta);
        const D_moon = deps.moonDistanceKmAt(jdGreatest);
        const G = _solarGeometry(D_moon);

        let type = null;
        if (absB <= G.centralLim) {
          type = G.isTotal ? 'Total' : 'Annular';
        } else if (absB <= G.partialLim) {
          type = 'Partial';
        }

        if (type) {
          results.push({
            jd: jdGreatest,
            beta: beta,
            moonDistance_km: D_moon,
            type: type,
            moonAppR_topo: G.moonAppR_topo,
            sunAppR: G.sunAppR,
            moonSunRatio: G.moonAppR_topo / G.sunAppR,
          });
        }
      }
      prevDiff = d;
      prevJD = jd;
    }

    return results;
  }

  return { sunLonDegAt, findLunarEclipsesInRange, findSolarEclipsesInRange };
}

module.exports = { createEclipseFinders };

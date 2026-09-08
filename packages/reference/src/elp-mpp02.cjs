/**
 * elp-mpp02.cjs — K8 slice 2: the STANDARD-MODEL reference evaluator for
 * the Moon (ELP/MPP02, Chapront & Francou 2003; corr = 1 DE-fit).
 *
 * A generic Poisson machine over RECORDED NUMBERS: the truncated series,
 * the theory's argument polynomials (Δ-set summed in) and the
 * frame-reduction polynomials are all baked into the artifact by
 * tools/pipeline/import-elp-mpp02.js — no theory code is duplicated from
 * the full port (tools/lib/elp-mpp02.js, which remains the model-side
 * instrument). Truncation is MEASURED (≤0.2″ lon/lat, ≤0.31 km over
 * ±1,000 yr — meta.truncation); beyond that span the ghost is a stated
 * extrapolation of the standard theory.
 *
 * DATA: the single home is data/elp-mpp02-truncated.json (tracked,
 * self-describing, PROVENANCE-covered); required directly, no copy.
 *
 * FRAME: the theory yields lon/lat/dist in the INERTIAL mean ecliptic of
 * date; this module applies the recorded reduction — +p_A (the ELP82B-lab
 * convention) → equinox of date → ε(t) → equatorial of date → inverse
 * IAU-1976 precession → equatorial J2000 → ε_J2000 → ECLIPTIC J2000 XYZ —
 * so the output rides the same frame bridge as every other ghost.
 * Delivered end-to-end accuracy is measured by
 * tools/explore/k8-vsop-probe.mjs against the JPL Horizons cache.
 *
 * ONE-WAY BOUNDARY (the K2 doctrine): comparison surfaces only.
 */

'use strict';

const ART = require('../../../data/elp-mpp02-truncated.json');

const PI = Math.PI;
const SEC = PI / 648000;                  // arcsec → rad (theory convention)
const DEG = PI / 180;
const J2000_JD = 2451545.0;               // the theory's own epoch
const CY_DAYS = 36525;                    // Julian century (theory time unit)

const mod2pi = (x) => x - 2 * PI * Math.floor((x + PI) / (2 * PI));
const poly = (c, t) => c.reduce((s, v, i) => s + v * Math.pow(t, i), 0);

/** Argument value with the port's exact per-term mod2pi shape. */
function argPoly(a, T) {
  let v = a.c0;
  let tPow = T;
  for (let i = 0; i < a.c.length; i++) {
    v += mod2pi(a.c[i] * tPow * SEC);
    tPow *= T;
  }
  return v;
}

function computeArgs(T) {
  const A = ART.meta.argPolys;
  const W1 = mod2pi(argPoly(A.W1, T));
  const W2 = mod2pi(argPoly(A.W2, T));
  const W3 = mod2pi(argPoly(A.W3, T));
  const Ea = mod2pi(argPoly(A.Ea, T));
  const pomp = mod2pi(argPoly(A.pomp, T));
  const pl = (q) => mod2pi(q.c0 + mod2pi(q.c1 * T * SEC));
  const P = A.planets;
  return {
    W1,
    D: mod2pi(W1 - Ea + PI),
    F: mod2pi(W1 - W3),
    L: mod2pi(W1 - W2),
    Lp: mod2pi(Ea - pomp),
    zeta: mod2pi(W1 + A.zetaRateRadPerCy * T),
    Me: pl(P.Me), Ve: pl(P.Ve), EM: pl(P.EM), Ma: pl(P.Ma),
    Ju: pl(P.Ju), Sa: pl(P.Sa), Ur: pl(P.Ur), Ne: pl(P.Ne),
  };
}

/** @param {{n:number,mult:number[][],amp:number[]}} s */
function mainSum(s, a, cosine) {
  let sum = 0;
  for (let i = 0; i < s.n; i++) {
    const m = s.mult[i];
    const ph = m[0] * a.D + m[1] * a.F + m[2] * a.L + m[3] * a.Lp;
    sum += s.amp[i] * (cosine ? Math.cos(ph) : Math.sin(ph));
  }
  return sum;
}

/** @param {{n:number,mult:number[][],amp:number[],ph:number[]}} s */
function pertSum(s, a) {
  let sum = 0;
  for (let i = 0; i < s.n; i++) {
    const m = s.mult[i];
    const ph = s.ph[i] + m[0] * a.D + m[1] * a.F + m[2] * a.L + m[3] * a.Lp
      + m[4] * a.Me + m[5] * a.Ve + m[6] * a.EM + m[7] * a.Ma + m[8] * a.Ju
      + m[9] * a.Sa + m[10] * a.Ur + m[11] * a.Ne + m[12] * a.zeta;
    sum += s.amp[i] * Math.sin(ph);
  }
  return sum;
}

/**
 * The Moon in the theory's native frame: geocentric lon/lat (rad, inertial
 * mean ecliptic of date) and distance (km).
 * @param {number} jd - Julian day (TDB-class)
 * @returns {{lon:number, lat:number, dist:number}}
 */
function mpp02NativeLonLatDist(jd) {
  const T = (jd - J2000_JD) / CY_DAYS;
  const a = computeArgs(T);
  const T2 = T * T, T3 = T * T2;
  const P = ART.pert;
  const lon = a.W1 + mainSum(ART.main.long, a, false) + pertSum(P.long[0], a)
    + mod2pi(pertSum(P.long[1], a) * T)
    + mod2pi(pertSum(P.long[2], a) * T2)
    + mod2pi(pertSum(P.long[3], a) * T3);
  const lat = mainSum(ART.main.lat, a, false) + pertSum(P.lat[0], a)
    + mod2pi(pertSum(P.lat[1], a) * T)
    + mod2pi(pertSum(P.lat[2], a) * T2);
  const dist = ART.meta.reduction.ra0 * (mainSum(ART.main.dist, a, true)
    + pertSum(P.dist[0], a) + pertSum(P.dist[1], a) * T
    + pertSum(P.dist[2], a) * T2 + pertSum(P.dist[3], a) * T3);
  return { lon: mod2pi(lon), lat, dist };
}

/**
 * Geocentric ECLIPTIC-J2000 position of the Moon, in km — geometric
 * (light-time is the caller's convention; for the Moon τ ≈ 1.3 s).
 * @param {number} jd - Julian day
 * @returns {[number, number, number]} [x, y, z] km, ecliptic and equinox J2000
 */
function mpp02GeoEclipticJ2000Km(jd) {
  const R = ART.meta.reduction;
  const T = (jd - J2000_JD) / CY_DAYS;
  const n = mpp02NativeLonLatDist(jd);
  // inertial → equinox of date (add accumulated general precession p_A)
  const lon = n.lon + poly(R.pAArcsec, T) * SEC;
  // ecliptic-of-date XYZ
  const cb = Math.cos(n.lat);
  const x = n.dist * cb * Math.cos(lon);
  const y0 = n.dist * cb * Math.sin(lon);
  const z0 = n.dist * Math.sin(n.lat);
  // ecliptic of date → equatorial of date (ε(t))
  const eps = poly(R.epsDeg, T) * DEG;
  let ce = Math.cos(eps), se = Math.sin(eps);
  const y = y0 * ce - z0 * se, z = y0 * se + z0 * ce;
  // equatorial of date → equatorial J2000: TRANSPOSE of the Meeus Ch. 21
  // precession matrix — the element formulas mirror the repo home
  // (tools/lib/precession.js j2000ToOfDate / ofDateToJ2000) exactly.
  const zeta = poly([0, ...R.zetaAArcsec], T) * SEC;
  const zA = poly([0, ...R.zAArcsec], T) * SEC;
  const th = poly([0, ...R.thetaAArcsec], T) * SEC;
  const cZ = Math.cos(zA), sZ = Math.sin(zA);
  const cT = Math.cos(th), sT = Math.sin(th);
  const cZe = Math.cos(zeta), sZe = Math.sin(zeta);
  const P11 = cZ * cT * cZe - sZ * sZe, P12 = -cZ * cT * sZe - sZ * cZe, P13 = -cZ * sT;
  const P21 = sZ * cT * cZe + cZ * sZe, P22 = -sZ * cT * sZe + cZ * cZe, P23 = -sZ * sT;
  const P31 = sT * cZe, P32 = -sT * sZe, P33 = cT;
  // v_J2000 = Pᵀ · v_date
  const v = [
    P11 * x + P21 * y + P31 * z,
    P12 * x + P22 * y + P32 * z,
    P13 * x + P23 * y + P33 * z,
  ];
  // equatorial J2000 → ecliptic J2000 (ε at T = 0)
  const e0 = R.epsDeg[0] * DEG;
  ce = Math.cos(e0); se = Math.sin(e0);
  return [v[0], v[1] * ce + v[2] * se, -v[1] * se + v[2] * ce];
}

/**
 * ASTROMETRIC geocentric Moon (ecliptic J2000, km) — the Horizons
 * quantity-1 convention IN THE BARYCENTRIC FRAME: the body at the
 * retarded time, EARTH AT RECEPTION TIME. MPP02 is Earth-centered, so
 * retarding its geocentric vector alone retards Earth too; the missing
 * cross term is −v⊕·τ (≈ v⊕/c ≈ 20.5″ for the Moon, since τ = d/c —
 * distance-independent). MEASURED before shipping: the omission shows as
 * a −19.6″·cos(elongation) along-track residual vs the JPL cache; with
 * the term the residual drops to ~6″ (the ΔT-model class). The same
 * "Earth at reception time" principle as the VSOP astrometric fix, seen
 * across frames. Earth's velocity comes from this package's own VSOP87
 * Earth (central difference, ±0.5 d) — the reference stays
 * self-contained.
 * @param {number} jd - Julian day (TT-class; the caller owns ΔT)
 * @param {number} lightDaysPerAU - light-time per AU in days (from the
 *   caller's c/AU homes)
 * @param {number} kmPerAU - the caller's AU in km
 * @returns {[number, number, number]} [x, y, z] km, ecliptic J2000
 */
function mpp02AstrometricGeoEclipticJ2000Km(jd, lightDaysPerAU, kmPerAU) {
  const { vsop87HelioEclipticAU } = require('./vsop87.cjs');
  const g0 = mpp02GeoEclipticJ2000Km(jd);
  const tauDays = Math.hypot(g0[0], g0[1], g0[2]) / kmPerAU * lightDaysPerAU;
  const g = mpp02GeoEclipticJ2000Km(jd - tauDays);
  const e1 = vsop87HelioEclipticAU('earth', jd - 0.5);
  const e2 = vsop87HelioEclipticAU('earth', jd + 0.5);
  // −v⊕·τ, in km: v⊕ [AU/day] × τ [day] × kmPerAU
  const k = tauDays * kmPerAU;
  return [
    g[0] - (e2[0] - e1[0]) * k,
    g[1] - (e2[1] - e1[1]) * k,
    g[2] - (e2[2] - e1[2]) * k,
  ];
}

module.exports = { mpp02NativeLonLatDist, mpp02GeoEclipticJ2000Km, mpp02AstrometricGeoEclipticJ2000Km, MPP02_META: ART.meta };

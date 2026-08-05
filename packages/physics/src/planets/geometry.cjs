/**
 * Planet orbital geometry — THE shared implementation (Phase 8.3, layer L1).
 *
 * ONE law set, N body records: the derivation the browser hand-unrolled per
 * planet (mercurySolarYearCount … halleysRotationPeriod, src/script.js
 * ~2145–2237) and Node kept as computePlanetDerived/computeAdditionalDerived
 * (tools/lib/constants.js). This file replaces all three copies with one
 * type-branched function over a body record — the shape the model's claim
 * has always had (six laws, per-body parameters).
 *
 * EXPRESSION FORMS ARE THE BROWSER'S (the certified engine) — e.g.
 * `Math.round((H·mSY)/input)`, `((H/N)**2)**(1/3)` — so browser bit-identity
 * holds by construction; Node's last-ulp variants dissolve here (the
 * cardinal-extraction pattern).
 *
 * Type classification (the survey's measured taxonomy):
 *  - Type I  (mercury, venus): peri = a·e_real·100, elip = peri/2
 *  - Type II (mars, eros):     elip first, peri = a·e_base·100 + elip
 *  - Type III (jupiter…neptune): elip = geocentric 2·e_E·100·sin(ϖ_E − ϖ_p)
 *    — the only formula that reads Earth's elements; peri = e_real·a·100
 *  - pluto:   peri = e_BASE·a·100 (raw base, no e_real), elip = peri/2
 *  - halleys: elip = (e_base·a − e_real·a)·100, peri = e_real·a·2·100
 *  - ceres:   orbitDistanceOverride, geometry-only (no ellipse family)
 *  - mercury rotation: the 3:2 spin-orbit lock (period from N, not a
 *    rotation input)
 *
 * Saturn's scene-side negation of elipticOrbit (antiPhase) is a SCENE
 * convention and stays engine-side.
 */

'use strict';

/**
 * @typedef {{
 *   key: string,
 *   type?: string,
 *   solarYearInput: number,
 *   orbitalEccentricityBase?: number,
 *   longitudePerihelion?: number,
 *   ascendingNode?: number,
 *   rotationPeriodDays?: number,
 *   orbitDistanceOverride?: number,
 * }} PlanetGeometryBody
 */

/**
 * @param {PlanetGeometryBody} body
 * @param {{
 *   holisticYears: number,
 *   meanSolarYearDays: number,
 *   currentAUDistanceKm: number,
 *   earthEccentricityJ2000: number,
 *   earthPerihelionLongitudeJ2000Deg: number,
 * }} env — the engine's J2000 values (browser passes its live globals at
 *   load time, preserving its original initial-derivation semantics; the
 *   epoch machinery that later mutates the browser's `let` aliases is
 *   untouched by this layer).
 * @returns {{
 *   solarYearCount: number, orbitDistance: number, periodYears: number,
 *   realOrbitalEccentricity: (number | undefined),
 *   elipticOrbit: (number | undefined), perihelionDistance: (number | undefined),
 *   speedKmh: number, rotationPeriodHours: (number | undefined),
 *   eccentricityPerihelion: (number | undefined), lowestPoint: (number | undefined),
 * }}
 */
function derivePlanetGeometry(body, env) {
  const { key, type, solarYearInput, orbitalEccentricityBase: base,
          longitudePerihelion, ascendingNode, rotationPeriodDays, orbitDistanceOverride } = body;
  const { holisticYears: H, meanSolarYearDays: mSY, currentAUDistanceKm: AU,
          earthEccentricityJ2000, earthPerihelionLongitudeJ2000Deg } = env;

  const solarYearCount = Math.round((H * mSY) / solarYearInput);
  const orbitDistance = orbitDistanceOverride !== undefined
    ? orbitDistanceOverride
    : ((H / solarYearCount) ** 2) ** (1 / 3);
  const periodYears = H / solarYearCount;
  const speedKmh = (orbitDistance * AU * Math.PI * 2) / (mSY * (H / solarYearCount)) / 24;

  /** @type {number | undefined} */
  let realOrbitalEccentricity;
  /** @type {number | undefined} */
  let elipticOrbit;
  /** @type {number | undefined} */
  let perihelionDistance;
  /** @type {number | undefined} */
  let eccentricityPerihelion;

  if (key === 'ceres') {
    // Geometry-only body — no ellipse family in either engine.
  } else if (key === 'pluto') {
    realOrbitalEccentricity = undefined;   // deliberately absent (raw base used)
    perihelionDistance = /** @type {number} */ (base) * orbitDistance * 100;
    elipticOrbit = perihelionDistance / 2;
  } else if (key === 'halleys') {
    const b = /** @type {number} */ (base);
    realOrbitalEccentricity = b / (1 + b);
    elipticOrbit = ((b * orbitDistance) - (realOrbitalEccentricity * orbitDistance)) * 100;
    perihelionDistance = realOrbitalEccentricity * orbitDistance * 2 * 100;
  } else if (type === 'I') {
    const b = /** @type {number} */ (base);
    realOrbitalEccentricity = b / (1 + b);
    perihelionDistance = orbitDistance * realOrbitalEccentricity * 100;
    elipticOrbit = perihelionDistance / 2;
    eccentricityPerihelion = (perihelionDistance / 2) * b;
  } else if (type === 'II') {
    const b = /** @type {number} */ (base);
    realOrbitalEccentricity = b / (1 + b);
    elipticOrbit = ((realOrbitalEccentricity * orbitDistance) / 2) * 100
                 + ((b * orbitDistance) - (realOrbitalEccentricity * orbitDistance)) * 100;
    perihelionDistance = (orbitDistance * b * 100) + elipticOrbit;
  } else if (type === 'III') {
    const b = /** @type {number} */ (base);
    realOrbitalEccentricity = b / (1 + b);
    // Geocentric correction: Earth's eccentricity creates annual parallax
    // variation ∝ sin(ϖ_Earth − ϖ_planet); factor 2 from off-centre geometry.
    const dw = (earthPerihelionLongitudeJ2000Deg - /** @type {number} */ (longitudePerihelion)) * Math.PI / 180;
    elipticOrbit = 2 * earthEccentricityJ2000 * 100 * Math.sin(dw);
    perihelionDistance = realOrbitalEccentricity * orbitDistance * 100;
  }

  /** @type {number | undefined} */
  let rotationPeriodHours;
  if (key === 'mercury') {
    // 3:2 spin-orbit lock — period from the orbit count itself.
    rotationPeriodHours = 24 * (mSY * H) / (solarYearCount * 3 / 2);
  } else if (rotationPeriodDays !== undefined) {
    rotationPeriodHours = 24 * (mSY * H) / Math.round((mSY * H) / rotationPeriodDays);
  }

  const lowestPoint = ascendingNode !== undefined ? 180 - ascendingNode : undefined;

  return {
    solarYearCount, orbitDistance, periodYears, realOrbitalEccentricity,
    elipticOrbit, perihelionDistance, speedKmh, rotationPeriodHours,
    eccentricityPerihelion, lowestPoint,
  };
}

module.exports = { derivePlanetGeometry };

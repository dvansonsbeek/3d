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
 * EXPRESSION FORMS ARE THE BROWSER'S (the certified engine) — so browser
 * bit-identity holds by construction; Node's last-ulp variants dissolve here
 * (the cardinal-extraction pattern).
 *
 * PLAN 09 STEP 7b: the device count is gone. The geometry used to quantize
 * every body's period onto the unit — N = round(H·mSY/input) orbits per
 * anchor interval, period H/N, a = (H/N)^(2/3) — a rounding of up to half a
 * count (2.5e-4 of Neptune's period). The caller now hands in the period in
 * SI days directly (the chain's J2000 window mean motion for the seven chain
 * planets, the observed input for the no-chain bodies) and, where a chain
 * exists, the chain's J2000 semi-major axis; Kepler's a from the period is the
 * fallback for the no-chain bodies. Rotation periods are the inputs (they were
 * rounded onto the count too), Mercury's the 3:2 lock on its orbital period.
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
 *
 * THE ELLIPSE FAMILY IS A CODE TAXONOMY, ONE HOME HERE (plan 11 step 3):
 * `SCAFFOLD_ELLIPSE_FAMILY` names each body's branch. It left the inputs
 * (model-parameters.json `planets.<p>.type`) because it is not a model
 * parameter — it is the shape of the geocentric scaffold's wheel ellipses,
 * which the engine-D chain overrides for every rendered planet quantity
 * (mesh, ring, trace, markers; the perihelion-at-Earth marker's radius is
 * the chain's a·e of date since step 3). The wheel radii stay bit-identical
 * on every runtime by construction. Eros borrows the type-II family; a
 * perturbation-aware minor-body family would land as one new branch here.
 */

'use strict';

/**
 * Each body's scaffold ellipse family (the survey's measured taxonomy above).
 * Pluto, Halley and Ceres take their body-name branches; a key absent here
 * has no ellipse family (geometry-only).
 * @type {Readonly<Record<string, string>>}
 */
const SCAFFOLD_ELLIPSE_FAMILY = Object.freeze({
  mercury: 'I', venus: 'I', mars: 'II',
  jupiter: 'III', saturn: 'III', uranus: 'III', neptune: 'III',
  eros: 'II',
});

/**
 * @typedef {{
 *   key: string,
 *   periodDays: number,
 *   semiMajorAxisAu?: number,
 *   orbitalEccentricityBase?: number,
 *   longitudePerihelion?: number,
 *   ascendingNode?: number,
 *   rotationPeriodDays?: number,
 *   orbitDistanceOverride?: number,
 * }} PlanetGeometryBody
 */

/**
 * @param {PlanetGeometryBody} body — `periodDays` the body's sidereal orbital
 *   period in SI days; `semiMajorAxisAu` the chain's J2000 a where a chain
 *   exists (else Kepler's a from the period, in the scene's solar-year units)
 * @param {{
 *   meanSolarYearDays: number,
 *   currentAUDistanceKm: number,
 *   earthEccentricityJ2000: number,
 *   earthPerihelionLongitudeJ2000Deg: number,
 * }} env — the engine's J2000 values; `meanSolarYearDays` is the scene's
 *   year unit (`pos` counts mean solar years), so `periodYears` is the period
 *   in that unit, the scaffold's `speed` = 2π/periodYears.
 * @returns {{
 *   orbitDistance: number, periodYears: number, periodDays: number,
 *   realOrbitalEccentricity: (number | undefined),
 *   elipticOrbit: (number | undefined), perihelionDistance: (number | undefined),
 *   speedKmh: number, rotationPeriodHours: (number | undefined),
 *   eccentricityPerihelion: (number | undefined), lowestPoint: (number | undefined),
 *   ellipseFamily: (string | undefined),
 * }}
 */
function derivePlanetGeometry(body, env) {
  const { key, periodDays, semiMajorAxisAu, orbitalEccentricityBase: base,
          longitudePerihelion, ascendingNode, rotationPeriodDays, orbitDistanceOverride } = body;
  // The ellipse family is the law's own taxonomy (plan 11 step 3: the
  // scaffold `type` left the inputs for every body): Pluto and Halley take
  // the body-name branches below, the rest read SCAFFOLD_ELLIPSE_FAMILY.
  const type = SCAFFOLD_ELLIPSE_FAMILY[key];
  const { meanSolarYearDays: mSY, currentAUDistanceKm: AU,
          earthEccentricityJ2000, earthPerihelionLongitudeJ2000Deg } = env;

  const periodYears = periodDays / mSY;   // in the scene's year unit (mean solar years)
  const orbitDistance = orbitDistanceOverride !== undefined
    ? orbitDistanceOverride
    : semiMajorAxisAu !== undefined
      ? semiMajorAxisAu
      : (periodYears ** 2) ** (1 / 3);
  const speedKmh = (orbitDistance * AU * Math.PI * 2) / periodDays / 24;

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
    // 3:2 spin-orbit lock — three sidereal rotations per two orbits.
    rotationPeriodHours = 24 * periodDays / (3 / 2);
  } else if (rotationPeriodDays !== undefined) {
    rotationPeriodHours = 24 * rotationPeriodDays;
  }

  const lowestPoint = ascendingNode !== undefined ? 180 - ascendingNode : undefined;

  return {
    orbitDistance, periodYears, periodDays, realOrbitalEccentricity,
    elipticOrbit, perihelionDistance, speedKmh, rotationPeriodHours,
    eccentricityPerihelion, lowestPoint,
    ellipseFamily: type,   // the scaffold wheel family this record was built on ('I' | 'II' | 'III' | undefined)
  };
}

/**
 * The scaffold's orbit inputs for one body — ONE home for the rule (plan 09
 * step 7b): where the governed engine-D chain artifact has the body, the
 * chain's J2000 semi-major axis and its fitted era-window mean motion (deg
 * per Julian year → the period in SI days); otherwise the body's observed
 * period input (the no-chain bodies Pluto, Halley, Eros, Ceres).
 * @param {string} key
 * @param {any} chainArtifact the CHAIN_ARTIFACT (or the governed JSON it embeds)
 * @param {number} fallbackPeriodDays the observed period input, SI days
 * @returns {{ periodDays: number, semiMajorAxisAu: (number | undefined) }}
 */
function scaffoldOrbitInputs(key, chainArtifact, fallbackPeriodDays) {
  const w = chainArtifact && chainArtifact.windowElementRates && chainArtifact.windowElementRates[key];
  const a = chainArtifact && chainArtifact.j2000AnchorElements && chainArtifact.j2000AnchorElements[key];
  if (w && a) return { periodDays: 360 / w.meanMotionDegPerYr * 365.25, semiMajorAxisAu: a.aAU };
  return { periodDays: fallbackPeriodDays, semiMajorAxisAu: undefined };
}

module.exports = { derivePlanetGeometry, scaffoldOrbitInputs, SCAFFOLD_ELLIPSE_FAMILY };

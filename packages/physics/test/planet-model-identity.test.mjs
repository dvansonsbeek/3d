/**
 * createPlanetModel must be BIT-IDENTICAL to the shipped Node derivation.
 *
 * The factory (planets/model.cjs, Phase 8.3 L10) composes the extracted law
 * modules in the certified order; tools/lib/constants.js runs the same chain
 * inline at load. Any difference is a composition defect — wrong order, wrong
 * guard, wrong field wiring — full stop. Exact comparison with Object.is,
 * no tolerance (layer0-identity convention).
 *
 * The factory is driven by the INPUT fields only (the picked list below);
 * the shipped law outputs it is compared against never enter it, so this is
 * a real derivation check, not a copy check.
 *
 *   node packages/physics/test/planet-model-identity.test.mjs
 *   node packages/physics/test/planet-model-identity.test.mjs --plant
 *
 * --plant perturbs the Sun mass by 1 ULP and EXPECTS mismatches — the proof
 * this gate fails on a violation (CLAUDE.md: every gate must be shown to
 * fail on a planted violation, not merely pass on clean code).
 */
import { createRequire } from 'node:module';
import { createPlanetModel } from '../src/planets/model.cjs';

const require = createRequire(import.meta.url);

// tools/lib is PRE-MIGRATION and outside the typecheck scope; runtime path
// assembly keeps the checker out (same bridge as layer0-identity.test.mjs).
const TOOLS_LIB = '../../../tools/lib/';
const C = require(`${TOOLS_LIB}constants.js`);

const plant = process.argv.includes('--plant');

const env = {
  holisticYears: C.H,
  meanSolarYearDays: C.meanSolarYearDays,
  balancedYear: C.balancedYear,
  systemResetN: C.systemResetN,
  currentAUDistanceKm: C.currentAUDistance,
  earthEccentricityJ2000: C.ASTRO_REFERENCE.earthEccentricityJ2000,
  earthPerihelionLongitudeJ2000Deg: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  calibration: {
    earthInvPlaneInclinationAmplitude: C.earthInvPlaneInclinationAmplitude,
    massEarthAlone: C.GM_EARTH_ALONE / C.G_CONSTANT,
    // The planted violation: 1 ULP on the Sun mass must surface as mismatches
    // in ψ- and K-family outputs across every carrier.
    massSun: plant ? C.M_SUN * (1 + 2.3e-16) : C.M_SUN,
    eccentricityAmplitude: C.eccentricityAmplitude,
    earthTiltMeanDeg: C.earthtiltMean,
  },
  massFractions: C.massFraction,
};

// INPUT fields only. C.planets records are mutated in place by the load-time
// chain (law outputs land on the same objects); picking prevents a shipped
// output from leaking in as an input.
/** @param {*} b @returns {import('../src/planets/model.cjs').PlanetModelBody} */
const pickInputs = (b) => ({
  type: b.type,
  solarYearInput: b.solarYearInput,
  fibonacciD: b.fibonacciD,
  invPlaneInclinationJ2000: b.invPlaneInclinationJ2000,
  longitudePerihelion: b.longitudePerihelion,
  inclinationCycleAnchor: b.inclinationCycleAnchor,
  antiPhase: b.antiPhase,
  perihelionEclipticYears: b.perihelionEclipticYears,
  axialPrecessionYears: b.axialPrecessionYears,
  obliquityCycle: b.obliquityCycle,
  axialTiltJ2000: b.axialTiltJ2000,
  orbitalEccentricityJ2000: b.orbitalEccentricityJ2000,
  ascendingNode: b.ascendingNode,
  orbitDistanceOverride: b.orbitDistanceOverride,
});

/** @type {Record<string, import('../src/planets/model.cjs').PlanetModelBody>} */
const bodies = {};
for (const [key, p] of Object.entries(C.planets)) {
  bodies[key] = pickInputs(p);
}
for (const [key, b] of Object.entries(C.additionalBodies)) {
  bodies[key] = {
    ...pickInputs(b),
    // The engine's eros type fallback (constants.js computeAdditionalDerived)
    // is caller policy, not law — replicated here, not in the factory.
    type: b.type || (key === 'eros' ? 'II' : undefined),
    // Minor bodies: the eccentricity base is a JSON input (no K law).
    orbitalEccentricityBase: b.orbitalEccentricityBase,
  };
}

const model = createPlanetModel(env, bodies);

let checks = 0;
let fails = 0;
/** @type {string[]} */
const report = [];
/** @param {string} label @param {number|undefined} expected @param {number|undefined} actual */
const cmp = (label, expected, actual) => {
  if (expected === undefined) return; // field not shipped for this body
  checks += 1;
  if (!Object.is(expected, actual)) {
    fails += 1;
    if (report.length < 12) report.push(`  ${label}: shipped=${expected} model=${actual}`);
  }
};

cmp('kConstant', C.eccentricityAmplitudeK, model.kConstant);
cmp('eccentricityAnchor', C.eccentricityAnchor, model.eccentricityAnchor);

for (const [key, p] of Object.entries(C.planets)) {
  const rec = model.bodies[key];
  cmp(`${key}.invPlaneInclinationAmplitude`, p.invPlaneInclinationAmplitude, rec.invPlaneInclinationAmplitude);
  cmp(`${key}.invPlaneInclinationMean`, p.invPlaneInclinationMean, rec.invPlaneInclinationMean);
  cmp(`${key}.wobblePeriod`, p.wobblePeriod, rec.wobblePeriodYears);
  cmp(`${key}.obliquityMean`, p.obliquityMean, rec.obliquityMeanDeg);
  cmp(`${key}.eccAmplitude`, p.orbitalEccentricityAmplitude, rec.eccentricityAmplitude);
  cmp(`${key}.eccBase`, p.orbitalEccentricityBase, rec.eccentricityBase);
  cmp(`${key}.eccPhaseJ2000`, p.eccentricityPhaseJ2000, rec.eccentricityPhaseJ2000Deg);
  const d = C.derived[key];
  cmp(`${key}.solarYearCount`, d.solarYearCount, rec.geometry.solarYearCount);
  cmp(`${key}.orbitDistance`, d.orbitDistance, rec.geometry.orbitDistance);
  cmp(`${key}.period`, d.period, rec.geometry.periodYears);
  cmp(`${key}.perihelionDistance`, d.perihelionDistance, rec.geometry.perihelionDistance);
  cmp(`${key}.elipticOrbit`, d.elipticOrbit, rec.geometry.elipticOrbit);
  cmp(`${key}.realOrbitalEccentricity`, d.realOrbitalEccentricity, rec.geometry.realOrbitalEccentricity);
  cmp(`${key}.speed_kmh`, d.speed_kmh, rec.geometry.speedKmh);
}

for (const [key] of Object.entries(C.additionalBodies)) {
  const rec = model.bodies[key];
  const d = C.additionalDerived[key];
  cmp(`${key}.solarYearCount`, d.solarYearCount, rec.geometry.solarYearCount);
  cmp(`${key}.orbitDistance`, d.orbitDistance, rec.geometry.orbitDistance);
  cmp(`${key}.period`, d.period, rec.geometry.periodYears);
  cmp(`${key}.perihelionDistance`, d.perihelionDistance, rec.geometry.perihelionDistance);
  cmp(`${key}.elipticOrbit`, d.elipticOrbit, rec.geometry.elipticOrbit);
  cmp(`${key}.realOrbitalEccentricity`, d.realOrbitalEccentricity, rec.geometry.realOrbitalEccentricity);
}

if (plant) {
  if (fails > 0) {
    console.log(`PLANT — ${fails}/${checks} mismatches under a 1-ULP Sun-mass perturbation.`);
    console.log('PASS — the gate fails on a planted violation.');
    process.exit(0);
  }
  console.error(`PLANT FAILURE — ${checks} checks all passed despite the perturbation; the gate proves nothing.`);
  process.exit(1);
}

if (fails > 0) {
  console.error(`FAIL — ${fails}/${checks} planet-model values diverge from the shipped derivation:`);
  for (const line of report) console.error(line);
  process.exit(1);
}
console.log(`  ${checks} planet-model values checked`);
console.log('PASS — createPlanetModel ≡ the shipped Node derivation, bit-exact.');

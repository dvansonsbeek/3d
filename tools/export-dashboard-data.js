#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD DATA EXPORT — Generate JSON files for the orbital data dashboard
//
// Usage: node tools/export-dashboard-data.js
//
// Outputs to dashboard/data/:
//   earth.json, mercury.json, ..., neptune.json, metadata.json
// ═══════════════════════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const C = require('./lib/constants');
const OE = require('./lib/orbital-engine');

const OUTPUT_DIR = path.join(__dirname, '..', 'dashboard', 'data');

// ── Configuration ──────────────────────────────────────────────────────────

const STEP = 29;                          // years between data points
const H = C.H;                            // 335,008 — one full Holistic Year
const startYear = C.balancedYear;         // start of the cycle
const endYear = startYear + 2 * H;        // 2 full Holistic Years
const PLANET_NAMES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const PLANET_COLORS = {
  earth:   '#2e64be',
  mercury: '#6e6e6e',
  venus:   '#d5ab37',
  mars:    '#b03a2e',
  jupiter: '#c97e4f',
  saturn:  '#d9b65c',
  uranus:  '#37c6d0',
  neptune: '#2c539e',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function generateYears(from, to, step) {
  const years = [];
  for (let y = from; y <= to; y += step) {
    years.push(Math.round(y * 100) / 100);
  }
  return years;
}

function computePlanetBalancedYear(planetName) {
  const p = C.planets[planetName];
  const phaseJ2000 = p.eccentricityPhaseJ2000;
  const cycleLength = C.perihelionCycleLength;
  return 2000 - (phaseJ2000 / 360) * cycleLength;
}

// Linear ascending node (fallback for Earth which has no orbitTilta/b in constants)
function computeAscendingNodeLinear(ascNodeJ2000, precessionPeriod, year) {
  const rate = 360 / precessionPeriod;
  return ((ascNodeJ2000 + rate * (year - 2000)) % 360 + 360) % 360;
}

// ── Export Earth data ──────────────────────────────────────────────────────

function exportEarth(years) {
  console.log(`  Earth: computing ${years.length} data points...`);

  const eccentricity = [], obliquity = [], inclination = [];
  const inclinationTilt = [], axialTilt = [];
  const inclinationTiltRel = [], axialTiltRel = [];
  const lonPerihelion = [], ascendingNode = [], argPerihelion = [];
  const tropicalYearDays = [], siderealYearDays = [];
  const precessionPeriod = [], erd = [];

  // Earth's perihelion precession period and ascending node
  const earthPeriPeriod = C.perihelionCycleLength;
  const earthAscNodeJ2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane || 284.51;

  for (const year of years) {
    const el = OE.computeEarthOrbitalElements(year);
    eccentricity.push(+el.eccentricity.toFixed(8));
    obliquity.push(+el.obliquity.toFixed(6));
    inclination.push(+el.inclination.toFixed(6));

    // Obliquity components: H/3 = inclination tilt, H/8 = axial tilt
    const integrals = OE.computeObliquityIntegrals(year);
    // Inclination tilt absolute = mean inclination + H/3 component
    inclinationTilt.push(+(C.earthInvPlaneInclinationMean + integrals.component3).toFixed(6));
    // Axial tilt absolute = mean obliquity + H/8 component (centered on ~23.41°)
    axialTilt.push(+(C.earthtiltMean + integrals.component8).toFixed(6));
    // Relative deviations from mean (same amplitude, directly comparable)
    inclinationTiltRel.push(+integrals.component3.toFixed(6));
    axialTiltRel.push(+integrals.component8.toFixed(6));
    tropicalYearDays.push(+el.solarYearDays.toFixed(10));
    siderealYearDays.push(+el.siderealYearDays.toFixed(10));
    precessionPeriod.push(+el.precession.toFixed(2));
    erd.push(+el.erd.toFixed(8));

    // Perihelion longitude (from predictive 21-harmonic formula)
    lonPerihelion.push(+el.perihelionLong.toFixed(4));

    // Ascending node (linear precession for Earth)
    const ascNode = computeAscendingNodeLinear(earthAscNodeJ2000, earthPeriPeriod, year);
    ascendingNode.push(+ascNode.toFixed(4));

    // Argument of perihelion: ω = lon_perihelion - ascending_node
    const omega = ((el.perihelionLong - ascNode) % 360 + 360) % 360;
    argPerihelion.push(+omega.toFixed(4));
  }

  return {
    planet: 'earth',
    generated: new Date().toISOString(),
    fullCycle: {
      years, eccentricity, obliquity, inclination,
      inclinationTilt, axialTilt, inclinationTiltRel, axialTiltRel,
      lonPerihelion, ascendingNode, argPerihelion,
      tropicalYearDays, siderealYearDays, precessionPeriod, erd,
    },
    constants: {
      eccentricityBase: C.eccentricityBase,
      eccentricityAmplitude: C.eccentricityAmplitude,
      eccentricityJ2000: C.ASTRO_REFERENCE.earthEccentricityJ2000,
      obliquityMean: C.earthtiltMean,
      inclinationMean: C.earthInvPlaneInclinationMean,
      inclinationAmplitude: C.earthInvPlaneInclinationAmplitude,
      perihelionCycleLength: C.perihelionCycleLength,
      holisticYear: H,
      balancedYear: C.balancedYear,
      fibonacciD: 3,
      type: 'II',
    },
  };
}

// ── Export planet data ─────────────────────────────────────────────────────

function exportPlanet(planetName, years) {
  const p = C.planets[planetName];
  console.log(`  ${planetName}: computing ${years.length} data points...`);

  const planetBalancedYear = computePlanetBalancedYear(planetName);
  const cycleLength = C.perihelionCycleLength;

  const eccentricity = [], inclination = [], obliquity = [];
  const inclinationTilt = [];
  const lonPerihelion = [], ascendingNode = [], argPerihelion = [];

  for (const year of years) {
    // Eccentricity
    const ecc = OE.computeEccentricity(
      year, planetBalancedYear, cycleLength,
      p.orbitalEccentricityBase, p.orbitalEccentricityAmplitude
    );
    eccentricity.push(+ecc.toFixed(8));

    // Invariable-plane inclination (dynamic oscillation)
    const incl = OE.computePlanetInvPlaneInclinationDynamic(planetName, year);
    inclination.push(+incl.toFixed(6));
    inclinationTilt.push(+incl.toFixed(6));

    // Obliquity from simulation formula (anchored to J2000)
    const obliq = OE.computePlanetObliquity(planetName, year);
    obliquity.push(+obliq.toFixed(6));

    // Longitude of perihelion (linear precession)
    const lonPeri = OE.calcPlanetPerihelionLong(
      p.longitudePerihelion, p.perihelionEclipticYears, year
    );
    lonPerihelion.push(+lonPeri.toFixed(4));

    // Ascending node (dynamic rate-based if tilts available, linear fallback)
    let ascNode;
    if (p.orbitTilta !== undefined) {
      ascNode = OE.calculateDynamicAscendingNodeFromTilts(p.orbitTilta, p.orbitTiltb, year);
    } else {
      ascNode = computeAscendingNodeLinear(p.ascendingNode, p.perihelionEclipticYears, year);
    }
    ascendingNode.push(+ascNode.toFixed(4));

    // Argument of perihelion
    const omega = OE.computeArgumentOfPerihelion(lonPeri, ascNode);
    argPerihelion.push(+omega.toFixed(4));
  }

  return {
    planet: planetName,
    generated: new Date().toISOString(),
    fullCycle: {
      years, eccentricity, obliquity, inclination, inclinationTilt,
      lonPerihelion, ascendingNode, argPerihelion,
    },
    constants: {
      eccentricityBase: p.orbitalEccentricityBase,
      eccentricityAmplitude: p.orbitalEccentricityAmplitude,
      eccentricityJ2000: p.orbitalEccentricityJ2000,
      eccentricityPhaseJ2000: p.eccentricityPhaseJ2000,
      invPlaneInclinationMean: p.invPlaneInclinationMean,
      invPlaneInclinationAmplitude: p.invPlaneInclinationAmplitude,
      obliquityMean: p.axialTiltMean,
      semiMajorAxis: p.orbitDistance,
      orbitalPeriodDays: p.solarYearInput,
      perihelionEclipticYears: p.perihelionEclipticYears,
      fibonacciD: p.fibonacciD,
      type: p.type,
      mirrorPair: p.mirrorPair,
      holisticYear: H,
      balancedYear: planetBalancedYear,
    },
  };
}

// ── Export metadata ────────────────────────────────────────────────────────

function exportMetadata() {
  const allPlanets = ['earth', ...PLANET_NAMES];
  const meta = {
    generated: new Date().toISOString(),
    holisticYear: H,
    balancedYear: C.balancedYear,
    step: STEP,
    dataPoints: Math.ceil(H / STEP),
    planets: {},
  };

  for (const name of allPlanets) {
    meta.planets[name] = {
      color: PLANET_COLORS[name],
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
    };
    if (name === 'earth') {
      meta.planets[name].fibonacciD = 3;
      meta.planets[name].type = 'II';
      meta.planets[name].semiMajorAxis = 1.0;
    } else {
      const p = C.planets[name];
      meta.planets[name].fibonacciD = p.fibonacciD;
      meta.planets[name].type = p.type;
      meta.planets[name].semiMajorAxis = p.orbitDistance;
      meta.planets[name].mirrorPair = p.mirrorPair;
    }
  }
  return meta;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DASHBOARD DATA EXPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Holistic Year: ${H} years`);
  console.log(`  Range: ${startYear.toFixed(0)} to ${endYear.toFixed(0)}`);
  console.log(`  Step: ${STEP} years → ~${Math.ceil(H / STEP)} data points`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log('');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const years = generateYears(startYear, endYear, STEP);
  console.log(`  Generated ${years.length} year values\n`);

  // Export all planets (including Earth)
  const earthData = exportEarth(years);
  const earthPath = path.join(OUTPUT_DIR, 'earth.json');
  fs.writeFileSync(earthPath, JSON.stringify(earthData));
  console.log(`    → earth.json (${(fs.statSync(earthPath).size / 1024).toFixed(0)} KB)`);

  for (const name of PLANET_NAMES) {
    const planetData = exportPlanet(name, years);
    const planetPath = path.join(OUTPUT_DIR, `${name}.json`);
    fs.writeFileSync(planetPath, JSON.stringify(planetData));
    console.log(`    → ${name}.json (${(fs.statSync(planetPath).size / 1024).toFixed(0)} KB)`);
  }

  // Metadata
  const metaData = exportMetadata();
  const metaPath = path.join(OUTPUT_DIR, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
  console.log(`    → metadata.json (${(fs.statSync(metaPath).size / 1024).toFixed(0)} KB)`);

  console.log('\n  Done! Serve with: npx serve dashboard');
}

main();

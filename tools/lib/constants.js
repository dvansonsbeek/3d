// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS MODULE — Single source of truth for all tool scripts.
//
// All input data loaded from the ONE input file in public/input/:
//   astro-reference.json        — IAU/JPL/Meeus reference data + the scene epoch
//   (the planets' display names are @essrt/physics planets/display-names; the
//    shipped fits live under data/ and the deep-time block is read from the
//    generated constants module, see the Deep-time exports below)
//
// Sub-modules:
//   constants/utils.js              — Date conversion, formatting, derivation helpers
//
// All consumers: const C = require('./lib/constants');
// ═══════════════════════════════════════════════════════════════════════════

// ─── Sub-modules & JSON data ─────────────────────────────────────────────
const utils = require('./constants/utils');
const path = require('path');
const fs = require('fs');
// The J2000 mass chain, the Moon's J2000 periods and the unit constants have
// ONE home in @essrt/physics.
const { computeMassChainJ2000, computeMoonPeriodsJ2000 } = require('@essrt/physics/earth/mass-chain');
const { SECONDS_PER_DAY, DAYS_PER_JULIAN_YEAR, JULIAN_CENTURY_DAYS, J2000_JD } = require('@essrt/physics/constants/units');
const astroRef = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));
// The deep-time block of the generated constants module — the ONE assembly of
// its three homes; require(esm) is synchronous on the repo's Node 22 (the
// module has no top-level await).
const GENERATED_DEEP_TIME = require('../../packages/physics/src/constants/generated.js').DEFAULT_CONSTANTS.deepTime;

// Build ASTRO_REFERENCE object (consumed by scene-graph.js, optimizer.js, etc.)
const ASTRO_REFERENCE = {
  // Earth orbital (J2000)
  juneSolstice2000_JD: astroRef.earthOrbital.juneSolstice2000_JD,
  obliquityJ2000_deg: astroRef.earthOrbital.obliquityJ2000_deg,
  obliquityRate_arcsecPerCentury: astroRef.earthOrbital.obliquityRate_arcsecPerCentury,
  earthEccentricityJ2000: astroRef.earthOrbital.earthEccentricityJ2000,
  earthEccentricityDotJ2000: astroRef.earthOrbital.earthEccentricityDotJ2000,
  earthEccentricityDotDotJ2000: astroRef.earthOrbital.earthEccentricityDotDotJ2000,
  earthPerihelionLongitudeJ2000: astroRef.earthOrbital.earthPerihelionLongitudeJ2000,
  sunMeanLongitudeJ2000_deg: astroRef.earthOrbital.sunMeanLongitudeJ2000_deg,   // D5 aberration anchor
  earthAscendingNodeInvPlane: astroRef.earthOrbital.earthAscendingNodeInvPlane,
  perihelionPassageJ2000_JD: astroRef.earthOrbital.perihelionPassageJ2000_JD,
  earthInclinationJ2000_deg: astroRef.earthOrbital.earthInclinationJ2000_deg,
  // Lunar Meeus coefficients
  ...astroRef.moonMeeus,
  // Cardinal point anchors
  cardinalPointAnchors: astroRef.cardinalPointAnchors,
};

const yearLengthRef = astroRef.yearLengthRef;
const knownValues = astroRef.knownValues;

// ═══════════════════════════════════════════════════════════════════════════
// 1. FOUNDATIONAL MODEL CONSTANTS (the scene epoch — astro-reference.json timeReference)
// These define the model itself. Changing any = different theory.
// ═══════════════════════════════════════════════════════════════════════════

// The scene epoch's ONE home is astro-reference timeReference.sceneEpochJD /
// sceneEpochYear; every anchor below is the epoch itself.
const startmodelJD = astroRef.timeReference.sceneEpochJD;
const startmodelYear = astroRef.timeReference.sceneEpochYear;
// Hard-wired: the equation of centre on the scene wheels and the certified
// Moon override ARE the scene; the toggle's false branch was a 6.5°-of-Moon
// diagnostic nobody ran (measured by the reach audit). Kept as a named
// constant so the mirror sites in moveModel read as before.
const useVariableSpeed = true;

// ═══════════════════════════════════════════════════════════════════════════
// 2. PHYSICAL & ASTRONOMICAL CONSTANTS (from astro-reference.json)
// External reference values from IAU, JPL DE440, etc.
// ═══════════════════════════════════════════════════════════════════════════

const currentAUDistance = astroRef.physicalConstants.currentAUDistance;
// The IAU sidereal year in SI seconds (365.256363004 d × 86,400 s =
// 31,558,149.7635 s) — the Kepler input for G(M_☉ + M_E) in §9.
const meanSiderealYearSeconds = astroRef.yearLengthRef.siderealYear * SECONDS_PER_DAY;
const G_CONSTANT = astroRef.physicalConstants.G_CONSTANT;
const MASS_RATIO_EARTH_MOON = astroRef.physicalConstants.MASS_RATIO_EARTH_MOON;
const massRatioDE440 = astroRef.physicalConstants.massRatioDE440;
const perihelionalignmentYear = astroRef.earthOrbital.perihelionalignmentYear;

// ═══════════════════════════════════════════════════════════════════════════
// 3. EARTH PARAMETERS (derived)
// ═══════════════════════════════════════════════════════════════════════════

const earthAscendingNodeInvPlane = ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const perihelionRefJD = ASTRO_REFERENCE.perihelionPassageJ2000_JD;

// ═══════════════════════════════════════════════════════════════════════════
// 4. MOON INPUT CONSTANTS (astro refs)
// ═══════════════════════════════════════════════════════════════════════════

const moonSiderealMonthInput = astroRef.moonReference.moonSiderealMonthInput;
const moonApsidalPrecessionDaysInputICRF = astroRef.moonReference.moonApsidalPrecessionDaysInputICRF;
const moonNodalPrecessionDaysInputICRF = astroRef.moonReference.moonNodalPrecessionDaysInputICRF;
const moonDistance = astroRef.moonReference.moonDistance;
const moonEclipticInclinationJ2000 = astroRef.moonReference.moonEclipticInclinationJ2000;
const moonOrbitalEccentricity = astroRef.moonReference.moonOrbitalEccentricityBase;
const moonObliquityEclipticJ2000 = astroRef.moonReference.moonObliquityEclipticJ2000;
const moonTilt = astroRef.moonReference.moonTilt;

// ═══════════════════════════════════════════════════════════════════════════
// 5. PLANET INPUT DATA (astro-reference.json + the chain artifact; the display
//    names are @essrt/physics planets/display-names)
// Per-planet constants for the 7 non-Earth planets.
// ═══════════════════════════════════════════════════════════════════════════

// The planets' perihelion period is the N-body chain's inertial apsidal
// period, 1,296,000/g yr (g the leading secular apsidal eigenfrequency of the
// governed artifact, ″/yr — the quantity the API and the registry publish;
// Mercury 232,437 yr).
const CHAIN_DATA = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'data', 'nbody-secular-frequencies.json'), 'utf8'));

const planetAstro = astroRef.planetOrbitalElements;
// The seven chain planets, in the one order every runtime iterates — the
// display-name map is the key set too.
const { PLANET_DISPLAY_NAMES } = require('../../packages/physics/src/planets/display-names.cjs');
const planets = {};
for (const key of Object.keys(PLANET_DISPLAY_NAMES)) {
  const ar = planetAstro[key];
  planets[key] = {
    // Presentation (code, not an input)
    name: PLANET_DISPLAY_NAMES[key],
    perihelionEclipticYears: 1296000 / CHAIN_DATA.g[key].arcsecPerYr,   // the chain's inertial apsidal period (R1)
    // the closed-form verified J2000 node on the invariable plane — a
    // reference derivation (astro-reference; the key name stays for the Python
    // bridge's OMEGA_J2000 and the registry)
    ascendingNodeInvPlane: ar.ascendingNodeInvPlaneClosedForm,
    orbitalPeriodInputDays: ar.orbitalPeriodInputDays,
    orbitalEccentricityJ2000: ar.orbitalEccentricityJ2000,
    axialTiltJ2000: ar.axialTiltJ2000,
    eclipticInclinationJ2000: ar.eclipticInclinationJ2000,
    longitudePerihelion: ar.longitudePerihelion,
    ascendingNode: ar.ascendingNode,
    invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
  };
}

// Derive orbitTilta/b from ascendingNode + eclipticInclinationJ2000
for (const p of Object.values(planets)) {
  if (p.ascendingNode !== undefined && p.eclipticInclinationJ2000 !== undefined) {
    const tilt = utils.computeOrbitTilt(p.ascendingNode, p.eclipticInclinationJ2000);
    p.orbitTilta = tilt.orbitTilta;
    p.orbitTiltb = tilt.orbitTiltb;
  }
}

// Additional bodies — the four no-chain minor bodies (Pluto, Halley, Eros,
// Ceres): the observed J2000 elements in astro-reference are the only inputs.
// The bodies are not rendered (f735c2d8); the geometry law's rows for them are
// the planet-model identity test's coverage of its ellipse families.
const additionalBodies = {};
for (const [key, ar] of Object.entries(astroRef.additionalBodiesReference)) {
  if (key.startsWith('_') || !ar || typeof ar !== 'object') continue;
  additionalBodies[key] = {
    orbitalPeriodInputDays: ar.orbitalPeriodInputDays,
    orbitalEccentricityBase: ar.orbitalEccentricityJ2000,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. DERIVED MODEL VALUES
// Computed from foundational constants. Order matters (dependency chain).
// ═══════════════════════════════════════════════════════════════════════════

// The model's mean solar year in days — the calendar's year axis — is the
// J2000 mean tropical year DERIVED in one home from two IAU inputs, the
// sidereal year and the general precession p_A per Julian year
// (@essrt/physics earth/year-lengths computeMeanTropicalYearJ2000Days,
// 365.242190469 d). `inputMeanSolarYear` stays as the recorded foundational
// input.
const { computeMeanTropicalYearJ2000Days } = require('@essrt/physics/earth/year-lengths');
const meanSolarYearDays = computeMeanTropicalYearJ2000Days(astroRef.yearLengthRef.siderealYear, astroRef.earthOrbital.generalPrecessionJ2000_arcsecPerYr);
const meanEarthRotationsPerYear = meanSolarYearDays + 1;
// ≡ startmodelYear; the name stays as an alias for the frozen explore scripts
// that read it (tools/explore/u2-*).
const startModelYearWithCorrection = startmodelYear;
// The phase-origin variable is J2000 (2000 by construction); the name stays
// for its readers.
const balancedYear = 2000;
const perihelionalignmentJD = Math.round(startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - perihelionalignmentYear)));
const balancedJD = startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - balancedYear));
const yearsFromBalancedToJ2000 = (startmodelJD - balancedJD) / meanSolarYearDays;
// IAU sidereal-year J2000 anchor (365.256363004 d).
const meanSiderealYearDays = astroRef.yearLengthRef.siderealYear;
// The J2000 day length ω₀ is the SI day (86,400 s — the IAU day the year
// inputs are stated in), an input in astro-reference.json.
const meanLengthOfDay = astroRef.yearLengthRef.solarDay;
// THE J2000 precession anchor p₀ is the IAU 2006 general precession in
// longitude (astro-reference.json), stated as the period 1,296,000/p_A =
// 25,771.575 Julian years. ONE home: the composed clock, the hybrid's
// self-anchor, the registry and the browser read this export.
const axialPrecessionJ2000Years = 1296000 / astroRef.earthOrbital.generalPrecessionJ2000_arcsecPerYr;
const axialPrecessionJ2000Days = axialPrecessionJ2000Years * DAYS_PER_JULIAN_YEAR;
const meanSiderealDay = (meanSolarYearDays / (meanSolarYearDays + 1)) * meanLengthOfDay;
// Stellar day: the axial precession rate is precession in LONGITUDE (along the
// ecliptic); the sidereal→stellar offset depends on precession in RIGHT
// ASCENSION (along the equator), and m = p·cos(ε). MEAN family, so the mean
// obliquity. Mirrors STELLAR_DAY_RA_PROJECTION in src/script.js — keep in sync.
const STELLAR_DAY_RA_PROJECTION =
  Math.cos(ASTRO_REFERENCE.obliquityJ2000_deg * Math.PI / 180);   // plan 09: the IAU ε₀ input (the retired comb's fitted mean sat 0.03° lower; 2e-11 of the stellar day)
// The equinox regresses one turn per T_p — the certified p_A period
// (axialPrecessionJ2000Years).
const meanStellarDay = (meanSiderealDay / axialPrecessionJ2000Years) / (meanSolarYearDays + 1)
  * STELLAR_DAY_RA_PROJECTION + meanSiderealDay;
// (The J2000 anomalistic year is the one-family law of date at 2000,
// @essrt/physics yearLengths.anomalisticYearSecondsAtYear(2000) — the
// movement's own apsidal line; no constant here. The cardinal anchors and
// the IAU obliquity below are the J2000 values.)

// Cardinal point year fractions for initial search (derived from startmodelYear offset)
// Maps calendar event to approximate year fraction from the model epoch.
// The `VE` seed intentionally stays NEGATIVE (was previously wrapped positive
// with `% 1`) so it lands on the CURRENT calendar year's VE (March, ≈92 days
// before the June-solstice epoch) rather than the following year's. This makes
// the CSV row where `seedModelYear === year` line up on the same calendar year
// for all four cardinal points — see export-solar-measurements.js and the
// `seedModelYear = Math.floor(...)` choice there.
const _epochOffset = startmodelYear % 1;  // 0.5 for mid-year epoch
const cardinalPointYearFractions = {
  SS: 0.47 - _epochOffset,   // June solstice (≈+0.5, next-summer or before-epoch)
  WS: 0.97 - _epochOffset,   // December solstice (≈+0.47, later-same-year)
  VE: 0.22 - _epochOffset,   // March equinox (≈-0.28, earlier-same-year — do not wrap positive)
  AE: 0.73 - _epochOffset,   // September equinox (≈+0.23, later-same-year)
};

// The IAU obliquity at J2000 (the name keeps its "AtGrid" suffix for its readers)
const iauObliquityAtGrid = ASTRO_REFERENCE.obliquityJ2000_deg;

// J2000.0 epoch (standard astronomical convention: Jan 1.5, 2000 TT = JD 2451545.0)
// Julian century = exactly 36525 days by IAU definition (used in Meeus, IAU precession, parallax)
// Tropical century = 100 model tropical years (used in obliquity rate solver for phase-clean measurement)
const j2000JD = J2000_JD;
const julianCenturyDays = JULIAN_CENTURY_DAYS;
const tropicalCenturyDays = 100 * meanSolarYearDays;

// Equation of center eccentricity — derived, not a free parameter. The wheel's
// split: the geometry supplies base'·sin M, the EoC term the rest — so the
// static (J2000) value is e(J2000) − base'/2 (unification; matches the
// dynamic split dynEcc.earth − base'/2 at J2000).
// Unification: the Sun node's EoC eccentricity is HALF the one law's e(t) (the
// geometric offset −e(t)·û(ϖ), animated every frame, supplies the other half);
// this const is its J2000 value — the scene overrides it per frame.
const eocEccentricity = ASTRO_REFERENCE.earthEccentricityJ2000 / 2;

// ═══════════════════════════════════════════════════════════════════════════
// 7. MOON DERIVED CYCLES
// ═══════════════════════════════════════════════════════════════════════════

// ───── The Moon's J2000 periods on the IAU inputs ─────
// Three observational anchors (astro-reference.json moonReference): the
// sidereal month and the of-date apsidal and nodal precession periods (the
// legacy-'ICRF' input names hold EQUINOX-OF-DATE periods, 3231.50 d /
// 6798.38 d). The star-referenced (inertial) periods follow by removing the
// equinox's own precession: 1/T_E = 1/T_I ∓ 1/T_p (perigee advances, node
// regresses), T_p = the J2000 precession anchor in days (Julian years).
// The anomalistic and nodal months are KINEMATIC consequences of sidereal +
// precession (1/T_ano = 1/T_M − 1/T_apsidalE, 1/T_nod = 1/T_M + 1/T_nodalE);
// the synodic month is the beat with the sidereal year, the tropical month
// the sidereal month seen from the precessing equinox. ONE home:
// @essrt/physics/earth/mass-chain (the browser and the deep-time chain read
// the same function; docs/66 §1 keeps the derivation record).
const moonSiderealMonth = moonSiderealMonthInput;
const moonApsidalPrecessionDaysICRF = moonApsidalPrecessionDaysInputICRF;
const moonNodalPrecessionDaysICRF = moonNodalPrecessionDaysInputICRF;
const _moonPeriods = computeMoonPeriodsJ2000({
  moonSiderealMonthDays: moonSiderealMonth,
  moonApsidalPrecessionDaysInput: moonApsidalPrecessionDaysICRF,
  moonNodalPrecessionDaysInput: moonNodalPrecessionDaysICRF,
  axialPrecessionJ2000Days, meanSiderealYearDays, meanSolarYearDays,
});
const moonApsidalPrecessionDaysEarth = _moonPeriods.moonApsidalPrecessionDaysEarth;
const moonNodalPrecessionDaysEarth = _moonPeriods.moonNodalPrecessionDaysEarth;
const moonAnomalisticMonth = _moonPeriods.moonAnomalisticMonthDays;
const moonNodalMonth = _moonPeriods.moonNodalMonthDays;
const moonSynodicMonth = _moonPeriods.moonSynodicMonthDays;
const moonTropicalMonth = _moonPeriods.moonTropicalMonthDays;
const moonFullMoonCycleEarth = _moonPeriods.moonFullMoonCycleEarthDays;
const moonFullMoonCycleICRF = _moonPeriods.moonFullMoonCycleICRFDays;
const moonApsidalMeetsNodalDays = _moonPeriods.moonApsidalMeetsNodalDays;
const moonLunarLevelingCycleDays = _moonPeriods.moonLunarLevelingCycleDays;
const moonDraconicYearICRF = _moonPeriods.moonDraconicYearICRFDays;
const moonDraconicYearEarth = _moonPeriods.moonDraconicYearEarthDays;

// ═══════════════════════════════════════════════════════════════════════════
// 8. ASTRO_REFERENCE WIRING
// Attach planet-dependent fields to the imported ASTRO_REFERENCE object.
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 9. MASS COMPUTATION, PSI, J2000 ECCENTRICITIES
// ═══════════════════════════════════════════════════════════════════════════

// Order: Earth/Moon → Sun. Kepler on Earth's orbit gives G(M_Sun + M_Earth);
// we back out GM_Sun by subtracting GM_Earth (computed from the Moon's orbit).

const massFraction = {};
for (const [k, ratio] of Object.entries(massRatioDE440)) {
  massFraction[k] = 1 / ratio;
}

// Earth mass via Moon orbital mechanics. Δa = a_M × M_M/(M_E + M_M) × m is the
// leading-order correction for the Sun's tidal coupling to the Earth–Moon
// barycentric wobble (closes G(M_E + M_M) to ~3.7 ppm of JPL DE440); GM_Sun
// (M_Sun only) is Kepler on Earth's orbit minus GM_Earth (the JPL/IAU
// convention). ONE home: @essrt/physics/earth/mass-chain.
const _mass = computeMassChainJ2000({
  moonDistanceKm: moonDistance, moonSiderealMonthDays: moonSiderealMonth, meanSiderealYearDays,
  meanLengthOfDaySeconds: meanLengthOfDay, massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
  currentAUDistanceKm: currentAUDistance, gravitationalConstantKm3KgS2: G_CONSTANT,
});
const GM_EARTH_MOON_SYSTEM = _mass.gmEarthMoonSystemKm3S2;
const GM_EARTH_ALONE = _mass.gmEarthAloneKm3S2;
const GM_MOON_ALONE = _mass.gmMoonAloneKm3S2;
const GM_SUN = _mass.gmSunKm3S2;
const M_SUN = _mass.sunMassKg;
massFraction.earth = (GM_EARTH_ALONE / G_CONSTANT) / M_SUN;

const eccJ2000 = {
  mercury: planets.mercury.orbitalEccentricityJ2000,
  venus:   planets.venus.orbitalEccentricityJ2000,
  earth:   ASTRO_REFERENCE.earthEccentricityJ2000,
  mars:    planets.mars.orbitalEccentricityJ2000,
  jupiter: planets.jupiter.orbitalEccentricityJ2000,
  saturn:  planets.saturn.orbitalEccentricityJ2000,
  uranus:  planets.uranus.orbitalEccentricityJ2000,
  neptune: planets.neptune.orbitalEccentricityJ2000,
};

const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

// The eccentricity-cycle period for each planet: the chain's OWN g-mode beat
// (dominant mode × largest companion of the planet's eccentricity vector,
// keplerian-chain computeSecularShape — the panel's "Eccentricity Cycle
// (g-mode beat)" row); the scene twins read the same artifact, so both
// wobble wheels turn on one period.
const { computeSecularShape } = require('@essrt/physics/planets/secular-shape');
const { computeObliquityJ2000Deg } = require('@essrt/physics/planets/spin-channel');
// (CHAIN_DATA — the governed artifact — is loaded above the planet records,
// which read their perihelion period from it since plan 07 R1.)
for (const [key, p] of Object.entries(planets)) {
  if (CHAIN_DATA.secularModes && CHAIN_DATA.secularModes[key]) {
    p.wobblePeriod = computeSecularShape(CHAIN_DATA, key).beatYears;
  }
}

// A planet's eccentricity and inclination of date have one home, the N-body
// chain. The DERIVED J2000 obliquity is the spin channel's reading (the IAU
// pole against the chain's J2000 plane, acute form), and the fixtures pin it.
for (const [key, p] of Object.entries(planets)) {
  if (!massFraction[key]) continue;   // the seven carriers (R8: the fibonacciD guard went with the divisor)
  const A = CHAIN_DATA.j2000AnchorElements[key];
  const eps = computeObliquityJ2000Deg({
    spin: astroRef.planetSpinPhysical[key],
    anchorInclEclipticDeg: A.inclEclipticDeg,
    anchorAscNodeEclipticDeg: A.ascNodeEclipticDeg,
    obliquityJ2000Deg: ASTRO_REFERENCE.obliquityJ2000_deg,
  });
  p.obliquityMean = Math.min(eps, 180 - eps);
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. PLANET DERIVED CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Phase 8.3 L1: the geometry law lives ONCE in @essrt/physics/planets/geometry
// (browser expression forms — this mirror's last-ulp variants dissolve).
const { derivePlanetGeometry, scaffoldOrbitInputs } = require('@essrt/physics/planets/geometry');
const _GEOM_ENV = {
  meanSolarYearDays,
  currentAUDistanceKm: currentAUDistance,
  earthEccentricityJ2000: ASTRO_REFERENCE.earthEccentricityJ2000,
  earthPerihelionLongitudeJ2000Deg: ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
};
// The seven chain planets' scaffold geometry rides the chain's own J2000
// elements — a from the anchor set, the period from the fitted era-window mean
// motion (deg per Julian year) of the governed engine-D artifact (the SAME JSON
// the browser embeds as CHAIN_ARTIFACT). The no-chain bodies keep their
// observed period input. ONE home: planets/geometry.
const _CHAIN_ARTIFACT = require('../../data/nbody-secular-frequencies.json');

function computePlanetDerived(key) {
  const p = planets[key];
  const g = derivePlanetGeometry({
    key,   // the ellipse family is the law's own taxonomy (plan 11 step 3)
    ...scaffoldOrbitInputs(key, _CHAIN_ARTIFACT, p.orbitalPeriodInputDays),
    // The scene's ellipse geometry reads the OBSERVED J2000 eccentricity, the
    // value the chain is anchored on.
    orbitalEccentricityBase: p.orbitalEccentricityJ2000,
    longitudePerihelion: p.longitudePerihelion,
    ascendingNode: p.ascendingNode,
  }, _GEOM_ENV);
  return {
    orbitDistance: g.orbitDistance,
    period: g.periodYears,
    periodDays: g.periodDays,
    perihelionDistance: g.perihelionDistance,
    elipticOrbit: g.elipticOrbit,
    realOrbitalEccentricity: g.realOrbitalEccentricity,
    speed_kmh: g.speedKmh,
    ellipseFamily: g.ellipseFamily,   // the scaffold wheel family (scene-graph.js RealPerihelionAtSun speed/phase branch)
  };
}

const derived = {};
for (const key of Object.keys(planets)) {
  derived[key] = computePlanetDerived(key);
}

function computeAdditionalDerived(key) {
  const b = additionalBodies[key];
  // 8.3 L1: full geometry via the shared law (this engine previously returned
  // only {N, a, period} for the minor bodies — part of the S-P6 coverage gap;
  // the ellipse family for pluto/halleys/eros is NEW capability here).
  const g = derivePlanetGeometry({
    key,   // the minor bodies' ellipse family is the law's own (body-name branches; Eros' type default lives there since plan 11 step 2)
    ...scaffoldOrbitInputs(key, _CHAIN_ARTIFACT, b.orbitalPeriodInputDays),
    orbitalEccentricityBase: b.orbitalEccentricityBase,
    longitudePerihelion: b.longitudePerihelion,
    ascendingNode: b.ascendingNode,
    orbitDistanceOverride: b.orbitDistanceOverride,
  }, _GEOM_ENV);
  return {
    orbitDistance: g.orbitDistance,
    period: g.periodYears,
    periodDays: g.periodDays,
    perihelionDistance: g.perihelionDistance,
    elipticOrbit: g.elipticOrbit,
    realOrbitalEccentricity: g.realOrbitalEccentricity,
  };
}

const additionalDerived = {};
for (const key of Object.keys(additionalBodies)) {
  additionalDerived[key] = computeAdditionalDerived(key);
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. BUILD DYNAMIC VALUES
// ═══════════════════════════════════════════════════════════════════════════

// Date utilities (jdToYear/yearToJD need model constants)
const { jdToYear, yearToJD } = utils.createDateUtils({ startmodelYear, startmodelJD, meanSolarYearDays });

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS — All ~115 items, backward compatible
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Foundational model constants
  perihelionalignmentYear,
  perihelionalignmentJD,
  startmodelJD,
  startmodelYear,
  useVariableSpeed,

  // Physical & astronomical constants
  currentAUDistance,
  meanSiderealYearSeconds,
  G_CONSTANT,
  MASS_RATIO_EARTH_MOON,
  massRatioDE440,

  // Deep-time physics anchors (astro-reference.json physicalConstants, and the
  // deepTime block of the GENERATED constants module — the block is ASSEMBLED
  // by tools/constants/generate.mjs from its three homes (astro-reference
  // moonReference.moonRecessionAlpha1PerMa + giaCoxChaoPeltier,
  // data/deep-time-fitted.json, data/deltaT-4flag-fit.json shipped_taper); this
  // twin reads the SAME embed the browser and the package read, so there is one
  // assembly, and `test:constants` pins the embed to its sources)
  EARTH_MOI_FACTOR: astroRef.physicalConstants.earthMoiFactorJ2000,
  EARTH_DIAMETER_KM: astroRef.bodyDiametersKm.earth,
  SOLAR_LUMINOSITY_W: astroRef.physicalConstants.solarLuminosityW,
  SOLAR_WIND_KG_PER_S: astroRef.physicalConstants.solarWindMassLossKgPerS,
  ALPHA_1: GENERATED_DEEP_TIME.alpha1PerMa,
  ALPHA_GIA_RATE_J2000_PER_YR: GENERATED_DEEP_TIME.alphaGiaRateJ2000PerYr,
  ALPHA_GIA_RELAXATION_KYR: GENERATED_DEEP_TIME.alphaGiaRelaxationKyr,
  J2_RATE_J2000_PER_YR: GENERATED_DEEP_TIME.j2RateJ2000PerYr,   // the OBSERVED dJ2/dt (Cox & Chao 2002) — the GIA channel's J2 scale (the precession of date)
  DT_STACK_TAPER_FULL_HALFWIDTH_YR: GENERATED_DEEP_TIME.dtStackTaperFullHalfwidthYr,
  DT_STACK_TAPER_TOTAL_HALFWIDTH_YR: GENERATED_DEEP_TIME.dtStackTaperTotalHalfwidthYr,

  // Earth parameters
  earthAscendingNodeInvPlane,
  perihelionRefJD,

  // Moon inputs
  moonSiderealMonthInput,
  moonApsidalPrecessionDaysInputICRF,
  moonNodalPrecessionDaysInputICRF,
  moonDistance,
  moonEclipticInclinationJ2000,
  moonOrbitalEccentricity,
  moonObliquityEclipticJ2000,
  moonTilt,

  // Planet data
  planets,
  additionalBodies,

  // Derived model values
  meanSolarYearDays,
  meanEarthRotationsPerYear,
  startModelYearWithCorrection,
  balancedYear,
  balancedJD,
  cardinalPointYearFractions,
  iauObliquityAtGrid,
  yearsFromBalancedToJ2000,
  meanSiderealYearDays,
  meanLengthOfDay,
  axialPrecessionJ2000Years,
  axialPrecessionJ2000Days,
  meanSiderealDay,
  meanStellarDay,
  STELLAR_DAY_RA_PROJECTION,
  j2000JD,
  julianCenturyDays,
  tropicalCenturyDays,
  eocEccentricity,

  // Moon derived
  moonSiderealMonth,
  moonAnomalisticMonth,
  moonNodalMonth,
  moonSynodicMonth,
  moonTropicalMonth,
  moonFullMoonCycleEarth,
  moonFullMoonCycleICRF,
  moonNodalPrecessionDaysEarth,
  moonNodalPrecessionDaysICRF,
  moonApsidalPrecessionDaysEarth,
  moonApsidalPrecessionDaysICRF,
  moonApsidalMeetsNodalDays,
  moonLunarLevelingCycleDays,
  moonDraconicYearICRF,
  moonDraconicYearEarth,

  // Astronomical reference data
  ASTRO_REFERENCE,

  // Mass, PSI, eccentricities
  GM_SUN,
  // The planets' spin inputs (astro-reference planetSpinPhysical) and the
  // chain data — the Node scene engine builds the spin channel from them.
  PLANET_SPIN_PHYSICAL: astroRef.planetSpinPhysical,
  CHAIN_DATA,
  M_SUN,
  GM_EARTH_ALONE,
  GM_MOON_ALONE,
  GM_EARTH_MOON_SYSTEM,
  massFraction,
  eccJ2000,
  fibonacci,

  // Physical constants (needed by deep-time chain)
  speedOfLight: astroRef.physicalConstants.speedOfLight,
  // Observed dynamics constants (source of truth: astro-reference.json
  // physicalConstants — used by the derivation laboratories; massRatioDE440
  // is exported above)
  earthJ2: astroRef.physicalConstants.earthJ2,
  earthEquatorialRadiusKm: astroRef.physicalConstants.earthEquatorialRadiusKm,
  earthParallaxRadiusKm: astroRef.physicalConstants.earthParallaxRadiusKm,

  // Planet derived
  derived,
  additionalDerived,
  computePlanetDerived,

  // External reference values
  yearLengthRef,
  knownValues,

  // Date utilities
  jdToCalendar: utils.jdToCalendar,
  calendarToJD: utils.calendarToJD,
  jdToYear,
  yearToJD,
  jdToDateString: utils.jdToDateString,

  // Formatting helpers
  pad: utils.pad,
  padLeft: utils.padLeft,
  fmt: utils.fmt,
  fmtInt: utils.fmtInt,
  printTable: utils.printTable,
};

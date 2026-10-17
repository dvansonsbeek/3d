// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS MODULE — Single source of truth for all tool scripts.
//
// All input data loaded from JSON files in public/input/:
//   model-parameters.json       — Model theory parameters
//   astro-reference.json        — IAU/JPL/Meeus reference data
//   (fitted-coefficients.json — the fitting pipeline's comb output — was
//    emptied at plan 09 step 7a and deleted at plan 11 step 1; the shipped
//    fits live under data/ and the deep-time block is read from the
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
const modelParams = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'model-parameters.json'), 'utf8'));
const astroRef = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));
// The deep-time block of the generated constants module (plan 11 step 1) —
// the ONE assembly of its three homes; require(esm) is synchronous on the
// repo's Node 22 (the module has no top-level await).
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
  // Additional fields attached below after planets are defined:
  //   ascNodeTiltCorrection, earthInvPlanePrecessionYears, <planet>PerihelionRef_JD
};

const yearLengthRef = astroRef.yearLengthRef;
const knownValues = astroRef.knownValues;


// ═══════════════════════════════════════════════════════════════════════════
// 1. FOUNDATIONAL MODEL CONSTANTS (from model-parameters.json)
// These define the model itself. Changing any = different theory.
// ═══════════════════════════════════════════════════════════════════════════

// (plan 09 step 7c: the frozen era unit `holisticyearLength` (H), its lattice
// `stepYears` and the device's rounded mean tropical year input
// `inputmeanlengthsolaryearindays` left model-parameters.json; the K-device
// wheels ride the recorded `kDeviceWheelPeriodYears` pose block below.)
const startmodelJD = modelParams.foundational.startmodelJD;
const startmodelYear = modelParams.foundational.startmodelYear;
const correctionDays = modelParams.foundational.correctionDays;
const startAngleModel = modelParams.foundational.startAngleModel;
// Plan 11 step 2: hard-wired. The equation of centre on the scene wheels and
// the certified Moon override ARE the scene; the toggle's false branch was a
// 6.5°-of-Moon diagnostic nobody ran (measured by the reach audit). Kept as a
// named constant so the mirror sites in moveModel read as before.
const useVariableSpeed = true;
// (plan 11 step 2: correctionSun — the scene Sun's start angle, and the
// perihelion-phase offset derived from it — is deleted: the engine places the
// Sun at the certified longitude every frame, so it reached nothing.)
// (Plan 07 R10: temperatureGraphMostLikely and systemResetN — the phase
// origin's inputs — left the JSON; the combs' phase is measured from J2000.)


// ═══════════════════════════════════════════════════════════════════════════
// 2. PHYSICAL & ASTRONOMICAL CONSTANTS (from astro-reference.json)
// External reference values from IAU, JPL DE440, etc.
// ═══════════════════════════════════════════════════════════════════════════

const currentAUDistance = astroRef.physicalConstants.currentAUDistance;
// Pure IAU × 86400 (SI-second definition) = 31,558,149.7635 s. Physical sidereal
// year in SI seconds. Divided by MEAN_SIDEREAL_YEAR_DAYS_KINEMATIC (framework's
// own H/13-derived days count) gives the framework's MEAN LOD at J2000
// (86399.99968 s under H=335,317) via the T_axial=H/13 identity.
// Supersedes Method B (× 86400.00001), which was a hand-tuned shim.
const meanSiderealYearSeconds = astroRef.yearLengthRef.siderealYear * 86400;
const G_CONSTANT = astroRef.physicalConstants.G_CONSTANT;
const MASS_RATIO_EARTH_MOON = astroRef.physicalConstants.MASS_RATIO_EARTH_MOON;
const massRatioDE440 = astroRef.physicalConstants.massRatioDE440;
const perihelionalignmentYear = astroRef.earthOrbital.perihelionalignmentYear;


// ═══════════════════════════════════════════════════════════════════════════
// 3. EARTH PARAMETERS (from model-parameters.json + derived)
// ═══════════════════════════════════════════════════════════════════════════

const earthtiltMean = modelParams.earth.earthtiltMean;
const earthInvPlaneInclinationAmplitude = modelParams.earth.earthInvPlaneInclinationAmplitude;
// Plan 07 R10: the K device's J2000 wheel phase — the scene scaffolding's
// recorded pose, N × this per wheel of index N; not a law.
const kDeviceWheelPhaseAtJ2000Cycles = modelParams.earth.kDeviceWheelPhaseAtJ2000Cycles;
// Plan 09 step 7c: the K-device wheels' recorded periods (scene mean solar
// years) keyed by the wheel's index N (3 inclination, 5 ecliptic, 8 obliquity,
// 13 axial/wobble, 16 the perihelion pair) — the scaffold's J2000 pose; each
// wheel turns uniformly at its recorded rate (plan 09 step 5c). Not the
// model's precession periods (those are the dynamical values). Mirrors
// src/script.js `kDeviceWheelPeriodYears` / `_wheelPeriodYears(N)`.
const kDeviceWheelPeriodYears = modelParams.earth.kDeviceWheelPeriodYears;
// Plan 09 step 6: the K-device inclination wheel's J2000 phase, a recorded
// POSE constant (ϖ_J2000 − the retired eccentricity law's 21.77° anchor).
// Plan 11 step 2: its readers here — the mean-inclination init and the
// perihelion wheel's offset base′, both overwritten by the engine-placed
// frame — are deleted; the browser's inclination-path zodiac offset is its
// one remaining reach, which retires with the loop's zero at step 4.
const kDeviceInclinationPhaseJ2000Deg = modelParams.earth.kDeviceInclinationPhaseJ2000Deg;
// Derived: 2A − A²/ε — two tilt layers (H/3 + H/5) minus second-order equatorial projection
const earthRAAngle = utils.computeEarthRAAngle(earthInvPlaneInclinationAmplitude, earthtiltMean);
const earthAscendingNodeInvPlane = ASTRO_REFERENCE.earthAscendingNodeInvPlane;
// (plan 11 step 2: earthInvPlaneInclinationMean — inclJ2000 − A·cos(the K
// phase), the invariable-plane disc's init, rewritten from the chain every
// frame — and eccentricityBase, the retired Law-5 constant with no reader
// left but a pre-empted fallback, are deleted. eccentricityAmplitude stays
// until step 4: the Wobble marker's display radius, a scene literal.)
const eccentricityAmplitude = modelParams.earth.eccentricityAmplitude;
// (plan 11 step 2: eccentricityBaseDerived — the perihelion wheel's offset
// base′ = e(J2000)/(1 + cos θ₀/2) — is deleted; the wheel's offset arm is
// placed at the series' e of date every frame (R4), and its pose before the
// first engine frame is e(J2000). plan 07 R6: eccentricityAmplitudeK went
// with the eccentricity law.)
const perihelionRefJD = ASTRO_REFERENCE.perihelionPassageJ2000_JD;


// ═══════════════════════════════════════════════════════════════════════════
// 4. MOON INPUT CONSTANTS (astro refs + model startpos)
// ═══════════════════════════════════════════════════════════════════════════

const moonSiderealMonthInput = astroRef.moonReference.moonSiderealMonthInput;
const moonApsidalPrecessionDaysInputICRF = astroRef.moonReference.moonApsidalPrecessionDaysInputICRF;
const moonNodalPrecessionDaysInputICRF = astroRef.moonReference.moonNodalPrecessionDaysInputICRF;
const moonDistance = astroRef.moonReference.moonDistance;
const moonEclipticInclinationJ2000 = astroRef.moonReference.moonEclipticInclinationJ2000;
const moonOrbitalEccentricity = astroRef.moonReference.moonOrbitalEccentricityBase;
const moonObliquityEclipticJ2000 = astroRef.moonReference.moonObliquityEclipticJ2000;
const moonTilt = astroRef.moonReference.moonTilt;
// (plan 11 step 2: moonMeeusLpCorrection — retired to 0 at plan 06 R3 item 1 —
// left the lunar series' parameters; moonStartposMoon — the scene Moon's start
// angle — is deleted: the certified override sets the rendered Moon's direction
// and distance every frame, so the angle reached only the Node twin's
// geometric pivot. The two ring phases below stay until step 3.)
const moonStartposApsidal = modelParams.moon.moonStartposApsidal;
const moonStartposNodal = modelParams.moon.moonStartposNodal;


// ═══════════════════════════════════════════════════════════════════════════
// 5. PLANET INPUT DATA (merged from model-parameters.json + astro-reference.json)
// Per-planet constants for the 7 non-Earth planets.
// ═══════════════════════════════════════════════════════════════════════════

// Plan 07 R1/R8: the planets' perihelion period is the N-body chain's
// inertial apsidal period, 1,296,000/g yr (g the leading secular apsidal
// eigenfrequency of the governed artifact, ″/yr — the quantity the API and
// the registry publish; Mercury 232,437 yr). The H·num/den lattice
// fractions (model-parameters perihelionEclipticFraction, the former
// fractionToYears helper; Mercury 8H/11 = 243,867 yr) are gone with the
// other device inputs (fibonacciD, inclinationCycleAnchor, antiPhase).
const CHAIN_DATA = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'data', 'nbody-secular-frequencies.json'), 'utf8'));

const planetAstro = astroRef.planetOrbitalElements;
const planets = {};
for (const [key, mp] of Object.entries(modelParams.planets)) {
  if (key.startsWith('_')) continue;   // documentation keys (`_step2Note`)
  const ar = planetAstro[key];
  planets[key] = {
    // Model parameters (from model-parameters.json)
    name: mp.name,
    // (plan 07 R6: orbitalEccentricityBase / Amplitude / eccentricityPhaseJ2000
    // were derived here from the balanced-year phase + K; the law is retired
    // and the chain carries the eccentricity of date. Plan 11 step 2:
    // eocFraction, angleCorrection and mirrorPair are deleted — no reader
    // left, or overwritten by the chain placement every frame.)
    startpos: mp.startpos,
    perihelionEclipticYears: 1296000 / CHAIN_DATA.g[key].arcsecPerYr,   // the chain's inertial apsidal period (R1)
    type: mp.type,
    // the closed-form verified J2000 node on the invariable plane — a
    // reference derivation, astro-reference since plan 11 step 2 (the key name
    // stays for the Python bridge's OMEGA_J2000 and the registry)
    ascendingNodeInvPlane: ar.ascendingNodeInvPlaneClosedForm,
    // (plan 09 step 7c: `ascendingNodeCyclesIn8H` and the −8H/N node period
    // it set — a device count — left with the unit; a planet's node of date
    // and its nodal period are the chain's elements and modes.)
    // (axialPrecessionYears / obliquityCycle — the K device's integer
    // fractions — retired with plan 06 Phase 7 commit 2: the spin channel
    // carries the planets' precession and obliquity.)
    // Astro references (from astro-reference.json)
    solarYearInput: ar.solarYearInput,
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
// Ceres). Plan 11 step 2: their scaffold block left model-parameters.json;
// the observed J2000 elements in astro-reference are the only inputs. The
// bodies are not rendered (f735c2d8); the geometry law's rows for them are
// the planet-model identity test's coverage of its ellipse families.
const additionalBodies = {};
for (const [key, ar] of Object.entries(astroRef.additionalBodiesReference)) {
  if (key.startsWith('_') || !ar || typeof ar !== 'object') continue;
  additionalBodies[key] = {
    solarYearInput: ar.solarYearInput,
    orbitalEccentricityBase: ar.orbitalEccentricityJ2000,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// 6. DERIVED MODEL VALUES
// Computed from foundational constants. Order matters (dependency chain).
// ═══════════════════════════════════════════════════════════════════════════

// (plan 09 step 7c: `perihelionCycleLength` = H/16 is deleted — the K
// perihelion wheel's period is kDeviceWheelPeriodYears[16], a scaffold pose.)
// Plan 09: the model's mean solar year in days — the calendar's year axis —
// is the J2000 mean tropical year DERIVED in one home from two IAU inputs,
// the sidereal year and the general precession p_A per Julian year
// (@essrt/physics earth/year-lengths computeMeanTropicalYearJ2000Days,
// 365.242190469 d). The Meeus & Savoie 1992 input 365.2421897 (66 ms shorter;
// its beat with the sidereal year read 25,770.7 yr against p_A's 25,771.6)
// left the registry with it; before that the era device rounded the input
// onto 1/(H/8) of a day (365.24220365, +1.2 s). `inputMeanSolarYear` stays as
// the recorded foundational input.
const { computeMeanTropicalYearJ2000Days } = require('@essrt/physics/earth/year-lengths');
const meanSolarYearDays = computeMeanTropicalYearJ2000Days(astroRef.yearLengthRef.siderealYear, astroRef.earthOrbital.generalPrecessionJ2000_arcsecPerYr);
const meanEarthRotationsPerYear = meanSolarYearDays + 1;
const startModelYearWithCorrection = startmodelYear + (correctionDays / meanSolarYearDays);
// Plan 07 R10: the correction combs measure their phase from J2000. The former
// origin — perihelionalignmentYear − 14.5 × H/16 = −302,635, the "balanced
// year" — was rotated out of every fitted (sin, cos) pair exactly
// (tools/fit/reorigin-combs-j2000.mjs, measured bit-identical on every
// surface over ±300 kyr) and is no longer an input. The name stays as the
// code's phase-origin variable; it is 2000 by construction.
const balancedYear = 2000;
const perihelionalignmentJD = Math.round(startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - perihelionalignmentYear)));
const balancedJD = startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - balancedYear));
const yearsFromBalancedToJ2000 = (startmodelJD - balancedJD) / meanSolarYearDays;
// IAU sidereal-year J2000 anchor (365.256363004 d).
const meanSiderealYearDays = astroRef.yearLengthRef.siderealYear;
// Plan 09: the J2000 day length ω₀ is the SI day (86,400 s — the IAU day the
// year inputs are stated in), an input in astro-reference.json. The retired
// era device anchored it on its H/13 identity instead (meanSolarYearDays ×
// H/(H − 13) "kinematic" sidereal days → 86,399.99968 s, 0.32 ms below the
// SI day); that construction is deleted.
const meanLengthOfDay = astroRef.yearLengthRef.solarDay;
// Plan 09: THE J2000 precession anchor p₀ is the IAU 2006 general precession
// in longitude (astro-reference.json), stated as the period 1,296,000/p_A =
// 25,771.575 Julian years. Before plan 09 it was the retired year combs' beat
// at 2000 (25,771.395 yr). ONE home: the composed clock, the hybrid's
// self-anchor, the registry and the browser read this export.
const axialPrecessionJ2000Years = 1296000 / astroRef.earthOrbital.generalPrecessionJ2000_arcsecPerYr;
const axialPrecessionJ2000Days = axialPrecessionJ2000Years * 365.25;
const meanSiderealDay = (meanSolarYearDays / (meanSolarYearDays + 1)) * meanLengthOfDay;
// Stellar day: the H/13 precession rate is precession in LONGITUDE (along the
// ecliptic); the sidereal→stellar offset depends on precession in RIGHT
// ASCENSION (along the equator), and m = p·cos(ε). MEAN family, so the mean
// obliquity. Mirrors STELLAR_DAY_RA_PROJECTION in src/script.js — keep in sync.
const STELLAR_DAY_RA_PROJECTION =
  Math.cos(ASTRO_REFERENCE.obliquityJ2000_deg * Math.PI / 180);   // plan 09: the IAU ε₀ input (the retired comb's fitted mean sat 0.03° lower; 2e-11 of the stellar day)
// Plan 09 step 4d: the equinox regresses one turn per T_p — the certified p_A
// period (axialPrecessionJ2000Years) — not per the counter H/13 (0.086 % slow;
// the browser twin had already moved; this line was the Node side of a split).
const meanStellarDay = (meanSiderealDay / axialPrecessionJ2000Years) / (meanSolarYearDays + 1)
  * STELLAR_DAY_RA_PROJECTION + meanSiderealDay;
// (Plan 09 step 4d: meanAnomalisticYearDays — the Simon 1994 mean element
// 365.259636 as a model constant — is deleted; the J2000 anomalistic year is
// the one-family law of date at 2000, @essrt/physics yearLengths
// .anomalisticYearSecondsAtYear(2000), the movement's own apsidal line. Before
// step 3 it was meanSolarYearDays × (H/16)/(H/16 − 1), the device's identity.)
// (plan 11 step 2: eccentricityDerivedMean — the one law's base′ alias, the
// Earth panel's "mean eccentricity" cell — is deleted with base′.)
// (plan 09 step 7c: `totalDaysInH` = H × mSY — the device's day count — and
// the lattice grid (`pickStepYears`, `stepYears`, `gridYear`,
// `gridYearDeltaFromJ2000`) are deleted. Since plan 07 R10 the phase origin
// is J2000, so the grid year WAS J2000 and its delta identically 0: the
// cardinal anchors and the IAU obliquity below are the J2000 values.)

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

// The IAU obliquity and the observed cardinal anchors at the phase origin —
// J2000 since plan 07 R10 (the names keep their "AtGrid" suffix for their readers)
const iauObliquityAtGrid = ASTRO_REFERENCE.obliquityJ2000_deg;
const cardinalPointAnchorsAtGrid = {};
for (const [type, jd2000] of Object.entries(ASTRO_REFERENCE.cardinalPointAnchors)) {
  if (typeof jd2000 !== 'number') continue;   // the key carries its provenance `_comment` (R4d)
  cardinalPointAnchorsAtGrid[type] = jd2000;
}

// J2000.0 epoch (standard astronomical convention: Jan 1.5, 2000 TT = JD 2451545.0)
// Julian century = exactly 36525 days by IAU definition (used in Meeus, IAU precession, parallax)
// Tropical century = 100 model tropical years (used in obliquity rate solver for phase-clean measurement)
const j2000JD = 2451545.0;
const julianCenturyDays = 36525;
const tropicalCenturyDays = 100 * meanSolarYearDays;

// (Plan 07 R1: tripleSynodicYears — the Jupiter–Saturn triple synodic period
// on the device's lattice perihelion rates — had no reader; gone with the
// lattice.)

// Equation of center eccentricity — derived, not a free parameter. The wheel's
// split: the geometry supplies base'·sin M, the EoC term the rest — so the
// static (J2000) value is e(J2000) − base'/2 (unification; matches the
// dynamic split dynEcc.earth − base'/2 at J2000).
// Unification: the Sun node's EoC eccentricity is HALF the one law's e(t) (the
// geometric offset −e(t)·û(ϖ), animated every frame, supplies the other half);
// this const is its J2000 value — the scene overrides it per frame.
const eocEccentricity = ASTRO_REFERENCE.earthEccentricityJ2000 / 2;

// (plan 11 step 2: perihelionPhaseOffset — the scene Sun's EoC perihelion
// phase at the model start, built from the deleted wheel 16 and correctionSun
// — is deleted; the engine places the Sun at the certified longitude every
// frame, so the offset reached nothing.)


// ═══════════════════════════════════════════════════════════════════════════
// 7. MOON DERIVED CYCLES
// ═══════════════════════════════════════════════════════════════════════════

// ───── The Moon's J2000 periods on the IAU inputs (plan 09) ─────
// Three observational anchors (astro-reference.json moonReference): the
// sidereal month and the of-date apsidal and nodal precession periods (the
// legacy-'ICRF' input names hold EQUINOX-OF-DATE periods, 3231.50 d /
// 6798.38 d). The star-referenced (inertial) periods follow by removing the
// equinox's own precession: 1/T_E = 1/T_I ∓ 1/T_p (perigee advances, node
// regresses), T_p = the J2000 precession anchor in days (Julian years).
// The retired era device counted these cycles as eighth-integers per 8H
// (N_sid 35,860,753; N_apsidalI 303,196; N_nodalI 144,119 — the ∓13 was
// H/13 cycles per H) and read every period back as totalDaysInH/N — 7.8 ms
// above the IAU sidereal month; those counts are deleted (docs/66 §1 keeps
// the derivation record). Mirrors src/script.js.
const moonSiderealMonth = moonSiderealMonthInput;
const moonApsidalPrecessionDaysICRF = moonApsidalPrecessionDaysInputICRF;
const moonNodalPrecessionDaysICRF = moonNodalPrecessionDaysInputICRF;
const moonApsidalPrecessionDaysEarth = 1 / (1 / moonApsidalPrecessionDaysICRF - 1 / axialPrecessionJ2000Days);
const moonNodalPrecessionDaysEarth = 1 / (1 / moonNodalPrecessionDaysICRF + 1 / axialPrecessionJ2000Days);
// Anomalistic and nodal months: KINEMATIC consequences of sidereal + precession,
// not independent inputs. 1/T_ano = 1/T_M − 1/T_apsidalE (perigee advances)
// and 1/T_nod_month = 1/T_M + 1/T_nodalE (node regresses).
const moonAnomalisticMonth = 1 / (1 / moonSiderealMonth - 1 / moonApsidalPrecessionDaysEarth);
const moonNodalMonth = 1 / (1 / moonSiderealMonth + 1 / moonNodalPrecessionDaysEarth);
// Synodic month: the beat of the sidereal month with the sidereal year;
// tropical month: the sidereal month seen from the precessing equinox.
const moonSynodicMonth = moonSiderealMonth * meanSiderealYearDays / (meanSiderealYearDays - moonSiderealMonth);
const moonTropicalMonth = 1 / (1 / moonSiderealMonth + 1 / axialPrecessionJ2000Days);

const moonFullMoonCycleEarth = (moonSynodicMonth / (moonSynodicMonth - moonAnomalisticMonth)) * moonAnomalisticMonth;
const moonFullMoonCycleICRF = 1 / (1 / moonFullMoonCycleEarth + 1 / axialPrecessionJ2000Days);
// (plan 09 step 7c: the real-valued "cycles per anchor interval" N_apsidalI /
// N_nodalI — the Step-0 Sun comb's divisor candidates — left with the unit.)

const moonApsidalMeetsNodalDays = (moonNodalMonth / (moonAnomalisticMonth - moonNodalMonth)) * moonAnomalisticMonth;
const moonLunarLevelingCycleDays = (moonNodalPrecessionDaysEarth / (moonNodalPrecessionDaysEarth - moonApsidalPrecessionDaysEarth) * (moonApsidalPrecessionDaysEarth / meanSolarYearDays)) * meanSolarYearDays;
const moonDraconicYearICRF = 1 / ((1 / meanSolarYearDays) + (1 / moonNodalPrecessionDaysEarth));
const moonDraconicYearEarth = 1 / (1 / moonDraconicYearICRF - 1 / axialPrecessionJ2000Days);


// ═══════════════════════════════════════════════════════════════════════════
// 8. ASTRO_REFERENCE WIRING
// Attach planet-dependent fields to the imported ASTRO_REFERENCE object.
// ═══════════════════════════════════════════════════════════════════════════

// (plan 09 step 7c: `ASTRO_REFERENCE.earthInvPlanePrecessionYears` = H/3 — a
// device period with no reader — is deleted; Earth's apsidal period is the
// chain's secular tangent, `model.lunisolar` / the registry's inclPrecYears.)

// (The Moon post-Meeus RA/Dec patches MOON_CORRECTION / MOON_CORRECTION_RESIDUAL
// were retired at plan 06 R3 item 1 — @essrt/physics moon/apparent.cjs.)

// Planet perihelion passage references (model-tuned, from model-parameters.json)
for (const [key, jd] of Object.entries(modelParams.perihelionPassageRef)) {
  if (typeof jd === 'number') ASTRO_REFERENCE[key + 'PerihelionRef_JD'] = jd;
}

// Ascending node corrections (derived from planet data)
ASTRO_REFERENCE.ascNodeTiltCorrection = {
  mercury: 180 - planets.mercury.ascendingNode,
  venus:   180 - planets.venus.ascendingNode,
  mars:    180 - planets.mars.ascendingNode,
  jupiter: 2 * planets.jupiter.startpos,
  saturn:  2 * planets.saturn.startpos,
  uranus:  2 * planets.uranus.startpos,
  neptune: 2 * planets.neptune.startpos,
};


// ═══════════════════════════════════════════════════════════════════════════
// 9. MASS COMPUTATION, PSI, J2000 ECCENTRICITIES
// ═══════════════════════════════════════════════════════════════════════════

// Order: Earth/Moon → Sun. Kepler on Earth's orbit gives G(M_Sun + M_Earth);
// we back out GM_Sun by subtracting GM_Earth (computed from the Moon's orbit).

const massFraction = {};
for (const [k, ratio] of Object.entries(massRatioDE440)) {
  massFraction[k] = 1 / ratio;
}

// Earth mass via Moon orbital mechanics.
// Δa = a_M × M_M/(M_E + M_M) × m  is the leading-order correction for the
// Sun's tidal coupling to the Earth-Moon barycentric wobble (Earth-Moon-Sun
// 3-body). Closes G(M_E + M_M) to ~3.7 ppm of JPL DE440 — better and more
// physically motivated than the older "1+1/year" SSDR factor.
const moonOrbitalShift = moonDistance * (1 / (MASS_RATIO_EARTH_MOON + 1)) * (moonSiderealMonth / meanSiderealYearDays);
const moonDistanceCorrected = moonDistance + moonOrbitalShift;
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistanceCorrected, 3)) /
  Math.pow(moonSiderealMonth * meanLengthOfDay, 2);
const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1));
const GM_MOON_ALONE  = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1);

// GM_Sun (M_Sun only): Kepler from Earth's orbit gives G(M_Sun + M_Earth);
// subtract GM_Earth to recover the JPL/IAU convention.
const GM_SUN_PLUS_EARTH = (4 * Math.PI * Math.PI * Math.pow(currentAUDistance, 3)) / Math.pow(meanSiderealYearSeconds, 2);
const GM_SUN = GM_SUN_PLUS_EARTH - GM_EARTH_ALONE;
const M_SUN = GM_SUN / G_CONSTANT;
massFraction.earth = (GM_EARTH_ALONE / G_CONSTANT) / M_SUN;

// (Plan 07 R5: PSI — ψ = 3·A_earth·√(m_E/m_☉), the inclination-amplitude
// constant inverted from Earth's calibration — and the per-planet ψ loop
// below it (invPlaneInclinationAmplitude / invPlaneInclinationMean) are
// DELETED with @essrt/physics/planets/fibonacci-laws. A planet's inclination
// of date has one home, the N-body chain.)

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

// The K eccentricity law's cycle period for each carrier: the chain's OWN
// g-mode beat (dominant mode × largest companion of the planet's eccentricity
// vector, keplerian-chain computeSecularShape — the panel's "Eccentricity
// Cycle (g-mode beat)" row). Plan 06 Phase 7 commit 2: this replaces the
// device's beat of its integer axial and obliquity fractions; the scene
// twins read the same artifact, so both wobble wheels turn on one period.
const { computeSecularShape } = require('@essrt/physics/planets/secular-shape');
const { computeObliquityJ2000Deg } = require('@essrt/physics/planets/spin-channel');
// (CHAIN_DATA — the governed artifact — is loaded above the planet records,
// which read their perihelion period from it since plan 07 R1.)
for (const [key, p] of Object.entries(planets)) {
  if (CHAIN_DATA.secularModes && CHAIN_DATA.secularModes[key]) {
    p.wobblePeriod = computeSecularShape(CHAIN_DATA, key).beatYears;
  }
}

// Plan 07 R6/R5: the K relation, the System-Reset eccentricity construction
// and the ψ inclination law are gone — the loop that closed
//   PSI → incl amp → mean tilt → K → ecc amp → phase from the anchor → base
// no longer opens. A planet's eccentricity and inclination of date have one
// home, the N-body chain; the base/amplitude/phase and mean/amplitude
// triples were constructions nothing rendered read (plan 07 §9e).
//
// The DERIVED J2000 obliquity stays: it is the spin channel's reading (the
// IAU pole against the chain's J2000 plane, acute form), not a device value,
// and the fixtures pin it.
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
// Plan 09 step 7b: the seven chain planets' scaffold geometry rides the chain's
// own J2000 elements — a from the anchor set, the period from the fitted
// era-window mean motion (deg per Julian year) of the governed engine-D
// artifact (the SAME JSON the browser embeds as CHAIN_ARTIFACT); the
// device's count-per-anchor-interval quantization is gone. The no-chain
// bodies keep their observed period input. ONE home: planets/geometry.
const _CHAIN_ARTIFACT = require('../../data/nbody-secular-frequencies.json');

function computePlanetDerived(key) {
  const p = planets[key];
  const g = derivePlanetGeometry({
    key, type: p.type,
    ...scaffoldOrbitInputs(key, _CHAIN_ARTIFACT, p.solarYearInput),
    // Plan 07 R6: the scene's ellipse geometry read the K law's System-Reset
    // base; with the law retired it reads the OBSERVED J2000 eccentricity,
    // the value the chain is anchored on.
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
  };
}

const derived = {};
for (const key of Object.keys(planets)) {
  derived[key] = computePlanetDerived(key);
}

function rebuildDerived(key) {
  derived[key] = computePlanetDerived(key);
}

function computeAdditionalDerived(key) {
  const b = additionalBodies[key];
  // 8.3 L1: full geometry via the shared law (this engine previously returned
  // only {N, a, period} for the minor bodies — part of the S-P6 coverage gap;
  // the ellipse family for pluto/halleys/eros is NEW capability here).
  const g = derivePlanetGeometry({
    key,   // the minor bodies' ellipse family is the law's own (body-name branches; Eros' type default lives there since plan 11 step 2)
    ...scaffoldOrbitInputs(key, _CHAIN_ARTIFACT, b.solarYearInput),
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

// (plan 09 step 4: PERI_HARMONICS — the perihelion comb on H-divisors — is
// deleted; Earth's perihelion of date is the series' ϖ,
// createModel().earth.perihelionLongitudeDeg)


// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS — All ~115 items, backward compatible
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Foundational model constants
  perihelionalignmentYear,
  perihelionalignmentJD,
  startmodelJD,
  startmodelYear,
  correctionDays,
  startAngleModel,
  useVariableSpeed,

  // Physical & astronomical constants
  currentAUDistance,
  meanSiderealYearSeconds,
  G_CONSTANT,
  MASS_RATIO_EARTH_MOON,
  massRatioDE440,

  // Deep-time physics anchors (astro-reference.json physicalConstants, and the
  // deepTime block of the GENERATED constants module — plan 11 step 1: the
  // block is ASSEMBLED by tools/constants/generate.mjs from its three homes
  // (astro-reference moonReference.moonRecessionAlpha1PerMa + giaCoxChaoPeltier,
  // data/deep-time-fitted.json, data/deltaT-4flag-fit.json shipped_taper); this
  // twin reads the SAME embed the browser and the package read, so there is one
  // assembly, and `test:constants` pins the embed to its sources)
  EARTH_MOI_FACTOR: astroRef.physicalConstants.earthMoiFactorJ2000,
  EARTH_FLATTENING_INVERSE_WGS84: astroRef.physicalConstants.earthFlatteningInverseWGS84,
  EARTH_DIAMETER_KM: astroRef.bodyDiametersKm.earth,
  NUTATION_LEADING_TERMS_ARCSEC: astroRef.physicalConstants.nutationLeadingTermsArcsec,
  ABERRATION_CONSTANT_ARCSEC: astroRef.physicalConstants.aberrationConstantArcsec,
  SOLAR_LUMINOSITY_W: astroRef.physicalConstants.solarLuminosityW,
  SOLAR_WIND_KG_PER_S: astroRef.physicalConstants.solarWindMassLossKgPerS,
  ALPHA_1: GENERATED_DEEP_TIME.alpha1PerMa,
  ALPHA_3: GENERATED_DEEP_TIME.alpha3PerMa3,
  ALPHA_4: GENERATED_DEEP_TIME.alpha4PerMa4,
  RECESSION_REGIME: GENERATED_DEEP_TIME.recessionRegime,
  ALPHA_GIA_RATE_J2000_PER_YR: GENERATED_DEEP_TIME.alphaGiaRateJ2000PerYr,
  ALPHA_GIA_RELAXATION_KYR: GENERATED_DEEP_TIME.alphaGiaRelaxationKyr,
  J2_RATE_J2000_PER_YR: GENERATED_DEEP_TIME.j2RateJ2000PerYr,   // the OBSERVED dJ2/dt (Cox & Chao 2002) — the GIA channel's J2 scale (the precession of date)
  DT_STACK_TAPER_FULL_HALFWIDTH_YR: GENERATED_DEEP_TIME.dtStackTaperFullHalfwidthYr,
  DT_STACK_TAPER_TOTAL_HALFWIDTH_YR: GENERATED_DEEP_TIME.dtStackTaperTotalHalfwidthYr,

  // Earth parameters
  earthRAAngle,
  earthtiltMean,
  earthInvPlaneInclinationAmplitude,
  earthAscendingNodeInvPlane,
  kDeviceInclinationPhaseJ2000Deg,
  eccentricityAmplitude,
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
  moonStartposApsidal,
  moonStartposNodal,

  // Planet data
  planets,
  additionalBodies,

  // Derived model values
  meanSolarYearDays,
  meanEarthRotationsPerYear,
  startModelYearWithCorrection,
  balancedYear,
  kDeviceWheelPhaseAtJ2000Cycles,
  kDeviceWheelPeriodYears,
  balancedJD,
  cardinalPointYearFractions,
  iauObliquityAtGrid,
  cardinalPointAnchorsAtGrid,
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
  // Plan 06 Phase 7: the planets' spin inputs (astro-reference planetSpinPhysical)
  // and the chain data — the Node scene engine builds the spin channel from them.
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
  rebuildDerived,

  // External reference values
  yearLengthRef,
  knownValues,

  // (The fitted record — SOLSTICE_JD_HARMONICS / CARDINAL_POINT_* — left at plan 09
  //  step 7a with the frozen cardinal evaluator; the observed USNO 2000 instants
  //  stay in ASTRO_REFERENCE.cardinalPointAnchors.
  //  PREDICT_PLANETS / PREDICT_COEFFS — the planet predict device — retired at plan 06 R8;
  //  PERI_HARMONICS / PERI_OFFSET — the perihelion comb — at plan 09 step 4)

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

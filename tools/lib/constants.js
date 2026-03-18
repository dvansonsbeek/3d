// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS MODULE — Single source of truth for all tool scripts.
// All values and formulas replicate the exact calculations in src/script.js.
//
// Structure:
//   1. Foundational model constants
//   2. Physical & astronomical constants
//   3. Earth parameters
//   4. Moon input constants
//   5. Planet input data (7 non-Earth planets + additional bodies)
//   6. Derived model values (year lengths, eccentricity, EoC, epochs)
//   7. Moon derived cycles
//   8. Astronomical reference data (ASTRO_REFERENCE)
//   9. Mass computation, PSI, J2000 eccentricities
//  10. Planet derived calculations
//  11. External reference values
//  12. Predictive formula constants
//  13. Utilities (date conversion, formatting)
//  14. Exports
// ═══════════════════════════════════════════════════════════════════════════


// ─── 1. FOUNDATIONAL MODEL CONSTANTS ─────────────────────────────────────
// These define the model itself. Changing any = different theory.

const H = 335008; // holisticyearLength
const inputMeanSolarYear = 365.2421897;
const perihelionalignmentYear = 1246;
const startmodelJD = 2451716.5;
const startmodelYear = 2000.5;
const correctionDays = -0.23328398168087;
const correctionSun = 0.493231;
const temperatureGraphMostLikely = 14.5;
const startAngleModel = 89.91949879;
const useVariableSpeed = true; // Toggle equation of center (must match script.js)


// ─── 2. PHYSICAL & ASTRONOMICAL CONSTANTS ────────────────────────────────
// External reference values from IAU, JPL DE440, etc.

const currentAUDistance = 149597870.698828; // km
const meanSiderealYearSeconds = 31558149.8;
const G_CONSTANT = 6.6743e-20; // km³/(kg·s²)
const MASS_RATIO_EARTH_MOON = 81.3007;

// DE440 Sun/planet mass ratios (Sun mass / planet mass)
const massRatioDE440 = {
  mercury: 6023625.5, venus: 408523.72, mars: 3098703.59,
  jupiter: 1047.348625, saturn: 3497.9018, uranus: 22902.944, neptune: 19412.237,
};


// ─── 3. EARTH PARAMETERS ─────────────────────────────────────────────────
// Earth-specific model constants. Additional Earth J2000 values are in
// ASTRO_REFERENCE (section 8): earthEccentricityJ2000, earthPerihelionLongitudeJ2000,
// earthAscendingNodeInvPlane, earthInclinationPhaseAngle.

const earthRAAngle = 1.25363;
const earthtiltMean = 23.41357;
const earthInvPlaneInclinationMean = 1.481179;
const earthInvPlaneInclinationAmplitude = 0.635970;
const eccentricityBase = 0.015372;
const eccentricityAmplitude = 0.00137032;
// K = eccentricityAmplitude × √m_Earth × a_Earth^(3/2) / (sin(tiltMean) × √d_Earth)
// Relates axial tilt to eccentricity amplitude for all planets (doc 35, §4)
const eccentricityAmplitudeK = 3.4505372893e-6;
const perihelionRefJD = 2451547.042; // JD of Earth perihelion 2000 (Jan 3.542)


// ─── 4. MOON INPUT CONSTANTS ─────────────────────────────────────────────

const moonSiderealMonthInput = 27.32166156;
const moonAnomalisticMonthInput = 27.55454988;
const moonNodalMonthInput = 27.21222082;
const moonDistance = 384399.07; // km
const moonEclipticInclinationJ2000 = 5.1453964;
const moonOrbitalEccentricity = 0.054900489;
const moonTilt = 6.687;
const moonStartposApsidal = 347.622;
const moonStartposNodal = -83.630;
const moonStartposMoon = 131.930;


// ─── 5. PLANET INPUT DATA ────────────────────────────────────────────────
// Per-planet constants for the 7 non-Earth planets in the Fibonacci framework.
// Earth is not included here (it's the observer/reference frame).

const planets = {
  mercury: {
    name: 'Mercury',
    solarYearInput: 87.9686,
    orbitalEccentricityBase: 0.20563593,  // Base eccentricity (tilt ~0, no fluctuation)
    orbitalEccentricityJ2000: 0.20563593,
    orbitalEccentricityAmplitude: 8.436789e-5,
    eccentricityPhaseJ2000: 89.9882,  // Phase angle at J2000 (degrees) — near mean, tilt ~0
    axialTiltMean: 0.03,
    eocFraction: -0.527,
    startpos: 83.53,
    angleCorrection: 0.971049,
    perihelionEclipticYears: H / (1 + 3/8),
    type: 'I',
    mirrorPair: 'uranus',
    fibonacciD: 21,
    // J2000 orbital elements (JPL Horizons)
    eclipticInclinationJ2000: 7.00497902,
    longitudePerihelion: 77.4569131,
    ascendingNode: 48.33033155,
    // Invariable plane (Souami & Souchay 2012)
    invPlaneInclinationJ2000: 6.3472858,
    ascendingNodeInvPlane: 32.83,
    inclinationPhaseAngle: 203.3195,
    // Fibonacci-derived inclination parameters
    invPlaneInclinationMean: 6.726620,
    invPlaneInclinationAmplitude: 0.384621,
    obliquityCycle: H * 8 / 3,  // 8H/3 = 893,355 yr (observed ~895 kyr, Bills 2005)
    orbitTilta: 5.23265097,     // sin(Ω)*i for ascending node dynamics
    orbitTiltb: 4.65715524,     // cos(Ω)*i for ascending node dynamics
  },
  venus: {
    name: 'Venus',
    solarYearInput: 224.695,
    orbitalEccentricityBase: 0.00619052,  // Base eccentricity (H/16 fit to JPL data, -8.65% from J2000)
    orbitalEccentricityJ2000: 0.00677672,
    orbitalEccentricityAmplitude: 9.625389e-4,
    eccentricityPhaseJ2000: 123.7514,  // Phase angle at J2000 (degrees) — past mean, decreasing
    axialTiltMean: 2.6392,
    eocFraction: 0.436,
    startpos: 249.312,
    angleCorrection: -2.784782,
    perihelionEclipticYears: H * 2,
    type: 'I',
    mirrorPair: 'neptune',
    fibonacciD: 34,
    eclipticInclinationJ2000: 3.39467605,
    longitudePerihelion: 131.5765919,
    ascendingNode: 76.67877109,
    invPlaneInclinationJ2000: 2.1545441,
    ascendingNodeInvPlane: 54.70,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 2.207361,
    invPlaneInclinationAmplitude: 0.061866,
    obliquityCycle: null,           // N/A — tidally damped at 177°
    orbitTilta: 3.30333743,
    orbitTiltb: 0.78216832,
  },
  mars: {
    name: 'Mars',
    solarYearInput: 686.931,
    orbitalEccentricityBase: 0.09297543,  // Base eccentricity (H/16 fit to JPL data, -0.45% from J2000)
    orbitalEccentricityJ2000: 0.09339410,
    orbitalEccentricityAmplitude: 3.073636e-3,
    eccentricityPhaseJ2000: 96.8878,  // Phase angle at J2000 (degrees) — just past mean
    axialTiltMean: 25.19,
    eocFraction: -0.066224,
    startpos: 121.4679,
    angleCorrection: -2.107087,
    perihelionEclipticYears: H / (4 + 1/3),
    type: 'II',
    mirrorPair: 'jupiter',
    fibonacciD: 5,
    eclipticInclinationJ2000: 1.84969142,
    longitudePerihelion: 336.0650681,
    ascendingNode: 49.55737662,
    invPlaneInclinationJ2000: 1.6311858,
    ascendingNodeInvPlane: 354.87,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 2.649893,
    invPlaneInclinationAmplitude: 1.158626,
    obliquityCycle: 3 * H / 8,     // 3H/8 = 125,628 yr (observed ~124,800 yr, Laskar 2004)
    orbitTilta: 1.40771866,
    orbitTiltb: 1.19986938,
  },
  jupiter: {
    name: 'Jupiter',
    solarYearInput: 4330.5,
    orbitalEccentricityBase: 0.04821478,  // Dual-balanced (-0.35% from J2000)
    orbitalEccentricityJ2000: 0.04838624,
    orbitalEccentricityAmplitude: 1.149908e-6,
    eccentricityPhaseJ2000: 180,  // 180° = max ecc, closest to J2000 (J2000 > base)
    axialTiltMean: 3.13,
    eocFraction: 0.484,
    startpos: 13.85,
    angleCorrection: 0.92974,
    perihelionEclipticYears: H / 5,
    type: 'III',
    mirrorPair: 'mars',
    fibonacciD: 5,
    eclipticInclinationJ2000: 1.30439695,
    longitudePerihelion: 14.70659401,
    ascendingNode: 100.4877868,
    invPlaneInclinationJ2000: 0.3219652,
    ascendingNodeInvPlane: 312.89,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 0.329100,
    invPlaneInclinationAmplitude: 0.021301,
    obliquityCycle: H / 2,          // H/2 = 167,504 yr (prediction)
    orbitTilta: 1.28260534,
    orbitTiltb: -0.23743407,
  },
  saturn: {
    name: 'Saturn',
    solarYearInput: 10747.0,
    orbitalEccentricityBase: 0.05374486,  // Dual-balanced = Law 5 prediction (-0.22% from J2000)
    orbitalEccentricityJ2000: 0.05386179,
    orbitalEccentricityAmplitude: 5.403008e-6,
    eccentricityPhaseJ2000: 180,  // 180° = max ecc, closest to J2000 (J2000 > base)
    axialTiltMean: 26.73,
    eocFraction: 0.543,
    startpos: 11.32,
    angleCorrection: -0.17477,
    perihelionEclipticYears: -H / 8,
    type: 'III',
    mirrorPair: 'earth',
    fibonacciD: 3,
    eclipticInclinationJ2000: 2.48599187,
    longitudePerihelion: 92.12794343,
    ascendingNode: 113.6452856,
    invPlaneInclinationJ2000: 0.9254704,
    ascendingNodeInvPlane: 118.81,
    inclinationPhaseAngle: 23.3195,   // Saturn: sole 23° planet
    invPlaneInclinationMean: 0.931678,
    invPlaneInclinationAmplitude: 0.064879,
    obliquityCycle: H / 3,          // H/3 = 111,669 yr (prediction, mirror-pair with Earth)
    orbitTilta: 2.27728294,
    orbitTiltb: -0.99706468,
  },
  uranus: {
    name: 'Uranus',
    solarYearInput: 30586,
    orbitalEccentricityBase: 0.04734421,  // Dual-balanced (+0.18% from J2000)
    orbitalEccentricityJ2000: 0.04725744,
    orbitalEccentricityAmplitude: 2.831008e-5,
    eccentricityPhaseJ2000: 0,  // 0° = min ecc, closest to J2000 (J2000 < base)
    axialTiltMean: 82.23,
    eocFraction: 0.50,
    startpos: 44.88,
    angleCorrection: -0.733732,
    perihelionEclipticYears: H / 3,
    type: 'III',
    mirrorPair: 'mercury',
    fibonacciD: 21,
    eclipticInclinationJ2000: 0.77263783,
    longitudePerihelion: 170.7308251,
    ascendingNode: 74.00919023,
    invPlaneInclinationJ2000: 0.9946692,
    ascendingNodeInvPlane: 307.80,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 1.000600,
    invPlaneInclinationAmplitude: 0.023716,
    obliquityCycle: H / 2,          // H/2 = 167,504 yr (prediction, tentative)
    orbitTilta: 0.74274130,
    orbitTiltb: 0.21284872,
  },
  neptune: {
    name: 'Neptune',
    solarYearInput: 59980,
    orbitalEccentricityBase: 0.00868571,  // Base eccentricity, solved for 100% Law 5 balance (+1.11% from J2000)
    orbitalEccentricityJ2000: 0.00859048,
    orbitalEccentricityAmplitude: 8.098033e-6,
    eccentricityPhaseJ2000: 0,  // 0° = min ecc, closest to J2000 (J2000 < base)
    axialTiltMean: 28.32,
    eocFraction: 0.50,
    startpos: 47.96,
    angleCorrection: 2.33091,
    perihelionEclipticYears: H * 2,
    type: 'III',
    mirrorPair: 'venus',
    fibonacciD: 34,
    eclipticInclinationJ2000: 1.77004347,
    longitudePerihelion: 45.80124471,
    ascendingNode: 131.7853754,
    invPlaneInclinationJ2000: 0.7354155,
    ascendingNodeInvPlane: 192.04,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 0.722190,
    invPlaneInclinationAmplitude: 0.013486,
    obliquityCycle: null,           // N/A — frozen at ~28°
    orbitTilta: 1.31982602,
    orbitTiltb: -1.17945460,
  },
};

// Additional bodies (not in the 8-planet Fibonacci framework)
const additionalBodies = {
  pluto: { name: 'Pluto', solarYearInput: 90465, orbitalEccentricityBase: 0.2488273, type: 'I' },
  halleys: { name: "Halley's", solarYearInput: 27503, orbitalEccentricityBase: 0.96714291, type: 'III' },
  eros: { name: 'Eros', solarYearInput: 642.93, orbitalEccentricityBase: 0.2229512, type: 'II' },
  ceres: { name: 'Ceres', solarYearInput: 1680.5, orbitalEccentricityBase: 0.0755347, orbitDistanceOverride: 2.76596 },
};


// ─── 6. DERIVED MODEL VALUES ─────────────────────────────────────────────
// Computed from foundational constants. Order matters (dependency chain).

const perihelionCycleLength = H / 16;
const meanSolarYearDays = Math.round(inputMeanSolarYear * (H / 16)) / (H / 16);
const meanEarthRotationsPerYear = meanSolarYearDays + 1;
const startModelYearWithCorrection = startmodelYear + (correctionDays / meanSolarYearDays);
const balancedYear = perihelionalignmentYear - (temperatureGraphMostLikely * (H / 16));
const perihelionalignmentJD = Math.round(startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - perihelionalignmentYear)));
const balancedJD = startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - balancedYear));
const yearsFromBalancedToJ2000 = (startmodelJD - balancedJD) / meanSolarYearDays;
const meanSiderealYearDays = meanSolarYearDays * (H / 13) / ((H / 13) - 1);
const meanLengthOfDay = meanSiderealYearSeconds / meanSiderealYearDays;
const meanSiderealDay = (meanSolarYearDays / (meanSolarYearDays + 1)) * meanLengthOfDay;
const meanStellarDay = (meanSiderealDay / (H / 13)) / (meanSolarYearDays + 1) + meanSiderealDay;
const meanAnomalisticYearDays = (meanSolarYearDays / (perihelionCycleLength - 1)) + meanSolarYearDays;
const eccentricityDerivedMean = Math.sqrt(eccentricityBase * eccentricityBase + eccentricityAmplitude * eccentricityAmplitude);
const totalDaysInH = H * meanSolarYearDays;

// J2000.0 epoch and Julian century derived from model constants
const j2000JD = startmodelJD - (startmodelYear - 2000.0) * meanSolarYearDays;
const julianCenturyDays = 100 * meanSolarYearDays;

// Equation of center eccentricity — derived, not a free parameter.
// Off-center geometry provides amplitude e_geom (first order); EoC adds 2·eoc.
// Total must equal Keplerian 2·e_real → eoc = e_real - e_geom/2.
const eocEccentricity = eccentricityDerivedMean - eccentricityBase / 2;

// Perihelion phase offset — derived from geometric perihelion direction vs reference perihelion date.
const perihelionPhaseOffset = (((startModelYearWithCorrection - balancedYear) / (H / 16) * 360
  + correctionSun + 360 * (startmodelJD - perihelionRefJD) / meanSolarYearDays) % 360 + 360) % 360;

// Fourier harmonic coefficients for year-length formulas (fitted from 491 data points, ±25000 yr)
// Means are DERIVED: tropical = meanSolarYearDays, sidereal = meanSiderealYearDays,
// anomalistic = meanAnomalisticYearDays. Only coefficients need refitting if H changes.
// Each entry: [period_divisor, sin_coeff, cos_coeff] — period = H / divisor
const TROPICAL_YEAR_HARMONICS = [                          // RMS = 0.006 s
  [8,  -1.315685778131e-06, -2.101615481220e-05],         // H/8:  1.819s amp
  [3,  +6.745126392744e-07, +7.955457410219e-06],         // H/3:  0.690s amp
  [16, -6.145697256116e-09, -3.622604401125e-07],          // H/16: 0.031s amp
];
const SIDEREAL_YEAR_HARMONICS = [                          // RMS = 0.003 s
  [8, -1.255070074367e-06, -1.783278998075e-08],           // H/8:  0.108s amp
  [3, +5.794170454941e-07, +1.019398849945e-07],           // H/3:  0.051s amp
];
const ANOMALISTIC_YEAR_HARMONICS = [                       // RMS = 0.011 s
  [8,  -2.111981801448e-07, +2.544662242077e-08],          // H/8:  0.018s amp
  [3,  -6.755570533516e-08, -5.963699950444e-10],          // H/3:  0.006s amp
  [16, -5.074517345509e-08, +8.665832935489e-08],          // H/16: 0.009s amp
  [24, -4.432336424626e-07, +1.845872180598e-08],          // H/24: 0.038s amp
];


// ─── 7. MOON DERIVED CYCLES ─────────────────────────────────────────────

const moonSiderealMonth = totalDaysInH / Math.ceil(totalDaysInH / moonSiderealMonthInput);
const moonAnomalisticMonth = totalDaysInH / Math.ceil(totalDaysInH / moonAnomalisticMonthInput);
const moonNodalMonth = totalDaysInH / Math.ceil(totalDaysInH / moonNodalMonthInput);

const moonSynodicMonth = totalDaysInH / (Math.ceil(totalDaysInH / moonSiderealMonthInput - 1) + 13 - H);
const moonTropicalMonth = totalDaysInH / (Math.ceil(totalDaysInH / moonSiderealMonthInput - 1) + 13);

const moonFullMoonCycleEarth = (moonSynodicMonth / (moonSynodicMonth - moonAnomalisticMonth)) * moonAnomalisticMonth;
const moonFullMoonCycleICRF = totalDaysInH / ((totalDaysInH / moonFullMoonCycleEarth) + 13);

const moonNodalPrecessionDaysEarth = (moonSiderealMonth / (moonSiderealMonth - moonNodalMonth)) * moonNodalMonth;
const moonNodalPrecessionDaysICRF = totalDaysInH / ((totalDaysInH / moonNodalPrecessionDaysEarth) - 13);

const moonApsidalPrecessionDaysEarth = (1 / ((moonAnomalisticMonth / moonSiderealMonth) - 1)) * moonAnomalisticMonth;
const moonApsidalPrecessionDaysICRF = totalDaysInH / ((totalDaysInH / moonApsidalPrecessionDaysEarth) + 13);

const moonApsidalMeetsNodalDays = (moonNodalMonth / (moonAnomalisticMonth - moonNodalMonth)) * moonAnomalisticMonth;
const moonLunarLevelingCycleDays = (moonNodalPrecessionDaysEarth / (moonNodalPrecessionDaysEarth - moonApsidalPrecessionDaysEarth) * (moonApsidalPrecessionDaysEarth / meanSolarYearDays)) * meanSolarYearDays;
const moonDraconicYearICRF = 1 / ((1 / meanSolarYearDays) + (1 / moonNodalPrecessionDaysEarth));
const moonDraconicYearEarth = totalDaysInH / ((totalDaysInH / moonDraconicYearICRF) - 13);


// ─── 8. ASTRONOMICAL REFERENCE DATA (ASTRO_REFERENCE) ────────────────────
// External reference values and derived correction coefficients.

const ASTRO_REFERENCE = {
  // --- Earth orbital parameters (J2000) ---
  earthEccentricityJ2000: 0.01671022,
  earthPerihelionLongitudeJ2000: 102.947,  // degrees
  earthAscendingNodeInvPlane: 284.51,      // Souami & Souchay (2012)
  earthInclinationPhaseAngle: 203.3195,
  earthInvPlanePrecessionYears: H / 3,

  // --- Planet perihelion passage references (JPL Horizons, phase-optimized) ---
  mercuryPerihelionRef_JD: 2460335.9,
  venusPerihelionRef_JD: 2455464.42,
  marsPerihelionRef_JD: 2456499.441,
  jupiterPerihelionRef_JD: 2464224.5,
  saturnPerihelionRef_JD: 2452875.9,
  uranusPerihelionRef_JD: 2439699.8,
  neptunePerihelionRef_JD: 2409432.4,

  // --- Lunar mean longitude coefficients (Meeus, Ch. 47) ---
  moonMeanAnomalyJ2000_deg: 134.9634,
  moonMeanAnomalyRate_degPerDay: 13.06499295,
  moonMeanElongationJ2000_deg: 297.8502,
  moonMeanElongationRate_degPerDay: 12.19074912,
  sunMeanAnomalyJ2000_deg: 357.5291,
  sunMeanAnomalyRate_degPerDay: 0.98560028,
  moonArgLatJ2000_deg: 93.2720993,
  moonArgLatRate_degPerCentury: 483202.0175273,
  moonMeanElongationJ2000Full_deg: 297.8502042,
  moonMeanElongationRate_degPerCentury: 445267.1115168,

  // --- Ascending node frame corrections (DERIVED, not tuned) ---
  //   Type I/II (inner): 180 - ascendingNode (anti-node direction)
  //   Type III (outer):  2 × startpos (compensates orbital phase in tilt frame)
  ascNodeTiltCorrection: {
    mercury: 180 - planets.mercury.ascendingNode,
    venus:   180 - planets.venus.ascendingNode,
    mars:    180 - planets.mars.ascendingNode,
    jupiter: 2 * planets.jupiter.startpos,
    saturn:  2 * planets.saturn.startpos,
    uranus:  2 * planets.uranus.startpos,
    neptune: 2 * planets.neptune.startpos,
  },

  // --- Parallax correction coefficients (fitted from JPL reference data) ---
  // Post-hoc RA/Dec correction for geocentric parallax effect.
  // Formula: dX = A + B/d + C*T + (D*sin(u) + E*cos(u) + F*sin(2u) + G*cos(2u) + H*sin(3u) + I*cos(3u))/d
  //              + T*(J*sin(u) + K*cos(u))/d
  //   where u = RA - ascendingNode (radians), d = geocentric distance (AU),
  //         s = heliocentric distance (AU), T = centuries from J2000
  // Fitted via linear least squares (15/18/24/30/36/42 terms per planet).
  // L = 1/s, M = sin(u)/d², N = sin(2u)/s, O = cos(u)/s
  // P = T*sin(2u)/d, Q = T*cos(2u)/d, R = T*sin(u)/s
  // S = T/d, U = cos(u)/d², V = 1/s², W = sin(u)/s², X = cos(3u)/s, Y = sin(3u)/s
  // Z = 1/(d*s), AA = sin(u)/(d*s), AB = cos(2u)/(d*s), AC = T*sin(2u)/s, AD = cos(3u)/d², AE = sin(2u)/s²
  // AF = sin(3u)/s², AG = cos(3u)/s², AH = cos(u)/s², AI = sin(u)/(d²*s), AJ = cos(4u)/s, AK = sin(2u)/(d²*s)
  // AL = sin(4u)/d, AM = cos(4u)/d, AN = T*sin(u)/d², AO = T*cos(u)/d², AP = sin(u)/d³, AQ = cos(u)/d³
  decCorrection: {
    mercury: { A:-42.1580, B:-136.9111, C: 0.0199, D:-41.4221, E: 114.6048, F: 63.4304, G: 63.2708, H:-37.8461, I: 37.9134, J: 0.3885, K: 0.0423, L: 99.2020, M: 112.6922, N:-43.1383, O:-99.2049, P: 0.0273, Q: 0.2542, R:-0.0850, S:-0.2322, U:-54.2725, V:-19.4364, W:-8.3356, X:-11.5504, Y: 34.6031, Z: 35.7135, AA: 19.4564, AB:-28.8159, AC: 0.0457, AD:-4.2448, AE: 7.1082, AF:-4.1742, AG:-1.8895, AH: 22.7071, AI:-30.2805, AJ: 9.3046, AK:-5.5443, AL:-1.6036, AM:-15.6155, AN: 0.0374, AO:-0.1266, AP:-15.1228, AQ: 15.2468 },
    venus:   { A: 60.7626, B:-0.8932, C:-0.0003, D: 8.4858, E: 0.0594, F: 0.0662, G: 2.9776, H:-0.0259, I: 0.0423, J:-0.0061, K: 0.0459, L:-86.6521, M:-5.2145, N: 2.9006, O: 2.1976, P:-0.0007, Q:-0.0102, R:-0.0109, S:-0.0006, U:-0.0394, V: 30.8925, W:-0.0917, X: 1.9233, Y:-1.8681, Z: 0.5894, AA:-6.1880, AB:-2.0806, AC: 0.0027, AD:-0.0097, AE:-2.0921, AF: 1.3795, AG:-1.4091, AH:-1.5356, AI: 3.8044, AJ: 0.0291, AK:-0.0026, AL:-0.0049, AM:-0.0138, AN: 0.0104, AO:-0.0242, AP:-0.0035, AQ: 0.0010 },
    mars:    { A:-6.4164, B: 12.1687, C: 0.1155, D: 13.1045, E:-0.1618, F: 0.3845, G:-4.1726, H: 0.1709, I: 0.1733, J: 0.4705, K:-0.1689, L: 18.6399, M:-0.2807, N:-7.9881, O: 0.5755, P:-0.2011, Q:-0.0960, R:-0.7092, S: 0.0746, U: 0.0690, V:-12.4622, W:-1.2951, X:-0.5755, Y:-0.1105, Z:-20.4109, AA:-20.7051, AB: 7.0557, AC: 0.2496, AD:-0.0565, AE: 11.2992 },
    jupiter: { A:-73.5513, B:-3.2419, C: 0.0059, D: 43.4228, E:-8.7702, F: 3.0187, G: 0.9644, H: 0.0303, I:-0.4094, J: 1.4245, K: 0.0492, L: 766.7635, M:-279.9261, N:-7.2380, O:-2.6774, P: 0.0018, Q:-0.0890, R:-0.9561, S: 0.0531, U: 46.1692, V:-2000.5352, W:-127.8654, X: 0.0325, Y: 8.7751, Z: 14.6272, AA: 151.9204, AB:-3.5471, AC: 0.0125, AD: 1.3448, AE: 30.9759, AF:-45.9327, AG: 0.1853, AH: 29.3256, AI:-466.0052, AJ: 0.2050, AK:-39.2636, AL: 0.0580, AM: 0.0061, AN:-4.7468, AO: 0.0540, AP: 632.7760, AQ:-79.5971 },
    saturn:  { A: 19.3183, B:-71.7532, C:-0.0114, D: 20.9244, E:-2.3648, F: 23.5618, G: 8.8020, H: 0.9145, I: 1.0635, J: 1.9590, K: 0.8763, L:-303.3555, M:-224.4044, N:-28.5406, O: 1.5343, P:-0.2085, Q:-0.3180, R:-0.1599, S: 0.2049, U:-3.6272, V: 1133.8305, W:-16.6243, X:-1.8483, Y:-1.0448, Z: 679.5758, AA:-206.8420, AB:-83.8303, AC:-0.0111, AD:-1.9587, AE: 164.8617, AF: 1.6022, AG: 11.8957, AH: 7.1487, AI: 2306.8003, AJ:-0.0220, AK:-1085.5028 },
    uranus:  { A:-12672.2828, B: 6934.6982, C:-0.5393, D:-50603.0840, E:-13789.0068, F: 2963.0081, G: 760.2826, H: 191.4876, I: 390.3497, J:-13.6654, K:-6.5028, L: 503850.8286, M: 517661.5124, N:-2889.1895, O: 9834.4182, P: 3.2428, Q: 0.3031, R: 13.4448, S: 11.3285, U: 81194.8440, V:-5153290.4849, W: 475879.5710, X:-389.4581, Y:-148.8904 },
    neptune: { A: 10.1378, B: 0.4644, C:-0.0687, D: 10.3930, E:-78.8758, F: 5.1040, G: 0.1936, H: 0.8112, I: 0.6993, J: 0.5025, K: 5.3711, L:-409.5977, M:-97.4693, N:-5.2228, O: 37.6943, P: 0.0813, Q:-0.0702, R: 5.2277, S: 2.2289, U: 1196.8445, V: 3123.7435, W:-320.1077, X:-0.5926, Y:-0.7388 },
  },
  raCorrection: {
    mercury: { A: 29.9373, B:-141.8915, C:-0.3745, D: 223.1667, E:-83.7866, F: 14.8033, G: 129.2616, H:-37.0042, I:-5.8496, J:-0.4423, K:-0.1005, L:-25.8042, M:-34.4669, N:-52.2653, O: 72.4357, P:-0.2917, Q: 0.0087, R: 0.0006, S: 0.3331, U: 41.5670, V:-2.6921, W: 9.2043, X:-21.3527, Y: 18.8295, Z: 64.5204, AA:-90.0162, AB:-47.1134, AC: 0.1430, AD: 4.1645, AE: 13.1357, AF:-0.3135, AG: 6.0261, AH:-17.2620, AI: 7.7483, AJ: 6.0388, AK: 0.2556, AL: 5.5120, AM:-9.0578, AN: 0.3661, AO: 0.1452, AP: 9.1992, AQ:-8.2700 },
    venus:   { A:-46.8812, B: 26.1368, C: 0.1013, D:-17.4193, E: 0.3241, F:-0.1500, G: 14.4038, H:-0.0360, I: 0.1438, J: 0.0130, K:-0.0241, L: 54.4618, M: 2.7074, N:-1.4745, O:-8.4060, P:-0.0522, Q:-0.0101, R:-0.0058, S:-0.0901, U:-0.3280, V:-14.6204, W: 0.0765, X: 5.7782, Y:-8.4576, Z:-18.9287, AA: 12.7320, AB:-10.4144, AC: 0.0353, AD:-0.0485, AE: 0.9945, AF: 6.1590, AG:-4.1848, AH: 5.9929, AI:-1.9130, AJ: 0.1064, AK: 0.0568, AL:-0.0055, AM:-0.0579, AN:-0.0061, AO: 0.0029, AP: 0.0073, AQ: 0.0561 },
    mars:    { A:-23.7562, B:-19.8881, C:-0.0277, D:-23.4088, E:-0.7352, F: 0.3822, G: 2.3764, H:-0.1699, I: 0.4596, J:-0.4940, K: 0.0549, L: 70.3115, M: 1.7161, N: 10.1081, O: 3.5030, P: 0.0385, Q: 0.0070, R: 0.2084, S:-0.0615, U:-0.6223, V:-57.7872, W: 10.2904, X:-0.0686, Y: 0.3592, Z: 34.2623, AA: 30.6410, AB:-5.2824, AC:-0.1144, AD:-0.1664, AE:-18.8861 },
    jupiter: { A: 125.9809, B: 428.3819, C:-0.0007, D:-76.7096, E:-116.3221, F: 4.8486, G:-15.9098, H: 0.8021, I:-0.2000, J: 0.6839, K:-0.1441, L:-1775.0446, M: 384.6944, N: 11.6447, O: 102.0576, P:-0.0186, Q: 0.1164, R:-0.6421, S: 1.2220, U: 608.8541, V: 5836.7557, W: 309.4468, X: 4.7879, Y:-8.2695, Z:-2241.9664, AA:-158.1944, AB: 81.3926, AC: 0.0249, AD: 0.7488, AE:-76.0449, AF: 41.0250, AG:-22.8011, AH:-345.2128, AI:-327.9101, AJ:-0.1747, AK:-63.4810, AL:-0.1419, AM: 0.0123, AN:-2.9146, AO: 0.9375, AP:-345.9905, AQ:-1015.5445 },
    saturn:  { A:-174.5075, B: 499.5903, C: 0.0144, D: 328.9628, E: 18.8700, F: 29.6207, G: 33.9681, H: 1.4136, I: 4.0316, J:-2.1042, K: 1.6970, L: 2849.4922, M:-1899.0597, N:-30.4447, O:-187.2824, P: 0.4147, Q:-0.1492, R: 0.9117, S:-4.9336, U: 19.5177, V:-11311.2243, W: 854.4562, X:-15.6528, Y:-7.5300, Z:-4749.8589, AA:-4762.7996, AB:-342.8945, AC:-0.0172, AD:-14.4017, AE: 181.9895, AF: 57.5967, AG: 133.4388, AH: 1587.2838, AI: 25506.7746, AJ:-0.3183, AK:-1585.2187 },
    uranus:  { A:-38229.6674, B: 4960.4577, C: 5.9453, D:-120998.1729, E: 6220.2812, F: 1423.4248, G: 2060.5044, H:-136.6603, I: 1184.6611, J: 54.2106, K:-1.6843, L: 1438951.7742, M: 937373.4638, N:-1817.8022, O: 148.2366, P: 8.9478, Q:-0.4125, R:-49.3113, S:-115.2873, U:-113580.5386, V:-13676015.7490, W: 1363125.1654, X:-1155.2345, Y: 193.6668 },
    neptune: { A: 2275.4256, B: 7.1156, C:-0.4272, D:-899.7306, E:-842.4176, F:-5.6762, G:-1.1987, H:-3.0633, I: 0.8780, J:-4.8029, K:-0.0684, L:-136744.9132, M: 13377.6808, N: 7.1165, O: 418.9388, P: 1.6366, Q:-0.2725, R: 4.2360, S:-5.6104, U: 12725.0083, V: 2054472.0704, W: 13708.8757, X:-1.0372, Y: 3.0446 },
  },
};


// ─── 9. MASS COMPUTATION, PSI, J2000 ECCENTRICITIES ─────────────────────

// GM_SUN from Kepler's 3rd law
const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(currentAUDistance, 3)) / Math.pow(meanSiderealYearSeconds, 2);
const M_SUN = GM_SUN / G_CONSTANT;

// Non-Earth planets: M_planet/M_SUN = 1/ratio (GM chain cancels)
const massFraction = {};
for (const [k, ratio] of Object.entries(massRatioDE440)) {
  massFraction[k] = 1 / ratio;
}

// Earth mass via Moon orbital mechanics (same chain as script.js)
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3)) /
  Math.pow(moonSiderealMonth * meanLengthOfDay, 2);
const SOLAR_SIDEREAL_DAY_RATIO = meanLengthOfDay / meanSiderealDay;
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1)) *
  SOLAR_SIDEREAL_DAY_RATIO;
massFraction.earth = (GM_EARTH / G_CONSTANT) / M_SUN;

// PSI constant (inclination formula parameter: ψ = 2205 / (2H))
const PSI = 2205 / (2 * H);

// J2000 eccentricities for all 8 planets (JPL Horizons snapshot at epoch J2000.0)
const eccJ2000 = {
  mercury: planets.mercury.orbitalEccentricityJ2000,    // 0.20563593
  venus:   planets.venus.orbitalEccentricityJ2000,      // 0.00677672
  earth:   ASTRO_REFERENCE.earthEccentricityJ2000,      // 0.01671022
  mars:    planets.mars.orbitalEccentricityJ2000,       // 0.09339410
  jupiter: planets.jupiter.orbitalEccentricityJ2000,    // 0.04838624
  saturn:  planets.saturn.orbitalEccentricityJ2000,     // 0.05386179
  uranus:  planets.uranus.orbitalEccentricityJ2000,     // 0.04725744
  neptune: planets.neptune.orbitalEccentricityJ2000,    // 0.00859048
};

// Fibonacci sequence
const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];


// ─── 10. PLANET DERIVED CALCULATIONS ─────────────────────────────────────

function computePlanetDerived(key) {
  const p = planets[key];
  const solarYearCount = Math.round(totalDaysInH / p.solarYearInput);
  const orbitDistance = ((H / solarYearCount) ** 2) ** (1/3);
  const period = H / solarYearCount; // in solar years

  let perihelionDistance, elipticOrbit, realOrbitalEccentricity;

  if (p.type === 'I') {
    realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
    perihelionDistance = orbitDistance * realOrbitalEccentricity * 100;
    elipticOrbit = perihelionDistance / 2;
  } else if (p.type === 'II') {
    realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
    elipticOrbit = (realOrbitalEccentricity * orbitDistance * 100) / 2 + (p.orbitalEccentricityBase - realOrbitalEccentricity) * orbitDistance * 100;
    perihelionDistance = (orbitDistance * p.orbitalEccentricityBase * 100) + elipticOrbit;
  } else { // Type III
    realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
    const dw = (ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 - p.longitudePerihelion) * Math.PI / 180;
    elipticOrbit = 2 * ASTRO_REFERENCE.earthEccentricityJ2000 * 100 * Math.sin(dw);
    perihelionDistance = realOrbitalEccentricity * orbitDistance * 100;
  }

  return {
    solarYearCount,
    orbitDistance,
    period,
    perihelionDistance,
    elipticOrbit,
    realOrbitalEccentricity,
    speed_kmh: (orbitDistance * currentAUDistance * Math.PI * 2) / (meanSolarYearDays * period) / 24,
  };
}

// Pre-compute derived values for all planets
const derived = {};
for (const key of Object.keys(planets)) {
  derived[key] = computePlanetDerived(key);
}

/** Rebuild derived values for a planet after parameter changes. */
function rebuildDerived(key) {
  derived[key] = computePlanetDerived(key);
}

// Additional bodies
function computeAdditionalDerived(key) {
  const b = additionalBodies[key];
  const solarYearCount = Math.round(totalDaysInH / b.solarYearInput);
  const orbitDistance = b.orbitDistanceOverride || ((H / solarYearCount) ** 2) ** (1/3);
  const period = H / solarYearCount;
  return { solarYearCount, orbitDistance, period };
}

const additionalDerived = {};
for (const key of Object.keys(additionalBodies)) {
  additionalDerived[key] = computeAdditionalDerived(key);
}


// ─── 11. EXTERNAL REFERENCE VALUES ───────────────────────────────────────
// Observed/published values for comparison and validation.

const yearLengthRef = {
  tropicalYearVE: 365.242374,
  tropicalYearSS: 365.241626,
  tropicalYearAE: 365.242018,
  tropicalYearWS: 365.242740,
  tropicalYearMean: 365.2421897,
  anomalisticYear: 365.259636,
  siderealYear: 365.256363,
  iauPrecessionJ2000: 25771.57634,
  tropicalYearRateSecPerCentury: -0.53,
  solarDay: 86400.0,
  siderealDay: 86164.09053083288,
  stellarDay: 86164.0989036905,
};

const knownValues = {
  jupiterSaturnConjunctionPeriod: 19.859, // years (great conjunction)
  moonSynodicMonth: 29.530589, // days
  moonTropicalMonth: 27.321582, // days (approx)
  moonAnomalisticMonth: 27.554550, // days
  moonDraconicMonth: 27.212221, // days
  moonNodalPrecessionYears: 18.613, // years
  moonApsidalPrecessionYears: 8.849, // years
  moonDraconicYear: 346.620, // days
  sarosDays: 6585.32, // days (223 synodic months)
  exeligmosDays: 19755.96, // days (3x Saros)
};


// ─── 12. PREDICTIVE FORMULA CONSTANTS ────────────────────────────────────

const PERI_HARMONICS = [
  [H/16,  4.890662, -0.022232], [H/32,   2.663350,  0.252940],
  [H/48,  0.221636,  0.020675], [H/64,   0.070710,  0.012559],
  [H/3,  -0.131799,  0.007423], [H/29,  -0.130859, -0.006179],
  [H/24,  0.130344,  0.006152], [H/8,    0.120049, -0.007974],
  [H/40,  0.016290,  0.000666], [H/13,   0.011751,  0.000554],
  [H/45, -0.010680, -0.000401], [H/80,   0.010493,  0.001965],
  [H/272,  0.006051, -0.005402], [H/56,   0.006948,  0.000894],
  [H/61, -0.006492, -0.000877], [H/35,  -0.005619, -0.000266],
  [H/544, -0.005401, -0.000629], [H/21,  -0.003466,  0.000049],
  [H/5,  -0.003215,  0.000012], [H/96,   0.002785,  0.000683],
  [H/816,  0.001235,  0.001767]
];
const PERI_OFFSET = -0.261258;

// ─── 12b. SOLSTICE JD HARMONICS ─────────────────────────────────────────
// Fitted from 2,889 simulation solstice observations spanning full H.
// See docs/14-solstice-prediction.md
const SOLSTICE_JD_HARMONICS = [
  // [H_divisor, sin_coeff, cos_coeff]  — amplitude in days
  [3,  -1.4475, -0.0896],   // H/3 inclination cycle, amp = 1.450 days
  [8,   1.5254,  0.0896],   // H/8 obliquity cycle,   amp = 1.528 days
  [16,  1.7774,  0.0890],   // H/16 perihelion,       amp = 1.780 days
];


// ─── 13. UTILITIES ───────────────────────────────────────────────────────

// --- Date conversion ---

function jdToCalendar(jd) {
  // Algorithm from Meeus, Astronomical Algorithms (2nd ed.)
  const z = Math.floor(jd + 0.5);
  const f = (jd + 0.5) - z;
  let a;
  if (z < 2299161) {
    a = z; // Julian calendar
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = (e < 14) ? e - 1 : e - 13;
  const year = (month > 2) ? c - 4716 : c - 4715;

  return { year, month, day: Math.floor(day), dayFrac: day - Math.floor(day) };
}

function calendarToJD(year, month, day) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

function jdToYear(jd) {
  return startmodelYear + (jd - startmodelJD) / meanSolarYearDays;
}

function yearToJD(year) {
  return startmodelJD + (year - startmodelYear) * meanSolarYearDays;
}

function jdToDateString(jd) {
  const cal = jdToCalendar(jd);
  const h = cal.dayFrac * 24;
  const hour = Math.floor(h);
  const min = Math.floor((h - hour) * 60);
  return `${cal.year}-${String(cal.month).padStart(2, '0')}-${String(cal.day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// --- Formatting helpers ---

function pad(str, len) {
  str = String(str);
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str, len) {
  str = String(str);
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

function fmt(n, dec = 6) {
  return typeof n === 'number' ? n.toFixed(dec) : String(n);
}

function fmtInt(n) {
  return n.toLocaleString('en-US');
}

function printTable(headers, rows, colWidths) {
  const sep = colWidths.map(w => '-'.repeat(w)).join('-+-');
  const headerLine = headers.map((h, i) => pad(h, colWidths[i])).join(' | ');
  console.log(headerLine);
  console.log(sep);
  for (const row of rows) {
    console.log(row.map((c, i) => pad(String(c), colWidths[i])).join(' | '));
  }
}


// ─── 14. EXPORTS ─────────────────────────────────────────────────────────

module.exports = {
  // Foundational model constants
  H,
  inputMeanSolarYear,
  perihelionalignmentYear,
  perihelionalignmentJD,
  startmodelJD,
  startmodelYear,
  correctionDays,
  correctionSun,
  temperatureGraphMostLikely,
  startAngleModel,
  useVariableSpeed,

  // Physical & astronomical constants
  currentAUDistance,
  meanSiderealYearSeconds,
  G_CONSTANT,
  MASS_RATIO_EARTH_MOON,
  massRatioDE440,

  // Earth parameters
  earthRAAngle,
  earthtiltMean,
  earthInvPlaneInclinationMean,
  earthInvPlaneInclinationAmplitude,
  eccentricityBase,
  eccentricityAmplitude,
  eccentricityAmplitudeK,
  perihelionRefJD,

  // Moon inputs
  moonSiderealMonthInput,
  moonAnomalisticMonthInput,
  moonNodalMonthInput,
  moonDistance,
  moonEclipticInclinationJ2000,
  moonOrbitalEccentricity,
  moonTilt,
  moonStartposApsidal,
  moonStartposNodal,
  moonStartposMoon,

  // Planet data
  planets,
  additionalBodies,

  // Derived model values
  perihelionCycleLength,
  meanSolarYearDays,
  meanEarthRotationsPerYear,
  startModelYearWithCorrection,
  balancedYear,
  balancedJD,
  yearsFromBalancedToJ2000,
  meanSiderealYearDays,
  meanLengthOfDay,
  meanSiderealDay,
  meanStellarDay,
  meanAnomalisticYearDays,
  eccentricityDerivedMean,
  totalDaysInH,
  j2000JD,
  julianCenturyDays,
  eocEccentricity,
  perihelionPhaseOffset,
  TROPICAL_YEAR_HARMONICS,
  SIDEREAL_YEAR_HARMONICS,
  ANOMALISTIC_YEAR_HARMONICS,

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
  M_SUN,
  massFraction,
  PSI,
  eccJ2000,
  fibonacci,

  // Planet derived
  derived,
  additionalDerived,
  computePlanetDerived,
  rebuildDerived,

  // External reference values
  yearLengthRef,
  knownValues,

  // Predictive formula
  PERI_HARMONICS,
  SOLSTICE_JD_HARMONICS,
  PERI_OFFSET,

  // Date utilities
  jdToCalendar,
  calendarToJD,
  jdToYear,
  yearToJD,
  jdToDateString,

  // Formatting helpers
  pad, padLeft, fmt, fmtInt, printTable,
};

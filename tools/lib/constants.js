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
const correctionSun = 0.5292;
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

const earthRAAngle = 1.282779;
const earthtiltMean = 23.41357;
const earthInvPlaneInclinationMean = 1.481179;
const earthInvPlaneInclinationAmplitude = 0.635970;
const eccentricityBase = 0.015372;
const eccentricityAmplitude = 0.00137032;
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
    orbitalEccentricity: 0.20563593,
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
  },
  venus: {
    name: 'Venus',
    solarYearInput: 224.695,
    orbitalEccentricity: 0.00677672,
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
  },
  mars: {
    name: 'Mars',
    solarYearInput: 686.931,
    orbitalEccentricity: 0.09339410,
    eocFraction: -0.066,
    startpos: 121.47,
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
  },
  jupiter: {
    name: 'Jupiter',
    solarYearInput: 4330.5,
    orbitalEccentricity: 0.04821478,  // Dual-balanced (-0.35% from J2000)
    orbitalEccentricityJ2000: 0.04838624,
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
  },
  saturn: {
    name: 'Saturn',
    solarYearInput: 10747.0,
    orbitalEccentricity: 0.05374486,  // Dual-balanced = Law 5 prediction (-0.22% from J2000)
    orbitalEccentricityJ2000: 0.05386179,
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
  },
  uranus: {
    name: 'Uranus',
    solarYearInput: 30586,
    orbitalEccentricity: 0.04734421,  // Dual-balanced (+0.18% from J2000)
    orbitalEccentricityJ2000: 0.04725744,
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
  },
  neptune: {
    name: 'Neptune',
    solarYearInput: 59980,
    orbitalEccentricity: 0.00867761,  // Dual-balanced (+1.01% from J2000)
    orbitalEccentricityJ2000: 0.00859048,
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
  },
};

// Additional bodies (not in the 8-planet Fibonacci framework)
const additionalBodies = {
  pluto: { name: 'Pluto', solarYearInput: 90465, orbitalEccentricity: 0.2488273, type: 'I' },
  halleys: { name: "Halley's", solarYearInput: 27503, orbitalEccentricity: 0.96714291, type: 'III' },
  eros: { name: 'Eros', solarYearInput: 642.93, orbitalEccentricity: 0.2229512, type: 'II' },
  ceres: { name: 'Ceres', solarYearInput: 1680.5, orbitalEccentricity: 0.0755347, orbitDistanceOverride: 2.76596 },
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
  marsPerihelionRef_JD: 2456505.6,
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
    mercury: { A:-27.2525, B:-145.9324, C: 0.0124, D:-59.7539, E: 113.7188, F: 59.6579, G: 67.0522, H:-38.1228, I: 37.0312, J: 0.4275, K: 0.0352, L: 91.2047, M: 128.1251, N:-39.7702, O:-101.7942, P: 0.0247, Q: 0.2567, R:-0.0911, S:-0.2310, U:-52.4784, V:-18.4280, W:-9.0806, X:-10.3781, Y: 34.6320, Z: 38.8751, AA: 29.2897, AB:-30.1238, AC: 0.0486, AD:-4.2652, AE: 6.2752, AF:-4.1682, AG:-2.1692, AH: 23.4720, AI:-36.3581, AJ: 9.3066, AK:-5.1554, AL:-1.5851, AM:-15.6415, AN: 0.0215, AO:-0.1225, AP:-16.2210, AQ: 14.9281 },
    venus:   { A: 51.9923, B:-0.2648, C:-0.0004, D: 7.7020, E: 0.0224, F: 0.0672, G: 2.2244, H:-0.0251, I: 0.0317, J:-0.0049, K: 0.0473, L:-74.0972, M:-5.3111, N: 3.7029, O: 1.5380, P: 0.0018, Q:-0.0103, R:-0.0111, S:-0.0004, U:-0.0219, V: 26.3944, W:-0.1085, X: 2.2845, Y:-1.5185, Z: 0.1374, AA:-5.5921, AB:-1.5382, AC: 0.0010, AD:-0.0057, AE:-2.6761, AF: 1.1263, AG:-1.6720, AH:-1.0446, AI: 3.8586, AJ: 0.0275, AK:-0.0004, AL:-0.0048, AM:-0.0129, AN: 0.0097, AO:-0.0251, AP:-0.0009, AQ:-0.0015 },
    mars:    { A:-7.0444, B: 12.2608, C: 0.1169, D: 13.1932, E:-0.1976, F: 0.3850, G:-4.1237, H: 0.1724, I: 0.1798, J: 0.4719, K:-0.1686, L: 20.0096, M:-0.2539, N:-7.9590, O: 0.6092, P:-0.2011, Q:-0.0967, R:-0.7152, S: 0.0737, U: 0.0856, V:-13.0864, W:-1.2679, X:-0.5909, Y:-0.1169, Z:-20.5555, AA:-20.9375, AB: 6.9872, AC: 0.2507, AD:-0.0571, AE: 11.2683 },
    jupiter: { A:-68.8543, B:-3.6939, C: 0.0060, D: 39.2352, E:-8.1538, F: 2.8293, G: 0.9880, H: 0.0251, I:-0.3986, J: 1.4267, K: 0.0495, L: 718.4219, M:-273.5972, N:-7.0498, O:-2.2764, P: 0.0014, Q:-0.0888, R:-0.9571, S: 0.0527, U: 42.9855, V:-1876.1536, W:-129.6377, X: 0.0979, Y: 8.9645, Z: 17.1203, AA: 176.5562, AB:-3.8218, AC: 0.0127, AD: 1.2973, AE: 30.3970, AF:-46.8972, AG:-0.1710, AH: 26.0509, AI:-512.6597, AJ: 0.2095, AK:-36.8296, AL: 0.0564, AM: 0.0068, AN:-4.7527, AO: 0.0525, AP: 637.1818, AQ:-74.1388 },
    saturn:  { A: 29.6988, B:-71.1983, C:-0.0111, D: 6.2907, E:-1.9522, F: 22.8634, G: 8.9502, H: 0.8847, I: 1.0729, J: 1.9589, K: 0.8763, L:-501.2850, M:-120.0924, N:-27.7394, O: 9.7509, P:-0.2102, Q:-0.3179, R:-0.1599, S: 0.2028, U:-5.3932, V: 2078.8928, W:-16.9710, X:-2.1605, Y:-1.1237, Z: 673.7108, AA:-71.0465, AB:-84.4232, AC:-0.0093, AD:-2.0208, AE: 158.9704, AF: 2.5975, AG: 14.8834, AH:-74.0474, AI: 1329.0012, AJ:-0.0304, AK:-1046.6948 },
    uranus:  { A:-12014.6239, B: 6873.6495, C:-0.7184, D:-48488.8423, E:-13468.0076, F: 2866.3330, G: 729.4721, H: 182.3813, I: 374.8878, J:-16.0452, K:-6.1177, L: 477888.9432, M: 495697.5751, N:-2797.4461, O: 9686.7120, P: 3.0726, Q: 0.2925, R: 15.6626, S: 14.7123, U: 77867.0939, V:-4895604.0585, W: 456739.5927, X:-374.1009, Y:-141.3021 },
    neptune: { A:-59.6725, B: 0.6590, C:-0.0683, D: 14.1351, E:-91.9172, F: 5.2460, G: 0.1904, H: 1.0200, I: 0.7024, J: 0.2904, K: 5.3726, L: 3790.3287, M:-160.7379, N:-5.2246, O: 43.7001, P: 0.0780, Q:-0.0708, R: 5.4363, S: 2.2203, U: 1391.4686, V:-60044.9027, W:-389.3905, X:-0.5954, Y:-0.9426 },
  },
  raCorrection: {
    mercury: { A: 26.9619, B:-139.3448, C:-0.3545, D: 240.9854, E:-89.9732, F: 18.8930, G: 130.9174, H:-38.3574, I:-5.8991, J:-0.4392, K:-0.1111, L:-27.7598, M:-47.6916, N:-57.8867, O: 80.0358, P:-0.2833, Q: 0.0035, R: 0.0010, S: 0.3269, U: 43.0186, V:-2.3664, W: 9.9486, X:-23.5736, Y: 20.0624, Z: 64.9564, AA:-96.4733, AB:-47.7634, AC: 0.1379, AD: 4.8227, AE: 14.3596, AF:-0.4951, AG: 6.6242, AH:-18.9598, AI: 10.5280, AJ: 6.3304, AK: 0.2040, AL: 5.6282, AM:-9.4510, AN: 0.3584, AO: 0.1513, AP: 11.4077, AQ:-8.7992 },
    venus:   { A:-43.3374, B: 26.2334, C: 0.1009, D:-20.3682, E: 0.1597, F:-0.1089, G: 12.7674, H:-0.0314, I: 0.0933, J: 0.0076, K:-0.0215, L: 49.4747, M: 3.3663, N:-1.9758, O:-8.8199, P:-0.0475, Q:-0.0098, R:-0.0028, S:-0.0898, U:-0.2850, V:-12.8790, W: 0.0650, X: 5.8361, Y:-8.4415, Z:-18.9897, AA: 14.9148, AB:-9.2298, AC: 0.0322, AD:-0.0363, AE: 1.3454, AF: 6.1399, AG:-4.2154, AH: 6.3235, AI:-2.4125, AJ: 0.1021, AK: 0.0500, AL:-0.0045, AM:-0.0573, AN:-0.0050, AO: 0.0015, AP: 0.0109, AQ: 0.0528 },
    mars:    { A:-22.1972, B:-19.3845, C:-0.0253, D:-22.8814, E:-0.6000, F: 0.3459, G: 2.3001, H:-0.1659, I: 0.4348, J:-0.4945, K: 0.0522, L: 66.1332, M: 1.6301, N: 9.9363, O: 3.2280, P: 0.0390, Q: 0.0069, R: 0.2095, S:-0.0626, U:-0.6311, V:-54.6154, W: 9.6688, X:-0.0381, Y: 0.3470, Z: 33.2943, AA: 30.1784, AB:-5.1325, AC:-0.1184, AD:-0.1598, AE:-18.4057 },
    jupiter: { A: 140.3836, B: 430.3146, C:-0.0006, D:-89.7748, E:-99.5248, F: 3.9313, G:-14.6947, H: 0.7612, I:-0.0426, J: 0.6963, K:-0.1462, L:-1927.5444, M: 407.4097, N: 12.2714, O: 92.9143, P:-0.0194, Q: 0.1166, R:-0.6468, S: 1.2214, U: 525.0291, V: 6240.3539, W: 306.8034, X: 4.2562, Y:-8.7139, Z:-2251.7565, AA:-79.5990, AB: 74.8584, AC: 0.0257, AD: 0.2943, AE:-77.2564, AF: 43.3544, AG:-20.4140, AH:-327.5758, AI:-507.6906, AJ:-0.1896, AK:-51.5832, AL:-0.1349, AM: 0.0131, AN:-2.9503, AO: 0.9489, AP:-324.1987, AQ:-877.3065 },
    saturn:  { A:-189.0593, B: 495.6457, C: 0.0143, D: 343.5186, E: 16.7424, F: 30.7582, G: 34.6408, H: 1.4504, I: 3.8380, J:-2.1038, K: 1.6970, L: 3128.4136, M:-1988.3745, N:-28.9460, O:-198.4383, P: 0.4154, Q:-0.1492, R: 0.9111, S:-4.9323, U: 28.6747, V:-12649.8852, W: 851.0975, X:-15.1739, Y:-7.4635, Z:-4712.4469, AA:-4893.2001, AB:-350.1263, AC:-0.0179, AD:-13.3232, AE: 163.5543, AF: 57.2587, AG: 130.0275, AH: 1703.6317, AI: 26325.2675, AJ:-0.3106, AK:-1639.2763 },
    uranus:  { A:-35750.6325, B: 5129.6885, C: 5.3603, D:-113637.6142, E: 4680.4764, F: 1192.3829, G: 1949.6947, H:-176.2244, I: 1133.1761, J: 46.1370, K:-0.9884, L: 1343793.9527, M: 863849.9118, N:-1621.2899, O: 947.5969, P: 8.3174, Q:-0.3366, R:-41.4316, S:-104.0760, U:-99376.3414, V:-12764049.9756, W: 1295582.5558, X:-1104.2651, Y: 228.8723 },
    neptune: { A: 2355.2216, B: 6.9777, C:-0.4299, D:-881.9059, E:-853.1589, F:-5.3832, G:-1.0066, H:-3.0844, I: 0.8322, J:-4.8617, K:-0.0769, L:-141516.2932, M: 13116.7306, N: 6.6443, O: 423.9811, P: 1.6345, Q:-0.2767, R: 4.2930, S:-5.5389, U: 12874.1003, V: 2125791.9571, W: 13428.0366, X:-0.9840, Y: 3.0822 },
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

// J2000 eccentricities for all 8 planets (inner planets unchanged, outer are pre-dual-balance)
const eccJ2000 = {
  mercury: planets.mercury.orbitalEccentricity,        // 0.20563593 (same)
  venus:   planets.venus.orbitalEccentricity,           // 0.00677672 (same)
  earth:   ASTRO_REFERENCE.earthEccentricityJ2000,      // 0.01671022
  mars:    planets.mars.orbitalEccentricity,            // 0.09339410 (same)
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
    realOrbitalEccentricity = p.orbitalEccentricity / (1 + p.orbitalEccentricity);
    perihelionDistance = orbitDistance * realOrbitalEccentricity * 100;
    elipticOrbit = perihelionDistance / 2;
  } else if (p.type === 'II') {
    realOrbitalEccentricity = p.orbitalEccentricity / (1 + p.orbitalEccentricity);
    elipticOrbit = (realOrbitalEccentricity * orbitDistance * 100) / 2 + (p.orbitalEccentricity - realOrbitalEccentricity) * orbitDistance * 100;
    perihelionDistance = (orbitDistance * p.orbitalEccentricity * 100) + elipticOrbit;
  } else { // Type III
    realOrbitalEccentricity = p.orbitalEccentricity / (1 + p.orbitalEccentricity);
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
  [H/16, 4.8906, -0.0223], [H/32, 2.6637, 0.2477],
  [H/48, 0.2217, 0.0202], [H/64, 0.0708, 0.0123],
  [H/3, -0.1318, 0.0073], [H/8, 0.1200, -0.0078],
  [H/29, -0.1309, -0.0060], [H/24, 0.1303, 0.0060],
  [H/40, 0.0163, 0.0007], [H/13, 0.0118, 0.0005], [H/80, 0.0105, 0.0019]
];
const PERI_OFFSET = -0.2608;


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

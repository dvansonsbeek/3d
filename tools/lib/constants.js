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
const correctionSun = 0.471334;
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

const earthRAAngle = 1.258454;
const earthtiltMean = 23.41357;
const earthInvPlaneInclinationMean = 1.481180;
const earthInvPlaneInclinationAmplitude = 0.635956;
const eccentricityBase = 0.015373;
const eccentricityAmplitude = 0.001370;
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
    orbitalEccentricity: 0.04823000,  // Dual-balanced (-0.32% from J2000)
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
    orbitalEccentricity: 0.05378200,  // Dual-balanced (-0.15% from J2000)
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
    orbitalEccentricity: 0.04777200,  // Dual-balanced (+1.09% from J2000)
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
    orbitalEccentricity: 0.00846248,  // Dual-balanced (-1.49% from J2000)
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

// Year-length formula amplitudes
const meanSolarYearAmplitudeSecPerDay = 2.29;
const meanSiderealYearAmplitudeSecPerDay = 60;
const meanAnomalisticYearAmplitudeSecPerDay = 6;


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
  // Fitted via linear least squares (15/18/24/30 terms per planet).
  // L = 1/s, M = sin(u)/d², N = sin(2u)/s, O = cos(u)/s
  // P = T*sin(2u)/d, Q = T*cos(2u)/d, R = T*sin(u)/s
  // S = T/d, U = cos(u)/d², V = 1/s², W = sin(u)/s², X = cos(3u)/s, Y = sin(3u)/s
  // Z = 1/(d*s), AA = sin(u)/(d*s), AB = cos(2u)/(d*s), AC = T*sin(2u)/s, AD = cos(3u)/d², AE = sin(2u)/s²
  // AF = sin(3u)/s², AG = cos(3u)/s², AH = cos(u)/s², AI = sin(u)/(d²*s), AJ = cos(4u)/s, AK = sin(2u)/(d²*s)
  decCorrection: {
    mercury: { A: 73.3492, B:-63.8145, C: 0.2008, D:-197.5373, E: 5.9623, F:-28.4653, G: 56.6935, H:-7.7239, I:-15.4142, J: 0.6948, K:-0.1873, L:-61.6525, M: 174.4996, N: 33.4157, O:-16.0290, P:-0.1052, Q: 0.2800, R:-0.1954, S:-0.3344, U:-0.6694, V: 11.9730, W:-11.7323, X: 17.8478, Y:-1.9591, Z: 23.9930, AA: 141.9200, AB:-18.9322, AC: 0.0971, AD: 2.9726, AE:-11.1944, AF: 1.3010, AG:-4.5994, AH: 5.6255, AI:-94.6831, AJ:-0.9540, AK: 4.3778 },
    venus:   { A: 38.9275, B:-0.2933, C:-0.0051, D: 8.3821, E: 0.0944, F: 0.1190, G: 2.5467, H:-0.0207, I: 0.0518, J: 0.0219, K:-0.0188, L:-55.4648, M:-5.6056, N: 3.1751, O: 1.3896, P:-0.0092, Q: 0.0008, R:-0.0225, S: 0.0059, U:-0.0519, V: 19.7579, W:-0.0930, X: 1.8857, Y:-1.6660, Z: 0.1540, AA:-6.0969, AB:-1.7862, AC: 0.0078, AD:-0.0110, AE:-2.3113, AF: 1.2297, AG:-1.3875, AH:-0.9459, AI: 4.0752, AJ: 0.0169, AK:-0.0086 },
    mars:    { A:-6.3430, B: 12.1915, C: 0.1172, D: 13.1287, E:-0.1521, F: 0.3753, G:-4.1396, H: 0.1716, I: 0.1739, J: 0.4717, K:-0.1686, L: 18.1511, M:-0.2757, N:-7.9661, O: 0.5266, P:-0.2010, Q:-0.0967, R:-0.7148, S: 0.0735, U: 0.0733, V:-11.8156, W:-1.3543, X:-0.5818, Y:-0.1145, Z:-20.4726, AA:-20.7400, AB: 7.0116, AC: 0.2506, AD:-0.0558, AE: 11.3169 },
    jupiter: { A:-100.2199, B:-1.7305, C: 0.0007, D: 91.2465, E: 0.8920, F: 2.5902, G: 1.5672, H: 0.0391, I: 0.0358, J:-0.4651, K: 0.0602, L: 1041.5829, M:-199.3219, N:-6.8010, O:-13.4651, P:-0.0047, Q:-0.1129, R: 0.0023, S: 0.1034, U:-1.9513, V:-2708.5488, W:-0.3631, X: 1.8412, Y: 8.6813, Z: 5.7172, AA:-476.5141, AB:-5.6059, AC: 0.0121, AD: 0.1583, AE: 30.5704, AF:-45.4712, AG:-10.3617, AH: 68.0192, AI: 1058.7296, AJ: 0.2220, AK:-33.1048 },
    saturn:  { A: 9.4615, B:-0.6707, C:-0.0103, D:-3.3275, E:-3.0075, F: 0.0518, G: 0.0940, H:-0.0436, I:-0.0083, J: 1.9187, K: 0.8800, L:-186.9485, M: 18.2656, N: 0.2042, O: 0.6355, P:-0.2200, Q:-0.3194, R:-0.1216, S: 0.1942, U: 16.2624, V: 922.5315, W: 4.5634, X: 0.0034, Y: 0.0092 },
    uranus:  { A: 379.1954, B: 5839.3621, C:-0.0183, D: 1865.4010, E: 756.2219, F: 473.2574, G:-11.7285, H: 3.1282, I:-3.0679, J: 0.9773, K:-2.0333, L:-13060.4948, M:-27401.0619, N:-485.8414, O:-484.2592 },
    neptune: { A: 7.1372, B:-0.7932, C: 0.0048, D:-12.3813, E: 0.8775, F: 4.3492, G: 0.1761, H: 0.0541, I: 0.0986, J: 2.1350, K: 5.3214, L:-213.9709, M: 260.2405, N:-4.5325, O:-2.2516, P: 0.0979, Q:-0.0525, R: 3.6117 },
  },
  raCorrection: {
    mercury: { A: 122.7268, B:-51.4293, C:-0.8385, D: 615.3271, E:-31.4068, F:-16.7433, G:-30.1347, H: 4.8775, I: 20.8749, J:-1.0333, K: 0.1190, L:-40.3046, M:-324.4868, N: 35.3118, O:-0.0730, P: 0.4029, Q:-0.1690, R: 0.5547, S: 0.7855, U: 18.5793, V: 0.4229, W: 29.9627, X:-20.6475, Y:-3.2670, Z: 14.1471, AA:-391.7318, AB: 12.0555, AC:-0.2215, AD:-3.3256, AE:-6.6691, AF: 0.3706, AG: 4.4697, AH: 0.2600, AI: 190.7973, AJ:-0.4704, AK:-3.5218 },
    venus:   { A:-74.4189, B: 22.6246, C: 0.0896, D:-19.4921, E:-0.4298, F:-0.1227, G: 15.2694, H:-0.0361, I: 0.1306, J:-0.0527, K:-0.0056, L: 96.2726, M: 3.5347, N:-1.2310, O:-9.4273, P:-0.0728, Q: 0.0049, R: 0.0301, S:-0.0779, U: 0.0467, V:-30.4552, W: 0.0867, X: 6.2174, Y:-8.2753, Z:-16.3885, AA: 14.1935, AB:-11.0426, AC: 0.0492, AD:-0.0428, AE: 0.8003, AF: 6.0278, AG:-4.5013, AH: 6.9000, AI:-2.4705, AJ: 0.0594, AK: 0.0604 },
    mars:    { A:-24.2589, B:-19.2576, C:-0.0257, D:-22.6315, E:-0.7300, F: 0.3758, G: 2.3358, H:-0.1641, I: 0.4468, J:-0.4944, K: 0.0521, L: 71.9193, M: 1.6845, N: 9.9485, O: 3.3922, P: 0.0390, Q: 0.0069, R: 0.2091, S:-0.0625, U:-0.5939, V:-58.7923, W: 9.9829, X:-0.0565, Y: 0.3422, Z: 33.1509, AA: 29.5482, AB:-5.1849, AC:-0.1184, AD:-0.1624, AE:-18.5534 },
    jupiter: { A: 152.2230, B: 424.8277, C:-0.0031, D:-113.5641, E: 3.7499, F:-1.2311, G:-13.2228, H: 0.6853, I:-1.3815, J:-0.4787, K: 0.0438, L:-2044.7529, M: 348.9164, N: 19.3128, O: 24.7348, P:-0.0457, Q: 0.1028, R:-0.0503, S: 1.2498, U: 1.9859, V: 6529.6981, W: 235.0650, X: 0.6788, Y:-6.5420, Z:-2222.2783, AA: 250.5522, AB: 65.8734, AC: 0.0437, AD: 3.2167, AE:-101.0384, AF: 32.2615, AG: 2.2128, AH:-155.6197, AI:-1226.2928, AJ:-0.1522, AK: 16.2654 },
    saturn:  { A: 14.3035, B:-0.8976, C: 0.0160, D:-58.5440, E: 8.3569, F:-1.5766, G:-0.3632, H:-0.0608, I: 0.0316, J:-2.0190, K: 1.7064, L:-242.2844, M: 284.3647, N:-0.0104, O:-3.8572, P: 0.4101, Q:-0.1654, R: 0.8167, S:-4.9372, U:-45.1968, V: 1051.0138, W: 274.2713, X:-0.0136, Y: 0.0152 },
    uranus:  { A: 217.1693, B:-47.9845, C:-0.1194, D: 812.0404, E: 376.7047, F: 106.8457, G:-0.7141, H: 0.5422, I: 2.1292, J: 1.1602, K:-0.8075, L:-4084.2447, M:-11872.7872, N:-112.5690, O:-399.2762 },
    neptune: { A:-11.1233, B: 8.2146, C:-0.6126, D: 28.5941, E: 2.7089, F:-10.6928, G: 0.1093, H:-0.0421, I:-0.1884, J:-12.3265, K:-0.0386, L: 331.6762, M:-738.0130, N: 10.0551, O:-2.2888, P: 1.5160, Q:-0.4591, R: 11.6274 },
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
  [H/16, 5.05, 0.0], [H/32, 2.46, 0.0], [H/32, 0.2206, 0.2439],
  [H/48, 0.2310, 0.0205], [H/64, 0.0715, 0.0127],
  [H/3, -0.1445, 0.0072], [H/8, 0.1150, -0.0070],
  [H/29, -0.1305, -0.0052], [H/24, 0.1279, 0.0059],
  [H, -0.0392, -0.0002], [H/2, -0.0196, 0.0], [H/40, 0.0154, 0.0006]
];
const PERI_OFFSET = -0.3071;


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
  meanSolarYearAmplitudeSecPerDay,
  meanSiderealYearAmplitudeSecPerDay,
  meanAnomalisticYearAmplitudeSecPerDay,

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

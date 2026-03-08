// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS MODULE — extracted from src/script.js
// All values and formulas replicate the exact calculations in the model.
// ═══════════════════════════════════════════════════════════════════════════

// --- Global constants (lines 28-65) ---
const H = 335008; // holisticyearLength
const inputMeanSolarYear = 365.2421897;
const meanSiderealYearSeconds = 31558149.8;
const perihelionalignmentYear = 1246;
const startmodelJD = 2451716.5;
const startmodelYear = 2000.5;
const correctionDays = -0.23328398168087;
const correctionSun = 0.471334;
const temperatureGraphMostLikely = 14.5;
const earthRAAngle = 1.258454;
const earthtiltMean = 23.41357;
const earthInvPlaneInclinationAmplitude = 0.635956;
const earthInvPlaneInclinationMean = 1.481180;
const eccentricityBase = 0.015373;
const eccentricityAmplitude = 0.001370;
const startAngleModel = 89.91949879;
const currentAUDistance = 149597870.698828;
const useVariableSpeed = true; // Toggle equation of center (must match script.js)
// eocEccentricity and perihelionPhaseOffset are derived below (after eccentricityDerivedMean)

// --- Moon input constants (lines 78-88) ---
const moonSiderealMonthInput = 27.32166156;
const moonAnomalisticMonthInput = 27.55454988;
const moonNodalMonthInput = 27.21222082;
const moonDistance = 384399.07;
const moonEclipticInclinationJ2000 = 5.1453964;
const moonOrbitalEccentricity = 0.054900489;
const moonTilt = 6.687;
const moonStartposApsidal = 347.622;
const moonStartposNodal = -83.630;
const moonStartposMoon = 131.930;

// --- Per-planet input constants (lines 91-186) ---
const planets = {
  mercury: {
    name: 'Mercury',
    solarYearInput: 87.9686,
    eclipticInclinationJ2000: 7.00497902,
    orbitalEccentricity: 0.20563593,
    eocFraction: -0.5155,
    invPlaneInclinationJ2000: 6.3472858,
    longitudePerihelion: 77.4569131,
    ascendingNode: 48.33033155,
    angleCorrection: 0.971049,
    perihelionEclipticYears: H / (1 + 3/8),
    startpos: 83.62,
    invPlaneInclinationMean: null, // filled below
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 203.3195,
    ascendingNodeInvPlane: 32.83,   // Verified J2000 (Souami & Souchay 2012, adjusted)
    type: 'I',
    mirrorPair: 'uranus',
    fibonacciD: 21,
  },
  venus: {
    name: 'Venus',
    solarYearInput: 224.695,
    eclipticInclinationJ2000: 3.39467605,
    orbitalEccentricity: 0.00677672,
    eocFraction: 3.3924,
    invPlaneInclinationJ2000: 2.1545441,
    longitudePerihelion: 131.5765919,
    ascendingNode: 76.67877109,
    angleCorrection: -2.783252,
    perihelionEclipticYears: H * 2,
    startpos: 249.39,
    invPlaneInclinationMean: null,
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 203.3195,
    ascendingNodeInvPlane: 54.70,   // Verified J2000
    type: 'I',
    mirrorPair: 'neptune',
    fibonacciD: 34,
  },
  mars: {
    name: 'Mars',
    solarYearInput: 686.931,
    eclipticInclinationJ2000: 1.84969142,
    orbitalEccentricity: 0.09339410,
    eocFraction: -0.0624,
    invPlaneInclinationJ2000: 1.6311858,
    longitudePerihelion: 336.0650681,
    ascendingNode: 49.55737662,
    angleCorrection: -2.107087,
    perihelionEclipticYears: H / (4 + 1/3),
    startpos: 121.46,
    invPlaneInclinationMean: null,
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 203.3195,
    ascendingNodeInvPlane: 354.87,  // Verified J2000
    type: 'II',
    mirrorPair: 'jupiter',
    fibonacciD: 5,
  },
  jupiter: {
    name: 'Jupiter',
    solarYearInput: 4330.65,
    eclipticInclinationJ2000: 1.30439695,
    orbitalEccentricity: 0.04838624,
    eocFraction: 0.5145,
    invPlaneInclinationJ2000: 0.3219652,
    longitudePerihelion: 14.70659401,
    ascendingNode: 100.4877868,
    angleCorrection: 0.945267,
    perihelionEclipticYears: H / 5,
    startpos: 13.82,
    invPlaneInclinationMean: null,
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 203.3195,
    ascendingNodeInvPlane: 312.89,  // Verified J2000
    type: 'III',
    mirrorPair: 'mars',
    fibonacciD: 5,
  },
  saturn: {
    name: 'Saturn',
    solarYearInput: 10747.0,
    eclipticInclinationJ2000: 2.48599187,
    orbitalEccentricity: 0.05386179,
    eocFraction: 0.5605,
    invPlaneInclinationJ2000: 0.9254704,
    longitudePerihelion: 92.12794343,
    ascendingNode: 113.6452856,
    angleCorrection: -0.17484,
    perihelionEclipticYears: -H / 8,
    startpos: 11.32,
    invPlaneInclinationMean: null,
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 23.3195,
    ascendingNodeInvPlane: 118.81,  // Verified J2000
    type: 'III',
    mirrorPair: 'earth',
    fibonacciD: 3,
  },
  uranus: {
    name: 'Uranus',
    solarYearInput: 30586,
    eclipticInclinationJ2000: 0.77263783,
    orbitalEccentricity: 0.04725744,
    eocFraction: 0.54,
    invPlaneInclinationJ2000: 0.9946692,
    longitudePerihelion: 170.7308251,
    ascendingNode: 74.00919023,
    angleCorrection: -0.736726,
    perihelionEclipticYears: H / 3,
    startpos: 44.88,
    invPlaneInclinationMean: null,
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 203.3195,
    ascendingNodeInvPlane: 307.80,  // Verified J2000
    type: 'III',
    mirrorPair: 'mercury',
    fibonacciD: 21,
  },
  neptune: {
    name: 'Neptune',
    solarYearInput: 59980,
    eclipticInclinationJ2000: 1.77004347,
    orbitalEccentricity: 0.00859048,
    eocFraction: 0.50,
    invPlaneInclinationJ2000: 0.7354155,
    longitudePerihelion: 45.80124471,
    ascendingNode: 131.7853754,
    angleCorrection: 2.334258,
    perihelionEclipticYears: H * 2,
    startpos: 47.96,
    invPlaneInclinationMean: null,
    invPlaneInclinationAmplitude: null,
    inclinationPhaseAngle: 23.3195,
    ascendingNodeInvPlane: 192.04,  // Verified J2000
    type: 'III',
    mirrorPair: 'venus',
    fibonacciD: 34,
  },
};

// Additional bodies (not in the 8-planet Fibonacci framework)
const additionalBodies = {
  pluto: { name: 'Pluto', solarYearInput: 90465, orbitalEccentricity: 0.2488273, type: 'I' },
  halleys: { name: "Halley's", solarYearInput: 27503, orbitalEccentricity: 0.96714291, type: 'III' },
  eros: { name: 'Eros', solarYearInput: 642.93, orbitalEccentricity: 0.2229512, type: 'II' },
  ceres: { name: 'Ceres', solarYearInput: 1680.5, orbitalEccentricity: 0.0755347, orbitDistanceOverride: 2.76596 },
};

// --- Year-length formula constants (lines 59-61) ---
const meanSolarYearAmplitudeSecPerDay = 2.29;
const meanSiderealYearAmplitudeSecPerDay = 60;
const meanAnomalisticYearAmplitudeSecPerDay = 6;

// --- Predictive formula constants (lines 454-465) ---
const PERI_HARMONICS = [
  [H/16, 5.05, 0.0], [H/32, 2.46, 0.0], [H/32, 0.2206, 0.2439],
  [H/48, 0.2310, 0.0205], [H/64, 0.0715, 0.0127],
  [H/3, -0.1445, 0.0072], [H/8, 0.1150, -0.0070],
  [H/29, -0.1305, -0.0052], [H/24, 0.1279, 0.0059],
  [H, -0.0392, -0.0002], [H/2, -0.0196, 0.0], [H/40, 0.0154, 0.0006]
];
const PERI_OFFSET = -0.3071;

// --- Derived global values (lines 962-973) ---
const perihelionCycleLength = H / 16;
const meanSolarYearDays = Math.round(inputMeanSolarYear * (H / 16)) / (H / 16);
const meanEarthRotationsPerYear = meanSolarYearDays + 1;
const startModelYearWithCorrection = startmodelYear + (correctionDays / meanSolarYearDays);
const balancedYear = perihelionalignmentYear - (temperatureGraphMostLikely * (H / 16));
const balancedJD = startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - balancedYear));
const yearsFromBalancedToJ2000 = (startmodelJD - balancedJD) / meanSolarYearDays;
const meanSiderealYearDays = meanSolarYearDays * (H / 13) / ((H / 13) - 1);
const meanLengthOfDay = meanSiderealYearSeconds / meanSiderealYearDays;
const meanSiderealDay = (meanSolarYearDays / (meanSolarYearDays + 1)) * meanLengthOfDay;
const meanStellarDay = (meanSiderealDay / (H / 13)) / (meanSolarYearDays + 1) + meanSiderealDay;
const meanAnomalisticYearDays = (meanSolarYearDays / (perihelionCycleLength - 1)) + meanSolarYearDays;
const eccentricityDerivedMean = Math.sqrt(eccentricityBase * eccentricityBase + eccentricityAmplitude * eccentricityAmplitude);

// Equation of center eccentricity — derived, not a free parameter.
// Off-center geometry provides amplitude e_geom (first order); EoC adds 2·eoc.
// Total must equal Keplerian 2·e_real → eoc = e_real - e_geom/2.
const eocEccentricity = eccentricityDerivedMean - eccentricityBase / 2;

// Perihelion phase offset — derived from geometric perihelion direction vs reference perihelion date.
const perihelionRefJD = 2451547.042; // JD of Earth perihelion 2000 (Jan 3.542)
const perihelionPhaseOffset = (((startModelYearWithCorrection - balancedYear) / (H / 16) * 360
  + correctionSun + 360 * (startmodelJD - perihelionRefJD) / meanSolarYearDays) % 360 + 360) % 360;

// Lunar mean longitude coefficients at J2000.0 (Meeus, "Astronomical Algorithms", Ch. 47)
const ASTRO_REFERENCE = {
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
  // Earth orbital parameters (for geocentric eccentricity correction)
  earthEccentricityJ2000: 0.01671022,
  earthPerihelionLongitudeJ2000: 102.947,  // degrees
  // Planet perihelion passages (for equation of center phase references)
  // Source: JPL Horizons
  mercuryPerihelionRef_JD: 2460336.1,     // Phase-optimized (+113° from 2023-Dec-29)
  venusPerihelionRef_JD: 2460586.4,       // Phase-optimized (+136° from 2024-Jul-09)
  marsPerihelionRef_JD: 2459253.2,        // Phase-optimized (306° shift from 2018-Sep-16)
  jupiterPerihelionRef_JD: 2464224.5,     // Phase-optimized (-6° from 2023-Jan-21)
  saturnPerihelionRef_JD: 2452875.9,      // Phase-optimized (+1° from 2003-Jul-26)
  uranusPerihelionRef_JD: 2439699.8,      // Phase-optimized (+5° from 1966-May-20)
  neptunePerihelionRef_JD: 2409432.4,     // Phase-optimized (+17° from 1876 Aug 27)
  // Invariable plane parameters for dynamic ecliptic inclination
  earthAscendingNodeInvPlane: 284.51,     // Souami & Souchay (2012)
  earthInclinationPhaseAngle: 203.3195,
  earthInvPlanePrecessionYears: H / 3,    // Earth's Ω precession period on inv. plane

  // Ascending node frame corrections for planet-level tilt placement (degrees).
  // When orbital plane tilt is moved from RealPerihelionAtSun.containerObj (above
  // annual rotation) to planet.containerObj (below), the ascending node direction
  // changes reference frame. These empirical J2000 corrections align ecliptic
  // latitude with JPL Horizons. For Type III planets, approximately = startpos * 2.
  ascNodeTiltCorrection: {
    mercury: 134, venus: 102, mars: 136,
    jupiter: 29, saturn: 23, uranus: 90, neptune: 96,
  },
};

// --- Moon derived cycles (lines 992-1011) ---
const totalDaysInH = H * meanSolarYearDays;

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

// --- Planet derived calculations (lines 1687-1770) ---
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
    // Type II: orbit center offset = half the real eccentricity distance + remainder.
    // Matches script.js: (realEcc*orbitDist/2)*100 + (ecc-realEcc)*orbitDist*100
    elipticOrbit = (realOrbitalEccentricity * orbitDistance * 100) / 2 + (p.orbitalEccentricity - realOrbitalEccentricity) * orbitDistance * 100;
    perihelionDistance = (orbitDistance * p.orbitalEccentricity * 100) + elipticOrbit;
  } else { // Type III
    realOrbitalEccentricity = p.orbitalEccentricity / (1 + p.orbitalEccentricity);
    // Geocentric correction: Earth's eccentricity creates an annual parallax
    // variation that depends on the angle between Earth's and planet's perihelion.
    // When aligned (Saturn), periFromEarth layer absorbs it. When perpendicular
    // (Jupiter), the realPeri layer must compensate.
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

// --- Fill in invPlaneInclination mean/amplitude from script.js ~lines 345-398 ---
const planetInclinationData = {
  mercury: { mean: 6.726620, amplitude: 0.384621 },
  venus:   { mean: 2.207361, amplitude: 0.061866 },
  mars:    { mean: 2.649893, amplitude: 1.158626 },
  jupiter: { mean: 0.329100, amplitude: 0.021301 },
  saturn:  { mean: 0.931678, amplitude: 0.064879 },
  uranus:  { mean: 1.000600, amplitude: 0.023716 },
  neptune: { mean: 0.722190, amplitude: 0.013486 },
};
for (const [key, data] of Object.entries(planetInclinationData)) {
  if (planets[key]) {
    planets[key].invPlaneInclinationMean = data.mean;
    planets[key].invPlaneInclinationAmplitude = data.amplitude;
  }
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

// Also compute for additional bodies
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

// --- Year-length reference values (lines 884-960) ---
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

// --- Fibonacci sequence ---
const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

// --- Known observed values for comparison ---
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

// --- Date conversion utilities ---

// Julian Day Number to Gregorian calendar date
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

// Gregorian calendar date to Julian Day Number
function calendarToJD(year, month, day) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

// Julian Day to decimal year
function jdToYear(jd) {
  return startmodelYear + (jd - startmodelJD) / meanSolarYearDays;
}

// Decimal year to Julian Day
function yearToJD(year) {
  return startmodelJD + (year - startmodelYear) * meanSolarYearDays;
}

// Format JD as "YYYY-MM-DD HH:MM" string
function jdToDateString(jd) {
  const cal = jdToCalendar(jd);
  const h = cal.dayFrac * 24;
  const hour = Math.floor(h);
  const min = Math.floor((h - hour) * 60);
  return `${cal.year}-${String(cal.month).padStart(2, '0')}-${String(cal.day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

module.exports = {
  H,
  inputMeanSolarYear,
  meanSiderealYearSeconds,
  perihelionalignmentYear,
  startmodelJD,
  startmodelYear,
  correctionDays,
  correctionSun,
  temperatureGraphMostLikely,
  earthRAAngle,
  earthtiltMean,
  earthInvPlaneInclinationAmplitude,
  earthInvPlaneInclinationMean,
  eccentricityBase,
  eccentricityAmplitude,
  startAngleModel,
  currentAUDistance,
  useVariableSpeed,
  perihelionPhaseOffset,
  eocEccentricity,
  perihelionRefJD,
  ASTRO_REFERENCE,

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

  // Year-length formula constants
  meanSolarYearAmplitudeSecPerDay,
  meanSiderealYearAmplitudeSecPerDay,
  meanAnomalisticYearAmplitudeSecPerDay,

  // Predictive formula constants
  PERI_HARMONICS,
  PERI_OFFSET,

  // Derived globals
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

  // Planet derived
  derived,
  additionalDerived,
  computePlanetDerived,
  rebuildDerived,

  // Reference
  yearLengthRef,
  fibonacci,
  knownValues,

  // Date utilities
  jdToCalendar,
  calendarToJD,
  jdToYear,
  yearToJD,
  jdToDateString,

  // Helpers
  pad, padLeft, fmt, fmtInt, printTable,
};

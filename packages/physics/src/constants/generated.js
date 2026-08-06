/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source of truth: public/input/{model-parameters,astro-reference}.json
 * Classification and rationale: tools/constants/generate.mjs
 *
 * Two exports, deliberately separate (§2d):
 *
 *   DEFAULT_CONSTANTS  free parameters + measured anchors. INJECTABLE — this is
 *                      the counterfactual surface, and what the hash covers.
 *   REFERENCE_DATA     validation targets + presentation. Single-sourced so
 *                      nothing duplicates them, but NOT injectable:
 *   ascendingNodesSouamiSouchay      target
 *   laplaceLagrangeBounds            target
 *   jplEclipticInclinationTrends     target
 *   eigenmodePhasesLaplaceLagrange   target
 *   externalCurveAnchors             target
 *   knownValues                      target
 *   galaxyMotion                     presentation
 *   perihelionPrecessionRatesJPL     target
 *   juneSolsticeReference            target
 *
 * @typedef {typeof DEFAULT_CONSTANTS} GeneratedConstants
 */

/**
 * Content hash of the values below, over a key-sorted canonical form. Responses
 * carry it so a counterfactual is reproducible (§2d).
 * @type {string}
 */
export const CONSTANTS_HASH = "147e9bae6a997659";

/** @type {Readonly<Record<string, unknown>>} */
export const DEFAULT_CONSTANTS = Object.freeze({
  hash: "147e9bae6a997659",
  additionalBodies: {
    "pluto": {
      "name": "Pluto",
      "orbitalEccentricityBase": 0.2488273,
      "type": "I",
      "angleCorrection": 2.469281,
      "startpos": 71.555,
      "perihelionEclipticFraction": [
        1,
        1
      ],
      "ascendingNodeInvPlane": 101.06,
      "inclinationCycleAnchor": 203.32,
      "invPlaneInclinationMean": 15.7162,
      "invPlaneInclinationAmplitude": 0.717024
    },
    "halleys": {
      "name": "Halley's",
      "orbitalEccentricityBase": 0.96714291,
      "type": "III",
      "angleCorrection": -1.619816,
      "startpos": 80,
      "perihelionEclipticFraction": [
        1,
        1
      ],
      "ascendingNodeInvPlane": 59.56,
      "inclinationCycleAnchor": 23.3195,
      "invPlaneInclinationMean": 150,
      "invPlaneInclinationAmplitude": 0.1
    },
    "eros": {
      "name": "Eros",
      "orbitalEccentricityBase": 0.2229512,
      "type": "II",
      "angleCorrection": 0.047888,
      "startpos": 57.402,
      "perihelionEclipticFraction": [
        1,
        1
      ],
      "ascendingNodeInvPlane": 10.36,
      "inclinationCycleAnchor": 203.3195,
      "invPlaneInclinationMean": 9.25,
      "invPlaneInclinationAmplitude": 0.5
    },
    "ceres": {
      "name": "Ceres",
      "orbitalEccentricityBase": 0.0755347,
      "orbitDistanceOverride": 2.76596,
      "angleCorrection": 0,
      "startpos": 0,
      "perihelionEclipticFraction": [
        1,
        1
      ],
      "ascendingNodeInvPlane": 80.89,
      "inclinationCycleAnchor": 203.3195,
      "invPlaneInclinationMean": 0.43,
      "invPlaneInclinationAmplitude": 0.05
    }
  },
  additionalBodiesReference: {
    "pluto": {
      "solarYearInput": 90465,
      "orbitalEccentricityJ2000": 0.2488273,
      "eclipticInclinationJ2000": 17.14001,
      "invPlaneInclinationJ2000": 15.5639473,
      "axialTiltJ2000": 57.47,
      "longitudePerihelion": 224.06891,
      "ascendingNode": 110.30393,
      "meanAnomaly": 15.55009,
      "trueAnomaly": 26.31965048,
      "rotationPeriodDays": 6.38720012152536
    },
    "halleys": {
      "solarYearInput": 27503,
      "orbitalEccentricityJ2000": 0.96714291,
      "eclipticInclinationJ2000": 162.26269,
      "invPlaneInclinationJ2000": 150,
      "axialTiltJ2000": 0,
      "longitudePerihelion": 111.33249,
      "ascendingNode": 58.42008,
      "meanAnomaly": 38.77481,
      "trueAnomaly": 166.26774708,
      "rotationPeriodDays": 2.2
    },
    "eros": {
      "solarYearInput": 642.93,
      "orbitalEccentricityJ2000": 0.2229512,
      "eclipticInclinationJ2000": 10.8276,
      "invPlaneInclinationJ2000": 9.25,
      "axialTiltJ2000": 0,
      "longitudePerihelion": 178.81322,
      "ascendingNode": 304.30993,
      "meanAnomaly": 320.21552,
      "trueAnomaly": 299.9171374,
      "rotationPeriodDays": 0.21958333344885
    },
    "ceres": {
      "solarYearInput": 1680.5,
      "orbitalEccentricityJ2000": 0.0755347,
      "eclipticInclinationJ2000": 10.59407,
      "invPlaneInclinationJ2000": 0.4331698,
      "axialTiltJ2000": 4,
      "longitudePerihelion": 73.59769,
      "ascendingNode": 80.30533,
      "meanAnomaly": 95.98772,
      "trueAnomaly": 104.48097667
    }
  },
  bodyDiametersKm: {
    "sun": 1392684,
    "moon": 3474.8,
    "earth": 12756.27,
    "mercury": 4879.4,
    "venus": 12103.6,
    "mars": 6779,
    "jupiter": 139822,
    "saturn": 116464,
    "uranus": 50724,
    "neptune": 49244,
    "pluto": 2376.6,
    "halleys": 11,
    "eros": 16.84
  },
  cardinalPointAnchors: {
    "SS": 2451716.5748,
    "WS": 2451900.06782,
    "VE": 2451623.738137,
    "AE": 2451810.304796
  },
  deepTime: {
    "alpha1PerMa": -0.000099375895103,
    "alpha3PerMa3": -6.4186463489e-12,
    "alpha4PerMa4": 1.3619800519e-16,
    "alphaClimateScalePerMille": -3.93e-7,
    "dtStackTaperFullHalfwidthYr": 300000,
    "dtStackTaperTotalHalfwidthYr": 400000
  },
  earth: {
    "earthtiltMean": 23.413527499101747,
    "earthInvPlaneInclinationAmplitude": 0.6360475695866625,
    "eccentricityBase": 0.015386009686374918,
    "eccentricityAmplitude": 0.0013559440307290061,
    "eccentricityAmplitudeK": 0.0000034149201282126695
  },
  earthOrbital: {
    "j2000EpochYear": 2000,
    "perihelionalignmentYear": 1246.03125,
    "juneSolstice2000_JD": 2451716.575,
    "obliquityJ2000_deg": 23.439279444444445,
    "obliquityRate_arcsecPerCentury": -46.836769,
    "earthEccentricityJ2000": 0.01671022,
    "earthEccentricityDotJ2000": -0.000042037,
    "earthEccentricityDotDotJ2000": -2.534e-7,
    "earthPerihelionLongitudeJ2000": 102.94719,
    "sunMeanLongitudeJ2000_deg": 280.46646,
    "earthAscendingNodeInvPlane": 284.51,
    "earthInclinationCycleAnchor": 21.77,
    "perihelionPassageJ2000_JD": 2451547.042,
    "earthInclinationJ2000_deg": 1.57869,
    "earthInclinationRate_arcsecPerCentury": -18,
    "deltaTStart": 55.85417672145975,
    "sunTilt": 7.155
  },
  foundational: {
    "holisticyearLength": 335317,
    "stepYears": 23,
    "inputmeanlengthsolaryearindays": 365.2422,
    "startmodelJD": 2451716.5,
    "startmodelYear": 2000.5,
    "correctionDays": -0.828832119703292,
    "correctionSun": 0.4968839022012559,
    "temperatureGraphMostLikely": 14.5,
    "startAngleModel": 89.91949879,
    "useVariableSpeed": true,
    "systemResetN": 7
  },
  moon: {
    "moonStartposApsidal": 347.5476,
    "moonStartposNodal": 64.0435,
    "moonStartposMoon": 67.8443,
    "moonMeeusLpCorrection": 0.010576278829833089
  },
  moonMeeus: {
    "elpW1T2Decomposition_arcsecPerCy2": {
      "planetary": 5.8665,
      "earthFigureJ2": 0.1925,
      "tidesAdopted": -12.8125,
      "tidesFittedLLR": -12.9257,
      "generalPrecessionPA_T2_Lieske1976": 1.11113,
      "generalPrecessionPA_T2_IAU2006": 1.1054348
    },
    "moonMeanAnomalyJ2000_deg": 134.9634,
    "moonMeanAnomalyRate_degPerDay": 13.06499295,
    "moonMeanElongationJ2000_deg": 297.8502,
    "moonMeanElongationRate_degPerDay": 12.19074912,
    "sunMeanAnomalyJ2000_deg": 357.5291,
    "sunMeanAnomalyRate_degPerDay": 0.98560028,
    "moonArgLatJ2000_deg": 93.2720993,
    "moonArgLatRate_degPerCentury": 483202.0175273,
    "moonMeanElongationJ2000Full_deg": 297.8502042,
    "moonMeanElongationRate_degPerCentury": 445267.1115168
  },
  moonReference: {
    "moonSiderealMonthInput": 27.32166156,
    "moonApsidalPrecessionDaysInputICRF": 3231.493,
    "moonNodalPrecessionDaysInputICRF": 6798.38,
    "moonDistance": 384399.07,
    "moonEclipticInclinationJ2000": 5.1573,
    "moonInclinationConstantBrownELP": 5.1453964,
    "moonOrbitalEccentricityBase": 0.054900489,
    "moonObliquityEclipticJ2000": 1.5424,
    "moonTilt": 6.687
  },
  perihelionPassageRef: {
    "mercury": 2460335.9,
    "venus": 2455464.42,
    "mars": 2456499.441,
    "jupiter": 2464224.5,
    "saturn": 2452875.9,
    "uranus": 2439699.8,
    "neptune": 2409432.4
  },
  physicalConstants: {
    "currentAUDistance": 149597870.698828,
    "G_CONSTANT": 6.6743e-20,
    "MASS_RATIO_EARTH_MOON": 81.30056816,
    "speedOfLight": 299792.458,
    "earthMoiFactorJ2000": 0.3306947,
    "solarLuminosityW": 3.828e+26,
    "solarWindMassLossKgPerS": 1600000000,
    "massRatioDE440": {
      "mercury": 6023657.94,
      "venus": 408523.72,
      "mars": 3098703.59,
      "jupiter": 1047.348625,
      "saturn": 3497.9018,
      "uranus": 22902.944,
      "neptune": 19412.237,
      "pluto": 136045556
    },
    "massRatioDE440Alone": {
      "mars": 3098703.71,
      "jupiter": 1047.5655,
      "saturn": 3498.7667,
      "uranus": 22905.343,
      "neptune": 19416.299,
      "pluto": 152610777
    },
    "smallBodyMasses": {
      "ceresGmKm3PerS2": 62.6274,
      "erosMassKg": 6687000000000000,
      "halleysMassKg": 220000000000000
    },
    "earthJ2": 0.00108262668,
    "earthEquatorialRadiusKm": 6378.1366
  },
  planetOrbitalElements: {
    "mercury": {
      "solarYearInput": 87.9683,
      "orbitalEccentricityJ2000": 0.20563593,
      "axialTiltJ2000": 0.03,
      "eclipticInclinationJ2000": 7.00497902,
      "longitudePerihelion": 77.4569131,
      "ascendingNode": 48.33033155,
      "invPlaneInclinationJ2000": 6.3472858,
      "meanAnomaly": 156.6364301,
      "trueAnomaly": 164.1669319
    },
    "venus": {
      "solarYearInput": 224.695,
      "orbitalEccentricityJ2000": 0.00677672,
      "axialTiltJ2000": 2.6392,
      "eclipticInclinationJ2000": 3.39467605,
      "longitudePerihelion": 131.5765919,
      "ascendingNode": 76.67877109,
      "invPlaneInclinationJ2000": 2.1545441,
      "meanAnomaly": 324.9668371,
      "trueAnomaly": 324.5198504,
      "rotationPeriodDays": 243.022699230302
    },
    "mars": {
      "solarYearInput": 686.93,
      "orbitalEccentricityJ2000": 0.0933941,
      "axialTiltJ2000": 25.19,
      "eclipticInclinationJ2000": 1.84969142,
      "longitudePerihelion": 336.0650681,
      "ascendingNode": 49.55737662,
      "invPlaneInclinationJ2000": 1.6311858,
      "meanAnomaly": 109.2630844,
      "trueAnomaly": 118.9501056,
      "rotationPeriodDays": 1.02595659586635
    },
    "jupiter": {
      "solarYearInput": 4330.53,
      "orbitalEccentricityJ2000": 0.04838624,
      "axialTiltJ2000": 3.13,
      "eclipticInclinationJ2000": 1.30439695,
      "longitudePerihelion": 14.70659401,
      "ascendingNode": 100.4877868,
      "invPlaneInclinationJ2000": 0.3219652,
      "meanAnomaly": 32.47179744,
      "trueAnomaly": 35.69428061,
      "rotationPeriodDays": 0.413541666975253
    },
    "saturn": {
      "solarYearInput": 10747,
      "orbitalEccentricityJ2000": 0.05386179,
      "axialTiltJ2000": 26.73,
      "eclipticInclinationJ2000": 2.48599187,
      "longitudePerihelion": 92.12794343,
      "ascendingNode": 113.6452856,
      "invPlaneInclinationJ2000": 0.9254704,
      "meanAnomaly": 325.663876,
      "trueAnomaly": 321.7910116,
      "rotationPeriodDays": 0.440023148755863
    },
    "uranus": {
      "solarYearInput": 30586,
      "orbitalEccentricityJ2000": 0.04725744,
      "axialTiltJ2000": 82.23,
      "eclipticInclinationJ2000": 0.77263783,
      "longitudePerihelion": 170.7308251,
      "ascendingNode": 74.00919023,
      "invPlaneInclinationJ2000": 0.9946692,
      "meanAnomaly": 145.7292678,
      "trueAnomaly": 148.5142459,
      "rotationPeriodDays": 0.718329998141018
    },
    "neptune": {
      "solarYearInput": 59800,
      "orbitalEccentricityJ2000": 0.00859048,
      "axialTiltJ2000": 28.32,
      "eclipticInclinationJ2000": 1.77004347,
      "longitudePerihelion": 45.80124471,
      "ascendingNode": 131.7853754,
      "invPlaneInclinationJ2000": 0.7354155,
      "meanAnomaly": 262.5003424,
      "trueAnomaly": 261.2242728,
      "rotationPeriodDays": 0.671300001591743
    }
  },
  planets: {
    "mercury": {
      "name": "Mercury",
      "eocFraction": -0.527,
      "startpos": 83.65212772217342,
      "angleCorrection": 0.971595956003533,
      "perihelionEclipticFraction": [
        8,
        11
      ],
      "type": "I",
      "mirrorPair": "uranus",
      "fibonacciD": 21,
      "ascendingNodeInvPlane": 32.83,
      "inclinationCycleAnchor": 234.52,
      "antiPhase": false,
      "ascendingNodeCyclesIn8H": 9,
      "obliquityCycleFraction": [
        8,
        3
      ],
      "axialPrecessionFraction": [
        -8,
        9
      ]
    },
    "venus": {
      "name": "Venus",
      "eocFraction": 0.436,
      "startpos": 249.28769121856186,
      "angleCorrection": -2.7506208719906127,
      "perihelionEclipticFraction": [
        -8,
        6
      ],
      "type": "I",
      "mirrorPair": "neptune",
      "fibonacciD": 34,
      "ascendingNodeInvPlane": 54.7,
      "inclinationCycleAnchor": 218.64,
      "antiPhase": false,
      "ascendingNodeCyclesIn8H": 1,
      "obliquityCycleFraction": null,
      "axialPrecessionFraction": [
        8,
        91
      ]
    },
    "mars": {
      "name": "Mars",
      "eocFraction": -0.066224,
      "startpos": 121.4634461571797,
      "angleCorrection": -2.110262688821635,
      "perihelionEclipticFraction": [
        8,
        36
      ],
      "type": "II",
      "mirrorPair": "jupiter",
      "fibonacciD": 5,
      "ascendingNodeInvPlane": 354.87,
      "inclinationCycleAnchor": 236.07,
      "antiPhase": false,
      "ascendingNodeCyclesIn8H": 64,
      "obliquityCycleFraction": [
        8,
        21
      ],
      "axialPrecessionFraction": [
        -1,
        2
      ]
    },
    "jupiter": {
      "name": "Jupiter",
      "eocFraction": 0.495,
      "startpos": 13.887946755371052,
      "angleCorrection": 0.9306112039524912,
      "perihelionEclipticFraction": [
        8,
        39
      ],
      "type": "III",
      "mirrorPair": "mars",
      "fibonacciD": 5,
      "ascendingNodeInvPlane": 312.89,
      "inclinationCycleAnchor": 287.06,
      "antiPhase": false,
      "ascendingNodeCyclesIn8H": 36,
      "obliquityCycleFraction": [
        1,
        2
      ],
      "axialPrecessionFraction": [
        -8,
        21
      ]
    },
    "saturn": {
      "name": "Saturn",
      "eocFraction": 0.54,
      "startpos": 11.279046793476084,
      "angleCorrection": -0.17887349563889998,
      "perihelionEclipticFraction": [
        -8,
        65
      ],
      "type": "III",
      "mirrorPair": "earth",
      "fibonacciD": 3,
      "ascendingNodeInvPlane": 118.81,
      "inclinationCycleAnchor": 116.26,
      "antiPhase": true,
      "ascendingNodeCyclesIn8H": 36,
      "obliquityCycleFraction": [
        1,
        3
      ],
      "axialPrecessionFraction": [
        -4,
        3
      ]
    },
    "uranus": {
      "name": "Uranus",
      "eocFraction": 0.53,
      "startpos": 44.900388945775106,
      "angleCorrection": -0.7329070274012324,
      "perihelionEclipticFraction": [
        1,
        3
      ],
      "type": "III",
      "mirrorPair": "mercury",
      "fibonacciD": 21,
      "ascendingNodeInvPlane": 307.8,
      "inclinationCycleAnchor": 21.33,
      "antiPhase": false,
      "ascendingNodeCyclesIn8H": 11,
      "obliquityCycleFraction": [
        1,
        2
      ],
      "axialPrecessionFraction": [
        610,
        1
      ]
    },
    "neptune": {
      "name": "Neptune",
      "eocFraction": 0.585,
      "startpos": 47.9552024382285,
      "angleCorrection": 2.332347646694906,
      "perihelionEclipticFraction": [
        2,
        1
      ],
      "type": "III",
      "mirrorPair": "venus",
      "fibonacciD": 34,
      "ascendingNodeInvPlane": 192.04,
      "inclinationCycleAnchor": 174.04,
      "antiPhase": false,
      "ascendingNodeCyclesIn8H": 3,
      "obliquityCycleFraction": null,
      "axialPrecessionFraction": [
        -68,
        1
      ]
    }
  },
  timeReference: {
    "j2000JD": 2451545,
    "julianCenturyDays": 36525,
    "gregorianStartJD": 2299160.5,
    "jd1800": 2378496.5,
    "jd1900": 2415191.5,
    "jd2100": 2488069.5
  },
  yearLengthRef: {
    "tropicalYearVE": 365.242374,
    "tropicalYearSS": 365.241626,
    "tropicalYearAE": 365.242018,
    "tropicalYearWS": 365.24274,
    "tropicalYearMean": 365.2421897,
    "anomalisticYear": 365.259636,
    "siderealYear": 365.256363004,
    "iauPrecessionJ2000": 25770.7280535361,
    "tropicalYearRateSecPerCentury": -0.53,
    "solarDay": 86400,
    "siderealDay": 86164.09053083288,
    "stellarDay": 86164.0989036905
  },
});

/**
 * Validation targets and presentation data — SINGLE-SOURCED BUT NOT INJECTABLE.
 *
 * These are deliberately absent from DEFAULT_CONSTANTS. `createModel` never
 * accepts them, so a counterfactual cannot move the goalposts it is judged by:
 * laplaceLagrangeBounds is the bound Saturn fails in verify-laws (44/45), and
 * making it injectable would let that documented failure be configured away.
 *
 * They are still emitted, because "must not be injectable" and "may be
 * duplicated as literals" are different claims. Before this export existed,
 * script.js carried its own copies of all of them with nothing keeping the two
 * in step — they happened to agree, by nobody's design.
 *
 * @type {Readonly<Record<string, unknown>>}
 */
export const REFERENCE_DATA = Object.freeze({
  ascendingNodesSouamiSouchay: {
    "earth": 284.51,
    "mercury": 32.22,
    "venus": 52.31,
    "mars": 352.95,
    "jupiter": 306.92,
    "saturn": 122.27,
    "uranus": 308.44,
    "neptune": 189.28,
    "pluto": 107.06,
    "halleys": 59.56,
    "eros": 10.36,
    "ceres": 80.89
  },
  eigenmodePhasesLaplaceLagrange: {
    "gamma1": 20.23,
    "gamma2": 318.3,
    "gamma3": 255.6,
    "gamma4": 296.9,
    "gamma6": 127.3,
    "gamma7": 315.6,
    "gamma8": 202.8
  },
  externalCurveAnchors: {
    "deltaTEspenakJ2000Seconds": 63.86
  },
  galaxyMotion: {
    "milkywayDistance": 27500,
    "sunSpeed": 828000,
    "greatattractorDistance": 200000000,
    "milkywaySpeed": 2160000
  },
  jplEclipticInclinationTrends: {
    "mercury": -0.00595,
    "venus": -0.00079,
    "mars": -0.00813,
    "jupiter": -0.00184,
    "saturn": 0.00194,
    "uranus": -0.00243,
    "neptune": 0.00035,
    "pluto": -0.001
  },
  juneSolsticeReference: {
    "1990": {
      "solsticeRefJD": 2448091.148148,
      "timeUTC": "15:33"
    },
    "1995": {
      "solsticeRefJD": 2449919.357639,
      "timeUTC": "20:34"
    },
    "2000": {
      "solsticeRefJD": 2451716.575,
      "timeUTC": "01:48"
    },
    "2005": {
      "solsticeRefJD": 2453542.781944,
      "timeUTC": "06:46"
    },
    "2010": {
      "solsticeRefJD": 2455368.977778,
      "timeUTC": "11:28"
    },
    "2015": {
      "solsticeRefJD": 2457195.193056,
      "timeUTC": "16:38"
    },
    "2020": {
      "solsticeRefJD": 2459021.404861,
      "timeUTC": "21:43"
    },
    "2025": {
      "solsticeRefJD": 2460847.6125,
      "timeUTC": "02:42"
    }
  },
  knownValues: {
    "jupiterSaturnConjunctionPeriod": 19.859,
    "moonSynodicMonth": 29.530589,
    "moonTropicalMonth": 27.321582,
    "moonNodalPrecessionYears": 18.613,
    "moonApsidalPrecessionYears": 8.849,
    "moonDraconicYear": 346.62,
    "fullMoonCycleDays": 411.78,
    "sarosDays": 6585.32,
    "exeligmosDays": 19755.96
  },
  laplaceLagrangeBounds: {
    "mercury": [
      4.57,
      9.86
    ],
    "venus": [
      0,
      3.38
    ],
    "earth": [
      0,
      2.95
    ],
    "mars": [
      0,
      5.84
    ],
    "jupiter": [
      0.241,
      0.489
    ],
    "saturn": [
      0.797,
      1.02
    ],
    "uranus": [
      0.902,
      1.11
    ],
    "neptune": [
      0.554,
      0.8
    ]
  },
  perihelionPrecessionRatesJPL: {
    "mercury": {
      "min": 570,
      "max": 575
    },
    "venus": {
      "min": 0,
      "max": 400
    },
    "earth": {
      "value": 1163
    },
    "mars": {
      "min": 1550,
      "max": 1650
    },
    "jupiter": {
      "min": 800,
      "max": 1800
    },
    "saturn": {
      "min": -3400,
      "max": -2000
    },
    "uranus": {
      "min": 1100,
      "max": 1300
    },
    "neptune": {
      "min": -200,
      "max": 200
    }
  },
});

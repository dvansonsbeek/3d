/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source of truth: public/input/{model-parameters,astro-reference}.json
 * Classification and rationale: tools/constants/generate.mjs
 *
 * Deliberately EXCLUDED (§2d) — validation targets must never be injectable, or
 * a counterfactual could move the goalposts it is judged by:
 *   ascendingNodesSouamiSouchay      target
 *   laplaceLagrangeBounds            target
 *   jplEclipticInclinationTrends     target
 *   eigenmodePhasesLaplaceLagrange   target
 *   knownValues                      target
 *   galaxyMotion                     presentation
 *
 * @typedef {typeof DEFAULT_CONSTANTS} GeneratedConstants
 */

/**
 * Content hash of the values below, over a key-sorted canonical form. Responses
 * carry it so a counterfactual is reproducible (§2d).
 * @type {string}
 */
export const CONSTANTS_HASH = "f60956ce5df05db0";

/** @type {Readonly<Record<string, unknown>>} */
export const DEFAULT_CONSTANTS = Object.freeze({
  hash: "f60956ce5df05db0",
  additionalBodies: {
    "pluto": {
      "name": "Pluto",
      "orbitalEccentricityBase": 0.2488273,
      "type": "I",
      "ascendingNodeInvPlane": 101.06,
      "inclinationCycleAnchor": 203.32,
      "invPlaneInclinationMean": 15.7162,
      "invPlaneInclinationAmplitude": 0.717024
    },
    "halleys": {
      "name": "Halley's",
      "orbitalEccentricityBase": 0.96714291,
      "type": "III",
      "ascendingNodeInvPlane": 59.56,
      "inclinationCycleAnchor": 23.3195,
      "invPlaneInclinationMean": 150,
      "invPlaneInclinationAmplitude": 0.1
    },
    "eros": {
      "name": "Eros",
      "orbitalEccentricityBase": 0.2229512,
      "type": "II",
      "ascendingNodeInvPlane": 10.36,
      "inclinationCycleAnchor": 203.3195,
      "invPlaneInclinationMean": 9.25,
      "invPlaneInclinationAmplitude": 0.5
    },
    "ceres": {
      "name": "Ceres",
      "orbitalEccentricityBase": 0.0755347,
      "orbitDistanceOverride": 2.76596,
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
      "invPlaneInclinationJ2000": 15.5639473
    },
    "halleys": {
      "solarYearInput": 27503,
      "orbitalEccentricityJ2000": 0.96714291
    },
    "eros": {
      "solarYearInput": 642.93,
      "orbitalEccentricityJ2000": 0.2229512
    },
    "ceres": {
      "solarYearInput": 1680.5,
      "orbitalEccentricityJ2000": 0.0755347,
      "invPlaneInclinationJ2000": 0.4331698
    }
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
    "earthtiltMean": 23.41353942374053,
    "earthInvPlaneInclinationAmplitude": 0.6360412216221447,
    "eccentricityBase": 0.015386008387504473,
    "eccentricityAmplitude": 0.0013559453578636752,
    "eccentricityAmplitudeK": 0.0000034149201282126695
  },
  earthOrbital: {
    "j2000EpochYear": 2000,
    "perihelionalignmentYear": 1246.03125,
    "juneSolstice2000_JD": 2451716.575,
    "obliquityJ2000_deg": 23.439291111,
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
    "deltaTStart": 56.04899719615156,
    "sunTilt": 7.155
  },
  foundational: {
    "holisticyearLength": 335317,
    "stepYears": 23,
    "inputmeanlengthsolaryearindays": 365.2422,
    "startmodelJD": 2451716.5,
    "startmodelYear": 2000.5,
    "correctionDays": -0.828832119703292,
    "correctionSun": 0.4967673207590977,
    "temperatureGraphMostLikely": 14.5,
    "startAngleModel": 89.91949879,
    "useVariableSpeed": true,
    "systemResetN": 7
  },
  moon: {
    "moonStartposApsidal": 347.5476,
    "moonStartposNodal": 64.0435,
    "moonStartposMoon": 67.8443,
    "moonMeeusLpCorrection": 0.010524
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
      "neptune": 19412.237
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
      "trueAnomaly": 324.5198504
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
      "trueAnomaly": 118.9501056
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
      "trueAnomaly": 35.69428061
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
      "trueAnomaly": 321.7910116
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
      "trueAnomaly": 148.5142459
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
      "trueAnomaly": 261.2242728
    }
  },
  planets: {
    "mercury": {
      "name": "Mercury",
      "eocFraction": -0.527,
      "startpos": 83.65049392346397,
      "angleCorrection": 0.9715969391605945,
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
      "startpos": 249.32539285801533,
      "angleCorrection": -2.750623585711864,
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
      "angleCorrection": -2.1102648138849744,
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
      "startpos": 13.887251714696855,
      "angleCorrection": 0.9306123041099745,
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
      "startpos": 11.280368711684483,
      "angleCorrection": -0.1788736536157458,
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
      "angleCorrection": -0.7329076961290184,
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
      "angleCorrection": 2.332350100136672,
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

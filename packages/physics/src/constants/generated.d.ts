// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// Gives the TypeScript website full type safety at the boundary (§2g) while
// packages/physics stays JavaScript.

export declare const CONSTANTS_HASH: "c27d98c2f75e949b";

export declare const MODEL_VERSION: string;

export declare const PREPRINT_DOI: string;

export declare const DEFAULT_CONSTANTS: {
  readonly hash: "c27d98c2f75e949b";
  readonly additionalBodies: {
    "pluto": {
      "name": string;
      "orbitalEccentricityBase": number;
      "type": string;
      "angleCorrection": number;
      "startpos": number;
      "perihelionEclipticFraction": number[];
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
    "halleys": {
      "name": string;
      "orbitalEccentricityBase": number;
      "type": string;
      "angleCorrection": number;
      "startpos": number;
      "perihelionEclipticFraction": number[];
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
    "eros": {
      "name": string;
      "orbitalEccentricityBase": number;
      "type": string;
      "angleCorrection": number;
      "startpos": number;
      "perihelionEclipticFraction": number[];
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
    "ceres": {
      "name": string;
      "orbitalEccentricityBase": number;
      "orbitDistanceOverride": number;
      "angleCorrection": number;
      "startpos": number;
      "perihelionEclipticFraction": number[];
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
  };
  readonly additionalBodiesReference: {
    "pluto": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "eclipticInclinationJ2000": number;
      "invPlaneInclinationJ2000": number;
      "axialTiltJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "halleys": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "eclipticInclinationJ2000": number;
      "invPlaneInclinationJ2000": number;
      "axialTiltJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "eros": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "eclipticInclinationJ2000": number;
      "invPlaneInclinationJ2000": number;
      "axialTiltJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "ceres": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "eclipticInclinationJ2000": number;
      "invPlaneInclinationJ2000": number;
      "axialTiltJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
    };
  };
  readonly bodyDiametersKm: {
    "sun": number;
    "moon": number;
    "earth": number;
    "mercury": number;
    "venus": number;
    "mars": number;
    "jupiter": number;
    "saturn": number;
    "uranus": number;
    "neptune": number;
    "pluto": number;
    "halleys": number;
    "eros": number;
  };
  readonly cardinalPointAnchors: {
    "SS": number;
    "WS": number;
    "VE": number;
    "AE": number;
  };
  readonly deepTime: {
    "alpha1PerMa": number;
    "alpha3PerMa3": number;
    "alpha4PerMa4": number;
    "alphaClimateScalePerMille": number;
    "dtStackTaperFullHalfwidthYr": number;
    "dtStackTaperTotalHalfwidthYr": number;
    "recessionRegime": {
      "jointMa": number;
      "knotAgesMa": number[];
      "knotDistancesKm": number[];
      "genesisMa": number;
      "rocheLimitKm": number;
      "solarOceanLeakBeta0": number;
      "thermalPumpStartMa": number;
      "thermalPumpEndMa": number;
      "thermalPumpFactor": number;
    };
  };
  readonly earth: {
    "earthtiltMean": number;
    "earthInvPlaneInclinationAmplitude": number;
    "eccentricityBase": number;
    "eccentricityAmplitude": number;
  };
  readonly earthOrbital: {
    "j2000EpochYear": number;
    "perihelionalignmentYear": number;
    "juneSolstice2000_JD": number;
    "obliquityJ2000_deg": number;
    "obliquityRate_arcsecPerCentury": number;
    "earthEccentricityJ2000": number;
    "earthEccentricityDotJ2000": number;
    "earthEccentricityDotDotJ2000": number;
    "earthPerihelionLongitudeJ2000": number;
    "sunMeanLongitudeJ2000_deg": number;
    "earthAscendingNodeInvPlane": number;
    "earthInclinationCycleAnchor": number;
    "perihelionPassageJ2000_JD": number;
    "earthInclinationJ2000_deg": number;
    "earthInclinationRate_arcsecPerCentury": number;
    "deltaTStart": number;
    "sunTilt": number;
  };
  readonly foundational: {
    "holisticyearLength": number;
    "stepYears": number;
    "inputmeanlengthsolaryearindays": number;
    "startmodelJD": number;
    "startmodelYear": number;
    "correctionDays": number;
    "correctionSun": number;
    "temperatureGraphMostLikely": number;
    "startAngleModel": number;
    "useVariableSpeed": boolean;
    "systemResetN": number;
  };
  readonly moon: {
    "moonStartposApsidal": number;
    "moonStartposNodal": number;
    "moonStartposMoon": number;
    "moonMeeusLpCorrection": number;
  };
  readonly moonMeeus: {
    "elpW1T2Decomposition_arcsecPerCy2": {
      "planetary": number;
      "earthFigureJ2": number;
      "tidesAdopted": number;
      "tidesFittedLLR": number;
      "generalPrecessionPA_T2_Lieske1976": number;
      "generalPrecessionPA_T2_IAU2006": number;
    };
    "moonMeanAnomalyJ2000_deg": number;
    "moonMeanAnomalyRate_degPerDay": number;
    "moonMeanElongationJ2000_deg": number;
    "moonMeanElongationRate_degPerDay": number;
    "sunMeanAnomalyJ2000_deg": number;
    "sunMeanAnomalyRate_degPerDay": number;
    "moonArgLatJ2000_deg": number;
    "moonArgLatRate_degPerCentury": number;
    "moonMeanElongationJ2000Full_deg": number;
    "moonMeanElongationRate_degPerCentury": number;
  };
  readonly moonReference: {
    "moonSiderealMonthInput": number;
    "moonApsidalPrecessionDaysInputICRF": number;
    "moonNodalPrecessionDaysInputICRF": number;
    "moonDistance": number;
    "moonEclipticInclinationJ2000": number;
    "moonInclinationConstantBrownELP": number;
    "moonOrbitalEccentricityBase": number;
    "moonObliquityEclipticJ2000": number;
    "moonTilt": number;
  };
  readonly perihelionPassageRef: {
    "mercury": number;
    "venus": number;
    "mars": number;
    "jupiter": number;
    "saturn": number;
    "uranus": number;
    "neptune": number;
  };
  readonly physicalConstants: {
    "currentAUDistance": number;
    "G_CONSTANT": number;
    "MASS_RATIO_EARTH_MOON": number;
    "speedOfLight": number;
    "earthMoiFactorJ2000": number;
    "solarLuminosityW": number;
    "solarWindMassLossKgPerS": number;
    "massRatioDE440": {
      "mercury": number;
      "venus": number;
      "mars": number;
      "jupiter": number;
      "saturn": number;
      "uranus": number;
      "neptune": number;
      "pluto": number;
    };
    "massRatioDE440Alone": {
      "mars": number;
      "jupiter": number;
      "saturn": number;
      "uranus": number;
      "neptune": number;
      "pluto": number;
    };
    "smallBodyMasses": {
      "ceresGmKm3PerS2": number;
      "erosMassKg": number;
      "halleysMassKg": number;
    };
    "earthJ2": number;
    "earthEquatorialRadiusKm": number;
    "earthParallaxRadiusKm": number;
    "solarParallaxArcsec": number;
    "arcsecDisplacementKm": number;
  };
  readonly planetOrbitalElements: {
    "mercury": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
    };
    "venus": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "mars": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "jupiter": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "saturn": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "uranus": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
    "neptune": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "axialTiltJ2000": number;
      "eclipticInclinationJ2000": number;
      "longitudePerihelion": number;
      "ascendingNode": number;
      "invPlaneInclinationJ2000": number;
      "meanAnomaly": number;
      "trueAnomaly": number;
      "rotationPeriodDays": number;
    };
  };
  readonly planets: {
    "mercury": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": number[];
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
    };
    "venus": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": null;
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
    };
    "mars": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": number[];
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
    };
    "jupiter": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": number[];
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
    };
    "saturn": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": number[];
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
    };
    "uranus": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": number[];
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
      "eccentricityCycleApprox": boolean;
    };
    "neptune": {
      "name": string;
      "eocFraction": number;
      "startpos": number;
      "angleCorrection": number;
      "perihelionEclipticFraction": number[];
      "type": string;
      "mirrorPair": string;
      "fibonacciD": number;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "antiPhase": boolean;
      "ascendingNodeCyclesIn8H": number;
      "obliquityCycleFraction": null;
      "axialPrecessionFraction": number[];
      "eccentricityCycleFraction": number[];
      "eccentricityCycleApprox": boolean;
    };
  };
  readonly timeReference: {
    "j2000JD": number;
    "julianCenturyDays": number;
    "gregorianStartJD": number;
    "jd1800": number;
    "jd1900": number;
    "jd2100": number;
  };
  readonly yearLengthRef: {
    "tropicalYearVE": number;
    "tropicalYearSS": number;
    "tropicalYearAE": number;
    "tropicalYearWS": number;
    "tropicalYearMean": number;
    "anomalisticYear": number;
    "siderealYear": number;
    "iauPrecessionJ2000": number;
    "tropicalYearRateSecPerCentury": number;
    "solarDay": number;
    "siderealDay": number;
    "stellarDay": number;
  };
};

// Validation targets and presentation data. Single-sourced, NOT injectable —
// createModel does not accept these (§2d).
export declare const REFERENCE_DATA: {
  readonly ascendingNodesSouamiSouchay: {
    "invariablePlaneOnEclipticDeg": number;
    "earth": number;
    "mercury": number;
    "venus": number;
    "mars": number;
    "jupiter": number;
    "saturn": number;
    "uranus": number;
    "neptune": number;
    "pluto": number;
    "halleys": number;
    "eros": number;
    "ceres": number;
  };
  readonly eigenmodePhasesLaplaceLagrange: {
    "gamma1": number;
    "gamma2": number;
    "gamma3": number;
    "gamma4": number;
    "gamma6": number;
    "gamma7": number;
    "gamma8": number;
  };
  readonly externalCurveAnchors: {
    "deltaTEspenakJ2000Seconds": number;
  };
  readonly galaxyMotion: {
    "milkywayDistance": number;
    "sunSpeed": number;
    "greatattractorDistance": number;
    "milkywaySpeed": number;
  };
  readonly giaCoxChaoPeltier: {
    "dJ2DtPerYr": number;
    "j2ToAlphaFactor": number;
  };
  readonly jplEclipticInclinationTrends: {
    "mercury": number;
    "venus": number;
    "mars": number;
    "jupiter": number;
    "saturn": number;
    "uranus": number;
    "neptune": number;
    "pluto": number;
  };
  readonly juneSolsticeReference: {
    "1990": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "1995": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "2000": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "2005": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "2010": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "2015": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "2020": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
    "2025": {
      "solsticeRefJD": number;
      "timeUTC": string;
    };
  };
  readonly knownValues: {
    "iersObservedDLodDtMsPerCy": number;
    "llrTidalGammaArcsecPerCy2": number;
    "moonKeplerEffectiveDistanceKm": number;
    "meeusA1RateDegPerCy": number;
    "meeusEclipsesTestCount": number;
    "meeusEclipseRmsMinutes": number;
    "meeusParallaxResidualArcsec": number;
    "meeusPearsonR": number;
    "meeusJplDecRmsDeg": number;
    "sunModelDecRmsDeg": number;
    "sunModelTrueErrorDeg": number;
    "sunTropicalYearDiffSeconds": number;
    "sunSiderealYearDiffSeconds": number;
    "mercuryNewtonianArcsecCy": number;
    "mercuryObservedICRFArcsecCy": number;
    "mercuryPark2017RateArcsecCy": number;
    "mercuryAnomalyClassicArcsecCy": number;
    "mercuryObservedRateArcsecCy": number;
    "venusObservedRateArcsecCy": number;
    "earthObservedRateArcsecCy": number;
    "earthObservedRateHelioArcsecCy": number;
    "marsObservedRateArcsecCy": number;
    "jupiterObservedRateArcsecCy": number;
    "saturnObservedRateArcsecCy": number;
    "saturnMissingAdvanceArcsec": number;
    "uranusObservedRateArcsecCy": number;
    "neptuneObservedRateArcsecCy": number;
    "ascNodeJointRmsArcsec": number;
    "generalPrecessionArcsecCy": number;
    "bepiColomboPrecisionArcsec": number;
    "chandlerWobbleCycleMonths": number;
    "chandlerWobbleAmplitudeRange": string;
    "jupiterBarycenterPeriodYears": number;
    "milkyWayDistanceRangeLy": string;
    "milkyWaySpeedKmS": number;
    "milkyWayPeriodMyr": number;
    "laplaceLagrangeResidualDeg": number;
    "patternEarthAgeGyr": number;
    "moonGenesisAgeGa": number;
    "wellsTidalRateHrPerMa": number;
    "wellsRecessionCmYr": number;
    "modernLLRRecessionCmYr": number;
    "tidalLockApproachGyr": number;
    "essrtFormulaHorizonGyr": number;
    "iceAlbedoShareLongPct": number;
    "chengR2": number;
    "testAObliquityLagPercentile": number;
    "testAObliquityPeakMatch": string;
    "testAEccentricityNullPct": number;
    "eightHDerivabilityTopPct": number;
    "testCInvariantObliquityPct": number;
    "testCInvariantRandomPct": number;
    "testCBalanceSaturnMult": number;
    "testCBalancePValue": number;
    "testCLibrationPValue": number;
    "testC50WindowMyr": number;
    "meeusPeriLong1000AD": number;
    "meeusPeriLong1246AD": number;
    "meeusPeriLong2000AD": number;
    "meeusPeriLong2500AD": number;
    "meeusPeriLong3000AD": number;
    "mainstreamAxialPrecKyr": number;
    "mainstreamPeriPrecKyr": number;
    "mainstreamObliqCycleKyr": number;
    "mainstreamInclCycleKyr": number;
    "mainstreamApsidalPrecKyr": number;
    "mainstreamObliqRangeMinDeg": number;
    "mainstreamObliqRangeMaxDeg": number;
    "mainstreamAxialPrecExactYr": number;
    "mainstreamPeriPrecExactYr": number;
    "mainstreamObliqCycleExactYr": number;
    "mainstreamInclCycleExactYr": number;
    "mainstreamApsidalPrecExactYr": number;
    "jupiterSaturnConjunctionPeriod": number;
    "moonSynodicMonth": number;
    "moonTropicalMonth": number;
    "moonNodalPrecessionYears": number;
    "moonApsidalPrecessionYears": number;
    "moonDraconicYear": number;
    "fullMoonCycleDays": number;
    "sarosDays": number;
    "exeligmosDays": number;
  };
  readonly laplaceLagrangeBounds: {
    "mercury": number[];
    "venus": number[];
    "earth": number[];
    "mars": number[];
    "jupiter": number[];
    "saturn": number[];
    "uranus": number[];
    "neptune": number[];
  };
  readonly moonGrailWilliams2014: {
    "j2E6": number;
    "c22E6": number;
    "cMR2": number;
  };
  readonly obliquityChapront2002: {
    "deg10000BC": number;
    "deg10000AD": number;
  };
  readonly perihelionPrecessionRatesJPL: {
    "mercury": {
      "min": number;
      "max": number;
    };
    "venus": {
      "min": number;
      "max": number;
    };
    "earth": {
      "value": number;
    };
    "mars": {
      "min": number;
      "max": number;
    };
    "jupiter": {
      "min": number;
      "max": number;
    };
    "saturn": {
      "min": number;
      "max": number;
    };
    "uranus": {
      "min": number;
      "max": number;
    };
    "neptune": {
      "min": number;
      "max": number;
    };
  };
};

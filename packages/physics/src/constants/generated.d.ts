// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// Gives the TypeScript website full type safety at the boundary (§2g) while
// packages/physics stays JavaScript.

export declare const CONSTANTS_HASH: "f60956ce5df05db0";

export declare const DEFAULT_CONSTANTS: {
  readonly hash: "f60956ce5df05db0";
  readonly additionalBodies: {
    "pluto": {
      "name": string;
      "orbitalEccentricityBase": number;
      "type": string;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
    "halleys": {
      "name": string;
      "orbitalEccentricityBase": number;
      "type": string;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
    "eros": {
      "name": string;
      "orbitalEccentricityBase": number;
      "type": string;
      "ascendingNodeInvPlane": number;
      "inclinationCycleAnchor": number;
      "invPlaneInclinationMean": number;
      "invPlaneInclinationAmplitude": number;
    };
    "ceres": {
      "name": string;
      "orbitalEccentricityBase": number;
      "orbitDistanceOverride": number;
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
      "invPlaneInclinationJ2000": number;
    };
    "halleys": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
    };
    "eros": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
    };
    "ceres": {
      "solarYearInput": number;
      "orbitalEccentricityJ2000": number;
      "invPlaneInclinationJ2000": number;
    };
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
  };
  readonly earth: {
    "earthtiltMean": number;
    "earthInvPlaneInclinationAmplitude": number;
    "eccentricityBase": number;
    "eccentricityAmplitude": number;
    "eccentricityAmplitudeK": number;
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
    };
    "earthJ2": number;
    "earthEquatorialRadiusKm": number;
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
    };
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

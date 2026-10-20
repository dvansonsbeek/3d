export { createEpochPrimitives } from "./layer0/index.js";
export { deriveEpochParams } from "./layer0/derive-params.js";
export { createDerivedViews } from "./layer1/index.js";
export { createDeepCalendar } from "./phase/deep-calendar.cjs";
export { createCardinalStructure } from "./cardinal/one-source-structure.cjs";
export { createMoonMonthChain } from "./moon/month-chain.cjs";
export { createChainCycleIntegrator } from "./chain-cycles/index.cjs";
export { createMoonArguments } from "./moon/arguments.cjs";
export { createMoonSeries } from "./moon/series.cjs";
export { createMoonApparent } from "./moon/apparent.cjs";
export * as planetOrbitChain from "./planets/orbit-chain.cjs";
export { computeSecularShape } from "./planets/secular-shape.cjs";
export { createSecularSeriesOverride } from "./planets/secular-series.cjs";
export { createDeepEccChannel } from "./moon/deep-ecc-channel.cjs";
export { createDeepOrbitalHistory } from "./earth/deep-orbital-history.cjs";
export { createSiderealYearChannel } from "./earth/sidereal-year-channel.cjs";
export { createPlanetModel } from "./planets/model.cjs";
export { PLANET_DISPLAY_NAMES } from "./planets/display-names.cjs";
export { createDeltaTCycles } from "./deltat/cycles.cjs";
export { createDeepTimeLod } from "./deltat/deep-time.cjs";
export { createMoonDistanceHistory } from "./deltat/moon-distance-history.cjs";
export { deltaTEspenakMeeusCanonSeconds } from "./deltat/historical.cjs";
export { createEclipseFinders } from "./eclipse/finders.cjs";
export function createModel(constants?: Constants, opts?: {
    laws?: {
        eccentricityAt?: (year: number) => number;
        eccentricityRateAt?: (year: number) => number;
        perihelionLongitudeDegAt?: (year: number) => number;
    };
    secularSeriesArtifact?: any;
    giaEllipticityOfDate?: boolean;
}): Model;
export type Constants = Record<string, unknown> & {
    hash?: string;
};
export type ModelSurfaces = ReturnType<typeof assembleModel>;
export type ModelIdentity = {
    modelVersion: string;
    /**
     * THIS context's hash — distinct for a counterfactual
     */
    constantsHash: string;
    coefficientsHash: string;
    counterfactual: boolean;
    preprintDoi: string;
};
export type Model = {
    constants: Constants;
    hash: string;
    eccentricity: (year: number) => number;
    identity: ModelIdentity;
} & ModelSurfaces;
import { DEFAULT_CONSTANTS as GENERATED } from './constants/index.js';
import { CONSTANTS_HASH } from './constants/index.js';
import { MODEL_VERSION } from './constants/index.js';
import { PREPRINT_DOI } from './constants/index.js';
import { REFERENCE_DATA } from './constants/index.js';
import { assembleModel } from './model.js';
export { GENERATED as DEFAULT_CONSTANTS, CONSTANTS_HASH, MODEL_VERSION, PREPRINT_DOI, REFERENCE_DATA };
export { FITTED_COEFFICIENTS, COEFFICIENTS_HASH } from "./constants/index.js";
export { GREGORIAN_START, GREGORIAN_START_JD, calendarToJD, jdToCalendar, jdToDecimalYear, dayFractionToHMS } from "./time/calendar.cjs";
export { DEG2RAD, RAD2DEG, ARCSEC_PER_TURN, ARCSEC_PER_RAD, wrap360, wrap180, wrap180Closed, wrap2pi, wrapPi } from "./math/angles.cjs";
export { createDeepTimeChain, MOON_ECC_SENSITIVITY_PERIGEE, MOON_ECC_SENSITIVITY_NODE } from "./deltat/deep-time-chain.js";
export { computeMassChainJ2000, computeMoonPeriodsJ2000 } from "./earth/mass-chain.cjs";
export { SECONDS_PER_DAY, DAYS_PER_JULIAN_YEAR, JULIAN_CENTURY_DAYS, SECONDS_PER_JULIAN_YEAR } from "./constants/units.cjs";
export { computeEarthFrameOfDate, solveWheelAngleForLongitude, computeSceneWorldFrameJ2000, SCENE_EQUINOX_VIEW_AZIMUTH_DEG } from "./earth/frame-of-date.cjs";
export { derivePlanetGeometry, scaffoldOrbitInputs } from "./planets/geometry.cjs";
export { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear, computeHeliocentricEclipticFromElements, computePoissonArgRad, computeOsculatingElements, solveKeplerRad, computeApsidalSecularDegPerYr, ANCHOR_EPOCH_YEAR, ANCHOR_EPOCH_JD } from "./planets/keplerian-chain.cjs";
export { computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } from "./planets/inv-plane-frame.cjs";
export { computePlanetPrecessionConstant, createPlanetSpinChannel, createPlanetSpinChannelFromArtifacts, computeObliquityJ2000Deg } from "./planets/spin-channel.cjs";
export { CHAIN_ARTIFACT, CHAIN_ARTIFACT_HASH } from "./planets/chain-artifact.js";
export { DEEP_MODES_ARTIFACT, DEEP_MODES_ARTIFACT_HASH } from "./moon/deep-modes-artifact.cjs";
export { createYearLengths, computeMeanTropicalYearJ2000Days, ONE_FAMILY_WINDOW_YEARS } from "./earth/year-lengths.cjs";
export { computeSolarTorqueShare, createComposedPrecession } from "./earth/precession-composed.cjs";
export { MOON_DISTANCE_ARTIFACT, MOON_DISTANCE_ARTIFACT_HASH } from "./deltat/moon-distance-artifact.cjs";
export { evalClimateL1OrbitalPermil, laggedL1Terms, createAlphaGiaChannel } from "./climate/l1-orbital.cjs";

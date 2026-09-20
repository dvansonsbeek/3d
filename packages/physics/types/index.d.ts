export { createEpochPrimitives } from "./layer0/index.js";
export { deriveEpochParams } from "./layer0/derive-params.js";
export { createDerivedViews } from "./layer1/index.js";
export { createPhaseMachinery } from "./phase/index.cjs";
export { createCardinalModel } from "./cardinal/index.cjs";
export { createCardinalStructure } from "./cardinal/one-source-structure.cjs";
export { createMoonEccChannel } from "./moon/ecc-channel.cjs";
export { createMoonMonthChain } from "./moon/month-chain.cjs";
export { createChainCycleIntegrator } from "./chain-cycles/index.cjs";
export { createMoonArguments } from "./moon/arguments.cjs";
export { createMoonSeries } from "./moon/series.cjs";
export { createMoonApparent } from "./moon/apparent.cjs";
export { derivePlanetGeometry } from "./planets/geometry.cjs";
export * as planetFibonacciLaws from "./planets/fibonacci-laws.cjs";
export * as planetOrientation from "./planets/orientation.cjs";
export { integrateAscendingNode } from "./planets/asc-node-integrator.cjs";
export * as planetOrbitChain from "./planets/orbit-chain.cjs";
export { createSecularSeriesOverride } from "./planets/secular-series.cjs";
export { createDeepEccChannel } from "./moon/deep-ecc-channel.cjs";
export { createDeepOrbitalHistory } from "./earth/deep-orbital-history.cjs";
export { createSiderealYearChannel } from "./earth/sidereal-year-channel.cjs";
export { createYearLengths } from "./earth/year-lengths.cjs";
export { createPlanetModel } from "./planets/model.cjs";
export { createDeltaTCycles } from "./deltat/cycles.cjs";
export { createDeepTimeLod } from "./deltat/deep-time.cjs";
export { deltaTEspenakMeeusCanonSeconds } from "./deltat/historical.cjs";
export { createEclipseFinders } from "./eclipse/finders.cjs";
export { createSunLongitudeCorrection } from "./sun/longitude-correction.cjs";
export function createModel(constants?: Constants, opts?: {
    laws?: {
        eccentricityAt?: (year: number) => number;
        eccentricityRateAt?: (year: number) => number;
        perihelionLongitudeDegAt?: (year: number) => number;
    };
    secularSeriesArtifact?: any;
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
    computeLatticePeriodsYears: () => {
        axialPrecessionPeriodYears: number;
        inclinationPrecessionPeriodYears: number;
        perihelionPrecessionPeriodYears: number;
    };
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
export { eccentricityFromCycles, computeEccentricityIntegrated } from "./planets/ecc-channel.cjs";
export { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear, computeHeliocentricEclipticFromElements, computePoissonArgRad, computeOsculatingElements, solveKeplerRad, computeApsidalSecularDegPerYr, ANCHOR_EPOCH_YEAR, ANCHOR_EPOCH_JD } from "./planets/keplerian-chain.cjs";
export { computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } from "./planets/inv-plane-frame.cjs";
export { CHAIN_ARTIFACT, CHAIN_ARTIFACT_HASH } from "./planets/chain-artifact.js";
export { DEEP_MODES_ARTIFACT, DEEP_MODES_ARTIFACT_HASH } from "./moon/deep-modes-artifact.cjs";
export { createPredictivePrecession, calcPlanetPerihelionLongDeg } from "./planets/predict.cjs";
export { createMoonRecessionHistory, createSolarChannelBudget } from "./deltat/recession-history.cjs";
export { evalClimateL1OrbitalPermil, laggedL1Terms, createAlphaGiaChannel } from "./climate/l1-orbital.cjs";

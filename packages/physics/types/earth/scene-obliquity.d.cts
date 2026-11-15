/**
 * nodes[k − kMin] = [meanDeg, minDeg, maxDeg] at the year 2000 + k × nodeYears
 */
export type HybridBeatTableArtifact = {
    nodeYears: number;
    kMin: number;
    kMax: number;
    nodes: ReadonlyArray<ReadonlyArray<number>>;
};
/** The hand-over window beyond the hybrid's domain edge, years (0 at the edge, 1 a window past it). */
export const SCENE_OBLIQUITY_HANDOVER_YEARS: 10000000;
/** The beat table's node spacing, years of the engine axis (nodes at 2000 + k × this). */
export const HYBRID_BEAT_TABLE_NODE_YEARS: 1000000;
/**
 * The cited mean's weight at a decimal year: 0 inside the hybrid's domain, a C¹ smoothstep to 1
 * over SCENE_OBLIQUITY_HANDOVER_YEARS beyond either edge; 0 without a domain (no banked series).
 * @param {number} year  decimal year, the engine's
 * @param {[number, number] | null | undefined} domainYears  the hybrid's [yearFrom, yearTo]
 * @returns {number}
 */
export function sceneObliquityHandoverWeight(year: number, domainYears: [number, number] | null | undefined): number;
/**
 * The hybrid's beat mean at a year: ε averaged over one obliquity beat period centred on the year
 * (41 samples — the API's band instrument, `obliquityBandAt`, on the same grid).
 * @param {(year: number) => number} epsDegAt  the hybrid's ε sampler
 * @param {number} year
 * @param {number} beatPeriodYears  the obliquity beat of date, 2π/(ψ̇ᵢₙ − |s₃|)
 * @returns {number} degrees
 */
export function hybridBeatMeanDeg(epsDegAt: (year: number) => number, year: number, beatPeriodYears: number): number;
/**
 * The hybrid's beat band at a year: the mean, min and max of ε over one beat centred on the year
 * (the same 41 samples).
 * @param {(year: number) => number} epsDegAt
 * @param {number} year
 * @param {number} beatPeriodYears
 * @returns {{meanDeg: number, minDeg: number, maxDeg: number}}
 */
export function hybridBeatBandDeg(epsDegAt: (year: number) => number, year: number, beatPeriodYears: number): {
    meanDeg: number;
    minDeg: number;
    maxDeg: number;
};
/**
 * The lazy beat table: the band instrument at nodes every HYBRID_BEAT_TABLE_NODE_YEARS of the
 * engine axis, built on first read and kept (pure in the year: a node's value never depends on
 * the visit order), the three values linearly interpolated between the two nodes about a year.
 * With the GENERATED artifact (data/obliquity-beat-table.json, tools/verify/obliquity-beat-table.js
 * --write: every node over the navigable domain, each the instrument's own value) a node inside its
 * range is read, never computed — a record, not a value: the generator refuses unless a fresh model
 * reproduces its nodes bit-exactly, so the table and the live instrument are one number.
 * @typedef {{ nodeYears: number, kMin: number, kMax: number, nodes: ReadonlyArray<ReadonlyArray<number>> }} HybridBeatTableArtifact
 *   nodes[k − kMin] = [meanDeg, minDeg, maxDeg] at the year 2000 + k × nodeYears
 * @param {{ epsDegAt: (year: number) => number, beatYearsAtYear: (year: number) => number, nodesArtifact?: HybridBeatTableArtifact | null }} deps
 * @returns {{ atYear: (year: number) => {meanDeg: number, minDeg: number, maxDeg: number}, nodeYear: (k: number) => number, nodeAt: (k: number) => {meanDeg: number, minDeg: number, maxDeg: number}, nodeRange: [number, number] | null }}
 */
export function createHybridBeatTable({ epsDegAt, beatYearsAtYear, nodesArtifact }: {
    epsDegAt: (year: number) => number;
    beatYearsAtYear: (year: number) => number;
    nodesArtifact?: HybridBeatTableArtifact | null;
}): {
    atYear: (year: number) => {
        meanDeg: number;
        minDeg: number;
        maxDeg: number;
    };
    nodeYear: (k: number) => number;
    nodeAt: (k: number) => {
        meanDeg: number;
        minDeg: number;
        maxDeg: number;
    };
    nodeRange: [number, number] | null;
};
/**
 * The drawn obliquity: ε_hybrid + w · (ε̄_cited − ε̄_hybrid). The hybrid itself where w = 0 or the
 * cited mean is unavailable (NaN beyond the history's end — the navigable domain ends inside it).
 * @param {number} epsHybridDeg
 * @param {number} beatMeanDeg
 * @param {number} citedMeanDeg
 * @param {number} weight  sceneObliquityHandoverWeight
 * @returns {number} degrees
 */
export function composeSceneObliquityDeg(epsHybridDeg: number, beatMeanDeg: number, citedMeanDeg: number, weight: number): number;
/**
 * The drawn band: the hybrid's beat band shifted by the same w · (ε̄_cited − ε̄_hybrid) — its centre
 * is the tilt the scene draws, its width the swing the model claims (the Genesis Analysis chart).
 * @param {{meanDeg: number, minDeg: number, maxDeg: number}} band  the hybrid's beat band
 * @param {number} citedMeanDeg
 * @param {number} weight
 * @returns {{centreDeg: number, minDeg: number, maxDeg: number, hybridMeanDeg: number}}
 */
export function composeSceneObliquityBand(band: {
    meanDeg: number;
    minDeg: number;
    maxDeg: number;
}, citedMeanDeg: number, weight: number): {
    centreDeg: number;
    minDeg: number;
    maxDeg: number;
    hybridMeanDeg: number;
};

export type InvariablePlane = {
    inclEclipticDeg: number;
    ascNodeEclipticDeg: number;
};
/** @typedef {{ inclEclipticDeg: number, ascNodeEclipticDeg: number }} InvariablePlane */
/**
 * The s-frame basis of the banked invariable plane in ecliptic-J2000
 * coordinates — the SAME construction as the K5c evaluator rotation in
 * keplerian-chain.cjs (x̂ = ecliptic-X projected into the plane); kept in
 * lockstep with it (matched-pair rule).
 * @param {InvariablePlane} invariablePlane  the artifact-banked plane
 * @returns {{ xf: number[], yf: number[], zf: number[] }} unit basis vectors
 */
export function computeSFrameBasis(invariablePlane: InvariablePlane): {
    xf: number[];
    yf: number[];
    zf: number[];
};
/**
 * S-frame longitude of the invariable plane's ascending node on the ICRF
 * equator — the Souami & Souchay (2012) longitude origin. Subtracting this
 * from a K5c s-frame node longitude expresses it in the S&S convention.
 * J2000-fixed (banked plane + J2000 mean obliquity).
 * @param {InvariablePlane} invariablePlane  the artifact-banked plane
 * @param {number} obliquityJ2000Deg  J2000 mean obliquity (ecliptic↔ICRF), degrees
 * @returns {number} s-frame longitude of the origin, degrees in [0, 360)
 */
export function computeEquatorNodeOriginSFrameDeg(invariablePlane: InvariablePlane, obliquityJ2000Deg: number): number;
/**
 * Convert a K5c s-frame node longitude to the equator-node origin (the
 * Souami & Souchay 2012 convention).
 * @param {number} sFrameDeg  node longitude in the engine s-frame, degrees
 * @param {number} originSFrameDeg  from computeEquatorNodeOriginSFrameDeg, degrees
 * @returns {number} node longitude in the S&S convention, degrees in [0, 360)
 */
export function convertNodeSFrameToEquatorOriginDeg(sFrameDeg: number, originSFrameDeg: number): number;

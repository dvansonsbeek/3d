/**
 * Invariable-plane node-origin conversion — the K5c node-origin DERIVATION
 * (plan 02: "derive the origin definition and apply the exact conversion —
 * a derivation, not a fit").
 *
 * THE TWO CONVENTIONS. The K5c evaluator (keplerian-chain.cjs) outputs node
 * longitudes in the engine's own s-frame: origin = ecliptic-X (the equinox)
 * projected into the artifact-banked invariable plane — the NAFF extraction
 * convention. Souami & Souchay (2012, A&A 543, A133) Table 2 quote node
 * longitudes from a different origin on the same plane: the invariable
 * plane's ASCENDING NODE ON THE ICRF EQUATOR. This module derives that
 * origin's s-frame longitude from nothing but the banked plane orientation
 * and the J2000 mean obliquity — zero fitted constants.
 *
 * VERIFICATION (measured on derivation, 2026-09): the derived node direction
 * reproduces S&S's published equator node RA 3°51′9.4″ = 3.8526° to
 * 0.4 mdeg, and converting the chain's eight J2000 s-frame nodes collapses
 * the apparent per-planet offsets (1.7–10.2°) to the element-class residual
 * (chain elements-of-date vs S&S mean elements), which scales as
 * 1/sin(i_inv) exactly as the K5c i_inv probe's ≤0.05° representation band
 * predicts. The legacy Appendix-C "calibrated" nodes independently agree
 * with the converted values (mostly ≤1°) — the old calibration was
 * compensating for exactly this origin difference plus the of-date element
 * state. Gate: tools/explore/k5c-invplane-probe.mjs.
 *
 * Dependency-injected like the rest of the .cjs leaves: callers supply the
 * banked plane (artifact `invariablePlane`) and their certified J2000 mean
 * obliquity in degrees (the ecliptic↔ICRF rotation constant, e.g.
 * earthOrbital.obliquityJ2000_deg).
 */

'use strict';

const D2R = Math.PI / 180;

/** @typedef {{ inclEclipticDeg: number, ascNodeEclipticDeg: number }} InvariablePlane */

/**
 * The s-frame basis of the banked invariable plane in ecliptic-J2000
 * coordinates — the SAME construction as the K5c evaluator rotation in
 * keplerian-chain.cjs (x̂ = ecliptic-X projected into the plane); kept in
 * lockstep with it (matched-pair rule).
 * @param {InvariablePlane} invariablePlane  the artifact-banked plane
 * @returns {{ xf: number[], yf: number[], zf: number[] }} unit basis vectors
 */
function computeSFrameBasis(invariablePlane) {
  const fi = invariablePlane.inclEclipticDeg * D2R;
  const fO = invariablePlane.ascNodeEclipticDeg * D2R;
  const zf = [Math.sin(fi) * Math.sin(fO), -Math.sin(fi) * Math.cos(fO), Math.cos(fi)];
  let xf = [1 - zf[0] * zf[0], -zf[0] * zf[1], -zf[0] * zf[2]];
  const xn = Math.hypot(xf[0], xf[1], xf[2]);
  xf = [xf[0] / xn, xf[1] / xn, xf[2] / xn];
  const yf = [
    zf[1] * xf[2] - zf[2] * xf[1],
    zf[2] * xf[0] - zf[0] * xf[2],
    zf[0] * xf[1] - zf[1] * xf[0],
  ];
  return { xf, yf, zf };
}

/**
 * S-frame longitude of the invariable plane's ascending node on the ICRF
 * equator — the Souami & Souchay (2012) longitude origin. Subtracting this
 * from a K5c s-frame node longitude expresses it in the S&S convention.
 * J2000-fixed (banked plane + J2000 mean obliquity).
 * @param {InvariablePlane} invariablePlane  the artifact-banked plane
 * @param {number} obliquityJ2000Deg  J2000 mean obliquity (ecliptic↔ICRF), degrees
 * @returns {number} s-frame longitude of the origin, degrees in [0, 360)
 */
function computeEquatorNodeOriginSFrameDeg(invariablePlane, obliquityJ2000Deg) {
  const { xf, yf, zf } = computeSFrameBasis(invariablePlane);
  const eps = obliquityJ2000Deg * D2R;
  // ICRF equatorial pole in ecliptic-J2000 coordinates
  const zeq = [0, Math.sin(eps), Math.cos(eps)];
  // ascending node of the invariable plane on the equator: ẑ_eq × ẑ_inv
  const n = [
    zeq[1] * zf[2] - zeq[2] * zf[1],
    zeq[2] * zf[0] - zeq[0] * zf[2],
    zeq[0] * zf[1] - zeq[1] * zf[0],
  ];
  const a = Math.atan2(
    n[0] * yf[0] + n[1] * yf[1] + n[2] * yf[2],
    n[0] * xf[0] + n[1] * xf[1] + n[2] * xf[2]
  ) / D2R;
  return ((a % 360) + 360) % 360;
}

/**
 * Convert a K5c s-frame node longitude to the equator-node origin (the
 * Souami & Souchay 2012 convention).
 * @param {number} sFrameDeg  node longitude in the engine s-frame, degrees
 * @param {number} originSFrameDeg  from computeEquatorNodeOriginSFrameDeg, degrees
 * @returns {number} node longitude in the S&S convention, degrees in [0, 360)
 */
function convertNodeSFrameToEquatorOriginDeg(sFrameDeg, originSFrameDeg) {
  return (((sFrameDeg - originSFrameDeg) % 360) + 360) % 360;
}

module.exports = {
  computeSFrameBasis,
  computeEquatorNodeOriginSFrameDeg,
  convertNodeSFrameToEquatorOriginDeg,
};

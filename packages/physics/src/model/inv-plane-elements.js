/**
 * Earth's invariable-plane elements of date — the ONE published i_inv / Ω_inv.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { CHAIN_ARTIFACT } from '../planets/chain-artifact.js';
import { convertNodeSFrameToEquatorOriginDeg } from '../planets/inv-plane-frame.cjs';

/** @param {import('./planet-elements-of-date.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleInvPlaneElements(ctx) {
  const { nodeOriginSSDeg, oneSourceM } = ctx;
  // ONE published i_inv / Ω_inv everywhere — the mirror of the browser's
  // inclInvPlaneModel / ascNodeInvPlaneModel (identical ops): the engine's
  // own Earth-orbit normal of date (the one-source sampler — the banked
  // secular series inside ±10 Myr, the mode tail beyond) against the
  // artifact's invariable plane, the node expressed in the Souami & Souchay
  // longitude origin through the same derived conversion the planets' node
  // takes. Doc 05 banks the one-source reading at rms 0.003° vs La2010 over
  // −500 kyr. Argument: the engine year (dynamical time,
  // Julian from J2000 TT — the sampler's own coordinate, as the chain's).
  const invPlaneGeometry = (() => {
    const ip = /** @type {{ inclEclipticDeg: number, ascNodeEclipticDeg: number }} */ (/** @type {any} */ (CHAIN_ARTIFACT).invariablePlane);
    const D2R = Math.PI / 180;
    const si = Math.sin(ip.inclEclipticDeg * D2R), ci = Math.cos(ip.inclEclipticDeg * D2R);
    const nInv = [si * Math.sin(ip.ascNodeEclipticDeg * D2R), -si * Math.cos(ip.ascNodeEclipticDeg * D2R), ci];
    const xIp = [Math.cos(ip.ascNodeEclipticDeg * D2R), Math.sin(ip.ascNodeEclipticDeg * D2R), 0];
    const yIp = [nInv[1] * xIp[2] - nInv[2] * xIp[1], nInv[2] * xIp[0] - nInv[0] * xIp[2], nInv[0] * xIp[1] - nInv[1] * xIp[0]];
    return { ascNodeEclipticDeg: ip.ascNodeEclipticDeg, nInv, xIp, yIp };
  })();
  /** The engine Earth-orbit normal of date, J2000 ecliptic frame. @param {number} year @returns {number[]} */
  const earthOrbitNormalJ2000At = (year) => {
    const s = oneSourceM.sampleAt(year);
    return [s.orbitNormalX, s.orbitNormalY, Math.sqrt(Math.max(0, 1 - s.orbitNormalX * s.orbitNormalX - s.orbitNormalY * s.orbitNormalY))];
  };
  /** Earth's inclination of date to the model's invariable plane, degrees. @param {number} year @returns {number} */
  const inclinationDeg = (year) => {
    const nE = earthOrbitNormalJ2000At(year), nInv = invPlaneGeometry.nInv;
    const d = nE[0] * nInv[0] + nE[1] * nInv[1] + nE[2] * nInv[2];
    return Math.acos(Math.min(1, Math.max(-1, d))) / (Math.PI / 180);
  };
  /** Earth's ascending node of date on the invariable plane, S&S origin, degrees in [0, 360). @param {number} year @returns {number} */
  const ascendingNodeDeg = (year) => {
    const D2R = Math.PI / 180;
    const { ascNodeEclipticDeg, nInv, xIp, yIp } = invPlaneGeometry;
    const nE = earthOrbitNormalJ2000At(year);
    let N = [nInv[1] * nE[2] - nInv[2] * nE[1], nInv[2] * nE[0] - nInv[0] * nE[2], nInv[0] * nE[1] - nInv[1] * nE[0]];
    const L = Math.hypot(N[0], N[1], N[2]);
    N = [N[0] / L, N[1] / L, N[2] / L];
    const sFrameDeg = ((Math.atan2(N[0] * yIp[0] + N[1] * yIp[1] + N[2] * yIp[2],
      N[0] * xIp[0] + N[1] * xIp[1] + N[2] * xIp[2]) / D2R + ascNodeEclipticDeg) % 360 + 360) % 360;
    return convertNodeSFrameToEquatorOriginDeg(sFrameDeg, nodeOriginSSDeg());
  };

  return { ascendingNodeDeg, inclinationDeg };
}
/** @typedef {import('./planet-elements-of-date.js').Ctx & ReturnType<typeof assembleInvPlaneElements>} Ctx */

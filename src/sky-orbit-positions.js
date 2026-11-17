/**
 * The sky of date's positions on the Galactic orbits — the ONE place (plan 28 §D) where a star's heliocentric
 * Galactic vector of date (ONE home @essrt/physics sky/galactic-orbits) becomes a point in the catalogue
 * containers' local frame, shared by the orbit worker (every star, off the main thread) and the main thread
 * (one star, for the gates' pure reads and the no-worker fallback). ONE evaluator of the ONE potential — the
 * integrator (RK4 from the epoch on a deterministic node schedule, pure in the year, the nodes cached per set):
 *   - the named catalogue (Hipparcos, 41,000 stars, era-certified, high-velocity stars among them): 1-Myr
 *     steps, 5-Myr nodes (2 MB per node);
 *   - the arriving stars (Gaia, unnamed, invisible today): 2-Myr steps, 10-Myr nodes.
 * The closed-form epicycle (fillLocalPositions) stays as the potential's analytic check for the gates.
 *
 * Local frame: the containers are aligned once to the J2000 equatorial frame, so a star's local coordinates
 * are x = cos δ sin α, y = sin δ, z = cos δ cos α — i.e. (Y_eq, Z_eq, X_eq) of the standard equatorial axes
 * (X the equinox, Y α = 90°, Z the pole). The Galactic vector goes through the one-home triad to those axes,
 * then takes the permutation. Positions in PARSECS; the scene scales by its units per parsec.
 */

import { galactocentricPositionAtYear, galactocentricState, integrateOrbitRK4, integrationSchedule, ORBIT_INTEGRATION } from '@essrt/physics';

/**
 * A heliocentric Galactic vector (pc) → the local frame.
 * @param {number} X @param {number} Y @param {number} Z
 * @param {{x: number[], y: number[], z: number[]}} T  the Galactic triad in the equatorial J2000 frame
 * @returns {[number, number, number]}
 */
export function localOfGalactic(X, Y, Z, T) {
  const ex = X * T.x[0] + Y * T.y[0] + Z * T.z[0], ey = X * T.x[1] + Y * T.y[1] + Z * T.z[1], ez = X * T.x[2] + Y * T.y[2] + Z * T.z[2];
  return [ey, ez, ex];
}

/**
 * The epicycle evaluator: fill buf (3n floats) with the local-frame heliocentric positions (pc) of every star of a
 * set at an engine year — each star's closed-form orbit minus the Sun's, both from their own epochs.
 * @param {any[]} els  the stars' orbit elements  @param {any} sunEl  the Sun's  @param {number} year
 * @param {Float32Array | Float64Array} buf @param {{x: number[], y: number[], z: number[]}} T
 */
export function fillLocalPositions(els, sunEl, year, buf, T) {
  const q = galactocentricPositionAtYear(sunEl, year);
  const n = els.length;
  for (let i = 0; i < n; i++) {
    const p = galactocentricPositionAtYear(els[i], year);
    const l = localOfGalactic(p[0] - q[0], p[1] - q[1], p[2] - q[2], T);
    buf[3 * i] = l[0]; buf[3 * i + 1] = l[1]; buf[3 * i + 2] = l[2];
  }
}

/**
 * An integrated set: the epoch states of n stars AND the Sun (index n, brought to the set's epoch) as one
 * Float64Array of 6(n+1), with the node cache. The Sun shares the stars' schedule, so the relative vector is
 * consistent step for step.
 * @param {{n: number, raDeg: ArrayLike<number>, decDeg: ArrayLike<number>, distPc: ArrayLike<number>, pmRaMasYr: ArrayLike<number>, pmDecMasYr: ArrayLike<number>, rvKmS: ArrayLike<number>, epochYear: number}} c
 * @param {(a: any) => any} heliocentricGalacticState  the one-home transformation (passed in: the worker and the module import it themselves)
 * @param {{stepYears: number, nodeYears: number}} [sched]  the tier's schedule (ORBIT_INTEGRATION.named by default; .arriving for the Gaia tier)
 */
export function integratedSet(c, heliocentricGalacticState, sched = ORBIT_INTEGRATION.named) {
  const n = c.n, s0 = new Float64Array(6 * (n + 1));
  for (let i = 0; i < n; i++) {
    const st = galactocentricState(heliocentricGalacticState({ raDeg: c.raDeg[i], decDeg: c.decDeg[i], distPc: c.distPc[i], pmRaMasYr: c.pmRaMasYr[i], pmDecMasYr: c.pmDecMasYr[i], rvKmS: c.rvKmS[i] }), c.epochYear);
    for (let k = 0; k < 6; k++) s0[6 * i + k] = st[k];
  }
  const sun = galactocentricState(null), sunAtEpoch = c.epochYear === 2000 ? sun : integrateOrbitRK4(sun, c.epochYear - 2000, 1);
  for (let k = 0; k < 6; k++) s0[6 * n + k] = sunAtEpoch[k];
  return { n, epochYear: c.epochYear, sched, states0: s0, nodes: new Map([[0, s0]]) };
}

/** Integrate every body of a 6(n+1) state array over dt in nSteps (a new array). @param {Float64Array} s @param {number} dt @param {number} nSteps */
function stepAll(s, dt, nSteps) {
  const out = new Float64Array(s.length), m = s.length / 6;
  const one = new Array(6);
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < 6; k++) one[k] = s[6 * i + k];
    const r = integrateOrbitRK4(one, dt, nSteps);
    for (let k = 0; k < 6; k++) out[6 * i + k] = r[k];
  }
  return out;
}

/** The set's node state at a node index, built from the epoch outward and cached. @param {ReturnType<typeof integratedSet>} set @param {number} nodeIndex */
function nodeState(set, nodeIndex) {
  const cached = set.nodes.get(nodeIndex);
  if (cached) return cached;
  const sign = Math.sign(nodeIndex), prev = nodeState(set, nodeIndex - sign);
  const sch = integrationSchedule(set.epochYear, set.epochYear, set.sched);
  const s = stepAll(prev, sign * sch.nodeYears, sch.stepsPerNode);
  set.nodes.set(nodeIndex, s);
  return s;
}

/**
 * The integrated evaluator: fill buf (3n floats) with the local-frame heliocentric positions (pc) of every star of
 * an integrated set at an engine year, from the nearest node toward the epoch — pure in the year.
 * @param {ReturnType<typeof integratedSet>} set @param {number} year @param {Float32Array | Float64Array} buf @param {{x: number[], y: number[], z: number[]}} T
 */
export function fillLocalPositionsIntegrated(set, year, buf, T) {
  const sch = integrationSchedule(year, set.epochYear, set.sched);
  const node = nodeState(set, sch.nodeIndex);
  const s = sch.remainder === 0 ? node : stepAll(node, sch.remainder, sch.steps);
  const n = set.n, qx = s[6 * n], qy = s[6 * n + 1], qz = s[6 * n + 2];
  for (let i = 0; i < n; i++) {
    const l = localOfGalactic(s[6 * i] - qx, s[6 * i + 1] - qy, s[6 * i + 2] - qz, T);
    buf[3 * i] = l[0]; buf[3 * i + 1] = l[1]; buf[3 * i + 2] = l[2];
  }
}

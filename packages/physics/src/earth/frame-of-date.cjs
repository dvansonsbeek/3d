/**
 * The Earth frame of date — ONE home (holisticuniverse plan 06, R4 "one Earth
 * frame": the scene's axis, equinox and sun plane placed from the engine).
 *
 * The one-source movement's sample carries, at a year, the obliquity ε, the
 * equinox node's longitude in the J2000 ecliptic frame and the orbit normal's
 * in-plane components. From those three the full frame follows, all unit
 * vectors in the J2000 ecliptic frame the chain artifact uses:
 *
 *   n̂ — the ecliptic pole of date (the orbit normal; the sun plane's normal)
 *   ĝ — the equinox of date: the ascending node of the ecliptic of date on the
 *       equator of date, ĝ ∝ ŝ × n̂; it lies in the ecliptic of date at the
 *       sample's node longitude
 *   ŝ — the spin axis (the celestial pole of date): the ecliptic pole tilted by
 *       ε toward longitude ĝ + 90° — ŝ = cos ε·n̂ + sin ε·(n̂ × ĝ)
 *
 * so that ĝ = unit(ŝ × n̂) and ε = ∠(ŝ, n̂) hold by construction. Reconstructing
 * from ANGLES (not from stored vectors) keeps the grid interpolation exact: the
 * node longitude is Hermite-interpolated by the sampler, the normal components
 * and ε are smooth.
 *
 * Both scene twins (src/script.js, tools/lib/scene-graph.js) place the axis,
 * the sun plane and the Sun from this frame every frame — no relative
 * corrections on a device geometry (the retired tilt/azimuth/apsidal/plane
 * corrections and the δ Newton read: docs/41). Measured before the change:
 * the K sun plane and the RA frame's ecliptic parted by 20.5″ at J2000 and 10′
 * at −3000, the rendered Sun −19″ in declination against Horizons at the
 * March 2000 equinox (+19″ in September; 0.1–1″ at the solstice).
 */
'use strict';

const D2R = Math.PI / 180;

/**
 * @typedef {{x: number, y: number, z: number}} Vec3
 */

/** @param {number[]} a @param {number[]} b @returns {number[]} */
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
/** @param {number[]} v @returns {number[]} */
function unit(v) {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * The Earth frame of date from a one-source sample, unit vectors in the J2000
 * ecliptic frame: `n` the ecliptic pole of date, `g` the equinox of date, `s`
 * the spin axis of date. Every vector is `[x, y, z]`.
 * @param {{epsDeg: number, equinoxLonJ2000Deg: number, orbitNormalX: number, orbitNormalY: number}} sample
 * @returns {{n: number[], g: number[], s: number[]}}
 */
function computeEarthFrameOfDate(sample) {
  const nx = sample.orbitNormalX, ny = sample.orbitNormalY;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const n = [nx, ny, nz];
  // the equinox: in the ecliptic of date (⟂ n̂), at the sampled longitude L
  // measured in the J2000 ecliptic — the unit vector (cos L, sin L, z) with
  // z fixed by ĝ·n̂ = 0
  const L = sample.equinoxLonJ2000Deg * D2R;
  const gx = Math.cos(L), gy = Math.sin(L);
  const gz = -(nx * gx + ny * gy) / nz;
  const g = unit([gx, gy, gz]);
  // the spin axis: the pole tilted by ε from n̂ toward longitude ĝ + 90°
  const eps = sample.epsDeg * D2R;
  const w = cross(n, g);   // the in-plane direction at ĝ + 90°
  const s = unit([
    Math.cos(eps) * n[0] + Math.sin(eps) * w[0],
    Math.cos(eps) * n[1] + Math.sin(eps) * w[1],
    Math.cos(eps) * n[2] + Math.sin(eps) * w[2],
  ]);
  return { n, g, s };
}

/**
 * The wheel angle θ that puts the Sun at ecliptic longitude λ on the scene's
 * offset circle: the Sun sits at radius 1 (100 scene units) about a centre
 * displaced by −e along the perihelion direction ϖ (the one eccentricity law's
 * single arm), P(θ) = −e·û(ϖ) + û(θ), and the geocentric longitude is the
 * direction of P. Two Newton steps from θ₀ = λ (the offset-circle Jacobian
 * dλ/dθ = 1 − e·cos(θ − ϖ) + O(e²)); converged to <1e-12 rad for e < 0.1.
 * Angles in radians; θ increases with λ (the scene's node angles are
 * λ-handed).
 * @param {number} lambdaRad - the target geocentric ecliptic longitude
 * @param {number} e - the eccentricity (the centre offset in units of the radius)
 * @param {number} periRad - the perihelion longitude ϖ of date (the offset direction is −û(ϖ))
 * @returns {number} θ in radians, in (−π, π]
 */
function solveWheelAngleForLongitude(lambdaRad, e, periRad) {
  const cx = -e * Math.cos(periRad), cy = -e * Math.sin(periRad);
  let th = lambdaRad;
  for (let k = 0; k < 3; k++) {
    const px = cx + Math.cos(th), py = cy + Math.sin(th);
    const lam = Math.atan2(py, px);
    const r2 = px * px + py * py;
    const dLamDth = (px * Math.cos(th) + py * Math.sin(th)) / r2;   // d atan2(py, px)/dθ
    const err = Math.atan2(Math.sin(lambdaRad - lam), Math.cos(lambdaRad - lam));
    th += err / dLamDth;
  }
  return Math.atan2(Math.sin(th), Math.cos(th));
}

module.exports = { computeEarthFrameOfDate, solveWheelAngleForLongitude };

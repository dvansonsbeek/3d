'use strict';
/**
 * The Galactic coordinate frame at J2000 — ONE home (plan 28 §A, doc 111 §1.47).
 *
 * The IAU 1958 definition (Blaauw, Gum, Pawsey & Westerhout 1960, MNRAS 121, 123) carried to
 * J2000: the north Galactic pole at α = 192.85948°, δ = +27.12825°, and the zero of longitude at
 * position angle θ₀ = 122.93192° from the pole — which puts the Galactic centre direction
 * (l = 0, b = 0) at α = 266.40500°, δ = −28.93617°. The values are the Hipparcos Catalogue's
 * (ESA 1997, Vol. 1 §1.5.3); Reid & Brunthaler (2004, ApJ 616, 872) give the same pair. The
 * published pole and centre close to 3e-8 in their dot product; the triad below re-orthogonalises
 * the centre against the pole so the frame is exactly orthonormal.
 *
 * A frame CONVENTION, not a measured quantity: the simulator's Milky Way dome is drawn in it (the
 * texture's equator is the Galactic plane, its centre column the Galactic centre), and the
 * catalogue stars of plan 28 §B are read through it. Axes of the equatorial Cartesian frame used
 * here: X toward α = 0 on the equator (the J2000 equinox), Y toward α = 90°, Z the J2000 pole.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** The north Galactic pole, J2000 equatorial (degrees). */
const GALACTIC_NORTH_POLE_J2000_DEG = Object.freeze({ raDeg: 192.85948, decDeg: 27.12825 });
/** The Galactic centre direction (l = 0, b = 0), J2000 equatorial (degrees). */
const GALACTIC_CENTRE_J2000_DEG = Object.freeze({ raDeg: 266.40500, decDeg: -28.93617 });

/**
 * A unit vector in the equatorial J2000 Cartesian frame (X the equinox, Y α = 90°, Z the pole).
 * @param {number} raDeg @param {number} decDeg
 * @returns {[number, number, number]}
 */
function equatorialUnitVector(raDeg, decDeg) {
  const cd = Math.cos(decDeg * D2R);
  return [cd * Math.cos(raDeg * D2R), cd * Math.sin(raDeg * D2R), Math.sin(decDeg * D2R)];
}

/** @param {[number, number, number]} a @param {[number, number, number]} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {[number, number, number]} a @param {[number, number, number]} b @returns {[number, number, number]} */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {[number, number, number]} a @returns {[number, number, number]} */
const unit = (a) => { const n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; };

/**
 * The Galactic triad in the equatorial J2000 Cartesian frame: x the centre (l = 0, b = 0), z the
 * north Galactic pole, y = z × x (l = 90°, b = 0). Right-handed, orthonormal to the double's grain.
 * @returns {{ x: [number, number, number], y: [number, number, number], z: [number, number, number] }}
 */
function galacticTriadEquatorialJ2000() {
  const z = unit(equatorialUnitVector(GALACTIC_NORTH_POLE_J2000_DEG.raDeg, GALACTIC_NORTH_POLE_J2000_DEG.decDeg));
  const c = equatorialUnitVector(GALACTIC_CENTRE_J2000_DEG.raDeg, GALACTIC_CENTRE_J2000_DEG.decDeg);
  const cz = dot(c, z);
  const x = unit([c[0] - cz * z[0], c[1] - cz * z[1], c[2] - cz * z[2]]);
  return { x, y: cross(z, x), z };
}

/**
 * Galactic longitude and latitude (degrees, l in [0, 360)) of a J2000 equatorial direction.
 * @param {number} raDeg @param {number} decDeg
 * @returns {{ lDeg: number, bDeg: number }}
 */
function equatorialToGalacticDeg(raDeg, decDeg) {
  const T = galacticTriadEquatorialJ2000();
  const v = equatorialUnitVector(raDeg, decDeg);
  const l = Math.atan2(dot(v, T.y), dot(v, T.x)) * R2D;
  return { lDeg: ((l % 360) + 360) % 360, bDeg: Math.asin(Math.max(-1, Math.min(1, dot(v, T.z)))) * R2D };
}

module.exports = { GALACTIC_NORTH_POLE_J2000_DEG, GALACTIC_CENTRE_J2000_DEG, equatorialUnitVector, galacticTriadEquatorialJ2000, equatorialToGalacticDeg };

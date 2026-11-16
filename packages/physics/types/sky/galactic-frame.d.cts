/** The north Galactic pole, J2000 equatorial (degrees). */
export const GALACTIC_NORTH_POLE_J2000_DEG: Readonly<{
    raDeg: 192.85948;
    decDeg: 27.12825;
}>;
/** The Galactic centre direction (l = 0, b = 0), J2000 equatorial (degrees). */
export const GALACTIC_CENTRE_J2000_DEG: Readonly<{
    raDeg: 266.405;
    decDeg: -28.93617;
}>;
/**
 * A unit vector in the equatorial J2000 Cartesian frame (X the equinox, Y α = 90°, Z the pole).
 * @param {number} raDeg @param {number} decDeg
 * @returns {[number, number, number]}
 */
export function equatorialUnitVector(raDeg: number, decDeg: number): [number, number, number];
/**
 * The Galactic triad in the equatorial J2000 Cartesian frame: x the centre (l = 0, b = 0), z the
 * north Galactic pole, y = z × x (l = 90°, b = 0). Right-handed, orthonormal to the double's grain.
 * @returns {{ x: [number, number, number], y: [number, number, number], z: [number, number, number] }}
 */
export function galacticTriadEquatorialJ2000(): {
    x: [number, number, number];
    y: [number, number, number];
    z: [number, number, number];
};
/**
 * Galactic longitude and latitude (degrees, l in [0, 360)) of a J2000 equatorial direction.
 * @param {number} raDeg @param {number} decDeg
 * @returns {{ lDeg: number, bDeg: number }}
 */
export function equatorialToGalacticDeg(raDeg: number, decDeg: number): {
    lDeg: number;
    bDeg: number;
};

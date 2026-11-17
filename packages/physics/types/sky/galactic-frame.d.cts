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
 * The Sun's Galactic orbit (plan 28 §E): McMillan (2017, MNRAS 465, 76) — the Sun's Galactocentric
 * radius R₀ = 8.21 kpc and the circular speed there v₀ = 233.1 km/s; the period 2πR₀/v₀ = 216 Myr. A
 * cited pair, the period derived. The Galactic frame co-rotates with this orbit, so against the stars
 * and the equinox the Galaxy's band — the Milky Way dome — turns once per period about the Galactic
 * pole, CLOCKWISE seen from the north Galactic pole (the Sun moves toward l = 90°; the direction to
 * the centre turns toward l = 270°). The phase is fixed by today's direction: the one free choice.
 */
export const SUN_GALACTIC_ORBIT: Readonly<{
    r0Kpc: 8.21;
    v0KmS: 233.1;
    source: "McMillan 2017, MNRAS 465, 76 (R₀ 8.21 kpc, v₀ 233.1 km/s)";
    periodMyr: number;
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
/**
 * The turn of the Galactic frame against the inertial sky since J2000, in radians about the north
 * Galactic pole (negative: clockwise seen from the pole), at an engine year.
 * @param {number} year
 */
export function galacticTurnRadAtYear(year: number): number;

/**
 * @param {number} lonDeg  the series' longitude of date (continuous; carries Meeus's first-order tilt share)
 * @param {number} latDeg  the series' latitude WITHOUT the flattening family — the Laplace-frame latitude
 * @param {number} tiltAnchorDeg  the J2000 tilt the series' flattening family is anchored on (2235 µ°)
 * @param {number} tiltShape  θ(t)/θ(0), 1 at J2000
 * @returns {{lonDeg: number, latRad: number, latDeg: number}} lonDeg continuous (the input plus the
 *   composed correction); latRad the rotation's own asin (the browser stores radians, the Node engine
 *   degrees — both from ONE value)
 */
export function composeEclipticOfDate(lonDeg: number, latDeg: number, tiltAnchorDeg: number, tiltShape: number): {
    lonDeg: number;
    latRad: number;
    latDeg: number;
};
/**
 * The normalised shapes the composition rides, from the regime's two readers
 * (earth/laplace-plane.cjs through the deep-time chain — which stays untouched: its
 * hash is every generator's input):
 *   tiltShape      = θ(t)/θ(0) — the Laplace plane's tilt from the ecliptic as a multiple of its
 *                    J2000 value; the series keeps Meeus's OWN anchor (2235 µ°, 8.05″ — the Horizons
 *                    referee prefers it to the solve's 8.30″ by 0.003″ of latitude scatter), the
 *                    shape alone is the physics (the R precedent),
 *   sinScale       = sin i_L(t)/sin i₀ — every F-odd latitude amplitude is ∝ sin i to first order
 *                    (the 3F family ∝ sin³ i: the series cubes it),
 *   tanHalfSqScale = tan²(i_L/2)/tan²(i₀/2) — the reduction to the ecliptic, the 2F families of
 *                    the longitude and the distance.
 * All three exactly 1 at J2000 (the readers' J2000 identities); null out of the histories' domain
 * (the series then keeps the era form, beyond the navigable domain only — the distance getter's rule).
 * @param {{
 *   tiltDegAtAge: (tMa: number) => (number | null),
 *   freeInclinationDegAtAge: (tMa: number) => (number | null),
 * }} deps — the chain's meanLaplaceTiltFromEclipticDegAtAge and meanLunarFreeInclinationDegAtAge
 * @returns {(tMa: number) => ({tiltShape: number, sinScale: number, tanHalfSqScale: number} | null)}
 */
export function createLunarPlaneScales({ tiltDegAtAge, freeInclinationDegAtAge }: {
    tiltDegAtAge: (tMa: number) => (number | null);
    freeInclinationDegAtAge: (tMa: number) => (number | null);
}): (tMa: number) => ({
    tiltShape: number;
    sinScale: number;
    tanHalfSqScale: number;
} | null);

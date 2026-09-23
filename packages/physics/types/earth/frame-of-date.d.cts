export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
/**
 * The Earth frame of date from a one-source sample, unit vectors in the J2000
 * ecliptic frame: `n` the ecliptic pole of date, `g` the equinox of date, `s`
 * the spin axis of date. Every vector is `[x, y, z]`.
 * @param {{epsDeg: number, equinoxLonJ2000Deg: number, orbitNormalX: number, orbitNormalY: number}} sample
 * @returns {{n: number[], g: number[], s: number[]}}
 */
export function computeEarthFrameOfDate(sample: {
    epsDeg: number;
    equinoxLonJ2000Deg: number;
    orbitNormalX: number;
    orbitNormalY: number;
}): {
    n: number[];
    g: number[];
    s: number[];
};
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
export function solveWheelAngleForLongitude(lambdaRad: number, e: number, periRad: number): number;

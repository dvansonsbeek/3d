/**
 * Derived series-extension correction to the full-series Moon:
 * the Delaunay tail plus the A2 planetary tail (longitude only).
 * @param {number} T - Julian centuries TT from J2000
 * @param {{s1: number, s2: number, s3: number}} [fs] - the F-class scales of the
 *   lunar plane of date (plan 31 A2; earth/laplace-plane.cjs lunarPlaneScalesAtAge):
 *   |kF| = 1 terms × s1 (sin i_L/sin i₀), |kF| = 2 × s2 (tan²(i_L/2)/tan²(i₀/2)),
 *   |kF| = 3 × s3 (s1³). Absent → the era form (every scale 1). The derived node
 *   family stays unscaled: its 0.371″ sin(2F + Ω) is the J2000 tilt's own first-order
 *   longitude term, which the composition removes at the anchor (moon/plane-of-date.cjs).
 * @returns {{dLonDeg: number, dLatDeg: number}} degrees — ADD to the
 *   full-series Moon longitude/latitude
 */
export function moonSeriesExtensionDeg(T: number, fs?: {
    s1: number;
    s2: number;
    s3: number;
}): {
    dLonDeg: number;
    dLatDeg: number;
};

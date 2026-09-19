/**
 * Derived series-extension correction to the full-series Moon:
 * the Delaunay tail plus the A2 planetary tail (longitude only).
 * @param {number} T - Julian centuries TT from J2000
 * @returns {{dLonDeg: number, dLatDeg: number}} degrees — ADD to the
 *   full-series Moon longitude/latitude
 */
export function moonSeriesExtensionDeg(T: number): {
    dLonDeg: number;
    dLatDeg: number;
};

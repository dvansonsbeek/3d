/**
 * Solar fraction of the J2000 precession torque from the shared constants.
 * @param {{
 *   gmSunKm3S2: number, auKm: number, earthEccentricity: number,
 *   gmMoonKm3S2: number, moonDistanceKm: number, moonEccentricity: number, moonInclinationDeg: number,
 * }} c
 * @returns {number} f_S in [0, 1]
 */
export function computeSolarTorqueShare(c: {
    gmSunKm3S2: number;
    auKm: number;
    earthEccentricity: number;
    gmMoonKm3S2: number;
    moonDistanceKm: number;
    moonEccentricity: number;
    moonInclinationDeg: number;
}): number;
/**
 * @param {{
 *   p0ArcsecPerYr: number | (() => number),
 *   solarShare: number,
 *   lodSecondsAtAge: (tMa: number) => (number | null),
 *   lodJ2000Seconds: number,
 *   moonDistanceMetresAtAge: (tMa: number) => (number | null),
 *   moonDistanceJ2000Metres: number,
 *   yearToTMa: (year: number) => number,
 * }} deps - p0 = the model's derived J2000 rate, 1,296,000/axial0 (S5; a
 *   number or a LAZY getter — the callers' certified year laws read the
 *   deep-time factory this is built inside, so the anchor is resolved on
 *   the first RATE use, never at construction; the torque term needs no
 *   anchor); lodJ2000Seconds the SAME day basis lodSecondsAtAge(0) returns.
 * @returns {{
 *   composedRateArcsecPerYrAtAge: (tMa: number) => (number | null),
 *   composedPeriodYearsAtAge: (tMa: number) => (number | null),
 *   composedRateArcsecPerYrAtYear: (year: number) => (number | null),
 *   composedPeriodYearsAtYear: (year: number) => (number | null),
 *   composedRateRatioAtAge: (tMa: number) => (number | null),
 *   torqueTermAtAge: (tMa: number) => (number | null),
 *   lunarTorqueFactorAtAge: (tMa: number) => (number | null),
 *   solarShare: number,
 *   p0ArcsecPerYr: number,
 * }}
 */
export function createComposedPrecession(deps: {
    p0ArcsecPerYr: number | (() => number);
    solarShare: number;
    lodSecondsAtAge: (tMa: number) => (number | null);
    lodJ2000Seconds: number;
    moonDistanceMetresAtAge: (tMa: number) => (number | null);
    moonDistanceJ2000Metres: number;
    yearToTMa: (year: number) => number;
}): {
    composedRateArcsecPerYrAtAge: (tMa: number) => (number | null);
    composedPeriodYearsAtAge: (tMa: number) => (number | null);
    composedRateArcsecPerYrAtYear: (year: number) => (number | null);
    composedPeriodYearsAtYear: (year: number) => (number | null);
    composedRateRatioAtAge: (tMa: number) => (number | null);
    torqueTermAtAge: (tMa: number) => (number | null);
    lunarTorqueFactorAtAge: (tMa: number) => (number | null);
    solarShare: number;
    p0ArcsecPerYr: number;
};

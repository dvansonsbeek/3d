/**
 * The lowest power of m = n_S/n_M a Meeus-class term's amplitude carries (the Hill–Brown
 * characteristic), from the multiples of D, M and M′ in its argument.
 * @param {number} kD @param {number} kM @param {number} kMp @returns {number} 0, 1, 2, 3 or 4
 */
export function solarCharacteristicPower(kD: number, kM: number, kMp: number): number;
/**
 * The two ratios of date the m-family rides, on the chain's readers (the deep-time chain through
 * the composer; tools/lib's twin; the browser's `_dtc()`): m(t)/m(0) with m the sidereal month over
 * the sidereal year of date, and (a_M/a_S)(t)/(a_M/a_S)(0) on the corrected Moon distance and the AU
 * of date. Exactly 1 at J2000 (the same operations divided by themselves); null where a reader
 * refuses (beyond the histories).
 * @param {{
 *   siderealMonthSecondsAtAge: (tMa: number) => (number | null),
 *   siderealYearSecondsAtAge: (tMa: number) => (number | null),
 *   moonDistanceKmAtAge: (tMa: number) => (number | null),
 *   auAtAge: (tMa: number) => (number | null),
 * }} deps — meanMoonSiderealMonthAtAge, meanSiderealYearSecondsAtAge, meanMoonDistanceCorrectedAtAge, meanAuAtAge
 * @returns {(tMa: number) => ({mRatio: number, aRatio: number} | null)}
 */
export function createSolarPerturbationScales({ siderealMonthSecondsAtAge, siderealYearSecondsAtAge, moonDistanceKmAtAge, auAtAge }: {
    siderealMonthSecondsAtAge: (tMa: number) => (number | null);
    siderealYearSecondsAtAge: (tMa: number) => (number | null);
    moonDistanceKmAtAge: (tMa: number) => (number | null);
    auAtAge: (tMa: number) => (number | null);
}): (tMa: number) => ({
    mRatio: number;
    aRatio: number;
} | null);

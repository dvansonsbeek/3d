/**
 * @param {{
 *   t0Yr?: number,
 *   stepYr?: number,
 *   lamDotRel?: number[],
 *   massLossSiderealSecondsAtYearFn: (year: number) => number,
 * }} opts
 *   t0Yr/stepYr/lamDotRel: the banked channel geometry (t in years from
 *   J2000: t_i = t0Yr + i·stepYr) — default: the embedded
 *   SIDEREAL_CHANNEL_ARTIFACT (generate.mjs-owned, pinned to the governed
 *   series artifact), so callers normally pass only the mass-loss law.
 *   massLossSiderealSecondsAtYearFn: the caller's secular mass-loss
 *   sidereal-year law, SI seconds (year = calendar year).
 */
export function createSiderealYearChannel(opts: {
    t0Yr?: number;
    stepYr?: number;
    lamDotRel?: number[];
    massLossSiderealSecondsAtYearFn: (year: number) => number;
}): {
    /** The planetary λ̇ ratio to J2000 (1 outside the banked span). @param {number} year */
    planetaryRelAtYear: (year: number) => number;
    /** The sidereal year of date, SI seconds. @param {number} year */
    siderealYearSecondsAtYear: (year: number) => number;
    /**
     * Apply the λ̇ drift COHERENTLY to any year length (tropical,
     * anomalistic, …): every year is 360/(λ̇ + X) for some geometric rate
     * X (equinox p, apsidal −ϖ̇, 0 for sidereal), and the channel scales
     * λ̇ only — so the correction is on the RATE, not the period:
     *   1/T' = 1/T + (rel − 1)/T_sid_raw
     * (for the sidereal year itself this reduces exactly to T/rel).
     * Correcting periods by division instead would corrupt beat-derived
     * quantities (P = sid/(sid − trop) amplifies ~20×/s); this form
     * leaves every beat invariant to second order.
     * @param {number} year @param {number} yearSeconds
     */
    correctedYearSeconds: (year: number, yearSeconds: number) => number;
};

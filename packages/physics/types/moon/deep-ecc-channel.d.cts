/**
 * @param {{
 *   earthZ: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 * }} artifact — the embedded deep-modes artifact (earth z-modes + the J2000
 *   anchor pair joined from the chain artifact's one home).
 */
export function createDeepEccChannel({ earthZ, anchorE, anchorPeriEclipticDeg }: {
    earthZ: ReadonlyArray<{
        omegaRadPerYr: number;
        re: number;
        im: number;
    }>;
    anchorE: number;
    anchorPeriEclipticDeg: number;
}): {
    eccAt: (tYr: number) => number;
    eccRateAt: (tYr: number) => number;
    modulation: (tMa: number, s: number) => number;
    channelIntegral: (T: number, s: number) => number;
    eFactorAt: (tYr: number) => number;
    e0: number;
    g0: number;
};

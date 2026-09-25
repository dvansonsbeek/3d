/**
 * @param {{ secularModes: Record<string, { z: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}> }> }} artifact
 * @param {string} key
 * @returns {{ dom: { arcsecPerYr: number, amp: number }, sub: { arcsecPerYr: number, amp: number },
 *   rest: { count: number, amp: number }, ampSumAll: number, beatYears: number }}
 */
export function computeSecularShape(artifact: {
    secularModes: Record<string, {
        z: ReadonlyArray<{
            omegaRadPerYr: number;
            re: number;
            im: number;
        }>;
    }>;
}, key: string): {
    dom: {
        arcsecPerYr: number;
        amp: number;
    };
    sub: {
        arcsecPerYr: number;
        amp: number;
    };
    rest: {
        count: number;
        amp: number;
    };
    ampSumAll: number;
    beatYears: number;
};

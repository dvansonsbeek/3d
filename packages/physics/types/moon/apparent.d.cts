/**
 * No dependencies since R3 item 1 (the former D5 optics constants and the
 * fitted-patch getters are gone); the factory shape is kept for the two
 * scene twins' call sites.
 * @param {object} [_deps] ignored
 */
export function createMoonApparent(_deps?: object): {
    overrideRaDec: ({ lonDeg, betRad, obliquityDeg }: {
        lonDeg: number;
        betRad: number;
        meeusT?: (number | undefined);
        obliquityDeg: number;
    }) => {
        raRad: number;
        decRad: number;
    };
};

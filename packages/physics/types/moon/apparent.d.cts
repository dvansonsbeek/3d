export type MoonCorrectionTable = {
    raSinD: number;
    raCosD: number;
    raSinMp: number;
    raCosMp: number;
    raSinMs: number;
    raCosMs: number;
    decSinD: number;
    decCosD: number;
    decSinMp: number;
    decCosMp: number;
    decSinMs: number;
    decCosMs: number;
};
/**
 * @typedef {{raSinD: number, raCosD: number, raSinMp: number, raCosMp: number,
 *            raSinMs: number, raCosMs: number, decSinD: number, decCosD: number,
 *            decSinMp: number, decCosMp: number, decSinMs: number, decCosMs: number}} MoonCorrectionTable
 */
/**
 * @param {{
 *   constants: {
 *     j2000JD: number,
 *     julianCenturyDays: number,
 *     sunMeanLongitudeJ2000Deg: number,
 *     perihelionLongitudeJ2000Deg: number,
 *     eccentricityJ2000: number,
 *     eccentricityDotJ2000: number,
 *     d5RateLDegPerDay: number,
 *     d5RatePeriDegPerDay: number,
 *     speedOfLight: number,
 *   },
 *   fns: {
 *     computeObliquityEarth: (year: number) => number,
 *     getAuDistanceKm: () => number,
 *     isFrameworkNative: () => boolean,
 *     getCorrectionResidual: () => (MoonCorrectionTable | null),
 *     getCorrectionLegacy: () => (MoonCorrectionTable | null),
 *   },
 * }} deps — the D5 rates are the engines' J2000-frozen values (the year
 *   globals are deep-time-mutable, same pattern as FW_A2_RATE); the AU
 *   distance is a GETTER (browser-mutable under deep time).
 */
export function createMoonApparent({ constants, fns }: {
    constants: {
        j2000JD: number;
        julianCenturyDays: number;
        sunMeanLongitudeJ2000Deg: number;
        perihelionLongitudeJ2000Deg: number;
        eccentricityJ2000: number;
        eccentricityDotJ2000: number;
        d5RateLDegPerDay: number;
        d5RatePeriDegPerDay: number;
        speedOfLight: number;
    };
    fns: {
        computeObliquityEarth: (year: number) => number;
        getAuDistanceKm: () => number;
        isFrameworkNative: () => boolean;
        getCorrectionResidual: () => (MoonCorrectionTable | null);
        getCorrectionLegacy: () => (MoonCorrectionTable | null);
    };
}): {
    sunGeoVecEqD5: (jd: number) => [number, number, number];
    moonAberrationRaDec: (jd: number, ra: number, dec: number) => {
        dRA: number;
        dDec: number;
    };
    overrideRaDec: ({ lonDeg, betRad, meeusT, obliquityDeg }: {
        lonDeg: number;
        betRad: number;
        meeusT: (number | undefined);
        obliquityDeg: number;
    }) => {
        raRad: number;
        decRad: number;
    };
};

export type DerivedCoefs = {
    lincoef: number;
    h0: number;
    h1: number;
};
export type EccTerm = {
    order: number;
    sin: number;
    cos: number;
};
export type JointTerm = {
    order: number;
    div: number;
    sin: number;
    cos: number;
};
/** @typedef {{ lincoef: number, h0: number, h1: number }} DerivedCoefs */
/** @typedef {{ order: number, sin: number, cos: number }} EccTerm */
/** @typedef {{ order: number, div: number, sin: number, cos: number }} JointTerm */
/**
 * @param {{
 *   isDeepTime: () => boolean,
 *   constants: {
 *     anchors: Record<string, number>,
 *     harmonics: Record<string, Array<[number, number, number]>>,
 *     eccTerms: (Record<string, EccTerm[]> | null),
 *     jointTerms: ({ terms: JointTerm[] } | null),
 *     derived: (DerivedCoefs | null),
 *     tropicalHarmonics: Array<[number, number, number]>,
 *     balancedYear: number,
 *     meanSolarYearDays: number,
 *     hJ2000: number,
 *     tiltMeanDeg: number,
 *     raAngleDeg: number,
 *     inclAmplitudeDeg: number,
 *   },
 *   fns: {
 *     cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *     analyticTropicalDays: (year: number) => (number | null),
 *     meanHAtAgeMa: (tMa: number) => (number | null),
 *     meanYearRealLodDays: (tMa: number) => (number | null),
 *     eccentricityAt: (year: number) => number,
 *     eccentricityRateAt: (year: number) => number,
 *   },
 * }} deps
 */
export function createCardinalModel({ isDeepTime, constants, fns }: {
    isDeepTime: () => boolean;
    constants: {
        anchors: Record<string, number>;
        harmonics: Record<string, Array<[number, number, number]>>;
        eccTerms: (Record<string, EccTerm[]> | null);
        jointTerms: ({
            terms: JointTerm[];
        } | null);
        derived: (DerivedCoefs | null);
        tropicalHarmonics: Array<[number, number, number]>;
        balancedYear: number;
        meanSolarYearDays: number;
        hJ2000: number;
        tiltMeanDeg: number;
        raAngleDeg: number;
        inclAmplitudeDeg: number;
    };
    fns: {
        cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null);
        analyticTropicalDays: (year: number) => (number | null);
        meanHAtAgeMa: (tMa: number) => (number | null);
        meanYearRealLodDays: (tMa: number) => (number | null);
        eccentricityAt: (year: number) => number;
        eccentricityRateAt: (year: number) => number;
    };
}): {
    computeSolsticeJD: (year: number, type?: string) => number;
    computeSolsticeYearLength: (year: number, type?: string) => number;
    computeSolsticeRA: (year: number, type?: string) => number;
    computeTropicalYearLength: (year: number) => number;
};
/** @type {Record<string, number>} */
export const JOINT_LAMBDA: Record<string, number>;

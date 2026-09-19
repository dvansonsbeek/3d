/**
 * @param {{
 *   holisticHAtAgeMa: (tMa: number) => (number | null),
 *   tableAnchorYear: number,
 *   driftRefYear: number,
 *   hJ2000: number,
 *   yearMin?: number,
 *   yearMax?: number,
 *   stepYears?: number,
 * }} cfg — holisticHAtAgeMa MUST be the lattice-α form; tableAnchorYear is
 *   startmodelYear (2000.5, table zero + t_Ma convention); driftRefYear is
 *   startModelYearWithCorrection (the R3 drift anchor); hJ2000 the snapshot
 *   rate the drift compares against; 10-kyr cells match both engines'
 *   historic tables.
 */
export function createPhaseMachinery({ holisticHAtAgeMa, tableAnchorYear, driftRefYear, hJ2000, yearMin, yearMax, stepYears, }: {
    holisticHAtAgeMa: (tMa: number) => (number | null);
    tableAnchorYear: number;
    driftRefYear: number;
    hJ2000: number;
    yearMin?: number;
    yearMax?: number;
    stepYears?: number;
}): {
    ensureTable: () => void;
    cumulAtYear: (year: number) => number | null;
    integralBetween: (yearA: number, yearB: number) => number | null;
    j2000Drift: (yearA: number) => number;
    cyclesBetween: (yearA: number, yearB: number, divisorN: number) => number | null;
    yearAtCumul: (targetCumul: number) => number | null;
    grid: () => {
        yearMin: number;
        yearMax: number;
        stepYears: number;
        j2000Idx: number;
        length: number;
    };
};

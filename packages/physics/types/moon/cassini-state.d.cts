export type CassiniReading = {
    kappaBand?: boolean;
    hydrostaticRadiusRe?: number | "frozen";
};
export type CassiniRaw = {
    ageMa: number;
    aOverEarthRadii: number;
    nRadPerYr: number;
    nodeRateRadPerYr: number;
    inclinationDeg: number;
    figure: {
        cMinusAOverC: number;
        bMinusAOverC: number;
    };
    state1Deg: number | null;
    state2Deg: number | null;
    state3Deg: number | null;
    state4Deg: number | null;
};
/** The Moon's figure (cited) and the hydrostatic radius's two readings. */
export const CASSINI_FIGURE: Readonly<{
    cMinusAOverC: 0.00063;
    bMinusAOverC: 0.000228;
    hydrostaticRadiusEarthRadii: 15;
    hydrostaticRadiusBandEarthRadii: 21;
    sources: "Peale 1969 (AJ 74, 483); Ward 1975 (Science 189, 377); Yoder 1995; Williams et al. 2001, 2014; Ćuk, Hamilton & Stewart 2021 (PSJ 2, 221)";
}>;
/**
 * The figure's moment differences at a distance under a reading: hydrostatic (∝ a⁻³) inside the hydrostatic radius,
 * today's values beyond; `frozen` keeps today's values everywhere (Ward's assumption — measured to fail early).
 * @param {number} aOverEarthRadii @param {number | 'frozen'} hydrostaticRadiusRe
 */
export function figureAtDistance(aOverEarthRadii: number, hydrostaticRadiusRe: number | "frozen"): {
    cMinusAOverC: number;
    bMinusAOverC: number;
};
/**
 * Every root θ (radians) of the Cassini equation on (−π, π]: a sign scan at 0.05° and bisection to 1e-13.
 * @param {number} nRadPerYr @param {number} nodeRateRadPerYr  signed (< 0 for a regression) @param {number} inclinationRad
 * @param {{cMinusAOverC: number, bMinusAOverC: number}} figure
 * @returns {number[]}
 */
export function cassiniEquationRoots(nRadPerYr: number, nodeRateRadPerYr: number, inclinationRad: number, figure: {
    cMinusAOverC: number;
    bMinusAOverC: number;
}): number[];
/**
 * The roots named: state 1 (θ > i, the spin axis beyond the orbit normal, prograde — the lowest such root), state 4
 * (its unstable partner, the highest root below 90° + i), state 2 (θ < 0, |θ| < 90°: the spin axis on the far side of
 * the pole — the one nearest the pole), state 3 (retrograde, |θ| > 90°). Radians; null where absent.
 * @param {number[]} roots @param {number} inclinationRad
 */
export function classifyCassiniStates(roots: number[], inclinationRad: number): {
    state1: number | null;
    state4: number | null;
    state2: number | null;
    state3: number | null;
};
/** @typedef {{ kappaBand?: boolean, hydrostaticRadiusRe?: number | 'frozen' }} CassiniReading */
/** @typedef {{ ageMa: number, aOverEarthRadii: number, nRadPerYr: number, nodeRateRadPerYr: number, inclinationDeg: number, figure: {cMinusAOverC: number, bMinusAOverC: number}, state1Deg: number | null, state2Deg: number | null, state3Deg: number | null, state4Deg: number | null }} CassiniRaw */
/**
 * @param {object} deps
 * @param {{ gmEarthMoonM3S2: number, earthRadiusMetres: number, moonInclinationJ2000Deg: number, moonObliquityEclipticJ2000Deg: number }} deps.constants
 *   the Earth–Moon GM, the Earth's radius, the Moon's J2000 inclination (the free inclination's anchor) and the
 *   MEASURED spin-to-ecliptic obliquity 1.5424° (the shipped value's anchor)
 * @param {{ moonDistanceMetresAtAge: (tMa: number) => number | null, lunarNodePeriodSecondsAtAge: (tMa: number) => number | null, freeInclinationDegAtAge: (tMa: number) => number | null, freeInclinationBandDegAtAge: (tMa: number) => number | null }} deps.fns
 *   the chain's readers of date (the cited distance, the regime's node period, the free inclination and its band)
 */
export function createCassiniState({ constants: K, fns }: {
    constants: {
        gmEarthMoonM3S2: number;
        earthRadiusMetres: number;
        moonInclinationJ2000Deg: number;
        moonObliquityEclipticJ2000Deg: number;
    };
    fns: {
        moonDistanceMetresAtAge: (tMa: number) => number | null;
        lunarNodePeriodSecondsAtAge: (tMa: number) => number | null;
        freeInclinationDegAtAge: (tMa: number) => number | null;
        freeInclinationBandDegAtAge: (tMa: number) => number | null;
    };
}): {
    stateAtAge: (tMa: number, reading?: CassiniReading) => {
        ageMa: number;
        aOverEarthRadii: number;
        state: number;
        thetaDeg: number;
        inclinationDeg: number;
        obliquityToOrbitEqDeg: number;
        obliquityToOrbitDeg: number;
        obliquityToLaplacePoleDeg: number;
        anchorScale: number;
        transition: {
            aOverEarthRadii: number;
            ageMa: number;
            lastState1Deg: number;
            state2Deg: number;
        } | null;
        nodePeriodYears: number;
    } | null;
    bandAtAge: (tMa: number) => {
        shipped: {
            ageMa: number;
            aOverEarthRadii: number;
            state: number;
            thetaDeg: number;
            inclinationDeg: number;
            obliquityToOrbitEqDeg: number;
            obliquityToOrbitDeg: number;
            obliquityToLaplacePoleDeg: number;
            anchorScale: number;
            transition: {
                aOverEarthRadii: number;
                ageMa: number;
                lastState1Deg: number;
                state2Deg: number;
            } | null;
            nodePeriodYears: number;
        } | null;
        readings: {
            name: string;
            state: {
                ageMa: number;
                aOverEarthRadii: number;
                state: number;
                thetaDeg: number;
                inclinationDeg: number;
                obliquityToOrbitEqDeg: number;
                obliquityToOrbitDeg: number;
                obliquityToLaplacePoleDeg: number;
                anchorScale: number;
                transition: {
                    aOverEarthRadii: number;
                    ageMa: number;
                    lastState1Deg: number;
                    state2Deg: number;
                } | null;
                nodePeriodYears: number;
            } | null;
        }[];
        minObliquityToOrbitDeg: number | null;
        maxObliquityToOrbitDeg: number | null;
    };
    transition: (reading?: CassiniReading) => {
        aOverEarthRadii: number;
        ageMa: number;
        lastState1Deg: number;
        state2Deg: number;
    } | null;
    rawAtAge: (tMa: number, reading?: CassiniReading) => CassiniRaw | null;
    figure: Readonly<{
        cMinusAOverC: 0.00063;
        bMinusAOverC: 0.000228;
        hydrostaticRadiusEarthRadii: 15;
        hydrostaticRadiusBandEarthRadii: 21;
        sources: "Peale 1969 (AJ 74, 483); Ward 1975 (Science 189, 377); Yoder 1995; Williams et al. 2001, 2014; Ćuk, Hamilton & Stewart 2021 (PSJ 2, 221)";
    }>;
    edgeMa: number;
};

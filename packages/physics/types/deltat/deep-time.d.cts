export type DeepTimeLodConstants = {
    /**
     * - Earth–Moon total angular momentum
     */
    lTotalEmKgm2S: number;
    mMoonAloneKg: number;
    mEarthAloneKg: number;
    rEarthMetres: number;
    /**
     * - GM of the Earth–Moon system
     */
    gmEmM3PerS2: number;
    /**
     * - √(1−e²) factor of the lunar orbit
     */
    eFactorMoon: number;
    /**
     * - tidal-lock distance (LOD denominator → 0)
     */
    aLockMetres: number;
    /**
     * - Farhat polynomial anchor
     */
    aMoonNowMetres: number;
    alpha1PerMa: number;
    alpha3PerMa3: number;
    alpha4PerMa4: number;
    holisticYearJ2000: number;
    /**
     * - the H/13-identity mean LOD at J2000
     */
    lodNowH13Seconds: number;
    meanSiderealYearJ2000Seconds: number;
    solarMassLossFracPerYear: number;
    /**
     * - Actual-LOD numerator
     */
    siderealYearDaysKinematicJ2000: number;
};
export type DeepTimeLodDeps = {
    constants: DeepTimeLodConstants;
    moonDistanceMetresAtAge: (tMa: number) => number;
    /**
     * - GIA α(t)
     */
    moiFactorAtAge: (tMa: number) => number;
    siderealYearDaysFourierAt: (year: number) => number;
    /**
     * - gated δLOD sum (incl. swing)
     */
    cycleLodSumAt: (year: number) => number;
    /**
     * - gated swing δLOD alone
     */
    swingLodAt: (year: number) => number;
    /**
     * - gated analytic swing rate
     */
    swingLodRateAt: (year: number) => number;
    /**
     * - OPTIONAL time-dependent
     * Earth-Moon angular momentum (the Driver-1½ solar channels,
     * recession-history.cjs). Absent → the J2000 constant, which the budget
     * module equals exactly for t ≤ jointMa — the pure-twin convention.
     */
    lEmAtAgeKgm2S?: ((tMa: number) => number) | undefined;
};
/**
 * @typedef {Object} DeepTimeLodConstants
 * @property {number} lTotalEmKgm2S - Earth–Moon total angular momentum
 * @property {number} mMoonAloneKg
 * @property {number} mEarthAloneKg
 * @property {number} rEarthMetres
 * @property {number} gmEmM3PerS2 - GM of the Earth–Moon system
 * @property {number} eFactorMoon - √(1−e²) factor of the lunar orbit
 * @property {number} aLockMetres - tidal-lock distance (LOD denominator → 0)
 * @property {number} aMoonNowMetres - Farhat polynomial anchor
 * @property {number} alpha1PerMa @property {number} alpha3PerMa3
 * @property {number} alpha4PerMa4
 * @property {number} holisticYearJ2000
 * @property {number} lodNowH13Seconds - the H/13-identity mean LOD at J2000
 * @property {number} meanSiderealYearJ2000Seconds
 * @property {number} solarMassLossFracPerYear
 * @property {number} siderealYearDaysKinematicJ2000 - Actual-LOD numerator
 */
/**
 * @typedef {Object} DeepTimeLodDeps
 * @property {DeepTimeLodConstants} constants
 * @property {(tMa: number) => number} moonDistanceMetresAtAge
 * @property {(tMa: number) => number} moiFactorAtAge - GIA α(t)
 * @property {(year: number) => number} siderealYearDaysFourierAt
 * @property {(year: number) => number} cycleLodSumAt - gated δLOD sum (incl. swing)
 * @property {(year: number) => number} swingLodAt - gated swing δLOD alone
 * @property {(year: number) => number} swingLodRateAt - gated analytic swing rate
 * @property {(tMa: number) => number} [lEmAtAgeKgm2S] - OPTIONAL time-dependent
 *   Earth-Moon angular momentum (the Driver-1½ solar channels,
 *   recession-history.cjs). Absent → the J2000 constant, which the budget
 *   module equals exactly for t ≤ jointMa — the pure-twin convention.
 */
/** @param {DeepTimeLodDeps} deps */
export function createDeepTimeLod(deps: DeepTimeLodDeps): {
    lodSecondsAtAge: (t_Ma: number) => number | null;
    lodSecondsAtAgeWithAlpha: (t_Ma: number, alpha: number) => number | null;
    lodHoursAtAge: (t_Ma: number) => number | null;
    hAtAge: (t_Ma: number) => number | null;
    siderealYearSecondsAtAge: (t_Ma: number) => number;
    tropicalYearSecondsAtAge: (t_Ma: number) => number;
    tropicalYearDaysAtAge: (t_Ma: number) => number | null;
    yearInDaysAtAge: (t_Ma: number) => number | null;
    deltaTRawSecondsAtAge: (t_Ma: number) => number;
    lodSecondsWithCorrectionsAtAge: (t_Ma: number) => number | null;
    lodSecondsActualAtAge: (t_Ma: number) => number | null;
    dLodDtDecompositionAtAge: (t_Ma: number) => {
        tidal: number | null;
        gia: number | null;
        stack: number | null;
        resonator: number | null;
        net_L2: number | null;
        net_L3: number | null;
        net_L4: number | null;
    };
};

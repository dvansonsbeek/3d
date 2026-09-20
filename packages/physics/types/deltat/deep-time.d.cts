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
    /**
     * - f_S, the solar fraction of the J2000
     * precession torque (derive-params) — the unit H(t) = 13·T_p,composed needs it
     */
    precessionSolarShareJ2000: number;
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
     * - the model's DERIVED
     * J2000 axial precession period: the certified year-length laws' beat at
     * 2000, sid/(sid − trop) ≈ 25,771.4 yr (plan 06 S5 — one J2000 precession
     * reading; the same anchor the hybrid obliquity self-anchors on). Read
     * LAZILY on the first composed-rate use, never at construction: every
     * runtime's year laws read THIS factory's bases.
     */
    precessionPeriodJ2000YearsFn: () => number;
    /**
     * - the period of Earth's orbit
     * plane's nodal regression on the invariable plane, 1,296,000/|s₃| with s₃
     * the dominant ζ mode of the banked deep secular modes (≈ 68,751 yr). An
     * ORBITAL quantity (μ-tier: it does not follow Earth's spin), the reference
     * the solar day's "ecliptic missing motion" term rides (plan 06 T2 item —
     * formerly the spin unit's H/5, 67,063 yr, 2.5 % off and scaling with the
     * spin at deep time). Lazy, like the precession anchor.
     */
    nodalPeriodYearsFn: () => number;
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
 * @property {number} precessionSolarShareJ2000 - f_S, the solar fraction of the J2000
 *   precession torque (derive-params) — the unit H(t) = 13·T_p,composed needs it
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
 * @property {() => number} precessionPeriodJ2000YearsFn - the model's DERIVED
 *   J2000 axial precession period: the certified year-length laws' beat at
 *   2000, sid/(sid − trop) ≈ 25,771.4 yr (plan 06 S5 — one J2000 precession
 *   reading; the same anchor the hybrid obliquity self-anchors on). Read
 *   LAZILY on the first composed-rate use, never at construction: every
 *   runtime's year laws read THIS factory's bases.
 * @property {() => number} nodalPeriodYearsFn - the period of Earth's orbit
 *   plane's nodal regression on the invariable plane, 1,296,000/|s₃| with s₃
 *   the dominant ζ mode of the banked deep secular modes (≈ 68,751 yr). An
 *   ORBITAL quantity (μ-tier: it does not follow Earth's spin), the reference
 *   the solar day's "ecliptic missing motion" term rides (plan 06 T2 item —
 *   formerly the spin unit's H/5, 67,063 yr, 2.5 % off and scaling with the
 *   spin at deep time). Lazy, like the precession anchor.
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
    lunisolarPrecessionRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
    lunisolarPrecessionPeriodYearsAtAge: (t_Ma: number) => number | null;
    lunarTorqueFactorAtAge: (tMa: number) => (number | null);
    precessionTorqueTermAtAge: (tMa: number) => (number | null);
    siderealYearSecondsAtAge: (t_Ma: number) => number;
    tropicalYearSecondsAtAge: (t_Ma: number) => number;
    tropicalYearDaysAtAge: (t_Ma: number) => number | null;
    eclipticLodCorrectionSecondsAtAge: (t_Ma: number) => number | null;
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
    eraClockHAtAge: (t_Ma: number) => number | null;
    eraClockTropicalYearSecondsAtAge: (t_Ma: number) => number;
    eraClockYearInDaysAtAge: (t_Ma: number) => number | null;
};

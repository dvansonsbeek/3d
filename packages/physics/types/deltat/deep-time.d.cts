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
    /**
     * - the LLR recession rate (the J2000 slope of the cited history)
     */
    alpha1PerMa: number;
    /**
     * - ω₀, the J2000 day length (the SI day since plan 09; identifier kept)
     */
    lodNowH13Seconds: number;
    meanSiderealYearJ2000Seconds: number;
    solarMassLossFracPerYear: number;
    /**
     * - f_S, the solar fraction of the J2000
     * precession torque (derive-params) — the unit H(t) = 13·T_p,composed needs it
     */
    precessionSolarShareJ2000: number;
};
export type DeepTimeLodDeps = {
    constants: DeepTimeLodConstants;
    /**
     * - null beyond the cited history's span
     */
    moonDistanceMetresAtAge: (tMa: number) => number | null;
    /**
     * - GIA α(t)
     */
    moiFactorAtAge: (tMa: number) => number;
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
     * Earth-Moon angular momentum. Absent → the J2000 constant: conservation
     * (plan 12 option A — the Driver-1½ solar-channel budget is deleted;
     * measured: conservation on the cited history reproduces Farhat's own LOD
     * to 0.01 h at 100 Ma, 0.14 h at 2.46 Ga).
     */
    lEmAtAgeKgm2S?: ((tMa: number) => number) | undefined;
    /**
     * -
     * OPTIONAL analytic slope of the distance history (metres per Ma, positive
     * into the past means a growing a... sign as da/dt_Ma); absent → a central
     * difference on moonDistanceMetresAtAge (the LOD-rate decomposition's tidal term).
     */
    moonDistanceSlopeMetresPerMaAtAge?: ((tMa: number) => number | null) | undefined;
    /**
     * -
     * OPTIONAL cos ε̄(t)/cos ε̄(0) of the cited mean obliquity (earth/mean-
     * obliquity-history) — the factor the precession RATE of date carries on the
     * constant (plan 12 §8 option (a)); absent → 1, the constant alone, bit-identical.
     */
    meanObliquityCosRatioAtAge?: ((tMa: number) => number | null) | undefined;
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
 * @property {number} alpha1PerMa - the LLR recession rate (the J2000 slope of the cited history)
 * @property {number} lodNowH13Seconds - ω₀, the J2000 day length (the SI day since plan 09; identifier kept)
 * @property {number} meanSiderealYearJ2000Seconds
 * @property {number} solarMassLossFracPerYear
 * @property {number} precessionSolarShareJ2000 - f_S, the solar fraction of the J2000
 *   precession torque (derive-params) — the unit H(t) = 13·T_p,composed needs it
 */
/**
 * @typedef {Object} DeepTimeLodDeps
 * @property {DeepTimeLodConstants} constants
 * @property {(tMa: number) => number|null} moonDistanceMetresAtAge - null beyond the cited history's span
 * @property {(tMa: number) => number} moiFactorAtAge - GIA α(t)
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
 *   Earth-Moon angular momentum. Absent → the J2000 constant: conservation
 *   (plan 12 option A — the Driver-1½ solar-channel budget is deleted;
 *   measured: conservation on the cited history reproduces Farhat's own LOD
 *   to 0.01 h at 100 Ma, 0.14 h at 2.46 Ga).
 * @property {(tMa: number) => number|null} [moonDistanceSlopeMetresPerMaAtAge] -
 *   OPTIONAL analytic slope of the distance history (metres per Ma, positive
 *   into the past means a growing a... sign as da/dt_Ma); absent → a central
 *   difference on moonDistanceMetresAtAge (the LOD-rate decomposition's tidal term).
 * @property {(tMa: number) => number|null} [meanObliquityCosRatioAtAge] -
 *   OPTIONAL cos ε̄(t)/cos ε̄(0) of the cited mean obliquity (earth/mean-
 *   obliquity-history) — the factor the precession RATE of date carries on the
 *   constant (plan 12 §8 option (a)); absent → 1, the constant alone, bit-identical.
 */
/** @param {DeepTimeLodDeps} deps */
export function createDeepTimeLod(deps: DeepTimeLodDeps): {
    lodSecondsAtAge: (t_Ma: number) => number | null;
    lodSecondsAtAgeWithAlpha: (t_Ma: number, alpha: number) => number | null;
    lodHoursAtAge: (t_Ma: number) => number | null;
    lunisolarPrecessionRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
    lunisolarPrecessionPeriodYearsAtAge: (t_Ma: number) => number | null;
    lunisolarTorqueRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
    lunisolarTorquePeriodYearsAtAge: (t_Ma: number) => number | null;
    precessionObliquityFactorAtAge: (t_Ma: number) => number | null;
    lunarTorqueFactorAtAge: (tMa: number) => (number | null);
    precessionTorqueTermAtAge: (tMa: number) => (number | null);
    siderealYearSecondsAtAge: (t_Ma: number) => number;
    tropicalYearSecondsAtAge: (t_Ma: number) => number;
    tropicalYearDaysAtAge: (t_Ma: number) => number | null;
    tropicalYearSecondsFromLod: (t_Ma: number, LOD_s: number | null) => number;
    eclipticLodCorrectionSecondsAtAge: (t_Ma: number) => number | null;
    yearInDaysAtAge: (t_Ma: number) => number | null;
    deltaTRawSecondsAtAge: (t_Ma: number) => number;
    lodSecondsWithCorrectionsAtAge: (t_Ma: number) => number | null;
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

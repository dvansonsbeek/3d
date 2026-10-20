export function createEpochPrimitives({ params: p, alphaAtAgeMa, moonDistanceMetresAtAge, meanObliquityCosRatioAtAge }: {
    params: EpochParams;
    alphaAtAgeMa: (tMa: number) => number;
    moonDistanceMetresAtAge: (tMa: number) => number | null;
    meanObliquityCosRatioAtAge?: (tMa: number) => number | null;
}): EpochPrimitives;
export type EpochParams = {
    /**
     * year at t_Ma = 0 (2000, NOT startmodelYear)
     */
    epochYear: number;
    /**
     * Moon recession, LLR-anchored (the J2000 slope of the cited history)
     */
    alpha1PerMa: number;
    /**
     * a_Moon at J2000, metres
     */
    moonDistanceNowM: number;
    /**
     * tidal-lock asymptote, metres
     */
    moonLockDistanceM: number;
    /**
     * L_tot of the Earth-Moon system
     */
    totalAngularMomentumKgM2S: number;
    moonMassKg: number;
    gmEarthMoonM3S2: number;
    /**
     * sqrt(1 - e^2)
     */
    moonEccentricityFactor: number;
    earthMassKg: number;
    earthRadiusM: number;
    lodNowH13Seconds: number;
    siderealYearJ2000Seconds: number;
    solarMassLossFracPerYear: number;
    /**
     * f_S, the solar fraction of the J2000 precession torque
     */
    precessionSolarShareJ2000: number;
    /**
     * p₀, the composed precession rate's J2000 anchor (1,296,000/axial0)
     */
    precessionRateJ2000ArcsecPerYr: number;
};
export type EpochPrimitives = {
    tMa: (year: number) => number;
    /**
     * - null beyond the cited history's span
     */
    moonDistanceMetres: (year: number) => number | null;
    lodSeconds: (year: number) => number | null;
    siderealYearSeconds: (year: number) => number;
    /**
     * sidereal less one equinox turn per T_p(t) (the composed precession period on the RATE of date)
     */
    tropicalYearSeconds: (year: number) => number;
};

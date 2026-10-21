/**
 * RESEARCH OVERRIDES for Earth's orbit laws (doc 109 §7): an alternative e(t), de/dt(t) and
 * ϖ_of-date(t) flow through every consumer (the eclipse Sun, the Moon's E-factor, the cardinal
 * points) exactly as the shipped laws do. `{}` = the shipped laws. Not a counterfactual in the §2d
 * sense (no hash change) — callers must say when they used it; the generators refuse to --write
 * under an override.
 */
export type Laws = {
    eccentricityAt?: (year: number) => number;
    eccentricityRateAt?: (year: number) => number;
    perihelionLongitudeDegAt?: (year: number) => number;
};
/**
 * `giaEllipticityOfDate: false` builds the one-source history WITHOUT the J₂(t)/J₂₀ factor of date
 * (the ice-driven GIA channel, which rides the climate formula's own post-MPT layer): the orbital
 * FORCING alone. The T1 exporter derives the climate lines' obliquity rate on it, so the lines
 * cannot depend on their own fit (v23.0; measured 3e-5 of the rate, 2–3 yr of period). Default true =
 * the shipped physics.
 */
export type Options = {
    giaEllipticityOfDate?: boolean;
};
/**
 * The forward bindings — what an early slice reads at call time from a later one. Typed by the
 * members actually read, so the composer's assignment is checked against each owner's surface.
 */
export type LateBindings = {
    /**
     * owner: year-day-lengths — read by deep-time-chain
     */
    certifiedAxialPrecessionJ2000Years: () => number;
    /**
     * owner: one-source-movement — read by deep-time-chain and earth-scalars
     */
    oneSourceM: {
        epsAt(year: number): number;
        eAt(year: number): number;
        periOfDateDegAt(year: number): number;
        precessionOfDateFactorsAt(year: number): {
            solarTorque: number;
            ellipticity: number;
        };
        axialPrecessionYearsLunisolarJ2000: number;
    };
    /**
     * owner: one-source-movement — read by year-day-lengths
     */
    yearLengthsM: {
        anomalisticYearSecondsAtYear(year: number): number;
    };
    /**
     * owner: sun-and-eclipses — read by lunar-theory (the arguments' Sun)
     */
    sunMeanLongitudeDegAt: (year: number) => number;
    /**
     * owner: published-periods — read by lunar-theory (the dynamical rate of date)
     */
    publishedAxialPrecessionYearsAtYear: (year: number) => number;
    /**
     * owner: published-periods — read by year-day-lengths
     */
    publishedSiderealYearSecondsAtYear: (year: number) => number;
    /**
     * owner: cardinal-instants — read by sun-and-eclipses (the besselian's apparent Sun)
     */
    sunAberrationArcsecAt: (year: number) => number;
};
/**
 * The composer's inputs — the first slice's context.
 */
export type ModelInputs = {
    /**
     * the frozen constants context
     */
    C: Readonly<Record<string, any>>;
    /**
     * the fitted coefficients
     */
    F: Readonly<Record<string, any>>;
    laws: Laws;
    /**
     * the governed N-body secular series (the API/Node path; null for the bare package)
     */
    secularSeriesArtifact: any;
    options: Options;
    late: LateBindings;
};

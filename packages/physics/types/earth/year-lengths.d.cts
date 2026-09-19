/**
 * @param {{
 *   sampleAt: (year: number) => {e: number, periOfDateDeg: number, equinoxLonJ2000Deg: number},
 *   massLossSiderealSecondsAtYearFn: (year: number) => number,
 *   apsidalSecularDegPerYrFn?: (year: number) => number,
 * }} opts
 *   sampleAt: the one-source movement sampler, calendar-year keyed
 *   (createDeepOrbitalHistory build().at wrapped by the caller — series
 *   tier where the artifact is available, mode tail beyond).
 *   massLossSiderealSecondsAtYearFn: the caller's secular mass-loss
 *   sidereal-year law, SI seconds, IAU-anchored at J2000.
 *   apsidalSecularDegPerYrFn: the chain's SECULAR apsidal tangent of date
 *   (keplerian-chain computeApsidalSecularDegPerYr for Earth — deg/yr,
 *   J2000-ecliptic frame). When given, the anomalistic year is the
 *   mean-element construction on this smooth rate; when absent, it falls
 *   back to the cardinal structure's measured year-over-year interval
 *   (which carries the banked series' century-scale ϖ̇ wobble).
 */
export function createYearLengths({ sampleAt, massLossSiderealSecondsAtYearFn, apsidalSecularDegPerYrFn }: {
    sampleAt: (year: number) => {
        e: number;
        periOfDateDeg: number;
        equinoxLonJ2000Deg: number;
    };
    massLossSiderealSecondsAtYearFn: (year: number) => number;
    apsidalSecularDegPerYrFn?: (year: number) => number;
}): Readonly<{
    /** Mean tropical year of date, SI seconds. @param {number} year */
    tropicalYearSecondsAtYear: (year: number) => number;
    /** Sidereal year of date, SI seconds. @param {number} year */
    siderealYearSecondsAtYear: (year: number) => number;
    /** Anomalistic year of date, SI seconds. @param {number} year */
    anomalisticYearSecondsAtYear: (year: number) => number;
    /** Axial precession period of date (equinox regression beat), years. @param {number} y */
    axialPrecessionYearsAtYear: (y: number) => number;
    /** Perihelion (apsidal-vs-equinox) precession period of date, years. @param {number} y */
    perihelionPrecessionYearsAtYear: (y: number) => number;
    /** Apsidal precession period of date vs the fixed stars, years (hypersensitive: ±1 s ↔ ≈400 yr; the identifier keeps the historical "inclination" name). @param {number} y */
    inclinationPrecessionYearsAtYear: (y: number) => number;
    /** The per-cardinal layer (D6 rules: year lengths λ̇-corrected; offsets/spreads raw — μs-class/second-order there). */
    cardinal: Readonly<{
        /** @param {number} y @param {'VE'|'SS'|'AE'|'WS'} type */
        yearLengthSeconds: (y: number, type: "VE" | "SS" | "AE" | "WS") => number;
        /** @param {number} y @param {'VE'|'SS'|'AE'|'WS'} type */
        eocOffsetSeconds: (y: number, type: "VE" | "SS" | "AE" | "WS") => number;
        /** @param {number} y */
        spreadSeconds: (y: number) => {
            VE: number;
            SS: number;
            AE: number;
            WS: number;
            meanSeconds: number;
        };
    }>;
    /** The planetary λ̇ ratio (diagnostic; ≡1 at J2000). */
    planetaryRelAtYear: (year: number) => number;
}>;

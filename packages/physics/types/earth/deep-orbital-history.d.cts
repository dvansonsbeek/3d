/**
 * @param {{
 *   zModes: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   zetaModes: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   zetaSeries?: {t0Yr: number, stepYr: number,
 *                 q: ReadonlyArray<number>, p: ReadonlyArray<number>},
 *   zSeries?: {t0Yr: number, stepYr: number,
 *              q: ReadonlyArray<number>, p: ReadonlyArray<number>},
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 *   anchorInclEclipticDeg: number,
 *   anchorAscNodeEclipticDeg: number,
 *   axialPrecessionYearsJ2000: number,
 *   obliquityJ2000Deg: number,
 *   axialPrecessionYearsAtYearFn?: (year: number) => number,
 *   solarTorqueShareJ2000?: number,
 *   dynamicalEllipticityRatioAtYearFn?: (year: number) => number,
 * }} deps — mode tables from the governed deep artifact (choose the ζ tier
 *   per consumer: era = its own 8-term extraction, deep = the 16-term
 *   table; NEVER a slice); anchors from the chain artifact's one home; the
 *   axial-precession years and ε₀ from the injecting engine's certified
 *   surfaces. zetaSeries (C-2, the ONE-SOURCE evaluator): the BANKED engine
 *   ζ series (data/nbody-earth-zeta-series.json) — when supplied, n̂(t)
 *   reads the series itself inside its span (no mode extraction, no tiers;
 *   measured at the 500-yr artifact cadence: 0.16″/0.18″ rms vs IAU-2006
 *   over 1900–2100/1600–2400 vs the era tier's 0.31″/0.63″, and 0.0396°
 *   vs La2004 over −200 kyr vs the deep tier's 0.069° — the C-1 verdict,
 *   plan 02) and zetaModes serves only as the TAIL beyond the span (the
 *   seam at the span edge is the extraction residual, far outside every
 *   certified window). solarTorqueShareJ2000 and
 *   dynamicalEllipticityRatioAtYearFn: THE PRECESSION OF DATE — the two
 *   factors on the precession constant (see alphaAtGeneral below); absent,
 *   the constant is the secular law alone, bit-identical.
 */
export function createDeepOrbitalHistory({ zModes, zetaModes, zetaSeries, zSeries, anchorE, anchorPeriEclipticDeg, anchorInclEclipticDeg, anchorAscNodeEclipticDeg, axialPrecessionYearsJ2000, obliquityJ2000Deg, axialPrecessionYearsAtYearFn, solarTorqueShareJ2000, dynamicalEllipticityRatioAtYearFn, }: {
    zModes: ReadonlyArray<{
        omegaRadPerYr: number;
        re: number;
        im: number;
    }>;
    zetaModes: ReadonlyArray<{
        omegaRadPerYr: number;
        re: number;
        im: number;
    }>;
    zetaSeries?: {
        t0Yr: number;
        stepYr: number;
        q: ReadonlyArray<number>;
        p: ReadonlyArray<number>;
    };
    zSeries?: {
        t0Yr: number;
        stepYr: number;
        q: ReadonlyArray<number>;
        p: ReadonlyArray<number>;
    };
    anchorE: number;
    anchorPeriEclipticDeg: number;
    anchorInclEclipticDeg: number;
    anchorAscNodeEclipticDeg: number;
    axialPrecessionYearsJ2000: number;
    obliquityJ2000Deg: number;
    axialPrecessionYearsAtYearFn?: (year: number) => number;
    solarTorqueShareJ2000?: number;
    dynamicalEllipticityRatioAtYearFn?: (year: number) => number;
}): {
    build: (t0Yr: number, t1Yr: number, stepYr: number) => {
        /** @param {number} tYr */
        at(tYr: number): {
            epsDeg: number;
            e: number;
            periOfDateDeg: number;
            periOfDateRateDegPerYr: number;
            eSinPeri: number;
            eCosPeri: number;
            inclEclDeg: number;
            orbitNormalX: number;
            orbitNormalY: number;
            equinoxLonJ2000Deg: number;
            equinoxLonRateDegPerYr: number;
            generalPrecessionLonDeg: number;
            generalPrecessionLonRateDegPerYr: number;
        };
    };
    alphaArcsecPerYr: number;
    alphaLunisolarArcsecPerYr: number;
    axialPrecessionYearsLunisolarJ2000: number;
    /** THE PRECESSION OF DATE — the two factors this integration applies to
     *  the secular precession constant at t years from J2000 (both 1 at
     *  t = 0; both 1 everywhere when the options are absent). ONE home for
     *  the published surface and the docs.
     *  @param {number} t @returns {{solarTorque: number, ellipticity: number}} */
    precessionOfDateFactorsAt: (t: number) => {
        solarTorque: number;
        ellipticity: number;
    };
};

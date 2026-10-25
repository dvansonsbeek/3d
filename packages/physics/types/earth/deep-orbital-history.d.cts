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
 *   plan 02) and zetaModes serves only as the TAIL beyond the span, joined
 *   to the series at each edge so n̂ is continuous there (plan 12 §8.3 — the
 *   J2000-point anchor left a 1.6° step at −10 Myr that kicked the hybrid's
 *   mean obliquity +0.9° for the whole tail; far outside every certified window).
 *   solarTorqueShareJ2000 and
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
/**
 * The CO-ROTATING anchored mode sum — the z-side evaluator of the history
 * (the ϖ̇ fix, measured): the plain DC anchor residual is a spurious
 * zero-frequency mode that preserves the J2000 VALUE but dilutes the local
 * argument rate by |sum(0)|/|anchor| (z: 11.47 → 7.93″/yr, a 92 s-class
 * anomalistic-year bias in the mode tier). Here the residual ROTATES at the
 * raw sum's own local arg-rate g* = Im(ż·z̄)/|z|² (analytic), so at t = 0
 * both the value AND the rate are exact, and at depth the residual is one
 * |R|-amplitude term at a physical frequency instead of a DC offset (deep
 * envelope measured unchanged: [0.0001, 0.0672] → [0.0003, 0.0678] over
 * 10–50 Myr). Exported: e(t) = hypot(sum(t)) needs no spin integration,
 * so a fixture can read a deep eccentricity node here (bit-identical at the
 * grid nodes; the published surface is the grid's linear interpolation and
 * stays on the history).
 * @param {ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>} modes
 * @param {[number, number]} anchor the J2000 value (q, p) the sum is pinned to
 * @returns {(t: number) => [number, number]} t in years from J2000
 */
export function createCoRotatingAnchoredModeSum(modes: ReadonlyArray<{
    omegaRadPerYr: number;
    re: number;
    im: number;
}>, anchor: [number, number]): (t: number) => [number, number];

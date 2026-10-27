/** Meeus Ch. 47 mean-argument rates, degrees per Julian century (the J2000 polynomials' linear terms). */
export const MEEUS_ARGUMENT_RATES_DEG_PER_CY: Readonly<{
    Lp: 481267.88123421;
    D: 445267.1114034;
    M: 35999.0502909;
    Mp: 477198.8675055;
    F: 483202.0175233;
}>;
/** The Meeus-effective pair: Meeus-exact of-date T² by construction (the shipped record values). */
export const MOON_ECC_SENSITIVITY_PERIGEE: 2.407;
export const MOON_ECC_SENSITIVITY_NODE: 1.018;
/**
 * The physical pair and the rate split, derived from the shipped constants.
 * @param {{
 *   eccentricityJ2000: number,
 *   eccentricityDotJ2000: number,
 *   frameT2ArcsecPerCy2: number,
 *   generalPrecessionArcsecPerYr: number,
 * }} inputs — e₀ (the catalog secular value the Taylor checks use); ė₀ per
 *   Julian century; the general precession's T² coefficient the of-date Meeus
 *   polynomials embed (Lieske 1976, the ELP frame), ″/cy²; p₀, the IAU 2006 p_A
 *   linear rate, ″/yr
 * @returns {Readonly<{
 *   perigeeEffective: number, nodeEffective: number,
 *   perigeePhysical: number, nodePhysical: number,
 *   kappaPerCy: number, frameT2DegPerCy2: number, generalPrecessionDegPerCy: number,
 *   perigeeRateOfDateDegPerCy: number, nodeRateOfDateDegPerCy: number,
 *   perigeeRateIcrfDegPerCy: number, nodeRateIcrfDegPerCy: number,
 * }>}
 */
export function deriveMoonEccSensitivities({ eccentricityJ2000, eccentricityDotJ2000, frameT2ArcsecPerCy2, generalPrecessionArcsecPerYr }: {
    eccentricityJ2000: number;
    eccentricityDotJ2000: number;
    frameT2ArcsecPerCy2: number;
    generalPrecessionArcsecPerYr: number;
}): Readonly<{
    perigeeEffective: number;
    nodeEffective: number;
    perigeePhysical: number;
    nodePhysical: number;
    kappaPerCy: number;
    frameT2DegPerCy2: number;
    generalPrecessionDegPerCy: number;
    perigeeRateOfDateDegPerCy: number;
    nodeRateOfDateDegPerCy: number;
    perigeeRateIcrfDegPerCy: number;
    nodeRateIcrfDegPerCy: number;
}>;

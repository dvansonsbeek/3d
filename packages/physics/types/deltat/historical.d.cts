/**
 * Espenak/Meeus ΔT in seconds — the FULL published canon: separate
 * 1986–2005 segment, and the −20 + 32u² parabola (with the −0.5628
 * correction above 2050) outside the tabulated range instead of NaN.
 * @param {number} year - calendar year
 * @returns {number}
 */
export function deltaTEspenakMeeusCanonSeconds(year: number): number;

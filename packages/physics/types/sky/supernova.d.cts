/**
 * The supernova ILLUSTRATION — the lifetime band's end for the massive stars (plan 28's follow-up; doc 111 §1.48).
 *
 * The sky of date draws a star while |t| is within its main-sequence lifetime τ (sky/galactic-orbits
 * mainSequenceLifetimeYears — a BAND: every star treated as mid-life) and hands its place to the next generation
 * of its luminosity. A star above ~8 solar masses does not fade away at the band's end: it ends as a core-collapse
 * supernova. This module says WHEN the band ends for such a star (its generations' instants) and HOW BRIGHT the
 * flash is at a distance and a time from the peak — the scene draws it, the panel jumps to it.
 *
 * An illustration, said so on every surface: the band's instant is a mass–luminosity scaling, not an evolutionary
 * model, so no real supernova is dated by it (Betelgeuse and Antares, evolved supergiants likely to explode within
 * ~100,000 years, get 11 Myr on the band). What is cited is the flash: the mean peak of a type II-P supernova,
 * M_V = −16.9 ± 1.0 (Richardson et al. 2014, AJ 147, 118 — the core-collapse type the band's candidates end as),
 * a rise of ~2 weeks, a plateau of ~100 days and the radioactive tail of ⁵⁶Co (0.98 mag per 100 days).
 *
 * The candidate threshold: 8 M☉ on the mass–luminosity relation L ∝ M^3.5 is L ≈ 1,450 L☉, M_V ≈ −3.1; the band's
 * own grain (a magnitude) puts the cut at M_V ≤ −2.5 — said as "about eight solar masses".
 */
export const SUPERNOVA_ILLUSTRATION: Readonly<{
    candidateAbsMagVMax: -2.5;
    peakAbsMagV: -16.9;
    riseDays: 15;
    plateauDays: 90;
    tailMagPerDay: 0.0098;
    sources: "Richardson, Jenkins, Wright & Maddox 2014, AJ 147, 118 (the peak); the II-P light-curve shape (rise, plateau, ⁵⁶Co tail) textbook";
}>;
/** Is a star of this absolute visual magnitude a supernova candidate (≳ 8 M☉)? @param {number} absMagV */
export function isSupernovaCandidate(absMagV: number): boolean;
/**
 * The magnitude ABOVE the peak at a time from the peak (days): Infinity before the rise, a linear-flux rise to 0 at
 * the peak, 0 on the plateau, the ⁵⁶Co tail after it.
 * @param {number} daysFromPeak
 */
export function supernovaMagnitudeOffsetDays(daysFromPeak: number): number;
/** The flash's apparent visual magnitude at a distance (pc) and a time from the peak (days). @param {number} distPc @param {number} daysFromPeak */
export function supernovaApparentMagnitude(distPc: number, daysFromPeak: number): number;
/** The days the flash stays within a visibility limit at a distance: the plateau plus the tail down to the limit (0 if never within it). @param {number} distPc @param {number} limitV */
export function supernovaVisibleDays(distPc: number, limitV: number): number;
/**
 * The band's supernova instants for a star of lifetime τ within ±windowYears of its epoch, as years from the epoch
 * with the generation that ends: in the FUTURE the ends of generations g ≥ 0 at +(g+1)·τ (g = 0 the star itself,
 * g ≥ 1 its successors at their seeded places); in the PAST the deaths of the earlier generations at −g·τ, g ≥ 1 —
 * the star that died when this one was born, the steady state the band states. Sorted by time.
 * @param {number} tauYears @param {number} windowYears
 * @returns {Array<{tYears: number, gen: number}>}
 */
export function supernovaInstantsYears(tauYears: number, windowYears: number): Array<{
    tYears: number;
    gen: number;
}>;

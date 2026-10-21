/**
 * The time axis — exact JD ↔ model-year conversion on the SI axis.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */

/** @param {import('./inv-plane-elements.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleTimeAxis(ctx) {
  const { meanTropicalYearJ2000Seconds, startmodelJD, startmodelYear } = ctx;
  // The model's `year` inputs live on the SI axis (the axis the fits were
  // anchored on — tools/lib `_jdToSIyear`): linear in SI 86400-s days from the
  // model start, so the JD↔year map is closed-form and exact to double
  // precision. Callers holding an exact JD (e.g. 2058768.5385006 TT) convert
  // here and NEVER roll their own — a caller-side linear-vs-calendar mix once
  // put the eclipse umbra twin 8 km off (§12h; ≤1 m once unified).
  const siTropicalYearDays = meanTropicalYearJ2000Seconds / 86400;
  /** Model year (SI axis) at a JD(TT). @param {number} jd @returns {number} */
  const yearFromJD = (jd) => startmodelYear + (jd - startmodelJD) / siTropicalYearDays;
  /** JD(TT) at a model year (SI axis). @param {number} year @returns {number} */
  const jdFromYear = (year) => startmodelJD + (year - startmodelYear) * siTropicalYearDays;

  return { jdFromYear, siTropicalYearDays, yearFromJD };
}
/** @typedef {import('./inv-plane-elements.js').Ctx & ReturnType<typeof assembleTimeAxis>} Ctx */

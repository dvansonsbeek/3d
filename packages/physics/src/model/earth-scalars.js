/**
 * Earth scalars of date — e, ϖ, ε read from the one-source movement; the eclipse Sun's mean elements (the research `laws` hook).
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */

/** @param {import('./deep-time-chain.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleEarthScalars(ctx) {
  const { F, laws, late } = ctx;
  /** @param {number} year @returns {number} */
  // Plan 06 layer B — the eclipse Sun onto the series. The PUBLISHED Earth
  // ϖ of date is the one-source series (the secular orbit; its J2000 element
  // ≡ La2004's — the same field the D4c apsidal wheel renders). The SUN's
  // equation of centre needs the MEAN elements of the era: the series plus the
  // derived mean offset of the osculating channel (F.EARTH_OSCULATING_MEAN_
  // OFFSET, tools/verify/earth-osculating-offset.js — the 1890–2110 mean of
  // osculating − secular from the Horizons-seeded nine-body run). Measured:
  // the fast osculating wobble is carried by the completion's direct terms and
  // double-counts if added; the window mean is what the Sun residual holds
  // (all-phase JPL sd 3.23″ → 1.59″).
  const earthPerihelionDeg = (year) => late.oneSourceM.periOfDateDegAt(year);
  const SUN_OFF = F.EARTH_OSCULATING_MEAN_OFFSET;
  /** The eclipse Sun's ϖ of date (mean elements). @param {number} year @returns {number} */
  const sunPerihelionDegAt = laws.perihelionLongitudeDegAt ?? ((year) => late.oneSourceM.periOfDateDegAt(year) + SUN_OFF.dPomArcsec / 3600);
  // The obliquity of date is the one-source hybrid everywhere (the eclipse
  // tier's besselian reads it here).
  /** @param {number} year @returns {number} */
  const obliquityDeg = (year) => late.oneSourceM.epsAt(year);
  // ONE eccentricity for the whole model, two readers. The PUBLISHED Earth
  // eccentricity is the one-source series (|z|, the secular orbit) and the
  // SUN's e adds the derived mean offset (see sunPerihelionDegAt) — the
  // clock-side machinery reads these: the eclipse Sun's equation of centre,
  // the besselian Sun distance, the cardinal braid. The LUNAR chain
  // (E-factor, perigee/node modulation, argument Δe² and the of-date rates)
  // rides the ONE deep e — the engine's own ±10-Myr z-vector, `deepEcc` of
  // the deep-time chain (deep-time-chain.js); the two agree within 4.2e-5
  // in-era. The laws hook deliberately does NOT reach the deep e channel.
  /** @param {number} year @returns {number} */
  const eccentricityAt = (year) => late.oneSourceM.eAt(year);
  /** The eclipse Sun's e (mean elements). @param {number} year @returns {number} */
  const sunEccentricityAt = laws.eccentricityAt ?? ((year) => late.oneSourceM.eAt(year) + SUN_OFF.dE);
  // (Earth's inclination and node of date — `inclinationDeg` /
  // `ascendingNodeDeg` — are the one-source construction in inv-plane-elements.js.)

  return { earthPerihelionDeg, eccentricityAt, obliquityDeg, sunEccentricityAt, sunPerihelionDegAt };
}
/** @typedef {import('./deep-time-chain.js').Ctx & ReturnType<typeof assembleEarthScalars>} Ctx */

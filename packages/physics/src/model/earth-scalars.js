/**
 * Earth scalars of date — e, ϖ, ε read from the one-source movement; the eclipse Sun's elements (the research `laws` hook).
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */

/** @param {import('./deep-time-chain.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleEarthScalars(ctx) {
  const { laws, late } = ctx;
  // ONE ϖ of date (plan 21). The one-source series is the MEAN Earth orbit —
  // the 1-kyr boxcar of the engine's own ±10-Myr run, anchored at J2000 on its
  // own node (the mean element; deep-orbital-history.cjs, the deep-modes embed's
  // anchorE/anchorPeriEclipticDeg) — and it is what the literature's mean
  // elements tabulate (Simon 1994: ϖ̇ 1161.2 ″/cy, the series 1160.9; ė
  // −4.204e-5/cy, the series −4.203e-5). The PUBLISHED Earth ϖ, the eclipse
  // Sun's equation of centre, the besselian Sun distance, the cardinal braid and
  // the lunar arguments' Sun perigee all read this one function. The fast
  // osculating wobble (the 11.9-yr Jupiter term, 263″ in ϖ) is carried by the
  // planetary completion's direct terms, never by an element.
  /** @param {number} year @returns {number} */
  const earthPerihelionDeg = (year) => late.oneSourceM.periOfDateDegAt(year);
  /** The eclipse Sun's ϖ of date — the SAME function; the research `laws` hook may replace it. @param {number} year @returns {number} */
  const sunPerihelionDegAt = laws.perihelionLongitudeDegAt ?? earthPerihelionDeg;
  // The obliquity of date is the one-source hybrid everywhere (the eclipse
  // tier's besselian reads it here).
  /** @param {number} year @returns {number} */
  const obliquityDeg = (year) => late.oneSourceM.epsAt(year);
  // ONE eccentricity for the whole model. The PUBLISHED Earth eccentricity is
  // the one-source series (|z|, the mean orbit) and the SUN reads the same
  // function — the clock-side machinery: the eclipse Sun's equation of centre,
  // the besselian Sun distance, the cardinal braid. The LUNAR chain (E-factor,
  // perigee/node modulation, argument Δe² and the of-date rates) rides the ONE
  // deep e — the engine's own ±10-Myr z-vector, `deepEcc` of the deep-time
  // chain (deep-time-chain.js), on the same J2000 anchor; the two agree within
  // 4.2e-5 in-era. The laws hook deliberately does NOT reach the deep e channel.
  /** @param {number} year @returns {number} */
  const eccentricityAt = (year) => late.oneSourceM.eAt(year);
  /** The eclipse Sun's e — the SAME function; the research `laws` hook may replace it. @param {number} year @returns {number} */
  const sunEccentricityAt = laws.eccentricityAt ?? eccentricityAt;
  // (Earth's inclination and node of date — `inclinationDeg` /
  // `ascendingNodeDeg` — are the one-source construction in inv-plane-elements.js.)

  return { earthPerihelionDeg, eccentricityAt, obliquityDeg, sunEccentricityAt, sunPerihelionDegAt };
}
/** @typedef {import('./deep-time-chain.js').Ctx & ReturnType<typeof assembleEarthScalars>} Ctx */

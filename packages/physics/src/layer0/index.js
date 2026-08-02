/**
 * Layer 0 — epoch primitives. Pure `f(year)` → SI scalar.
 *
 * Imports NOTHING: not a sibling layer, not the constants module, not a Node
 * builtin. Everything arrives through `createEpochPrimitives`. That is §2b and
 * §2d of IP-unified-architecture.md, and it is what makes a counterfactual
 * expressible — the one thing DE440 and Laskar cannot offer.
 *
 * ── THE ARGUMENT IS A YEAR, NOT t_Ma ──────────────────────────────────────
 * `tools/lib/deep-time.js` and `src/script.js` both take `t_Ma` and convert
 * inline with `× 1e6`, six times across two engines. Worse, the two disagree on
 * the origin: the engine uses `t_Ma = (2000 − year)/1e6` while attempt-1's
 * fitters used `(2000.5 − year)/1e6` — half a year apart, silently. Taking a
 * year removes both the repetition and the ambiguity; the conversion happens
 * once, here, against a named epoch.
 *
 * ── α IS INJECTED, AND THAT IS R2 ─────────────────────────────────────────
 * `alphaAt` is a parameter, not an import. The Earth moment-of-inertia factor
 * rides on the climate L1 series, so hard-wiring it would drag the whole
 * climate formula into Layer 0 — but the deeper reason is R2: when BUILDING an
 * H-lattice table α must be held at its J2000 reference, or the lattice defines
 * itself in terms of its own output. The browser gets this right today only by
 * accident (a TDZ throw during table build); Node integrates the live α(t) and
 * lands 141.6 d away at cycle 0. Making α an argument turns that accident into
 * a decision the caller states out loud.
 */

/**
 * @typedef {Object} EpochParams
 * @property {number} epochYear                  year at t_Ma = 0 (2000, NOT startmodelYear)
 * @property {number} alpha1PerMa                Moon recession, LLR-anchored
 * @property {number} alpha3PerMa3
 * @property {number} alpha4PerMa4
 * @property {number} moonDistanceNowM           a_Moon at J2000, metres
 * @property {number} moonLockDistanceM          tidal-lock asymptote, metres
 * @property {number} totalAngularMomentumKgM2S  L_tot of the Earth-Moon system
 * @property {number} moonMassKg
 * @property {number} gmEarthMoonM3S2
 * @property {number} moonEccentricityFactor     sqrt(1 - e^2)
 * @property {number} earthMassKg
 * @property {number} earthRadiusM
 * @property {number} holisticYearJ2000
 * @property {number} lodNowH13Seconds
 * @property {number} siderealYearJ2000Seconds
 * @property {number} solarMassLossFracPerYear
 */

/**
 * @typedef {Object} EpochPrimitives
 * @property {(year: number) => number} tMa
 * @property {(year: number) => number} moonDistanceMetres
 * @property {(year: number) => number|null} lodSeconds
 * @property {(year: number) => number|null} holisticH
 * @property {(year: number) => number} siderealYearSeconds
 * @property {(year: number) => number} tropicalYearSeconds
 * @property {(year: number) => number|null} anomalisticYearSeconds
 */

/**
 * @param {{params: EpochParams, alphaAt: (year: number) => number}} deps
 * @returns {EpochPrimitives}
 */
export const createEpochPrimitives = ({ params: p, alphaAt }) => {
  /**
   * Years before the epoch, in Ma. The ONE place this conversion lives.
   * @param {number} year
   * @returns {number}
   */
  const tMa = (year) => (p.epochYear - year) / 1e6;

  /**
   * Moon semi-major axis. Cubic in t_Ma: alpha1 is LLR-anchored, alpha3/alpha4
   * are the Farhat 2022 deep-time fit.
   * @param {number} year
   * @returns {number} metres
   */
  const moonDistanceMetres = (year) => {
    const t = tMa(year);
    return p.moonDistanceNowM
      * (1 + p.alpha1PerMa * t + p.alpha3PerMa3 * t * t * t + p.alpha4PerMa4 * t * t * t * t);
  };

  /**
   * Length of day from angular-momentum conservation: as the Moon recedes it
   * takes orbital angular momentum and Earth's spin slows to compensate.
   * @param {number} year
   * @returns {number|null} seconds; null past the tidal-lock asymptote
   */
  const lodSeconds = (year) => {
    const a = moonDistanceMetres(year);
    if (a <= 0 || a >= p.moonLockDistanceM) return null;
    const iEarth = alphaAt(year) * p.earthMassKg * p.earthRadiusM * p.earthRadiusM;
    return (2 * Math.PI * iEarth)
      / (p.totalAngularMomentumKgM2S
         - p.moonMassKg * Math.sqrt(p.gmEarthMoonM3S2 * a) * p.moonEccentricityFactor);
  };

  /**
   * The Earth Fundamental Cycle. H scales with LOD — the lattice is defined by
   * the rotation rate, so a longer day is a longer H.
   * @param {number} year
   * @returns {number|null} years
   */
  const holisticH = (year) => {
    const lod = lodSeconds(year);
    return lod === null ? null : p.holisticYearJ2000 * lod / p.lodNowH13Seconds;
  };

  /**
   * Sidereal year. Driver 2 alone — solar mass loss via Kepler, `dT/T = -2 dM/M`
   * under the adiabatic `a*M = const` coupling. Carries NO alpha and NO LOD,
   * which is why attempt 1 used it as the clean probe for the mass-loss
   * amplitude (measured 0.9964, i.e. 1.00).
   * @param {number} year
   * @returns {number} seconds
   */
  const siderealYearSeconds = (year) => {
    const t = tMa(year);
    if (t === 0) return p.siderealYearJ2000Seconds;
    return p.siderealYearJ2000Seconds * (1 - 2 * p.solarMassLossFracPerYear * t * 1e6);
  };

  /**
   * Tropical year — sidereal less one axial-precession turn, H/13.
   * Falls back to the J2000 H past the asymptote, matching the shipped chain.
   * @param {number} year
   * @returns {number} seconds
   */
  const tropicalYearSeconds = (year) => {
    const sid = siderealYearSeconds(year);
    const H = holisticH(year);
    return H === null ? sid * (1 - 13 / p.holisticYearJ2000) : sid * (1 - 13 / H);
  };

  /**
   * Anomalistic year.
   *
   * NOT `T_sid * (1 + 3/H)`. That is the FIRST-ORDER form and the plan quotes
   * it, but the shipped chain composes the two lattice steps exactly: tropical
   * is `(H-13)/H` of sidereal, then anomalistic is `H/(H-16)` of tropical,
   * giving `T_sid * (H-13)/(H-16)`. The two differ by `48/H^2 * T_sid` ~ 13.5 ms
   * — comparable to 6d's own 0.0178 s anomalistic RMSE, so adopting the
   * first-order form would move a shipped value for no reason. Exact
   * composition it is; the identity 13 + 3 = 16 still holds to first order.
   *
   * @param {number} year
   * @returns {number|null} seconds
   */
  const anomalisticYearSeconds = (year) => {
    const H = holisticH(year);
    if (H === null) return null;
    const sid = siderealYearSeconds(year);
    return sid * (H - 13) / H * H / (H - 16);
  };

  return Object.freeze({
    tMa,
    moonDistanceMetres,
    lodSeconds,
    holisticH,
    siderealYearSeconds,
    tropicalYearSeconds,
    anomalisticYearSeconds,
  });
};

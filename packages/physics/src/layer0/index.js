/**
 * Layer 0 — epoch primitives. Pure `f(year)` → SI scalar.
 *
 * Imports NOTHING: not a sibling layer, not the constants module, not a Node
 * builtin. Everything arrives through `createEpochPrimitives`. That is §2b and
 * §2d of IP-unified-architecture.md, and it is what makes a counterfactual
 * expressible — the one thing DE440 and Laskar cannot offer.
 *
 * ── ONE AXIS, BY MEASUREMENT ──────────────────────────────────────────────
 * The API is `f(year)` (naming rule: the epoch parameter is a year). The
 * internal cores work in t_Ma, converted once by `tMa()`. A second `t_Ma`
 * entry axis was built and then REMOVED: the worry was that pre-migration
 * callers holding a t_Ma would suffer `t → year → t` float wobble (1.9% of the
 * domain fails that round-trip), but a 200k-point sweep found ZERO output-level
 * differences — the chain's sensitivity (~20 s/Ma on LOD) times a 1-ULP wobble
 * in t sits orders below the output ULP everywhere in ±495 Ma. The layer0
 * identity gate pins that conclusion with harvested non-round-tripping t
 * values, so a future chain steep enough to break it fails loudly.
 *
 * ── α IS INJECTED, AND THAT IS R2 ─────────────────────────────────────────
 * `alphaAtAgeMa` is a parameter, not an import. The Earth moment-of-inertia
 * factor rides on the climate L1 series, so hard-wiring it would drag the
 * climate formula into Layer 0 — but the deeper reason is R2: when BUILDING an
 * H-lattice table α must be held at its J2000 reference, or the lattice
 * defines itself in terms of its own output. The browser gets this right today
 * only by accident (a TDZ throw during table build); Node integrates the live
 * α(t) and lands 141.6 d away at cycle 0. Making α an argument turns that
 * accident into a decision the caller states out loud. R2 itself is a Phase C
 * change — nothing here applies it.
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
 * @param {{params: EpochParams, alphaAtAgeMa: (tMa: number) => number}} deps
 * @returns {EpochPrimitives}
 */
export const createEpochPrimitives = ({ params: p, alphaAtAgeMa }) => {
  /**
   * Years before the epoch, in Ma. The ONE place this conversion lives.
   * @param {number} year
   * @returns {number}
   */
  const tMa = (year) => (p.epochYear - year) / 1e6;

  /**
   * Moon semi-major axis. Cubic in t_Ma: alpha1 is LLR-anchored, alpha3/alpha4
   * are the Farhat 2022 deep-time fit.
   * @param {number} t age in Ma
   * @returns {number} metres
   */
  const moonDistanceMetresCore = (t) =>
    p.moonDistanceNowM
      * (1 + p.alpha1PerMa * t + p.alpha3PerMa3 * t * t * t + p.alpha4PerMa4 * t * t * t * t);

  /**
   * Length of day from angular-momentum conservation: as the Moon recedes it
   * takes orbital angular momentum and Earth's spin slows to compensate.
   * @param {number} t age in Ma
   * @returns {number|null} seconds; null past the tidal-lock asymptote
   */
  const lodSecondsCore = (t) => {
    const a = moonDistanceMetresCore(t);
    if (a <= 0 || a >= p.moonLockDistanceM) return null;
    const iEarth = alphaAtAgeMa(t) * p.earthMassKg * p.earthRadiusM * p.earthRadiusM;
    return (2 * Math.PI * iEarth)
      / (p.totalAngularMomentumKgM2S
         - p.moonMassKg * Math.sqrt(p.gmEarthMoonM3S2 * a) * p.moonEccentricityFactor);
  };

  /**
   * The Earth Fundamental Cycle. H scales with LOD — the lattice is defined by
   * the rotation rate, so a longer day is a longer H.
   * @param {number} t age in Ma
   * @returns {number|null} years
   */
  const holisticHCore = (t) => {
    const lod = lodSecondsCore(t);
    return lod === null ? null : p.holisticYearJ2000 * lod / p.lodNowH13Seconds;
  };

  /**
   * Sidereal year. Driver 2 alone — solar mass loss via Kepler, `dT/T = -2 dM/M`
   * under the adiabatic `a*M = const` coupling. Carries NO alpha and NO LOD,
   * which is why attempt 1 used it as the clean probe for the mass-loss
   * amplitude (measured 0.9964, i.e. 1.00).
   * @param {number} t age in Ma
   * @returns {number} seconds
   */
  const siderealYearSecondsCore = (t) => {
    if (t === 0) return p.siderealYearJ2000Seconds;
    return p.siderealYearJ2000Seconds * (1 - 2 * p.solarMassLossFracPerYear * t * 1e6);
  };

  /**
   * Tropical year — sidereal less one axial-precession turn, H/13.
   * Falls back to the J2000 H past the asymptote, matching the shipped chain.
   * @param {number} t age in Ma
   * @returns {number} seconds
   */
  const tropicalYearSecondsCore = (t) => {
    const sid = siderealYearSecondsCore(t);
    const H = holisticHCore(t);
    return H === null ? sid * (1 - 13 / p.holisticYearJ2000) : sid * (1 - 13 / H);
  };

  /**
   * Anomalistic year.
   *
   * NOT `T_sid * (1 + 3/H)`. That is the FIRST-ORDER form and the plan quotes
   * it, but the shipped chain composes the lattice steps exactly: tropical is
   * `(H-13)/H` of sidereal, then anomalistic is `H/(H-16)` of tropical, giving
   * `T_sid * (H-13)/(H-16)`. The two differ by `48/H^2 * T_sid` ~ 13.5 ms —
   * comparable to 6d's own 0.0178 s anomalistic RMSE, so adopting the
   * first-order form would move a shipped value for no reason. Exact
   * composition it is; the identity 13 + 3 = 16 still holds to first order.
   *
   * @param {number} t age in Ma
   * @returns {number|null} seconds
   */
  const anomalisticYearSecondsCore = (t) => {
    const H = holisticHCore(t);
    if (H === null) return null;
    const sid = siderealYearSecondsCore(t);
    return sid * (H - 13) / H * H / (H - 16);
  };

  return Object.freeze({
    tMa,
    moonDistanceMetres: (year) => moonDistanceMetresCore(tMa(year)),
    lodSeconds: (year) => lodSecondsCore(tMa(year)),
    holisticH: (year) => holisticHCore(tMa(year)),
    siderealYearSeconds: (year) => siderealYearSecondsCore(tMa(year)),
    tropicalYearSeconds: (year) => tropicalYearSecondsCore(tMa(year)),
    anomalisticYearSeconds: (year) => anomalisticYearSecondsCore(tMa(year)),
  });
};

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
 * @property {number} precessionSolarShareJ2000  f_S, the solar fraction of the J2000 precession torque
 * @property {number} precessionRateJ2000ArcsecPerYr  p₀, the composed precession rate's J2000 anchor (1,296,000/axial0)
 */

/**
 * @typedef {Object} EpochPrimitives
 * @property {(year: number) => number} tMa
 * @property {(year: number) => number} moonDistanceMetres
 * @property {(year: number) => number|null} lodSeconds
 * @property {(year: number) => number|null} holisticH               the UNIT: 13 × the composed lunisolar precession period
 * @property {(year: number) => number} siderealYearSeconds
 * @property {(year: number) => number} tropicalYearSeconds      sidereal less one equinox turn per T_p(t) (the composed precession period)
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
   * The unit's spin-scaling factor H₀·LOD(t)/LOD₀ — internal to holisticHCore.
   * (Plan 09 step 7a: until then also the frozen era clock's own counter,
   * published as `eraClockH` for the devices fitted against it — deleted with
   * the last comb; the unit itself leaves at step 7b.)
   * @param {number} t age in Ma
   * @returns {number|null} years
   */
  const eraClockHCore = (t) => {
    const lod = lodSecondsCore(t);
    return lod === null ? null : p.holisticYearJ2000 * lod / p.lodNowH13Seconds;
  };

  /**
   * The unit H(t) ≡ 13 × the composed lunisolar precession period:
   * H_era(t) / [f_S + (1 − f_S)·(a₀/a_M(t))³] — the spin scaling AND the
   * lunar torque growing on the recession history (plan 06 D6/Phase 3; the
   * formula's home is earth/precession-composed, this is its Layer-0 twin,
   * held bit-identical to deltat/deep-time.cjs by the layer0 gate).
   * @param {number} t age in Ma
   * @returns {number|null} years
   */
  const holisticHCore = (t) => {
    const hEra = eraClockHCore(t);
    if (hEra === null) return null;
    const lf = Math.pow(p.moonDistanceNowM / moonDistanceMetresCore(t), 3);
    return hEra / (p.precessionSolarShareJ2000 + (1 - p.precessionSolarShareJ2000) * lf);
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
    // Exact Kepler product form (T ∝ M⁻² under a·M = const, a(t) = a₀·(1−Δm))
    // — the same Driver-2 law as the planet chains and deltat/deep-time.cjs.
    // MUST stay the bit-exact twin of siderealYearSecondsAtAge there (the
    // transparency gate holds the pair at 84/84 round-trip).
    const dm = p.solarMassLossFracPerYear * t * 1e6;
    return p.siderealYearJ2000Seconds * (1 - dm) * (1 - dm);
  };

  /**
   * Tropical year of date — the sidereal year less the equinox's own motion
   * over one year: one turn per the composed lunisolar precession period
   * T_p(t), i.e. 1/T_trop = 1/T_sid + ψ̇(t)/(1,296,000″ · Julian-year s) with
   * ψ̇(t) = [ω₀/ω(t)]⁻¹… spelled as (LOD₀/LOD(t))·p₀·[f_S + (1 − f_S)(a₀/a_M)³].
   * Plan 09 step 5d: it was the unit's calendar convention sid·(1 − 13/H(t))
   * (plan 06 D2 kept it as a named device), 0.086 % slow on the equinox term
   * — 1.0 s of year at J2000, integrated by the deep JD↔year calendar. The
   * SAME operations as deltat/deep-time.cjs tropicalYearSecondsFromLod (the
   * layer0 gate holds the twins bit-identical). Past the tidal chain's
   * domain the J2000 rate stands in.
   * (The former anomalistic identity T_sid·(H − 13)/(H − 16) left with it:
   * the model publishes the anomalistic year of date inside the one-family
   * window only, from the series' own apsidal rate.)
   * @param {number} t age in Ma
   * @returns {number} seconds
   */
  const tropicalYearSecondsCore = (t) => {
    const sid = siderealYearSecondsCore(t);
    const lod = lodSecondsCore(t);
    const a = moonDistanceMetresCore(t);
    const lf = (a === null || !(a > 0)) ? null : Math.pow(p.moonDistanceNowM / a, 3);
    const term = lf === null ? null : p.precessionSolarShareJ2000 + (1 - p.precessionSolarShareJ2000) * lf;
    const p0 = p.precessionRateJ2000ArcsecPerYr;
    const rate = (lod === null || !(lod > 0) || term === null) ? p0 : (p.lodNowH13Seconds / lod) * p0 * term;
    return 1 / (1 / sid + rate / (1296000 * 365.25 * 86400));
  };

  // (plan 09 step 7a: the frozen comb family's tropical base T_sid·(1 − 13/H_era) is deleted)

  return Object.freeze({
    tMa,
    moonDistanceMetres: (year) => moonDistanceMetresCore(tMa(year)),
    lodSeconds: (year) => lodSecondsCore(tMa(year)),
    holisticH: (year) => holisticHCore(tMa(year)),
    siderealYearSeconds: (year) => siderealYearSecondsCore(tMa(year)),
    tropicalYearSeconds: (year) => tropicalYearSecondsCore(tMa(year)),
  });
};

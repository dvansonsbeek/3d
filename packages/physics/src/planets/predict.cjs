/**
 * Predictive geocentric precession — the physical-beat feature basis
 * (Phase 8.3, L9). Ported originally from
 * tools/lib/python/predictive_formula_physical.py; this module is now THE
 * shared implementation behind what were two hand-mirrors (browser +
 * Node engine, ~220 duplicated lines each).
 *
 * GROUPS: A (Earth ref), B (planet angle), C+D+E (periods+beats × 7
 * harmonics), F (period×angle), I (period×2δ), J (fund×Earth sidebands),
 * L (high-harmonic fund×Earth ecl), K (ecl±icrf carriers × Earth ecl).
 * Groups G+H (ERD×period) were removed after a 0.00%-impact diagnostic.
 *
 * MATCHED PAIR: PREDICT_COEFFS was trained against exactly this basis in
 * exactly this push order — reordering or "simplifying" any group scrambles
 * the ridge-regression dot product silently. Do not touch.
 *
 * The engines OWN the Earth scalar derivations (θ_E, ERD, obliquity,
 * eccentricity) — injected, because the two engines deliberately differ
 * there: the browser evaluates the deep-time epoch-aware forms
 * (H_at_year, phaseAdvanceRadians), the Node engine the J2000-anchored
 * forms. The predictor dot-products (PREDICT_PLANETS / PREDICT_COEFFS
 * lookup and their guard semantics) also stay engine-side.
 *
 * Planet fields and H / balancedYear arrive as GETTERS: the browser
 * mutates all of them on setEpoch and invalidates the feature-template
 * cache via resetTemplateCache() at that site.
 */

'use strict';

const PHYSICAL_PERIOD_KEYS = ['ecl', 'icrf', 'obliq', 'asc', 'axial', 'wobble'];
const PHYSICAL_HARMONIC_ORDERS = [1, 2, 4, 6, 8, 12, 16];
const SIDEBAND_J_HARMONICS = [1, 2, 3, 4];
const CARRIER_HARMONICS_K = [2, 4, 6, 8, 10, 12];
const SIDEBAND_K_HARMONICS = [1, 2, 3];
const CARRIER_HARMONICS_L = [6, 10, 12, 16];
const SIDEBAND_L_HARMONICS = [1, 2, 3];
const MAX_BEAT_YEARS = 1e12;

/**
 * Any planet's perihelion longitude — simple linear precession from J2000.
 *
 * @param {number} theta0Deg - perihelion longitude at J2000 (degrees)
 * @param {number} periodYears - precession period in years
 * @param {number} year - decimal year
 * @returns {number} longitude in degrees [0, 360)
 */
function calcPlanetPerihelionLongDeg(theta0Deg, periodYears, year) {
  return ((theta0Deg + 360.0 * (year - 2000) / periodYears) % 360 + 360) % 360;
}

/**
 * Sum/difference beat periods of two cycles, null where degenerate or
 * beyond MAX_BEAT_YEARS.
 *
 * @param {number|null} t1 @param {number|null} t2
 * @returns {{ sum: number|null, diff: number|null }}
 */
function beatPair(t1, t2) {
  if (t1 == null || t2 == null) return { sum: null, diff: null };
  const sr = 1 / t1 + 1 / t2;
  const dr = 1 / t1 - 1 / t2;
  let sp = Math.abs(sr) > 1e-20 ? 1 / sr : null;
  let dp = Math.abs(dr) > 1e-20 ? 1 / dr : null;
  if (sp != null && Math.abs(sp) > MAX_BEAT_YEARS) sp = null;
  if (dp != null && Math.abs(dp) > MAX_BEAT_YEARS) dp = null;
  return { sum: sp, diff: dp };
}

/**
 * @typedef {Object} PredictPlanetFields
 * @property {number} perihelionEclipticYears
 * @property {number} longitudePerihelion
 * @property {number|null|undefined} ascendingNodeCyclesIn8H
 * @property {number} axialPrecessionYears
 * @property {number|null|undefined} obliquityCycle
 * @property {number|null|undefined} wobblePeriod
 */

/**
 * @typedef {Object} PredictDeps
 * @property {() => number} getHYears - holistic year length (live: setEpoch mutates it)
 * @property {() => number} getBalancedYear
 * @property {(planetKey: string) => PredictPlanetFields} getPlanetFields - live per-call reads
 * @property {(year: number) => number} calcEarthPerihelionDeg - θ_E, engine-owned form
 * @property {(year: number) => number} calcErdRate - ERD deg/yr, engine-owned form
 * @property {(year: number) => number} computeObliquityEarthDeg
 * @property {(year: number) => number} computeEccentricityEarth
 * @property {number} obliquityMeanDeg - the fitted solstice-obliquity mean
 * @property {number} eccentricityMean - sqrt(base² + amplitude²)
 */

/**
 * Build the predictive-precession machinery over one engine's state.
 * @param {PredictDeps} deps
 */
function createPredictivePrecession(deps) {
  /** @type {Record<string, number[]>} */
  const templates = {};

  /**
   * The six fundamental periods (years) feeding the feature basis.
   * Earth is pure H-lattice; planets derive icrf/asc from their fields.
   * @param {string} planetName
   * @returns {Record<string, number|null>}
   */
  function getPlanetFundamentalPeriodsYears(planetName) {
    const H = deps.getHYears();
    const H13 = H / 13;
    if (planetName === 'earth') {
      return { ecl: H / 16, icrf: H / 3, obliq: H / 8, asc: -8 * H / 40, axial: -H / 13, wobble: H / 16 };
    }
    const p = deps.getPlanetFields(planetName);
    const tEcl = p.perihelionEclipticYears;
    const tIcrf = (tEcl * H13) / (H13 - tEcl);
    const ascN = p.ascendingNodeCyclesIn8H;
    const tAsc = ascN ? -8 * H / ascN : null;
    return {
      ecl: tEcl,
      icrf: tIcrf,
      obliq: p.obliquityCycle || null,
      asc: tAsc,
      axial: p.axialPrecessionYears,
      wobble: p.wobblePeriod || null,
    };
  }

  /**
   * Fundamentals + pairwise internal beats + planet×Earth beats, cached
   * per planet until resetTemplateCache().
   * @param {string} planetName
   * @returns {number[]}
   */
  function getFeatureTemplate(planetName) {
    if (templates[planetName]) return templates[planetName];
    const pp = getPlanetFundamentalPeriodsYears(planetName);
    const ep = getPlanetFundamentalPeriodsYears('earth');
    const template = [];
    for (const k of PHYSICAL_PERIOD_KEYS) {
      if (pp[k] != null) template.push(pp[k]);
    }
    for (let i = 0; i < PHYSICAL_PERIOD_KEYS.length; i++) {
      for (let j = i + 1; j < PHYSICAL_PERIOD_KEYS.length; j++) {
        const b = beatPair(pp[PHYSICAL_PERIOD_KEYS[i]], pp[PHYSICAL_PERIOD_KEYS[j]]);
        if (b.sum != null) template.push(b.sum);
        if (b.diff != null) template.push(b.diff);
      }
    }
    for (const pk of PHYSICAL_PERIOD_KEYS) {
      for (const ek of PHYSICAL_PERIOD_KEYS) {
        const b = beatPair(pp[pk], ep[ek]);
        if (b.sum != null) template.push(b.sum);
        if (b.diff != null) template.push(b.diff);
      }
    }
    templates[planetName] = template;
    return template;
  }

  /**
   * The full feature vector (~2421 elements for Venus). Push order is the
   * training order — see the module header.
   * @param {number} year - calendar year
   * @param {string} planetKey - e.g. 'venus'
   * @returns {number[]}
   */
  function buildPredictiveFeatures(year, planetKey) {
    const t = year - deps.getBalancedYear();
    const p = deps.getPlanetFields(planetKey);
    const planetPeriod = Math.abs(p.perihelionEclipticYears);
    const planetTheta0 = p.longitudePerihelion;

    const thetaE = deps.calcEarthPerihelionDeg(year);
    const thetaP = calcPlanetPerihelionLongDeg(planetTheta0, planetPeriod, year);
    const erd = deps.calcErdRate(year);
    const obliq = deps.computeObliquityEarthDeg(year);
    const ecc = deps.computeEccentricityEarth(year);

    const thetaERad = thetaE * Math.PI / 180;
    const thetaPRad = thetaP * Math.PI / 180;
    const diff = thetaERad - thetaPRad;
    const sumAngle = thetaERad + thetaPRad;

    const obliqNorm = obliq - deps.obliquityMeanDeg;
    const eccNorm = ecc - deps.eccentricityMean;
    const erd2 = erd * erd;
    const erd3 = erd2 * erd;

    const f = [];

    // GROUP A: Earth reference (49)
    for (const n of [1, 2, 3, 4]) { f.push(Math.cos(n * diff), Math.sin(n * diff)); }
    f.push(Math.cos(sumAngle), Math.sin(sumAngle));
    for (const n of [1, 2]) { f.push(Math.cos(n * thetaERad), Math.sin(n * thetaERad)); }
    for (const n of [1, 2]) { f.push(Math.cos(n * thetaPRad), Math.sin(n * thetaPRad)); }
    f.push(obliqNorm, eccNorm);
    f.push(obliqNorm * Math.cos(diff), obliqNorm * Math.sin(diff));
    f.push(eccNorm * Math.cos(diff), eccNorm * Math.sin(diff));
    f.push(erd, erd2, erd3);
    f.push(erd * Math.cos(diff), erd * Math.sin(diff));
    f.push(erd * Math.cos(2 * diff), erd * Math.sin(2 * diff));
    f.push(erd * Math.cos(sumAngle), erd * Math.sin(sumAngle));
    f.push(erd * obliqNorm, erd * eccNorm);
    f.push(erd2 * Math.cos(diff), erd2 * Math.sin(diff));
    f.push(erd2 * Math.cos(2 * diff));
    f.push(erd * Math.cos(3 * diff), erd * Math.sin(3 * diff));
    f.push(Math.cos(3 * diff), Math.sin(3 * diff));
    f.push(Math.cos(4 * diff), Math.sin(4 * diff));
    f.push(erd * Math.cos(2 * sumAngle), erd * Math.sin(2 * sumAngle));
    f.push(erd2 * Math.cos(sumAngle), erd2 * Math.sin(sumAngle));
    f.push(1.0);

    // GROUP B: planet angle cross-terms (10)
    for (const n of [3, 4]) { f.push(Math.cos(n * thetaPRad), Math.sin(n * thetaPRad)); }
    f.push(obliqNorm * Math.cos(2 * diff), obliqNorm * Math.sin(2 * diff));
    f.push(eccNorm * Math.cos(2 * diff), eccNorm * Math.sin(2 * diff));
    f.push(Math.cos(thetaERad) * Math.cos(thetaPRad));
    f.push(Math.cos(thetaERad) * Math.sin(thetaPRad));

    // C+D+E: physical periods + beats × 7 harmonics
    const template = getFeatureTemplate(planetKey);
    for (let i = 0; i < template.length; i++) {
      const basePhase = 2 * Math.PI * t / template[i];
      for (const n of PHYSICAL_HARMONIC_ORDERS) {
        f.push(Math.cos(n * basePhase), Math.sin(n * basePhase));
      }
    }

    const pp = getPlanetFundamentalPeriodsYears(planetKey);

    // GROUP F: period × angle
    for (const k of PHYSICAL_PERIOD_KEYS) {
      const period = pp[k];
      if (period == null) continue;
      const phase = 2 * Math.PI * t / period;
      f.push(Math.cos(phase) * Math.cos(diff));
      f.push(Math.sin(phase) * Math.sin(diff));
      f.push(Math.cos(phase) * Math.cos(2 * diff));
      f.push(Math.sin(phase) * Math.sin(2 * diff));
    }

    // GROUP I: period × 2δ
    for (const k of PHYSICAL_PERIOD_KEYS) {
      const period = pp[k];
      if (period == null) continue;
      const phase = 2 * Math.PI * t / period;
      const sinP = Math.sin(phase), cosP = Math.cos(phase);
      f.push(sinP * Math.cos(2 * diff), sinP * Math.sin(2 * diff));
      f.push(cosP * Math.cos(2 * diff), cosP * Math.sin(2 * diff));
    }

    // GROUP J: fund × Earth cycles (4 harmonics)
    // Earth's fundamentals are pure H-lattice — never null; the Record type
    // can't express that, hence the casts here and below.
    const ep = getPlanetFundamentalPeriodsYears('earth');
    const earthCyclesJ = /** @type {number[]} */ ([ep.ecl, ep.obliq, ep.icrf, ep.axial]);
    for (const k of PHYSICAL_PERIOD_KEYS) {
      const period = pp[k];
      if (period == null) continue;
      const phaseP = 2 * Math.PI * t / period;
      const sinP = Math.sin(phaseP), cosP = Math.cos(phaseP);
      for (const TE of earthCyclesJ) {
        for (const harm of SIDEBAND_J_HARMONICS) {
          const phaseE = harm * 2 * Math.PI * t / TE;
          const sinE = Math.sin(phaseE), cosE = Math.cos(phaseE);
          f.push(sinP * sinE, sinP * cosE, cosP * sinE, cosP * cosE);
        }
      }
    }

    // GROUP L: high-harmonic fundamental × Earth ecl
    const phiEEcl = 2 * Math.PI * t / /** @type {number} */ (ep.ecl);
    for (const k of PHYSICAL_PERIOD_KEYS) {
      const period = pp[k];
      if (period == null) continue;
      const phiFund = 2 * Math.PI * t / period;
      for (const nL of CARRIER_HARMONICS_L) {
        const ccL = Math.cos(nL * phiFund), scL = Math.sin(nL * phiFund);
        for (const kh of SIDEBAND_L_HARMONICS) {
          const modPhase = kh * phiEEcl;
          const smL = Math.sin(modPhase), cmL = Math.cos(modPhase);
          f.push(scL * smL, scL * cmL, ccL * smL, ccL * cmL);
        }
      }
    }

    // GROUP K: ICRF internal-beat carriers × Earth ecl sidebands
    if (pp.ecl != null && pp.icrf != null) {
      const phiEcl = 2 * Math.PI * t / pp.ecl;
      const phiIcrf = 2 * Math.PI * t / pp.icrf;
      for (const sign of [+1, -1]) {
        for (const n of CARRIER_HARMONICS_K) {
          const carrierPhase = n * (phiEcl + sign * phiIcrf);
          const sc = Math.sin(carrierPhase), cc = Math.cos(carrierPhase);
          for (const kh of SIDEBAND_K_HARMONICS) {
            const modPhase = kh * phiEEcl;
            const sm = Math.sin(modPhase), cm = Math.cos(modPhase);
            f.push(sc * sm, sc * cm, cc * sm, cc * cm);
          }
        }
      }
    }

    return f;
  }

  /**
   * Invalidate cached feature templates after the underlying planet fields
   * mutate (the browser's setEpoch rebuilds obliquity cycles, wobble
   * periods, and the perihelion periods the templates froze at first touch).
   */
  function resetTemplateCache() {
    for (const k in templates) delete templates[k];
  }

  return {
    buildPredictiveFeatures,
    getPlanetFundamentalPeriodsYears,
    getFeatureTemplate,
    resetTemplateCache,
  };
}

module.exports = { createPredictivePrecession, calcPlanetPerihelionLongDeg, beatPair };

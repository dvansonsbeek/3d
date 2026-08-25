/**
 * Cardinal-point model — THE shared implementation (Phase 7.2).
 *
 * The §10 derived form and everything on it, extracted verbatim from
 * tools/lib/orbital-engine.js (which the browser mirrored function-for-
 * function — this file replaces both copies):
 *
 *   JD_X(Y)  = anchor_X + ΣT_trop(Y) + δ_X(Y) − δ_X(2000)
 *   ΣT_trop  = lincoef·(Y−2000) + driftTerm(Y) + Ih(Y)
 *   δ_X      = sinusoids + equation-of-centre orders (e(t)ⁿ·sin(nM), e(t)
 *              the LAW OF COSINES) + §10g quadrature-locked joint sidebands
 *   T_X(Y)   = the EXACT term-by-term derivative of JD_X
 *
 * LOAD-BEARING, do not "improve":
 *  - lincoef/h0/h1 come from the fit and are used VERBATIM — recomputing
 *    lincoef from the 1-year anchor injects a −12,276 s ramp; holding H
 *    constant inside Ih costs up to 5.2 s (§10c/§10e-quinquies).
 *  - The drift term is Simpson on 2000-yr NODE SPACING (not a fixed node
 *    count: that was exact in-window and −33,758 s at −380 Ma) plus the
 *    Euler–Maclaurin endpoint term (omitting it costs 6–13 s).
 *  - The equation-of-centre terms are {order,sin,cos}, NOT sinusoids — read
 *    as H/16+H/32 harmonics they are wrong by the whole ~1.78 d braid.
 *  - §10g joint sidebands are SHARED across the four points with phase
 *    order·λ_X − 2π·div·c — COUNTER-rotating. The minus sign is load-bearing:
 *    the co-rotating sense captures NOTHING (measured — the sign experiment,
 *    doc 99 "the braid law").
 *  - The year-length derivative keeps ONE deliberate divergence from the
 *    exact derivative: its drift part uses the real-LOD convention
 *    (`meanYearRealLodDays`) — the tweakpane's epoch-local days ("~400 days
 *    at the Devonian") — where the JD form integrates the SI form. Equal at
 *    J2000 up to the known 118 ms fit-basis gap.
 *
 * The `cyclesBetween` the caller injects is the ENGINE'S OWN function, so
 * each engine's deep-time/snapshot toggle semantics are preserved exactly;
 * under deep time both engines now route it through @essrt/physics/phase.
 */

'use strict';

/** @type {Record<string, number>} */
const JOINT_LAMBDA = { SS: 0, AE: Math.PI / 2, WS: Math.PI, VE: 1.5 * Math.PI };

const DRIFT_NODE_SPACING_YEARS = 2000;
const DRIFT_SIMPSON_N_MIN = 64;

/** @typedef {{ lincoef: number, h0: number, h1: number }} DerivedCoefs */
/** @typedef {{ order: number, sin: number, cos: number }} EccTerm */
/** @typedef {{ order: number, div: number, sin: number, cos: number }} JointTerm */

/**
 * @param {{
 *   isDeepTime: () => boolean,
 *   constants: {
 *     anchors: Record<string, number>,
 *     harmonics: Record<string, Array<[number, number, number]>>,
 *     eccTerms: (Record<string, EccTerm[]> | null),
 *     jointTerms: ({ terms: JointTerm[] } | null),
 *     derived: (DerivedCoefs | null),
 *     tropicalHarmonics: Array<[number, number, number]>,
 *     balancedYear: number,
 *     meanSolarYearDays: number,
 *     hJ2000: number,
 *     tiltMeanDeg: number,
 *     raAngleDeg: number,
 *     inclAmplitudeDeg: number,
 *   },
 *   fns: {
 *     cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *     analyticTropicalDays: (year: number) => (number | null),
 *     meanHAtAgeMa: (tMa: number) => (number | null),
 *     meanYearRealLodDays: (tMa: number) => (number | null),
 *     eccentricityAt: (year: number) => number,
 *     eccentricityRateAt: (year: number) => number,
 *   },
 * }} deps
 */
function createCardinalModel({ isDeepTime, constants, fns }) {
  const {
    anchors,               // { SS, WS, VE, AE } — J2000 event JDs
    harmonics,             // { type: [[div, sin, cos], …] } — δ sinusoids
    eccTerms,              // { type: [{order, sin, cos}, …] } | null
    jointTerms,            // { terms: [{order, div, sin, cos}, …] } | null
    derived,               // { lincoef, h0, h1 } — fit-calibrated, VERBATIM
    tropicalHarmonics,     // TROPICAL_YEAR_HARMONICS [[div, sin, cos], …]
    balancedYear,
    meanSolarYearDays,
    hJ2000,
    tiltMeanDeg,           // for RA
    raAngleDeg,
    inclAmplitudeDeg,
  } = constants;
  const {
    cyclesBetween,         // (yearA, yearB, divisorN) => cycles | null
    analyticTropicalDays,  // (year) => SI days | null — the drift integrand base
    meanHAtAgeMa,          // (t_Ma) => H | null — the derivative's dc/dY
    meanYearRealLodDays,   // (t_Ma) => days | null — real-LOD drift convention
    eccentricityAt,        // (year) => e(t) — the model's ONE eccentricity law (H/3 vector sum, plan IP-eccentricity-unification)
    eccentricityRateAt,    // (year) => de/dyear of the same law — the braid's EoC derivative rides it
  } = fns;

  /** @param {number} year */
  const cycleOf = (year) => {
    const c = cyclesBetween(balancedYear, year, 1);
    return c === null ? 0 : c;
  };

  /** @param {number} year */
  const driftIntegrand = (year) => {
    const a = analyticTropicalDays(year);
    return a === null ? 0 : (a - meanSolarYearDays);
  };

  /** @param {number} year */
  function driftTerm(year) {
    const span = year - 2000;
    if (span === 0) return 0;
    let n = Math.ceil(Math.abs(span) / DRIFT_NODE_SPACING_YEARS);
    if (n % 2) n++;
    if (n < DRIFT_SIMPSON_N_MIN) n = DRIFT_SIMPSON_N_MIN;
    const h = span / n;
    const f0 = driftIntegrand(2000), fN = driftIntegrand(year);
    let acc = f0 + fN;
    for (let i = 1; i < n; i++) acc += driftIntegrand(2000 + i * h) * ((i % 2) ? 4 : 2);
    return acc * h / 3 - (fN - f0) / 2;
  }

  /** Step 6d's self-corrected tropical harmonic series, as a length deviation.
   *  @param {number} year */
  function tropHarmonicsAt(year) {
    const c = cycleOf(year), c0 = cycleOf(2000);
    let s = 0;
    for (const [div, sinC, cosC] of tropicalHarmonics) {
      const th = 2 * Math.PI * div * c, th0 = 2 * Math.PI * div * c0;
      s += sinC * (Math.sin(th) - Math.sin(th0)) + cosC * (Math.cos(th) - Math.cos(th0));
    }
    return s;
  }

  // Ih(Y) = Σ_{2000→Y} of the tropical harmonics, closed form. H stays INSIDE
  // the integral (h0 + h1·c) — it moves 27.5 yr across the window and
  // multiplies the amplitude. Deep-time only, so `derived` is present here.
  /** @param {number} year */
  function integratedTropHarmonics(year) {
    const D = /** @type {DerivedCoefs} */ (derived);
    const cY = cycleOf(year), c0 = cycleOf(2000);
    let tot = 0, k0 = 0;
    for (const [div, sinC, cosC] of tropicalHarmonics) {
      const k = 2 * Math.PI * div;
      /** @param {number} c */
      const F = (c) => {
        const sn = Math.sin(k * c), cs = Math.cos(k * c), Hc = D.h0 + D.h1 * c;
        return [-Hc * cs / k + D.h1 * sn / (k * k), Hc * sn / k + D.h1 * cs / (k * k)];
      };
      const a = F(c0), b = F(cY);
      tot += sinC * (b[0] - a[0]) + cosC * (b[1] - a[1]);
      k0 += sinC * Math.sin(k * c0) + cosC * Math.cos(k * c0);
    }
    return tot - k0 * (year - 2000)
         - (tropHarmonicsAt(year) - tropHarmonicsAt(2000)) / 2;
  }

  /** @param {number} year */
  function sigmaTropical(year) {
    const D = /** @type {DerivedCoefs} */ (derived);
    return D.lincoef * (year - 2000) + driftTerm(year) + integratedTropHarmonics(year);
  }

  // δ_X(2000) — the self-correction that pins JD(2000) to the anchor exactly
  // (sinusoids + ecc orders; the §10g joint terms self-correct inline).
  // Computed lazily so the phase table builds on the caller's schedule.
  /** @type {Record<string, number> | null} */
  let _selfCorr = null;
  function selfCorr() {
    if (_selfCorr !== null) return _selfCorr;
    _selfCorr = {};
    const c2000 = cycleOf(2000);
    for (const type of ['SS', 'WS', 'VE', 'AE']) {
      let h2000 = 0;
      for (const [div, sinC, cosC] of harmonics[type]) {
        const th0 = 2 * Math.PI * div * c2000;
        h2000 += sinC * Math.sin(th0) + cosC * Math.cos(th0);
      }
      const ecc = eccTerms && eccTerms[type];
      if (ecc) {
        const e0 = eccentricityAt(2000);
        const th0 = 2 * Math.PI * 16 * c2000;
        for (const t of ecc) {
          const eN0 = Math.pow(e0, t.order);
          h2000 += t.sin * eN0 * Math.sin(t.order * th0) + t.cos * eN0 * Math.cos(t.order * th0);
        }
      }
      _selfCorr[type] = h2000;
    }
    return _selfCorr;
  }

  /** @param {number} year @param {string} [type] */
  function computeSolsticeJD(year, type) {
    const cp = type || 'SS';
    const anchor = anchors[cp];
    const deep = isDeepTime();

    let jd = deep
      ? anchor + sigmaTropical(year)
      : anchor + meanSolarYearDays * (year - 2000);

    const cY = cycleOf(year);
    for (const [div, sinC, cosC] of harmonics[cp]) {
      jd += sinC * Math.sin(2 * Math.PI * div * cY) + cosC * Math.cos(2 * Math.PI * div * cY);
    }
    const ecc = eccTerms && eccTerms[cp];
    if (ecc) {
      const e = eccentricityAt(year);
      const th = 2 * Math.PI * 16 * cY;
      for (const t of ecc) {
        const eN = Math.pow(e, t.order);
        jd += t.sin * eN * Math.sin(t.order * th) + t.cos * eN * Math.cos(t.order * th);
      }
    }
    if (jointTerms) {
      const lam = JOINT_LAMBDA[cp];
      const c2000 = cycleOf(2000);
      for (const t of jointTerms.terms) {
        const th  = t.order * lam - 2 * Math.PI * t.div * cY;
        const th0 = t.order * lam - 2 * Math.PI * t.div * c2000;
        jd += t.sin * (Math.sin(th) - Math.sin(th0)) + t.cos * (Math.cos(th) - Math.cos(th0));
      }
    }
    jd -= selfCorr()[cp];
    return jd;
  }

  /** The EXACT term-by-term derivative of computeSolsticeJD — except the
   *  drift part, which deliberately stays in the real-LOD convention (see
   *  the file header). Neglected: the drift Euler–Maclaurin half-sample
   *  term's own derivative (f′/2, sub-µs).
   *  @param {number} year @param {string} [type] */
  function computeSolsticeYearLength(year, type) {
    const cp = type || 'SS';
    const deep = isDeepTime();
    const t_Ma = (2000 - year) / 1e6;

    const H_at = deep ? (meanHAtAgeMa(t_Ma) ?? hJ2000) : hJ2000;
    const dcdY = 1 / H_at;
    const cY = cycleOf(year);

    let length;
    if (deep && derived) {
      length = derived.lincoef;
      const mSY_at = meanYearRealLodDays(t_Ma);
      if (mSY_at !== null) length += (mSY_at - meanSolarYearDays);
      length += tropHarmonicsAt(year);
      let dTrop = 0;
      for (const [div, sinC, cosC] of tropicalHarmonics) {
        const k = 2 * Math.PI * div, th = k * cY;
        dTrop += k * dcdY * (sinC * Math.cos(th) - cosC * Math.sin(th));
      }
      length -= dTrop / 2;
    } else {
      length = meanSolarYearDays;
    }

    for (const [div, sinC, cosC] of harmonics[cp]) {
      const k = 2 * Math.PI * div, th = k * cY;
      length += k * dcdY * (sinC * Math.cos(th) - cosC * Math.sin(th));
    }

    const ecc = eccTerms && eccTerms[cp];
    if (ecc) {
      const th16 = 2 * Math.PI * 16 * cY;
      const thp = 2 * Math.PI * 16 * dcdY;
      const e = eccentricityAt(year);
      // de/dyear from the one law (formerly the H/16 law-of-cosines derivative).
      // The braid's own phase θ16 stays: it is the perihelion-OF-DATE phase the
      // equation of centre is seen through — an H/16 quantity by nature.
      const de = eccentricityRateAt(year);
      for (const t of ecc) {
        const n = t.order, nth = n * th16;
        const eN = Math.pow(e, n), eN1 = Math.pow(e, n - 1);
        length += t.sin * (n * eN1 * de * Math.sin(nth) + eN * n * thp * Math.cos(nth))
                + t.cos * (n * eN1 * de * Math.cos(nth) - eN * n * thp * Math.sin(nth));
      }
    }

    if (jointTerms) {
      const lam = JOINT_LAMBDA[cp];
      for (const t of jointTerms.terms) {
        const k = 2 * Math.PI * t.div;
        const th = t.order * lam - k * cY;
        length += k * dcdY * (-t.sin * Math.cos(th) + t.cos * Math.sin(th));
      }
    }
    return length;
  }

  /** RA where a cardinal point occurs — fully derived, zero fitted constants.
   *  INTEGRATED phase: the formula describes where the SCENE puts the point,
   *  and the scene's H/3 and H/8 objects rotate on integrated phase.
   *  @param {number} year @param {string} [type] */
  function computeSolsticeRA(year, type) {
    const sinE = Math.sin(tiltMeanDeg * Math.PI / 180);
    const baseRA = /** @type {Record<string, number>} */ ({ SS: 90, WS: 270, VE: 0, AE: 180 })[type || 'SS'];
    const raMean = baseRA - raAngleDeg / sinE;
    const amp = inclAmplitudeDeg / sinE;
    const cY = cycleOf(year);
    const phase3 = 2 * Math.PI * 3 * cY;
    const phase8 = 2 * Math.PI * 8 * cY;
    return raMean + amp * (-Math.sin(phase3) + Math.sin(phase8));
  }

  /** Tropical year as the mean of the four cardinal intervals — the
   *  physically correct definition (Σδ_X ≡ 0 makes the braid cancel).
   *  @param {number} year */
  function computeTropicalYearLength(year) {
    return (computeSolsticeYearLength(year, 'SS') +
            computeSolsticeYearLength(year, 'WS') +
            computeSolsticeYearLength(year, 'VE') +
            computeSolsticeYearLength(year, 'AE')) / 4;
  }

  return { computeSolsticeJD, computeSolsticeYearLength, computeSolsticeRA, computeTropicalYearLength };
}

module.exports = { createCardinalModel, JOINT_LAMBDA };

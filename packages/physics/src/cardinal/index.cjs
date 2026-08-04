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
 * under deep time both engines now route it through @hum/physics/phase.
 */

'use strict';

const JOINT_LAMBDA = { SS: 0, AE: Math.PI / 2, WS: Math.PI, VE: 1.5 * Math.PI };

const DRIFT_NODE_SPACING_YEARS = 2000;
const DRIFT_SIMPSON_N_MIN = 64;

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
    eccentricityBase,
    eccentricityAmplitude,
    tiltMeanDeg,           // for RA
    raAngleDeg,
    inclAmplitudeDeg,
  } = constants;
  const {
    cyclesBetween,         // (yearA, yearB, divisorN) => cycles | null
    analyticTropicalDays,  // (year) => SI days | null — the drift integrand base
    meanHAtAgeMa,          // (t_Ma) => H | null — the derivative's dc/dY
    meanYearRealLodDays,   // (t_Ma) => days | null — real-LOD drift convention
    eccentricityAt,        // (year) => e(t), law of cosines on the H/16 phase
  } = fns;

  const cycleOf = (year) => {
    const c = cyclesBetween(balancedYear, year, 1);
    return c === null ? 0 : c;
  };

  const driftIntegrand = (year) => {
    const a = analyticTropicalDays(year);
    return a === null ? 0 : (a - meanSolarYearDays);
  };

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

  /** Step 6d's self-corrected tropical harmonic series, as a length deviation. */
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
  // multiplies the amplitude.
  function integratedTropHarmonics(year) {
    const D = derived;
    const cY = cycleOf(year), c0 = cycleOf(2000);
    let tot = 0, k0 = 0;
    for (const [div, sinC, cosC] of tropicalHarmonics) {
      const k = 2 * Math.PI * div;
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

  function sigmaTropical(year) {
    return derived.lincoef * (year - 2000) + driftTerm(year) + integratedTropHarmonics(year);
  }

  // δ_X(2000) — the self-correction that pins JD(2000) to the anchor exactly
  // (sinusoids + ecc orders; the §10g joint terms self-correct inline).
  // Computed lazily so the phase table builds on the caller's schedule.
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
   *  term's own derivative (f′/2, sub-µs). */
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
      const de = eccentricityBase * eccentricityAmplitude * Math.sin(th16) * thp / e;
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
   *  and the scene's H/3 and H/8 objects rotate on integrated phase. */
  function computeSolsticeRA(year, type) {
    const sinE = Math.sin(tiltMeanDeg * Math.PI / 180);
    const baseRA = { SS: 90, WS: 270, VE: 0, AE: 180 }[type || 'SS'];
    const raMean = baseRA - raAngleDeg / sinE;
    const amp = inclAmplitudeDeg / sinE;
    const cY = cycleOf(year);
    const phase3 = 2 * Math.PI * 3 * cY;
    const phase8 = 2 * Math.PI * 8 * cY;
    return raMean + amp * (-Math.sin(phase3) + Math.sin(phase8));
  }

  /** Tropical year as the mean of the four cardinal intervals — the
   *  physically correct definition (Σδ_X ≡ 0 makes the braid cancel). */
  function computeTropicalYearLength(year) {
    return (computeSolsticeYearLength(year, 'SS') +
            computeSolsticeYearLength(year, 'WS') +
            computeSolsticeYearLength(year, 'VE') +
            computeSolsticeYearLength(year, 'AE')) / 4;
  }

  return { computeSolsticeJD, computeSolsticeYearLength, computeSolsticeRA, computeTropicalYearLength };
}

module.exports = { createCardinalModel, JOINT_LAMBDA };

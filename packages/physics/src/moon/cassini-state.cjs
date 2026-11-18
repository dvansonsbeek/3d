'use strict';
/**
 * The Moon's axial tilt of date — the CASSINI STATE on the regime of date (plan 31 B's first build; doc 111 §1.49).
 * ONE home: the scene's Moon axis, the Planet Info row and the gates read this; the Node twin builds it on
 * tools/lib's readers, the browser on the chain's.
 *
 * The classical relation (Peale 1969; Ward 1975 — the triaxial form as reproduced in "Revisiting the Cassini
 * states of synchronous satellites", IAU Symp. 2023, eq. 2), every rate in rad/yr:
 *     α sin 2(θ − i) + (3/4) n γ sin(θ − i) (1 − cos(θ − i)) + 2 Ω̇ sin θ = 0,     α = (3/2) n (C − A)/C,
 * θ the spin axis's angle from the LAPLACE pole (signed, positive on the orbit normal's side), i the orbit's
 * inclination to the Laplace plane (> 0), Ω̇ the node's rate about the Laplace pole (< 0, a regression), n the mean
 * motion, γ = (B − A)/C; ε = θ − i the obliquity to the ORBIT normal. Today the Moon is in state 2 (the spin axis
 * on the far side of the Laplace pole from the orbit normal): θ −1.54°, i 5.15°, ε −6.70°; the equation on the
 * shipped regime reads θ −1.57° (the figure's rounding and the free inclination's 0.01°).
 *
 * Of date (plan 31 A's regime, the quantities it already carries): n(t) from the cited a(t), Ω̇(t) the node's
 * period of date (the oblateness term inside the Laplace radius, the solar term outside — 3.24 yr at the edge,
 * 18.6 today), i(t) the free inclination (sin i_L ∝ a^{−κ}; κ = 1/2 shipped, 1/4 the band). The Moon's figure is
 * a CITED input: (C − A)/C = 6.3e-4 (Yoder 1995, as Wisdom 2006 uses it), (B − A)/C = 2.28e-4 (Williams et al.
 * 2014, LLR). MEASURED (plan31b-cassini-state-measure.cjs): with today's figure FROZEN at every age (Ward's
 * assumption) state 1 does not exist inside ~7 R⊕ — the 3-yr node regression of the J₂ regime is too fast for it —
 * so the early figure is HYDROSTATIC: the moment differences ∝ the tidal + rotational distortion ∝ n² ∝ a⁻³ inside
 * the radius a_h where today's figure was hydrostatic (15 R⊕, Peale 1969; 21 R⊕, Williams et al. 2001 — the band's
 * other edge), today's values beyond. On that reading the Moon sits in state 1 from the edge (ε 0.3–1°), ε grows to
 * 27° at 33.5–33.8 R⊕ (4,150–4,120 Ma) where state 1 merges with state 4 and vanishes — Ward's (1975) 34 R⊕
 * reproduced on the cited history (Ćuk et al. 2021: 27 hydrostatic, 34 with a fossil figure) — and the Moon falls to
 * state 2 at ε ≈ −50°, decaying with the recession: 42° at 34 R⊕, 24° at 40, 13° at 45, 9.5° at 50, 7.8° at 55, 6.7°
 * today. The transition itself is Ward's NON-EQUILIBRIUM episode (an oscillation damped by internal friction); here
 * it is drawn as the equilibrium jump and said so.
 *
 * The standing: DERIVED on the cited regime and a cited figure, a labelled BAND (the figure's two readings × the
 * inclination's two exponents), never a dated event. The shipped value at J2000 is the MEASURED composition
 * (−(i_L₀ + 1.5424°)): the equation's obliquity of date is scaled by the anchor's ratio (0.996), exact at J2000.
 */

const { NAVIGABLE_PAST_YEARS } = require('../time/navigable-domain.cjs');

const D2R = Math.PI / 180;
const SEC_PER_JULIAN_YR = 365.25 * 86400;

/** The Moon's figure (cited) and the hydrostatic radius's two readings. */
const CASSINI_FIGURE = Object.freeze({
  cMinusAOverC: 6.3e-4,                 // Yoder 1995 (Wisdom 2006, AJ 131, 1864 uses it)
  bMinusAOverC: 2.28e-4,                // γ, Williams et al. 2014 (JGR Planets 119, 1546; LLR)
  hydrostaticRadiusEarthRadii: 15,      // Peale 1969 — the shipped reading
  hydrostaticRadiusBandEarthRadii: 21,  // Williams et al. 2001 — the band's other edge
  sources: 'Peale 1969 (AJ 74, 483); Ward 1975 (Science 189, 377); Yoder 1995; Williams et al. 2001, 2014; Ćuk, Hamilton & Stewart 2021 (PSJ 2, 221)',
});

/**
 * The figure's moment differences at a distance under a reading: hydrostatic (∝ a⁻³) inside the hydrostatic radius,
 * today's values beyond; `frozen` keeps today's values everywhere (Ward's assumption — measured to fail early).
 * @param {number} aOverEarthRadii @param {number | 'frozen'} hydrostaticRadiusRe
 */
function figureAtDistance(aOverEarthRadii, hydrostaticRadiusRe) {
  if (hydrostaticRadiusRe === 'frozen') return { cMinusAOverC: CASSINI_FIGURE.cMinusAOverC, bMinusAOverC: CASSINI_FIGURE.bMinusAOverC };
  const s = aOverEarthRadii < hydrostaticRadiusRe ? Math.pow(hydrostaticRadiusRe / aOverEarthRadii, 3) : 1;
  return { cMinusAOverC: CASSINI_FIGURE.cMinusAOverC * s, bMinusAOverC: CASSINI_FIGURE.bMinusAOverC * s };
}

/**
 * Every root θ (radians) of the Cassini equation on (−π, π]: a sign scan at 0.05° and bisection to 1e-13.
 * @param {number} nRadPerYr @param {number} nodeRateRadPerYr  signed (< 0 for a regression) @param {number} inclinationRad
 * @param {{cMinusAOverC: number, bMinusAOverC: number}} figure
 * @returns {number[]}
 */
function cassiniEquationRoots(nRadPerYr, nodeRateRadPerYr, inclinationRad, figure) {
  const alpha = 1.5 * nRadPerYr * figure.cMinusAOverC, g = 0.75 * nRadPerYr * figure.bMinusAOverC;
  const F = (/** @type {number} */ th) => { const e = th - inclinationRad; return alpha * Math.sin(2 * e) + g * Math.sin(e) * (1 - Math.cos(e)) + 2 * nodeRateRadPerYr * Math.sin(th); };
  const roots = [];
  const step = 0.05 * D2R;
  let thPrev = -Math.PI + 1e-9, fPrev = F(thPrev);
  for (let th = thPrev + step; th <= Math.PI + 1e-12; th += step) {
    const f = F(th);
    if (fPrev === 0 || (fPrev < 0) !== (f < 0)) {
      let lo = thPrev, hi = th, flo = fPrev;
      for (let k = 0; k < 60; k++) { const mid = 0.5 * (lo + hi), fm = F(mid); if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid; }
      roots.push(0.5 * (lo + hi));
    }
    thPrev = th; fPrev = f;
  }
  return roots;
}

/**
 * The roots named: state 1 (θ > i, the spin axis beyond the orbit normal, prograde — the lowest such root), state 4
 * (its unstable partner, the highest root below 90° + i), state 2 (θ < 0, |θ| < 90°: the spin axis on the far side of
 * the pole — the one nearest the pole), state 3 (retrograde, |θ| > 90°). Radians; null where absent.
 * @param {number[]} roots @param {number} inclinationRad
 */
function classifyCassiniStates(roots, inclinationRad) {
  const pro = roots.filter((th) => th > inclinationRad && th < Math.PI / 2 + inclinationRad).sort((a, b) => a - b);
  const s2 = roots.filter((th) => th < 0 && th > -Math.PI / 2);
  const s3 = roots.filter((th) => Math.abs(th) > Math.PI / 2);
  return {
    state1: pro.length >= 1 ? pro[0] : null,
    state4: pro.length >= 2 ? pro[pro.length - 1] : null,
    state2: s2.length ? s2.reduce((a, b) => (Math.abs(a) < Math.abs(b) ? a : b)) : null,
    state3: s3.length ? s3[0] : null,
  };
}

/** @typedef {{ kappaBand?: boolean, hydrostaticRadiusRe?: number | 'frozen' }} CassiniReading */
/** @typedef {{ ageMa: number, aOverEarthRadii: number, nRadPerYr: number, nodeRateRadPerYr: number, inclinationDeg: number, figure: {cMinusAOverC: number, bMinusAOverC: number}, state1Deg: number | null, state2Deg: number | null, state3Deg: number | null, state4Deg: number | null }} CassiniRaw */

/**
 * @param {object} deps
 * @param {{ gmEarthMoonM3S2: number, earthRadiusMetres: number, moonInclinationJ2000Deg: number, moonObliquityEclipticJ2000Deg: number }} deps.constants
 *   the Earth–Moon GM, the Earth's radius, the Moon's J2000 inclination (the free inclination's anchor) and the
 *   MEASURED spin-to-ecliptic obliquity 1.5424° (the shipped value's anchor)
 * @param {{ moonDistanceMetresAtAge: (tMa: number) => number | null, lunarNodePeriodSecondsAtAge: (tMa: number) => number | null, freeInclinationDegAtAge: (tMa: number) => number | null, freeInclinationBandDegAtAge: (tMa: number) => number | null }} deps.fns
 *   the chain's readers of date (the cited distance, the regime's node period, the free inclination and its band)
 */
function createCassiniState({ constants: K, fns }) {
  const edgeMa = NAVIGABLE_PAST_YEARS / 1e6;
  /** @type {Map<string, {aOverEarthRadii: number, ageMa: number, lastState1Deg: number, state2Deg: number} | null>} */
  const transitionMemo = new Map();
  const readingKey = (/** @type {CassiniReading} */ r) => `${r.kappaBand ? 'k14' : 'k12'}:${r.hydrostaticRadiusRe === 'frozen' ? 'frozen' : (r.hydrostaticRadiusRe ?? CASSINI_FIGURE.hydrostaticRadiusEarthRadii)}`;

  /** The equation's four states at an age under a reading; null out of the histories. @param {number} tMa @param {CassiniReading} [reading] @returns {CassiniRaw | null} */
  function rawAtAge(tMa, reading = {}) {
    const a = fns.moonDistanceMetresAtAge(tMa);
    const pNode = fns.lunarNodePeriodSecondsAtAge(tMa);
    const iDeg = reading.kappaBand ? fns.freeInclinationBandDegAtAge(tMa) : fns.freeInclinationDegAtAge(tMa);
    if (a === null || !(a > 0) || pNode === null || !(pNode > 0) || iDeg === null || !Number.isFinite(iDeg)) return null;
    const n = Math.sqrt(K.gmEarthMoonM3S2 / (a * a * a)) * SEC_PER_JULIAN_YR;
    const nodeRate = -(2 * Math.PI) / (pNode / SEC_PER_JULIAN_YR);
    const aRe = a / K.earthRadiusMetres;
    const figure = figureAtDistance(aRe, reading.hydrostaticRadiusRe ?? CASSINI_FIGURE.hydrostaticRadiusEarthRadii);
    const s = classifyCassiniStates(cassiniEquationRoots(n, nodeRate, iDeg * D2R, figure), iDeg * D2R);
    const deg = (/** @type {number | null} */ x) => (x === null ? null : x / D2R);
    return { ageMa: tMa, aOverEarthRadii: aRe, nRadPerYr: n, nodeRateRadPerYr: nodeRate, inclinationDeg: iDeg, figure, state1Deg: deg(s.state1), state2Deg: deg(s.state2), state3Deg: deg(s.state3), state4Deg: deg(s.state4) };
  }

  /** The transition under a reading — the age (and distance) where state 1 vanishes, by bisection on the age between
   *  J2000 (no state 1) and the edge; null when state 1 is absent at the edge too (the frozen figure). Memoised.
   *  @param {CassiniReading} [reading] */
  function transition(reading = {}) {
    const key = readingKey(reading);
    if (transitionMemo.has(key)) return transitionMemo.get(key) ?? null;
    const exists = (/** @type {number} */ t) => { const r = rawAtAge(t, reading); return r !== null && r.state1Deg !== null; };
    let out = null;
    if (exists(edgeMa) && !exists(0)) {
      let lo = 0, hi = edgeMa;   // lo: no state 1 (young), hi: state 1 (old)
      for (let k = 0; k < 48; k++) { const mid = 0.5 * (lo + hi); if (exists(mid)) hi = mid; else lo = mid; }
      const r = /** @type {CassiniRaw} */ (rawAtAge(hi, reading));
      out = { aOverEarthRadii: r.aOverEarthRadii, ageMa: hi, lastState1Deg: /** @type {number} */ (r.state1Deg) - r.inclinationDeg, state2Deg: /** @type {number} */ (r.state2Deg) - r.inclinationDeg };
    }
    transitionMemo.set(key, out);
    return out;
  }

  /** The anchor's ratio: the measured composition −(i₀ + 1.5424°) over the equation's ε at J2000 (0.996). */
  /** @type {number | null} */
  let anchorScale = null;
  function scale() {
    if (anchorScale === null) {
      const r0 = rawAtAge(0);
      const epsEq0 = r0 && r0.state2Deg !== null ? r0.state2Deg - r0.inclinationDeg : null;
      anchorScale = epsEq0 === null || !(epsEq0 < 0) ? 1 : -(K.moonInclinationJ2000Deg + K.moonObliquityEclipticJ2000Deg) / epsEq0;
    }
    return anchorScale;
  }

  /**
   * The Moon's Cassini state of date under a reading: the occupied state (1 before the transition, 2 after), θ
   * (signed from the Laplace pole), the obliquity to the orbit normal — the equation's and the shipped one (anchored
   * on the measured J2000 composition), null out of the histories.
   * @param {number} tMa @param {CassiniReading} [reading]
   */
  function stateAtAge(tMa, reading = {}) {
    const r = rawAtAge(tMa, reading);
    if (r === null) return null;
    const tr = transition(reading);
    const inState1 = tr !== null && tMa > tr.ageMa && r.state1Deg !== null;
    const thetaDeg = inState1 ? /** @type {number} */ (r.state1Deg) : r.state2Deg;
    if (thetaDeg === null) return null;
    const epsEq = thetaDeg - r.inclinationDeg;
    return {
      ageMa: tMa, aOverEarthRadii: r.aOverEarthRadii, state: inState1 ? 1 : 2,
      thetaDeg, inclinationDeg: r.inclinationDeg,
      obliquityToOrbitEqDeg: epsEq,                  // the equation's, signed (negative: state 2's far side)
      obliquityToOrbitDeg: epsEq * scale(),          // the shipped value: anchored on the measured J2000 composition
      obliquityToLaplacePoleDeg: Math.abs(thetaDeg) * scale(),
      anchorScale: scale(),
      transition: tr,
      nodePeriodYears: (2 * Math.PI) / -r.nodeRateRadPerYr,
    };
  }

  /** The band at an age: the shipped reading and the three others (κ = 1/4; a_h = 21 R⊕; both), with their min and max
   *  of |ε|, and the frozen reading's state for the record. @param {number} tMa */
  function bandAtAge(tMa) {
    const readings = [
      { name: 'κ=1/2, a_h 15 R⊕ (shipped)', reading: {} },
      { name: 'κ=1/4, a_h 15 R⊕', reading: { kappaBand: true } },
      { name: 'κ=1/2, a_h 21 R⊕', reading: { hydrostaticRadiusRe: CASSINI_FIGURE.hydrostaticRadiusBandEarthRadii } },
      { name: 'κ=1/4, a_h 21 R⊕', reading: { kappaBand: true, hydrostaticRadiusRe: CASSINI_FIGURE.hydrostaticRadiusBandEarthRadii } },
    ].map((x) => ({ name: x.name, state: stateAtAge(tMa, x.reading) }));
    const vals = readings.map((x) => (x.state ? Math.abs(x.state.obliquityToOrbitDeg) : NaN)).filter(Number.isFinite);
    return { shipped: readings[0].state, readings, minObliquityToOrbitDeg: vals.length ? Math.min(...vals) : null, maxObliquityToOrbitDeg: vals.length ? Math.max(...vals) : null };
  }

  return { stateAtAge, bandAtAge, transition, rawAtAge, figure: CASSINI_FIGURE, edgeMa };
}

module.exports = { CASSINI_FIGURE, figureAtDistance, cassiniEquationRoots, classifyCassiniStates, createCassiniState };

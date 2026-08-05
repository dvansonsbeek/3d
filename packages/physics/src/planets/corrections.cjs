/**
 * Fitted post-hoc corrections — THE shared evaluators (Phase 8.3, L8).
 *
 * The parallax RA/Dec basis: ~80 fitted coefficient slots (A..CA) over a
 * geometric state (orbital phase u from the ascending node, inverse
 * geocentric distance, inverse heliocentric distance, Julian centuries,
 * the triple-synodic conjunction phase, the Sun mean longitude, and the
 * inner-planet mean anomaly). ONE basis served four hand-copies: browser
 * dec, browser RA, Node dec, Node RA (~80 duplicated terms each).
 *
 * MATCHED PAIR: these coefficients were fitted against exactly this basis
 * and this state derivation — the expression text is transcribed verbatim
 * (including the (x || 0) missing-slot guards and the AU_ key, which
 * avoids a collision with the AU unit name). Do not simplify.
 *
 * The engines OWN the state derivation (scene vectors, JD conventions) and
 * the application sign convention (RA subtracts, Dec adds) — this module
 * only evaluates.
 *
 * GRAVITATION (planet-planet perturbation harmonics): evaluated here PER
 * TERM — the engines apply each term inside their own loops, because
 * (x−a)−b ≠ x−(a+b) at the last bit and the fixtures pin the per-term
 * application order.
 *
 * ELONGATION (elongation × Earth-perihelion geometry, 21 fitted slots per
 * axis): BROWSER ASSOCIATION FORM — the six d² slots per table use the
 * precomputed invD² ((a·b)·invD²); the Node mirror carried inline
 * invD·invD (((a·b)·invD)·invD) at those sites — same 1-ULP class as the
 * five parallax slots, measured by the fixture recorders at extraction.
 */

'use strict';

/**
 * @typedef {{ u: number, invD: number, invS: number, T: number,
 *   cp: number, Lsun: number,
 *   sinM: number, cosM: number, sin2M: number, cos2M: number }} ParallaxState
 */

/**
 * Evaluate the fitted parallax basis for one coefficient table (RA or Dec —
 * same basis, different tables). Returns DEGREES (the engines apply their
 * own sign and rad conversion).
 * @param {Record<string, number>} c @param {ParallaxState} s
 * @returns {number} */
function evaluateParallaxBasis(c, s) {
  const { u: _u, invD: _invD, invS: _invS, T: _T, Lsun: _Lsun } = s;
  const _invD2 = _invD * _invD;
  const _invD3 = _invD2 * _invD;
  const _invS2 = _invS * _invS;
  const _invDS = _invD * _invS;
  const _sinU = Math.sin(_u), _cosU = Math.cos(_u);
  const _sin2U = Math.sin(2 * _u), _cos2U = Math.cos(2 * _u);
  const _sin3U = Math.sin(3 * _u), _cos3U = Math.cos(3 * _u);
  const _sinCP = Math.sin(s.cp), _cosCP = Math.cos(s.cp);
  const _sin2CP = Math.sin(2 * s.cp), _cos2CP = Math.cos(2 * s.cp);
  const _sinL = Math.sin(_Lsun), _cosL = Math.cos(_Lsun);
  const _sinM = s.sinM, _cosM = s.cosM, _sin2M = s.sin2M, _cos2M = s.cos2M;
  return c.A + c.B * _invD + (c.C || 0) * _T
    + (c.D * _sinU + c.E * _cosU + c.F * _sin2U + c.G * _cos2U
     + (c.H || 0) * _sin3U + (c.I || 0) * _cos3U) * _invD
    + _T * ((c.J || 0) * _sinU + (c.K || 0) * _cosU) * _invD
    + (c.L || 0) * _invS + (c.M || 0) * _sinU * _invD2
    + (c.N || 0) * _sin2U * _invS + (c.O || 0) * _cosU * _invS
    + (c.P || 0) * _T * _sin2U * _invD + (c.Q || 0) * _T * _cos2U * _invD
    + (c.R || 0) * _T * _sinU * _invS
    + (c.S || 0) * _T * _invD + (c.U || 0) * _cosU * _invD2
    + (c.V || 0) * _invS2 + (c.W || 0) * _sinU * _invS2
    + (c.X || 0) * _cos3U * _invS + (c.Y || 0) * _sin3U * _invS
    + (c.Z || 0) * _invDS + (c.AA || 0) * _sinU * _invDS
    + (c.AB || 0) * _cos2U * _invDS + (c.AC || 0) * _T * _sin2U * _invS
    + (c.AD || 0) * _cos3U * _invD2 + (c.AE || 0) * _sin2U * _invS2
    + (c.AF || 0) * _sin3U * _invS2 + (c.AG || 0) * _cos3U * _invS2
    + (c.AH || 0) * _cosU * _invS2 + (c.AI || 0) * _sinU * _invD2 * _invS
    + (c.AJ || 0) * Math.cos(4 * _u) * _invS + (c.AK || 0) * _sin2U * _invD2 * _invS
    + (c.AL || 0) * Math.sin(4 * _u) * _invD + (c.AM || 0) * Math.cos(4 * _u) * _invD
    + (c.AN || 0) * _T * _sinU * _invD2 + (c.AO || 0) * _T * _cosU * _invD2
    + (c.AP || 0) * _sinU * _invD2 * _invD + (c.AQ || 0) * _cosU * _invD2 * _invD
    + (c.AR || 0) * _sinCP + (c.AS || 0) * _cosCP
    + (c.AT || 0) * _sin2CP + (c.AU_ || 0) * _cos2CP
    + (c.AV || 0) * _sinCP * _invD + (c.AW || 0) * _cosCP * _invD
    + (c.AX || 0) * _sinL * _invD + (c.AY || 0) * _cosL * _invD
    + (c.AZ || 0) * _sinL + (c.BA || 0) * _cosL
    + (c.BB || 0) * _T * _sinL * _invD + (c.BC || 0) * _T * _cosL * _invD
    + (c.BD || 0) * _T * _sinL + (c.BE || 0) * _T * _cosL
    + (c.BF || 0) * _cosU * _sinL * _invD2 + (c.BG || 0) * _cosU * _cosL * _invD2
    + (c.BH || 0) * _sinL * _invD3 + (c.BI || 0) * _cosL * _invD3
    + (c.BJ || 0) * Math.sin(_u - _Lsun) * _invD2 + (c.BK || 0) * Math.cos(_u - _Lsun) * _invD2
    + (c.BL || 0) * _T * _T * _invD + (c.BM || 0) * _T * _T * _sinU * _invD + (c.BN || 0) * _T * _T * _cosU * _invD
    + (c.BO || 0) * _sin2U * _invD3 + (c.BP || 0) * _cos2U * _invD3
    + (c.BQ || 0) * _sinU * _invD3 * _invD
    + (c.BR || 0) * _sinM * _invD + (c.BS || 0) * _cosM * _invD
    + (c.BT || 0) * _sin2M * _invD + (c.BU || 0) * _cos2M * _invD
    + (c.BV || 0) * _sinM + (c.BW || 0) * _cosM
    + (c.BX || 0) * _sin2M + (c.BY || 0) * _cos2M
    + (c.BZ || 0) * _sinM * _invD2 + (c.CA || 0) * _cosM * _invD2;
}

/**
 * Gravitation-correction term deltas, in DEGREES, one entry per fitted
 * term. The engines apply these PER TERM (sign convention and the
 * degrees→radians conversion stay engine-side).
 * @param {Array<{ period: number, raSin: number, raCos: number,
 *   decSin: number, decCos: number }>} terms
 * @param {number} yearsFrom2000
 * @returns {Array<{ raDeg: number, decDeg: number }>} */
function gravitationTermDeltasDeg(terms, yearsFrom2000) {
  const out = [];
  for (const term of terms) {
    const phase = 2 * Math.PI * yearsFrom2000 / term.period;
    const sp = Math.sin(phase), cp = Math.cos(phase);
    out.push({
      raDeg: term.raSin * sp + term.raCos * cp,
      decDeg: term.decSin * sp + term.decCos * cp,
    });
  }
  return out;
}

/**
 * @typedef {{ elongRad: number, vFromWERad: number, synPhaseRad: number,
 *   invD: number }} ElongationState
 */

/**
 * Evaluate the fitted 21-slot elongation basis for one axis. Returns
 * DEGREES; `suffix` selects the coefficient table ('ra' or 'dec' — same
 * basis, different fitted slots). The engines derive the state (frame Sun
 * RA, Earth-perihelion angle, exact synodic phase from the integer orbit
 * count) and apply their own sign and rad conversion.
 * @param {Record<string, number>} vc @param {ElongationState} s
 * @param {'ra'|'dec'} suffix
 * @returns {number} */
function evaluateElongationBasis(vc, s, suffix) {
  const sinEl = Math.sin(s.elongRad), cosEl = Math.cos(s.elongRad);
  const cosVwE = Math.cos(s.vFromWERad), sinVwE = Math.sin(s.vFromWERad);
  const sin2VwE = Math.sin(2 * s.vFromWERad), cos2VwE = Math.cos(2 * s.vFromWERad);
  const sin3VwE = Math.sin(3 * s.vFromWERad), cos3VwE = Math.cos(3 * s.vFromWERad);
  const sin4VwE = Math.sin(4 * s.vFromWERad), cos4VwE = Math.cos(4 * s.vFromWERad);
  const invD = s.invD;
  const invD2 = invD * invD;
  /** @param {string} k @returns {number} */
  const c = (k) => vc[k + suffix] || 0;
  return c('cosVwE_sinEl_') * cosVwE * sinEl
    + c('sinEl_d_') * sinEl * invD
    + c('sinVwE_sinEl_') * sinVwE * sinEl
    + c('sin2VwE_sinEl_') * sin2VwE * sinEl
    + c('cos2VwE_sinEl_') * cos2VwE * sinEl
    + c('cos4VwE_sinEl_') * cos4VwE * sinEl
    + c('sin4VwE_sinEl_') * sin4VwE * sinEl
    + c('sinVwE_sinEl_d2_') * sinVwE * sinEl * invD2
    + c('cos3VwE_sinEl_') * cos3VwE * sinEl
    + c('sin3VwE_sinEl_') * sin3VwE * sinEl
    + c('sin2syn_') * Math.sin(2 * s.synPhaseRad)
    + c('cos1syn_') * Math.cos(s.synPhaseRad)
    + c('sin3VwE_sinEl_d2_') * sin3VwE * sinEl * invD2
    + c('sin2VwE_sinEl_d2_') * sin2VwE * sinEl * invD2
    + c('cos2VwE_sinEl_d2_') * cos2VwE * sinEl * invD2
    + c('cosEl_d_') * cosEl * invD
    + c('cosVwE_cosEl_d_') * cosVwE * cosEl * invD
    + c('sinVwE_cosEl_d_') * sinVwE * cosEl * invD
    + c('cosEl_d2_') * cosEl * invD2
    + c('cosVwE_cosEl_d2_') * cosVwE * cosEl * invD2
    + c('sinVwE_cosEl_d2_') * sinVwE * cosEl * invD2;
}

module.exports = { evaluateParallaxBasis, gravitationTermDeltasDeg, evaluateElongationBasis };

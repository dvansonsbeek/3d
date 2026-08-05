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
 * Gravitation/elongation NOT here yet, deliberately: the engines apply
 * those PER TERM ((x−a)−b), and a summed shared evaluator would move the
 * fixture-pinned positions at the last bit — they join with probes-first
 * treatment in a later slice.
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

module.exports = { evaluateParallaxBasis };
